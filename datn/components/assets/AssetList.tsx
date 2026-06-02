"use client";

import { useMemo, useState } from "react";
import {
  Plus, Boxes, QrCode, Pencil, Trash2, Download, AlertTriangle,
  CheckCircle2, Wrench, Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  assetApi, assetCategories, assetLocations, assetQrCodes, BUILDING_ID,
  type AssetResponse, type CreateAssetInput, type UpdateAssetInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
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
  assetCode: string; name: string; categoryId: string; buildingId: string;
  locationId: string; status: string; criticalityLevel: string; serialNumber: string;
  purchasePrice: string; purchaseDate: string; warrantyExpiryDate: string;
  usefulLifeMonths: string; salvageValue: string; depreciationMethod: string; notes: string;
}
const emptyForm: FormState = {
  assetCode: "", name: "", categoryId: "", buildingId: BUILDING_ID, locationId: "",
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
  const assetsQ = useApiList<AssetResponse>(() => assetApi.getAll(), { mock: mockAssets });
  const catsQ = useApiList(() => assetCategories.getAll(), { mock: mockAssetCategories });
  const locsQ = useApiList(() => assetLocations.getAll(), { mock: mockAssetLocations });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [detail, setDetail] = useState<AssetResponse | null>(null);
  const [confirmDel, setConfirmDel] = useState<AssetResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [qrAsset, setQrAsset] = useState<AssetResponse | null>(null);

  const assets = assetsQ.items;
  const cats = catsQ.items;
  const locs = locsQ.items;

  // Toà nhà là tham chiếu cross-service (không có endpoint riêng) → suy ra từ dữ liệu
  // đã có (vị trí + tài sản) và luôn kèm toà nhà mặc định để tránh phải gõ GUID tay.
  const buildingOptions = useMemo(() => {
    const ids = new Set<string>([BUILDING_ID]);
    for (const l of locs) if (l.buildingId) ids.add(l.buildingId);
    for (const a of assets) if (a.buildingId) ids.add(a.buildingId);
    return [...ids].map((id) => ({
      id,
      label: id === BUILDING_ID ? "Toà nhà chính" : `Toà nhà ${id.slice(0, 8)}…`,
    }));
  }, [locs, assets]);

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
      locationId: a.locationId ?? "", status: a.status, criticalityLevel: a.criticalityLevel,
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
  function onLocationChange(locationId: string) {
    const loc = locs.find((l) => l.id === locationId);
    patch({ locationId, buildingId: loc?.buildingId ?? form.buildingId });
  }

  async function submitForm() {
    if (!form.assetCode.trim() || !form.name.trim()) { toast.error("Nhập mã và tên tài sản."); return; }
    if (!form.categoryId) { toast.error("Chọn danh mục tài sản."); return; }
    if (!form.buildingId.trim()) { toast.error("Thiếu mã toà nhà (chọn vị trí hoặc nhập thủ công)."); return; }

    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    const base: CreateAssetInput = {
      assetCode: form.assetCode.trim(), name: form.name.trim(),
      categoryId: form.categoryId, buildingId: form.buildingId.trim(),
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
      ? await assetApi.update({ ...base, id: editing.id } as UpdateAssetInput)
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
        <button onClick={() => setDetail(a)} className="flex flex-col text-left">
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
          <Button variant="ghost" size="icon" title="Mã QR" onClick={() => setQrAsset(a)}><QrCode className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(a)}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" title="Xoá" className="text-danger hover:text-danger" onClick={() => setConfirmDel(a)}><Trash2 className="size-4" /></Button>
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
            <Button variant="outline" onClick={exportCsv}><Download className="size-4" /> Xuất CSV</Button>
            <Button onClick={openCreate}><Plus className="size-4" /> Thêm tài sản</Button>
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
              <Field label="Mã tài sản" required>
                <Input value={form.assetCode} onChange={(e) => patch({ assetCode: e.target.value })} placeholder="AST-2025-0001" />
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
              <Field label="Vị trí">
                <Select value={form.locationId} onValueChange={onLocationChange}>
                  <SelectTrigger><SelectValue placeholder="Chọn vị trí" /></SelectTrigger>
                  <SelectContent>
                    {locs.map((l) => <SelectItem key={l.id} value={l.id}>{l.areaCode ?? l.id}</SelectItem>)}
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
              <Field label="Toà nhà" required hint="Tự điền theo vị trí đã chọn.">
                <Select value={form.buildingId} onValueChange={(v) => patch({ buildingId: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn toà nhà" /></SelectTrigger>
                  <SelectContent>
                    {buildingOptions.map((b) => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tài chính & vòng đời</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Giá mua (₫)">
                <Input type="number" value={form.purchasePrice} onChange={(e) => patch({ purchasePrice: e.target.value })} placeholder="0" />
              </Field>
              <Field label="Ngày mua">
                <Input type="date" value={form.purchaseDate} onChange={(e) => patch({ purchaseDate: e.target.value })} />
              </Field>
              <Field label="Hết hạn bảo hành">
                <Input type="date" value={form.warrantyExpiryDate} onChange={(e) => patch({ warrantyExpiryDate: e.target.value })} />
              </Field>
              <Field label="Vòng đời (tháng)">
                <Input type="number" value={form.usefulLifeMonths} onChange={(e) => patch({ usefulLifeMonths: e.target.value })} placeholder="120" />
              </Field>
              <Field label="Giá trị thanh lý (₫)">
                <Input type="number" value={form.salvageValue} onChange={(e) => patch({ salvageValue: e.target.value })} placeholder="0" />
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

      {/* Detail */}
      <EntityModal
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        title={detail?.name ?? ""}
        description={detail ? `Mã: ${detail.assetCode}` : ""}
        size="lg"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button>
            {detail && <Button onClick={() => { const a = detail; setDetail(null); openEdit(a); }}><Pencil className="size-4" /> Sửa</Button>}
          </div>
        }
      >
        {detail && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <DetailRow label="Trạng thái"><StatusBadge value={detail.status} map={ASSET_STATUS} /></DetailRow>
            <DetailRow label="Mức độ"><StatusBadge value={detail.criticalityLevel} map={CRITICALITY} dot={false} /></DetailRow>
            <DetailRow label="Danh mục">{detail.categoryName ?? "—"}</DetailRow>
            <DetailRow label="Vị trí">{detail.locationAreaCode ?? "—"}</DetailRow>
            <DetailRow label="Số serial">{detail.serialNumber ?? "—"}</DetailRow>
            <DetailRow label="Nhà cung cấp">{detail.vendorName ?? "—"}</DetailRow>
            <DetailRow label="Giá mua">{formatCurrency(detail.purchasePrice)}</DetailRow>
            <DetailRow label="Giá trị còn lại">{formatCurrency(detail.bookValue)}</DetailRow>
            <DetailRow label="Khấu hao luỹ kế">{formatCurrency(detail.accumulatedDepreciation)}</DetailRow>
            <DetailRow label="Giá trị thanh lý">{formatCurrency(detail.salvageValue)}</DetailRow>
            <DetailRow label="Ngày mua">{formatDate(detail.purchaseDate)}</DetailRow>
            <DetailRow label="Hết hạn bảo hành">{formatDate(detail.warrantyExpiryDate)}</DetailRow>
            <DetailRow label="Bảo trì gần nhất">{formatDate(detail.lastMaintenanceDate)}</DetailRow>
            <DetailRow label="Bảo trì kế tiếp">{formatDate(detail.nextMaintenanceDate)}</DetailRow>
            {detail.notes && <DetailRow label="Ghi chú" className="col-span-2">{detail.notes}</DetailRow>}
          </div>
        )}
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

function DetailRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-foreground">{children}</div>
    </div>
  );
}

function QrDialog({ asset, onClose }: { asset: AssetResponse | null; onClose: () => void }) {
  const qrValue = asset ? `QR-${asset.assetCode}` : "";
  return (
    <EntityModal
      open={!!asset}
      onOpenChange={(o) => !o && onClose()}
      title="Mã QR tài sản"
      description={asset ? asset.name : ""}
      size="sm"
      footer={
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button
            onClick={() => { navigator.clipboard?.writeText(qrValue); toast.success("Đã sao chép mã QR."); }}
          >
            <Copy className="size-4" /> Sao chép mã
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="flex size-44 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40">
          <QrCode className="size-24 text-muted-foreground" />
        </div>
        <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">{qrValue}</code>
        <p className="text-center text-xs text-muted-foreground">
          Dán mã này lên tài sản. Kỹ thuật viên quét để mở nhanh hồ sơ bảo trì.
        </p>
      </div>
    </EntityModal>
  );
}
