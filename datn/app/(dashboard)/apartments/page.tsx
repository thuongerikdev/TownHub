"use client";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2, MapPin, Home, Search, Plus, CheckCircle2, AlertCircle,
  Loader2, X, RefreshCw, Users, Phone, Mail, CreditCard, Pencil,
  Trash2, Crown, UserPlus, ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { apartments, residents, users } from "@/lib/api";
import type { ApartmentResponse, ResidentResponse, GetUserResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  occupied: "Đã có cư dân",
  vacant: "Đang trống",
  maintenance: "Bảo trì",
};
const APARTMENT_TYPES = ["Studio", "1PN", "2PN", "3PN", "Penthouse"];
const BUILDINGS = ["Tòa A", "Tòa B", "Villa"];
const STATUS_OPTIONS = ["occupied", "vacant", "maintenance"];
const GENDERS = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

// ─── Form types ───────────────────────────────────────────────────────────────
interface AptForm {
  code: string; building: string; floor: string; unitNumber: string;
  type: string; areaM2: string; status: string; note: string;
}
interface ResidentForm {
  fullName: string; phone: string; email: string; idCard: string;
  dateOfBirth: string; gender: string; isOwner: boolean;
  moveInDate: string; moveOutDate: string; authUserId: string;
}

const DEFAULT_APT: AptForm = {
  code: "", building: "Tòa A", floor: "", unitNumber: "",
  type: "2PN", areaM2: "", status: "vacant", note: "",
};
const DEFAULT_RESIDENT: ResidentForm = {
  fullName: "", phone: "", email: "", idCard: "",
  dateOfBirth: "", gender: "male", isOwner: false,
  moveInDate: new Date().toISOString().split("T")[0],
  moveOutDate: "", authUserId: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

function InputField({
  label, required, ...props
}: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs text-zinc-400 font-medium mb-1.5 block">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input
        {...props}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ApartmentsPage() {
  const { user } = useAuth();

  // Apartment list state
  const [data, setData] = useState<ApartmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState("Tòa A");
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Create apartment modal
  const [showCreate, setShowCreate] = useState(false);
  const [aptForm, setAptForm] = useState<AptForm>(DEFAULT_APT);
  const [aptSubmitting, setAptSubmitting] = useState(false);
  const [aptError, setAptError] = useState<string | null>(null);

  // Apartment detail + residents
  const [selectedApt, setSelectedApt] = useState<ApartmentResponse | null>(null);
  const [aptResidents, setAptResidents] = useState<ResidentResponse[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);

  // Add / edit resident
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [editingResident, setEditingResident] = useState<ResidentResponse | null>(null);
  const [residentForm, setResidentForm] = useState<ResidentForm>(DEFAULT_RESIDENT);
  const [residentSubmitting, setResidentSubmitting] = useState(false);
  const [residentError, setResidentError] = useState<string | null>(null);
  const [systemUsers, setSystemUsers] = useState<GetUserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Delete resident confirm
  const [deletingResident, setDeletingResident] = useState<ResidentResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch apartments ──────────────────────────────────────────────────────
  const fetchApartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apartments.getAll({ building: selectedBuilding });
      if (res.errorCode === 200) {
        const list = res.data ?? [];
        setData(list);
        const floors = [...new Set(list.map((a) => a.floor))].sort((a, b) => b - a);
        setSelectedFloor((prev) => (prev !== null && floors.includes(prev) ? prev : floors[0] ?? null));
      } else {
        setError(res.errorMessage);
      }
    } catch {
      setError("Không thể tải dữ liệu căn hộ.");
    } finally {
      setLoading(false);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    setSelectedFloor(null);
    fetchApartments();
  }, [selectedBuilding]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch residents for selected apartment ────────────────────────────────
  const fetchResidents = useCallback(async (aptId: number) => {
    setLoadingResidents(true);
    try {
      const res = await residents.getAll(aptId);
      setAptResidents(res.errorCode === 200 ? (res.data ?? []) : []);
    } catch {
      setAptResidents([]);
    } finally {
      setLoadingResidents(false);
    }
  }, []);

  const openApartment = (apt: ApartmentResponse) => {
    setSelectedApt(apt);
    setAptResidents([]);
    setShowResidentForm(false);
    setEditingResident(null);
    fetchResidents(apt.id);
  };

  // ── Create apartment ──────────────────────────────────────────────────────
  const handleCreateApt = async (e: React.FormEvent) => {
    e.preventDefault();
    setAptError(null);
    if (!aptForm.code || !aptForm.floor || !aptForm.unitNumber || !aptForm.areaM2) {
      setAptError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }
    setAptSubmitting(true);
    try {
      const res = await apartments.create({
        code: aptForm.code, building: aptForm.building,
        floor: Number(aptForm.floor), unitNumber: aptForm.unitNumber,
        type: aptForm.type, areaM2: Number(aptForm.areaM2),
        status: aptForm.status, note: aptForm.note || undefined,
      });
      if (res.errorCode === 200) {
        setShowCreate(false);
        setAptForm(DEFAULT_APT);
        fetchApartments();
      } else {
        setAptError(res.errorMessage || "Thêm căn hộ thất bại.");
      }
    } catch {
      setAptError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setAptSubmitting(false);
    }
  };

  // ── Add / Edit resident ───────────────────────────────────────────────────
  const fetchSystemUsers = useCallback(async () => {
    if (systemUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const res = await users.getAllAdmin();
      if (res.errorCode === 200) setSystemUsers(res.data ?? []);
    } finally {
      setLoadingUsers(false);
    }
  }, [systemUsers.length]);

  const openAddResident = () => {
    setEditingResident(null);
    setResidentForm(DEFAULT_RESIDENT);
    setResidentError(null);
    setShowResidentForm(true);
    fetchSystemUsers();
  };

  const openEditResident = (r: ResidentResponse) => {
    setEditingResident(r);
    setResidentForm({
      fullName: r.fullName, phone: r.phone, email: r.email ?? "",
      idCard: r.idCard ?? "", gender: r.gender ?? "male",
      dateOfBirth: r.dateOfBirth ? r.dateOfBirth.split("T")[0] : "",
      isOwner: r.isOwner,
      moveInDate: r.moveInDate ? r.moveInDate.split("T")[0] : "",
      moveOutDate: r.moveOutDate ? r.moveOutDate.split("T")[0] : "",
      authUserId: r.authUserId ? String(r.authUserId) : "",
    });
    setResidentError(null);
    setShowResidentForm(true);
    fetchSystemUsers();
  };

  const handleResidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt) return;
    setResidentError(null);
    if (!residentForm.fullName || !residentForm.phone) {
      setResidentError("Họ tên và số điện thoại là bắt buộc.");
      return;
    }
    setResidentSubmitting(true);
    try {
      const body = {
        fullName: residentForm.fullName,
        phone: residentForm.phone,
        email: residentForm.email || undefined,
        idCard: residentForm.idCard || undefined,
        dateOfBirth: residentForm.dateOfBirth ? new Date(residentForm.dateOfBirth).toISOString() : undefined,
        gender: residentForm.gender,
        apartmentId: selectedApt.id,
        isOwner: residentForm.isOwner,
        moveInDate: residentForm.moveInDate ? new Date(residentForm.moveInDate).toISOString() : undefined,
        moveOutDate: residentForm.moveOutDate ? new Date(residentForm.moveOutDate).toISOString() : undefined,
        avatarUrl: "",
        authUserId: residentForm.authUserId ? Number(residentForm.authUserId) : (user?.userID ?? undefined),
      };
      const res = editingResident
        ? await residents.update({ ...body, id: editingResident.id })
        : await residents.create(body);

      if (res.errorCode === 200) {
        setShowResidentForm(false);
        setEditingResident(null);
        fetchResidents(selectedApt.id);
      } else {
        setResidentError(res.errorMessage || "Thao tác thất bại.");
      }
    } catch {
      setResidentError("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setResidentSubmitting(false);
    }
  };

  // ── Delete resident ───────────────────────────────────────────────────────
  const handleDeleteResident = async () => {
    if (!deletingResident || !selectedApt) return;
    setDeleteLoading(true);
    try {
      const res = await residents.delete(deletingResident.id);
      if (res.errorCode === 200) {
        setDeletingResident(null);
        fetchResidents(selectedApt.id);
      }
    } catch {
      /* silent */
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const floors = [...new Set(data.map((a) => a.floor))].sort((a, b) => b - a);
  const filtered = data.filter((a) => {
    const onFloor = selectedFloor !== null ? a.floor === selectedFloor : true;
    const matchSearch = search
      ? a.code.toLowerCase().includes(search.toLowerCase())
      : true;
    return onFloor && matchSearch;
  });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Building2 className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
              Định Danh <span className="text-indigo-400">Căn Hộ</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-md">
              Sơ đồ toà nhà, quản lý thông tin cư dân và trạng thái bàn giao từng căn hộ.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#111] border border-white/10 rounded-xl p-1 flex">
            {BUILDINGS.map((b) => (
              <button key={b} onClick={() => setSelectedBuilding(b)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${b === selectedBuilding ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-400 hover:text-white"}`}>
                {b}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setAptForm({ ...DEFAULT_APT, building: selectedBuilding }); setAptError(null); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Plus className="w-4 h-4" /> Thêm căn hộ
          </button>
          <button onClick={fetchApartments} disabled={loading}
            className="p-2 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-4">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">Sơ Đồ Tầng</h3>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
            ) : floors.length === 0 ? (
              <p className="text-xs text-zinc-500 px-2 py-4 text-center">Chưa có dữ liệu</p>
            ) : floors.map((floor) => (
              <button key={floor} onClick={() => setSelectedFloor(floor)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all ${selectedFloor === floor
                  ? "bg-indigo-500 border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.4)] text-white font-bold"
                  : "bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10"}`}>
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${selectedFloor === floor ? "text-white" : "text-zinc-500"}`} />
                  Tầng {floor}
                </div>
                {selectedFloor === floor && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </button>
            ))}
          </div>

          <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Chú Thích</h3>
            <div className="space-y-3">
              {[
                { color: "bg-emerald-500/50 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]", label: "Đã có cư dân" },
                { color: "bg-zinc-500/50 border-zinc-400", label: "Đang trống" },
                { color: "bg-amber-500/50 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]", label: "Bảo trì / Sửa chữa" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className={`w-3 h-3 rounded-full border ${color}`} />{label}
                </div>
              ))}
            </div>
            {!loading && data.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                {(["occupied", "vacant", "maintenance"] as const).map((s) => (
                  <div key={s} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{STATUS_LABELS[s]}</span>
                    <span className="text-zinc-300 font-semibold">{data.filter((a) => a.status === s).length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Apartment Grid */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="lg:col-span-3 bg-[#111] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-indigo-400" />
              {selectedFloor !== null ? `Mặt Bằng Tầng ${selectedFloor}` : "Tất Cả Căn Hộ"}
              {!loading && <span className="text-sm font-normal text-zinc-500 ml-1">({filtered.length})</span>}
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã căn..."
                className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 w-40" />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-zinc-500">Đang tải dữ liệu...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Building2 className="w-10 h-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">Không có căn hộ nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((apt, idx) => (
                <motion.div key={apt.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * Math.min(idx, 10) }}
                  onClick={() => openApartment(apt)}
                  className={`relative group p-4 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    apt.status === "occupied"
                      ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                      : apt.status === "maintenance"
                      ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                  }`}>
                  <div className="absolute top-3 right-3">
                    {apt.status === "occupied" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {apt.status === "maintenance" && <AlertCircle className="w-4 h-4 text-amber-500" />}
                    {apt.status === "vacant" && <div className="w-2 h-2 rounded-full bg-zinc-500 m-1" />}
                  </div>
                  <div className="mb-3">
                    <h3 className={`text-xl font-black tracking-tighter ${
                      apt.status === "occupied" ? "text-emerald-400"
                      : apt.status === "maintenance" ? "text-amber-400" : "text-zinc-300"}`}>
                      {apt.code}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-xs text-zinc-500 font-medium px-2 py-0.5 rounded bg-black/50 border border-white/5">{apt.type}</span>
                      <span className="text-xs text-zinc-600">{apt.areaM2}m²</span>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Trạng thái</p>
                      <p className={`text-xs font-medium mt-0.5 ${
                        apt.status === "occupied" ? "text-emerald-400"
                        : apt.status === "maintenance" ? "text-amber-400" : "text-zinc-400"}`}>
                        {STATUS_LABELS[apt.status] ?? apt.status}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Apartment Detail Panel ── */}
      <AnimatePresence>
        {selectedApt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setSelectedApt(null); setShowResidentForm(false); } }}>
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-lg bg-[#0a0a0a] border-l border-white/10 flex flex-col h-full overflow-hidden">

              {/* Panel Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedApt.status === "occupied" ? "bg-emerald-500/20 border border-emerald-500/30"
                    : selectedApt.status === "maintenance" ? "bg-amber-500/20 border border-amber-500/30"
                    : "bg-zinc-500/20 border border-zinc-500/30"}`}>
                    <Home className={`w-5 h-5 ${
                      selectedApt.status === "occupied" ? "text-emerald-400"
                      : selectedApt.status === "maintenance" ? "text-amber-400" : "text-zinc-400"}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedApt.code}</h2>
                    <p className="text-xs text-zinc-500">{selectedApt.building} · Tầng {selectedApt.floor} · {selectedApt.type}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedApt(null); setShowResidentForm(false); }}
                  className="text-zinc-500 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Apartment Info */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <FieldRow label="Diện tích" value={`${selectedApt.areaM2} m²`} />
                  <FieldRow label="Trạng thái" value={
                    <span className={`inline-block text-xs font-medium ${
                      selectedApt.status === "occupied" ? "text-emerald-400"
                      : selectedApt.status === "maintenance" ? "text-amber-400" : "text-zinc-400"}`}>
                      {STATUS_LABELS[selectedApt.status] ?? selectedApt.status}
                    </span>
                  } />
                  <FieldRow label="Số căn" value={selectedApt.unitNumber} />
                  <FieldRow label="Ngày tạo" value={fmtDate(selectedApt.createdAt)} />
                  {selectedApt.note && <div className="col-span-2"><FieldRow label="Ghi chú" value={selectedApt.note} /></div>}
                </div>

                {/* Residents Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      Cư Dân
                      {!loadingResidents && (
                        <span className="text-xs text-zinc-500 font-normal">({aptResidents.length})</span>
                      )}
                    </h3>
                    {!showResidentForm && (
                      <button onClick={openAddResident}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-400 text-xs font-medium rounded-lg transition-colors">
                        <UserPlus className="w-3.5 h-3.5" /> Thêm cư dân
                      </button>
                    )}
                  </div>

                  {/* Add/Edit Resident Form */}
                  <AnimatePresence>
                    {showResidentForm && (
                      <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} onSubmit={handleResidentSubmit}
                        className="bg-[#111] border border-white/10 rounded-xl p-4 mb-4 space-y-3 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-white">
                            {editingResident ? "Chỉnh sửa cư dân" : "Thêm cư dân mới"}
                          </p>
                          <button type="button" onClick={() => setShowResidentForm(false)}
                            className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <InputField label="Họ và tên" required value={residentForm.fullName}
                              onChange={(e) => setResidentForm((p) => ({ ...p, fullName: e.target.value }))}
                              placeholder="Nguyễn Văn A" />
                          </div>
                          <InputField label="Số điện thoại" required value={residentForm.phone}
                            onChange={(e) => setResidentForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="09xxxxxxxx" />
                          <InputField label="Email" type="email" value={residentForm.email}
                            onChange={(e) => setResidentForm((p) => ({ ...p, email: e.target.value }))}
                            placeholder="email@gmail.com" />
                          <InputField label="CCCD / CMND" value={residentForm.idCard}
                            onChange={(e) => setResidentForm((p) => ({ ...p, idCard: e.target.value }))}
                            placeholder="012345678901" />
                          <div>
                            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Giới tính</label>
                            <select value={residentForm.gender}
                              onChange={(e) => setResidentForm((p) => ({ ...p, gender: e.target.value }))}
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                            </select>
                          </div>
                          <InputField label="Ngày sinh" type="date" value={residentForm.dateOfBirth}
                            onChange={(e) => setResidentForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
                          <InputField label="Ngày chuyển vào" type="date" value={residentForm.moveInDate}
                            onChange={(e) => setResidentForm((p) => ({ ...p, moveInDate: e.target.value }))} />
                          <InputField label="Ngày chuyển ra" type="date" value={residentForm.moveOutDate}
                            onChange={(e) => setResidentForm((p) => ({ ...p, moveOutDate: e.target.value }))} />
                          <div className="col-span-2">
                            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">
                              Tài khoản hệ thống
                            </label>
                            <select
                              value={residentForm.authUserId}
                              onChange={(e) => setResidentForm((p) => ({ ...p, authUserId: e.target.value }))}
                              disabled={loadingUsers}
                              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
                            >
                              <option value="">— Không liên kết —</option>
                              {systemUsers.map((u) => (
                                <option key={u.userID} value={String(u.userID)}>
                                  {u.profile?.firstName || u.profile?.lastName
                                    ? `${u.profile.firstName ?? ""} ${u.profile.lastName ?? ""}`.trim()
                                    : u.userName}{" "}
                                  ({u.email})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Is Owner toggle */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div onClick={() => setResidentForm((p) => ({ ...p, isOwner: !p.isOwner }))}
                            className={`relative w-10 h-5 rounded-full transition-colors ${residentForm.isOwner ? "bg-indigo-500" : "bg-white/10"}`}>
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${residentForm.isOwner ? "left-5" : "left-0.5"}`} />
                          </div>
                          <span className="text-sm text-zinc-300">Chủ hộ</span>
                        </label>

                        {residentError && (
                          <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{residentError}
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => setShowResidentForm(false)}
                            className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors">
                            Hủy
                          </button>
                          <button type="submit" disabled={residentSubmitting}
                            className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                            {residentSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {editingResident ? "Lưu thay đổi" : "Thêm cư dân"}
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Residents List */}
                  {loadingResidents ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    </div>
                  ) : aptResidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-white/10 rounded-xl">
                      <Users className="w-7 h-7 text-zinc-700" />
                      <p className="text-sm text-zinc-500">Chưa có cư dân nào</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aptResidents.map((r) => (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="group bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-300">
                                {r.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-white truncate">{r.fullName}</p>
                                  {r.isOwner && (
                                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-md shrink-0">
                                      <Crown className="w-2.5 h-2.5" /> Chủ hộ
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Phone className="w-3 h-3" />{r.phone}
                                  </span>
                                  {r.email && (
                                    <span className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                                      <Mail className="w-3 h-3" />{r.email}
                                    </span>
                                  )}
                                  {r.idCard && (
                                    <span className="flex items-center gap-1 text-xs text-zinc-600">
                                      <CreditCard className="w-3 h-3" />{r.idCard}
                                    </span>
                                  )}
                                </div>
                                {r.moveInDate && (
                                  <p className="text-[10px] text-zinc-600 mt-1">Vào: {fmtDate(r.moveInDate)}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditResident(r)}
                                className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeletingResident(r)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Apartment Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Thêm Căn Hộ Mới</h2>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateApt} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Mã căn hộ" required value={aptForm.code}
                    onChange={(e) => setAptForm((p) => ({ ...p, code: e.target.value }))} placeholder="VD: A1201" />
                  <div>
                    <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Tòa nhà</label>
                    <select value={aptForm.building} onChange={(e) => setAptForm((p) => ({ ...p, building: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                      {BUILDINGS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <InputField label="Tầng" required type="number" min={1} value={aptForm.floor}
                    onChange={(e) => setAptForm((p) => ({ ...p, floor: e.target.value }))} placeholder="VD: 12" />
                  <InputField label="Số căn" required value={aptForm.unitNumber}
                    onChange={(e) => setAptForm((p) => ({ ...p, unitNumber: e.target.value }))} placeholder="VD: 01" />
                  <div>
                    <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Loại căn</label>
                    <select value={aptForm.type} onChange={(e) => setAptForm((p) => ({ ...p, type: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                      {APARTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <InputField label="Diện tích (m²)" required type="number" min={1} step={0.1} value={aptForm.areaM2}
                    onChange={(e) => setAptForm((p) => ({ ...p, areaM2: e.target.value }))} placeholder="VD: 75.5" />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Trạng thái</label>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => setAptForm((p) => ({ ...p, status: s }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                          aptForm.status === s
                            ? s === "occupied" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                              : s === "maintenance" ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                              : "bg-zinc-500/20 border-zinc-500/50 text-zinc-300"
                            : "bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300"}`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <InputField label="Ghi chú" value={aptForm.note}
                  onChange={(e) => setAptForm((p) => ({ ...p, note: e.target.value }))} placeholder="Thông tin thêm (tùy chọn)" />

                {aptError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{aptError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    Hủy
                  </button>
                  <button type="submit" disabled={aptSubmitting}
                    className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                    {aptSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {aptSubmitting ? "Đang thêm..." : "Thêm căn hộ"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Resident Confirm ── */}
      <AnimatePresence>
        {deletingResident && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingResident(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Xóa cư dân</h3>
                  <p className="text-xs text-zinc-500">Thao tác này không thể hoàn tác.</p>
                </div>
              </div>
              <p className="text-sm text-zinc-300 mb-6">
                Bạn có chắc muốn xóa cư dân <span className="font-semibold text-white">{deletingResident.fullName}</span> khỏi hệ thống?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingResident(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors">
                  Hủy
                </button>
                <button onClick={handleDeleteResident} disabled={deleteLoading}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Xóa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
