using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Auth.ApplicationService.Service.Role;
using TH.Auth.Dtos.Role;

namespace TH.WebAPI.Controllers.Auth
{
    [Route("permissions")]
    [ApiController]
    public class PermissionController : Controller
    {
        private readonly IAuthPermissionService _permissionService;
        public PermissionController(IAuthPermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        [HttpPost("BulkCreate")]
        [Authorize(Policy = "PermissionManage")]

        public async Task<IActionResult> BulkCreatePermissionsAsync(List<CreatePermissionScopeUserRequestDto> reqs, CancellationToken ct)
        {
            try
            {
                var results = await _permissionService.CreatePermissionAsyncWhereScopeUser(reqs, ct);
                return Ok(results);

            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { ErrorCode = 400, ex.Message });
            }
        }

        [HttpPut("updatePermission")]
        [Authorize(Policy = "PermissionManage")]
        public async Task<IActionResult> UpdatePermissionAsync(UpdatePermissionScopeUserRequestDto req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _permissionService.UpdatePermissionAsyncWhereScopeUser(req, ct);
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
        [HttpDelete("delete")]
        [Authorize(Policy = "PermissionManage")]
        public async Task<IActionResult> DeletePermissionAsync([FromQuery] int permissionId, CancellationToken ct)
        {
            try
            {
                var result = await _permissionService.DeletePermissionAsyncWhereScopeUser(permissionId, ct);
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


        [HttpGet("getall")]
        [Authorize(Policy = "PermissionRead")]
        public async Task<IActionResult> GetAllPermissions(CancellationToken ct)
        {
            var result = await _permissionService.GetAllPermissionsAsynWhereScopeUserc(ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("getbyid/{permissionId}")]
        [Authorize(Policy = "PermissionRead")]
        public async Task<IActionResult> GetPermissionByIdAsync(int permissionId, CancellationToken ct)
        {
            var result = await _permissionService.GetPermissionByIdAsyncWhereScopeUser(permissionId, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpGet("getbyUserID/{ID}")]
        [Authorize(Policy = "PermissionRead")]
        public async Task<IActionResult> GetPermissionByCodeAsync(int ID, CancellationToken ct)
        {
            var result = await _permissionService.GetPermissionsByUserIdAsyncWhereScopeUser(ID, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("getbyRoleID/{ID}")]
        [Authorize(Policy = "PermissionRead")]
        public async Task<IActionResult> GetPermissionByRoleIdAsync(int ID, CancellationToken ct)
        {
            var result = await _permissionService.GettPermissionByRoleIdAsyncWhereScopeUser(ID, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("admin/getall")]
        [Authorize(Policy = "PermissionReadAdmin")]
        public async Task<IActionResult> GetAllPermissionsAdmin(CancellationToken ct)
        {
            var result = await _permissionService.GetAllPermissionsAsync(ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

        [HttpGet("admin/getbyid/{permissionId}")]
        [Authorize(Policy = "PermissionReadAdmin")]
        public async Task<IActionResult> GetPermissionByIdAsyncAdmin(int permissionId, CancellationToken ct)
        {
            var result = await _permissionService.GetPermissionByIdAsync(permissionId, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpGet("admin/getbyUserID/{ID}")]
        [Authorize(Policy = "PermissionReadAdmin")]
        public async Task<IActionResult> GetPermissionByCodeAsyncAdmin(int ID, CancellationToken ct)
        {
            var result = await _permissionService.GetPermissionsByUserIdAsync(ID, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpGet("admin/getbyRoleID/{ID}")]
        [Authorize(Policy = "PermissionReadAdmin")]
        public async Task<IActionResult> GetPermissionByRoleIdAsyncAdmin(int ID, CancellationToken ct)
        {
            var result = await _permissionService.GetPermissionByRoleIdAsync(ID, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }





        [HttpPost("admin/BulkCreate")]
        [Authorize(Policy = "PermissionManageAdmin")]

        public async Task<IActionResult> AdminBulkCreatePermissionsAsync(List<CreatePermissionRequestDto> reqs, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            var results = new List<object>();
            foreach (var req in reqs)
            {
                try
                {
                    var result = await _permissionService.CreatePermissionAsync(req, ct);
                    if (result.ErrorCode != 200)
                    {
                        results.Add(new { Request = req, Result = result });
                    }
                    else
                    {
                        results.Add(new { Request = req, Result = result });
                    }
                }
                catch (InvalidOperationException ex)
                {
                    results.Add(new { Request = req, Error = ex.Message });
                }
            }
            return Ok(results);
        }
        [HttpPost("admin/addPermission")]
        [Authorize(Policy = "PermissionManageAdmin")]
        public async Task<IActionResult> AdminAddPermissionAsync(CreatePermissionRequestDto req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _permissionService.CreatePermissionAsync(req, ct);
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

        [HttpPut("admin/updatePermission")]
        [Authorize(Policy = "PermissionManageAdmin")]
        public async Task<IActionResult> AdminUpdatePermissionAsync(UpdatePermissionRequestDto req, CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var result = await _permissionService.UpdatePermissionAsync(req, ct);
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
        [HttpDelete("admin/delete")]
        [Authorize(Policy = "PermissionManageAdmin")]
        public async Task<IActionResult> AdminDeletePermissionAsync([FromQuery] int permissionId, CancellationToken ct)
        {
            try
            {
                var result = await _permissionService.DeletePermissionAsync(permissionId, ct);
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

        //Task<ResponseDto<AuthPermission>> GetPermissionByNameAsyncWhereScopeUser(string permissionName, CancellationToken ct);
        //Task<ResponseDto<List<AuthPermission>>> GetAllPermissionsAsynWhereScopeUserc(CancellationToken ct);
        //Task<ResponseDto<List<AuthPermission>>> GettPermissionByRoleIdAsyncWhereScopeUser(int roleId, CancellationToken ct);
        //Task<ResponseDto<AuthPermission>> GetPermissionByIdAsyncWhereScopeUser(int permissionId, CancellationToken ct);
    }
}
