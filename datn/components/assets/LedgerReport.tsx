"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { assetReports } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { PageHeader, StatCard, LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

/** Số dư: >0 là dư Nợ, <0 là dư Có. */
function balanceLabel(v: number): string {
  if (v === 0) return "0";
  return `${formatCurrency(Math.abs(v))} ${v > 0 ? "(Nợ)" : "(Có)"}`;
}

export default function LedgerReport() {
  const [account, setAccount] = useState<string>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const accountsQ = useApi(() => assetReports.accounts(), {});

  // Chọn tài khoản đầu tiên khi tải xong danh mục
  useEffect(() => {
    if (!account && accountsQ.data && accountsQ.data.length > 0) {
      setAccount(accountsQ.data[0].account);
    }
  }, [accountsQ.data, account]);

  const q = useApi(
    () => assetReports.ledger(account, { from: from || undefined, to: to || undefined }),
    { deps: [account, from, to], enabled: !!account },
  );

  const report = q.data;

  return (
    <div>
      <PageHeader
        title="Sổ cái"
        description="Theo dõi phát sinh và số dư của từng tài khoản kế toán"
        icon={BookOpen}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Chọn tài khoản" /></SelectTrigger>
              <SelectContent>
                {(accountsQ.data ?? []).map((a) => (
                  <SelectItem key={a.account} value={a.account}>{a.account} — {a.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" aria-label="Từ ngày" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" aria-label="Đến ngày" />
          </div>
        }
      />

      {!account ? (
        <EmptyState title="Chọn tài khoản" description="Hãy chọn một tài khoản để xem sổ cái." />
      ) : q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : !report ? (
        <EmptyState title="Không có dữ liệu" />
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Tài khoản {report.account} — {report.accountName}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Dư đầu kỳ" value={balanceLabel(report.openingBalance)} tone="info" />
            <StatCard label="Phát sinh Nợ" value={formatCurrency(report.periodDebit, { compact: true })} tone="brand" />
            <StatCard label="Phát sinh Có" value={formatCurrency(report.periodCredit, { compact: true })} tone="warning" />
            <StatCard label="Dư cuối kỳ" value={balanceLabel(report.closingBalance)} tone="success" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">Ngày</th>
                  <th className="px-3 py-2.5 text-left">Số CT</th>
                  <th className="px-3 py-2.5 text-left">Diễn giải</th>
                  <th className="px-3 py-2.5 text-center">TK đối ứng</th>
                  <th className="px-3 py-2.5 text-right">PS Nợ</th>
                  <th className="px-3 py-2.5 text-right">PS Có</th>
                  <th className="px-3 py-2.5 text-right">Số dư</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border bg-muted/20 italic">
                  <td className="px-3 py-2 text-muted-foreground" colSpan={6}>Số dư đầu kỳ</td>
                  <td className="px-3 py-2 text-right font-medium">{balanceLabel(report.openingBalance)}</td>
                </tr>
                {report.entries.length === 0 ? (
                  <tr className="border-t border-border">
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                      Không có phát sinh trong kỳ.
                    </td>
                  </tr>
                ) : (
                  report.entries.map((e) => (
                    <tr key={e.lineId} className="border-t border-border hover:bg-accent/40">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(e.documentDate)}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{e.documentCode}</td>
                      <td className="px-3 py-2">
                        {e.description}
                        {e.assetCode && <span className="ml-1 font-mono text-xs text-muted-foreground">({e.assetCode})</span>}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{e.counterAccount ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{e.debit ? formatCurrency(e.debit) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{e.credit ? formatCurrency(e.credit) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{balanceLabel(e.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-3 py-2.5" colSpan={4}>Cộng phát sinh trong kỳ</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(report.periodDebit)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(report.periodCredit)}</td>
                  <td className="px-3 py-2.5 text-right">{balanceLabel(report.closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
