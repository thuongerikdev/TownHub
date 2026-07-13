"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanLine, Upload, FileText, X, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ocrJobs, type OcrJobResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockOcrJobs } from "@/lib/mock/procurement";
import {
  PageHeader, MockBanner, LoadingState, EmptyState, ErrorState, Field, ToneBadge, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

const DOC_TYPES = [
  { value: "INVOICE", label: "Hóa đơn" },
  { value: "RECEIPT", label: "Biên nhận" },
  { value: "CONTRACT", label: "Hợp đồng" },
];
const DOC_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));
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

/**
 * Đọc tệp chứng từ → data URL để gửi kèm job OCR (hệ thống chưa có endpoint
 * upload file riêng — theo đúng pattern PhotoCapture). Ảnh sẽ được thu nhỏ
 * (≤1600px, JPEG q0.72) cho gọn; PDF/khác giữ nguyên data URL gốc.
 * Worker OCR chỉ cần fileUrl không rỗng (engine thật đọc base64, mock bỏ qua).
 */
async function fileToDataUrl(file: File, maxDim = 1600, quality = 0.72): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
  if (!file.type.startsWith("image/")) return raw; // PDF & loại khác: giữ nguyên
  try {
    const img = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = raw;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return raw; // fallback: ảnh gốc
  }
}

export default function OCRUpload() {
  const router = useRouter();
  const jobsQ = useApiList<OcrJobResponse>(() => ocrJobs.getAll(), { mock: mockOcrJobs });

  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("INVOICE");
  const [file, setFile] = useState<File | null>(null);
  const [submittedBy, setSubmittedBy] = useState("Kế toán");
  const [submitting, setSubmitting] = useState(false);

  const recent = useMemo(() =>
    [...jobsQ.items].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
  [jobsQ.items]);

  // Còn job đang chạy → poll danh sách để trạng thái tự cập nhật.
  const hasActive = recent.some((j) => j.status === "QUEUED" || j.status === "PROCESSING" || j.status === "PENDING");
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => jobsQ.refetch(), 3000);
    return () => clearInterval(t);
  }, [hasActive, jobsQ.refetch]);

  async function submit() {
    if (!file) { toast.error("Hãy chọn tệp chứng từ để xử lý."); return; }
    setSubmitting(true);
    try {
      const fileUrl = await fileToDataUrl(file);
      const res = await ocrJobs.submit({
        documentType: docType,
        fileUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
        submittedByName: submittedBy || undefined,
      });
      if (res.errorCode === 200 && res.data) {
        toast.success("Đã gửi chứng từ. Đang nhận diện…");
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
        // Sang màn kết quả của job vừa tạo để theo dõi tiến trình OCR (tự poll).
        router.push(`/procurement/ocr/${res.data}/result`);
      } else {
        toast.error(res.errorMessage || "Gửi xử lý OCR thất bại.");
      }
    } catch {
      toast.error("Không đọc được tệp chứng từ. Vui lòng thử tệp khác.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Số hóa chứng từ (AI OCR)"
        description="Tải hóa đơn, biên nhận, hợp đồng để hệ thống AI bóc tách dữ liệu tự động"
        icon={ScanLine}
      />

      {jobsQ.isMock && <MockBanner />}

      {/* Form tải chứng từ */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Field label="Loại chứng từ" required>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Người gửi">
            <Input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="VD: Kế toán" />
          </Field>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {!file ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center transition-colors hover:border-brand/50 hover:bg-surface-2/40"
          >
            <Upload className="size-10 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Nhấn để chọn tệp chứng từ</span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG · tối đa 10MB</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-4">
            <FileText className="size-8 shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{fileSize(file.size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <X className="size-4" />
            </Button>
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-info" />
          <span>AI sẽ bóc tách số hóa đơn, nhà cung cấp, danh mục và tổng tiền. Kết quả có thể đối chiếu, chỉnh sửa trước khi tạo hóa đơn.</span>
        </div>

        <Button onClick={submit} disabled={submitting || !file} className="mt-5 w-full">
          {submitting ? "Đang gửi…" : "Gửi xử lý OCR"}
        </Button>
      </div>

      {/* Chứng từ gần đây */}
      <div className="mt-6 rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Chứng từ đã xử lý gần đây</h2>
        </div>
        {jobsQ.loading ? (
          <div className="p-4"><LoadingState /></div>
        ) : jobsQ.error ? (
          <div className="p-4"><ErrorState message={jobsQ.error} onRetry={jobsQ.refetch} /></div>
        ) : recent.length === 0 ? (
          <div className="p-4"><EmptyState icon={ScanLine} title="Chưa có chứng từ" description="Tải lên chứng từ đầu tiên để bắt đầu." /></div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((j) => {
              const st = OCR_STATUS[j.status] ?? OCR_STATUS.PENDING;
              const done = j.status === "COMPLETED" || j.status === "DONE" || j.status === "REVIEWED";
              const row = (
                <div className="flex items-center gap-3 px-5 py-3">
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{j.fileName ?? "(không tên)"}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_LABEL[j.documentType] ?? j.documentType} · {fileSize(j.fileSizeBytes)} · {formatDateTime(j.submittedAt)}
                    </p>
                    {j.status === "FAILED" && j.errorMessage && (
                      <p className="mt-0.5 text-xs text-danger">{j.errorMessage}</p>
                    )}
                  </div>
                  {j.confidenceScore != null && (
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{Math.round(j.confidenceScore * 100)}%</span>
                  )}
                  <ToneBadge tone={st.tone}>{st.label}</ToneBadge>
                  {done && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </div>
              );
              return (
                <li key={j.id}>
                  {done
                    ? <Link href={`/procurement/ocr/${j.id}/result`} className="block transition-colors hover:bg-surface-2/40">{row}</Link>
                    : row}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
