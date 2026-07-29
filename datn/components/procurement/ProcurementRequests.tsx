"use client";

import { useMemo, useState } from "react";
import { Plus, ShoppingCart, Check, X, Trash2, Eye, Clock, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  purchaseRequests, users, displayUser, EMPTY_GUID,
  type PurchaseRequestResponse, type CreatePurchaseRequestInput, type PurchaseLineInput, type RoleMember,
} from "@/lib/api";
import { MaterialLinesPicker } from "@/components/shared/material-lines-picker";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockPurchaseRequests } from "@/lib/mock/procurement";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  StatusBadge, PriorityBadge, type Column, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

const PR_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  SUBMITTED: { label: "Chờ duyệt", tone: "warning" },
  APPROVED: { label: "Đã duyệt", tone: "success" },
  REJECTED: { label: "Từ chối", tone: "danger" },
  CONVERTED: { label: "Đã tạo PO", tone: "info" },
};
const STATUS_OPTIONS = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CONVERTED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface FormState {
  title: string; justification: string; priority: string; neededByDate: string; requestedById: string;
}
const emptyForm: FormState = { title: "", justification: "", priority: "MEDIUM", neededByDate: "", requestedById: "" };

export default function ProcurementRequests() {
  const q = useApiList<PurchaseRequestResponse>(() => purchaseRequests.getAll(), { mock: mockPurchaseRequests });
  const list = q.items;
  // Danh sách người đề xuất — chọn theo ID (không nhập tay), giống phân công KTV ở WO/Ticket.
  const staffQ = useApiList<RoleMember>(() => users.getByRole("Kỹ thuật viên"));
  // RBAC ở tầng giao diện: chỉ hiện nút theo quyền (admin được bỏ qua).
  const { hasPermission } = useAuth();
  const canRequest = hasPermission("procurement.request");
  const canApprove = hasPermission("procurement.approve");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [lines, setLines] = useState<PurchaseLineInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<PurchaseRequestResponse | null>(null);
  // Dòng vật tư của PR đang xem chi tiết.
  const detailItemsQ = useApiList(() => purchaseRequests.getItems(detail!.id), { deps: [detail?.id], enabled: !!detail });
  const [rejecting, setRejecting] = useState<PurchaseRequestResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmDel, setConfirmDel] = useState<PurchaseRequestResponse | null>(null);

  const stats = useMemo(() => ({
    total: list.length,
    pending: list.filter((p) => p.status === "SUBMITTED").length,
    approved: list.filter((p) => p.status === "APPROVED" || p.status === "CONVERTED").length,
    rejected: list.filter((p) => p.status === "REJECTED").length,
  }), [list]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((p) => {
      if (statusF !== "all" && p.status !== statusF) return false;
      if (!s) return true;
      return [p.prCode, p.title, p.requestedByName ?? displayUser(p.requestedBy), p.woCode, p.ticketCode].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF]);

  function openCreate() {
    setForm(emptyForm); // Mã PR do server sinh khi lưu.
    setLines([]);
    setOpen(true);
  }

  async function submit() {
    if (!form.title.trim()) { toast.error("Nhập tiêu đề đề xuất."); return; }
    const performer = staffQ.items.find((u) => String(u.userID) === form.requestedById);
    if (!performer) { toast.error("Chọn người đề xuất."); return; }
    const body: CreatePurchaseRequestInput = {
      requestedByUserId: performer.userID,
      requestedByName: performer.fullName?.trim() || performer.userName,
      title: form.title.trim(),
      justification: form.justification.trim() || undefined, priority: form.priority,
      neededByDate: form.neededByDate || undefined,
      items: lines.length ? lines : undefined,
    };
    setSubmitting(true);
    const res = await purchaseRequests.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo đề xuất mua hàng.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Tạo PR thất bại.");
  }

  async function submitForApproval(p: PurchaseRequestResponse) {
    if (busyId) return;
    setBusyId(p.id);
    const res = await purchaseRequests.submit(p.id);
    setBusyId(null);
    if (res.errorCode === 200) { toast.success(`Đã gửi duyệt ${p.prCode}.`); q.refetch(); }
    else toast.error(res.errorMessage || "Gửi duyệt thất bại.");
  }
  async function approve(p: PurchaseRequestResponse) {
    if (busyId) return;
    setBusyId(p.id);
    const res = await purchaseRequests.approve(p.id, EMPTY_GUID);
    setBusyId(null);
    if (res.errorCode === 200) { toast.success(`Đã duyệt ${p.prCode}.`); q.refetch(); }
    else toast.error(res.errorMessage || "Duyệt thất bại.");
  }
  async function doReject() {
    if (!rejecting || busyId) return;
    setBusyId(rejecting.id);
    const res = await purchaseRequests.reject(rejecting.id, rejectReason.trim() || "Không đạt yêu cầu");
    setBusyId(null);
    if (res.errorCode === 200) {
      toast.success(`Đã từ chối ${rejecting.prCode}.`);
      setRejecting(null); setRejectReason("");
      q.refetch();
    } else toast.error(res.errorMessage || "Từ chối thất bại.");
  }
  async function doDelete() {
    if (!confirmDel || busyId) return;
    setBusyId(confirmDel.id);
    const res = await purchaseRequests.delete(confirmDel.id);
    setBusyId(null);
    if (res.errorCode === 200) { toast.success("Đã xoá đề xuất."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<PurchaseRequestResponse>[] = [
    {
      key: "pr", header: "Đề xuất", sortable: true, sortAccessor: (p) => p.prCode,
      cell: (p) => <div><span className="font-mono text-xs text-brand">{p.prCode}</span><span className="block max-w-64 truncate text-sm font-medium text-foreground">{p.title ?? "—"}</span></div>,
    },
    { key: "by", header: "Người đề xuất", cell: (p) => <span className="text-sm">{p.requestedByName ?? displayUser(p.requestedBy) ?? "—"}</span> },
    { key: "priority", header: "Ưu tiên", cell: (p) => <PriorityBadge value={p.priority} /> },
    { key: "link", header: "Liên kết", cell: (p) => <span className="font-mono text-xs text-muted-foreground">{p.woCode ?? p.ticketCode ?? "—"}</span> },
    { key: "needed", header: "Cần trước", sortable: true, sortAccessor: (p) => p.neededByDate ?? "", cell: (p) => <span className="text-muted-foreground">{formatDate(p.neededByDate)}</span> },
    { key: "status", header: "Trạng thái", sortable: true, sortAccessor: (p) => p.status, cell: (p) => <StatusBadge value={p.status} map={PR_STATUS} /> },
    {
      key: "actions", header: "", align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          {canRequest && (p.status === "DRAFT" || p.status === "REJECTED") && (
            <Button variant="ghost" size="icon" title="Gửi duyệt" className="text-brand hover:text-brand" disabled={busyId === p.id} onClick={() => submitForApproval(p)}><Send className="size-4" /></Button>
          )}
          {canApprove && p.status === "SUBMITTED" && (
            <>
              <Button variant="ghost" size="icon" title="Duyệt" className="text-success hover:text-success" disabled={busyId === p.id} onClick={() => approve(p)}><Check className="size-4" /></Button>
              <Button variant="ghost" size="icon" title="Từ chối" className="text-danger hover:text-danger" onClick={() => setRejecting(p)}><X className="size-4" /></Button>
            </>
          )}
          <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetail(p)}><Eye className="size-4" /></Button>
          {canRequest && <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(p)}><Trash2 className="size-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Đề xuất mua hàng (PR)"
        description="Tạo và phê duyệt yêu cầu mua sắm vật tư"
        icon={ShoppingCart}
        actions={canRequest ? <Button onClick={openCreate}><Plus className="size-4" /> Tạo PR</Button> : undefined}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng PR" value={stats.total} icon={ShoppingCart} tone="brand" loading={q.loading} />
        <StatCard label="Chờ duyệt" value={stats.pending} icon={Clock} tone="warning" loading={q.loading} />
        <StatCard label="Đã duyệt" value={stats.approved} icon={CheckCircle2} tone="success" loading={q.loading} />
        <StatCard label="Từ chối" value={stats.rejected} icon={X} tone="danger" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm PR, vật tư…">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{PR_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(p) => p.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title="Tạo đề xuất mua hàng"
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel="Tạo"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã PR">
            {/* Mã do server sinh, không cho sửa. */}
            <Input value="" placeholder="Tự sinh khi lưu" readOnly disabled className="font-mono" />
          </Field>
          <Field label="Người đề xuất" required>
            <Select value={form.requestedById} onValueChange={(v) => setForm((f) => ({ ...f, requestedById: v }))}>
              <SelectTrigger>
                <SelectValue placeholder={staffQ.loading ? "Đang tải…" : staffQ.items.length ? "Chọn người đề xuất" : "Chưa có nhân sự"} />
              </SelectTrigger>
              <SelectContent>
                {staffQ.items.map((u) => (
                  <SelectItem key={u.userID} value={String(u.userID)}>{u.fullName?.trim() || u.userName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tiêu đề" required className="col-span-2">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Mua cáp thép thang máy bổ sung tồn kho" />
          </Field>
          <Field label="Độ ưu tiên">
            <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cần trước ngày">
            <Input type="date" value={form.neededByDate} onChange={(e) => setForm((f) => ({ ...f, neededByDate: e.target.value }))} />
          </Field>
          <Field label="Lý do mua" className="col-span-2">
            <Textarea rows={3} value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} placeholder="Tồn kho dưới mức tối thiểu, cần cho công việc đang chờ…" />
          </Field>
          <div className="col-span-2">
            <MaterialLinesPicker value={lines} onChange={setLines} label="Vật tư đề xuất" />
          </div>
        </div>
      </EntityModal>

      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.prCode ?? ""}
        description={detail?.title}
        size="md"
        footer={<div className="flex justify-end border-t border-border px-6 py-4"><Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button></div>}
      >
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={PR_STATUS} /></DetailRow>
            <DetailRow label="Ưu tiên"><PriorityBadge value={detail.priority} /></DetailRow>
            <DetailRow label="Người đề xuất">{detail.requestedByName ?? displayUser(detail.requestedBy) ?? "—"}</DetailRow>
            <DetailRow label="Cần trước">{formatDate(detail.neededByDate)}</DetailRow>
            <DetailRow label="Liên kết">{detail.woCode ?? detail.ticketCode ?? "—"}</DetailRow>
            <DetailRow label="Ngày tạo">{formatDate(detail.createdAt)}</DetailRow>
            {displayUser(detail.approvedBy) && <DetailRow label="Người duyệt">{displayUser(detail.approvedBy)}</DetailRow>}
            {detail.justification && <div className="col-span-2"><DetailRow label="Lý do">{detail.justification}</DetailRow></div>}
            {detail.rejectedReason && <div className="col-span-2"><DetailRow label="Lý do từ chối">{detail.rejectedReason}</DetailRow></div>}
            <div className="col-span-2">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Vật tư đề xuất ({detailItemsQ.items.length})</p>
              {detailItemsQ.loading ? (
                <p className="text-sm text-muted-foreground">Đang tải…</p>
              ) : detailItemsQ.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Phiếu này chưa có dòng vật tư.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {detailItemsQ.items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span><span className="font-medium text-foreground">{it.materialName ?? it.materialId}</span> <span className="text-xs text-muted-foreground">{it.materialCode}</span></span>
                      <span className="text-xs text-muted-foreground">{it.warehouseName ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!rejecting}
        onOpenChange={(o) => { if (!o) { setRejecting(null); setRejectReason(""); } }}
        title="Từ chối đề xuất?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => { setRejecting(null); setRejectReason(""); }}>Huỷ</Button>
            <Button variant="destructive" onClick={doReject}>Từ chối</Button>
          </div>
        }
      >
        <Field label={`Lý do từ chối ${rejecting?.prCode ?? ""}`}>
          <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Vượt ngân sách quý…" />
        </Field>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá đề xuất?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.prCode}</strong>?</p>
      </EntityModal>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}
