"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, checklistTemplates,
  type WorkOrderResponse, type ChecklistTemplateItemResponse, type UpdateWorkOrderInput,
  type WorkOrderAttachmentResponse,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockWorkOrders, mockChecklistItems } from "@/lib/mock/pm";
import { MockBanner, LoadingState, ErrorState, ToneBadge, Field, PhotoCapture } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ItemStatus = "pass" | "fail" | "pending";
type ItemState = { status: ItemStatus; value: string; note: string };
const DEFAULT: ItemState = { status: "pending", value: "", note: "" };

export default function ChecklistScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const q = useApi<WorkOrderResponse>(
    () => workOrders.getById(String(id)),
    { mock: () => mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0], deps: [id] },
  );
  const wo = q.data;

  const itemsQ = useApiList<ChecklistTemplateItemResponse>(
    () => checklistTemplates.getItems(String(wo?.checklistTemplateId)),
    { mock: () => mockChecklistItems, deps: [wo?.checklistTemplateId], enabled: !!wo?.checklistTemplateId },
  );
  const items = useMemo(
    () => [...itemsQ.items].sort((a, b) => a.sortOrder - b.sortOrder),
    [itemsQ.items],
  );

  const photosQ = useApiList<WorkOrderAttachmentResponse>(
    () => workOrders.getAttachments(String(wo?.id)),
    { mock: () => [], deps: [wo?.id], enabled: !!wo?.id },
  );
  async function addPhoto(url: string) {
    if (!wo) return;
    const res = await workOrders.addAttachment({ woId: wo.id, attachmentType: "EVIDENCE", fileUrl: url });
    if (res.errorCode === 200) { toast.success("Đã thêm ảnh minh chứng."); photosQ.refetch(); }
    else toast.error(res.errorMessage || "Thêm ảnh thất bại.");
  }

  const [responses, setResponses] = useState<Record<string, ItemState>>({});
  const [actualHours, setActualHours] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const st = (itemId: string): ItemState => responses[itemId] ?? DEFAULT;
  function patch(itemId: string, p: Partial<ItemState>) {
    setResponses((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] ?? DEFAULT), ...p } }));
  }

  const total = items.length;
  const done = items.filter((i) => st(i.id).status !== "pending").length;
  const failCount = items.filter((i) => st(i.id).status === "fail").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pendingRequired = items.filter((i) => i.isRequired && st(i.id).status === "pending").length;

  async function doSubmit() {
    if (!wo) return;
    if (pendingRequired > 0) { toast.error(`Còn ${pendingRequired} mục bắt buộc chưa đánh giá.`); return; }
    if (done === 0) { toast.error("Hãy đánh giá ít nhất một hạng mục."); return; }
    setSubmitting(true);
    for (const it of items) {
      const s = st(it.id);
      if (s.status === "pending") continue;
      await workOrders.addChecklistResponse({
        woId: wo.id, templateItemId: it.id, isPassed: s.status === "pass",
        valueText: s.value.trim() || undefined, notes: s.note.trim() || undefined,
      });
    }
    const body: UpdateWorkOrderInput = {
      id: wo.id, woCode: wo.woCode, assetId: wo.assetId, checklistTemplateId: wo.checklistTemplateId,
      buildingId: wo.buildingId, status: "PENDING_REVIEW", actualEndAt: new Date().toISOString(),
      actualHours: actualHours ? Number(actualHours) : undefined,
    };
    const res = await workOrders.update(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success("Đã nộp checklist. Chờ nghiệm thu.");
      router.push(`/pm/work-orders/${wo.id}`);
    } else {
      toast.error(res.errorMessage || "Nộp checklist thất bại.");
    }
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!wo) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy phiếu công việc."} onRetry={q.refetch} /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/pm/work-orders/${wo.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại phiếu công việc
      </Link>

      {(q.isMock || itemsQ.isMock) && <MockBanner />}

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{wo.woCode}</span>
            <ToneBadge tone="warning"><ClipboardCheck className="size-3" /> Checklist bảo trì</ToneBadge>
          </div>
          <h1 className="mt-1 text-xl font-bold text-foreground">{wo.title ?? wo.woCode}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{wo.assetName ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Hoàn thành</p>
          <p className="text-2xl font-bold text-foreground">{done}/{total}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{pct}% hoàn thành</span>
          <span className="text-muted-foreground">{failCount} mục không đạt</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-brand"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {failCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <p className="text-sm text-foreground/90">
            <strong>{failCount} mục không đạt</strong> — nên ghi chú lý do. Bạn vẫn có thể nộp; KST sẽ xem xét khi nghiệm thu.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        {itemsQ.loading ? (
          <div className="p-6"><LoadingState /></div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Checklist chưa có hạng mục nào.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const s = st(item.id);
              return (
                <li key={item.id} className={`p-4 ${s.status === "fail" ? "bg-danger/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex gap-1">
                      <button
                        type="button"
                        onClick={() => patch(item.id, { status: s.status === "pass" ? "pending" : "pass" })}
                        className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${s.status === "pass" ? "border-success bg-success text-white" : "border-border text-muted-foreground hover:border-success"}`}
                        aria-label="Đạt"
                      >✓</button>
                      <button
                        type="button"
                        onClick={() => patch(item.id, { status: s.status === "fail" ? "pending" : "fail" })}
                        className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${s.status === "fail" ? "border-danger bg-danger text-white" : "border-border text-muted-foreground hover:border-danger"}`}
                        aria-label="Không đạt"
                      >✗</button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.itemCode && <span className="font-mono text-xs text-muted-foreground">{item.itemCode}</span>}
                        <p className="text-sm font-medium text-foreground">{item.itemLabel}</p>
                        {item.isRequired && <span className="text-xs font-bold text-danger">*</span>}
                        {s.status === "pass" && <ToneBadge tone="success" dot>Đạt</ToneBadge>}
                        {s.status === "fail" && <ToneBadge tone="danger" dot>Không đạt</ToneBadge>}
                        {s.status === "pending" && <ToneBadge tone="neutral" dot>Chưa đánh giá</ToneBadge>}
                      </div>
                      {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}

                      {item.itemType !== "BOOLEAN" && (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            value={s.value}
                            onChange={(e) => patch(item.id, { value: e.target.value })}
                            placeholder={item.itemType === "NUMERIC" ? "Giá trị đo…" : "Nội dung ghi nhận…"}
                            className="h-8 text-xs"
                          />
                          {item.expectedValue && (
                            <span className="whitespace-nowrap text-xs text-muted-foreground">/ {item.expectedValue}</span>
                          )}
                        </div>
                      )}

                      {(s.status === "fail" || s.note) && (
                        <Textarea
                          value={s.note}
                          onChange={(e) => patch(item.id, { note: e.target.value })}
                          placeholder="Ghi chú…"
                          rows={2}
                          className="mt-2 text-xs"
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <PhotoCapture
          title="Ảnh minh chứng"
          photos={photosQ.items.map((a) => ({
            url: a.fileUrl,
            caption: a.caption ?? (a.attachmentType && a.attachmentType !== "EVIDENCE" ? a.attachmentType : undefined),
          }))}
          onAdd={addPhoto}
          emptyHint="Chụp/đính kèm ảnh minh chứng quá trình bảo trì (trước/sau, kết quả đo…)."
        />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-5">
        <Field label="Số giờ thực hiện" hint="Dùng để tính công và chi phí khi nghiệm thu">
          <div className="relative max-w-[220px]">
            <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="number" min="0" step="0.5" value={actualHours} onChange={(e) => setActualHours(e.target.value)} placeholder="0" className="pl-9" />
          </div>
        </Field>
      </div>

      <div className="mt-4 flex gap-3 pb-6">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/pm/work-orders/${wo.id}`}>Lưu & thoát</Link>
        </Button>
        <Button className="flex-1" onClick={doSubmit} disabled={submitting}>
          <CheckCircle2 className="size-4" /> {submitting ? "Đang nộp…" : "Nộp & chờ nghiệm thu"}
        </Button>
      </div>
    </div>
  );
}
