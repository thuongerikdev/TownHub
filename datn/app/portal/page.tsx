"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { providers as providersApi, damageDetection, type Provider, type DamageDetectionResponse } from "@/lib/api";
import {
  Store, Search, X, Star, Phone, MapPin, ChevronRight,
  Loader2, Briefcase, Zap, Droplets, Wrench, Camera, Layers, Sparkles,
} from "lucide-react";

// ─── Category config ───────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  electrical: { label: "Điện – Kỹ thuật",    color: "amber",   icon: Zap },
  cleaning:   { label: "Vệ sinh – Làm sạch",  color: "emerald", icon: Store },
  plumbing:   { label: "Cấp thoát nước",       color: "blue",    icon: Droplets },
  renovation: { label: "Sửa chữa & Cải tạo",  color: "purple",  icon: Wrench },
  camera:     { label: "Camera – An ninh",      color: "indigo",  icon: Camera },
  other:      { label: "Dịch vụ khác",         color: "zinc",    icon: Layers },
};

const COLOR: Record<string, { bg: string; text: string; border: string }> = {
  amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/25" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25" },
  blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/25" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/25" },
  indigo:  { bg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-indigo-500/25" },
  zinc:    { bg: "bg-zinc-500/15",    text: "text-zinc-400",    border: "border-zinc-500/25" },
};

function parseCategories(json: string): string[] {
  try { return JSON.parse(json) as string[]; }
  catch { return []; }
}

function primaryMeta(p: Provider) {
  const cats = parseCategories(p.serviceCategories ?? "[]");
  return CAT_META[cats[0] ?? "other"] ?? CAT_META.other;
}

// Thu nhỏ ảnh phía client → data URL JPEG gọn nhẹ trước khi gửi cho AI nhận diện
// (theo đúng pattern PhotoCapture — hệ thống chưa có endpoint upload file riêng).
async function fileToDataUrl(file: File, maxDim = 1280, quality = 0.7): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
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
    return raw; // fallback: dùng ảnh gốc
  }
}

// ─── Provider card ─────────────────────────────────────────────────────────────

function ProviderCard({ p }: { p: Provider }) {
  const meta  = primaryMeta(p);
  const c     = COLOR[meta.color] ?? COLOR.zinc;
  const cats  = parseCategories(p.serviceCategories ?? "[]");
  const Icon  = meta.icon;

  return (
    <Link
      href={`/portal/store/${p.id}`}
      className="group flex flex-col gap-3 bg-[#111] border border-white/5 rounded-2xl p-4 hover:border-white/10 hover:bg-[#141414] active:scale-[0.99] transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{p.companyName}</p>
          <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border mt-0.5 ${c.bg} ${c.text} ${c.border}`}>
            {meta.label}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 text-zinc-600 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5`} />
      </div>

      {/* Categories */}
      {cats.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {cats.slice(1).map((cat) => {
            const cm = CAT_META[cat] ?? CAT_META.other;
            return (
              <span key={cat} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-zinc-500 rounded-full">
                {cm.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-auto pt-2 border-t border-white/5">
        {p.phone && (
          <span className="flex items-center gap-1 truncate">
            <Phone className="w-3 h-3 shrink-0" />{p.phone}
          </span>
        )}
        {p.rating != null && (
          <span className="flex items-center gap-1 ml-auto shrink-0 text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />{p.rating.toFixed(1)}
          </span>
        )}
        {p.address && !p.phone && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />{p.address}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const [list, setList]       = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<DamageDetectionResponse | null>(null);

  useEffect(() => {
    providersApi.getAll("approved").then((res) => {
      if (res.errorCode === 200 && res.data) setList(res.data);
      setLoading(false);
    });
  }, []);

  async function handleDamagePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAiChecking(true);
    setAiResult(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await damageDetection.detect(dataUrl);
      if (res.errorCode === 200 && res.data?.available && res.data.detections.length > 0) {
        setAiResult(res.data);
        if (res.data.suggestedCategory && CAT_META[res.data.suggestedCategory]) {
          setActiveCat(res.data.suggestedCategory);
        }
      }
    } catch {
      // Dịch vụ AI không khả dụng — bỏ qua, người dùng vẫn tìm kiếm/lọc thủ công được.
    } finally {
      setAiChecking(false);
    }
  }

  const filtered = list.filter((p) => {
    if (activeCat) {
      const cats = parseCategories(p.serviceCategories ?? "[]");
      if (!cats.includes(activeCat)) return false;
    }
    if (search.trim()) {
      return p.companyName.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Count providers per category
  const catCounts = Object.keys(CAT_META).reduce<Record<string, number>>((acc, key) => {
    acc[key] = list.filter((p) => parseCategories(p.serviceCategories ?? "[]").includes(key)).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-white">Nhà cung cấp dịch vụ</h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          {loading ? "Đang tải..." : `${list.length} nhà cung cấp đã được Ban quản lý phê duyệt`}
        </p>
      </div>

      {/* AI: chụp ảnh sự cố để gợi ý nhà cung cấp phù hợp */}
      <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleDamagePhoto} />
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          {aiChecking ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white">Chụp ảnh sự cố — AI gợi ý nhà cung cấp phù hợp</p>
          <p className="text-[11px] text-zinc-500 truncate">
            {aiChecking
              ? "Đang phân tích ảnh…"
              : aiResult?.available && aiResult.detections.length > 0
                ? `Gợi ý: ${aiResult.detections[0].labelVi} (${Math.round(aiResult.detections[0].confidence * 100)}%)`
                : "Ví dụ: nứt tường, hỏng điện, vỡ gạch..."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={aiChecking}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" /> Chụp / Chọn ảnh
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-amber-500/40 transition-all">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên nhà cung cấp..."
          className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category chips */}
      {!loading && list.length > 0 && (
        <div className="-mx-4 px-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCat(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCat === null
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "text-zinc-500 border-white/10 hover:text-zinc-300"
              }`}
            >
              Tất cả ({list.length})
            </button>
            {Object.entries(CAT_META).map(([key, { label, color }]) => {
              const count = catCounts[key] ?? 0;
              if (count === 0) return null;
              const c = COLOR[color] ?? COLOR.zinc;
              const active = activeCat === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCat(active ? null : key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active ? `${c.bg} ${c.text} ${c.border}` : "text-zinc-500 border-white/10 hover:text-zinc-300"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-600">
          <Briefcase className="w-10 h-10 opacity-30" />
          <p className="text-sm">
            {search || activeCat ? "Không tìm thấy nhà cung cấp phù hợp" : "Chưa có nhà cung cấp nào được duyệt"}
          </p>
          {(search || activeCat) && (
            <button
              onClick={() => { setSearch(""); setActiveCat(null); }}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
