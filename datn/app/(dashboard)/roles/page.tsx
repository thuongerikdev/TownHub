"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileX,
  Plus,
  Users,
  Briefcase,
  Star,
  X,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { roles, type Role } from "@/lib/api";

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
    ? <Briefcase className="w-3.5 h-3.5" />
    : <Users className="w-3.5 h-3.5" />;
}

// ─── Add Role Modal ───────────────────────────────────────────────────────────

interface AddRoleModalProps {
  onClose: () => void;
  onCreated: (role: Role) => void;
}

function AddRoleModal({ onClose, onCreated }: AddRoleModalProps) {
  const [roleName, setRoleName]           = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [isDefault, setIsDefault]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) { setError("Tên vai trò không được để trống"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await roles.add({ roleName: roleName.trim(), roleDescription: roleDescription.trim(), isDefault });
      if (res.errorCode === 200 && res.data) {
        onCreated(res.data);
        onClose();
      } else {
        setError(res.errorMessage || "Không thể thêm vai trò");
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
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Thêm vai trò mới</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Tạo một vai trò trong hệ thống</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tên vai trò <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="vd: bao_ve, ke_toan..."
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Mô tả
            </label>
            <input
              type="text"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="Mô tả vai trò..."
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div
              onClick={() => setIsDefault((v) => !v)}
              className={`w-10 h-5 rounded-full transition-all border ${
                isDefault
                  ? "bg-amber-500 border-amber-500"
                  : "bg-white/5 border-white/10"
              } relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                isDefault ? "left-5" : "left-0.5"
              }`} />
            </div>
            <div>
              <p className="text-sm text-zinc-300 font-medium">Vai trò mặc định</p>
              <p className="text-xs text-zinc-600">Tự động gán khi tạo tài khoản mới</p>
            </div>
          </label>

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
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Tạo vai trò
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  role: Role;
  onClose: () => void;
  onDeleted: (roleID: number) => void;
}

function DeleteConfirmModal({ role, onClose, onDeleted }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await roles.delete(role.roleID);
      if (res.errorCode === 200) {
        onDeleted(role.roleID);
        onClose();
      } else {
        setError(res.errorMessage || "Không thể xóa vai trò");
      }
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
            <h2 className="text-base font-bold text-white">Xóa vai trò</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Hành động này không thể hoàn tác</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400">
          Bạn có chắc muốn xóa vai trò{" "}
          <span className="text-white font-semibold font-mono">{role.roleName}</span>?
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

export default function RolesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [roleList, setRoleList] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await roles.getAll();
      if (res.errorCode === 200 && res.data) {
        setRoleList(res.data);
      } else {
        setError(res.errorMessage || "Không tải được danh sách vai trò");
      }
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleCreated = (role: Role) => setRoleList((prev) => [...prev, role]);
  const handleDeleted = (roleID: number) => setRoleList((prev) => prev.filter((r) => r.roleID !== roleID));

  const filtered = roleList.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      !q ||
      r.roleName.toLowerCase().includes(q) ||
      r.roleDescription.toLowerCase().includes(q) ||
      String(r.roleID).includes(q);
    const matchScope = scopeFilter === "all" || r.scope === scopeFilter;
    return matchSearch && matchScope;
  });

  const staffRoles = filtered.filter((r) => r.scope === "staff");
  const userRoles  = filtered.filter((r) => r.scope === "user");

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
                Quản Lý <span className="text-amber-500">Vai Trò</span>
              </h1>
              <p className="text-sm text-zinc-400 mt-1">Phân quyền và vai trò truy cập hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRoles}
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
              Thêm Vai Trò
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
              placeholder="Tìm kiếm theo tên vai trò, mô tả..."
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
            <p className="text-sm">Không tìm thấy vai trò nào</p>
          </div>
        ) : (
          <div className="space-y-6">
            {staffRoles.length > 0 && (
              <RoleSection title="Nhóm Staff" icon="staff" items={staffRoles} onDelete={setDeleteTarget} />
            )}
            {userRoles.length > 0 && (
              <RoleSection title="Nhóm User" icon="user" items={userRoles} onDelete={setDeleteTarget} />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddRoleModal
            onClose={() => setShowAddModal(false)}
            onCreated={handleCreated}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            role={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Role Section & Card ──────────────────────────────────────────────────────

function RoleSection({
  title, icon, items, onDelete,
}: {
  title: string;
  icon: "staff" | "user";
  items: Role[];
  onDelete: (role: Role) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
          icon === "staff" ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
        }`}>
          {icon === "staff" ? <Briefcase className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
        </div>
        <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
        <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-500 font-mono">
          {items.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((role) => (
          <RoleCard key={role.roleID} role={role} onDelete={onDelete} />
        ))}
      </div>
    </motion.div>
  );
}

function RoleCard({ role, onDelete }: { role: Role; onDelete: (role: Role) => void }) {
  return (
    <div className="group bg-[#111] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all hover:bg-white/2">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            role.scope === "staff"
              ? "bg-blue-500/10 border border-blue-500/20"
              : "bg-violet-500/10 border border-violet-500/20"
          }`}>
            <ScopeIcon scope={role.scope} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white font-mono text-sm group-hover:text-amber-400 transition-colors truncate">
              {role.roleName}
            </div>
            <div className="text-xs text-zinc-500 font-mono mt-0.5">#{role.roleID}</div>
          </div>
        </div>
        {role.isDefault && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-semibold shrink-0">
            <Star className="w-3 h-3" />
            Mặc định
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-400 mb-4 leading-relaxed min-h-[1.25rem]">
        {role.roleDescription || <span className="text-zinc-600 italic">Không có mô tả</span>}
      </p>

      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${scopeStyle(role.scope)}`}>
          <ScopeIcon scope={role.scope} />
          {scopeLabel(role.scope)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(role)}
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
