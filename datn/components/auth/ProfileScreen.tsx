'use client';

import { useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileScreen() {
  const [formData, setFormData] = useState({
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@townhub.vn',
    phone: '0901 234 567',
    department: 'Kỹ thuật'
  });

  const handleSave = () => {
    toast.success('Cập nhật thông tin thành công!');
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Hồ sơ cá nhân</h1>

      <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
        {/* Avatar Section */}
        <div className="flex items-start gap-6 mb-8 pb-8 border-b">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-zinc-700 flex items-center justify-center text-4xl font-semibold text-zinc-400">
              NA
            </div>
            <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Nguyễn Văn An</h2>
            <p className="text-zinc-400">KST – Kỹ sư trưởng</p>
            <p className="text-zinc-500 text-sm">Phòng Kỹ thuật · Tòa nhà A & B</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-zinc-400">Đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Thông tin cá nhân</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Họ và tên *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-950"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Phòng ban</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Kỹ thuật</option>
                <option>Quản lý</option>
                <option>Kế toán</option>
              </select>
            </div>
          </div>
        </div>

        {/* Login Info */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Đăng nhập</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-300">Phương thức đăng nhập: <span className="font-medium">LOCAL</span></span>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">Đổi mật khẩu</button>
          </div>
          <p className="text-sm text-zinc-500">Đăng nhập lần cuối: 18/05/2025 08:42 · IP: 192.168.1.45</p>
        </div>

        {/* Devices */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Thiết bị đăng nhập</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
              <span className="text-sm text-zinc-300">Chrome / Windows 11 / 18/05/2025 08:42</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Đây là bạn</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg">
              <span className="text-sm text-zinc-300">Safari / iPhone / 17/05/2025 20:15</span>
              <button className="text-red-600 hover:text-red-700 text-sm font-medium">Thu hồi</button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Save className="w-4 h-4" />
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}
