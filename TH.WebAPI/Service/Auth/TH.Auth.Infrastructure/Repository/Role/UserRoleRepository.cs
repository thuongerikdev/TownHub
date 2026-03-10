using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Role;

namespace TH.Auth.Infrastructure.Repository.Role
{
    public interface IUserRoleRepository
    {
        Task AddUserRoleAsync(AuthUserRole userRole, CancellationToken ct);
        Task RemoveUserRoleAsync(int userID, int roleID, CancellationToken ct);
        Task<List<AuthUserRole>> GetUserRolesByUserIdAsync(int userId, CancellationToken ct);
        //Task<bool> UserHasRoleAsync(int userID, string roleName, CancellationToken ct);

        Task AddRangeUserRoleAsync(List<AuthUserRole> userRoles, CancellationToken ct);

        Task RemoveRangeUserRoleAsync(List<AuthUserRole> userRoles, CancellationToken ct);
    }
    public class UserRoleRepository : IUserRoleRepository
    {
        private readonly AuthDbContext _db;
        public UserRoleRepository(AuthDbContext db) => _db = db;
        public Task AddUserRoleAsync(AuthUserRole userRole, CancellationToken ct)
            => _db.authUserRoles.AddAsync(userRole, ct).AsTask();
        public Task RemoveUserRoleAsync(int userID, int roleID, CancellationToken ct)
            => _db.authUserRoles.Where(x => x.userID == userID && x.roleID == roleID).ExecuteDeleteAsync(ct);
        public Task<List<AuthUserRole>> GetUserRolesByUserIdAsync(int userId, CancellationToken ct)
            => _db.authUserRoles.Where(x => x.userID == userId).ToListAsync(ct);

        public Task AddRangeUserRoleAsync(List<AuthUserRole> userRoles, CancellationToken ct)
            => _db.authUserRoles.AddRangeAsync(userRoles, ct);

        public Task RemoveRangeUserRoleAsync(List<AuthUserRole> userRoles, CancellationToken ct)
        {
            _db.authUserRoles.RemoveRange(userRoles);
            return Task.CompletedTask;
        }


    }
}
