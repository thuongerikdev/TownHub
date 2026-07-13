using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Constant;
using TH.TownHub.ApplicationService.Service;
using TH.TownHub.Dtos;

namespace TH.TownHub.WebAPI.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/access-control")]
    public class AccessControlController : ControllerBase
    {
        private readonly IAccessControlService _service;
        public AccessControlController(IAccessControlService service) => _service = service;

        [HttpPost("faces/register")]
        public async Task<IActionResult> RegisterFace(RegisterFaceRequestDto request) => ToResult(await _service.RegisterFaceAsync(request));

        [HttpGet("faces/{residentId:int}")]
        public async Task<IActionResult> GetFace(int residentId) => ToResult(await _service.GetFaceAsync(residentId));

        [HttpDelete("faces/{residentId:int}")]
        public async Task<IActionResult> DeleteFace(int residentId) => ToResult(await _service.DeleteFaceAsync(residentId));

        [HttpPut("faces/{residentId:int}/ai-result")]
        public async Task<IActionResult> UpdateAiResult(int residentId, UpdateFaceAiResultRequestDto request) =>
            ToResult(await _service.UpdateFaceAiResultAsync(residentId, request));

        [HttpPost("events")]
        public async Task<IActionResult> CreateEvent(CreateAccessEventRequestDto request) => ToResult(await _service.CreateEventAsync(request));

        [HttpGet("events")]
        public async Task<IActionResult> GetEvents(string? personType, string? status, string? direction) =>
            ToResult(await _service.GetEventsAsync(personType, status, direction));

        [HttpPut("events/{id:long}/handle")]
        public async Task<IActionResult> HandleEvent(long id, HandleAccessEventRequestDto request) =>
            ToResult(await _service.HandleEventAsync(id, request));

        [HttpDelete("events/{id:long}")]
        public async Task<IActionResult> DeleteEvent(long id) =>
            ToResult(await _service.DeleteEventAsync(id));

        [HttpPost("camera/analyze")]
        [RequestSizeLimit(5_000_000)]
        public async Task<IActionResult> AnalyzeFrame(AnalyzeCameraFrameRequestDto request) =>
            ToResult(await _service.AnalyzeFrameAsync(request));

        private IActionResult ToResult<T>(ResponseDto<T> result) => result.ErrorCode switch
        {
            200 => Ok(result),
            404 => NotFound(result),
            503 => StatusCode(StatusCodes.Status503ServiceUnavailable, result),
            _ => BadRequest(result)
        };
    }
}
