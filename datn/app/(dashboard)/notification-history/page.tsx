"use client";

import { motion } from "motion/react";
import {
  History, Search, RefreshCw, Loader2, AlertCircle,
  FileX, Smartphone, Mail, MessageSquare, Send,
  Clock, Users, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { notifications, type NotificationResponse } from "@/lib/api";

const PAGE_SIZE = 12;

const STATUS_OPTS = [
  { value: "all",       label: "Tất cả",      color: "zinc" },
  { value: "sent",      label: "Đã gửi",      color: "emerald" },
  { value: "scheduled", label: "Đã lên lịch", color: "amber" },
  { value: "draft",     label: "Nháp",        color: "zinc" },
  { value: "failed",    label: "Thất bại",    color: "rose" },
];

function statusBadge(s: string) {
  switch (s) {
    case "sent":      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "scheduled": return "bg-amber-500/10  text-amber-400  border-amber-500/20";
    case "failed":    return "bg-rose-500/10   text-rose-400   border-rose-500/20";
    default:          return "bg-zinc-500/10   text-zinc-400   border-zinc-500/20";
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    sent: "Đã gửi", scheduled: "Đã lên lịch",
    failed: "Thất bại", draft: "Nháp", sending: "Đang gửi",
  };
  return m[s] ?? s;
}

function channelIcon(ch: string) {
  switch (ch) {
    case "push":  return <Smartphone className="w-3.5 h-3.5" />;
    case "email": return <Mail className="w-3.5 h-3.5" />;
    case "sms":   return <MessageSquare className="w-3.5 h-3.5" />;
    default:      return <Send className="w-3.5 h-3.5" />;
  }
}

function channelBadge(ch: string) {
  const m: Record<string, string> = {
    push:  "bg-rose-500/10 text-rose-400 border-rose-500/20",
    email: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    sms:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return m[ch] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
}

function audienceLabel(a: string) {
  const m: Record<string, string> = {
    all: "Tất cả cư dân", building_a: "Tòa A", building_b: "Tòa B",
    villa: "Villa", owners: "Chủ hộ", staff: "Ban Quản Lý",
  };
  return m[a] ?? a;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function NotificationHistoryPage() {
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await notifications.getAll();
      if (res.errorCode === 200 && res.data) {
        setItems(
          [...res.data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        setError(res.errorMessage || "Không tải được dữ liệu");
      }
    } catch { setError("Lỗi kết nối server"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = items.filter((n) => {
    const q = search.toLowerCase();
    const matchQ = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchS = statusFilter === "all" || n.status === statusFilter;
    return matchQ && matchS;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = STATUS_OPTS.slice(1).reduce<Record<string, number>>((acc, o) => {
    acc[o.value] = items.filter((n) => n.status === o.value).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-6 rounded-2xl border border-white/5"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <History className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Lịch Sử <span className="text-violet-400">Thông Báo</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Tra cứu toàn bộ thông báo đã tạo và gửi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 font-mono">
            {filtered.length} / {items.length} bản ghi
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Status summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: "Đã gửi",      key: "sent",      icon: CheckCircle2, color: "emerald" },
          { label: "Đã lên lịch", key: "scheduled", icon: CalendarDays, color: "amber" },
          { label: "Nháp",        key: "draft",      icon: Clock,        color: "zinc" },
          { label: "Thất bại",    key: "failed",    icon: XCircle,      color: "rose" },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => { setStatusFilter(c.key); setPage(1); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              statusFilter === c.key
                ? `bg-${c.color}-500/10 border-${c.color}-500/30`
                : "bg-white/2 border-white/5 hover:bg-white/5"
            }`}
          >
            <c.icon className={`w-4 h-4 mb-2 text-${c.color}-400`} />
            <div className="text-2xl font-bold text-white">{counts[c.key] ?? 0}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{c.label}</div>
          </button>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, nội dung..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer min-w-36"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#111]">{o.label}</option>
          ))}
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <FileX className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy thông báo nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-5 py-4 font-medium tracking-wider w-8">#</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Tiêu đề</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Kênh</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Đối tượng</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Trạng thái</th>
                  <th className="px-5 py-4 font-medium tracking-wider text-right">Người nhận</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Lên lịch</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Đã gửi lúc</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Tạo lúc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((n) => (
                  <tr key={n.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-4 text-zinc-600 font-mono text-xs">{n.id}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-white font-medium text-sm truncate max-w-52">{n.title}</p>
                        <p className="text-zinc-500 text-xs mt-0.5 truncate max-w-52">{n.content}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-semibold border ${channelBadge(n.channel)}`}>
                        {channelIcon(n.channel)}
                        {n.channel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Users className="w-3 h-3" />
                        {audienceLabel(n.audience)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge(n.status)}`}>
                        {statusLabel(n.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {n.status === "sent" ? (
                        <div className="text-xs text-right">
                          <span className="text-emerald-400 font-semibold">{n.sentCount}</span>
                          <span className="text-zinc-600"> / {n.totalRecipients}</span>
                          {n.failedCount > 0 && (
                            <span className="text-rose-400 ml-1">({n.failedCount} lỗi)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-400 whitespace-nowrap">
                        {n.scheduledAt ? fmt(n.scheduledAt) : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-400 whitespace-nowrap">
                        {n.sentAt ? fmt(n.sentAt) : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-500 whitespace-nowrap">{fmt(n.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between text-sm text-zinc-400">
            <div>
              Hiển thị{" "}
              <span className="text-white font-medium">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              trong <span className="text-white font-medium">{filtered.length}</span> bản ghi
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
