'use client';

import { useState } from 'react';
import { Search, Plus, MoreVertical } from 'lucide-react';

export default function UserManagement() {
  const users = [
    { id: 1, name: 'Nguyễn Văn An', email: 'an@townhub.vn', role: 'KST', dept: 'KT A & B', status: 'active', lastLogin: '2h trước' },
    { id: 2, name: 'Trần Thị B', email: 'b@townhub.vn', role: 'KTV', dept: 'KT A', status: 'active', lastLogin: '1 ngày' },
    { id: 3, name: 'Lê Văn C', email: 'c@townhub.vn', role: 'BQL', dept: 'All', status: 'locked', lastLogin: '30 ngày' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Quản lý người dùng</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          <Plus className="w-4 h-4" />
          Thêm người dùng
        </button>
      </div>

      <div className="bg-zinc-900 rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Tìm tên, email..."
              className="w-full pl-10 pr-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Vai trò</option>
            <option>KST</option>
            <option>KTV</option>
            <option>BQL</option>
          </select>
          <select className="px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Trạng thái</option>
            <option>Đang dùng</option>
            <option>Bị khóa</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Họ tên / Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  BP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Đăng nhập
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-zinc-900 divide-y divide-zinc-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-950">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-zinc-100">{user.name}</div>
                      <div className="text-sm text-zinc-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      user.role === 'KST' ? 'bg-green-100 text-green-700' :
                      user.role === 'KTV' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-100">{user.dept}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-sm text-zinc-100">{user.status === 'active' ? 'Đang dùng' : 'Bị khóa'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{user.lastLogin}</td>
                  <td className="px-6 py-4">
                    <button className="text-zinc-500 hover:text-zinc-400">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
