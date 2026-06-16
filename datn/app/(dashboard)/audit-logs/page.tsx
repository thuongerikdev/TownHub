"use client";

import { motion } from "motion/react";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileX,
  Monitor,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { auditLogs, type AuditLog } from "@/lib/api";

const PAGE_SIZE = 15;

function actionStyle(action = "") {
  switch (action) {
    case "LoginStaff": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Login":      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Logout":     return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    default:           return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
}

function resultStyle(result = "") {
  return result === "OK"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border-rose-500/20";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" });
}

function parseUA(ua = "") {
  if (ua.includes("Chrome"))  return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari"))  return "Safari";
  if (ua.includes("Edge"))    return "Edge";
  return ua.slice(0, 20) || "—";
}

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await auditLogs.getAll();
      if (res.errorCode === 200 && res.data) {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLogs(sorted);
      } else {
        setError(res.errorMessage || "Không tải được audit log");
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actions = ["all", ...Array.from(new Set(logs.map((l) => l.action ?? ""))).filter(Boolean)];

  const filtered = logs.filter((l) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      String(l.userID).includes(q) ||
      (l.action ?? "").toLowerCase().includes(q) ||
      (l.result ?? "").toLowerCase().includes(q) ||
      (l.ip ?? "").toLowerCase().includes(q) ||
      (l.detail ?? "").toLowerCase().includes(q);
    const matchAction = actionFilter === "all" || l.action === actionFilter;
    const matchResult = resultFilter === "all" || l.result === resultFilter;
    return matchSearch && matchAction && matchResult;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (v: string) => { setSearchTerm(v); setPage(1); };
  const handleActionChange = (v: string) => { setActionFilter(v); setPage(1); };
  const handleResultChange = (v: string) => { setResultFilter(v); setPage(1); };

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
            <ClipboardList className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Audit <span className="text-amber-500">Log</span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Lịch sử hoạt động toàn hệ thống</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 font-mono">
            {filtered.length} bản ghi
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Tìm theo UserID, Action, IP, Detail..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => handleActionChange(e.target.value)}
          className="px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer min-w-35"
        >
          <option value="all">Tất cả Action</option>
          {actions.filter((a) => a !== "all").map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={resultFilter}
          onChange={(e) => handleResultChange(e.target.value)}
          className="px-4 py-3 bg-[#111] border border-white/10 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer min-w-32.5"
        >
          <option value="all">Tất cả Result</option>
          <option value="OK">OK</option>
          <option value="BadCode">BadCode</option>
        </select>
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
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <FileX className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy bản ghi nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-5 py-4 font-medium tracking-wider w-12">#</th>
                  <th className="px-5 py-4 font-medium tracking-wider">User</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Action</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Result</th>
                  <th className="px-5 py-4 font-medium tracking-wider">IP</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Detail</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Trình duyệt</th>
                  <th className="px-5 py-4 font-medium tracking-wider">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((log) => (
                  <tr key={log.auditID} className="hover:bg-white/2 transition-colors group">
                    <td className="px-5 py-4 text-zinc-600 font-mono text-xs">{log.auditID}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 text-xs font-bold">
                          {log.userID ?? "?"}
                        </div>
                        <span className="text-zinc-400 font-mono text-xs">UID {log.userID ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${actionStyle(log.action)}`}>
                        {log.action ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${resultStyle(log.result)}`}>
                        {log.result ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-zinc-400">{log.ip ?? "—"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-500 max-w-40 truncate block" title={log.detail ?? ""}>
                        {log.detail ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <Monitor className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs">{parseUA(log.userAgent)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-zinc-400 whitespace-nowrap">{formatTime(log.createdAt)}</span>
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
              trong số <span className="text-white font-medium">{filtered.length}</span> bản ghi
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
