using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Service.Mcp;
using TH.Auth.Dtos.Mcp;

namespace TH.WebAPI.Controllers.Auth
{
    /// <summary>
    /// Sinh & quản lý mã MCP dài hạn cho user đang đăng nhập.
    /// Token chỉ hiển thị MỘT LẦN khi tạo; sau đó chỉ xem được metadata.
    /// </summary>
    [ApiController]
    [Route("api/mcp-token")]
    [Authorize]
    public sealed class McpTokenController : ControllerBase
    {
        private readonly IMcpTokenService _service;
        public McpTokenController(IMcpTokenService service) => _service = service;

        private int CurrentUserId()
            => int.TryParse(User.FindFirstValue("userId"), out var id) ? id : 0;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateMcpTokenDto request)
        {
            var userId = CurrentUserId();
            if (userId == 0) return Unauthorized();

            var result = await _service.CreateAsync(userId, request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("mine")]
        public async Task<IActionResult> Mine()
        {
            var userId = CurrentUserId();
            if (userId == 0) return Unauthorized();

            return Ok(await _service.GetMineAsync(userId));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Revoke(string id)
        {
            var userId = CurrentUserId();
            if (userId == 0) return Unauthorized();

            var result = await _service.RevokeAsync(userId, id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }
}
