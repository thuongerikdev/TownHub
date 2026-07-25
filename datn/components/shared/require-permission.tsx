"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LoadingState } from "./states";

/**
 * Chặn cả TRANG khi thiếu quyền — ẩn mục trên sidebar là chưa đủ vì người dùng
 * vẫn có thể gõ trực tiếp URL. Backend đã gác bằng [Authorize(Policy=…)], màn này
 * chỉ để báo lỗi tử tế thay vì loạt toast 403.
 *
 * `perm` là mã quyền (khớp lib/rbac.ts + TH.Constant/PermissionConstants.cs).
 * Truyền mảng = chỉ cần có MỘT trong số đó.
 */
export function RequirePermission({
  perm,
  children,
}: {
  perm: string | string[];
  children: ReactNode;
}) {
  const { hasPermission, loading, user } = useAuth();

  // Chờ AuthContext dựng xong (permissions lấy từ cache rồi mới refetch /me).
  if (loading || !user) return <LoadingState label="Đang kiểm tra quyền truy cập…" />;

  const codes = Array.isArray(perm) ? perm : [perm];
  if (codes.some((code) => hasPermission(code))) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10 text-danger">
        <ShieldX className="size-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">Bạn không có quyền truy cập trang này</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Vai trò hiện tại của bạn không được cấp quyền cho chức năng này.
          Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/">Về bảng điều khiển</Link>
      </Button>
    </div>
  );
}
