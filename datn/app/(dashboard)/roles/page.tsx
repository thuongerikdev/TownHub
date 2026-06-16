"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Shield, Plus, Pencil, Trash2, Loader2, Briefcase, Users, Star,
  ShieldCheck, UserCog, Check, Search as SearchIcon, CircleUser,
} from "lucide-react";
import { toast } from "sonner";
import {
  roles as rolesApi, users as usersApi, type Role, type UserSlim,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PageHeader, StatCard, FilterBar, EntityModal, Field, ToneBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Mock cho NEXT_PUBLIC_USE_MOCK=1 ──────────────────────────────────────────
const mockRoles: Role[] = [
  { roleID: 1, roleName: "Quản trị hệ thống", roleDescription: "Toàn quyền hệ thống", isDefault: false, scope: "staff" },
  { roleID: 2, roleName: "Quản lý kỹ thuật", roleDescription: "Điều hành bảo trì & tài sản", isDefault: false, scope: "staff" },
  { roleID: 3, roleName: "Kỹ thuật viên", roleDescription: "Thực hiện công việc hiện trường", isDefault: false, scope: "staff" },
  { roleID: 4, roleName: "Thủ kho", roleDescription: "Quản lý kho vật tư", isDefault: false, scope: "staff" },
  { roleID: 5, roleName: "Cư dân", roleDescription: "Tài khoản cư dân", isDefault: true, scope: "user" },
];
const mockUsers: UserSlim[] = [
  { userID: 1, userName: "admin", email: "admin@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Quản", lastName: "Trị" }, roles: [{ roleID: 1, roleName: "Quản trị hệ thống", roleDescription: "" }] },
  { userID: 2, userName: "ktv.nam", email: "nam@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Văn", lastName: "Nam" }, roles: [{ roleID: 3, roleName: "Kỹ thuật viên", roleDescription: "" }] },
  { userID: 3, userName: "ktv.linh", email: "linh@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Mỹ", lastName: "Linh" }, roles: [{ roleID: 3, roleName: "Kỹ thuật viên", roleDescription: "" }] },
  { userID: 4, userName: "thukho", email: "kho@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Thu", lastName: "Kho" }, roles: [{ roleID: 4, roleName: "Thủ kho", roleDescription: "" }] },
];

function fullName(u: UserSlim) {
  const n = `${u.profile?.firstName ?? ""} ${u.profile?.lastName ?? ""}`.trim();
  return n || u.userName;
}

// ─── Modal thành viên (Quản lý nhóm người dùng) ───────────────────────────────
function MembersModal({ role, onClose, onSaved }: { role: Role; onClose: () => void; onSaved: () => void }) {
  const usersQ = useApiList<UserSlim>(() => usersApi.getAllSlim(), { mock: mockUsers });
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<Set<number>>(new Set());
  const [base, setBase] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const inited = useRef(false);

  useEffect(() => {
    if (usersQ.loading || inited.current) return;
    inited.current = true;
    const init = new Set(
      usersQ.items.filter((u) => u.roles?.some((r) => r.roleID === role.roleID)).map((u) => u.userID),
    );
    setMembers(new Set(init));
    setBase(new Set(init));
  }, [usersQ.loading, usersQ.items, role.roleID]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return usersQ.items;
    return usersQ.items.filter((u) => `${fullName(u)} ${u.userName} ${u.email}`.toLowerCase().includes(s));
  }, [usersQ.items, search]);

  const changed = useMemo(
    () => usersQ.items.filter((u) => members.has(u.userID) !== base.has(u.userID)).length,
    [usersQ.items, members, base],
  );

  function toggle(id: number) {
    setMembers((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function save() {
    setSaving(true);
    const changedUsers = usersQ.items.filter((u) => members.has(u.userID) !== base.has(u.userID));
    const results = await Promise.all(
      changedUsers.map((u) => {
        const cur = (u.roles ?? []).map((r) => r.roleID);
        const next = members.has(u.userID)
          ? Array.from(new Set([...cur, role.roleID]))
          : cur.filter((id) => id !== role.roleID);
        return rolesApi.assignToUser(u.userID, next);
      }),
    );
    setSaving(false);
    const ok = results.filter((r) => r.errorCode === 200).length;
    if (ok === results.length) toast.success(`Đã cập nhật ${ok} thành viên cho “${role.roleName}”.`);
    else toast.warning(`Cập nhật ${ok}/${results.length} thành viên (có lỗi).`);
    onSaved();
    onClose();
  }

  return (
    <EntityModal
      open
      onOpenChange={(o) => !o && onClose()}
      title={<span className="flex items-center gap-2"><UserCog className="size-4 text-brand" /> Thành viên · {role.roleName}</span>}
      description="Tích chọn người dùng thuộc nhóm vai trò này"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{members.size}</strong> thành viên
            {changed > 0 && <> · <span className="text-brand">{changed} thay đổi</span></>}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
            <Button onClick={save} disabled={saving || changed === 0}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Lưu
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, username, email…" className="h-9 pl-8" />
        </div>
        {usersQ.loading ? (
          <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Không có người dùng phù hợp.</p>
        ) : (
          <ul className="max-h-[48vh] space-y-1 overflow-y-auto pr-1">
            {filtered.map((u) => {
              const on = members.has(u.userID);
              return (
                <li key={u.userID}>
                  <button
                    onClick={() => toggle(u.userID)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                      on ? "border-brand/40 bg-brand/5" : "border-border hover:bg-accent/40",
                    )}
                  >
                    <span className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border",
                      on ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card",
                    )}>
                      {on && <Check className="size-3" />}
                    </span>
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CircleUser className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{fullName(u)}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {u.roles && u.roles.length > 0 && (
                      <ToneBadge tone="neutral" className="shrink-0">{u.roles.length} vai trò</ToneBadge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </EntityModal>
  );
}

// ─── Trang chính ──────────────────────────────────────────────────────────────
interface RoleForm { roleID?: number; roleName: string; roleDescription: string; isDefault: boolean; scope: string }
const emptyRole: RoleForm = { roleName: "", roleDescription: "", isDefault: false, scope: "staff" };

export default function RolesPage() {
  const q = useApiList<Role>(() => rolesApi.getAll(), { mock: mockRoles });
  const [search, setSearch] = useState("");
  const [scopeF, setScopeF] = useState<"all" | "staff" | "user">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RoleForm>(emptyRole);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Role | null>(null);
  const [membersOf, setMembersOf] = useState<Role | null>(null);

  const stats = useMemo(() => {
    const staff = q.items.filter((r) => r.scope === "staff").length;
    return { total: q.items.length, staff, user: q.items.length - staff, def: q.items.filter((r) => r.isDefault).length };
  }, [q.items]);

  const groups = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = q.items.filter((r) => {
      const okS = !s || `${r.roleName} ${r.roleDescription}`.toLowerCase().includes(s);
      const okScope = scopeF === "all" || (r.scope ?? "user") === scopeF;
      return okS && okScope;
    });
    return {
      staff: list.filter((r) => r.scope === "staff"),
      user: list.filter((r) => r.scope !== "staff"),
    };
  }, [q.items, search, scopeF]);

  function openCreate() { setForm(emptyRole); setEditing(false); setOpen(true); }
  function openEdit(r: Role) {
    setForm({ roleID: r.roleID, roleName: r.roleName, roleDescription: r.roleDescription ?? "", isDefault: r.isDefault, scope: r.scope ?? "staff" });
    setEditing(true); setOpen(true);
  }

  async function submit() {
    if (!form.roleName.trim()) { toast.error("Nhập tên vai trò."); return; }
    setSubmitting(true);
    const res = editing
      ? await rolesApi.update({ roleID: form.roleID!, roleName: form.roleName.trim(), roleDescription: form.roleDescription.trim(), isDefault: form.isDefault })
      : await rolesApi.adminAdd({ roleName: form.roleName.trim(), roleDescription: form.roleDescription.trim(), isDefault: form.isDefault, scope: form.scope });
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật vai trò." : "Đã tạo vai trò.");
      setOpen(false); q.refetch();
    } else toast.error(res.errorMessage || "Thao tác thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await rolesApi.delete(confirmDel.roleID);
    if (res.errorCode === 200) { toast.success("Đã xoá vai trò."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  return (
    <div>
      <PageHeader
        title="Vai trò & nhóm người dùng"
        description="Mỗi vai trò là một nhóm người dùng gắn với một nhóm quyền"
        icon={Shield}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm vai trò</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng vai trò" value={stats.total} icon={Shield} tone="brand" loading={q.loading} />
        <StatCard label="Nhóm nhân sự" value={stats.staff} icon={Briefcase} tone="info" loading={q.loading} />
        <StatCard label="Nhóm cư dân" value={stats.user} icon={Users} tone="success" loading={q.loading} />
        <StatCard label="Vai trò mặc định" value={stats.def} icon={Star} tone="warning" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm vai trò theo tên, mô tả…">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5">
          {([["all", "Tất cả"], ["staff", "Nhân sự"], ["user", "Cư dân"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setScopeF(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                scopeF === v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterBar>

      {q.loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {([["staff", "Nhóm nhân sự vận hành", Briefcase], ["user", "Nhóm cư dân", Users]] as const).map(([key, label, Icon]) =>
            groups[key].length === 0 ? null : (
              <section key={key}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{label}</h2>
                  <ToneBadge tone="neutral">{groups[key].length}</ToneBadge>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groups[key].map((r) => (
                    <div key={r.roleID} className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand/30">
                      <div className="mb-3 flex items-start gap-3">
                        <div className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl",
                          r.scope === "staff" ? "bg-info/15 text-info" : "bg-success/15 text-success",
                        )}>
                          {r.scope === "staff" ? <Briefcase className="size-5" /> : <Users className="size-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">{r.roleName}</h3>
                            {r.isDefault && <ToneBadge tone="warning" className="shrink-0 gap-1 px-1.5"><Star className="size-3" /> Mặc định</ToneBadge>}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">#{r.roleID} · {r.scope === "staff" ? "Nhân sự" : "Cư dân"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(r)}><Pencil className="size-3.5" /></Button>
                          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(r)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      </div>
                      <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                        {r.roleDescription || <span className="italic text-muted-foreground/60">Không có mô tả</span>}
                      </p>
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/permissions/assign?role=${r.roleID}`}>
                            <ShieldCheck className="size-3.5" /> Nhóm quyền
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setMembersOf(r)}>
                          <UserCog className="size-3.5" /> Thành viên
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ),
          )}
          {groups.staff.length === 0 && groups.user.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Shield className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Không tìm thấy vai trò nào.</p>
            </div>
          )}
        </div>
      )}

      {/* Thêm / sửa vai trò */}
      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa vai trò" : "Thêm vai trò"}
        size="md"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <Field label="Tên vai trò" required>
            <Input value={form.roleName} onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))} placeholder="vd: Quản lý kỹ thuật" />
          </Field>
          <Field label="Mô tả">
            <Textarea rows={2} value={form.roleDescription} onChange={(e) => setForm((f) => ({ ...f, roleDescription: e.target.value }))} placeholder="Phạm vi trách nhiệm của vai trò…" />
          </Field>
          <Field label="Loại nhóm" hint={editing ? "Không đổi loại nhóm khi sửa." : "Nhân sự: tài khoản vận hành nội bộ · Cư dân: tài khoản cư dân."}>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5">
              {([["staff", "Nhân sự", Briefcase], ["user", "Cư dân", Users]] as const).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  disabled={editing}
                  onClick={() => setForm((f) => ({ ...f, scope: v }))}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                    form.scope === v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="size-4 accent-[var(--brand)]" />
            <div>
              <p className="text-sm font-medium text-foreground">Vai trò mặc định</p>
              <p className="text-xs text-muted-foreground">Tự động gán khi tạo tài khoản mới cùng loại nhóm.</p>
            </div>
          </label>
        </div>
      </EntityModal>

      {/* Xoá vai trò */}
      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá vai trò?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Xoá vai trò <strong className="text-foreground">{confirmDel?.roleName}</strong>? Người dùng đang thuộc vai trò này sẽ mất các quyền tương ứng.
        </p>
      </EntityModal>

      {/* Thành viên */}
      {membersOf && (
        <MembersModal role={membersOf} onClose={() => setMembersOf(null)} onSaved={() => { /* danh sách user tự cập nhật ở modal kế tiếp */ }} />
      )}
    </div>
  );
}
