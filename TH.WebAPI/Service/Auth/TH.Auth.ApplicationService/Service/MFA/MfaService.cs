using Microsoft.Extensions.Logging;
using OtpNet;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.MFA;
using TH.Auth.Dtos.Account;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.MFA;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.MFA
{
    public interface IMfaService
    {
        Task<ResponseDto<StartTotpResponse>> StartTotpEnrollmentAsync(int userId, string? label, CancellationToken ct);
        Task<ResponseDto<bool>> ConfirmTotpEnrollmentAsync(int userId, string code, CancellationToken ct);
        Task<ResponseDto<bool>> DisableTotpAsync(int userId, string? confirmCode, CancellationToken ct);
        Task<bool> VerifyTotpAsync(int userId, string code, CancellationToken ct);
        Task<ResponseDto<MfaStatusResponse>> GetStatusAsync(int userId, CancellationToken ct);

        Task<ResponseDto<AuthMfaSecret>> GetByUserAsync(int userId, CancellationToken ct);
        Task<ResponseDto<AuthMfaSecret>> GetByIdAsync(int id, CancellationToken ct);
        Task<ResponseDto<List<AuthMfaSecret>>> GetAllMFAAsync(CancellationToken ct);
    }
    public sealed class MfaService : IMfaService
    {
        private readonly ILogger<MfaService> _logger;
        private readonly IMFARepository _repo;
        private readonly IUnitOfWork _uow;

        public MfaService(ILogger<MfaService> logger, IMFARepository repo, IUnitOfWork uow)
        {
            _logger = logger;
            _repo = repo;
            _uow = uow;
        }

        public async Task<ResponseDto<StartTotpResponse>> StartTotpEnrollmentAsync(int userId, string? label, CancellationToken ct)
        {
            try
            {
                // tạo secret mới (20 bytes)
                var key = KeyGeneration.GenerateRandomKey(20);
                var base32 = Base32Encoding.ToString(key);

                // issuer/label hiển thị trên app
                var issuer = "TownHub";
                var account = label ?? $"user:{userId}";
                var otpauth = $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(account)}?secret={base32}&issuer={Uri.EscapeDataString(issuer)}&digits=6&period=30&algorithm=SHA1";

                var entity = await _repo.GetByUserAsync(userId, ct) ?? new AuthMfaSecret { userID = userId, type = "TOTP" };
                entity.secret = base32;
                entity.label = account;
                entity.status = "Pending";
                entity.isEnabled = false;
                entity.enrollmentStartedAt = DateTime.UtcNow;
                entity.updatedAt = DateTime.UtcNow;

                await _repo.UpsertAsync(entity, ct);
                await _uow.SaveChangesAsync(ct);

                return ResponseConst.Success("Đã cấp secret/QR để đăng ký MFA.", new StartTotpResponse
                {
                    secretBase32 = base32,
                    otpauthUri = otpauth,
                    label = account
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "StartTotpEnrollmentAsync error");
                return ResponseConst.Error<StartTotpResponse>(500, "Không khởi tạo được MFA");
            }
        }

        public async Task<ResponseDto<bool>> ConfirmTotpEnrollmentAsync(int userId, string code, CancellationToken ct)
        {
            try
            {
                var entity = await _repo.GetByUserAsync(userId, ct);
                if (entity == null || entity.status != "Pending" || string.IsNullOrWhiteSpace(entity.secret))
                    return ResponseConst.Error<bool>(400, "MFA chưa được khởi tạo hoặc secret không hợp lệ.");

                if (!VerifyCode(entity.secret, code))
                    return ResponseConst.Error<bool>(400, "Mã xác thực không đúng.");

                entity.status = "Enabled";
                entity.isEnabled = true;
                entity.enabledAt = DateTime.UtcNow;
                entity.lastVerifiedAt = DateTime.UtcNow;
                entity.updatedAt = DateTime.UtcNow;

                await _repo.UpsertAsync(entity, ct);
                await _uow.SaveChangesAsync(ct);

                return ResponseConst.Success("Đã bật MFA (TOTP).", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ConfirmTotpEnrollmentAsync error");
                return ResponseConst.Error<bool>(500, "Không bật được MFA");
            }
        }

        public async Task<ResponseDto<bool>> DisableTotpAsync(int userId, string? confirmCode, CancellationToken ct)
        {
            try
            {
                var entity = await _repo.GetByUserAsync(userId, ct);
                if (entity == null || entity.status != "Enabled")
                    return ResponseConst.Success("MFA đã tắt hoặc chưa bật.", true);

                // tuỳ chính sách: yêu cầu nhập code để tắt
                if (!string.IsNullOrWhiteSpace(confirmCode))
                {
                    if (string.IsNullOrWhiteSpace(entity.secret) || !VerifyCode(entity.secret, confirmCode))
                        return ResponseConst.Error<bool>(400, "Mã xác thực không đúng.");
                }

                entity.status = "Disabled";
                entity.isEnabled = false;
                entity.updatedAt = DateTime.UtcNow;

                await _repo.UpsertAsync(entity, ct);
                await _uow.SaveChangesAsync(ct);

                return ResponseConst.Success("Đã tắt MFA.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DisableTotpAsync error");
                return ResponseConst.Error<bool>(500, "Không tắt được MFA");
            }
        }

        public async Task<bool> VerifyTotpAsync(int userId, string code, CancellationToken ct)
        {
            var entity = await _repo.GetByUserAsync(userId, ct);
            if (entity == null || entity.status != "Enabled" || string.IsNullOrWhiteSpace(entity.secret))
                return false;

            var ok = VerifyCode(entity.secret, code);
            if (ok)
            {
                entity.lastVerifiedAt = DateTime.UtcNow;
                entity.updatedAt = DateTime.UtcNow;
                await _repo.UpsertAsync(entity, ct);
                await _uow.SaveChangesAsync(ct);
            }
            return ok;
        }

        public async Task<ResponseDto<MfaStatusResponse>> GetStatusAsync(int userId, CancellationToken ct)
        {
            var entity = await _repo.GetByUserAsync(userId, ct);
            var dto = new MfaStatusResponse
            {
                enabled        = entity is { status: "Enabled", isEnabled: true },
                status         = entity?.status ?? "Disabled",
                type           = entity?.type ?? "TOTP",
                label          = entity?.label,
                enabledAt      = entity?.enabledAt,
                lastVerifiedAt = entity?.lastVerifiedAt,
            };
            return ResponseConst.Success("Trạng thái MFA.", dto);
        }

        private static bool VerifyCode(string base32Secret, string code)
        {
            try
            {
                var bytes = Base32Encoding.ToBytes(base32Secret);
                var totp = new Totp(bytes, step: 30, mode: OtpHashMode.Sha1, totpSize: 6);
                // chấp nhận lệch 2 step (~±60s) để dung sai đồng hồ thiết bị bị trôi
                return totp.VerifyTotp(code.Trim(), out _, window: new VerificationWindow(previous: 2, future: 2));
            }
            catch { return false; }
        }


        public Task<ResponseDto<AuthMfaSecret>> GetByUserAsync(int userId, CancellationToken ct)
        {
            return _repo.GetByUserAsync(userId, ct)
                .ContinueWith(t =>
                {
                    var entity = t.Result;
                    if (entity == null)
                        return ResponseConst.Error<AuthMfaSecret>(404, "MFA not found for user.");
                    return ResponseConst.Success("MFA retrieved successfully.", entity);
                }, ct);
        }
        public Task<ResponseDto<AuthMfaSecret>> GetByIdAsync(int id, CancellationToken ct)
        {
            return _repo.GetByIdAsync(id, ct)
                .ContinueWith(t =>
                {
                    var entity = t.Result;
                    if (entity == null)
                        return ResponseConst.Error<AuthMfaSecret>(404, "MFA not found by ID.");
                    return ResponseConst.Success("MFA retrieved successfully.", entity);
                }, ct);
        }
        public Task<ResponseDto<List<AuthMfaSecret>>> GetAllMFAAsync(CancellationToken ct)
        {
            return _repo.GetAllMFAAsync(ct)
                .ContinueWith(t =>
                {
                    var list = t.Result;
                    return ResponseConst.Success("MFA list retrieved successfully.", list);
                }, ct);
        }
    }
}
