"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, FileText, Clock, Gauge } from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, checklistTemplates,
  type WorkOrderResponse, type ChecklistTemplateItemResponse, type UpdateWorkOrderInput,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockWorkOrders, mockChecklistItems } from "@/lib/mock/pm";
import {
  MockBanner, LoadingState, ErrorState, StatusBadge, PriorityBadge, ToneBadge,
  EntityModal, StatCard, type StatusDef,
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

  const [totalCost, setTotalCost] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  function baseBody(): UpdateWorkOrderInput {
    return {
      id: wo!.id, woCode: wo!.woCode, assetId: wo!.assetId,
      checklistTemplateId: wo!.checklistTemplateId, buildingId: wo!.buildingId,
    };
  }

  async function doApprove() {
    if (!wo) return;
    setApproving(true);
    const res = await workOrders.update({
      ...baseBody(), status: "COMPLETED", approvedAt: new Date().toISOString(),
      totalCost: totalCost ? Number(totalCost) : wo.totalCost,
    });
    setApproving(false);
    if (res.errorCode === 200) {
      toast.success("Đã nghiệm thu & đóng phiếu.");
      router.push(`/pm/work-orders/${wo.id}`);
    } else {
      toast.error(res.errorMessage || "Nghiệm thu thất bại.");
    }
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
              <Row label="Người thực hiện">{wo.createdBy ?? "—"}</Row>
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
            <p className="text-sm text-foreground/90">Sau khi nghiệm thu, phiếu sẽ đóng và không thể chỉnh sửa. Vật tư được trừ kho theo thực tế.</p>
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
