"use client";

import type { ElementType, ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Đang tải dữ liệu…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground", className)}>
      <Loader2 className="size-6 animate-spin text-brand" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "Chưa có dữ liệu",
  description,
  action,
  className,
}: {
  icon?: ElementType;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">Không tải được dữ liệu</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {message || "Đã xảy ra lỗi khi kết nối tới máy chủ."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/** Banner cảnh báo dữ liệu đang là mẫu (mock), hiển thị khi backend offline + cờ mock bật. */
export function MockBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning",
        className,
      )}
    >
      <FlaskConical className="size-3.5" />
      <span>Đang hiển thị <strong>dữ liệu mẫu</strong> — backend chưa kết nối. Dữ liệu chỉ để xem trước giao diện.</span>
    </div>
  );
}
