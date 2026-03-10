using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Role;

namespace TH.Auth.Infrastructure.Repository.Role
{
    public interface IRoleRepository
    {
        Task AddRoleAsync(AuthRole role, CancellationToken ct);
        Task<List<AuthRole>> GetAllRolesAsync(CancellationToken ct);
        Task<AuthRole?> GetRoleByIdAsync(int roleID, CancellationToken ct);
        Task UpdateRoleAsync(AuthRole role, CancellationToken ct);
        Task<AuthRole?> GetRoleByNameAsync(string roleName, CancellationToken ct);
        Task DeleteRoleAsync(int roleID, CancellationToken ct);
        Task<AuthRole?> GetDefaultRoleAsync(CancellationToken ct);

        Task<List<AuthRole>> GetRoleByUserID(int userID, CancellationToken ct);
        Task<List<AuthRole>> GetRolesByIdsAsync(IEnumerable<int> roleIds, CancellationToken ct);
        Task<bool> CheckRoleScopeAsync(int roleId, string scope, CancellationToken ct);

        Task<bool> AreAllRolesInScopeAsync(List<int> roleIds, string scope, CancellationToken ct);
        Task<AuthRole?> GetRoleWithPermissionsAsync(int roleId, CancellationToken ct);
        Task<List<AuthRole>> GetAllRoleWhereScopeUser(CancellationToken ct);


    }
    public class RoleRepository : IRoleRepository
    {
        private readonly AuthDbContext _db;
        public RoleRepository(AuthDbContext db) => _db = db;

        public Task AddRoleAsync(AuthRole role, CancellationToken ct)
            => _db.authRoles.AddAsync(role, ct).AsTask();

        public Task UpdateRoleAsync(AuthRole role, CancellationToken ct)
        {
            _db.authRoles.Update(role); // hoặc để EF tracking tự detect
            return Task.CompletedTask;
        }
        public Task<AuthRole?> GetRoleByNameAsync(string roleName, CancellationToken ct)
            => _db.authRoles.FirstOrDefaultAsync(x => x.roleName == roleName, ct);

        public Task<AuthRole?> GetRoleByIdAsync(int roleId, CancellationToken ct)
            => _db.authRoles.FirstOrDefaultAsync(x => x.roleID == roleId, ct);

        public Task<List<AuthRole>> GetAllRolesAsync(CancellationToken ct)
            => _db.authRoles.ToListAsync(ct);

        public async Task DeleteRoleAsync(int roleID, CancellationToken ct)
        {
            await _db.authRoles
                     .Where(x => x.roleID == roleID)
                     .ExecuteDeleteAsync(ct);
        }

        public Task<AuthRole?> GetRoleByIdWithUsersAsync(int roleID, CancellationToken ct)
            => _db.authRoles.Include(r => r.userRoles)
                            .ThenInclude(ur => ur.user)
                            .FirstOrDefaultAsync(r => r.roleID == roleID, ct);

        public Task<List<AuthRole>> GetRoleByUserID(int userID, CancellationToken ct)
            => _db.authUserRoles
                .Where(ur => ur.userID == userID)
                .Select(ur => ur.role)
               .ToListAsync(ct);


        public Task<List<AuthRole>> GetAllRoleWhereScopeUser(CancellationToken ct)
            => _db.authRoles.Where(r => r.scope == "user").ToListAsync(ct);

        public Task<AuthRole?> GetDefaultRoleAsync(CancellationToken ct)
            => _db.authRoles.FirstOrDefaultAsync(x => x.isDefault, ct);
        public async Task<List<AuthRole>> GetRolesByIdsAsync(IEnumerable<int> roleIds, CancellationToken ct)
        {
            // Dùng Contains để tạo câu lệnh SQL: WHERE roleID IN (...)
            return await _db.authRoles
                .Where(r => roleIds.Contains(r.roleID))
                .ToListAsync(ct);
        }
        public async Task<bool> CheckRoleScopeAsync(int roleId, string scope, CancellationToken ct)
        {
            return await _db.authRoles.AnyAsync(r => r.roleID == roleId && r.scope == scope, ct);
        }

        public async Task<bool> AreAllRolesInScopeAsync(List<int> roleIds, string scope, CancellationToken ct)
        {
            if (roleIds == null || !roleIds.Any()) return true;

            // Đếm số lượng Role trong DB khớp ID và khớp Scope
            var countValid = await _db.authRoles
                .CountAsync(r => roleIds.Contains(r.roleID) && r.scope == scope, ct);

            return countValid == roleIds.Distinct().Count();
        }
        public async Task<AuthRole?> GetRoleWithPermissionsAsync(int roleId, CancellationToken ct)
        {
            return await _db.authRoles
                .Include(r => r.rolePermissions) // Quan trọng: Load kèm Permissions
                .FirstOrDefaultAsync(r => r.roleID == roleId, ct);
        }
    }
}
