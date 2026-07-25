"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  materials, warehouses,
  type MaterialResponse, type PurchaseLineInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockMaterials, mockWarehouses } from "@/lib/mock/inventory";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Chọn danh sách vật tư (line items) cho phiếu PR/PO: mỗi dòng = 1 vật tư + kho đích (tuỳ chọn).
// Dùng chung cho màn Yêu cầu mua, Đơn hàng, tạo PR từ Ticket/Work Order.
export function MaterialLinesPicker({
  value, onChange, label = "Vật tư", compact = false,
}: {
  value: PurchaseLineInput[];
  onChange: (v: PurchaseLineInput[]) => void;
  label?: string;
  compact?: boolean;
}) {
  const matQ = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const whQ = useApiList(() => warehouses.getAll(), { mock: mockWarehouses });
  const [picking, setPicking] = useState(false);

  const matMap = useMemo(() => {
    const m = new Map<string, MaterialResponse>();
    for (const x of matQ.items) m.set(x.id, x);
    return m;
  }, [matQ.items]);

  const available = matQ.items.filter((m) => m.isActive && !value.some((l) => l.materialId === m.id));

  function add(m: MaterialResponse) { onChange([...value, { materialId: m.id }]); setPicking(false); }
  function remove(id: string) { onChange(value.filter((l) => l.materialId !== id)); }
  function setWh(id: string, wh: string) {
    onChange(value.map((l) => (l.materialId === id ? { ...l, targetWarehouseId: wh || undefined } : l)));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label} ({value.length})</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setPicking((p) => !p)} disabled={matQ.loading}>
          <Plus className="size-4" /> Thêm vật tư
        </Button>
      </div>

      {picking && (
        <div className="mb-2 max-h-52 overflow-y-auto rounded-lg border border-border">
          {available.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {matQ.items.length === 0 ? "Chưa có vật tư trong danh mục." : "Đã thêm hết vật tư khả dụng."}
            </p>
          ) : available.map((m) => (
            <button
              key={m.id} type="button" onClick={() => add(m)}
              className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-2"
            >
              <span>
                <span className="font-medium text-foreground">{m.name}</span>{" "}
                <span className="text-xs text-muted-foreground">{m.materialCode}{m.unitOfMeasure ? ` · ${m.unitOfMeasure}` : ""}</span>
              </span>
              <span className="text-xs font-semibold text-brand">+ Thêm</span>
            </button>
          ))}
        </div>
      )}

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
          Chưa chọn vật tư nào. Nhấn “Thêm vật tư”.
        </p>
      ) : (
        <div className="space-y-2">
          {value.map((l) => {
            const m = matMap.get(l.materialId);
            return (
              <div key={l.materialId} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m?.name ?? l.materialId}</p>
                  <p className="text-xs text-muted-foreground">{m?.materialCode ?? "—"}</p>
                </div>
                {!compact && (
                  <Select value={l.targetWarehouseId ?? ""} onValueChange={(v) => setWh(l.materialId, v)}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Kho đích (tuỳ chọn)" /></SelectTrigger>
                    <SelectContent>
                      {whQ.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <button type="button" onClick={() => remove(l.materialId)} className="text-muted-foreground hover:text-danger" title="Bỏ vật tư">
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
