'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

const jobs = [
  {
    id: 'UC62',
    name: 'Kiểm tra lịch PM',
    status: 'running',
    schedule: 'Mỗi ngày 01:00',
    lastRun: '01/05/2025',
    lastResult: 'Tạo 4 WO DRAFT',
    resultType: 'success',
  },
  {
    id: 'UC64',
    name: 'Leo thang SLA',
    status: 'running',
    schedule: 'Mỗi 5 phút',
    lastRun: '09:25',
    lastResult: 'Leo thang TKT-0156 → L2 BQL (SMS)',
    resultType: 'warning',
  },
  {
    id: 'UC65',
    name: 'Tự đóng Ticket 24h',
    status: 'running',
    schedule: 'Mỗi giờ',
    lastRun: 'Tối qua',
    lastResult: 'Đóng TKT-0134 tối qua',
    resultType: 'success',
  },
  {
    id: 'UC66',
    name: 'Tính khấu hao tháng',
    status: 'running',
    schedule: 'Ngày 1 hàng tháng',
    lastRun: '01/05/2025',
    lastResult: 'T05/2025: 148 tài sản, 185M₫',
    resultType: 'success',
  },
  {
    id: 'UC67',
    name: 'Snapshot KPI hàng ngày',
    status: 'running',
    schedule: '23:59 mỗi ngày',
    lastRun: '23:59 hôm qua',
    lastResult: 'MTTR 2.3h · SLA 94.2%',
    resultType: 'success',
  },
  {
    id: 'UC68',
    name: 'Đọc dữ liệu IoT',
    status: 'running',
    schedule: 'Mỗi 30 giây',
    lastRun: '09:30:00',
    lastResult: '45/48 sensors online',
    resultType: 'warning',
  },
];

const offlineSensors = ['IOT-PUMP-B1', 'IOT-GEN-A2', 'IOT-AHU-T3'];

export default function SystemMonitor() {
  const [logModal, setLogModal] = useState<string | null>(null);

  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const warningCount = jobs.filter((j) => j.resultType === 'warning').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">⚙ Hệ thống tự động · System Jobs</h1>
          <p className="text-zinc-400 text-sm mt-1">Giám sát và quản lý các tác vụ tự động của hệ thống</p>
        </div>
        <button
          onClick={() => toast.success('Đã làm mới trạng thái tất cả jobs')}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-950 font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Jobs đang chạy</p>
            <p className="text-2xl font-bold text-zinc-100">{runningCount}</p>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Jobs hôm nay</p>
            <p className="text-2xl font-bold text-zinc-100">142</p>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-lg shadow-black/20 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">Cảnh báo</p>
            <p className="text-2xl font-bold text-zinc-100">{warningCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg shadow-black/20 mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-zinc-100">Danh sách System Jobs</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {jobs.map((job) => (
            <div key={job.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-950">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                  <span className="text-xs font-mono text-zinc-500">{job.id}</span>
                  <span className="font-medium text-zinc-100">{job.name}</span>
                </div>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  Đang chạy
                </span>
              </div>
              <div className="flex items-center gap-8 flex-1">
                <div>
                  <p className="text-xs text-zinc-500">Lịch chạy</p>
                  <div className="flex items-center gap-1 text-sm text-zinc-300">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {job.schedule}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Lần cuối</p>
                  <p className="text-sm text-zinc-300">{job.lastRun}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500">Kết quả</p>
                  <p className={`text-sm font-medium ${job.resultType === 'warning' ? 'text-yellow-700' : 'text-zinc-300'}`}>
                    {job.lastResult}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLogModal(job.id)}
                className="flex items-center gap-1 px-3 py-1.5 border border-zinc-700 rounded-lg hover:bg-zinc-950 text-sm font-medium text-zinc-300"
              >
                <FileText className="w-4 h-4" />
                Xem log
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-zinc-100">Cảnh báo IoT · Sensors offline</h2>
          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            {offlineSensors.length} offline
          </span>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-zinc-400 mb-3">
            UC68 phát hiện {offlineSensors.length} cảm biến ngừng gửi dữ liệu. Vui lòng kiểm tra kết nối thiết bị.
          </p>
          <div className="flex gap-3 flex-wrap">
            {offlineSensors.map((sensor) => (
              <div key={sensor} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm font-mono font-medium text-red-700">{sensor}</span>
                <span className="text-xs text-red-500">Offline</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <Wifi className="w-4 h-4" />
              <span>45 sensors online</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-zinc-400">Tổng: 48 sensors</span>
            <div className="flex-1 bg-zinc-700 rounded-full h-2 ml-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '93.75%' }}></div>
            </div>
            <span className="text-sm font-medium text-zinc-300">93.8%</span>
          </div>
        </div>
      </div>

      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-zinc-100">
                Log · {jobs.find((j) => j.id === logModal)?.id} {jobs.find((j) => j.id === logModal)?.name}
              </h2>
              <button onClick={() => setLogModal(null)} className="text-zinc-500 hover:text-zinc-400 text-xl">
                ✕
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-64 overflow-y-auto">
              <p>[2025-05-22 09:30:00] Job started</p>
              <p>[2025-05-22 09:30:00] Processing...</p>
              <p>[2025-05-22 09:30:01] {jobs.find((j) => j.id === logModal)?.lastResult}</p>
              <p>[2025-05-22 09:30:01] Job completed successfully</p>
              <p className="text-zinc-500">[2025-05-22 09:25:00] Previous run started</p>
              <p className="text-zinc-500">[2025-05-22 09:25:01] Previous run completed</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setLogModal(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
