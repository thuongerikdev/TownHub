"use client";

import { useMemo, type ReactNode } from "react";
import {
  Gauge, Clock, Activity, ShieldCheck, CalendarCheck, Download,
} from "lucide-react";
import { toast } from "sonner";
import { kpiSnapshots, type KpiDailySnapshotResponse, type KpiData } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockKpiSnapshots } from "@/lib/mock/reports";
import {
  PageHeader, StatCard, DataTable, MockBanner, LoadingState, ErrorState, EmptyState,
  type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const BUILDING = "11111111-1111-1111-1111-111111111111";

interface Point { snapshot: KpiDailySnapshotResponse; kpi: KpiData; }

function parseKpi(s: KpiDailySnapshotResponse): KpiData {
  try { return s.kpiDataJson ? (JSON.parse(s.kpiDataJson) as KpiData) : {}; }
  catch { return {}; }
}

function pct(v?: number): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : "—";
}
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Trend = { value: string; positive: boolean } | undefined;
function trendNum(curr?: number, prev?: number, higherBetter = true, suffix = "", digits = 1): Trend {
  if (curr == null || prev == null) return undefined;
  const delta = curr - prev;
  if (Math.abs(delta) < 1e-9) return { value: "Không đổi", positive: true };
  const positive = higherBetter ? delta > 0 : delta < 0;
  return { value: `${delta > 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(digits)}${suffix}`, positive };
}

export default function KPIReport() {
  const q = useApiList<KpiDailySnapshotResponse>(() => kpiSnapshots.getByBuilding(BUILDING, 90), { mock: mockKpiSnapshots });

  const series: Point[] = useMemo(
    () => [...q.items]
      .sort((a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime())
      .map((s) => ({ snapshot: s, kpi: parseKpi(s) })),
    [q.items],
  );

  const latest = series[series.length - 1] ?? null;
  const prev = series[series.length - 2] ?? null;
  const k = latest?.kpi ?? {};
  const kp = prev?.kpi ?? {};

  const slaTone = (rate?: number) => (rate == null ? "neutral" : rate >= 0.9 ? "success" : rate >= 0.8 ? "warning" : "danger");

  const rows = useMemo(() => [...series].reverse(), [series]);

  const columns: Column<Point>[] = [
    { key: "date", header: "Kỳ chốt", cell: (r) => <span className="text-sm text-foreground">{formatDate(r.snapshot.snapshotDate)}</span> },
    { key: "mttr", header: "MTTR", align: "right", cell: (r) => <span className="tabular-nums">{r.kpi.mttr_hours != null ? `${r.kpi.mttr_hours}h` : "—"}</span> },
    { key: "mtbf", header: "MTBF", align: "right", cell: (r) => <span className="tabular-nums">{r.kpi.mtbf_days != null ? `${r.kpi.mtbf_days} ngày` : "—"}</span> },
    { key: "sla", header: "SLA", align: "right", cell: (r) => <span className="tabular-nums">{pct(r.kpi.sla_compliance_rate)}</span> },
    { key: "wo", header: "WO hoàn tất", align: "right", cell: (r) => <span className="tabular-nums">{r.kpi.wo_count_completed ?? "—"}</span> },
    { key: "overdue", header: "Ticket trễ", align: "right", cell: (r) => <span className="tabular-nums">{r.kpi.ticket_count_overdue ?? "—"}</span> },
    { key: "avail", header: "Khả dụng TS", align: "right", cell: (r) => <span className="tabular-nums">{pct(r.kpi.asset_availability_rate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="KPI vận hành kỹ thuật"
        description="MTTR · MTBF · SLA · tỷ lệ bảo trì đúng hạn theo các kỳ chốt số liệu"
        icon={Gauge}
        actions={<Button variant="outline" onClick={() => toast.info("Tính năng xuất báo cáo đang được phát triển.")}><Download className="size-4" /> Xuất Excel</Button>}
      />

      {q.isMock && <MockBanner />}

      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : series.length === 0 ? (
        <EmptyState icon={Gauge} title="Chưa có số liệu KPI" description="Hệ thống sẽ hiển thị KPI khi có bản chốt số liệu hằng ngày." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="MTTR" value={k.mttr_hours != null ? `${k.mttr_hours}h` : "—"} icon={Clock} tone="brand" hint="Thời gian sửa chữa TB" trend={trendNum(k.mttr_hours, kp.mttr_hours, false, "h")} />
            <StatCard label="MTBF" value={k.mtbf_days != null ? `${k.mtbf_days} ngày` : "—"} icon={Activity} tone="info" hint="Thời gian giữa hai hỏng hóc" trend={trendNum(k.mtbf_days, kp.mtbf_days, true, "", 0)} />
            <StatCard label="Tuân thủ SLA" value={pct(k.sla_compliance_rate)} icon={ShieldCheck} tone={slaTone(k.sla_compliance_rate)} hint="Mục tiêu ≥ 90%" trend={trendNum((k.sla_compliance_rate ?? 0) * 100, (kp.sla_compliance_rate ?? 0) * 100, true, "%")} />
            <StatCard label="Bảo trì đúng hạn" value={pct(k.wo_completion_rate)} icon={CalendarCheck} tone={slaTone(k.wo_completion_rate)} hint="WO hoàn tất đúng lịch" trend={trendNum((k.wo_completion_rate ?? 0) * 100, (kp.wo_completion_rate ?? 0) * 100, true, "%")} />
          </div>

          {/* SLA trend */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Tỷ lệ tuân thủ SLA theo kỳ</h2>
              <span className="text-xs text-muted-foreground">Thang đo 80–100%</span>
            </div>
            <p className="mb-5 text-xs text-muted-foreground">{series.length} kỳ gần nhất</p>
            <div className="flex items-end gap-2 sm:gap-3">
              {series.map((p) => {
                const rate = p.kpi.sla_compliance_rate;
                const v = rate != null ? rate * 100 : 0;
                const h = Math.max(2, Math.min(100, ((v - 80) / 20) * 100));
                const tone = v >= 90 ? "bg-success" : v >= 80 ? "bg-warning" : "bg-danger";
                return (
                  <div key={p.snapshot.id} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{rate != null ? `${v.toFixed(0)}` : "—"}</span>
                    <div className="flex h-32 w-full items-end">
                      <div className={cn("w-full rounded-t", tone)} style={{ height: `${h}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{shortDate(p.snapshot.snapshotDate)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chỉ số kỳ gần nhất */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Chỉ số kỳ gần nhất · {formatDate(latest?.snapshot.snapshotDate)}</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Mini label="Khả dụng tài sản" value={pct(k.asset_availability_rate)} />
              <Mini label="Ticket mở mới" value={k.ticket_count_new ?? "—"} />
              <Mini label="Ticket đã xử lý" value={k.ticket_count_resolved ?? "—"} />
              <Mini label="Ticket quá hạn" value={k.ticket_count_overdue ?? "—"} />
              <Mini label="WO hoàn tất" value={k.wo_count_completed ?? "—"} />
              <Mini label="PM quá hạn" value={k.pm_overdue_count ?? "—"} />
            </div>
          </div>

          {/* Lịch sử kỳ chốt */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Lịch sử các kỳ chốt số liệu</h2>
            <DataTable columns={columns} rows={rows} getRowId={(r) => r.snapshot.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
