using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Service.Email;
using TH.Auth.ApplicationService.Service.MFA;
using TH.Auth.Domain.Token;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.MFA;
using TH.Auth.Infrastructure.Repository.Token;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.User
{
    public interface IPasswordChangeService
    {
        // Email flow
        Task<ResponseDto<bool>> StartChangeByEmailAsync(string email, CancellationToken ct);
        Task<ResponseDto<string>> VerifyEmailCodeAsync(string email, string code, CancellationToken ct); // returns ticket

        // MFA flow
        Task<ResponseDto<string>> VerifyMfaCodeAsync(int userId, string code, CancellationToken ct); // returns ticket

        // Commit
        Task<ResponseDto<bool>> CommitChangeAsync(int userId, string ticket, string oldPwd, string newPwd, CancellationToken ct);



        // Forgot password (THÊM MỚI)
        Task<ResponseDto<bool>> StartForgotByEmailAsync(string email, CancellationToken ct);
        Task<ResponseDto<string>> VerifyForgotEmailCodeAsync(string email, string code, CancellationToken ct);     // ticket
        Task<ResponseDto<string>> VerifyForgotMfaCodeAsync(string email, string code, CancellationToken ct);       // ticket
        Task<ResponseDto<bool>> CommitForgotAsync(string ticket, string newPwd, CancellationToken ct);
    }
    public sealed class PasswordChangeService : IPasswordChangeService
    {
        private readonly ILogger<PasswordChangeService> _logger;
        private readonly IUserRepository _users;
        private readonly IPasswordResetRepository _resets;
        private readonly IPasswordHasher _hasher;
        private readonly IEmailService _email;
        private readonly IUnitOfWork _uow;
        private readonly IMfaService _mfa;
        private readonly IDatabase _redis;

        private readonly ITokenGenerate _tokenGenerate;                // THÊM
        private readonly IAuthUserSessionRepository _sessions;         // THÊM

        private const string PURPOSE_CHANGE = "ChangePassword";
        private const string PURPOSE_FORGOT = "ForgotPassword";

        private static string TicketKeyChange(int userId, string ticket) => $"pwdchg:{userId}:{ticket}";
        private static string TicketKeyForgot(string ticket) => $"pwdreset:{ticket}";

        public PasswordChangeService(
         ILogger<PasswordChangeService> logger,
         IUserRepository users,
         IPasswordResetRepository resets,
         IPasswordHasher hasher,
         IEmailService email,
         IUnitOfWork uow,
         IMfaService mfa,
         IConnectionMultiplexer redis,
         ITokenGenerate tokenGenerate,                      // THÊM
         IAuthUserSessionRepository sessions               // THÊM
     )
        {
            _logger = logger;
            _users = users;
            _resets = resets;
            _hasher = hasher;
            _email = email;
            _uow = uow;
            _mfa = mfa;
            _redis = redis.GetDatabase();
            _tokenGenerate = tokenGenerate;
            _sessions = sessions;
        }

        public async Task<ResponseDto<bool>> StartChangeByEmailAsync(string email, CancellationToken ct)
        {
            try
            {
                var user = await _users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
                if (user == null) return ResponseConst.Success("Nếu email tồn tại, chúng tôi đã gửi mã xác minh.", true);

                var codePlain = GenerateCode6();
                var codeHash = _hasher.Hash(codePlain);

                var entity = new AuthPasswordReset
                {
                    userID = user.userID,
                    codeHash = codeHash,
                    createdAt = DateTime.UtcNow,
                    expiresAt = DateTime.UtcNow.AddMinutes(10),
                    consumedAt = null,
                    // dùng field 'detail' làm purpose cho gọn; nếu có cột 'purpose' thì đổi lại
                    // detail = PURPOSE
                    // Nếu bạn có cột 'detail' dùng mục đích khác, hãy thêm cột 'purpose'
                    // Ở đây ta dùng detail để lưu purpose:
                    // (nếu không muốn, sửa PasswordResetRepository cho đúng cột)
                    // ---
                    // TẠM thời gán vào detail
                    // ---
                    // ReSharper disable once RedundantAssignment
                    purpose = PURPOSE_CHANGE
                };

                await _resets.AddAsync(entity, ct);
                await _uow.SaveChangesAsync(ct);

                // Gửi email code
                var subject = "Mã xác minh đổi mật khẩu";
                var body = $"Mã xác minh đổi mật khẩu của bạn là: <b>{codePlain}</b> (hết hạn sau 10 phút).";
                await _email.SendEmailAsync(email, subject, body);

                return ResponseConst.Success("Đã gửi mã xác minh tới email.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "StartChangeByEmailAsync error");
                return ResponseConst.Error<bool>(500, "Không gửi được mã xác minh");
            }
        }

        public async Task<ResponseDto<string>> VerifyEmailCodeAsync(string email, string code, CancellationToken ct)
        {
            try
            {
                var user = await _users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
                if (user == null) return ResponseConst.Error<string>(400, "Thông tin không hợp lệ");

                var pr = await _resets.FindLatestActiveAsync(user.userID, PURPOSE_CHANGE, ct);
                if (pr == null) return ResponseConst.Error<string>(400, "Mã đã hết hạn hoặc không tồn tại");

                if (!_hasher.Verify(code, pr.codeHash))
                    return ResponseConst.Error<string>(400, "Mã xác minh không đúng");

                // đánh dấu consumed
                pr.consumedAt = DateTime.UtcNow;
                await _resets.UpdateAsync(pr, ct);
                await _uow.SaveChangesAsync(ct);

                // tạo ticket 10 phút
                var ticket = Guid.NewGuid().ToString("N");
                await _redis.StringSetAsync(TicketKeyChange(user.userID, ticket), "1", TimeSpan.FromMinutes(10));

                return ResponseConst.Success("Xác minh email OK", ticket);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "VerifyEmailCodeAsync error");
                return ResponseConst.Error<string>(500, "Không xác minh được mã");
            }
        }

        public async Task<ResponseDto<string>> VerifyMfaCodeAsync(int userId, string code, CancellationToken ct)
        {
            try
            {
                var ok = await _mfa.VerifyTotpAsync(userId, code, ct);
                if (!ok) return ResponseConst.Error<string>(400, "Mã MFA không đúng");

                var ticket = Guid.NewGuid().ToString("N");
                await _redis.StringSetAsync(TicketKeyChange(userId, ticket), "1", TimeSpan.FromMinutes(10));
                return ResponseConst.Success("Xác minh MFA OK", ticket);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "VerifyMfaCodeAsync error");
                return ResponseConst.Error<string>(500, "Không xác minh được MFA");
            }
        }

        public async Task<ResponseDto<bool>> CommitChangeAsync(int userId, string ticket, string oldPwd, string newPwd, CancellationToken ct)
        {
            try
            {
                // check ticket
                var key = TicketKeyChange(userId, ticket);
                var exists = await _redis.StringGetAsync(key);
                if (!exists.HasValue) return ResponseConst.Error<bool>(400, "Ticket không hợp lệ hoặc đã hết hạn");

                var user = await _users.FindByIdAsync(userId, ct);
                if (user == null) return ResponseConst.Error<bool>(404, "Không tìm thấy user");

                if (!_hasher.Verify(oldPwd, user.passwordHash))
                    return ResponseConst.Error<bool>(400, "Mật khẩu cũ không đúng");

                user.passwordHash = _hasher.Hash(newPwd);
                user.updatedAt = DateTime.UtcNow;
                await _users.UpdateAsync(user, ct);
                await _uow.SaveChangesAsync(ct);

                // xoá ticket sau khi dùng
                await _redis.KeyDeleteAsync(key);

                return ResponseConst.Success("Đổi mật khẩu thành công", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CommitChangeAsync error");
                return ResponseConst.Error<bool>(500, "Không đổi được mật khẩu");
            }
        }

        public async Task<ResponseDto<bool>> StartForgotByEmailAsync(string email, CancellationToken ct)
        {
            try
            {
                var user = await _users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
                // Luôn trả 200 để không lộ email tồn tại hay không
                if (user == null) return ResponseConst.Success("Nếu email tồn tại, mã xác minh đã được gửi.", true);

                var code = GenerateCode6();
                var hash = _hasher.Hash(code);

                var pr = new AuthPasswordReset
                {
                    userID = user.userID,
                    codeHash = hash,
                    createdAt = DateTime.UtcNow,
                    expiresAt = DateTime.UtcNow.AddMinutes(10),
                    consumedAt = null,
                    purpose = PURPOSE_FORGOT    // <== dùng purpose
                };
                await _resets.AddAsync(pr, ct);
                await _uow.SaveChangesAsync(ct);

                await _email.SendEmailAsync(email,
                    "Mã xác minh quên mật khẩu",
                    $"Mã xác minh quên mật khẩu của bạn: <b>{code}</b> (hết hạn trong 10 phút).");

                return ResponseConst.Success("Nếu email tồn tại, mã xác minh đã được gửi.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "StartForgotByEmailAsync error");
                return ResponseConst.Error<bool>(500, "Không gửi được mã xác minh");
            }
        }

        public async Task<ResponseDto<string>> VerifyForgotEmailCodeAsync(string email, string code, CancellationToken ct)
        {
            try
            {
                var user = await _users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
                if (user == null) return ResponseConst.Error<string>(400, "Thông tin không hợp lệ");

                var pr = await _resets.FindLatestActiveAsync(user.userID, PURPOSE_FORGOT, ct);
                if (pr == null) return ResponseConst.Error<string>(400, "Mã đã hết hạn hoặc không tồn tại");

                if (!_hasher.Verify(code, pr.codeHash))
                    return ResponseConst.Error<string>(400, "Mã xác minh không đúng");

                pr.consumedAt = DateTime.UtcNow;
                await _resets.UpdateAsync(pr, ct);
                await _uow.SaveChangesAsync(ct);

                var ticket = Guid.NewGuid().ToString("N");
                // key = pwdreset:<ticket>, value=userId
                await _redis.StringSetAsync(TicketKeyForgot(ticket), user.userID.ToString(), TimeSpan.FromMinutes(10));

                return ResponseConst.Success("Xác minh email OK", ticket);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "VerifyForgotEmailCodeAsync error");
                return ResponseConst.Error<string>(500, "Không xác minh được mã");
            }
        }

        // Tuỳ chọn: Forgot bằng MFA (không đăng nhập) — FE gửi email + code MFA
        public async Task<ResponseDto<string>> VerifyForgotMfaCodeAsync(string email, string code, CancellationToken ct)
        {
            try
            {
                var user = await _users.FindByEmailAsync(email.Trim().ToLowerInvariant(), ct);
                if (user == null) return ResponseConst.Error<string>(400, "Thông tin không hợp lệ");

                var ok = await _mfa.VerifyTotpAsync(user.userID, code, ct);
                if (!ok) return ResponseConst.Error<string>(400, "Mã MFA không đúng");

                var ticket = Guid.NewGuid().ToString("N");
                await _redis.StringSetAsync(TicketKeyForgot(ticket), user.userID.ToString(), TimeSpan.FromMinutes(10));
                return ResponseConst.Success("Xác minh MFA OK", ticket);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "VerifyForgotMfaCodeAsync error");
                return ResponseConst.Error<string>(500, "Không xác minh được MFA");
            }
        }

        public async Task<ResponseDto<bool>> CommitForgotAsync(string ticket, string newPwd, CancellationToken ct)
        {
            try
            {
                var key = TicketKeyForgot(ticket);
                var val = await _redis.StringGetAsync(key);
                if (!val.HasValue) return ResponseConst.Error<bool>(400, "Ticket không hợp lệ hoặc đã hết hạn");

                if (!int.TryParse(val.ToString(), out var userId))
                    return ResponseConst.Error<bool>(400, "Ticket không hợp lệ");

                var user = await _users.FindByIdAsync(userId, ct);
                if (user == null) return ResponseConst.Error<bool>(404, "Không tìm thấy user");

                user.passwordHash = _hasher.Hash(newPwd);
                user.updatedAt = DateTime.UtcNow;

                // RẤT QUAN TRỌNG: tăng tokenVersion để làm “hết hạn” tất cả AT hiện có (nếu bạn check trong JWT)
                user.tokenVersion = (user.tokenVersion <= 0 ? 1 : user.tokenVersion) + 1;

                await _users.UpdateAsync(user, ct);
                await _uow.SaveChangesAsync(ct);

                // Xoá ticket
                await _redis.KeyDeleteAsync(key);

                // Bảo mật: revoke toàn bộ refresh tokens + mark all sessions revoked
                var ip = _tokenGenerate.GetClientIp();
                await _tokenGenerate.RevokeAllForUserAsync(user.userID, ip);
                try { await _sessions.MarkAllRevokedForUserAsync(user.userID, ct); } catch { /* optional */ }

                return ResponseConst.Success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CommitForgotAsync error");
                return ResponseConst.Error<bool>(500, "Không đặt lại được mật khẩu");
            }
        }


        private static string GenerateCode6()
        {
            var rng = Random.Shared.Next(0, 999999);
            return rng.ToString("D6");
        }
    }
}
