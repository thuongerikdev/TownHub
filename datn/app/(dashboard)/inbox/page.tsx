"use client";

import { motion } from "motion/react";
import { BellRing, Inbox, Mail, Smartphone, RefreshCw, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

function channelMeta(ch: string) {
  if (ch === "email") return { icon: Mail, label: "Email", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  return { icon: Smartphone, label: "Push App", cls: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function InboxPage() {
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

  // Đánh dấu đã xem để tắt chấm đỏ trên chuông (dùng chung khoá với layout).
  useEffect(() => {
    if (!loading) localStorage.setItem("townhub.resident.seen-at", String(Date.now()));
  }, [loading]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Inbox className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hộp thư thông báo</h1>
            <p className="text-sm text-muted-foreground">Các thông báo được gửi tới bạn</p>
          </div>
        </div>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </motion.header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-muted-foreground">
          <BellRing className="mb-3 size-10 opacity-30" />
          <p className="text-sm">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const ch = channelMeta(n.channel);
            return (
              <motion.article
                key={n.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${ch.cls}`}>
                    <ch.icon className="size-3" />
                    {ch.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {audienceLabel(n.audience)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{fmt(n.sentAt ?? n.createdAt)}</span>
                </div>
                <h2 className="font-semibold text-foreground">{n.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{n.content}</p>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
