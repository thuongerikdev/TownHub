"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Users as UsersIcon,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Shield,
  RefreshCw,
  Loader2,
  AlertCircle,
  UserX,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  UserCog,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { users, roles as rolesApi, residents as residentsApi, apartments as apartmentsApi, type GetUserResponse, type Role, type ApartmentResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function fullName(u: GetUserResponse) {
  const first = u.profile?.firstName?.trim() ?? "";
  const last = u.profile?.lastName?.trim() ?? "";
  return first || last ? `${first} ${last}`.trim() : u.userName;
}

function statusStyle(s: string) {
  switch (s.toLowerCase()) {
    case "active":   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "pending":  return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "inactive": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:         return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    active: "Hoạt động", Active: "Hoạt động",
    pending: "Chờ duyệt", Pending: "Chờ duyệt",
    inactive: "Không hoạt động", Inactive: "Không hoạt động",
  };
  return map[s] ?? s;
}

// ─── Create BQL Modal ─────────────────────────────────────────────────────────

const EMPTY_BQL_FORM = {
  userName:    "",
  email:       "",
  password:    "",
  firstName:   "",
  lastName:    "",
  gender:      "male",
  dateOfBirth: "",
  roleIds:     [] as number[],
};

interface CreateBqlModalProps {
  onClose:   () => void;
  onSuccess: (msg: string) => void;
}

function CreateBqlModal({ onClose, onSuccess }: CreateBqlModalProps) {
  const [form, setForm]           = useState(EMPTY_BQL_FORM);
  const [showPassword, setShowPw] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [staffRoles, setStaffRoles] = useState<Role[]>([]);

  useEffect(() => {
    rolesApi.getAll().then((r) => {
      if (r.data) setStaffRoles(r.data.filter((ro) => ro.scope === "staff"));
    });
  }, []);

  function setField<K extends keyof typeof EMPTY_BQL_FORM>(k: K, v: typeof EMPTY_BQL_FORM[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function toggleRole(id: number) {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id)
        ? f.roleIds.filter((r) => r !== id)
        : [...f.roleIds, id],
    }));
    setErrors((e) => { const n = { ...e }; delete n.roleIds; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.userName.trim())  e.userName  = "Bắt buộc";
    if (!form.email.trim())     e.email     = "Bắt buộc";
    if (!form.password.trim())  e.password  = "Bắt buộc";
    if (!form.firstName.trim()) e.firstName = "Bắt buộc";
    if (!form.lastName.trim())  e.lastName  = "Bắt buộc";
    if (!form.roleIds.length)   e.roleIds   = "Chọn ít nhất 1 vai trò";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const res = await users.createBql({
        userName:    form.userName.trim(),
        email:       form.email.trim(),
        password:    form.password,
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        gender:      form.gender,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        roleIds:     form.roleIds,
      });

      const msg = res.errorMessage?.startsWith("Tạo user")
        ? res.errorMessage
        : `Tạo tài khoản BQL "${form.userName}" thành công.`;
      onSuccess(msg);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (key: string) =>
    `w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all ${
      errors[key] ? "border-red-500/50" : "border-white/10"
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tạo tài khoản Ban quản lý</h2>
              <p className="text-[10px] text-zinc-500">Tạo nhân viên BQL và phân quyền vai trò</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Tài khoản */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin tài khoản</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên đăng nhập <span className="text-red-400">*</span></label>
                  <input
                    value={form.userName}
                    onChange={(e) => setField("userName", e.target.value)}
                    placeholder="nguyen.van.a"
                    className={inputCls("userName")}
                  />
                  {errors.userName && <p className="text-[10px] text-red-400 mt-1">{errors.userName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="nva@townhub.vn"
                    className={inputCls("email")}
                  />
                  {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mật khẩu <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Abc@123456"
                    className={`${inputCls("password")} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
              </div>
            </div>
          </div>

          {/* Thông tin cá nhân */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin cá nhân</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Họ (Last name) <span className="text-red-400">*</span></label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setField("lastName", e.target.value)}
                    placeholder="Nguyễn"
                    className={inputCls("lastName")}
                  />
                  {errors.lastName && <p className="text-[10px] text-red-400 mt-1">{errors.lastName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên (First name) <span className="text-red-400">*</span></label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setField("firstName", e.target.value)}
                    placeholder="Văn An"
                    className={inputCls("firstName")}
                  />
                  {errors.firstName && <p className="text-[10px] text-red-400 mt-1">{errors.firstName}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày sinh</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setField("dateOfBirth", e.target.value)}
                    className={inputCls("dateOfBirth")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Giới tính</label>
                  <div className="flex gap-2 pt-0.5">
                    {[{ v: "male", l: "Nam" }, { v: "female", l: "Nữ" }, { v: "other", l: "Khác" }].map(({ v, l }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setField("gender", v)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                          form.gender === v
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "text-zinc-400 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vai trò */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Vai trò <span className="text-red-400">*</span>
            </p>
            {staffRoles.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải vai trò...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {staffRoles.map((r) => {
                  const selected = form.roleIds.includes(r.roleID);
                  return (
                    <button
                      key={r.roleID}
                      type="button"
                      onClick={() => toggleRole(r.roleID)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-white/3 border-white/8 hover:border-white/15"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                        selected ? "bg-amber-500 border-amber-500" : "border-zinc-600"
                      }`}>
                        {selected && <CheckCircle className="w-3 h-3 text-black" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${selected ? "text-amber-300" : "text-zinc-300"}`}>
                          {r.roleName}
                        </p>
                        <p className="text-[10px] text-zinc-600 truncate">{r.roleDescription}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.roleIds && <p className="text-[10px] text-red-400 mt-1.5">{errors.roleIds}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Tạo tài khoản
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Create Resident Modal ────────────────────────────────────────────────────

const EMPTY_RESIDENT_FORM = {
  userName:    "",
  email:       "",
  password:    "",
  fullName:    "",
  phone:       "",
  idCard:      "",
  dateOfBirth: "",
  gender:      "male",
  apartmentId: 0,
  isOwner:     true,
  moveInDate:  new Date().toISOString().slice(0, 10),
};

interface CreateResidentModalProps {
  onClose:   () => void;
  onSuccess: (msg: string) => void;
}

function CreateResidentModal({ onClose, onSuccess }: CreateResidentModalProps) {
  const [form, setForm]           = useState(EMPTY_RESIDENT_FORM);
  const [showPassword, setShowPw] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [aptList, setAptList]     = useState<ApartmentResponse[]>([]);

  useEffect(() => {
    apartmentsApi.getAll({ status: "available" }).then((r) => {
      if (r.data) setAptList(r.data);
    });
  }, []);

  function setField<K extends keyof typeof EMPTY_RESIDENT_FORM>(k: K, v: typeof EMPTY_RESIDENT_FORM[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.userName.trim())  e.userName  = "Bắt buộc";
    if (!form.password.trim())  e.password  = "Bắt buộc";
    if (!form.fullName.trim())  e.fullName  = "Bắt buộc";
    if (!form.phone.trim())     e.phone     = "Bắt buộc";
    if (!form.idCard.trim())    e.idCard    = "Bắt buộc";
    if (!form.dateOfBirth)      e.dateOfBirth = "Bắt buộc";
    if (!form.apartmentId)      e.apartmentId = "Chọn căn hộ";
    if (!form.moveInDate)       e.moveInDate  = "Bắt buộc";
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setSaving(true);
    try {
      const res = await residentsApi.registerCreate({
        userName:        form.userName.trim(),
        email:           form.email.trim() || undefined,
        password:        form.password,
        fullName:        form.fullName.trim(),
        phone:           form.phone.trim(),
        idCard:          form.idCard.trim(),
        dateOfBirth:     new Date(form.dateOfBirth).toISOString(),
        gender:          form.gender,
        apartmentId:     form.apartmentId,
        isOwner:         form.isOwner,
        moveInDate:      new Date(form.moveInDate).toISOString(),
        isBusinessOwner: false,
      });

      if (res.errorCode === 200) {
        onSuccess(`Tạo tài khoản cư dân "${form.fullName}" thành công.`);
        onClose();
      } else {
        setErrors({ _global: res.errorMessage || "Tạo thất bại" });
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (key: string) =>
    `w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all ${
      errors[key] ? "border-red-500/50" : "border-white/10"
    }`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tạo tài khoản Cư Dân</h2>
              <p className="text-[10px] text-zinc-500">Đăng ký cư dân mới và liên kết căn hộ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {errors._global && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errors._global}
            </div>
          )}

          {/* Tài khoản */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin tài khoản</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên đăng nhập <span className="text-red-400">*</span></label>
                  <input value={form.userName} onChange={(e) => setField("userName", e.target.value)} placeholder="nguyen.van.a" className={inputCls("userName")} />
                  {errors.userName && <p className="text-[10px] text-red-400 mt-1">{errors.userName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="nva@gmail.com" className={inputCls("email")} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mật khẩu <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Abc@123456"
                    className={`${inputCls("password")} pr-9`}
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-red-400 mt-1">{errors.password}</p>}
              </div>
            </div>
          </div>

          {/* Thông tin cá nhân */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin cá nhân</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Họ và tên <span className="text-red-400">*</span></label>
                <input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Nguyễn Văn An" className={inputCls("fullName")} />
                {errors.fullName && <p className="text-[10px] text-red-400 mt-1">{errors.fullName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Số điện thoại <span className="text-red-400">*</span></label>
                  <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="0901234567" className={inputCls("phone")} />
                  {errors.phone && <p className="text-[10px] text-red-400 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">CMND / CCCD <span className="text-red-400">*</span></label>
                  <input value={form.idCard} onChange={(e) => setField("idCard", e.target.value)} placeholder="012345678901" className={inputCls("idCard")} />
                  {errors.idCard && <p className="text-[10px] text-red-400 mt-1">{errors.idCard}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày sinh <span className="text-red-400">*</span></label>
                  <input type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} className={inputCls("dateOfBirth")} />
                  {errors.dateOfBirth && <p className="text-[10px] text-red-400 mt-1">{errors.dateOfBirth}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Giới tính</label>
                  <div className="flex gap-2 pt-0.5">
                    {[{ v: "male", l: "Nam" }, { v: "female", l: "Nữ" }, { v: "other", l: "Khác" }].map(({ v, l }) => (
                      <button key={v} type="button" onClick={() => setField("gender", v)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.gender === v ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "text-zinc-400 border-white/10 hover:border-white/20"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Căn hộ */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Thông tin căn hộ</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Căn hộ <span className="text-red-400">*</span></label>
                <select
                  value={form.apartmentId}
                  onChange={(e) => setField("apartmentId", Number(e.target.value))}
                  className={`${inputCls("apartmentId")} bg-[#0e0e0e]`}
                >
                  <option value={0}>-- Chọn căn hộ --</option>
                  {aptList.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} – Tầng {a.floor} ({a.building})</option>
                  ))}
                </select>
                {errors.apartmentId && <p className="text-[10px] text-red-400 mt-1">{errors.apartmentId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ngày chuyển vào <span className="text-red-400">*</span></label>
                  <input type="date" value={form.moveInDate} onChange={(e) => setField("moveInDate", e.target.value)} className={inputCls("moveInDate")} />
                  {errors.moveInDate && <p className="text-[10px] text-red-400 mt-1">{errors.moveInDate}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại cư dân</label>
                  <div className="flex gap-2 pt-0.5">
                    {[{ v: true, l: "Chủ hộ" }, { v: false, l: "Thành viên" }].map(({ v, l }) => (
                      <button key={String(v)} type="button" onClick={() => setField("isOwner", v)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.isOwner === v ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "text-zinc-400 border-white/10 hover:border-white/20"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Tạo cư dân
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { isAdmin }               = useAuth();
  const [searchTerm, setSearchTerm]   = useState("");
  const [userList, setUserList]       = useState<GetUserResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [showCreate, setShowCreate]   = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = isAdmin ? await users.getAllAdmin() : await users.getAll();
      if (res.errorCode === 200 && res.data) {
        setUserList(res.data);
      } else {
        setError(res.errorMessage || "Không tải được danh sách người dùng");
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = userList.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      fullName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.userName.toLowerCase().includes(q) ||
      String(u.userID).includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-6 rounded-2xl border border-white/5"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Quản Lý <span className="text-amber-500">Tài Khoản</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {isAdmin ? "Hệ thống phân quyền & danh sách người dùng" : "Danh sách cư dân trong hệ thống"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            {isAdmin ? "Thêm BQL" : "Thêm Cư Dân"}
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search / Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Tìm kiếm theo Tên, Email, Username, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
          />
        </div>
        <button className="px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:border-white/20 transition-all flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" />
          Lọc
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <UserX className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Tài khoản</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Username</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Email xác thực</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((user) => (
                  <tr key={user.userID} className="hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {user.profile?.avatar ? (
                          <img
                            src={user.profile.avatar}
                            alt={fullName(user)}
                            className="w-10 h-10 rounded-full border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-zinc-400 font-semibold text-sm uppercase">
                            {fullName(user).charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                            {fullName(user)}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">
                            #{user.userID} • {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-300 bg-white/5 w-max px-3 py-1.5 rounded-lg border border-white/5">
                        <Shield className="w-4 h-4 text-zinc-500" />
                        <span className="font-mono text-sm">{user.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        user.isEmailVerified
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                      }`}>
                        {user.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle(user.status)}`}>
                        {statusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-400">
            <div>
              Hiển thị <span className="text-white font-medium">1–{filtered.length}</span> trong số{" "}
              <span className="text-white font-medium">{userList.length}</span> kết quả
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors">
                Trở lại
              </button>
              <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                Tiếp
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          isAdmin
            ? <CreateBqlModal onClose={() => setShowCreate(false)} onSuccess={(msg) => { fetchUsers(); showToast(msg); }} />
            : <CreateResidentModal onClose={() => setShowCreate(false)} onSuccess={(msg) => { fetchUsers(); showToast(msg); }} />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-60 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border bg-emerald-500/20 border-emerald-500/30 text-emerald-400 text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
