"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { accessControl, type AccessEventResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RequirePermission } from "@/components/shared";

// Nhật ký người lạ ra/vào là nghiệp vụ an ninh của BQL, không thuộc khối kỹ thuật.
export default function AccessAlertsPage() {
  return (
    <RequirePermission perm="resident.access_review">
      <AccessAlertsScreen />
    </RequirePermission>
  );
}

function AccessAlertsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<AccessEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [direction, setDirection] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const refreshingRef = useRef(false);

  const load = useCallback(async (showLoading = true) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (showLoading) setLoading(true);
    try {
      const response = await accessControl.getEvents({ personType: "stranger", status, direction });
      if (response.errorCode === 200) setItems(response.data ?? []);
    } finally {
      if (showLoading) setLoading(false);
      refreshingRef.current = false;
    }
  }, [status, direction]);

  useEffect(() => { void load(true); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => void load(false), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filtered = useMemo(() => items.filter((item) =>
    !query || item.cameraName.toLowerCase().includes(query.toLowerCase()) || item.note?.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  async function resolve(item: AccessEventResponse) {
    const note = prompt("Ghi chú xử lý (không bắt buộc):", item.note ?? "") ?? undefined;
    const response = await accessControl.handleEvent(item.id, { status: "resolved", note, handledByAuthUserId: user?.userID });
    if (response.errorCode !== 200) return alert(response.errorMessage);
    await load(false);
  }

  async function deleteEvent(item: AccessEventResponse) {
    if (!window.confirm("Xóa cảnh báo đã xử lý này? Dữ liệu sau khi xóa không thể khôi phục.")) return;

    setDeletingId(item.id);
    try {
      const response = await accessControl.deleteEvent(item.id);
      if (response.errorCode !== 200) return alert(response.errorMessage);
      setItems((current) => current.filter((event) => event.id !== item.id));
    } finally {
      setDeletingId(null);
    }
  }

  const unresolved = items.filter((item) => item.status !== "resolved").length;

  return <div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-col gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-4"><div className="flex size-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500"><AlertTriangle /></div><div><h1 className="text-2xl font-bold">Người lạ ra / vào</h1><p className="mt-1 text-sm text-muted-foreground">Cảnh báo từ camera AI và lịch sử xử lý của ban quản lý.</p></div></div>
      <div className="flex items-center gap-3"><div className="rounded-lg border border-rose-500/20 bg-background px-4 py-2 text-sm"><b className="text-rose-500">{unresolved}</b> chưa xử lý</div><button onClick={() => void load(true)} className="rounded-lg border border-border p-2.5"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button></div>
    </header>

    <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-[1fr_180px_180px]">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm camera, ghi chú..." className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm" /></div>
      <select value={direction} onChange={(e) => setDirection(e.target.value)} className="rounded-lg border border-border bg-background px-3 text-sm"><option value="">Tất cả hướng</option><option value="in">Đi vào</option><option value="out">Đi ra</option></select>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 text-sm"><option value="">Tất cả trạng thái</option><option value="new">Mới</option><option value="reviewing">Đang xem xét</option><option value="resolved">Đã xử lý</option></select>
    </div>

    {loading ? <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin" /></div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">Chưa có cảnh báo người lạ phù hợp.</div> : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative aspect-video bg-surface-2">{item.snapshotUrl ? <img src={item.snapshotUrl} alt="Ảnh camera" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><AlertTriangle className="size-10" /></div>}<span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">AI {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : "không xác định"}</span></div>
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between"><div><div className="font-semibold">{item.cameraName}</div><div className="text-xs text-muted-foreground">{new Date(item.detectedAt).toLocaleString("vi-VN")}</div></div><span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${item.direction === "in" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"}`}>{item.direction === "in" ? <ArrowDownToLine className="size-3.5" /> : <ArrowUpFromLine className="size-3.5" />}{item.direction === "in" ? "Đi vào" : "Đi ra"}</span></div>
          {item.note && <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted-foreground">{item.note}</p>}
          {item.status === "resolved" ? <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm text-emerald-500"><CheckCircle2 className="size-4" /> Đã xử lý</div><button onClick={() => void deleteEvent(item)} disabled={deletingId === item.id} className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50">{deletingId === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Xóa</button></div> : <button onClick={() => void resolve(item)} className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-brand-foreground">Xác nhận đã xử lý</button>}
        </div>
      </article>)}</div>
    )}
  </div>;
}
