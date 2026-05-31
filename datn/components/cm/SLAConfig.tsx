"use client";

import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Clock, ShieldCheck, Power } from "lucide-react";
import { toast } from "sonner";
import {
  slaConfigs,
  type SlaConfigResponse, type CreateSlaConfigInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockSlaConfigs } from "@/lib/mock/cm";
import {
  PageHeader, StatCard, DataTable, EntityModal, Field, MockBanner,
  PriorityBadge, ToneBadge, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORY: Record<string, string> = {
  ELECTRICAL: "Điện", PLUMBING: "Nước", HVAC: "HVAC", ELEVATOR: "Thang máy", FIRE: "PCCC", OTHER: "Khác",
};
const CATEGORY_OPTIONS = Object.keys(CATEGORY);
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const NONE = "__none__";

interface FormState {
  name: string; priorityLevel: string; issueCategory: string;
  responseTimeHours: string; resolutionTimeHours: string;
  escalationL1AfterHours: string; escalationL2AfterHours: string; escalationL3AfterHours: string;
  businessHoursOnly: boolean; isActive: boolean;
}
const emptyForm: FormState = {
  name: "", priorityLevel: "MEDIUM", issueCategory: NONE,
  responseTimeHours: "", resolutionTimeHours: "",
  escalationL1AfterHours: "", escalationL2AfterHours: "", escalationL3AfterHours: "",
  businessHoursOnly: true, isActive: true,
};

const numStr = (n?: number) => (n != null ? String(n) : "");
const toNum = (s: string) => (s.trim() ? Number(s) : undefined);
const hrs = (n?: number) => (n != null ? `${n}h` : "—");

export default function SLAConfig() {
  const q = useApiList<SlaConfigResponse>(() => slaConfigs.getAll(), { mock: mockSlaConfigs });
  const list = q.items;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SlaConfigResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<SlaConfigResponse | null>(null);

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter((s) => s.isActive).length,
    businessOnly: list.filter((s) => s.businessHoursOnly).length,
  }), [list]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(s: SlaConfigResponse) {
    setEditing(s);
    setForm({
      name: s.name, priorityLevel: s.priorityLevel, issueCategory: s.issueCategory ?? NONE,
      responseTimeHours: numStr(s.responseTimeHours), resolutionTimeHours: numStr(s.resolutionTimeHours),
      escalationL1AfterHours: numStr(s.escalationL1AfterHours),
      escalationL2AfterHours: numStr(s.escalationL2AfterHours),
      escalationL3AfterHours: numStr(s.escalationL3AfterHours),
      businessHoursOnly: s.businessHoursOnly, isActive: s.isActive,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) { toast.error("Nhập tên cấu hình SLA."); return; }
    const body: CreateSlaConfigInput = {
      name: form.name.trim(), priorityLevel: form.priorityLevel,
      issueCategory: form.issueCategory === NONE ? undefined : form.issueCategory,
      responseTimeHours: toNum(form.responseTimeHours),
      resolutionTimeHours: toNum(form.resolutionTimeHours),
      escalationL1AfterHours: toNum(form.escalationL1AfterHours),
      escalationL2AfterHours: toNum(form.escalationL2AfterHours),
      escalationL3AfterHours: toNum(form.escalationL3AfterHours),
      businessHoursOnly: form.businessHoursOnly, isActive: form.isActive,
    };
    setSubmitting(true);
    const res = editing
      ? await slaConfigs.update({ ...body, id: editing.id })
      : await slaConfigs.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật cấu hình SLA." : "Đã thêm cấu hình SLA.");
      setOpen(false);
      q.refetch();
    } else {
      toast.error(res.errorMessage || "Lưu cấu hình thất bại.");
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await slaConfigs.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá cấu hình SLA.");
      setConfirmDel(null);
      q.refetch();
    } else {
      toast.error(res.errorMessage || "Xoá thất bại.");
    }
  }

  const columns: Column<SlaConfigResponse>[] = [
    {
      key: "name", header: "Cấu hình", sortable: true, sortAccessor: (s) => s.name,
      cell: (s) => (
        <div>
          <span className="block text-sm font-medium text-foreground">{s.name}</span>
          <span className="text-xs text-muted-foreground">{s.issueCategory ? (CATEGORY[s.issueCategory] ?? s.issueCategory) : "Mọi loại sự cố"}</span>
        </div>
      ),
    },
    { key: "priority", header: "Ưu tiên", cell: (s) => <PriorityBadge value={s.priorityLevel} /> },
    { key: "response", header: "Phản hồi", align: "right", cell: (s) => <span className="text-foreground">{hrs(s.responseTimeHours)}</span> },
    { key: "resolution", header: "Giải quyết", align: "right", cell: (s) => <span className="text-foreground">{hrs(s.resolutionTimeHours)}</span> },
    {
      key: "escalation", header: "Leo thang",
      cell: (s) => (
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {s.escalationL1AfterHours != null && <span>L1·{s.escalationL1AfterHours}h</span>}
          {s.escalationL2AfterHours != null && <span>L2·{s.escalationL2AfterHours}h</span>}
          {s.escalationL3AfterHours != null && <span>L3·{s.escalationL3AfterHours}h</span>}
          {s.escalationL1AfterHours == null && s.escalationL2AfterHours == null && s.escalationL3AfterHours == null && <span>—</span>}
        </div>
      ),
    },
    { key: "hours", header: "Khung giờ", cell: (s) => <ToneBadge tone={s.businessHoursOnly ? "neutral" : "info"}>{s.businessHoursOnly ? "Hành chính" : "24/7"}</ToneBadge> },
    { key: "status", header: "Trạng thái", cell: (s) => <ToneBadge tone={s.isActive ? "success" : "neutral"} dot>{s.isActive ? "Đang áp dụng" : "Tắt"}</ToneBadge> },
    {
      key: "actions", header: "", align: "right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(s)}><Edit2 className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(s)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cấu hình SLA"
        description="Thiết lập thời gian phản hồi, giải quyết và ngưỡng leo thang theo độ ưu tiên"
        icon={ShieldCheck}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm cấu hình</Button>}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Tổng cấu hình" value={stats.total} icon={ShieldCheck} tone="info" loading={q.loading} />
        <StatCard label="Đang áp dụng" value={stats.active} icon={Power} tone="success" loading={q.loading} />
        <StatCard label="Chỉ giờ hành chính" value={stats.businessOnly} icon={Clock} tone="neutral" loading={q.loading} />
      </div>

      <DataTable columns={columns} rows={list} getRowId={(s) => s.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa cấu hình SLA" : "Thêm cấu hình SLA"}
        description={editing?.name}
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu thay đổi" : "Tạo cấu hình"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tên cấu hình" required className="col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="VD: SLA Khẩn cấp — Điện/Thang máy" />
          </Field>
          <Field label="Độ ưu tiên" required>
            <Select value={form.priorityLevel} onValueChange={(v) => set("priorityLevel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loại sự cố áp dụng">
            <Select value={form.issueCategory} onValueChange={(v) => set("issueCategory", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Mọi loại sự cố</SelectItem>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{CATEGORY[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Thời gian phản hồi (giờ)" hint="Phản hồi ban đầu tối đa">
            <Input type="number" min="0" value={form.responseTimeHours} onChange={(e) => set("responseTimeHours", e.target.value)} placeholder="VD: 1" />
          </Field>
          <Field label="Thời gian giải quyết (giờ)" hint="Đóng sự cố tối đa">
            <Input type="number" min="0" value={form.resolutionTimeHours} onChange={(e) => set("resolutionTimeHours", e.target.value)} placeholder="VD: 4" />
          </Field>
          <Field label="Leo thang L1 (giờ)" className="col-span-2 sm:col-span-2">
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" min="0" value={form.escalationL1AfterHours} onChange={(e) => set("escalationL1AfterHours", e.target.value)} placeholder="L1" />
              <Input type="number" min="0" value={form.escalationL2AfterHours} onChange={(e) => set("escalationL2AfterHours", e.target.value)} placeholder="L2" />
              <Input type="number" min="0" value={form.escalationL3AfterHours} onChange={(e) => set("escalationL3AfterHours", e.target.value)} placeholder="L3" />
            </div>
          </Field>
          <div className="col-span-2 flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 sm:flex-1">
              <div>
                <p className="text-sm font-medium text-foreground">Chỉ tính giờ hành chính</p>
                <p className="text-xs text-muted-foreground">SLA tạm dừng ngoài giờ &amp; cuối tuần</p>
              </div>
              <Switch checked={form.businessHoursOnly} onCheckedChange={(v) => set("businessHoursOnly", v)} />
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-1 sm:border-l sm:border-border sm:pl-4">
              <div>
                <p className="text-sm font-medium text-foreground">Đang áp dụng</p>
                <p className="text-xs text-muted-foreground">Bật để hệ thống dùng cấu hình này</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </div>
          </div>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá cấu hình SLA?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.name}</strong>? Các ticket đang dùng cấu hình này sẽ cần gán lại SLA.</p>
      </EntityModal>
    </div>
  );
}
