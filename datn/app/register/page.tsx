"use client";

import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, User, MailCheck } from "lucide-react";
import { useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Step = "form" | "verify" | "done";

export default function RegisterPage() {
  const { register, verifyRegisterEmail } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [registeredUserID, setRegisteredUserID] = useState<number | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const otpRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !userName.trim() || !email.trim() || !password) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        userName: userName.trim(),
        email: email.trim(),
        password,
        gender: gender || undefined,
      });

      if (!result.success || !result.userID) {
        setError(result.error ?? "Đăng ký thất bại");
        return;
      }

      setRegisteredUserID(result.userID);
      setStep("verify");
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: { preventDefault(): void }) {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError("Mã xác thực phải có 6 chữ số");
      return;
    }
    if (!registeredUserID) return;

    setLoading(true);
    setError("");
    try {
      const result = await verifyRegisterEmail(registeredUserID, otpCode);
      if (!result.success) {
        setError(result.error ?? "Xác thực thất bại");
        setOtpCode("");
        return;
      }
      setStep("done");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-amber-600/5 blur-[80px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.35)] mx-auto mb-5"
          >
            <ShieldAlert className="w-7 h-7 text-black" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-3xl font-bold text-white tracking-wide mb-1">
              TOWN<span className="text-amber-500">HUB</span>
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Management System</p>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#111] border border-white/5 rounded-3xl p-8 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6 gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white mb-1">Xác thực thành công!</p>
                  <p className="text-sm text-zinc-400">Email của bạn đã được xác nhận. Hãy đăng nhập để tiếp tục.</p>
                </div>
                <Link
                  href="/login"
                  className="mt-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all flex items-center gap-2 text-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  Đến trang đăng nhập
                </Link>
              </motion.div>
            )}

            {step === "verify" && (
              <motion.form
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleVerify}
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <MailCheck className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Xác thực email</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Nhập mã 6 số đã gửi đến <span className="text-zinc-300">{email}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mã xác thực</label>
                  <input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white text-center tracking-[0.4em] font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? "Đang xác thực..." : "Xác Nhận"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("form"); setError(""); setOtpCode(""); }}
                  className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Quay lại
                </button>
              </motion.form>
            )}

            {step === "form" && (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleRegister}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Tạo tài khoản mới</p>
                    <p className="text-xs text-zinc-500">Điền thông tin để đăng ký</p>
                  </div>
                </div>

                {/* Họ + Tên */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Họ *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Nguyễn"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tên *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Văn A"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tên đăng nhập *</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="nguyenvana"
                    autoComplete="username"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    autoComplete="email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                {/* Password + Confirm */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mật khẩu *</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Xác nhận *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Giới tính</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none"
                  >
                    <option value="" className="bg-[#111]">Không muốn tiết lộ</option>
                    <option value="male" className="bg-[#111]">Nam</option>
                    <option value="female" className="bg-[#111]">Nữ</option>
                    <option value="other" className="bg-[#111]">Khác</option>
                  </select>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? "Đang tạo tài khoản..." : "Đăng Ký"}
                </button>

                <p className="text-center text-sm text-zinc-500">
                  Đã có tài khoản?{" "}
                  <Link href="/login" className="text-amber-500 hover:text-amber-400 font-semibold transition-colors">
                    Đăng nhập
                  </Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-xs text-center text-zinc-600 mt-6 font-mono">
            TownHub v2.0 • {new Date().getFullYear()}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
