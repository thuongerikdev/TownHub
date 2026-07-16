"use client";

import { useMemo, useState } from "react";
import {
  Plus, CalendarClock, Pencil, Trash2, Pause, Play, AlarmClock, CheckCircle2, Wrench, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  maintenanceSchedules, assetApi, checklistTemplates, workOrders, toScheduleUpdate,
  type MaintenanceScheduleResponse, type CreateMaintenanceScheduleInput,
  type AssetResponse, type ChecklistTemplateResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockMaintenanceSchedules, mockChecklistTemplates } from "@/lib/mock/pm";
import { mockAssets } from "@/lib/mock/asset";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  ToneBadge, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate, daysUntil } from "@/lib/format";

const SCHEDULE_TYPES = ["PM", "INSPECTION", "CALIBRATION"];
const SCHEDULE_TYPE_LABEL: Record<string, string> = { PM: "Bảo trì định kỳ", INSPECTION: "Kiểm tra", CALIBRATION: "Hiệu chuẩn" };

interface FormState {
  assetId: string; checklistTemplateId: string; scheduleType: string;
  frequencyDays: string; startDate: string; leadTimeDays: string; isActive: boolean; description: string;
}
const emptyForm: FormState = {
  assetId: "", checklistTemplateId: "", scheduleType: "PM",
  frequencyDays: "30", startDate: "", leadTimeDays: "7", isActive: true, description: "",
};

// Ô hạn kế tiếp: đỏ khi quá hạn, vàng khi tới gần (≤ leadTime), xám bình thường.
function NextDueCell({ s }: { s: MaintenanceScheduleResponse }) {
  if (!s.nextDueDate) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(s.nextDueDate);
  const lead = s.leadTimeDays || 7;
  const tone = !s.isActive || d == null ? "neutral" : d < 0 ? "danger" : d <= lead ? "warning" : "neutral";
  if (tone === "neutral") return <span className="text-muted-foreground">{formatDate(s.nextDueDate)}</span>;
  return (
    <ToneBadge tone={tone} dot>
      {formatDate(s.nextDueDate)}{d != null && d < 0 ? ` · trễ ${Math.abs(d)}d` : d != null ? ` · còn ${d}d` : ""}
    </ToneBadge>
  );
}

export default function PMSchedules() {
  const q = useApiList<MaintenanceScheduleResponse>(() => maintenanceSchedules.getAll(), { mock: mockMaintenanceSchedules });
  const assetsQ = useApiList<AssetResponse>(() => assetApi.getAll(), { mock: mockAssets });
  const tplQ = useApiList<ChecklistTemplateResponse>(() => checklistTemplates.getAll(), { mock: mockChecklistTemplates });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceScheduleResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<MaintenanceScheduleResponse | null>(null);
  const [woBusyId, setWoBusyId] = useState<string | null>(null);
  const [woDoneIds, setWoDoneIds] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const active = list.filter((s) => s.isActive);
    return {
      total: list.length,
      active: active.length,
      overdue: active.filter((s) => { const d = daysUntil(s.nextDueDate); return d != null && d < 0; }).length,
      dueSoon: active.filter((s) => { const d = daysUntil(s.nextDueDate); return d != null && d >= 0 && d <= (s.leadTimeDays || 7); }).length,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((sc) => {
      if (statusF === "active" && !sc.isActive) return false;
      if (statusF === "paused" && sc.isActive) return false;
      if (!s) return true;
      return [sc.assetName, sc.assetCode, sc.checklistTemplateName].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(s: MaintenanceScheduleResponse) {
    setEditing(s);
    setForm({
      assetId: s.assetId, checklistTemplateId: s.checklistTemplateId, scheduleType: s.scheduleType || "PM",
      frequencyDays: String(s.frequencyDays ?? 30), startDate: s.startDate?.slice(0, 10) ?? "",
      leadTimeDays: String(s.leadTimeDays ?? 7), isActive: s.isActive, description: s.description ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.assetId) { toast.error("Chọn tài sản."); return; }
    if (!form.checklistTemplateId) { toast.error("Chọn mẫu checklist."); return; }
    const base: CreateMaintenanceScheduleInput = {
      assetId: form.assetId, scheduleType: form.scheduleType, checklistTemplateId: form.checklistTemplateId,
      frequencyType: "INTERVAL", frequencyDays: Number(form.frequencyDays) || 30,
      startDate: form.startDate || undefined, leadTimeDays: Number(form.leadTimeDays) || 0,
      isActive: form.isActive, description: form.description.trim() || undefined,
    };
    setSubmitting(true);
    const res = editing
      ? await maintenanceSchedules.update(toScheduleUpdate(editing, base))
      : await maintenanceSchedules.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật lịch bảo trì." : "Đã tạo lịch bảo trì.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  // Tạo WO từ lịch → gắn scheduleId, rồi dời hạn 1 chu kỳ + ghi "lần gần nhất = hôm nay".
  async function createWO(s: MaintenanceScheduleResponse) {
    const asset = assetsQ.items.find((a) => a.id === s.assetId);
    if (!asset?.buildingId) { toast.error("Tài sản chưa gắn toà nhà — không tạo được WO."); return; }
    setWoBusyId(s.id);
    const nowIso = new Date().toISOString();
    const woRes = await workOrders.create({
      woCode: "", // server tự sinh
      assetId: s.assetId, checklistTemplateId: s.checklistTemplateId, buildingId: asset.buildingId,
      scheduleId: s.id, woType: "PM", priority: "MEDIUM",
      title: `${SCHEDULE_TYPE_LABEL[s.scheduleType] ?? s.scheduleType}: ${s.assetName ?? asset.name ?? asset.assetCode}`,
      description: s.description || undefined,
      scheduledDate: s.nextDueDate || nowIso, dueDate: s.nextDueDate || nowIso,
    });
    if (woRes.errorCode !== 200) {
      setWoBusyId(null);
      toast.error(woRes.errorMessage || "Tạo WO thất bại.");
      return;
    }
    // Dời hạn kế tiếp thêm 1 chu kỳ + ghi lần xử lý.
    const cycle = s.frequencyDays || 30;
    const base = s.nextDueDate ? new Date(s.nextDueDate) : new Date();
    const next = new Date(base.getTime() + cycle * 86400000);
    await maintenanceSchedules.update(toScheduleUpdate(s, { lastExecutedAt: nowIso, nextDueDate: next.toISOString() }));
    setWoBusyId(null);
    setWoDoneIds((prev) => new Set(prev).add(s.id));
    toast.success("Đã tạo WO và dời hạn lịch sang chu kỳ tiếp theo.");
    q.refetch();
  }

  async function toggleActive(s: MaintenanceScheduleResponse) {
    const res = await maintenanceSchedules.update(toScheduleUpdate(s, { isActive: !s.isActive }));
    if (res.errorCode === 200) { toast.success(s.isActive ? "Đã tạm dừng lịch." : "Đã kích hoạt lịch."); q.refetch(); }
    else toast.error(res.errorMessage || "Thao tác thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await maintenanceSchedules.delete(confirmDel.id);
    if (res.errorCode === 200) { toast.success("Đã xoá lịch bảo trì."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<MaintenanceScheduleResponse>[] = [
    {
      key: "asset", header: "Tài sản", sortable: true, sortAccessor: (s) => s.assetName ?? s.assetCode ?? "",
      cell: (s) => (
        <div>
          <span className="font-medium text-foreground">{s.assetName ?? "—"}</span>
          <span className="block font-mono text-xs text-muted-foreground">{s.assetCode ?? ""}</span>
        </div>
      ),
    },
    {
      key: "freq", header: "Chu kỳ", sortable: true, sortAccessor: (s) => s.frequencyDays ?? 0,
      cell: (s) => (
        <div className="text-sm">
          <span className="text-foreground">Mỗi {s.frequencyDays ?? "—"} ngày</span>
          <span className="block text-xs text-muted-foreground">{SCHEDULE_TYPE_LABEL[s.scheduleType] ?? s.scheduleType}</span>
        </div>
      ),
    },
    { key: "tpl", header: "Checklist", cell: (s) => <span className="text-sm text-muted-foreground">{s.checklistTemplateName ?? "—"}</span> },
    { key: "next", header: "Hạn kế tiếp", sortable: true, sortAccessor: (s) => s.nextDueDate ?? "", cell: (s) => <NextDueCell s={s} /> },
    { key: "last", header: "Lần gần nhất", cell: (s) => <span className="text-muted-foreground">{formatDate(s.lastExecutedAt)}</span> },
    {
      key: "status", header: "Trạng thái", sortable: true, sortAccessor: (s) => (s.isActive ? 1 : 0),
      cell: (s) => s.isActive ? <ToneBadge tone="success" dot>Đang chạy</ToneBadge> : <ToneBadge tone="neutral" dot>Tạm dừng</ToneBadge>,
    },
    {
      key: "actions", header: "", align: "right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          {woDoneIds.has(s.id) ? (
            <ToneBadge tone="success" dot>Đã tạo WO</ToneBadge>
          ) : (
            <Button variant="outline" size="sm" className="h-8 gap-1.5" title="Tạo lệnh công việc từ lịch này"
              disabled={woBusyId === s.id} onClick={() => createWO(s)}>
              {woBusyId === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Wrench className="size-3.5" />}
              Tạo WO
            </Button>
          )}
          <Button variant="ghost" size="icon" title={s.isActive ? "Tạm dừng" : "Kích hoạt"} onClick={() => toggleActive(s)}>
            {s.isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(s)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lịch bảo trì định kỳ"
        description="Quản lý chu kỳ PM, tự sinh phiếu công việc trước hạn"
        icon={CalendarClock}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Tạo lịch</Button>}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng lịch" value={stats.total} icon={CalendarClock} tone="brand" loading={q.loading} />
        <StatCard label="Đang chạy" value={stats.active} icon={CheckCircle2} tone="success" loading={q.loading} />
        <StatCard label="Sắp tới hạn" value={stats.dueSoon} icon={AlarmClock} tone="warning" loading={q.loading} />
        <StatCard label="Quá hạn" value={stats.overdue} icon={AlarmClock} tone="danger" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm tài sản, checklist…">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">Đang chạy</SelectItem>
            <SelectItem value="paused">Tạm dừng</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(s) => s.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật lịch bảo trì" : "Tạo lịch bảo trì"}
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tài sản" required className="col-span-2">
            <Select value={form.assetId} onValueChange={(v) => setForm((f) => ({ ...f, assetId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn tài sản…" /></SelectTrigger>
              <SelectContent>
                {assetsQ.items.map((a) => <SelectItem key={a.id} value={a.id}>{a.assetCode} · {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loại lịch">
            <Select value={form.scheduleType} onValueChange={(v) => setForm((f) => ({ ...f, scheduleType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCHEDULE_TYPES.map((t) => <SelectItem key={t} value={t}>{SCHEDULE_TYPE_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mẫu checklist" required>
            <Select value={form.checklistTemplateId} onValueChange={(v) => setForm((f) => ({ ...f, checklistTemplateId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn checklist…" /></SelectTrigger>
              <SelectContent>
                {tplQ.items.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Chu kỳ (ngày)" required>
            <Input type="number" min={1} value={form.frequencyDays} onChange={(e) => setForm((f) => ({ ...f, frequencyDays: e.target.value }))} />
          </Field>
          <Field label="Lead time (ngày)" hint="Tạo WO trước hạn">
            <Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))} />
          </Field>
          <Field label="Ngày bắt đầu" className="col-span-2">
            <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </Field>
          <Field label="Mô tả" className="col-span-2">
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Bảo trì định kỳ – kiểm tra hệ thống…" />
          </Field>
          <div className="col-span-2 flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Kích hoạt lịch</p>
              <p className="text-xs text-muted-foreground">Tắt để tạm dừng tự sinh phiếu công việc.</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá lịch bảo trì?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá lịch bảo trì của <strong className="text-foreground">{confirmDel?.assetName}</strong>?</p>
      </EntityModal>
    </div>
  );
}
