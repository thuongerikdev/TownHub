"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Boxes, QrCode, Pencil, Trash2, Download, AlertTriangle,
  CheckCircle2, Wrench, Copy, ScanLine, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  assetApi, assetCategories, assetLocations, assetQrCodes, buildings, floors, BUILDING_ID,
  type AssetResponse, type CreateAssetInput, type UpdateAssetInput,
  type BuildingResponse, type FloorResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockAssets, mockAssetCategories, mockAssetLocations } from "@/lib/mock/asset";
import {
  PageHeader, StatCard, DataTable, FilterBar, EntityModal, Field,
  StatusBadge, MockBanner, type Column, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, daysUntil } from "@/lib/format";

const ASSET_STATUS: Record<string, StatusDef> = {
  ACTIVE: { label: "Đang hoạt động", tone: "success" },
  MAINTENANCE: { label: "Đang bảo trì", tone: "warning" },
  INACTIVE: { label: "Ngừng hoạt động", tone: "neutral" },
  BROKEN: { label: "Hỏng hóc", tone: "danger" },
  RETIRED: { label: "Đã thanh lý", tone: "neutral" },
  DISPOSED: { label: "Đã loại bỏ", tone: "neutral" },
};
const CRITICALITY: Record<string, StatusDef> = {
  LOW: { label: "Thấp", tone: "neutral" },
  MEDIUM: { label: "Trung bình", tone: "info" },
  HIGH: { label: "Cao", tone: "warning" },
  CRITICAL: { label: "Nghiêm trọng", tone: "danger" },
};
const STATUS_OPTIONS = ["ACTIVE", "MAINTENANCE", "INACTIVE", "BROKEN", "RETIRED", "DISPOSED"];
const CRITICALITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const DEPR_OPTIONS = [
  { v: "STRAIGHT_LINE", l: "Đường thẳng" },
  { v: "DECLINING_BALANCE", l: "Số dư giảm dần" },
];

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

interface FormState {
  assetCode: string; name: string; categoryId: string; buildingId: string; floorId: string;
  locationId: string; status: string; criticalityLevel: string; serialNumber: string;
  purchasePrice: string; purchaseDate: string; warrantyExpiryDate: string;
  usefulLifeMonths: string; salvageValue: string; depreciationMethod: string; notes: string;
}
const emptyForm: FormState = {
  assetCode: "", name: "", categoryId: "", buildingId: BUILDING_ID, floorId: "", locationId: "",
  status: "ACTIVE", criticalityLevel: "MEDIUM", serialNumber: "",
  purchasePrice: "", purchaseDate: "", warrantyExpiryDate: "",
  usefulLifeMonths: "", salvageValue: "0", depreciationMethod: "STRAIGHT_LINE", notes: "",
};

function MaintenanceCell({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(iso);
  const tone = d == null ? "text-muted-foreground" : d < 0 ? "text-danger" : d <= 7 ? "text-warning" : "text-foreground";
  return (
    <div className="flex flex-col">
      <span className={tone}>{formatDate(iso)}</span>
      {d != null && d < 0 && <span className="text-[11px] text-danger">Quá hạn {Math.abs(d)} ngày</span>}
      {d != null && d >= 0 && d <= 7 && <span className="text-[11px] text-warning">Còn {d} ngày</span>}
    </div>
  );
}

export default function AssetList() {
  const router = useRouter();
  // Ẩn/hiện nút theo quyền (RBAC ở tầng giao diện) — admin được bỏ qua trong hasPermission.
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("asset.create");
  const canUpdate = hasPermission("asset.update");
  const canDelete = hasPermission("asset.delete");
  const assetsQ = useApiList<AssetResponse>(() => assetApi.getAll(), { mock: mockAssets });
  const catsQ = useApiList(() => assetCategories.getAll(), { mock: mockAssetCategories });
  const locsQ = useApiList(() => assetLocations.getAll(), { mock: mockAssetLocations });
  const buildingsQ = useApiList<BuildingResponse>(() => buildings.getAll());
  const floorsQ = useApiList<FloorResponse>(() => floors.getAll());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDel, setConfirmDel] = useState<AssetResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [qrAsset, setQrAsset] = useState<AssetResponse | null>(null);

  const assets = assetsQ.items;
  const cats = catsQ.items;
  const locs = locsQ.items;

  // Ưu tiên danh mục toà nhà từ Base (/api/building). Nếu chưa có dữ liệu thì fallback:
  // suy ra từ vị trí + tài sản sẵn có, luôn kèm toà nhà mặc định để tránh gõ GUID tay.
  const buildingOptions = useMemo(() => {
    if (buildingsQ.items.length > 0)
      return buildingsQ.items.map((b) => ({ id: b.id, label: b.name }));
    const ids = new Set<string>([BUILDING_ID]);
    for (const l of locs) if (l.buildingId) ids.add(l.buildingId);
    for (const a of assets) if (a.buildingId) ids.add(a.buildingId);
    return [...ids].map((id) => ({
      id,
      label: id === BUILDING_ID ? "Toà nhà chính" : `Toà nhà ${id.slice(0, 8)}…`,
    }));
  }, [buildingsQ.items, locs, assets]);

  // Tầng lọc theo toà nhà đang chọn.
  const floorOptions = useMemo(
    () => floorsQ.items
      .filter((f) => f.buildingId === form.buildingId)
      .sort((a, b) => a.floorNumber - b.floorNumber),
    [floorsQ.items, form.buildingId],
  );

  // Vị trí lọc theo toà nhà (và theo tầng nếu đã chọn tầng).
  const locationOptions = useMemo(
    () => locs.filter((l) => l.buildingId === form.buildingId && (!form.floorId || l.floorId === form.floorId)),
    [locs, form.buildingId, form.floorId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (categoryFilter !== "all" && a.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.assetCode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.serialNumber ?? "").toLowerCase().includes(q) ||
        (a.locationAreaCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [assets, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const by = (s: string) => assets.filter((a) => a.status === s).length;
    return {
      total: assets.length,
      active: by("ACTIVE"),
      maintenance: by("MAINTENANCE"),
      broken: by("BROKEN") + by("INACTIVE"),
    };
  }, [assets]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }
  function openEdit(a: AssetResponse) {
    setEditing(a);
    setForm({
      assetCode: a.assetCode, name: a.name, categoryId: a.categoryId, buildingId: a.buildingId,
      floorId: a.floorId ?? "", locationId: a.locationId ?? "", status: a.status, criticalityLevel: a.criticalityLevel,
      serialNumber: a.serialNumber ?? "",
      purchasePrice: a.purchasePrice?.toString() ?? "", purchaseDate: toDateInput(a.purchaseDate),
      warrantyExpiryDate: toDateInput(a.warrantyExpiryDate),
      usefulLifeMonths: a.usefulLifeMonths?.toString() ?? "",
      salvageValue: a.salvageValue?.toString() ?? "0",
      depreciationMethod: a.depreciationMethod || "STRAIGHT_LINE", notes: a.notes ?? "",
    });
    setFormOpen(true);
  }

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }
  function onBuildingChange(buildingId: string) {
    // Đổi toà nhà → bỏ tầng & vị trí cũ nếu không còn thuộc toà nhà mới.
    const keepFloor = floorsQ.items.find((f) => f.id === form.floorId)?.buildingId === buildingId;
    const keepLoc = locs.find((l) => l.id === form.locationId)?.buildingId === buildingId;
    patch({ buildingId, floorId: keepFloor ? form.floorId : "", locationId: keepLoc ? form.locationId : "" });
  }
  function onFloorChange(floorId: string) {
    // Đổi tầng → bỏ vị trí cũ nếu không thuộc tầng mới.
    const keep = locs.find((l) => l.id === form.locationId)?.floorId === floorId;
    patch({ floorId, locationId: keep ? form.locationId : "" });
  }
  function onLocationChange(locationId: string) {
    const loc = locs.find((l) => l.id === locationId);
    patch({ locationId, buildingId: loc?.buildingId ?? form.buildingId, floorId: loc?.floorId ?? form.floorId });
  }

  async function submitForm() {
    if (!form.name.trim()) { toast.error("Nhập tên tài sản."); return; }
    if (!form.categoryId) { toast.error("Chọn danh mục tài sản."); return; }
    if (!form.buildingId.trim()) { toast.error("Thiếu mã toà nhà (chọn vị trí hoặc nhập thủ công)."); return; }
    const today = new Date().toISOString().slice(0, 10);
    if (form.purchaseDate && form.purchaseDate > today) { toast.error("Ngày mua không được ở tương lai."); return; }
    if (form.purchaseDate && form.warrantyExpiryDate && form.warrantyExpiryDate < form.purchaseDate) {
      toast.error("Hết hạn bảo hành phải sau ngày mua."); return;
    }
    for (const [v, label] of [[form.purchasePrice, "Giá mua"], [form.usefulLifeMonths, "Vòng đời"], [form.salvageValue, "Giá trị thu hồi"]] as const) {
      if (v.trim() !== "" && Number(v) < 0) { toast.error(`${label} không được âm.`); return; }
    }

    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    const base: CreateAssetInput = {
      assetCode: form.assetCode.trim(), name: form.name.trim(),
      categoryId: form.categoryId, buildingId: form.buildingId.trim(),
      floorId: form.floorId || undefined,
      locationId: form.locationId || undefined,
      status: form.status, serialNumber: form.serialNumber || undefined,
      criticalityLevel: form.criticalityLevel,
      purchasePrice: num(form.purchasePrice), purchaseDate: form.purchaseDate || undefined,
      warrantyExpiryDate: form.warrantyExpiryDate || undefined,
      usefulLifeMonths: num(form.usefulLifeMonths), salvageValue: num(form.salvageValue) ?? 0,
      depreciationMethod: form.depreciationMethod, notes: form.notes || undefined,
    };

    setSubmitting(true);
    const res = editing
      ? await assetApi.update({
          ...base, id: editing.id,
          // Giữ nguyên các trường KHÔNG có trên form để tránh bị ghi đè null
          // (backend UpdateAsync ghi đè toàn bộ trường được map).
          vendorId: editing.vendorId, vendorContractId: editing.vendorContractId,
          parentAssetId: editing.parentAssetId, installationDate: editing.installationDate,
          accountCode: editing.accountCode, paymentMethod: editing.paymentMethod,
          lastMaintenanceDate: editing.lastMaintenanceDate, nextMaintenanceDate: editing.nextMaintenanceDate,
        } as UpdateAssetInput)
      : await assetApi.create(base);
    setSubmitting(false);

    if (res.errorCode === 200) {
      toast.success(editing ? "Đã cập nhật tài sản." : "Đã thêm tài sản mới.");
      setFormOpen(false);
      assetsQ.refetch();
    } else {
      toast.error(res.errorMessage || "Lưu thất bại.");
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await assetApi.delete(confirmDel.id);
    setDeleting(false);
    if (res.errorCode === 200) {
      toast.success("Đã xoá tài sản.");
      setConfirmDel(null);
      assetsQ.refetch();
    } else {
      toast.error(res.errorMessage || "Xoá thất bại.");
    }
  }

  function exportCsv() {
    const head = ["Mã", "Tên", "Danh mục", "Vị trí", "Trạng thái", "Mức độ", "Giá mua", "Giá trị còn lại"];
    const rows = filtered.map((a) => [
      a.assetCode, a.name, a.categoryName ?? "", a.locationAreaCode ?? "",
      ASSET_STATUS[a.status]?.label ?? a.status, CRITICALITY[a.criticalityLevel]?.label ?? a.criticalityLevel,
      a.purchasePrice ?? "", a.bookValue ?? "",
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tai-san-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const columns: Column<AssetResponse>[] = [
    {
      key: "asset", header: "Tài sản", sortable: true, sortAccessor: (a) => a.assetCode,
      cell: (a) => (
        <button onClick={() => router.push(`/assets/${a.id}`)} className="flex flex-col text-left">
          <span className="font-medium text-foreground hover:text-brand">{a.name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{a.assetCode}</span>
        </button>
      ),
    },
    { key: "category", header: "Danh mục", sortable: true, sortAccessor: (a) => a.categoryName ?? "", cell: (a) => a.categoryName ?? "—" },
    { key: "location", header: "Vị trí", cell: (a) => <span className="text-muted-foreground">{a.locationAreaCode ?? "—"}</span> },
    { key: "status", header: "Trạng thái", sortable: true, sortAccessor: (a) => a.status, cell: (a) => <StatusBadge value={a.status} map={ASSET_STATUS} /> },
    { key: "crit", header: "Mức độ", sortable: true, sortAccessor: (a) => a.criticalityLevel, cell: (a) => <StatusBadge value={a.criticalityLevel} map={CRITICALITY} dot={false} /> },
    { key: "next", header: "Bảo trì kế tiếp", sortable: true, sortAccessor: (a) => a.nextMaintenanceDate ?? "", cell: (a) => <MaintenanceCell iso={a.nextMaintenanceDate} /> },
    { key: "book", header: "Giá trị còn lại", align: "right", sortable: true, sortAccessor: (a) => a.bookValue ?? 0, cell: (a) => <span className="font-medium">{formatCurrency(a.bookValue)}</span> },
    {
      key: "actions", header: "", align: "right",
      cell: (a) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Xem chi tiết" onClick={() => router.push(`/assets/${a.id}`)}><Eye className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Mã QR" onClick={() => setQrAsset(a)}><QrCode className="size-4" /></Button>
          {canUpdate && <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>}
          {canDelete && <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(a)}><Trash2 className="size-4" /></Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý tài sản"
        description="Danh mục thiết bị & tài sản kỹ thuật của toà nhà"
        icon={Boxes}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/assets/scan")}><ScanLine className="size-4" /> Quét QR</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="size-4" /> Xuất CSV</Button>
            {canCreate && <Button onClick={openCreate}><Plus className="size-4" /> Thêm tài sản</Button>}
          </>
        }
      />

      {assetsQ.isMock && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tổng tài sản" value={stats.total} icon={Boxes} tone="brand" loading={assetsQ.loading} />
        <StatCard label="Đang hoạt động" value={stats.active} icon={CheckCircle2} tone="success" loading={assetsQ.loading} />
        <StatCard label="Đang bảo trì" value={stats.maintenance} icon={Wrench} tone="warning" loading={assetsQ.loading} />
        <StatCard label="Hỏng / ngừng" value={stats.broken} icon={AlertTriangle} tone="danger" loading={assetsQ.loading} />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Tìm theo tên, mã, serial, vị trí…"
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{ASSET_STATUS[s]?.label ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Danh mục" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(a) => a.id}
        loading={assetsQ.loading}
        error={assetsQ.error}
        onRetry={assetsQ.refetch}
      />

      {/* Create / Edit */}
      <EntityModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Cập nhật tài sản" : "Thêm tài sản mới"}
        description="Thông tin định danh, vị trí và tài chính của tài sản."
        size="lg"
        onSubmit={submitForm}
        submitting={submitting}
        submitLabel={editing ? "Lưu thay đổi" : "Tạo tài sản"}
      >
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thông tin chung</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mã tài sản" hint={editing ? undefined : "Hệ thống tự sinh khi lưu (AST-năm-số thứ tự)."}>
                <Input value={editing ? form.assetCode : ""} disabled readOnly placeholder="Tự động sinh khi lưu" />
              </Field>
              <Field label="Tên tài sản" required>
                <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Thang máy khách T1" />
              </Field>
              <Field label="Danh mục" required>
                <Select value={form.categoryId} onValueChange={(v) => patch({ categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Toà nhà" required>
                <Select value={form.buildingId} onValueChange={onBuildingChange}>
                  <SelectTrigger><SelectValue placeholder="Chọn toà nhà" /></SelectTrigger>
                  <SelectContent>
                    {buildingOptions.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tầng" hint={floorOptions.length === 0 ? "Toà nhà này chưa có tầng." : "Chọn tầng để lọc vị trí."}>
                <Select value={form.floorId} onValueChange={onFloorChange} disabled={!form.buildingId || floorOptions.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Chọn tầng" /></SelectTrigger>
                  <SelectContent>
                    {floorOptions.map((f) => <SelectItem key={f.id} value={f.id}>{f.floorName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Vị trí" hint={locationOptions.length === 0 ? "Chưa có vị trí phù hợp." : "Lọc theo toà nhà & tầng đã chọn."}>
                <Select value={form.locationId} onValueChange={onLocationChange} disabled={!form.buildingId}>
                  <SelectTrigger><SelectValue placeholder="Chọn vị trí" /></SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((l) => <SelectItem key={l.id} value={l.id}>{l.areaCode ?? l.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Trạng thái">
                <Select value={form.status} onValueChange={(v) => patch({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{ASSET_STATUS[s]?.label ?? s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Mức độ quan trọng">
                <Select value={form.criticalityLevel} onValueChange={(v) => patch({ criticalityLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRITICALITY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{CRITICALITY[s]?.label ?? s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Số serial">
                <Input value={form.serialNumber} onChange={(e) => patch({ serialNumber: e.target.value })} placeholder="SN-..." />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tài chính & vòng đời</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Giá mua (₫)">
                <Input type="number" min="0" value={form.purchasePrice} onChange={(e) => patch({ purchasePrice: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Ngày mua">
                <Input type="date" value={form.purchaseDate} onChange={(e) => patch({ purchaseDate: e.target.value })} />
              </Field>
              <Field label="Hết hạn bảo hành">
                <Input type="date" value={form.warrantyExpiryDate} onChange={(e) => patch({ warrantyExpiryDate: e.target.value })} />
              </Field>
              <Field label="Vòng đời (tháng)">
                <Input type="number" min="0" value={form.usefulLifeMonths} onChange={(e) => patch({ usefulLifeMonths: e.target.value })} placeholder="120" />
              </Field>
              <Field label="Giá trị thu hồi ước tính (₫)">
                <Input type="number" min="0" value={form.salvageValue} onChange={(e) => patch({ salvageValue: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Phương pháp khấu hao">
                <Select value={form.depreciationMethod} onValueChange={(v) => patch({ depreciationMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEPR_OPTIONS.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ghi chú" className="sm:col-span-2">
                <Textarea value={form.notes} onChange={(e) => patch({ notes: e.target.value })} rows={2} placeholder="Ghi chú thêm…" />
              </Field>
            </div>
          </div>
        </div>
      </EntityModal>

      {/* QR */}
      <QrDialog asset={qrAsset} onClose={() => setQrAsset(null)} />

      {/* Delete confirm */}
      <EntityModal
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Xoá tài sản?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setConfirmDel(null)} disabled={deleting}>Huỷ</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? "Đang xoá…" : "Xoá"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Bạn chắc chắn muốn xoá <strong className="text-foreground">{confirmDel?.name}</strong> ({confirmDel?.assetCode})?
          Hành động này không thể hoàn tác.
        </p>
      </EntityModal>
    </div>
  );
}

function QrDialog({ asset, onClose }: { asset: AssetResponse | null; onClose: () => void }) {
  const qrValue = asset ? `QR-${asset.assetCode}` : "";
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  // Sinh mã QR thật (PNG data URL) ngay trên trình duyệt — dán lên tài sản, quét được.
  useEffect(() => {
    let cancelled = false;
    if (!asset) { setDataUrl(null); return; }
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(qrValue, {
          width: 256, margin: 2, errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [asset, qrValue]);

  function downloadPng() {
    if (!dataUrl || !asset) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${asset.assetCode}.png`;
    a.click();
  }

  return (
    <EntityModal
      open={!!asset}
      onOpenChange={(o) => !o && onClose()}
      title="Mã QR tài sản"
      description={asset ? asset.name : ""}
      size="sm"
      footer={
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button variant="outline" onClick={downloadPng} disabled={!dataUrl}>
            <Download className="size-4" /> Tải PNG
          </Button>
          <Button
            onClick={() => { navigator.clipboard?.writeText(qrValue); toast.success("Đã sao chép mã QR."); }}
          >
            <Copy className="size-4" /> Sao chép mã
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex size-52 items-center justify-center rounded-xl border border-border bg-white p-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`Mã QR ${qrValue}`} width={208} height={208} className="size-full" />
          ) : (
            <QrCode className="size-24 animate-pulse text-muted-foreground" />
          )}
        </div>
        <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">{qrValue}</code>
        <p className="text-center text-xs text-muted-foreground">
          Dán mã này lên tài sản. Kỹ thuật viên quét ở mục <strong className="text-foreground">Quét mã QR</strong> để mở nhanh hồ sơ bảo trì.
        </p>
      </div>
    </EntityModal>
  );
}
