"use client";

import Link from "next/link";
import { BellRing, ClipboardList, Plus, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminEngagementPage() {
  const { roles, hasPermission } = useAuth();
  const isAdmin = roles.some((role) => /admin|quản trị|quan tri/i.test(role.roleName)) ||
    hasPermission("notification.manage") || hasPermission("notification.send");
  if (!isAdmin) return <div className="rounded-2xl border border-border bg-surface p-8 text-sm text-muted-foreground">Chỉ tài khoản quản trị mới được truy cập trang này.</div>;
  return <div className="mx-auto max-w-5xl space-y-6"><header className="rounded-2xl border border-border bg-surface p-6"><p className="text-sm font-medium text-brand">TÀI KHOẢN ADMIN</p><h1 className="mt-1 text-2xl font-bold">Tương tác cư dân</h1><p className="mt-1 text-sm text-muted-foreground">Tạo và quản lý khảo sát, thông báo đến đúng nhóm cư dân.</p></header><div className="grid gap-5 md:grid-cols-2"><section className="rounded-2xl border border-border bg-surface p-6"><div className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10"><ClipboardList className="size-5 text-violet-400" /></div><h2 className="mt-4 text-lg font-bold">Quản lý khảo sát</h2><p className="mt-2 text-sm text-muted-foreground">Tạo, sửa, xóa khảo sát; theo dõi tỷ lệ tham gia và kết quả biểu quyết.</p><Link href="/polls" className="mt-5 flex w-fit items-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" />Tạo / quản lý khảo sát</Link></section><section className="rounded-2xl border border-border bg-surface p-6"><div className="flex size-11 items-center justify-center rounded-xl bg-rose-500/10"><BellRing className="size-5 text-rose-400" /></div><h2 className="mt-4 text-lg font-bold">Quản lý thông báo</h2><p className="mt-2 text-sm text-muted-foreground">Soạn, sửa, xóa và gửi thông báo theo tòa, tầng hoặc chủ hộ.</p><Link href="/notifications" className="mt-5 flex w-fit items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white"><Send className="size-4" />Tạo / quản lý thông báo</Link></section></div></div>;
}
