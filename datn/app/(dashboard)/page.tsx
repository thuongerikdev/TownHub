"use client";

import { motion } from "motion/react";
import {
  Users, Building2, BellRing, AlertTriangle,
  ArrowUpRight, ArrowDownRight, TrendingUp, Activity,
  RefreshCw, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { useState, useEffect, useCallback } from "react";
import { users, apartments, notifications, auditLogs, type AuditLog } from "@/lib/api";

interface StatCard {
  title: string;
  value: string;
  change: string;
  isIncrease: boolean;
  icon: React.ElementType;
  color: string;
  shadow: string;
}

// Placeholder chart data (thực tế cần API aggregate endpoint)
const revenueData = [
  { name: "T1", total: 4.2 }, { name: "T2", total: 3.8 }, { name: "T3", total: 5.1 },
  { name: "T4", total: 4.8 }, { name: "T5", total: 6.2 }, { name: "T6", total: 7.4 },
  { name: "T7", total: 8.4 },
];
const incidentData = [
  { name: "Tuần 1", new: 15, resolved: 12 }, { name: "Tuần 2", new: 8, resolved: 10 },
  { name: "Tuần 3", new: 24, resolved: 18 }, { name: "Tuần 4", new: 12, resolved: 15 },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<StatCard[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, aptRes, notifRes, logRes] = await Promise.allSettled([
        users.getAllAdmin(),
        apartments.getAll(),
        notifications.getAll(),
        auditLogs.getAll(),
      ]);

      const totalUsers = userRes.status === "fulfilled" && userRes.value.errorCode === 200
        ? (userRes.value.data?.length ?? 0) : 0;

      const aptList = aptRes.status === "fulfilled" && aptRes.value.errorCode === 200
        ? (aptRes.value.data ?? []) : [];
      const occupiedApts = aptList.filter((a) => a.status === "occupied").length;

      const notifList = notifRes.status === "fulfilled" && notifRes.value.errorCode === 200
        ? (notifRes.value.data ?? []) : [];
      const sentNotifs = notifList.filter((n) => n.status === "sent").length;

      const logList = logRes.status === "fulfilled" && logRes.value.errorCode === 200
        ? (logRes.value.data ?? []) : [];

      setStatsData([
        {
          title: "Tổng Tài Khoản",
          value: totalUsers.toLocaleString("vi-VN"),
          change: `${totalUsers} users`,
          isIncrease: totalUsers > 0,
          icon: Users,
          color: "from-blue-500 to-blue-600",
          shadow: "shadow-blue-500/20",
        },
        {
          title: "Căn Hộ Đã Định Danh",
          value: occupiedApts.toLocaleString("vi-VN"),
          change: `/ ${aptList.length} căn`,
          isIncrease: occupiedApts > 0,
          icon: Building2,
          color: "from-emerald-500 to-emerald-600",
          shadow: "shadow-emerald-500/20",
        },
        {
          title: "Thông Báo Đã Gửi",
          value: sentNotifs.toLocaleString("vi-VN"),
          change: `/ ${notifList.length} tổng`,
          isIncrease: sentNotifs > 0,
          icon: BellRing,
          color: "from-amber-500 to-amber-600",
          shadow: "shadow-amber-500/20",
        },
        {
          title: "Hoạt Động Hệ Thống",
          value: logList.length.toLocaleString("vi-VN"),
          change: "audit logs",
          isIncrease: logList.length > 0,
          icon: AlertTriangle,
          color: "from-rose-500 to-rose-600",
          shadow: "shadow-rose-500/20",
        },
      ]);

      setRecentLogs(logList.slice(0, 8));
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const actionLabel = (action?: string): string => {
    const m: Record<string, string> = {
      Login: "Đăng nhập", LoginStaff: "Đăng nhập quản trị",
      Logout: "Đăng xuất", LogoutAll: "Đăng xuất tất cả thiết bị",
      LoginGoogle: "Đăng nhập Google", LoginMFA: "Đăng nhập MFA",
    };
    return m[action ?? ""] ?? (action ?? "Hoạt động");
  };

  const dotColor = (action?: string): string => {
    if (action?.includes("Logout")) return "bg-rose-500";
    if (action?.includes("Login")) return "bg-emerald-500";
    return "bg-amber-500";
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
            Tổng quan <span className="text-amber-500">Hệ thống</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Cập nhật lần cuối: {lastRefresh.toLocaleTimeString("vi-VN")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải..." : "Làm Mới"}
          </button>
          <button className="px-4 py-2 bg-amber-500 border border-amber-400/50 rounded-lg text-sm font-bold text-black shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] hover:bg-amber-400 transition-all flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Live Feed
          </button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 animate-pulse h-36" />
            ))
          : statsData.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden bg-[#111] border border-white/5 rounded-2xl p-6 group hover:border-white/10 transition-all"
              >
                <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 blur-2xl rounded-full group-hover:opacity-20 transition-opacity`} />
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.isIncrease ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {stat.isIncrease ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </div>
                </div>
                <p className="text-zinc-400 text-sm font-medium mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
              </motion.div>
            ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-[#111] border border-white/5 rounded-2xl p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Dòng Tiền (Revenue)
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Tỷ VNĐ — Dữ liệu mẫu</p>
            </div>
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500">
              <option>{new Date().getFullYear()}</option>
            </select>
          </div>
          <div className="flex-1 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}T`} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#fff" }} itemStyle={{ color: "#f59e0b" }} />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Side panels */}
        <div className="space-y-6 flex flex-col">
          {/* Incident chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-6"
          >
            <h2 className="text-base font-semibold text-white mb-4">Thống Kê Sự Cố</h2>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#27272a", opacity: 0.4 }} contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#fff" }} />
                  <Bar dataKey="new" name="Mới" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Đã Xử Lý" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Activity log */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-6 flex-1"
          >
            <h2 className="text-base font-semibold text-white mb-5">Hoạt Động Gần Đây</h2>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-6">Chưa có hoạt động</p>
            ) : (
              <div className="space-y-4 overflow-hidden">
                {recentLogs.map((log, index) => (
                  <div key={log.auditID} className="relative flex gap-3">
                    {index !== recentLogs.length - 1 && (
                      <div className="absolute left-1.5 top-5 bottom-[-16px] w-0.5 bg-white/5" />
                    )}
                    <div className={`relative z-10 w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${dotColor(log.action ?? "")}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">
                        {actionLabel(log.action ?? "")}
                        {log.result && <span className={`ml-1 text-[10px] ${log.result === "OK" ? "text-emerald-400" : "text-rose-400"}`}>({log.result})</span>}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                        {log.ip && ` · ${log.ip}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}