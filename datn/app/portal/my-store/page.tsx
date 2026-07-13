"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  providers as providersApi,
  providerServiceListings as listingsApi,
  serviceRequests as srApi,
  type Provider,
  type ProviderServiceListing,
  type PriceListItem,
  type ServiceRequest,
  type ServiceRequestStatus,
  formatPriceRange,
} from "@/lib/api";
import {
  Briefcase, Store, Plus, Pencil, Trash2, CheckCircle,
  XCircle, Clock, Loader2, AlertCircle, Send, X, DollarSign,
  Phone, Mail, MapPin, ExternalLink, Palette, Home, Building2,
  ChevronDown, ChevronUp, PlayCircle, Flag,
} from "lucide-react";

// ─── Theme ────────────────────────────────────────────────────────────────────

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
const THEME_LIST = Object.values(THEMES) as Theme[];

function getTheme(id: number): Theme {
  if (typeof window !== "undefined") {
    const s = localStorage.getItem(`ncc-theme-${id}`) as ThemeId | null;
    if (s && THEMES[s]) return THEMES[s];
  }
  return THEMES[(Object.keys(THEMES) as ThemeId[])[id % 6]];
}
function saveTheme(id: number, t: ThemeId) {
  if (typeof window !== "undefined") localStorage.setItem(`ncc-theme-${id}`, t);
}

// ─── Category helpers ─────────────────────────────────────────────────────────

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

const LISTING_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: "Chờ duyệt",     cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",   dot: "bg-yellow-400 animate-pulse" },
  approved: { label: "Đang hiển thị", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  rejected: { label: "Bị từ chối",    cls: "bg-red-500/15 text-red-400 border-red-500/20",            dot: "bg-red-500" },
};

const REQ_STATUS: Record<ServiceRequestStatus, { label: string; cls: string; dot: string }> = {
  pending_approval:     { label: "Chờ BQL duyệt",    cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",   dot: "bg-yellow-400 animate-pulse" },
  approved_by_mgt:      { label: "BQL đã duyệt",      cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",         dot: "bg-blue-400 animate-pulse" },
  rejected_by_mgt:      { label: "BQL từ chối",       cls: "bg-red-500/15 text-red-400 border-red-500/20",            dot: "bg-red-500" },
  pending_provider:     { label: "Chờ bạn xác nhận",  cls: "bg-orange-500/15 text-orange-400 border-orange-500/20",   dot: "bg-orange-400 animate-pulse" },
  accepted_by_provider: { label: "Đã nhận việc",      cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",         dot: "bg-blue-400 animate-pulse" },
  rejected_by_provider: { label: "Đã từ chối",        cls: "bg-red-500/15 text-red-400 border-red-500/20",            dot: "bg-red-500" },
  in_progress:          { label: "Đang thực hiện",    cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",      dot: "bg-amber-500 animate-pulse" },
  completed:            { label: "Hoàn thành",         cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
};

function parsePriceList(json?: string): PriceListItem[] {
  if (!json) return [];
  try { return JSON.parse(json) as PriceListItem[]; }
  catch { return []; }
}

function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Listing form modal ───────────────────────────────────────────────────────

interface ListingFormState {
  name: string; category: string; description: string;
  contactPhone: string; contactEmail: string; contactAddress: string;
  priceItems: { name: string; unit: string; priceFrom: string; priceTo: string }[];
}

interface ListingModalProps {
  mode: "add" | "edit";
  initial: ListingFormState;
  providerContact: { phone: string; email: string; address: string };
  saving: boolean;
  onSave: (f: ListingFormState) => void;
  onClose: () => void;
}

function ListingModal({ mode, initial, providerContact, saving, onSave, onClose }: ListingModalProps) {
  const [form, setForm] = useState<ListingFormState>(initial);
  const addRow = () => setForm((f) => ({ ...f, priceItems: [...f.priceItems, { name: "", unit: "lần", priceFrom: "", priceTo: "" }] }));
  const removeRow = (i: number) => setForm((f) => ({ ...f, priceItems: f.priceItems.filter((_, j) => j !== i) }));
  const updateRow = (i: number, k: "name" | "unit" | "priceFrom" | "priceTo", v: string) =>
    setForm((f) => ({ ...f, priceItems: f.priceItems.map((r, j) => j === i ? { ...r, [k]: v } : r) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-xl bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <h2 className="text-sm font-bold text-white">{mode === "add" ? "Thêm dịch vụ mới" : "Chỉnh sửa dịch vụ"}</h2>
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-0.5">
                Sửa → cần BQL duyệt lại
              </span>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên dịch vụ *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Sửa chữa điện dân dụng"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/40 appearance-none">
              {Object.entries(CAT_META).map(([k, { label }]) => (
                <option key={k} value={k} className="bg-[#1a1a1a]">{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="Mô tả ngắn về dịch vụ..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40 resize-none" />
          </div>

          {/* Contact fields with "use mine" shortcut */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-zinc-400">Thông tin liên hệ dịch vụ</p>
              <span className="text-[10px] text-zinc-600 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">từ hồ sơ NCC</span>
            </div>
            {(["contactPhone", "contactEmail", "contactAddress"] as const).map((field) => {
              const icon = field === "contactPhone" ? <Phone className="w-3 h-3" /> : field === "contactEmail" ? <Mail className="w-3 h-3" /> : <MapPin className="w-3 h-3" />;
              const placeholder = field === "contactPhone" ? providerContact.phone || "Số điện thoại" : field === "contactEmail" ? providerContact.email || "Email" : providerContact.address || "Địa chỉ";
              const profileVal = field === "contactPhone" ? providerContact.phone : field === "contactEmail" ? providerContact.email : providerContact.address;
              return (
                <div key={field}>
                  <label className="flex items-center gap-1 text-[10px] text-zinc-600 mb-1">{icon}
                    {field === "contactPhone" ? "Số điện thoại" : field === "contactEmail" ? "Email" : "Địa chỉ"}
                  </label>
                  <div className="relative">
                    <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      placeholder={placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40 pr-24" />
                    {profileVal && form[field] !== profileVal && (
                      <button type="button" onClick={() => setForm({ ...form, [field]: profileVal })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 bg-amber-500/10 rounded-lg transition-colors">
                        Dùng của tôi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Bảng giá
              </label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-lg bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors">
                <Plus className="w-3 h-3" /> Thêm mục
              </button>
            </div>
            {form.priceItems.length === 0 ? (
              <button type="button" onClick={addRow}
                className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-white/10 rounded-xl text-xs text-zinc-600 hover:border-white/20 hover:text-zinc-400 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Thêm mục giá đầu tiên
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_56px_84px_84px_28px] gap-2 px-1">
                  <p className="text-[10px] text-zinc-600">Tên mục</p>
                  <p className="text-[10px] text-zinc-600">Đơn vị</p>
                  <p className="text-[10px] text-zinc-600">Giá từ (đ)</p>
                  <p className="text-[10px] text-zinc-600">Giá đến (đ)</p>
                  <div />
                </div>
                {form.priceItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_56px_84px_84px_28px] gap-2 items-center">
                    <input value={item.name} onChange={(e) => updateRow(i, "name", e.target.value)} placeholder="Sửa ổ điện"
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
                    <input value={item.unit} onChange={(e) => updateRow(i, "unit", e.target.value)} placeholder="cái"
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
                    <input type="number" min={0} value={item.priceFrom} onChange={(e) => updateRow(i, "priceFrom", e.target.value)} placeholder="100000"
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
                    <input type="number" min={0} value={item.priceTo} onChange={(e) => updateRow(i, "priceTo", e.target.value)} placeholder="200000"
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/40" />
                    <button type="button" onClick={() => removeRow(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Hủy</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-bold rounded-xl transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {mode === "add" ? "Đăng ký dịch vụ" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Request card ─────────────────────────────────────────────────────────────

interface ReqCardProps {
  req: ServiceRequest;
  theme: Theme;
  onAccept: () => void;
  onReject: () => void;
  onUpdateStatus: (s: "in_progress" | "completed") => void;
}

function ReqCard({ req, theme, onAccept, onReject, onUpdateStatus }: ReqCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sm = REQ_STATUS[req.status];
  const cm = CAT_META[req.category ?? "other"] ?? CAT_META.other;
  const cc = CAT_COLOR[cm.color] ?? CAT_COLOR.zinc;
  const isFromResident = req.requestedBy === "resident" || !req.requestedBy;

  const displayName  = req.requesterName ?? req.requestedByName ?? (isFromResident ? "Cư dân" : "Ban quản lý");
  const displayPhone = req.requesterPhone;
  const rejectReason = req.providerRejectionReason ?? req.providerRejectReason;
  const mgtReason    = req.mgtRejectionReason ?? req.mgtRejectReason;

  return (
    <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">

        {/* Title + status + expand */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">{req.title}</p>
            <span className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>
              {cm.label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sm.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
              {sm.label}
            </span>
            <button onClick={() => setExpanded((v) => !v)} className="text-zinc-600 hover:text-white transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Requester info — always visible */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-white/3 border border-white/6 rounded-xl">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
            isFromResident ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"
          }`}>
            {isFromResident ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
              {isFromResident ? "Cư dân" : "Ban quản lý"}
              {(req.requesterApartmentCode ?? req.apartmentCode) && (
                <><span className="text-zinc-700">·</span>
                <span className="text-amber-400 font-medium">Căn {req.requesterApartmentCode ?? req.apartmentCode}</span></>
              )}
            </div>
          </div>
          {displayPhone && (
            <a href={`tel:${displayPhone}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg text-[10px] font-semibold transition-colors shrink-0">
              <Phone className="w-3 h-3" />
              {displayPhone}
            </a>
          )}
        </div>

        {req.scheduledDate && (
          <p className="flex items-center gap-1.5 text-[10px] text-amber-400/90 px-1">
            <Clock className="w-3 h-3" /> Hẹn thợ đến: {new Date(req.scheduledDate).toLocaleString("vi-VN")}
          </p>
        )}

        {/* Expandable detail */}
        {expanded && (
          <div className="space-y-2 text-xs text-zinc-400 pt-1">
            {req.description && (
              <p className="leading-relaxed bg-white/3 border border-white/6 rounded-lg px-3 py-2">{req.description}</p>
            )}
            {req.note && (
              <p className="flex items-start gap-1.5 text-zinc-500 italic px-1">
                <span className="text-zinc-600 shrink-0 mt-0.5">Ghi chú:</span> {req.note}
              </p>
            )}
            {rejectReason && (
              <p className="text-red-400/80 italic px-1">Lý do từ chối: {rejectReason}</p>
            )}
            {mgtReason && (
              <p className="text-orange-400/80 italic px-1">BQL từ chối: {mgtReason}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-zinc-600 px-1">
              <span>Tạo: {new Date(req.createdAt).toLocaleString("vi-VN")}</span>
              {req.acceptedAt && <span className="text-blue-400/70">Nhận: {new Date(req.acceptedAt).toLocaleString("vi-VN")}</span>}
              {req.completedAt && <span className="text-emerald-400/70">Xong: {new Date(req.completedAt).toLocaleString("vi-VN")}</span>}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {req.status === "pending_provider" && (
          <div className="flex gap-2 pt-1 border-t border-white/5">
            <button onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors">
              <CheckCircle className="w-3.5 h-3.5" /> Nhận việc
            </button>
            <button onClick={onReject}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">
              <XCircle className="w-3.5 h-3.5" /> Từ chối
            </button>
          </div>
        )}
        {req.status === "accepted_by_provider" && (
          <div className="pt-1 border-t border-white/5">
            <button onClick={() => onUpdateStatus("in_progress")}
              className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl border transition-colors ${theme.badge} hover:opacity-80`}>
              <PlayCircle className="w-3.5 h-3.5" /> Bắt đầu thực hiện
            </button>
          </div>
        )}
        {req.status === "in_progress" && (
          <div className="pt-1 border-t border-white/5">
            <button onClick={() => onUpdateStatus("completed")}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors">
              <Flag className="w-3.5 h-3.5" /> Đánh dấu hoàn thành
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "no-provider" | "pending" | "rejected" | "approved";
type Tab = "listings" | "requests";

export default function MyStorePage() {
  const { user } = useAuth();

  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [myProvider, setMyProvider] = useState<Provider | null>(null);
  const [theme, setTheme]           = useState<Theme>(THEMES.amber);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>("listings");
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  // Listings state
  const [listings, setListings]         = useState<ProviderServiceListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [addModal, setAddModal]         = useState(false);
  const [editModal, setEditModal]       = useState<ProviderServiceListing | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [savingListing, setSavingListing] = useState(false);

  // Requests state
  const [requests, setRequests]           = useState<ServiceRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [rejectModal, setRejectModal]     = useState<number | null>(null);
  const [rejectReason, setRejectReason]   = useState("");
  const [acceptModal, setAcceptModal]     = useState<ServiceRequest | null>(null);
  const [acceptDate, setAcceptDate]       = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  // Boot: single API call to get NCC profile
  useEffect(() => {
    if (!user) return;
    providersApi.myProfile(user.userID).then((res) => {
      if (res.errorCode === 200 && res.data) {
        const p = res.data;
        setMyProvider(p);
        setTheme(getTheme(p.id));
        setPageStatus(p.registrationStatus as PageStatus);
      } else {
        setPageStatus("no-provider");
      }
    });
  }, [user]);

  // Fetch listings
  const fetchListings = useCallback(async () => {
    if (!myProvider) return;
    setListingsLoading(true);
    const res = await listingsApi.getAll({ providerId: myProvider.id });
    if (res.errorCode === 200 && res.data) setListings(res.data);
    setListingsLoading(false);
  }, [myProvider]);

  // Fetch ALL requests for this provider
  const fetchRequests = useCallback(async () => {
    if (!myProvider) return;
    setRequestsLoading(true);
    const res = await srApi.getAll({ providerId: myProvider.id });
    if (res.errorCode === 200 && res.data) setRequests(res.data);
    setRequestsLoading(false);
  }, [myProvider]);

  useEffect(() => { fetchListings(); fetchRequests(); }, [fetchListings, fetchRequests]);

  // Contact shortcut
  const providerContact = {
    phone:   myProvider?.phone   ?? "",
    email:   myProvider?.email   ?? "",
    address: myProvider?.address ?? "",
  };

  const defaultAddForm = (): ListingFormState => ({
    name: "", category: "electrical", description: "",
    contactPhone: providerContact.phone, contactEmail: providerContact.email, contactAddress: providerContact.address,
    priceItems: [],
  });

  function listingToForm(l: ProviderServiceListing): ListingFormState {
    const prices = parsePriceList(l.priceList);
    return {
      name: l.name, category: l.category, description: l.description ?? "",
      contactPhone:   l.contactPhone   ?? providerContact.phone,
      contactEmail:   l.contactEmail   ?? providerContact.email,
      contactAddress: l.contactAddress ?? providerContact.address,
      priceItems: prices.map((p) => ({ name: p.name, unit: p.unit ?? "lần", priceFrom: String(p.priceFrom), priceTo: String(p.priceTo ?? "") })),
    };
  }

  // ── Listing actions ──────────────────────────────────────────────────────────

  async function handleAddListing(form: ListingFormState) {
    if (!myProvider) return;
    setSavingListing(true);
    const priceList = form.priceItems.filter((p) => p.name.trim())
      .map((p) => {
        const priceFrom = Number(p.priceFrom) || 0;
        const priceTo = Number(p.priceTo) || undefined;
        return { name: p.name, unit: p.unit, priceFrom, priceTo };
      });
    const res = await listingsApi.register({
      providerId: myProvider.id, name: form.name, category: form.category,
      description: form.description || undefined,
      contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined,
      contactAddress: form.contactAddress || undefined,
      priceList: priceList.length > 0 ? JSON.stringify(priceList) : undefined,
    });
    if (res.errorCode === 200) { showToast("Đã gửi dịch vụ, chờ BQL phê duyệt"); setAddModal(false); fetchListings(); }
    else showToast(res.errorMessage || "Lỗi đăng ký dịch vụ", false);
    setSavingListing(false);
  }

  async function handleEditListing(form: ListingFormState) {
    if (!editModal) return;
    setSavingListing(true);
    const priceList = form.priceItems.filter((p) => p.name.trim())
      .map((p) => {
        const priceFrom = Number(p.priceFrom) || 0;
        const priceTo = Number(p.priceTo) || undefined;
        return { name: p.name, unit: p.unit, priceFrom, priceTo };
      });
    const res = await listingsApi.update({
      id: editModal.id, name: form.name, category: form.category,
      description: form.description || undefined,
      contactPhone: form.contactPhone || undefined, contactEmail: form.contactEmail || undefined,
      contactAddress: form.contactAddress || undefined,
      priceList: priceList.length > 0 ? JSON.stringify(priceList) : undefined,
    });
    if (res.errorCode === 200) { showToast("Đã cập nhật, chờ BQL phê duyệt lại"); setEditModal(null); fetchListings(); }
    else showToast(res.errorMessage || "Lỗi cập nhật", false);
    setSavingListing(false);
  }

  async function handleDeleteListing(id: number) {
    const res = await listingsApi.delete(id);
    if (res.errorCode === 200) { showToast("Đã xóa dịch vụ", false); setListings((l) => l.filter((x) => x.id !== id)); }
    else showToast(res.errorMessage || "Lỗi xóa", false);
    setDeleteConfirm(null);
  }

  // ── Request actions ──────────────────────────────────────────────────────────

  async function handleAccept(id: number, scheduledDate?: string) {
    if (!myProvider) return;
    setActionLoading(id);
    const res = await srApi.acceptByProvider(id, myProvider.id, scheduledDate);
    if (res.errorCode === 200) {
      showToast("Đã nhận việc!");
      setRequests((r) => r.map((x) => x.id === id ? { ...x, status: "accepted_by_provider" as ServiceRequestStatus, scheduledDate: scheduledDate ?? x.scheduledDate } : x));
      setAcceptModal(null);
    } else showToast(res.errorMessage || "Lỗi xác nhận", false);
    setActionLoading(null);
  }

  async function handleReject(id: number) {
    setActionLoading(id);
    const res = await srApi.rejectByProvider(id, rejectReason.trim() || "Không thể thực hiện lúc này.");
    if (res.errorCode === 200) {
      showToast("Đã từ chối yêu cầu", false);
      setRequests((r) => r.map((x) => x.id === id
        ? { ...x, status: "rejected_by_provider" as ServiceRequestStatus, providerRejectReason: rejectReason }
        : x));
    } else showToast(res.errorMessage || "Lỗi từ chối", false);
    setRejectModal(null);
    setRejectReason("");
    setActionLoading(null);
  }

  async function handleUpdateStatus(id: number, status: "in_progress" | "completed") {
    setActionLoading(id);
    const res = await srApi.updateStatus(id, status);
    if (res.errorCode === 200) {
      const label = status === "in_progress" ? "Đang thực hiện" : "Đã hoàn thành!";
      showToast(label);
      setRequests((r) => r.map((x) => x.id === id ? { ...x, status: status as ServiceRequestStatus } : x));
    } else showToast(res.errorMessage || "Lỗi cập nhật", false);
    setActionLoading(null);
  }

  // ── Status screens ───────────────────────────────────────────────────────────

  if (pageStatus === "loading") return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  if (pageStatus === "no-provider") return (
    <div className="max-w-sm mx-auto text-center py-16 space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
        <Briefcase className="w-8 h-8 text-amber-400" />
      </div>
      <div>
        <h2 className="text-base font-bold text-white">Bạn chưa đăng ký Nhà cung cấp</h2>
        <p className="text-sm text-zinc-500 mt-1.5">Đăng ký để cung cấp dịch vụ trong khu đô thị và quản lý gian hàng của bạn.</p>
      </div>
      <Link href="/portal/provider-register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-xl transition-colors">
        <Plus className="w-4 h-4" /> Đăng ký ngay
      </Link>
    </div>
  );

  if (pageStatus === "pending") return (
    <div className="max-w-sm mx-auto text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto">
        <Clock className="w-8 h-8 text-yellow-400" />
      </div>
      <div>
        <h2 className="text-base font-bold text-white">Đơn đang chờ phê duyệt</h2>
        <p className="text-sm text-zinc-500 mt-1.5">Ban quản lý đang xem xét đơn của bạn. Vui lòng chờ thông báo.</p>
      </div>
      {myProvider && (
        <div className="text-left bg-[#111] border border-yellow-500/20 rounded-xl p-4 space-y-1.5 text-xs text-zinc-400">
          <p><span className="text-zinc-600">Tên:</span> <span className="text-white">{myProvider.companyName}</span></p>
          <p><span className="text-zinc-600">Nộp:</span> {new Date(myProvider.createdAt).toLocaleDateString("vi-VN")}</p>
        </div>
      )}
    </div>
  );

  if (pageStatus === "rejected") return (
    <div className="max-w-sm mx-auto text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-base font-bold text-white">Đơn đã bị từ chối</h2>
        {(myProvider?.rejectReason || myProvider?.rejectionReason) && (
          <p className="text-xs text-zinc-500 mt-1.5 italic">"{myProvider.rejectReason ?? myProvider.rejectionReason}"</p>
        )}
      </div>
      <Link href="/portal/provider-register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors">
        Nộp đơn lại
      </Link>
    </div>
  );

  if (!myProvider) return null;

  // ── Approved: full UI ────────────────────────────────────────────────────────

  const cats = (() => { try { return JSON.parse(myProvider.serviceCategories ?? "[]") as string[]; } catch { return [] as string[]; } })();
  const pendingReqCount = requests.filter((r) => r.status === "pending_provider").length;
  const activeReqCount  = requests.filter((r) => r.status === "accepted_by_provider" || r.status === "in_progress").length;

  // Group requests for display
  const pendingReqs   = requests.filter((r) => r.status === "pending_provider");
  const activeReqs    = requests.filter((r) => ["accepted_by_provider", "in_progress"].includes(r.status));
  const historyReqs   = requests.filter((r) => ["completed", "rejected_by_provider", "rejected_by_mgt"].includes(r.status));

  return (
    <div className="space-y-5 pb-4">

      {/* ── Store header ─────────────────────────────────────────────────── */}
      <div className={`relative bg-linear-to-br ${theme.gradient} border ${theme.border} rounded-2xl p-5 overflow-hidden`}>
        <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-linear-to-br ${theme.iconGrad} opacity-10 blur-2xl pointer-events-none`} />
        <div className="flex items-start justify-between gap-3 relative">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${theme.iconGrad} flex items-center justify-center shrink-0 shadow-lg`}>
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">{myProvider.companyName}</h1>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {cats.map((c) => { const cm = CAT_META[c] ?? CAT_META.other; const cc = CAT_COLOR[cm.color] ?? CAT_COLOR.zinc;
                  return <span key={c} className={`text-[10px] px-2 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>{cm.label}</span>;
                })}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-zinc-500">
                {myProvider.phone   && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{myProvider.phone}</span>}
                {myProvider.email   && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{myProvider.email}</span>}
                {myProvider.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{myProvider.address}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href={`/portal/store/${myProvider.id}`}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Xem gian
            </Link>
            <button onClick={() => setShowThemePicker((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${theme.badge}`}>
              <Palette className="w-3.5 h-3.5" /> Màu sắc
            </button>
          </div>
        </div>

        {showThemePicker && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] text-zinc-500 mb-2.5">Chọn màu chủ đề gian hàng</p>
            <div className="flex flex-wrap gap-2">
              {THEME_LIST.map((t) => (
                <button key={t.id} onClick={() => { setTheme(t); saveTheme(myProvider.id, t.id); setShowThemePicker(false); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    theme.id === t.id ? `${t.badge} ring-1 ring-white/20` : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20"
                  }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />{t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-white/8">
        <button onClick={() => setActiveTab("listings")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "listings" ? `${theme.text} border-current` : "text-zinc-500 border-transparent hover:text-white"
          }`}>
          <Store className="w-4 h-4" /> Dịch vụ
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === "listings" ? theme.badge : "bg-white/5 text-zinc-500 border border-white/10"
          } border`}>
            {listings.filter((l) => l.status === "approved").length}
          </span>
        </button>
        <button onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "requests" ? `${theme.text} border-current` : "text-zinc-500 border-transparent hover:text-white"
          }`}>
          <Send className="w-4 h-4" /> Yêu cầu
          {pendingReqCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
              {pendingReqCount} mới
            </span>
          )}
          {pendingReqCount === 0 && activeReqCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/10">
              {activeReqCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab: Dịch vụ ─────────────────────────────────────────────────── */}
      {activeTab === "listings" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Dịch vụ của tôi</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {listings.filter((l) => l.status === "approved").length} đang hiển thị ·{" "}
                {listings.filter((l) => l.status === "pending").length} chờ duyệt
              </p>
            </div>
            <button onClick={() => setAddModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border ${theme.badge} transition-colors`}>
              <Plus className="w-3.5 h-3.5" /> Thêm dịch vụ
            </button>
          </div>

          {listingsLoading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>}

          {!listingsLoading && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl text-zinc-600 gap-3">
              <Store className="w-8 h-8 opacity-30" />
              <p className="text-xs">Chưa có dịch vụ nào. Thêm để hiển thị trên gian hàng!</p>
              <button onClick={() => setAddModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 rounded-xl transition-colors">
                <Plus className="w-3.5 h-3.5" /> Thêm ngay
              </button>
            </div>
          )}

          {!listingsLoading && listings.map((listing) => {
            const sm = LISTING_STATUS[listing.status] ?? LISTING_STATUS.pending;
            const cm = CAT_META[listing.category] ?? CAT_META.other;
            const cc = CAT_COLOR[cm.color] ?? CAT_COLOR.zinc;
            const prices = parsePriceList(listing.priceList);
            const isDeleting = deleteConfirm === listing.id;
            return (
              <div key={listing.id} className="bg-[#111] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{listing.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cc.bg} ${cc.text} ${cc.border}`}>{cm.label}</span>
                    </div>
                    {listing.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{listing.description}</p>}
                    {prices.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {prices.slice(0, 2).map((p, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 text-zinc-400 rounded-full">
                            {p.name}: {formatPriceRange(p)}/{p.unit}
                          </span>
                        ))}
                        {prices.length > 2 && <span className="text-[10px] text-zinc-600">+{prices.length - 2}</span>}
                      </div>
                    )}
                    {listing.status === "rejected" && listing.rejectReason && (
                      <p className="mt-1 text-[10px] text-red-400/80 italic">Lý do: {listing.rejectReason}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sm.cls} shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{sm.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <button onClick={() => setEditModal(listing)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg transition-colors">
                    <Pencil className="w-3 h-3" /> Chỉnh sửa
                  </button>
                  {!isDeleting ? (
                    <button onClick={() => setDeleteConfirm(listing.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 rounded-lg transition-colors">
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Xóa dịch vụ này?</span>
                      <button onClick={() => handleDeleteListing(listing.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors">Xác nhận</button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-lg transition-colors">Hủy</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Yêu cầu ─────────────────────────────────────────────────── */}
      {activeTab === "requests" && (
        <div className="space-y-5">
          {requestsLoading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>}

          {!requestsLoading && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-2">
              <Send className="w-8 h-8 opacity-30" />
              <p className="text-sm">Chưa có yêu cầu dịch vụ nào</p>
            </div>
          )}

          {/* Pending */}
          {pendingReqs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                Chờ bạn xác nhận ({pendingReqs.length})
              </p>
              {pendingReqs.map((req) => (
                <ReqCard key={req.id} req={req} theme={theme}
                  onAccept={() => { setAcceptModal(req); setAcceptDate(toLocalInputValue(req.scheduledDate)); }}
                  onReject={() => { setRejectModal(req.id); setRejectReason(""); }}
                  onUpdateStatus={(s) => handleUpdateStatus(req.id, s)} />
              ))}
            </div>
          )}

          {/* Active */}
          {activeReqs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Đang thực hiện ({activeReqs.length})
              </p>
              {activeReqs.map((req) => (
                <ReqCard key={req.id} req={req} theme={theme}
                  onAccept={() => { setAcceptModal(req); setAcceptDate(toLocalInputValue(req.scheduledDate)); }}
                  onReject={() => { setRejectModal(req.id); setRejectReason(""); }}
                  onUpdateStatus={(s) => handleUpdateStatus(req.id, s)} />
              ))}
            </div>
          )}

          {/* History */}
          {historyReqs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Lịch sử ({historyReqs.length})</p>
              {historyReqs.map((req) => (
                <ReqCard key={req.id} req={req} theme={theme}
                  onAccept={() => {}} onReject={() => {}} onUpdateStatus={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Listing modals ────────────────────────────────────────────────── */}
      {addModal && (
        <ListingModal mode="add" initial={defaultAddForm()} providerContact={providerContact}
          saving={savingListing} onSave={handleAddListing} onClose={() => setAddModal(false)} />
      )}
      {editModal && (
        <ListingModal mode="edit" initial={listingToForm(editModal)} providerContact={providerContact}
          saving={savingListing} onSave={handleEditListing} onClose={() => setEditModal(null)} />
      )}

      {/* ── Reject reason modal ───────────────────────────────────────────── */}
      {rejectModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Từ chối yêu cầu</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Lý do sẽ được gửi đến cư dân</p>
              </div>
            </div>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              placeholder="VD: Lịch của chúng tôi đã kín trong tuần này..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-red-500/40 resize-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Hủy</button>
              <button onClick={() => handleReject(rejectModal)} disabled={actionLoading === rejectModal}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                {actionLoading === rejectModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accept (confirm appointment time) modal ─────────────────────────── */}
      {acceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setAcceptModal(null)}>
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Nhận việc</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Xác nhận thời gian thợ đến sửa chữa</p>
              </div>
            </div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Thời gian hẹn</label>
            <input type="datetime-local" value={acceptDate} onChange={(e) => setAcceptDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/40 mb-4 [color-scheme:dark]" />
            <div className="flex gap-2">
              <button onClick={() => setAcceptModal(null)}
                className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">Hủy</button>
              <button onClick={() => handleAccept(acceptModal.id, acceptDate ? new Date(acceptDate).toISOString() : undefined)}
                disabled={actionLoading === acceptModal.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-bold rounded-xl transition-colors">
                {actionLoading === acceptModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Xác nhận nhận việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-20 right-4 z-60 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-xl ${
          toast.ok ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-red-500/20 border-red-500/30 text-red-400"
        }`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
