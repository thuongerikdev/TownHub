"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, PackageX, AlertTriangle, Wallet, PackageSearch } from "lucide-react";
import {
  materials, type MaterialResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockMaterials, mockInventoryLevels } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, DataTable, FilterBar, MockBanner,
  ToneBadge, type Column, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
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

// Màn "Tồn kho" chỉ ĐỌC mức tồn hiện có (on-hand đến từ giao dịch nhập/xuất).
// Việc thêm/sửa/xoá vật tư (master-data) tập trung ở màn Danh mục vật tư
// (/inventory/catalog) — tránh trùng lặp biểu mẫu như bản cũ.
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

  const [search, setSearch] = useState("");
  const [stockF, setStockF] = useState("all");

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
  ];

  return (
    <div>
      <PageHeader
        title="Kho vật tư"
        description="Mức tồn hiện có và cảnh báo đặt hàng lại"
        icon={Boxes}
        actions={<Button variant="outline" asChild><Link href="/inventory/catalog"><PackageSearch className="size-4" /> Quản lý danh mục vật tư</Link></Button>}
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
    </div>
  );
}
