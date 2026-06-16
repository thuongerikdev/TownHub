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
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.Role
{
    public interface IAuthRolePermissionService
    {
        // Hàm cũ (Dùng cho Admin/System - Quyền lực tối cao)
        Task<ResponseDto<bool>> AddRolePermissionAsync(RolePermissionRequestDto req, CancellationToken ct);

        // 👇 HÀM MỚI (Dành riêng cho nghiệp vụ User Scope)
        Task<ResponseDto<bool>> AddUserScopeRolePermissionAsync(RolePermissionRequestDto req, CancellationToken ct);
    }

    public class AuthRolePermissionService : AuthServiceBase, IAuthRolePermissionService
    {
        private readonly IUnitOfWork _authUnitOfWork;
        private readonly IRolePermissionRepository _rolePermissionRepository;

        // Inject thêm 2 Repo để check scope
        private readonly IRoleRepository _roleRepository;
        private readonly IPermissionRepository _permissionRepository;

        public AuthRolePermissionService(
            IUnitOfWork authUnitOfWork,
            ILogger<AuthRolePermissionService> logger,
            IRolePermissionRepository rolePermissionRepository,
            IRoleRepository roleRepository,
            IPermissionRepository permissionRepository) : base(logger)
        {
            _authUnitOfWork = authUnitOfWork;
            _rolePermissionRepository = rolePermissionRepository;
            _roleRepository = roleRepository;
            _permissionRepository = permissionRepository;
        }

        // ==========================================================
        // 1. HÀM CŨ (Giữ nguyên logic, gọi vào hàm xử lý chung)
        // ==========================================================
        public async Task<ResponseDto<bool>> AddRolePermissionAsync(RolePermissionRequestDto req, CancellationToken ct)
        {
            // Admin có thể làm mọi thứ, không cần check scope chặt chẽ
            return await _processSyncPermissions(req, ct);
        }

        // ==========================================================
        // 2. HÀM MỚI (CHỈ DÀNH CHO SCOPE USER)
        // ==========================================================
        public async Task<ResponseDto<bool>> AddUserScopeRolePermissionAsync(RolePermissionRequestDto req, CancellationToken ct)
        {
            // A. Validate Role Scope
            var isRoleValid = await _roleRepository.CheckRoleScopeAsync(req.roleID, "user", ct);
            if (!isRoleValid)
            {
                return ResponseConst.Error<bool>(400, "Access Denied: The target Role is not 'user' scope.");
            }

            // B. Validate Permission Scope (Nếu có gửi list permission lên)
            if (req.permissionIDs != null && req.permissionIDs.Any())
            {
                var isPermsValid = await _permissionRepository.AreAllPermissionsInScopeAsync(req.permissionIDs, "user", ct);
                if (!isPermsValid)
                {
                    return ResponseConst.Error<bool>(400, "Access Denied: One or more Permissions are not 'user' scope.");
                }
            }

            // C. Nếu Validate OK -> Gọi logic xử lý chung
            return await _processSyncPermissions(req, ct);
        }

        // ==========================================================
        // 3. PRIVATE CORE LOGIC (Tái sử dụng code)
        // ==========================================================
        private async Task<ResponseDto<bool>> _processSyncPermissions(RolePermissionRequestDto req, CancellationToken ct)
        {
            try
            {
                if (req.permissionIDs == null) req.permissionIDs = new List<int>();

                // Lấy danh sách hiện tại
                var currentPermissions = await _rolePermissionRepository.GetRolePermissionsByRoleIdAsync(req.roleID, ct);
                var targetPermissionIds = req.permissionIDs.Distinct().ToHashSet();

                // Phân loại Thêm/Xóa
                var permissionsToAdd = new List<AuthRolePermission>();

                // Logic tìm cái cần Add
                foreach (var id in targetPermissionIds)
                {
                    if (!currentPermissions.Any(x => x.permissionID == id))
                    {
                        permissionsToAdd.Add(new AuthRolePermission { roleID = req.roleID, permissionID = id });
                    }
                }

                // Logic tìm cái cần Remove
                var permissionsToRemove = currentPermissions
                    .Where(x => !targetPermissionIds.Contains(x.permissionID))
                    .ToList();

                // Thực thi DB
                if (permissionsToAdd.Any())
                    await _rolePermissionRepository.AddRangeRolePermissionAsync(permissionsToAdd, ct);

                if (permissionsToRemove.Any())
                    await _rolePermissionRepository.RemoveRangeRolePermissionAsync(permissionsToRemove, ct);

                if (!permissionsToAdd.Any() && !permissionsToRemove.Any())
                    return ResponseConst.Success("No changes needed.", true);

                await _authUnitOfWork.SaveChangesAsync(ct);

                return ResponseConst.Success($"Synced: +{permissionsToAdd.Count} / -{permissionsToRemove.Count}", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing permissions for RoleID: {RoleId}", req.roleID);
                return ResponseConst.Error<bool>(500, "Internal Server Error during permission sync.");
            }
        }
    }
}
