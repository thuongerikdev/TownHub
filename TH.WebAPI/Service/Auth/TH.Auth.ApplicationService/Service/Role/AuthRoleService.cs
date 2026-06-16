using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Role;
using TH.Auth.Dtos.Role;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.Role;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.Role
{
    public interface IAuthRoleService
    {
        Task<ResponseDto<List<RoleResponse>>> GetAllRolesAsync(CancellationToken ct);
        Task<ResponseDto<RoleResponse>> AddRoleAsync(AddRoleRequest req, CancellationToken ct);
        Task<ResponseDto<RoleResponse>> UpdateRoleAsync(UpdateRoleRequest req, CancellationToken ct);
        Task<ResponseDto<bool>> DeleteRoleAsync(int roleID, CancellationToken ct);

        // ==========================================================
        Task<ResponseDto<RoleResponse>> AddRoleAsyncWhereScopeUser(AddRoleWhereScopeUserRequest req, CancellationToken ct);
        Task<ResponseDto<RoleResponse>> UpdateRoleAsyncWhereScopeUser(UpdateRoleWhereScopeUserRequest req, CancellationToken ct);
        Task<ResponseDto<bool>> DeleteRoleAsyncWhereScopeUser(int roleID, CancellationToken ct);

        Task<ResponseDto<RoleResponse>> CloneRoleWhereScopeUserAsync(CloneUserRoleRequest req, CancellationToken ct);


        //Task<ResponseDto<bool>> AssignRoleToUserAsync(AssignRoleRequest req, CancellationToken ct);
        Task<ResponseDto<List<RoleResponse>>> GetRoleByUserID(int userID, CancellationToken ct);
        Task<ResponseDto<RoleResponse>> CloneRoleAsync(CloneRoleRequest req, CancellationToken ct);


        Task<ResponseDto<List<AuthRole>>> GetAllRoleWhereScopeUser(CancellationToken ct);
    }
    public class AuthRoleService : IAuthRoleService
    {
        private readonly IRoleRepository _roleRepository;
        private readonly IUnitOfWork _uow;
        public AuthRoleService(IRoleRepository roleRepository, IUnitOfWork uow)
        {
            _roleRepository = roleRepository;
            _uow = uow;
        }

        public async Task<ResponseDto<List<RoleResponse>>> GetAllRolesAsync(CancellationToken ct)
        {
            var roles = await _roleRepository.GetAllRolesAsync(ct);
            var rolesDto = roles.Select(r => new RoleResponse
            {
                roleID = r.roleID,
                roleName = r.roleName,
                roleDescription = r.roleDescription,
                scope = r.scope,
                isDefault = r.isDefault
            }).ToList();
            return ResponseConst.Success("Lấy danh sách thành công", rolesDto);

        }
        public async Task<string?> GetDefaultRoleAsync(CancellationToken ct)
        {
            var role = await _roleRepository.GetDefaultRoleAsync(ct);
            return role?.roleName;
        }
        public async Task<bool> RoleExistsAsync(string roleName, CancellationToken ct)
        {
            var role = await _roleRepository.GetRoleByNameAsync(roleName, ct);
            return role != null;
        }

        public async Task<ResponseDto<RoleResponse>> UpdateRoleAsync(UpdateRoleRequest req, CancellationToken ct)
        {
            var existingRole = await _roleRepository.GetRoleByIdAsync(req.roleID, ct);
            if (existingRole == null)
            {
                return ResponseConst.Error<RoleResponse>(400, "Role not found.");
            }
            existingRole.roleName = req.roleName;
            existingRole.roleDescription = req.roleDescription;
            existingRole.isDefault = req.isDefault;
            existingRole.scope = req.scope;
            await _roleRepository.UpdateRoleAsync(existingRole, ct);
            await _uow.SaveChangesAsync(ct);
            var roleDto = new RoleResponse
            {
                roleName = existingRole.roleName,
                roleDescription = existingRole.roleDescription,
                isDefault = existingRole.isDefault
            };
            return ResponseConst.Success("Cập nhật vai trò thành công", roleDto);
        }

        public async Task<ResponseDto<bool>> DeleteRoleAsync(int roleID, CancellationToken ct)
        {
            var existingRole = await _roleRepository.GetRoleByIdAsync(roleID, ct);
            if (existingRole == null)
            {
                return ResponseConst.Error<bool>(404, "Role not found.");
            }
            await _roleRepository.DeleteRoleAsync(roleID, ct);
            await _uow.SaveChangesAsync(ct);
            return ResponseConst.Success("Xoá vai trò thành công", true);
        }

        public async Task<ResponseDto<RoleResponse>> GetRoleByIdAsync(int roleID, CancellationToken ct)
        {
            var role = await _roleRepository.GetRoleByIdAsync(roleID, ct);
            if (role == null)
            {
                return ResponseConst.Error<RoleResponse>(400, "Role not found.");
            }
            var roleDto = new RoleResponse
            {
                roleID = role.roleID,
                roleName = role.roleName,
                roleDescription = role.roleDescription,
                isDefault = role.isDefault
            };
            return ResponseConst.Success("Lấy vai trò thành công", roleDto);
        }

        public async Task<ResponseDto<List<RoleResponse>>> GetRoleByUserID(int userID, CancellationToken ct)
        {
            var roles = await _roleRepository.GetRoleByUserID(userID, ct);
            var rolesDto = roles.Select(r => new RoleResponse
            {
                roleID = r.roleID,
                roleName = r.roleName,
                roleDescription = r.roleDescription,
                isDefault = r.isDefault
            }).ToList();
            return ResponseConst.Success("Lấy vai trò của user thành công", rolesDto);
        }




        public async Task<ResponseDto<RoleResponse>> AddRoleAsync(AddRoleRequest addRole, CancellationToken ct)
        {
            var existingRole = await _roleRepository.GetRoleByNameAsync(addRole.roleName, ct);
            if (existingRole != null)
            {
                return ResponseConst.Error<RoleResponse>(400, "Role already exists.");
            }
            var newRole = new Domain.Role.AuthRole
            {
                roleName = addRole.roleName,
                isDefault = addRole.isDefault,
                roleDescription = addRole.roleDescription,
                scope = addRole.scope


            };
            await _roleRepository.AddRoleAsync(newRole, ct);
            await _uow.SaveChangesAsync(ct);
            var roleDto = new RoleResponse
            {
                roleID = newRole.roleID,
                roleName = newRole.roleName,
                roleDescription = newRole.roleDescription,
                isDefault = newRole.isDefault,
                scope = newRole.scope
            };
            return ResponseConst.Success("Thêm vai trò thành công", roleDto);
        }

        public async Task<ResponseDto<RoleResponse>> AddRoleAsyncWhereScopeUser(AddRoleWhereScopeUserRequest addRole, CancellationToken ct)
        {
            var existingRole = await _roleRepository.GetRoleByNameAsync(addRole.roleName, ct);
            if (existingRole != null)
            {
                return ResponseConst.Error<RoleResponse>(400, "Role already exists.");
            }
            var newRole = new Domain.Role.AuthRole
            {
                roleName = addRole.roleName,
                isDefault = addRole.isDefault,
                roleDescription = addRole.roleDescription,
                scope = "user"


            };
            await _roleRepository.AddRoleAsync(newRole, ct);
            await _uow.SaveChangesAsync(ct);
            var roleDto = new RoleResponse
            {
                roleID = newRole.roleID,
                roleName = newRole.roleName,
                roleDescription = newRole.roleDescription,
                isDefault = newRole.isDefault,
                scope = newRole.scope
            };
            return ResponseConst.Success("Thêm vai trò thành công", roleDto);
        }

        public async Task<ResponseDto<RoleResponse>> UpdateRoleAsyncWhereScopeUser(UpdateRoleWhereScopeUserRequest req, CancellationToken ct)
        {
            {
                var existingRole = await _roleRepository.GetRoleByIdAsync(req.roleID, ct);
                if (existingRole == null)
                {
                    return ResponseConst.Error<RoleResponse>(404, "Role not found.");
                }
                if (existingRole.scope != "user")
                {
                    return ResponseConst.Error<RoleResponse>(400, "Access Denied: Cannot update role outside 'user' scope.");
                }
                existingRole.roleName = req.roleName;
                existingRole.roleDescription = req.roleDescription;
                existingRole.isDefault = req.isDefault;
                await _roleRepository.UpdateRoleAsync(existingRole, ct);
                await _uow.SaveChangesAsync(ct);
                var roleDto = new RoleResponse
                {
                    roleName = existingRole.roleName,
                    roleDescription = existingRole.roleDescription,
                    isDefault = existingRole.isDefault
                };
                return ResponseConst.Success("Cập nhật vai trò thành công", roleDto);
            }

        }
        public async Task<ResponseDto<bool>> DeleteRoleAsyncWhereScopeUser(int roleID, CancellationToken ct)
        {
            var existingRole = await _roleRepository.GetRoleByIdAsync(roleID, ct);
            if (existingRole == null)
            {
                return ResponseConst.Error<bool>(404, "Role not found.");
            }
            if (existingRole.scope != "user")
            {
                return ResponseConst.Error<bool>(400, "Access Denied: Cannot delete role outside 'user' scope.");
            }
            await _roleRepository.DeleteRoleAsync(roleID, ct);
            await _uow.SaveChangesAsync(ct);
            return ResponseConst.Success("Xoá vai trò thành công", true);
        }

        public async Task<ResponseDto<RoleResponse>> CloneRoleAsync(CloneRoleRequest req, CancellationToken ct)
        {
            // 1. Lấy role nguồn
            var sourceRole = await _roleRepository.GetRoleWithPermissionsAsync(req.sourceRoleId, ct);
            if (sourceRole == null)
            {
                return ResponseConst.Error<RoleResponse>(404, "Role nguồn không tồn tại.");
            }

            // 2. Xác định scope mới (Lấy từ request, nếu không có thì lấy theo role cũ)
            string? targetScope = req.newScope ?? sourceRole.scope;

            // 3. Gọi hàm xử lý chung
            return await _processCloneRoleInternal(sourceRole, req.newRoleName, req.newRoleDescription, targetScope, req.isDefault, ct);
        }

        // ==================================================================================
        // 2. HÀM PUBLIC: CHỈ NHÂN BẢN ROLE CÓ SCOPE LÀ USER (Quyền hạn chế)
        // ==================================================================================
        public async Task<ResponseDto<RoleResponse>> CloneRoleWhereScopeUserAsync(CloneUserRoleRequest req, CancellationToken ct)
        {
            // 1. Lấy role nguồn kèm Permissions
            var sourceRole = await _roleRepository.GetRoleWithPermissionsAsync(req.sourceRoleId, ct);

            // Validation cơ bản
            if (sourceRole == null)
            {
                return ResponseConst.Error<RoleResponse>(404, "Role nguồn không tồn tại.");
            }

            // 2. SECURITY CHECK: CHẶN NHÂN BẢN ADMIN/STAFF
            // Nếu role nguồn có scope khác "user" (tức là admin, staff...), CHẶN NGAY.
            if (sourceRole.scope != "user")
            {
                // Trả về lỗi 403 Forbidden
                return ResponseConst.Error<RoleResponse>(403, "BẢO MẬT: Bạn không được phép nhân bản Role quản trị (Admin/Staff).");
            }

            // 3. ÉP BUỘC SCOPE ĐÍCH
            // Luôn luôn là "user", bất kể tình huống nào.
            string forcedScope = "user";

            // 4. Gọi hàm xử lý chung (Tái sử dụng logic tạo và lưu DB)
            return await _processCloneRoleInternal(
                sourceRole,
                req.newRoleName,
                req.newRoleDescription,
                forcedScope,
                req.isDefault,
                ct
            );
        }

        // ==================================================================================
        // HÀM PRIVATE: XỬ LÝ LOGIC CHUNG (DB OPERATIONS)
        // ==================================================================================
        private async Task<ResponseDto<RoleResponse>> _processCloneRoleInternal(
            AuthRole sourceRole,
            string newName,
            string newDesc,
            string targetScope,
            bool isDefault,
            CancellationToken ct)
        {
            // A. Kiểm tra tên trùng
            var existingRole = await _roleRepository.GetRoleByNameAsync(newName, ct);
            if (existingRole != null)
            {
                return ResponseConst.Error<RoleResponse>(409, $"Tên Role '{newName}' đã tồn tại.");
            }

            // B. Tạo Entity mới
            var newRole = new AuthRole
            {
                roleName = newName,
                roleDescription = newDesc,
                scope = targetScope, // Scope đã được kiểm duyệt từ hàm gọi
                isDefault = isDefault,
                rolePermissions = new List<AuthRolePermission>()
            };

            // C. Copy Permissions từ Role nguồn sang Role mới
            if (sourceRole.rolePermissions != null && sourceRole.rolePermissions.Any())
            {
                foreach (var rp in sourceRole.rolePermissions)
                {
                    newRole.rolePermissions.Add(new AuthRolePermission
                    {
                        permissionID = rp.permissionID
                        // roleID sẽ tự động sinh khi save
                    });
                }
            }

            // D. Lưu DB
            await _roleRepository.AddRoleAsync(newRole, ct);
            await _uow.SaveChangesAsync(ct);

            // E. Trả về kết quả
            return ResponseConst.Success("Nhân bản vai trò thành công", new RoleResponse
            {
                roleID = newRole.roleID,
                roleName = newRole.roleName,
                roleDescription = newRole.roleDescription,
                isDefault = newRole.isDefault,
                scope = newRole.scope
            });
        }
        public async Task<ResponseDto<List<AuthRole>>> GetAllRoleWhereScopeUser(CancellationToken ct)
        {
            var roles = await _roleRepository.GetAllRoleWhereScopeUser(ct);
            return ResponseConst.Success("Lấy danh sách vai trò với scope 'user' thành công", roles);
        }
    }
}
