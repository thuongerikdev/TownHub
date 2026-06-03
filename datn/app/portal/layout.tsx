"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, LogOut, Loader2, Store, User, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { href: "/portal",          label: "Nhà cung cấp", icon: Store },
  { href: "/portal/my-store", label: "Gian hàng",    icon: Briefcase },
  { href: "/portal/profile",  label: "Cá nhân",      icon: User },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  const displayName = user
    ? `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""}`.trim() || user.userName
    : "";
  const avatarLetter = (user?.profile?.firstName ?? user?.userName ?? "?")[0]?.toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans">
      {/* ── Top header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/portal" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.3)]">
              <ShieldAlert className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">
              TOWN<span className="text-amber-500">HUB</span>
            </span>
          </Link>

          {/* Desktop nav (hidden on mobile — moved to bottom bar) */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: avatar + logout */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/portal/profile"
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors min-w-0"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                {user?.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-amber-400 font-bold text-[11px]">{avatarLetter}</span>
                )}
              </div>
              <span className="text-xs text-zinc-400 hidden sm:block truncate max-w-[120px]">{displayName}</span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Đăng xuất"
              className="flex items-center gap-1.5 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {loggingOut
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <LogOut className="w-4 h-4" />}
              <span className="hidden sm:inline text-xs">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {/* pb-20 on mobile to clear the bottom nav bar */}
      <main className="max-w-6xl mx-auto px-4 pt-5 pb-24 md:pb-8">
        {children}
      </main>

      {/* ── Bottom nav – mobile only ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5">
        <div className="flex items-center justify-around h-16">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
                  active ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
                {active && <span className="absolute bottom-2 w-1 h-1 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
