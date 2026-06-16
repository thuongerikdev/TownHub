using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Service.MFA;
using TH.Auth.Domain.MFA;
using TH.Auth.Domain.User;
using TH.Auth.Dtos.User;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.MFA;
using TH.Auth.Infrastructure.Repository.Role;
using TH.Auth.Infrastructure.Repository.Token;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.User
{
    public interface IAuthLoginService
    {
        Task<ResponseDto<LoginResponse>> LoginAsync(LoginRequest req, CancellationToken ct);
        Task<ResponseDto<LoginResponse>> LoginWithGoogleAsync(AuthLoginGoogleRequest req, CancellationToken ct);
        Task<ResponseDto<LoginResponse>> VerifyMfaAndLoginAsync(MfaLoginVerifyRequest req, CancellationToken ct);

        Task<ResponseDto<bool>> LogoutByRefreshTokenAsync(string refreshToken, CancellationToken ct);
        Task<ResponseDto<bool>> LogoutSessionAsync(int userId, int sessionId, CancellationToken ct);
        Task<ResponseDto<int>> LogoutAllDevicesAsync(int userId, CancellationToken ct);
        Task<ResponseDto<LoginResponse>> LoginStaffAsync(LoginRequest req, CancellationToken ct);

    }
    public sealed class AuthLoginService : IAuthLoginService
    {
        private readonly ILogger<AuthLoginService> _logger;
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _hasher;
        private readonly ITokenGenerate _tokenGenerate;
        private readonly IUnitOfWork _uow;
        private readonly IAuditLogRepository _audit;
        private readonly IMFARepository _mfa;
        private readonly IMfaService _mfaService;
        private readonly IAuthUserSessionRepository _sessions;
        private readonly IDeviceIdProvider _deviceId;
        private readonly IRoleRepository _roleRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        IProfileRepository _profiles;

        private readonly IDatabase _redis;  // THÊM
        private static string MfaLoginKey(string ticket) => $"mfa:login:{ticket}";

        public AuthLoginService(
            ILogger<AuthLoginService> logger,
            IUserRepository userRepository,
            ITokenGenerate tokenGenerate,
            IPasswordHasher hasher,
            IUnitOfWork unitOfWork,
            IAuditLogRepository auditLogRepository,
            IMFARepository mfaRepository,
            IAuthUserSessionRepository sessionRepository,
            IProfileRepository profiles,
            IRoleRepository roleRepository,
            IMfaService mfaService,
            IUserRoleRepository userRoleRepository,
            IHttpContextAccessor httpContextAccessor,


             IConnectionMultiplexer redis,
            IDeviceIdProvider deviceIdProvider)
        {
            _logger = logger;
            _userRepository = userRepository;
            _tokenGenerate = tokenGenerate;
            _uow = unitOfWork;
            _hasher = hasher;
            _audit = auditLogRepository;
            _mfa = mfaRepository;
            _sessions = sessionRepository;
            _deviceId = deviceIdProvider;
            _profiles = profiles;
            _roleRepository = roleRepository;
            _userRoleRepository = userRoleRepository;
            _mfaService = mfaService;
            _audit = auditLogRepository;
            _httpContextAccessor = httpContextAccessor;
            _redis = redis.GetDatabase(); // THÊM
        }

        public async Task<ResponseDto<LoginResponse>> LoginAsync(LoginRequest req, CancellationToken ct)
        {
            using var scope = _logger.BeginScope(new Dictionary<string, object?> { ["action"] = "Login", ["userName"] = req?.userName });

            try
            {
                if (req == null || string.IsNullOrWhiteSpace(req.userName) || string.IsNullOrWhiteSpace(req.password))
                    return ResponseConst.Error<LoginResponse>(400, "Thiếu thông tin đăng nhập");

                var identifier = req.userName.Trim();
                var userAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString();
                if (string.IsNullOrEmpty(userAgent))
                {
                    userAgent = "Unknown";
                }

                return await _uow.ExecuteInTransactionAsync<ResponseDto<LoginResponse>>(async innerCt =>
                {
                    var ip = _tokenGenerate.GetClientIp();
                    var ua = _tokenGenerate.GetUserAgent();

                    var user = await _userRepository.FindByEmailAsync(identifier, innerCt)
                               ?? await _userRepository.FindByUserNameAsync(identifier, innerCt);

                    if (user is null) return ResponseConst.Error<LoginResponse>(401, "Sai tài khoản hoặc mật khẩu");
                    if (!string.Equals(user.status, "Active", StringComparison.OrdinalIgnoreCase)) return ResponseConst.Error<LoginResponse>(403, "Tài khoản bị khóa");
                    if (!_hasher.Verify(req.password, user.passwordHash)) return ResponseConst.Error<LoginResponse>(401, "Sai tài khoản hoặc mật khẩu");
                    if (!user.isEmailVerified) return ResponseConst.Error<LoginResponse>(409, "Email chưa xác thực");

                    // 1. Check MFA
                    var mfaEnabled = await _mfa.CheckEnabledMFAAsync(user.userID, innerCt);
                    if (mfaEnabled)
                    {
                        var ticket = Guid.NewGuid().ToString("N");
                        await _redis.StringSetAsync(MfaLoginKey(ticket), user.userID.ToString(), TimeSpan.FromMinutes(5));
                        return ResponseConst.Success("MFA required", new LoginResponse { requiresMfa = true, mfaTicket = ticket });
                    }

                    // 2. Login thành công -> Lấy Permissions
                    var permissions = await _userRepository.GetPermissionsByUserIdAsync(user.userID, innerCt);

                    // 3. Tạo Session
                    var deviceId = _deviceId.GetOrCreate();
                    var session = new AuthUserSession
                    {
                        userID = user.userID,
                        deviceId = deviceId,
                        ip = ip ?? "",
                        userAgent = ua ?? "",
                        createdAt = DateTime.UtcNow,
                        lastSeenAt = DateTime.UtcNow,
                        isRevoked = false
                    };
                    await _sessions.AddSessionAsync(session, innerCt);
                    await _uow.SaveChangesAsync(innerCt);

                    // 4. Phát Token (Truyền permission vào để nhúng vô Token)
                    var pair = await _tokenGenerate.IssuePairAsync(
                        user: user,
                        sessionId: session.sessionID,
                        createdByIp: ip,
                        accessTtl: TimeSpan.FromMinutes(30),
                        refreshTtl: TimeSpan.FromDays(7),
                        permissions: permissions // <--- QUAN TRỌNG
                    );

                    await _audit.LogAsync(new AuthAuditLog { userID = user.userID, action = "Login", result = "OK", detail = $"sessionID={session.sessionID}", ip = ip ?? "", createdAt = DateTime.UtcNow, userAgent = userAgent }, innerCt);

                    var res = new LoginResponse
                    {
                        userID = user.userID,
                        userName = user.userName,
                        email = user.email,
                        token = pair.accessToken,
                        tokenExpiration = DateTime.UtcNow.AddMinutes(30),
                        refreshToken = pair.refreshToken.Token,
                        refreshTokenExpiration = pair.refreshToken.Expires,
                        sessionId = session.sessionID,
                        deviceId = deviceId,
                        permissions = permissions // Trả về để Mobile/Web dùng ngay
                    };

                    return ResponseConst.Success("Đăng nhập thành công", res);

                }, System.Data.IsolationLevel.ReadCommitted, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LoginAsync error");
                return ResponseConst.Error<LoginResponse>(500, "Lỗi hệ thống");
            }
        }

        public async Task<ResponseDto<LoginResponse>> VerifyMfaAndLoginAsync(MfaLoginVerifyRequest req, CancellationToken ct)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req?.mfaTicket) || string.IsNullOrWhiteSpace(req.code))
                    return ResponseConst.Error<LoginResponse>(400, "Thiếu ticket hoặc mã MFA");

                var key = MfaLoginKey(req.mfaTicket);
                var val = await _redis.StringGetAsync(key);
                if (!val.HasValue)
                    return ResponseConst.Error<LoginResponse>(400, "Ticket không hợp lệ hoặc đã hết hạn");

                if (!int.TryParse(val.ToString(), out var userId))
                    return ResponseConst.Error<LoginResponse>(400, "Ticket không hợp lệ");

                return await _uow.ExecuteInTransactionAsync<ResponseDto<LoginResponse>>(async innerCt =>
                {
                    var user = await _userRepository.FindByIdAsync(userId, innerCt);
                    if (user is null) return ResponseConst.Error<LoginResponse>(404, "Không tìm thấy user");

                    // Re-check trạng thái
                    if (!string.Equals(user.status, "Active", StringComparison.OrdinalIgnoreCase))
                        return ResponseConst.Error<LoginResponse>(403, "Tài khoản đang bị khóa hoặc không hoạt động");
                    if (!user.isEmailVerified)
                        return ResponseConst.Error<LoginResponse>(409, "Email chưa được xác thực");

                    // Verify TOTP
                    var ok = await _mfaService.VerifyTotpAsync(user.userID, req.code, innerCt);
                    if (!ok)
                    {
                        await _audit.LogAsync(new AuthAuditLog { userID = user.userID, action = "LoginMFA", result = "BadCode", detail = "Wrong TOTP", ip = _tokenGenerate.GetClientIp() ?? "", userAgent = _tokenGenerate.GetUserAgent() ?? "", createdAt = DateTime.UtcNow }, innerCt);
                        return ResponseConst.Error<LoginResponse>(401, "Mã MFA không đúng");
                    }
                    var permissions = await _userRepository.GetPermissionsByUserIdAsync(user.userID, innerCt);

                    // Tạo session + phát token (như login thường)
                    var ip = _tokenGenerate.GetClientIp();
                    var ua = _tokenGenerate.GetUserAgent();
                    var deviceId = _deviceId.GetOrCreate();

                    var session = new AuthUserSession
                    {
                        userID = user.userID,
                        deviceId = deviceId,
                        ip = ip ?? "",
                        userAgent = ua ?? "",
                        createdAt = DateTime.UtcNow,
                        lastSeenAt = DateTime.UtcNow,
                        isRevoked = false
                    };
                    await _sessions.AddSessionAsync(session, innerCt);
                    await _uow.SaveChangesAsync(innerCt);

                    var pair = await _tokenGenerate.IssuePairAsync(
                        user: user,
                        sessionId: session.sessionID,
                        createdByIp: ip,
                        accessTtl: TimeSpan.FromMinutes(30),
                        refreshTtl: TimeSpan.FromDays(7),
                        permissions: permissions
                    );

                    await _audit.LogAsync(new AuthAuditLog { userID = user.userID, action = "LoginMFA", result = "OK", detail = $"sessionID={session.sessionID}", ip = ip ?? "", userAgent = ua ?? "", createdAt = DateTime.UtcNow }, innerCt);

                    // Xoá ticket sau khi dùng
                    await _redis.KeyDeleteAsync(key);

                    var res = new LoginResponse
                    {
                        userID = user.userID,
                        userName = user.userName,
                        email = user.email,
                        isEmailVerified = user.isEmailVerified,
                        token = pair.accessToken,
                        tokenExpiration = DateTime.UtcNow.AddMinutes(30),
                        refreshToken = pair.refreshToken.Token,
                        refreshTokenExpiration = pair.refreshToken.Expires,
                        sessionId = session.sessionID,
                        deviceId = deviceId,
                        permissions = permissions
                    };

                    return ResponseConst.Success("Đăng nhập MFA thành công", res);

                }, System.Data.IsolationLevel.ReadCommitted, ct);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("VerifyMfaAndLoginAsync cancelled");
                return ResponseConst.Error<LoginResponse>(499, "Yêu cầu đã bị hủy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in VerifyMfaAndLoginAsync");
                return ResponseConst.Error<LoginResponse>(500, "Có lỗi xảy ra. Vui lòng thử lại sau");
            }
        }

        public async Task<ResponseDto<LoginResponse>> LoginWithGoogleAsync(AuthLoginGoogleRequest req, CancellationToken ct)
        {
            using var scope = _logger.BeginScope(new Dictionary<string, object?>
            {
                ["action"] = "LoginGoogle",
                ["googleSub"] = req?.GoogleSub,
                ["email"] = req?.email
            });

            try
            {
                if (req == null || string.IsNullOrWhiteSpace(req.GoogleSub))
                    return ResponseConst.Error<LoginResponse>(400, "Thiếu GoogleSub");
                if (string.IsNullOrWhiteSpace(req.email))
                    return ResponseConst.Error<LoginResponse>(400, "Thiếu email từ Google");

                var email = req.email.Trim().ToLowerInvariant();
                var ip = _tokenGenerate.GetClientIp();
                var ua = _tokenGenerate.GetUserAgent();

                return await _uow.ExecuteInTransactionAsync<ResponseDto<LoginResponse>>(async innerCt =>
                {
                    // 1) Tìm theo sub hoặc link theo email
                    var user = await _userRepository.FindByGoogleSub(req.GoogleSub, innerCt);
                    var auditDetail = "";

                    if (user == null)
                    {
                        var byEmail = await _userRepository.FindByEmailAsync(email, innerCt);
                        if (byEmail != null)
                        {
                            if (!string.IsNullOrWhiteSpace(byEmail.googleSub) &&
                                !string.Equals(byEmail.googleSub, req.GoogleSub, StringComparison.Ordinal))
                            {
                                await _audit.LogAsync(new AuthAuditLog
                                {
                                    userID = byEmail.userID,
                                    action = "LoginGoogle",
                                    result = "Conflict",
                                    detail = "Email đã liên kết với tài khoản khác (googleSub mismatch).",
                                    ip = ip ?? "",
                                    userAgent = ua ?? "",
                                    createdAt = DateTime.UtcNow
                                }, innerCt);
                                return ResponseConst.Error<LoginResponse>(409, "Email đã liên kết với tài khoản khác");
                            }

                            byEmail.googleSub = req.GoogleSub;
                            byEmail.isEmailVerified = true;
                            byEmail.updatedAt = DateTime.UtcNow;

                            // Không dựa vào navigation; lấy profile trực tiếp để tránh duplicate
                            var existingProfile = await _profiles.GetByUserIdAsync(byEmail.userID, innerCt);
                            if (existingProfile is null)
                            {
                                await _profiles.AddAsync(new AuthProfile
                                {
                                    userID = byEmail.userID,
                                    firstName = ExtractFirstName(req.fullName),
                                    lastName = ExtractLastName(req.fullName),
                                    avatar = req.avatar,
                                    gender = string.IsNullOrWhiteSpace(req.gender) ? "" : req.gender, // tránh NULL
                                    dateOfBirth = req.dateOfBirth
                                }, innerCt);
                            }
                            else
                            {
                                existingProfile.avatar ??= req.avatar;
                                existingProfile.dateOfBirth ??= req.dateOfBirth;
                                if (string.IsNullOrWhiteSpace(existingProfile.gender))
                                    existingProfile.gender = string.IsNullOrWhiteSpace(req.gender) ? existingProfile.gender ?? "" : req.gender;
                                await _profiles.UpdateAsync(existingProfile, innerCt);
                            }

                            await _userRepository.UpdateAsync(byEmail, innerCt);
                            user = byEmail;
                            auditDetail = "Linked googleSub to existing email";
                        }
                        else
                        {
                            // Tạo user mới
                            var userName = await GenerateUniqueUserNameFromEmailAsync(email, innerCt);
                            user = new AuthUser
                            {
                                userName = userName,
                                email = email,
                                googleSub = req.GoogleSub,
                                passwordHash = _hasher.Hash(Guid.NewGuid().ToString("N")), // SSO
                                isEmailVerified = true,
                                status = "Active",
                                tokenVersion = 1,
                                scope = "user",
                                createdAt = DateTime.UtcNow,
                                updatedAt = DateTime.UtcNow
                            };
                            await _userRepository.AddAsync(user, innerCt);
                            await _uow.SaveChangesAsync(innerCt); // có userID

                            await _profiles.AddAsync(new AuthProfile
                            {
                                userID = user.userID,
                                firstName = ExtractFirstName(req.fullName),
                                lastName = ExtractLastName(req.fullName),
                                avatar = req.avatar,
                                gender = string.IsNullOrWhiteSpace(req.gender) ? "" : req.gender,
                                dateOfBirth = req.dateOfBirth
                            }, innerCt);

                            var defaultRole = await _roleRepository.GetDefaultRoleAsync(innerCt);
                            if (defaultRole != null)
                            {
                                await _userRoleRepository.AddUserRoleAsync(new Auth.Domain.Role.AuthUserRole
                                {
                                    userID = user.userID,
                                    role = defaultRole,
                                    assignedAt = DateTime.UtcNow
                                }, innerCt);
                            }

                            auditDetail = "Created new user by Google";
                        }
                    }

                    // 2) Nếu user đã bật MFA ⇒ KHÔNG phát token, trả ticket
                    var mfaEnabled = await _mfa.CheckEnabledMFAAsync(user.userID, innerCt);
                    if (mfaEnabled)
                    {
                        var ticket = Guid.NewGuid().ToString("N");
                        await _redis.StringSetAsync(MfaLoginKey(ticket), user.userID.ToString(), TimeSpan.FromMinutes(5));

                        await _audit.LogAsync(new AuthAuditLog
                        {
                            userID = user.userID,
                            action = "LoginGoogle",
                            result = "MFA_Ticket_Issued",
                            detail = $"{auditDetail}",
                            ip = ip ?? "",
                            userAgent = ua ?? "",
                            createdAt = DateTime.UtcNow
                        }, innerCt);

                        var payload = new LoginResponse
                        {
                            userID = user.userID,
                            userName = user.userName,
                            email = user.email,
                            isEmailVerified = user.isEmailVerified,
                            requiresMfa = true,
                            mfaTicket = ticket
                        };
                        return ResponseConst.Success("MFA required", payload);
                    }
                    var permissions = await _userRepository.GetPermissionsByUserIdAsync(user.userID, innerCt);

                    // 3) Chưa bật MFA ⇒ tạo session + phát token như thường
                    var deviceId = _deviceId.GetOrCreate();
                    var session = new AuthUserSession
                    {
                        userID = user.userID,
                        deviceId = deviceId,
                        ip = ip ?? "",
                        userAgent = ua ?? "",
                        createdAt = DateTime.UtcNow,
                        lastSeenAt = DateTime.UtcNow,
                        isRevoked = false
                    };
                    await _sessions.AddSessionAsync(session, innerCt);
                    await _uow.SaveChangesAsync(innerCt);

                    var pair = await _tokenGenerate.IssuePairAsync(
                        user: user,
                        sessionId: session.sessionID,
                        createdByIp: ip,
                        accessTtl: TimeSpan.FromMinutes(30),
                        refreshTtl: TimeSpan.FromDays(7),
                        permissions: permissions
                    );

                    await _audit.LogAsync(new AuthAuditLog
                    {
                        userID = user.userID,
                        action = "LoginGoogle",
                        result = "OK",
                        detail = $"{auditDetail}; sessionID={session.sessionID}",
                        ip = ip ?? "",
                        userAgent = ua ?? "",
                        createdAt = DateTime.UtcNow
                    }, innerCt);

                    var res = new LoginResponse
                    {
                        userID = user.userID,
                        userName = user.userName,
                        email = user.email,
                        isEmailVerified = user.isEmailVerified,
                        token = pair.accessToken,
                        tokenExpiration = DateTime.UtcNow.AddMinutes(30),
                        refreshToken = pair.refreshToken.Token,
                        refreshTokenExpiration = pair.refreshToken.Expires,
                        sessionId = session.sessionID,
                        deviceId = deviceId,
                        permissions = permissions
                    };
                    return ResponseConst.Success("Đăng nhập Google thành công", res);

                }, System.Data.IsolationLevel.ReadCommitted, ct);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("LoginWithGoogleAsync cancelled");
                return ResponseConst.Error<LoginResponse>(499, "Yêu cầu đã bị hủy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in LoginWithGoogleAsync for {GoogleSub}", req?.GoogleSub);
                return ResponseConst.Error<LoginResponse>(500, "Có lỗi xảy ra. Vui lòng thử lại sau");
            }
        }
        public async Task<ResponseDto<LoginResponse>> LoginStaffAsync(LoginRequest req, CancellationToken ct)
        {
            using var scope = _logger.BeginScope(new Dictionary<string, object?> { ["action"] = "LoginStaff", ["userName"] = req?.userName });

            try
            {
                if (req == null || string.IsNullOrWhiteSpace(req.userName) || string.IsNullOrWhiteSpace(req.password))
                    return ResponseConst.Error<LoginResponse>(400, "Thiếu thông tin đăng nhập");

                var identifier = req.userName.Trim();
                var userAgent = _httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString() ?? "Unknown";

                return await _uow.ExecuteInTransactionAsync<ResponseDto<LoginResponse>>(async innerCt =>
                {
                    var ip = _tokenGenerate.GetClientIp();
                    var ua = _tokenGenerate.GetUserAgent();

                    // 1. Tìm User
                    var user = await _userRepository.FindByEmailAsync(identifier, innerCt)
                            ?? await _userRepository.FindByUserNameAsync(identifier, innerCt);

                    if (user is null) return ResponseConst.Error<LoginResponse>(401, "Sai tài khoản hoặc mật khẩu");

                    // 2. Check Password & Status
                    if (!string.Equals(user.status, "Active", StringComparison.OrdinalIgnoreCase)) return ResponseConst.Error<LoginResponse>(403, "Tài khoản bị khóa");
                    if (!_hasher.Verify(req.password, user.passwordHash)) return ResponseConst.Error<LoginResponse>(401, "Sai tài khoản hoặc mật khẩu");

                    // 3. CHECK SCOPE: Chỉ cho phép Staff đăng nhập
                    if (!string.Equals(user.scope, "staff", StringComparison.OrdinalIgnoreCase))
                    {
                        await _audit.LogAsync(new AuthAuditLog { userID = user.userID, action = "LoginStaff", result = "Forbidden", detail = "Scope mismatch (not staff)", ip = ip ?? "", userAgent = ua ?? "", createdAt = DateTime.UtcNow }, innerCt);
                        return ResponseConst.Error<LoginResponse>(403, "Bạn không có quyền truy cập vào trang quản trị.");
                    }

                    // 4. Lấy Permissions & ROLES
                    var permissions = await _userRepository.GetPermissionsByUserIdAsync(user.userID, innerCt);

                    // Lấy danh sách Role Name
                    var roles = await _userRepository.GetRolesByUserIdAsync(user.userID, innerCt);
                    // (Lưu ý: Bạn cần đảm bảo IUserRepository có hàm này, nếu chưa có xem phần bổ sung bên dưới)

                    // 5. Check MFA (Nếu cần áp dụng cho Staff)
                    var mfaEnabled = await _mfa.CheckEnabledMFAAsync(user.userID, innerCt);
                    if (mfaEnabled)
                    {
                        var ticket = Guid.NewGuid().ToString("N");
                        await _redis.StringSetAsync(MfaLoginKey(ticket), user.userID.ToString(), TimeSpan.FromMinutes(5));
                        return ResponseConst.Success("MFA required", new LoginResponse { requiresMfa = true, mfaTicket = ticket });
                    }

                    // 6. Tạo Session
                    var deviceId = _deviceId.GetOrCreate();
                    var session = new AuthUserSession
                    {
                        userID = user.userID,
                        deviceId = deviceId,
                        ip = ip ?? "",
                        userAgent = ua ?? "",
                        createdAt = DateTime.UtcNow,
                        lastSeenAt = DateTime.UtcNow,
                        isRevoked = false
                    };
                    await _sessions.AddSessionAsync(session, innerCt);
                    await _uow.SaveChangesAsync(innerCt);

                    // 7. Phát Token
                    var pair = await _tokenGenerate.IssuePairAsync(
                        user: user,
                        sessionId: session.sessionID,
                        createdByIp: ip,
                        accessTtl: TimeSpan.FromMinutes(60), // Staff cho token sống lâu hơn chút nếu muốn
                        refreshTtl: TimeSpan.FromDays(7),
                        permissions: permissions
                    );

                    var roleNamesString = string.Join(",", roles.Select(r => r.roleName));
                    await _audit.LogAsync(new AuthAuditLog
                    {
                        userID = user.userID,
                        action = "LoginStaff",
                        result = "OK",
                        detail = $"Roles: {roleNamesString}", // Log role name thôi cho gọn
                        ip = ip ?? "",
                        userAgent = userAgent,
                        createdAt = DateTime.UtcNow
                    }, innerCt);

                    // 8. Trả về Response kèm RoleNames
                    var res = new LoginResponse
                    {
                        userID = user.userID,
                        userName = user.userName,
                        email = user.email,
                        token = pair.accessToken,
                        tokenExpiration = DateTime.UtcNow.AddMinutes(60),
                        refreshToken = pair.refreshToken.Token,
                        refreshTokenExpiration = pair.refreshToken.Expires,
                        sessionId = session.sessionID,
                        deviceId = deviceId,
                        permissions = permissions,

                        // --- GÁN LIST DTO VÀO ĐÂY ---
                        roles = roles
                    };

                    return ResponseConst.Success("Đăng nhập quản trị thành công", res);

                }, System.Data.IsolationLevel.ReadCommitted, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LoginStaffAsync error");
                return ResponseConst.Error<LoginResponse>(500, "Lỗi hệ thống");
            }
        }


        // ===== Helpers =====
        private async Task<string> GenerateUniqueUserNameFromEmailAsync(string email, CancellationToken ct)
        {
            var local = email.Split('@')[0];
            // sanitize: chỉ chữ/số/_/-
            local = Regex.Replace(local, "[^a-zA-Z0-9_-]", "");
            if (string.IsNullOrWhiteSpace(local)) local = "user";

            var baseName = local.ToLowerInvariant();
            var candidate = baseName;
            var i = 0;

            while (await _userRepository.ExistsByUserNameAsync(candidate, ct))
            {
                i++;
                candidate = $"{baseName}{i}";
                if (i > 1000)
                {
                    candidate = $"{baseName}_{Guid.NewGuid().ToString("N")[..6]}";
                    break;
                }
            }
            return candidate;
        }

        private static string? ExtractFirstName(string? fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return null;
            var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return parts.Length == 0 ? null : parts[0];
        }

        private static string? ExtractLastName(string? fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return null;
            var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length <= 1) return null;
            return string.Join(' ', parts.Skip(1));
        }




        public async Task<ResponseDto<bool>> LogoutByRefreshTokenAsync(string refreshToken, CancellationToken ct)
        {
            try
            {
                // Lấy ip/ua để ghi audit
                var ip = _tokenGenerate.GetClientIp();
                var ua = _tokenGenerate.GetUserAgent();

                // Tìm refresh token đang active + user
                var pair = await _tokenGenerate.GetActiveAsync(refreshToken);
                if (pair is null)
                {
                    // Idempotent: coi như logout thành công, tránh lộ thông tin token
                    return ResponseConst.Success("Đã đăng xuất (idempotent).", true);
                }

                var (rt, user) = pair.Value;

                // Thu hồi TOÀN BỘ refresh tokens của session này (an toàn hơn revoke 1 cây token)
                var revokedCount = await _tokenGenerate.RevokeBySessionAsync(user.userID, rt.sessionID, ip);

                // Đánh dấu session đã revoke (nếu repo có)
                try { await _sessions.MarkRevokedAsync(rt.sessionID, ct); } catch { /* optional */ }

                // Audit
                await _audit.LogAsync(new AuthAuditLog
                {
                    userID = user.userID,
                    action = "Logout",
                    result = "OK",
                    detail = $"via RefreshToken, sessionID={rt.sessionID}, revokedCount={revokedCount}",
                    ip = ip ?? string.Empty,
                    userAgent = ua ?? string.Empty,
                    createdAt = DateTime.UtcNow
                }, ct);

                // Không cần _uow.SaveChangesAsync() vì các repo gọi SaveChanges bên trong hoặc bạn để UoW wrap ngoài controller.

                return ResponseConst.Success("Đăng xuất thành công.", true);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("LogoutByRefreshTokenAsync cancelled");
                return ResponseConst.Error<bool>(499, "Yêu cầu đã bị hủy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in LogoutByRefreshTokenAsync");
                return ResponseConst.Error<bool>(500, "Có lỗi xảy ra. Vui lòng thử lại sau");
            }
        }

        /// <summary>
        /// Logout theo sessionId (VD: từ trang “quản lý thiết bị”, chọn 1 thiết bị để đăng xuất).
        /// </summary>
        public async Task<ResponseDto<bool>> LogoutSessionAsync(int userId, int sessionId, CancellationToken ct)
        {
            try
            {
                var ip = _tokenGenerate.GetClientIp();
                var ua = _tokenGenerate.GetUserAgent();

                // Thu hồi toàn bộ RT active của session này
                var revoked = await _tokenGenerate.RevokeBySessionAsync(userId, sessionId, ip);

                // Đánh dấu session revoked
                try { await _sessions.MarkRevokedAsync(sessionId, ct); } catch { /* optional */ }

                await _audit.LogAsync(new AuthAuditLog
                {
                    userID = userId,
                    action = "Logout",
                    result = "OK",
                    detail = $"via SessionId, sessionID={sessionId}, revokedCount={revoked}",
                    ip = ip ?? string.Empty,
                    userAgent = ua ?? string.Empty,
                    createdAt = DateTime.UtcNow
                }, ct);

                return ResponseConst.Success("Đăng xuất thiết bị thành công.", true);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("LogoutSessionAsync cancelled");
                return ResponseConst.Error<bool>(499, "Yêu cầu đã bị hủy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in LogoutSessionAsync");
                return ResponseConst.Error<bool>(500, "Có lỗi xảy ra. Vui lòng thử lại sau");
            }
        }

        /// <summary>
        /// Logout ALL devices: thu hồi mọi refresh token của user và đánh dấu mọi session là revoked.
        /// </summary>
        public async Task<ResponseDto<int>> LogoutAllDevicesAsync(int userId, CancellationToken ct)
        {
            try
            {
                var ip = _tokenGenerate.GetClientIp();
                var ua = _tokenGenerate.GetUserAgent();

                var revokedCount = await _tokenGenerate.RevokeAllForUserAsync(userId, ip);

                // Đánh dấu tất cả session của user là revoked (nếu repo có)
                try { await _sessions.MarkAllRevokedForUserAsync(userId, ct); } catch { /* optional */ }

                await _audit.LogAsync(new AuthAuditLog
                {
                    userID = userId,
                    action = "LogoutAll",
                    result = "OK",
                    detail = $"revokedCount={revokedCount}",
                    ip = ip ?? string.Empty,
                    userAgent = ua ?? string.Empty,
                    createdAt = DateTime.UtcNow
                }, ct);

                return ResponseConst.Success("Đã đăng xuất khỏi tất cả thiết bị.", revokedCount);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("LogoutAllDevicesAsync cancelled");
                return ResponseConst.Error<int>(499, "Yêu cầu đã bị hủy");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in LogoutAllDevicesAsync");
                return ResponseConst.Error<int>(500, "Có lỗi xảy ra. Vui lòng thử lại sau");
            }
        }
    }
}
