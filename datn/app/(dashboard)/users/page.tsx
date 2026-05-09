"use client";

import { motion } from "motion/react";
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
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { users, type GetUserResponse } from "@/lib/api";

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

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [userList, setUserList] = useState<GetUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await users.getAll();
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
  }, []);

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
            <p className="text-sm text-zinc-400 mt-1">Hệ thống phân quyền & danh sách người dùng</p>
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
          <button className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Thêm Mới
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
                        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-zinc-400 font-semibold text-sm uppercase">
                          {fullName(user).charAt(0)}
                        </div>
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
    </div>
  );
}
