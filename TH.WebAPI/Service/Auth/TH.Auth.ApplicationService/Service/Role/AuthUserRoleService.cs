using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Common;
using TH.Auth.Domain.Role;
using TH.Auth.Dtos.Role;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.Role;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.Role
{
    public interface IAuthUserRoleService
    {
        // Hàm cũ (Admin/System dùng)
        Task<ResponseDto<bool>> AddUserRoleAsync(UserRoleRequestDto req, CancellationToken ct);

        // 👇 HÀM MỚI (Chỉ dành cho User Scope)
        Task<ResponseDto<bool>> AddUserScopeUserRoleAsync(UserRoleRequestDto req, CancellationToken ct);
    }

    public class AuthUserRoleService : AuthServiceBase, IAuthUserRoleService
    {
        private readonly IUserRoleRepository _userRoleRepository;
        private readonly IUnitOfWork _uow;

        // Inject thêm 2 Repo để check scope
        private readonly IUserRepository _authUserRepository;
        private readonly IRoleRepository _roleRepository;

        public AuthUserRoleService(
            ILogger<AuthUserRoleService> logger,
            IUnitOfWork uow,
            IUserRoleRepository userRoleRepository,
            IUserRepository authUserRepository, // <--- Mới
            IRoleRepository roleRepository          // <--- Mới
            ) : base(logger)
        {
            _uow = uow;
            _userRoleRepository = userRoleRepository;
            _authUserRepository = authUserRepository;
            _roleRepository = roleRepository;
        }

        // ==========================================================
        // 1. HÀM CŨ (General - Không check scope chặt)
        // ==========================================================
        public async Task<ResponseDto<bool>> AddUserRoleAsync(UserRoleRequestDto req, CancellationToken ct)
        {
            return await _processSyncUserRoles(req, ct);
        }

        // ==========================================================
        // 2. HÀM MỚI (CHỈ DÀNH CHO SCOPE USER)
        // ==========================================================
        public async Task<ResponseDto<bool>> AddUserScopeUserRoleAsync(UserRoleRequestDto req, CancellationToken ct)
        {
            // A. Validate User Scope
            // Kiểm tra xem User đích có phải là user thường không
            var isUserValid = await _authUserRepository.CheckUserScopeAsync(req.userID, "user", ct);
            if (!isUserValid)
            {
                return ResponseConst.Error<bool>(400, "Access Denied: The target User is not 'user' scope.");
            }

            // B. Validate Role Scope
            // Kiểm tra xem các Role định gán có phải là Role cho user thường không
            if (req.roleIDs != null && req.roleIDs.Any())
            {
                var isRolesValid = await _roleRepository.AreAllRolesInScopeAsync(req.roleIDs, "user", ct);
                if (!isRolesValid)
                {
                    return ResponseConst.Error<bool>(400, "Access Denied: One or more Roles are not 'user' scope.");
                }
            }

            // C. Nếu OK -> Gọi logic chung
            return await _processSyncUserRoles(req, ct);
        }

        // ==========================================================
        // 3. PRIVATE CORE LOGIC (Shared)
        // ==========================================================
        private async Task<ResponseDto<bool>> _processSyncUserRoles(UserRoleRequestDto req, CancellationToken ct)
        {
            try
            {
                // 1. Validate List
                if (req.roleIDs == null) req.roleIDs = new List<int>();

                // 2. Lấy hiện trạng từ DB
                var currentRoles = await _userRoleRepository.GetUserRolesByUserIdAsync(req.userID, ct);
                var targetRoleIds = req.roleIDs.Distinct().ToHashSet();

                // 3. Phân loại
                // A. Cần THÊM
                var rolesToAdd = new List<AuthUserRole>();
                foreach (var id in targetRoleIds)
                {
                    if (!currentRoles.Any(x => x.roleID == id))
                    {
                        rolesToAdd.Add(new AuthUserRole
                        {
                            userID = req.userID,
                            roleID = id,
                            assignedAt = DateTime.UtcNow
                        });
                    }
                }

                // B. Cần XÓA
                var rolesToRemove = currentRoles
                    .Where(x => !targetRoleIds.Contains(x.roleID))
                    .ToList();

                // 4. Thực thi
                if (rolesToAdd.Any())
                    await _userRoleRepository.AddRangeUserRoleAsync(rolesToAdd, ct);

                if (rolesToRemove.Any())
                    await _userRoleRepository.RemoveRangeUserRoleAsync(rolesToRemove, ct);

                // 5. Kết thúc nếu không đổi gì
                if (!rolesToAdd.Any() && !rolesToRemove.Any())
                {
                    return ResponseConst.Success("No changes needed.", true);
                }

                // 6. Lưu DB
                await _uow.SaveChangesAsync(ct);

                return ResponseConst.Success(
                    $"Synced: +{rolesToAdd.Count} / -{rolesToRemove.Count} roles.",
                    true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing roles for UserID: {UserID}", req.userID);
                return ResponseConst.Error<bool>(500, "An error occurred while syncing roles.");
            }
        }
    }
}
