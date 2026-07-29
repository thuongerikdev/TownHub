'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ArrowLeft, QrCode, Wrench, ClipboardCheck, Coins, TrendingDown, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  assetApi, workOrders as woApi, checklistTemplates, costTracking, assetDepreciation,
  type AssetResponse, type WorkOrderResponse, type CostTrackingResponse,
  type AssetDepreciationLogResponse, type ChecklistTemplateResponse,
  type ChecklistTemplateItemResponse, type CreateWorkOrderInput,
} from '@/lib/api';
import { useApi, useApiList } from '@/lib/use-api';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState, ErrorState, EntityModal, Field } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/format';

type Tab = 'info' | 'history' | 'checklist' | 'cost' | 'depreciation';
const tabLabels: Record<Tab, string> = {
  info: 'Thông tin', history: 'Lịch sử bảo trì', checklist: 'Checklist', cost: 'Chi phí', depreciation: 'Khấu hao',
};

const WO_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: 'Nháp',            cls: 'bg-zinc-700 text-zinc-200' },
  ASSIGNED:       { label: 'Đã phân công',    cls: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS:    { label: 'Đang thực hiện',  cls: 'bg-amber-100 text-amber-700' },
  PENDING_REVIEW: { label: 'Chờ nghiệm thu',  cls: 'bg-purple-100 text-purple-700' },
  COMPLETED:      { label: 'Hoàn thành',      cls: 'bg-green-100 text-green-700' },
  CANCELLED:      { label: 'Đã huỷ',          cls: 'bg-red-100 text-red-700' },
};

const emptyWoForm = {
  woCode: '', woType: 'PM', checklistTemplateId: '', title: '',
  priority: 'MEDIUM', estimatedHours: '', scheduledDate: '', dueDate: '', description: '',
};

export default function AssetDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');

  const assetId = String(id ?? '');
  const assetQ = useApi<AssetResponse>(() => assetApi.getById(assetId), { deps: [assetId], enabled: !!assetId });
  const asset = assetQ.data;

  // Dữ liệu các tab (thật)
  const { hasPermission } = useAuth();
  const mayCreateWo = hasPermission("workorder.create");
  const woQ = useApiList<WorkOrderResponse>(() => woApi.getAll({ assetId }), { deps: [assetId], enabled: !!assetId });
  const costQ = useApiList<CostTrackingResponse>(() => costTracking.getByAsset(assetId), { deps: [assetId], enabled: !!assetId });
  const deprQ = useApiList<AssetDepreciationLogResponse>(() => assetDepreciation.getByAsset(assetId), { deps: [assetId], enabled: !!assetId });
  const tplQ = useApiList<ChecklistTemplateResponse>(() => checklistTemplates.getAll());

  const checklistTpl = tplQ.items.find((t) => t.categoryId === asset?.categoryId) ?? null;
  const itemsQ = useApi<ChecklistTemplateItemResponse[]>(
    () => checklistTemplates.getItems(checklistTpl!.id),
    { deps: [checklistTpl?.id ?? ''], enabled: !!checklistTpl },
  );

  const costTotal = costQ.items.reduce((s, c) => s + (c.amount ?? 0), 0);

  // ── WO create modal ──
  const [woOpen, setWoOpen] = useState(false);
  const [woSubmitting, setWoSubmitting] = useState(false);
  const [woForm, setWoForm] = useState(emptyWoForm);

  const [qrOpen, setQrOpen] = useState(false);
  const qrValue = asset ? `QR-${asset.assetCode}` : '';
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!qrOpen || !asset) return;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(qrValue, {
          width: 256, margin: 2, errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch { if (!cancelled) setQrDataUrl(null); }
    })();
    return () => { cancelled = true; };
  }, [qrOpen, asset, qrValue]);

  function openWo() {
    if (!asset) { toast.error('Chưa tải được thông tin tài sản.'); return; }
    setWoForm({
      ...emptyWoForm,
      woCode: `WO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      title: `Bảo trì ${asset.name}`,
      checklistTemplateId: checklistTpl?.id ?? '',
    });
    setWoOpen(true);
  }

  async function submitWo() {
    if (!asset) return;
    if (!woForm.checklistTemplateId) { toast.error('Chọn checklist template.'); return; }
    if (!woForm.title.trim()) { toast.error('Nhập tiêu đề công việc.'); return; }
    setWoSubmitting(true);
    const body: CreateWorkOrderInput = {
      woCode: woForm.woCode.trim(), assetId: asset.id, checklistTemplateId: woForm.checklistTemplateId,
      buildingId: asset.buildingId, woType: woForm.woType, title: woForm.title.trim(),
      description: woForm.description.trim() || undefined, priority: woForm.priority,
      scheduledDate: woForm.scheduledDate ? new Date(woForm.scheduledDate + 'T00:00:00Z').toISOString() : undefined,
      dueDate: woForm.dueDate ? new Date(woForm.dueDate + 'T00:00:00Z').toISOString() : undefined,
      estimatedHours: woForm.estimatedHours ? Number(woForm.estimatedHours) : undefined,
    };
    const res = await woApi.create(body);
    setWoSubmitting(false);
    if (res.errorCode === 200) { toast.success(`Đã tạo WO ${body.woCode}.`); setWoOpen(false); woQ.refetch(); }
    else toast.error(res.errorMessage || 'Tạo WO thất bại.');
  }

  if (assetQ.loading) return <div className="py-10"><LoadingState /></div>;
  if (!asset) return <div className="py-10"><ErrorState message={assetQ.error ?? 'Không tìm thấy tài sản.'} onRetry={assetQ.refetch} /></div>;

  const stats = [
    { icon: Wrench, label: 'Lệnh công việc', value: String(woQ.items.length), color: 'blue' },
    { icon: ClipboardCheck, label: 'Chi phí luỹ kế', value: formatCurrency(costTotal, { compact: true }), color: 'orange' },
    { icon: Coins, label: 'Khấu hao luỹ kế', value: formatCurrency(asset.accumulatedDepreciation, { compact: true }), color: 'purple' },
    { icon: TrendingDown, label: 'Giá trị còn lại', value: formatCurrency(asset.bookValue, { compact: true }), color: 'green' },
  ];

  const infoRows: [string, string][] = [
    ['Mã tài sản', asset.assetCode],
    ['Tên tài sản', asset.name],
    ['Danh mục', asset.categoryName ?? '—'],
    ['Số serial', asset.serialNumber ?? '—'],
    ['Vị trí', asset.locationAreaCode ?? '—'],
    ['Mức độ quan trọng', asset.criticalityLevel],
    ['Nhà cung cấp', asset.vendorName ?? '—'],
    ['Ngày lắp đặt', formatDate(asset.installationDate)],
    ['Hết hạn bảo hành', formatDate(asset.warrantyExpiryDate)],
  ];
  const maintRows: [string, string][] = [
    ['Bảo trì gần nhất', formatDate(asset.lastMaintenanceDate)],
    ['Bảo trì tiếp theo', formatDate(asset.nextMaintenanceDate)],
    ['Phương pháp KH', asset.depreciationMethod === 'STRAIGHT_LINE' ? 'Đường thẳng' : asset.depreciationMethod],
    ['TK kế toán', asset.accountCode ?? '—'],
  ];
  const finRows: [string, string][] = [
    ['Nguyên giá', formatCurrency(asset.purchasePrice)],
    ['Ngày mua', formatDate(asset.purchaseDate)],
    ['Thời gian KH', asset.usefulLifeMonths ? `${asset.usefulLifeMonths} tháng` : '—'],
    ['Giá trị thu hồi', formatCurrency(asset.salvageValue)],
    ['Khấu hao luỹ kế', formatCurrency(asset.accumulatedDepreciation)],
    ['Giá trị còn lại', formatCurrency(asset.bookValue)],
  ];

  return (
    <div>
      <button onClick={() => router.push('/assets')} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Danh sách tài sản
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">{asset.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">● {asset.status}</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {asset.assetCode}{asset.categoryName ? ` · ${asset.categoryName}` : ''}{asset.locationAreaCode ? ` · ${asset.locationAreaCode}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setQrOpen(true)} className="flex items-center gap-1.5 px-3 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-950 text-sm font-medium transition-colors">
            <QrCode className="w-4 h-4" /> QR Code
          </button>
          {mayCreateWo && (
            <button onClick={openWo} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
              <Wrench className="w-4 h-4" /> Tạo WO
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-zinc-900 rounded-lg shadow-black/20 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
              s.color === 'blue' ? 'bg-blue-100' : s.color === 'orange' ? 'bg-orange-100' : s.color === 'purple' ? 'bg-purple-100' : 'bg-green-100'
            }`}>
              <s.icon className={`w-4 h-4 ${
                s.color === 'blue' ? 'text-blue-600' : s.color === 'orange' ? 'text-orange-600' : s.color === 'purple' ? 'text-purple-600' : 'text-green-600'
              }`} />
            </div>
            <p className="text-xl font-bold text-zinc-100">{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="border-b border-zinc-800 mb-6">
        <div className="flex">
          {(Object.keys(tabLabels) as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-400 hover:text-zinc-100'}`}>
              {tabLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-6">
          <Card title="Thông tin cơ bản"><Dl rows={infoRows} /></Card>
          <div className="space-y-4">
            <Card title="Bảo trì"><Dl rows={maintRows} /></Card>
            <Card title="Tài chính"><Dl rows={finRows} /></Card>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <Card>
          {woQ.loading ? <LoadingState /> : woQ.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Chưa có lệnh công việc nào cho tài sản này.</p>
          ) : (
            <table className="w-full">
              <thead><tr className="bg-zinc-950 border-b border-zinc-800">
                {['Mã WO', 'Loại', 'Tiêu đề', 'Ngày', 'KTV', 'Giờ', 'Trạng thái'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-zinc-400 uppercase ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {woQ.items.map(w => (
                  <tr key={w.id} className="hover:bg-zinc-950 cursor-pointer" onClick={() => router.push(`/pm/work-orders/${w.id}`)}>
                    <td className="px-4 py-3 text-sm font-mono text-blue-500">{w.woCode}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${w.woType === 'PM' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{w.woType}</span></td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{w.title ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(w.actualEndAt ?? w.scheduledDate ?? w.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{w.assignedToName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right">{w.actualHours != null ? `${w.actualHours}h` : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${WO_STATUS[w.status]?.cls ?? 'bg-zinc-700 text-zinc-200'}`}>{WO_STATUS[w.status]?.label ?? w.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'checklist' && (
        <Card title={checklistTpl ? `Checklist áp dụng · ${checklistTpl.name}` : 'Checklist'}>
          {tplQ.loading || itemsQ.loading ? <LoadingState /> : !checklistTpl ? (
            <p className="py-8 text-center text-sm text-zinc-500">Danh mục của tài sản chưa gắn mẫu checklist. Cấu hình ở màn Checklist.</p>
          ) : (itemsQ.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Mẫu checklist này chưa có hạng mục nào.</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-zinc-800">
                {['STT', 'Hạng mục', 'Loại', 'Bắt buộc', 'Giá trị chuẩn'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {[...(itemsQ.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((c, i) => (
                  <tr key={c.id} className="hover:bg-zinc-950">
                    <td className="px-4 py-3 text-sm text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-3 text-sm text-zinc-100">{c.itemLabel}{c.description ? <span className="block text-xs text-zinc-500">{c.description}</span> : null}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{c.itemType}</td>
                    <td className="px-4 py-3 text-sm">{c.isRequired ? <span className="text-amber-500">Có</span> : <span className="text-zinc-500">Không</span>}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{c.expectedValue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'cost' && (
        <Card title="Chi phí tài sản">
          {costQ.loading ? <LoadingState /> : costQ.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Chưa ghi nhận chi phí nào cho tài sản này.</p>
          ) : (
            <>
              <table className="w-full">
                <thead><tr className="border-b border-zinc-800">
                  {['Ngày', 'Loại chi phí', 'Diễn giải', 'Số tiền'].map((h, i) => (
                    <th key={h} className={`px-4 py-2 text-xs font-semibold text-zinc-400 uppercase ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {costQ.items.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-950">
                      <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(c.costDate)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{c.costType ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{c.description ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-100 text-right font-medium">{formatCurrency(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3 text-sm">
                <span className="text-zinc-500">Tổng chi phí:</span>
                <span className="font-bold text-zinc-100">{formatCurrency(costTotal)}</span>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'depreciation' && (
        <Card title="Lịch sử khấu hao">
          <div className="grid grid-cols-3 gap-4 pb-4 mb-2 border-b border-zinc-800">
            {([['Nguyên giá', asset.purchasePrice], ['Khấu hao luỹ kế', asset.accumulatedDepreciation], ['Giá trị còn lại', asset.bookValue]] as [string, number | undefined][]).map(([k, v]) => (
              <div key={k} className="text-center">
                <p className="text-sm text-zinc-500">{k}</p>
                <p className="text-base font-bold text-zinc-100">{formatCurrency(v)}</p>
              </div>
            ))}
          </div>
          {deprQ.loading ? <LoadingState /> : deprQ.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Chưa có kỳ khấu hao nào. Chạy khấu hao ở màn “Khấu hao”.</p>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-zinc-800">
                {['Kỳ', 'Khấu hao kỳ', 'GT sau', 'Luỹ kế', 'Chứng từ'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-xs font-semibold text-zinc-400 uppercase ${i >= 1 && i <= 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {deprQ.items.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-950">
                    <td className="px-4 py-3 text-sm text-zinc-300">{String(d.periodMonth).padStart(2, '0')}/{d.periodYear}</td>
                    <td className="px-4 py-3 text-sm text-amber-500 text-right">{formatCurrency(d.depreciationAmount)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right">{formatCurrency(d.bookValueAfter)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 text-right">{formatCurrency(d.accumulatedTotal)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-500">{d.documentCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modal tạo WO */}
      <EntityModal
        open={woOpen} onOpenChange={setWoOpen}
        title="Tạo Work Order" description={`${asset.assetCode} · ${asset.name}`}
        size="lg" onSubmit={submitWo} submitting={woSubmitting} submitLabel="Tạo"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mã WO" required><Input value={woForm.woCode} onChange={(e) => setWoForm((f) => ({ ...f, woCode: e.target.value }))} /></Field>
          <Field label="Loại">
            <Select value={woForm.woType} onValueChange={(v) => setWoForm((f) => ({ ...f, woType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="PM">PM — Bảo trì định kỳ</SelectItem><SelectItem value="CM">CM — Sửa chữa</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Tài sản" className="col-span-2"><Input value={`${asset.assetCode} · ${asset.name}`} disabled /></Field>
          <Field label="Checklist template" required className="col-span-2">
            <Select value={woForm.checklistTemplateId} onValueChange={(v) => setWoForm((f) => ({ ...f, checklistTemplateId: v }))}>
              <SelectTrigger><SelectValue placeholder={tplQ.loading ? 'Đang tải…' : 'Chọn template'} /></SelectTrigger>
              <SelectContent>{tplQ.items.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Tiêu đề" required className="col-span-2"><Input value={woForm.title} onChange={(e) => setWoForm((f) => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Độ ưu tiên">
            <Select value={woForm.priority} onValueChange={(v) => setWoForm((f) => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Ước tính (giờ)"><Input type="number" min="0" value={woForm.estimatedHours} onChange={(e) => setWoForm((f) => ({ ...f, estimatedHours: e.target.value }))} placeholder="3" /></Field>
          <Field label="Ngày thực hiện"><Input type="date" value={woForm.scheduledDate} onChange={(e) => setWoForm((f) => ({ ...f, scheduledDate: e.target.value }))} /></Field>
          <Field label="Hạn hoàn thành"><Input type="date" value={woForm.dueDate} onChange={(e) => setWoForm((f) => ({ ...f, dueDate: e.target.value }))} /></Field>
          <Field label="Mô tả công việc" className="col-span-2"><Textarea rows={3} value={woForm.description} onChange={(e) => setWoForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        </div>
      </EntityModal>

      {/* Modal QR */}
      <EntityModal
        open={qrOpen} onOpenChange={setQrOpen}
        title="Mã QR tài sản" description={asset.name} size="sm"
        footer={
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setQrOpen(false)}>Đóng</Button>
            <Button variant="outline" disabled={!qrDataUrl} onClick={() => { if (!qrDataUrl) return; const a = document.createElement('a'); a.href = qrDataUrl; a.download = `qr-${asset.assetCode}.png`; a.click(); }}>
              <Download className="size-4" /> Tải PNG
            </Button>
            <Button onClick={() => { navigator.clipboard?.writeText(qrValue); toast.success('Đã sao chép mã QR.'); }}>
              <Copy className="size-4" /> Sao chép mã
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex size-52 items-center justify-center rounded-xl border border-border bg-white p-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`Mã QR ${qrValue}`} width={208} height={208} className="size-full" />
            ) : (
              <QrCode className="size-24 animate-pulse text-muted-foreground" />
            )}
          </div>
          <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-sm text-foreground">{qrValue}</code>
          <p className="text-center text-xs text-muted-foreground">
            Dán mã này lên tài sản. Kỹ thuật viên quét ở mục <strong className="text-foreground">Quét mã QR</strong> / Check-in để mở nhanh hồ sơ.
          </p>
        </div>
      </EntityModal>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-lg shadow-black/20 overflow-hidden">
      {title && <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-300">{title}</h2></div>}
      <div className={title ? '' : 'p-1'}>{children}</div>
    </div>
  );
}

function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-3 p-6">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-3 text-sm">
          <dt className="text-zinc-500 w-36 flex-shrink-0">{k}:</dt>
          <dd className="text-zinc-100 font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
