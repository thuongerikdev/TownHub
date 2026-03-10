using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Role;

namespace TH.Auth.Infrastructure.Repository.Role
{
    public interface IRolePermissionRepository
    {
        Task AddRolePermissionAsync(AuthRolePermission rolePermission, CancellationToken ct);
        // 👇 THÊM 2 HÀM MỚI
        Task AddRangeRolePermissionAsync(List<AuthRolePermission> rolePermissions, CancellationToken ct);
        Task RemoveRangeRolePermissionAsync(List<AuthRolePermission> rolePermissions, CancellationToken ct);

        Task UpdateRolePermissionAsync(AuthRolePermission rolePermission, CancellationToken ct);
        Task RemoveRolePermissionAsync(int roleID, int permissionID, CancellationToken ct);
        Task<List<AuthRolePermission>> GetRolePermissionsByRoleIdAsync(int roleId, CancellationToken ct);
    }

    public class RolePermissionRepository : IRolePermissionRepository
    {
        private readonly AuthDbContext _db;
        public RolePermissionRepository(AuthDbContext db) => _db = db;

        public Task AddRolePermissionAsync(AuthRolePermission rolePermission, CancellationToken ct)
            => _db.authRolePermissions.AddAsync(rolePermission, ct).AsTask();

        // 👇 IMPLEMENT
        public Task AddRangeRolePermissionAsync(List<AuthRolePermission> rolePermissions, CancellationToken ct)
            => _db.authRolePermissions.AddRangeAsync(rolePermissions, ct);

        public Task RemoveRangeRolePermissionAsync(List<AuthRolePermission> rolePermissions, CancellationToken ct)
        {
            _db.authRolePermissions.RemoveRange(rolePermissions);
            return Task.CompletedTask;
        }

        public Task UpdateRolePermissionAsync(AuthRolePermission rolePermission, CancellationToken ct)
        {
            _db.authRolePermissions.Update(rolePermission);
            return Task.CompletedTask;
        }

        public async Task RemoveRolePermissionAsync(int roleID, int permissionID, CancellationToken ct)
        {
            var item = await _db.authRolePermissions
                .FirstOrDefaultAsync(rp => rp.roleID == roleID && rp.permissionID == permissionID, ct);
            if (item != null) _db.authRolePermissions.Remove(item);
        }

        public Task<List<AuthRolePermission>> GetRolePermissionsByRoleIdAsync(int roleId, CancellationToken ct)
        {
            return _db.authRolePermissions.Where(rp => rp.roleID == roleId).ToListAsync(ct);
        }
    }
}
