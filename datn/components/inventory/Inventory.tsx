"use client";

import { useMemo, useState } from "react";
import { Plus, Boxes, PackageX, AlertTriangle, Wallet, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  materials, type MaterialResponse, type CreateMaterialInput, type UpdateMaterialInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockMaterials, mockInventoryLevels } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  ToneBadge, type Column, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/format";

type StockState = "out" | "low" | "ok";
const STOCK: Record<StockState, { label: string; tone: Tone }> = {
  out: { label: "Hết hàng", tone: "danger" },
  low: { label: "Sắp hết", tone: "warning" },
  ok: { label: "Đủ tồn", tone: "success" },
};
const threshold = (m: MaterialResponse) => m.reorderPoint ?? m.minStock ?? 0;
const stockState = (onHand: number, m: MaterialResponse): StockState =>
  onHand <= 0 ? "out" : onHand <= threshold(m) ? "low" : "ok";

interface FormState {
  materialCode: string; name: string; categoryId: string; unitOfMeasure: string;
  minStock: string; reorderPoint: string; reorderQuantity: string; unitPrice: string; notes: string;
}
const emptyForm: FormState = {
  materialCode: "", name: "", categoryId: "", unitOfMeasure: "",
  minStock: "", reorderPoint: "", reorderQuantity: "", unitPrice: "", notes: "",
};

export default function Inventory() {
  const q = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const levelsQ = useApiList(() => materials.getInventoryLevels(), { mock: mockInventoryLevels });
  const list = q.items;

  const onHandMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const lv of levelsQ.items) map.set(lv.materialId, (map.get(lv.materialId) ?? 0) + lv.quantityOnHand);
    return map;
  }, [levelsQ.items]);
  const onHandOf = (m: MaterialResponse) => onHandMap.get(m.id) ?? 0;

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of list) if (m.categoryId) seen.set(m.categoryId, m.categoryName ?? m.categoryId);
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [list]);

  const [search, setSearch] = useState("");
  const [stockF, setStockF] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<MaterialResponse | null>(null);

  const stats = useMemo(() => {
    let low = 0, out = 0, value = 0;
    for (const m of list) {
      const oh = onHandMap.get(m.id) ?? 0;
      const st = stockState(oh, m);
      if (st === "out") out++; else if (st === "low") low++;
      value += oh * (m.unitPrice ?? 0);
    }
    return { total: list.length, low, out, value };
  }, [list, onHandMap]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return list.filter((m) => {
      if (stockF !== "all" && stockState(onHandMap.get(m.id) ?? 0, m) !== stockF) return false;
      if (!s) return true;
      return [m.materialCode, m.name, m.categoryName].some((f) => f?.toLowerCase().includes(s));
    });
  }, [list, search, stockF, onHandMap]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(m: MaterialResponse) {
    setEditing(m);
    setForm({
      materialCode: m.materialCode, name: m.name, categoryId: m.categoryId,
      unitOfMeasure: m.unitOfMeasure ?? "", minStock: String(m.minStock ?? ""),
      reorderPoint: m.reorderPoint != null ? String(m.reorderPoint) : "",
      reorderQuantity: m.reorderQuantity != null ? String(m.reorderQuantity) : "",
      unitPrice: m.unitPrice != null ? String(m.unitPrice) : "", notes: m.notes ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.materialCode.trim() || !form.name.trim()) { toast.error("Nhập mã và tên vật tư."); return; }
    if (!form.categoryId) { toast.error("Chọn danh mục vật tư."); return; }
    const base: CreateMaterialInput = {
      materialCode: form.materialCode.trim(), name: form.name.trim(), categoryId: form.categoryId,
      unitOfMeasure: form.unitOfMeasure.trim() || undefined,
      minStock: form.minStock ? Number(form.minStock) : undefined,
      reorderPoint: form.reorderPoint ? Number(form.reorderPoint) : undefined,
      reorderQuantity: form.reorderQuantity ? Number(form.reorderQuantity) : undefined,
      unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
      notes: form.notes.trim() || undefined,
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
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await materials.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá vật tư.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<MaterialResponse>[] = [
    {
      key: "mat", header: "Vật tư", sortable: true, sortAccessor: (m) => m.materialCode,
      cell: (m) => <div><span className="font-mono text-xs text-muted-foreground">{m.materialCode}</span><span className="block text-sm font-medium text-foreground">{m.name}</span></div>,
    },
    { key: "cat", header: "Danh mục", cell: (m) => <span className="text-muted-foreground">{m.categoryName ?? "—"}</span> },
    {
      key: "onhand", header: "Tồn kho", align: "right", sortable: true, sortAccessor: (m) => onHandMap.get(m.id) ?? 0,
      cell: (m) => <span className="font-medium text-foreground">{formatNumber(onHandOf(m))} <span className="text-xs font-normal text-muted-foreground">{m.unitOfMeasure}</span></span>,
    },
    { key: "min", header: "Định mức", align: "right", cell: (m) => <span className="text-xs text-muted-foreground">tối thiểu {formatNumber(m.minStock)} · đặt lại {m.reorderPoint != null ? formatNumber(m.reorderPoint) : "—"}</span> },
    { key: "price", header: "Đơn giá", align: "right", sortable: true, sortAccessor: (m) => m.unitPrice ?? 0, cell: (m) => formatCurrency(m.unitPrice) },
    { key: "stock", header: "Trạng thái", cell: (m) => { const st = STOCK[stockState(onHandOf(m), m)]; return <ToneBadge tone={st.tone} dot>{st.label}</ToneBadge>; } },
    {
      key: "actions", header: "", align: "right",
      cell: (m) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(m)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(m)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kho vật tư"
        description="Danh mục vật tư, mức tồn và cảnh báo đặt hàng lại"
        icon={Boxes}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm vật tư</Button>}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng vật tư" value={stats.total} icon={Boxes} tone="brand" loading={q.loading} />
        <StatCard label="Sắp hết" value={stats.low} icon={AlertTriangle} tone="warning" loading={q.loading} />
        <StatCard label="Hết hàng" value={stats.out} icon={PackageX} tone="danger" loading={q.loading} />
        <StatCard label="Giá trị tồn kho" value={formatCurrency(stats.value, { compact: true })} icon={Wallet} tone="success" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm vật tư…">
        <Select value={stockF} onValueChange={setStockF}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="ok">Đủ tồn</SelectItem>
            <SelectItem value="low">Sắp hết</SelectItem>
            <SelectItem value="out">Hết hàng</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={filtered} getRowId={(m) => m.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật vật tư" : "Thêm vật tư"}
        size="lg"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã vật tư" required>
            <Input value={form.materialCode} onChange={(e) => setForm((f) => ({ ...f, materialCode: e.target.value }))} placeholder="MAT-0001" />
          </Field>
          <Field label="Đơn vị tính">
            <Input value={form.unitOfMeasure} onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))} placeholder="cái / mét / lít" />
          </Field>
          <Field label="Tên vật tư" required className="col-span-2">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cáp thép thang máy 12mm" />
          </Field>
          <Field label="Danh mục" required className="col-span-2">
            <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tồn tối thiểu">
            <Input type="number" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))} placeholder="50" />
          </Field>
          <Field label="Điểm đặt lại">
            <Input type="number" value={form.reorderPoint} onChange={(e) => setForm((f) => ({ ...f, reorderPoint: e.target.value }))} placeholder="80" />
          </Field>
          <Field label="SL đặt lại">
            <Input type="number" value={form.reorderQuantity} onChange={(e) => setForm((f) => ({ ...f, reorderQuantity: e.target.value }))} placeholder="200" />
          </Field>
          <Field label="Đơn giá (VND)">
            <Input type="number" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} placeholder="120000" />
          </Field>
          <Field label="Ghi chú" className="col-span-2">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
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
