"use client";
import { motion } from "motion/react";
import {
  Settings as SettingsIcon, Palette, Globe, Database,
  Lock, CreditCard, ShieldCheck, ToggleRight, ToggleLeft,
  Server, Loader2, RefreshCw, Save, AlertCircle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { systemConfig, type SystemConfigResponse } from "@/lib/api";

const SETTINGS_SECTIONS = [
  { id: "general", label: "Cấu hình chung", icon: Globe },
  { id: "appearance", label: "Giao diện", icon: Palette },
  { id: "security", label: "Bảo mật & Phân quyền", icon: Lock },
  { id: "payment", label: "Cổng thanh toán", icon: CreditCard },
  { id: "database", label: "Lưu trữ dữ liệu", icon: Database },
];

// Mapping key → nhóm hiển thị đẹp hơn trong UI
const DISPLAY_MAP: Record<string, { label: string; description: string; section: string; type: "text" | "boolean" | "number" }> = {
  project_name:           { label: "Tên Dự Án",          description: "Tên hiển thị của dự án",          section: "general",  type: "text" },
  project_code:           { label: "Mã Dự Án",           description: "Mã bất biến, không sửa được",      section: "general",  type: "text" },
  support_email:          { label: "Email Hỗ Trợ",       description: "Email liên hệ Ban Quản Lý",         section: "general",  type: "text" },
  hotline:                { label: "Hotline",             description: "Số điện thoại liên hệ",             section: "general",  type: "text" },
  maintenance_mode:       { label: "Chế Độ Bảo Trì",    description: "Tạm dừng truy cập từ cư dân",       section: "general",  type: "boolean" },
  sms_gateway:            { label: "SMS Gateway",         description: "Nhà cung cấp SMS",                  section: "payment",  type: "text" },
  payment_gateways:       { label: "Cổng Thanh Toán",    description: "Danh sách cổng (cách nhau bởi ,)",  section: "payment",  type: "text" },
  max_notification_daily: { label: "Giới Hạn Thông Báo", description: "Số thông báo tối đa mỗi ngày",      section: "security", type: "number" },
  storage_provider:       { label: "Lưu Trữ File",       description: "Nhà cung cấp lưu trữ",              section: "database", type: "text" },
  session_timeout_min:    { label: "Timeout Phiên (phút)", description: "Thời gian timeout phiên đăng nhập", section: "security", type: "number" },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [configs, setConfigs] = useState<SystemConfigResponse[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await systemConfig.getAll();
      if (res.errorCode === 200 && res.data) {
        setConfigs(res.data);
        const init: Record<string, string> = {};
        res.data.forEach((c) => { init[c.key] = c.value; });
        setEdits(init);
      } else {
        setError(res.errorMessage || "Không tải được cấu hình");
      }
    } catch { setError("Lỗi kết nối server"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  async function handleSave(key: string) {
    setSaving(key);
    try {
      const res = await systemConfig.update(key, edits[key]);
      if (res.errorCode === 200) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
        setConfigs((prev) => prev.map((c) => c.key === key ? { ...c, value: edits[key] } : c));
      } else {
        alert(res.errorMessage || "Lưu thất bại");
      }
    } catch { alert("Lỗi kết nối"); }
    finally { setSaving(null); }
  }

  async function handleSaveAll() {
    const changedKeys = configs
      .filter((c) => edits[c.key] !== undefined && edits[c.key] !== c.value)
      .map((c) => c.key);
    if (changedKeys.length === 0) return;
    setSaving("__all__");
    try {
      await Promise.all(changedKeys.map((key) => systemConfig.update(key, edits[key])));
      setSaved("__all__");
      setTimeout(() => setSaved(null), 2000);
      setConfigs((prev) => prev.map((c) => ({ ...c, value: edits[c.key] ?? c.value })));
    } catch { alert("Lỗi kết nối"); }
    finally { setSaving(null); }
  }

  const tabConfigs = configs.filter((c) => {
    const meta = DISPLAY_MAP[c.key];
    if (!meta) return false;
    return meta.section === activeTab;
  });

  const isReadOnly = (key: string) => key === "project_code" || !configs.find((c) => c.key === key)?.isPublic === false ? false : false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <SettingsIcon className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Cấu Hình <span className="text-zinc-400">Hệ Thống</span>
            </h1>
            <p className="text-sm text-zinc-400">Thiết lập tham số cho toàn bộ dự án TownHub</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving === "__all__"}
            className="px-5 py-2.5 bg-white text-black font-semibold rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {saving === "__all__" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {saved === "__all__" ? "Đã Lưu!" : "Lưu Tất Cả"}
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col gap-2 h-fit"
        >
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Danh mục</h3>
          {SETTINGS_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === section.id
                  ? "bg-white/10 text-white shadow-sm border border-white/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <section.icon className={`w-4 h-4 ${activeTab === section.id ? "text-white" : "text-zinc-500"}`} />
              {section.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 bg-[#111] border border-white/5 rounded-2xl p-6"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải cấu hình...</span>
            </div>
          ) : tabConfigs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <SettingsIcon className="w-8 h-8 text-zinc-500" style={{ animationDuration: "3s" }} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Đang phát triển</h3>
              <p className="text-sm text-zinc-400 max-w-sm">Tính năng này đang được cập nhật trong phiên bản tiếp theo.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {(() => { const S = SETTINGS_SECTIONS.find((s) => s.id === activeTab); return S ? <S.icon className="w-5 h-5 text-zinc-400" /> : null; })()}
                {SETTINGS_SECTIONS.find((s) => s.id === activeTab)?.label}
              </h2>

              <div className="space-y-5">
                {tabConfigs.map((config) => {
                  const meta = DISPLAY_MAP[config.key];
                  if (!meta) return null;
                  const isBool = meta.type === "boolean";
                  const isLocked = config.key === "project_code";
                  const currentVal = edits[config.key] ?? config.value;
                  const isDirty = currentVal !== config.value;

                  return (
                    <div key={config.key} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-white">{meta.label}</p>
                            {!config.isPublic && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">Nội bộ</span>
                            )}
                            {isDirty && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Chưa lưu</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mb-3">{meta.description}</p>

                          {isBool ? (
                            <button
                              onClick={() => setEdits((e) => ({ ...e, [config.key]: e[config.key] === "true" ? "false" : "true" }))}
                              className="flex items-center gap-2 text-sm"
                            >
                              {currentVal === "true" ? (
                                <ToggleRight className="w-7 h-7 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 text-zinc-500" />
                              )}
                              <span className={currentVal === "true" ? "text-emerald-400" : "text-zinc-400"}>
                                {currentVal === "true" ? "Bật" : "Tắt"}
                              </span>
                            </button>
                          ) : (
                            <input
                              type={meta.type === "number" ? "number" : "text"}
                              disabled={isLocked}
                              value={currentVal}
                              onChange={(e) => setEdits((prev) => ({ ...prev, [config.key]: e.target.value }))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white disabled:text-zinc-500 disabled:cursor-not-allowed focus:outline-none focus:border-white/30 transition-all"
                            />
                          )}
                        </div>

                        {!isLocked && (
                          <button
                            onClick={() => handleSave(config.key)}
                            disabled={saving === config.key || !isDirty}
                            className="mt-8 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
                          >
                            {saving === config.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            {saved === config.key ? "Đã lưu!" : "Lưu"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Maintenance toggle special treatment */}
              {activeTab === "general" && (
                <>
                  <hr className="border-white/5" />
                  <div className="flex items-center justify-between p-4 rounded-xl border border-rose-500/30 bg-rose-500/5">
                    <div className="flex items-center gap-4">
                      <Server className="w-8 h-8 text-rose-500" />
                      <div>
                        <p className="text-sm font-bold text-white">Chế độ Bảo Trì</p>
                        <p className="text-xs text-zinc-400">Tạm dừng truy cập từ ứng dụng cư dân</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEdits((e) => ({ ...e, maintenance_mode: e["maintenance_mode"] === "true" ? "false" : "true" }));
                        handleSave("maintenance_mode");
                      }}
                      className="text-zinc-500 hover:text-white transition-colors"
                    >
                      {edits["maintenance_mode"] === "true" ? (
                        <ToggleRight className="w-8 h-8 text-rose-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-zinc-500" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}