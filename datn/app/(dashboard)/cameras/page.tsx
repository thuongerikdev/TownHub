"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Camera, CameraOff,
  CheckCircle2, Loader2, Play, ScanFace, Square, UserCheck,
} from "lucide-react";
import { accessControl, type CameraRecognitionResponse } from "@/lib/api";
import { RequirePermission } from "@/components/shared";

const ANALYZE_INTERVAL_MS = 3000;
const FRAME_MAX_WIDTH = 720;

// Giám sát an ninh là nghiệp vụ của BQL. Bọc ngoài để người không có quyền
// không mount được màn này — tránh bật camera rồi mới báo 403.
export default function CamerasPage() {
  return (
    <RequirePermission perm="resident.access_review">
      <CamerasScreen />
    </RequirePermission>
  );
}

function CamerasScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzingRef = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [cameraName, setCameraName] = useState("Camera sảnh chính");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [cameraActive, setCameraActive] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<CameraRecognitionResponse | null>(null);
  const [scanCount, setScanCount] = useState(0);

  const stopMonitoring = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setMonitoring(false);
    analyzingRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    stopMonitoring();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, [stopMonitoring]);

  const loadDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    const cameras = all.filter((device) => device.kind === "videoinput");
    setDevices(cameras);
    if (!deviceId && cameras[0]?.deviceId) setDeviceId(cameras[0].deviceId);
  }, [deviceId]);

  const startCamera = useCallback(async () => {
    setError("");
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Trình duyệt không hỗ trợ mở camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      await loadDevices();
    } catch (reason) {
      const name = (reason as DOMException)?.name;
      setError(name === "NotAllowedError"
        ? "Bạn chưa cấp quyền camera cho trình duyệt."
        : "Không mở được camera đã chọn.");
    }
  }, [deviceId, loadDevices, stopCamera]);

  const analyze = useCallback(async () => {
    if (analyzingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;

    analyzingRef.current = true;
    setAnalyzing(true);
    try {
      const scale = Math.min(1, FRAME_MAX_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.72);
      const response = await accessControl.analyzeFrame({ imageDataUrl, cameraName, direction });
      if (response.errorCode !== 200) {
        setError(response.errorMessage || "Không xử lý được khung hình.");
        stopMonitoring();
        return;
      }
      setError("");
      setLastResult(response.data);
      setScanCount((count) => count + 1);
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }, [cameraName, direction, stopMonitoring]);

  function startMonitoring() {
    if (!cameraActive) return;
    setLastResult(null);
    setMonitoring(true);
    void analyze();
    timerRef.current = setInterval(() => void analyze(), ANALYZE_INTERVAL_MS);
  }

  useEffect(() => () => stopCamera(), [stopCamera]);

  return <div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand"><Camera /></div>
        <div><h1 className="text-2xl font-bold">Camera giám sát</h1><p className="mt-1 text-sm text-muted-foreground">Xem trực tiếp và nhận diện cư dân bằng AI theo thời gian thực.</p></div>
      </div>
      <Link href="/access-alerts" className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm"><AlertTriangle className="size-4 text-rose-500" /> Xem cảnh báo người lạ</Link>
    </header>

    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <section className="overflow-hidden rounded-2xl border border-border bg-black">
        <div className="relative aspect-video">
          <video ref={videoRef} muted playsInline className="size-full object-cover" />
          {!cameraActive && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500"><CameraOff className="size-14" /><span>Camera chưa được mở</span></div>}
          {monitoring && <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"><span className="size-2 animate-pulse rounded-full bg-white" /> AI ĐANG GIÁM SÁT</div>}
          {analyzing && <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white"><Loader2 className="size-3.5 animate-spin" /> Đang nhận diện</div>}
          <div className="pointer-events-none absolute inset-[15%] rounded-3xl border border-white/30">
            <span className="absolute -top-7 left-0 text-xs text-white/70">Đưa khuôn mặt vào vùng nhận diện</span>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </section>

      <aside className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Cấu hình camera</h2>
          <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Thiết bị camera</span><select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} disabled={cameraActive} className="h-10 w-full rounded-lg border border-border bg-background px-3"><option value="">Camera mặc định</option>{devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>
          <label className="block space-y-1.5 text-sm"><span className="text-muted-foreground">Tên/vị trí camera</span><input value={cameraName} onChange={(event) => setCameraName(event.target.value)} disabled={monitoring} className="h-10 w-full rounded-lg border border-border bg-background px-3" /></label>
          <div className="space-y-1.5 text-sm"><span className="text-muted-foreground">Hướng kiểm soát</span><div className="grid grid-cols-2 gap-2">
            <button onClick={() => setDirection("in")} disabled={monitoring} className={`flex items-center justify-center gap-2 rounded-lg border py-2 ${direction === "in" ? "border-brand bg-brand/10 text-brand" : "border-border"}`}><ArrowDownToLine className="size-4" /> Đi vào</button>
            <button onClick={() => setDirection("out")} disabled={monitoring} className={`flex items-center justify-center gap-2 rounded-lg border py-2 ${direction === "out" ? "border-brand bg-brand/10 text-brand" : "border-border"}`}><ArrowUpFromLine className="size-4" /> Đi ra</button>
          </div></div>
          {!cameraActive ? <button onClick={() => void startCamera()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 font-semibold text-brand-foreground"><Camera className="size-4" /> Mở camera</button> : <button onClick={stopCamera} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5"><CameraOff className="size-4" /> Đóng camera</button>}
          {cameraActive && (!monitoring ? <button onClick={startMonitoring} disabled={!cameraName.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-50"><Play className="size-4" /> Bắt đầu AI</button> : <button onClick={stopMonitoring} className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 font-semibold text-white"><Square className="size-4" /> Dừng AI</button>)}
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </div>

        <RecognitionCard result={lastResult} scanCount={scanCount} />
      </aside>
    </div>
  </div>;
}

function RecognitionCard({ result, scanCount }: { result: CameraRecognitionResponse | null; scanCount: number }) {
  if (!result) return <div className="rounded-2xl border border-border bg-surface p-5 text-center text-sm text-muted-foreground"><ScanFace className="mx-auto mb-3 size-9 opacity-50" />Kết quả nhận diện gần nhất sẽ hiển thị tại đây.<div className="mt-2 text-xs">Đã quét: {scanCount} khung hình</div></div>;
  const config = result.result === "resident"
    ? { icon: UserCheck, title: result.residentName ?? "Cư dân", tone: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500" }
    : result.result === "stranger"
      ? { icon: AlertTriangle, title: "Người lạ", tone: "border-rose-500/30 bg-rose-500/5 text-rose-500" }
      : { icon: CheckCircle2, title: "Không thấy khuôn mặt", tone: "border-border bg-surface text-muted-foreground" };
  const Icon = config.icon;
  return <div className={`rounded-2xl border p-5 ${config.tone}`}>
    <div className="flex items-center gap-3"><Icon className="size-8" /><div><div className="font-bold">{config.title}</div><div className="text-xs opacity-80">{result.message}</div></div></div>
    {result.confidence != null && <div className="mt-4 text-sm">Độ tin cậy: <b>{Math.round(result.confidence * 100)}%</b></div>}
    {result.result === "stranger" && result.eventCreated && <div className="mt-3 rounded-lg bg-rose-500/10 p-2 text-xs">Đã tạo thông báo tại trang Người lạ ra / vào.</div>}
  </div>;
}
