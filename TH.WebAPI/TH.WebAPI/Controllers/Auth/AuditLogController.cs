using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Auth.ApplicationService.Service.MFA;

namespace TH.WebAPI.Controllers.Auth
{

    [Route("auditlogs")]
    [ApiController]
    [Authorize(Policy = "AuditLogManage")]
    public class AuditLogController : Controller
    {
        private readonly IAuthAuditLogService _auditLogService;
        public AuditLogController(IAuthAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }
        [HttpGet("getall")]
        public async Task<IActionResult> GetAllAuditLogs(CancellationToken ct)
        {
            var result = await _auditLogService.GetAllLogsAsync(ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpGet("getbyid/{id}")]
        public async Task<IActionResult> GetAuditLogById(int id, CancellationToken ct)
        {
            var result = await _auditLogService.GetLogsByID(id, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpGet("getbyuser/{userId}")]
        public async Task<IActionResult> GetAuditLogsByUserId(int userId, CancellationToken ct)
        {
            var result = await _auditLogService.GetLogsByUserIdAsync(userId, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

    }
}
