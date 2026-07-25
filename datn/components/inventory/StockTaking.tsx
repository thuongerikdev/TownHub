"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardCheck, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, PackageCheck, History,
} from "lucide-react";
import { toast } from "sonner";
import {
  warehouses, materials, inventoryTransactions, users,
  type MaterialResponse, type RoleMember,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockWarehouses, mockMaterials, mockInventoryLevels } from "@/lib/mock/inventory";
import {
  PageHeader, StatCard, MockBanner, LoadingState, EmptyState, ErrorState, Field,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatNumber, formatCurrency } from "@/lib/format";

type Step = "create" | "fill" | "report";

const STEPS: { key: Step; label: string }[] = [
  { key: "create", label: "Tạo phiếu" },
  { key: "fill", label: "Kiểm đếm" },
  { key: "report", label: "Đối chiếu" },
];

function defaultPeriod(): string {
  const d = new Date();
  return `Tháng ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function genStockTakeCode(): string {
  return `STK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function StockTaking() {
  const router = useRouter();
  const whQ = useApiList(() => warehouses.getAll(), { mock: mockWarehouses });
  const matQ = useApiList(() => materials.getAll(), { mock: mockMaterials });
  const staffQ = useApiList<RoleMember>(() => users.getByRole("Kỹ thuật viên"));

  const [step, setStep] = useState<Step>("create");
  const [warehouseId, setWarehouseId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod());
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [performerId, setPerformerId] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const effectiveWh = warehouseId || whQ.items[0]?.id || "";
  const whName = whQ.items.find((w) => w.id === effectiveWh)?.name ?? "—";
  const performer = staffQ.items.find((u) => String(u.userID) === performerId);
  const performerName = performer ? (performer.fullName?.trim() || performer.userName) : "";

  const levelsQ = useApiList(
    () => materials.getInventoryLevels({ warehouseId: effectiveWh }),
    { mock: mockInventoryLevels, deps: [effectiveWh], enabled: !!effectiveWh },
  );

  const matMap = useMemo(() => {
    const map: Record<string, MaterialResponse> = {};
    for (const m of matQ.items) map[m.id] = m;
    return map;
  }, [matQ.items]);

  const rows = useMemo(() =>
    levelsQ.items.map((lv) => {
      const actualStr = counts[lv.materialId] ?? "";
      const actual = actualStr === "" ? null : Number(actualStr);
      const diff = actual === null ? null : actual - lv.quantityOnHand;
      return { lv, actualStr, actual, diff };
    }),
  [levelsQ.items, counts]);

  const filled = rows.filter((r) => r.actual !== null).length;
  const totalRows = rows.length;
  const pct = totalRows ? Math.round((filled / totalRows) * 100) : 0;

  const diffRows = rows.filter((r) => r.diff !== null && r.diff !== 0);
  const missingRows = diffRows.filter((r) => (r.diff ?? 0) < 0);
  const surplusRows = diffRows.filter((r) => (r.diff ?? 0) > 0);
  const matchRows = rows.filter((r) => r.actual !== null && r.diff === 0);
  const totalDiffValue = diffRows.reduce((sum, r) =>
    sum + (r.diff ?? 0) * (matMap[r.lv.materialId]?.unitPrice ?? 0), 0);

  const isMock = whQ.isMock || levelsQ.isMock || matQ.isMock;
  const currentIdx = STEPS.findIndex((s) => s.key === step);

  function startCounting() {
    if (!effectiveWh) { toast.error("Hãy chọn kho để kiểm kê."); return; }
    setCounts({});
    setNotes({});
    setStep("fill");
  }

  async function approve() {
    if (!effectiveWh) return;
    setSubmitting(true);
    const base = genStockTakeCode();
    let ok = true;
    for (let i = 0; i < diffRows.length; i++) {
      const r = diffRows[i];
      const price = matMap[r.lv.materialId]?.unitPrice;
      // performedBy ở backend là Guid? — không map được userID (int) của Auth service,
      // nên ghi tên người thực hiện vào notes để tra cứu (giống phiếu xuất/nhập kho).
      const baseNote = notes[r.lv.materialId]?.trim() || `Kiểm kê ${period}`;
      const combinedNotes = [baseNote, performerName ? `Người thực hiện: ${performerName}` : ""]
        .filter(Boolean).join(" · ");
      const res = await inventoryTransactions.create({
        txnCode: diffRows.length > 1 ? `${base}-${i + 1}` : base,
        warehouseId: effectiveWh,
        materialId: r.lv.materialId,
        txnType: "ADJUST",
        quantity: r.diff ?? 0,
        unitCost: price,
        totalCost: price != null ? Math.abs(r.diff ?? 0) * price : undefined,
        referenceType: "STOCK_TAKE",
        referenceId: base,
        notes: combinedNotes,
      });
      if (res.errorCode !== 200) {
        ok = false;
        toast.error(res.errorMessage || `Tạo điều chỉnh cho ${r.lv.materialName} thất bại.`);
        break;
      }
    }
    setSubmitting(false);
    if (ok) {
      toast.success(diffRows.length
        ? `Đã duyệt & điều chỉnh tồn cho ${diffRows.length} vật tư.`
        : "Kiểm kê khớp sổ, đã hoàn tất.");
      router.push("/inventory");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/inventory" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Kho vật tư
      </Link>

      <PageHeader
        title="Kiểm kê kho"
        description="Đối chiếu tồn thực tế với sổ sách và sinh phiếu điều chỉnh"
        icon={ClipboardCheck}
        actions={
          <Button variant="outline" asChild>
            <Link href="/inventory/stock-taking/history"><History className="size-4" /> Lịch sử kiểm kê</Link>
          </Button>
        }
      />

      {isMock && <MockBanner />}

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < currentIdx ? "bg-brand text-white"
                : i === currentIdx ? "bg-brand text-white ring-4 ring-brand/20"
                : "bg-surface-2 text-muted-foreground"
            }`}>
              {i < currentIdx ? "✓" : i + 1}
            </div>
            <span className={`whitespace-nowrap text-sm font-medium ${i <= currentIdx ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < currentIdx ? "bg-brand" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* Bước 1: Tạo phiếu */}
      {step === "create" && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kho kiểm kê" required>
              <Select value={effectiveWh} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Chọn kho" /></SelectTrigger>
                <SelectContent>
                  {whQ.items.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Người thực hiện">
              <Select value={performerId} onValueChange={setPerformerId}>
                <SelectTrigger>
                  <SelectValue placeholder={staffQ.loading ? "Đang tải…" : staffQ.items.length ? "Chọn người thực hiện" : "Chưa có kỹ thuật viên"} />
                </SelectTrigger>
                <SelectContent>
                  {staffQ.items.map((u) => (
                    <SelectItem key={u.userID} value={String(u.userID)}>
                      {u.fullName?.trim() || u.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kỳ kiểm kê" required>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} />
            </Field>
            <Field label="Ngày thực hiện" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Hệ thống sẽ chốt số tồn sổ sách hiện tại của kho làm mốc đối chiếu khi bắt đầu kiểm đếm.
          </p>
          <Button onClick={startCounting} className="mt-5 w-full" disabled={!effectiveWh || whQ.loading}>
            Bắt đầu kiểm đếm <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Bước 2: Kiểm đếm */}
      {step === "fill" && (
        <>
          <div className="mb-4 rounded-xl border border-border bg-surface p-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{period} · {whName}</span>
              <span className="text-muted-foreground">{filled}/{totalRows} đã nhập ({pct}%)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {levelsQ.loading ? (
            <LoadingState />
          ) : levelsQ.error ? (
            <ErrorState message={levelsQ.error} onRetry={levelsQ.refetch} />
          ) : rows.length === 0 ? (
            <EmptyState title="Kho chưa có vật tư nào để kiểm kê." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Vật tư</th>
                    <th className="px-4 py-3 text-right font-semibold">Sổ sách</th>
                    <th className="px-4 py-3 text-center font-semibold">Thực tế</th>
                    <th className="px-4 py-3 text-right font-semibold">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.lv.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.lv.materialName}</p>
                        <p className="text-xs text-muted-foreground">{r.lv.materialCode} · {r.lv.unitOfMeasure}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatNumber(r.lv.quantityOnHand)}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number" min={0} inputMode="numeric"
                          value={r.actualStr}
                          onChange={(e) => setCounts((p) => ({ ...p, [r.lv.materialId]: e.target.value }))}
                          placeholder="…"
                          className="mx-auto h-9 w-24 text-center"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.diff === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : r.diff === 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-success"><CheckCircle2 className="size-4" /> 0</span>
                        ) : (
                          <span className={`font-semibold ${r.diff > 0 ? "text-info" : "text-danger"}`}>{r.diff > 0 ? "+" : ""}{formatNumber(r.diff)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => setStep("create")} className="flex-1">Quay lại</Button>
            <Button onClick={() => setStep("report")} disabled={filled < totalRows || totalRows === 0} className="flex-1">
              Hoàn tất kiểm đếm <ArrowRight className="size-4" />
            </Button>
          </div>
        </>
      )}

      {/* Bước 3: Đối chiếu */}
      {step === "report" && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Khớp sổ" value={matchRows.length} icon={CheckCircle2} tone="success" />
            <StatCard label="Thiếu hụt" value={missingRows.length} icon={AlertTriangle} tone={missingRows.length ? "danger" : "neutral"} />
            <StatCard label="Dư thừa" value={surplusRows.length} icon={PackageCheck} tone={surplusRows.length ? "info" : "neutral"} />
            <StatCard label="Giá trị lệch" value={formatCurrency(totalDiffValue, { compact: true })} tone={totalDiffValue < 0 ? "danger" : totalDiffValue > 0 ? "info" : "neutral"} hint={`${diffRows.length} vật tư lệch`} />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">Vật tư chênh lệch — cần giải trình</h2>
            </div>
            {diffRows.length === 0 ? (
              <div className="p-6"><EmptyState title="Tất cả vật tư khớp sổ sách 🎉" description="Không có chênh lệch, không cần điều chỉnh tồn kho." /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2/50 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Vật tư</th>
                    <th className="px-4 py-3 text-right font-semibold">Chênh</th>
                    <th className="px-4 py-3 font-semibold">Giải trình</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {diffRows.map((r) => (
                    <tr key={r.lv.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{r.lv.materialName}</p>
                        <p className="text-xs text-muted-foreground">{r.lv.materialCode}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${(r.diff ?? 0) > 0 ? "text-info" : "text-danger"}`}>
                          {(r.diff ?? 0) > 0 ? "+" : ""}{formatNumber(r.diff ?? 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={notes[r.lv.materialId] ?? ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [r.lv.materialId]: e.target.value }))}
                          placeholder="Lý do chênh lệch…"
                          className="h-9"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Khi duyệt, hệ thống sinh phiếu điều chỉnh tồn kho (ADJUST) cho từng vật tư lệch, tham chiếu mã phiếu kiểm kê.
          </p>

          <div className="mt-4 flex gap-3 pb-6">
            <Button variant="outline" onClick={() => setStep("fill")} className="flex-1" disabled={submitting}>Kiểm tra lại</Button>
            <Button onClick={approve} className="flex-1" disabled={submitting}>
              {submitting ? "Đang xử lý…" : diffRows.length ? "Duyệt & điều chỉnh tồn" : "Hoàn tất kiểm kê"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
