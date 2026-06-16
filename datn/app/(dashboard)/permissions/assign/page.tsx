"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Save, RotateCcw, Loader2, Check, Minus, Search as SearchIcon,
  Shield, Users, ClipboardList, BellRing, FileText, Building2,
  Boxes, Wrench, Ticket, Package, ShoppingCart, Handshake, BarChart3,
  Briefcase, CheckCheck, Square,
} from "lucide-react";
import { toast } from "sonner";
import {
  roles as rolesApi, permissions as permApi, type Role, type Permission,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PERMISSION_CATALOG, RESOURCE_DEFS, GROUP_LABEL, metaOf, type PermGroup,
} from "@/lib/rbac";
import { PageHeader, ToneBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RESOURCE_ICON: Record<string, React.ElementType> = {
  user: Users, role: ClipboardList, permission: Shield, notification: BellRing,
  audit: FileText, apartment: Building2, resident: Users,
  asset: Boxes, workorder: Wrench, ticket: Ticket, inventory: Package,
  procurement: ShoppingCart, vendor: Handshake, report: BarChart3,
};

// ─── Mock cho chế độ xem UI khi backend offline (NEXT_PUBLIC_USE_MOCK=1) ───────
const mockRoles: Role[] = [
  { roleID: 1, roleName: "Quản trị hệ thống", roleDescription: "Toàn quyền hệ thống", isDefault: false, scope: "staff" },
  { roleID: 2, roleName: "Quản lý kỹ thuật", roleDescription: "Điều hành bảo trì & tài sản", isDefault: false, scope: "staff" },
  { roleID: 3, roleName: "Kỹ thuật viên", roleDescription: "Thực hiện công việc hiện trường", isDefault: false, scope: "staff" },
  { roleID: 4, roleName: "Thủ kho", roleDescription: "Quản lý kho vật tư", isDefault: false, scope: "staff" },
  { roleID: 5, roleName: "Cư dân", roleDescription: "Tài khoản cư dân", isDefault: true, scope: "user" },
];
const mockPermissions: Permission[] = PERMISSION_CATALOG.map((c, i) => ({
  permissionID: i + 1,
  permissionName: c.permissionName,
  permissionDescription: c.permissionDescription,
  code: c.code,
  scope: "staff",
}));

type ResGroup = { key: string; label: string; group: PermGroup; perms: Permission[] };

function CheckBox({ state }: { state: "on" | "off" | "some" }) {
  return (
    <span
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
        state === "on" && "border-brand bg-brand text-brand-foreground",
        state === "some" && "border-brand bg-brand/20 text-brand",
        state === "off" && "border-border bg-card",
      )}
    >
      {state === "on" && <Check className="size-3" />}
      {state === "some" && <Minus className="size-3" />}
    </span>
  );
}

function diffCount(a: Set<number>, b: Set<number>) {
  let n = 0;
  for (const x of a) if (!b.has(x)) n++;
  for (const x of b) if (!a.has(x)) n++;
  return n;
}

export default function AssignPermissionsPage() {
  const rolesQ = useApiList<Role>(() => rolesApi.getAll(), { mock: mockRoles });
  const permsQ = useApiList<Permission>(() => permApi.getAll(), { mock: mockPermissions });

  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [search, setSearch] = useState("");
  const [assigned, setAssigned] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preselect role từ ?role= (đọc client-side, tránh Suspense của useSearchParams)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("role");
    const id = raw ? Number(raw) : NaN;
    if (!Number.isNaN(id)) setSelectedRole(id);
  }, []);

  // Mặc định chọn vai trò đầu tiên
  useEffect(() => {
    if (selectedRole == null && rolesQ.items.length > 0) setSelectedRole(rolesQ.items[0].roleID);
  }, [rolesQ.items, selectedRole]);

  // Tải quyền hiện gán của vai trò đang chọn
  useEffect(() => {
    if (selectedRole == null) return;
    let cancelled = false;
    setLoadingPerms(true);
    permApi.getByRole(selectedRole)
      .then((res) => {
        if (cancelled) return;
        const ids = res.errorCode === 200 && res.data ? res.data.map((p) => p.permissionID) : [];
        setAssigned(new Set(ids));
        setSelected(new Set(ids));
      })
      .finally(() => { if (!cancelled) setLoadingPerms(false); });
    return () => { cancelled = true; };
  }, [selectedRole]);

  const role = rolesQ.items.find((r) => r.roleID === selectedRole) ?? null;

  const filteredRoles = useMemo(() => {
    const s = roleSearch.trim().toLowerCase();
    const list = s
      ? rolesQ.items.filter((r) => `${r.roleName} ${r.roleDescription}`.toLowerCase().includes(s))
      : rolesQ.items;
    return {
      staff: list.filter((r) => r.scope === "staff"),
      user: list.filter((r) => r.scope !== "staff"),
    };
  }, [rolesQ.items, roleSearch]);

  // Gom quyền theo Core/Module → tài nguyên (thứ tự RESOURCE_DEFS)
  const resGroups = useMemo(() => {
    const s = search.trim().toLowerCase();
    const order = RESOURCE_DEFS.map((r) => r.key);
    const byRes = new Map<string, Permission[]>();
    for (const p of permsQ.items) {
      if (s && !`${p.permissionName} ${p.code} ${p.permissionDescription}`.toLowerCase().includes(s)) continue;
      const key = metaOf(p.code).resourceKey;
      if (!byRes.has(key)) byRes.set(key, []);
      byRes.get(key)!.push(p);
    }
    const keys = [...byRes.keys()].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    const out: Record<PermGroup, ResGroup[]> = { core: [], module: [] };
    for (const k of keys) {
      const meta = metaOf(byRes.get(k)![0].code);
      out[meta.group].push({
        key: k, label: meta.resourceLabel, group: meta.group,
        perms: byRes.get(k)!.sort((a, b) => a.code.localeCompare(b.code)),
      });
    }
    return out;
  }, [permsQ.items, search]);

  const changed = diffCount(selected, assigned);
  const totalPerms = permsQ.items.length;

  function toggleOne(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function setMany(ids: number[], on: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const id of ids) { if (on) n.add(id); else n.delete(id); }
      return n;
    });
  }
  function groupState(perms: Permission[]): "on" | "off" | "some" {
    const on = perms.filter((p) => selected.has(p.permissionID)).length;
    if (on === 0) return "off";
    if (on === perms.length) return "on";
    return "some";
  }
  function groupIds(g: PermGroup): number[] {
    return resGroups[g].flatMap((r) => r.perms.map((p) => p.permissionID));
  }

  async function save() {
    if (selectedRole == null) return;
    setSaving(true);
    const res = await permApi.assignToRole(selectedRole, Array.from(selected));
    setSaving(false);
    if (res.errorCode === 200) {
      toast.success(`Đã lưu ${selected.size} quyền cho “${role?.roleName}”.`);
      setAssigned(new Set(selected));
    } else {
      toast.error(res.errorMessage || "Lưu phân quyền thất bại.");
    }
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Phân quyền theo vai trò"
        description="Chọn một vai trò rồi gán nhóm quyền (Core & Module) tương ứng"
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* ── Rail vai trò ───────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-3">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Tìm vai trò…" className="h-9 pl-8" />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {rolesQ.loading ? (
                <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
              ) : (
                <>
                  {(["staff", "user"] as const).map((sc) =>
                    filteredRoles[sc].length === 0 ? null : (
                      <div key={sc} className="mb-2">
                        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {sc === "staff" ? "Nhân sự vận hành" : "Cư dân"}
                        </p>
                        {filteredRoles[sc].map((r) => {
                          const active = r.roleID === selectedRole;
                          return (
                            <button
                              key={r.roleID}
                              onClick={() => setSelectedRole(r.roleID)}
                              className={cn(
                                "mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                                active ? "bg-brand/10 ring-1 ring-brand/30" : "hover:bg-accent/50",
                              )}
                            >
                              <div className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                active ? "bg-brand/15 text-brand" : "bg-muted text-muted-foreground",
                              )}>
                                {r.scope === "staff" ? <Briefcase className="size-4" /> : <Users className="size-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={cn("truncate text-sm font-medium", active ? "text-brand" : "text-foreground")}>{r.roleName}</p>
                                <p className="truncate text-xs text-muted-foreground">{r.roleDescription || "—"}</p>
                              </div>
                              {r.isDefault && <ToneBadge tone="warning" className="shrink-0 px-1.5">MĐ</ToneBadge>}
                            </button>
                          );
                        })}
                      </div>
                    ),
                  )}
                  {filteredRoles.staff.length === 0 && filteredRoles.user.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">Không có vai trò.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Ma trận quyền ──────────────────────────────────────────────── */}
        <div>
          {/* Thanh hành động vai trò đang chọn */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{role ? role.roleName : "Chưa chọn vai trò"}</p>
                <p className="text-xs text-muted-foreground">
                  {loadingPerms ? "Đang tải quyền…" : `Đã chọn ${selected.size}/${totalPerms} quyền${changed > 0 ? ` · ${changed} thay đổi` : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelected(new Set(assigned))} disabled={changed === 0 || saving}>
                <RotateCcw className="size-4" /> Hoàn tác
              </Button>
              <Button onClick={save} disabled={changed === 0 || saving || selectedRole == null}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu ({changed})
              </Button>
            </div>
          </div>

          {/* Tìm + chọn nhanh theo nhóm */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Lọc quyền theo tên, mã code…" className="h-9 pl-8" />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setMany(groupIds("core"), true)} disabled={resGroups.core.length === 0}>
                <CheckCheck className="size-3.5" /> Tất cả Core
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMany(groupIds("module"), true)} disabled={resGroups.module.length === 0}>
                <CheckCheck className="size-3.5" /> Tất cả Module
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
                <Square className="size-3.5" /> Bỏ chọn hết
              </Button>
            </div>
          </div>

          {permsQ.loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
          ) : (
            <div className="space-y-7">
              {(["core", "module"] as PermGroup[]).map((g) =>
                resGroups[g].length === 0 ? null : (
                  <section key={g}>
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{GROUP_LABEL[g]}</h2>
                      <ToneBadge tone={g === "core" ? "info" : "brand"}>
                        {resGroups[g].reduce((n, r) => n + r.perms.filter((p) => selected.has(p.permissionID)).length, 0)}
                        {" / "}
                        {resGroups[g].reduce((n, r) => n + r.perms.length, 0)}
                      </ToneBadge>
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {resGroups[g].map((res) => {
                        const Icon = RESOURCE_ICON[res.key] ?? Shield;
                        const st = groupState(res.perms);
                        return (
                          <div key={res.key} className="overflow-hidden rounded-xl border border-border bg-card">
                            <button
                              onClick={() => setMany(res.perms.map((p) => p.permissionID), st !== "on")}
                              className="flex w-full items-center gap-2.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/40"
                            >
                              <CheckBox state={st} />
                              <div className={cn("flex size-7 items-center justify-center rounded-lg", g === "core" ? "bg-info/15 text-info" : "bg-brand/15 text-brand")}>
                                <Icon className="size-4" />
                              </div>
                              <span className="text-sm font-semibold text-foreground">{res.label}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {res.perms.filter((p) => selected.has(p.permissionID)).length}/{res.perms.length}
                              </span>
                            </button>
                            <ul className="divide-y divide-border">
                              {res.perms.map((p) => {
                                const on = selected.has(p.permissionID);
                                const meta = metaOf(p.code);
                                const wasAssigned = assigned.has(p.permissionID);
                                return (
                                  <li key={p.permissionID}>
                                    <button
                                      onClick={() => toggleOne(p.permissionID)}
                                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/30"
                                    >
                                      <CheckBox state={on ? "on" : "off"} />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="truncate text-sm font-medium text-foreground">{meta.actionLabel || p.permissionName}</span>
                                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{p.code}</code>
                                          {wasAssigned !== on && (
                                            <ToneBadge tone={on ? "success" : "danger"} className="px-1.5">{on ? "+thêm" : "−bỏ"}</ToneBadge>
                                          )}
                                        </div>
                                        {p.permissionDescription && <p className="truncate text-xs text-muted-foreground">{p.permissionDescription}</p>}
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ),
              )}
              {resGroups.core.length === 0 && resGroups.module.length === 0 && (
                <div className="rounded-xl border border-dashed border-border py-16 text-center">
                  <Shield className="mx-auto mb-3 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Chưa có quyền nào trong danh mục. Vào <strong className="text-foreground">Danh mục quyền</strong> để khởi tạo bộ quyền chuẩn trước.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thanh lưu cố định khi có thay đổi */}
      {changed > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{changed}</strong> thay đổi chưa lưu cho vai trò <strong className="text-foreground">{role?.roleName}</strong>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelected(new Set(assigned))} disabled={saving}>
                <RotateCcw className="size-4" /> Hoàn tác
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
