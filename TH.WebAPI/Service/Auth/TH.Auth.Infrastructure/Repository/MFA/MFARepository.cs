using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.MFA;

namespace TH.Auth.Infrastructure.Repository.MFA
{
    public interface IMFARepository
    {
        Task<AuthMfaSecret?> GetByUserAsync(int userId, CancellationToken ct);
        Task<AuthMfaSecret> GetByIdAsync(int id, CancellationToken ct);
        Task<List<AuthMfaSecret>> GetAllMFAAsync(CancellationToken ct);
        Task UpsertAsync(AuthMfaSecret entity, CancellationToken ct);
        Task<bool> CheckEnabledMFAAsync(int userId, CancellationToken ct); // đã có từ code cũ
    }
    public sealed class MFARepository : IMFARepository
    {
        private readonly AuthDbContext _db;
        public MFARepository(AuthDbContext db) => _db = db;

        public Task<AuthMfaSecret?> GetByUserAsync(int userId, CancellationToken ct)
            => _db.authMfaSecrets.FirstOrDefaultAsync(x => x.userID == userId && x.type == "TOTP", ct);

        public async Task UpsertAsync(AuthMfaSecret entity, CancellationToken ct)
        {
            var tracked = await _db.authMfaSecrets
                .FirstOrDefaultAsync(x => x.userID == entity.userID && x.type == entity.type, ct);

            if (tracked == null)
                await _db.authMfaSecrets.AddAsync(entity, ct);
            else
            {
                _db.Entry(tracked).CurrentValues.SetValues(entity);
                _db.authMfaSecrets.Update(tracked);
            }
        }

        public Task<bool> CheckEnabledMFAAsync(int userId, CancellationToken ct)
            => _db.authMfaSecrets.AnyAsync(x => x.userID == userId && x.type == "TOTP" && x.status == "Enabled", ct);



        public Task<AuthMfaSecret> GetByIdAsync(int id, CancellationToken ct)
            => _db.authMfaSecrets.FirstAsync(x => x.mfaID == id, ct);
        public Task<List<AuthMfaSecret>> GetAllMFAAsync(CancellationToken ct)
            => _db.authMfaSecrets.ToListAsync(ct);


    }
}
