"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, QrCode, CheckCircle2, MapPin, Clock, ChevronRight, Wrench } from "lucide-react";
import { toast } from "sonner";
import { workOrders, type WorkOrderResponse, type UpdateWorkOrderInput } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { mockWorkOrders } from "@/lib/mock/pm";
import { MockBanner, LoadingState, ErrorState, ToneBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export default function CheckinScreen() {
  const { id } = useParams<{ id: string }>();
  const q = useApi<WorkOrderResponse>(
    () => workOrders.getById(String(id)),
    { mock: () => mockWorkOrders.find((w) => w.id === id) ?? mockWorkOrders[0], deps: [id] },
  );
  const wo = q.data;

  const [manualCode, setManualCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkinTime, setCheckinTime] = useState("");

  async function doCheckin() {
    if (!wo) return;
    setSubmitting(true);
    const body: UpdateWorkOrderInput = {
      id: wo.id, woCode: wo.woCode, assetId: wo.assetId, checklistTemplateId: wo.checklistTemplateId,
      buildingId: wo.buildingId, status: "IN_PROGRESS", actualStartAt: new Date().toISOString(),
    };
    const res = await workOrders.update(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      setCheckinTime(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
      setCheckedIn(true);
      toast.success("Đã check-in. Bắt đầu tính giờ làm việc.");
    } else {
      toast.error(res.errorMessage || "Check-in thất bại.");
    }
  }

  if (q.loading) return <div className="py-10"><LoadingState /></div>;
  if (!wo) return <div className="py-10"><ErrorState message={q.error ?? "Không tìm thấy phiếu công việc."} onRetry={q.refetch} /></div>;

  if (checkedIn) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Đã check-in lúc {checkinTime}</h2>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {wo.assetName ?? "—"}{wo.assetCode ? ` · ${wo.assetCode}` : ""}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" /> Bắt đầu tính giờ làm việc
          </p>
          <Button className="mt-8 w-full" asChild>
            <Link href={`/pm/work-orders/${wo.id}/checklist`}>
              Mở checklist <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/pm/work-orders/${wo.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại phiếu công việc
      </Link>

      {q.isMock && <MockBanner />}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{wo.woCode}</span>
          <ToneBadge tone="info"><Wrench className="size-3" /> Check-in hiện trường</ToneBadge>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">{wo.title ?? wo.woCode}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{wo.assetName ?? "—"} · Hạn {formatDate(wo.dueDate)}</p>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Quét mã QR tài sản</h2>
        <button
          type="button"
          onClick={doCheckin}
          disabled={submitting}
          className="relative flex h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand/40 bg-brand/5 transition-colors hover:bg-brand/10 disabled:opacity-60"
        >
          <span className="absolute left-4 top-4 size-8 rounded-tl-md border-l-4 border-t-4 border-brand" />
          <span className="absolute right-4 top-4 size-8 rounded-tr-md border-r-4 border-t-4 border-brand" />
          <span className="absolute bottom-4 left-4 size-8 rounded-bl-md border-b-4 border-l-4 border-brand" />
          <span className="absolute bottom-4 right-4 size-8 rounded-br-md border-b-4 border-r-4 border-brand" />
          <QrCode className="mb-3 size-16 text-brand" />
          <p className="font-semibold text-foreground">Camera đang mở</p>
          <p className="mt-1 text-sm text-muted-foreground">Hướng vào mã QR trên thiết bị</p>
          <span className="mt-4 rounded-full bg-brand/10 px-3 py-1 text-xs text-brand">
            {submitting ? "Đang check-in…" : "Nhấn để mô phỏng quét QR & check-in"}
          </span>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold text-foreground">Hoặc nhập mã thủ công</h2>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Mã tài sản in trên nhãn thiết bị</p>
        <div className="flex gap-3">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={wo.assetCode ?? "AST-2025-0…"}
            onKeyDown={(e) => { if (e.key === "Enter" && manualCode.trim()) doCheckin(); }}
          />
          <Button onClick={doCheckin} disabled={!manualCode.trim() || submitting}>Xác nhận</Button>
        </div>
      </div>
    </div>
  );
}
