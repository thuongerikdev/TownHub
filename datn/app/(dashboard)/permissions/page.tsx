"use client";

import { useMemo, useState } from "react";
import {
  Shield, Plus, Sparkles, Pencil, Trash2, Loader2, Layers,
  Users, ClipboardList, BellRing, FileText, Building2,
  Boxes, Wrench, Ticket, Package, ShoppingCart, Handshake, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { permissions as permApi, type Permission } from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PERMISSION_CATALOG, RESOURCE_DEFS, GROUP_LABEL, GROUP_DESC,
  metaOf, type PermGroup,
} from "@/lib/rbac";
import {
  PageHeader, StatCard, FilterBar, EntityModal, Field, ToneBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Mock từ catalog để xem được UI khi backend offline (NEXT_PUBLIC_USE_MOCK=1)
const mockPermissions: Permission[] = PERMISSION_CATALOG.map((c, i) => ({
  permissionID: i + 1,
  permissionName: c.permissionName,
  permissionDescription: c.permissionDescription,
  code: c.code,
  scope: "staff",
}));

const RESOURCE_ICON: Record<string, React.ElementType> = {
  user: Users, role: ClipboardList, permission: Shield, notification: BellRing,
  audit: FileText, apartment: Building2, resident: Users,
  asset: Boxes, workorder: Wrench, ticket: Ticket, inventory: Package,
  procurement: ShoppingCart, vendor: Handshake, report: BarChart3,
};

interface FormState {
  permissionID?: number;
  permissionName: string;
  code: string;
  permissionDescription: string;
}
const emptyForm: FormState = { permissionName: "", code: "", permissionDescription: "" };

export default function PermissionsPage() {
  const q = useApiList<Permission>(() => permApi.getAll(), { mock: mockPermissions });
  const list = q.items;

  const [search, setSearch] = useState("");
  const [groupF, setGroupF] = useState<"all" | PermGroup>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Permission | null>(null);
  const [seeding, setSeeding] = useState(false);

  const stats = useMemo(() => {
    const core = list.filter((p) => metaOf(p.code).group === "core").length;
    return { total: list.length, core, module: list.length - core, catalog: PERMISSION_CATALOG.length };
  }, [list]);

  const missingCount = useMemo(() => {
    const have = new Set(list.map((p) => p.code));
    return PERMISSION_CATALOG.filter((c) => !have.has(c.code)).length;
  }, [list]);

  // Gom theo nhóm (core/module) → tài nguyên, theo thứ tự RESOURCE_DEFS
  const sections = useMemo(() => {
    const s = search.trim().toLowerCase();
    const order = RESOURCE_DEFS.map((r) => r.key);
    const byRes = new Map<string, Permission[]>();
    for (const p of list) {
      if (s && !`${p.permissionName} ${p.code} ${p.permissionDescription}`.toLowerCase().includes(s)) continue;
      const key = metaOf(p.code).resourceKey;
      if (!byRes.has(key)) byRes.set(key, []);
      byRes.get(key)!.push(p);
    }
    const keys = [...byRes.keys()].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    const groups: Record<PermGroup, { key: string; label: string; perms: Permission[] }[]> = { core: [], module: [] };
    for (const k of keys) {
      const meta = metaOf(byRes.get(k)![0].code);
      if (groupF !== "all" && meta.group !== groupF) continue;
      groups[meta.group].push({ key: k, label: meta.resourceLabel, perms: byRes.get(k)!.sort((a, b) => a.code.localeCompare(b.code)) });
    }
    return groups;
  }, [list, search, groupF]);

  function openCreate() {
    setForm(emptyForm);
    setEditing(false);
    setOpen(true);
  }
  function openEdit(p: Permission) {
    setForm({ permissionID: p.permissionID, permissionName: p.permissionName, code: p.code, permissionDescription: p.permissionDescription ?? "" });
    setEditing(true);
    setOpen(true);
  }

  async function submit() {
    if (!form.permissionName.trim() || !form.code.trim()) { toast.error("Nhập tên quyền và mã code."); return; }
    setSubmitting(true);
    const res = editing
      ? await permApi.update({ permissionID: form.permissionID!, permissionName: form.permissionName.trim(), code: form.code.trim(), permissionDescription: form.permissionDescription.trim() })
      : await permApi.create({ permissionName: form.permissionName.trim(), code: form.code.trim(), permissionDescription: form.permissionDescription.trim() });
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật quyền." : "Đã tạo quyền.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Thao tác thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await permApi.delete(confirmDel.permissionID);
    if (res.errorCode === 200) { toast.success("Đã xoá quyền."); setConfirmDel(null); q.refetch(); }
    else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  async function seedCatalog() {
    const have = new Set(list.map((p) => p.code));
    const missing = PERMISSION_CATALOG.filter((c) => !have.has(c.code));
    if (missing.length === 0) { toast.success("Danh mục quyền đã đầy đủ."); return; }
    setSeeding(true);
    const results = await Promise.all(
      missing.map((c) => permApi.create({ permissionName: c.permissionName, code: c.code, permissionDescription: c.permissionDescription })),
    );
    setSeeding(false);
    const ok = results.filter((r) => r.errorCode === 200).length;
    const fail = results.length - ok;
    if (fail) toast.warning(`Đã tạo ${ok}/${results.length} quyền (lỗi ${fail}).`);
    else toast.success(`Đã khởi tạo ${ok} quyền theo danh mục chuẩn.`);
    q.refetch();
  }

  return (
    <div>
      <PageHeader
        title="Danh mục quyền (Actions)"
        description="Định nghĩa toàn bộ hành động có thể phân quyền — chia nhóm Core & Module"
        icon={Shield}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={seedCatalog} disabled={seeding || q.loading}>
              {seeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Khởi tạo danh mục chuẩn{missingCount > 0 ? ` (${missingCount})` : ""}
            </Button>
            <Button onClick={openCreate}><Plus className="size-4" /> Thêm quyền</Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng quyền" value={stats.total} icon={Shield} tone="brand" loading={q.loading} />
        <StatCard label="Nhóm Core" value={stats.core} icon={Layers} tone="info" loading={q.loading} />
        <StatCard label="Nhóm Module" value={stats.module} icon={Boxes} tone="success" loading={q.loading} />
        <StatCard label="Danh mục chuẩn" value={stats.catalog} icon={Sparkles} tone="neutral" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm theo tên, mã code, mô tả…">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5">
          {([["all", "Tất cả"], ["core", "Core"], ["module", "Module"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setGroupF(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                groupF === v ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </FilterBar>

      {q.loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {(["core", "module"] as PermGroup[]).map((g) =>
            sections[g].length === 0 ? null : (
              <section key={g}>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{GROUP_LABEL[g]}</h2>
                  <p className="text-xs text-muted-foreground">{GROUP_DESC[g]}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {sections[g].map((res) => {
                    const Icon = RESOURCE_ICON[res.key] ?? Shield;
                    return (
                      <div key={res.key} className="rounded-xl border border-border bg-card">
                        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                          <div className={`flex size-8 items-center justify-center rounded-lg ${g === "core" ? "bg-info/15 text-info" : "bg-brand/15 text-brand"}`}>
                            <Icon className="size-4" />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{res.label}</span>
                          <ToneBadge tone="neutral" className="ml-auto">{res.perms.length}</ToneBadge>
                        </div>
                        <ul className="divide-y divide-border">
                          {res.perms.map((p) => (
                            <li key={p.permissionID} className="group flex items-center gap-3 px-4 py-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-foreground">{metaOf(p.code).actionLabel || p.permissionName}</span>
                                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{p.code}</code>
                                </div>
                                {p.permissionDescription && <p className="truncate text-xs text-muted-foreground">{p.permissionDescription}</p>}
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(p)}><Pencil className="size-3.5" /></Button>
                                <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(p)}><Trash2 className="size-3.5" /></Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            ),
          )}
          {sections.core.length === 0 && sections.module.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Shield className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Chưa có quyền nào. Bấm <strong className="text-foreground">Khởi tạo danh mục chuẩn</strong> để tạo bộ quyền Core + Module.</p>
            </div>
          )}
        </div>
      )}

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa quyền" : "Thêm quyền"}
        size="md"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <Field label="Tên quyền" required>
            <Input value={form.permissionName} disabled={editing} onChange={(e) => setForm((f) => ({ ...f, permissionName: e.target.value }))} placeholder="Xem tài sản" />
            {editing && <p className="text-xs text-muted-foreground">Tên là khoá định danh — không đổi khi sửa.</p>}
          </Field>
          <Field label="Mã code" required hint="Định dạng: tài_nguyên.hành_động — vd asset.create, ticket.assign">
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="asset.create" className="font-mono" />
          </Field>
          <Field label="Mô tả">
            <Textarea rows={2} value={form.permissionDescription} onChange={(e) => setForm((f) => ({ ...f, permissionDescription: e.target.value }))} placeholder="Khai báo tài sản, gắn QR…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá quyền?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá quyền <strong className="text-foreground">{confirmDel?.permissionName}</strong> (<code className="font-mono">{confirmDel?.code}</code>)? Các vai trò đang gán quyền này sẽ mất quyền tương ứng.</p>
      </EntityModal>
    </div>
  );
}
