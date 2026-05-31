'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Check } from 'lucide-react';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const passwordStrength = passwords.new.length > 0
    ? passwords.new.length < 6 ? 20
    : passwords.new.length < 8 ? 50
    : /[A-Z]/.test(passwords.new) && /[0-9]/.test(passwords.new) ? 80
    : 60
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            🔒 Đổi mật khẩu
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Mật khẩu hiện tại *</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Mật khẩu mới *</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwords.new && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength < 40 ? 'bg-red-500' :
                        passwordStrength < 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${passwordStrength}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {passwordStrength < 40 ? 'Yếu' : passwordStrength < 70 ? 'Trung bình' : 'Tốt'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={passwords.new.length >= 8 ? 'text-green-600' : 'text-zinc-500'}>
                    {passwords.new.length >= 8 ? '✓' : '○'} Ít nhất 8 ký tự
                  </div>
                  <div className={/[A-Z]/.test(passwords.new) ? 'text-green-600' : 'text-zinc-500'}>
                    {/[A-Z]/.test(passwords.new) ? '✓' : '○'} Chữ hoa
                  </div>
                  <div className={/[0-9]/.test(passwords.new) ? 'text-green-600' : 'text-zinc-500'}>
                    {/[0-9]/.test(passwords.new) ? '✓' : '○'} Số
                  </div>
                  <div className={/[^A-Za-z0-9]/.test(passwords.new) ? 'text-green-600' : 'text-zinc-500'}>
                    {/[^A-Za-z0-9]/.test(passwords.new) ? '✓' : '○'} Ký tự đặc biệt
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Xác nhận mật khẩu mới *</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-700 rounded-lg hover:bg-zinc-950 font-medium"
          >
            Hủy
          </button>
          <button
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Cập nhật mật khẩu
          </button>
        </div>
      </div>
    </div>
  );
}
