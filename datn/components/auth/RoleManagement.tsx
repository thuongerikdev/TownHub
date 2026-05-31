'use client';

import { useState } from 'react';
import { Check, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleManagement() {
  const [selectedRole, setSelectedRole] = useState('KST');

  const permissions = [
    { module: 'Tài sản', view: true, add: true, edit: true, delete: true, approve: false },
    { module: 'Work Order (PM)', view: true, add: true, edit: true, delete: false, approve: true },
    { module: 'Ticket (CM)', view: true, add: true, edit: true, delete: false, approve: true },
    { module: 'Kho vật tư', view: true, add: true, edit: true, delete: false, approve: false },
    { module: 'Mua sắm/PO', view: true, add: true, edit: true, delete: false, approve: true },
    { module: 'Nhà thầu', view: true, add: true, edit: true, delete: false, approve: false },
    { module: 'Khấu hao/TC', view: true, add: false, edit: false, delete: false, approve: false },
    { module: 'Báo cáo BI', view: true, add: false, edit: false, delete: false, approve: false },
    { module: 'Người dùng', view: false, add: false, edit: false, delete: false, approve: false }
  ];

  const handleSave = () => {
    toast.success('Lưu cấu hình phân quyền thành công!');
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Phân quyền Vai trò (RBAC)</h1>

      <div className="bg-zinc-900 rounded-lg shadow-black/20 p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Vai trò:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="KST">KST - Kỹ sư trưởng</option>
            <option value="KTV">KTV - Kỹ thuật viên</option>
            <option value="BQL">BQL - Ban quản lý</option>
            <option value="KT">KT - Kế toán</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-100">MODULE</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-100">XEM</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-100">THÊM</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-100">SỬA</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-100">XÓA</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-100">DUYỆT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {permissions.map((perm, idx) => (
                <tr key={idx} className="hover:bg-zinc-950">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-100">{perm.module}</td>
                  <td className="px-4 py-3 text-center">
                    {perm.view ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {perm.add ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : perm.module === 'Người dùng' ? (
                      <X className="w-5 h-5 text-red-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {perm.edit ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {perm.delete ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {perm.approve ? (
                      <Check className="w-5 h-5 text-green-600 mx-auto" />
                    ) : perm.module.includes('Khấu hao') || perm.module.includes('Báo cáo') || perm.module === 'Người dùng' ? (
                      <span className="text-zinc-500">—</span>
                    ) : (
                      <X className="w-5 h-5 text-red-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleSave}
          className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Save className="w-4 h-4" />
          Lưu cấu hình
        </button>
      </div>
    </div>
  );
}
