"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ClipboardList, Pencil, Trash2, Eye, Wrench, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, assetApi, checklistTemplates, toWorkOrderUpdate,
  type WorkOrderResponse, type CreateWorkOrderInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockWorkOrders } from "@/lib/mock/pm";
import { mockAssets } from "@/lib/mock/asset";
import { mockChecklistTemplates } from "@/lib/mock/pm";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  StatusBadge, PriorityBadge, ToneBadge, type Column, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { isWorkOrderOwnerScoped } from "@/lib/rbac";

const WO_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  ASSIGNED: { label: "Đã phân công", tone: "info" },
  IN_PROGRESS: { label: "Đang thực hiện", tone: "warning" },
  PENDING_REVIEW: { label: "Chờ nghiệm thu", tone: "brand" },
  COMPLETED: { label: "Hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
};

const STATUS_OPTIONS = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED"];
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "URGENT"];

interface FormState {
  woCode: string; assetId: string; checklistTemplateId: string; woType: string;
  priority: string; title: string; description: string;
  scheduledDate: string; dueDate: string; estimatedHours: string;
}
const emptyForm: FormState = {
  woCode: "", assetId: "", checklistTemplateId: "", woType: "PM",
  priority: "MEDIUM", title: "", description: "", scheduledDate: "", dueDate: "", estimatedHours: "",
};
const toDateInput = (v?: string) => (v ? v.slice(0, 10) : "");

function DueCell({ value, done }: { value?: string; done?: boolean }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(value);
  const overdue = !done && d != null && d < 0;
  const soon = !done && d != null && d >= 0 && d <= 1;
  return (
    <span className={overdue ? "font-medium text-danger" : soon ? "font-medium text-warning" : ""}>
      {formatDate(value)}
    </span>
  );
}

export default function WorkOrderList(_props: { userRole?: string }) {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const mayCreate = hasPermission("workorder.create");
  // Backend chỉ trả về phiếu được phân công cho KTV — nói rõ để tránh hiểu nhầm là mất dữ liệu.
  const ownScoped = isWorkOrderOwnerScoped(hasPermission);
  const q = useApiList<WorkOrderResponse>(() => workOrders.getAll(), { mock: mockWorkOrders });
  const assetsQ = useApiList(() => assetApi.getAll(), { mock: mockAssets });
  const tplQ = useApiList(() => checklistTemplates.getAll(), { mock: mockChecklistTemplates });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [typeF, setTypeF] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrderResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<WorkOrderResponse | null>(null);
  const [confirmDel, setConfirmDel] = useState<WorkOrderResponse | null>(null);

  const stats = useMemo(() => ({
    total: list.length,
    pendingAssign: list.filter((w) => w.status === "DRAFT").length,
    inProgress: list.filter((w) => w.status === "IN_PROGRESS").length,
    overdue: list.filter((w) => w.status !== "COMPLETED" && w.status !== "CANCELLED" && (daysUntil(w.dueDate) ?? 1) < 0).length,
  }), [list]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((w) => {
      if (statusF !== "all" && w.status !== statusF) return false;
      if (typeF !== "all" && w.woType !== typeF) return false;
      if (!s) return true;
      return [w.woCode, w.title, w.assetCode, w.assetName].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF, typeF]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm); // Mã WO do server sinh khi lưu.
    setOpen(true);
  }
  function openEdit(w: WorkOrderResponse) {
    setEditing(w);
    setForm({
      woCode: w.woCode, assetId: w.assetId, checklistTemplateId: w.checklistTemplateId, woType: w.woType,
      priority: w.priority, title: w.title ?? "", description: w.description ?? "",
      scheduledDate: toDateInput(w.scheduledDate), dueDate: toDateInput(w.dueDate),
      estimatedHours: w.estimatedHours != null ? String(w.estimatedHours) : "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.assetId) { toast.error("Chọn tài sản."); return; }
    if (!form.checklistTemplateId) { toast.error("Chọn checklist template."); return; }
    if (!form.title.trim()) { toast.error("Nhập tiêu đề công việc."); return; }
    const buildingId = assetsQ.items.find((a) => a.id === form.assetId)?.buildingId ?? "";
    const creatorName = user
      ? `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.userName
      : undefined;
    const base: CreateWorkOrderInput = {
      woCode: form.woCode.trim(), assetId: form.assetId, checklistTemplateId: form.checklistTemplateId,
      buildingId, woType: form.woType, title: form.title.trim(),
      description: form.description.trim() || undefined, priority: form.priority,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate + "T00:00:00Z").toISOString() : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate + "T00:00:00Z").toISOString() : undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      // Người tạo lấy từ tài khoản đang đăng nhập (chỉ gán khi tạo mới)
      ...(editing ? {} : { createdByUserId: user?.userID, createdByName: creatorName }),
    };
    setSubmitting(true);
    const res = editing
      ? await workOrders.update(toWorkOrderUpdate(editing, base))
      : await workOrders.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật Work Order." : "Đã tạo Work Order.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await workOrders.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá Work Order.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<WorkOrderResponse>[] = [
    {
      key: "wo", header: "Work Order", sortable: true, sortAccessor: (w) => w.woCode,
      cell: (w) => (
        <button className="text-left" onClick={() => router.push(`/pm/work-orders/${w.id}`)}>
          <span className="font-mono text-xs text-brand">{w.woCode}</span>
          <span className="block max-w-56 truncate text-sm font-medium text-foreground">{w.title ?? "—"}</span>
        </button>
      ),
    },
    { key: "asset", header: "Tài sản", cell: (w) => <div><span className="block text-sm">{w.assetName ?? "—"}</span><span className="font-mono text-xs text-muted-foreground">{w.assetCode}</span></div> },
    { key: "type", header: "Loại", cell: (w) => <ToneBadge tone={w.woType === "CM" ? "warning" : "info"}>{w.woType}</ToneBadge> },
    { key: "priority", header: "Ưu tiên", cell: (w) => <PriorityBadge value={w.priority} /> },
    { key: "status", header: "Trạng thái", sortable: true, sortAccessor: (w) => w.status, cell: (w) => <StatusBadge value={w.status} map={WO_STATUS} /> },
    { key: "due", header: "Hạn", sortable: true, sortAccessor: (w) => w.dueDate ?? "", cell: (w) => <DueCell value={w.dueDate} done={w.status === "COMPLETED"} /> },
    { key: "cost", header: "Chi phí", align: "right", sortable: true, sortAccessor: (w) => w.totalCost ?? 0, cell: (w) => formatCurrency(w.totalCost) },
    {
      key: "actions", header: "", align: "right",
      cell: (w) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetail(w)}><Eye className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(w)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(w)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Work Order — Bảo trì định kỳ"
        description={ownScoped
          ? "Các lệnh công việc được phân công cho bạn"
          : "Quản lý lệnh công việc PM/CM theo vòng đời"}
        icon={ClipboardList}
        actions={mayCreate ? <Button onClick={openCreate}><Plus className="size-4" /> Tạo Work Order</Button> : undefined}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng WO" value={stats.total} icon={ClipboardList} tone="brand" loading={q.loading} />
        <StatCard label="Chờ phân công" value={stats.pendingAssign} icon={Clock} tone="info" loading={q.loading} />
        <StatCard label="Đang thực hiện" value={stats.inProgress} icon={Wrench} tone="warning" loading={q.loading} />
        <StatCard label="Trễ hạn" value={stats.overdue} icon={Clock} tone="danger" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm WO, tài sản…">
        <Select value={typeF} onValueChange={setTypeF}>
          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi loại</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
            <SelectItem value="CM">CM</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{WO_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(w) => w.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật Work Order" : "Tạo Work Order"}
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã WO">
            {/* Mã tự sinh phía server, không cho sửa. */}
            <Input value={editing ? form.woCode : ""} placeholder="Tự sinh khi lưu" readOnly disabled className="font-mono" />
          </Field>
          <Field label="Loại">
            <Select value={form.woType} onValueChange={(v) => setForm((f) => ({ ...f, woType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PM">PM — Bảo trì định kỳ</SelectItem>
                <SelectItem value="CM">CM — Sửa chữa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tài sản" required>
            <Select value={form.assetId} onValueChange={(v) => setForm((f) => ({ ...f, assetId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn tài sản" /></SelectTrigger>
              <SelectContent>
                {assetsQ.items.map((a) => <SelectItem key={a.id} value={a.id}>{a.assetCode} · {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Checklist template" required>
            <Select value={form.checklistTemplateId} onValueChange={(v) => setForm((f) => ({ ...f, checklistTemplateId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn template" /></SelectTrigger>
              <SelectContent>
                {tplQ.items.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tiêu đề" required className="col-span-2">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Bảo trì định kỳ thang máy T1" />
          </Field>
          <Field label="Độ ưu tiên">
            <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ước tính (giờ)">
            <Input type="number" min="0" value={form.estimatedHours} onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} placeholder="3" />
          </Field>
          <Field label="Ngày thực hiện">
            <Input type="date" value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
          </Field>
          <Field label="Hạn hoàn thành">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </Field>
          <Field label="Mô tả công việc" className="col-span-2">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mô tả chi tiết công việc cần thực hiện…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail ? `${detail.woCode}` : ""}
        description={detail?.title}
        size="lg"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button>
            {detail && <Button onClick={() => { router.push(`/pm/work-orders/${detail.id}`); }}>Mở chi tiết</Button>}
          </div>
        }
      >
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailRow label="Loại"><ToneBadge tone={detail.woType === "CM" ? "warning" : "info"}>{detail.woType}</ToneBadge></DetailRow>
            <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={WO_STATUS} /></DetailRow>
            <DetailRow label="Tài sản">{detail.assetName} · {detail.assetCode}</DetailRow>
            <DetailRow label="Checklist">{detail.checklistTemplateName ?? "—"}</DetailRow>
            <DetailRow label="Ưu tiên"><PriorityBadge value={detail.priority} /></DetailRow>
            <DetailRow label="Hạn">{formatDate(detail.dueDate)}</DetailRow>
            <DetailRow label="Ước tính">{detail.estimatedHours != null ? `${detail.estimatedHours} giờ` : "—"}</DetailRow>
            <DetailRow label="Thực tế">{detail.actualHours != null ? `${detail.actualHours} giờ` : "—"}</DetailRow>
            <DetailRow label="Chi phí">{formatCurrency(detail.totalCost)}</DetailRow>
            <DetailRow label="Người tạo">{detail.createdByName ?? detail.createdBy ?? "—"}</DetailRow>
            {detail.description && <div className="col-span-2"><DetailRow label="Mô tả">{detail.description}</DetailRow></div>}
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá Work Order?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.woCode}</strong>?</p>
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
