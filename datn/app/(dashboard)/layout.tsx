"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, BellRing, Settings,
  LogOut, Search, Menu, X, ShieldAlert, Loader2,
  Shield, ClipboardList, FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isMockMode } from "@/lib/api";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tổng quan",              path: "/" },
  { icon: Users,           label: "Tài khoản & Phân quyền", path: "/users" },
  { icon: Building2,       label: "Định danh căn hộ",       path: "/apartments" },
  { icon: BellRing,        label: "Trung tâm thông báo",    path: "/notifications" },
  { icon: Shield,          label: "Phân quyền",             path: "/roles" },
  { icon: ClipboardList,   label: "Audit Log",              path: "/audit-logs" },
  { icon: FileText,        label: "Xuất báo cáo",           path: "/reports" },
  { icon: Settings,        label: "Cấu hình hệ thống",      path: "/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  // Poll mock mode status
  useEffect(() => {
    const check = () => setMockMode(isMockMode());
    check();
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, []);

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
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <ShieldAlert className="w-6 h-6 text-black" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <p className="text-xs text-zinc-600">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 overflow-hidden font-sans">
      {/* Mock mode banner */}
      {mockMode && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/20 border-b border-amber-500/30 px-4 py-1.5 text-center">
          <p className="text-xs text-amber-400 font-medium">
            ⚠ Đang dùng dữ liệu mẫu (mock) — Server chưa kết nối được
          </p>
        </div>
      )}

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${mockMode ? "pt-8" : ""}`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-5 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.3)]">
              <ShieldAlert className="w-4 h-4 text-black" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide leading-none">
                TOWN<span className="text-amber-500">HUB</span>
              </h1>
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold mt-0.5">
                Management
              </p>
            </div>
          </div>
          <button className="ml-auto lg:hidden text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2 px-2">Menu</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 group relative text-sm ${
                    isActive ? "text-amber-400 bg-amber-500/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-y-0 left-0 w-0.5 bg-amber-500 rounded-r-full"
                    />
                  )}
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-amber-500" : "group-hover:text-zinc-300 transition-colors"}`} />
                  <span className="font-medium truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 border border-white/5 mb-2">
            {user?.profile?.avatar ? (
              <img src={user.profile.avatar} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-amber-500/30 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-400 font-bold text-xs">{avatarLetter}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-amber-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main className={`flex-1 flex flex-col min-w-0 ${mockMode ? "pt-8" : ""}`}>
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-5 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-zinc-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 w-72 focus-within:ring-1 focus-within:ring-amber-500/50 focus-within:border-amber-500/50 transition-all">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-zinc-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mockMode && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Mock
              </span>
            )}
            <Link href="/notifications" className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <BellRing className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}