"use client";

import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, ArrowRight, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Step = "credentials" | "mfa";

export default function LoginPage() {
  const router = useRouter();
  const { login, completeMfa } = useAuth();
  const [step, setStep] = useState<Step>("credentials");
  const [mfaTicket, setMfaTicket] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mfaRef = useRef<HTMLInputElement>(null);

  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!userName.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin");
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
        setTimeout(() => mfaRef.current?.focus(), 300);
        return;
      }
      router.push(result.isResident ? "/portal" : "/");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: { preventDefault(): void }) {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setError("Mã MFA phải có 6 chữ số");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await completeMfa(mfaTicket, mfaCode);
      if (result.error) {
        setError(result.error);
        setMfaCode("");
        return;
      }
      router.push("/");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-amber-600/5 blur-[80px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.35)] mx-auto mb-6"
          >
            <ShieldAlert className="w-8 h-8 text-black" />
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
            {step === "credentials" ? (
              <motion.form
                key="creds"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <p className="text-lg font-semibold text-white mb-1">Đăng nhập</p>
                  <p className="text-xs text-zinc-500">Nhập tên đăng nhập và mật khẩu để tiếp tục</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Tên đăng nhập / Email
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="admin hoặc admin@fz.com"
                    autoComplete="username"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex justify-between">
                    <span>Mật khẩu</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("credentials");
                        // TODO: navigate to forgot password flow
                      }}
                      className="text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      Quên mật khẩu?
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
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
                  {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
                </button>

              </motion.form>
            ) : (
              <motion.form
                key="mfa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleMfa}
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Xác thực 2 bước</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Nhập mã 6 số từ ứng dụng xác thực của bạn</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mã TOTP</label>
                  <input
                    ref={mfaRef}
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
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
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {loading ? "Đang xác minh..." : "Xác Minh"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(""); setMfaCode(""); }}
                  className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Quay lại
                </button>
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
