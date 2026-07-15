"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, Building2, CheckCircle2, Eye, EyeOff, KeyRound,
  Loader2, LockKeyhole, ShieldCheck, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Step = "credentials" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const { login, completeMfa } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [mfaTicket, setMfaTicket] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mfaRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!userName.trim() || !password) {
      setError("Vui lòng nhập tài khoản và mật khẩu.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await login(userName.trim(), password);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.requiresMfa && result.mfaTicket) {
        setMfaTicket(result.mfaTicket);
        setStep("mfa");
        setTimeout(() => mfaRef.current?.focus(), 200);
        return;
      }
      router.push(result.isResident ? "/portal" : "/");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(event: React.FormEvent) {
    event.preventDefault();
    if (mfaCode.length !== 6) {
      setError("Mã xác thực phải gồm 6 chữ số.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await completeMfa(mfaTicket, mfaCode);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/10 sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-brand p-12 text-brand-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-brand-foreground/10" />
          <div className="absolute -right-8 -top-8 size-52 rounded-full border border-brand-foreground/10" />
          <div className="absolute bottom-20 left-12 size-40 rounded-full bg-brand-foreground/10 blur-3xl" />

          <Link href="/" className="relative z-10 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-foreground text-brand">
              <Building2 className="size-6" />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">TownHub</p>
              <p className="text-[10px] uppercase tracking-[.25em] text-brand-foreground/60">Resident Portal</p>
            </div>
          </Link>

          <div className="relative z-10 max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-foreground/15 bg-brand-foreground/10 px-3 py-1.5 text-xs text-brand-foreground">
              <Sparkles className="size-3.5" />
              Một nơi cho mọi tiện ích cư dân
            </div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">
              Kết nối cuộc sống
              <span className="block text-brand-foreground/70">trong khu đô thị.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-brand-foreground/70">
              Theo dõi thông báo, gửi yêu cầu hỗ trợ và quản lý thông tin cá nhân nhanh chóng trên một nền tảng an toàn.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-3">
            {[["24/7", "Hỗ trợ cư dân"], ["Bảo mật", "Xác thực 2 lớp"], ["Tức thời", "Nhận thông báo"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-brand-foreground/10 bg-brand-foreground/[.07] p-4 backdrop-blur">
                <p className="font-semibold text-brand-foreground">{value}</p>
                <p className="mt-1 text-xs text-brand-foreground/60">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-foreground"><Building2 className="size-5" /></span>
              <p className="text-lg font-bold">TownHub</p>
            </div>

            <AnimatePresence mode="wait">
              {step === "credentials" ? (
                <motion.div key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -16 }}>
                  <p className="mb-3 text-sm font-semibold text-brand">CHÀO MỪNG TRỞ LẠI</p>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Đăng nhập tài khoản</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Truy cập không gian sống và các dịch vụ dành riêng cho bạn.</p>

                  <form onSubmit={handleLogin} className="mt-8 space-y-5">
                    <Field label="Email hoặc tên đăng nhập">
                      <input value={userName} onChange={(e) => setUserName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); } }} autoComplete="username" placeholder="vidu@townhub.vn" className="h-12 w-full rounded-xl border border-border bg-muted/50 px-4 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20" />
                    </Field>
                    <Field label="Mật khẩu" action={<Link href="/forgot-password" className="text-brand hover:underline">Quên mật khẩu?</Link>}>
                      <div className="relative">
                        <input ref={passwordRef} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" className="h-12 w-full rounded-xl border border-border bg-muted/50 px-4 pr-12 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20" />
                        <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </Field>
                    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-brand" />
                      Duy trì đăng nhập
                    </label>
                    {error && <ErrorMessage message={error} />}
                    <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60">
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                      {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                  </form>

                  {/* Tạm ẩn nút tạo tài khoản cư dân
                  <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> CHƯA CÓ TÀI KHOẢN? <span className="h-px flex-1 bg-border" />
                  </div>
                  <Link href="/register" className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold transition hover:bg-accent">Tạo tài khoản cư dân</Link>
                  */}
                  <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-brand" /> Dữ liệu của bạn được mã hóa và bảo vệ.</p>
                </motion.div>
              ) : (
                <motion.div key="mfa" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><KeyRound className="size-7" /></div>
                  <h2 className="text-3xl font-semibold tracking-tight">Xác thực bảo mật</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Nhập mã gồm 6 chữ số từ ứng dụng xác thực của bạn.</p>
                  <form onSubmit={handleMfa} className="mt-8 space-y-5">
                    <input ref={mfaRef} value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={6} placeholder="000000" className="h-16 w-full rounded-2xl border border-border bg-muted/50 text-center font-mono text-2xl tracking-[.45em] outline-none focus:border-brand focus:ring-4 focus:ring-brand/20" />
                    {error && <ErrorMessage message={error} />}
                    <button disabled={loading || mfaCode.length !== 6} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60">
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Xác nhận
                    </button>
                    <button type="button" onClick={() => { setStep("credentials"); setError(""); setMfaCode(""); }} className="w-full text-sm text-muted-foreground hover:text-brand">Quay lại đăng nhập</button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center justify-between text-sm font-medium">{label}{action}</span>{children}</label>;
}

function ErrorMessage({ message }: { message: string }) {
  return <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"><LockKeyhole className="mt-0.5 size-4 shrink-0" />{message}</motion.p>;
}
