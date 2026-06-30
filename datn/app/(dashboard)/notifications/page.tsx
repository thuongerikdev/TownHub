"use client";
import { motion } from "motion/react";
import {
  BellRing, Send, Mail, MessageSquare, Smartphone,
  History, CheckCircle2, Clock, Plus, Loader2,
  RefreshCw, AlertCircle, Users,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { notifications, type NotificationResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const CHANNELS = [
  { key: "push",  label: "Push App",   icon: Smartphone, color: "rose" },
  { key: "email", label: "Email",       icon: Mail,       color: "blue" },
  { key: "sms",   label: "SMS (Có phí)", icon: MessageSquare, color: "emerald" },
];

const AUDIENCES = [
  { value: "all",        label: "Tất cả cư dân" },
  { value: "building_a", label: "Cư dân Tòa A" },
  { value: "building_b", label: "Cư dân Tòa B" },
  { value: "villa",      label: "Villa" },
  { value: "owners",     label: "Chủ hộ" },
  { value: "staff",      label: "Ban Quản Lý" },
];

function statusStyle(s: string) {
  switch (s) {
    case "sent":      return "text-emerald-500";
    case "scheduled": return "text-amber-500";
    case "failed":    return "text-rose-500";
    default:          return "text-zinc-400";
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = { sent: "Đã gửi", scheduled: "Đã lên lịch", failed: "Thất bại", draft: "Nháp", sending: "Đang gửi" };
  return m[s] ?? s;
}

function channelBadge(ch: string) {
  const m: Record<string, string> = {
    push:  "bg-rose-500/20 text-rose-400",
    email: "bg-blue-500/20 text-blue-400",
    sms:   "bg-emerald-500/20 text-emerald-400",
  };
  return m[ch] ?? "bg-zinc-500/20 text-zinc-400";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState("all");
  const [targetFloor, setTargetFloor] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["push"]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await notifications.getAll();
      if (res.errorCode === 200 && res.data) {
        setHistory(res.data);
      } else {
        setError(res.errorMessage || "Không tải được lịch sử");
      }
    } catch { setError("Lỗi kết nối server"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  function toggleChannel(key: string) {
    setSelectedChannels((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  async function handleSend() {
    if (!title.trim() || !content.trim()) {
      setError("Vui lòng điền tiêu đề và nội dung");
      return;
    }
    if (selectedChannels.length === 0) {
      setError("Vui lòng chọn ít nhất một kênh gửi");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      // Tạo 1 notification per channel (hoặc tạo 1 với channel đầu tiên - BE hiện chỉ nhận 1 channel)
      const channel = selectedChannels[0];
      const resolvedAudience = audience === "floor" ? `floor:${targetFloor}` : audience;
      if (audience === "floor" && (!targetFloor || Number(targetFloor) < 1)) {
        setError("Vui lòng nhập tầng cần gửi thông báo");
        return;
      }
      const res = await notifications.create({
        title: title.trim(),
        content: content.trim(),
        channel,
        audience: resolvedAudience,
        createdByAuthUserId: user?.userID ?? 0,
      });
      if (res.errorCode === 200) {
        setSuccess("Tạo thông báo thành công! Đang gửi...");
        setTitle("");
        setContent("");
        setSelectedChannels(["push"]);
        await fetchHistory();
      } else {
        setError(res.errorMessage || "Tạo thông báo thất bại");
      }
    } catch { setError("Lỗi kết nối server"); }
    finally { setSending(false); }
  }

  async function handleResend(id: number) {
    setSendingId(id);
    try {
      const res = await notifications.send(id);
      if (res.errorCode === 200) {
        setSuccess("Đã gửi thành công!");
        setTimeout(() => setSuccess(""), 3000);
        await fetchHistory();
      } else {
        alert(res.errorMessage || "Gửi thất bại");
      }
    } catch { alert("Lỗi kết nối"); }
    finally { setSendingId(null); }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <BellRing className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Trung Tâm <span className="text-rose-400">Thông Báo</span>
            </h1>
            <p className="text-sm text-zinc-400">Gửi và quản lý chiến dịch thông báo đa kênh</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </motion.div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-[#111] border border-white/5 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-3xl rounded-full pointer-events-none" />
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
            <Send className="w-5 h-5 text-rose-400" />
            Soạn Thông Báo
          </h2>

          <div className="space-y-5 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tiêu đề *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Thông báo bảo trì..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Đối tượng nhận</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-all appearance-none"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value} className="bg-[#111]">{a.label}</option>
                  ))}
                  <option value="floor" className="bg-[#111]">Cư dân theo tầng</option>
                </select>
              </div>
            </div>

            {audience === "floor" && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-rose-300">Gửi riêng cho cư dân tầng</label>
                    <input
                      type="number"
                      min="1"
                      value={targetFloor}
                      onChange={(e) => setTargetFloor(e.target.value)}
                      placeholder="Ví dụ: 5"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-rose-500/50"
                    />
                  </div>
                  <p className="pb-3 text-xs text-zinc-400">Hệ thống chỉ lập danh sách và gửi tới cư dân đang ở tại tầng này.</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Kênh gửi</label>
              <div className="flex flex-wrap gap-3">
                {CHANNELS.map((ch) => {
                  const selected = selectedChannels.includes(ch.key);
                  return (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => toggleChannel(ch.key)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
                        selected
                          ? "border-rose-500/40 bg-rose-500/10 text-white"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <ch.icon className={`w-4 h-4 ${selected ? "text-rose-400" : "text-zinc-500"}`} />
                      {ch.label}
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nội dung *</label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung thông báo..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => { setTitle(""); setContent(""); }}
              >
                Xoá Nháp
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all flex items-center gap-2 text-sm"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Đang gửi..." : "Gửi Ngay"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1 bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              Lịch sử gửi
            </h2>
            <span className="text-xs text-zinc-500">{history.length} mục</span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
              <BellRing className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {history.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${channelBadge(item.channel)}`}>
                      {item.channel}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-white mb-1.5 line-clamp-2 group-hover:text-rose-300 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.audience}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${statusStyle(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      {item.status === "draft" && (
                        <button
                          onClick={() => handleResend(item.id)}
                          disabled={sendingId === item.id}
                          className="text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                        >
                          {sendingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
