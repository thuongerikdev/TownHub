using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Auth.ApplicationService.Service.Role;
using TH.Auth.Dtos.Role;

namespace TH.WebAPI.Controllers.Auth
{
    [Route("role-permissions")]
    [ApiController]
    public class RolePermissionController : Controller
    {
        private readonly IAuthRolePermissionService _rolePermissionService;
        public RolePermissionController(IAuthRolePermissionService rolePermissionService)
        {
            _rolePermissionService = rolePermissionService;
        }
        [HttpPost("assign-permissions")]
        [Authorize(Policy = "PermissionAssign")]
        public async Task<IActionResult> AssignPermissionsToRoleAsync(RolePermissionRequestDto req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _rolePermissionService.AddUserScopeRolePermissionAsync(req, ct);
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

        [HttpPost("admin/assign-permissions")]
        [Authorize(Policy = "PermissionAssignAdmin")]
        public async Task<IActionResult> AssignPermissionsToRoleAsyncAdmin(RolePermissionRequestDto req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _rolePermissionService.AddRolePermissionAsync(req, ct);
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

    }
}
