"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ScanLine, ArrowLeft, CheckCircle2, XCircle, Loader2, RefreshCw, FileCheck2, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { ocrJobs, type OcrJobResponse } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { mockOcrJobs } from "@/lib/mock/procurement";
import {
  PageHeader, MockBanner, LoadingState, ErrorState, Field, ToneBadge, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOC_LABEL: Record<string, string> = {
  INVOICE: "Hóa đơn", RECEIPT: "Biên nhận", CONTRACT: "Hợp đồng",
};
const OCR_STATUS: Record<string, { tone: Tone; label: string }> = {
  PENDING: { tone: "neutral", label: "Chờ xử lý" },
  QUEUED: { tone: "neutral", label: "Trong hàng đợi" },
  PROCESSING: { tone: "info", label: "Đang xử lý" },
  COMPLETED: { tone: "success", label: "Hoàn tất" },
  DONE: { tone: "success", label: "Hoàn tất" },
  REVIEWED: { tone: "brand", label: "Đã duyệt" },
  FAILED: { tone: "danger", label: "Lỗi" },
};

function fileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default function OCRResult() {
  const { id } = useParams();
  const jobId = String(id);
  const router = useRouter();

  const jobQ = useApi<OcrJobResponse>(
    () => ocrJobs.getById(jobId),
    {
      mock: () => mockOcrJobs.find((j) => j.id === jobId) ?? mockOcrJobs[0],
      deps: [jobId],
      enabled: !!id,
    },
  );

  const [reviewedBy, setReviewedBy] = useState("Kế toán");
  const [reviewing, setReviewing] = useState(false);

  const job = jobQ.data;

  // Tự động poll khi job còn đang trong hàng đợi / đang xử lý → cập nhật khi xong.
  useEffect(() => {
    const s = job?.status;
    const active = s === "QUEUED" || s === "PROCESSING" || s === "PENDING";
    if (!active) return;
    const t = setInterval(() => jobQ.refetch(), 2500);
    return () => clearInterval(t);
  }, [job?.status, jobQ.refetch]);

  async function markReviewed() {
    if (!job) return;
    setReviewing(true);
    const res = await ocrJobs.markReviewed(job.id, reviewedBy || "Kế toán");
    setReviewing(false);
    if (res.errorCode === 200) {
      toast.success("Đã đánh dấu chứng từ đã duyệt.");
      jobQ.refetch();
    } else {
      toast.error(res.errorMessage || "Cập nhật trạng thái thất bại.");
    }
  }

  const st = job ? (OCR_STATUS[job.status] ?? OCR_STATUS.PENDING) : OCR_STATUS.PENDING;
  const done = job?.status === "COMPLETED" || job?.status === "DONE" || job?.status === "REVIEWED";
  const failed = job?.status === "FAILED";
  const processing = !!job && !done && !failed;
  const confidencePct = job?.confidenceScore != null ? Math.round(job.confidenceScore * 100) : null;

  const heroTone = done
    ? "border-success/25 bg-success/10 text-success"
    : failed
      ? "border-danger/25 bg-danger/10 text-danger"
      : "border-info/25 bg-info/10 text-info";
  const heroMessage = done
    ? "AI đã bóc tách xong dữ liệu chứng từ. Bạn có thể tạo hóa đơn hoặc đánh dấu đã duyệt."
    : failed
      ? "Xử lý chứng từ thất bại. Vui lòng kiểm tra và tải lại tệp rõ nét hơn."
      : "Hệ thống đang nhận diện chứng từ. Trạng thái sẽ cập nhật khi hoàn tất.";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Link
          href="/procurement/ocr/new"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại số hóa chứng từ
        </Link>
      </div>

      <PageHeader
        title="Kết quả số hóa chứng từ"
        description="Dữ liệu do AI bóc tách từ chứng từ đã tải lên"
        icon={ScanLine}
      />

      {jobQ.isMock && <MockBanner />}

      {jobQ.loading ? (
        <LoadingState />
      ) : jobQ.error || !job ? (
        <ErrorState message={jobQ.error ?? "Không tìm thấy chứng từ."} onRetry={jobQ.refetch} />
      ) : (
        <div className="space-y-5">
          {/* Trạng thái xử lý */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl border", heroTone)}>
                {done ? (
                  <CheckCircle2 className="size-6" />
                ) : failed ? (
                  <XCircle className="size-6" />
                ) : (
                  <Loader2 className="size-6 animate-spin" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{st.label}</h2>
                  <ToneBadge tone={st.tone}>{DOC_LABEL[job.documentType] ?? job.documentType}</ToneBadge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{heroMessage}</p>
              </div>
              {confidencePct != null && (
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{confidencePct}%</p>
                  <p className="text-xs text-muted-foreground">Độ tin cậy</p>
                </div>
              )}
            </div>

            {confidencePct != null && (
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn("h-full rounded-full", confidencePct >= 90 ? "bg-success" : confidencePct >= 70 ? "bg-warning" : "bg-danger")}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            )}

            {failed && job.errorMessage && (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                {job.errorMessage}
              </div>
            )}
          </div>

          {/* Thông tin chứng từ */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Thông tin chứng từ</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Meta label="Loại chứng từ" value={DOC_LABEL[job.documentType] ?? job.documentType} />
              <Meta label="Tên tệp" value={job.fileName ?? "—"} />
              <Meta label="Kích thước" value={fileSize(job.fileSizeBytes)} />
              <Meta label="Người gửi" value={job.submittedBy ?? "—"} />
              <Meta label="Thời gian gửi" value={formatDateTime(job.submittedAt)} />
              <Meta label="Bắt đầu xử lý" value={formatDateTime(job.startedAt)} />
              <Meta label="Hoàn tất" value={formatDateTime(job.completedAt)} />
              {job.reviewedBy && <Meta label="Người duyệt" value={job.reviewedBy} />}
            </dl>
          </div>

          {/* Người duyệt + hành động */}
          {done && job.status === "COMPLETED" && (
            <div className="rounded-xl border border-border bg-surface p-6">
              <Field label="Người duyệt" hint="Tên người xác nhận dữ liệu OCR là chính xác.">
                <Input value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} placeholder="VD: Kế toán" />
              </Field>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {done && (
              <Button onClick={() => router.push(`/procurement/ocr/${job.id}/verify`)} className="flex-1">
                <FileCheck2 className="size-4" /> Tạo hóa đơn từ chứng từ
              </Button>
            )}
            {done && job.status === "COMPLETED" && (
              <Button variant="outline" onClick={markReviewed} disabled={reviewing} className="flex-1">
                {reviewing ? "Đang lưu…" : "Đánh dấu đã duyệt"}
              </Button>
            )}
            {failed && (
              <Button onClick={() => router.push("/procurement/ocr/new")} className="flex-1">
                <Upload className="size-4" /> Tải lại chứng từ
              </Button>
            )}
            {processing && (
              <Button variant="outline" onClick={jobQ.refetch} className="flex-1">
                <RefreshCw className="size-4" /> Kiểm tra lại trạng thái
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
