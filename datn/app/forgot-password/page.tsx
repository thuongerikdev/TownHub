"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { auth } from "@/lib/api";

type Step = "email" | "verify" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return setError("Vui lòng nhập địa chỉ email.");
    setLoading(true);
    setError("");
    const response = await auth.forgotStart(email.trim());
    setLoading(false);
    if (response.errorCode !== 200) return setError(response.errorMessage || "Không thể gửi mã xác thực.");
    setStep("verify");
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 6) return setError("Mã xác thực phải gồm 6 chữ số.");
    setLoading(true);
    setError("");
    const response = await auth.forgotVerify(email.trim(), code);
    setLoading(false);
    if (response.errorCode !== 200 || !response.data) return setError(response.errorMessage || "Mã xác thực không hợp lệ.");
    setTicket(response.data);
    setStep("reset");
  }

  async function commit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError("Mật khẩu mới cần có ít nhất 8 ký tự.");
    if (password !== confirmPassword) return setError("Mật khẩu xác nhận chưa khớp.");
    setLoading(true);
    setError("");
    const response = await auth.forgotCommit(ticket, password);
    setLoading(false);
    if (response.errorCode !== 200) return setError(response.errorMessage || "Không thể cập nhật mật khẩu.");
    setStep("done");
  }

  const steps = ["Email", "Xác thực", "Mật khẩu mới"];
  const activeIndex = step === "email" ? 0 : step === "verify" ? 1 : 2;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f2] p-4 text-zinc-950 dark:bg-[#090b0a] dark:text-white">
      <div className="w-full max-w-lg rounded-[2rem] border border-black/5 bg-white p-7 shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#111411] sm:p-10">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#2e705f]">
          <ArrowLeft className="size-4" /> Quay lại đăng nhập
        </Link>

        {step !== "done" && (
          <div className="mb-9 flex items-center">
            {steps.map((label, index) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${index <= activeIndex ? "bg-[#173f35] text-white" : "bg-zinc-100 text-zinc-400 dark:bg-white/5"}`}>{index + 1}</span>
                  <span className="text-[10px] text-zinc-500">{label}</span>
                </div>
                {index < steps.length - 1 && <span className={`mx-2 mb-5 h-px flex-1 ${index < activeIndex ? "bg-[#2e705f]" : "bg-zinc-200 dark:bg-white/10"}`} />}
              </div>
            ))}
          </div>
        )}

        {step === "email" && (
          <StepForm icon={<Mail />} title="Quên mật khẩu?" description="Nhập email đã đăng ký. TownHub sẽ gửi mã xác thực để bạn tạo mật khẩu mới." onSubmit={start} loading={loading} button="Gửi mã xác thực">
            <Input type="email" value={email} onChange={setEmail} placeholder="email@townhub.vn" autoFocus />
          </StepForm>
        )}
        {step === "verify" && (
          <StepForm icon={<KeyRound />} title="Kiểm tra email" description={<>Mã xác thực đã được gửi đến <strong>{email}</strong>.</>} onSubmit={verify} loading={loading} button="Xác thực mã">
            <Input value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="text-center font-mono text-xl tracking-[.4em]" autoFocus />
          </StepForm>
        )}
        {step === "reset" && (
          <StepForm icon={<ShieldCheck />} title="Tạo mật khẩu mới" description="Sử dụng ít nhất 8 ký tự và không dùng lại mật khẩu cũ." onSubmit={commit} loading={loading} button="Cập nhật mật khẩu">
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={password} onChange={setPassword} placeholder="Mật khẩu mới" autoFocus />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Input type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Nhập lại mật khẩu mới" />
          </StepForm>
        )}
        {step === "done" && (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"><CheckCircle2 className="size-8" /></div>
            <h1 className="mt-6 text-2xl font-semibold">Đổi mật khẩu thành công</h1>
            <p className="mt-2 text-sm text-zinc-500">Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</p>
            <Link href="/login" className="mt-7 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#173f35] text-sm font-semibold text-white">Đăng nhập <ArrowRight className="size-4" /></Link>
          </div>
        )}

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      </div>
    </main>
  );
}

function StepForm({ icon, title, description, onSubmit, loading, button, children }: { icon: React.ReactNode; title: string; description: React.ReactNode; onSubmit: (event: React.FormEvent) => void; loading: boolean; button: string; children: React.ReactNode }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#173f35]/10 text-[#2e705f] [&_svg]:size-6 dark:bg-emerald-400/10 dark:text-emerald-400">{icon}</div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-500">{description}</p>
      <div className="mt-7 space-y-4">{children}</div>
      <button disabled={loading} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173f35] text-sm font-semibold text-white disabled:opacity-60">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} {button}
      </button>
    </form>
  );
}

function Input({ value, onChange, className = "", ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { value: string; onChange: (value: string) => void }) {
  return <input {...props} value={value} onChange={(event) => onChange(event.target.value)} className={`h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-[#2e705f] focus:ring-4 focus:ring-[#2e705f]/10 dark:border-white/10 dark:bg-white/5 ${className}`} />;
}
