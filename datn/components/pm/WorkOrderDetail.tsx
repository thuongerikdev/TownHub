"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Calendar, Clock, Wrench, UserPlus, QrCode, ClipboardCheck,
  CheckCircle2, XCircle, Pencil, Gauge, FileText, Package, Plus, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, warehouses, materials, inventoryTransactions, purchaseRequests, users, EMPTY_GUID,
  toWorkOrderUpdate,
  type RoleMember,
  type WorkOrderResponse,
  type WarehouseResponse, type MaterialResponse,
  type InventoryTransactionResponse, type PurchaseRequestResponse,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockWorkOrders } from "@/lib/mock/pm";
import { mockWarehouses, mockMaterials } from "@/lib/mock/inventory";
import {
  StatCard, EntityModal, Field, MockBanner, StatusBadge, PriorityBadge, ToneBadge,
  LoadingState, ErrorState, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, formatDate, formatCurrency } from "@/lib/format";

const WO_STATUS: Record<string, StatusDef> = {
  DRAFT:          { label: "Nháp",               tone: "neutral" },
  ASSIGNED:       { label: "Đã phân công",        tone: "info" },
  IN_PROGRESS:    { label: "Đang thực hiện",      tone: "warning" },
  PENDING_REVIEW: { label: "Chờ nghiệm thu",      tone: "brand" },
  COMPLETED:      { label: "Hoàn thành",          tone: "success" },
  CANCELLED:      { label: "Đã huỷ",             tone: "danger" },
  REJECTED:       { label: "Bị từ chối",          tone: "danger" },
};

const SHOW_MATERIAL = new Set(["IN_PROGRESS", "PENDING_REVIEW", "COMPLETED"]);

interface MatForm { warehouseId: string; materialId: string; qty: string; notes: string; }
const emptyMat: MatForm = { warehouseId: "", materialId: "", qty: "1", notes: "" };

interface PrForm { prCode: string; title: string; priority: string; requestedByName: string; justification: string; }
const emptyPr: PrForm = { prCode: "", title: "", priority: "MEDIUM", requestedByName: "", justification: "" };

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useApi<WorkOrderResponse>(
    () => workOrders.getById(String(id)),
    { mock: () => mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0], deps: [id] },
  );
  const wo = q.data;

  // ── Vật tư ────────────────────────────────────────────────────────────────────
  const warehousesQ  = useApiList<WarehouseResponse>(() => warehouses.getAll(), { mock: mockWarehouses });
  const materialsQ   = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const linkedTxnsQ  = useApiList<InventoryTransactionResponse>(
    () => inventoryTransactions.getAll({ referenceType: "WORK_ORDER", referenceId: String(id) }),
    { deps: [id], enabled: !!wo },
  );
  const linkedPrsQ   = useApiList<PurchaseRequestResponse>(
    () => purchaseRequests.getAll({ woId: String(id) }),
    { deps: [id], enabled: !!wo },
  );

  const [assignOpen, setAssignOpen] = useState(false);
  const [techId,     setTechId]     = useState("");
  const techQ = useApiList<RoleMember>(() => users.getByRole("Kỹ thuật viên"), { enabled: assignOpen });
  const [assigning,  setAssigning]  = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [matForm,    setMatForm]    = useState<MatForm>(emptyMat);
  const [matWorking, setMatWorking] = useState(false);
  const [prForm,     setPrForm]     = useState<PrForm>(emptyPr);
  const [prWorking,  setPrWorking]  = useState(false);

  // Full payload: WorkOrder UpdateAsync overwrites every mapped field, so a partial
  // PUT would wipe woType/title/priority/dates. Preserve all current values here.
  const woBase = toWorkOrderUpdate;

  async function doAssign() {
    if (!wo) return;
    const tech = techQ.items.find((u) => String(u.userID) === techId);
    if (!tech) { toast.error("Chọn kỹ thuật viên được phân công."); return; }
    const techName = tech.fullName?.trim() || tech.userName;
    setAssigning(true);
    const a = await workOrders.assignTechnician({ woId: wo.id, assignedToUserId: tech.userID, assignedToName: techName });
    if (a.errorCode !== 200) {
      setAssigning(false);
      toast.error(a.errorMessage || "Phân công thất bại.");
      return;
    }
    const note = `KTV phụ trách: ${techName}`;
    const res = await workOrders.update({
      ...woBase(wo),
      description: wo.description ? `${wo.description}\n${note}` : note,
      status: "ASSIGNED",
    });
    setAssigning(false);
    if (res.errorCode === 200) { toast.success("Đã phân công KTV."); setAssignOpen(false); setTechId(""); q.refetch(); }
    else toast.error(res.errorMessage || "Phân công thất bại.");
  }

  async function doCancel() {
    if (!wo) return;
    const res = await workOrders.update({ ...woBase(wo), status: "CANCELLED" });
    if (res.errorCode === 200) { toast.success("Đã huỷ phiếu công việc."); setCancelOpen(false); q.refetch(); }
    else toast.error(res.errorMessage || "Huỷ thất bại.");
  }

  async function doIssueOut() {
    if (!wo) return;
    if (!matForm.warehouseId || !matForm.materialId) { toast.error("Chọn kho và vật tư."); return; }
    const qty = Number(matForm.qty);
    if (!qty || qty <= 0) { toast.error("Số lượng không hợp lệ."); return; }
    setMatWorking(true);
    const txnCode = `OUT-${wo.woCode}-${Date.now().toString(36).toUpperCase()}`;

    // 1. Create inventory OUT transaction
    const txnRes = await inventoryTransactions.create({
      txnCode,
      warehouseId:   matForm.warehouseId,
      materialId:    matForm.materialId,
      referenceType: "WORK_ORDER",
      referenceId:   wo.id,
      txnType:  "OUT",
      quantity: qty,
      notes:    matForm.notes || `Xuất kho thực hiện ${wo.woCode}`,
    });

    if (txnRes.errorCode === 200) {
      // 2. Record material used on the WO
      await workOrders.addMaterialUsed({
        woId:        wo.id,
        materialId:  matForm.materialId,
        warehouseId: matForm.warehouseId,
      });
    }

    setMatWorking(false);
    if (txnRes.errorCode === 200) {
      toast.success("Đã xuất vật tư và ghi nhận cho phiếu công việc.");
      setMatForm(emptyMat);
      linkedTxnsQ.refetch();
    } else toast.error(txnRes.errorMessage || "Xuất kho thất bại.");
  }

  async function doCreatePr() {
    if (!wo) return;
    if (!prForm.prCode.trim()) { toast.error("Nhập mã phiếu đề xuất."); return; }
    setPrWorking(true);
    const res = await purchaseRequests.create({
      prCode:          prForm.prCode.trim(),
      woId:            wo.id,
      requestedBy:     EMPTY_GUID,
      requestedByName: prForm.requestedByName.trim() || wo.createdBy || "KTV",
      title:           prForm.title.trim() || `Vật tư cho ${wo.woCode}`,
      priority:        prForm.priority,
      justification:   prForm.justification.trim() || undefined,
    });
    setPrWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo phiếu đề xuất mua hàng.");
      setPrForm(emptyPr);
      linkedPrsQ.refetch();
    } else toast.error(res.errorMessage || "Tạo PR thất bại.");
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!wo) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy phiếu công việc."} onRetry={q.refetch} /></div>;

  const isPM        = wo.woType === "PM";
  const canAssign   = wo.status === "DRAFT";
  const closed      = wo.status === "COMPLETED" || wo.status === "CANCELLED";
  const showMaterial = SHOW_MATERIAL.has(wo.status);

  return (
    <div>
      <Link href="/pm/work-orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại danh sách
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{wo.woCode}</span>
            <ToneBadge tone={isPM ? "info" : "warning"}>{isPM ? "Bảo trì định kỳ" : "Sửa chữa"}</ToneBadge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{wo.title ?? wo.woCode}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="size-4" /> Tạo: {formatDateTime(wo.createdAt)}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" /> Hạn: {formatDate(wo.dueDate)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={wo.status} map={WO_STATUS} />
          <PriorityBadge value={wo.priority} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ước tính"  value={wo.estimatedHours != null ? `${wo.estimatedHours}h` : "—"} icon={Clock}          tone="neutral" />
        <StatCard label="Thực tế"   value={wo.actualHours    != null ? `${wo.actualHours}h`    : "—"} icon={Gauge}          tone="info" />
        <StatCard label="Chi phí"   value={formatCurrency(wo.totalCost)}                               icon={FileText}       tone="brand" />
        <StatCard label="Trạng thái" value={WO_STATUS[wo.status]?.label ?? wo.status}                  icon={ClipboardCheck} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Cột chính ─────────────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Thông tin tài sản">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Tài sản">
                <Link href={`/assets/${wo.assetId}`} className="font-medium text-brand hover:underline">{wo.assetName ?? "—"}</Link>
              </Row>
              <Row label="Mã tài sản"><span className="font-mono text-xs">{wo.assetCode ?? "—"}</span></Row>
              <Row label="Loại công việc">{isPM ? "Bảo trì định kỳ (PM)" : "Sửa chữa (CM)"}</Row>
              <Row label="Checklist áp dụng">{wo.checklistTemplateName ?? "—"}</Row>
              <Row label="KTV phụ trách">{wo.assignedToName ?? "—"}</Row>
            </div>
          </Section>

          {wo.description && (
            <Section title="Mô tả công việc">
              <p className="text-sm text-foreground/90">{wo.description}</p>
            </Section>
          )}

          {/* ── UC29: Vật tư sử dụng (inline) ──────────────────────────────── */}
          {showMaterial && (
            <Section title="Vật tư sử dụng">
              <div className="space-y-6">
                {/* Xuất vật tư từ kho */}
                <div>
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Package className="size-4 text-brand" /> Xuất vật tư từ kho
                  </h3>
                  {!closed ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Kho</label>
                        <Select value={matForm.warehouseId} onValueChange={(v) => setMatForm((f) => ({ ...f, warehouseId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Chọn kho" /></SelectTrigger>
                          <SelectContent>
                            {warehousesQ.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Vật tư</label>
                        <Select value={matForm.materialId} onValueChange={(v) => setMatForm((f) => ({ ...f, materialId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Chọn vật tư" /></SelectTrigger>
                          <SelectContent>
                            {materialsQ.items.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Số lượng</label>
                        <Input type="number" min={1} value={matForm.qty} onChange={(e) => setMatForm((f) => ({ ...f, qty: e.target.value }))} />
                      </div>
                      <div className="flex items-end">
                        <Button className="w-full" size="sm" onClick={doIssueOut} disabled={matWorking}>
                          <Plus className="size-4" /> Xuất kho
                        </Button>
                      </div>
                      <div className="col-span-full">
                        <label className="mb-1 block text-xs text-muted-foreground">Ghi chú (tuỳ chọn)</label>
                        <Input value={matForm.notes} onChange={(e) => setMatForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú xuất kho…" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Phiếu đã đóng — không thể xuất vật tư.</p>
                  )}

                  {linkedTxnsQ.items.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Mã GD</th>
                            <th className="px-3 py-2 text-left">Vật tư</th>
                            <th className="px-3 py-2 text-left">Kho</th>
                            <th className="px-3 py-2 text-right">SL</th>
                            <th className="px-3 py-2 text-left">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {linkedTxnsQ.items.map((tx) => (
                            <tr key={tx.id} className="hover:bg-surface-2/50">
                              <td className="px-3 py-2 font-mono text-xs">{tx.txnCode}</td>
                              <td className="px-3 py-2">{tx.materialName ?? "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{tx.warehouseName ?? "—"}</td>
                              <td className="px-3 py-2 text-right font-medium">{tx.quantity}</td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(tx.performedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                {/* Đề xuất mua hàng */}
                <div>
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Wrench className="size-4 text-brand" /> Đề xuất mua vật tư (PR)
                  </h3>
                  {!closed ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Mã phiếu đề xuất <span className="text-danger">*</span></label>
                        <Input value={prForm.prCode} onChange={(e) => setPrForm((f) => ({ ...f, prCode: e.target.value }))} placeholder={`PR-${wo.woCode}`} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Người đề xuất</label>
                        <Input value={prForm.requestedByName} onChange={(e) => setPrForm((f) => ({ ...f, requestedByName: e.target.value }))} placeholder={wo.createdBy ?? "KTV"} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Tiêu đề</label>
                        <Input value={prForm.title} onChange={(e) => setPrForm((f) => ({ ...f, title: e.target.value }))} placeholder={`Vật tư cho ${wo.woCode}`} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Ưu tiên</label>
                        <Select value={prForm.priority} onValueChange={(v) => setPrForm((f) => ({ ...f, priority: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Thấp</SelectItem>
                            <SelectItem value="MEDIUM">Trung bình</SelectItem>
                            <SelectItem value="HIGH">Cao</SelectItem>
                            <SelectItem value="URGENT">Khẩn cấp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-full">
                        <label className="mb-1 block text-xs text-muted-foreground">Lý do / Mô tả</label>
                        <Textarea rows={2} value={prForm.justification} onChange={(e) => setPrForm((f) => ({ ...f, justification: e.target.value }))} placeholder="Mô tả nhu cầu vật tư cần mua…" />
                      </div>
                      <div className="col-span-full flex justify-end">
                        <Button size="sm" onClick={doCreatePr} disabled={prWorking}>
                          <Plus className="size-4" /> Tạo phiếu đề xuất
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Phiếu đã đóng — không thể tạo phiếu đề xuất mới.</p>
                  )}

                  {linkedPrsQ.items.length > 0 ? (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Mã PR</th>
                            <th className="px-3 py-2 text-left">Tiêu đề</th>
                            <th className="px-3 py-2 text-left">Trạng thái</th>
                            <th className="px-3 py-2 text-left">Ngày tạo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {linkedPrsQ.items.map((pr) => (
                            <tr key={pr.id} className="hover:bg-surface-2/50">
                              <td className="px-3 py-2 font-mono text-xs">{pr.prCode}</td>
                              <td className="px-3 py-2">{pr.title ?? "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${pr.status === "APPROVED" ? "bg-success/15 text-success" : pr.status === "REJECTED" ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground"}`}>{pr.status}</span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(pr.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    !closed && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Inbox className="size-4" /> Chưa có phiếu đề xuất nào liên kết.
                      </p>
                    )
                  )}
                </div>
              </div>
            </Section>
          )}

          <Section title="Quy trình thực hiện">
            <ol className="space-y-3">
              {[
                { key: "DRAFT",          label: "Tạo phiếu công việc",              done: true },
                { key: "ASSIGNED",       label: "Phân công kỹ thuật viên",          done: ["ASSIGNED","IN_PROGRESS","PENDING_REVIEW","COMPLETED"].includes(wo.status) },
                { key: "IN_PROGRESS",    label: "KTV check-in & thực hiện",         done: ["IN_PROGRESS","PENDING_REVIEW","COMPLETED"].includes(wo.status) },
                { key: "PENDING_REVIEW", label: "Nộp checklist chờ nghiệm thu",     done: ["PENDING_REVIEW","COMPLETED"].includes(wo.status) },
                { key: "COMPLETED",      label: "Nghiệm thu & đóng phiếu",          done: wo.status === "COMPLETED" },
              ].map((step) => (
                <li key={step.key} className="flex items-center gap-3">
                  <span className={`flex size-6 items-center justify-center rounded-full text-xs ${step.done ? "bg-success/15 text-success" : "bg-surface-2 text-muted-foreground"}`}>
                    {step.done ? <CheckCircle2 className="size-4" /> : "•"}
                  </span>
                  <span className={`text-sm ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        {/* ── Cột phụ ───────────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Section title="Phân công" action={canAssign ? <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}><UserPlus className="size-4" /> Phân công</Button> : undefined}>
            <div className="space-y-3 text-sm">
              <Row label="KTV phụ trách">{wo.assignedToName ?? "Chưa phân công"}</Row>
              <Row label="Người tạo">{wo.createdByName ?? wo.createdBy ?? "—"}</Row>
              <Row label="Bắt đầu thực tế">{formatDateTime(wo.actualStartAt)}</Row>
              <Row label="Kết thúc thực tế">{formatDateTime(wo.actualEndAt)}</Row>
              {wo.rejectedReason && <Row label="Lý do từ chối"><span className="text-danger">{wo.rejectedReason}</span></Row>}
            </div>
          </Section>

          <Section title="Thao tác">
            <div className="space-y-2">
              {wo.status === "DRAFT" && (
                <Button className="w-full" onClick={() => setAssignOpen(true)}><UserPlus className="size-4" /> Phân công KTV</Button>
              )}
              {wo.status === "ASSIGNED" && (
                <Button className="w-full" asChild><Link href={`/pm/work-orders/${wo.id}/checkin`}><QrCode className="size-4" /> Check-in hiện trường</Link></Button>
              )}
              {wo.status === "IN_PROGRESS" && (
                <Button className="w-full" asChild><Link href={`/pm/work-orders/${wo.id}/checklist`}><ClipboardCheck className="size-4" /> Mở checklist</Link></Button>
              )}
              {wo.status === "PENDING_REVIEW" && (
                <Button className="w-full" asChild><Link href={`/pm/work-orders/${wo.id}/review`}><CheckCircle2 className="size-4" /> Nghiệm thu</Link></Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => router.push("/pm/work-orders")}>
                <Pencil className="size-4" /> Về danh sách
              </Button>
              {!closed && (
                <Button variant="ghost" className="w-full text-danger hover:text-danger" onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-4" /> Huỷ phiếu công việc
                </Button>
              )}
            </div>
          </Section>

          {showMaterial && (
            <Section title="Tóm tắt vật tư">
              <div className="space-y-2 text-sm">
                <Row label="Giao dịch xuất kho">{linkedTxnsQ.items.length > 0 ? `${linkedTxnsQ.items.length} giao dịch` : "Chưa có"}</Row>
                <Row label="Phiếu đề xuất (PR)">{linkedPrsQ.items.length > 0 ? `${linkedPrsQ.items.length} phiếu` : "Chưa có"}</Row>
                <Row label="Chi phí vật tư">
                  {linkedTxnsQ.items.reduce((s, tx) => s + (tx.totalCost ?? 0), 0) > 0
                    ? formatCurrency(linkedTxnsQ.items.reduce((s, tx) => s + (tx.totalCost ?? 0), 0))
                    : "—"}
                </Row>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      <EntityModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Phân công kỹ thuật viên"
        description={`${wo.woCode} · ${wo.title ?? ""}`}
        size="sm"
        onSubmit={doAssign}
        submitting={assigning}
        submitLabel="Phân công"
      >
        <Field label="Kỹ thuật viên" required hint="Chọn KTV (người có vai trò Kỹ thuật viên)">
          <Select value={techId} onValueChange={setTechId}>
            <SelectTrigger>
              <SelectValue placeholder={techQ.loading ? "Đang tải..." : techQ.items.length ? "Chọn kỹ thuật viên" : "Chưa có kỹ thuật viên"} />
            </SelectTrigger>
            <SelectContent>
              {techQ.items.map((u) => (
                <SelectItem key={u.userID} value={String(u.userID)}>
                  {u.fullName?.trim() || u.userName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </EntityModal>

      <EntityModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Huỷ phiếu công việc?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Không</Button>
            <Button variant="destructive" onClick={doCancel}>Huỷ phiếu</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Huỷ <strong className="text-foreground">{wo.woCode}</strong>? Hành động này dừng toàn bộ quy trình của phiếu.</p>
      </EntityModal>
    </div>
  );
}
