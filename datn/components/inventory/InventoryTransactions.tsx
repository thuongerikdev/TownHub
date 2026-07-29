"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, X, ArrowLeftRight, PackageX } from "lucide-react";
import { toast } from "sonner";
import {
  warehouses, materials, inventoryTransactions,
  type MaterialResponse, type CreateInventoryTransactionInput,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockWarehouses, mockMaterials, mockInventoryLevels } from "@/lib/mock/inventory";
import { MockBanner, Field } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/format";

const TXN_TYPES: { value: string; label: string }[] = [
  { value: "IN", label: "Nhập kho" },
  { value: "OUT", label: "Xuất kho" },
  { value: "ADJUST", label: "Điều chỉnh" },
  { value: "TRANSFER", label: "Chuyển kho" },
];
const REF_TYPES: Record<string, string> = {
  NONE: "Không liên kết", WO: "Phiếu công việc", TICKET: "Sự cố", PO: "Đơn mua hàng", STOCK_TAKE: "Kiểm kê",
};

function genTxnCode() {
  // Dùng mốc thời gian (base36) để bảo đảm duy nhất, tránh trùng như random 4 số cũ.
  return `TXN-${new Date().getFullYear()}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

interface Line { materialId: string; qty: number; }

export default function InventoryTransactions() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const mayTxn = hasPermission("inventory.transaction");
  const whQ = useApiList(() => warehouses.getAll(), { mock: mockWarehouses });
  const matQ = useApiList<MaterialResponse>(() => materials.getAll(), { mock: mockMaterials });
  const levelsQ = useApiList(() => materials.getInventoryLevels(), { mock: mockInventoryLevels });

  const [txnType, setTxnType] = useState("OUT");
  const [warehouseId, setWarehouseId] = useState("");
  const [refType, setRefType] = useState("NONE");
  const [refId, setRefId] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // default kho khi tải xong
  const effectiveWh = warehouseId || whQ.items[0]?.id || "";

  const matMap = useMemo(() => {
    const map = new Map<string, MaterialResponse>();
    for (const m of matQ.items) map.set(m.id, m);
    return map;
  }, [matQ.items]);

  const onHandMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const lv of levelsQ.items) {
      if (lv.warehouseId !== effectiveWh) continue;
      map.set(lv.materialId, (map.get(lv.materialId) ?? 0) + lv.quantityOnHand);
    }
    return map;
  }, [levelsQ.items, effectiveWh]);
  const onHandOf = (id: string) => onHandMap.get(id) ?? 0;

  const isOut = txnType === "OUT" || txnType === "TRANSFER";
  const total = useMemo(
    () => lines.reduce((s, ln) => s + ln.qty * (matMap.get(ln.materialId)?.unitPrice ?? 0), 0),
    [lines, matMap],
  );

  const available = matQ.items.filter((m) => m.isActive && !lines.some((l) => l.materialId === m.id));

  function addLine(m: MaterialResponse) {
    setLines((prev) => [...prev, { materialId: m.id, qty: 1 }]);
    setPicking(false);
  }
  function setQty(id: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.materialId === id ? { ...l, qty: Math.max(1, qty || 1) } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.materialId !== id));
  }

  async function submit() {
    if (!effectiveWh) { toast.error("Chọn kho thực hiện."); return; }
    if (lines.length === 0) { toast.error("Thêm ít nhất một vật tư."); return; }
    // Chặn xuất vượt tồn kho (loại OUT/TRANSFER).
    if (isOut) {
      for (const ln of lines) {
        if (ln.qty > onHandOf(ln.materialId)) {
          toast.error(`Xuất vượt tồn: ${matMap.get(ln.materialId)?.name ?? ln.materialId} — tồn ${onHandOf(ln.materialId)}, yêu cầu ${ln.qty}.`);
          return;
        }
      }
    }
    setSubmitting(true);
    const base = genTxnCode();
    let ok = true;
    // performedBy/referenceId ở backend là kiểu Guid? — KHÔNG gửi chuỗi tự do (tên
    // người, mã "WO-2026-0098") vào đó để tránh lỗi deserialize 400. Ghi thông tin
    // người thực hiện & mã tham chiếu dạng chữ vào notes cho tới khi có lookup Guid thật.
    const humanMeta = [
      performedBy.trim() ? `Người thực hiện: ${performedBy.trim()}` : "",
      refType !== "NONE" && refId.trim() ? `Tham chiếu: ${refId.trim()}` : "",
    ].filter(Boolean).join(" · ");
    const combinedNotes = [note.trim(), humanMeta].filter(Boolean).join(" — ") || undefined;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const m = matMap.get(ln.materialId);
      const unitCost = m?.unitPrice;
      const body: CreateInventoryTransactionInput = {
        txnCode: lines.length > 1 ? `${base}-${i + 1}` : base,
        warehouseId: effectiveWh, materialId: ln.materialId, txnType,
        quantity: ln.qty, unitCost,
        totalCost: unitCost != null ? unitCost * ln.qty : undefined,
        referenceType: refType === "NONE" ? undefined : refType,
        notes: combinedNotes,
      };
      const res = await inventoryTransactions.create(body);
      if (res.errorCode !== 200) {
        ok = false;
        toast.error(`${res.errorMessage || "Lỗi"} tại dòng ${i + 1}/${lines.length}.${i > 0 ? ` Đã ghi ${i} dòng trước đó — vui lòng kiểm tra kho để tránh ghi trùng.` : ""}`);
        break;
      }
    }
    setSubmitting(false);
    if (ok) {
      toast.success(`Đã ghi nhận ${lines.length} dòng ${TXN_TYPES.find((t) => t.value === txnType)?.label.toLowerCase()}.`);
      router.push("/inventory");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/inventory" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại kho vật tư
      </Link>

      {(whQ.isMock || matQ.isMock || levelsQ.isMock) && <MockBanner />}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-5 text-brand" />
          <h1 className="text-2xl font-bold text-foreground">Phiếu xuất / nhập kho</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Ghi nhận giao dịch vật tư — mỗi vật tư là một dòng giao dịch.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-3 text-sm font-medium text-foreground">Loại phiếu</p>
          <div className="flex flex-wrap gap-2">
            {TXN_TYPES.map((t) => (
              <button
                key={t.value} type="button" onClick={() => setTxnType(t.value)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${txnType === t.value ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:border-brand/40"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
          <Field label="Kho thực hiện" required>
            <Select value={effectiveWh} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Chọn kho" /></SelectTrigger>
              <SelectContent>
                {whQ.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Người thực hiện">
            <Input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder="VD: Thủ kho A" />
          </Field>
          <Field label="Loại liên kết">
            <Select value={refType} onValueChange={setRefType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REF_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Mã tham chiếu" hint="Tuỳ chọn">
            <Input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="VD: WO-2026-0098" disabled={refType === "NONE"} />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Danh sách vật tư ({lines.length})</p>
            <Button variant="outline" size="sm" onClick={() => setPicking((p) => !p)}>
              <Plus className="size-4" /> Thêm vật tư
            </Button>
          </div>

          {picking && (
            <div className="mb-3 max-h-60 overflow-y-auto rounded-lg border border-border">
              {available.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Đã thêm tất cả vật tư khả dụng.</p>
              ) : (
                available.map((m) => (
                  <button
                    key={m.id} type="button" onClick={() => addLine(m)}
                    className="flex w-full items-center justify-between border-b border-border px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-surface-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.materialCode} · Tồn {effectiveWh ? formatNumber(onHandOf(m.id)) : "—"} {m.unitOfMeasure}</p>
                    </div>
                    <span className="text-xs font-semibold text-brand">+ Thêm</span>
                  </button>
                ))
              )}
            </div>
          )}

          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chưa có vật tư nào. Nhấn “Thêm vật tư”.</p>
          ) : (
            <div className="space-y-3">
              {lines.map((ln) => {
                const m = matMap.get(ln.materialId);
                if (!m) return null;
                const oh = onHandOf(m.id);
                const over = isOut && ln.qty > oh;
                return (
                  <div key={ln.materialId} className={`rounded-lg border p-3 ${over ? "border-danger/40 bg-danger/5" : "border-border"}`}>
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.materialCode}</p>
                      </div>
                      <button type="button" onClick={() => removeLine(ln.materialId)} className="text-muted-foreground hover:text-danger">
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className={oh <= 0 ? "font-medium text-danger" : "text-muted-foreground"}>
                        {oh <= 0 ? <span className="inline-flex items-center gap-1"><PackageX className="size-3.5" /> Hết hàng</span> : `Tồn: ${formatNumber(oh)} ${m.unitOfMeasure ?? ""}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">SL:</span>
                        <Input
                          type="number" min={1} value={ln.qty}
                          onChange={(e) => setQty(ln.materialId, parseInt(e.target.value, 10))}
                          className="h-8 w-20 text-center"
                        />
                        <span className="text-muted-foreground">{m.unitOfMeasure}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Thành tiền: <strong className="text-foreground">{formatCurrency((m.unitPrice ?? 0) * ln.qty)}</strong>
                      </span>
                    </div>
                    {over && <p className="mt-1.5 text-xs text-danger">Số lượng xuất vượt tồn kho hiện có.</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <Field label="Ghi chú">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Lý do / diễn giải giao dịch…" />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
          <span className="text-sm font-medium text-foreground">Tổng giá trị</span>
          <span className="text-lg font-bold text-brand">{formatCurrency(total)}</span>
        </div>

        <div className="flex gap-3 pb-6">
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/inventory">Huỷ</Link>
          </Button>
          <Button className="flex-1" onClick={submit} disabled={submitting || lines.length === 0 || !mayTxn} title={!mayTxn ? "Bạn không có quyền ghi nhận giao dịch kho" : undefined}>
            {submitting ? "Đang ghi nhận…" : !mayTxn ? "Không có quyền ghi nhận" : `Xác nhận ${TXN_TYPES.find((t) => t.value === txnType)?.label}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
