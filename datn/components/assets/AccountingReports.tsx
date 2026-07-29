"use client";

import { useState } from "react";
import { FileBarChart, Scale, BookMarked, ArrowUpDown } from "lucide-react";
import {
  assetReports,
  type TrialBalanceReport, type AssetRegisterReport, type AssetMovementReport,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { PageHeader, StatCard, LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/format";

const num = (v: number) => (v ? formatCurrency(v) : "—");

const STATUS_LABEL: Record<string, string> = {
  IN_USE: "Đang dùng", IN_STOCK: "Trong kho", MAINTENANCE: "Bảo trì",
  DISPOSED: "Đã thanh lý", BROKEN: "Hỏng",
};

function DateRange({
  from, to, setFrom, setTo,
}: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" aria-label="Từ ngày" />
      <span className="text-muted-foreground">—</span>
      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" aria-label="Đến ngày" />
    </div>
  );
}

// ── Bảng cân đối số phát sinh ───────────────────────────────────────────────
function TrialBalancePanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useApi<TrialBalanceReport>(
    () => assetReports.trialBalance({ from: from || undefined, to: to || undefined }),
    { deps: [from, to] },
  );
  const r = q.data;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.refetch} /> :
        !r || r.rows.length === 0 ? <EmptyState title="Chưa có số liệu" /> : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="bg-muted/40">
                <th rowSpan={2} className="border-b border-border px-3 py-2 text-left align-bottom">TK</th>
                <th rowSpan={2} className="border-b border-border px-3 py-2 text-left align-bottom">Tên tài khoản</th>
                <th colSpan={2} className="border-b border-l border-border px-3 py-1.5 text-center">Số dư đầu kỳ</th>
                <th colSpan={2} className="border-b border-l border-border px-3 py-1.5 text-center">Phát sinh trong kỳ</th>
                <th colSpan={2} className="border-b border-l border-border px-3 py-1.5 text-center">Số dư cuối kỳ</th>
              </tr>
              <tr className="bg-muted/40">
                <th className="border-l border-border px-3 py-1.5 text-right">Nợ</th>
                <th className="px-3 py-1.5 text-right">Có</th>
                <th className="border-l border-border px-3 py-1.5 text-right">Nợ</th>
                <th className="px-3 py-1.5 text-right">Có</th>
                <th className="border-l border-border px-3 py-1.5 text-right">Nợ</th>
                <th className="px-3 py-1.5 text-right">Có</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.account} className="border-t border-border hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono">{row.account}</td>
                  <td className="px-3 py-2">{row.accountName}</td>
                  <td className="border-l border-border px-3 py-2 text-right">{num(row.openingDebit)}</td>
                  <td className="px-3 py-2 text-right">{num(row.openingCredit)}</td>
                  <td className="border-l border-border px-3 py-2 text-right">{num(row.periodDebit)}</td>
                  <td className="px-3 py-2 text-right">{num(row.periodCredit)}</td>
                  <td className="border-l border-border px-3 py-2 text-right font-medium">{num(row.closingDebit)}</td>
                  <td className="px-3 py-2 text-right font-medium">{num(row.closingCredit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-3 py-2.5" colSpan={2}>{r.totals.accountName}</td>
                <td className="border-l border-border px-3 py-2.5 text-right">{num(r.totals.openingDebit)}</td>
                <td className="px-3 py-2.5 text-right">{num(r.totals.openingCredit)}</td>
                <td className="border-l border-border px-3 py-2.5 text-right">{num(r.totals.periodDebit)}</td>
                <td className="px-3 py-2.5 text-right">{num(r.totals.periodCredit)}</td>
                <td className="border-l border-border px-3 py-2.5 text-right">{num(r.totals.closingDebit)}</td>
                <td className="px-3 py-2.5 text-right">{num(r.totals.closingCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sổ tài sản cố định ──────────────────────────────────────────────────────
function AssetRegisterPanel() {
  const q = useApi<AssetRegisterReport>(() => assetReports.assetRegister(), {});
  const r = q.data;

  return (
    <div>
      {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.refetch} /> :
        !r || r.rows.length === 0 ? <EmptyState title="Chưa có tài sản" /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Số lượng TSCĐ" value={r.assetCount} tone="info" />
            <StatCard label="Tổng nguyên giá" value={formatCurrency(r.totalOriginalCost, { compact: true })} tone="brand" />
            <StatCard label="Hao mòn luỹ kế" value={formatCurrency(r.totalAccumulatedDepreciation, { compact: true })} tone="warning" />
            <StatCard label="Giá trị còn lại" value={formatCurrency(r.totalBookValue, { compact: true })} tone="success" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">Mã TS</th>
                  <th className="px-3 py-2.5 text-left">Tên tài sản</th>
                  <th className="px-3 py-2.5 text-left">Danh mục</th>
                  <th className="px-3 py-2.5 text-center">TK</th>
                  <th className="px-3 py-2.5 text-left">Ngày mua</th>
                  <th className="px-3 py-2.5 text-right">Nguyên giá</th>
                  <th className="px-3 py-2.5 text-right">Hao mòn luỹ kế</th>
                  <th className="px-3 py-2.5 text-right">Giá trị còn lại</th>
                  <th className="px-3 py-2.5 text-center">Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((a) => (
                  <tr key={a.assetId} className="border-t border-border hover:bg-accent/40">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{a.assetCode}</td>
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.categoryName ?? "—"}</td>
                    <td className="px-3 py-2 text-center font-mono">{a.accountCode ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{a.purchaseDate ? formatDate(a.purchaseDate) : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{num(a.originalCost)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-warning">{num(a.accumulatedDepreciation)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{num(a.bookValue)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-center text-xs">{STATUS_LABEL[a.status] ?? a.status}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-3 py-2.5" colSpan={5}>Tổng cộng ({r.assetCount} tài sản)</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(r.totalOriginalCost)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(r.totalAccumulatedDepreciation)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(r.totalBookValue)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Báo cáo tăng / giảm TSCĐ ────────────────────────────────────────────────
function MovementPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useApi<AssetMovementReport>(
    () => assetReports.movement({ from: from || undefined, to: to || undefined }),
    { deps: [from, to] },
  );
  const r = q.data;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
      </div>
      {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.refetch} /> : !r ? <EmptyState title="Chưa có số liệu" /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Số lần ghi tăng" value={r.increaseCount} tone="success" />
            <StatCard label="Tổng nguyên giá tăng" value={formatCurrency(r.totalIncrease, { compact: true })} tone="brand" />
            <StatCard label="Số lần ghi giảm" value={r.decreaseCount} tone="danger" />
            <StatCard label="Tổng nguyên giá giảm" value={formatCurrency(r.totalDecrease, { compact: true })} tone="warning" />
          </div>

          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-success">▲ Tăng tài sản (mua mới / ghi tăng)</p>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Ngày</th>
                    <th className="px-3 py-2.5 text-left">Số CT</th>
                    <th className="px-3 py-2.5 text-left">Tài sản</th>
                    <th className="px-3 py-2.5 text-left">Diễn giải</th>
                    <th className="px-3 py-2.5 text-right">Nguyên giá</th>
                  </tr>
                </thead>
                <tbody>
                  {r.increases.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Không có ghi tăng trong kỳ.</td></tr>
                  ) : r.increases.map((m) => (
                    <tr key={m.documentCode + m.assetId} className="border-t border-border hover:bg-accent/40">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(m.date)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{m.documentCode}</td>
                      <td className="px-3 py-2">{m.assetName}{m.assetCode && <span className="ml-1 font-mono text-xs text-muted-foreground">({m.assetCode})</span>}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.note}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{num(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-danger">▼ Giảm tài sản (thanh lý / nhượng bán)</p>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Ngày</th>
                    <th className="px-3 py-2.5 text-left">Số CT</th>
                    <th className="px-3 py-2.5 text-left">Tài sản</th>
                    <th className="px-3 py-2.5 text-left">Lý do</th>
                    <th className="px-3 py-2.5 text-right">Nguyên giá</th>
                    <th className="px-3 py-2.5 text-right">Lãi/Lỗ</th>
                  </tr>
                </thead>
                <tbody>
                  {r.decreases.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Không có ghi giảm trong kỳ.</td></tr>
                  ) : r.decreases.map((m) => (
                    <tr key={m.documentCode + m.assetId} className="border-t border-border hover:bg-accent/40">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(m.date)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{m.documentCode}</td>
                      <td className="px-3 py-2">{m.assetName}{m.assetCode && <span className="ml-1 font-mono text-xs text-muted-foreground">({m.assetCode})</span>}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.note}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{num(m.amount)}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right font-medium ${(m.gainLoss ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                        {m.gainLoss != null ? formatCurrency(m.gainLoss) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountingReports() {
  return (
    <div>
      <PageHeader
        title="Báo cáo kế toán tài sản"
        description="Bảng cân đối số phát sinh, sổ tài sản cố định và báo cáo tăng/giảm TSCĐ"
        icon={FileBarChart}
      />
      <Tabs defaultValue="trial-balance">
        <TabsList className="mb-4">
          <TabsTrigger value="trial-balance"><Scale className="mr-1.5 size-4" />Cân đối số phát sinh</TabsTrigger>
          <TabsTrigger value="register"><BookMarked className="mr-1.5 size-4" />Sổ tài sản cố định</TabsTrigger>
          <TabsTrigger value="movement"><ArrowUpDown className="mr-1.5 size-4" />Tăng / giảm TSCĐ</TabsTrigger>
        </TabsList>
        <TabsContent value="trial-balance"><TrialBalancePanel /></TabsContent>
        <TabsContent value="register"><AssetRegisterPanel /></TabsContent>
        <TabsContent value="movement"><MovementPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
