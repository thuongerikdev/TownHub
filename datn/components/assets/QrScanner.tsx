"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import {
  ScanLine, ArrowLeft, Camera, CameraOff, Upload, Search, Loader2,
  AlertTriangle, CheckCircle2, QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { assetApi, assetQrCodes, type AssetResponse } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockAssets } from "@/lib/mock/asset";
import { PageHeader, MockBanner, Field } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Cỡ tối đa khung hình đưa vào jsQR (cân bằng tốc độ ↔ độ chính xác). */
const SCAN_MAX_DIM = 720;
/** Khoảng giữa 2 lần giải mã (ms) — tránh đốt CPU mỗi khung hình. */
const SCAN_INTERVAL_MS = 180;

/** Bỏ tiền tố "QR-" (không phân biệt hoa thường) để lấy mã tài sản gốc. */
function stripQrPrefix(s: string): string {
  return s.replace(/^qr[-_]?/i, "").trim();
}

type Resolved = { kind: "ok"; assetId: string } | { kind: "notfound"; code: string };

export default function QrScanner() {
  const router = useRouter();
  // Danh sách tài sản để đối khớp cục bộ (mã in trên tem là `QR-<assetCode>`,
  // bảng AssetQrCode có thể trống) → quét vẫn mở đúng hồ sơ.
  const assetsQ = useApiList<AssetResponse>(() => assetApi.getAll(), { mock: mockAssets });
  const assetsRef = useRef<AssetResponse[]>([]);
  useEffect(() => { assetsRef.current = assetsQ.items; }, [assetsQ.items]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef(0);
  const busyRef = useRef(false); // đang tra cứu/đang điều hướng → ngừng quét

  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /** Tra cứu mã đã quét/đã nhập → điều hướng tới hồ sơ tài sản. */
  const resolveCode = useCallback(async (raw: string): Promise<Resolved> => {
    const code = raw.trim();
    if (!code) return { kind: "notfound", code: raw };

    // 1) Hỏi backend theo bảng AssetQrCode (mã tuỳ biến đã đăng ký).
    try {
      const res = await assetQrCodes.getByCode(code);
      if (res.errorCode === 200 && res.data?.assetId) {
        return { kind: "ok", assetId: res.data.assetId };
      }
    } catch { /* bỏ qua — chuyển sang đối khớp cục bộ */ }

    // 2) Đối khớp cục bộ: theo mã tài sản (kèm/không kèm tiền tố QR-), id hoặc serial.
    const cand = stripQrPrefix(code).toLowerCase();
    const rawLower = code.toLowerCase();
    const list = assetsRef.current;
    const hit = list.find((a) => {
      const ac = (a.assetCode ?? "").trim().toLowerCase();
      const sn = (a.serialNumber ?? "").trim().toLowerCase();
      return ac === cand || ac === rawLower || a.id.toLowerCase() === rawLower || (!!sn && sn === cand);
    });
    if (hit) return { kind: "ok", assetId: hit.id };

    return { kind: "notfound", code };
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const s = streamRef.current;
    if (s) { s.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamActive(false);
  }, []);

  /** Xử lý 1 mã vừa bắt được (từ camera/ảnh/nhập tay). */
  const handleHit = useCallback(async (raw: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setResolving(true);
    setNotFound(null);
    const r = await resolveCode(raw);
    if (r.kind === "ok") {
      toast.success("Đã tìm thấy tài sản. Đang mở hồ sơ…");
      stopCamera();
      router.push(`/assets/${r.assetId}`);
      return; // giữ busy để chặn quét tiếp khi đang chuyển trang
    }
    setNotFound(r.code);
    setResolving(false);
    busyRef.current = false; // cho phép quét lại
  }, [resolveCode, router, stopCamera]);

  /** Vòng lặp đọc khung hình từ camera → jsQR. */
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    if (busyRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
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

  // Bật camera khi vào màn; dọn dẹp khi rời (an toàn với StrictMode dev).
  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamError("Trình duyệt không hỗ trợ truy cập camera. Hãy nhập mã hoặc tải ảnh QR.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => { /* iOS có thể chặn autoplay — bỏ qua */ });
        }
        setCamActive(true);
        setCamError(null);
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        const name = (e as DOMException)?.name;
        setCamError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Bạn đã từ chối quyền camera. Cấp lại quyền trong trình duyệt, hoặc nhập mã / tải ảnh QR."
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "Không tìm thấy camera trên thiết bị. Hãy nhập mã hoặc tải ảnh QR."
              : "Không mở được camera. Hãy nhập mã hoặc tải ảnh QR.",
        );
      }
    }
    void start();
    return () => { cancelled = true; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Giải mã QR từ ảnh tải lên (dự phòng khi không có camera). */
  async function decodeImageFile(file: File) {
    setResolving(true);
    setNotFound(null);
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("decode-failed"));
        im.src = url;
      });
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      URL.revokeObjectURL(url);
      if (!ctx) { setResolving(false); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      const found = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
      if (found?.data) {
        await handleHit(found.data);
      } else {
        toast.error("Không đọc được mã QR trong ảnh. Hãy thử ảnh rõ nét hơn.");
        setResolving(false);
      }
    } catch {
      toast.error("Không xử lý được ảnh. Vui lòng thử ảnh khác.");
      setResolving(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void decodeImageFile(f);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manual.trim()) { toast.error("Nhập mã QR hoặc mã tài sản."); return; }
    void handleHit(manual.trim());
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách tài sản
        </Link>
      </div>

      <PageHeader
        title="Quét mã QR tài sản"
        description="Hướng camera vào mã QR dán trên thiết bị để mở nhanh hồ sơ tài sản & bảo trì"
        icon={ScanLine}
      />

      {assetsQ.isMock && <MockBanner />}

      {/* Khung camera */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="relative aspect-[4/3] w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full object-cover"
          />
          {/* Khung ngắm */}
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

          {/* Trạng thái khởi động / lỗi / đang tra cứu */}
          {!camActive && !camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
              <Camera className="size-8 animate-pulse" />
              <span className="text-sm">Đang mở camera…</span>
            </div>
          )}
          {camError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white/90">
              <CameraOff className="size-8" />
              <span className="max-w-sm text-sm">{camError}</span>
            </div>
          )}
          {resolving && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
              <Loader2 className="size-8 animate-spin" />
              <span className="text-sm">Đang tra cứu tài sản…</span>
            </div>
          )}
        </div>

        {/* Thanh trạng thái dưới khung */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          {camActive ? (
            <><span className="size-2 animate-pulse rounded-full bg-success" /> Đang quét — đưa mã QR vào khung ngắm</>
          ) : (
            <><QrCode className="size-3.5" /> Dùng mã nhập tay hoặc ảnh QR ở bên dưới</>
          )}
        </div>
      </div>

      {/* Không tìm thấy */}
      {notFound && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Không tìm thấy tài sản cho mã <code className="font-mono">{notFound}</code>. Hãy kiểm tra lại mã,
            hoặc tiếp tục đưa mã khác vào khung ngắm.
          </span>
        </div>
      )}

      {/* Nhập tay + tải ảnh */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <form onSubmit={submitManual} className="rounded-xl border border-border bg-surface p-4">
          <Field label="Nhập mã thủ công" hint="Mã QR hoặc mã tài sản (VD: QR-AST-2025-0001).">
            <div className="flex gap-2">
              <Input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="QR-AST-2025-0001"
                className="font-mono"
              />
              <Button type="submit" disabled={resolving}>
                <Search className="size-4" /> Tra cứu
              </Button>
            </div>
          </Field>
        </form>

        <div className="rounded-xl border border-border bg-surface p-4">
          <Field label="Quét từ ảnh" hint="Tải ảnh có chứa mã QR nếu không dùng được camera.">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={resolving}>
              <Upload className="size-4" /> Chọn ảnh mã QR
            </Button>
          </Field>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-info" />
        <span>
          Mỗi tài sản có mã QR dạng <code className="font-mono">QR-&lt;mã tài sản&gt;</code> (in từ màn quản lý tài sản).
          Quét xong hệ thống mở thẳng hồ sơ để xem lịch sử & tạo phiếu bảo trì.
        </span>
      </div>

      {/* Canvas ẩn để lấy khung hình giải mã */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
