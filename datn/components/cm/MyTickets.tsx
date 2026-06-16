"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Star, CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  tickets,
  type TicketResponse, type TicketStatusHistoryResponse,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockTickets } from "@/lib/mock/cm";
import {
  MockBanner, LoadingState, ErrorState, StatusBadge, PriorityBadge, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

const TICKET_STATUS: Record<string, StatusDef> = {
  OPEN: { label: "Mới", tone: "info" },
  ASSIGNED: { label: "Đã phân công", tone: "brand" },
  IN_PROGRESS: { label: "Đang xử lý", tone: "warning" },
  PENDING_MATERIAL: { label: "Chờ vật tư", tone: "neutral" },
  RESOLVED: { label: "Đã xử lý", tone: "success" },
  CLOSED: { label: "Đã đóng", tone: "neutral" },
};

// Các bước hiển thị cho cư dân (PENDING_MATERIAL gộp vào bước "Đang xử lý").
const STEPS = [
  { key: "OPEN", label: "Đã gửi" },
  { key: "ASSIGNED", label: "Đã phân công" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "RESOLVED", label: "Đã xử lý" },
  { key: "CLOSED", label: "Đóng" },
];
function stepIndex(status: string): number {
  if (status === "PENDING_MATERIAL") return 2;
  const i = STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

const RATING_LABEL: Record<number, string> = {
  1: "Không hài lòng", 2: "Chưa hài lòng", 3: "Bình thường", 4: "Hài lòng", 5: "Rất hài lòng",
};

export default function MyTickets() {
  const { id } = useParams<{ id: string }>();

  const q = useApi<TicketResponse>(
    () => tickets.getById(String(id)),
    { mock: () => mockTickets.find((t) => t.id === id) ?? mockTickets[0], deps: [id] },
  );
  const t = q.data;

  const histQ = useApiList<TicketStatusHistoryResponse>(
    () => tickets.getStatusHistory(String(id)),
    { deps: [id], enabled: !!t },
  );

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Timeline: ưu tiên lịch sử thật, nếu rỗng thì suy ra từ mốc thời gian của ticket.
  const timeline = useMemo(() => {
    if (histQ.items.length > 0) {
      return [...histQ.items]
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
        .map((h) => ({
          at: h.changedAt,
          label: TICKET_STATUS[h.toStatus]?.label ?? h.toStatus,
          note: h.note,
        }));
    }
    if (!t) return [];
    const rows: { at: string; label: string; note?: string }[] = [
      { at: t.createdAt, label: "Đã báo sự cố", note: t.title },
    ];
    if (t.resolvedAt) rows.push({ at: t.resolvedAt, label: "Đã xử lý", note: t.resolutionNote });
    if (t.closedAt) rows.push({ at: t.closedAt, label: "Đã đóng" });
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [histQ.items, t]);

  async function submitRating() {
    if (!t) return;
    if (rating === 0) { toast.error("Hãy chọn số sao đánh giá."); return; }
    setSubmitting(true);
    const res = await tickets.rate({ ticketId: t.id, overallRating: rating });
    setSubmitting(false);
    if (res.errorCode === 200) {
      setSubmitted(true);
      toast.success("Cảm ơn bạn đã đánh giá!");
    } else {
      toast.error(res.errorMessage || "Gửi đánh giá thất bại.");
    }
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!t) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy sự cố."} onRetry={q.refetch} /></div>;

  const current = stepIndex(t.status);
  const canRate = t.status === "RESOLVED" || t.status === "CLOSED";

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/my-tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Sự cố của tôi
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono text-sm text-muted-foreground">{t.ticketCode}</span>
          <h1 className="mt-1 text-xl font-bold text-foreground">{t.title ?? t.ticketCode}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Báo lúc {formatDateTime(t.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={t.status} map={TICKET_STATUS} />
          <PriorityBadge value={t.priority} />
        </div>
      </div>

      {/* Stepper trạng thái */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-5 text-sm font-semibold text-foreground">Trạng thái xử lý</h2>
        <div className="relative flex items-start justify-between">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-border" />
          <div
            className="absolute left-0 top-4 h-0.5 bg-brand transition-all"
            style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, i) => {
            const done = i < current;
            const here = i === current;
            return (
              <div key={s.key} className="relative z-[1] flex flex-1 flex-col items-center text-center">
                <div
                  className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    done ? "border-brand bg-brand text-white"
                      : here ? "border-brand bg-brand text-white ring-4 ring-brand/20"
                      : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <p className={`mt-2 text-xs font-medium ${i <= current ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                {here && <p className="text-[11px] font-semibold text-brand">Đang ở đây</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dòng thời gian cập nhật */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Cập nhật xử lý</h2>
        {histQ.loading ? (
          <LoadingState />
        ) : timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có cập nhật.</p>
        ) : (
          <ol className="space-y-4">
            {timeline.map((row, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${i === 0 ? "bg-brand/15 text-brand" : "bg-surface-2 text-muted-foreground"}`}>
                    <MessageSquare className="size-3.5" />
                  </span>
                  {i < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-medium text-foreground">{row.label}</p>
                  {row.note && <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(row.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Đánh giá */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Đánh giá chất lượng xử lý</h2>
        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto size-8 text-success" />
            <p className="mt-2 font-semibold text-success">Cảm ơn bạn đã đánh giá!</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`size-6 ${s <= rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
              ))}
            </div>
          </div>
        ) : !canRate ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" /> Bạn có thể đánh giá sau khi sự cố được xử lý xong.
          </p>
        ) : (
          <>
            <p className="mb-3 mt-1 text-sm text-muted-foreground">Bạn có hài lòng với kết quả xử lý?</p>
            <div className="mb-4 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" className="p-1"
                  onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(s)}
                >
                  <Star className={`size-8 transition-colors ${s <= (hovered || rating) ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                </button>
              ))}
              {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{RATING_LABEL[rating]}</span>}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Nhận xét (tuỳ chọn)…" className="mb-3" />
            <Button onClick={submitRating} disabled={submitting} className="w-full">
              {submitting ? "Đang gửi…" : "Gửi đánh giá"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
