'use client';

import { useRouter } from 'next/navigation';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Package, Wrench, Ticket, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  const todayStats = [
    { label: 'WO đang mở', value: '12', sub: '3 chờ nghiệm thu', icon: Wrench, color: 'blue', path: '/pm/work-orders' },
    { label: 'Sự cố CM', value: '8', sub: '5 khẩn cần xử lý', icon: Ticket, color: 'orange', path: '/tickets' },
    { label: 'SLA nguy hiểm', value: '3', sub: '< 20% thời gian còn', icon: AlertTriangle, color: 'red', path: '/tickets/sla-dashboard' },
    { label: 'Tồn kho thấp', value: '12', sub: '2 mục hết hàng', icon: Package, color: 'yellow', path: '/inventory' },
  ];

  const needsAttention = [
    { id: 'TKT-0158', label: 'Thang máy T12 Block A · CRITICAL · 1h 23ph SLA', type: 'critical', action: 'Phân công KTV', path: '/tickets' },
    { id: 'WO-0112', label: 'Thang máy T2 · Chưa phân công · Quá 2 ngày', type: 'warning', action: 'Phân công KTV', path: '/pm/work-orders' },
    { id: 'MAT', label: 'Relay Mitsubishi · Tồn kho: 2 (ngưỡng: 5)', type: 'warning', action: 'Tạo PR đặt hàng', path: '/procurement/requests' },
    { id: 'TKT-0151', label: 'Bơm nước khu A · SLA OVERDUE 2h 15ph', type: 'critical', action: 'Xem ngay', path: '/tickets' },
  ];

  const kpis = [
    { label: 'MTTR', value: '2h 18ph', change: '↓ từ 3h 05ph', good: true },
    { label: 'MTBF', value: '45 ngày', change: '↑ từ 38 ngày', good: true },
    { label: 'SLA đúng hạn', value: '94.2%', change: 'Target ≥90%', good: true },
    { label: 'PM đúng hạn', value: '87%', change: 'Target ≥95%', good: false },
  ];

  const ticketTrendData = [
    { date: '01/05', open: 12, closed: 8 },
    { date: '05/05', open: 15, closed: 11 },
    { date: '10/05', open: 18, closed: 14 },
    { date: '13/05', open: 14, closed: 12 },
    { date: '15/05', open: 16, closed: 10 },
    { date: '18/05', open: 8, closed: 13 },
  ];

  const woData = [
    { month: 'T1', pm: 42, cm: 28 },
    { month: 'T2', pm: 38, cm: 31 },
    { month: 'T3', pm: 45, cm: 25 },
    { month: 'T4', pm: 48, cm: 29 },
    { month: 'T5', pm: 48, cm: 26 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">🏠 Dashboard Vận hành · Tháng 05/2025</h1>
        <p className="text-zinc-400 text-sm mt-1">Xin chào, Nguyễn Văn An (KST) · {new Date().toLocaleDateString('vi-VN')}</p>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-4 gap-4">
        {todayStats.map((stat, idx) => (
          <button
            key={idx}
            onClick={() => router.push(stat.path)}
            className="bg-zinc-900 rounded-lg shadow-black/20 p-5 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-zinc-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-zinc-100">{stat.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${
                stat.color === 'blue' ? 'bg-blue-100' :
                stat.color === 'orange' ? 'bg-orange-100' :
                stat.color === 'red' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <stat.icon className={`w-5 h-5 ${
                  stat.color === 'blue' ? 'text-blue-600' :
                  stat.color === 'orange' ? 'text-orange-600' :
                  stat.color === 'red' ? 'text-red-600' : 'text-yellow-600'
                }`} />
              </div>
            </div>
            <p className="text-xs text-zinc-500">{stat.sub}</p>
          </button>
        ))}
      </div>

      {/* Needs Attention */}
      <div className="bg-zinc-900 rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">⚡ Cần xử lý ngay</h2>
          <span className="text-xs text-zinc-500">{needsAttention.length} mục</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {needsAttention.map((item, idx) => (
            <div key={idx} className={`p-4 flex items-center justify-between hover:bg-zinc-950 ${
              item.type === 'critical' ? 'border-l-4 border-red-500' : 'border-l-4 border-yellow-400'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.type === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <span className="font-medium text-zinc-100 text-sm">{item.id}</span>
                  <span className="text-zinc-400 text-sm ml-2">{item.label}</span>
                </div>
              </div>
              <button
                onClick={() => router.push(item.path)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${
                  item.type === 'critical'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              >
                {item.action}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Month */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-zinc-900 rounded-lg shadow-black/20 p-4">
            <p className="text-sm text-zinc-400 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-zinc-100">{kpi.value}</p>
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${kpi.good ? 'text-green-600' : 'text-yellow-600'}`}>
              {kpi.good ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              <span>{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Ticket 30 ngày gần nhất</h2>
            <button onClick={() => router.push('/tickets')} className="text-sm text-blue-600 hover:underline">Xem tất cả →</button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ticketTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="open" stroke="#EF4444" name="Mở mới" strokeWidth={2} />
              <Line type="monotone" dataKey="closed" stroke="#10B981" name="Đã đóng" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">Work Order theo tháng</h2>
            <button onClick={() => router.push('/pm/work-orders')} className="text-sm text-blue-600 hover:underline">Xem tất cả →</button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={woData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pm" fill="#3B82F6" name="PM" />
              <Bar dataKey="cm" fill="#F59E0B" name="CM" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-zinc-900 rounded-lg shadow-black/20 p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-4">Truy cập nhanh</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Upload OCR Hóa đơn', path: '/procurement/ocr/new', color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { label: 'Tạo Ticket sự cố', path: '/tickets/new', color: 'bg-orange-50 border-orange-200 text-orange-700' },
            { label: 'Xem báo cáo KPI', path: '/reports', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            { label: 'Kiểm kê kho', path: '/inventory/stock-taking', color: 'bg-green-50 border-green-200 text-green-700' },
          ].map((link, idx) => (
            <button
              key={idx}
              onClick={() => router.push(link.path)}
              className={`p-3 rounded-lg border text-sm font-medium text-left hover:opacity-80 transition-opacity ${link.color}`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
