"use client";

import { motion, AnimatePresence } from "motion/react";
import { Shield, Search, RefreshCw, Loader2, AlertCircle, FileX, Plus, X, Trash2, Edit, Check } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { permissions, type Permission } from "@/lib/api";

function scopeStyle(scope = "") {
  return scope === "staff"
    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
    : "bg-violet-500/10 text-violet-400 border-violet-500/20";
}

function scopeLabel(scope = "") {
  return scope === "staff" ? "Staff" : "User";
}

function ScopeIcon({ scope }: { scope?: string }) {
  return scope === "staff"
    ? <Shield className="w-3.5 h-3.5" />
    : <Shield className="w-3.5 h-3.5" />;
}

// ─── Add/Edit Permission Modal ────────────────────────────────────────────────

interface PermissionModalProps {
  onClose: () => void;
  onCreated: (perm: Permission) => void;
  editData?: Permission;
}

function PermissionModal({ onClose, onCreated, editData }: PermissionModalProps) {
  const [permissionName, setPermissionName] = useState(editData?.permissionName || "");
  const [permissionDescription, setPermissionDescription] = useState(editData?.permissionDescription || "");
  const [code, setCode] = useState(editData?.code || "");
  const [scope, setScope] = useState(editData?.scope || "user");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      setPermissionName(editData.permissionName);
      setPermissionDescription(editData.permissionDescription);
      setCode(editData.code);
      setScope(editData.scope || "user");
    }
  }, [editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionName.trim() || !code.trim()) {
      setError("Tên permission và mã không được để trống");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // TODO: Implement update API
      const res = await permissions.getAll(); // Placeholder
      if (res.errorCode === 200) {
        onCreated({
          permissionID: editData?.permissionID || Math.floor(Math.random() * 1000),
          permissionName: permissionName.trim(),
          permissionDescription: permissionDescription.trim(),
          code: code.trim(),
          scope: scope as "staff" | "user",
        });
        onClose();
      } else {
        setError(res.errorMessage || "Không thể lưu permission");
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{editData ? "Sửa Permission" : "Thêm Permission"}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Tạo mới hoặc chỉnh sửa permission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tên permission <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={permissionName}
              onChange={(e) => setPermissionName(e.target.value)}
              placeholder="vd: User Read, Role Manage..."
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Mã (Code) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="vd: user.read, role.manage..."
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Mô tả
            </label>
            <input
              type="text"
              value={permissionDescription}
              onChange={(e) => setPermissionDescription(e.target.value)}
              placeholder="Mô tả permission..."
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Scope
            </label>
            <div className="flex gap-2">
              {(["user", "staff"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    scope === s
                      ? s === "staff"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : "bg-violet-500/10 border-violet-500/30 text-violet-400"
                      : "bg-[#111] border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {s === "staff" ? "Staff" : "User"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editData ? "Lưu thay đổi" : "Tạo permission"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  permission: Permission;
  onClose: () => void;
  onDeleted: (permissionID: number) => void;
}

function DeleteConfirmModal({ permission, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      // TODO: Implement delete API
      await new Promise((resolve) => setTimeout(resolve, 500)); // Placeholder
      onDeleted(permission.permissionID);
      onClose();
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Xóa Permission</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Hành động này không thể hoàn tác</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Bạn có chắc muốn xóa permission{" "}
          <span className="text-white font-semibold font-mono">{permission.permissionName}</span>?
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Xóa
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [permissionList, setPermissionList] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const [editTarget, setEditTarget] = useState<Permission | null>(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await permissions.getAll();
      if (res.errorCode === 200 && res.data) {
        setPermissionList(res.data);
      } else {
        setError(res.errorMessage || "Không tải được danh sách permissions");
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  const handleCreated = (perm: Permission) => setPermissionList((prev) => [...prev, perm]);
  const handleDeleted = (permissionID: number) => setPermissionList((prev) => prev.filter((p) => p.permissionID !== permissionID));

  const filtered = permissionList.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      p.permissionName.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.permissionDescription.toLowerCase().includes(q) ||
      String(p.permissionID).includes(q);
    const matchScope = scopeFilter === "all" || p.scope === scopeFilter;
    return matchSearch && matchScope;
  });

  const staffPermissions = filtered.filter((p) => p.scope === "staff");
  const userPermissions = filtered.filter((p) => p.scope === "user");

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-6 rounded-2xl border border-white/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Quản Lý <span className="text-amber-500">Permissions</span>
              </h1>
              <p className="text-sm text-zinc-400 mt-1">Định nghĩa và quản lý các quyền trong hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPermissions}
              disabled={loading}
              className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm Permission
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
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, mã, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "staff", "user"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScopeFilter(s)}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  scopeFilter === s
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-[#111] border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {s === "all" ? "Tất cả" : s === "staff" ? "Staff" : "User"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <FileX className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Không tìm thấy permission nào</p>
          </div>
        ) : (
          <div className="space-y-6">
            {staffPermissions.length > 0 && (
              <PermissionSection title="Nhóm Staff" icon="staff" items={staffPermissions} onDelete={setDeleteTarget} onEdit={setEditTarget} />
            )}
            {userPermissions.length > 0 && (
              <PermissionSection title="Nhóm User" icon="user" items={userPermissions} onDelete={setDeleteTarget} onEdit={setEditTarget} />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <PermissionModal
            onClose={() => setShowAddModal(false)}
            onCreated={handleCreated}
          />
        )}
        {editTarget && (
          <PermissionModal
            editData={editTarget}
            onClose={() => setEditTarget(null)}
            onCreated={handleCreated}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            permission={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Permission Section & Card ────────────────────────────────────────────────

function PermissionSection({
  title, icon, items, onDelete, onEdit,
}: {
  title: string;
  icon: "staff" | "user";
  items: Permission[];
  onDelete: (permission: Permission) => void;
  onEdit: (permission: Permission) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
          icon === "staff" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
        }`}>
          <Shield className="w-3.5 h-3.5" />
        </div>
        <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-500 font-mono">
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((perm) => (
          <PermissionCard key={perm.permissionID} permission={perm} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </div>
    </motion.div>
  );
}

function PermissionCard({ permission, onDelete, onEdit }: {
  permission: Permission;
  onDelete: (permission: Permission) => void;
  onEdit: (permission: Permission) => void;
}) {
  return (
    <div className="group bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all hover:bg-white/2">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            permission.scope === "staff"
              ? "bg-blue-500/10 border border-blue-500/20"
              : "bg-violet-500/10 border border-violet-500/20"
          }`}>
            <Shield className={`w-5 h-5 ${permission.scope === "staff" ? "text-blue-400" : "text-violet-400"}`} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white font-mono text-sm group-hover:text-amber-400 transition-colors truncate">
              {permission.permissionName}
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">{permission.code}</div>
          </div>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-4 leading-relaxed min-h-[1.25rem]">
        {permission.permissionDescription || <span className="text-zinc-600 italic">Không có mô tả</span>}
      </p>

      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${scopeStyle(permission.scope)}`}>
          <ScopeIcon scope={permission.scope} />
          {scopeLabel(permission.scope)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(permission)}
            className="px-3 py-1.5 text-xs bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-all flex items-center gap-1"
          >
            <Edit className="w-3 h-3" />
            Sửa
          </button>
          <button
            onClick={() => onDelete(permission)}
            className="px-3 py-1.5 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}