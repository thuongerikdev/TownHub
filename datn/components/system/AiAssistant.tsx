"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { ai, type AiChatMessage } from "@/lib/api";

const SUGGESTIONS = [
  "Liệt kê tài sản đang bảo trì",
  "Vật tư nào sắp hết hàng?",
  "Lịch bảo trì nào đã quá hạn?",
];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: AiChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ai.chat(next);
      const answer = res.errorCode === 200 && res.data ? res.data.answer : (res.errorMessage || "Có lỗi xảy ra.");
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Lỗi kết nối tới máy chủ." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Nút nổi */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Trợ lý AI"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.25)] flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed bottom-24 right-6 z-50 w-[min(92vw,400px)] h-[min(70vh,560px)] bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Trợ lý TownHub</p>
                <p className="text-[11px] text-zinc-500">Hỏi về tài sản, sự cố, kho, bảo trì…</p>
              </div>
            </div>

            {/* Tin nhắn */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">Xin chào! Mình có thể giúp bạn tra cứu dữ liệu TownHub. Thử hỏi:</p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-white text-black rounded-br-sm"
                        : "bg-white/5 border border-white/10 text-zinc-100 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tra cứu…
                  </div>
                </div>
              )}
            </div>

            {/* Ô nhập */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="p-3 border-t border-white/10 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi…"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
