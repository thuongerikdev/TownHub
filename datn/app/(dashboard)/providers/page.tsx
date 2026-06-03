"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase, Search, X, CheckCircle, XCircle,
  Phone, Mail, Clock, Store, Wrench,
  AlertCircle, Loader2, ChevronRight, Plus,
  Home, Building2, Star, FileText, Send, MapPin,
  Trash2, DollarSign, PackagePlus,
} from "lucide-react";
import {
  providers as providersApi,
  serviceRequests as serviceRequestsApi,
  providerServiceListings as listingsApi,
  type Provider,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ProviderServiceListing,
  type PriceListItem,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Category metadata ────────────────────────────────────────────────────────

const SERVICE_CATEGORIES: Record<string, { label: string; color: string }> = {
  electrical: { label: "Điện – Kỹ thuật",      color: "amber" },
  cleaning:   { label: "Vệ sinh – Làm sạch",    color: "emerald" },
  plumbing:   { label: "Cấp thoát nước",         color: "blue" },
  renovation: { label: "Sửa chữa & Cải tạo",    color: "purple" },
  camera:     { label: "Camera – An ninh",        color: "indigo" },
  other:      { label: "Dịch vụ khác",           color: "zinc" },
};

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/20" },
  amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/20" },
  purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/20" },
  indigo:  { bg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-indigo-500/20" },
  zinc:    { bg: "bg-zinc-500/15",    text: "text-zinc-400",    border: "border-zinc-500/20" },
};

function parseCategories(json: string): string[] {
  try { return JSON.parse(json) as string[]; }
  catch { return []; }
}

function getPrimaryMeta(json: string) {
  const cats = parseCategories(json);
  const key = cats[0] ?? "other";
  return SERVICE_CATEGORIES[key] ?? SERVICE_CATEGORIES.other;
}

function parsePriceList(json?: string): PriceListItem[] {
  if (!json) return [];
  try { return JSON.parse(json) as PriceListItem[]; }
  catch { return []; }
}

// ─── Listing status ───────────────────────────────────────────────────────────

const LISTING_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending:  { label: "Chờ duyệt", cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",    dot: "bg-yellow-400 animate-pulse" },
  approved: { label: "Đã duyệt",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",  dot: "bg-emerald-500" },
  rejected: { label: "Từ chối",   cls: "bg-red-500/15 text-red-400 border-red-500/20",              dot: "bg-red-500" },
};

// ─── Status maps ──────────────────────────────────────────────────────────────

const REQ_STATUS: Record<ServiceRequestStatus, { label: string; cls: string; dot: string }> = {
  pending_approval:      { label: "Chờ BQL duyệt",      cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",   dot: "bg-yellow-400 animate-pulse" },
  approved_by_mgt:       { label: "BQL đã duyệt",        cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",         dot: "bg-blue-400 animate-pulse" },
  rejected_by_mgt:       { label: "BQL từ chối",         cls: "bg-red-500/15 text-red-400 border-red-500/20",            dot: "bg-red-500" },
  pending_provider:      { label: "Chờ NCC phản hồi",    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",         dot: "bg-zinc-500 animate-pulse" },
  accepted_by_provider:  { label: "NCC đã nhận",         cls: "bg-blue-500/15 text-blue-400 border-blue-500/20",         dot: "bg-blue-400 animate-pulse" },
  rejected_by_provider:  { label: "NCC từ chối",         cls: "bg-red-500/15 text-red-400 border-red-500/20",            dot: "bg-red-500" },
  in_progress:           { label: "Đang thực hiện",      cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",      dot: "bg-amber-500 animate-pulse" },
  completed:             { label: "Hoàn thành",          cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
};

type Tab = "approved" | "pending" | "requests";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProvidersPage() {
  const { user } = useAuth();

  const [providersList, setProvidersList] = useState<Provider[]>([]);
  const [serviceReqsList, setServiceReqsList] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("approved");
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [mgtRejectModal, setMgtRejectModal] = useState<number | null>(null);
  const [mgtRejectNote, setMgtRejectNote] = useState("");

  // ── Listings state ────────────────────────────────────────────────────────
  const [listings, setListings] = useState<ProviderServiceListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingRejectModal, setListingRejectModal] = useState<number | null>(null);
  const [listingRejectNote, setListingRejectNote] = useState("");
  const [addListingModal, setAddListingModal] = useState<Provider | null>(null);
  const [listingSaving, setListingSaving] = useState(false);
  const [listingForm, setListingForm] = useState({
    name: "", category: "electrical", description: "",
    contactPhone: "", contactEmail: "", contactAddress: "",
    priceItems: [] as { name: string; unit: string; price: string }[],
  });

  const [addReqModal, setAddReqModal] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [reqForm, setReqForm] = useState({
    title: "", description: "", category: "other", note: "",
  });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Data loading ────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, srRes] = await Promise.all([
      providersApi.getAll(),
      serviceRequestsApi.getAll(),
    ]);
    if (pRes.errorCode === 200) setProvidersList(pRes.data ?? []);
    if (srRes.errorCode === 200) setServiceReqsList(srRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch listings when provider is selected ────────────────────────────────
  useEffect(() => {
    if (!selectedProvider) { setListings([]); return; }
    setListingsLoading(true);
    listingsApi.getAll({ providerId: selectedProvider.id }).then((res) => {
      if (res.errorCode === 200) setListings(res.data ?? []);
      setListingsLoading(false);
    });
  }, [selectedProvider]);

  // ── Provider actions ────────────────────────────────────────────────────────

  async function approveProvider(id: number) {
    if (!user) return;
    const res = await providersApi.approve(id, user.userID);
    if (res.errorCode === 200) {
      setProvidersList((p) => p.map((x) => x.id === id ? { ...x, registrationStatus: "approved" as const } : x));
      showToast("Đã phê duyệt nhà cung cấp");
    } else {
      showToast(res.errorMessage || "Lỗi phê duyệt", false);
    }
  }

  async function confirmRejectProvider(id: number) {
    const res = await providersApi.reject(id, rejectNote || "Không đáp ứng yêu cầu.");
    if (res.errorCode === 200) {
      setProvidersList((p) => p.map((x) => x.id === id
        ? { ...x, registrationStatus: "rejected" as const, rejectReason: rejectNote }
        : x));
      showToast("Đã từ chối đăng ký", false);
    } else {
      showToast(res.errorMessage || "Lỗi từ chối", false);
    }
    setRejectModal(null);
    setRejectNote("");
  }

  // ── Service request actions ─────────────────────────────────────────────────

  async function approveMgtRequest(id: number) {
    if (!user) return;
    const res = await serviceRequestsApi.approveByMgt(id, user.userID);
    if (res.errorCode === 200) {
      setServiceReqsList((p) => p.map((r) => r.id === id ? { ...r, status: "approved_by_mgt" as ServiceRequestStatus } : r));
      showToast("Đã duyệt yêu cầu dịch vụ");
    } else {
      showToast(res.errorMessage || "Lỗi duyệt yêu cầu", false);
    }
  }

  async function confirmMgtReject(id: number) {
    const res = await serviceRequestsApi.rejectByMgt(id, mgtRejectNote || "Không được phê duyệt.");
    if (res.errorCode === 200) {
      setServiceReqsList((p) => p.map((r) => r.id === id ? { ...r, status: "rejected_by_mgt" as ServiceRequestStatus } : r));
      showToast("Đã từ chối yêu cầu", false);
    } else {
      showToast(res.errorMessage || "Lỗi từ chối yêu cầu", false);
    }
    setMgtRejectModal(null);
    setMgtRejectNote("");
  }

  // ── Listing actions ─────────────────────────────────────────────────────────

  async function approveListing(id: number) {
    if (!user) return;
    const res = await listingsApi.approve(id, user.userID);
    if (res.errorCode === 200) {
      setListings((l) => l.map((x) => x.id === id ? { ...x, status: "approved" as const } : x));
      showToast("Đã duyệt dịch vụ đăng ký");
    } else {
      showToast(res.errorMessage || "Lỗi phê duyệt", false);
    }
  }

  async function confirmListingReject(id: number) {
    const res = await listingsApi.reject(id, listingRejectNote || "Không đáp ứng yêu cầu.");
    if (res.errorCode === 200) {
      setListings((l) => l.map((x) => x.id === id
        ? { ...x, status: "rejected" as const, rejectReason: listingRejectNote }
        : x));
      showToast("Đã từ chối dịch vụ", false);
    } else {
      showToast(res.errorMessage || "Lỗi từ chối", false);
    }
    setListingRejectModal(null);
    setListingRejectNote("");
  }

  function openAddListing(provider: Provider) {
    setAddListingModal(provider);
    setListingForm({ name: "", category: "electrical", description: "", contactPhone: "", contactEmail: "", contactAddress: "", priceItems: [] });
  }

  function addPriceRow() {
    setListingForm((f) => ({ ...f, priceItems: [...f.priceItems, { name: "", unit: "lần", price: "" }] }));
  }

  function removePriceRow(idx: number) {
    setListingForm((f) => ({ ...f, priceItems: f.priceItems.filter((_, i) => i !== idx) }));
  }

  function updatePriceRow(idx: number, field: "name" | "unit" | "price", value: string) {
    setListingForm((f) => ({
      ...f,
      priceItems: f.priceItems.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  }

  async function handleAddListing() {
    if (!addListingModal || !listingForm.name.trim()) return;
    setListingSaving(true);
    const priceList = listingForm.priceItems
      .filter((p) => p.name.trim())
      .map((p) => ({ name: p.name, unit: p.unit, price: Number(p.price) || 0 }));

    const res = await listingsApi.register({
      providerId: addListingModal.id,
      name: listingForm.name,
      category: listingForm.category,
      description: listingForm.description || undefined,
      contactPhone: listingForm.contactPhone || undefined,
      contactEmail: listingForm.contactEmail || undefined,
      contactAddress: listingForm.contactAddress || undefined,
      priceList: priceList.length > 0 ? JSON.stringify(priceList) : undefined,
    });

    if (res.errorCode === 200) {
      showToast("Đã đăng ký dịch vụ thành công");
      setAddListingModal(null);
      if (selectedProvider?.id === addListingModal.id) {
        const refresh = await listingsApi.getAll({ providerId: addListingModal.id });
        if (refresh.errorCode === 200) setListings(refresh.data ?? []);
      }
    } else {
      showToast(res.errorMessage || "Lỗi đăng ký dịch vụ", false);
    }
    setListingSaving(false);
  }

  async function handleAddReq() {
    if (!addReqModal || !reqForm.title.trim() || !user) return;
    setSaving(true);
    const res = await serviceRequestsApi.create({
      title: reqForm.title,
      description: reqForm.description,
      category: reqForm.category,
      providerId: addReqModal.id,
      requestedByAuthUserId: user.userID,
      requiresMgtApproval: false,
      note: reqForm.note,
    });
    if (res.errorCode === 200) {
      showToast(`Đã gửi yêu cầu đến ${addReqModal.companyName}`);
      setAddReqModal(null);
      setReqForm({ title: "", description: "", category: "other", note: "" });
      fetchAll();
    } else {
      showToast(res.errorMessage || "Lỗi gửi yêu cầu", false);
    }
    setSaving(false);
  }

  // ── Derived lists ───────────────────────────────────────────────────────────

  const approvedList = providersList.filter((p) => p.registrationStatus === "approved");
  const pendingList  = providersList.filter((p) => p.registrationStatus === "pending");

  const filteredApproved = approvedList.filter((p) =>
    !search || p.companyName.toLowerCase().includes(search.toLowerCase())
  );

  const providerRequests = (providerId: number) =>
    serviceReqsList.filter((r) => r.providerId === providerId);

  const pendingApprovalReqs = serviceReqsList.filter((r) => r.status === "pending_approval");
  const activeReqs = serviceReqsList.filter((r) =>
    ["pending_approval", "approved_by_mgt", "pending_provider", "accepted_by_provider", "in_progress"].includes(r.status)
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_16px_rgba(52,211,153,0.25)]">
            <Briefcase className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Nhà cung cấp dịch vụ</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Quản lý đăng ký, phê duyệt &amp; yêu cầu dịch vụ</p>
          </div>
        </div>
        {loading && <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Đã duyệt",           value: approvedList.length,             cls: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Chờ duyệt",          value: pendingList.length,              cls: "text-yellow-400",  bg: "bg-yellow-500/10" },
          { label: "Yêu cầu đang xử lý", value: activeReqs.length,              cls: "text-blue-400",    bg: "bg-blue-500/10" },
          { label: "Đã hoàn thành",      value: serviceReqsList.filter((r) => r.status === "completed").length, cls: "text-zinc-300", bg: "bg-white/5" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-4`}>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {([
          ["approved", `Đã duyệt (${approvedList.length})`],
          ["pending",  `Chờ duyệt${pendingList.length > 0 ? ` (${pendingList.length})` : ""}`],
          ["requests", `Yêu cầu dịch vụ${pendingApprovalReqs.length > 0 ? ` (${pendingApprovalReqs.length} chờ duyệt)` : ""}`],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedProvider(null); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "text-emerald-400 border-emerald-500"
                : "text-zinc-500 border-transparent hover:text-white"
            }`}
          >
            {label}
            {t === "pending" && pendingList.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">!</span>
            )}
            {t === "requests" && pendingApprovalReqs.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">!</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/3 border border-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Tab: Approved providers ───────────────────────────────── */}
      {!loading && tab === "approved" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Provider list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all">
              <Search className="w-4 h-4 text-zinc-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nhà cung cấp..."
                className="bg-transparent outline-none text-sm text-white w-full placeholder:text-zinc-600"
              />
              {search && <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
            </div>

            {filteredApproved.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <Store className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Chưa có nhà cung cấp nào được duyệt</p>
              </div>
            )}

            {filteredApproved.map((provider) => {
              const meta = getPrimaryMeta(provider.serviceCategories ?? "[]");
              const color = CATEGORY_COLOR[meta.color] ?? CATEGORY_COLOR.zinc;
              const reqs = providerRequests(provider.id);
              const activeCount = reqs.filter((r) =>
                ["pending_provider", "accepted_by_provider", "in_progress"].includes(r.status)
              ).length;
              const isSelected = selectedProvider?.id === provider.id;

              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(isSelected ? null : provider)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-emerald-500/8 border-emerald-500/30"
                      : "bg-[#111] border-white/5 hover:bg-[#141414] hover:border-white/10"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                    <Store className={`w-4 h-4 ${color.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{provider.companyName}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{meta.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {provider.rating != null && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />{provider.rating.toFixed(1)}
                        </span>
                      )}
                      {activeCount > 0 && (
                        <span className="text-[10px] text-blue-400">{activeCount} yêu cầu đang xử lý</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${isSelected ? "text-emerald-400" : "text-zinc-600"}`} />
                </button>
              );
            })}
          </div>

          {/* Provider detail */}
          <div className="lg:col-span-3">
            {selectedProvider ? (() => {
              const meta = getPrimaryMeta(selectedProvider.serviceCategories ?? "[]");
              const color = CATEGORY_COLOR[meta.color] ?? CATEGORY_COLOR.zinc;
              const cats = parseCategories(selectedProvider.serviceCategories ?? "[]");
              const reqs = providerRequests(selectedProvider.id);

              return (
                <div className="space-y-4">
                  {/* Info card */}
                  <div className={`bg-[#111] border ${color.border} rounded-xl p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                          <Store className={`w-6 h-6 ${color.text}`} />
                        </div>
                        <div>
                          <p className="text-base font-bold text-white">{selectedProvider.companyName}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-1 inline-block ${color.bg} ${color.text} ${color.border}`}>
                            {meta.label}
                          </span>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedProvider.phone}</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedProvider.email}</span>
                            {selectedProvider.address && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedProvider.address}</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">Đại diện: <span className="text-zinc-300">{selectedProvider.contactName}</span></p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAddReqModal(selectedProvider)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${color.bg} ${color.text} ${color.border} hover:opacity-80`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tạo yêu cầu
                      </button>
                    </div>

                    {cats.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {cats.map((c) => {
                          const cm = SERVICE_CATEGORIES[c] ?? SERVICE_CATEGORIES.other;
                          return (
                            <span key={c} className="text-[10px] px-2 py-0.5 bg-white/5 text-zinc-400 rounded-full">
                              {cm.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {(selectedProvider.rating != null || selectedProvider.completedJobs != null) && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {selectedProvider.rating != null && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-white/3 rounded-lg border border-white/5">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <div>
                              <p className="text-sm font-bold text-white">{selectedProvider.rating.toFixed(1)}/5.0</p>
                              <p className="text-[10px] text-zinc-600">Đánh giá</p>
                            </div>
                          </div>
                        )}
                        {selectedProvider.completedJobs != null && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-white/3 rounded-lg border border-white/5">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <div>
                              <p className="text-sm font-bold text-white">{selectedProvider.completedJobs}</p>
                              <p className="text-[10px] text-zinc-600">Việc hoàn thành</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Service listings */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dịch vụ đăng ký</p>
                      <div className="flex items-center gap-2">
                        {listings.filter((l) => l.status === "pending").length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                            {listings.filter((l) => l.status === "pending").length} chờ duyệt
                          </span>
                        )}
                        <button
                          onClick={() => openAddListing(selectedProvider!)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Đăng ký dịch vụ
                        </button>
                      </div>
                    </div>

                    {listingsLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-16 rounded-xl bg-white/3 border border-white/5 animate-pulse" />
                        ))}
                      </div>
                    ) : listings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-zinc-600 border border-white/5 rounded-xl">
                        <Store className="w-6 h-6 mb-1.5 opacity-30" />
                        <p className="text-xs">Chưa có dịch vụ nào đăng ký</p>
                      </div>
                    ) : (
                      listings.map((listing) => {
                        const lm = LISTING_STATUS[listing.status] ?? LISTING_STATUS.pending;
                        const catMeta = SERVICE_CATEGORIES[listing.category] ?? SERVICE_CATEGORIES.other;
                        const catColor = CATEGORY_COLOR[catMeta.color] ?? CATEGORY_COLOR.zinc;
                        const prices = parsePriceList(listing.priceList);
                        return (
                          <div key={listing.id} className="bg-[#111] border border-white/5 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">{listing.name}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border inline-block mt-0.5 ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                                  {catMeta.label}
                                </span>
                                {listing.description && (
                                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{listing.description}</p>
                                )}
                                {prices.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {prices.slice(0, 3).map((p, i) => (
                                      <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 text-zinc-400 rounded-full">
                                        {p.name}: {p.price.toLocaleString("vi-VN")}đ/{p.unit}
                                      </span>
                                    ))}
                                    {prices.length > 3 && (
                                      <span className="text-[10px] text-zinc-600">+{prices.length - 3} mục</span>
                                    )}
                                  </div>
                                )}
                                {listing.status === "rejected" && listing.rejectReason && (
                                  <p className="mt-1.5 text-[10px] text-red-400/80 italic">Từ chối: {listing.rejectReason}</p>
                                )}
                              </div>
                              <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lm.cls} flex-shrink-0`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${lm.dot}`} />
                                {lm.label}
                              </span>
                            </div>
                            {listing.status === "pending" && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                <button onClick={() => approveListing(listing.id)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors">
                                  <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                                </button>
                                <button onClick={() => { setListingRejectModal(listing.id); setListingRejectNote(""); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors">
                                  <XCircle className="w-3.5 h-3.5" /> Từ chối
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Requests for this provider */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Yêu cầu dịch vụ</p>
                    {reqs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-zinc-600 border border-white/5 rounded-xl">
                        <FileText className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-xs">Chưa có yêu cầu nào</p>
                      </div>
                    ) : (
                      reqs.map((req) => {
                        const sm = REQ_STATUS[req.status] ?? REQ_STATUS.pending_provider;
                        return (
                          <div key={req.id} className="bg-[#111] border border-white/5 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">{req.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                  <span className={`flex items-center gap-1 ${req.requestedBy === "management" ? "text-amber-400" : "text-blue-400"}`}>
                                    {req.requestedBy === "management" ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                                    {req.requestedByName ?? (req.requestedBy === "management" ? "Ban quản lý" : "Cư dân")}
                                  </span>
                                  {req.apartmentCode && <><span className="text-zinc-600">·</span><span className="text-amber-400">{req.apartmentCode}</span></>}
                                  <span className="ml-auto flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString("vi-VN") : ""}
                                  </span>
                                </div>
                              </div>
                              <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sm.cls} flex-shrink-0`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                                {sm.label}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
                <Store className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Chọn nhà cung cấp để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Pending registrations ─────────────────────────────── */}
      {!loading && tab === "pending" && (
        <div className="space-y-3">
          {pendingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <CheckCircle className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Không có đăng ký nào đang chờ duyệt</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingList.map((provider) => {
                const meta = getPrimaryMeta(provider.serviceCategories ?? "[]");
                const color = CATEGORY_COLOR[meta.color] ?? CATEGORY_COLOR.zinc;
                const cats = parseCategories(provider.serviceCategories ?? "[]");
                return (
                  <motion.div
                    key={provider.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111] border border-white/5 rounded-xl p-5"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-11 h-11 rounded-xl ${color.bg} flex items-center justify-center flex-shrink-0`}>
                        <Store className={`w-5 h-5 ${color.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{provider.companyName}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border mt-1 inline-block ${color.bg} ${color.text} ${color.border}`}>
                          {meta.label}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {cats.map((c) => (
                            <span key={c} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded-full">
                              {SERVICE_CATEGORIES[c]?.label ?? c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-600 w-20">Đại diện:</span>
                        <span className="text-zinc-300">{provider.contactName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-600" />
                        <span>{provider.phone}</span>
                        <span className="text-zinc-600 mx-1">·</span>
                        <Mail className="w-3 h-3 text-zinc-600" />
                        <span>{provider.email}</span>
                      </div>
                      {provider.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-zinc-600" />
                          <span>{provider.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span>Nộp đơn: {provider.createdAt ? new Date(provider.createdAt).toLocaleDateString("vi-VN") : ""}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-white/5">
                      <button
                        onClick={() => approveProvider(provider.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Phê duyệt
                      </button>
                      <button
                        onClick={() => { setRejectModal(provider.id); setRejectNote(""); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Rejected providers */}
          {providersList.filter((p) => p.registrationStatus === "rejected").length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Đã từ chối</p>
              {providersList.filter((p) => p.registrationStatus === "rejected").map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-400 truncate">{p.companyName}</p>
                    {p.rejectReason && <p className="text-xs text-zinc-600 truncate">{p.rejectReason}</p>}
                  </div>
                  <span className="text-[10px] text-red-500">Từ chối</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: All service requests ─────────────────────────────── */}
      {!loading && tab === "requests" && (
        <div className="space-y-3">
          {serviceReqsList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Chưa có yêu cầu dịch vụ nào</p>
            </div>
          )}
          {serviceReqsList.map((req) => {
            const provider = providersList.find((p) => p.id === req.providerId);
            const sm = REQ_STATUS[req.status] ?? REQ_STATUS.pending_provider;
            const meta = provider ? getPrimaryMeta(provider.serviceCategories ?? "[]") : SERVICE_CATEGORIES.other;
            const color = CATEGORY_COLOR[meta.color] ?? CATEGORY_COLOR.zinc;

            return (
              <div key={req.id} className="flex items-start gap-3 bg-[#111] border border-white/5 rounded-xl p-4 hover:bg-[#141414] transition-colors">
                <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Wrench className={`w-4 h-4 ${color.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{req.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                        {provider && (
                          <span className="flex items-center gap-1">
                            <Store className="w-3 h-3" />{provider.companyName}
                          </span>
                        )}
                        {req.category && (
                          <span className="text-zinc-600">
                            {SERVICE_CATEGORIES[req.category]?.label ?? req.category}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${req.requestedBy === "management" ? "text-amber-400" : "text-blue-400"}`}>
                          {req.requestedBy === "management" ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                          {req.requestedByName ?? (req.requestedBy === "management" ? "Ban quản lý" : "Cư dân")}
                          {req.apartmentCode && ` – ${req.apartmentCode}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString("vi-VN") : ""}
                        </span>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sm.cls} flex-shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                      {sm.label}
                    </span>
                  </div>

                  {/* BQL approve/reject for pending_approval requests */}
                  {req.status === "pending_approval" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                      <button onClick={() => approveMgtRequest(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                      </button>
                      <button onClick={() => { setMgtRejectModal(req.id); setMgtRejectNote(""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  )}

                  {/* Reject reason display */}
                  {req.status === "rejected_by_mgt" && req.mgtRejectReason && (
                    <p className="mt-2 text-xs text-red-400/80 italic">{req.mgtRejectReason}</p>
                  )}
                  {req.status === "rejected_by_provider" && req.providerRejectReason && (
                    <p className="mt-2 text-xs text-red-400/80 italic">{req.providerRejectReason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reject provider modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setRejectModal(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Từ chối đăng ký</h2>
                  <p className="text-xs text-zinc-500">Lý do sẽ gửi đến nhà cung cấp</p>
                </div>
              </div>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
                placeholder="Lý do từ chối..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-red-500/50 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
                <button onClick={() => confirmRejectProvider(rejectModal)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors">
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject service request modal (BQL) ───────────────────────── */}
      <AnimatePresence>
        {mgtRejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setMgtRejectModal(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Từ chối yêu cầu dịch vụ</h2>
                  <p className="text-xs text-zinc-500">Lý do sẽ gửi đến cư dân</p>
                </div>
              </div>
              <textarea value={mgtRejectNote} onChange={(e) => setMgtRejectNote(e.target.value)} rows={3}
                placeholder="Lý do từ chối..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-red-500/50 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setMgtRejectModal(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
                <button onClick={() => confirmMgtReject(mgtRejectModal)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors">
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add listing modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {addListingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setAddListingModal(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl bg-[#111] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <PackagePlus className="w-4.5 h-4.5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Đăng ký dịch vụ mới</h2>
                    <p className="text-xs text-zinc-500">{addListingModal.companyName}</p>
                  </div>
                </div>
                <button onClick={() => setAddListingModal(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body – scrollable */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">

                {/* Name + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tên dịch vụ *</label>
                    <input value={listingForm.name} onChange={(e) => setListingForm({ ...listingForm, name: e.target.value })}
                      placeholder="VD: Sửa chữa điện dân dụng"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ *</label>
                    <select value={listingForm.category} onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none">
                      {Object.entries(SERVICE_CATEGORIES).map(([key, { label }]) => (
                        <option key={key} value={key} className="bg-[#1a1a1a]">{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Số điện thoại liên hệ</label>
                    <input value={listingForm.contactPhone} onChange={(e) => setListingForm({ ...listingForm, contactPhone: e.target.value })}
                      placeholder="0901 234 567"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả dịch vụ</label>
                  <textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })}
                    rows={2} placeholder="Mô tả ngắn về dịch vụ..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                  />
                </div>

                {/* Email + Address */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email liên hệ</label>
                    <input value={listingForm.contactEmail} onChange={(e) => setListingForm({ ...listingForm, contactEmail: e.target.value })}
                      placeholder="contact@company.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Địa chỉ</label>
                    <input value={listingForm.contactAddress} onChange={(e) => setListingForm({ ...listingForm, contactAddress: e.target.value })}
                      placeholder="123 Đường ABC, Quận 1"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                {/* Price list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Bảng giá
                    </label>
                    <button onClick={addPriceRow}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors">
                      <Plus className="w-3 h-3" /> Thêm mục
                    </button>
                  </div>

                  {listingForm.priceItems.length === 0 ? (
                    <button onClick={addPriceRow}
                      className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-white/10 rounded-xl text-xs text-zinc-600 hover:border-white/20 hover:text-zinc-400 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Thêm mục giá đầu tiên
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 px-1">
                        <p className="text-[10px] text-zinc-600">Tên mục</p>
                        <p className="text-[10px] text-zinc-600">Đơn vị</p>
                        <p className="text-[10px] text-zinc-600">Giá (đ)</p>
                        <div />
                      </div>
                      {listingForm.priceItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                          <input
                            value={item.name}
                            onChange={(e) => updatePriceRow(idx, "name", e.target.value)}
                            placeholder="Sửa ổ điện"
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          <input
                            value={item.unit}
                            onChange={(e) => updatePriceRow(idx, "unit", e.target.value)}
                            placeholder="cái"
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(e) => updatePriceRow(idx, "price", e.target.value)}
                            placeholder="150000"
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          <button onClick={() => removePriceRow(idx)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Price summary */}
                      {listingForm.priceItems.some((p) => p.price) && (
                        <div className="flex justify-end mt-1">
                          <p className="text-[10px] text-zinc-600">
                            {listingForm.priceItems.filter((p) => p.name && p.price).length} mục ·{" "}
                            {Math.min(...listingForm.priceItems.filter((p) => p.price).map((p) => Number(p.price))).toLocaleString("vi-VN")}đ –{" "}
                            {Math.max(...listingForm.priceItems.filter((p) => p.price).map((p) => Number(p.price))).toLocaleString("vi-VN")}đ
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/5 flex-shrink-0">
                <p className="text-[10px] text-zinc-600">Sau khi đăng ký, BQL sẽ xét duyệt trước khi hiển thị.</p>
                <div className="flex gap-2">
                  <button onClick={() => setAddListingModal(null)}
                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    Hủy
                  </button>
                  <button onClick={handleAddListing} disabled={listingSaving || !listingForm.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
                    {listingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Đăng ký
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject listing modal (BQL) ───────────────────────────────────── */}
      <AnimatePresence>
        {listingRejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setListingRejectModal(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Từ chối dịch vụ đăng ký</h2>
                  <p className="text-xs text-zinc-500">NCC có thể chỉnh sửa và gửi lại</p>
                </div>
              </div>
              <textarea value={listingRejectNote} onChange={(e) => setListingRejectNote(e.target.value)} rows={3}
                placeholder="Lý do từ chối..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-red-500/50 resize-none mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setListingRejectModal(null)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
                <button onClick={() => confirmListingReject(listingRejectModal)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold rounded-lg transition-colors">
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add request modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {addReqModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setAddReqModal(null)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <h2 className="text-base font-semibold text-white">Tạo yêu cầu dịch vụ</h2>
                  <p className="text-xs text-zinc-500">{addReqModal.companyName}</p>
                </div>
                <button onClick={() => setAddReqModal(null)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tiêu đề *</label>
                  <input value={reqForm.title} onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                    placeholder="VD: Bảo trì định kỳ hệ thống điện"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loại dịch vụ</label>
                  <select value={reqForm.category} onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none">
                    {Object.entries(SERVICE_CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key} className="bg-[#1a1a1a]">{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Mô tả</label>
                  <textarea value={reqForm.description} onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                    rows={3} placeholder="Mô tả chi tiết yêu cầu..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ghi chú</label>
                  <input value={reqForm.note} onChange={(e) => setReqForm({ ...reqForm, note: e.target.value })}
                    placeholder="VD: Vui lòng đến buổi sáng"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
                <button onClick={() => setAddReqModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Hủy</button>
                <button onClick={handleAddReq} disabled={saving || !reqForm.title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors">
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
