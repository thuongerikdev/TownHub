"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  ArrowLeft, QrCode, CheckCircle2, MapPin, Clock, ChevronRight, Wrench,
  Camera, CameraOff, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, assetQrCodes, toWorkOrderUpdate,
  type WorkOrderResponse,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { mockWorkOrders } from "@/lib/mock/pm";
import { MockBanner, LoadingState, ErrorState, ToneBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

const SCAN_MAX_DIM = 720;
const SCAN_INTERVAL_MS = 180;

function stripQrPrefix(s: string): string {
  return s.replace(/^qr[-_]?/i, "").trim();
}

export default function CheckinScreen() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<WorkOrderResponse>(
    () => workOrders.getById(String(id)),
    { mock: () => mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0], deps: [id] },
  );
  const wo = q.data;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef(0);
  const busyRef = useRef(false);

  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkinTime, setCheckinTime] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const s = streamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamActive(false);
  }, []);

  /** Mã quét/nhập có đúng là tài sản của phiếu công việc không? */
  const codeMatchesAsset = useCallback(async (raw: string): Promise<boolean> => {
    if (!wo) return false;
    const code = raw.trim();
    if (!code) return false;
    const cand = stripQrPrefix(code).toLowerCase();
    const rawLower = code.toLowerCase();
    const target = (wo.assetCode ?? "").trim().toLowerCase();

    // 1) Khớp trực tiếp mã tài sản (kèm/không kèm tiền tố QR-) hoặc id.
    if (target && (cand === target || rawLower === target)) return true;
    if (wo.assetId && rawLower === wo.assetId.toLowerCase()) return true;

    // 2) Tra bảng AssetQrCode (mã QR tuỳ biến đã đăng ký) → so assetId.
    try {
      const res = await assetQrCodes.getByCode(code);
      if (res.errorCode === 200 && res.data?.assetId && res.data.assetId === wo.assetId) return true;
    } catch { /* bỏ qua */ }

    return false;
  }, [wo]);

  const doCheckin = useCallback(async () => {
    if (!wo) return;
    setSubmitting(true);
    const body = toWorkOrderUpdate(wo, {
      status: "IN_PROGRESS", actualStartAt: new Date().toISOString(),
    });
    const res = await workOrders.update(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      stopCamera();
      setCheckinTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
      setCheckedIn(true);
      toast.success("Đã check-in. Bắt đầu tính giờ làm việc.");
    } else {
      toast.error(res.errorMessage || "Check-in thất bại.");
    }
  }, [wo, stopCamera]);

  /** Xử lý 1 mã bắt được: đối chiếu tài sản → check-in / báo lệch. */
  const handleHit = useCallback(async (raw: string) => {
    if (busyRef.current || !wo) return;
    busyRef.current = true;
    setMismatch(null);
    const ok = await codeMatchesAsset(raw);
    if (ok) {
      await doCheckin(); // giữ busy để chặn quét tiếp
      return;
    }
    setMismatch(raw.trim());
    toast.error("Mã QR không khớp tài sản của phiếu công việc.");
    busyRef.current = false; // cho quét lại
  }, [wo, codeMatchesAsset, doCheckin]);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    if (busyRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const now = performance.now();
    if (now - lastScanRef.current < SCAN_INTERVAL_MS) return;
    lastScanRef.current = now;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.min(1, SCAN_MAX_DIM / Math.max(vw, vh));
    const w = Math.round(vw * scale), h = Math.round(vh * scale);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const found = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
    if (found?.data) void handleHit(found.data);
  }, [handleHit]);

  // Bật camera khi vào màn (chỉ khi chưa check-in).
  useEffect(() => {
    if (checkedIn) return;
    let cancelled = false;
    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamError("Trình duyệt không hỗ trợ camera. Hãy nhập mã tài sản thủ công.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play().catch(() => {}); }
        setCamActive(true);
        setCamError(null);
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        const name = (e as DOMException)?.name;
        setCamError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Bạn đã từ chối quyền camera. Cấp lại quyền, hoặc nhập mã tài sản thủ công."
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "Không tìm thấy camera trên thiết bị. Hãy nhập mã tài sản thủ công."
              : "Không mở được camera. Hãy nhập mã tài sản thủ công.",
        );
      }
    }
    void start();
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIn]);

  function submitManual() {
    if (!manualCode.trim()) { toast.error("Nhập mã tài sản."); return; }
    void handleHit(manualCode.trim());
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!wo) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy phiếu công việc."} onRetry={q.refetch} /></div>;

  if (checkedIn) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Đã check-in lúc {checkinTime}</h2>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {wo.assetName ?? "—"}{wo.assetCode ? ` · ${wo.assetCode}` : ""}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" /> Bắt đầu tính giờ làm việc
          </p>
          <Button className="mt-8 w-full" asChild>
            <Link href={`/pm/work-orders/${wo.id}/checklist`}>
              Mở checklist <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/pm/work-orders/${wo.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại phiếu công việc
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{wo.woCode}</span>
          <ToneBadge tone="info"><Wrench className="size-3" /> Check-in hiện trường</ToneBadge>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{wo.title ?? wo.woCode}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{wo.assetName ?? "—"}{wo.assetCode ? ` · ${wo.assetCode}` : ""} · Hạn {formatDate(wo.dueDate)}</p>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Quét mã QR tài sản</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Hướng camera vào mã QR dán trên thiết bị — hệ thống tự đối chiếu đúng tài sản rồi check-in.</p>
        </div>
        <div className="relative aspect-[4/3] w-full bg-black">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          {camActive && !camError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-52 max-w-[70%]">
                <span className="absolute left-0 top-0 size-8 rounded-tl-lg border-l-4 border-t-4 border-brand" />
                <span className="absolute right-0 top-0 size-8 rounded-tr-lg border-r-4 border-t-4 border-brand" />
                <span className="absolute bottom-0 left-0 size-8 rounded-bl-lg border-b-4 border-l-4 border-brand" />
                <span className="absolute bottom-0 right-0 size-8 rounded-br-lg border-b-4 border-r-4 border-brand" />
              </div>
            </div>
          )}
          {!camActive && !camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
              <Camera className="size-8 animate-pulse" /><span className="text-sm">Đang mở camera…</span>
            </div>
          )}
          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/90">
              <CameraOff className="size-8" /><span className="max-w-sm text-sm">{camError}</span>
            </div>
          )}
          {submitting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
              <Loader2 className="size-8 animate-spin" /><span className="text-sm">Đang check-in…</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {camActive
            ? <><span className="size-2 animate-pulse rounded-full bg-success" /> Đang quét — đưa mã QR vào khung ngắm</>
            : <><QrCode className="size-3.5" /> Dùng mã nhập tay bên dưới</>}
        </div>
      </div>

      {mismatch && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Mã <code className="font-mono">{mismatch}</code> không phải tài sản của phiếu này
            (<span className="font-medium">{wo.assetCode ?? wo.assetName}</span>). Hãy quét đúng thiết bị.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Hoặc nhập mã thủ công</h2>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Mã tài sản in trên nhãn thiết bị</p>
        <div className="flex gap-3">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={wo.assetCode ?? "AST-2025-0…"}
            className="font-mono"
            onKeyDown={(e) => { if (e.key === "Enter") submitManual(); }}
          />
          <Button onClick={submitManual} disabled={!manualCode.trim() || submitting}>Xác nhận</Button>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
