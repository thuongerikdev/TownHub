"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, PackageSearch, Power, Tag, Boxes } from "lucide-react";
import { toast } from "sonner";
import {
  materials, type MaterialResponse, type MaterialCategoryResponse,
  type CreateMaterialInput, type UpdateMaterialInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockMaterials } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  ToneBadge, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/format";

interface FormState {
  materialCode: string; name: string; categoryId: string; unitOfMeasure: string;
  minStock: string; maxStock: string; reorderPoint: string; reorderQuantity: string;
  unitPrice: string; notes: string; isActive: boolean;
}
const emptyForm: FormState = {
  materialCode: "", name: "", categoryId: "", unitOfMeasure: "",
  minStock: "", maxStock: "", reorderPoint: "", reorderQuantity: "",
  unitPrice: "", notes: "", isActive: true,
};
const toNum = (s: string) => (s.trim() ? Number(s) : undefined);

export default function ItemCatalog() {
  // RBAC ở tầng giao diện: sửa danh mục vật tư là master-data → cần inventory.manage.
  // KTV chỉ có inventory.transaction (xuất/nhập kho) nên chỉ được xem danh mục.
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const q = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const list = q.items;
  // Lấy danh mục từ API (được seed sẵn) — tránh bế tắc khi chưa có vật tư nào (BUG-13).
  // Nếu API rỗng (chế độ mock) thì suy danh mục từ chính danh sách vật tư như trước.
  const catQ = useApiList<MaterialCategoryResponse>(() => materials.getCategories(), { mock: [] });

  const categories = useMemo(() => {
    if (catQ.items.length > 0) return catQ.items.map((c) => ({ id: c.id, name: c.name }));
    const seen = new Map<string, string>();
    for (const m of list) if (m.categoryId) seen.set(m.categoryId, m.categoryName ?? m.categoryId);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [catQ.items, list]);

  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<MaterialResponse | null>(null);

  const stats = useMemo(() => ({
    total: list.length,
    active: list.filter((m) => m.isActive).length,
    inactive: list.filter((m) => !m.isActive).length,
    categories: categories.length,
  }), [list, categories]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((m) => {
      if (catF !== "all" && m.categoryId !== catF) return false;
      if (!s) return true;
      return [m.materialCode, m.name, m.categoryName].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, catF]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setOpen(true);
  }
  function openEdit(m: MaterialResponse) {
    setEditing(m);
    setForm({
      materialCode: m.materialCode, name: m.name, categoryId: m.categoryId,
      unitOfMeasure: m.unitOfMeasure ?? "",
      minStock: m.minStock != null ? String(m.minStock) : "",
      maxStock: m.maxStock != null ? String(m.maxStock) : "",
      reorderPoint: m.reorderPoint != null ? String(m.reorderPoint) : "",
      reorderQuantity: m.reorderQuantity != null ? String(m.reorderQuantity) : "",
      unitPrice: m.unitPrice != null ? String(m.unitPrice) : "",
      notes: m.notes ?? "", isActive: m.isActive,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.materialCode.trim() || !form.name.trim()) { toast.error("Nhập mã và tên vật tư."); return; }
    if (!form.categoryId) { toast.error("Chọn danh mục vật tư."); return; }
    for (const [v, label] of [[form.minStock, "Tồn tối thiểu"], [form.maxStock, "Tồn tối đa"], [form.reorderPoint, "Điểm đặt lại"], [form.reorderQuantity, "SL đặt lại"], [form.unitPrice, "Đơn giá"]] as const) {
      if (v.trim() !== "" && Number(v) < 0) { toast.error(`${label} không được âm.`); return; }
    }
    const base: CreateMaterialInput = {
      materialCode: form.materialCode.trim(), name: form.name.trim(), categoryId: form.categoryId,
      unitOfMeasure: form.unitOfMeasure.trim() || undefined,
      minStock: toNum(form.minStock), maxStock: toNum(form.maxStock),
      reorderPoint: toNum(form.reorderPoint), reorderQuantity: toNum(form.reorderQuantity),
      unitPrice: toNum(form.unitPrice), notes: form.notes.trim() || undefined, isActive: form.isActive,
    };
    setSubmitting(true);
    const res = editing
      ? await materials.update({ ...base, id: editing.id } as UpdateMaterialInput)
      : await materials.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật vật tư." : "Đã thêm vật tư.");
      setOpen(false);
      q.refetch();
    } else {
      toast.error(res.errorMessage || "Lưu thất bại.");
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await materials.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá vật tư.");
      setConfirmDel(null);
      q.refetch();
    } else {
      toast.error(res.errorMessage || "Xoá thất bại.");
    }
  }

  const columns: Column<MaterialResponse>[] = [
    {
      key: "mat", header: "Vật tư", sortable: true, sortAccessor: (m) => m.materialCode,
      cell: (m) => (
        <div>
          <span className="font-mono text-xs text-muted-foreground">{m.materialCode}</span>
          <span className="block text-sm font-medium text-foreground">{m.name}</span>
        </div>
      ),
    },
    { key: "cat", header: "Danh mục", cell: (m) => <ToneBadge tone="neutral">{m.categoryName ?? "—"}</ToneBadge> },
    { key: "unit", header: "ĐVT", cell: (m) => <span className="text-muted-foreground">{m.unitOfMeasure ?? "—"}</span> },
    {
      key: "minmax", header: "Tồn min/max", align: "right",
      cell: (m) => <span className="text-sm text-foreground">{formatNumber(m.minStock)} / {m.maxStock != null ? formatNumber(m.maxStock) : "—"}</span>,
    },
    {
      key: "reorder", header: "Đặt lại", align: "right",
      cell: (m) => (
        <span className="text-xs text-muted-foreground">
          <span className="text-warning">≤{m.reorderPoint != null ? formatNumber(m.reorderPoint) : "—"}</span>
          {m.reorderQuantity != null ? ` → +${formatNumber(m.reorderQuantity)}` : ""}
        </span>
      ),
    },
    { key: "price", header: "Đơn giá TK", align: "right", sortable: true, sortAccessor: (m) => m.unitPrice ?? 0, cell: (m) => formatCurrency(m.unitPrice) },
    { key: "status", header: "Trạng thái", cell: (m) => <ToneBadge tone={m.isActive ? "success" : "neutral"} dot>{m.isActive ? "Đang dùng" : "Ngừng"}</ToneBadge> },
    {
      key: "actions", header: "", align: "right",
      cell: (m) => (
        <div className="flex items-center justify-end gap-1">
          {canManage && <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(m)}><Pencil className="size-4" /></Button>}
          {canManage && <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(m)}><Trash2 className="size-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh mục vật tư"
        description="Quản lý master-data: định mức tồn kho, điểm đặt hàng lại và đơn giá tham chiếu"
        icon={PackageSearch}
        actions={canManage ? <Button onClick={openCreate}><Plus className="size-4" /> Thêm vật tư</Button> : undefined}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng vật tư" value={stats.total} icon={Boxes} tone="brand" loading={q.loading} />
        <StatCard label="Đang dùng" value={stats.active} icon={Power} tone="success" loading={q.loading} />
        <StatCard label="Ngừng dùng" value={stats.inactive} icon={Power} tone="neutral" loading={q.loading} />
        <StatCard label="Danh mục" value={stats.categories} icon={Tag} tone="info" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm tên, mã vật tư…">
        <Select value={catF} onValueChange={setCatF}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi danh mục</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(m) => m.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Sửa vật tư" : "Thêm vật tư"}
        description={editing?.name}
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu thay đổi" : "Tạo vật tư"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã vật tư" required>
            <Input value={form.materialCode} onChange={(e) => set("materialCode", e.target.value)} placeholder="MAT-0001" />
          </Field>
          <Field label="Đơn vị tính">
            <Input value={form.unitOfMeasure} onChange={(e) => set("unitOfMeasure", e.target.value)} placeholder="cái / mét / lít" />
          </Field>
          <Field label="Tên vật tư" required className="col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cáp thép thang máy 12mm" />
          </Field>
          <Field label="Danh mục" required className="col-span-2" hint={categories.length === 0 ? "Chưa có danh mục — cần tạo danh mục trước" : undefined}>
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tồn tối thiểu">
            <Input type="number" min="0" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} placeholder="50" />
          </Field>
          <Field label="Tồn tối đa">
            <Input type="number" min="0" value={form.maxStock} onChange={(e) => set("maxStock", e.target.value)} placeholder="400" />
          </Field>
          <Field label="Điểm đặt lại">
            <Input type="number" min="0" value={form.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)} placeholder="80" />
          </Field>
          <Field label="SL đặt mỗi lần">
            <Input type="number" min="0" value={form.reorderQuantity} onChange={(e) => set("reorderQuantity", e.target.value)} placeholder="200" />
          </Field>
          <Field label="Đơn giá tham chiếu (VND)">
            <Input type="number" min="0" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} placeholder="120000" />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4">
            <div>
              <p className="text-sm font-medium text-foreground">Đang sử dụng</p>
              <p className="text-xs text-muted-foreground">Tắt để ẩn khỏi giao dịch mới</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          </div>
          <Field label="Ghi chú" className="col-span-2">
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Mô tả, đặc tính, tần suất thay thế…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá vật tư?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá vật tư <strong className="text-foreground">{confirmDel?.name}</strong>?</p>
      </EntityModal>
    </div>
  );
}
