"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck, Search, X, Plus, Phone, Home,
  Clock, CheckCircle, AlertCircle, Loader2,
  ChevronRight, ArrowRight, Store, XCircle,
  FileText, Filter, UserPlus, Building2,
  Eye, EyeOff,
} from "lucide-react";
import { residents as residentsApi, apartments as apartmentsApi, ApartmentResponse } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";

type RequestStatus =
  | "pending_approval"
  | "rejected_by_mgt"
  | "sent_to_provider"
  | "accepted"
  | "in_progress"
  | "completed"
  | "rejected_by_provider";

interface ServiceRequest {
  id: number;
  residentId: number;
  title: string;
  description: string;
  providerName: string;
  serviceType: string;
  priority: Priority;
  requiresApproval: boolean;
  status: RequestStatus;
  createdAt: string;
  estimatedDays?: number;
  note?: string;
}

interface Resident {
  id: number;
  name: string;
  apartment: string;
  building: string;
  phone: string;
  email?: string;
  isOwner: boolean;
  moveInDate: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_RESIDENTS: Resident[] = [
  { id: 1, name: "Nguyễn Văn An",   apartment: "A1201", building: "Toà A", phone: "0901 234 567", email: "nva@gmail.com", isOwner: true,  moveInDate: "2024-03-15" },
  { id: 2, name: "Trần Thị Bình",   apartment: "B305",  building: "Toà B", phone: "0912 345 678", email: "ttb@gmail.com", isOwner: true,  moveInDate: "2023-07-01" },
  { id: 3, name: "Phạm Minh Đức",   apartment: "C802",  building: "Toà C", phone: "0933 456 789", isOwner: false, moveInDate: "2025-01-10" },
  { id: 4, name: "Hoàng Thị Em",    apartment: "D205",  building: "Toà D", phone: "0944 567 890", email: "hte@yahoo.com", isOwner: true, moveInDate: "2022-11-20" },
  { id: 5, name: "Lê Quang Phúc",   apartment: "A805",  building: "Toà A", phone: "0955 678 901", isOwner: false, moveInDate: "2025-04-01" },
  { id: 6, name: "Võ Thị Giang",    apartment: "B1102", building: "Toà B", phone: "0966 789 012", email: "vtg@gmail.com", isOwner: true, moveInDate: "2024-09-05" },
];

const MOCK_REQUESTS: ServiceRequest[] = [
  {
    id: 1, residentId: 1,
    title: "Đập thông căn A1201 – A1202",
    description: "Đập tường ngăn phi kết cấu giữa A1201 và A1202 theo bản vẽ đã nộp BQL.",
    providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Cải tạo kết cấu",
    priority: "medium", requiresApproval: true,
    status: "pending_approval",
    createdAt: "2026-05-21",
    estimatedDays: 14,
  },
  {
    id: 2, residentId: 2,
    title: "Vệ sinh tổng thể căn hộ",
    description: "Dọn vệ sinh sâu toàn bộ 3 phòng ngủ, phòng khách, bếp và 2 toilet.",
    providerName: "Dịch vụ Vệ sinh Sạch Đẹp",
    serviceType: "Vệ sinh – Làm sạch",
    priority: "low", requiresApproval: false,
    status: "in_progress",
    createdAt: "2026-05-20",
    estimatedDays: 1,
  },
  {
    id: 3, residentId: 4,
    title: "Lắp camera an ninh ban công",
    description: "Lắp 2 camera ngoài cửa chính và ban công hướng Đông.",
    providerName: "An ninh Bảo vệ Toàn Cầu",
    serviceType: "An ninh – Camera",
    priority: "low", requiresApproval: true,
    status: "pending_approval",
    createdAt: "2026-05-22",
    estimatedDays: 2,
  },
  {
    id: 4, residentId: 4,
    title: "Sửa khóa điện tử cửa chính",
    description: "Khóa điện tử không nhận thẻ từ sau khi mất điện dài ngày.",
    providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Điện – Kỹ thuật",
    priority: "high", requiresApproval: false,
    status: "accepted",
    createdAt: "2026-05-22",
    estimatedDays: 1,
  },
  {
    id: 5, residentId: 1,
    title: "Thay vòi sen phòng tắm chính",
    description: "Vòi sen cố định bị rỉ, nước chảy yếu. Yêu cầu thay vòi mới cùng loại.",
    providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Cấp thoát nước",
    priority: "medium", requiresApproval: false,
    status: "completed",
    createdAt: "2026-05-10",
    estimatedDays: 1,
  },
  {
    id: 6, residentId: 6,
    title: "Lắp điều hòa phòng ngủ thứ 2",
    description: "Lắp mới 1 máy điều hòa 12.000 BTU tại phòng ngủ thứ 2.",
    providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Điều hòa – Không khí",
    priority: "medium", requiresApproval: false,
    status: "sent_to_provider",
    createdAt: "2026-05-23",
    estimatedDays: 2,
  },
  {
    id: 7, residentId: 3,
    title: "Sơn lại tường phòng khách",
    description: "Sơn lại toàn bộ tường phòng khách 45m². Màu trắng sữa theo catalog.",
    providerName: "Dịch vụ Nội thất Đẹp",
    serviceType: "Sơn & Nội thất",
    priority: "low", requiresApproval: false,
    status: "rejected_by_provider",
    createdAt: "2026-05-15",
    note: "NCC không nhận việc trong tháng 5.",
  },
];

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<RequestStatus, { label: string; cls: string; dot: string; step: number }> = {
  pending_approval:      { label: "Chờ BQL duyệt",    cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",    dot: "bg-yellow-400 animate-pulse", step: 1 },
  rejected_by_mgt:       { label: "BQL từ chối",       cls: "bg-red-500/15 text-red-400 border-red-500/20",             dot: "bg-red-500", step: 0 },
  sent_to_provider:      { label: "Chờ NCC phản hồi",  cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",          dot: "bg-blue-400 animate-pulse", step: 2 },
  accepted:              { label: "NCC đã nhận",        cls: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",    dot: "bg-indigo-400", step: 3 },
  in_progress:           { label: "Đang thực hiện",    cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",       dot: "bg-amber-500 animate-pulse", step: 4 },
  completed:             { label: "Hoàn thành",         cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500", step: 5 },
  rejected_by_provider:  { label: "NCC từ chối",        cls: "bg-red-500/15 text-red-400 border-red-500/20",             dot: "bg-red-500", step: 0 },
};

const PRIORITY_META: Record<Priority, { label: string; cls: string }> = {
  low:    { label: "Thấp",       cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  medium: { label: "Trung bình", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  high:   { label: "Cao",        cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  urgent: { label: "Khẩn cấp",  cls: "bg-red-500/15 text-red-400 border-red-500/20" },
};

// ─── Status pipeline component ───────────────────────────────────────────────

function StatusPipeline({ req }: { req: ServiceRequest }) {
  const steps = req.requiresApproval
    ? ["Tạo", "Chờ BQL", "Chờ NCC", "NCC nhận", "Thực hiện", "Xong"]
    : ["Tạo", "Gửi NCC", "NCC nhận", "Thực hiện", "Xong"];

  const rejected = req.status === "rejected_by_mgt" || req.status === "rejected_by_provider";
  const currentStep = rejected ? -1 : STATUS_META[req.status].step;

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            rejected ? "bg-zinc-700" : i <= currentStep ? "bg-amber-500" : "bg-zinc-700"
          }`} />
          <span className={`text-[9px] whitespace-nowrap ${
            rejected ? "text-zinc-600" : i <= currentStep ? "text-zinc-400" : "text-zinc-700"
          }`}>{s}</span>
          {i < steps.length - 1 && <ArrowRight className={`w-2.5 h-2.5 flex-shrink-0 ${
            rejected ? "text-zinc-800" : i < currentStep ? "text-amber-500/50" : "text-zinc-800"
          }`} />}
        </div>
      ))}
    </div>
  );
}

// ─── Create Resident Modal ────────────────────────────────────────────────────

const BUSINESS_CATEGORIES = [
  { value: "cleaning",     label: "Vệ sinh – Làm sạch" },
  { value: "repair",       label: "Sửa chữa & Bảo trì" },
  { value: "security",     label: "An ninh – Bảo vệ" },
  { value: "food",         label: "Ẩm thực – F&B" },
  { value: "fitness",      label: "Thể dục – Thể thao" },
  { value: "education",    label: "Giáo dục – Đào tạo" },
  { value: "beauty",       label: "Làm đẹp – Spa" },
  { value: "other",        label: "Khác" },
];

const EMPTY_FORM = {
  userName: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
  idCard: "",
  dateOfBirth: "",
  gender: "male",
  apartmentId: "",
  isOwner: true,
  moveInDate: "",
  isBusinessOwner: false,
  businessCompanyName: "",
  businessServiceCategories: [] as string[],
  businessAddress: "",
};

interface CreateResidentModalProps {
  onClose: () => void;
  onSuccess: (msg: string, isWarning?: boolean) => void;
}

function CreateResidentModal({ onClose, onSuccess }: CreateResidentModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aptList, setAptList] = useState<ApartmentResponse[]>([]);

  useEffect(() => {
    apartmentsApi.getAll().then((r) => { if (r.data) setAptList(r.data); });
  }, []);

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: typeof EMPTY_FORM[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      businessServiceCategories: f.businessServiceCategories.includes(cat)
        ? f.businessServiceCategories.filter((c) => c !== cat)
        : [...f.businessServiceCategories, cat],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.userName.trim()) e.userName = "Bắt buộc";
    if (!form.password.trim()) e.password = "Bắt buộc";
    if (!form.fullName.trim()) e.fullName = "Bắt buộc";
    if (!form.phone.trim())    e.phone    = "Bắt buộc";
    if (!form.idCard.trim())   e.idCard   = "Bắt buộc";
    if (!form.dateOfBirth)     e.dateOfBirth = "Bắt buộc";
    if (!form.apartmentId)     e.apartmentId = "Chọn căn hộ";
    if (!form.moveInDate)      e.moveInDate  = "Bắt buộc";
    if (form.isBusinessOwner) {
      if (!form.businessCompanyName.trim()) e.businessCompanyName = "Bắt buộc";
      if (!form.businessServiceCategories.length) e.businessServiceCategories = "Chọn ít nhất 1 loại";
      if (!form.businessAddress.trim()) e.businessAddress = "Bắt buộc";
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const cats = form.businessServiceCategories.length
        ? JSON.stringify(form.businessServiceCategories)
        : null;

      const res = await residentsApi.registerCreate({
        userName:    form.userName.trim(),
        email:       form.email.trim() || undefined,
        password:    form.password,
        fullName:    form.fullName.trim(),
        phone:       form.phone.trim(),
        idCard:      form.idCard.trim(),
        dateOfBirth: new Date(form.dateOfBirth).toISOString(),
        gender:      form.gender,
        avatarUrl:   null,
        apartmentId: Number(form.apartmentId),
        isOwner:     form.isOwner,
        moveInDate:  new Date(form.moveInDate).toISOString(),
        isBusinessOwner:          form.isBusinessOwner,
        businessCompanyName:      form.isBusinessOwner ? form.businessCompanyName.trim() : null,
        businessServiceCategories: form.isBusinessOwner ? cats : null,
        businessAddress:          form.isBusinessOwner ? form.businessAddress.trim() : null,
      });

      if (res.data?.warning) {
        onSuccess(res.data.warning, true);
      } else if (res.data?.message) {
        onSuccess(res.data.message);
      } else {
        onSuccess("Tạo tài khoản cư dân thành công.");
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof EMPTY_FORM, opts?: { placeholder?: string; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {label} {["userName","password","fullName","phone","idCard","dateOfBirth","apartmentId","moveInDate"].includes(key) && <span className="text-red-400">*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={opts?.placeholder}
        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
          errors[key] ? "border-red-500/50" : "border-white/10"
        }`}
      />
      {errors[key] && <p className="text-[10px] text-red-400 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tạo tài khoản cư dân</h2>
              <p className="text-[10px] text-zinc-500">Tạo tài khoản đăng nhập và hồ sơ cư dân</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body – scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Section: Tài khoản */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin tài khoản</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Tên đăng nhập", "userName", { placeholder: "nguyen.van.an" })}
              {field("Email", "email", { placeholder: "email@example.com", type: "email" })}
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mật khẩu <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Abc@123456"
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 pr-9 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.password ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
            </div>
          </div>

          {/* Section: Hồ sơ cá nhân */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Hồ sơ cá nhân</p>
            <div className="grid grid-cols-2 gap-3">
              {field("Họ và tên", "fullName", { placeholder: "Nguyễn Văn An" })}
              {field("Số điện thoại", "phone", { placeholder: "0901234567" })}
              {field("CCCD / CMND", "idCard", { placeholder: "079200001234" })}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày sinh <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.dateOfBirth ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.dateOfBirth && <p className="text-[10px] text-red-400 mt-1">{errors.dateOfBirth}</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Giới tính</label>
              <div className="flex gap-2">
                {[{ v: "male", l: "Nam" }, { v: "female", l: "Nữ" }, { v: "other", l: "Khác" }].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("gender", v)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      form.gender === v
                        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                        : "text-zinc-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Căn hộ */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin căn hộ</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Căn hộ <span className="text-red-400">*</span></label>
                <select
                  value={form.apartmentId}
                  onChange={(e) => set("apartmentId", e.target.value)}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.apartmentId ? "border-red-500/50" : "border-white/10"
                  }`}
                >
                  <option value="" className="bg-[#1a1a1a]">-- Chọn căn hộ --</option>
                  {aptList.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#1a1a1a]">
                      {a.code} – {a.building} ({a.status === "occupied" ? "Đang ở" : a.status === "vacant" ? "Trống" : "Bảo trì"})
                    </option>
                  ))}
                </select>
                {errors.apartmentId && <p className="text-[10px] text-red-400 mt-1">{errors.apartmentId}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày chuyển vào <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => set("moveInDate", e.target.value)}
                  className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                    errors.moveInDate ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.moveInDate && <p className="text-[10px] text-red-400 mt-1">{errors.moveInDate}</p>}
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                <div
                  onClick={() => set("isOwner", !form.isOwner)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative ${form.isOwner ? "bg-amber-500" : "bg-zinc-700"}`}
                >
                  <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${form.isOwner ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs text-zinc-300">Là chủ sở hữu căn hộ</span>
              </label>
            </div>
          </div>

          {/* Section: Hộ kinh doanh */}
          <div className="border border-white/5 rounded-xl p-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => set("isBusinessOwner", !form.isBusinessOwner)}
                className={`w-8 h-4.5 rounded-full transition-colors relative flex-shrink-0 ${form.isBusinessOwner ? "bg-blue-500" : "bg-zinc-700"}`}
              >
                <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${form.isBusinessOwner ? "translate-x-3.5" : "translate-x-0.5"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-200">Đăng ký hộ kinh doanh</p>
                <p className="text-[10px] text-zinc-500">Cư dân này cũng là nhà cung cấp dịch vụ trong tòa nhà</p>
              </div>
            </label>

            <AnimatePresence>
              {form.isBusinessOwner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên hộ kinh doanh <span className="text-red-400">*</span></label>
                      <input
                        value={form.businessCompanyName}
                        onChange={(e) => set("businessCompanyName", e.target.value)}
                        placeholder="Hộ KD Dọn Vệ Sinh Lan"
                        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 ${
                          errors.businessCompanyName ? "border-red-500/50" : "border-white/10"
                        }`}
                      />
                      {errors.businessCompanyName && <p className="text-[10px] text-red-400 mt-1">{errors.businessCompanyName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ <span className="text-red-400">*</span></label>
                      <div className="flex flex-wrap gap-1.5">
                        {BUSINESS_CATEGORIES.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleCategory(value)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              form.businessServiceCategories.includes(value)
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                : "text-zinc-400 border-white/10 hover:border-white/20"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {errors.businessServiceCategories && (
                        <p className="text-[10px] text-red-400 mt-1">{errors.businessServiceCategories}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Địa chỉ kinh doanh <span className="text-red-400">*</span></label>
                      <input
                        value={form.businessAddress}
                        onChange={(e) => set("businessAddress", e.target.value)}
                        placeholder="Toà B, Tầng 2, TownHub Residences"
                        className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 ${
                          errors.businessAddress ? "border-red-500/50" : "border-white/10"
                        }`}
                      />
                      {errors.businessAddress && <p className="text-[10px] text-red-400 mt-1">{errors.businessAddress}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Tạo tài khoản
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ResidentsPage() {
  const [residents]         = useState(MOCK_RESIDENTS);
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [statusFilter, setStatusFilter]     = useState<RequestStatus | "all">("all");
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [createModal, setCreateModal] = useState<Resident | null>(null);
  const [showCreateResident, setShowCreateResident] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [form, setForm]     = useState({
    title: "", providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Điện – Kỹ thuật", description: "",
    priority: "medium" as Priority, estimatedDays: 3,
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const buildings = ["all", ...Array.from(new Set(residents.map((r) => r.building)))];

  const filteredResidents = residents.filter((r) => {
    if (buildingFilter !== "all" && r.building !== buildingFilter) return false;
    if (search && !`${r.name} ${r.apartment}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function getResidentRequests(residentId: number) {
    return requests.filter((req) => req.residentId === residentId);
  }

  function handleCreateReq() {
    if (!createModal || !form.title.trim()) return;
    setSaving(true);
    setTimeout(() => {
      setRequests((prev) => [{
        id: Math.max(...prev.map((r) => r.id)) + 1,
        residentId: createModal.id,
        ...form,
        requiresApproval: false,
        status: "sent_to_provider" as RequestStatus,
        createdAt: new Date().toISOString().split("T")[0],
      }, ...prev]);
      showToast("Đã tạo yêu cầu dịch vụ cho cư dân");
      setCreateModal(null);
      setSaving(false);
    }, 500);
  }

  const allRequests = statusFilter === "all"
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-[0_0_16px_rgba(96,165,250,0.25)]">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Cư dân</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Danh sách cư dân &amp; theo dõi yêu cầu dịch vụ</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateResident(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-[0_0_12px_rgba(59,130,246,0.25)]"
        >
          <UserPlus className="w-4 h-4" />
          Tạo tài khoản cư dân
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Tổng cư dân",          value: residents.length, cls: "text-blue-400",    bg: "bg-blue-500/10" },
          { label: "Chủ sở hữu",           value: residents.filter((r) => r.isOwner).length, cls: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Chờ BQL duyệt",        value: requests.filter((r) => r.status === "pending_approval").length, cls: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Đang thực hiện",       value: requests.filter((r) => r.status === "in_progress").length, cls: "text-emerald-400", bg: "bg-emerald-500/10" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-4`}>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Resident list ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm cư dân, căn hộ..."
              className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
            />
            {search && <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {buildings.map((b) => (
              <button key={b} onClick={() => setBuildingFilter(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  buildingFilter === b
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    : "text-zinc-400 border-white/5 hover:text-white hover:bg-white/5"
                }`}>
                {b === "all" ? "Tất cả" : b}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {filteredResidents.map((resident) => {
              const resReqs = getResidentRequests(resident.id);
              const pending = resReqs.filter((r) => r.status === "pending_approval").length;
              const active  = resReqs.filter((r) => ["sent_to_provider", "accepted", "in_progress"].includes(r.status)).length;
              const isSelected = selectedResident?.id === resident.id;

              return (
                <button
                  key={resident.id}
                  onClick={() => setSelectedResident(isSelected ? null : resident)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/30"
                      : "bg-[#111] border-white/5 hover:bg-[#141414] hover:border-white/10"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-400">{resident.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{resident.name}</p>
                      {resident.isOwner && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 flex-shrink-0">
                          Chủ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                      <Home className="w-3 h-3" />
                      <span className="text-amber-400 font-medium">{resident.apartment}</span>
                      <span className="text-zinc-600">·</span>
                      <span>{resident.building}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {pending > 0 && (
                      <span className="block text-[10px] font-bold text-yellow-400">{pending} chờ duyệt</span>
                    )}
                    {active > 0 && (
                      <span className="block text-[10px] text-blue-400">{active} đang xử lý</span>
                    )}
                    {resReqs.length === 0 && (
                      <span className="text-[10px] text-zinc-600">Chưa có yêu cầu</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right panel: requests ─────────────────────────────────── */}
        <div className="lg:col-span-3">
          {selectedResident ? (
            <div className="space-y-4">
              {/* Resident info card */}
              <div className="bg-[#111] border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-400">{selectedResident.name[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{selectedResident.name}</p>
                        {selectedResident.isOwner && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">Chủ sở hữu</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Home className="w-3 h-3" /><span className="text-amber-400 font-medium">{selectedResident.apartment}</span></span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedResident.phone}</span>
                        {selectedResident.email && <span>{selectedResident.email}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Vào: {selectedResident.moveInDate}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreateModal(selectedResident)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo yêu cầu
                  </button>
                </div>
              </div>

              {/* Request list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lịch sử yêu cầu dịch vụ</p>
                {getResidentRequests(selectedResident.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-600 border border-white/5 rounded-xl">
                    <FileText className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">Cư dân chưa có yêu cầu nào</p>
                  </div>
                ) : (
                  getResidentRequests(selectedResident.id).map((req) => {
                    const sm = STATUS_META[req.status];
                    return (
                      <div key={req.id} className="bg-[#111] border border-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-white">{req.title}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_META[req.priority].cls}`}>
                                {PRIORITY_META[req.priority].label}
                              </span>
                              {req.requiresApproval && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                  Cần BQL duyệt
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{req.description}</p>
                          </div>
                          <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${sm.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                            {sm.label}
                          </span>
                        </div>

                        <StatusPipeline req={req} />

                        <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1 border-t border-white/5">
                          <span className="flex items-center gap-1"><Store className="w-3 h-3" />{req.providerName}</span>
                          <span className="text-zinc-700">·</span>
                          <span>{req.serviceType}</span>
                          <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{req.createdAt}</span>
                        </div>

                        {req.note && (
                          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-500/8 rounded-lg text-xs text-red-400">
                            <XCircle className="w-3 h-3 flex-shrink-0" />{req.note}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* All requests overview */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Tất cả yêu cầu</p>
                <div className="relative ml-auto">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
                    className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-300 outline-none">
                    <option value="all" className="bg-[#1a1a1a]">Tất cả trạng thái</option>
                    {(Object.keys(STATUS_META) as RequestStatus[]).map((s) => (
                      <option key={s} value={s} className="bg-[#1a1a1a]">{STATUS_META[s].label}</option>
                    ))}
                  </select>
                  <Filter className="w-3 h-3 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                {allRequests.map((req) => {
                  const resident = residents.find((r) => r.id === req.residentId);
                  const sm = STATUS_META[req.status];
                  return (
                    <div key={req.id} className="bg-[#111] border border-white/5 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{req.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                            <button
                              onClick={() => setSelectedResident(resident ?? null)}
                              className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                            >
                              <UserCheck className="w-3 h-3" />{resident?.name}
                            </button>
                            <span>·</span>
                            <span className="text-amber-400">{resident?.apartment}</span>
                            <span>·</span>
                            <span>{req.serviceType}</span>
                          </div>
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{sm.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Resident Account Modal ──────────────────────────── */}
      <AnimatePresence>
        {showCreateResident && (
          <CreateResidentModal
            onClose={() => setShowCreateResident(false)}
            onSuccess={(msg, isWarning) => showToast(msg, !isWarning)}
          />
        )}
      </AnimatePresence>

      {/* ── Create Service Request Modal ──────────────────────────── */}
      <AnimatePresence>
        {createModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setCreateModal(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <h2 className="text-base font-semibold text-white">Tạo yêu cầu cho cư dân</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">{createModal.name} – {createModal.apartment}</p>
                </div>
                <button onClick={() => setCreateModal(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tiêu đề yêu cầu *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Sửa ổ điện phòng ngủ"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nhà cung cấp</label>
                    <input value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                      placeholder="Tên nhà cung cấp"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ</label>
                    <input value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                      placeholder="VD: Điện – Kỹ thuật"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} placeholder="Mô tả yêu cầu..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
                <button onClick={() => setCreateModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
                <button onClick={handleCreateReq} disabled={saving || !form.title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Tạo yêu cầu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border text-sm font-medium ${
              toast.ok ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400"
            }`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
