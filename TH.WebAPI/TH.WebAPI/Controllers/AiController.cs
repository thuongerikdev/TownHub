using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.WebAPI.Ai;

namespace TH.WebAPI.Controllers
{
    /// <summary>
    /// Trợ lý AI trong ứng dụng TownHub. Người dùng đã đăng nhập gửi hội thoại,
    /// server gọi Claude (có công cụ tra cứu dữ liệu) và trả lời.
    /// </summary>
    [ApiController]
    [Route("api/ai")]
    [Authorize]
    public sealed class AiController : ControllerBase
    {
        private readonly IAiChatService _chat;
        public AiController(IAiChatService chat) => _chat = chat;

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] AiChatRequest request, CancellationToken ct)
        {
            if (request?.messages == null || request.messages.Count == 0)
                return BadRequest(new { errorCode = 400, errorMessage = "Thiếu nội dung hội thoại." });

            var result = await _chat.ChatAsync(request, ct);
            return Ok(new { errorCode = 200, errorMessage = "OK", data = result });
        }
    }
}
