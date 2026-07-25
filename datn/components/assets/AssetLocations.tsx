"use client";

import { useMemo, useState } from "react";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  assetLocations, assetApi, buildings, floors, BUILDING_ID,
  type AssetLocationResponse, type CreateAssetLocationInput, type UpdateAssetLocationInput,
  type AssetResponse, type BuildingResponse, type FloorResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import {
  PageHeader, DataTable, FilterBar, EntityModal, Field, MockBanner, type Column,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AssetLocations() {
  const q = useApiList<AssetLocationResponse>(() => assetLocations.getAll());
  const assetsQ = useApiList<AssetResponse>(() => assetApi.getAll());
  const buildingsQ = useApiList<BuildingResponse>(() => buildings.getAll());
  const floorsQ = useApiList<FloorResponse>(() => floors.getAll());
  const locs = q.items;

  // Vị trí là dữ liệu nền — KTV chỉ được xem (backend gác asset.create/update/delete).
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("asset.create");
  const canUpdate = hasPermission("asset.update");
  const canDelete = hasPermission("asset.delete");

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetLocationResponse | null>(null);
  const [form, setForm] = useState({ buildingId: BUILDING_ID, floorId: "", areaCode: "" });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<AssetLocationResponse | null>(null);

  // Ưu tiên danh mục toà nhà từ Base (/api/building). Nếu chưa có dữ liệu (chưa chạy
  // script tạo bảng) thì fallback: suy ra từ dữ liệu sẵn có + toà nhà mặc định.
  // Luôn lưu buildingId (Guid) cross-service, không nối FK.
  const buildingOptions = useMemo(() => {
    if (buildingsQ.items.length > 0)
      return buildingsQ.items.map((b) => ({ id: b.id, label: b.name }));
    const ids = new Set<string>([BUILDING_ID]);
    for (const l of locs) if (l.buildingId) ids.add(l.buildingId);
    for (const a of assetsQ.items) if (a.buildingId) ids.add(a.buildingId);
    return [...ids].map((id) => ({
      id,
      label: id === BUILDING_ID ? "Toà nhà chính" : `Toà nhà ${id.slice(0, 8)}…`,
    }));
  }, [buildingsQ.items, locs, assetsQ.items]);

  const buildingLabel = (id: string) =>
    buildingOptions.find((b) => b.id === id)?.label ?? `Toà nhà ${id.slice(0, 8)}…`;

  // Tầng lọc theo toà nhà đang chọn trong form.
  const floorOptions = useMemo(
    () => floorsQ.items
      .filter((f) => f.buildingId === form.buildingId)
      .sort((a, b) => a.floorNumber - b.floorNumber),
    [floorsQ.items, form.buildingId],
  );
  const floorLabel = (id?: string) => floorsQ.items.find((f) => f.id === id)?.floorName ?? "—";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return locs;
    return locs.filter((l) => (l.areaCode ?? "").toLowerCase().includes(s) || buildingLabel(l.buildingId).toLowerCase().includes(s));
  }, [locs, search, buildingOptions]);

  function openCreate() {
    setEditing(null);
    setForm({ buildingId: buildingOptions[0]?.id ?? BUILDING_ID, floorId: "", areaCode: "" });
    setOpen(true);
  }
  function openEdit(l: AssetLocationResponse) {
    setEditing(l);
    setForm({ buildingId: l.buildingId, floorId: l.floorId ?? "", areaCode: l.areaCode ?? "" });
    setOpen(true);
  }
  function onBuildingChange(buildingId: string) {
    // Đổi toà nhà → bỏ tầng cũ nếu không thuộc toà nhà mới.
    const keep = floorsQ.items.find((f) => f.id === form.floorId)?.buildingId === buildingId;
    setForm((f) => ({ ...f, buildingId, floorId: keep ? f.floorId : "" }));
  }

  async function submit() {
    if (!form.buildingId) { toast.error("Chọn toà nhà."); return; }
    if (!form.areaCode.trim()) { toast.error("Nhập khu vực / vị trí."); return; }
    const base: CreateAssetLocationInput = {
      buildingId: form.buildingId, floorId: form.floorId || undefined,
      areaCode: form.areaCode.trim() || undefined,
    };
    setSubmitting(true);
    const res = editing
      ? await assetLocations.update({ ...base, id: editing.id } as UpdateAssetLocationInput)
      : await assetLocations.create(base);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật vị trí." : "Đã thêm vị trí.");
      setOpen(false);
      q.refetch();
    } else toast.error(res.errorMessage || "Lưu thất bại.");
  }

  async function doDelete() {
    if (!confirmDel) return;
    const res = await assetLocations.delete(confirmDel.id);
    if (res.errorCode === 200) {
      toast.success("Đã xoá vị trí.");
      setConfirmDel(null);
      q.refetch();
    } else toast.error(res.errorMessage || "Xoá thất bại.");
  }

  const columns: Column<AssetLocationResponse>[] = [
    { key: "area", header: "Khu vực / Vị trí", sortable: true, sortAccessor: (l) => l.areaCode ?? "", cell: (l) => <span className="font-medium text-foreground">{l.areaCode ?? "—"}</span> },
    { key: "building", header: "Toà nhà", cell: (l) => <span className="text-muted-foreground">{buildingLabel(l.buildingId)}</span> },
    { key: "floor", header: "Tầng", cell: (l) => <span className="text-muted-foreground">{floorLabel(l.floorId)}</span> },
    ...(canUpdate || canDelete ? [{
      key: "actions", header: "", align: "right",
      cell: (l: AssetLocationResponse) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(l)}><Pencil className="size-4" /></Button>}
          {canDelete && <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(l)}><Trash2 className="size-4" /></Button>}
        </div>
      ),
    } as Column<AssetLocationResponse>] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Vị trí tài sản"
        description={`${locs.length} vị trí`}
        icon={MapPin}
        actions={canCreate ? <Button onClick={openCreate}><Plus className="size-4" /> Thêm vị trí</Button> : undefined}
      />
      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm vị trí…" />
      <DataTable columns={columns} rows={filtered} getRowId={(l) => l.id} loading={q.loading} error={q.error} onRetry={q.refetch} />

      <EntityModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Cập nhật vị trí" : "Thêm vị trí"}
        onSubmit={submit}
        submitting={submitting}
        submitLabel={editing ? "Lưu" : "Tạo"}
      >
        <div className="space-y-4">
          <Field label="Toà nhà" required>
            <Select value={form.buildingId} onValueChange={onBuildingChange}>
              <SelectTrigger><SelectValue placeholder="Chọn toà nhà…" /></SelectTrigger>
              <SelectContent>
                {buildingOptions.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tầng" hint={floorOptions.length === 0 ? "Toà nhà này chưa có tầng nào." : "Chọn tầng thuộc toà nhà đã chọn."}>
            <Select value={form.floorId} onValueChange={(v) => setForm((f) => ({ ...f, floorId: v }))} disabled={!form.buildingId || floorOptions.length === 0}>
              <SelectTrigger><SelectValue placeholder="Chọn tầng…" /></SelectTrigger>
              <SelectContent>
                {floorOptions.map((f) => <SelectItem key={f.id} value={f.id}>{f.floorName}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Khu vực / Vị trí" required hint="Ví dụ: Khu A, Phòng kỹ thuật, Sảnh thang máy…">
            <Input value={form.areaCode} onChange={(e) => setForm((f) => ({ ...f, areaCode: e.target.value }))} placeholder="Tầng 3 - Khu A" />
          </Field>
        </div>
      </EntityModal>

      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá vị trí?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete}>Xoá</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Xoá vị trí <strong className="text-foreground">{confirmDel?.areaCode ?? "này"}</strong>?</p>
      </EntityModal>
    </div>
  );
}
