"use client";

import { useMemo, type ElementType } from "react";
import Link from "next/link";
import {
  BarChart3, Gauge, Coins, ArrowRight, ShieldCheck, Clock, CalendarCheck, Wallet,
} from "lucide-react";
import {
  kpiSnapshots, costTracking,
  type KpiDailySnapshotResponse, type KpiData, type CostTrackingResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockKpiSnapshots, mockCostTracking } from "@/lib/mock/reports";
import { PageHeader, StatCard, MockBanner } from "@/components/shared";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const BUILDING = "11111111-1111-1111-1111-111111111111";

function parseKpi(s?: KpiDailySnapshotResponse): KpiData {
  try { return s?.kpiDataJson ? (JSON.parse(s.kpiDataJson) as KpiData) : {}; }
  catch { return {}; }
}
function pct(v?: number): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : "—";
}

export default function Reports() {
  const year = new Date().getFullYear();

  const kpiQ = useApiList<KpiDailySnapshotResponse>(
    () => kpiSnapshots.getByBuilding(BUILDING, 30),
    { mock: mockKpiSnapshots },
  );
  const costQ = useApiList<CostTrackingResponse>(
    () => costTracking.getByBuilding(BUILDING, { from: `${year}-01-01`, to: `${year}-12-31` }),
    { mock: mockCostTracking },
  );

  const k = useMemo(() => {
    const sorted = [...kpiQ.items].sort(
      (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime(),
    );
    return parseKpi(sorted[sorted.length - 1]);
  }, [kpiQ.items]);

  const costYtd = useMemo(
    () => costQ.items
      .filter((c) => new Date(c.costDate).getFullYear() === year)
      .reduce((s, c) => s + c.amount, 0),
    [costQ.items, year],
  );

  const isMock = kpiQ.isMock || costQ.isMock;
  const loading = kpiQ.loading || costQ.loading;

  return (
    <div>
      <PageHeader
        title="Báo cáo & phân tích"
        description="Tổng quan chỉ số KPI và chi phí vận hành kỹ thuật"
        icon={BarChart3}
      />

      {isMock && <MockBanner />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tuân thủ SLA" value={pct(k.sla_compliance_rate)} icon={ShieldCheck} tone="success" hint="Kỳ gần nhất" loading={loading} />
        <StatCard label="MTTR" value={k.mttr_hours != null ? `${k.mttr_hours}h` : "—"} icon={Clock} tone="brand" hint="Thời gian sửa chữa" loading={loading} />
        <StatCard label="Bảo trì đúng hạn" value={pct(k.wo_completion_rate)} icon={CalendarCheck} tone="info" hint="WO đúng lịch" loading={loading} />
        <StatCard label={`Tổng chi ${year}`} value={formatCurrency(costYtd, { compact: true })} icon={Wallet} tone="warning" hint="Luỹ kế từ đầu năm" loading={loading} />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ReportCard
          href="/reports/kpi"
          icon={Gauge}
          tone="brand"
          title="KPI vận hành kỹ thuật"
          desc="MTTR · MTBF · SLA và tỷ lệ bảo trì đúng hạn theo các kỳ chốt số liệu."
        />
        <ReportCard
          href="/reports/cost"
          icon={Coins}
          tone="warning"
          title="Chi phí bảo trì"
          desc="Phân tích chi phí theo loại, theo tài sản và theo từng tháng trong năm."
        />
      </div>
    </div>
  );
}

function ReportCard({
  href, icon: Icon, tone, title, desc,
}: {
  href: string;
  icon: ElementType;
  tone: "brand" | "warning";
  title: string;
  desc: string;
}) {
  const toneCls = tone === "brand" ? "bg-brand/15 text-brand" : "bg-warning/15 text-warning";
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface p-6 transition-colors hover:border-brand/40 hover:bg-accent/40"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={cn("flex size-12 items-center justify-center rounded-xl", toneCls)}>
          <Icon className="size-6" />
        </div>
        <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
