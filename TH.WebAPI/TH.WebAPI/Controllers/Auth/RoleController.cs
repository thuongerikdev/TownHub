using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Auth.ApplicationService.Service.Role;
using TH.Auth.Dtos.Role;

namespace TH.WebAPI.Controllers.Auth
{
    [Route("roles")]
    [ApiController]
    public class RoleController : Controller
    {
        private readonly IAuthRoleService _roleService;
        public RoleController(IAuthRoleService roleService)
        {
            _roleService = roleService;
        }
        [HttpGet("getall")]
        [Authorize(Policy = "RoleRead")]
        public async Task<IActionResult> GetAllRoles(CancellationToken ct)
        {
            var result = await _roleService.GetAllRolesAsync(ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpGet("getallscope-user")]
        [Authorize(Policy = "RoleRead")]
        public async Task<IActionResult> GetAllRolesWhereScopeUser(CancellationToken ct)
        {
            var result = await _roleService.GetAllRoleWhereScopeUser(ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }




        [HttpPost("addRole")]
        [Authorize(Policy = "RoleManage")]
        public async Task<IActionResult> AddRoleAsync(AddRoleWhereScopeUserRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _roleService.AddRoleAsyncWhereScopeUser(req, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }
        [HttpPut("updateRole")]
        [Authorize(Policy = "RoleManage")]
        public async Task<IActionResult> UpdateRoleAsync(UpdateRoleWhereScopeUserRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _roleService.UpdateRoleAsyncWhereScopeUser(req, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }
        [HttpDelete("deleteRole/{roleID}")]
        [Authorize(Policy = "RoleManage")]
        public async Task<IActionResult> DeleteRoleAsync(int roleID, CancellationToken ct)
        {
            try
            {
                var result = await _roleService.DeleteRoleAsyncWhereScopeUser(roleID, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }
        //Admin Role Management

        [HttpPost("admin/addRole")]
        [Authorize(Policy = "RoleManageAdmin")]
        public async Task<IActionResult> AdminAddRoleAsync(AddRoleRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _roleService.AddRoleAsync(req, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }
        [HttpPut("admin/updateRole")]
        [Authorize(Policy = "RoleManageAdmin")]
        public async Task<IActionResult> AdminUpdateRoleAsync(UpdateRoleRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _roleService.UpdateRoleAsync(req, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }
        [HttpDelete("admin/deleteRole/{roleID}")]
        [Authorize(Policy = "RoleManageAdmin")]
        public async Task<IActionResult> AdminDeleteRoleAsync(int roleID, CancellationToken ct)
        {
            try
            {
                var result = await _roleService.DeleteRoleAsync(roleID, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }

        [HttpGet("getRoleByUserID/{userID}")]
        [Authorize(Policy = "RoleRead")]
        public async Task<IActionResult> GetRoleByUserID(int userID, CancellationToken ct)
        {
            try
            {
                var result = await _roleService.GetRoleByUserID(userID, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }

        [HttpPost("clonerole")]
        [Authorize(Policy = "RoleManage")]
        public async Task<IActionResult> CloneRoleAsync(CloneUserRoleRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _roleService.CloneRoleWhereScopeUserAsync(req, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }
        [HttpPost("admin/clonerole")]
        [Authorize(Policy = "RoleManageAdmin")]
        public async Task<IActionResult> AdminCloneRoleAsync(CloneRoleRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _roleService.CloneRoleAsync(req, ct);
                if (result.ErrorCode != 200)
                {
                    return BadRequest(result);
                }
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }












        //[ApiController]
        //[Route("api/users")]
        //public class UserController : ControllerBase
        //{
        //    // Cách 1: Dùng Policy (đã định nghĩa trong AuthStartUp)
        //    // Startup: options.AddPolicy("UserCreate", p => p.RequireClaim("permission", "USER_CREATE"));
        //    [HttpPost]
        //    [Authorize(Policy = "UserCreate")]
        //    public IActionResult CreateUser()
        //    {
        //        return Ok("Created");
        //    }

        //    // Cách 2: Chặn cứng Role (Không khuyến khích bằng Permission)
        //    [HttpDelete("{id}")]
        //    [Authorize(Roles = "Admin,SuperAdmin")]
        //    public IActionResult DeleteUser(int id)
        //    {
        //        return Ok("Deleted");
        //    }

        //    // Cách 3: Kiểm tra thủ công trong code (nếu logic phức tạp)
        //    [HttpGet("complex-check")]
        //    [Authorize]
        //    public IActionResult ComplexCheck()
        //    {
        //        // User.HasClaim check trực tiếp trong ClaimsPrincipal (được bung ra từ Token)
        //        if (!User.HasClaim(c => c.Type == "permission" && c.Value == "SPECIAL_REPORT"))
        //        {
        //            return Forbid();
        //        }
        //        return Ok("Report Data");
        //    }
        //}


    }
}
