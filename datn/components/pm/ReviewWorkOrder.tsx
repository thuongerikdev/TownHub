"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, Clock, Gauge } from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, checklistTemplates, maintenanceSchedules, costTracking, toWorkOrderUpdate,
  type WorkOrderResponse, type ChecklistTemplateItemResponse,
  type MaintenanceScheduleResponse, type UpdateMaintenanceScheduleInput,
  type WorkOrderAttachmentResponse,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockWorkOrders, mockChecklistItems } from "@/lib/mock/pm";
import {
  MockBanner, LoadingState, ErrorState, StatusBadge, PriorityBadge, ToneBadge,
  EntityModal, StatCard, PhotoCapture, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatCurrency } from "@/lib/format";

const WO_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  ASSIGNED: { label: "Đã phân công", tone: "info" },
  IN_PROGRESS: { label: "Đang thực hiện", tone: "warning" },
  PENDING_REVIEW: { label: "Chờ nghiệm thu", tone: "brand" },
  COMPLETED: { label: "Hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
  REJECTED: { label: "Bị từ chối", tone: "danger" },
};

// Quy đổi loại chu kỳ → số ngày (fallback khi schedule không khai báo frequencyDays).
const FREQ_DAYS: Record<string, number> = {
  DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30, BIMONTHLY: 60,
  QUARTERLY: 90, SEMIANNUAL: 182, SEMI_ANNUAL: 182, YEARLY: 365, ANNUAL: 365,
};
function scheduleIntervalDays(s: MaintenanceScheduleResponse): number {
  if (s.frequencyDays && s.frequencyDays > 0) return s.frequencyDays;
  return FREQ_DAYS[(s.frequencyType ?? "").toUpperCase()] ?? 30;
}
function addDaysISO(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function ReviewWorkOrder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const q = useApi<WorkOrderResponse>(
    () => workOrders.getById(String(id)),
    {
      mock: () => mockWorkOrders.find((w) => w.id === id)
        ?? mockWorkOrders.find((w) => w.status === "PENDING_REVIEW")
        ?? mockWorkOrders[0],
      deps: [id],
    },
  );
  const wo = q.data;

  const itemsQ = useApiList<ChecklistTemplateItemResponse>(
    () => checklistTemplates.getItems(String(wo?.checklistTemplateId)),
    { mock: () => mockChecklistItems, deps: [wo?.checklistTemplateId], enabled: !!wo?.checklistTemplateId },
  );
  const items = useMemo(() => [...itemsQ.items].sort((a, b) => a.sortOrder - b.sortOrder), [itemsQ.items]);

  const photosQ = useApiList<WorkOrderAttachmentResponse>(
    () => workOrders.getAttachments(String(wo?.id)),
    { mock: () => [], deps: [wo?.id], enabled: !!wo?.id },
  );

  const [totalCost, setTotalCost] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  function baseBody() {
    return toWorkOrderUpdate(wo!);
  }

  // Diagram 3 tail: "Đóng WO & Tính toán chu kỳ tiếp theo" — đẩy lịch bảo trì sang kỳ kế.
  async function advanceSchedule(woId: string, scheduleId: string): Promise<boolean> {
    const sres = await maintenanceSchedules.getById(scheduleId);
    if (sres.errorCode !== 200 || !sres.data) return false;
    const s = sres.data;
    const now = new Date();
    const body: UpdateMaintenanceScheduleInput = {
      id: s.id, assetId: s.assetId, scheduleType: s.scheduleType,
      checklistTemplateId: s.checklistTemplateId, autoAssignDepartmentId: s.autoAssignDepartmentId,
      frequencyType: s.frequencyType, frequencyDays: s.frequencyDays,
      startDate: s.startDate, endDate: s.endDate, leadTimeDays: s.leadTimeDays,
      isActive: s.isActive, description: s.description,
      nextDueDate: addDaysISO(now, scheduleIntervalDays(s)),
      lastExecutedAt: now.toISOString(),
      lastWoId: woId,
    };
    const ures = await maintenanceSchedules.update(body);
    return ures.errorCode === 200;
  }

  // Diagram 3 tail: "Ghi nhận lịch sử bảo trì tài sản" — ghi nhận chi phí nghiệm thu vào sổ chi phí.
  async function recordCost(woId: string, amount: number) {
    if (!wo || !amount || amount <= 0) return;
    await costTracking.create({
      referenceType: "WORK_ORDER", referenceId: woId,
      assetId: wo.assetId, buildingId: wo.buildingId,
      amount, currency: "VND", costType: "MAINTENANCE",
      costDate: todayISO(), description: `Nghiệm thu ${wo.woCode}`,
    });
  }

  async function doApprove() {
    if (!wo) return;
    setApproving(true);
    const effectiveCost = totalCost ? Number(totalCost) : wo.totalCost;
    const res = await workOrders.update({
      ...baseBody(), status: "COMPLETED", approvedAt: new Date().toISOString(),
      totalCost: effectiveCost,
    });
    if (res.errorCode !== 200) {
      setApproving(false);
      toast.error(res.errorMessage || "Nghiệm thu thất bại.");
      return;
    }
    // Sau khi đóng phiếu: tính chu kỳ kế tiếp + ghi nhận chi phí (best-effort, không chặn điều hướng).
    let schedAdvanced = false;
    if (wo.scheduleId) schedAdvanced = await advanceSchedule(wo.id, wo.scheduleId);
    if (effectiveCost) await recordCost(wo.id, Number(effectiveCost));
    setApproving(false);
    toast.success(
      schedAdvanced
        ? "Đã nghiệm thu, đóng phiếu & lên lịch bảo trì kế tiếp."
        : "Đã nghiệm thu & đóng phiếu.",
    );
    router.push(`/pm/work-orders/${wo.id}`);
  }

  async function doReject() {
    if (!wo) return;
    if (!reason.trim()) { toast.error("Nhập lý do từ chối."); return; }
    setRejecting(true);
    const res = await workOrders.update({ ...baseBody(), status: "REJECTED", rejectedReason: reason.trim() });
    setRejecting(false);
    if (res.errorCode === 200) {
      toast.success("Đã từ chối nghiệm thu.");
      setRejectOpen(false);
      router.push(`/pm/work-orders/${wo.id}`);
    } else {
      toast.error(res.errorMessage || "Từ chối thất bại.");
    }
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!wo) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy phiếu công việc."} onRetry={q.refetch} /></div>;

  const isPending = wo.status === "PENDING_REVIEW";

  return (
    <div>
      <Link href={`/pm/work-orders/${wo.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại phiếu công việc
      </Link>

      {(q.isMock || itemsQ.isMock) && <MockBanner />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{wo.woCode}</span>
            <ToneBadge tone="brand">Nghiệm thu công việc</ToneBadge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{wo.title ?? wo.woCode}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={wo.status} map={WO_STATUS} />
          <PriorityBadge value={wo.priority} />
        </div>
      </div>

      {isPending ? (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/10 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-brand" />
          <p className="text-sm text-foreground/90">Phiếu đang chờ nghiệm thu. Kiểm tra checklist, số giờ và chi phí trước khi phê duyệt.</p>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Phiếu không ở trạng thái chờ nghiệm thu ({WO_STATUS[wo.status]?.label ?? wo.status}). Thao tác nghiệm thu đã bị khoá.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Thông tin công việc">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Tài sản">
                <Link href={`/assets/${wo.assetId}`} className="font-medium text-brand hover:underline">{wo.assetName ?? "—"}</Link>
              </Row>
              <Row label="Loại">{wo.woType === "PM" ? "Bảo trì định kỳ (PM)" : "Sửa chữa (CM)"}</Row>
              <Row label="Người thực hiện">{wo.assignedToName ?? wo.createdByName ?? "—"}</Row>
              <Row label="Checklist">{wo.checklistTemplateName ?? "—"}</Row>
              <Row label="Bắt đầu">{formatDateTime(wo.actualStartAt)}</Row>
              <Row label="Kết thúc">{formatDateTime(wo.actualEndAt)}</Row>
            </div>
          </Section>

          <Section title={`Checklist (${items.length} hạng mục)`}>
            {itemsQ.loading ? (
              <LoadingState />
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có hạng mục checklist.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start gap-3 py-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {it.itemCode && <span className="font-mono text-xs text-muted-foreground">{it.itemCode}</span>}
                        <p className="text-sm text-foreground">{it.itemLabel}</p>
                        {it.isRequired && <ToneBadge tone="neutral" dot>Bắt buộc</ToneBadge>}
                      </div>
                      {it.expectedValue && <p className="mt-0.5 text-xs text-muted-foreground">Kỳ vọng: {it.expectedValue}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <PhotoCapture
            title="Ảnh minh chứng"
            photos={photosQ.items.map((a) => ({
              url: a.fileUrl,
              caption: a.caption ?? (a.attachmentType && a.attachmentType !== "EVIDENCE" ? a.attachmentType : undefined),
            }))}
            onAdd={() => {}}
            disabled
            emptyHint="Chưa có ảnh minh chứng từ KTV."
          />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Ước tính" value={wo.estimatedHours != null ? `${wo.estimatedHours}h` : "—"} icon={Clock} tone="neutral" />
            <StatCard label="Thực tế" value={wo.actualHours != null ? `${wo.actualHours}h` : "—"} icon={Gauge} tone="info" />
          </div>

          <Section title="Nghiệm thu">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tổng chi phí</p>
                <div className="relative mt-1">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number" min="0" value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    placeholder={wo.totalCost != null ? String(wo.totalCost) : "0"}
                    className="pl-9" disabled={!isPending}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Hiện tại: {formatCurrency(wo.totalCost)}</p>
              </div>
              <Button className="w-full" onClick={doApprove} disabled={!isPending || approving}>
                <CheckCircle2 className="size-4" /> {approving ? "Đang xử lý…" : "Nghiệm thu & đóng phiếu"}
              </Button>
              <Button variant="outline" className="w-full text-danger hover:text-danger" onClick={() => setRejectOpen(true)} disabled={!isPending}>
                <XCircle className="size-4" /> Từ chối — yêu cầu làm lại
              </Button>
            </div>
          </Section>

          <div className="rounded-xl border border-info/30 bg-info/10 p-4">
            <p className="text-sm text-foreground/90">Sau khi nghiệm thu: phiếu đóng lại, hệ thống ghi nhận lịch sử bảo trì, <strong className="font-semibold">tính chu kỳ bảo trì kế tiếp</strong> và ghi nhận chi phí vào sổ.</p>
          </div>
        </div>
      </div>

      <EntityModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Từ chối nghiệm thu"
        description={`${wo.woCode} · ${wo.title ?? ""}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Huỷ</Button>
            <Button variant="destructive" onClick={doReject} disabled={rejecting}>
              {rejecting ? "Đang gửi…" : "Xác nhận từ chối"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Lý do từ chối <span className="text-danger">*</span></p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5} placeholder="Ví dụ: Hạng mục đo độ rung chưa đạt, cần kiểm tra lại…" />
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-xs text-foreground/90">Phiếu sẽ chuyển sang trạng thái "Bị từ chối" kèm lý do để KTV xử lý lại.</p>
          </div>
        </div>
      </EntityModal>
    </div>
  );
}
