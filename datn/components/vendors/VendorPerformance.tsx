"use client";

import { useMemo, useState } from "react";
import {
  BarChart3, Building2, Star, ClipboardCheck, ThumbsUp, Award,
} from "lucide-react";
import {
  vendorsApi, vendorEvaluations,
  type ApiResponse, type VendorResponse, type VendorEvaluationResponse,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { mockVendors, mockVendorEvaluations } from "@/lib/mock/vendor";
import {
  PageHeader, StatCard, MockBanner, LoadingState, ErrorState, EmptyState, ToneBadge,
} from "@/components/shared";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PerfRow {
  vendor: VendorResponse;
  count: number;
  avgOverall: number | null;
  criteria: { quality: number; timeliness: number; cost: number; safety: number } | null;
  latest: VendorEvaluationResponse | null;
  evals: VendorEvaluationResponse[];
}

function buildRow(vendor: VendorResponse, evals: VendorEvaluationResponse[]): PerfRow {
  const n = evals.length;
  if (!n) return { vendor, count: 0, avgOverall: null, criteria: null, latest: null, evals: [] };
  const sorted = [...evals].sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime());
  return {
    vendor,
    count: n,
    avgOverall: evals.reduce((s, e) => s + e.overallScore, 0) / n,
    criteria: {
      quality: evals.reduce((s, e) => s + e.qualityScore, 0) / n,
      timeliness: evals.reduce((s, e) => s + e.timelinessScore, 0) / n,
      cost: evals.reduce((s, e) => s + e.costScore, 0) / n,
      safety: evals.reduce((s, e) => s + e.safetyScore, 0) / n,
    },
    latest: sorted[0],
    evals: sorted,
  };
}

// Không có endpoint tổng hợp đánh giá → lấy danh sách nhà thầu rồi gọi
// get-by-vendor cho từng nhà thầu (N+1 chấp nhận được với số lượng nhỏ).
async function fetchPerf(): Promise<ApiResponse<PerfRow[]>> {
  const vr = await vendorsApi.getAll();
  if (vr.errorCode !== 200 || !vr.data) {
    return { errorCode: vr.errorCode || 500, errorMessage: vr.errorMessage, data: [] };
  }
  const rows = await Promise.all(
    vr.data.map(async (v) => {
      const er = await vendorEvaluations.getByVendor(v.id);
      const evals = er.errorCode === 200 && er.data ? er.data : [];
      return buildRow(v, evals);
    }),
  );
  return { errorCode: 200, errorMessage: "", data: rows };
}

function buildMockRows(): PerfRow[] {
  return mockVendors.map((v) => buildRow(v, mockVendorEvaluations.filter((e) => e.vendorId === v.id)));
}

function scoreTone(score: number): string {
  return score >= 4 ? "bg-success" : score >= 3 ? "bg-warning" : "bg-danger";
}

const RANK_TONE = ["bg-warning text-warning-foreground", "bg-info text-info-foreground", "bg-brand text-brand-foreground"];

export default function VendorPerformance() {
  const q = useApi<PerfRow[]>(fetchPerf, { mock: buildMockRows });
  const rows = q.data ?? [];

  const [selectedId, setSelectedId] = useState<string>("");

  const ranked = useMemo(
    () => [...rows].sort((a, b) => (b.avgOverall ?? -1) - (a.avgOverall ?? -1)),
    [rows],
  );
  const selected = ranked.find((r) => r.vendor.id === selectedId) ?? ranked[0] ?? null;

  const stats = useMemo(() => {
    const evaluated = rows.filter((r) => r.count > 0);
    return {
      total: rows.length,
      evaluated: evaluated.length,
      overallAvg: evaluated.length ? evaluated.reduce((s, r) => s + (r.avgOverall ?? 0), 0) / evaluated.length : null,
      continueCount: rows.filter((r) => r.latest?.recommendation?.includes("Tiếp tục")).length,
    };
  }, [rows]);

  const maxRanked = ranked[0]?.avgOverall ?? null;

  return (
    <div>
      <PageHeader
        title="Hiệu suất nhà thầu"
        description="Xếp hạng và so sánh chất lượng nhà thầu dựa trên các kỳ đánh giá"
        icon={BarChart3}
      />

      {q.isMock && <MockBanner />}

      {q.loading ? (
        <LoadingState />
      ) : q.error ? (
        <ErrorState message={q.error} onRetry={q.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Building2} title="Chưa có nhà thầu" description="Thêm nhà thầu và ghi nhận đánh giá để xem bảng xếp hạng." />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tổng nhà thầu" value={stats.total} icon={Building2} tone="brand" />
            <StatCard label="Đã có đánh giá" value={stats.evaluated} icon={ClipboardCheck} tone="info" />
            <StatCard label="Điểm TB toàn hệ" value={stats.overallAvg != null ? stats.overallAvg.toFixed(1) : "—"} icon={Star} tone="warning" />
            <StatCard label="Khuyến nghị tiếp tục" value={stats.continueCount} icon={ThumbsUp} tone="success" />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* Bảng xếp hạng */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-border bg-surface">
                <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                  <Award className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Bảng xếp hạng theo điểm trung bình</h2>
                </div>
                <ul className="divide-y divide-border">
                  {ranked.map((r, i) => {
                    const isSel = selected?.vendor.id === r.vendor.id;
                    const pct = r.avgOverall != null ? (r.avgOverall / 5) * 100 : 0;
                    return (
                      <li key={r.vendor.id}>
                        <button
                          onClick={() => setSelectedId(r.vendor.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/50",
                            isSel && "bg-surface-2/70",
                          )}
                        >
                          <span className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                            RANK_TONE[i] ?? "bg-surface-2 text-muted-foreground",
                          )}>
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{r.vendor.name}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                                <div className={cn("h-full rounded-full", r.avgOverall != null ? scoreTone(r.avgOverall) : "bg-muted-foreground/30")} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{r.count} lượt</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Star className={cn("size-4", r.avgOverall != null ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                            <span className="w-8 text-right text-sm font-bold tabular-nums text-foreground">
                              {r.avgOverall != null ? r.avgOverall.toFixed(1) : "—"}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Chi tiết nhà thầu chọn */}
            <div className="lg:col-span-2">
              {selected && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-foreground">{selected.vendor.name}</h3>
                        <p className="font-mono text-xs text-muted-foreground">{selected.vendor.vendorCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {selected.avgOverall != null ? selected.avgOverall.toFixed(1) : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">điểm TB</p>
                      </div>
                    </div>

                    {selected.criteria ? (
                      <div className="mt-4 space-y-3">
                        <CriteriaBar label="Chất lượng" score={selected.criteria.quality} />
                        <CriteriaBar label="Đúng hạn" score={selected.criteria.timeliness} />
                        <CriteriaBar label="Chi phí" score={selected.criteria.cost} />
                        <CriteriaBar label="An toàn" score={selected.criteria.safety} />
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">Nhà thầu chưa có đánh giá nào.</p>
                    )}

                    {selected.latest?.recommendation && (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Khuyến nghị gần nhất</p>
                        <ToneBadge tone={selected.latest.recommendation.includes("Tiếp tục") ? "success" : selected.latest.recommendation.includes("Chấm dứt") ? "danger" : "warning"}>
                          {selected.latest.recommendation}
                        </ToneBadge>
                      </div>
                    )}
                  </div>

                  {selected.evals.length > 0 && (
                    <div className="rounded-xl border border-border bg-surface p-5">
                      <h4 className="mb-3 text-sm font-semibold text-foreground">Lịch sử đánh giá</h4>
                      <div className="space-y-3">
                        {selected.evals.map((e) => (
                          <div key={e.id} className="border-l-2 border-border pl-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Star className="size-3.5 text-warning fill-warning" />
                                <span className="text-sm font-semibold text-foreground">{e.overallScore.toFixed(1)}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDate(e.evaluationDate)}</span>
                            </div>
                            {e.comments && <p className="mt-1 text-xs text-muted-foreground">“{e.comments}”</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {maxRanked == null && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Chưa có nhà thầu nào được đánh giá. Thêm đánh giá ở trang chi tiết nhà thầu để xếp hạng.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CriteriaBar({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", scoreTone(score))} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{score.toFixed(1)}</span>
    </div>
  );
}
