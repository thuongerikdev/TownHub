'use client';

import { useState } from 'react';
import { Bell, CheckCheck, ExternalLink, Mail, MessageSquare, Monitor } from 'lucide-react';
import { toast } from 'sonner';

type Channel = 'IN_APP' | 'EMAIL' | 'SMS';
type FilterTab = 'ALL' | 'IN_APP' | 'EMAIL' | 'SMS';
type FilterPeriod = 'all' | 'today' | 'week';

interface Notification {
  id: number;
  time: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  channels: Channel[];
  actionLabel?: string;
  day: 'today' | 'yesterday';
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    time: '09:25',
    message: 'CRITICAL · TKT-0158 Thang máy T12 - SLA L1 leo thang (1h còn)',
    type: 'critical',
    channels: ['IN_APP', 'EMAIL', 'SMS'],
    actionLabel: 'Xem Ticket',
    day: 'today',
    read: false,
  },
  {
    id: 2,
    time: '01:02',
    message: 'Tạo tự động 4 WO mới (PM T5/2025) - Cần phân công',
    type: 'warning',
    channels: ['IN_APP'],
    actionLabel: 'Xem WO',
    day: 'today',
    read: false,
  },
  {
    id: 3,
    time: '01:00',
    message: 'Khấu hao T05/2025 hoàn tất: 148 tài sản, 185M₫',
    type: 'info',
    channels: ['IN_APP', 'EMAIL'],
    actionLabel: 'Xem báo cáo',
    day: 'today',
    read: true,
  },
  {
    id: 4,
    time: '23:45',
    message: 'TKT-0134 tự động đóng sau 24h không phản hồi',
    type: 'critical',
    channels: ['IN_APP', 'SMS'],
    day: 'yesterday',
    read: true,
  },
  {
    id: 5,
    time: '16:30',
    message: 'Hợp đồng CT-XYZ sắp hết hạn (30 ngày)',
    type: 'warning',
    channels: ['IN_APP', 'EMAIL'],
    actionLabel: 'Xem hợp đồng',
    day: 'yesterday',
    read: true,
  },
  {
    id: 6,
    time: '10:15',
    message: 'WO-2025-0098 đã hoàn thành nghiệm thu',
    type: 'info',
    channels: ['IN_APP'],
    day: 'yesterday',
    read: true,
  },
];

const typeConfig = {
  critical: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-100', text: 'text-red-700', icon: '🔴' },
  warning: { dot: 'bg-yellow-500', bg: 'bg-yellow-50 border-yellow-100', text: 'text-yellow-700', icon: '🟡' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700', icon: '🔵' },
};

const channelIcon = {
  IN_APP: <Monitor className="w-3 h-3" />,
  EMAIL: <Mail className="w-3 h-3" />,
  SMS: <MessageSquare className="w-3 h-3" />,
};

const channelLabel: Record<Channel, string> = {
  IN_APP: 'IN_APP',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const filtered = notifications.filter((n) => {
    if (activeTab !== 'ALL' && !n.channels.includes(activeTab as Channel)) return false;
    if (filterPeriod === 'today' && n.day !== 'today') return false;
    if (filterPeriod === 'week') return true;
    return true;
  });

  const todayItems = filtered.filter((n) => n.day === 'today');
  const yesterdayItems = filtered.filter((n) => n.day === 'yesterday');

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'IN_APP', label: 'IN_APP' },
    { key: 'EMAIL', label: 'EMAIL' },
    { key: 'SMS', label: 'SMS' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-100">🔔 Thông báo</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
              {unreadCount} chưa đọc
            </span>
          )}
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-950 font-medium text-sm"
        >
          <CheckCheck className="w-4 h-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="bg-zinc-900 rounded-lg shadow-black/20 mb-0">
        <div className="px-6 pt-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pb-2">
              {(['all', 'today', 'week'] as FilterPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    filterPeriod === p
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-950'
                  }`}
                >
                  {p === 'all' ? 'Tất cả' : p === 'today' ? 'Hôm nay' : 'Tuần này'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-zinc-800">
          {todayItems.length > 0 && (
            <>
              <div className="px-6 py-2 bg-zinc-950">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hôm nay</p>
              </div>
              {todayItems.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={markRead} />
              ))}
            </>
          )}
          {yesterdayItems.length > 0 && (
            <>
              <div className="px-6 py-2 bg-zinc-950">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Hôm qua</p>
              </div>
              {yesterdayItems.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={markRead} />
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Không có thông báo nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: number) => void;
}) {
  const cfg = typeConfig[notification.type];

  return (
    <div
      className={`px-6 py-4 flex items-start gap-4 hover:bg-zinc-950 cursor-pointer border-l-4 ${
        !notification.read ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent'
      }`}
      onClick={() => onRead(notification.id)}
    >
      <div className="flex-shrink-0 mt-0.5">
        <span className="text-lg">{cfg.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm font-medium ${!notification.read ? 'text-zinc-100' : 'text-zinc-300'}`}>
              {notification.message}
            </p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-zinc-500">{notification.time}</span>
              <div className="flex items-center gap-1.5">
                {notification.channels.map((ch) => (
                  <span
                    key={ch}
                    className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs font-medium"
                  >
                    {channelIcon[ch]}
                    {channelLabel[ch]}
                    <span className="text-green-500">✓</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
            )}
            {notification.actionLabel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(notification.id);
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-zinc-700 rounded-lg hover:bg-zinc-900 text-xs font-medium text-blue-600 hover:border-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
                {notification.actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
