"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, X, Package, Warehouse,
  ArrowDownLeft, ArrowUpRight, RotateCcw, ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  warehouses, materials, inventoryTransactions,
  type MaterialResponse, type InventoryLevelResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import {
  mockWarehouses, mockMaterials, mockInventoryLevels, mockInventoryTransactions,
} from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, MockBanner, LoadingState, EmptyState, ErrorState, Field, ToneBadge, type Tone,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatCurrency, formatDateTime } from "@/lib/format";

const TXN_META: Record<string, { label: string; tone: Tone; icon: typeof ArrowDownLeft }> = {
  IN: { label: "Nhận", tone: "success", icon: ArrowDownLeft },
  OUT: { label: "Trả / Dùng", tone: "warning", icon: ArrowUpRight },
  ADJUST: { label: "Điều chỉnh", tone: "info", icon: RotateCcw },
  TRANSFER: { label: "Chuyển kho", tone: "brand", icon: ArrowLeftRight },
};

function genTxnCode(): string {
  return `TXN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function VirtualInventory() {
  const whQ = useApiList(() => warehouses.getAll(), { mock: mockWarehouses });
  const matQ = useApiList(() => materials.getAll(), { mock: mockMaterials });

  const ownWarehouses = useMemo(() => {
    const owned = whQ.items.filter((w) => w.ktvOwnerId);
    return owned.length ? owned : whQ.items;
  }, [whQ.items]);

  const [warehouseId, setWarehouseId] = useState("");
  const effectiveWh = warehouseId || ownWarehouses[0]?.id || "";

  const levelsQ = useApiList(
    () => materials.getInventoryLevels({ warehouseId: effectiveWh }),
    { mock: mockInventoryLevels, deps: [effectiveWh], enabled: !!effectiveWh },
  );
  const txnsQ = useApiList(
    () => inventoryTransactions.getAll({ warehouseId: effectiveWh }),
    { mock: mockInventoryTransactions, deps: [effectiveWh], enabled: !!effectiveWh },
  );

  const matMap = useMemo(() => {
    const map: Record<string, MaterialResponse> = {};
    for (const m of matQ.items) map[m.id] = m;
    return map;
  }, [matQ.items]);

  const carrying = useMemo(() => levelsQ.items.filter((l) => l.quantityOnHand > 0), [levelsQ.items]);
  const activeMaterials = useMemo(() => matQ.items.filter((m) => m.isActive), [matQ.items]);
  const recentTxns = useMemo(() =>
    [...txnsQ.items].sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()).slice(0, 10),
  [txnsQ.items]);

  const totalValue = carrying.reduce((s, l) => s + l.quantityOnHand * (matMap[l.materialId]?.unitPrice ?? 0), 0);

  const [showReceive, setShowReceive] = useState(false);
  const [recvMaterial, setRecvMaterial] = useState("");
  const [recvQty, setRecvQty] = useState("1");
  const [returningId, setReturningId] = useState("");
  const [returnQty, setReturnQty] = useState("1");
  const [busy, setBusy] = useState(false);

  const isMock = whQ.isMock || levelsQ.isMock || txnsQ.isMock || matQ.isMock;

  async function receive() {
    const qty = Number(recvQty);
    if (!effectiveWh) { toast.error("Hãy chọn kho ảo."); return; }
    if (!recvMaterial) { toast.error("Hãy chọn vật tư cần nhận."); return; }
    if (!qty || qty <= 0) { toast.error("Số lượng không hợp lệ."); return; }
    const m = matMap[recvMaterial];
    setBusy(true);
    const res = await inventoryTransactions.create({
      txnCode: genTxnCode(),
      warehouseId: effectiveWh,
      materialId: recvMaterial,
      txnType: "IN",
      quantity: qty,
      unitCost: m?.unitPrice,
      totalCost: m?.unitPrice != null ? qty * m.unitPrice : undefined,
      referenceType: "TRANSFER",
      notes: "Nhận vật tư vào kho ảo",
    });
    setBusy(false);
    if (res.errorCode === 200) {
      toast.success("Đã nhận vật tư vào kho ảo.");
      setShowReceive(false); setRecvMaterial(""); setRecvQty("1");
      levelsQ.refetch(); txnsQ.refetch();
    } else {
      toast.error(res.errorMessage || "Nhận vật tư thất bại.");
    }
  }

  async function doReturn(level: InventoryLevelResponse) {
    const qty = Number(returnQty);
    if (!qty || qty <= 0) { toast.error("Số lượng trả không hợp lệ."); return; }
    if (qty > level.quantityOnHand) { toast.error("Không thể trả nhiều hơn số đang giữ."); return; }
    const m = matMap[level.materialId];
    setBusy(true);
    const res = await inventoryTransactions.create({
      txnCode: genTxnCode(),
      warehouseId: effectiveWh,
      materialId: level.materialId,
      txnType: "OUT",
      quantity: qty,
      unitCost: m?.unitPrice,
      totalCost: m?.unitPrice != null ? qty * m.unitPrice : undefined,
      referenceType: "TRANSFER",
      notes: "Trả vật tư về kho chính",
    });
    setBusy(false);
    if (res.errorCode === 200) {
      toast.success(`Đã trả ${level.materialName} về kho chính.`);
      setReturningId(""); setReturnQty("1");
      levelsQ.refetch(); txnsQ.refetch();
    } else {
      toast.error(res.errorMessage || "Trả vật tư thất bại.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/inventory" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Kho vật tư
      </Link>

      <PageHeader
        title="Kho ảo của tôi"
        description="Vật tư cá nhân KTV mang theo khi đi xử lý hiện trường"
        icon={Warehouse}
        actions={
          <Select value={effectiveWh} onValueChange={setWarehouseId}>
            <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Chọn kho" /></SelectTrigger>
            <SelectContent>
              {ownWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {isMock && <MockBanner />}

      <div className="mb-5 rounded-lg border border-info/30 bg-info/5 p-4 text-sm text-foreground">
        <strong className="text-info">Kho ảo</strong> là &ldquo;túi cá nhân&rdquo; của KTV khi làm việc xa kho chính.
        Vật tư nhận về sẽ ghi nhận xuất khỏi kho chính; dùng/trả lại sẽ điều chỉnh tương ứng.
      </div>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="Đang mang theo" value={carrying.length} icon={Package} tone="brand" hint="loại vật tư" loading={levelsQ.loading} />
        <StatCard label="Tổng giá trị" value={formatCurrency(totalValue, { compact: true })} tone="info" loading={levelsQ.loading} />
        <StatCard label="Giao dịch" value={txnsQ.items.length} icon={ArrowLeftRight} tone="neutral" hint="đã ghi nhận" loading={txnsQ.loading} />
      </div>

      {/* Đang mang theo */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Đang mang theo</h2>
          <Button size="sm" onClick={() => setShowReceive((v) => !v)} disabled={!effectiveWh}>
            {showReceive ? <X className="size-4" /> : <Plus className="size-4" />}
            {showReceive ? "Đóng" : "Nhận vật tư"}
          </Button>
        </div>

        {showReceive && (
          <div className="mb-4 rounded-lg border border-info/30 bg-info/5 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Nhận vật tư từ kho chính</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Vật tư" className="min-w-[220px] flex-1">
                <Select value={recvMaterial} onValueChange={setRecvMaterial}>
                  <SelectTrigger><SelectValue placeholder="Chọn vật tư…" /></SelectTrigger>
                  <SelectContent>
                    {activeMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.materialCode} · {m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Số lượng" className="w-28">
                <Input type="number" min={1} inputMode="numeric" value={recvQty} onChange={(e) => setRecvQty(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={receive} disabled={busy || !recvMaterial}>Xác nhận nhận</Button>
              <Button size="sm" variant="outline" onClick={() => setShowReceive(false)} disabled={busy}>Hủy</Button>
            </div>
          </div>
        )}

        {levelsQ.loading ? (
          <LoadingState />
        ) : levelsQ.error ? (
          <ErrorState message={levelsQ.error} onRetry={levelsQ.refetch} />
        ) : carrying.length === 0 ? (
          <EmptyState icon={Package} title="Kho ảo trống" description="Nhận vật tư từ kho chính để bắt đầu." />
        ) : (
          <div className="space-y-3">
            {carrying.map((c) => {
              const price = matMap[c.materialId]?.unitPrice;
              return (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{c.materialName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.materialCode}{price != null ? ` · ${formatCurrency(price)}/${c.unitOfMeasure ?? "đv"}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-lg font-bold text-brand">{formatNumber(c.quantityOnHand)}</span>
                      <span className="text-sm text-muted-foreground">{c.unitOfMeasure}</span>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { setReturningId(returningId === c.id ? "" : c.id); setReturnQty(String(c.quantityOnHand)); }}
                      >
                        Trả kho
                      </Button>
                    </div>
                  </div>
                  {returningId === c.id && (
                    <div className="mt-3 flex items-end gap-2 border-t border-border pt-3">
                      <Field label="Số lượng trả" className="w-32">
                        <Input type="number" min={1} max={c.quantityOnHand} inputMode="numeric" value={returnQty} onChange={(e) => setReturnQty(e.target.value)} />
                      </Field>
                      <Button size="sm" onClick={() => doReturn(c)} disabled={busy}>Xác nhận trả</Button>
                      <Button size="sm" variant="ghost" onClick={() => setReturningId("")} disabled={busy}>Hủy</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lịch sử giao dịch */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Lịch sử giao dịch</h2>
        {txnsQ.loading ? (
          <LoadingState />
        ) : recentTxns.length === 0 ? (
          <EmptyState title="Chưa có giao dịch nào." />
        ) : (
          <ul className="space-y-3">
            {recentTxns.map((h) => {
              const meta = TXN_META[h.txnType] ?? TXN_META.ADJUST;
              const Icon = meta.icon;
              return (
                <li key={h.id} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
                      <span className="truncate text-sm font-medium text-foreground">{h.materialName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(h.performedAt)}{h.performedBy ? ` · ${h.performedBy}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">{formatNumber(h.quantity)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
