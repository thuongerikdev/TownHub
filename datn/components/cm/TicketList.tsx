"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LifeBuoy, Trash2, Eye, AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import { toast } from "sonner";
import {
  tickets, assetApi, slaConfigs, displayUser,
  type TicketResponse, type CreateTicketInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockTickets } from "@/lib/mock/cm";
import { mockAssets } from "@/lib/mock/asset";
import { mockSlaConfigs } from "@/lib/mock/cm";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  StatusBadge, PriorityBadge, SlaBadge, ToneBadge, type Column, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";

const BUILDING = "11111111-1111-1111-1111-111111111111";

const TICKET_STATUS: Record<string, StatusDef> = {
  OPEN: { label: "Mới", tone: "info" },
  ASSIGNED: { label: "Đã phân công", tone: "brand" },
  IN_PROGRESS: { label: "Đang xử lý", tone: "warning" },
  PENDING_MATERIAL: { label: "Chờ vật tư", tone: "neutral" },
  RESOLVED: { label: "Đã xử lý", tone: "success" },
  CLOSED: { label: "Đã đóng", tone: "neutral" },
};
const STATUS_OPTIONS = ["OPEN", "ASSIGNED", "IN_PROGRESS", "PENDING_MATERIAL", "RESOLVED", "CLOSED"];

const CATEGORY: Record<string, string> = {
  ELECTRICAL: "Điện", PLUMBING: "Nước", HVAC: "HVAC", ELEVATOR: "Thang máy", FIRE: "PCCC", OTHER: "Khác",
};
const CATEGORY_OPTIONS = Object.keys(CATEGORY);
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SOURCE: Record<string, string> = { RESIDENT: "Cư dân", STAFF: "Nhân viên", SYSTEM: "Hệ thống", IOT: "Cảm biến IoT" };

// SLA resolution window (giờ) suy theo độ ưu tiên — để tô màu badge khi mock.
const SLA_HOURS: Record<string, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
const isClosed = (t: TicketResponse) => t.status === "RESOLVED" || t.status === "CLOSED";
function slaDue(t: TicketResponse): string {
  const hrs = SLA_HOURS[t.priority] ?? 24;
  return new Date(new Date(t.createdAt).getTime() + hrs * 3600_000).toISOString();
}

interface FormState {
  ticketCode: string; title: string; description: string;
  category: string; priority: string; source: string; assetId: string; slaConfigId: string;
}
const emptyForm: FormState = {
  ticketCode: "", title: "", description: "", category: "OTHER",
  priority: "MEDIUM", source: "STAFF", assetId: "", slaConfigId: "",
};

export default function TicketList(_props: { userRole?: string }) {
  const router = useRouter();
  // RBAC ở tầng giao diện: chỉ hiện nút Tạo/Xoá theo quyền (admin được bỏ qua trong hasPermission).
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("ticket.create");
  const q = useApiList<TicketResponse>(() => tickets.getAll(), { mock: mockTickets });
  const assetsQ = useApiList(() => assetApi.getAll(), { mock: mockAssets });
  const slaQ = useApiList(() => slaConfigs.getAll(), { mock: mockSlaConfigs });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [priorityF, setPriorityF] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<TicketResponse | null>(null);
  const [confirmDel, setConfirmDel] = useState<TicketResponse | null>(null);

  const stats = useMemo(() => ({
    open: list.filter((t) => t.status === "OPEN").length,
    inProgress: list.filter((t) => t.status === "IN_PROGRESS" || t.status === "ASSIGNED").length,
    breaching: list.filter((t) => !isClosed(t) && new Date(slaDue(t)).getTime() < Date.now()).length,
    resolved: list.filter((t) => isClosed(t)).length,
  }), [list]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((t) => {
      if (statusF !== "all" && t.status !== statusF) return false;
      if (priorityF !== "all" && t.priority !== priorityF) return false;
      if (!s) return true;
      return [t.ticketCode, t.title, t.assetCode, t.reportedByName ?? displayUser(t.reportedBy)].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF, priorityF]);

  function openCreate() {
    setForm({ ...emptyForm });
    setOpen(true);
  }

  async function submit() {
    if (!form.title.trim()) { toast.error("Nhập tiêu đề sự cố."); return; }
    const buildingId = assetsQ.items.find((a) => a.id === form.assetId)?.buildingId ?? BUILDING;
    const body: CreateTicketInput = {
      // Bỏ trống → server tự sinh mã.
      buildingId, reportedByName: "Hệ thống nội bộ",
      assetId: form.assetId || undefined, slaConfigId: form.slaConfigId || undefined,
      title: form.title.trim(), description: form.description.trim() || undefined,
      category: form.category, priority: form.priority, source: form.source,
    };
    setSubmitting(true);
    const res = await tickets.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo ticket.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Tạo ticket thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await tickets.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá ticket.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<TicketResponse>[] = [
    {
      key: "ticket", header: "Ticket", sortable: true, sortAccessor: (t) => t.ticketCode,
      cell: (t) => (
        <button className="text-left" onClick={() => router.push(`/tickets/${t.id}`)}>
          <span className="font-mono text-xs text-brand">{t.ticketCode}</span>
          <span className="block max-w-64 truncate text-sm font-medium text-foreground">{t.title ?? "—"}</span>
        </button>
      ),
    },
    { key: "category", header: "Loại", cell: (t) => <ToneBadge tone="neutral">{CATEGORY[t.category ?? "OTHER"] ?? t.category}</ToneBadge> },
    { key: "priority", header: "Ưu tiên", cell: (t) => <PriorityBadge value={t.priority} /> },
    { key: "sla", header: "SLA", sortable: true, sortAccessor: (t) => slaDue(t), cell: (t) => <SlaBadge dueDate={slaDue(t)} closed={isClosed(t)} /> },
    { key: "status", header: "Trạng thái", sortable: true, sortAccessor: (t) => t.status, cell: (t) => <StatusBadge value={t.status} map={TICKET_STATUS} /> },
    { key: "source", header: "Nguồn", cell: (t) => <span className="text-muted-foreground">{SOURCE[t.source] ?? t.source}</span> },
    { key: "created", header: "Tạo lúc", sortable: true, sortAccessor: (t) => t.createdAt, cell: (t) => <span className="text-muted-foreground">{formatDate(t.createdAt)}</span> },
    {
      key: "actions", header: "", align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetail(t)}><Eye className="size-4" /></Button>
          {canCreate && <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(t)}><Trash2 className="size-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Xử lý sự cố (CM)"
        description="Tiếp nhận, phân công và theo dõi SLA các ticket sự cố"
        icon={LifeBuoy}
        actions={canCreate ? <Button onClick={openCreate}><Plus className="size-4" /> Tạo ticket</Button> : undefined}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Đang mở" value={stats.open} icon={Inbox} tone="info" loading={q.loading} />
        <StatCard label="Đang xử lý" value={stats.inProgress} icon={LifeBuoy} tone="warning" loading={q.loading} />
        <StatCard label="Sắp/đã vi phạm SLA" value={stats.breaching} icon={AlertTriangle} tone="danger" loading={q.loading} />
        <StatCard label="Đã xử lý" value={stats.resolved} icon={CheckCircle2} tone="success" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm ticket, tài sản…">
        <Select value={priorityF} onValueChange={setPriorityF}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi ưu tiên</SelectItem>
            {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{TICKET_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(t) => t.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title="Tạo ticket sự cố"
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel="Tạo"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã ticket" hint="Tự sinh khi lưu">
            <Input value="" placeholder="TK-…" readOnly disabled className="font-mono" />
          </Field>
          <Field label="Nguồn">
            <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tiêu đề" required className="col-span-2">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Thang máy T12 không hoạt động" />
          </Field>
          <Field label="Loại sự cố">
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{CATEGORY[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Độ ưu tiên">
            <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tài sản liên quan">
            <Select value={form.assetId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, assetId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="— Không có —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không có —</SelectItem>
                {assetsQ.items.map((a) => <SelectItem key={a.id} value={a.id}>{a.assetCode} · {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cấu hình SLA">
            <Select value={form.slaConfigId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, slaConfigId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="— Tự động —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tự động —</SelectItem>
                {slaQ.items.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mô tả" className="col-span-2">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mô tả chi tiết sự cố…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.ticketCode ?? ""}
        description={detail?.title}
        size="lg"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button>
            {detail && <Button onClick={() => router.push(`/tickets/${detail.id}`)}>Mở chi tiết</Button>}
          </div>
        }
      >
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={TICKET_STATUS} /></DetailRow>
            <DetailRow label="SLA"><SlaBadge dueDate={slaDue(detail)} closed={isClosed(detail)} /></DetailRow>
            <DetailRow label="Loại">{CATEGORY[detail.category ?? "OTHER"] ?? detail.category}</DetailRow>
            <DetailRow label="Ưu tiên"><PriorityBadge value={detail.priority} /></DetailRow>
            <DetailRow label="Tài sản">{detail.assetCode ?? "—"}</DetailRow>
            <DetailRow label="Nguồn">{SOURCE[detail.source] ?? detail.source}</DetailRow>
            <DetailRow label="Người báo">{detail.reportedByName ?? displayUser(detail.reportedBy) ?? "—"}</DetailRow>
            <DetailRow label="Cấu hình SLA">{detail.slaConfigName ?? "—"}</DetailRow>
            <DetailRow label="Tạo lúc">{formatDateTime(detail.createdAt)}</DetailRow>
            <DetailRow label="Xử lý lúc">{detail.resolvedAt ? formatDateTime(detail.resolvedAt) : "—"}</DetailRow>
            {detail.description && <div className="col-span-2"><DetailRow label="Mô tả">{detail.description}</DetailRow></div>}
            {detail.resolutionNote && <div className="col-span-2"><DetailRow label="Ghi chú xử lý">{detail.resolutionNote}</DetailRow></div>}
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá ticket?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.ticketCode}</strong>?</p>
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
