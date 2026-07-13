"use client";

import { useMemo, useState } from "react";
import { Receipt, Clock, CheckCircle2, AlertCircle, CalendarDays, Wallet } from "lucide-react";
import { toast } from "sonner";
import { invoices, type InvoiceResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockInvoices } from "@/lib/mock/procurement";
import {
  PageHeader, StatCard, MockBanner, FilterBar, EntityModal, Field, ToneBadge,
  LoadingState, EmptyState, ErrorState, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Chuyển khoản ngân hàng" },
  { value: "CASH", label: "Tiền mặt" },
  { value: "CHEQUE", label: "Séc" },
];
const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chờ thanh toán" },
  { value: "overdue", label: "Quá hạn" },
  { value: "paid", label: "Đã thanh toán" },
];

function isOverdue(inv: InvoiceResponse, now: number): boolean {
  return inv.paymentStatus !== "PAID" && !!inv.paymentDueDate && new Date(inv.paymentDueDate).getTime() < now;
}
function dueInDays(due: string, now: number): number {
  return Math.ceil((new Date(due).getTime() - now) / 86_400_000);
}
function statusOf(inv: InvoiceResponse, now: number): { tone: Tone; label: string } {
  if (inv.paymentStatus === "PAID") return { tone: "success", label: "Đã thanh toán" };
  if (isOverdue(inv, now)) return { tone: "danger", label: "Quá hạn" };
  return { tone: "warning", label: "Chờ thanh toán" };
}

export default function Invoices() {
  const q = useApiList<InvoiceResponse>(() => invoices.getAll(), { mock: mockInvoices });
  const now = Date.now();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [target, setTarget] = useState<InvoiceResponse | null>(null);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [confirmedBy, setConfirmedBy] = useState("Kế toán");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sum = (arr: InvoiceResponse[]) => arr.reduce((s, i) => s + (i.totalAmount ?? 0), 0);
  const paidList = useMemo(() => q.items.filter((i) => i.paymentStatus === "PAID"), [q.items]);
  const overdueList = useMemo(() => q.items.filter((i) => isOverdue(i, now)), [q.items, now]);
  const pendingList = useMemo(() => q.items.filter((i) => i.paymentStatus !== "PAID" && !isOverdue(i, now)), [q.items, now]);
  const monthList = useMemo(() => {
    const d = new Date(now);
    return q.items.filter((i) => {
      if (!i.invoiceDate) return false;
      const x = new Date(i.invoiceDate);
      return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
    });
  }, [q.items, now]);

  const payables = useMemo(() => {
    const map = new Map<string, { vendor: string; pending: number; overdue: number }>();
    for (const inv of q.items) {
      if (inv.paymentStatus === "PAID") continue;
      const key = inv.vendorName ?? inv.vendorId;
      const cur = map.get(key) ?? { vendor: key, pending: 0, overdue: 0 };
      const amt = inv.totalAmount ?? 0;
      if (isOverdue(inv, now)) cur.overdue += amt; else cur.pending += amt;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => (b.pending + b.overdue) - (a.pending + a.overdue));
  }, [q.items, now]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return q.items.filter((inv) => {
      if (filter === "paid" && inv.paymentStatus !== "PAID") return false;
      if (filter === "unpaid" && (inv.paymentStatus === "PAID" || isOverdue(inv, now))) return false;
      if (filter === "overdue" && !isOverdue(inv, now)) return false;
      if (!term) return true;
      return [inv.invoiceCode, inv.invoiceNumber, inv.vendorName, inv.poCode]
        .some((s) => s?.toLowerCase().includes(term));
    });
  }, [q.items, search, filter, now]);

  function openPay(inv: InvoiceResponse) {
    setTarget(inv);
    setMethod("BANK_TRANSFER");
    setConfirmedBy("Kế toán");
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayRef("");
    setPayNote("");
  }

  async function pay() {
    if (!target) return;
    if (!confirmedBy.trim()) { toast.error("Nhập người xác nhận thanh toán."); return; }
    setSubmitting(true);
    const res = await invoices.markPaid(target.id, method, confirmedBy.trim());
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(`Đã ghi nhận thanh toán ${target.invoiceCode}.`);
      setTarget(null);
      q.refetch();
    } else {
      toast.error(res.errorMessage || "Ghi nhận thanh toán thất bại.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Hóa đơn & Thanh toán"
        description="Theo dõi công nợ nhà cung cấp và ghi nhận thanh toán"
        icon={Receipt}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Chờ thanh toán" value={pendingList.length} icon={Clock} tone="warning" hint={formatCurrency(sum(pendingList), { compact: true })} loading={q.loading} />
        <StatCard label="Quá hạn" value={overdueList.length} icon={AlertCircle} tone={overdueList.length ? "danger" : "neutral"} hint={formatCurrency(sum(overdueList), { compact: true })} loading={q.loading} />
        <StatCard label="Đã thanh toán" value={paidList.length} icon={CheckCircle2} tone="success" hint={formatCurrency(sum(paidList), { compact: true })} loading={q.loading} />
        <StatCard label="Hóa đơn tháng này" value={monthList.length} icon={CalendarDays} tone="info" hint={formatCurrency(sum(monthList), { compact: true })} loading={q.loading} />
      </div>

      {overdueList.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-semibold text-danger">{overdueList.length} hóa đơn quá hạn thanh toán</p>
            <p className="text-sm text-muted-foreground">
              Tổng giá trị {formatCurrency(sum(overdueList))} — ưu tiên xử lý để giữ quan hệ nhà cung cấp.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Danh sách hóa đơn */}
        <div className="lg:col-span-2">
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Tìm mã hóa đơn, nhà cung cấp, PO…"
            actions={
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            }
          />

          {q.loading ? (
            <LoadingState />
          ) : q.error ? (
            <ErrorState message={q.error} onRetry={q.refetch} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Receipt} title="Không có hóa đơn" description="Chưa có hóa đơn nào khớp bộ lọc." />
          ) : (
            <ul className="space-y-3">
              {filtered.map((inv) => {
                const st = statusOf(inv, now);
                const d = inv.paymentDueDate ? dueInDays(inv.paymentDueDate, now) : null;
                return (
                  <li key={inv.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">{inv.invoiceCode}</span>
                          <ToneBadge tone={st.tone}>{st.label}</ToneBadge>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{inv.vendorName ?? "—"}</p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          {inv.poCode && <span>PO: {inv.poCode}</span>}
                          {inv.invoiceDate && <span>Ngày HĐ: {formatDate(inv.invoiceDate)}</span>}
                          {inv.paymentDueDate && (
                            <span className={inv.paymentStatus !== "PAID" && d !== null && d <= 7 ? "font-medium text-warning" : ""}>
                              Hạn TT: {formatDate(inv.paymentDueDate)}
                              {inv.paymentStatus !== "PAID" && d !== null && (
                                <span> ({d >= 0 ? `còn ${d} ngày` : `trễ ${Math.abs(d)} ngày`})</span>
                              )}
                            </span>
                          )}
                          {inv.paidDate && <span className="text-success">Đã TT: {formatDate(inv.paidDate)}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(inv.totalAmount ?? 0)}</p>
                        {inv.paymentStatus !== "PAID" && (
                          <Button size="sm" className="mt-2" onClick={() => openPay(inv)}>
                            <Wallet className="size-4" /> Thanh toán
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Công nợ theo nhà cung cấp */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Công nợ theo nhà cung cấp</h2>
            {payables.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không còn công nợ chưa thanh toán. 🎉</p>
            ) : (
              <ul className="space-y-3">
                {payables.map((p) => (
                  <li key={p.vendor} className="rounded-lg border border-border bg-surface-2/40 p-3">
                    <p className="truncate text-sm font-medium text-foreground">{p.vendor}</p>
                    <div className="mt-1.5 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Chờ TT</span><span className="font-medium text-warning">{formatCurrency(p.pending)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Quá hạn</span><span className={`font-medium ${p.overdue > 0 ? "text-danger" : "text-muted-foreground"}`}>{formatCurrency(p.overdue)}</span></div>
                      <div className="flex justify-between border-t border-border pt-1"><span className="font-semibold text-foreground">Tổng</span><span className="font-bold text-foreground">{formatCurrency(p.pending + p.overdue)}</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Tổng công nợ</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Chờ thanh toán</span><span className="font-semibold text-warning">{formatCurrency(sum(pendingList))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quá hạn</span><span className="font-semibold text-danger">{formatCurrency(sum(overdueList))}</span></div>
              <div className="flex justify-between border-t border-brand/30 pt-2"><span className="text-base font-bold text-foreground">Tổng</span><span className="text-base font-bold text-brand">{formatCurrency(sum(pendingList) + sum(overdueList))}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal thanh toán */}
      <EntityModal
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Xác nhận thanh toán"
        description={target ? `${target.invoiceCode} · ${target.vendorName ?? ""}` : undefined}
        onSubmit={pay}
        submitting={submitting}
        submitLabel="Xác nhận thanh toán"
      >
        {target && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface-2/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Số tiền thanh toán</p>
              <p className="text-2xl font-bold text-brand">{formatCurrency(target.totalAmount ?? 0)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ngày thanh toán" required>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </Field>
              <Field label="Người xác nhận" required>
                <Input value={confirmedBy} onChange={(e) => setConfirmedBy(e.target.value)} />
              </Field>
            </div>
            <Field label="Phương thức thanh toán" required>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Mã giao dịch / Tham chiếu" hint="Tùy chọn">
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="VD: TXN2026…" />
            </Field>
            <Field label="Ghi chú" hint="Tùy chọn">
              <Textarea rows={2} value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Ghi chú thanh toán…" />
            </Field>
          </div>
        )}
      </EntityModal>
    </div>
  );
}
