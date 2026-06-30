"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, BellRing, Settings,
  LogOut, Search, Menu, X, ShieldAlert, Loader2,
  Shield, ClipboardList, FileText, Wrench, Ticket,
  Package, ShoppingCart, Handshake, BarChart3,
  Monitor, ChevronDown, ChevronRight, Boxes,
  ScanFace, Cctv, Vote,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { notifications, residents } from "@/lib/api";

type NavChild = { label: string; path: string; perm?: string; residentOnly?: boolean; adminOnly?: boolean };
type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  residentOnly?: boolean;
  adminOnly?: boolean;
  perm?: string;            // quyền tối thiểu để thấy mục này
  children?: NavChild[];
};

// `perm` = mã quyền (khớp lib/rbac.ts & backend). Mục không có `perm` → ai cũng thấy.
// Mục có children: hiện nếu còn ít nhất 1 child mà user có quyền.
const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: "TỔNG QUAN",
    items: [{ icon: LayoutDashboard, label: "Bảng điều khiển", path: "/" }],
  },
  {
    section: "CƯ DÂN & CĂN HỘ",
    items: [
      { icon: Building2, label: "Căn hộ", path: "/apartments", perm: "apartment.view" },
      { icon: Users, label: "Tài khoản cư dân", path: "/residents", perm: "resident.view" },
      { icon: Cctv, label: "Camera giám sát", path: "/cameras", perm: "notification.view" },
      { icon: ScanFace, label: "Người lạ ra / vào", path: "/access-alerts", perm: "notification.view" },
      { icon: BellRing, label: "Cộng đồng cư dân", path: "/community", residentOnly: true },
      { icon: ClipboardList, label: "Tương tác cư dân", path: "/admin/engagement", adminOnly: true },
      { icon: Building2, label: "Quản lý tiện ích cư dân", path: "/admin/resident-cards", adminOnly: true },
      { icon: Building2, label: "Thẻ từ", path: "/resident-card", residentOnly: true },
    ],
  },
  {
    section: "KỸ THUẬT & TÀI SẢN",
    items: [
      {
        icon: Boxes, label: "Tài sản", path: "/assets",
        children: [
          { label: "Danh sách tài sản", path: "/assets", perm: "asset.view" },
          { label: "Quét mã QR", path: "/assets/scan", perm: "asset.view" },
          { label: "Danh mục", path: "/assets/categories", perm: "asset.view" },
          { label: "Khấu hao", path: "/assets/depreciation", perm: "asset.view" },
        ],
      },
      {
        icon: Wrench, label: "Bảo trì định kỳ", path: "/pm/work-orders",
        children: [
          { label: "Lệnh công việc (WO)", path: "/pm/work-orders", perm: "workorder.view" },
          { label: "Lịch bảo trì", path: "/pm/schedules", perm: "workorder.view" },
        ],
      },
      {
        icon: Ticket, label: "Sự cố / CM", path: "/tickets",
        children: [
          { label: "Phiếu sự cố", path: "/tickets", perm: "ticket.view" },
          { label: "Bảng SLA", path: "/tickets/sla-dashboard", perm: "ticket.view" },
        ],
      },
      {
        icon: Package, label: "Kho vật tư", path: "/inventory",
        children: [
          { label: "Tồn kho", path: "/inventory", perm: "inventory.view" },
          { label: "Danh mục vật tư", path: "/inventory/catalog", perm: "inventory.view" },
          { label: "Kiểm kê", path: "/inventory/stock-taking", perm: "inventory.audit" },
        ],
      },
      {
        icon: ShoppingCart, label: "Mua sắm", path: "/procurement/requests",
        children: [
          { label: "Yêu cầu mua (PR)", path: "/procurement/requests", perm: "procurement.view" },
          { label: "Đơn hàng (PO)", path: "/procurement/orders", perm: "procurement.order" },
          { label: "Hoá đơn", path: "/procurement/invoices", perm: "procurement.invoice" },
          { label: "Upload OCR", path: "/procurement/ocr/new", perm: "procurement.invoice" },
        ],
      },
      {
        icon: Handshake, label: "Nhà thầu", path: "/vendors",
        children: [
          { label: "Danh sách NCC", path: "/vendors", perm: "vendor.view" },
          { label: "Hợp đồng", path: "/vendors/contracts", perm: "vendor.view" },
          { label: "Đánh giá", path: "/vendors/performance", perm: "vendor.evaluate" },
        ],
      },
    ],
  },
  {
    section: "BÁO CÁO",
    items: [
      {
        icon: BarChart3, label: "Báo cáo", path: "/reports",
        children: [
          { label: "Tổng quan", path: "/reports", perm: "report.kpi" },
          { label: "KPI vận hành", path: "/reports/kpi", perm: "report.kpi" },
          { label: "Chi phí bảo trì", path: "/reports/cost", perm: "report.cost" },
        ],
      },
    ],
  },
  {
    section: "QUẢN TRỊ HỆ THỐNG",
    items: [
      { icon: Users, label: "Tài khoản", path: "/users", perm: "user.read_details" },
      { icon: ClipboardList, label: "Vai trò", path: "/roles", perm: "role.read" },
      {
        icon: Shield, label: "Phân quyền", path: "/permissions",
        children: [
          { label: "Gán quyền theo vai trò", path: "/permissions/assign", perm: "permission.assign" },
          { label: "Danh mục quyền (Actions)", path: "/permissions", perm: "permission.read" },
        ],
      },
      { icon: BellRing, label: "Thông báo", path: "/notifications", perm: "notification.view" },
      { icon: Settings, label: "Cấu hình SLA", path: "/settings/sla", perm: "ticket.view" },
      { icon: FileText, label: "Nhật ký (Audit)", path: "/audit-logs", perm: "audit_log.manage" },
      { icon: Monitor, label: "Tác vụ hệ thống", path: "/admin/system-jobs", perm: "audit_log.manage" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [hasResidentProfile, setHasResidentProfile] = useState(false);
  const [hasResidentUpdates, setHasResidentUpdates] = useState(false);
  const pathname = usePathname();
  const { user, loading, logout, hasPermission, roles } = useAuth();
  const router = useRouter();
  // Deployments may name the administrator role differently (Admin, Quản trị viên,
  // System Administrator). Notification-management permission is the reliable gate.
  const isAdmin = roles.some((role) => /admin|quản trị|quan tri/i.test(role.roleName)) ||
    hasPermission("notification.manage") || hasPermission("notification.send");
  const isResident = roles.some((role) => /cư dân|resident|chủ hộ|chu ho/i.test(role.roleName));

  useEffect(() => {
    if (!user) { setHasResidentProfile(false); return; }
    residents.getAll().then((response) => {
      setHasResidentProfile(response.errorCode === 200 && Boolean(response.data?.some((resident) => resident.authUserId === user.userID)));
    });
  }, [user]);

  useEffect(() => {
    if (!isResident && !hasResidentProfile) return;
    const seenAt = Number(localStorage.getItem("townhub.resident.seen-at") ?? "0");
    const hasNewPoll = (() => {
      try { return (JSON.parse(localStorage.getItem("townhub.community.polls") ?? "[]") as { id: number }[]).some((poll) => poll.id > seenAt); }
      catch { return false; }
    })();
    notifications.getAll().then((response) => {
      const hasNewNotification = response.errorCode === 200 && Boolean(response.data?.some((item) => new Date(item.createdAt).getTime() > seenAt));
      setHasResidentUpdates(hasNewPoll || hasNewNotification);
    });
  }, [hasResidentProfile, isResident, pathname]);

  function openResidentUpdates() {
    localStorage.setItem("townhub.resident.seen-at", String(Date.now()));
    setHasResidentUpdates(false);
  }

  // Lọc menu theo quyền: mục/đề mục không đủ quyền sẽ bị ẩn.
  // (admin là siêu quản trị → hasPermission luôn true → thấy đủ.)
  const visibleSections = NAV_SECTIONS.map((section) => {
    const items: NavItem[] = [];
    for (const item of section.items) {
      if (item.children?.length) {
        const kids = item.children.filter((c) => (!c.perm || hasPermission(c.perm)) && (!c.residentOnly || isResident || hasResidentProfile) && (!c.adminOnly || isAdmin));
        if (kids.length > 0) items.push({ ...item, children: kids });
      } else if ((!item.perm || hasPermission(item.perm)) && (!item.residentOnly || isResident || hasResidentProfile) && (!item.adminOnly || isAdmin)) {
        items.push(item);
      }
    }
    return { section: section.section, items };
  }).filter((s) => s.items.length > 0);

  function toggleMenu(path: string) {
    setOpenMenus((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  }

  const displayName = user
    ? `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.userName
    : "...";
  const avatarLetter = (user?.profile?.firstName ?? user?.userName ?? "?")[0]?.toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-lg">
            <ShieldAlert className="size-6" />
          </div>
          <Loader2 className="size-5 animate-spin text-brand" />
          <p className="text-xs text-muted-foreground">Đang xác thực…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Overlay mobile */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 flex-shrink-0 items-center border-b border-sidebar-border px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none tracking-wide text-foreground">
                TOWN<span className="text-brand">HUB</span>
              </h1>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                Management
              </p>
            </div>
          </Link>
          <button className="ml-auto text-muted-foreground hover:text-foreground lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-3">
          {visibleSections.map((section) => (
            <div key={section.section} className="mb-4">
              <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">{section.section}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const hasChildren = !!item.children?.length;
                  const isParentActive = hasChildren
                    ? item.children!.some((c) => pathname === c.path || pathname.startsWith(c.path + "/")) ||
                      pathname === item.path
                    : pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                  const isOpen = openMenus[item.path] ?? isParentActive;

                  if (hasChildren) {
                    // Chỉ tô sáng child khớp cụ thể nhất (path dài nhất) để tránh
                    // index route (vd /permissions) sáng cùng sub-route (/permissions/assign).
                    const bestChildPath = item
                      .children!.filter((c) => pathname === c.path || pathname.startsWith(c.path + "/"))
                      .reduce((best, c) => (c.path.length > best.length ? c.path : best), "");
                    return (
                      <div key={item.path}>
                        <button
                          onClick={() => toggleMenu(item.path)}
                          className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            isParentActive ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                        >
                          <item.icon className={`size-4 flex-shrink-0 ${isParentActive ? "text-brand" : ""}`} />
                          <span className="flex-1 truncate text-left font-medium">{item.label}</span>
                          {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                        </button>
                        {isOpen && (
                          <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border pl-2">
                            {item.children!.map((child) => {
                              const isChildActive = child.path === bestChildPath;
                              return (
                                <Link
                                  key={child.path}
                                  href={child.path}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`block rounded px-2 py-1.5 text-xs transition-colors ${
                                    isChildActive ? "bg-brand/10 font-medium text-brand" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.div layoutId="nav-active-bar" className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-brand" />
                      )}
                      <item.icon className={`size-4 flex-shrink-0 ${isActive ? "text-brand" : ""}`} />
                      <span className="truncate font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-3">
          <Link href="/profile" className="mb-2 flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-brand/30 hover:bg-accent">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt={displayName} className="size-8 flex-shrink-0 rounded-full border border-brand/30 object-cover" />
            ) : (
              <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/15">
                <span className="text-xs font-bold text-brand">{avatarLetter}</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            {loggingOut ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
            {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card/80 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="text-muted-foreground hover:text-foreground lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="size-5" />
            </button>
            <div className="hidden w-72 items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 transition-all focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/40 md:flex">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm…"
                className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href={isResident || hasResidentProfile ? "/community" : "/notifications"} onClick={openResidentUpdates} className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <BellRing className="size-4" />
              {hasResidentUpdates && <span className="absolute right-1.5 top-1.5 size-1.5 animate-pulse rounded-full bg-danger" />}
            </Link>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
