"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, ArrowLeft, ClipboardCheck, ChevronRight, ChevronDown,
  CheckCircle2, AlertTriangle, PackageCheck, Wallet, User,
} from "lucide-react";
import {
  inventoryTransactions, type InventoryTransactionResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockStockTakeTransactions } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, FilterBar, MockBanner,
  LoadingState, ErrorState, EmptyState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/format";

// Một kỳ kiểm kê = nhóm các giao dịch ADJUST cùng referenceId (mã phiếu kiểm kê).
type Session = {
  code: string;
  warehouseId: string;
  warehouseName: string;
  performedAt: string;
  performer: string;
  period: string;
  lines: InventoryTransactionResponse[];
  surplus: number;
  missing: number;
  netValue: number;
};

// notes có dạng "<ghi chú/kỳ> · Người thực hiện: <tên>". Tách ra để hiển thị.
function parseNote(notes?: string): { performer: string; period: string } {
  if (!notes) return { performer: "", period: "" };
  const performer = notes.match(/Người thực hiện:\s*(.+?)\s*$/)?.[1]?.trim() ?? "";
  const period = notes.match(/Kiểm kê\s+([^·]+?)(?:\s*·|\s*$)/)?.[1]?.trim() ?? "";
  return { performer, period };
}

export default function StockTakingHistory() {
  const txnQ = useApiList<InventoryTransactionResponse>(
    () => inventoryTransactions.getAll({ referenceType: "STOCK_TAKE" }),
    { mock: mockStockTakeTransactions },
  );

  const [search, setSearch] = useState("");
  const [whF, setWhF] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sessions = useMemo(() => {
    const map = new Map<string, Session>();
    for (const tx of txnQ.items) {
      if (tx.referenceType !== "STOCK_TAKE") continue;
      const key = tx.referenceId || tx.txnCode;
      let s = map.get(key);
      if (!s) {
        const meta = parseNote(tx.notes);
        s = {
          code: key,
          warehouseId: tx.warehouseId,
          warehouseName: tx.warehouseName ?? "—",
          performedAt: tx.performedAt,
          performer: meta.performer,
          period: meta.period,
          lines: [], surplus: 0, missing: 0, netValue: 0,
        };
        map.set(key, s);
      }
      const meta = parseNote(tx.notes);
      if (!s.performer && meta.performer) s.performer = meta.performer;
      if (!s.period && meta.period) s.period = meta.period;
      if (tx.performedAt < s.performedAt) s.performedAt = tx.performedAt;
      s.lines.push(tx);
      if (tx.quantity > 0) s.surplus++; else if (tx.quantity < 0) s.missing++;
      s.netValue += tx.quantity * (tx.unitCost ?? 0);
    }
    return [...map.values()].sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  }, [txnQ.items]);

  const warehouseOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sessions) m.set(s.warehouseId, s.warehouseName);
    return [...m.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [sessions]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (whF !== "all" && s.warehouseId !== whF) return false;
      if (!q) return true;
      return [s.code, s.warehouseName, s.performer, s.period,
        ...s.lines.map((l) => l.materialName), ...s.lines.map((l) => l.materialCode)]
        .some((f) => f?.toLowerCase().includes(q));
    });
  }, [sessions, search, whF]);

  const stats = useMemo(() => {
    let items = 0, netValue = 0;
    for (const s of visible) { items += s.lines.length; netValue += s.netValue; }
    return { sessions: visible.length, items, netValue };
  }, [visible]);

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  const body = txnQ.loading ? <LoadingState />
    : txnQ.error ? <ErrorState message={txnQ.error} onRetry={txnQ.refetch} />
    : visible.length === 0 ? (
      <EmptyState
        title="Chưa có kỳ kiểm kê nào"
        description="Lịch sử ghi nhận các kỳ kiểm kê đã sinh phiếu điều chỉnh tồn kho. Kỳ kiểm kê khớp sổ hoàn toàn (không lệch) sẽ không xuất hiện ở đây."
      />
    ) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/inventory/stock-taking" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Kiểm kê kho
      </Link>

      <PageHeader
        title="Lịch sử kiểm kê"
        description="Các kỳ kiểm kê đã hoàn tất và phiếu điều chỉnh tồn kho phát sinh"
        icon={ClipboardList}
        actions={
          <Button asChild>
            <Link href="/inventory/stock-taking"><ClipboardCheck className="size-4" /> Kiểm kê mới</Link>
          </Button>
        }
      />

      {txnQ.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Số kỳ kiểm kê" value={stats.sessions} icon={ClipboardCheck} tone="brand" loading={txnQ.loading} />
        <StatCard label="Vật tư điều chỉnh" value={stats.items} icon={PackageCheck} tone="info" loading={txnQ.loading} />
        <StatCard
          label="Giá trị điều chỉnh ròng"
          value={formatCurrency(stats.netValue, { compact: true })}
          icon={Wallet}
          tone={stats.netValue < 0 ? "danger" : stats.netValue > 0 ? "info" : "neutral"}
          loading={txnQ.loading}
        />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm mã phiếu, vật tư, người thực hiện…">
        <Select value={whF} onValueChange={setWhF}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Mọi kho" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi kho</SelectItem>
            {warehouseOptions.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {body ? (
          <div>{body}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/50 text-left text-xs uppercase text-muted-foreground">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-semibold">Phiếu kiểm kê</th>
                <th className="px-4 py-3 font-semibold">Kho</th>
                <th className="px-4 py-3 font-semibold">Người thực hiện</th>
                <th className="px-4 py-3 text-center font-semibold">Kết quả</th>
                <th className="px-4 py-3 text-right font-semibold">Giá trị lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((s) => {
                const isOpen = expanded.has(s.code);
                return (
                  <Fragment key={s.code}>
                    <tr onClick={() => toggle(s.code)} className="cursor-pointer hover:bg-surface-2/40">
                      <td className="px-4 py-3 text-muted-foreground">
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-foreground">{s.code}</p>
                        <p className="text-xs text-muted-foreground">{s.period || formatDateTime(s.performedAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.warehouseName}</td>
                      <td className="px-4 py-3">
                        {s.performer ? (
                          <span className="inline-flex items-center gap-1.5 text-foreground"><User className="size-3.5 text-muted-foreground" />{s.performer}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3 text-xs font-medium">
                          {s.missing > 0 && <span className="inline-flex items-center gap-1 text-danger"><AlertTriangle className="size-3.5" />{s.missing} thiếu</span>}
                          {s.surplus > 0 && <span className="inline-flex items-center gap-1 text-info"><PackageCheck className="size-3.5" />{s.surplus} dư</span>}
                          {s.missing === 0 && s.surplus === 0 && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" />Khớp</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${s.netValue < 0 ? "text-danger" : s.netValue > 0 ? "text-info" : "text-muted-foreground"}`}>
                          {s.netValue > 0 ? "+" : ""}{formatCurrency(s.netValue)}
                        </span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-surface-2/20">
                        <td />
                        <td colSpan={5} className="px-4 py-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left uppercase text-muted-foreground">
                                <th className="pb-2 font-medium">Vật tư</th>
                                <th className="pb-2 text-right font-medium">Chênh lệch</th>
                                <th className="pb-2 text-right font-medium">Giá trị</th>
                                <th className="pb-2 font-medium">Ghi chú</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {s.lines.map((l) => (
                                <tr key={l.id}>
                                  <td className="py-2">
                                    <span className="font-medium text-foreground">{l.materialName}</span>
                                    <span className="ml-1 font-mono text-muted-foreground">{l.materialCode}</span>
                                  </td>
                                  <td className="py-2 text-right">
                                    <span className={`font-semibold ${l.quantity < 0 ? "text-danger" : "text-info"}`}>
                                      {l.quantity > 0 ? "+" : ""}{formatNumber(l.quantity)}
                                    </span>
                                  </td>
                                  <td className="py-2 text-right text-muted-foreground">
                                    {formatCurrency(l.quantity * (l.unitCost ?? 0))}
                                  </td>
                                  <td className="py-2 text-muted-foreground">{l.notes ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
