"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCheck2, ArrowLeft, Sparkles, Plus, Trash2, Link2, Wand2,
  CheckCircle2, AlertTriangle, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  invoices, ocrJobs, vendorsApi, purchaseOrders, materials, parseOcrPayload,
  type OcrJobResponse, type VendorResponse, type PurchaseOrderResponse, type MaterialResponse,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockOcrJobs, mockPurchaseOrders } from "@/lib/mock/procurement";
import { mockVendors } from "@/lib/mock/vendor";
import { mockMaterials } from "@/lib/mock/inventory";
import {
  PageHeader, MockBanner, LoadingState, ErrorState, Field,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOC_LABEL: Record<string, string> = {
  INVOICE: "Hóa đơn", RECEIPT: "Biên nhận", CONTRACT: "Hợp đồng",
};
const NONE = "__none__";

interface LineItem { name: string; quantity: number; unitPrice: number; materialId: string; }

/** Chuẩn hóa chuỗi để so khớp: bỏ dấu tiếng Việt, thường hóa, gộp khoảng trắng. */
function normText(s?: string | null): string {
  return (s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
/** Đối chiếu mô tả OCR → materialId gần nhất (trùng khít > chứa nhau > Jaccard theo từ). */
function bestMaterialId(name: string, mats: MaterialResponse[]): string {
  const q = normText(name);
  if (!q) return "";
  const qt = new Set(q.split(" ").filter(Boolean));
  let best = "", bestScore = 0;
  for (const m of mats) {
    const t = normText(m.name);
    if (!t) continue;
    let score: number;
    if (t === q) score = 1;
    else if (t.includes(q) || q.includes(t)) score = 0.8;
    else {
      const tt = new Set(t.split(" ").filter(Boolean));
      let inter = 0; qt.forEach((w) => { if (tt.has(w)) inter++; });
      const uni = new Set([...qt, ...tt]).size;
      score = uni ? inter / uni : 0;
    }
    if (score > bestScore) { bestScore = score; best = m.id; }
  }
  return bestScore >= 0.5 ? best : "";
}

function genInvoiceCode(): string {
  const y = new Date().getFullYear();
  // Mốc thời gian (base36) bảo đảm duy nhất, tránh trùng như random 4 số cũ.
  return `INV-${y}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
/** Chuẩn hóa chuỗi ngày do OCR trả (ISO, dd/mm/yyyy, dd-mm-yyyy) → input[type=date] (YYYY-MM-DD). */
function toDateInput(s?: string): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function normTax(s?: string | null): string {
  return (s ?? "").replace(/[\s\-]/g, "");
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
  const materialsQ = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });

  const [invoiceCode] = useState(genInvoiceCode);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(15));
  const [vendorId, setVendorId] = useState("");
  const [poId, setPoId] = useState(NONE);
  const [taxRate, setTaxRate] = useState(10);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", quantity: 1, unitPrice: 0, materialId: "" }]);
  const [submitting, setSubmitting] = useState(false);

  // Preselect mapped PO from ?po= (avoid useSearchParams — Next 16 Suspense rule).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("po");
    if (p) setPoId(p);
  }, []);

  // Smart Mapping: chọn PO → tự ánh xạ nhà cung cấp theo PO.
  useEffect(() => {
    if (poId === NONE) return;
    const po = poQ.items.find((p) => p.id === poId);
    if (po?.vendorId) setVendorId(po.vendorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId, poQ.items]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.unitPrice, 0), [items]);
  const taxAmount = useMemo(() => Math.round((subtotal * taxRate) / 100), [subtotal, taxRate]);
  const totalAmount = subtotal + taxAmount;

  const job = jobQ.data;
  const anyMock = jobQ.isMock || vendorsQ.isMock || poQ.isMock || materialsQ.isMock;

  // ── Tiền điền từ dữ liệu AI OCR (chạy 1 lần khi có payload + vendors đã tải) ──
  const ocr = useMemo(() => parseOcrPayload(job?.rawExtractedText), [job?.rawExtractedText]);
  const ocrFields = ocr?.fields;
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!ocr || vendorsQ.loading || materialsQ.loading) return;
    prefilledRef.current = true;

    const f = ocr.fields ?? {};
    if (f.invoiceNumber) setInvoiceNumber(f.invoiceNumber);
    const d = toDateInput(f.invoiceDate);
    if (d) setInvoiceDate(d);
    if (f.subtotal && f.subtotal > 0 && f.taxAmount != null) {
      const r = Math.round((f.taxAmount / f.subtotal) * 100);
      if (r >= 0 && r <= 100) setTaxRate(r);
    }

    const li: LineItem[] = (ocr.lineItems ?? [])
      .map((it) => {
        const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
        const unit = it.unitPrice ?? (it.totalPrice != null ? it.totalPrice / qty : 0);
        const nm = (it.description ?? "").trim();
        return { name: nm, quantity: qty, unitPrice: Math.round(unit), materialId: bestMaterialId(nm, materialsQ.items) };
      })
      .filter((it) => it.name || it.unitPrice > 0);
    if (li.length) setItems(li);
    else if (f.subtotal && f.subtotal > 0) {
      const nm = f.sellerName ? `Hàng hóa/dịch vụ — ${f.sellerName}` : "Theo chứng từ OCR";
      setItems([{ name: nm, quantity: 1, unitPrice: Math.round(f.subtotal), materialId: bestMaterialId(nm, materialsQ.items) }]);
    }

    let vid = "";
    if (f.sellerTaxCode) {
      const v = vendorsQ.items.find((vd) => normTax(vd.taxId) === normTax(f.sellerTaxCode));
      if (v) vid = v.id;
    }
    if (!vid && f.sellerName) {   // không khớp MST → thử khớp theo tên
      const nq = normText(f.sellerName);
      const v = vendorsQ.items.find((vd) => normText(vd.name) === nq)
        ?? vendorsQ.items.find((vd) => { const t = normText(vd.name); return !!t && (t.includes(nq) || nq.includes(t)); });
      if (v) vid = v.id;
    }
    if (vid) setVendorId((cur) => cur || vid);
    setAiPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocr, vendorsQ.loading, vendorsQ.items, materialsQ.loading, materialsQ.items]);

  const selectedPo = poId === NONE ? undefined : poQ.items.find((p) => p.id === poId);
  const selectedVendor = vendorsQ.items.find((v) => v.id === vendorId);
  const poVendor = selectedPo ? vendorsQ.items.find((v) => v.id === selectedPo.vendorId) : undefined;

  // Đối chiếu (gateway "Dữ liệu khớp & Hợp lệ?")
  const recon = useMemo(() => {
    if (!selectedPo) return null;
    const vendorMatch = !!vendorId && selectedPo.vendorId === vendorId;
    const poTotal = selectedPo.totalAmount ?? null;
    const delta = poTotal != null ? totalAmount - poTotal : null;
    const amountMatch = delta != null ? Math.abs(delta) < 1 : null;
    const valid = vendorMatch && amountMatch === true;
    return { vendorMatch, poTotal, delta, amountMatch, valid };
  }, [selectedPo, vendorId, totalAmount]);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, unitPrice: 0, materialId: "" }]);
  }
  function removeItem(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }
  function applyPoTotal() {
    if (!selectedPo?.totalAmount) return;
    const unit = Math.round(selectedPo.totalAmount / (1 + taxRate / 100));
    const nm = `Theo đơn mua ${selectedPo.poCode}`;
    setItems([{ name: nm, quantity: 1, unitPrice: unit, materialId: bestMaterialId(nm, materialsQ.items) }]);
    toast.success("Đã lấy tổng tiền từ PO vào hạng mục.");
  }

  async function submit() {
    if (!vendorId) { toast.error("Hãy chọn nhà cung cấp."); return; }
    if (!invoiceCode) { toast.error("Thiếu mã hóa đơn."); return; }
    if (recon && !recon.valid) {
      const ok = window.confirm(
        "Dữ liệu chưa khớp hoàn toàn với PO. Bạn vẫn muốn xác nhận hóa đơn?",
      );
      if (!ok) return;
    }

    // Chỉ lưu hạng mục đã đối chiếu ra materialId; cảnh báo dòng chưa khớp sẽ bị bỏ.
    const lineItems = items
      .filter((it) => it.materialId && (it.quantity > 0 || it.unitPrice > 0))
      .map((it) => ({
        materialId: it.materialId,
        description: it.name || undefined,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: Math.round(it.quantity * it.unitPrice),
      }));
    const skipped = items.filter((it) => (it.name.trim() || it.unitPrice > 0) && !it.materialId).length;
    if (skipped > 0) {
      const ok = window.confirm(`${skipped} hạng mục CHƯA khớp vật tư sẽ không được lưu vào hóa đơn. Vẫn tiếp tục?`);
      if (!ok) return;
    }

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
      items: lineItems,
    });
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã xác nhận hóa đơn. Công nợ đã được cập nhật.");
      router.push("/procurement/invoices");
    } else {
      toast.error(res.errorMessage || "Tạo hóa đơn thất bại.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <Link
          href={`/procurement/ocr/${jobId}/result`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại kết quả OCR
        </Link>
      </div>

      <PageHeader
        title="Đối chiếu & xác nhận hóa đơn"
        description="So khớp chứng từ AI bóc tách với đơn mua (PO), điều chỉnh nếu sai lệch rồi xác nhận"
        icon={FileCheck2}
      />

      {anyMock && <MockBanner />}

      {vendorsQ.loading || poQ.loading || materialsQ.loading ? (
        <LoadingState />
      ) : vendorsQ.error ? (
        <ErrorState message={vendorsQ.error} onRetry={vendorsQ.refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ============ LEFT: Chứng từ gốc & Đối chiếu ============ */}
          <div className="space-y-4">
            <div className="rounded-xl border border-info/30 bg-info/5 p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="size-5 shrink-0 text-info" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Chứng từ gốc (AI bóc tách)</p>
                  <p className="mt-0.5 truncate text-sm text-foreground">{job?.fileName ?? "(chứng từ OCR)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {job ? (DOC_LABEL[job.documentType] ?? job.documentType) : "—"}
                    {job?.confidenceScore != null && ` · Độ tin cậy ${Math.round(job.confidenceScore * 100)}%`}
                    {job?.submittedAt && ` · ${formatDate(job.submittedAt)}`}
                  </p>
                  {job?.fileUrl && (
                    <a
                      href={job.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-info hover:underline"
                    >
                      <ExternalLink className="size-3.5" /> Xem chứng từ gốc
                    </a>
                  )}
                </div>
              </div>

              {ocrFields ? (
                <dl className="mt-4 space-y-1.5 rounded-lg border border-info/20 bg-surface/70 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-info">Dữ liệu AI đọc được</p>
                  <OcrRow label="Số hóa đơn" value={ocrFields.invoiceNumber} />
                  <OcrRow label="Ngày hóa đơn" value={ocrFields.invoiceDate} />
                  <OcrRow label="Nhà cung cấp" value={ocrFields.sellerName} />
                  <OcrRow label="Mã số thuế" value={ocrFields.sellerTaxCode} mono />
                  <OcrRow label="Tạm tính" value={ocrFields.subtotal != null ? formatCurrency(ocrFields.subtotal) : undefined} />
                  <OcrRow label="Thuế" value={ocrFields.taxAmount != null ? formatCurrency(ocrFields.taxAmount) : undefined} />
                  <OcrRow label="Tổng cộng" value={ocrFields.totalAmount != null ? formatCurrency(ocrFields.totalAmount) : undefined} strong />
                </dl>
              ) : job && job.status !== "COMPLETED" && job.status !== "DONE" && job.status !== "REVIEWED" ? (
                <p className="mt-4 rounded-lg border border-dashed border-info/30 bg-surface/60 p-3 text-xs text-muted-foreground">
                  Chứng từ chưa xử lý xong hoặc không bóc tách được dữ liệu — nhập tay ở cột bên phải.
                </p>
              ) : null}
            </div>

            {/* Smart Mapping với PO */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Link2 className="size-4 text-brand" />
                <h3 className="text-sm font-semibold text-foreground">Ánh xạ đơn mua (PO)</h3>
              </div>
              <Field label="Đơn mua liên kết" hint="Chọn PO tương ứng để hệ thống tự đối chiếu.">
                <Select value={poId} onValueChange={setPoId}>
                  <SelectTrigger><SelectValue placeholder="Chọn đơn mua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Không liên kết PO</SelectItem>
                    {poQ.items.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.poCode} · {p.vendorName ?? "—"}
                        {p.totalAmount != null ? ` · ${formatCurrency(p.totalAmount)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {selectedPo && (
                <dl className="mt-4 space-y-2 rounded-lg border border-border bg-surface-2 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Nhà cung cấp (PO)</dt>
                    <dd className="text-right font-medium text-foreground">{poVendor?.name ?? selectedPo.vendorName ?? "—"}</dd>
                  </div>
                  {poVendor?.taxId && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Mã số thuế</dt>
                      <dd className="text-right font-mono text-foreground">{poVendor.taxId}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Tổng tiền PO</dt>
                    <dd className="text-right font-semibold tabular-nums text-foreground">
                      {selectedPo.totalAmount != null ? formatCurrency(selectedPo.totalAmount) : "—"}
                    </dd>
                  </div>
                  {selectedPo.expectedDelivery && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Dự kiến giao</dt>
                      <dd className="text-right text-foreground">{formatDate(selectedPo.expectedDelivery)}</dd>
                    </div>
                  )}
                  {selectedPo.totalAmount != null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyPoTotal}
                      className="mt-1 w-full"
                    >
                      <Wand2 className="size-4" /> Lấy tổng tiền từ PO
                    </Button>
                  )}
                </dl>
              )}
            </div>

            {/* Kết quả đối chiếu (gateway) */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Kết quả đối chiếu</h3>
              {!selectedPo ? (
                <p className="rounded-lg border border-dashed border-border bg-surface-2 p-4 text-center text-sm text-muted-foreground">
                  Chọn đơn mua (PO) ở trên để bật đối chiếu tự động.
                </p>
              ) : (
                <div className="space-y-3">
                  <ReconRow
                    label="Nhà cung cấp"
                    ok={recon!.vendorMatch}
                    okText={selectedVendor?.name ?? "Khớp"}
                    badText={recon!.vendorMatch ? "" : "Khác nhà cung cấp so với PO"}
                  />
                  <ReconRow
                    label="Tổng tiền"
                    ok={recon!.amountMatch === true}
                    pending={recon!.amountMatch === null}
                    okText={formatCurrency(totalAmount)}
                    badText={
                      recon!.delta == null
                        ? "PO chưa có tổng tiền để đối chiếu"
                        : recon!.delta > 0
                          ? `Hóa đơn cao hơn PO ${formatCurrency(recon!.delta)}`
                          : `Hóa đơn thấp hơn PO ${formatCurrency(-recon!.delta)}`
                    }
                  />
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg p-3 text-sm font-medium",
                      recon!.valid
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning",
                    )}
                  >
                    {recon!.valid ? (
                      <><CheckCircle2 className="size-4 shrink-0" /> Dữ liệu khớp & hợp lệ — có thể xác nhận.</>
                    ) : (
                      <><AlertTriangle className="size-4 shrink-0" /> Có sai lệch — điều chỉnh thủ công ở cột bên phải.</>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============ RIGHT: Hóa đơn (chỉnh sửa) ============ */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">Thông tin hóa đơn</h3>
                {aiPrefilled && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                    <Sparkles className="size-3" /> AI tự điền
                  </span>
                )}
              </div>
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
                <Field label="Nhà cung cấp" required className="sm:col-span-2">
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger><SelectValue placeholder="Chọn nhà cung cấp" /></SelectTrigger>
                    <SelectContent>
                      {vendorsQ.items.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Hạng mục</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-4" /> Thêm dòng
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-3">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          Vật tư (đối chiếu → kho)
                          {it.name && (it.materialId
                            ? <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">đã khớp</span>
                            : <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">chưa khớp</span>)}
                        </label>
                        <Select value={it.materialId || NONE} onValueChange={(v) => updateItem(i, { materialId: v === NONE ? "" : v })}>
                          <SelectTrigger><SelectValue placeholder="Chọn vật tư trong kho" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>— Chưa chọn (dòng này sẽ không được lưu) —</SelectItem>
                            {materialsQ.items.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}{m.materialCode ? ` (${m.materialCode})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-xs text-muted-foreground">Mô tả (AI đọc)</label>
                        <Input
                          value={it.name}
                          onChange={(e) => updateItem(i, { name: e.target.value })}
                          placeholder="VD: Cáp thép thang máy"
                        />
                      </div>
                      <div className="w-14 shrink-0">
                        <label className="mb-1 block text-xs text-muted-foreground">SL</label>
                        <Input
                          type="number"
                          min={0}
                          value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </div>
                      <div className="w-28 shrink-0">
                        <label className="mb-1 block text-xs text-muted-foreground">Đơn giá</label>
                        <Input
                          type="number"
                          min={0}
                          value={it.unitPrice}
                          onChange={(e) => updateItem(i, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

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

            <div className="rounded-xl border border-border bg-surface p-5">
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
                {submitting ? "Đang lưu…" : "Xác nhận hóa đơn"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Một dòng dữ liệu AI bóc tách (read-only) trong thẻ "Chứng từ gốc". */
function OcrRow({
  label, value, mono, strong,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-right",
          value ? "text-foreground" : "text-muted-foreground",
          mono && "font-mono",
          strong ? "font-semibold tabular-nums" : "font-medium",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function ReconRow({
  label, ok, pending, okText, badText,
}: {
  label: string;
  ok: boolean;
  pending?: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-right font-medium",
          pending ? "text-muted-foreground" : ok ? "text-success" : "text-danger",
        )}
      >
        {pending ? null : ok ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
        {ok ? okText : badText}
      </span>
    </div>
  );
}
