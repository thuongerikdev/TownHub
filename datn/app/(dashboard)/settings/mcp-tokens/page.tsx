"use client";

import { motion } from "motion/react";
import {
  KeyRound, Plus, Copy, Check, Trash2, Loader2, ShieldCheck,
  AlertCircle, RefreshCw, Terminal,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { mcpTokens, type McpTokenItem, type McpTokenCreated } from "@/lib/api";

const MCP_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "") + "/mcp";

const PRESETS = [
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
  { label: "180 ngày", days: 180 },
  { label: "365 ngày", days: 365 },
];

function fmt(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
}

function configSnippet(token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        townhub: {
          command: "npx",
          args: ["-y", "mcp-remote", MCP_URL, "--header", "Authorization: Bearer ${TOWNHUB_TOKEN}"],
          env: { TOWNHUB_TOKEN: token },
        },
      },
    },
    null,
    2,
  );
}

export default function McpTokensPage() {
  const [list, setList] = useState<McpTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form
  const [name, setName] = useState("");
  const [days, setDays] = useState(90);
  const [customDate, setCustomDate] = useState("");
  const [creating, setCreating] = useState(false);

  // kết quả vừa tạo (token hiện 1 lần)
  const [created, setCreated] = useState<McpTokenCreated | null>(null);
  const [copied, setCopied] = useState<"token" | "config" | null>(null);

  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await mcpTokens.getMine();
      if (res.errorCode === 200 && res.data) setList(res.data);
      else setError(res.errorMessage || "Không tải được danh sách mã");
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim()) {
      alert("Nhập tên gợi nhớ cho mã.");
      return;
    }
    const expiresAt = customDate
      ? new Date(customDate + "T23:59:59").toISOString()
      : new Date(Date.now() + days * 86400000).toISOString();

    setCreating(true);
    setCreated(null);
    try {
      const res = await mcpTokens.create({ name: name.trim(), expiresAt });
      if (res.errorCode === 200 && res.data) {
        setCreated(res.data);
        setName("");
        setCustomDate("");
        load();
      } else {
        alert(res.errorMessage || "Tạo mã thất bại");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Thu hồi mã này? MCP client đang dùng mã sẽ mất kết nối.")) return;
    setRevoking(id);
    try {
      const res = await mcpTokens.revoke(id);
      if (res.errorCode === 200) load();
      else alert(res.errorMessage || "Thu hồi thất bại");
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setRevoking(null);
    }
  }

  async function copy(text: string, which: "token" | "config") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      alert("Không copy được, hãy bôi đen và copy thủ công.");
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Mã <span className="text-zinc-400">MCP</span>
            </h1>
            <p className="text-sm text-zinc-400">Sinh token dài hạn để cắm TownHub vào Claude (MCP)</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form tạo mã */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-zinc-400" /> Tạo mã mới
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Tên gợi nhớ</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Claude Desktop máy nhà"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Hết hạn sau</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => { setDays(p.days); setCustomDate(""); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    !customDate && days === p.days
                      ? "bg-white/10 text-white border-white/20"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 text-zinc-300 focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Sinh mã MCP
        </button>
      </motion.div>

      {/* Kết quả vừa tạo */}
      {created && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Check className="w-5 h-5" /> Đã tạo "{created.name}" — copy ngay, token chỉ hiện MỘT LẦN!
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Token</label>
            <div className="flex gap-2">
              <code className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-emerald-300 break-all">
                {created.token}
              </code>
              <button
                onClick={() => copy(created.token, "token")}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1.5 shrink-0"
              >
                {copied === "token" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Dán vào claude_desktop_config.json
            </label>
            <div className="relative">
              <pre className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-zinc-300 overflow-x-auto">
                {configSnippet(created.token)}
              </pre>
              <button
                onClick={() => copy(configSnippet(created.token), "config")}
                className="absolute top-2 right-2 px-2.5 py-1.5 bg-white/10 border border-white/10 rounded-lg text-zinc-300 hover:text-white text-xs flex items-center gap-1.5"
              >
                {copied === "config" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Danh sách mã */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111] border border-white/5 rounded-2xl p-6"
      >
        <h2 className="text-lg font-bold text-white mb-4">Mã đã tạo</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Đang tải...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">Chưa có mã MCP nào.</div>
        ) : (
          <div className="space-y-2">
            {list.map((t) => {
              const expired = new Date(t.expiresAt).getTime() < Date.now();
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                      {t.revoked ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Đã thu hồi</span>
                      ) : expired ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-600/40 text-zinc-300">Hết hạn</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Đang hoạt động</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Tạo: {fmt(t.createdAt)} · Hết hạn: {fmt(t.expiresAt)}
                    </p>
                  </div>
                  {!t.revoked && (
                    <button
                      onClick={() => handleRevoke(t.id)}
                      disabled={revoking === t.id}
                      className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 shrink-0"
                    >
                      {revoking === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Thu hồi
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
