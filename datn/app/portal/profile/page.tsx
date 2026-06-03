"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { users } from "@/lib/api";
import {
  Pencil, X, Check, Loader2, User, Mail, AtSign,
  ShieldCheck, ShieldOff, CalendarDays, Venus, Mars, CircleHelp,
} from "lucide-react";

const GENDER_LABEL: Record<string, string> = { male: "Nam", female: "Nữ", other: "Khác" };
const GENDER_ICON: Record<string, React.ElementType> = { male: Mars, female: Venus, other: CircleHelp };

function Field({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-2.5 py-3 border-b border-white/5 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-0.5">{label}</p>
        <p className="text-sm text-white break-all">
          {value || <span className="text-zinc-600 italic">Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk]     = useState(false);

  const [firstName, setFirstName] = useState(user?.profile?.firstName ?? "");
  const [lastName,  setLastName]  = useState(user?.profile?.lastName  ?? "");
  const [gender,    setGender]    = useState(user?.profile?.gender    ?? "");
  const [dob,       setDob]       = useState(user?.profile?.dateOfBirth?.slice(0, 10) ?? "");

  if (!user) return null;

  const displayName  = `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.userName;
  const avatarLetter = (user.profile?.firstName ?? user.userName)[0]?.toUpperCase();
  const GenderIcon   = GENDER_ICON[user.profile?.gender ?? ""] ?? CircleHelp;

  function startEdit() {
    setFirstName(user?.profile?.firstName ?? "");
    setLastName(user?.profile?.lastName   ?? "");
    setGender(user?.profile?.gender       ?? "");
    setDob(user?.profile?.dateOfBirth?.slice(0, 10) ?? "");
    setSaveError("");
    setSaveOk(false);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const form = new FormData();
      form.append("userId", String(user!.userID));
      if (firstName) form.append("firstName", firstName);
      if (lastName)  form.append("lastName",  lastName);
      if (gender)    form.append("gender",    gender);
      if (dob)       form.append("dateOfBirth", dob);

      const res = await users.updateProfile(form);
      if (res?.errorCode === 200 || res?.errorCode === 0) {
        await refreshUser();
        setSaveOk(true);
        setEditing(false);
      } else {
        setSaveError(res?.errorMessage || "Cập nhật thất bại");
      }
    } catch {
      setSaveError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-white">Thông tin cá nhân</h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Xem và chỉnh sửa thông tin tài khoản</p>
      </div>

      {/* ── Avatar card ──────────────────────────────────── */}
      <div className="bg-[#111] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-2 border-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
          {user.profile?.avatar ? (
            <img src={user.profile.avatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-amber-400 font-bold text-2xl">{avatarLetter}</span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-base font-semibold text-white truncate">{displayName}</p>
          <p className="text-xs text-zinc-500 mt-0.5">@{user.userName}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              user.isEmailVerified
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}>
              {user.isEmailVerified
                ? <ShieldCheck className="w-2.5 h-2.5" />
                : <ShieldOff   className="w-2.5 h-2.5" />}
              {user.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              user.status === "active"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}>
              {user.status === "active" ? "Hoạt động" : user.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Account info card ────────────────────────────── */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/5">
          <p className="text-sm font-semibold text-white">Chi tiết tài khoản</p>
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors py-1 px-2 -mr-1 rounded-lg hover:bg-amber-500/10"
            >
              <Pencil className="w-3.5 h-3.5" />
              Chỉnh sửa
            </button>
          )}
        </div>

        <div className="px-4 sm:px-5">
          {/* Read-only */}
          <Field label="Tên đăng nhập" value={user.userName} icon={AtSign} />
          <Field label="Email"         value={user.email}    icon={Mail} />

          {/* Editable section */}
          {editing ? (
            <div className="py-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Họ</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Nguyễn"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Tên</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Văn An"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Giới tính</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  >
                    <option value="">Chưa chọn</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Ngày sinh</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Lưu thay đổi
                </button>
                <button
                  onClick={() => { setEditing(false); setSaveError(""); }}
                  disabled={saving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 text-zinc-400 bg-white/5 hover:bg-white/10 text-xs font-medium rounded-xl transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <>
              <Field label="Họ"        value={user.profile?.firstName} icon={User} />
              <Field label="Tên"       value={user.profile?.lastName}  icon={User} />
              <Field
                label="Giới tính"
                value={GENDER_LABEL[user.profile?.gender ?? ""] ?? user.profile?.gender}
                icon={GenderIcon}
              />
              <Field
                label="Ngày sinh"
                value={user.profile?.dateOfBirth
                  ? new Date(user.profile.dateOfBirth).toLocaleDateString("vi-VN")
                  : undefined}
                icon={CalendarDays}
              />
            </>
          )}
        </div>
      </div>

      {/* Success toast */}
      {saveOk && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <Check className="w-3.5 h-3.5 shrink-0" />
          Cập nhật thông tin thành công
        </div>
      )}
    </div>
  );
}
