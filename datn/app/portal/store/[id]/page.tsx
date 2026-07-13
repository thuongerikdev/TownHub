"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  providers as providersApi,
  providerServiceListings as listingsApi,
  serviceRequests as srApi,
  type Provider,
  type ProviderServiceListing,
  type PriceListItem,
  formatPriceRange,
} from "@/lib/api";
import {
  Store, Phone, Mail, MapPin, Star, CheckCircle,
  Loader2, AlertCircle, X, Send, ChevronLeft,
  DollarSign, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Theme system (matches my-store) ──────────────────────────────────────────

type ThemeId = "amber" | "emerald" | "blue" | "purple" | "rose" | "indigo";

interface Theme {
  id: ThemeId; label: string;
  gradient: string; iconGrad: string;
  text: string; border: string;
  badge: string; btn: string; btnText: string; dot: string;
}

const THEMES: Record<ThemeId, Theme> = {
  amber:   { id: "amber",   label: "Hoàng Kim",  gradient: "from-amber-500/20 to-transparent",   iconGrad: "from-amber-400 to-amber-600",   text: "text-amber-400",   border: "border-amber-500/25",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",   btn: "bg-amber-500 hover:bg-amber-400",   btnText: "text-black",  dot: "bg-amber-400" },
  emerald: { id: "emerald", label: "Xanh Ngọc",  gradient: "from-emerald-500/20 to-transparent", iconGrad: "from-emerald-400 to-emerald-600", text: "text-emerald-400", border: "border-emerald-500/25", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", btn: "bg-emerald-500 hover:bg-emerald-400", btnText: "text-black",  dot: "bg-emerald-400" },
  blue:    { id: "blue",    label: "Xanh Dương", gradient: "from-blue-500/20 to-transparent",    iconGrad: "from-blue-400 to-blue-600",     text: "text-blue-400",    border: "border-blue-500/25",    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",       btn: "bg-blue-500 hover:bg-blue-400",     btnText: "text-white", dot: "bg-blue-400" },
  purple:  { id: "purple",  label: "Tím Mộng",   gradient: "from-purple-500/20 to-transparent",  iconGrad: "from-purple-400 to-purple-600",  text: "text-purple-400",  border: "border-purple-500/25",  badge: "bg-purple-500/15 text-purple-400 border-purple-500/25",   btn: "bg-purple-500 hover:bg-purple-400",  btnText: "text-white", dot: "bg-purple-400" },
  rose:    { id: "rose",    label: "Hồng Phấn",  gradient: "from-rose-500/20 to-transparent",    iconGrad: "from-rose-400 to-rose-600",     text: "text-rose-400",    border: "border-rose-500/25",    badge: "bg-rose-500/15 text-rose-400 border-rose-500/25",       btn: "bg-rose-500 hover:bg-rose-400",     btnText: "text-white", dot: "bg-rose-400" },
  indigo:  { id: "indigo",  label: "Chàm Ngân",  gradient: "from-indigo-500/20 to-transparent",  iconGrad: "from-indigo-400 to-indigo-600",  text: "text-indigo-400",  border: "border-indigo-500/25",  badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",   btn: "bg-indigo-500 hover:bg-indigo-400",  btnText: "text-white", dot: "bg-indigo-400" },
};

function getTheme(providerId: number): Theme {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(`ncc-theme-${providerId}`) as ThemeId | null;
    if (stored && THEMES[stored]) return THEMES[stored];
  }
  const ids = Object.keys(THEMES) as ThemeId[];
  return THEMES[ids[providerId % ids.length]];
}

// ─── Category config ───────────────────────────────────────────────────────────

const CAT_META: Record<string, { label: string; color: string }> = {
  electrical: { label: "Điện – Kỹ thuật",    color: "amber" },
  cleaning:   { label: "Vệ sinh – Làm sạch",  color: "emerald" },
  plumbing:   { label: "Cấp thoát nước",       color: "blue" },
  renovation: { label: "Sửa chữa & Cải tạo",  color: "purple" },
  camera:     { label: "Camera – An ninh",      color: "indigo" },
  other:      { label: "Dịch vụ khác",         color: "zinc" },
};

const CAT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/25" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/25" },
  blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/25" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/25" },
  indigo:  { bg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-indigo-500/25" },
  zinc:    { bg: "bg-zinc-500/15",    text: "text-zinc-400",    border: "border-zinc-500/25" },
};

function parsePriceList(json?: string): PriceListItem[] {
  if (!json) return [];
  try { return JSON.parse(json) as PriceListItem[]; }
  catch { return []; }
}

// ─── Listing card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing, theme, onRequest,
}: {
  listing: ProviderServiceListing;
  theme: Theme;
  onRequest: () => void;
}) {
  const cm = CAT_META[listing.category] ?? CAT_META.other;
  const cc = CAT_COLOR[cm.color] ?? CAT_COLOR.zinc;
  const prices = parsePriceList(listing.priceList);

  return (
    <div className={`bg-[#111] border ${theme.border} rounded-2xl p-4 flex flex-col gap-3`}>
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-white leading-snug">{listing.name}</p>
          <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
            {cm.label}
          </span>
        </div>
        {listing.description && (
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{listing.description}</p>
        )}
      </div>

      {prices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Bảng giá
          </p>
          <div className="space-y-1">
            {prices.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{p.name}</span>
                <span className={`font-semibold ${theme.text}`}>
                  {formatPriceRange(p)}
                  {p.unit && <span className="text-zinc-600 font-normal">/{p.unit}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(listing.contactPhone || listing.contactEmail) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
          {listing.contactPhone && (
            <a href={`tel:${listing.contactPhone}`} className={`flex items-center gap-1 hover:${theme.text} transition-colors`}>
              <Phone className="w-3 h-3" />{listing.contactPhone}
            </a>
          )}
          {listing.contactEmail && (
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{listing.contactEmail}</span>
          )}
        </div>
      )}

      {/* Request button */}
      <button
        onClick={onRequest}
        className={`mt-auto w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border transition-all active:scale-[0.98] ${theme.badge}`}
      >
        <Send className="w-3.5 h-3.5" />
        Gửi yêu cầu dịch vụ này
      </button>
    </div>
  );
}

// ─── Service request modal ─────────────────────────────────────────────────────

interface ReqModalProps {
  provider: Provider;
  theme: Theme;
  authUserId: number;
  initialTitle?: string;
  initialCategory?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CAT_ENTRIES = Object.entries(CAT_META);

function ReqModal({ provider, theme, authUserId, initialTitle = "", initialCategory = "other", onClose, onSuccess }: ReqModalProps) {
  const [form, setForm] = useState({ title: initialTitle, description: "", category: initialCategory, note: "", scheduledDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError("");
    const res = await srApi.create({
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      providerId: provider.id,
      requestedByAuthUserId: authUserId,
      requiresMgtApproval: false,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : undefined,
      note: form.note || undefined,
    });
    if (res.errorCode === 200) {
      onSuccess();
    } else {
      setError(res.errorMessage || "Có lỗi xảy ra, vui lòng thử lại.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-sm font-bold text-white">Gửi yêu cầu dịch vụ</h2>
            <p className={`text-[10px] mt-0.5 ${theme.text}`}>
              {initialTitle ? initialTitle : provider.companyName}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tiêu đề yêu cầu *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Sửa ổ điện phòng khách"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/40 appearance-none">
              {CAT_ENTRIES.map(([k, { label }]) => (
                <option key={k} value={k} className="bg-[#1a1a1a]">{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả chi tiết</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Mô tả vấn đề cần hỗ trợ..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Thời gian mong muốn thợ đến</label>
            <input type="datetime-local" value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/40 [color-scheme:dark]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ghi chú thêm</label>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="VD: Vui lòng liên hệ trước khi đến"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-colors disabled:opacity-50 ${theme.btn} ${theme.btnText}`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi yêu cầu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function StorePage() {
  const params = useParams();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const { user } = useAuth();

  const [provider, setProvider]   = useState<Provider | null>(null);
  const [listings, setListings]   = useState<ProviderServiceListing[]>([]);
  const [loading, setLoading]     = useState(true);
  const [theme, setTheme]         = useState<Theme>(THEMES.amber);
  const [reqTarget, setReqTarget] = useState<ProviderServiceListing | null>(null);
  const [reqSuccess, setReqSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      providersApi.getById(id),
      listingsApi.getAll({ providerId: id }),
    ]).then(([pRes, lRes]) => {
      if (pRes.errorCode === 200 && pRes.data) {
        setProvider(pRes.data);
        setTheme(getTheme(pRes.data.id));
      }
      if (lRes.errorCode === 200 && lRes.data) {
        setListings(lRes.data.filter((l) => l.status === "approved"));
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-zinc-600">
        <AlertCircle className="w-10 h-10 opacity-40" />
        <p className="text-sm">Không tìm thấy nhà cung cấp</p>
        <Link href="/portal" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
        </Link>
      </div>
    );
  }

  const cats = (() => { try { return JSON.parse(provider.serviceCategories ?? "[]") as string[]; } catch { return []; } })();

  return (
    <div className="space-y-5 pb-24">

      {/* Back */}
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Nhà cung cấp
      </Link>

      {/* ── Store header ───────────────────────────────────────────────── */}
      <div className={`relative bg-linear-to-br ${theme.gradient} border ${theme.border} rounded-2xl p-5 overflow-hidden`}>
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-linear-to-br ${theme.iconGrad} opacity-10 blur-3xl pointer-events-none`} />

        <div className="relative flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-linear-to-br ${theme.iconGrad} flex items-center justify-center shrink-0 shadow-xl`}>
            <Store className="w-7 h-7 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">{provider.companyName}</h1>
            <p className={`text-xs mt-0.5 ${theme.text}`}>Đại diện: {provider.contactName}</p>

            {/* Category badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {cats.map((c) => {
                const cm = CAT_META[c] ?? CAT_META.other;
                const cc = CAT_COLOR[cm.color] ?? CAT_COLOR.zinc;
                return (
                  <span key={c} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
                    {cm.label}
                  </span>
                );
              })}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-zinc-500">
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className={`flex items-center gap-1 hover:${theme.text} transition-colors`}>
                  <Phone className="w-3 h-3" />{provider.phone}
                </a>
              )}
              {provider.email && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{provider.email}</span>
              )}
              {provider.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{provider.address}</span>
              )}
            </div>

            {provider.rating != null && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">{provider.rating.toFixed(1)}</span>
                  <span className="text-xs text-zinc-500">/5</span>
                </div>
                {provider.completedJobs != null && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    {provider.completedJobs} việc hoàn thành
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Listings ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
          Dịch vụ ({listings.length})
        </p>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-white/5 rounded-2xl text-zinc-600 gap-2">
            <Store className="w-8 h-8 opacity-30" />
            <p className="text-xs">Chưa có dịch vụ nào được đăng ký</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                theme={theme}
                onRequest={() => { setReqTarget(l); setReqSuccess(false); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Request modal ─────────────────────────────────────────── */}
      {reqTarget && !reqSuccess && user && (
        <ReqModal
          provider={provider}
          theme={theme}
          authUserId={user.userID}
          initialTitle={reqTarget.name}
          initialCategory={reqTarget.category}
          onClose={() => setReqTarget(null)}
          onSuccess={() => { setReqSuccess(true); setReqTarget(null); }}
        />
      )}

      {/* Success banner */}
      {reqSuccess && (
        <div className="fixed bottom-20 inset-x-4 md:inset-x-auto md:right-6 md:left-auto md:w-80 z-40">
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl shadow-xl">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Đã gửi yêu cầu!</p>
              <p className="text-xs text-zinc-400 mt-0.5">Nhà cung cấp sẽ phản hồi sớm nhất có thể.</p>
            </div>
            <button onClick={() => setReqSuccess(false)} className="text-zinc-500 hover:text-white ml-auto shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
