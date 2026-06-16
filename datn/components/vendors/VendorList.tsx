"use client";

import { useMemo, useState } from "react";
import {
  Plus, Building2, Trash2, Eye, Ban, RotateCcw, ShieldCheck, FileText, Mail, Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  vendorsApi, vendorContracts,
  type VendorResponse, type CreateVendorInput, type VendorContractResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockVendors, mockVendorContracts } from "@/lib/mock/vendor";
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
import { formatCurrency, formatDate } from "@/lib/format";

const VENDOR_STATUS: Record<string, StatusDef> = {
  ACTIVE: { label: "Đang hợp tác", tone: "success" },
  INACTIVE: { label: "Ngừng hợp tác", tone: "neutral" },
  BLACKLISTED: { label: "Danh sách đen", tone: "danger" },
};
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "BLACKLISTED"];

interface FormState {
  vendorCode: string; name: string; taxId: string;
  contactName: string; contactEmail: string; contactPhone: string; address: string; notes: string;
}
const emptyForm: FormState = {
  vendorCode: "", name: "", taxId: "", contactName: "", contactEmail: "", contactPhone: "", address: "", notes: "",
};

export default function VendorList() {
  const q = useApiList<VendorResponse>(() => vendorsApi.getAll(), { mock: mockVendors });
  const contractsQ = useApiList<VendorContractResponse>(() => vendorContracts.getAll(), { mock: mockVendorContracts });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<VendorResponse | null>(null);
  const [blacklisting, setBlacklisting] = useState<VendorResponse | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [confirmDel, setConfirmDel] = useState<VendorResponse | null>(null);

  // Đếm hợp đồng đang hiệu lực theo nhà thầu.
  const contractCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contractsQ.items) {
      if (c.status === "ACTIVE") m.set(c.vendorId, (m.get(c.vendorId) ?? 0) + 1);
    }
    return m;
  }, [contractsQ.items]);

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter((v) => v.status === "ACTIVE").length,
    blacklisted: list.filter((v) => v.status === "BLACKLISTED").length,
    contracts: contractsQ.items.filter((c) => c.status === "ACTIVE").length,
  }), [list, contractsQ.items]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((v) => {
      if (statusF !== "all" && v.status !== statusF) return false;
      if (!s) return true;
      return [v.vendorCode, v.name, v.taxId, v.contactName].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF]);

  function openCreate() {
    setForm({ ...emptyForm, vendorCode: `VND-${String(Math.floor(Math.random() * 900) + 100)}` });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) { toast.error("Nhập tên nhà thầu."); return; }
    if (!form.taxId.trim()) { toast.error("Nhập mã số thuế."); return; }
    const body: CreateVendorInput = {
      vendorCode: form.vendorCode.trim(), name: form.name.trim(), taxId: form.taxId.trim(),
      contactName: form.contactName.trim() || undefined, contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined, address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    setSubmitting(true);
    const res = await vendorsApi.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã thêm nhà thầu.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Thêm nhà thầu thất bại.");
  }

  async function doBlacklist() {
    if (!blacklisting) return;
    const res = await vendorsApi.blacklist(blacklisting.id, blacklistReason.trim() || "Vi phạm cam kết", "QL Kỹ thuật");
    if (res.errorCode === 200) {
      toast.success(`Đã đưa ${blacklisting.name} vào danh sách đen.`);
      setBlacklisting(null); setBlacklistReason("");
      q.refetch();
    } else toast.error(res.errorMessage || "Thao tác thất bại.");
  }
  async function activate(v: VendorResponse) {
    const res = await vendorsApi.activate(v.id);
    if (res.errorCode === 200) { toast.success(`Đã kích hoạt lại ${v.name}.`); q.refetch(); }
    else toast.error(res.errorMessage || "Thao tác thất bại.");
  }
  async function doDelete() {
    if (!confirmDel) return;
    const res = await vendorsApi.delete(confirmDel.id);
    if (res.errorCode === 200) { toast.success("Đã xoá nhà thầu."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<VendorResponse>[] = [
    {
      key: "vendor", header: "Nhà thầu", sortable: true, sortAccessor: (v) => v.name,
      cell: (v) => (
        <div>
          <span className="font-medium text-foreground">{v.name}</span>
          <span className="block font-mono text-xs text-muted-foreground">{v.vendorCode} · MST {v.taxId}</span>
        </div>
      ),
    },
    {
      key: "contact", header: "Liên hệ",
      cell: (v) => (
        <div className="text-sm">
          <div className="text-foreground">{v.contactName ?? "—"}</div>
          {v.contactPhone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{v.contactPhone}</div>}
        </div>
      ),
    },
    {
      key: "contracts", header: "HĐ hiệu lực", align: "center", sortable: true,
      sortAccessor: (v) => contractCount.get(v.id) ?? 0,
      cell: (v) => <span className="tabular-nums text-sm">{contractCount.get(v.id) ?? 0}</span>,
    },
    { key: "status", header: "Trạng thái", sortable: true, sortAccessor: (v) => v.status, cell: (v) => <StatusBadge value={v.status} map={VENDOR_STATUS} /> },
    {
      key: "actions", header: "", align: "right",
      cell: (v) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetail(v)}><Eye className="size-4" /></Button>
          {v.status === "BLACKLISTED" ? (
            <Button variant="ghost" size="icon" title="Kích hoạt lại" className="text-success hover:text-success" onClick={() => activate(v)}><RotateCcw className="size-4" /></Button>
          ) : (
            <Button variant="ghost" size="icon" title="Đưa vào danh sách đen" className="text-danger hover:text-danger" onClick={() => setBlacklisting(v)}><Ban className="size-4" /></Button>
          )}
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(v)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý nhà thầu"
        description="Danh sách nhà cung cấp, đối tác và hợp đồng khung"
        icon={Building2}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm nhà thầu</Button>}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng nhà thầu" value={stats.total} icon={Building2} tone="brand" loading={q.loading} />
        <StatCard label="Đang hợp tác" value={stats.active} icon={ShieldCheck} tone="success" loading={q.loading} />
        <StatCard label="Danh sách đen" value={stats.blacklisted} icon={Ban} tone="danger" loading={q.loading} />
        <StatCard label="HĐ hiệu lực" value={stats.contracts} icon={FileText} tone="info" loading={contractsQ.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm tên, MST, mã NCC…">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{VENDOR_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(v) => v.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title="Thêm nhà thầu mới"
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel="Thêm"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã nhà thầu" required>
            <Input value={form.vendorCode} onChange={(e) => setForm((f) => ({ ...f, vendorCode: e.target.value }))} />
          </Field>
          <Field label="Mã số thuế" required>
            <Input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} placeholder="0301234567" />
          </Field>
          <Field label="Tên công ty" required className="col-span-2">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Công ty TNHH Cơ điện ABC" />
          </Field>
          <Field label="Người liên hệ">
            <Input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder="Nguyễn Văn A" />
          </Field>
          <Field label="Số điện thoại">
            <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} placeholder="0901234567" />
          </Field>
          <Field label="Email" className="col-span-2">
            <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="contact@company.vn" />
          </Field>
          <Field label="Địa chỉ" className="col-span-2">
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Nguyễn Văn Linh, Q.7, TP.HCM" />
          </Field>
          <Field label="Ghi chú" className="col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Thế mạnh, kinh nghiệm, đánh giá sơ bộ…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? `${detail.vendorCode} · MST ${detail.taxId}` : undefined}
        size="md"
        footer={<div className="flex justify-end border-t border-border px-6 py-4"><Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button></div>}
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={VENDOR_STATUS} /></DetailRow>
              <DetailRow label="HĐ hiệu lực">{contractCount.get(detail.id) ?? 0}</DetailRow>
              <DetailRow label="Người liên hệ">{detail.contactName ?? "—"}</DetailRow>
              <DetailRow label="Điện thoại">{detail.contactPhone ?? "—"}</DetailRow>
              <div className="col-span-2"><DetailRow label="Email"><span className="inline-flex items-center gap-1">{detail.contactEmail ? <><Mail className="size-3" />{detail.contactEmail}</> : "—"}</span></DetailRow></div>
              <div className="col-span-2"><DetailRow label="Địa chỉ">{detail.address ?? "—"}</DetailRow></div>
              {detail.notes && <div className="col-span-2"><DetailRow label="Ghi chú">{detail.notes}</DetailRow></div>}
              {detail.status === "BLACKLISTED" && (
                <>
                  <div className="col-span-2"><DetailRow label="Lý do đưa vào danh sách đen">{detail.blacklistReason ?? "—"}</DetailRow></div>
                  <DetailRow label="Người thực hiện">{detail.blacklistedBy ?? "—"}</DetailRow>
                  <DetailRow label="Thời điểm">{formatDate(detail.blacklistedAt)}</DetailRow>
                </>
              )}
            </div>

            {contractsQ.items.some((c) => c.vendorId === detail.id) && (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Hợp đồng</p>
                <div className="space-y-1.5">
                  {contractsQ.items.filter((c) => c.vendorId === detail.id).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                      <span className="font-mono text-xs">{c.contractCode}</span>
                      <span className="text-muted-foreground">{formatCurrency(c.contractValue)}</span>
                      <StatusBadge value={c.status} map={{ ACTIVE: { label: "Hiệu lực", tone: "success" }, EXPIRED: { label: "Hết hạn", tone: "neutral" }, TERMINATED: { label: "Chấm dứt", tone: "danger" } }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!blacklisting}
        onOpenChange={(o) => { if (!o) { setBlacklisting(null); setBlacklistReason(""); } }}
        title="Đưa vào danh sách đen?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => { setBlacklisting(null); setBlacklistReason(""); }}>Huỷ</Button>
            <Button variant="destructive" onClick={doBlacklist}>Xác nhận</Button>
          </div>
        }
      >
        <Field label={`Lý do đưa ${blacklisting?.name ?? ""} vào danh sách đen`}>
          <Textarea rows={3} value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Chậm tiến độ nhiều lần, chất lượng không đạt…" />
        </Field>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá nhà thầu?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.name}</strong>? Cân nhắc đưa vào danh sách đen thay vì xoá để giữ lịch sử.</p>
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
