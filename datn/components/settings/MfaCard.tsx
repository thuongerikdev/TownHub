"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ShieldCheck, ShieldAlert, Loader2, KeyRound, Copy, Check,
  Smartphone, X, AlertCircle,
} from "lucide-react";
import { auth, type MfaStatus, type StartTotpResponse } from "@/lib/api";

type Enroll = StartTotpResponse & { qr: string };

export default function MfaCard() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await auth.mfaStatus();
      if (res.errorCode === 200 && res.data) setStatus(res.data);
      else setError(res.errorMessage || "Không tải được trạng thái MFA");
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  function reset() {
    setEnroll(null);
    setDisabling(false);
    setCode("");
    setError("");
  }

  async function handleStart() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await auth.mfaStart();
      if (res.errorCode !== 200 || !res.data) {
        setError(res.errorMessage || "Không khởi tạo được MFA");
        return;
      }
      const qr = await QRCode.toDataURL(res.data.otpauthUri, { width: 220, margin: 1 });
      setEnroll({ ...res.data, qr });
      setCode("");
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (code.length !== 6) { setError("Mã xác thực phải gồm 6 chữ số."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await auth.mfaConfirm(code);
      if (res.errorCode !== 200) { setError(res.errorMessage || "Mã không đúng."); return; }
      setMsg("Đã bật xác thực 2 lớp (MFA).");
      reset();
      await loadStatus();
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (code.length !== 6) { setError("Nhập mã 6 chữ số từ app xác thực để tắt."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await auth.mfaDisable(code);
      if (res.errorCode !== 200) { setError(res.errorMessage || "Không tắt được MFA."); return; }
      setMsg("Đã tắt xác thực 2 lớp (MFA).");
      reset();
      await loadStatus();
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setBusy(false);
    }
  }

  function copySecret() {
    if (!enroll) return;
    navigator.clipboard?.writeText(enroll.secretBase32).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const enabled = status?.enabled;

  return (
    <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${
            enabled ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
          }`}>
            {enabled ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-amber-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Xác thực 2 lớp (MFA / TOTP)</p>
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                }`}>
                  {enabled ? "Đang bật" : "Đang tắt"}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-md">
              Dùng Google Authenticator / Microsoft Authenticator để sinh mã 6 số khi đăng nhập, tăng bảo mật tài khoản.
            </p>
            {enabled && status?.enabledAt && (
              <p className="text-[11px] text-zinc-600 mt-1">
                Đã bật từ {new Date(status.enabledAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        </div>

        {/* Primary action */}
        {!loading && !enroll && !disabling && (
          enabled ? (
            <button
              onClick={() => { setDisabling(true); setCode(""); setError(""); setMsg(""); }}
              className="mt-0.5 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Tắt MFA
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={busy}
              className="mt-0.5 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Bật MFA
            </button>
          )
        )}
      </div>

      {/* Feedback */}
      {(error || msg) && (
        <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
          error ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
        }`}>
          {error ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <Check className="w-3.5 h-3.5 flex-shrink-0" />}
          {error || msg}
        </div>
      )}

      {/* Enrollment panel */}
      {enroll && (
        <div className="mt-5 pt-5 border-t border-white/5 grid md:grid-cols-[auto_1fr] gap-5">
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="QR MFA" className="w-[180px] h-[180px] rounded-lg bg-white p-2" />
            <button
              onClick={copySecret}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors font-mono"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {enroll.secretBase32}
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Smartphone className="w-4 h-4 text-amber-400" />
              Quét mã QR bằng app xác thực, rồi nhập mã 6 số để hoàn tất.
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="w-full max-w-[220px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-[0.35em] text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirm}
                disabled={busy || code.length !== 6}
                className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-amber-500 text-black hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Xác nhận & Bật
              </button>
              <button onClick={reset} className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable panel */}
      {disabling && (
        <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
          <p className="text-xs text-zinc-400">Nhập mã 6 số hiện tại từ app xác thực để xác nhận tắt MFA.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="w-full max-w-[220px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-[0.35em] text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/30 transition-all"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleDisable}
              disabled={busy || code.length !== 6}
              className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-rose-500 text-white hover:bg-rose-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Xác nhận tắt
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors">
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
