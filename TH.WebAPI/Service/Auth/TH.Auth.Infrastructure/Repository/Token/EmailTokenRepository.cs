using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Token;
using TH.Auth.Dtos.User;
using TH.Auth.Infrastructure.Repository.User;

namespace TH.Auth.Infrastructure.Repository.Token
{
    public interface IEmailTokenRepository
    {
        Task AddTokenAsync(AuthEmailVerification authEmail, CancellationToken ct);
        Task UpdateTokenAsync(AuthEmailVerification authEmail, CancellationToken ct);
        Task<AuthEmailVerification?> verifyEmail(VerifyEmailRequest verifyEmailDto, CancellationToken ct);
    }
    public class TokenRepository : IEmailTokenRepository
    {
        public AuthDbContext _context;
        private readonly IPasswordHasher _hasher;

        public TokenRepository(AuthDbContext context, IPasswordHasher passwordHasher)
        {
            _context = context;
            _hasher = passwordHasher;

        }
        public Task AddTokenAsync(Domain.Token.AuthEmailVerification authEmail, CancellationToken ct)
         => _context.authEmailVerifications.AddAsync(authEmail, ct).AsTask();

        public async Task<AuthEmailVerification?> verifyEmail(Dtos.User.VerifyEmailRequest dto, CancellationToken ct)
        {
            var now = DateTime.UtcNow;

            // Lấy token CHƯA dùng, CÒN HẠN, mới nhất của user
            var candidate = await _context.authEmailVerifications
                .Where(x => x.userID == dto.userID
                         && x.consumedAt == null
                         && x.expiresAt > now)
                .OrderByDescending(x => x.createdAt)
                .FirstOrDefaultAsync(ct);

            if (candidate is null)
                return null;

            // So sánh token plain với salted hash đã lưu
            var ok = _hasher.Verify(dto.token, candidate.codeHash);
            return ok ? candidate : null; // KHÔNG ghi DB ở đây
        }





        public Task UpdateTokenAsync(Domain.Token.AuthEmailVerification authEmail, CancellationToken ct)
        {
            _context.authEmailVerifications.Update(authEmail); // hoặc để EF tracking tự detect
            return Task.CompletedTask;
        }
    }
}
