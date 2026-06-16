'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

import { ArrowLeft, QrCode, Wrench, Ticket, Package, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'info' | 'history' | 'checklist' | 'cost' | 'depreciation';

const tabLabels: Record<Tab, string> = {
  info: 'Thông tin', history: 'Lịch sử bảo trì', checklist: 'Checklist', cost: 'Chi phí', depreciation: 'Khấu hao',
};

const workOrders = [
  { id: 'WO-2025-0098', type: 'PM', desc: 'Bảo trì định kỳ 60 ngày', date: '05/05/2025', status: 'Hoàn thành', technician: 'Nguyễn Văn A', duration: '2.5h' },
  { id: 'TKT-0158', type: 'CM', desc: 'Relay cửa không phản hồi', date: '03/05/2025', status: 'Đã đóng', technician: 'Trần B', duration: '1.5h' },
  { id: 'WO-2025-0061', type: 'PM', desc: 'Bảo trì định kỳ 60 ngày', date: '06/03/2025', status: 'Hoàn thành', technician: 'Nguyễn Văn A', duration: '3h' },
  { id: 'TKT-0122', type: 'CM', desc: 'Thang không dừng đúng tầng', date: '14/02/2025', status: 'Đã đóng', technician: 'Lê C', duration: '4h' },
];

const checklistItems = [
  { label: 'Mức dầu động cơ', lastResult: '✅ Full', lastDate: '05/05' },
  { label: 'Điện áp đầu vào', lastResult: '✅ 380V', lastDate: '05/05' },
  { label: 'Áp suất nhiên liệu', lastResult: '❌ 4.2 bar', lastDate: '05/05' },
  { label: 'Bộ lọc không khí', lastResult: '❌ Cần thay', lastDate: '05/05' },
  { label: 'Hệ thống làm mát', lastResult: '✅ Bình thường', lastDate: '05/05' },
];

const costByMonth = [
  { month: 'T1', pm: 8, cm: 0 }, { month: 'T2', pm: 0, cm: 5.5 },
  { month: 'T3', pm: 8, cm: 2.8 }, { month: 'T4', pm: 0, cm: 12 },
  { month: 'T5', pm: 8, cm: 4.2 },
];

const depreciationData = [
  { year: '2022', bookValue: 450 }, { year: '2023', bookValue: 380 },
  { year: '2024', bookValue: 310 }, { year: '2025', bookValue: 240 },
  { year: '2026 (dự kiến)', bookValue: 170 },
];

export default function AssetDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('info');

  return (
    <div>
      <button onClick={() => router.push('/assets')} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Danh sách tài sản
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100">Thang máy T1 Block A</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">● Hoạt động</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">AST-2025-0042 · Thang máy · Block A, Tầng 1–20</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.info('QR code')} className="flex items-center gap-1.5 px-3 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-950 text-sm font-medium transition-colors">
            <QrCode className="w-4 h-4" /> QR Code
          </button>
          <button onClick={() => router.push(`/pm/work-orders`)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
            <Wrench className="w-4 h-4" /> Tạo WO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: Wrench, label: 'WO đã thực hiện', value: '24', color: 'blue' },
          { icon: Ticket, label: 'Sự cố CM', value: '8', color: 'orange' },
          { icon: Package, label: 'Vật tư đã dùng', value: '42 cái', color: 'purple' },
          { icon: TrendingDown, label: 'Chi phí lũy kế', value: '38.5M₫', color: 'green' },
        ].map((s, i) => (
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
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-400 hover:text-zinc-100'}`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
            <h2 className="text-base font-semibold text-zinc-100 mb-4">Thông tin cơ bản</h2>
            <dl className="space-y-3">
              {[
                ['Mã tài sản', 'AST-2025-0042'],
                ['Loại tài sản', 'Thang máy chở người'],
                ['Nhãn hiệu', 'Mitsubishi Electric'],
                ['Model', 'NEXIEZ-MRL'],
                ['Năm sản xuất', '2020'],
                ['Năm lắp đặt', '2021'],
                ['Tải trọng', '1000 kg / 13 người'],
                ['Tốc độ', '1.75 m/s'],
                ['Số tầng', '20 tầng (1–20)'],
                ['Vị trí', 'Block A, trục thang T1'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 text-sm">
                  <dt className="text-zinc-500 w-36 flex-shrink-0">{k}:</dt>
                  <dd className="text-zinc-100 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
              <h2 className="text-base font-semibold text-zinc-100 mb-4">Bảo trì</h2>
              <dl className="space-y-3">
                {[
                  ['Chu kỳ PM', '60 ngày'],
                  ['Bảo trì gần nhất', '05/05/2025'],
                  ['Bảo trì tiếp theo', '05/07/2025'],
                  ['Nhà thầu', 'Công ty ABC Elevator'],
                  ['Hợp đồng', 'CT-2024-012'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-sm">
                    <dt className="text-zinc-500 w-36 flex-shrink-0">{k}:</dt>
                    <dd className="text-zinc-100 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
              <h2 className="text-base font-semibold text-zinc-100 mb-4">Tài chính</h2>
              <dl className="space-y-3">
                {[
                  ['Nguyên giá', '650,000,000₫'],
                  ['Thời gian KH', '10 năm'],
                  ['Giá trị còn lại', '240,000,000₫'],
                  ['Khấu hao/tháng', '5,416,667₫'],
                  ['Tỷ lệ còn lại', '36.9%'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3 text-sm">
                    <dt className="text-zinc-500 w-36 flex-shrink-0">{k}:</dt>
                    <dd className="text-zinc-100 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-zinc-900 rounded-lg shadow-black/20 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-950 border-b">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Mã</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Mô tả</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Ngày</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">KTV</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {workOrders.map(wo => (
                <tr key={wo.id} className="hover:bg-zinc-950">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{wo.id}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${wo.type === 'PM' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{wo.type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{wo.desc}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{wo.date}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{wo.technician}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300 text-right">{wo.duration}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{wo.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="bg-zinc-900 rounded-lg shadow-black/20 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-950 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Kết quả Checklist gần nhất · WO-2025-0098 · 05/05/2025</h2>
            <span className="text-xs text-zinc-500">10/12 đạt · 2 không đạt</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">STT</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Hạng mục</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Kết quả lần cuối</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {checklistItems.map((c, i) => (
                <tr key={i} className="hover:bg-zinc-950">
                  <td className="px-4 py-3 text-sm text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-3 text-sm text-zinc-100">{c.label}</td>
                  <td className="px-4 py-3 text-sm">{c.lastResult}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{c.lastDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'cost' && (
        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">Chi phí theo tháng (triệu ₫)</h2>
          <div className="flex items-end gap-3" style={{ height: 160 }}>
            {costByMonth.map(m => {
              const totalH = (m.pm + m.cm);
              const maxH = 20;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-zinc-400">{totalH > 0 ? `${totalH}M` : ''}</span>
                  <div className="w-full flex flex-col" style={{ height: 120 }}>
                    <div style={{ flex: maxH - totalH }} />
                    {m.cm > 0 && (
                      <div className="w-full bg-orange-400 rounded-t-sm" style={{ height: `${(m.cm / maxH) * 120}px` }} />
                    )}
                    {m.pm > 0 && (
                      <div className="w-full bg-blue-400" style={{ height: `${(m.pm / maxH) * 120}px`, borderRadius: m.cm === 0 ? '2px 2px 0 0' : 0 }} />
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400 rounded-sm inline-block" />PM</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-400 rounded-sm inline-block" />CM</span>
            <span className="ml-auto font-medium text-zinc-300">Tổng T1-T5: 38.5M₫</span>
          </div>
        </div>
      )}

      {tab === 'depreciation' && (
        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
          <h2 className="text-base font-semibold text-zinc-100 mb-4">Giá trị còn lại theo năm (triệu ₫)</h2>
          <div className="flex items-end gap-6 mb-4" style={{ height: 160 }}>
            {depreciationData.map(d => (
              <div key={d.year} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-zinc-400">{d.bookValue}M</span>
                <div className="w-full flex flex-col justify-end" style={{ height: 120 }}>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm"
                    style={{ height: `${(d.bookValue / 650) * 120}px`, opacity: d.year.includes('dự kiến') ? 0.5 : 1 }}
                  />
                </div>
                <span className="text-xs text-zinc-500 text-center">{d.year}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            {[
              ['Nguyên giá', '650,000,000₫'],
              ['Đã khấu hao', '410,000,000₫'],
              ['Còn lại', '240,000,000₫'],
            ].map(([k, v]) => (
              <div key={k} className="text-center">
                <p className="text-sm text-zinc-500">{k}</p>
                <p className="text-base font-bold text-zinc-100">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
