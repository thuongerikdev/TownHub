"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Loader2, Check, AlertCircle } from "lucide-react";
import { incidents, residents } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const CATEGORIES = [
  { value: "elevator",   label: "Thang máy" },
  { value: "plumbing",   label: "Cấp thoát nước" },
  { value: "electrical", label: "Điện" },
  { value: "security",   label: "An ninh" },
  { value: "cleaning",   label: "Vệ sinh" },
  { value: "parking",    label: "Bãi đỗ xe" },
  { value: "other",      label: "Khác" },
];

const PRIORITIES = [
  { value: "low",      label: "Thấp" },
  { value: "medium",   label: "Trung bình" },
  { value: "high",     label: "Cao" },
  { value: "critical", label: "Khẩn cấp" },
];

export default function ReportIncidentModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [apartmentId, setApartmentId] = useState<number | undefined>();
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Tự lấy căn hộ của cư dân đang đăng nhập để đính kèm vào phiếu.
  useEffect(() => {
    if (!user) return;
    residents.getAll().then((r) => {
      const me = r.errorCode === 200 ? r.data?.find((x) => x.authUserId === user.userID) : undefined;
      if (me) {
        setApartmentId(me.apartmentId);
        if (me.apartmentCode) setLocation(me.apartmentCode);
      }
    });
  }, [user]);

  async function handleSubmit() {
    if (!title.trim()) { setError("Vui lòng nhập tiêu đề sự cố."); return; }
    if (!user) { setError("Không xác định được tài khoản."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await incidents.create({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        apartmentId,
        category,
        priority,
        reportedByAuthUserId: user.userID,
      });
      if (res.errorCode === 200) {
        setDone(true);
      } else {
        setError(res.errorMessage || "Gửi phiếu sự cố thất bại.");
      }
    } catch {
      setError("Lỗi kết nối server.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-[#0e0e0e] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tạo phiếu sự cố</h2>
              <p className="text-[10px] text-zinc-500">Báo sự cố tới Ban quản lý toà nhà</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-white">Đã gửi phiếu sự cố!</p>
            <p className="text-xs text-zinc-500">Ban quản lý sẽ tiếp nhận và xử lý sớm nhất.</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Tiêu đề <span className="text-red-400">*</span></label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Thang máy dừng đột ngột" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Loại sự cố</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} bg-[#1a1a1a]`}>
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Mức độ</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${inputCls} bg-[#1a1a1a]`}>
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Vị trí</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: A0101, hành lang tầng 3..." className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Mô tả chi tiết</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả tình trạng sự cố..." className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                Gửi phiếu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
