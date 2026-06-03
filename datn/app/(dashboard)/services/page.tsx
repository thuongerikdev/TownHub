"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Store, Wrench, Utensils, Gamepad2, Dumbbell,
  Plus, Search, RefreshCw, Star, Phone, Clock,
  MapPin, X, Pencil, Trash2, Loader2, AlertCircle,
  CheckCircle, Layers,
} from "lucide-react";
import Link from "next/link";
import {
  services as servicesApi,
  serviceCategories as categoriesApi,
  ServiceItem,
  ServiceCategory,
} from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: React.ElementType; ring: string; bg: string; text: string; badge: string }> = {
  amber:   { icon: Wrench,   ring: "ring-amber-500/30",   bg: "bg-amber-500/15",   text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  orange:  { icon: Utensils, ring: "ring-orange-500/30",  bg: "bg-orange-500/15",  text: "text-orange-400",  badge: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  purple:  { icon: Gamepad2, ring: "ring-purple-500/30",  bg: "bg-purple-500/15",  text: "text-purple-400",  badge: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  emerald: { icon: Dumbbell, ring: "ring-emerald-500/30", bg: "bg-emerald-500/15", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:      { label: "Đang hoạt động", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  inactive:    { label: "Tạm ngưng",      cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  coming_soon: { label: "Sắp mở cửa",     cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
};

function Stars({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-xs text-zinc-600 italic">Chưa có đánh giá</span>;
  return (
    <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
      <Star className="w-3 h-3 fill-amber-400" />
      {value.toFixed(1)}
    </span>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

const DEFAULT_FORM: Omit<ServiceItem, "id" | "createdAt" | "categoryName"> = {
  name: "", categoryId: 1, description: "", contact: "",
  openHours: "", location: "", status: "active", tags: "", rating: undefined,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [items, setItems]         = useState<ServiceItem[]>([]);
  const [cats, setCats]           = useState<ServiceCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [modal, setModal]         = useState<"add" | "edit" | "delete" | null>(null);
  const [selected, setSelected]   = useState<ServiceItem | null>(null);
  const [form, setForm]           = useState({ ...DEFAULT_FORM });
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [sRes, cRes] = await Promise.all([
      servicesApi.getAll(activeCat ?? undefined),
      categoriesApi.getAll(),
    ]);
    if (sRes.errorCode !== 200) { setError(sRes.errorMessage); setLoading(false); return; }
    setItems(sRes.data ?? []);
    if (cRes.errorCode === 200) setCats(cRes.data ?? []);
    setLoading(false);
  }, [activeCat]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((s) =>
    [s.name, s.description, s.contact, s.location, s.tags].some(
      (f) => f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  function openAdd() {
    setForm({ ...DEFAULT_FORM, categoryId: activeCat ?? 1 });
    setModal("add");
  }

  function openEdit(item: ServiceItem) {
    setSelected(item);
    setForm({
      name: item.name, categoryId: item.categoryId, description: item.description ?? "",
      contact: item.contact ?? "", openHours: item.openHours ?? "",
      location: item.location ?? "", status: item.status,
      tags: item.tags ?? "", rating: item.rating ?? undefined,
    });
    setModal("edit");
  }

  function openDelete(item: ServiceItem) {
    setSelected(item);
    setModal("delete");
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = modal === "add"
      ? await servicesApi.create(form)
      : await servicesApi.update({ id: selected!.id, ...form });
    setSaving(false);
    if (res.errorCode !== 200) { showToast(res.errorMessage, false); return; }
    showToast(modal === "add" ? "Đã thêm dịch vụ" : "Đã cập nhật dịch vụ");
    setModal(null);
    load();
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    const res = await servicesApi.delete(selected.id);
    setSaving(false);
    if (res.errorCode !== 200) { showToast(res.errorMessage, false); return; }
    showToast("Đã xóa dịch vụ");
    setModal(null);
    load();
  }

  const catMeta = (colorKey: string) => CATEGORY_META[colorKey] ?? CATEGORY_META.amber;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.25)]">
            <Store className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Dịch vụ khu đô thị</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Quản lý các dịch vụ dành cho cư dân</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm dịch vụ
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveCat(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
            activeCat === null
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "text-zinc-400 border-white/5 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Tất cả
          {activeCat === null && (
            <span className="ml-1 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </button>
        {cats.map((cat) => {
          const meta = catMeta(cat.colorKey);
          const Icon = meta.icon;
          const count = items.filter((s) => s.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                activeCat === cat.id
                  ? `${meta.bg} ${meta.text} ${meta.ring} ring-1`
                  : "text-zinc-400 border-white/5 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.name}
              {activeCat === cat.id && (
                <span className={`ml-1 text-xs ${meta.bg} px-1.5 py-0.5 rounded-full`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-amber-500/50 focus-within:border-amber-500/50 transition-all max-w-md">
        <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, địa điểm, liên hệ..."
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-zinc-600"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <Store className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Không có dịch vụ nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cat = cats.find((c) => c.id === item.categoryId);
            const meta = catMeta(cat?.colorKey ?? "amber");
            const Icon = meta.icon;
            const statusMeta = STATUS_META[item.status] ?? STATUS_META.active;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-[#111] border border-white/5 rounded-xl p-4 hover:border-white/10 hover:bg-[#141414] transition-all cursor-pointer"
              >
                {/* Full-card link (behind action buttons) */}
                <Link href={`/services/${item.id}`} className="absolute inset-0 z-0 rounded-xl" />

                {/* Actions (above the link) */}
                <div className="absolute top-3 right-3 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.preventDefault(); openEdit(item); }}
                    className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); openDelete(item); }}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Icon + category */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${meta.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white leading-tight truncate pr-12">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {cat && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${meta.badge}`}>
                          {cat.name}
                        </span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Info rows */}
                <div className="space-y-1.5">
                  {item.contact && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Phone className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                      <span>{item.contact}</span>
                    </div>
                  )}
                  {item.openHours && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                      <span>{item.openHours}</span>
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <MapPin className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <Stars value={item.rating} />
                  {item.tags && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {item.tags.split(",").slice(0, 2).map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-zinc-500 rounded-full">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(modal === "add" || modal === "edit") && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-base font-semibold text-white">
                  {modal === "add" ? "Thêm dịch vụ mới" : "Chỉnh sửa dịch vụ"}
                </h2>
                <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên dịch vụ *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Phòng Gym FitZone"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                {/* Category + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Danh mục</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none"
                    >
                      {cats.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#1a1a1a]">{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none"
                    >
                      <option value="active" className="bg-[#1a1a1a]">Đang hoạt động</option>
                      <option value="inactive" className="bg-[#1a1a1a]">Tạm ngưng</option>
                      <option value="coming_soon" className="bg-[#1a1a1a]">Sắp mở cửa</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Mô tả ngắn về dịch vụ..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
                  />
                </div>

                {/* Contact + Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Liên hệ</label>
                    <input
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder="0901 234 567"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Giờ hoạt động</label>
                    <input
                      value={form.openHours}
                      onChange={(e) => setForm({ ...form, openHours: e.target.value })}
                      placeholder="7h – 22h"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Địa điểm</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="VD: Tầng 3, Tòa A"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tags (cách nhau bằng dấu phẩy)</label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="gym,sức khỏe,tập thể dục"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
                <button
                  onClick={() => setModal(null)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modal === "add" ? "Thêm dịch vụ" : "Lưu thay đổi"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {modal === "delete" && selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Xóa dịch vụ</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Bạn có chắc muốn xóa dịch vụ{" "}
                <span className="text-white font-semibold">"{selected.name}"</span>?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setModal(null)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xóa dịch vụ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border text-sm font-medium ${
              toast.ok
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/20 border-red-500/30 text-red-400"
            }`}
          >
            {toast.ok
              ? <CheckCircle className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
