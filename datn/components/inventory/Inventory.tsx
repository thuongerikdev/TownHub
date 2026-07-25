"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, PackageX, AlertTriangle, Wallet, PackageSearch, Warehouse } from "lucide-react";
import {
  materials, type MaterialResponse, type InventoryLevelResponse,
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

// Một dòng tồn kho = tồn của MỘT vật tư trong MỘT kho (đến từ InventoryLevel),
// được bổ sung thông tin master (danh mục, định mức, đơn giá) từ danh mục vật tư.
type StockRow = InventoryLevelResponse & {
  categoryName?: string;
  minStock: number;
  reorderPoint?: number;
  unitPrice?: number;
};
const threshold = (r: StockRow) => r.reorderPoint ?? r.minStock ?? 0;
const stockState = (r: StockRow): StockState =>
  r.quantityOnHand <= 0 ? "out" : r.quantityOnHand <= threshold(r) ? "low" : "ok";

// Màn "Tồn kho" chỉ ĐỌC mức tồn hiện có (on-hand đến từ giao dịch nhập/xuất),
// hiển thị THEO TỪNG KHO — mỗi vật tư có thể xuất hiện ở nhiều kho với số lượng khác nhau.
// Việc thêm/sửa/xoá vật tư (master-data) tập trung ở màn Danh mục vật tư (/inventory/catalog).
export default function Inventory() {
  const matQ = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const levelsQ = useApiList<InventoryLevelResponse>(() => materials.getInventoryLevels(), { mock: mockInventoryLevels });

  // Tra cứu thông tin master theo materialId để bổ sung cho từng dòng tồn kho.
  const materialMap = useMemo(() => {
    const m = new Map<string, MaterialResponse>();
    for (const mat of matQ.items) m.set(mat.id, mat);
    return m;
  }, [matQ.items]);

  const rows: StockRow[] = useMemo(() =>
    levelsQ.items.map((lv) => {
      const mat = materialMap.get(lv.materialId);
      return {
        ...lv,
        unitOfMeasure: lv.unitOfMeasure ?? mat?.unitOfMeasure,
        categoryName: mat?.categoryName,
        minStock: mat?.minStock ?? 0,
        reorderPoint: mat?.reorderPoint,
        unitPrice: mat?.unitPrice,
      };
    }),
  [levelsQ.items, materialMap]);

  // Danh sách kho (suy ra từ chính dữ liệu tồn kho) cho bộ lọc.
  const warehouseOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const lv of levelsQ.items) if (lv.warehouseId) m.set(lv.warehouseId, lv.warehouseName ?? lv.warehouseId);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [levelsQ.items]);

  const [search, setSearch] = useState("");
  const [stockF, setStockF] = useState("all");
  const [whF, setWhF] = useState("all");

  const stats = useMemo(() => {
    let low = 0, out = 0, value = 0;
    const mats = new Set<string>();
    for (const r of rows) {
      mats.add(r.materialId);
      const st = stockState(r);
      if (st === "out") out++; else if (st === "low") low++;
      value += r.quantityOnHand * (r.unitPrice ?? 0);
    }
    return { materials: mats.size, low, out, value };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (whF !== "all" && r.warehouseId !== whF) return false;
        if (stockF !== "all" && stockState(r) !== stockF) return false;
        if (!s) return true;
        return [r.materialCode, r.materialName, r.warehouseName, r.categoryName]
          .some((f) => f?.toLowerCase().includes(s));
      })
      // Gom các kho của cùng một vật tư nằm cạnh nhau.
      .sort((a, b) =>
        (a.materialCode ?? "").localeCompare(b.materialCode ?? "", "vi") ||
        (a.warehouseName ?? "").localeCompare(b.warehouseName ?? "", "vi"));
  }, [rows, search, stockF, whF]);

  const columns: Column<StockRow>[] = [
    {
      key: "mat", header: "Vật tư", sortable: true, sortAccessor: (r) => r.materialCode ?? "",
      cell: (r) => <div><span className="font-mono text-xs text-muted-foreground">{r.materialCode}</span><span className="block text-sm font-medium text-foreground">{r.materialName}</span></div>,
    },
    {
      key: "wh", header: "Kho", sortable: true, sortAccessor: (r) => r.warehouseName ?? "",
      cell: (r) => <span className="inline-flex items-center gap-1.5 text-sm text-foreground"><Warehouse className="size-3.5 text-muted-foreground" />{r.warehouseName ?? "—"}</span>,
    },
    { key: "cat", header: "Danh mục", cell: (r) => <span className="text-muted-foreground">{r.categoryName ?? "—"}</span> },
    {
      key: "onhand", header: "Tồn tại kho", align: "right", sortable: true, sortAccessor: (r) => r.quantityOnHand,
      cell: (r) => <span className="font-medium text-foreground">{formatNumber(r.quantityOnHand)} <span className="text-xs font-normal text-muted-foreground">{r.unitOfMeasure}</span></span>,
    },
    { key: "min", header: "Định mức", align: "right", cell: (r) => <span className="text-xs text-muted-foreground">tối thiểu {formatNumber(r.minStock)} · đặt lại {r.reorderPoint != null ? formatNumber(r.reorderPoint) : "—"}</span> },
    { key: "price", header: "Đơn giá", align: "right", sortable: true, sortAccessor: (r) => r.unitPrice ?? 0, cell: (r) => formatCurrency(r.unitPrice) },
    { key: "stock", header: "Trạng thái", cell: (r) => { const st = STOCK[stockState(r)]; return <ToneBadge tone={st.tone} dot>{st.label}</ToneBadge>; } },
  ];

  return (
    <div>
      <PageHeader
        title="Kho vật tư"
        description="Mức tồn theo từng kho và cảnh báo đặt hàng lại"
        icon={Boxes}
        actions={<Button variant="outline" asChild><Link href="/inventory/catalog"><PackageSearch className="size-4" /> Quản lý danh mục vật tư</Link></Button>}
      />

      {(levelsQ.isMock || matQ.isMock) && <MockBanner />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Vật tư có tồn" value={stats.materials} icon={Boxes} tone="brand" loading={levelsQ.loading} />
        <StatCard label="Sắp hết (theo kho)" value={stats.low} icon={AlertTriangle} tone="warning" loading={levelsQ.loading} />
        <StatCard label="Hết hàng (theo kho)" value={stats.out} icon={PackageX} tone="danger" loading={levelsQ.loading} />
        <StatCard label="Giá trị tồn kho" value={formatCurrency(stats.value, { compact: true })} icon={Wallet} tone="success" loading={levelsQ.loading} />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Tìm vật tư hoặc kho…">
        <Select value={whF} onValueChange={setWhF}>
          <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Mọi kho" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi kho</SelectItem>
            {warehouseOptions.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
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

      <DataTable columns={columns} rows={filtered} getRowId={(r) => r.id} loading={levelsQ.loading} error={levelsQ.error} onRetry={levelsQ.refetch} />
    </div>
  );
}
