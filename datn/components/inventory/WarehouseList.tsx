"use client";

import { useMemo, useState } from "react";
import { Plus, Warehouse, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  warehouses, buildings,
  type WarehouseResponse, type BuildingResponse,
  type CreateWarehouseInput, type UpdateWarehouseInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockWarehouses } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field, MockBanner,
  type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface FormState { code: string; name: string; buildingId: string; }
const emptyForm: FormState = { code: "", name: "", buildingId: "" };

export default function WarehouseList() {
  // RBAC ở tầng giao diện: quản lý kho cần quyền ghi kho (admin bỏ qua).
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.transaction");

  const q = useApiList<WarehouseResponse>(() => warehouses.getAll(), { mock: mockWarehouses });
  const buildingsQ = useApiList<BuildingResponse>(() => buildings.getAll());
  const list = q.items;

  const buildingMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of buildingsQ.items) m.set(b.id, `${b.code} · ${b.name}`);
    return m;
  }, [buildingsQ.items]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<WarehouseResponse | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((w) =>
      [w.code, w.name, buildingMap.get(w.buildingId)].some((f) => f?.toLowerCase().includes(s)),
    );
  }, [list, search, buildingMap]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, buildingId: buildingsQ.items[0]?.id ?? "" });
    setOpen(true);
  }
  function openEdit(w: WarehouseResponse) {
    setEditing(w);
    setForm({ code: w.code, name: w.name, buildingId: w.buildingId });
    setOpen(true);
  }

  async function submit() {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Nhập mã và tên kho."); return; }
    if (!form.buildingId) { toast.error("Chọn toà nhà."); return; }
    // managerId/ktvOwnerId ở backend là Guid? — KHÔNG nhập tay trên form để tránh gửi
    // chuỗi tự do vào field Guid (400); giữ nguyên giá trị cũ khi cập nhật.
    const base: CreateWarehouseInput = {
      code: form.code.trim(), name: form.name.trim(), buildingId: form.buildingId,
      managerId: editing?.managerId, ktvOwnerId: editing?.ktvOwnerId,
    };
    setSubmitting(true);
    const res = editing
      ? await warehouses.update({ ...base, id: editing.id } as UpdateWarehouseInput)
      : await warehouses.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật kho." : "Đã thêm kho.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await warehouses.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá kho.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<WarehouseResponse>[] = [
    {
      key: "code", header: "Mã kho", sortable: true, sortAccessor: (w) => w.code,
      cell: (w) => <span className="font-mono text-xs text-muted-foreground">{w.code}</span>,
    },
    { key: "name", header: "Tên kho", sortable: true, sortAccessor: (w) => w.name, cell: (w) => <span className="text-sm font-medium text-foreground">{w.name}</span> },
    { key: "building", header: "Toà nhà", cell: (w) => <span className="text-muted-foreground">{buildingMap.get(w.buildingId) ?? "—"}</span> },
    {
      key: "actions", header: "", align: "right",
      cell: (w) => (
        <div className="flex items-center justify-end gap-1">
          {canManage && <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(w)}><Pencil className="size-4" /></Button>}
          {canManage && <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(w)}><Trash2 className="size-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh sách kho"
        description="Quản lý các kho vật tư theo toà nhà"
        icon={Warehouse}
        actions={canManage ? <Button onClick={openCreate}><Plus className="size-4" /> Thêm kho</Button> : undefined}
      />

      {q.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Tổng số kho" value={list.length} icon={Warehouse} tone="brand" loading={q.loading} />
        <StatCard label="Toà nhà có kho" value={new Set(list.map((w) => w.buildingId)).size} icon={Building2} tone="info" loading={q.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm kho…" />

      <DataTable columns={columns} rows={filtered} getRowId={(w) => w.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật kho" : "Thêm kho"}
        size="md"
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã kho" required>
            <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="WH-A" />
          </Field>
          <Field label="Tên kho" required>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Kho vật tư khu A" />
          </Field>
          <Field label="Toà nhà" required className="col-span-2" hint={buildingsQ.items.length === 0 ? "Chưa có toà nhà — cần khai báo toà nhà trước" : undefined}>
            <Select value={form.buildingId} onValueChange={(v) => set("buildingId", v)}>
              <SelectTrigger><SelectValue placeholder="Chọn toà nhà" /></SelectTrigger>
              <SelectContent>
                {buildingsQ.items.map((b) => <SelectItem key={b.id} value={b.id}>{b.code} · {b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá kho?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá kho <strong className="text-foreground">{confirmDel?.name}</strong>? Chỉ xoá được khi kho chưa phát sinh tồn/giao dịch.</p>
      </EntityModal>
    </div>
  );
}
