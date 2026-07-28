"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Mail, Smartphone, RefreshCw, Loader2, Users } from "lucide-react";
import { notifications, type NotificationInboxResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const AUDIENCE_LABEL: Record<string, string> = {
  all: "Tất cả cư dân", building_a: "Tòa A", building_b: "Tòa B",
  villa: "Villa", owners: "Chủ hộ", staff: "Ban Quản Lý",
};

function audienceLabel(a: string) {
  if (a?.startsWith("floor:")) return `Tầng ${a.slice(6)}`;
  return AUDIENCE_LABEL[a] ?? a;
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function PortalNotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationInboxResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notifications.inbox(user.userID);
      if (res.errorCode === 200 && res.data) {
        setItems([...res.data].sort(
          (a, b) => new Date(b.sentAt ?? b.createdAt).getTime() - new Date(a.sentAt ?? a.createdAt).getTime()
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // Đánh dấu đã xem để tắt badge trên chuông (dùng chung khoá với header portal).
  useEffect(() => {
    if (!loading) localStorage.setItem("townhub.portal.notif-seen-at", String(Date.now()));
  }, [loading]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Thông báo</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Thông báo từ Ban quản lý gửi tới bạn</p>
        </div>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600 border border-white/5 rounded-2xl bg-[#111]">
          <BellRing className="w-9 h-9 mb-2 opacity-30" />
          <p className="text-sm">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const isEmail = n.channel === "email";
            return (
              <article key={n.id} className="rounded-2xl border border-white/5 bg-[#111] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    isEmail ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {isEmail ? <Mail className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                    {isEmail ? "Email" : "Push App"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                    <Users className="w-3 h-3" />
                    {audienceLabel(n.audience)}
                  </span>
                  <span className="ml-auto text-[11px] text-zinc-600">{fmt(n.sentAt ?? n.createdAt)}</span>
                </div>
                <h2 className="text-sm font-semibold text-white">{n.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-zinc-400">{n.content}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
