"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Send, LifeBuoy, Zap, Droplet, Wind, ArrowUpDown, Flame, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  tickets, assetApi, slaConfigs,
  type CreateTicketInput, type DamageDetectionResponse,
} from "@/lib/api";
import { useApiList } from "@/lib/use-api";
import { mockTickets, mockSlaConfigs } from "@/lib/mock/cm";
import { mockAssets } from "@/lib/mock/asset";
import { MockBanner, Field } from "@/components/shared";
import { PhotoCapture, type PhotoItem } from "@/components/shared/photo-capture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BUILDING = "11111111-1111-1111-1111-111111111111";

const CATEGORY: Record<string, { label: string; icon: typeof Zap }> = {
  ELECTRICAL: { label: "Điện", icon: Zap },
  PLUMBING: { label: "Nước", icon: Droplet },
  HVAC: { label: "HVAC", icon: Wind },
  ELEVATOR: { label: "Thang máy", icon: ArrowUpDown },
  FIRE: { label: "PCCC", icon: Flame },
  OTHER: { label: "Khác", icon: Package },
};
const CATEGORY_OPTIONS = Object.keys(CATEGORY);

const PRIORITY: Record<string, string> = {
  LOW: "Thấp", MEDIUM: "Trung bình", HIGH: "Cao", CRITICAL: "Khẩn cấp",
};
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const SOURCE: Record<string, string> = { RESIDENT: "Cư dân", STAFF: "Nhân viên", SYSTEM: "Hệ thống", IOT: "Cảm biến IoT" };
const SOURCE_OPTIONS = Object.keys(SOURCE);
const NONE = "__none__";

function genTicketCode() {
  const y = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${y}-${n}`;
}

export default function NewTicket() {
  const router = useRouter();
  const assetsQ = useApiList(() => assetApi.getAll(), { mock: mockAssets });
  const slaQ = useApiList(() => slaConfigs.getAll(), { mock: mockSlaConfigs });

  const [ticketCode] = useState(genTicketCode);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ELECTRICAL");
  const [priority, setPriority] = useState("MEDIUM");
  const [source, setSource] = useState("RESIDENT");
  const [reportedBy, setReportedBy] = useState("");
  const [unitId, setUnitId] = useState("");
  const [assetId, setAssetId] = useState(NONE);
  const [slaConfigId, setSlaConfigId] = useState(NONE);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [aiResult, setAiResult] = useState<DamageDetectionResponse | null>(null);
  const [aiChecking, setAiChecking] = useState(false);

  async function handleAddPhoto(url: string) {
    setPhotos((prev) => [...prev, { url }]);
    setAiChecking(true);
    try {
      const res = await tickets.detectDamage(url);
      if (res.errorCode === 200 && res.data?.available) {
        setAiResult(res.data);
      }
    } catch {
      // Dịch vụ AI không khả dụng — bỏ qua, không chặn luồng tạo ticket.
    } finally {
      setAiChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Nhập tiêu đề sự cố."); return; }
    if (!reportedBy.trim()) { toast.error("Nhập người báo cáo."); return; }
    setSubmitting(true);
    // unitId/reportedBy are GUID columns with no Auth directory yet — keep the human
    // input as text (reportedByName + a location line in the description) instead.
    const loc = unitId.trim();
    const desc = [loc ? `Vị trí: ${loc}` : "", description.trim()].filter(Boolean).join("\n").trim();
    const body: CreateTicketInput = {
      ticketCode, buildingId: BUILDING, reportedByName: reportedBy.trim(),
      assetId: assetId === NONE ? undefined : assetId,
      slaConfigId: slaConfigId === NONE ? undefined : slaConfigId,
      title: title.trim(), description: desc || undefined,
      category, priority, source,
      // "#BEFORE" đánh dấu ảnh chụp lúc báo sự cố, theo đúng convention hiển thị
      // Trước/Sau đã có ở TicketDetail.tsx (mã hoá loại ảnh vào fragment URL).
      photoUrls: photos.length ? photos.map((p) => `${p.url}#BEFORE`) : undefined,
    };
    const res = await tickets.create(body);
    setSubmitting(false);
    if (res.errorCode === 200) {
      toast.success(`Đã tiếp nhận sự cố · ${ticketCode}`);
      router.push("/tickets");
    } else {
      toast.error(res.errorMessage || "Tạo sự cố thất bại.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ArrowLeft className="size-4" /> Quay lại danh sách sự cố
      </Link>

      {(assetsQ.isMock || slaQ.isMock) && <MockBanner />}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <LifeBuoy className="size-5 text-brand" />
          <span className="font-mono text-sm text-muted-foreground">{ticketCode}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Báo sự cố mới</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ghi nhận sự cố để hệ thống phân công và theo dõi SLA.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-surface p-6">
        <Field label="Tiêu đề sự cố" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Thang máy T12 không hoạt động" />
        </Field>

        <Field label="Loại sự cố">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CATEGORY_OPTIONS.map((k) => {
              const Icon = CATEGORY[k].icon;
              const active = category === k;
              return (
                <button
                  key={k} type="button" onClick={() => setCategory(k)}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-medium transition-colors ${active ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground hover:border-brand/40"}`}
                >
                  <Icon className="size-5" />
                  {CATEGORY[k].label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Ảnh hiện trạng" hint="Tuỳ chọn — AI sẽ gợi ý loại sự cố từ ảnh">
          <PhotoCapture photos={photos} onAdd={handleAddPhoto} emptyHint="Chưa có ảnh." />
          {aiChecking && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 animate-pulse" /> AI đang phân tích ảnh…
            </p>
          )}
          {!aiChecking && aiResult?.available && aiResult.detections.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-info/30 bg-info/5 p-2.5 text-xs">
              <Sparkles className="size-4 shrink-0 text-info" />
              <span className="text-muted-foreground">
                Gợi ý AI: <strong className="text-foreground">{aiResult.detections[0].labelVi}</strong>
                {" "}({Math.round(aiResult.detections[0].confidence * 100)}%)
              </span>
              {aiResult.suggestedCategory && aiResult.suggestedCategory !== category && (
                <Button
                  type="button" variant="secondary" size="sm" className="h-6 px-2 text-xs"
                  onClick={() => setCategory(aiResult.suggestedCategory!)}
                >
                  Áp dụng · {CATEGORY[aiResult.suggestedCategory]?.label ?? aiResult.suggestedCategory}
                </Button>
              )}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mức độ ưu tiên">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((k) => <SelectItem key={k} value={k}>{PRIORITY[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nguồn báo">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((k) => <SelectItem key={k} value={k}>{SOURCE[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Người báo cáo" required>
            <Input value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} placeholder="VD: Cư dân P.1204" />
          </Field>
          <Field label="Căn hộ / Vị trí" hint="Tuỳ chọn">
            <Input value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="VD: P.1204" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tài sản liên quan" hint="Tuỳ chọn">
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger><SelectValue placeholder="Không gắn tài sản" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Không gắn tài sản</SelectItem>
                {assetsQ.items.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.assetCode ? `${a.assetCode} · ` : ""}{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="SLA áp dụng" hint="Tuỳ chọn">
            <Select value={slaConfigId} onValueChange={setSlaConfigId}>
              <SelectTrigger><SelectValue placeholder="Tự động theo ưu tiên" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Tự động theo ưu tiên</SelectItem>
                {slaQ.items.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Mô tả chi tiết" hint="Tuỳ chọn">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Mô tả hiện tượng, vị trí cụ thể, mức độ ảnh hưởng…" />
        </Field>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/tickets">Huỷ</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            <Send className="size-4" /> {submitting ? "Đang gửi…" : "Gửi báo cáo sự cố"}
          </Button>
        </div>
      </form>
    </div>
  );
}
