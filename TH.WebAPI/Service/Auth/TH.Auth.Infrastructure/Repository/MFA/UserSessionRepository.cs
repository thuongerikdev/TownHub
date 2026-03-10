using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.MFA;

namespace TH.Auth.Infrastructure.Repository.MFA
{
    public interface IAuthUserSessionRepository
    {
        Task AddSessionAsync(AuthUserSession session, CancellationToken ct);
        Task<AuthUserSession?> FindByIdAsync(int sessionId, CancellationToken ct);
        Task<List<AuthUserSession>> GetActiveSessionsByUserIdAsync(int userId, CancellationToken ct);
        Task<List<AuthUserSession>> GetAllSessionsAsync(CancellationToken ct);
        Task MarkRevokedAsync(int sessionId, CancellationToken ct);

        // NEW: revoke tất cả session của 1 user, trả về số bản ghi bị ảnh hưởng
        Task<int> MarkAllRevokedForUserAsync(int userId, CancellationToken ct);
    }
    public sealed class AuthUserSessionRepository : IAuthUserSessionRepository
    {
        private readonly AuthDbContext _db;
        public AuthUserSessionRepository(AuthDbContext db) => _db = db;

        public Task AddSessionAsync(AuthUserSession session, CancellationToken ct)
            => _db.authUserSessions.AddAsync(session, ct).AsTask();

        public Task<AuthUserSession?> FindByIdAsync(int sessionId, CancellationToken ct)
            => _db.authUserSessions.FirstOrDefaultAsync(s => s.sessionID == sessionId, ct);

        public async Task MarkRevokedAsync(int sessionId, CancellationToken ct)
        {
            var s = await _db.authUserSessions.FirstOrDefaultAsync(x => x.sessionID == sessionId, ct);
            if (s is null) return;
            s.isRevoked = true;
            s.lastSeenAt = DateTime.UtcNow;
            _db.authUserSessions.Update(s);
            // Không SaveChanges ở đây; để UoW gọi
        }

        // NEW
        public Task<int> MarkAllRevokedForUserAsync(int userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            // Cập nhật hàng loạt trực tiếp trên DB, KHÔNG cần SaveChanges
            return _db.authUserSessions
                .Where(s => s.userID == userId && !s.isRevoked)
                .ExecuteUpdateAsync(updates => updates
                    .SetProperty(s => s.isRevoked, true)
                    .SetProperty(s => s.lastSeenAt, now),
                    ct);
        }

        public Task<List<AuthUserSession>> GetActiveSessionsByUserIdAsync(int userId, CancellationToken ct)
            => _db.authUserSessions
                .Where(s => s.userID == userId && !s.isRevoked)
                .ToListAsync(ct);
        public Task<List<AuthUserSession>> GetAllSessionsAsync(CancellationToken ct)
            => _db.authUserSessions
              .ToListAsync(ct);


    }
}
