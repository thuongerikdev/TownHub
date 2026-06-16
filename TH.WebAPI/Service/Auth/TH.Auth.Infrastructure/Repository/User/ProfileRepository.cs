using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.User;

namespace TH.Auth.Infrastructure.Repository.User
{
    public interface IProfileRepository
    {
        Task AddAsync(AuthProfile profile, CancellationToken ct);
        Task<AuthProfile?> GetByUserIdAsync(int userId, CancellationToken ct);
        Task<bool> ExistsByUserIdAsync(int userId, CancellationToken ct);
        Task UpdateAsync(AuthProfile profile, CancellationToken ct);
    }
    public sealed class ProfileRepository : IProfileRepository
    {
        private readonly AuthDbContext _db;
        public ProfileRepository(AuthDbContext db) => _db = db;

        public Task AddAsync(AuthProfile profile, CancellationToken ct)
            => _db.authProfiles.AddAsync(profile, ct).AsTask();

        public Task<AuthProfile?> GetByUserIdAsync(int userId, CancellationToken ct)
            => _db.authProfiles.FirstOrDefaultAsync(p => p.userID == userId, ct);

        public Task<bool> ExistsByUserIdAsync(int userId, CancellationToken ct)
            => _db.authProfiles.AnyAsync(p => p.userID == userId, ct);

        public Task UpdateAsync(AuthProfile profile, CancellationToken ct)
        {
            _db.authProfiles.Update(profile);
            return Task.CompletedTask;
        }


    }
}
