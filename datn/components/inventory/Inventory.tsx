"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes, PackageX, AlertTriangle, Wallet, PackageSearch, Warehouse,
  ChevronRight, ChevronDown,
} from "lucide-react";
import {
  materials, type MaterialResponse, type InventoryLevelResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockMaterials, mockInventoryLevels } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, FilterBar, MockBanner,
  ToneBadge, LoadingState, ErrorState, EmptyState, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

// Một vật tư gộp lại từ nhiều kho: tổng tồn + chi tiết tồn theo TỪNG kho.
type WhLevel = { id: string; warehouseId: string; warehouseName: string; qty: number };
type MatGroup = {
  materialId: string; materialCode: string; materialName: string;
  categoryName?: string; unitOfMeasure?: string; unitPrice?: number;
  minStock: number; reorderPoint?: number;
  total: number; warehouses: WhLevel[];
};
const threshold = (g: Pick<MatGroup, "reorderPoint" | "minStock">) => g.reorderPoint ?? g.minStock ?? 0;
const stateOf = (qty: number, g: Pick<MatGroup, "reorderPoint" | "minStock">): StockState =>
  qty <= 0 ? "out" : qty <= threshold(g) ? "low" : "ok";

// Màn "Tồn kho": gộp theo vật tư, mở rộng ra tồn của từng kho.
// Thêm/sửa/xoá vật tư (master-data) ở màn Danh mục vật tư (/inventory/catalog).
export default function Inventory() {
  const matQ = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const levelsQ = useApiList<InventoryLevelResponse>(() => materials.getInventoryLevels(), { mock: mockInventoryLevels });

  const materialMap = useMemo(() => {
    const m = new Map<string, MaterialResponse>();
    for (const mat of matQ.items) m.set(mat.id, mat);
    return m;
  }, [matQ.items]);

  const [search, setSearch] = useState("");
  const [stockF, setStockF] = useState("all");
  const [whF, setWhF] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Danh sách kho (suy ra từ dữ liệu tồn kho) cho bộ lọc.
  const warehouseOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const lv of levelsQ.items) if (lv.warehouseId) m.set(lv.warehouseId, lv.warehouseName ?? lv.warehouseId);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [levelsQ.items]);

  // Gộp các dòng tồn (đã lọc theo kho nếu có) thành nhóm vật tư.
  const groups = useMemo(() => {
    const map = new Map<string, MatGroup>();
    for (const lv of levelsQ.items) {
      if (whF !== "all" && lv.warehouseId !== whF) continue;
      const mat = materialMap.get(lv.materialId);
      let g = map.get(lv.materialId);
      if (!g) {
        g = {
          materialId: lv.materialId,
          materialCode: lv.materialCode ?? mat?.materialCode ?? "",
          materialName: lv.materialName ?? mat?.name ?? "",
          categoryName: mat?.categoryName,
          unitOfMeasure: lv.unitOfMeasure ?? mat?.unitOfMeasure,
          unitPrice: mat?.unitPrice,
          minStock: mat?.minStock ?? 0,
          reorderPoint: mat?.reorderPoint,
          total: 0, warehouses: [],
        };
        map.set(lv.materialId, g);
      }
      g.total += lv.quantityOnHand;
      g.warehouses.push({ id: lv.id, warehouseId: lv.warehouseId, warehouseName: lv.warehouseName ?? "—", qty: lv.quantityOnHand });
    }
    const arr = [...map.values()];
    for (const g of arr) g.warehouses.sort((a, b) => a.warehouseName.localeCompare(b.warehouseName, "vi"));
    arr.sort((a, b) => a.materialCode.localeCompare(b.materialCode, "vi"));
    return arr;
  }, [levelsQ.items, materialMap, whF]);

  const stats = useMemo(() => {
    let low = 0, out = 0, value = 0, lines = 0;
    for (const g of groups) {
      for (const w of g.warehouses) {
        lines++;
        const st = stateOf(w.qty, g);
        if (st === "out") out++; else if (st === "low") low++;
        value += w.qty * (g.unitPrice ?? 0);
      }
    }
    return { materials: groups.length, lines, low, out, value };
  }, [groups]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (stockF !== "all" && stateOf(g.total, g) !== stockF) return false;
      if (!s) return true;
      return [g.materialCode, g.materialName, g.categoryName, ...g.warehouses.map((w) => w.warehouseName)]
        .some((f) => f?.toLowerCase().includes(s));
    });
  }, [groups, search, stockF]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allExpanded = visible.length > 0 && visible.every((g) => expanded.has(g.materialId));
  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(visible.map((g) => g.materialId)));
  }

  const body = levelsQ.loading ? <LoadingState />
    : levelsQ.error ? <ErrorState message={levelsQ.error} onRetry={levelsQ.refetch} />
    : visible.length === 0 ? <EmptyState title="Chưa có tồn kho" description="Chưa có vật tư nào có tồn trong kho." />
    : null;

  return (
    <div>
      <PageHeader
        title="Kho vật tư"
        description="Tồn kho gộp theo vật tư — mở rộng để xem chi tiết từng kho"
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-10 w-10 text-xs">
                  {visible.length > 0 && (
                    <button type="button" onClick={toggleAll} className="text-muted-foreground hover:text-foreground" title={allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}>
                      {allExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  )}
                </TableHead>
                <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vật tư</TableHead>
                <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Danh mục</TableHead>
                <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kho</TableHead>
                <TableHead className="h-10 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tồn kho</TableHead>
                <TableHead className="h-10 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Đơn giá</TableHead>
                <TableHead className="h-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            {!body && (
              <TableBody>
                {visible.map((g) => {
                  const isOpen = expanded.has(g.materialId);
                  const st = STOCK[stateOf(g.total, g)];
                  return (
                    <Fragment key={g.materialId}>
                      <TableRow
                        onClick={() => toggle(g.materialId)}
                        className="cursor-pointer border-border hover:bg-surface-2/40"
                      >
                        <TableCell className="py-2.5">
                          {isOpen ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">{g.materialCode}</span>
                          <span className="block text-sm font-medium text-foreground">{g.materialName}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-sm text-muted-foreground">{g.categoryName ?? "—"}</TableCell>
                        <TableCell className="py-2.5 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5"><Warehouse className="size-3.5" />{g.warehouses.length} kho</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-sm font-semibold text-foreground">
                          {formatNumber(g.total)} <span className="text-xs font-normal text-muted-foreground">{g.unitOfMeasure}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-sm text-foreground">{formatCurrency(g.unitPrice)}</TableCell>
                        <TableCell className="py-2.5"><ToneBadge tone={st.tone} dot>{st.label}</ToneBadge></TableCell>
                      </TableRow>

                      {isOpen && g.warehouses.map((w) => {
                        const wst = STOCK[stateOf(w.qty, g)];
                        return (
                          <TableRow key={w.id} className="border-border bg-muted/20 hover:bg-muted/30">
                            <TableCell className="py-2" />
                            <TableCell className="py-2" colSpan={2}>
                              <span className="ml-4 inline-flex items-center gap-1.5 text-sm text-foreground">
                                <Warehouse className="size-3.5 text-brand" />{w.warehouseName}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-sm text-muted-foreground">tại kho</TableCell>
                            <TableCell className="py-2 text-right text-sm font-medium text-foreground">
                              {formatNumber(w.qty)} <span className="text-xs font-normal text-muted-foreground">{g.unitOfMeasure}</span>
                            </TableCell>
                            <TableCell className="py-2" />
                            <TableCell className="py-2"><ToneBadge tone={wst.tone} dot>{wst.label}</ToneBadge></TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </TableBody>
            )}
          </Table>
        </div>
        {body && <div className="border-t border-border">{body}</div>}
      </div>
    </div>
  );
}
