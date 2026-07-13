"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Wrench, Utensils, Gamepad2, Dumbbell,
  Star, Phone, Clock, MapPin, Tag, Pencil, Trash2,
  Loader2, AlertCircle, ChevronRight, Bookmark,
  CheckCircle, Store, Plus, X, DollarSign,
  ToggleLeft, ToggleRight, ListOrdered,
} from "lucide-react";
import {
  services as servicesApi,
  serviceCategories as categoriesApi,
  serviceMenuItems as menuApi,
  ServiceItem,
  ServiceCategory,
  ServiceMenuItem,
} from "@/lib/api";

// ─── Meta ─────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, {
  icon: React.ElementType;
  bg: string; text: string; badge: string;
  heroBg: string; heroGlow: string; heroBorder: string; heroAccent: string;
}> = {
  amber: {
    icon: Wrench,
    bg: "bg-amber-500/15", text: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    heroBg: "from-amber-950/60 via-[#0d0d0d] to-[#0d0d0d]",
    heroGlow: "bg-amber-500", heroBorder: "border-amber-500/15",
    heroAccent: "from-amber-500/20 to-transparent",
  },
  orange: {
    icon: Utensils,
    bg: "bg-orange-500/15", text: "text-orange-400",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    heroBg: "from-orange-950/60 via-[#0d0d0d] to-[#0d0d0d]",
    heroGlow: "bg-orange-500", heroBorder: "border-orange-500/15",
    heroAccent: "from-orange-500/20 to-transparent",
  },
  purple: {
    icon: Gamepad2,
    bg: "bg-purple-500/15", text: "text-purple-400",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    heroBg: "from-purple-950/60 via-[#0d0d0d] to-[#0d0d0d]",
    heroGlow: "bg-purple-500", heroBorder: "border-purple-500/15",
    heroAccent: "from-purple-500/20 to-transparent",
  },
  emerald: {
    icon: Dumbbell,
    bg: "bg-emerald-500/15", text: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    heroBg: "from-emerald-950/60 via-[#0d0d0d] to-[#0d0d0d]",
    heroGlow: "bg-emerald-500", heroBorder: "border-emerald-500/15",
    heroAccent: "from-emerald-500/20 to-transparent",
  },
};

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  active:      { label: "Đang hoạt động", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  inactive:    { label: "Tạm ngưng",      cls: "bg-red-500/15 text-red-400 border-red-500/20",             dot: "bg-red-500" },
  coming_soon: { label: "Sắp mở cửa",     cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",          dot: "bg-blue-400 animate-pulse" },
};

const fmt = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

// ─── Related card ─────────────────────────────────────────────────────────────

function RelatedCard({ item, cats }: { item: ServiceItem; cats: ServiceCategory[] }) {
  const cat = cats.find((c) => c.id === item.categoryId);
  const meta = CATEGORY_META[cat?.colorKey ?? "amber"];
  const Icon = meta.icon;
  return (
    <Link
      href={`/services/${item.id}`}
      className="flex items-center gap-3 p-3 bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 rounded-xl transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{item.name}</p>
        {item.rating && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-zinc-500">{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Menu item row ────────────────────────────────────────────────────────────

function MenuRow({
  item, accent,
  onEdit, onDelete, onToggle,
}: {
  item: ServiceMenuItem;
  accent: { text: string; bg: string };
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        item.isAvailable
          ? "bg-white/3 border-white/5 hover:border-white/10 hover:bg-white/5"
          : "bg-white/[0.01] border-white/5 opacity-50"
      }`}
    >
      {/* Dot indicator */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.isAvailable ? accent.text.replace("text-", "bg-") : "bg-zinc-600"}`} />

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${item.isAvailable ? "text-white" : "text-zinc-600"}`}>
          {item.name}
        </span>
        {item.description && (
          <p className="text-xs text-zinc-600 truncate mt-0.5">{item.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <span className={`text-sm font-bold ${item.isAvailable ? accent.text : "text-zinc-600"}`}>
          {fmt(item.price)}
        </span>
        {item.unit && (
          <p className="text-[10px] text-zinc-600">{item.unit}</p>
        )}
      </div>

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0">
        <button
          onClick={onToggle}
          title={item.isAvailable ? "Tắt" : "Bật"}
          className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
        >
          {item.isAvailable
            ? <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
            : <ToggleLeft className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 text-zinc-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Default form ─────────────────────────────────────────────────────────────

const DEFAULT_MENU_FORM = {
  name: "", description: "", price: 0, unit: "", category: "", isAvailable: true,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [item,    setItem]    = useState<ServiceItem | null>(null);
  const [cats,    setCats]    = useState<ServiceCategory[]>([]);
  const [related, setRelated] = useState<ServiceItem[]>([]);
  const [menu,    setMenu]    = useState<ServiceMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  // menu CRUD state
  const [menuModal,   setMenuModal]   = useState<"add" | "edit" | "delete" | null>(null);
  const [menuTarget,  setMenuTarget]  = useState<ServiceMenuItem | null>(null);
  const [menuForm,    setMenuForm]    = useState({ ...DEFAULT_MENU_FORM });
  const [menuSaving,  setMenuSaving]  = useState(false);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      const [sRes, cRes, allRes, mRes] = await Promise.all([
        servicesApi.getById(id),
        categoriesApi.getAll(),
        servicesApi.getAll(),
        menuApi.getByService(id),
      ]);
      if (sRes.errorCode !== 200 || !sRes.data) {
        setError(sRes.errorMessage || "Không tìm thấy dịch vụ");
        setLoading(false);
        return;
      }
      setItem(sRes.data);
      setCats(cRes.data ?? []);
      setRelated((allRes.data ?? []).filter((s) => s.categoryId === sRes.data.categoryId && s.id !== id).slice(0, 4));
      setMenu(mRes.data ?? []);
      setLoading(false);
    }
    fetchData();
  }, [id, refreshKey]);

  // ── Menu item CRUD ──────────────────────────────────────────────────────────

  function openAddMenu() {
    setMenuForm({ ...DEFAULT_MENU_FORM });
    setMenuTarget(null);
    setMenuModal("add");
  }

  function openEditMenu(m: ServiceMenuItem) {
    setMenuTarget(m);
    setMenuForm({
      name: m.name, description: m.description ?? "",
      price: m.price, unit: m.unit ?? "",
      category: m.category ?? "", isAvailable: m.isAvailable,
    });
    setMenuModal("edit");
  }

  function openDeleteMenu(m: ServiceMenuItem) {
    setMenuTarget(m);
    setMenuModal("delete");
  }

  async function handleMenuSave() {
    if (!menuForm.name.trim() || menuForm.price < 0) return;
    setMenuSaving(true);
    const res = menuModal === "add"
      ? await menuApi.create({ ...menuForm, serviceId: id })
      : await menuApi.update({ ...menuForm, id: menuTarget!.id, serviceId: id });
    setMenuSaving(false);
    if (res.errorCode !== 200) { showToast(res.errorMessage, false); return; }
    showToast(menuModal === "add" ? "Đã thêm mục dịch vụ" : "Đã cập nhật");
    setMenuModal(null);
    refresh();
  }

  async function handleMenuDelete() {
    if (!menuTarget) return;
    setMenuSaving(true);
    const res = await menuApi.delete(menuTarget.id);
    setMenuSaving(false);
    if (res.errorCode !== 200) { showToast(res.errorMessage, false); return; }
    showToast("Đã xóa mục dịch vụ");
    setMenuModal(null);
    refresh();
  }

  async function handleToggle(m: ServiceMenuItem) {
    await menuApi.update({ ...m, isAvailable: !m.isAvailable });
    setMenu((prev) => prev.map((x) => x.id === m.id ? { ...x, isAvailable: !x.isAvailable } : x));
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  // Group menu items by category
  const menuGroups = menu.reduce<Record<string, ServiceMenuItem[]>>((acc, m) => {
    const key = m.category?.trim() || "Khác";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});
  const menuGroupKeys = Object.keys(menuGroups);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-red-400 opacity-60" />
        <p className="text-zinc-400 text-sm">{error || "Không tìm thấy dịch vụ"}</p>
        <Link href="/services" className="text-amber-400 text-sm hover:underline">Quay lại danh sách</Link>
      </div>
    );
  }

  const cat        = cats.find((c) => c.id === item.categoryId);
  const meta       = CATEGORY_META[cat?.colorKey ?? "amber"];
  const Icon       = meta.icon;
  const statusMeta = STATUS_META[item.status] ?? STATUS_META.active;
  const tags       = item.tags ? item.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${meta.heroBg} border ${meta.heroBorder}`}
      >
        <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full ${meta.heroGlow} blur-3xl opacity-15 pointer-events-none`} />
        <div className={`absolute -bottom-12 -left-12 w-48 h-48 rounded-full ${meta.heroGlow} blur-2xl opacity-10 pointer-events-none`} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative flex items-center justify-between px-6 pt-5">
          <Link href="/services" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Dịch vụ khu đô thị
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors border ${
                saved ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "text-zinc-500 border-white/5 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bookmark className={`w-3 h-3 ${saved ? "fill-amber-400" : ""}`} />
              {saved ? "Đã lưu" : "Lưu"}
            </button>
          </div>
        </div>

        <div className="relative px-6 pb-8 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className={`w-20 h-20 rounded-2xl ${meta.bg} border ${meta.heroBorder} flex items-center justify-center flex-shrink-0 shadow-2xl`}>
              <Icon className={`w-10 h-10 ${meta.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {cat && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>{cat.name}</span>
                )}
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  {statusMeta.label}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-2">{item.name}</h1>
              {item.description && (
                <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">{item.description}</p>
              )}
              {item.rating && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} className={`w-4 h-4 ${n <= Math.round(item.rating!) ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`} />
                    ))}
                  </div>
                  <span className="text-amber-400 font-bold text-sm">{item.rating.toFixed(1)}</span>
                  <span className="text-zinc-600 text-xs">/ 5.0</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left — 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* About */}
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-zinc-500" />
              Giới thiệu
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {item.description || "Chưa có mô tả chi tiết cho dịch vụ này."}
            </p>
          </motion.section>

          {/* ── Bảng giá & Dịch vụ ──────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-zinc-500" />
                Bảng giá &amp; Dịch vụ
                {menu.length > 0 && (
                  <span className="text-xs font-normal px-1.5 py-0.5 bg-white/5 text-zinc-500 rounded-full">
                    {menu.length} mục
                  </span>
                )}
              </h2>
              <button
                onClick={openAddMenu}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${meta.bg} ${meta.text} border ${meta.heroBorder} hover:opacity-80`}
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm mục
              </button>
            </div>

            {menu.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
                <DollarSign className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Chưa có mục giá nào</p>
                <button onClick={openAddMenu} className="mt-3 text-xs text-zinc-500 hover:text-white underline transition-colors">
                  Thêm mục đầu tiên
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-5">
                {menuGroupKeys.map((groupName) => (
                  <div key={groupName}>
                    {/* Group label */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${meta.text}`}>
                        {groupName}
                      </span>
                      <span className="flex-1 h-px bg-white/5" />
                      <span className="text-[10px] text-zinc-600">
                        {menuGroups[groupName].length} mục
                      </span>
                    </div>
                    {/* Items */}
                    <div className="space-y-1.5">
                      {menuGroups[groupName].map((m) => (
                        <MenuRow
                          key={m.id}
                          item={m}
                          accent={{ text: meta.text, bg: meta.bg }}
                          onEdit={() => openEditMenu(m)}
                          onDelete={() => openDeleteMenu(m)}
                          onToggle={() => handleToggle(m)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Summary */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/3 rounded-xl border border-white/5 text-xs text-zinc-500">
                  <span>{menu.filter((m) => m.isAvailable).length} mục đang hoạt động</span>
                  <span className={`font-semibold ${meta.text}`}>
                    {fmt(Math.min(...menu.map((m) => m.price)))} – {fmt(Math.max(...menu.map((m) => m.price)))}
                  </span>
                </div>
              </div>
            )}
          </motion.section>

          {/* Info grid */}
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-zinc-500" />
              Thông tin dịch vụ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {item.contact && (
                <div className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">Liên hệ</p>
                    <p className="text-sm text-white font-medium">{item.contact}</p>
                  </div>
                </div>
              )}
              {item.openHours && (
                <div className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">Giờ mở cửa</p>
                    <p className="text-sm text-white font-medium">{item.openHours}</p>
                  </div>
                </div>
              )}
              {item.location && (
                <div className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">Địa điểm</p>
                    <p className="text-sm text-white font-medium">{item.location}</p>
                  </div>
                </div>
              )}
              {cat && (
                <div className="flex items-start gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${meta.text}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">Danh mục</p>
                    <p className={`text-sm font-medium ${meta.text}`}>{cat.name}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Tags */}
          {tags.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-[#111] border border-white/5 rounded-2xl p-6"
            >
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-zinc-500" />
                Từ khóa
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className={`px-3 py-1.5 text-xs font-medium rounded-full border ${meta.badge}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            </motion.section>
          )}

          {/* Related */}
          {related.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Dịch vụ tương tự</h2>
                <Link href="/services" className="text-xs text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {related.map((r) => <RelatedCard key={r.id} item={r} cats={cats} />)}
              </div>
            </motion.section>
          )}
        </div>

        {/* Right — 1/3 sticky */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}
            className="sticky top-6 space-y-3"
          >
            {/* Contact card */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className={`px-5 py-4 bg-gradient-to-r ${meta.heroAccent}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${meta.text}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{item.name}</p>
                    <span className={`text-[10px] ${meta.text}`}>{cat?.name}</span>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {item.contact && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-0.5">Điện thoại</p>
                      <p className="text-sm text-white font-semibold">{item.contact}</p>
                    </div>
                  </div>
                )}
                {item.openHours && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-0.5">Giờ hoạt động</p>
                      <p className="text-sm text-white font-medium">{item.openHours}</p>
                    </div>
                  </div>
                )}
                {item.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-600 mb-0.5">Địa điểm</p>
                      <p className="text-sm text-white font-medium">{item.location}</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${statusMeta.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  <span className="text-xs font-semibold">{statusMeta.label}</span>
                </div>

                {/* Price range summary */}
                {menu.length > 0 && (
                  <div className="px-3 py-2.5 rounded-xl border border-white/5 bg-white/3">
                    <p className="text-[10px] text-zinc-600 mb-1">Khoảng giá</p>
                    <p className={`text-sm font-bold ${meta.text}`}>
                      {fmt(Math.min(...menu.map((m) => m.price)))}
                      {" "}–{" "}
                      {fmt(Math.max(...menu.map((m) => m.price)))}
                    </p>
                  </div>
                )}

                {item.contact && item.status === "active" && (
                  <a
                    href={`tel:${item.contact.replace(/\s/g, "")}`}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 ${meta.bg} ${meta.text} border ${meta.heroBorder}`}
                  >
                    <Phone className="w-4 h-4" />
                    Gọi ngay
                  </a>
                )}
                {item.status === "coming_soon" && (
                  <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Clock className="w-4 h-4" />
                    Sắp ra mắt
                  </div>
                )}
              </div>
            </div>

            <Link href="/services" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm text-zinc-500 border border-white/5 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Xem tất cả dịch vụ
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── Menu Add/Edit Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {(menuModal === "add" || menuModal === "edit") && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setMenuModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-base font-semibold text-white">
                  {menuModal === "add" ? "Thêm mục dịch vụ" : "Chỉnh sửa mục"}
                </h2>
                <button onClick={() => setMenuModal(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên mục *</label>
                  <input
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    placeholder="VD: Vé tháng, Phở bò tái..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                {/* Price + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Giá (đ) *</label>
                    <input
                      type="number"
                      min={0}
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({ ...menuForm, price: Number(e.target.value) })}
                      placeholder="50000"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                    {menuForm.price > 0 && (
                      <p className={`text-[10px] mt-1 ${meta.text}`}>{fmt(menuForm.price)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Đơn vị</label>
                    <input
                      value={menuForm.unit}
                      onChange={(e) => setMenuForm({ ...menuForm, unit: e.target.value })}
                      placeholder="/người, /giờ, /ly..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nhóm</label>
                  <input
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    placeholder="VD: Vé tập, Cà phê, Sửa chữa..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                  {menuGroupKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {menuGroupKeys.filter((k) => k !== "Khác").map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setMenuForm({ ...menuForm, category: k })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            menuForm.category === k
                              ? `${meta.bg} ${meta.text} border-transparent`
                              : "border-white/10 text-zinc-500 hover:text-white"
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả ngắn</label>
                  <input
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    placeholder="VD: Tập tự do không giới hạn..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                {/* Available toggle */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-zinc-300">Đang cung cấp</span>
                  <button
                    onClick={() => setMenuForm({ ...menuForm, isAvailable: !menuForm.isAvailable })}
                    className="transition-colors"
                  >
                    {menuForm.isAvailable
                      ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                      : <ToggleLeft className="w-6 h-6 text-zinc-600" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
                <button onClick={() => setMenuModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleMenuSave}
                  disabled={menuSaving || !menuForm.name.trim()}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${meta.bg} ${meta.text} border ${meta.heroBorder} hover:opacity-80`}
                >
                  {menuSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {menuModal === "add" ? "Thêm mục" : "Lưu thay đổi"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Menu Delete Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {menuModal === "delete" && menuTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setMenuModal(null)}
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
                  <h2 className="text-base font-semibold text-white">Xóa mục dịch vụ</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 mb-5">
                Xóa <span className="text-white font-semibold">&ldquo;{menuTarget.name}&rdquo;</span>{" "}
                (<span className={meta.text}>{fmt(menuTarget.price)}</span>)?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setMenuModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  Hủy
                </button>
                <button
                  onClick={handleMenuDelete}
                  disabled={menuSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {menuSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xóa mục
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────────────── */}
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
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
