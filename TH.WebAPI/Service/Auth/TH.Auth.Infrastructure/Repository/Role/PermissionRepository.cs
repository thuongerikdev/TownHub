using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Role;

namespace TH.Auth.Infrastructure.Repository.Role
{
    public interface IPermissionRepository
    {
        Task<List<AuthPermission>> GetPermissionsByUserIdAsync(int userId, CancellationToken ct);
        Task AddPermissionAsync(AuthPermission permission, CancellationToken ct);
        Task UpdatePermissionAsync(AuthPermission permission, CancellationToken ct);
        Task DeletePermissionAsync(AuthPermission permission, CancellationToken ct);
        Task<AuthPermission?> GetPermissionByNameAsync(string permissionName, CancellationToken ct);
        Task<List<AuthPermission>> GetAllPermissionsAsync(CancellationToken ct);
        Task<List<AuthPermission>> GettPermissionByRoleIdAsync(int roleId, CancellationToken ct);
        Task<AuthPermission> GetPermissionByIdAsync(int permissionId, CancellationToken ct);

        Task<List<AuthPermission>> GetPermissionsByUserIdAsyncWhereScopeUser(int userId, CancellationToken ct);
        Task<AuthPermission?> GetPermissionByNameAsyncWhereScopeUser(string permissionName, CancellationToken ct);
        Task<List<AuthPermission>> GetAllPermissionsAsynWhereScopeUserc(CancellationToken ct);
        Task<List<AuthPermission>> GettPermissionByRoleIdAsyncWhereScopeUser(int roleId, CancellationToken ct);
        Task<AuthPermission> GetPermissionByIdAsyncWhereScopeUser(int permissionId, CancellationToken ct);
        Task AddRangePermissionAsync(List<AuthPermission> permissions, CancellationToken ct);
        Task<bool> AreAllPermissionsInScopeAsync(List<int> permissionIds, string scope, CancellationToken ct);

    }
    public class PermissionRepository : IPermissionRepository
    {
        private readonly AuthDbContext _db;
        public PermissionRepository(AuthDbContext db) => _db = db;
        public Task<AuthPermission> GetPermissionByIdAsync(int permissionId, CancellationToken ct)
        {
            return _db.authPermissions.FirstAsync(p => p.permissionID == permissionId, ct);
        }
        public Task AddRangePermissionAsync(List<AuthPermission> permissions, CancellationToken ct)
        {
            return _db.authPermissions.AddRangeAsync(permissions, ct);
        }


        public async Task<List<AuthPermission>> GetPermissionsByUserIdAsync(int userId, CancellationToken ct)
        {
            // 1. Find the user (using FindAsync is also better for async methods)
            var user = await _db.authUsers.FindAsync(new object[] { userId }, ct);

            // 2. Handle the null case
            if (user == null)
            {
                return new List<AuthPermission>(); // Or throw a NotFoundException
            }

            // 3. Proceed safely since the compiler now knows 'user' is not null
            var query = await _db.Entry(user)
                .Collection(u => u.userRoles)
                .Query()
                .Include(ur => ur.role)
                .ThenInclude(r => r.rolePermissions)
                .ThenInclude(rp => rp.permission)
                .SelectMany(ur => ur.role.rolePermissions)
                .Select(rp => rp.permission)
                .ToListAsync(ct); // Don't forget to pass the cancellation token!

            return query;
        }
        public Task AddPermissionAsync(AuthPermission permission, CancellationToken ct)
        {
            _db.authPermissions.Add(permission);
            return Task.CompletedTask;
        }
        public Task UpdatePermissionAsync(AuthPermission permission, CancellationToken ct)
        {
            _db.authPermissions.Update(permission);
            return Task.CompletedTask;
        }
        public Task<AuthPermission?> GetPermissionByNameAsync(string permissionName, CancellationToken ct)
        {
            return _db.authPermissions.FirstOrDefaultAsync(p => p.permissionName == permissionName, ct);
        }
        public Task DeletePermissionAsync(AuthPermission permission, CancellationToken ct)
        {
            _db.authPermissions.Remove(permission);
            return Task.CompletedTask;
        }
        public Task<List<AuthPermission>> GetAllPermissionsAsync(CancellationToken ct)
        {
            return _db.authPermissions.ToListAsync(ct);
        }
        public async Task<List<AuthPermission>> GettPermissionByRoleIdAsync(int roleId, CancellationToken ct)
        {
            var permissions = await _db.authRolePermissions
                .Where(rp => rp.roleID == roleId)
                .Include(rp => rp.permission)
                .Select(rp => rp.permission)
                .ToListAsync(ct);
            return permissions;
        }
        public async Task<AuthPermission?> GetPermissionByNameAsyncWhereScopeUser(string permissionName, CancellationToken ct)
        {
            return await _db.authPermissions
                .Where(p => p.scope == "user")
                .FirstOrDefaultAsync(p => p.permissionName == permissionName, ct);
        }
        public async Task<List<AuthPermission>> GetAllPermissionsAsynWhereScopeUserc(CancellationToken ct)
        {
            return await _db.authPermissions
                .Where(p => p.scope == "user")
                .ToListAsync(ct);


        }
        public async Task<List<AuthPermission>> GettPermissionByRoleIdAsyncWhereScopeUser(int roleId, CancellationToken ct)
        {
            var permissions = await _db.authRolePermissions
                .Where(rp => rp.roleID == roleId)
                .Include(rp => rp.permission)
                .Where(rp => rp.permission.scope == "user")
                .Select(rp => rp.permission)
                .ToListAsync(ct);
            return permissions;
        }
        public async Task<AuthPermission> GetPermissionByIdAsyncWhereScopeUser(int permissionId, CancellationToken ct)
        {
            return await _db.authPermissions
                .Where(p => p.scope == "user")
                .FirstAsync(p => p.permissionID == permissionId, ct);
        }
        public async Task<List<AuthPermission>> GetPermissionsByUserIdAsyncWhereScopeUser(int userId, CancellationToken ct)
        {
            // 1. Fetch the user safely
            var user = await _db.authUsers.FindAsync(new object[] { userId }, ct);

            // 2. Handle the null scenario
            if (user == null)
            {
                return new List<AuthPermission>(); // Return empty if user doesn't exist
            }

            // 3. Run your collection query safely
            var query = await _db.Entry(user)
                .Collection(u => u.userRoles)
                .Query()
                .Include(ur => ur.role)
                .ThenInclude(r => r.rolePermissions)
                .ThenInclude(rp => rp.permission)
                .SelectMany(ur => ur.role.rolePermissions)
                .Select(rp => rp.permission)
                .Where(p => p.scope == "user") // Your added filter
                .ToListAsync(ct);

            return query;
        }
        public async Task<bool> AreAllPermissionsInScopeAsync(List<int> permissionIds, string scope, CancellationToken ct)
        {
            if (permissionIds == null || !permissionIds.Any()) return true; // List rỗng coi như hợp lệ

            // Đếm số lượng permission trong DB có ID nằm trong list VÀ đúng scope
            var countValid = await _db.authPermissions
                .CountAsync(p => permissionIds.Contains(p.permissionID) && p.scope == scope, ct);

            // Nếu số lượng tìm thấy == số lượng gửi lên -> Tất cả đều đúng scope
            return countValid == permissionIds.Distinct().Count();
        }

    }
}
