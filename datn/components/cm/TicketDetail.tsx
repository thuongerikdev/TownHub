"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft, MapPin, User, Clock, AlertTriangle, CheckCircle2,
  UserPlus, TrendingUp, RefreshCw, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import {
  tickets, slaConfigs, displayUser,
  type TicketResponse, type TicketStatusHistoryResponse, type SlaEscalationLogResponse,
  type SlaConfigResponse, type UpdateTicketInput,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { mockTickets, mockSlaConfigs } from "@/lib/mock/cm";
import {
  MockBanner, LoadingState, ErrorState, StatusBadge, PriorityBadge, SlaBadge, ToneBadge,
  EntityModal, Field, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";

const TICKET_STATUS: Record<string, StatusDef> = {
  OPEN: { label: "Mới", tone: "info" },
  ASSIGNED: { label: "Đã phân công", tone: "brand" },
  IN_PROGRESS: { label: "Đang xử lý", tone: "warning" },
  PENDING_MATERIAL: { label: "Chờ vật tư", tone: "neutral" },
  RESOLVED: { label: "Đã xử lý", tone: "success" },
  CLOSED: { label: "Đã đóng", tone: "neutral" },
};
const CATEGORY: Record<string, string> = {
  ELECTRICAL: "Điện", PLUMBING: "Nước", HVAC: "HVAC", ELEVATOR: "Thang máy", FIRE: "PCCC", OTHER: "Khác",
};
const SOURCE: Record<string, string> = { RESIDENT: "Cư dân", STAFF: "Nhân viên", SYSTEM: "Hệ thống", IOT: "Cảm biến IoT" };

const SLA_HOURS: Record<string, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
const isClosed = (t: TicketResponse) => t.status === "RESOLVED" || t.status === "CLOSED";
function slaDue(t: TicketResponse): string {
  const hrs = SLA_HOURS[t.priority] ?? 24;
  return new Date(new Date(t.createdAt).getTime() + hrs * 3600_000).toISOString();
}
function remaining(t: TicketResponse) {
  const diff = new Date(slaDue(t)).getTime() - Date.now();
  const overdue = diff < 0;
  const h = Math.floor(Math.abs(diff) / 3600_000);
  const m = Math.floor((Math.abs(diff) % 3600_000) / 60_000);
  return { overdue, text: `${h}h ${m}ph` };
}

const NEXT_STATUS: Record<string, string[]> = {
  ASSIGNED: ["IN_PROGRESS", "PENDING_MATERIAL"],
  IN_PROGRESS: ["PENDING_MATERIAL", "RESOLVED"],
  PENDING_MATERIAL: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED"],
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<TicketResponse>(
    () => tickets.getById(String(id)),
    { mock: () => mockTickets.find((t) => t.id === id) ?? mockTickets[0], deps: [id] },
  );
  const t = q.data;

  const historyQ = useApiList<TicketStatusHistoryResponse>(
    () => tickets.getStatusHistory(String(id)),
    { deps: [id], enabled: !!t },
  );
  const escalationQ = useApiList<SlaEscalationLogResponse>(
    () => tickets.getEscalationLogs(String(id)),
    { deps: [id], enabled: !!t },
  );
  const slaQ = useApiList<SlaConfigResponse>(() => slaConfigs.getAll(), { mock: mockSlaConfigs });

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [toStatus, setToStatus] = useState("");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  const sla = useMemo(
    () => slaQ.items.find((s) => s.id === t?.slaConfigId),
    [slaQ.items, t?.slaConfigId],
  );

  const timeline = useMemo(() => {
    const items = [...historyQ.items].sort((a, b) => +new Date(a.changedAt) - +new Date(b.changedAt));
    if (items.length > 0) {
      return items.map((h) => ({ status: h.toStatus, at: h.changedAt, by: displayUser(h.changedBy), note: h.note }));
    }
    if (!t) return [];
    const out: { status: string; at: string; by?: string; note?: string }[] = [
      { status: "OPEN", at: t.createdAt, by: t.reportedByName ?? displayUser(t.reportedBy) },
    ];
    if (t.resolvedAt) out.push({ status: "RESOLVED", at: t.resolvedAt, note: t.resolutionNote });
    if (t.closedAt) out.push({ status: "CLOSED", at: t.closedAt });
    return out;
  }, [historyQ.items, t]);

  function updateBase(x: TicketResponse): UpdateTicketInput {
    return {
      id: x.id, ticketCode: x.ticketCode, buildingId: x.buildingId, reportedByName: x.reportedByName,
      floorId: x.floorId, unitId: x.unitId, assetId: x.assetId, slaConfigId: x.slaConfigId,
      purchaseRequestId: x.purchaseRequestId, title: x.title, description: x.description,
      category: x.category, priority: x.priority, source: x.source,
    };
  }

  async function doAssign() {
    if (!t) return;
    if (!assignee.trim()) { toast.error("Nhập tên KTV được phân công."); return; }
    setWorking(true);
    // assignedTo/changedBy are GUID columns with no Auth directory — record the KTV
    // name in the status-history note (shown in the timeline) instead.
    const res = await tickets.assign({ ticketId: t.id });
    if (res.errorCode === 200) {
      await tickets.changeStatus({ ticketId: t.id, toStatus: "ASSIGNED", fromStatus: t.status, note: `Phân công cho ${assignee.trim()}` });
    }
    setWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã phân công KTV.");
      setAssignOpen(false); setAssignee("");
      q.refetch(); historyQ.refetch();
    } else toast.error(res.errorMessage || "Phân công thất bại.");
  }

  async function doTransition() {
    if (!t) return;
    if (!toStatus) { toast.error("Chọn trạng thái cần chuyển."); return; }
    setWorking(true);
    const res = await tickets.changeStatus({ ticketId: t.id, toStatus, fromStatus: t.status, note: note.trim() || undefined });
    if (res.errorCode === 200 && (toStatus === "RESOLVED" || toStatus === "CLOSED")) {
      await tickets.update({
        ...updateBase(t), status: toStatus,
        resolvedAt: toStatus === "RESOLVED" ? new Date().toISOString() : t.resolvedAt,
        closedAt: toStatus === "CLOSED" ? new Date().toISOString() : t.closedAt,
        resolutionNote: note.trim() || t.resolutionNote,
      });
    }
    setWorking(false);
    if (res.errorCode === 200) {
      toast.success("Đã cập nhật trạng thái.");
      setStatusOpen(false); setNote(""); setToStatus("");
      q.refetch(); historyQ.refetch();
    } else toast.error(res.errorMessage || "Cập nhật thất bại.");
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!t) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy ticket."} onRetry={q.refetch} /></div>;

  const rem = remaining(t);
  const nexts = NEXT_STATUS[t.status] ?? [];
  const closed = isClosed(t);

  return (
    <div>
      <Link href="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Danh sách ticket
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{t.ticketCode}</span>
            <ToneBadge tone="neutral">{CATEGORY[t.category ?? "OTHER"] ?? t.category}</ToneBadge>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{t.title ?? t.ticketCode}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><User className="size-4" /> {t.reportedByName ?? displayUser(t.reportedBy) ?? "—"}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" /> {formatDateTime(t.createdAt)}</span>
            {t.unitId && <span className="flex items-center gap-1"><MapPin className="size-4" /> {t.unitId}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SlaBadge dueDate={slaDue(t)} closed={closed} />
          <StatusBadge value={t.status} map={TICKET_STATUS} />
          <PriorityBadge value={t.priority} />
        </div>
      </div>

      {!closed && rem.overdue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold text-foreground">Đã vi phạm SLA</p>
            <p className="text-sm text-muted-foreground">Quá hạn xử lý <span className="font-medium text-danger">{rem.text}</span>. Cần ưu tiên xử lý ngay.</p>
          </div>
        </div>
      )}
      {!closed && !rem.overdue && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
          <Clock className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-foreground">Còn {rem.text} đến hạn SLA</p>
            <p className="text-sm text-muted-foreground">Hạn xử lý: {formatDateTime(slaDue(t))}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Thông tin sự cố">
            <div className="grid grid-cols-2 gap-4">
              <Row label="Tài sản liên quan">
                {t.assetId
                  ? <Link href={`/assets/${t.assetId}`} className="font-medium text-brand hover:underline">{t.assetCode ?? t.assetId}</Link>
                  : "—"}
              </Row>
              <Row label="Vị trí">{[t.unitId, t.floorId].filter(Boolean).join(" · ") || "—"}</Row>
              <Row label="Loại sự cố">{CATEGORY[t.category ?? "OTHER"] ?? t.category}</Row>
              <Row label="Nguồn báo">{SOURCE[t.source] ?? t.source}</Row>
              {t.description && <div className="col-span-2"><Row label="Mô tả chi tiết">{t.description}</Row></div>}
              {t.resolutionNote && <div className="col-span-2"><Row label="Ghi chú xử lý"><span className="text-success">{t.resolutionNote}</span></Row></div>}
            </div>
          </Section>

          <Section title="Timeline trạng thái">
            {historyQ.loading ? (
              <LoadingState />
            ) : (
              <ol className="space-y-4">
                {timeline.map((ev, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-brand">
                        <CheckCircle2 className="size-4" />
                      </span>
                      {i < timeline.length - 1 && <span className="mt-1 w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={ev.status} map={TICKET_STATUS} />
                        <span className="text-xs text-muted-foreground">{formatDateTime(ev.at)}</span>
                      </div>
                      {ev.by && <p className="mt-1 text-sm text-muted-foreground">Bởi {ev.by}</p>}
                      {ev.note && <p className="mt-0.5 text-sm text-foreground/90">{ev.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Nhật ký leo thang (escalation)">
            {escalationQ.items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <Inbox className="size-8" />
                Chưa có lần leo thang nào.
              </div>
            ) : (
              <ul className="space-y-3">
                {escalationQ.items.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 text-sm">
                    <ToneBadge tone="danger">L{e.escalationLevel}</ToneBadge>
                    <div>
                      <p className="text-foreground">{e.escalatedTo ?? "—"} {e.channel ? `· ${e.channel}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.escalatedAt)}</p>
                      {e.message && <p className="mt-0.5 text-foreground/90">{e.message}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="SLA áp dụng">
            <div className="space-y-3 text-sm">
              <Row label="Cấu hình">{sla?.name ?? t.slaConfigName ?? "Tự động theo ưu tiên"}</Row>
              <Row label="Thời gian phản hồi">{sla?.responseTimeHours != null ? `${sla.responseTimeHours} giờ` : "—"}</Row>
              <Row label="Thời gian xử lý">{sla?.resolutionTimeHours != null ? `${sla.resolutionTimeHours} giờ` : `${SLA_HOURS[t.priority] ?? 24} giờ`}</Row>
              <Row label="Hạn xử lý"><SlaBadge dueDate={slaDue(t)} closed={closed} /></Row>
            </div>
          </Section>

          <Section title="Thao tác">
            <div className="space-y-2">
              {t.status === "OPEN" && (
                <Button className="w-full" onClick={() => setAssignOpen(true)}><UserPlus className="size-4" /> Phân công KTV</Button>
              )}
              {nexts.length > 0 && (
                <Button className="w-full" variant={t.status === "OPEN" ? "outline" : "default"} onClick={() => { setToStatus(nexts[0]); setStatusOpen(true); }}>
                  <RefreshCw className="size-4" /> Cập nhật trạng thái
                </Button>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tickets/sla-dashboard"><TrendingUp className="size-4" /> SLA Dashboard</Link>
              </Button>
            </div>
            {closed && <p className="mt-3 text-xs text-muted-foreground">Ticket đã đóng — không còn thao tác xử lý.</p>}
          </Section>

          <Section title="Người báo cáo">
            <div className="space-y-3 text-sm">
              <Row label="Người báo">{t.reportedByName ?? displayUser(t.reportedBy) ?? "—"}</Row>
              <Row label="Nguồn">{SOURCE[t.source] ?? t.source}</Row>
              <Row label="Thời gian">{formatDateTime(t.createdAt)}</Row>
            </div>
          </Section>
        </div>
      </div>

      <EntityModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title="Phân công kỹ thuật viên"
        description={`${t.ticketCode} · ${t.title ?? ""}`}
        size="sm"
        onSubmit={doAssign}
        submitting={working}
        submitLabel="Phân công"
      >
        <Field label="Kỹ thuật viên" required hint="Nhập tên hoặc mã KTV phụ trách">
          <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Nguyễn Văn An" />
        </Field>
      </EntityModal>

      <EntityModal
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title="Cập nhật trạng thái"
        description={`${t.ticketCode} · ${t.title ?? ""}`}
        size="sm"
        onSubmit={doTransition}
        submitting={working}
        submitLabel="Cập nhật"
      >
        <div className="space-y-4">
          <Field label="Chuyển sang" required>
            <Select value={toStatus} onValueChange={setToStatus}>
              <SelectTrigger><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
              <SelectContent>
                {nexts.map((s) => <SelectItem key={s} value={s}>{TICKET_STATUS[s]?.label ?? s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ghi chú" hint={toStatus === "RESOLVED" || toStatus === "CLOSED" ? "Mô tả cách xử lý" : undefined}>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú thao tác…" />
          </Field>
        </div>
      </EntityModal>
    </div>
  );
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
