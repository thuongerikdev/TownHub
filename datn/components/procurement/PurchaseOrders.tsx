"use client";

import { useMemo, useState } from "react";
import { Plus, Package, Trash2, Eye, FileText, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  purchaseOrders, vendorsApi, purchaseRequests,
  type PurchaseOrderResponse, type CreatePurchaseOrderInput,
  type VendorResponse, type PurchaseRequestResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockPurchaseOrders, mockPurchaseRequests } from "@/lib/mock/procurement";
import { mockVendors } from "@/lib/mock/vendor";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  StatusBadge, ToneBadge, type Column, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";

const PO_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  SENT: { label: "Đã gửi NCC", tone: "info" },
  CONFIRMED: { label: "NCC xác nhận", tone: "brand" },
  RECEIVED: { label: "Đã nhận hàng", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
};
const STATUS_OPTIONS = ["DRAFT", "SENT", "CONFIRMED", "RECEIVED", "CANCELLED"];

interface FormState {
  poCode: string; vendorId: string; prId: string; issueDate: string;
  expectedDelivery: string; totalAmount: string; paymentTerms: string; notes: string;
}
const emptyForm: FormState = {
  poCode: "", vendorId: "", prId: "", issueDate: "", expectedDelivery: "",
  totalAmount: "", paymentTerms: "", notes: "",
};

// Ô ngày giao dự kiến: tô đỏ khi quá hạn mà chưa nhận hàng, vàng khi sắp tới.
function DeliveryCell({ po }: { po: PurchaseOrderResponse }) {
  if (!po.expectedDelivery) return <span className="text-muted-foreground">—</span>;
  const settled = po.status === "RECEIVED" || po.status === "CANCELLED";
  const d = daysUntil(po.expectedDelivery);
  const tone = settled || d == null ? "neutral" : d < 0 ? "danger" : d <= 2 ? "warning" : "neutral";
  if (tone === "neutral") return <span className="text-muted-foreground">{formatDate(po.expectedDelivery)}</span>;
  return (
    <ToneBadge tone={tone} dot>
      {formatDate(po.expectedDelivery)}{d != null && d < 0 ? ` · trễ ${Math.abs(d)}d` : ""}
    </ToneBadge>
  );
}

export default function PurchaseOrders() {
  const q = useApiList<PurchaseOrderResponse>(() => purchaseOrders.getAll(), { mock: mockPurchaseOrders });
  const vendorsQ = useApiList<VendorResponse>(() => vendorsApi.getAll(), { mock: mockVendors });
  const prsQ = useApiList<PurchaseRequestResponse>(() => purchaseRequests.getAll(), { mock: mockPurchaseRequests });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrderResponse | null>(null);
  const [confirmDel, setConfirmDel] = useState<PurchaseOrderResponse | null>(null);

  const stats = useMemo(() => ({
    total: list.length,
    draft: list.filter((p) => p.status === "DRAFT").length,
    inTransit: list.filter((p) => p.status === "SENT" || p.status === "CONFIRMED").length,
    received: list.filter((p) => p.status === "RECEIVED").length,
  }), [list]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((p) => {
      if (statusF !== "all" && p.status !== statusF) return false;
      if (!s) return true;
      return [p.poCode, p.prCode, p.vendorName].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, statusF]);

  function openCreate() {
    setForm({ ...emptyForm, poCode: `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}` });
    setOpen(true);
  }

  async function submit() {
    if (!form.vendorId) { toast.error("Chọn nhà cung cấp."); return; }
    const body: CreatePurchaseOrderInput = {
      poCode: form.poCode.trim(), vendorId: form.vendorId,
      prId: form.prId || undefined, issueDate: form.issueDate || undefined,
      expectedDelivery: form.expectedDelivery || undefined,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      currency: "VND", paymentTerms: form.paymentTerms.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    setSubmitting(true);
    const res = await purchaseOrders.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo đơn đặt hàng.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Tạo PO thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await purchaseOrders.delete(confirmDel.id);
    if (res.errorCode === 200) { toast.success("Đã xoá đơn đặt hàng."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<PurchaseOrderResponse>[] = [
    {
      key: "po", header: "Đơn hàng", sortable: true, sortAccessor: (p) => p.poCode,
      cell: (p) => (
        <div>
          <span className="font-mono text-xs text-brand">{p.poCode}</span>
          {p.prCode && <span className="block font-mono text-xs text-muted-foreground">từ {p.prCode}</span>}
        </div>
      ),
    },
    { key: "vendor", header: "Nhà cung cấp", cell: (p) => <span className="text-sm font-medium text-foreground">{p.vendorName ?? "—"}</span> },
    { key: "issue", header: "Ngày đặt", sortable: true, sortAccessor: (p) => p.issueDate ?? "", cell: (p) => <span className="text-muted-foreground">{formatDate(p.issueDate)}</span> },
    { key: "delivery", header: "Giao dự kiến", sortable: true, sortAccessor: (p) => p.expectedDelivery ?? "", cell: (p) => <DeliveryCell po={p} /> },
    { key: "amount", header: "Giá trị", align: "right", sortable: true, sortAccessor: (p) => p.totalAmount ?? 0, cell: (p) => <span className="font-medium tabular-nums">{formatCurrency(p.totalAmount)}</span> },
    { key: "status", header: "Trạng thái", sortable: true, sortAccessor: (p) => p.status, cell: (p) => <StatusBadge value={p.status} map={PO_STATUS} /> },
    {
      key: "actions", header: "", align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => setDetail(p)}><Eye className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(p)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Đơn đặt hàng (PO)"
        description="Quản lý đơn đặt hàng vật tư và dịch vụ"
        icon={Package}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Tạo PO</Button>}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng PO" value={stats.total} icon={Package} tone="brand" loading={q.loading} />
        <StatCard label="Nháp" value={stats.draft} icon={FileText} tone="neutral" loading={q.loading} />
        <StatCard label="Đang giao" value={stats.inTransit} icon={Truck} tone="info" loading={q.loading} />
        <StatCard label="Đã nhận hàng" value={stats.received} icon={CheckCircle2} tone="success" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm PO, nhà cung cấp…">
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{PO_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(p) => p.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title="Tạo đơn đặt hàng"
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel="Tạo"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã PO" required>
            <Input value={form.poCode} onChange={(e) => setForm((f) => ({ ...f, poCode: e.target.value }))} />
          </Field>
          <Field label="Nhà cung cấp" required>
            <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn nhà cung cấp…" /></SelectTrigger>
              <SelectContent>
                {vendorsQ.items.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Từ đề xuất (PR)" hint="Tuỳ chọn" className="col-span-2">
            <Select value={form.prId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, prId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Không liên kết —</SelectItem>
                {prsQ.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.prCode}{p.title ? ` · ${p.title}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ngày đặt">
            <Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
          </Field>
          <Field label="Giao dự kiến">
            <Input type="date" value={form.expectedDelivery} onChange={(e) => setForm((f) => ({ ...f, expectedDelivery: e.target.value }))} />
          </Field>
          <Field label="Tổng giá trị (VND)">
            <Input type="number" min={0} value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} placeholder="24000000" />
          </Field>
          <Field label="Điều khoản thanh toán">
            <Input value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} placeholder="30 ngày" />
          </Field>
          <Field label="Ghi chú" className="col-span-2">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Yêu cầu giao hàng tận kho, kèm chứng từ…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.poCode ?? ""}
        description={detail?.vendorName}
        size="md"
        footer={<div className="flex justify-end border-t border-border px-6 py-4"><Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button></div>}
      >
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={PO_STATUS} /></DetailRow>
            <DetailRow label="Giá trị">{formatCurrency(detail.totalAmount)}</DetailRow>
            <DetailRow label="Nhà cung cấp">{detail.vendorName ?? "—"}</DetailRow>
            <DetailRow label="Từ đề xuất">{detail.prCode ?? "—"}</DetailRow>
            <DetailRow label="Ngày đặt">{formatDate(detail.issueDate)}</DetailRow>
            <DetailRow label="Giao dự kiến">{formatDate(detail.expectedDelivery)}</DetailRow>
            <DetailRow label="Giao thực tế">{formatDate(detail.actualDelivery)}</DetailRow>
            <DetailRow label="Thanh toán">{detail.paymentTerms ?? "—"}</DetailRow>
            <DetailRow label="Người tạo">{detail.createdBy ?? "—"}</DetailRow>
            <DetailRow label="Ngày tạo">{formatDate(detail.createdAt)}</DetailRow>
            {detail.notes && <div className="col-span-2"><DetailRow label="Ghi chú">{detail.notes}</DetailRow></div>}
          </div>
        )}
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá đơn đặt hàng?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.poCode}</strong>?</p>
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
