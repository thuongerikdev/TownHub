"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Pencil, Ban, RotateCcw, Star, ClipboardCheck,
  FileText, Coins, Mail, Phone, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import {
  vendorsApi, vendorContracts, vendorEvaluations,
  type VendorResponse, type VendorContractResponse, type VendorEvaluationResponse,
  type UpdateVendorInput, type CreateVendorEvaluationInput,
} from "@/lib/api";
import { useApi, useApiList } from "@/lib/use-api";
import { useAuth } from "@/contexts/AuthContext";
import { mockVendors, mockVendorContracts, mockVendorEvaluations } from "@/lib/mock/vendor";
import {
  StatCard, EntityModal, Field, MockBanner, LoadingState, ErrorState,
  StatusBadge, ToneBadge, type StatusDef,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const VENDOR_STATUS: Record<string, StatusDef> = {
  ACTIVE: { label: "Đang hợp tác", tone: "success" },
  INACTIVE: { label: "Ngừng hợp tác", tone: "neutral" },
  BLACKLISTED: { label: "Danh sách đen", tone: "danger" },
};
const CONTRACT_STATUS: Record<string, StatusDef> = {
  DRAFT: { label: "Nháp", tone: "neutral" },
  PENDING_SIGNATURE: { label: "Chờ ký", tone: "warning" },
  ACTIVE: { label: "Hiệu lực", tone: "success" },
  EXPIRED: { label: "Hết hạn", tone: "neutral" },
  TERMINATED: { label: "Đã chấm dứt", tone: "danger" },
};
const RECOMMENDATIONS = ["Tiếp tục hợp tác", "Cân nhắc gia hạn", "Chấm dứt hợp tác"];
const NONE = "__none__";

type Tab = "profile" | "contracts" | "rating";

function scoreTone(score: number): string {
  return score >= 4 ? "bg-success" : score >= 3 ? "bg-warning" : "bg-danger";
}

export default function VendorDetail() {
  const { hasPermission } = useAuth();
  const mayEvaluate = hasPermission("vendor.evaluate");
  const id = String(useParams().id ?? "");

  const vendorQ = useApi<VendorResponse>(() => vendorsApi.getById(id), {
    mock: () => mockVendors.find((v) => v.id === id) ?? mockVendors[0],
    deps: [id],
    enabled: !!id,
  });
  const contractsQ = useApiList<VendorContractResponse>(() => vendorContracts.getAll({ vendorId: id }), {
    mock: () => mockVendorContracts.filter((c) => c.vendorId === id),
    deps: [id],
    enabled: !!id,
  });
  const evalsQ = useApiList<VendorEvaluationResponse>(() => vendorEvaluations.getByVendor(id), {
    mock: () => mockVendorEvaluations.filter((e) => e.vendorId === id),
    deps: [id],
    enabled: !!id,
  });

  const vendor = vendorQ.data;
  const contracts = contractsQ.items;
  const evals = evalsQ.items;

  const [tab, setTab] = useState<Tab>("profile");

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<VendorResponse>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Blacklist modal
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState("");

  // Evaluation modal
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalForm, setEvalForm] = useState({
    quality: 4, timeliness: 4, cost: 4, safety: 4, comments: "", recommendation: RECOMMENDATIONS[0], contractId: NONE,
  });
  const [savingEval, setSavingEval] = useState(false);

  const activeValue = useMemo(
    () => contracts.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + (c.contractValue ?? 0), 0),
    [contracts],
  );
  const avgOverall = useMemo(
    () => (evals.length ? evals.reduce((s, e) => s + e.overallScore, 0) / evals.length : null),
    [evals],
  );
  const criteriaAvg = useMemo(() => {
    if (!evals.length) return null;
    const n = evals.length;
    return {
      quality: evals.reduce((s, e) => s + e.qualityScore, 0) / n,
      timeliness: evals.reduce((s, e) => s + e.timelinessScore, 0) / n,
      cost: evals.reduce((s, e) => s + e.costScore, 0) / n,
      safety: evals.reduce((s, e) => s + e.safetyScore, 0) / n,
    };
  }, [evals]);

  const evalOverall = (evalForm.quality + evalForm.timeliness + evalForm.cost + evalForm.safety) / 4;
  const anyMock = vendorQ.isMock || contractsQ.isMock || evalsQ.isMock;

  function openEdit() {
    if (!vendor) return;
    setEditForm({ ...vendor });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!vendor) return;
    if (!editForm.name?.trim()) { toast.error("Nhập tên nhà thầu."); return; }
    if (!editForm.taxId?.trim()) { toast.error("Nhập mã số thuế."); return; }
    const body: UpdateVendorInput = {
      id: vendor.id,
      vendorCode: editForm.vendorCode?.trim() || vendor.vendorCode,
      name: editForm.name.trim(),
      taxId: editForm.taxId.trim(),
      status: vendor.status,
      contactName: editForm.contactName?.trim() || undefined,
      contactEmail: editForm.contactEmail?.trim() || undefined,
      contactPhone: editForm.contactPhone?.trim() || undefined,
      address: editForm.address?.trim() || undefined,
      notes: editForm.notes?.trim() || undefined,
    };
    setSavingEdit(true);
    const res = await vendorsApi.update(body);
    setSavingEdit(false);
    if (res.errorCode === 200) {
      toast.success("Đã cập nhật thông tin nhà thầu.");
      setEditOpen(false);
      vendorQ.refetch();
    } else toast.error(res.errorMessage || "Cập nhật thất bại.");
  }

  async function doBlacklist() {
    if (!vendor) return;
    const res = await vendorsApi.blacklist(vendor.id, blacklistReason.trim() || "Vi phạm cam kết", "QL Kỹ thuật");
    if (res.errorCode === 200) {
      toast.success(`Đã đưa ${vendor.name} vào danh sách đen.`);
      setBlacklistOpen(false); setBlacklistReason("");
      vendorQ.refetch();
    } else toast.error(res.errorMessage || "Thao tác thất bại.");
  }

  async function activate() {
    if (!vendor) return;
    const res = await vendorsApi.activate(vendor.id);
    if (res.errorCode === 200) { toast.success(`Đã kích hoạt lại ${vendor.name}.`); vendorQ.refetch(); }
    else toast.error(res.errorMessage || "Thao tác thất bại.");
  }

  async function saveEval() {
    if (!vendor) return;
    const body: CreateVendorEvaluationInput = {
      vendorId: vendor.id,
      contractId: evalForm.contractId === NONE ? undefined : evalForm.contractId,
      evaluatorId: "QL Kỹ thuật",
      evaluationDate: new Date().toISOString(),
      overallScore: Math.round(evalOverall * 10) / 10,
      qualityScore: evalForm.quality,
      timelinessScore: evalForm.timeliness,
      costScore: evalForm.cost,
      safetyScore: evalForm.safety,
      comments: evalForm.comments.trim() || undefined,
      recommendation: evalForm.recommendation || undefined,
    };
    setSavingEval(true);
    const res = await vendorEvaluations.create(body);
    setSavingEval(false);
    if (res.errorCode === 200) {
      toast.success("Đã lưu đánh giá nhà thầu.");
      setEvalOpen(false);
      setEvalForm({ quality: 4, timeliness: 4, cost: 4, safety: 4, comments: "", recommendation: RECOMMENDATIONS[0], contractId: NONE });
      evalsQ.refetch();
    } else toast.error(res.errorMessage || "Lưu đánh giá thất bại.");
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Hồ sơ" },
    { key: "contracts", label: `Hợp đồng (${contracts.length})` },
    { key: "rating", label: `Đánh giá (${evals.length})` },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Danh sách nhà thầu
        </Link>
      </div>

      {anyMock && <MockBanner />}

      {vendorQ.loading ? (
        <LoadingState />
      ) : vendorQ.error || !vendor ? (
        <ErrorState message={vendorQ.error ?? "Không tìm thấy nhà thầu."} onRetry={vendorQ.refetch} />
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-brand">
                <Building2 className="size-7" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{vendor.name}</h1>
                  <StatusBadge value={vendor.status} map={VENDOR_STATUS} />
                </div>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{vendor.vendorCode} · MST {vendor.taxId}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openEdit}><Pencil className="size-4" /> Sửa</Button>
              {mayEvaluate && <Button variant="outline" onClick={() => setEvalOpen(true)}><ClipboardCheck className="size-4" /> Đánh giá mới</Button>}
              {vendor.status === "BLACKLISTED" ? (
                <Button variant="outline" className="text-success hover:text-success" onClick={activate}>
                  <RotateCcw className="size-4" /> Kích hoạt lại
                </Button>
              ) : (
                <Button variant="outline" className="text-danger hover:text-danger" onClick={() => setBlacklistOpen(true)}>
                  <Ban className="size-4" /> Danh sách đen
                </Button>
              )}
            </div>
          </div>

          {/* Stat row */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tổng hợp đồng" value={contracts.length} icon={FileText} tone="brand" loading={contractsQ.loading} />
            <StatCard label="Giá trị HĐ hiệu lực" value={formatCurrency(activeValue, { compact: true })} icon={Coins} tone="info" loading={contractsQ.loading} />
            <StatCard label="Điểm đánh giá TB" value={avgOverall != null ? avgOverall.toFixed(1) : "—"} icon={Star} tone="warning" loading={evalsQ.loading} />
            <StatCard label="Số lần đánh giá" value={evals.length} icon={ClipboardCheck} tone="neutral" loading={evalsQ.loading} />
          </div>

          {/* Blacklist banner */}
          {vendor.status === "BLACKLISTED" && (
            <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
              <div className="flex items-start gap-3">
                <Ban className="mt-0.5 size-5 shrink-0 text-danger" />
                <div className="text-sm">
                  <p className="font-semibold text-danger">Nhà thầu đang nằm trong danh sách đen</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {vendor.blacklistReason ?? "—"}
                    {vendor.blacklistedBy && ` · ${vendor.blacklistedBy}`}
                    {vendor.blacklistedAt && ` · ${formatDate(vendor.blacklistedAt)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-border">
            <div className="flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                    tab === t.key
                      ? "border-brand text-brand"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Profile tab */}
          {tab === "profile" && (
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Thông tin liên hệ</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={Building2} label="Người liên hệ" value={vendor.contactName ?? "—"} />
                <InfoRow icon={Phone} label="Điện thoại" value={vendor.contactPhone ?? "—"} />
                <InfoRow icon={Mail} label="Email" value={vendor.contactEmail ?? "—"} />
                <InfoRow icon={MapPin} label="Địa chỉ" value={vendor.address ?? "—"} />
              </dl>
              {vendor.notes && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Ghi chú</p>
                  <p className="mt-1 text-sm text-foreground">{vendor.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Contracts tab */}
          {tab === "contracts" && (
            <div className="space-y-3">
              {contractsQ.loading ? (
                <div className="rounded-xl border border-border bg-surface p-6"><LoadingState /></div>
              ) : contracts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">Chưa có hợp đồng</p>
                  <p className="text-xs text-muted-foreground">Nhà thầu này chưa có hợp đồng nào được ghi nhận.</p>
                </div>
              ) : (
                contracts.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-foreground">{c.contractCode}</span>
                          <StatusBadge value={c.status} map={CONTRACT_STATUS} />
                        </div>
                        {c.scopeOfWork && <p className="mt-1 text-sm text-muted-foreground">{c.scopeOfWork}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(c.startDate)} – {formatDate(c.endDate)}
                          {c.paymentTerms && ` · ${c.paymentTerms}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-foreground">{formatCurrency(c.contractValue)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Rating tab */}
          {tab === "rating" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="text-center sm:w-40 sm:shrink-0">
                    <p className="text-5xl font-bold tabular-nums text-foreground">{avgOverall != null ? avgOverall.toFixed(1) : "—"}</p>
                    <div className="mt-1 flex justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={cn("size-4", avgOverall != null && s <= Math.round(avgOverall) ? "text-warning fill-warning" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{evals.length} lượt đánh giá</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    {criteriaAvg ? (
                      <>
                        <ScoreBar label="Chất lượng" score={criteriaAvg.quality} />
                        <ScoreBar label="Đúng hạn" score={criteriaAvg.timeliness} />
                        <ScoreBar label="Chi phí" score={criteriaAvg.cost} />
                        <ScoreBar label="An toàn" score={criteriaAvg.safety} />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Chưa có dữ liệu đánh giá theo tiêu chí.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Lịch sử đánh giá</h3>
                {evals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
                    <Star className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium text-foreground">Chưa có đánh giá</p>
                    <p className="text-xs text-muted-foreground">Nhấn “Đánh giá mới” để chấm điểm nhà thầu.</p>
                  </div>
                ) : (
                  [...evals]
                    .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime())
                    .map((e) => (
                      <div key={e.id} className="rounded-xl border border-border bg-surface p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Star className="size-4 text-warning fill-warning" />
                            <span className="text-sm font-semibold text-foreground">{e.overallScore.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">· {e.evaluatorId}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(e.evaluationDate)}{e.contractCode ? ` · ${e.contractCode}` : ""}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Chất lượng {e.qualityScore} · Đúng hạn {e.timelinessScore} · Chi phí {e.costScore} · An toàn {e.safetyScore}
                        </p>
                        {e.comments && <p className="mt-2 text-sm text-foreground">“{e.comments}”</p>}
                        {e.recommendation && <ToneBadge tone="info" className="mt-2">{e.recommendation}</ToneBadge>}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      <EntityModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Chỉnh sửa thông tin nhà thầu"
        size="lg"
        onSubmit={saveEdit}
        submitting={savingEdit}
        submitLabel="Lưu thay đổi"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã nhà thầu" required>
            <Input value={editForm.vendorCode ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, vendorCode: e.target.value }))} />
          </Field>
          <Field label="Mã số thuế" required>
            <Input value={editForm.taxId ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, taxId: e.target.value }))} />
          </Field>
          <Field label="Tên công ty" required className="col-span-2">
            <Input value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Người liên hệ">
            <Input value={editForm.contactName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))} />
          </Field>
          <Field label="Số điện thoại">
            <Input value={editForm.contactPhone ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))} />
          </Field>
          <Field label="Email" className="col-span-2">
            <Input type="email" value={editForm.contactEmail ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))} />
          </Field>
          <Field label="Địa chỉ" className="col-span-2">
            <Input value={editForm.address ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          <Field label="Ghi chú" className="col-span-2">
            <Textarea rows={3} value={editForm.notes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>
        </div>
      </EntityModal>

      {/* Evaluation modal */}
      <EntityModal
        open={evalOpen}
        onOpenChange={setEvalOpen}
        title="Đánh giá nhà thầu"
        description={vendor?.name}
        size="lg"
        onSubmit={saveEval}
        submitting={savingEval}
        submitLabel="Lưu đánh giá"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Chất lượng"><ScoreSelect value={evalForm.quality} onChange={(n) => setEvalForm((f) => ({ ...f, quality: n }))} /></Field>
            <Field label="Đúng hạn"><ScoreSelect value={evalForm.timeliness} onChange={(n) => setEvalForm((f) => ({ ...f, timeliness: n }))} /></Field>
            <Field label="Chi phí"><ScoreSelect value={evalForm.cost} onChange={(n) => setEvalForm((f) => ({ ...f, cost: n }))} /></Field>
            <Field label="An toàn"><ScoreSelect value={evalForm.safety} onChange={(n) => setEvalForm((f) => ({ ...f, safety: n }))} /></Field>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted-foreground">Điểm tổng hợp</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{evalOverall.toFixed(1)} / 5</span>
          </div>
          {contracts.length > 0 && (
            <Field label="Hợp đồng liên quan" hint="Gắn đánh giá với một hợp đồng cụ thể (không bắt buộc).">
              <Select value={evalForm.contractId} onValueChange={(v) => setEvalForm((f) => ({ ...f, contractId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Không gắn hợp đồng</SelectItem>
                  {contracts.map((c) => <SelectItem key={c.id} value={c.id}>{c.contractCode}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Khuyến nghị">
            <Select value={evalForm.recommendation} onValueChange={(v) => setEvalForm((f) => ({ ...f, recommendation: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECOMMENDATIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nhận xét">
            <Textarea rows={3} value={evalForm.comments} onChange={(e) => setEvalForm((f) => ({ ...f, comments: e.target.value }))} placeholder="Ưu điểm, hạn chế, đề xuất cải thiện…" />
          </Field>
        </div>
      </EntityModal>

      {/* Blacklist modal */}
      <EntityModal
        open={blacklistOpen}
        onOpenChange={(o) => { if (!o) { setBlacklistOpen(false); setBlacklistReason(""); } }}
        title="Đưa vào danh sách đen?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => { setBlacklistOpen(false); setBlacklistReason(""); }}>Huỷ</Button>
            <Button variant="destructive" onClick={doBlacklist}>Xác nhận</Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Mọi hợp đồng đang hiệu lực của <strong className="text-foreground">{vendor?.name}</strong> nên được rà soát lại.
        </p>
        <Field label="Lý do">
          <Textarea rows={3} value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} placeholder="Chậm tiến độ nhiều lần, chất lượng không đạt…" />
        </Field>
      </EntityModal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", scoreTone(score))} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">{score.toFixed(1)}</span>
    </div>
  );
}

function ScoreSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="rounded p-0.5 transition-transform hover:scale-110">
          <Star className={cn("size-6", n <= value ? "text-warning fill-warning" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}
