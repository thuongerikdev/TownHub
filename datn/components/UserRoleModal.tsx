'use client';

"use client";

import { motion, AnimatePresence } from "motion/react";
import { Users, Check, X, Loader2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { roles as rolesApi, type Role } from "@/lib/api";

interface UserRoleModalProps {
  user: { userID: number; userName: string; email: string; profile?: { firstName?: string; lastName?: string } };
  onClose: () => void;
  onSaved: () => void;
}

export default function UserRoleModal({ user, onClose, onSaved }: UserRoleModalProps) {
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "staff" | "user">("all");

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    const [allRes, userRes] = await Promise.all([
      rolesApi.getAll(),
      rolesApi.getByUser(user.userID),
    ]);

    if (allRes.errorCode === 200 && allRes.data) {
      setAllRoles(allRes.data);
    }

    if (userRes.errorCode === 200 && userRes.data) {
      setUserRoles(userRes.data);
      setSelectedRoleIds(new Set(userRes.data.map((r) => r.roleID)));
    }

    setLoading(false);
  };

  const filteredRoles = allRoles.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      r.roleName.toLowerCase().includes(q) ||
      r.roleDescription.toLowerCase().includes(q) ||
      String(r.roleID).includes(q);
    const matchScope = scopeFilter === "all" || r.scope === scopeFilter;
    return matchSearch && matchScope;
  });

  const handleToggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedRoleIds(new Set(filteredRoles.map((r) => r.roleID)));
  };

  const handleDeselectAll = () => {
    setSelectedRoleIds(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await rolesApi.assignToUser(user.userID, Array.from(selectedRoleIds));
      if (res.errorCode === 200) {
        onSaved();
        onClose();
      } else {
        alert(res.errorMessage || "Không thể gán roles");
      }
    } catch {
      alert("Lỗi kết nối server");
    } finally {
      setSaving(false);
    }
  };

  const groupedRoles = allRoles.filter((r) => r.scope === "staff").length > 0
    ? {
        "Staff Roles": allRoles.filter((r) => r.scope === "staff"),
        "User Roles": allRoles.filter((r) => r.scope === "user"),
      }
    : { "User Roles": allRoles.filter((r) => r.scope === "user") };

  const selectedCount = selectedRoleIds.size;
  const totalCount = allRoles.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Quản Lý Roles - {user.userName}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-[#111]">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">
              Đã chọn: <span className="text-amber-400 font-bold">{selectedCount}</span> / {totalCount} roles
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">
              Hiện tại: <span className="text-blue-400 font-bold">{userRoles.length}</span> roles
            </span>
          </div>
        </div>

        {/* Search & filters */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Tìm kiếm role theo tên, mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "staff", "user"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScopeFilter(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    scopeFilter === s
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-[#111] border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {s === "all" ? "Tất cả" : s === "staff" ? "Staff" : "User"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 text-xs bg-zinc-900/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/10 transition-all"
            >
              Chọn tất cả
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 text-xs bg-zinc-900/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/10 transition-all"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* Roles list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedRoles).map(([group, roles]) =>
                roles.length > 0 ? (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        group === "Staff Roles" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
                      }`}>
                        <Users className="w-3 h-3" />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-300">{group}</h3>
                      <span className="px-2 py-0.5 bg-zinc-900/5 border border-white/10 rounded-full text-xs text-zinc-500">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {roles.filter((r: any) => selectedRoleIds.has(r.roleID)).length} / {roles.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {roles.map((role: any) => {
                        const isSelected = selectedRoleIds.has(role.roleID);
                        const isAssigned = userRoles.some((r) => r.roleID === role.roleID);

                        return (
                          <button
                            key={role.roleID}
                            onClick={() => handleToggleRole(role.roleID)}
                            className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-amber-500/10 border-amber-500/40"
                                : isAssigned
                                ? "bg-blue-500/5 border-blue-500/20"
                                : "bg-[#111] border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "bg-amber-500 border-amber-500"
                                : "border-white/20"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-black" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-mono font-medium ${
                                  isSelected ? "text-amber-400" : "text-white"
                                }`}>
                                  {role.roleName}
                                </span>
                                {isAssigned && !isSelected && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400 font-medium">
                                    Đã gán
                                  </span>
                                )}
                                {role.isDefault && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400 font-medium">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-600">{role.roleDescription}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}
              {filteredRoles.length === 0 && (
                <div className="text-center py-12 text-zinc-600">
                  <p className="text-sm">Không tìm thấy role nào</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-white/5 bg-[#111] rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-zinc-900/5 border border-white/10 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-900/10 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-xl text-sm transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </div>
  );
}