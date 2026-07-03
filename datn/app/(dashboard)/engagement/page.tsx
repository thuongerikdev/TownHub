"use client";

import Link from "next/link";
import { BellRing, ClipboardList, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function EngagementPage() {
  const { roles, hasPermission } = useAuth();
  const canManage = roles.some((role) => /admin|quản trị|quan tri/i.test(role.roleName)) || hasPermission("notification.manage") || hasPermission("notification.send");
  if (canManage) return <div className="mx-auto max-w-5xl space-y-6"><header className="rounded-2xl border border-border bg-surface p-6"><p className="text-sm font-medium text-brand">KHU VỰC QUẢN TRỊ</p><h1 className="mt-1 text-2xl font-bold">Tương tác & giao tiếp cư dân</h1><p className="mt-1 text-sm text-muted-foreground">Quản lý khảo sát và thông báo gửi tới cư dân.</p></header><div className="grid gap-5 md:grid-cols-2"><Link href="/polls" className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand"><ClipboardList className="size-6 text-violet-400" /><h2 className="mt-4 font-bold">Quản lý khảo sát</h2><p className="mt-2 text-sm text-muted-foreground">Tạo, sửa, xóa và xem thống kê khảo sát.</p></Link><Link href="/notifications" className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand"><Send className="size-6 text-rose-400" /><h2 className="mt-4 font-bold">Quản lý thông báo</h2><p className="mt-2 text-sm text-muted-foreground">Soạn và gửi thông báo theo nhóm cư dân.</p></Link></div></div>;
  return <div className="mx-auto max-w-4xl space-y-6"><header className="rounded-2xl border border-border bg-surface p-6"><BellRing className="size-7 text-brand" /><h1 className="mt-3 text-2xl font-bold">Tương tác cư dân</h1><p className="mt-1 text-sm text-muted-foreground">Xem khảo sát và thông báo từ Ban quản lý.</p></header><Link href="/community" className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6 hover:border-brand"><ClipboardList className="size-6 text-brand" /><div><h2 className="font-bold">Mở khu cư dân</h2><p className="text-sm text-muted-foreground">Khảo sát và thông báo của bạn.</p></div></Link></div>;
}
