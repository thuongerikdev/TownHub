"use client";

import type { FormEvent, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

export function EntityModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitting = false,
  submitLabel = "Lưu",
  cancelLabel = "Huỷ",
  footer,
  size = "md",
  submitDisabled = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onSubmit?: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  footer?: ReactNode;
  size?: keyof typeof sizeClass;
  submitDisabled?: boolean;
}) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-hidden p-0", sizeClass[size])}>
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

          {footer ?? (
            onSubmit && (
              <DialogFooter className="border-t border-border px-6 py-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                  {cancelLabel}
                </Button>
                <Button type="submit" disabled={submitting || submitDisabled}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {submitLabel}
                </Button>
              </DialogFooter>
            )
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Cặp nhãn + control dùng trong form modal. */
export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
