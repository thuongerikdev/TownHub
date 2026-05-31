"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileCheck2, ArrowLeft, Sparkles, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  invoices, ocrJobs, vendorsApi, purchaseOrders,
  type OcrJobResponse, type VendorResponse, type PurchaseOrderResponse,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockOcrJobs, mockPurchaseOrders } from "@/lib/mock/procurement";
import { mockVendors } from "@/lib/mock/vendor";
import {
  PageHeader, MockBanner, LoadingState, ErrorState, Field,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";

const DOC_LABEL: Record<string, string> = {
  INVOICE: "Hóa đơn", RECEIPT: "Biên nhận", CONTRACT: "Hợp đồng",
};
const NONE = "__none__";

interface LineItem { name: string; quantity: number; unitPrice: number; }

function genInvoiceCode(): string {
  const y = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}-${rand}`;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceVerify() {
  const { id } = useParams();
  const jobId = String(id);
  const router = useRouter();

  const jobQ = useApi<OcrJobResponse>(
    () => ocrJobs.getById(jobId),
    {
      mock: () => mockOcrJobs.find((j) => j.id === jobId) ?? mockOcrJobs[0],
      deps: [jobId],
      enabled: !!id,
    },
  );
  const vendorsQ = useApiList<VendorResponse>(() => vendorsApi.getAll(), { mock: mockVendors });
  const poQ = useApiList<PurchaseOrderResponse>(() => purchaseOrders.getAll(), { mock: mockPurchaseOrders });

  const [invoiceCode] = useState(genInvoiceCode);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(15));
  const [vendorId, setVendorId] = useState("");
  const [poId, setPoId] = useState(NONE);
  const [taxRate, setTaxRate] = useState(10);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0), [items]);
  const taxAmount = useMemo(() => Math.round((subtotal * taxRate) / 100), [subtotal, taxRate]);
  const totalAmount = subtotal + taxAmount;

  const job = jobQ.data;
  const anyMock = jobQ.isMock || vendorsQ.isMock || poQ.isMock;

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, unitPrice: 0 }]);
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function onPoChange(v: string) {
    setPoId(v);
    if (v !== NONE) {
      const po = poQ.items.find((p) => p.id === v);
      if (po?.vendorId) setVendorId(po.vendorId);
    }
  }

  async function submit() {
    if (!vendorId) { toast.error("Hãy chọn nhà cung cấp."); return; }
    if (!invoiceCode) { toast.error("Thiếu mã hóa đơn."); return; }
    setSubmitting(true);
    const res = await invoices.create({
      invoiceCode,
      vendorId,
      poId: poId === NONE ? undefined : poId,
      ocrJobId: job?.id ?? jobId,
      invoiceDate: invoiceDate || undefined,
      invoiceNumber: invoiceNumber || undefined,
      subtotal,
      taxAmount,
      totalAmount,
      currency: "VND",
      paymentDueDate: dueDate || undefined,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã tạo hóa đơn từ chứng từ.");
      router.push("/procurement/invoices");
    } else {
      toast.error(res.errorMessage || "Tạo hóa đơn thất bại.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          href={`/procurement/ocr/${jobId}/result`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại kết quả OCR
        </Link>
      </div>

      <PageHeader
        title="Tạo hóa đơn từ chứng từ"
        description="Đối chiếu, chỉnh sửa dữ liệu AI bóc tách rồi lưu thành hóa đơn"
        icon={FileCheck2}
      />

      {anyMock && <MockBanner />}

      {vendorsQ.loading ? (
        <LoadingState />
      ) : vendorsQ.error ? (
        <ErrorState message={vendorsQ.error} onRetry={vendorsQ.refetch} />
      ) : (
        <div className="space-y-5">
          {/* Nguồn chứng từ */}
          {job && (
            <div className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/5 p-4">
              <Sparkles className="size-5 shrink-0 text-info" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium text-foreground">Nguồn: {job.fileName ?? "(chứng từ OCR)"}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_LABEL[job.documentType] ?? job.documentType}
                  {job.confidenceScore != null && ` · Độ tin cậy ${Math.round(job.confidenceScore * 100)}%`}
                </p>
              </div>
            </div>
          )}

          {/* Thông tin hóa đơn */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Thông tin hóa đơn</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mã hóa đơn" required>
                <Input value={invoiceCode} disabled />
              </Field>
              <Field label="Số hóa đơn (nhà cung cấp)">
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="VD: MEV-0529" />
              </Field>
              <Field label="Ngày hóa đơn">
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </Field>
              <Field label="Hạn thanh toán">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field label="Nhà cung cấp" required>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger><SelectValue placeholder="Chọn nhà cung cấp" /></SelectTrigger>
                  <SelectContent>
                    {vendorsQ.items.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Đơn mua (PO)" hint="Liên kết để đối chiếu công nợ.">
                <Select value={poId} onValueChange={onPoChange}>
                  <SelectTrigger><SelectValue placeholder="Không liên kết" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Không liên kết PO</SelectItem>
                    {poQ.items.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.poCode} · {p.vendorName ?? "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {/* Hạng mục */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Hạng mục</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-4" /> Thêm dòng
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    {i === 0 && <label className="mb-1 block text-xs text-muted-foreground">Hạng mục</label>}
                    <Input
                      value={it.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="VD: Cáp thép thang máy"
                    />
                  </div>
                  <div className="w-16 shrink-0">
                    {i === 0 && <label className="mb-1 block text-xs text-muted-foreground">SL</label>}
                    <Input
                      type="number"
                      min={0}
                      value={it.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="w-32 shrink-0">
                    {i === 0 && <label className="mb-1 block text-xs text-muted-foreground">Đơn giá</label>}
                    <Input
                      type="number"
                      min={0}
                      value={it.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="hidden w-28 shrink-0 pb-2 text-right text-sm font-medium tabular-nums text-foreground sm:block">
                    {formatCurrency(it.quantity * it.unitPrice)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Tổng tiền */}
            <div className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-muted-foreground">
                  Thuế VAT
                  <span className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                      className="h-8 w-16"
                    />
                    %
                  </span>
                </span>
                <span className="font-medium tabular-nums text-foreground">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Tổng cộng</span>
                <span className="text-lg font-bold tabular-nums text-brand">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <Field label="Ghi chú">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú đối chiếu, sai lệch so với PO (nếu có)…"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => router.back()} className="sm:flex-1">
              Quay lại
            </Button>
            <Button onClick={submit} disabled={submitting || !vendorId} className="sm:flex-1">
              {submitting ? "Đang lưu…" : "Tạo hóa đơn"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
