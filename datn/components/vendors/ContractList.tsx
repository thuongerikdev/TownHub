"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  FileText, Plus, Building2, CalendarClock, Coins, Eye, Trash2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  vendorContracts, vendorsApi,
  type VendorContractResponse, type VendorResponse, type CreateVendorContractInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockVendorContracts, mockVendors } from "@/lib/mock/vendor";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  StatusBadge, type Column, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";

const CONTRACT_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  PENDING_SIGNATURE: { label: "Chờ ký", tone: "warning" },
  ACTIVE: { label: "Hiệu lực", tone: "success" },
  EXPIRED: { label: "Hết hạn", tone: "neutral" },
  TERMINATED: { label: "Đã chấm dứt", tone: "danger" },
};
const STATUS_OPTIONS = ["DRAFT", "PENDING_SIGNATURE", "ACTIVE", "EXPIRED", "TERMINATED"];

interface FormState {
  contractCode: string; vendorId: string; startDate: string; endDate: string;
  contractValue: string; paymentTerms: string; renewalNoticeDays: string; scopeOfWork: string; notes: string;
}
function emptyForm(): FormState {
  return {
    contractCode: `HD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    vendorId: "", startDate: "", endDate: "", contractValue: "", paymentTerms: "",
    renewalNoticeDays: "30", scopeOfWork: "", notes: "",
  };
}

function expiringSoon(c: VendorContractResponse): boolean {
  if (c.status !== "ACTIVE") return false;
  const d = daysUntil(c.endDate);
  return d != null && d >= 0 && d <= (c.renewalNoticeDays || 30);
}

export default function ContractList() {
  const q = useApiList<VendorContractResponse>(() => vendorContracts.getAll(), { mock: mockVendorContracts });
  const vendorsQ = useApiList<VendorResponse>(() => vendorsApi.getAll(), { mock: mockVendors });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<VendorContractResponse | null>(null);
  const [confirmDel, setConfirmDel] = useState<VendorContractResponse | null>(null);

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter((c) => c.status === "ACTIVE").length,
    expiring: list.filter(expiringSoon).length,
    value: list.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + (c.contractValue ?? 0), 0),
  }), [list]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((c) => {
      if (statusF !== "all" && c.status !== statusF) return false;
      if (!s) return true;
      return [c.contractCode, c.vendorName, c.scopeOfWork].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF]);

  function openCreate() { setForm(emptyForm()); setOpen(true); }

  async function submit() {
    if (!form.vendorId) { toast.error("Chọn nhà thầu."); return; }
    if (!form.contractCode.trim()) { toast.error("Nhập mã hợp đồng."); return; }
    const body: CreateVendorContractInput = {
      contractCode: form.contractCode.trim(),
      vendorId: form.vendorId,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      contractValue: form.contractValue ? Number(form.contractValue) : undefined,
      currency: "VND",
      paymentTerms: form.paymentTerms.trim() || undefined,
      renewalNoticeDays: form.renewalNoticeDays ? Number(form.renewalNoticeDays) : undefined,
      scopeOfWork: form.scopeOfWork.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    setSubmitting(true);
    const res = await vendorContracts.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo hợp đồng.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Tạo hợp đồng thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await vendorContracts.delete(confirmDel.id);
    if (res.errorCode === 200) { toast.success("Đã xoá hợp đồng."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<VendorContractResponse>[] = [
    {
      key: "contract", header: "Hợp đồng", sortable: true, sortAccessor: (c) => c.contractCode,
      cell: (c) => (
        <div>
          <span className="font-medium text-foreground">{c.contractCode}</span>
          {c.scopeOfWork && <span className="block max-w-xs truncate text-xs text-muted-foreground">{c.scopeOfWork}</span>}
        </div>
      ),
    },
    {
      key: "vendor", header: "Nhà thầu", sortable: true, sortAccessor: (c) => c.vendorName ?? "",
      cell: (c) => <span className="text-sm text-foreground">{c.vendorName ?? "—"}</span>,
    },
    {
      key: "term", header: "Thời hạn",
      cell: (c) => (
        <div className="text-sm">
          <div className="text-foreground">{formatDate(c.startDate)} – {formatDate(c.endDate)}</div>
          {expiringSoon(c) && (
            <div className="flex items-center gap-1 text-xs font-medium text-warning">
              <AlertTriangle className="size-3" /> Còn {daysUntil(c.endDate)} ngày
            </div>
          )}
        </div>
      ),
    },
    {
      key: "value", header: "Giá trị", align: "right", sortable: true, sortAccessor: (c) => c.contractValue ?? 0,
      cell: (c) => <span className="tabular-nums text-sm font-medium">{formatCurrency(c.contractValue)}</span>,
    },
    {
      key: "status", header: "Trạng thái", align: "center", sortable: true, sortAccessor: (c) => c.status,
      cell: (c) => <StatusBadge value={c.status} map={CONTRACT_STATUS} />,
    },
    {
      key: "actions", header: "", align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetail(c)}><Eye className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(c)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hợp đồng nhà thầu"
        description="Quản lý hợp đồng khung, theo dõi hiệu lực và hạn gia hạn"
        icon={FileText}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Tạo hợp đồng</Button>}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng hợp đồng" value={stats.total} icon={FileText} tone="brand" loading={q.loading} />
        <StatCard label="Đang hiệu lực" value={stats.active} icon={Building2} tone="success" loading={q.loading} />
        <StatCard label="Sắp hết hạn" value={stats.expiring} icon={CalendarClock} tone="warning" loading={q.loading} />
        <StatCard label="Giá trị HĐ hiệu lực" value={formatCurrency(stats.value, { compact: true })} icon={Coins} tone="info" loading={q.loading} />
      </div>

      {stats.expiring > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-warning" />
          <span className="text-foreground">
            <strong>{stats.expiring} hợp đồng</strong> sắp đến hạn gia hạn. Hãy liên hệ nhà thầu để gia hạn kịp thời.
          </span>
        </div>
      )}

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm mã HĐ, nhà thầu, phạm vi…">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{CONTRACT_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(c) => c.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      {/* Tạo hợp đồng */}
      <EntityModal open={open} onOpenChange={setOpen} title="Tạo hợp đồng" size="lg" onSubmit={submit} submitting={submitting} submitLabel="Tạo">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã hợp đồng" required>
            <Input value={form.contractCode} onChange={(e) => setForm((f) => ({ ...f, contractCode: e.target.value }))} />
          </Field>
          <Field label="Nhà thầu" required>
            <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn nhà thầu" /></SelectTrigger>
              <SelectContent>
                {vendorsQ.items.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ngày bắt đầu"><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
          <Field label="Ngày kết thúc"><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></Field>
          <Field label="Giá trị hợp đồng (VND)"><Input type="number" min={0} value={form.contractValue} onChange={(e) => setForm((f) => ({ ...f, contractValue: e.target.value }))} placeholder="0" /></Field>
          <Field label="Báo gia hạn trước (ngày)"><Input type="number" min={0} value={form.renewalNoticeDays} onChange={(e) => setForm((f) => ({ ...f, renewalNoticeDays: e.target.value }))} /></Field>
          <Field label="Điều khoản thanh toán" className="col-span-2"><Input value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} placeholder="VD: Thanh toán theo quý" /></Field>
          <Field label="Phạm vi công việc" className="col-span-2"><Textarea rows={2} value={form.scopeOfWork} onChange={(e) => setForm((f) => ({ ...f, scopeOfWork: e.target.value }))} placeholder="Mô tả phạm vi dịch vụ…" /></Field>
          <Field label="Ghi chú" className="col-span-2"><Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
        </div>
      </EntityModal>

      {/* Chi tiết hợp đồng */}
      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.contractCode ?? ""}
        description={detail?.vendorName ?? undefined}
        size="md"
        footer={<div className="flex justify-end border-t border-border px-6 py-4"><Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button></div>}
      >
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={CONTRACT_STATUS} /></DetailRow>
            <DetailRow label="Giá trị">{formatCurrency(detail.contractValue)}</DetailRow>
            <DetailRow label="Bắt đầu">{formatDate(detail.startDate)}</DetailRow>
            <DetailRow label="Kết thúc">{formatDate(detail.endDate)}</DetailRow>
            <DetailRow label="Điều khoản TT">{detail.paymentTerms ?? "—"}</DetailRow>
            <DetailRow label="Báo gia hạn">{detail.renewalNoticeDays} ngày</DetailRow>
            <div className="col-span-2"><DetailRow label="Phạm vi công việc">{detail.scopeOfWork ?? "—"}</DetailRow></div>
            {detail.notes && <div className="col-span-2"><DetailRow label="Ghi chú">{detail.notes}</DetailRow></div>}
          </div>
        )}
      </EntityModal>

      {/* Xoá hợp đồng */}
      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá hợp đồng?"
        size="sm"
        footer={<div className="flex justify-end gap-2 border-t border-border px-6 py-4"><Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button><Button variant="destructive" onClick={doDelete}>Xoá</Button></div>}
      >
        <p className="text-sm text-muted-foreground">Xoá hợp đồng <strong className="text-foreground">{confirmDel?.contractCode}</strong>? Hành động không thể hoàn tác.</p>
      </EntityModal>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}
