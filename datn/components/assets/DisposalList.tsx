"use client";

import { useMemo, useState } from "react";
import { PackageX, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  assetDisposals, assetApi,
  type AssetDisposalResponse, type AssetResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  PageHeader, DataTable, EntityModal, Field, type Column,
} from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

const DISPOSAL_TYPES = [
  { value: "SALE", label: "Nhượng bán" },
  { value: "SCRAP", label: "Thanh lý / phế thải" },
  { value: "DONATION", label: "Điều chuyển / cho tặng" },
];

export default function DisposalList() {
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [assetId, setAssetId] = useState("");
  const [disposalValue, setDisposalValue] = useState("");
  const [disposalType, setDisposalType] = useState("SALE");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const q = useApiList<AssetDisposalResponse>(() => assetDisposals.getAll());
  const assetsQ = useApiList<AssetResponse>(() => assetApi.getAll(), { enabled: creating });

  const availableAssets = useMemo(
    () => assetsQ.items.filter((a) => a.status !== "DISPOSED"),
    [assetsQ.items],
  );
  const selectedAsset = availableAssets.find((a) => a.id === assetId);
  const bookValue = selectedAsset?.bookValue ?? ((selectedAsset?.purchasePrice ?? 0) - (selectedAsset?.accumulatedDepreciation ?? 0));
  const gainLoss = (Number(disposalValue) || 0) - bookValue;

  function resetForm() {
    setAssetId(""); setDisposalValue(""); setDisposalType("SALE"); setReason(""); setNote("");
  }

  async function handleSubmit() {
    if (!assetId) { toast.error("Vui lòng chọn tài sản."); return; }
    setSubmitting(true);
    try {
      const res = await assetDisposals.create({
        assetId,
        disposalValue: Number(disposalValue) || 0,
        disposalType,
        reason: reason || undefined,
        note: note || undefined,
      });
      if (res.errorCode !== 200 || !res.data) {
        toast.error(res.errorMessage || "Tạo phiếu thanh lý thất bại.");
        return;
      }
      toast.success(`Đã thanh lý ${res.data.assetCode ?? ""} — chứng từ ${res.data.documentCode ?? ""}.`);
      setCreating(false);
      resetForm();
      q.refetch();
    } catch {
      toast.error("Lỗi kết nối khi tạo phiếu thanh lý.");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<AssetDisposalResponse>[] = [
    { key: "asset", header: "Tài sản", sortable: true, sortAccessor: (d) => d.assetCode ?? "", cell: (d) => (
      <div><span className="font-mono text-xs">{d.assetCode}</span><div className="text-xs text-muted-foreground">{d.assetName}</div></div>
    ) },
    { key: "date", header: "Ngày thanh lý", sortable: true, sortAccessor: (d) => d.disposalDate, cell: (d) => formatDate(d.disposalDate) },
    { key: "cost", header: "Nguyên giá", align: "right", cell: (d) => formatCurrency(d.originalCost) },
    { key: "acc", header: "Hao mòn luỹ kế", align: "right", cell: (d) => formatCurrency(d.accumulatedDepreciation) },
    { key: "book", header: "GT còn lại", align: "right", cell: (d) => formatCurrency(d.bookValue) },
    { key: "val", header: "GT thanh lý", align: "right", cell: (d) => formatCurrency(d.disposalValue) },
    { key: "pl", header: "Lãi / Lỗ", align: "right", sortable: true, sortAccessor: (d) => d.gainLoss, cell: (d) => (
      <span className={d.gainLoss >= 0 ? "font-medium text-success" : "font-medium text-danger"}>
        {d.gainLoss >= 0 ? "+" : ""}{formatCurrency(d.gainLoss)}
      </span>
    ) },
    { key: "doc", header: "Chứng từ", cell: (d) => <span className="font-mono text-xs text-muted-foreground">{d.documentCode}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Thanh lý tài sản"
        description="Lập phiếu thanh lý, tính lãi/lỗ và sinh chứng từ xoá sổ tài sản"
        icon={PackageX}
        actions={
          <button
            onClick={() => { resetForm(); setCreating(true); }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-brand-foreground transition hover:bg-brand/90"
          >
            <Plus className="size-4" /> Tạo phiếu thanh lý
          </button>
        }
      />

      <DataTable
        columns={columns}
        rows={q.items}
        getRowId={(d) => d.id}
        loading={q.loading}
        error={q.error}
        onRetry={q.refetch}
      />

      <EntityModal
        open={creating}
        onOpenChange={(o) => { setCreating(o); if (!o) resetForm(); }}
        title="Tạo phiếu thanh lý"
        description="Chọn tài sản và nhập giá trị thu về khi thanh lý"
        size="md"
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Thanh lý"
        submitDisabled={!assetId}
      >
        <div className="space-y-4">
          <Field label="Tài sản" required>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder={assetsQ.loading ? "Đang tải..." : "Chọn tài sản"} /></SelectTrigger>
              <SelectContent>
                {availableAssets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.assetCode} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {selectedAsset && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div><span className="text-muted-foreground">Nguyên giá:</span> <span className="font-medium">{formatCurrency(selectedAsset.purchasePrice ?? 0)}</span></div>
              <div><span className="text-muted-foreground">Hao mòn luỹ kế:</span> <span className="font-medium">{formatCurrency(selectedAsset.accumulatedDepreciation)}</span></div>
              <div><span className="text-muted-foreground">Giá trị còn lại:</span> <span className="font-medium">{formatCurrency(bookValue)}</span></div>
              <div>
                <span className="text-muted-foreground">Lãi/Lỗ dự kiến:</span>{" "}
                <span className={gainLoss >= 0 ? "font-medium text-success" : "font-medium text-danger"}>
                  {gainLoss >= 0 ? "+" : ""}{formatCurrency(gainLoss)}
                </span>
              </div>
            </div>
          )}

          <Field label="Giá trị thu về khi thanh lý (₫)">
            <Input type="number" inputMode="numeric" value={disposalValue} onChange={(e) => setDisposalValue(e.target.value)} placeholder="0" />
          </Field>

          <Field label="Hình thức">
            <Select value={disposalType} onValueChange={setDisposalType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISPOSAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Lý do">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vd: Hết khấu hao, hư hỏng không sửa được..." />
          </Field>

          <Field label="Ghi chú">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
        </div>
      </EntityModal>
    </div>
  );
}
