"use client";

import { useMemo, useState } from "react";
import { Coins, Receipt, ArrowUpRight, Wallet, Download } from "lucide-react";
import { toast } from "sonner";
import { costTracking, type CostTrackingResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockCostTracking } from "@/lib/mock/reports";
import {
  PageHeader, StatCard, DataTable, FilterBar, MockBanner, LoadingState, ErrorState, EmptyState,
  type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BUILDING = "11111111-1111-1111-1111-111111111111";

const TYPE_META: Record<string, { label: string; bar: string }> = {
  MATERIAL: { label: "Vật tư", bar: "bg-brand" },
  LABOR: { label: "Nhân công", bar: "bg-success" },
  SERVICE: { label: "Dịch vụ", bar: "bg-warning" },
};
function typeMeta(t?: string): { label: string; bar: string } {
  return TYPE_META[t ?? ""] ?? { label: t || "Khác", bar: "bg-info" };
}

const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export default function CostReport() {
  const thisYear = new Date().getFullYear();
  const YEARS = [thisYear, thisYear - 1, thisYear - 2];

  const [year, setYear] = useState(thisYear);
  const [type, setType] = useState("all");

  const q = useApiList<CostTrackingResponse>(
    () => costTracking.getByBuilding(BUILDING, { from: `${year}-01-01`, to: `${year}-12-31` }),
    { mock: mockCostTracking, deps: [year] },
  );

  // Lọc theo năm phía client (bảo vệ luồng mock vốn cố định) rồi theo loại chi phí.
  const inYear = useMemo(
    () => q.items.filter((c) => new Date(c.costDate).getFullYear() === year),
    [q.items, year],
  );
  const view = useMemo(
    () => (type === "all" ? inYear : inYear.filter((c) => (c.costType ?? "") === type)),
    [inYear, type],
  );

  const stats = useMemo(() => {
    const total = view.reduce((s, c) => s + c.amount, 0);
    const count = view.length;
    return {
      total,
      count,
      max: count ? Math.max(...view.map((c) => c.amount)) : 0,
      avg: count ? total / count : 0,
    };
  }, [view]);

  // Phân bổ theo loại — luôn tính trên cả năm để giữ vai trò tổng quan so sánh.
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of inYear) map.set(c.costType ?? "OTHER", (map.get(c.costType ?? "OTHER") ?? 0) + c.amount);
    const total = [...map.values()].reduce((a, b) => a + b, 0);
    return [...map.entries()]
      .map(([t, amount]) => ({ type: t, amount, pct: total ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [inYear]);

  const monthly = useMemo(() => {
    const arr = MONTHS.map((m) => ({ month: m, total: 0 }));
    for (const c of view) arr[new Date(c.costDate).getMonth()].total += c.amount;
    return arr;
  }, [view]);
  const maxMonth = Math.max(1, ...monthly.map((m) => m.total));

  const topAssets = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of view) {
      const code = c.assetCode ?? c.assetId ?? "—";
      map.set(code, (map.get(code) ?? 0) + c.amount);
    }
    const max = Math.max(1, ...map.values());
    return [...map.entries()]
      .map(([code, amount]) => ({ code, amount, pct: (amount / max) * 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [view]);

  const rows = useMemo(
    () => [...view].sort((a, b) => new Date(b.costDate).getTime() - new Date(a.costDate).getTime()),
    [view],
  );

  const columns: Column<CostTrackingResponse>[] = [
    { key: "date", header: "Ngày", sortable: true, sortAccessor: (r) => r.costDate, cell: (r) => <span className="text-sm text-foreground">{formatDate(r.costDate)}</span> },
    {
      key: "type", header: "Loại", cell: (r) => {
        const m = typeMeta(r.costType);
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", m.bar)} />
            <span className="text-sm text-foreground">{m.label}</span>
          </span>
        );
      },
    },
    { key: "asset", header: "Tài sản", cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.assetCode ?? "—"}</span> },
    { key: "desc", header: "Nội dung", cell: (r) => <span className="text-sm text-foreground">{r.description ?? "—"}</span> },
    { key: "amount", header: "Số tiền", align: "right", sortable: true, sortAccessor: (r) => r.amount, cell: (r) => <span className="tabular-nums font-medium text-foreground">{formatCurrency(r.amount)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Chi phí bảo trì"
        description="Phân tích chi phí theo loại, tài sản và thời gian"
        icon={Coins}
        actions={<Button variant="outline" onClick={() => toast.info("Tính năng xuất báo cáo đang được phát triển.")}><Download className="size-4" /> Xuất Excel</Button>}
      />

      {q.isMock && <MockBanner />}

      <FilterBar className="mt-2">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => <SelectItem key={y} value={String(y)}>Năm {y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="MATERIAL">Vật tư</SelectItem>
            <SelectItem value="LABOR">Nhân công</SelectItem>
            <SelectItem value="SERVICE">Dịch vụ</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : inYear.length === 0 ? (
        <EmptyState icon={Coins} title="Chưa có dữ liệu chi phí" description={`Không có khoản chi nào được ghi nhận trong năm ${year}.`} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tổng chi" value={formatCurrency(stats.total, { compact: true })} icon={Coins} tone="brand" hint={type === "all" ? `Năm ${year}` : typeMeta(type).label} />
            <StatCard label="Số khoản chi" value={stats.count} icon={Receipt} tone="info" />
            <StatCard label="Khoản lớn nhất" value={formatCurrency(stats.max, { compact: true })} icon={ArrowUpRight} tone="warning" />
            <StatCard label="Trung bình/khoản" value={formatCurrency(stats.avg, { compact: true })} icon={Wallet} tone="success" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Chi phí theo tháng */}
            <div className="rounded-xl border border-border bg-surface p-6 lg:col-span-3">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Chi phí theo tháng</h2>
                <span className="text-xs text-muted-foreground">{type === "all" ? "Tất cả loại" : typeMeta(type).label}</span>
              </div>
              <p className="mb-5 text-xs text-muted-foreground">Năm {year}</p>
              <div className="flex items-end gap-1.5 sm:gap-2">
                {monthly.map((m) => {
                  const h = Math.max(m.total > 0 ? 4 : 0, (m.total / maxMonth) * 100);
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="flex h-32 w-full items-end">
                        <div className="w-full rounded-t bg-brand transition-all" style={{ height: `${h}%` }} title={formatCurrency(m.total)} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phân bổ theo loại */}
            <div className="rounded-xl border border-border bg-surface p-6 lg:col-span-2">
              <h2 className="mb-1 text-sm font-semibold text-foreground">Phân bổ theo loại</h2>
              <p className="mb-5 text-xs text-muted-foreground">Cả năm {year}</p>
              <div className="space-y-4">
                {byType.map((t) => {
                  const m = typeMeta(t.type);
                  const active = type === t.type;
                  return (
                    <div key={t.type} className={cn("rounded-lg p-2 transition-colors", active && "bg-surface-2/60")}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-foreground">
                          <span className={cn("size-2.5 rounded-sm", m.bar)} />
                          {m.label}
                        </span>
                        <span className="tabular-nums font-medium text-foreground">{formatCurrency(t.amount, { compact: true })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div className={cn("h-full rounded-full", m.bar)} style={{ width: `${t.pct}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{t.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top tài sản chi phí cao */}
          {topAssets.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Top tài sản chi phí cao</h2>
              <ul className="space-y-3">
                {topAssets.map((a, i) => (
                  <li key={a.code} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                    <span className="w-24 shrink-0 font-mono text-xs text-foreground">{a.code}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${a.pct}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right text-sm tabular-nums font-medium text-foreground">{formatCurrency(a.amount, { compact: true })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chi tiết khoản chi */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Chi tiết khoản chi ({rows.length})</h2>
            <DataTable columns={columns} rows={rows} getRowId={(r) => r.id} empty={<EmptyState icon={Receipt} title="Không có khoản chi" description="Không có khoản chi nào khớp bộ lọc hiện tại." />} />
          </div>
        </div>
      )}
    </div>
  );
}
