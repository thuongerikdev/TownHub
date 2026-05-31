"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/format";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const toneClass: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/25",
  danger: "bg-danger/15 text-danger border-danger/25",
  info: "bg-info/15 text-info border-info/25",
  brand: "bg-brand/15 text-brand border-brand/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

const dotClass: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  brand: "bg-brand",
  neutral: "bg-muted-foreground",
};

export function ToneBadge({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}

export interface StatusDef {
  label: string;
  tone: Tone;
}

/** Badge trạng thái dựa trên bảng ánh xạ {status: {label, tone}}. */
export function StatusBadge({
  value,
  map,
  dot = true,
  className,
}: {
  value?: string | null;
  map: Record<string, StatusDef>;
  dot?: boolean;
  className?: string;
}) {
  const key = (value ?? "").toString();
  const def = map[key] ?? map[key.toUpperCase()] ?? { label: key || "—", tone: "neutral" as Tone };
  return (
    <ToneBadge tone={def.tone} dot={dot} className={className}>
      {def.label}
    </ToneBadge>
  );
}

const PRIORITY_MAP: Record<string, StatusDef> = {
  LOW: { label: "Thấp", tone: "neutral" },
  MEDIUM: { label: "Trung bình", tone: "info" },
  NORMAL: { label: "Bình thường", tone: "info" },
  HIGH: { label: "Cao", tone: "warning" },
  URGENT: { label: "Khẩn", tone: "danger" },
  CRITICAL: { label: "Nghiêm trọng", tone: "danger" },
};

export function PriorityBadge({ value, className }: { value?: string | null; className?: string }) {
  return <StatusBadge value={value} map={PRIORITY_MAP} className={className} />;
}

/**
 * Badge SLA: tự suy tone từ hạn chót (dueDate) khi chưa đóng.
 * - quá hạn → danger; < 24h → warning; còn hạn → success; đã đóng → neutral.
 */
export function SlaBadge({
  dueDate,
  closed = false,
  className,
}: {
  dueDate?: string | null;
  closed?: boolean;
  className?: string;
}) {
  if (closed) return <ToneBadge tone="neutral" className={className}>Đã đóng</ToneBadge>;
  const days = daysUntil(dueDate);
  if (days == null) return <ToneBadge tone="neutral" className={className}>Không hạn</ToneBadge>;
  if (days < 0) return <ToneBadge tone="danger" dot className={className}>Quá hạn {Math.abs(days)}d</ToneBadge>;
  if (days <= 1) return <ToneBadge tone="warning" dot className={className}>Sắp trễ</ToneBadge>;
  return <ToneBadge tone="success" dot className={className}>Còn {days}d</ToneBadge>;
}
