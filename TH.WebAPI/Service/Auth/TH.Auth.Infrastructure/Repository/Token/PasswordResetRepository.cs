using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Token;

namespace TH.Auth.Infrastructure.Repository.Token
{
    public interface IPasswordResetRepository
    {
        Task AddAsync(AuthPasswordReset entity, CancellationToken ct);
        Task<AuthPasswordReset?> FindLatestActiveAsync(int userId, string purpose, CancellationToken ct);
        Task UpdateAsync(AuthPasswordReset entity, CancellationToken ct);
        Task<List<AuthPasswordReset>> GetRecentAsync(int userId, string purpose, int take, CancellationToken ct);
    }
    public sealed class PasswordResetRepository : IPasswordResetRepository
    {
        private readonly AuthDbContext _db;
        public PasswordResetRepository(AuthDbContext db) => _db = db;

        public Task AddAsync(AuthPasswordReset entity, CancellationToken ct)
            => _db.authPasswordResets.AddAsync(entity, ct).AsTask();

        public Task<AuthPasswordReset?> FindLatestActiveAsync(int userId, string purpose, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            return _db.authPasswordResets
                .Where(x => x.userID == userId && x.consumedAt == null && x.expiresAt > now && x.purpose == purpose)
                .OrderByDescending(x => x.createdAt)
                .FirstOrDefaultAsync(ct);
        }

        public Task UpdateAsync(AuthPasswordReset entity, CancellationToken ct)
        {
            _db.authPasswordResets.Update(entity);
            return Task.CompletedTask;
        }

        public Task<List<AuthPasswordReset>> GetRecentAsync(int userId, string purpose, int take, CancellationToken ct)
            => _db.authPasswordResets
                  .Where(x => x.userID == userId && x.purpose == purpose)
                  .OrderByDescending(x => x.createdAt)
                  .Take(take)
                  .ToListAsync(ct);
    }
}
