"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Clock, AlertTriangle, Gauge, ShieldCheck } from "lucide-react";
import {
  tickets, slaConfigs, displayUser,
  type TicketResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockTickets, mockSlaConfigs } from "@/lib/mock/cm";
import {
  PageHeader, StatCard, MockBanner, PriorityBadge, ToneBadge,
} from "@/components/shared";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

const SLA_HOURS: Record<string, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_BAR: Record<string, string> = {
  CRITICAL: "bg-danger", HIGH: "bg-warning", MEDIUM: "bg-info", LOW: "bg-success",
};
const CATEGORY: Record<string, string> = {
  ELECTRICAL: "Điện", PLUMBING: "Nước", HVAC: "HVAC", ELEVATOR: "Thang máy", FIRE: "PCCC", OTHER: "Khác",
};

const isResolved = (t: TicketResponse) => !!t.resolvedAt || t.status === "RESOLVED" || t.status === "CLOSED";
const resolvedTime = (t: TicketResponse) => t.resolvedAt ?? t.closedAt ?? t.updatedAt;
const slaDueMs = (t: TicketResponse) =>
  new Date(t.createdAt).getTime() + (SLA_HOURS[t.priority] ?? 24) * 3600_000;

function isViolated(t: TicketResponse, now: number): boolean {
  const due = slaDueMs(t);
  if (isResolved(t)) return new Date(resolvedTime(t)).getTime() > due;
  return now > due;
}
function overdueMs(t: TicketResponse, now: number): number {
  const due = slaDueMs(t);
  const end = isResolved(t) ? new Date(resolvedTime(t)).getTime() : now;
  return Math.max(0, end - due);
}
function fmtDur(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}ph`;
  return m > 0 ? `${h}h ${m}ph` : `${h}h`;
}

export default function SLADashboard() {
  const q = useApiList<TicketResponse>(() => tickets.getAll(), { mock: mockTickets });
  const slaQ = useApiList(() => slaConfigs.getAll(), { mock: mockSlaConfigs });
  const [period, setPeriod] = useState("all");

  const now = Date.now();
  const scoped = useMemo(() => {
    if (period === "all") return q.items;
    const cutoff = now - Number(period) * 86_400_000;
    return q.items.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  }, [q.items, period, now]);

  const m = useMemo(() => {
    const total = scoped.length;
    const resolved = scoped.filter(isResolved);
    const violatedList = scoped.filter((t) => isViolated(t, now));
    const compliant = total - violatedList.length;
    const onTimeRate = total ? Math.round((compliant / total) * 1000) / 10 : 0;
    const openBreaching = scoped.filter((t) => !isResolved(t) && now > slaDueMs(t)).length;

    const mttrMs = resolved.length
      ? resolved.reduce((sum, t) => sum + (new Date(resolvedTime(t)).getTime() - new Date(t.createdAt).getTime()), 0) / resolved.length
      : 0;

    const byPriority = PRIORITY_ORDER.map((p) => {
      const rows = scoped.filter((t) => t.priority === p);
      const ok = rows.filter((t) => !isViolated(t, now)).length;
      const pct = rows.length ? Math.round((ok / rows.length) * 1000) / 10 : 0;
      return { priority: p, ok, total: rows.length, pct };
    });

    return { total, resolved: resolved.length, onTimeRate, openBreaching, mttrMs, violatedList, byPriority };
  }, [scoped, now]);

  const activeConfigs = useMemo(() => slaQ.items.filter((s) => s.isActive), [slaQ.items]);

  return (
    <div>
      <PageHeader
        title="SLA Dashboard"
        description="Theo dõi tỷ lệ đáp ứng, MTTR và các sự cố vi phạm SLA"
        icon={Gauge}
        actions={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="30">30 ngày qua</SelectItem>
              <SelectItem value="90">90 ngày qua</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {(q.isMock || slaQ.isMock) && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tỷ lệ đúng hạn" value={`${m.onTimeRate}%`} icon={TrendingUp} tone={m.onTimeRate >= 90 ? "success" : "warning"} hint="Mục tiêu ≥ 90%" loading={q.loading} />
        <StatCard label="MTTR trung bình" value={m.resolved ? fmtDur(m.mttrMs) : "—"} icon={Clock} tone="info" hint={`${m.resolved} sự cố đã xử lý`} loading={q.loading} />
        <StatCard label="Đang vi phạm" value={m.openBreaching} icon={AlertTriangle} tone={m.openBreaching > 0 ? "danger" : "neutral"} hint="Quá hạn & chưa xử lý" loading={q.loading} />
        <StatCard label="Tổng sự cố" value={m.total} icon={ShieldCheck} tone="neutral" hint={`${m.violatedList.length} vi phạm SLA`} loading={q.loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Phân tích theo độ ưu tiên */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Tuân thủ SLA theo độ ưu tiên</h2>
          {m.total === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu sự cố trong kỳ.</p>
          ) : (
            <div className="space-y-4">
              {m.byPriority.map((p) => (
                <div key={p.priority}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <PriorityBadge value={p.priority} />
                    <span className={`font-semibold ${p.pct >= 90 ? "text-success" : p.total === 0 ? "text-muted-foreground" : "text-danger"}`}>
                      {p.ok}/{p.total} {p.total > 0 ? `(${p.pct}%)` : ""}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full transition-all ${PRIORITY_BAR[p.priority]}`} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cấu hình SLA đang áp dụng */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Cấu hình SLA đang áp dụng</h2>
          {activeConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có cấu hình SLA nào.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activeConfigs.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.issueCategory ? (CATEGORY[s.issueCategory] ?? s.issueCategory) : "Mọi loại"} · {s.businessHoursOnly ? "Giờ hành chính" : "24/7"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PriorityBadge value={s.priorityLevel} />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {s.responseTimeHours != null ? `${s.responseTimeHours}h` : "—"} / {s.resolutionTimeHours != null ? `${s.resolutionTimeHours}h` : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Danh sách vi phạm SLA */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Sự cố vi phạm SLA</h2>
          <ToneBadge tone={m.violatedList.length > 0 ? "danger" : "success"}>{m.violatedList.length} sự cố</ToneBadge>
        </div>
        {m.violatedList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có sự cố vi phạm SLA trong kỳ. 🎉</p>
        ) : (
          <ul className="space-y-2.5">
            {m.violatedList
              .slice()
              .sort((a, b) => overdueMs(b, now) - overdueMs(a, now))
              .map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-foreground">{t.ticketCode}</span>
                      <PriorityBadge value={t.priority} />
                      <ToneBadge tone="neutral">{CATEGORY[t.category ?? "OTHER"] ?? t.category}</ToneBadge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-foreground">{t.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Tạo lúc {formatDateTime(t.createdAt)} · {t.reportedByName ?? displayUser(t.reportedBy) ?? "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-danger">Trễ {fmtDur(overdueMs(t, now))}</p>
                    <p className="text-xs text-muted-foreground">{isResolved(t) ? "Xử lý muộn" : "Đang quá hạn"}</p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
