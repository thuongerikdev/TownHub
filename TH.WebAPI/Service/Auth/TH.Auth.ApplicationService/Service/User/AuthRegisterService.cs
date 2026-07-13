using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Common;
using TH.Auth.Domain.Role;
using TH.Auth.Domain.User;
using TH.Auth.Dtos.User;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.Role;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.User
{
    public interface IAuthRegisterService
    {
        Task<ResponseDto<RegisterResponse>> RegisterAsync(RegisterRequest req, CancellationToken ct);
        Task<ResponseDto<RegisterResponse>> CreateSimpleUserAsync(SimpleCreateUserRequest req, CancellationToken ct);

        // BQL/Admin tạo tài khoản Resident hoặc Provider — KHÔNG được gán role BQL/Admin
        Task<ResponseDto<RegisterResponse>> CreateResidentUserAsync(SimpleCreateUserRequest req, CancellationToken ct);
    }

    public sealed class AuthRegisterService : AuthServiceBase, IAuthRegisterService
    {
        private readonly IUserRepository _users;
        private readonly IProfileRepository _profiles;
        private readonly IPasswordHasher _hasher;
        private readonly IRoleRepository _roleRepository;
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IUnitOfWork _uow;

        public AuthRegisterService(
            IUserRepository users,
            IProfileRepository profiles,
            IPasswordHasher hasher,
            IRoleRepository roleRepository,
            IUserRoleRepository userRoleRepository,
            ILogger<AuthRegisterService> logger,
            IUnitOfWork uow) : base(logger)
        {
            _users = users;
            _profiles = profiles;
            _hasher = hasher;
            _uow = uow;
            _roleRepository = roleRepository;
            _userRoleRepository = userRoleRepository;
        }

        // ── Tạo tài khoản cơ bản (dùng nội bộ hoặc cho luồng cũ) ──────────────
        public Task<ResponseDto<RegisterResponse>> RegisterAsync(RegisterRequest req, CancellationToken ct)
            => _uow.ExecuteInTransactionAsync(async _ =>
            {
                if (string.IsNullOrWhiteSpace(req.userName) ||
                    string.IsNullOrWhiteSpace(req.email) ||
                    string.IsNullOrWhiteSpace(req.password))
                    return ResponseConst.Error<RegisterResponse>(400, "Thiếu thông tin");

                var userName = req.userName.Trim();
                var email    = req.email.Trim().ToLowerInvariant();

                if (await _users.ExistsByUserNameAsync(userName, ct))
                    return ResponseConst.Error<RegisterResponse>(409, "UserName đã tồn tại");
                if (await _users.ExistsByEmailAsync(email, ct))
                    return ResponseConst.Error<RegisterResponse>(409, "Email đã tồn tại");

                var user = new AuthUser
                {
                    userName        = userName,
                    email           = email,
                    passwordHash    = _hasher.Hash(req.password),
                    isEmailVerified = true,     // không cần xác thực email
                    status          = "Active",
                    tokenVersion    = 1,
                    createdAt       = DateTime.UtcNow,
                    updatedAt       = DateTime.UtcNow,
                    scope           = "user"
                };

                await _users.AddAsync(user, ct);
                await _uow.SaveChangesAsync(ct);

                var defaultRole = await _roleRepository.GetDefaultRoleAsync(ct);
                if (defaultRole == null)
                    return ResponseConst.Error<RegisterResponse>(500, "Chưa có role mặc định, vui lòng liên hệ quản trị viên");

                await _userRoleRepository.AddUserRoleAsync(new AuthUserRole
                {
                    role       = defaultRole,
                    userID     = user.userID,
                    assignedAt = DateTime.UtcNow
                }, ct);

                if (!string.IsNullOrWhiteSpace(req.firstName) || !string.IsNullOrWhiteSpace(req.lastName))
                {
                    await _profiles.AddAsync(new AuthProfile
                    {
                        userID    = user.userID,
                        firstName = req.firstName,
                        lastName  = req.lastName,
                        gender    = req.gender,
                    }, ct);
                }

                await _uow.SaveChangesAsync(ct);

                return ResponseConst.Success("Đăng ký thành công", new RegisterResponse
                {
                    userID          = user.userID,
                    userName        = user.userName,
                    email           = user.email,
                    isEmailVerified = user.isEmailVerified
                });
            }, ct: ct);

        // ── Admin tạo tài khoản bất kỳ (BQL, Staff, …) ───────────────────────
        public Task<ResponseDto<RegisterResponse>> CreateSimpleUserAsync(SimpleCreateUserRequest req, CancellationToken ct)
        {
            return _uow.ExecuteInTransactionAsync(async _ =>
            {
                if (string.IsNullOrWhiteSpace(req.userName) ||
                    string.IsNullOrWhiteSpace(req.email) ||
                    string.IsNullOrWhiteSpace(req.password))
                    return ResponseConst.Error<RegisterResponse>(400, "Thiếu thông tin đăng nhập (username, email, password)");

                var userName = req.userName.Trim();
                var email    = req.email.Trim().ToLowerInvariant();

                if (await _users.ExistsByUserNameAsync(userName, ct))
                    return ResponseConst.Error<RegisterResponse>(409, "UserName đã tồn tại");
                if (await _users.ExistsByEmailAsync(email, ct))
                    return ResponseConst.Error<RegisterResponse>(409, "Email đã tồn tại");

                var rolesToAssign = new List<AuthRole>();

                if (req.roleIds != null && req.roleIds.Any())
                {
                    rolesToAssign = await _roleRepository.GetRolesByIdsAsync(req.roleIds, ct);
                    if (rolesToAssign.Count != req.roleIds.Distinct().Count())
                        return ResponseConst.Error<RegisterResponse>(404, "Một hoặc nhiều Role ID không tồn tại.");
                }
                else
                {
                    var defaultRole = await _roleRepository.GetDefaultRoleAsync(ct);
                    if (defaultRole != null) rolesToAssign.Add(defaultRole);
                }

                var user = new AuthUser
                {
                    userName        = userName,
                    email           = email,
                    passwordHash    = _hasher.Hash(req.password),
                    isEmailVerified = true,     // không cần xác thực email
                    status          = "Active",
                    tokenVersion    = 1,
                    createdAt       = DateTime.UtcNow,
                    updatedAt       = DateTime.UtcNow,
                    scope           = req.scope
                };

                await _users.AddAsync(user, ct);
                await _uow.SaveChangesAsync(ct);

                await _profiles.AddAsync(new AuthProfile
                {
                    userID      = user.userID,
                    firstName   = req.firstName ?? string.Empty,
                    lastName    = req.lastName  ?? string.Empty,
                    gender      = req.gender,
                    dateOfBirth = req.dateOfBirth,
                    avatar      = req.avatar
                }, ct);

                foreach (var role in rolesToAssign)
                {
                    await _userRoleRepository.AddUserRoleAsync(new AuthUserRole
                    {
                        roleID     = role.roleID,
                        userID     = user.userID,
                        assignedAt = DateTime.UtcNow
                    }, ct);
                }

                if (!rolesToAssign.Any())
                    _logger.LogWarning("User {UserName} created without any role.", userName);

                await _uow.SaveChangesAsync(ct);

                var roleNames = string.Join(", ", rolesToAssign.Select(r => r.roleName));
                return ResponseConst.Success($"Tạo user thành công. Roles: [{roleNames}]", new RegisterResponse
                {
                    userID          = user.userID,
                    userName        = user.userName,
                    email           = user.email,
                    isEmailVerified = user.isEmailVerified
                });
            }, ct: ct);
        }

        // ── BQL/Admin tạo tài khoản Resident/Provider — chặn scope BQL/Admin ──
        public Task<ResponseDto<RegisterResponse>> CreateResidentUserAsync(SimpleCreateUserRequest req, CancellationToken ct)
        {
            var forbiddenScopes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "staff", "admin" };

            return _uow.ExecuteInTransactionAsync(async _ =>
            {
                if (string.IsNullOrWhiteSpace(req.userName) ||
                    string.IsNullOrWhiteSpace(req.password))
                    return ResponseConst.Error<RegisterResponse>(400, "Thiếu thông tin đăng nhập (username, password)");

                if (!string.IsNullOrWhiteSpace(req.scope) && forbiddenScopes.Contains(req.scope))
                    return ResponseConst.Error<RegisterResponse>(403, "Không có quyền tạo tài khoản với scope này.");

                var userName = req.userName.Trim();
                var email    = string.IsNullOrWhiteSpace(req.email) ? null : req.email.Trim().ToLowerInvariant();

                if (await _users.ExistsByUserNameAsync(userName, ct))
                    return ResponseConst.Error<RegisterResponse>(409, "UserName đã tồn tại.");
                if (email != null && await _users.ExistsByEmailAsync(email, ct))
                    return ResponseConst.Error<RegisterResponse>(409, "Email đã tồn tại.");

                var rolesToAssign = new List<AuthRole>();

                if (req.roleIds != null && req.roleIds.Any())
                {
                    rolesToAssign = await _roleRepository.GetRolesByIdsAsync(req.roleIds, ct);

                    if (rolesToAssign.Count != req.roleIds.Distinct().Count())
                        return ResponseConst.Error<RegisterResponse>(404, "Một hoặc nhiều Role ID không tồn tại.");

                    var blockedRole = rolesToAssign.FirstOrDefault(r =>
                        !string.IsNullOrWhiteSpace(r.scope) && forbiddenScopes.Contains(r.scope));
                    if (blockedRole != null)
                        return ResponseConst.Error<RegisterResponse>(403,
                            $"Không có quyền gán role '{blockedRole.roleName}' (scope: {blockedRole.scope}).");
                }
                else
                {
                    var defaultRole = await _roleRepository.GetDefaultRoleAsync(ct);
                    if (defaultRole != null) rolesToAssign.Add(defaultRole);
                }

                var user = new AuthUser
                {
                    userName        = userName,
                    email           = email,
                    passwordHash    = _hasher.Hash(req.password),
                    isEmailVerified = true,     // không cần xác thực email
                    status          = "Active",
                    tokenVersion    = 1,
                    createdAt       = DateTime.UtcNow,
                    updatedAt       = DateTime.UtcNow,
                    scope           = req.scope ?? "user"
                };

                await _users.AddAsync(user, ct);
                await _uow.SaveChangesAsync(ct);

                await _profiles.AddAsync(new AuthProfile
                {
                    userID      = user.userID,
                    firstName   = req.firstName ?? string.Empty,
                    lastName    = req.lastName  ?? string.Empty,
                    gender      = req.gender,
                    dateOfBirth = req.dateOfBirth,
                    avatar      = req.avatar
                }, ct);

                foreach (var role in rolesToAssign)
                {
                    await _userRoleRepository.AddUserRoleAsync(new AuthUserRole
                    {
                        roleID     = role.roleID,
                        userID     = user.userID,
                        assignedAt = DateTime.UtcNow
                    }, ct);
                }

                await _uow.SaveChangesAsync(ct);

                var roleNames = string.Join(", ", rolesToAssign.Select(r => r.roleName));
                return ResponseConst.Success($"Tạo tài khoản thành công. Roles: [{roleNames}]", new RegisterResponse
                {
                    userID          = user.userID,
                    userName        = user.userName,
                    email           = user.email,
                    isEmailVerified = user.isEmailVerified
                });
            }, ct: ct);
        }
    }
}
