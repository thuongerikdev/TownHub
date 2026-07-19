"use client";

import { useMemo, useState } from "react";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildings,
  type BuildingResponse, type CreateBuildingInput, type UpdateBuildingInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PageHeader, DataTable, FilterBar, EntityModal, Field, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Buildings() {
  const q = useApiList<BuildingResponse>(() => buildings.getAll());
  const list = q.items;

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BuildingResponse | null>(null);
  const [form, setForm] = useState({ code: "", name: "", totalFloors: "", totalUnits: "", managementCompany: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<BuildingResponse | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((b) => b.name.toLowerCase().includes(s) || b.code.toLowerCase().includes(s));
  }, [list, search]);

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "", totalFloors: "", totalUnits: "", managementCompany: "" });
    setOpen(true);
  }
  function openEdit(b: BuildingResponse) {
    setEditing(b);
    setForm({
      code: b.code, name: b.name,
      totalFloors: String(b.totalFloors ?? 0), totalUnits: String(b.totalUnits ?? 0),
      managementCompany: b.managementCompany ?? "",
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Nhập mã và tên toà nhà."); return; }
    const base: CreateBuildingInput = {
      code: form.code.trim(), name: form.name.trim(),
      totalFloors: Number(form.totalFloors) || 0, totalUnits: Number(form.totalUnits) || 0,
      managementCompany: form.managementCompany.trim() || undefined,
    };
    setSubmitting(true);
    const res = editing
      ? await buildings.update({ ...base, id: editing.id } as UpdateBuildingInput)
      : await buildings.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật toà nhà." : "Đã thêm toà nhà.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await buildings.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá toà nhà.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<BuildingResponse>[] = [
    { key: "code", header: "Mã", sortable: true, sortAccessor: (b) => b.code, cell: (b) => <span className="font-mono text-xs">{b.code}</span> },
    { key: "name", header: "Tên toà nhà", sortable: true, sortAccessor: (b) => b.name, cell: (b) => <span className="font-medium text-foreground">{b.name}</span> },
    { key: "floors", header: "Số tầng", align: "right", cell: (b) => <span className="text-muted-foreground">{b.totalFloors || "—"}</span> },
    { key: "units", header: "Số căn", align: "right", cell: (b) => <span className="text-muted-foreground">{b.totalUnits || "—"}</span> },
    { key: "mgmt", header: "Đơn vị quản lý", cell: (b) => <span className="text-muted-foreground">{b.managementCompany ?? "—"}</span> },
    {
      key: "actions", header: "", align: "right",
      cell: (b) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(b)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(b)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Toà nhà"
        description={`${list.length} toà nhà`}
        icon={Building2}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm toà nhà</Button>}
      />
      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm toà nhà…" />
      <DataTable columns={columns} rows={filtered} getRowId={(b) => b.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật toà nhà" : "Thêm toà nhà"}
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã toà nhà" required>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="A" />
            </Field>
            <Field label="Tên toà nhà" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Tòa A" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Số tầng">
              <Input type="number" min={0} value={form.totalFloors} onChange={(e) => setForm((f) => ({ ...f, totalFloors: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Số căn">
              <Input type="number" min={0} value={form.totalUnits} onChange={(e) => setForm((f) => ({ ...f, totalUnits: e.target.value }))} placeholder="0" />
            </Field>
          </div>
          <Field label="Đơn vị quản lý">
            <Input value={form.managementCompany} onChange={(e) => setForm((f) => ({ ...f, managementCompany: e.target.value }))} placeholder="Ban quản lý…" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá toà nhà?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá toà nhà <strong className="text-foreground">{confirmDel?.name}</strong>? Căn hộ/vị trí đang gắn toà nhà này sẽ mất liên kết.</p>
      </EntityModal>
    </div>
  );
}
