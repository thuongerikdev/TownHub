'use client';

"use client";

import { motion, AnimatePresence } from "motion/react";
import { Shield, Check, X, Loader2, Search, Layers } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { permissions, type Permission } from "@/lib/api";

interface RolePermissionModalProps {
  roleID: number;
  roleName: string;
  roleDescription?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function RolePermissionModal({ roleID, roleName, roleDescription, onClose, onSaved }: RolePermissionModalProps) {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "staff" | "user">("all");

  useEffect(() => {
    loadPermissions();
  }, [roleID]);

  const loadPermissions = async () => {
    setLoading(true);

    // Load all permissions
    const allRes = await permissions.getAll();
    if (allRes.errorCode === 200 && allRes.data) {
      setAllPermissions(allRes.data);
    }

    // Load permissions assigned to this role
    const roleRes = await permissions.getByRole(roleID);
    if (roleRes.errorCode === 200 && roleRes.data) {
      const permIds = roleRes.data.map((p) => p.permissionID);
      setRolePermissionIds(permIds);
      setSelectedPermissions(new Set(permIds));
    } else {
      // Nếu không lấy được permissions của role, dùng set rỗng
      setRolePermissionIds([]);
      setSelectedPermissions(new Set());
    }

    setLoading(false);
  };

  const filteredPermissions = useMemo(() => {
    return allPermissions.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        p.permissionName.toLowerCase().includes(q) ||
        p.permissionDescription.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q);
      const matchScope = scopeFilter === "all" || p.scope === scopeFilter;
      return matchSearch && matchScope;
    });
  }, [allPermissions, searchTerm, scopeFilter]);

  const handleTogglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPermissions(new Set(filteredPermissions.map((p) => p.permissionID)));
  };

  const handleDeselectAll = () => {
    setSelectedPermissions(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await permissions.assignToRole(roleID, Array.from(selectedPermissions));
      if (res.errorCode === 200) {
        onSaved();
        onClose();
      } else {
        alert(res.errorMessage || "Không thể gán permissions");
      }
    } catch {
      alert("Lỗi kết nối server");
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {
      "Staff Permissions": [],
      "User Permissions": [],
    };

    filteredPermissions.forEach((p) => {
      if (p.scope === "staff") {
        groups["Staff Permissions"].push(p);
      } else {
        groups["User Permissions"].push(p);
      }
    });

    return groups;
  }, [filteredPermissions]);

  const staffCount = allPermissions.filter((p) => p.scope === "staff" && selectedPermissions.has(p.permissionID)).length;
  const userCount = allPermissions.filter((p) => p.scope === "user" && selectedPermissions.has(p.permissionID)).length;

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
        className="relative w-full max-w-5xl bg-[#141414] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Quản Lý Permissions - {roleName}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {roleDescription || "Chỉnh sửa permissions của vai trò này"}
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
              Đã chọn: <span className="text-amber-400 font-bold">{selectedPermissions.size}</span> / {allPermissions.length}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-blue-400">{staffCount} staff permissions</span>
            <span className="text-zinc-600">|</span>
            <span className="text-violet-400">{userCount} user permissions</span>
          </div>
        </div>

        {/* Search & filters */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Tìm kiếm permission theo tên, mã..."
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

        {/* Permissions list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([group, perms]) =>
                perms.length > 0 ? (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        group === "Staff Permissions" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
                      }`}>
                        <Layers className="w-3 h-3" />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-300">{group}</h3>
                      <span className="px-2 py-0.5 bg-zinc-900/5 border border-white/10 rounded-full text-xs text-zinc-500">
                        {perms.filter((p) => selectedPermissions.has(p.permissionID)).length} / {perms.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((perm) => {
                        const isSelected = selectedPermissions.has(perm.permissionID);
                        const isPreviouslyAssigned = rolePermissionIds.includes(perm.permissionID);

                        return (
                          <button
                            key={perm.permissionID}
                            onClick={() => handleTogglePermission(perm.permissionID)}
                            className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-amber-500/10 border-amber-500/40"
                                : isPreviouslyAssigned
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
                                  {perm.permissionName}
                                </span>
                                {isPreviouslyAssigned && !isSelected && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] text-blue-400 font-medium">
                                    Đang gán
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 mb-1">{perm.code}</p>
                              <p className="text-xs text-zinc-600">{perm.permissionDescription}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}
              {filteredPermissions.length === 0 && (
                <div className="text-center py-12 text-zinc-600">
                  <p className="text-sm">Không tìm thấy permission nào</p>
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