"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { buildings as buildingsApi, floors as floorsApi } from "@/lib/api";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2, CheckCircle, XCircle, Clock, Plus,
  X, Loader2, AlertCircle, Phone, Mail, Briefcase,
  Home, AlertTriangle, ChevronRight, ShieldCheck,
  FileWarning, Users, Store, Wrench, Send,
  ClipboardList, Box, ArrowLeft, LayoutGrid,
} from "lucide-react";
import type { ApartmentInfo } from "@/components/Building3DModel";
import type { CampusBuildingInfo } from "@/components/CampusOverview3D";

const Building3DModel = dynamic(() => import("@/components/Building3DModel"), { ssr: false });
const CampusOverview3D = dynamic(() => import("@/components/CampusOverview3D"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "low" | "medium" | "high" | "urgent";

interface ProviderReg {
  id: number;
  companyName: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  services: string[];
  appliedAt: string;
  status: "pending" | "approved" | "rejected";
  note?: string;
}

interface ResidentReq {
  id: number;
  resident: string;
  apartment: string;
  providerName: string;
  serviceType: string;
  description: string;
  priority: Priority;
  requiresStructuralCheck: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  providerStatus: "waiting" | "accepted" | "in_progress" | "completed";
  createdAt: string;
}

interface MgtReq {
  id: number;
  title: string;
  providerName: string;
  serviceType: string;
  description: string;
  priority: Priority;
  status: "sent" | "accepted" | "in_progress" | "completed" | "rejected";
  createdAt: string;
  estimatedDays?: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INIT_REGS: ProviderReg[] = [
  {
    id: 1, status: "pending",
    companyName: "Công ty Sửa chữa An Bình",
    category: "Sửa chữa & Bảo trì",
    contactPerson: "Nguyễn Văn Bình",
    phone: "0901 234 567",
    email: "anbinh@repair.vn",
    services: ["Điện", "Nước", "Điều hòa", "Sàn gỗ"],
    appliedAt: "2026-05-20",
  },
  {
    id: 2, status: "pending",
    companyName: "Trung tâm Thể hình FitLife",
    category: "Thể dục – Thể thao",
    contactPerson: "Trần Thị Hoa",
    phone: "0912 345 678",
    email: "fitlife@gym.vn",
    services: ["Gym", "Yoga", "PT cá nhân", "Lớp nhóm"],
    appliedAt: "2026-05-22",
  },
];

const INIT_RESIDENT_REQS: ResidentReq[] = [
  {
    id: 1, approvalStatus: "pending", providerStatus: "waiting",
    resident: "Nguyễn Văn An", apartment: "A1201",
    providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Đập thông căn hộ", priority: "medium",
    requiresStructuralCheck: true,
    description: "Đập tường ngăn giữa A1201 và A1202 để mở rộng không gian gia đình. Đã có bản vẽ thiết kế.",
    createdAt: "2026-05-21",
  },
  {
    id: 2, approvalStatus: "pending", providerStatus: "waiting",
    resident: "Hoàng Thị Em", apartment: "D205",
    providerName: "An ninh Bảo vệ Toàn Cầu",
    serviceType: "Lắp camera riêng căn hộ", priority: "low",
    requiresStructuralCheck: false,
    description: "Lắp 2 camera ngoài cửa chính và ban công. Cần kiểm tra quy định an ninh tòa nhà D.",
    createdAt: "2026-05-22",
  },
  {
    id: 3, approvalStatus: "pending", providerStatus: "waiting",
    resident: "Trần Thị Bình", apartment: "B305",
    providerName: "Công ty Sửa chữa An Bình",
    serviceType: "Thay cửa nhôm kính ban công", priority: "medium",
    requiresStructuralCheck: false,
    description: "Thay cửa ban công nhôm kính cũ thành cửa trượt 3 cánh theo mẫu chung tòa nhà.",
    createdAt: "2026-05-23",
  },
];

const INIT_MGT_REQS: MgtReq[] = [
  {
    id: 1, status: "in_progress",
    title: "Sửa thang máy Toà A – Cabin 2",
    providerName: "Công ty Kỹ thuật Minh Tâm",
    serviceType: "Bảo trì thang máy",
    description: "Thang máy cabin 2 lỗi dừng tầng không chính xác, cần sửa khẩn.",
    priority: "urgent",
    createdAt: "2026-05-18",
    estimatedDays: 3,
  },
  {
    id: 2, status: "accepted",
    title: "Vệ sinh bể nước toàn khu định kỳ",
    providerName: "Dịch vụ Vệ sinh Sạch Đẹp",
    serviceType: "Vệ sinh – Làm sạch",
    description: "Vệ sinh 6 tháng cho 3 bể chứa toà A, B, C.",
    priority: "medium",
    createdAt: "2026-05-15",
    estimatedDays: 5,
  },
  {
    id: 3, status: "sent",
    title: "Bảo trì hệ thống PCCC hàng năm",
    providerName: "Công ty PCCC An Toàn",
    serviceType: "Phòng cháy chữa cháy",
    description: "Kiểm tra và bảo dưỡng hệ thống chữa cháy tự động và họng nước toàn khu.",
    priority: "high",
    createdAt: "2026-05-23",
    estimatedDays: 7,
  },
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<Priority, { label: string; cls: string }> = {
  low:    { label: "Thấp",       cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  medium: { label: "Trung bình", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  high:   { label: "Cao",        cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  urgent: { label: "Khẩn cấp",  cls: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const MGT_STATUS: Record<MgtReq["status"], { label: string; cls: string; dot: string }> = {
  sent:        { label: "Đã gửi, chờ phản hồi",  cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",     dot: "bg-zinc-500" },
  accepted:    { label: "NCC chấp nhận",          cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",     dot: "bg-blue-400 animate-pulse" },
  in_progress: { label: "Đang thi công",          cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",  dot: "bg-amber-500 animate-pulse" },
  completed:   { label: "Hoàn thành",             cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  rejected:    { label: "NCC từ chối",            cls: "bg-red-500/15 text-red-400 border-red-500/20",        dot: "bg-red-500" },
};

const PROVIDERS_LIST = [
  "Công ty Kỹ thuật Minh Tâm",
  "Dịch vụ Vệ sinh Sạch Đẹp",
  "An ninh Bảo vệ Toàn Cầu",
  "Công ty PCCC An Toàn",
];
const SERVICE_TYPES = [
  "Bảo trì thang máy", "Vệ sinh – Làm sạch", "Phòng cháy chữa cháy",
  "Sửa chữa điện nước", "An ninh – Bảo vệ", "Cây xanh – Cảnh quan",
];

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "management" | "model3d";

interface Building3D { id: string; name: string; code: string; floors: number; apartmentsPerFloor: number }

// Fallback khi chưa gọi được API (giữ UI không trống).
const FALLBACK_3D: Building3D[] = [
  { id: "A", name: "Toà A", code: "A", floors: 20, apartmentsPerFloor: 20 },
];

// ─── Apartment detail helpers ─────────────────────────────────────────────────

type AptStatus = "occupied" | "vacant" | "maintenance";

interface AptDetail {
  area: number;
  status: AptStatus;
  resident?: string;
  phone?: string;
  moveInDate?: string;
  monthlyFee: number;
  direction: string;
}

const MOCK_RESIDENTS = [
  "Nguyễn Văn An", "Trần Thị Bích", "Lê Minh Cường", "Phạm Thu Dung",
  "Hoàng Văn Em", "Vũ Thị Phương", "Đặng Minh Quân", "Bùi Thị Hoa",
  "Đỗ Thanh Long", "Ngô Thị Mai", "Lý Văn Sơn", "Phan Thu Trang",
];
const DIRECTIONS = ["Đông", "Tây", "Nam", "Bắc", "Đông Nam", "Tây Nam", "Đông Bắc", "Tây Bắc"];

function getAptDetail(info: ApartmentInfo): AptDetail {
  const s = info.floor * 100 + info.aptIndex;
  const statuses: AptStatus[] = ["occupied", "occupied", "occupied", "vacant", "maintenance"];
  const status = statuses[s % statuses.length];
  return {
    area: 50 + (s % 9) * 5,
    status,
    resident:    status === "occupied" ? MOCK_RESIDENTS[s % MOCK_RESIDENTS.length] : undefined,
    phone:       status === "occupied" ? `09${String((s * 137 + 42) % 100_000_000).padStart(8, "0")}` : undefined,
    moveInDate:  status === "occupied" ? `${2020 + (s % 5)}-${String((s % 12) + 1).padStart(2, "0")}-01` : undefined,
    monthlyFee:  7 + (s % 7) * 0.5,
    direction:   DIRECTIONS[s % DIRECTIONS.length],
  };
}

const APT_STATUS_META: Record<AptStatus, { label: string; cls: string; dot: string }> = {
  occupied:    { label: "Đang ở",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  vacant:      { label: "Trống",     cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",          dot: "bg-zinc-400" },
  maintenance: { label: "Bảo trì",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/25",       dot: "bg-amber-400 animate-pulse" },
};

// ─── Apt side panel (shown alongside 3D model) ────────────────────────────────

function AptSidePanel({
  info, detail, onClose, onExpand,
}: { info: ApartmentInfo; detail: AptDetail; onClose: () => void; onExpand: () => void }) {
  const sm = APT_STATUS_META[detail.status];
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      className="w-80 flex-shrink-0 bg-[#0e0e1a] border border-white/8 rounded-2xl overflow-hidden flex flex-col"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Home className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white font-mono">{info.aptId}</p>
            <p className="text-[10px] text-zinc-500">Tầng {info.floor} · Căn số {info.aptIndex}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status badge */}
      <div className="px-4 pt-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${sm.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
          {sm.label}
        </span>
      </div>

      {/* Key info */}
      <div className="px-4 py-3 space-y-2">
        {[
          { label: "Diện tích",  value: `${detail.area} m²` },
          { label: "Hướng",      value: detail.direction },
          { label: "Phí/tháng", value: `${detail.monthlyFee.toFixed(1)} triệu` },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{label}</span>
            <span className="text-white font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Resident */}
      {detail.resident && (
        <div className="mx-4 p-3 bg-white/[0.03] border border-white/5 rounded-xl space-y-1.5 text-xs">
          <p className="text-zinc-500 font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Cư dân</p>
          <p className="text-white font-semibold">{detail.resident}</p>
          {detail.phone && <p className="text-zinc-400 flex items-center gap-1"><Phone className="w-3 h-3" />{detail.phone}</p>}
          {detail.moveInDate && <p className="text-zinc-500">Ngày vào: {detail.moveInDate}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto px-4 pb-4 pt-3 space-y-2 border-t border-white/5">
        <button
          onClick={onExpand}
          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-sm font-semibold rounded-xl border border-indigo-500/25 transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          Xem chi tiết đầy đủ
        </button>
      </div>
    </motion.div>
  );
}

// ─── Apt full detail view (replaces 3D canvas) ───────────────────────────────

function AptDetailView({
  info, detail, buildingName, onBack,
}: { info: ApartmentInfo; detail: AptDetail; buildingName: string; onBack: () => void }) {
  const sm = APT_STATUS_META[detail.status];
  return (
    <div className="space-y-4">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <button onClick={onBack} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
          <ChevronRight className="w-3 h-3 rotate-180" />
          Mô hình 3D
        </button>
        <span>/</span>
        <span>{buildingName}</span>
        <span>/</span>
        <span className="text-white font-mono font-semibold">{info.aptId}</span>
      </div>

      {/* Detail card */}
      <div className="bg-[#0e0e1a] border border-white/8 rounded-2xl overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
              <Home className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono">{info.aptId}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{buildingName} · Tầng {info.floor} · Căn số {info.aptIndex}</p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border ${sm.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
            {sm.label}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "Diện tích",    value: `${detail.area} m²`,                icon: "📐" },
            { label: "Hướng",        value: detail.direction,                    icon: "🧭" },
            { label: "Phí/tháng",   value: `${detail.monthlyFee.toFixed(1)} tr`, icon: "💰" },
            { label: "Tầng",         value: `${info.floor}`,                     icon: "🏢" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-[#0e0e1a] px-5 py-4">
              <p className="text-lg mb-0.5">{icon}</p>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[11px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Resident section */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Thông tin cư dân</p>
          {detail.resident ? (
            <div className="flex items-start gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-300">
                {detail.resident.split(" ").pop()?.charAt(0)}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{detail.resident}</p>
                {detail.phone && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />{detail.phone}
                  </p>
                )}
                {detail.moveInDate && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />Ngày vào: {detail.moveInDate}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-zinc-600 border border-white/5 rounded-xl">
              <p className="text-sm">{detail.status === "maintenance" ? "Căn đang bảo trì" : "Căn hộ trống"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuildingsPage() {
  const [tab, setTab]           = useState<Tab>("management");
  const [regs, setRegs]         = useState(INIT_REGS);
  const [reqs, setReqs]         = useState(INIT_RESIDENT_REQS);
  const [mgtReqs, setMgtReqs]   = useState(INIT_MGT_REQS);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ type: "reg" | "req"; id: number } | null>(null);
  const [rejectNote, setRejectNote]   = useState("");
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [buildings3d, setBuildings3d] = useState<Building3D[]>(FALLBACK_3D);
  const [selectedBuilding, setSelectedBuilding] = useState<Building3D>(FALLBACK_3D[0]);

  // Nạp toà nhà + tầng THẬT từ API cho mô hình 3D (xây thêm toà là tự hiện).
  useEffect(() => {
    (async () => {
      try {
        const [br, fr] = await Promise.all([buildingsApi.getAll(), floorsApi.getAll()]);
        if (br.errorCode !== 200 || !br.data?.length) return;
        const flr = fr.errorCode === 200 ? fr.data ?? [] : [];
        const list: Building3D[] = br.data.map((b) => {
          const maxFloor = flr.filter((f) => f.buildingId === b.id)
            .reduce((m, f) => Math.max(m, f.floorNumber), 0);
          const floorsCount = Math.max(maxFloor, b.totalFloors || 0, 1);
          const perFloor = b.totalFloors && b.totalUnits ? Math.ceil(b.totalUnits / b.totalFloors) : 0;
          return {
            id: b.id, name: b.name, code: (b.code || b.name).toUpperCase(),
            floors: floorsCount, apartmentsPerFloor: Math.max(perFloor, 1),
          };
        });
        setBuildings3d(list);
        setSelectedBuilding((prev) => list.find((x) => x.id === prev.id) ?? list[0]);
      } catch { /* giữ fallback */ }
    })();
  }, []);
  const [selectedApt, setSelectedApt] = useState<ApartmentInfo | null>(null);
  const [viewMode, setViewMode] = useState<"model" | "detail">("model");
  const [showOverview, setShowOverview] = useState(true);
  const [form, setForm]         = useState({
    title: "", providerName: PROVIDERS_LIST[0], serviceType: SERVICE_TYPES[0],
    description: "", priority: "medium" as Priority, estimatedDays: 5,
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  function approveReg(id: number) {
    setRegs((p) => p.map((r) => r.id === id ? { ...r, status: "approved" } : r));
    showToast("Đã phê duyệt đăng ký nhà cung cấp");
  }

  function approveReq(id: number) {
    setReqs((p) => p.map((r) => r.id === id ? { ...r, approvalStatus: "approved", providerStatus: "accepted" } : r));
    showToast("Đã duyệt và chuyển yêu cầu đến nhà cung cấp");
  }

  function confirmReject() {
    if (!rejectModal) return;
    if (rejectModal.type === "reg") {
      setRegs((p) => p.map((r) => r.id === rejectModal.id ? { ...r, status: "rejected", note: rejectNote } : r));
      showToast("Đã từ chối đăng ký", false);
    } else {
      setReqs((p) => p.map((r) => r.id === rejectModal.id ? { ...r, approvalStatus: "rejected" } : r));
      showToast("Đã từ chối yêu cầu", false);
    }
    setRejectModal(null);
    setRejectNote("");
  }

  function handleCreateMgtReq() {
    if (!form.title.trim()) return;
    setSaving(true);
    setTimeout(() => {
      setMgtReqs((p) => [{
        id: Math.max(...p.map((r) => r.id)) + 1,
        ...form,
        status: "sent",
        createdAt: new Date().toISOString().split("T")[0],
      }, ...p]);
      showToast("Đã tạo và gửi yêu cầu đến nhà cung cấp");
      setAddModal(false);
      setSaving(false);
    }, 500);
  }

  const pendingRegs  = regs.filter((r) => r.status === "pending");
  const pendingReqsF = reqs.filter((r) => r.approvalStatus === "pending");

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.25)]">
            <Building2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Quản lý toà nhà</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Phê duyệt đăng ký, xét yêu cầu cư dân &amp; tạo yêu cầu dịch vụ</p>
          </div>
        </div>
        {tab === "management" && (
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo yêu cầu dịch vụ
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-xl w-fit">
        {([
          { key: "management", label: "Quản lý", icon: ClipboardList },
          { key: "model3d",    label: "Mô hình 3D", icon: Box },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key
                ? "bg-amber-500 text-black"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── 3D Model Tab ──────────────────────────────────────────────── */}
      {tab === "model3d" && (
        <div className="space-y-4">

          {/* Detail view (full-screen card, no 3D) */}
          {viewMode === "detail" && selectedApt && (
            <AptDetailView
              info={selectedApt}
              detail={getAptDetail(selectedApt)}
              buildingName={selectedBuilding.name}
              onBack={() => setViewMode("model")}
            />
          )}

          {/* Model view */}
          {viewMode === "model" && (<>

            {showOverview ? (<>
              {/* Overview info bar */}
              <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-zinc-400">
                <LayoutGrid className="w-4 h-4 text-indigo-400" />
                <span>Toàn cảnh <span className="text-white font-semibold">{buildings3d.length}</span> toà nhà</span>
                <span className="ml-auto text-zinc-600">Click vào 1 toà để xem chi tiết từng căn hộ · Kéo để xoay · Scroll để zoom</span>
              </div>

              {/* Site-wide overview: all buildings */}
              <div className="h-[600px] rounded-2xl overflow-hidden border border-white/5">
                <CampusOverview3D
                  buildings={buildings3d}
                  onSelect={(b: CampusBuildingInfo) => {
                    setSelectedBuilding(b);
                    setSelectedApt(null);
                    setShowOverview(false);
                  }}
                />
              </div>
            </>) : (<>
              {/* Building selector */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setShowOverview(true); setSelectedApt(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.03] text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Toàn cảnh
                </button>
                {buildings3d.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBuilding(b); setSelectedApt(null); setViewMode("model"); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      selectedBuilding.id === b.id
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                        : "bg-white/[0.03] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    {b.name}
                  </button>
                ))}
              </div>

              {/* Info bar */}
              <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-zinc-400">
                <span><span className="text-white font-semibold">{selectedBuilding.floors}</span> tầng</span>
                <span>·</span>
                <span><span className="text-white font-semibold">{selectedBuilding.apartmentsPerFloor}</span> căn/tầng</span>
                <span>·</span>
                <span>Tổng <span className="text-white font-semibold">{selectedBuilding.floors * selectedBuilding.apartmentsPerFloor}</span> căn hộ</span>
                {selectedApt ? (
                  <span className="ml-auto flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-yellow-300 font-mono font-semibold">{selectedApt.aptId}</span>
                    <span className="text-zinc-500">đang chọn</span>
                  </span>
                ) : (
                  <span className="ml-auto text-zinc-600">Click căn để xem · Kéo để xoay · Scroll để zoom</span>
                )}
              </div>

              {/* Split: 3D canvas + side panel */}
              <div className={`flex gap-4 items-start transition-all ${selectedApt ? "" : ""}`}>
                <div className={`h-[600px] rounded-2xl overflow-hidden border border-white/5 transition-all ${selectedApt ? "flex-1" : "w-full"}`}>
                  <Building3DModel
                    floors={selectedBuilding.floors}
                    apartmentsPerFloor={selectedBuilding.apartmentsPerFloor}
                    buildingCode={selectedBuilding.code}
                    selectedAptId={selectedApt?.aptId}
                    onApartmentClick={(apt) => { setSelectedApt(apt); if (apt) setViewMode("model"); }}
                  />
                </div>

                <AnimatePresence>
                  {selectedApt && (
                    <AptSidePanel
                      info={selectedApt}
                      detail={getAptDetail(selectedApt)}
                      onClose={() => setSelectedApt(null)}
                      onExpand={() => setViewMode("detail")}
                    />
                  )}
                </AnimatePresence>
              </div>
            </>)}
          </>)}

        </div>
      )}

      {/* ── Management Tab ─────────────────────────────────────────────── */}
      {tab === "management" && <>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Toà nhà",             value: "3",  icon: Building2, cls: "text-amber-400",  bg: "bg-amber-500/10" },
          { label: "Cư dân đang ở",       value: "247",icon: Users,     cls: "text-blue-400",   bg: "bg-blue-500/10" },
          { label: "NCC đã duyệt",        value: "4",  icon: Store,     cls: "text-emerald-400",bg: "bg-emerald-500/10" },
          { label: "Chờ phê duyệt",       value: String(pendingRegs.length + pendingReqsF.length),
            icon: Clock, cls: pendingRegs.length + pendingReqsF.length > 0 ? "text-red-400" : "text-zinc-400",
            bg: pendingRegs.length + pendingReqsF.length > 0 ? "bg-red-500/10" : "bg-white/5" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-4 flex items-center gap-3`}>
            <s.icon className={`w-5 h-5 ${s.cls} flex-shrink-0`} />
            <div>
              <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-zinc-600 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section: Cần phê duyệt ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Provider registrations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Đăng ký nhà cung cấp</h2>
            {pendingRegs.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                {pendingRegs.length} chờ duyệt
              </span>
            )}
          </div>

          {pendingRegs.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-zinc-600 border border-white/5 rounded-xl bg-white/[0.02]">
              <p className="text-xs">Không có đăng ký nào đang chờ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRegs.map((reg) => (
                <motion.div
                  key={reg.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111] border border-white/5 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{reg.companyName}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{reg.category}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {reg.services.map((s) => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{reg.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{reg.email}</span>
                    <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{reg.appliedAt}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => approveReg(reg.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Phê duyệt
                    </button>
                    <button
                      onClick={() => { setRejectModal({ type: "reg", id: reg.id }); setRejectNote(""); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Approved summary */}
          {regs.filter((r) => r.status === "approved").length > 0 && (
            <div className="space-y-1.5">
              {regs.filter((r) => r.status === "approved").map((reg) => (
                <div key={reg.id} className="flex items-center gap-3 px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-zinc-400 flex-1 truncate">{reg.companyName}</p>
                  <span className="text-[10px] text-emerald-500">Đã duyệt</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resident requests needing approval */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Yêu cầu cư dân cần duyệt</h2>
            {pendingReqsF.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                {pendingReqsF.length} chờ duyệt
              </span>
            )}
          </div>

          {pendingReqsF.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-zinc-600 border border-white/5 rounded-xl bg-white/[0.02]">
              <p className="text-xs">Không có yêu cầu nào chờ duyệt</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingReqsF.map((req) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111] border border-white/5 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-orange-400">{req.apartment}</span>
                        <span className="text-xs text-zinc-400">{req.resident}</span>
                        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_META[req.priority].cls}`}>
                          {PRIORITY_META[req.priority].label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-1">{req.serviceType}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{req.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" />{req.providerName}</span>
                        {req.requiresStructuralCheck && (
                          <span className="flex items-center gap-1 text-orange-400">
                            <AlertTriangle className="w-3 h-3" />Cần kiểm tra kết cấu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => approveReq(req.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Duyệt &amp; chuyển NCC
                    </button>
                    <button
                      onClick={() => { setRejectModal({ type: "req", id: req.id }); setRejectNote(""); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section: Yêu cầu từ BQL ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Yêu cầu dịch vụ từ Ban quản lý</h2>
        </div>
        <div className="space-y-2">
          {mgtReqs.map((req) => {
            const sm = MGT_STATUS[req.status];
            return (
              <div key={req.id} className="flex items-center gap-3 bg-[#111] border border-white/5 rounded-xl p-4 hover:bg-[#141414] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white truncate">{req.title}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_META[req.priority].cls}`}>
                      {PRIORITY_META[req.priority].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>{req.providerName}</span>
                    <span>·</span>
                    <span>{req.serviceType}</span>
                    {req.estimatedDays && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{req.estimatedDays} ngày</span>}
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${sm.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                  {sm.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      </> /* end management tab */}

      {/* ── Reject Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {rejectModal.type === "reg" ? "Từ chối đăng ký" : "Từ chối yêu cầu"}
                  </h2>
                  <p className="text-xs text-zinc-500">Lý do sẽ được gửi đến bên liên quan</p>
                </div>
              </div>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                placeholder="Lý do từ chối (tuỳ chọn)..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-red-500/50 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  Hủy
                </button>
                <button
                  onClick={confirmReject}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create MGT Request Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {addModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-base font-semibold text-white">Tạo yêu cầu dịch vụ</h2>
                <button onClick={() => setAddModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tiêu đề yêu cầu *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Sửa thang máy tòa A cabin 1"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nhà cung cấp</label>
                    <select value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none">
                      {PROVIDERS_LIST.map((p) => <option key={p} value={p} className="bg-[#1a1a1a]">{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ</label>
                    <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none">
                      {SERVICE_TYPES.map((s) => <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mức độ ưu tiên</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none">
                      <option value="low" className="bg-[#1a1a1a]">Thấp</option>
                      <option value="medium" className="bg-[#1a1a1a]">Trung bình</option>
                      <option value="high" className="bg-[#1a1a1a]">Cao</option>
                      <option value="urgent" className="bg-[#1a1a1a]">Khẩn cấp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Dự kiến (ngày)</label>
                    <input type="number" min={1} value={form.estimatedDays}
                      onChange={(e) => setForm({ ...form, estimatedDays: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả yêu cầu</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} placeholder="Mô tả chi tiết công việc cần thực hiện..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
                <button onClick={() => setAddModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
                <button onClick={handleCreateMgtReq} disabled={saving || !form.title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Send className="w-3.5 h-3.5" />
                  Gửi yêu cầu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl border text-sm font-medium ${
              toast.ok ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-red-500/20 border-red-500/30 text-red-400"
            }`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
