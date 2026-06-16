using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.MFA;

namespace TH.Auth.Infrastructure.Repository.MFA
{
    public interface IAuditLogRepository
    {
        Task LogAsync(AuthAuditLog authAuditLog, CancellationToken ct);
        Task<List<AuthAuditLog>> GetLogsByUserIdAsync(int userId, CancellationToken ct);
        Task<AuthAuditLog> GetLogsByID(int auditID, CancellationToken ct);
        Task<List<AuthAuditLog>> GetAllLogsAsync(CancellationToken ct);
    }
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly AuthDbContext _db;
        public AuditLogRepository(AuthDbContext db) => _db = db;
        public async Task LogAsync(Domain.MFA.AuthAuditLog authAuditLog, CancellationToken ct)
        {
            await _db.authAuditLogs.AddAsync(authAuditLog, ct);
        }
        public Task<List<AuthAuditLog>> GetLogsByUserIdAsync(int userId, CancellationToken ct)
        => _db.authAuditLogs.Where(log => log.userID == userId).ToListAsync(ct);

        public Task<List<AuthAuditLog>> GetAllLogsAsync(CancellationToken ct)
            => _db.authAuditLogs.ToListAsync(ct);

        public Task<AuthAuditLog> GetLogsByID(int auditID, CancellationToken ct)
            => _db.authAuditLogs.FirstAsync(x => x.auditID == auditID, ct);


    }
}
