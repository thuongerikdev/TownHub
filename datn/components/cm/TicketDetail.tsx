"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, MapPin, User, Clock, AlertTriangle, CheckCircle2,
  UserPlus, TrendingUp, RefreshCw, Inbox, Package, ShoppingCart, Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  tickets, slaConfigs, warehouses, materials, inventoryTransactions, purchaseRequests,
  users, displayUser,
  type RoleMember,
  type TicketResponse, type TicketStatusHistoryResponse, type SlaEscalationLogResponse,
  type SlaConfigResponse, type UpdateTicketInput, type TicketAttachmentResponse,
  type WarehouseResponse, type MaterialResponse,
  type InventoryTransactionResponse, type PurchaseRequestResponse, type PurchaseLineInput,
} from "@/lib/api";
import { MaterialLinesPicker } from "@/components/shared/material-lines-picker";
import { useApi, useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockTickets, mockSlaConfigs } from "@/lib/mock/cm";
import { mockWarehouses, mockMaterials } from "@/lib/mock/inventory";
import {
  MockBanner, LoadingState, ErrorState, StatusBadge, PriorityBadge, SlaBadge, ToneBadge,
  EntityModal, Field, PhotoCapture, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, formatCurrency } from "@/lib/format";

const TICKET_STATUS: Record<string, StatusDef> = {
  NEW:              { label: "Mới tiếp nhận", tone: "info" },
  OPEN:             { label: "Chờ phân công", tone: "info" },
  ASSIGNED:         { label: "Đã phân công",  tone: "brand" },
  IN_PROGRESS:      { label: "Đang xử lý",    tone: "warning" },
  PENDING_MATERIAL: { label: "Chờ vật tư",    tone: "neutral" },
  RESOLVED:         { label: "Đã xử lý",      tone: "success" },
  CLOSED:           { label: "Đã đóng",       tone: "neutral" },
};
const CATEGORY: Record<string, string> = {
  ELECTRICAL: "Điện", PLUMBING: "Nước", HVAC: "HVAC", ELEVATOR: "Thang máy", FIRE: "PCCC", OTHER: "Khác",
};
const SOURCE: Record<string, string> = { RESIDENT: "Cư dân", STAFF: "Nhân viên", SYSTEM: "Hệ thống", RECEPTION: "Lễ tân", PHONE: "Điện thoại", EMAIL: "Email", APP: "Ứng dụng" };

const SLA_HOURS: Record<string, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
const isClosed = (t: TicketResponse) => t.status === "RESOLVED" || t.status === "CLOSED";
function slaDue(t: TicketResponse): string {
  const hrs = SLA_HOURS[t.priority] ?? 24;
  return new Date(new Date(t.createdAt).getTime() + hrs * 3600_000).toISOString();
}
function remaining(t: TicketResponse) {
  const diff = new Date(slaDue(t)).getTime() - Date.now();
  const overdue = diff < 0;
  const h = Math.floor(Math.abs(diff) / 3600_000);
  const m = Math.floor((Math.abs(diff) % 3600_000) / 60_000);
  return { overdue, text: `${h}h ${m}ph` };
}

// Diagram 1: "Chụp ảnh kết quả (Trước/Sau)". Hệ thống chưa có cột phân loại ảnh cho
// TicketAttachment → mã hoá loại ảnh vào fragment URL (#BEFORE/#AFTER). An toàn cho cả
// URL http lẫn data URL base64 (bảng chữ cái base64 không chứa ký tự '#').
type PhotoKind = "BEFORE" | "AFTER" | "OTHER";
function encodePhoto(url: string, kind: Exclude<PhotoKind, "OTHER">): string {
  const base = url.replace(/#(BEFORE|AFTER)$/i, "");
  return `${base}#${kind}`;
}
function photoKind(url: string): PhotoKind {
  const m = url.match(/#(BEFORE|AFTER)$/i);
  return m ? (m[1].toUpperCase() as PhotoKind) : "OTHER";
}
function stripPhotoKind(url: string): string {
  return url.replace(/#(BEFORE|AFTER)$/i, "");
}

// Luồng CM: NEW/OPEN → ASSIGNED → IN_PROGRESS ⇆ PENDING_MATERIAL → RESOLVED → CLOSED
const NEXT_STATUS: Record<string, string[]> = {
  NEW:              ["ASSIGNED"],
  OPEN:             ["ASSIGNED"],
  ASSIGNED:         ["IN_PROGRESS", "PENDING_MATERIAL"],
  IN_PROGRESS:      ["PENDING_MATERIAL", "RESOLVED"],
  PENDING_MATERIAL: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED:         ["CLOSED"],
};

// Bước tiến chính (forward) của từng trạng thái — dùng làm nút "nhảy sang bước tiếp theo".
const PRIMARY_NEXT: Record<string, { to: string; label: string }> = {
  ASSIGNED:         { to: "IN_PROGRESS", label: "Bắt đầu xử lý" },
  IN_PROGRESS:      { to: "RESOLVED",    label: "Hoàn tất xử lý" },
  PENDING_MATERIAL: { to: "IN_PROGRESS", label: "Tiếp tục xử lý" },
  RESOLVED:         { to: "CLOSED",      label: "Đóng ticket" },
};

const SHOW_MATERIAL = new Set(["ASSIGNED", "IN_PROGRESS", "PENDING_MATERIAL", "RESOLVED"]);

interface MatForm { warehouseId: string; materialId: string; qty: string; notes: string; }
const emptyMat: MatForm = { warehouseId: "", materialId: "", qty: "1", notes: "" };

interface PrForm { title: string; priority: string; justification: string; }
const emptyPr: PrForm = { title: "", priority: "MEDIUM", justification: "" };

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<TicketResponse>(
    () => tickets.getById(String(id)),
    { mock: () => mockTickets.find((t) => t.id === id) ?? mockTickets[0], deps: [id] },
  );
  const t = q.data;

  const historyQ = useApiList<TicketStatusHistoryResponse>(
    () => tickets.getStatusHistory(String(id)),
    { deps: [id], enabled: !!t },
  );
  const escalationQ = useApiList<SlaEscalationLogResponse>(
    () => tickets.getEscalationLogs(String(id)),
    { deps: [id], enabled: !!t },
  );
  const slaQ = useApiList<SlaConfigResponse>(() => slaConfigs.getAll(), { mock: mockSlaConfigs });

  // ── Vật tư & Mua sắm ─────────────────────────────────────────────────────────
  const warehousesQ = useApiList<WarehouseResponse>(() => warehouses.getAll(), { mock: mockWarehouses });
  const materialsQ  = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const linkedTxnsQ = useApiList<InventoryTransactionResponse>(
    () => inventoryTransactions.getAll({ referenceType: "TICKET", referenceId: String(id) }),
    { deps: [id], enabled: !!t },
  );
  const linkedPrsQ = useApiList<PurchaseRequestResponse>(
    () => purchaseRequests.getAll({ ticketId: String(id) }),
    { deps: [id], enabled: !!t },
  );
  const photosQ = useApiList<TicketAttachmentResponse>(
    () => tickets.getAttachments(String(id)),
    { mock: () => [], deps: [id], enabled: !!t },
  );

  // ── Assign modal state ────────────────────────────────────────────────────────
  const { hasPermission } = useAuth();
  const mayAssign = hasPermission("ticket.assign");
  const mayResolve = hasPermission("ticket.resolve");
  const mayClose = hasPermission("ticket.close");
  const mayChangeStatus = mayResolve || mayClose;
  const [assignOpen, setAssignOpen] = useState(false);
  const [techId,     setTechId]     = useState("");
  const techQ = useApiList<RoleMember>(() => users.getByRole("Kỹ thuật viên"), { enabled: assignOpen });

  // ── Status change modal state ─────────────────────────────────────────────────
  const [statusOpen, setStatusOpen] = useState(false);
  const [toStatus,   setToStatus]   = useState("");
  const [note,       setNote]       = useState("");

  // ── Material OUT form ─────────────────────────────────────────────────────────
  const [matForm,    setMatForm]    = useState<MatForm>(emptyMat);
  const [matWorking, setMatWorking] = useState(false);

  // ── PR inline form ────────────────────────────────────────────────────────────
  const [prForm,     setPrForm]     = useState<PrForm>(emptyPr);
  const [prLines,    setPrLines]    = useState<PurchaseLineInput[]>([]);
  const [prWorking,  setPrWorking]  = useState(false);

  const [working, setWorking] = useState(false);

  const sla = useMemo(
    () => slaQ.items.find((s) => s.id === t?.slaConfigId),
    [slaQ.items, t?.slaConfigId],
  );

  const timeline = useMemo(() => {
    const items = [...historyQ.items].sort((a, b) => +new Date(a.changedAt) - +new Date(b.changedAt));
    if (items.length > 0) {
      return items.map((h) => ({ status: h.toStatus, at: h.changedAt, by: displayUser(h.changedBy), note: h.note }));
    }
    if (!t) return [];
    const out: { status: string; at: string; by?: string; note?: string }[] = [
      { status: t.status, at: t.createdAt, by: t.reportedByName ?? displayUser(t.reportedBy) },
    ];
    if (t.resolvedAt) out.push({ status: "RESOLVED", at: t.resolvedAt, note: t.resolutionNote });
    if (t.closedAt)   out.push({ status: "CLOSED",   at: t.closedAt });
    return out;
  }, [historyQ.items, t]);

  function updateBase(x: TicketResponse): UpdateTicketInput {
    return {
      id: x.id, ticketCode: x.ticketCode, buildingId: x.buildingId, reportedByName: x.reportedByName,
      floorId: x.floorId, unitId: x.unitId, assetId: x.assetId, slaConfigId: x.slaConfigId,
      purchaseRequestId: x.purchaseRequestId, title: x.title, description: x.description,
      category: x.category, priority: x.priority, source: x.source,
    };
  }

  async function doAssign() {
    if (!t) return;
    const tech = techQ.items.find((u) => String(u.userID) === techId);
    if (!tech) { toast.error("Chọn kỹ thuật viên được phân công."); return; }
    const techName = tech.fullName?.trim() || tech.userName;
    setWorking(true);
    // Backend tự chuyển trạng thái sang ASSIGNED và ghi lịch sử khi phân công.
    const res = await tickets.assign({ ticketId: t.id, assignedToUserId: tech.userID, assignedToName: techName });
    setWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã phân công KTV.");
      setAssignOpen(false); setTechId("");
      q.refetch(); historyQ.refetch();
    } else toast.error(res.errorMessage || "Phân công thất bại.");
  }

  async function doTransition() {
    if (!t) return;
    if (!toStatus) { toast.error("Chọn trạng thái cần chuyển."); return; }
    setWorking(true);
    const res = await tickets.changeStatus({ ticketId: t.id, toStatus, fromStatus: t.status, note: note.trim() || undefined });
    if (res.errorCode === 200 && (toStatus === "RESOLVED" || toStatus === "CLOSED")) {
      await tickets.update({
        ...updateBase(t), status: toStatus,
        resolvedAt: toStatus === "RESOLVED" ? new Date().toISOString() : t.resolvedAt,
        closedAt:   toStatus === "CLOSED"   ? new Date().toISOString() : t.closedAt,
        resolutionNote: note.trim() || t.resolutionNote,
      });
    }
    setWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã cập nhật trạng thái.");
      setStatusOpen(false); setNote(""); setToStatus("");
      q.refetch(); historyQ.refetch();
    } else toast.error(res.errorMessage || "Cập nhật thất bại.");
  }

  async function doIssueOut() {
    if (!t) return;
    if (!matForm.warehouseId || !matForm.materialId) { toast.error("Chọn kho và vật tư."); return; }
    const qty = Number(matForm.qty);
    if (!qty || qty <= 0) { toast.error("Số lượng không hợp lệ."); return; }
    setMatWorking(true);
    const txnCode = `OUT-${t.ticketCode}-${Date.now().toString(36).toUpperCase()}`;
    const res = await inventoryTransactions.create({
      txnCode,
      warehouseId: matForm.warehouseId,
      materialId:  matForm.materialId,
      referenceType: "TICKET",
      referenceId:   t.id,
      txnType:  "OUT",
      quantity: qty,
      notes:    matForm.notes || `Xuất kho xử lý ${t.ticketCode}`,
    });
    setMatWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã xuất vật tư.");
      setMatForm(emptyMat);
      linkedTxnsQ.refetch();
    } else toast.error(res.errorMessage || "Xuất kho thất bại.");
  }

  async function doCreatePr() {
    if (!t) return;
    if (!t.assignedToUserId) { toast.error("Ticket chưa phân công KTV — không thể tạo phiếu đề xuất."); return; }
    setPrWorking(true);
    // Mã PR do server sinh; người đề xuất server tự suy từ KTV phụ trách ticket (theo ticketId).
    const res = await purchaseRequests.create({
      ticketId:        t.id,
      title:           prForm.title.trim() || `Vật tư cho ${t.ticketCode}`,
      priority:        prForm.priority,
      justification:   prForm.justification.trim() || undefined,
      items:           prLines.length ? prLines : undefined,
    });
    setPrWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo phiếu đề xuất mua hàng.");
      setPrForm(emptyPr);
      setPrLines([]);
      linkedPrsQ.refetch();
    } else toast.error(res.errorMessage || "Tạo PR thất bại.");
  }

  async function submitPr(prId: string) {
    const res = await purchaseRequests.submit(prId);
    if (res.errorCode === 200) { toast.success("Đã gửi phiếu đề xuất chờ duyệt."); linkedPrsQ.refetch(); }
    else toast.error(res.errorMessage || "Gửi duyệt thất bại.");
  }

  // Diagram 1: KTV chụp ảnh kết quả Trước/Sau khi sửa chữa.
  async function addPhoto(rawUrl: string, kind: "BEFORE" | "AFTER") {
    if (!t) return;
    const res = await tickets.addAttachment({ ticketId: t.id, fileUrl: encodePhoto(rawUrl, kind) });
    if (res.errorCode === 200) {
      toast.success(kind === "BEFORE" ? "Đã thêm ảnh trước khi sửa." : "Đã thêm ảnh sau khi sửa.");
      photosQ.refetch();
    } else toast.error(res.errorMessage || "Thêm ảnh thất bại.");
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!t) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy ticket."} onRetry={q.refetch} /></div>;

  const rem    = remaining(t);
  const nexts  = NEXT_STATUS[t.status] ?? [];
  const closed = isClosed(t);
  const canAssign = (t.status === "NEW" || t.status === "OPEN") && mayAssign;
  const primary = PRIMARY_NEXT[t.status];               // bước tiến chính (nếu có)
  const otherNexts = nexts.filter((s) => s !== primary?.to);
  const showMaterial = SHOW_MATERIAL.has(t.status);

  const beforePhotos = photosQ.items.filter((a) => photoKind(a.fileUrl) === "BEFORE").map((a) => ({ url: stripPhotoKind(a.fileUrl) }));
  const afterPhotos  = photosQ.items.filter((a) => photoKind(a.fileUrl) === "AFTER").map((a) => ({ url: stripPhotoKind(a.fileUrl) }));
  const otherPhotos  = photosQ.items.filter((a) => photoKind(a.fileUrl) === "OTHER").map((a) => ({ url: a.fileUrl }));
  const showPhotos   = showMaterial || photosQ.items.length > 0;

  return (
    <div>
      <Link href="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Danh sách ticket
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{t.ticketCode}</span>
            <ToneBadge tone="neutral">{CATEGORY[t.category ?? "OTHER"] ?? t.category}</ToneBadge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{t.title ?? t.ticketCode}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><User className="size-4" /> {t.reportedByName ?? displayUser(t.reportedBy) ?? "—"}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" /> {formatDateTime(t.createdAt)}</span>
            {t.unitId && <span className="flex items-center gap-1"><MapPin className="size-4" /> {t.unitId}</span>}
            {t.assignedToName && <span className="flex items-center gap-1"><UserPlus className="size-4" /> KTV: {t.assignedToName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SlaBadge dueDate={slaDue(t)} closed={closed} />
          <StatusBadge value={t.status} map={TICKET_STATUS} />
          <PriorityBadge value={t.priority} />
        </div>
      </div>

      {!closed && rem.overdue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-foreground">Đã vi phạm SLA</p>
            <p className="text-sm text-muted-foreground">Quá hạn xử lý <span className="font-medium text-danger">{rem.text}</span>. Cần ưu tiên xử lý ngay.</p>
          </div>
        </div>
      )}
      {!closed && !rem.overdue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <Clock className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-foreground">Còn {rem.text} đến hạn SLA</p>
            <p className="text-sm text-muted-foreground">Hạn xử lý: {formatDateTime(slaDue(t))}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Cột chính (2/3) ─────────────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Thông tin sự cố">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Tài sản liên quan">
                {t.assetId
                  ? <Link href={`/assets/${t.assetId}`} className="font-medium text-brand hover:underline">{t.assetCode ?? t.assetId}</Link>
                  : "—"}
              </Row>
              <Row label="Vị trí">{[t.unitId, t.floorId].filter(Boolean).join(" · ") || "—"}</Row>
              <Row label="Loại sự cố">{CATEGORY[t.category ?? "OTHER"] ?? t.category}</Row>
              <Row label="Nguồn báo">{SOURCE[t.source] ?? t.source}</Row>
              {t.description    && <div className="col-span-2"><Row label="Mô tả chi tiết">{t.description}</Row></div>}
              {t.resolutionNote && <div className="col-span-2"><Row label="Ghi chú xử lý"><span className="text-success">{t.resolutionNote}</span></Row></div>}
            </div>
          </Section>

          {/* ── UC52: Vật tư & Đề xuất mua hàng (inline) ──────────────────────── */}
          {showMaterial && (
            <Section title="Vật tư & Đề xuất mua hàng">
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
                    <p className="text-sm text-muted-foreground">Ticket đã đóng — không thể xuất vật tư.</p>
                  )}

                  {/* Danh sách giao dịch đã xuất */}
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
                    <ShoppingCart className="size-4 text-brand" /> Đề xuất mua hàng (PR)
                  </h3>
                  {!closed ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Mã phiếu đề xuất</label>
                        <Input value="" placeholder="Tự sinh khi lưu" readOnly disabled className="font-mono" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Người đề xuất (KTV phụ trách)</label>
                        <Input value={t.assignedToName ?? "Chưa phân công KTV"} readOnly disabled />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Tiêu đề</label>
                        <Input value={prForm.title} onChange={(e) => setPrForm((f) => ({ ...f, title: e.target.value }))} placeholder={`Vật tư cho ${t.ticketCode}`} />
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
                      <div className="col-span-full">
                        <MaterialLinesPicker value={prLines} onChange={setPrLines} label="Vật tư đề xuất" compact />
                      </div>
                      <div className="col-span-full flex justify-end">
                        <Button size="sm" onClick={doCreatePr} disabled={prWorking}>
                          <Plus className="size-4" /> Tạo phiếu đề xuất
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ticket đã đóng — không thể tạo phiếu đề xuất mới.</p>
                  )}

                  {/* Danh sách PR đã liên kết */}
                  {linkedPrsQ.items.length > 0 ? (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left">Mã PR</th>
                            <th className="px-3 py-2 text-left">Tiêu đề</th>
                            <th className="px-3 py-2 text-left">Người đề xuất</th>
                            <th className="px-3 py-2 text-left">Trạng thái</th>
                            <th className="px-3 py-2 text-left">Ngày tạo</th>
                            <th className="px-3 py-2 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {linkedPrsQ.items.map((pr) => (
                            <tr key={pr.id} className="hover:bg-surface-2/50">
                              <td className="px-3 py-2 font-mono text-xs">{pr.prCode}</td>
                              <td className="px-3 py-2">{pr.title ?? "—"}</td>
                              <td className="px-3 py-2 text-muted-foreground">{pr.requestedByName ?? displayUser(pr.requestedBy) ?? "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${pr.status === "APPROVED" ? "bg-success/15 text-success" : pr.status === "REJECTED" ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground"}`}>{pr.status}</span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(pr.createdAt)}</td>
                              <td className="px-3 py-2 text-right">
                                {(pr.status === "DRAFT" || pr.status === "REJECTED") && (
                                  <Button size="sm" variant="outline" onClick={() => submitPr(pr.id)}>Gửi duyệt</Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    !closed && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Inbox className="size-4" /> Chưa có phiếu đề xuất nào liên kết với ticket này.
                      </p>
                    )
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* ── Diagram 1: Chụp ảnh kết quả (Trước / Sau) ─────────────────────── */}
          {showPhotos && (
            <Section title="Ảnh hiện trường (Trước / Sau)">
              <div className="grid gap-4 sm:grid-cols-2">
                <PhotoCapture
                  title="Trước khi sửa"
                  photos={beforePhotos}
                  onAdd={(u) => addPhoto(u, "BEFORE")}
                  disabled={closed}
                  emptyHint="Chụp ảnh hiện trạng trước khi sửa chữa."
                />
                <PhotoCapture
                  title="Sau khi sửa"
                  photos={afterPhotos}
                  onAdd={(u) => addPhoto(u, "AFTER")}
                  disabled={closed}
                  emptyHint="Chụp ảnh kết quả sau khi hoàn tất."
                />
              </div>
              {otherPhotos.length > 0 && (
                <div className="mt-4">
                  <PhotoCapture title="Ảnh khác" photos={otherPhotos} onAdd={() => {}} disabled emptyHint="" />
                </div>
              )}
            </Section>
          )}

          <Section title="Timeline trạng thái">
            {historyQ.loading ? (
              <LoadingState />
            ) : (
              <ol className="space-y-4">
                {timeline.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-brand">
                        <CheckCircle2 className="size-4" />
                      </span>
                      {i < timeline.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={ev.status} map={TICKET_STATUS} />
                        <span className="text-xs text-muted-foreground">{formatDateTime(ev.at)}</span>
                      </div>
                      {ev.by   && <p className="mt-1 text-sm text-muted-foreground">Bởi {ev.by}</p>}
                      {ev.note && <p className="mt-0.5 text-sm text-foreground/90">{ev.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Nhật ký leo thang (escalation)">
            {escalationQ.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Inbox className="size-8" />
                Chưa có lần leo thang nào.
              </div>
            ) : (
              <ul className="space-y-3">
                {escalationQ.items.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 text-sm">
                    <ToneBadge tone="danger">L{e.escalationLevel}</ToneBadge>
                    <div>
                      <p className="text-foreground">{e.escalatedTo ?? "—"} {e.channel ? `· ${e.channel}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.escalatedAt)}</p>
                      {e.message && <p className="mt-0.5 text-foreground/90">{e.message}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* ── Cột phụ (1/3) ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Section title="SLA áp dụng">
            <div className="space-y-3 text-sm">
              <Row label="Cấu hình">{sla?.name ?? t.slaConfigName ?? "Tự động theo ưu tiên"}</Row>
              <Row label="Thời gian phản hồi">{sla?.responseTimeHours != null ? `${sla.responseTimeHours} giờ` : "—"}</Row>
              <Row label="Thời gian xử lý">{sla?.resolutionTimeHours != null ? `${sla.resolutionTimeHours} giờ` : `${SLA_HOURS[t.priority] ?? 24} giờ`}</Row>
              <Row label="Hạn xử lý"><SlaBadge dueDate={slaDue(t)} closed={closed} /></Row>
            </div>
          </Section>

          <Section title="Thao tác">
            <div className="space-y-2">
              {canAssign && (
                <Button className="w-full" onClick={() => setAssignOpen(true)}><UserPlus className="size-4" /> Phân công KTV</Button>
              )}
              {/* Bước tiến chính: nút rõ ràng để nhảy sang bước tiếp theo của luồng. */}
              {primary && !closed && mayChangeStatus && (
                <Button
                  className="w-full"
                  variant="default"
                  onClick={() => { setToStatus(primary.to); setStatusOpen(true); }}
                >
                  <ArrowRight className="size-4" /> {primary.label}
                </Button>
              )}
              {/* Chuyển sang trạng thái khác (rẽ nhánh, vd. chờ vật tư). */}
              {otherNexts.length > 0 && !closed && mayChangeStatus && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => { setToStatus(otherNexts[0]); setStatusOpen(true); }}
                >
                  <RefreshCw className="size-4" /> Trạng thái khác
                </Button>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tickets/sla-dashboard"><TrendingUp className="size-4" /> SLA Dashboard</Link>
              </Button>
            </div>
            {closed && <p className="mt-3 text-xs text-muted-foreground">Ticket đã đóng — không còn thao tác xử lý.</p>}
          </Section>

          <Section title="Người báo cáo">
            <div className="space-y-3 text-sm">
              <Row label="Người báo">{t.reportedByName ?? displayUser(t.reportedBy) ?? "—"}</Row>
              <Row label="Nguồn">{SOURCE[t.source] ?? t.source}</Row>
              <Row label="Thời gian">{formatDateTime(t.createdAt)}</Row>
            </div>
          </Section>

          {/* Tóm tắt vật tư */}
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
        description={`${t.ticketCode} · ${t.title ?? ""}`}
        size="sm"
        onSubmit={doAssign}
        submitting={working}
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
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title="Cập nhật trạng thái"
        description={`${t.ticketCode} · ${t.title ?? ""}`}
        size="sm"
        onSubmit={doTransition}
        submitting={working}
        submitLabel="Cập nhật"
      >
        <div className="space-y-4">
          <Field label="Chuyển sang" required>
            <Select value={toStatus} onValueChange={setToStatus}>
              <SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
              <SelectContent>
                {nexts.map((s) => <SelectItem key={s} value={s}>{TICKET_STATUS[s]?.label ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ghi chú" hint={toStatus === "RESOLVED" || toStatus === "CLOSED" ? "Mô tả cách xử lý" : undefined}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thao tác…" />
          </Field>
        </div>
      </EntityModal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
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
