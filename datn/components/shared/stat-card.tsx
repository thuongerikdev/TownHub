"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "./status-badge";

const iconTone: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  brand: "bg-brand/15 text-brand",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
  trend,
  loading = false,
  onClick,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: ElementType;
  tone?: Tone;
  hint?: ReactNode;
  trend?: { value: string; positive?: boolean };
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors",
        onClick && "hover:border-brand/40 hover:bg-accent/40",
        className,
      )}
    >
      {Icon && (
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", iconTone[tone])}>
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-6 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        )}
        {(hint || trend) && (
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            {trend && (
              <span className={cn("font-medium", trend.positive ? "text-success" : "text-danger")}>
                {trend.value}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </div>
    </Comp>
  );
}
