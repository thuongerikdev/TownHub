"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Layers, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  floors, buildings,
  type FloorResponse, type CreateFloorInput, type UpdateFloorInput, type BuildingResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PageHeader, DataTable, FilterBar, EntityModal, Field, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function Floors() {
  const buildingsQ = useApiList<BuildingResponse>(() => buildings.getAll());
  const [buildingFilter, setBuildingFilter] = useState<string>("");

  // Nạp tầng theo toà nhà đang chọn (mặc định toà đầu tiên khi có dữ liệu).
  const q = useApiList<FloorResponse>(
    () => floors.getAll(buildingFilter || undefined),
    { deps: [buildingFilter] },
  );
  const list = q.items;

  useEffect(() => {
    if (!buildingFilter && buildingsQ.items.length > 0) setBuildingFilter(buildingsQ.items[0].id);
  }, [buildingsQ.items, buildingFilter]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FloorResponse | null>(null);
  const [form, setForm] = useState({ buildingId: "", floorNumber: "", floorName: "", floorType: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FloorResponse | null>(null);

  const buildingName = (id: string) => buildingsQ.items.find((b) => b.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((f) => f.floorName.toLowerCase().includes(s) || String(f.floorNumber).includes(s));
  }, [list, search]);

  function openCreate() {
    setEditing(null);
    const bid = buildingFilter || buildingsQ.items[0]?.id || "";
    const nextNum = list.reduce((m, f) => Math.max(m, f.floorNumber), 0) + 1;
    setForm({ buildingId: bid, floorNumber: String(nextNum), floorName: `Tầng ${nextNum}`, floorType: "" });
    setOpen(true);
  }
  function openEdit(f: FloorResponse) {
    setEditing(f);
    setForm({ buildingId: f.buildingId, floorNumber: String(f.floorNumber), floorName: f.floorName, floorType: f.floorType ?? "" });
    setOpen(true);
  }

  async function submit() {
    if (!form.buildingId) { toast.error("Chọn toà nhà."); return; }
    if (!form.floorNumber.trim() || !form.floorName.trim()) { toast.error("Nhập số tầng và tên tầng."); return; }
    const base: CreateFloorInput = {
      buildingId: form.buildingId,
      floorNumber: Number(form.floorNumber) || 0,
      floorName: form.floorName.trim(),
      floorType: form.floorType.trim() || undefined,
    };
    setSubmitting(true);
    const res = editing
      ? await floors.update({ ...base, id: editing.id } as UpdateFloorInput)
      : await floors.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật tầng." : "Đã thêm tầng.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await floors.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá tầng.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<FloorResponse>[] = [
    { key: "num", header: "Số tầng", sortable: true, sortAccessor: (f) => f.floorNumber, align: "right", cell: (f) => <span className="font-mono text-xs">{f.floorNumber}</span> },
    { key: "name", header: "Tên tầng", sortable: true, sortAccessor: (f) => f.floorName, cell: (f) => <span className="font-medium text-foreground">{f.floorName}</span> },
    { key: "type", header: "Loại tầng", cell: (f) => <span className="text-muted-foreground">{f.floorType ?? "—"}</span> },
    { key: "building", header: "Toà nhà", cell: (f) => <span className="text-muted-foreground">{buildingName(f.buildingId)}</span> },
    {
      key: "actions", header: "", align: "right",
      cell: (f) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(f)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(f)}><Trash2 className="size-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tầng"
        description={`${list.length} tầng · ${buildingName(buildingFilter)}`}
        icon={Layers}
        actions={<Button onClick={openCreate}><Plus className="size-4" /> Thêm tầng</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger><SelectValue placeholder="Chọn toà nhà…" /></SelectTrigger>
            <SelectContent>
              {buildingsQ.items.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-48">
          <FilterBar search={search} onSearch={setSearch} placeholder="Tìm tầng…" />
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} getRowId={(f) => f.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật tầng" : "Thêm tầng"}
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <Field label="Toà nhà" required>
            <Select value={form.buildingId} onValueChange={(v) => setForm((f) => ({ ...f, buildingId: v }))}>
              <SelectTrigger><SelectValue placeholder="Chọn toà nhà…" /></SelectTrigger>
              <SelectContent>
                {buildingsQ.items.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Số tầng" required>
              <Input type="number" min={0} value={form.floorNumber} onChange={(e) => setForm((f) => ({ ...f, floorNumber: e.target.value }))} placeholder="1" />
            </Field>
            <Field label="Tên tầng" required>
              <Input value={form.floorName} onChange={(e) => setForm((f) => ({ ...f, floorName: e.target.value }))} placeholder="Tầng 1" />
            </Field>
          </div>
          <Field label="Loại tầng" hint="Ví dụ: Căn hộ, Thương mại, Hầm để xe, Kỹ thuật…">
            <Input value={form.floorType} onChange={(e) => setForm((f) => ({ ...f, floorType: e.target.value }))} placeholder="Căn hộ" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá tầng?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá <strong className="text-foreground">{confirmDel?.floorName}</strong>? Căn hộ/vị trí gắn tầng này sẽ mất liên kết.</p>
      </EntityModal>
    </div>
  );
}
