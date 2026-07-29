"use client";

import { useState } from "react";
import { BookText } from "lucide-react";
import { assetReports, type JournalEntry } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/shared";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  GHI_TANG: "Ghi tăng", KHAU_HAO: "Khấu hao", THANH_LY: "Thanh lý",
};

export default function JournalReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [account, setAccount] = useState("ALL");

  const accountsQ = useApi(() => assetReports.accounts(), {});
  const q = useApi(
    () => assetReports.journal({
      from: from || undefined,
      to: to || undefined,
      account: account === "ALL" ? undefined : account,
    }),
    { deps: [from, to, account] },
  );

  const report = q.data;

  return (
    <div>
      <PageHeader
        title="Nhật ký chung"
        description="Ghi nhận toàn bộ bút toán phát sinh theo trình tự thời gian (định khoản Nợ - Có)"
        icon={BookText}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" aria-label="Từ ngày" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" aria-label="Đến ngày" />
            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả tài khoản</SelectItem>
                {(accountsQ.data ?? []).map((a) => (
                  <SelectItem key={a.account} value={a.account}>{a.account} — {a.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : !report || report.entries.length === 0 ? (
        <EmptyState title="Chưa có bút toán" description="Không có chứng từ nào trong khoảng thời gian đã chọn." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">Ngày</th>
                <th className="px-3 py-2.5 text-left">Số CT</th>
                <th className="px-3 py-2.5 text-left">Loại</th>
                <th className="px-3 py-2.5 text-left">Diễn giải</th>
                <th className="px-3 py-2.5 text-center">TK Nợ</th>
                <th className="px-3 py-2.5 text-center">TK Có</th>
                <th className="px-3 py-2.5 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {report.entries.map((e: JournalEntry) => (
                <tr key={e.lineId} className="border-t border-border hover:bg-accent/40">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(e.documentDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{e.documentCode}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">{TYPE_LABEL[e.documentType] ?? e.documentType}</td>
                  <td className="px-3 py-2">
                    {e.description}
                    {e.assetCode && <span className="ml-1 font-mono text-xs text-muted-foreground">({e.assetCode})</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-mono">{e.debitAccount ?? "—"}</td>
                  <td className="px-3 py-2 text-center font-mono">{e.creditAccount ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-3 py-2.5" colSpan={4}>Tổng cộng ({report.entries.length} bút toán)</td>
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">Nợ</td>
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">Có</td>
                <td className="px-3 py-2.5 text-right">
                  <div>{formatCurrency(report.totalDebit)}</div>
                  <div className="text-xs font-normal text-muted-foreground">Có: {formatCurrency(report.totalCredit)}</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
