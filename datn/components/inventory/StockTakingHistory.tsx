"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, ArrowLeft, ClipboardCheck, ChevronRight, ChevronDown,
  CheckCircle2, AlertTriangle, PackageCheck, Wallet, User,
} from "lucide-react";
import { stockTakes, type StockTakeResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockStockTakes } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, FilterBar, MockBanner,
  LoadingState, ErrorState, EmptyState,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/format";

export default function StockTakingHistory() {
  const takesQ = useApiList<StockTakeResponse>(
    () => stockTakes.getAll(),
    { mock: mockStockTakes },
  );

  const [search, setSearch] = useState("");
  const [whF, setWhF] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const warehouseOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of takesQ.items) m.set(s.warehouseId, s.warehouseName ?? s.warehouseId);
    return [...m.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [takesQ.items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return takesQ.items.filter((s) => {
      if (whF !== "all" && s.warehouseId !== whF) return false;
      if (!q) return true;
      return [s.stkCode, s.warehouseName, s.performedByName, s.period,
        ...s.lines.map((l) => l.materialName), ...s.lines.map((l) => l.materialCode)]
        .some((f) => f?.toLowerCase().includes(q));
    });
  }, [takesQ.items, search, whF]);

  const stats = useMemo(() => {
    let items = 0, diffValue = 0;
    for (const s of visible) { items += s.diffItems; diffValue += s.totalDiffValue; }
    return { sessions: visible.length, items, diffValue };
  }, [visible]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const body = takesQ.loading ? <LoadingState />
    : takesQ.error ? <ErrorState message={takesQ.error} onRetry={takesQ.refetch} />
    : visible.length === 0 ? (
      <EmptyState
        title="Chưa có kỳ kiểm kê nào"
        description="Mỗi kỳ kiểm kê đã hoàn tất sẽ được lưu tại đây — kể cả khi khớp sổ hoàn toàn."
      />
    ) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/inventory/stock-taking" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Kiểm kê kho
      </Link>

      <PageHeader
        title="Lịch sử kiểm kê"
        description="Toàn bộ các kỳ kiểm kê đã hoàn tất và kết quả đối chiếu tồn kho"
        icon={ClipboardList}
        actions={
          <Button asChild>
            <Link href="/inventory/stock-taking"><ClipboardCheck className="size-4" /> Kiểm kê mới</Link>
          </Button>
        }
      />

      {takesQ.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Số kỳ kiểm kê" value={stats.sessions} icon={ClipboardCheck} tone="brand" loading={takesQ.loading} />
        <StatCard label="Vật tư điều chỉnh" value={stats.items} icon={PackageCheck} tone="info" loading={takesQ.loading} />
        <StatCard
          label="Giá trị điều chỉnh ròng"
          value={formatCurrency(stats.diffValue, { compact: true })}
          icon={Wallet}
          tone={stats.diffValue < 0 ? "danger" : stats.diffValue > 0 ? "info" : "neutral"}
          loading={takesQ.loading}
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
                const isOpen = expanded.has(s.id);
                const surplus = s.lines.filter((l) => l.diff > 0).length;
                const missing = s.lines.filter((l) => l.diff < 0).length;
                return (
                  <Fragment key={s.id}>
                    <tr onClick={() => toggle(s.id)} className="cursor-pointer hover:bg-surface-2/40">
                      <td className="px-4 py-3 text-muted-foreground">
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-foreground">{s.stkCode}</p>
                        <p className="text-xs text-muted-foreground">{s.period || formatDateTime(s.countDate)}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.warehouseName ?? "—"}</td>
                      <td className="px-4 py-3">
                        {s.performedByName ? (
                          <span className="inline-flex items-center gap-1.5 text-foreground"><User className="size-3.5 text-muted-foreground" />{s.performedByName}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3 text-xs font-medium">
                          {missing > 0 && <span className="inline-flex items-center gap-1 text-danger"><AlertTriangle className="size-3.5" />{missing} thiếu</span>}
                          {surplus > 0 && <span className="inline-flex items-center gap-1 text-info"><PackageCheck className="size-3.5" />{surplus} dư</span>}
                          {s.diffItems === 0 && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="size-3.5" />Khớp sổ</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${s.totalDiffValue < 0 ? "text-danger" : s.totalDiffValue > 0 ? "text-info" : "text-muted-foreground"}`}>
                          {s.totalDiffValue > 0 ? "+" : ""}{formatCurrency(s.totalDiffValue)}
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
                                <th className="pb-2 text-right font-medium">Sổ sách</th>
                                <th className="pb-2 text-right font-medium">Thực tế</th>
                                <th className="pb-2 text-right font-medium">Chênh lệch</th>
                                <th className="pb-2 text-right font-medium">Giá trị</th>
                                <th className="pb-2 font-medium">Giải trình</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {s.lines.map((l) => (
                                <tr key={l.id}>
                                  <td className="py-2">
                                    <span className="font-medium text-foreground">{l.materialName}</span>
                                    <span className="ml-1 font-mono text-muted-foreground">{l.materialCode}</span>
                                  </td>
                                  <td className="py-2 text-right text-muted-foreground">{formatNumber(l.systemQty)}</td>
                                  <td className="py-2 text-right text-foreground">{formatNumber(l.countedQty)}</td>
                                  <td className="py-2 text-right">
                                    {l.diff === 0 ? (
                                      <span className="text-success">0</span>
                                    ) : (
                                      <span className={`font-semibold ${l.diff < 0 ? "text-danger" : "text-info"}`}>
                                        {l.diff > 0 ? "+" : ""}{formatNumber(l.diff)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 text-right text-muted-foreground">
                                    {l.diffValue ? formatCurrency(l.diffValue) : "—"}
                                  </td>
                                  <td className="py-2 text-muted-foreground">{l.note ?? "—"}</td>
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
