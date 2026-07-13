"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { providers as providersApi, apartments as apartmentsApi, type ApartmentResponse } from "@/lib/api";
import {
  Briefcase, CheckCircle, AlertCircle, Loader2,
  Send, Phone, Mail, MapPin, Building2, User,
  Search, X, ChevronDown,
} from "lucide-react";

// ─── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "electrical", label: "Điện – Kỹ thuật",      color: "amber" },
  { key: "cleaning",   label: "Vệ sinh – Làm sạch",    color: "emerald" },
  { key: "plumbing",   label: "Cấp thoát nước",         color: "blue" },
  { key: "renovation", label: "Sửa chữa & Cải tạo",    color: "purple" },
  { key: "camera",     label: "Camera – An ninh",        color: "indigo" },
  { key: "other",      label: "Dịch vụ khác",           color: "zinc" },
];

const CAT_COLOR: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/30",   ring: "ring-amber-500/40" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", ring: "ring-emerald-500/40" },
  blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30",    ring: "ring-blue-500/40" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/30",  ring: "ring-purple-500/40" },
  indigo:  { bg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-indigo-500/30",  ring: "ring-indigo-500/40" },
  zinc:    { bg: "bg-zinc-500/15",    text: "text-zinc-400",    border: "border-zinc-500/30",    ring: "ring-zinc-500/40" },
};

// ─── Apartment picker ──────────────────────────────────────────────────────────

function aptLabel(a: ApartmentResponse) {
  return `Căn ${a.code} – Tầng ${a.floor}, Block ${a.building}`;
}

function aptAddress(a: ApartmentResponse) {
  return `Căn ${a.code}, Tầng ${a.floor}, Block ${a.building}, TownHub`;
}

interface AptPickerProps {
  apartments: ApartmentResponse[];
  loading: boolean;
  selected: ApartmentResponse | null;
  onSelect: (a: ApartmentResponse | null) => void;
}

function AptPicker({ apartments, loading, selected, onSelect }: AptPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Group filtered apartments by building
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? apartments.filter(
          (a) =>
            a.code.toLowerCase().includes(q) ||
            a.building.toLowerCase().includes(q) ||
            String(a.floor).includes(q)
        )
      : apartments;

    const map = new Map<string, ApartmentResponse[]>();
    for (const a of filtered) {
      const key = `Block ${a.building}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    // Sort floors within each group
    for (const list of map.values()) {
      list.sort((x, y) => x.floor - y.floor || x.unitNumber.localeCompare(y.unitNumber));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [apartments, query]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          open
            ? "bg-white/8 border-amber-500/40 ring-1 ring-amber-500/30"
            : "bg-white/5 border-white/10 hover:border-white/20"
        }`}
      >
        <MapPin className="w-4 h-4 text-zinc-600 shrink-0" />
        {loading ? (
          <span className="text-zinc-600 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải danh sách căn...
          </span>
        ) : selected ? (
          <span className="flex-1 text-left text-white">{aptLabel(selected)}</span>
        ) : (
          <span className="flex-1 text-left text-zinc-600">Chọn căn hộ / văn phòng...</span>
        )}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onSelect(null))}
              className="p-0.5 text-zinc-600 hover:text-red-400 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-[#161616] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mã căn, block, tầng..."
              className="bg-transparent outline-none text-xs text-white w-full placeholder:text-zinc-600"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-zinc-600 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-56">
            {groups.length === 0 ? (
              <p className="text-center text-xs text-zinc-600 py-6">Không tìm thấy căn nào</p>
            ) : (
              groups.map(([block, items]) => (
                <div key={block}>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                    {block}
                  </p>
                  {items.map((apt) => {
                    const isSelected = selected?.id === apt.id;
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => { onSelect(apt); setOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                          isSelected
                            ? "bg-amber-500/12 text-amber-300"
                            : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="font-medium">Căn {apt.code}</span>
                        <span className="text-zinc-500">Tầng {apt.floor} · {apt.type} · {apt.areaM2}m²</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type Status = "idle" | "submitting" | "success" | "error";

export default function ProviderRegisterPage() {
  const { user } = useAuth();

  const [apartments, setApartments] = useState<ApartmentResponse[]>([]);
  const [aptLoading, setAptLoading]   = useState(true);

  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
  });
  const [selectedApt, setSelectedApt] = useState<ApartmentResponse | null>(null);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    apartmentsApi.getAll().then((res) => {
      if (res.errorCode === 200 && res.data) setApartments(res.data);
      setAptLoading(false);
    });
  }, []);

  function toggleCat(key: string) {
    setSelectedCats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.companyName.trim()) return;
    if (selectedCats.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất một loại dịch vụ.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    const res = await providersApi.selfRegister({
      authUserId: user.userID,
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: selectedApt ? aptAddress(selectedApt) : undefined,
      serviceCategories: JSON.stringify(selectedCats),
    });

    if (res.errorCode === 200) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMsg(res.errorMessage || "Đã có lỗi xảy ra, vui lòng thử lại.");
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex flex-col items-center text-center gap-5 py-16 px-6 bg-[#111] border border-emerald-500/20 rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Nộp đơn thành công!</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              Đơn đăng ký nhà cung cấp dịch vụ của bạn đã được gửi.
              <br />
              Vui lòng chờ Ban quản lý xem xét và phê duyệt.
            </p>
          </div>
          <button
            onClick={() => {
              setStatus("idle");
              setForm({ companyName: "", contactName: "", phone: "", email: "" });
              setSelectedApt(null);
              setSelectedCats([]);
            }}
            className="px-5 py-2.5 text-sm text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-colors"
          >
            Nộp đơn khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.25)]">
          <Briefcase className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Đăng ký Nhà cung cấp</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Nộp đơn để cung cấp dịch vụ trong khu đô thị</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          Thông tin liên hệ (tên, SĐT) có thể để trống — hệ thống sẽ tự lấy từ hồ sơ cư dân của bạn.
          Sau khi nộp đơn, Ban quản lý sẽ xét duyệt và thông báo kết quả.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-[#111] border border-white/5 rounded-2xl p-5 space-y-5">

        {/* Company name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Tên doanh nghiệp / hộ kinh doanh <span className="text-amber-400">*</span>
          </label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-amber-500/40 transition-all">
            <Building2 className="w-4 h-4 text-zinc-600 shrink-0" />
            <input
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="VD: Dịch vụ sửa điện Văn A"
              className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Contact name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Người đại diện{" "}
            <span className="text-zinc-600">(để trống → lấy từ hồ sơ)</span>
          </label>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-amber-500/40 transition-all">
            <User className="w-4 h-4 text-zinc-600 shrink-0" />
            <input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              placeholder="Nguyễn Văn A"
              className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Số điện thoại{" "}
              <span className="text-zinc-600 text-[10px]">(để trống → lấy từ hồ sơ)</span>
            </label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-amber-500/40 transition-all">
              <Phone className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901 234 567"
                className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email liên hệ</label>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-amber-500/40 transition-all">
              <Mail className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Address – apartment picker */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Địa chỉ kinh doanh{" "}
            <span className="text-zinc-600">(chọn căn trong toà nhà)</span>
          </label>
          <AptPicker
            apartments={apartments}
            loading={aptLoading}
            selected={selectedApt}
            onSelect={setSelectedApt}
          />
          {selectedApt && (
            <p className="mt-1.5 text-[10px] text-zinc-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {aptAddress(selectedApt)}
            </p>
          )}
        </div>

        {/* Service categories */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Loại dịch vụ <span className="text-amber-400">*</span>
            <span className="text-zinc-600 ml-1">(chọn nhiều)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ key, label, color }) => {
              const c = CAT_COLOR[color] ?? CAT_COLOR.zinc;
              const active = selectedCats.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCat(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    active
                      ? `${c.bg} ${c.text} ${c.border} ring-1 ${c.ring}`
                      : "bg-white/3 text-zinc-500 border-white/8 hover:bg-white/6 hover:text-zinc-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                      active ? c.text.replace("text-", "bg-") : "bg-zinc-700"
                    }`}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {(status === "error" || errorMsg) && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "submitting" || !form.companyName.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-bold rounded-xl transition-colors"
        >
          {status === "submitting" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {status === "submitting" ? "Đang gửi đơn..." : "Nộp đơn đăng ký"}
        </button>
      </form>
    </div>
  );
}
