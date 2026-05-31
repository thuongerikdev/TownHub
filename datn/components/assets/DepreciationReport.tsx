"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingDown, Coins, Layers, Wallet } from "lucide-react";
import { assetDepreciation, type AssetDepreciationLogResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockDepreciationLogs } from "@/lib/mock/asset";
import {
  PageHeader, StatCard, DataTable, MockBanner, type Column,
} from "@/components/shared";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const now = new Date();
const YEARS = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-2.5 text-xs shadow-md">
        <p className="mb-0.5 font-medium text-foreground">{label}</p>
        <p className="text-brand">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function DepreciationReport() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const q = useApiList<AssetDepreciationLogResponse>(
    () => assetDepreciation.getByPeriod(year, month),
    { mock: mockDepreciationLogs, deps: [year, month] },
  );
  const logs = q.items;

  const summary = useMemo(() => {
    const sum = (f: (l: AssetDepreciationLogResponse) => number | undefined) =>
      logs.reduce((s, l) => s + (f(l) ?? 0), 0);
    return {
      periodTotal: sum((l) => l.depreciationAmount),
      assetCount: logs.length,
      remaining: sum((l) => l.bookValueAfter),
      accumulated: sum((l) => l.accumulatedTotal),
    };
  }, [logs]);

  const chartData = useMemo(
    () =>
      [...logs]
        .sort((a, b) => b.depreciationAmount - a.depreciationAmount)
        .slice(0, 8)
        .map((l) => ({ name: l.assetCode ?? l.assetId.slice(0, 6), value: l.depreciationAmount })),
    [logs],
  );

  const columns: Column<AssetDepreciationLogResponse>[] = [
    { key: "asset", header: "Tài sản", sortable: true, sortAccessor: (l) => l.assetCode ?? "", cell: (l) => <span className="font-mono text-xs">{l.assetCode ?? l.assetId}</span> },
    { key: "period", header: "Kỳ", cell: (l) => `${String(l.periodMonth).padStart(2, "0")}/${l.periodYear}` },
    { key: "amt", header: "Khấu hao kỳ", align: "right", sortable: true, sortAccessor: (l) => l.depreciationAmount, cell: (l) => <span className="font-medium text-warning">{formatCurrency(l.depreciationAmount)}</span> },
    { key: "before", header: "GT trước", align: "right", cell: (l) => formatCurrency(l.bookValueBefore) },
    { key: "after", header: "GT sau", align: "right", cell: (l) => <span className="font-medium">{formatCurrency(l.bookValueAfter)}</span> },
    { key: "acc", header: "Luỹ kế", align: "right", sortable: true, sortAccessor: (l) => l.accumulatedTotal ?? 0, cell: (l) => formatCurrency(l.accumulatedTotal) },
    { key: "at", header: "Tính lúc", cell: (l) => <span className="text-muted-foreground">{formatDate(l.calculatedAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Báo cáo khấu hao"
        description="Khấu hao tài sản theo kỳ (phương pháp đường thẳng)"
        icon={TrendingDown}
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>Tháng {m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Khấu hao kỳ này" value={formatCurrency(summary.periodTotal, { compact: true })} icon={TrendingDown} tone="warning" loading={q.loading} />
        <StatCard label="Số tài sản tính KH" value={summary.assetCount} icon={Layers} tone="info" loading={q.loading} />
        <StatCard label="Giá trị còn lại" value={formatCurrency(summary.remaining, { compact: true })} icon={Wallet} tone="success" loading={q.loading} />
        <StatCard label="Khấu hao luỹ kế" value={formatCurrency(summary.accumulated, { compact: true })} icon={Coins} tone="brand" loading={q.loading} />
      </div>

      {chartData.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Khấu hao kỳ theo tài sản (Top 8)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} width={40} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="var(--brand)" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={logs} getRowId={(l) => l.id} loading={q.loading} error={q.error} onRetry={q.refetch} />
    </div>
  );
}
