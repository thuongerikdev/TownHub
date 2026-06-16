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
    public interface IAuthPermissionService
    {
        Task<ResponseDto<List<AuthPermission>>> GetPermissionsByUserIdAsync(int userId, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> CreatePermissionAsync(CreatePermissionRequestDto createPermissionRequestDto, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> GetPermissionByIdAsync(int permissionId, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> UpdatePermissionAsync(UpdatePermissionRequestDto updatePermissionRequestDto, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> DeletePermissionAsync(int permissionId, CancellationToken ct);
        Task<ResponseDto<List<AuthPermission>>> GetAllPermissionsAsync(CancellationToken ct);
        Task<ResponseDto<List<AuthPermission>>> GetPermissionByRoleIdAsync(int roleId, CancellationToken ct);
        Task<ResponseDto<List<AuthPermission>>> CreatePermissionsAsync(List<CreatePermissionRequestDto> reqs, CancellationToken ct);


        Task<ResponseDto<List<AuthPermission>>> GetPermissionsByUserIdAsyncWhereScopeUser(int userId, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> GetPermissionByNameAsyncWhereScopeUser(string permissionName, CancellationToken ct);
        Task<ResponseDto<List<AuthPermission>>> GetAllPermissionsAsynWhereScopeUserc(CancellationToken ct);
        Task<ResponseDto<List<AuthPermission>>> GettPermissionByRoleIdAsyncWhereScopeUser(int roleId, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> GetPermissionByIdAsyncWhereScopeUser(int permissionId, CancellationToken ct);

        Task<ResponseDto<List<AuthPermission>>> CreatePermissionAsyncWhereScopeUser(List<CreatePermissionScopeUserRequestDto> createPermissionRequestDto, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> UpdatePermissionAsyncWhereScopeUser(UpdatePermissionScopeUserRequestDto updatePermissionRequestDto, CancellationToken ct);
        Task<ResponseDto<AuthPermission>> DeletePermissionAsyncWhereScopeUser(int permissionId, CancellationToken ct);


    }
    public class AuthPermissionService : AuthServiceBase, IAuthPermissionService
    {
        private readonly IPermissionRepository _permissionRepository;
        private readonly IUnitOfWork _unitOfWork;
        public AuthPermissionService(IPermissionRepository permissionRepository, IUnitOfWork unitOfWork, ILogger<AuthPermissionService> logger) : base(logger)
        {
            _permissionRepository = permissionRepository;
            _unitOfWork = unitOfWork;
        }
        public async Task<ResponseDto<List<AuthPermission>>> GetPermissionsByUserIdAsync(int userId, CancellationToken ct)
        {
            _logger.LogInformation("Getting permissions for user with ID {UserId}", userId);
            try
            {
                var permissions = await _permissionRepository.GetPermissionsByUserIdAsync(userId, ct);
                if (permissions == null)
                {
                    _logger.LogWarning("No permissions found for user with ID {UserId}", userId);
                    return ResponseConst.Error<List<AuthPermission>>(404, "No permissions found");
                }
                return ResponseConst.Success<List<AuthPermission>>("Lấy danh sách thành công", permissions);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for user with ID {UserId}", userId);
                return ResponseConst.Error<List<AuthPermission>>(500, "Error getting permissions");
            }


        }
        public async Task<ResponseDto<AuthPermission>> CreatePermissionAsync(CreatePermissionRequestDto createPermissionRequestDto, CancellationToken ct)
        {
            _logger.LogInformation("Creating new permission with name {PermissionName}", createPermissionRequestDto.permissionName);
            try
            {
                var newPermission = new AuthPermission
                {
                    permissionName = createPermissionRequestDto.permissionName,
                    permissionDescription = createPermissionRequestDto.permissionDescription,
                    code = createPermissionRequestDto.code,
                    scope = createPermissionRequestDto.scope

                };
                await _permissionRepository.AddPermissionAsync(newPermission, ct);
                await _unitOfWork.SaveChangesAsync(ct);
                return ResponseConst.Success<AuthPermission>("Tạo permission thành công", newPermission);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating permission with name {PermissionName}", createPermissionRequestDto.permissionName);
                return ResponseConst.Error<AuthPermission>(500, "Error creating permission");
            }


        }
        public async Task<ResponseDto<AuthPermission>> GetPermissionByIdAsync(int permissionId, CancellationToken ct)
        {
            _logger.LogInformation("Getting permission with ID {PermissionId}", permissionId);
            try
            {
                var permission = await _permissionRepository.GetPermissionByIdAsync(permissionId, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with ID {PermissionId} not found", permissionId);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                return ResponseConst.Success<AuthPermission>("Lấy permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permission with ID {PermissionId}", permissionId);
                return ResponseConst.Error<AuthPermission>(500, "Error getting permission");
            }
        }
        public async Task<ResponseDto<AuthPermission>> UpdatePermissionAsync(UpdatePermissionRequestDto updatePermissionRequestDto, CancellationToken ct)
        {
            _logger.LogInformation("Updating permission with name {PermissionName}", updatePermissionRequestDto.permissionName);
            try
            {
                var permission = await _permissionRepository.GetPermissionByNameAsync(updatePermissionRequestDto.permissionName, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with name {PermissionName} not found", updatePermissionRequestDto.permissionName);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                permission.permissionDescription = updatePermissionRequestDto.permissionDescription;
                permission.code = updatePermissionRequestDto.code;
                permission.scope = updatePermissionRequestDto.scope;
                await _permissionRepository.UpdatePermissionAsync(permission, ct);
                await _unitOfWork.SaveChangesAsync(ct);
                return ResponseConst.Success<AuthPermission>("Cập nhật permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating permission with name {PermissionName}", updatePermissionRequestDto.permissionName);
                return ResponseConst.Error<AuthPermission>(500, "Error updating permission");
            }
        }
        public async Task<ResponseDto<AuthPermission>> DeletePermissionAsync(int permissionId, CancellationToken ct)
        {
            _logger.LogInformation("Deleting permission with ID {PermissionId}", permissionId);
            try
            {
                var permission = await _permissionRepository.GetPermissionByIdAsync(permissionId, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with ID {PermissionId} not found", permissionId);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                await _permissionRepository.DeletePermissionAsync(permission, ct);
                await _unitOfWork.SaveChangesAsync(ct);
                return ResponseConst.Success<AuthPermission>("Xóa permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting permission with ID {PermissionId}", permissionId);
                return ResponseConst.Error<AuthPermission>(500, "Error deleting permission");
            }
        }
        public async Task<ResponseDto<List<AuthPermission>>> GetAllPermissionsAsync(CancellationToken ct)
        {
            _logger.LogInformation("Getting all permissions");
            try
            {
                var permissions = await _permissionRepository.GetAllPermissionsAsync(ct);
                return ResponseConst.Success<List<AuthPermission>>("Lấy danh sách permission thành công", permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all permissions");
                return ResponseConst.Error<List<AuthPermission>>(500, "Error getting permissions");
            }
        }
        public async Task<ResponseDto<List<AuthPermission>>> GetPermissionByRoleIdAsync(int roleId, CancellationToken ct)
        {
            _logger.LogInformation("Getting permissions for role with ID {RoleId}", roleId);
            try
            {
                var permissions = await _permissionRepository.GettPermissionByRoleIdAsync(roleId, ct);
                if (permissions == null)
                {
                    _logger.LogWarning("No permissions found for role with ID {RoleId}", roleId);
                    return ResponseConst.Error<List<AuthPermission>>(404, "No permissions found");
                }
                return ResponseConst.Success<List<AuthPermission>>("Lấy danh sách thành công", permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for role with ID {RoleId}", roleId);
                return ResponseConst.Error<List<AuthPermission>>(500, "Error getting permissions");
            }
        }
        public async Task<ResponseDto<List<AuthPermission>>> CreatePermissionsAsync(List<CreatePermissionRequestDto> reqs, CancellationToken ct)
        {
            try
            {
                if (reqs == null || !reqs.Any())
                {
                    return ResponseConst.Error<List<AuthPermission>>(400, "Permission list cannot be empty.");
                }

                // 1. Kiểm tra trùng lặp Code (Quan trọng!)
                // Lấy tất cả Code hiện có trong DB để so sánh (hoặc query Where In nếu list nhỏ)
                // Ở đây tôi lấy All cho đơn giản, nếu bảng to thì nên optimize bằng Where(p => codes.Contains(p.code))
                var inputCodes = reqs.Select(x => x.code).Distinct().ToHashSet();

                // Query những code đã tồn tại trong DB
                // (Bạn cần thêm hàm GetPermissionsByCodesAsync vào Repo nếu muốn tối ưu, ở đây tôi dùng GetAll tạm)
                var allExistingPermissions = await _permissionRepository.GetAllPermissionsAsync(ct);
                var existingCodes = allExistingPermissions.Select(p => p.code).ToHashSet();

                var newPermissions = new List<AuthPermission>();
                var duplicates = new List<string>();

                foreach (var req in reqs)
                {
                    if (existingCodes.Contains(req.code))
                    {
                        duplicates.Add(req.code);
                        continue; // Bỏ qua cái trùng
                    }

                    newPermissions.Add(new AuthPermission
                    {
                        permissionName = req.permissionName,
                        permissionDescription = req.permissionDescription,
                        code = req.code,
                        scope = req.scope
                    });

                    // Add vào HashSet tạm để tránh chính input request có 2 code trùng nhau
                    existingCodes.Add(req.code);
                }

                if (!newPermissions.Any())
                {
                    return ResponseConst.Error<List<AuthPermission>>(409, $"All permissions already exist. Duplicates: {string.Join(", ", duplicates)}");
                }

                // 2. Insert Bulk
                await _permissionRepository.AddRangePermissionAsync(newPermissions, ct);
                await _unitOfWork.SaveChangesAsync(ct);

                var msg = $"Successfully created {newPermissions.Count} permissions.";
                if (duplicates.Any())
                {
                    msg += $" Skipped {duplicates.Count} duplicates.";
                }

                return ResponseConst.Success(msg, newPermissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating bulk permissions.");
                return ResponseConst.Error<List<AuthPermission>>(500, "Error creating permissions.");
            }
        }
        public async Task<ResponseDto<AuthPermission>> GetPermissionByNameAsyncWhereScopeUser(string permissionName, CancellationToken ct)
        {
            _logger.LogInformation("Getting permission with name {PermissionName} and scope USER", permissionName);
            try
            {
                var permission = await _permissionRepository.GetPermissionByNameAsyncWhereScopeUser(permissionName, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with name {PermissionName} not found in scope USER", permissionName);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                return ResponseConst.Success<AuthPermission>("Lấy permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permission with name {PermissionName} in scope USER", permissionName);
                return ResponseConst.Error<AuthPermission>(500, "Error getting permission");
            }
        }
        public async Task<ResponseDto<List<AuthPermission>>> GetAllPermissionsAsynWhereScopeUserc(CancellationToken ct)
        {
            _logger.LogInformation("Getting all permissions in scope USER");
            try
            {
                var permissions = await _permissionRepository.GetAllPermissionsAsynWhereScopeUserc(ct);
                return ResponseConst.Success<List<AuthPermission>>("Lấy danh sách permission thành công", permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all permissions in scope USER");
                return ResponseConst.Error<List<AuthPermission>>(500, "Error getting permissions");
            }
        }
        public async Task<ResponseDto<List<AuthPermission>>> GettPermissionByRoleIdAsyncWhereScopeUser(int roleId, CancellationToken ct)
        {
            _logger.LogInformation("Getting permissions for role with ID {RoleId} in scope USER", roleId);
            try
            {
                var permissions = await _permissionRepository.GettPermissionByRoleIdAsyncWhereScopeUser(roleId, ct);
                if (permissions == null)
                {
                    _logger.LogWarning("No permissions found for role with ID {RoleId} in scope USER", roleId);
                    return ResponseConst.Error<List<AuthPermission>>(404, "No permissions found");
                }
                return ResponseConst.Success<List<AuthPermission>>("Lấy danh sách thành công", permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for role with ID {RoleId} in scope USER", roleId);
                return ResponseConst.Error<List<AuthPermission>>(500, "Error getting permissions");
            }
        }
        public async Task<ResponseDto<AuthPermission>> GetPermissionByIdAsyncWhereScopeUser(int permissionId, CancellationToken ct)
        {
            _logger.LogInformation("Getting permission with ID {PermissionId} in scope USER", permissionId);
            try
            {
                var permission = await _permissionRepository.GetPermissionByIdAsyncWhereScopeUser(permissionId, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with ID {PermissionId} not found in scope USER", permissionId);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                return ResponseConst.Success<AuthPermission>("Lấy permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permission with ID {PermissionId} in scope USER", permissionId);
                return ResponseConst.Error<AuthPermission>(500, "Error getting permission");
            }
        }
        public async Task<ResponseDto<List<AuthPermission>>> GetPermissionsByUserIdAsyncWhereScopeUser(int userId, CancellationToken ct)
        {
            _logger.LogInformation("Getting permissions for user with ID {UserId} in scope USER", userId);
            try
            {
                var permissions = await _permissionRepository.GetPermissionsByUserIdAsyncWhereScopeUser(userId, ct);
                if (permissions == null)
                {
                    _logger.LogWarning("No permissions found for user with ID {UserId} in scope USER", userId);
                    return ResponseConst.Error<List<AuthPermission>>(404, "No permissions found");
                }
                return ResponseConst.Success<List<AuthPermission>>("Lấy danh sách thành công", permissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting permissions for user with ID {UserId} in scope USER", userId);
                return ResponseConst.Error<List<AuthPermission>>(500, "Error getting permissions");
            }

        }

        public async Task<ResponseDto<List<AuthPermission>>> CreatePermissionAsyncWhereScopeUser(List<CreatePermissionScopeUserRequestDto> reqs, CancellationToken ct)
        {
            try
            {
                if (reqs == null || !reqs.Any())
                {
                    return ResponseConst.Error<List<AuthPermission>>(400, "Permission list cannot be empty.");
                }

                // 1. Kiểm tra trùng lặp Code (Quan trọng!)
                // Lấy tất cả Code hiện có trong DB để so sánh (hoặc query Where In nếu list nhỏ)
                // Ở đây tôi lấy All cho đơn giản, nếu bảng to thì nên optimize bằng Where(p => codes.Contains(p.code))
                var inputCodes = reqs.Select(x => x.code).Distinct().ToHashSet();

                // Query những code đã tồn tại trong DB
                // (Bạn cần thêm hàm GetPermissionsByCodesAsync vào Repo nếu muốn tối ưu, ở đây tôi dùng GetAll tạm)
                var allExistingPermissions = await _permissionRepository.GetAllPermissionsAsync(ct);
                var existingCodes = allExistingPermissions.Select(p => p.code).ToHashSet();

                var newPermissions = new List<AuthPermission>();
                var duplicates = new List<string>();

                foreach (var req in reqs)
                {
                    if (existingCodes.Contains(req.code))
                    {
                        duplicates.Add(req.code);
                        continue; // Bỏ qua cái trùng
                    }

                    newPermissions.Add(new AuthPermission
                    {
                        permissionName = req.permissionName,
                        permissionDescription = req.permissionDescription,
                        code = req.code,
                        scope = "user"
                    });

                    // Add vào HashSet tạm để tránh chính input request có 2 code trùng nhau
                    existingCodes.Add(req.code);
                }

                if (!newPermissions.Any())
                {
                    return ResponseConst.Error<List<AuthPermission>>(409, $"All permissions already exist. Duplicates: {string.Join(", ", duplicates)}");
                }

                // 2. Insert Bulk
                await _permissionRepository.AddRangePermissionAsync(newPermissions, ct);
                await _unitOfWork.SaveChangesAsync(ct);

                var msg = $"Successfully created {newPermissions.Count} permissions.";
                if (duplicates.Any())
                {
                    msg += $" Skipped {duplicates.Count} duplicates.";
                }

                return ResponseConst.Success(msg, newPermissions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating bulk permissions.");
                return ResponseConst.Error<List<AuthPermission>>(500, "Error creating permissions.");
            }
        }

        public async Task<ResponseDto<AuthPermission>> UpdatePermissionAsyncWhereScopeUser(UpdatePermissionScopeUserRequestDto updatePermissionRequestDto, CancellationToken ct)
        {
            _logger.LogInformation("Updating permission with name {PermissionName}", updatePermissionRequestDto.permissionName);
            try
            {
                var permission = await _permissionRepository.GetPermissionByNameAsync(updatePermissionRequestDto.permissionName, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with name {PermissionName} not found", updatePermissionRequestDto.permissionName);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                if (permission.scope != "user")
                {
                    _logger.LogWarning("Permission with name {PermissionName} is not in scope USER", updatePermissionRequestDto.permissionName);
                    return ResponseConst.Error<AuthPermission>(403, "Cannot update permission outside of USER scope");
                }
                permission.permissionDescription = updatePermissionRequestDto.permissionDescription;
                permission.code = updatePermissionRequestDto.code;
                await _permissionRepository.UpdatePermissionAsync(permission, ct);
                await _unitOfWork.SaveChangesAsync(ct);
                return ResponseConst.Success<AuthPermission>("Cập nhật permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating permission with name {PermissionName}", updatePermissionRequestDto.permissionName);
                return ResponseConst.Error<AuthPermission>(500, "Error updating permission");
            }
        }
        public async Task<ResponseDto<AuthPermission>> DeletePermissionAsyncWhereScopeUser(int permissionId, CancellationToken ct)
        {
            _logger.LogInformation("Deleting permission with ID {PermissionId}", permissionId);
            try
            {
                var permission = await _permissionRepository.GetPermissionByIdAsync(permissionId, ct);
                if (permission == null)
                {
                    _logger.LogWarning("Permission with ID {PermissionId} not found", permissionId);
                    return ResponseConst.Error<AuthPermission>(404, "Permission not found");
                }
                if (permission.scope != "user")
                {
                    _logger.LogWarning("Permission with ID {PermissionId} is not in scope USER", permissionId);
                    return ResponseConst.Error<AuthPermission>(403, "Cannot delete permission outside of USER scope");
                }
                await _permissionRepository.DeletePermissionAsync(permission, ct);
                await _unitOfWork.SaveChangesAsync(ct);
                return ResponseConst.Success<AuthPermission>("Xóa permission thành công", permission);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting permission with ID {PermissionId}", permissionId);
                return ResponseConst.Error<AuthPermission>(500, "Error deleting permission");
            }
        }
    }
}
