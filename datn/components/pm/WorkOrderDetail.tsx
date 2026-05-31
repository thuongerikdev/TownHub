"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft, Calendar, Clock, Wrench, UserPlus, QrCode, ClipboardCheck,
  CheckCircle2, XCircle, Pencil, Gauge, FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  workOrders, type WorkOrderResponse, type UpdateWorkOrderInput,
} from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { mockWorkOrders } from "@/lib/mock/pm";
import {
  StatCard, EntityModal, Field, MockBanner, StatusBadge, PriorityBadge, ToneBadge,
  LoadingState, ErrorState, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatDate, formatCurrency } from "@/lib/format";

const WO_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  ASSIGNED: { label: "Đã phân công", tone: "info" },
  IN_PROGRESS: { label: "Đang thực hiện", tone: "warning" },
  PENDING_REVIEW: { label: "Chờ nghiệm thu", tone: "brand" },
  COMPLETED: { label: "Hoàn thành", tone: "success" },
  CANCELLED: { label: "Đã huỷ", tone: "danger" },
  REJECTED: { label: "Bị từ chối", tone: "danger" },
};

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
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

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const q = useApi<WorkOrderResponse>(
    () => workOrders.getById(String(id)),
    { mock: () => mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0], deps: [id] },
  );
  const wo = q.data;

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Full payload: WorkOrder UpdateAsync overwrites every mapped field, so a partial
  // PUT would wipe woType/title/priority/dates. Preserve all current values here.
  function woBase(w: WorkOrderResponse): UpdateWorkOrderInput {
    return {
      id: w.id, woCode: w.woCode, assetId: w.assetId, checklistTemplateId: w.checklistTemplateId,
      buildingId: w.buildingId, scheduleId: w.scheduleId, createdBy: w.createdBy,
      woType: w.woType, priority: w.priority, title: w.title, description: w.description,
      scheduledDate: w.scheduledDate, dueDate: w.dueDate, estimatedHours: w.estimatedHours,
      reviewerId: w.reviewerId, actualStartAt: w.actualStartAt, actualEndAt: w.actualEndAt,
      approvedAt: w.approvedAt, rejectedReason: w.rejectedReason,
      actualHours: w.actualHours, totalCost: w.totalCost, status: w.status,
    };
  }

  async function doAssign() {
    if (!wo) return;
    if (!assignee.trim()) { toast.error("Nhập tên KTV được phân công."); return; }
    setAssigning(true);
    // assignedTo is a GUID column with no Auth directory — create the assignment row
    // (empty GUID), record the KTV name in the description, and advance the workflow.
    const a = await workOrders.assignTechnician({ woId: wo.id });
    if (a.errorCode !== 200) {
      setAssigning(false);
      toast.error(a.errorMessage || "Phân công thất bại.");
      return;
    }
    const note = `KTV phụ trách: ${assignee.trim()}`;
    const res = await workOrders.update({
      ...woBase(wo),
      description: wo.description ? `${wo.description}\n${note}` : note,
      status: "ASSIGNED",
    });
    setAssigning(false);
    if (res.errorCode === 200) { toast.success("Đã phân công KTV."); setAssignOpen(false); q.refetch(); }
    else toast.error(res.errorMessage || "Phân công thất bại.");
  }
  async function doCancel() {
    if (!wo) return;
    const res = await workOrders.update({ ...woBase(wo), status: "CANCELLED" });
    if (res.errorCode === 200) { toast.success("Đã huỷ phiếu công việc."); setCancelOpen(false); q.refetch(); }
    else toast.error(res.errorMessage || "Huỷ thất bại.");
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!wo) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy phiếu công việc."} onRetry={q.refetch} /></div>;

  const isPM = wo.woType === "PM";
  const canAssign = wo.status === "DRAFT";
  const closed = wo.status === "COMPLETED" || wo.status === "CANCELLED";

  return (
    <div>
      <Link href="/pm/work-orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại danh sách
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{wo.woCode}</span>
            <ToneBadge tone={isPM ? "info" : "warning"}>{isPM ? "Bảo trì định kỳ" : "Sửa chữa"}</ToneBadge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{wo.title ?? wo.woCode}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="size-4" /> Tạo: {formatDateTime(wo.createdAt)}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" /> Hạn: {formatDate(wo.dueDate)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={wo.status} map={WO_STATUS} />
          <PriorityBadge value={wo.priority} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ước tính" value={wo.estimatedHours != null ? `${wo.estimatedHours}h` : "—"} icon={Clock} tone="neutral" />
        <StatCard label="Thực tế" value={wo.actualHours != null ? `${wo.actualHours}h` : "—"} icon={Gauge} tone="info" />
        <StatCard label="Chi phí" value={formatCurrency(wo.totalCost)} icon={FileText} tone="brand" />
        <StatCard label="Trạng thái" value={WO_STATUS[wo.status]?.label ?? wo.status} icon={ClipboardCheck} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Thông tin tài sản">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Tài sản">
                <Link href={`/assets/${wo.assetId}`} className="font-medium text-brand hover:underline">{wo.assetName ?? "—"}</Link>
              </Row>
              <Row label="Mã tài sản"><span className="font-mono text-xs">{wo.assetCode ?? "—"}</span></Row>
              <Row label="Loại công việc">{isPM ? "Bảo trì định kỳ (PM)" : "Sửa chữa (CM)"}</Row>
              <Row label="Checklist áp dụng">{wo.checklistTemplateName ?? "—"}</Row>
            </div>
          </Section>

          {wo.description && (
            <Section title="Mô tả công việc">
              <p className="text-sm text-foreground/90">{wo.description}</p>
            </Section>
          )}

          <Section
            title="Quy trình thực hiện"
          >
            <ol className="space-y-3">
              {[
                { key: "DRAFT", label: "Tạo phiếu công việc", done: true },
                { key: "ASSIGNED", label: "Phân công kỹ thuật viên", done: ["ASSIGNED", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED"].includes(wo.status) },
                { key: "IN_PROGRESS", label: "KTV check-in & thực hiện", done: ["IN_PROGRESS", "PENDING_REVIEW", "COMPLETED"].includes(wo.status) },
                { key: "PENDING_REVIEW", label: "Nộp checklist chờ nghiệm thu", done: ["PENDING_REVIEW", "COMPLETED"].includes(wo.status) },
                { key: "COMPLETED", label: "Nghiệm thu & đóng phiếu", done: wo.status === "COMPLETED" },
              ].map((step) => (
                <li key={step.key} className="flex items-center gap-3">
                  <span className={`flex size-6 items-center justify-center rounded-full text-xs ${step.done ? "bg-success/15 text-success" : "bg-surface-2 text-muted-foreground"}`}>
                    {step.done ? <CheckCircle2 className="size-4" /> : "•"}
                  </span>
                  <span className={`text-sm ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Phân công" action={canAssign ? <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}><UserPlus className="size-4" /> Phân công</Button> : undefined}>
            <div className="space-y-3 text-sm">
              <Row label="Người tạo">{wo.createdBy ?? "—"}</Row>
              <Row label="Bắt đầu thực tế">{formatDateTime(wo.actualStartAt)}</Row>
              <Row label="Kết thúc thực tế">{formatDateTime(wo.actualEndAt)}</Row>
              {wo.rejectedReason && <Row label="Lý do từ chối"><span className="text-danger">{wo.rejectedReason}</span></Row>}
            </div>
          </Section>

          <Section title="Thao tác">
            <div className="space-y-2">
              {wo.status === "DRAFT" && (
                <Button className="w-full" onClick={() => setAssignOpen(true)}><UserPlus className="size-4" /> Phân công KTV</Button>
              )}
              {wo.status === "ASSIGNED" && (
                <Button className="w-full" asChild><Link href={`/pm/work-orders/${wo.id}/checkin`}><QrCode className="size-4" /> Check-in hiện trường</Link></Button>
              )}
              {wo.status === "IN_PROGRESS" && (
                <Button className="w-full" asChild><Link href={`/pm/work-orders/${wo.id}/checklist`}><ClipboardCheck className="size-4" /> Mở checklist</Link></Button>
              )}
              {wo.status === "PENDING_REVIEW" && (
                <Button className="w-full" asChild><Link href={`/pm/work-orders/${wo.id}/review`}><CheckCircle2 className="size-4" /> Nghiệm thu</Link></Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => router.push("/pm/work-orders")}>
                <Pencil className="size-4" /> Về danh sách
              </Button>
              {!closed && (
                <Button variant="ghost" className="w-full text-danger hover:text-danger" onClick={() => setCancelOpen(true)}>
                  <XCircle className="size-4" /> Huỷ phiếu công việc
                </Button>
              )}
            </div>
          </Section>
        </div>
      </div>

      <EntityModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Phân công kỹ thuật viên"
        description={`${wo.woCode} · ${wo.title ?? ""}`}
        size="sm"
        onSubmit={doAssign}
        submitting={assigning}
        submitLabel="Phân công"
      >
        <Field label="Kỹ thuật viên" required hint="Nhập tên hoặc mã KTV phụ trách">
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Nguyễn Văn An" />
        </Field>
      </EntityModal>

      <EntityModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Huỷ phiếu công việc?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Không</Button>
            <Button variant="destructive" onClick={doCancel}>Huỷ phiếu</Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">Huỷ <strong className="text-foreground">{wo.woCode}</strong>? Hành động này dừng toàn bộ quy trình của phiếu.</p>
      </EntityModal>
    </div>
  );
}
