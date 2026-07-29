using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Incident;
using TH.Asset.Dtos;
using TH.Constant;

namespace TH.WebAPI.Controllers.Asset.Incident
{
    // ════════════════════════════════════════════════════════════════════════
    // SLA CONFIG CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/sla-config")]
    public class SlaConfigController : ControllerBase
    {
        private readonly ISlaConfigService _service;
        public SlaConfigController(ISlaConfigService service) => _service = service;

        [Authorize(Policy = "TicketCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateSlaConfigDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "TicketCreate")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateSlaConfigDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketCreate")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? buildingId,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetAllAsync(buildingId, isActive);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // TICKET CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/ticket")]
    public class TicketController : ControllerBase
    {
        private readonly ITicketService _service;
        public TicketController(ITicketService service) => _service = service;

        [Authorize(Policy = "TicketCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateTicketDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        // KTV cần PUT được để ghi nhận kết quả xử lý (→ RESOLVED, resolutionNote, resolvedAt)
        // ngay sau change-status, nên chấp nhận cả ticket.resolve chứ không chỉ ticket.create.
        [Authorize(Policy = "TicketWrite")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateTicketDto request)
        {
            // Chặn kỹ thuật viên ghi kết quả lên phiếu sự cố của người khác.
            var denied = await DenyIfNotAssigned(request.id);
            if (denied != null) return denied;

            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketCreate")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? buildingId,
            [FromQuery] string? status,
            [FromQuery] Guid? reportedBy)
        {
            // Kỹ thuật viên chỉ thấy phiếu sự cố được phân công cho mình (xem AssignmentScope).
            var result = await _service.GetAllAsync(buildingId, status, reportedBy, User.TicketOwnerScope());
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200)
            {
                var scope = User.TicketOwnerScope();
                if (scope.HasValue && result.Data?.assignedToUserId != scope.Value)
                    return StatusCode(StatusCodes.Status403Forbidden,
                        ResponseConst.Error<TicketResponse>(403, "Phiếu sự cố này không được phân công cho bạn."));
                return Ok(result);
            }
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketResolve")]
        [HttpPost("change-status")]
        public async Task<IActionResult> ChangeStatus([FromBody] CreateTicketStatusHistoryDto request)
        {
            var denied = await DenyIfNotAssigned(request.ticketId);
            if (denied != null) return denied;
            var result = await _service.ChangeStatusAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketAssign")]
        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] CreateTicketAssignmentDto request)
        {
            var result = await _service.AssignAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketResolve")]
        [HttpPost("add-attachment")]
        public async Task<IActionResult> AddAttachment([FromBody] CreateTicketAttachmentDto request)
        {
            var denied = await DenyIfNotAssigned(request.ticketId);
            if (denied != null) return denied;
            var result = await _service.AddAttachmentAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketClose")]
        [HttpPost("rate")]
        public async Task<IActionResult> Rate([FromBody] CreateTicketRatingDto request)
        {
            var result = await _service.RateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get-status-history/{ticketId}")]
        public async Task<IActionResult> GetStatusHistory(Guid ticketId)
        {
            var denied = await DenyIfNotAssigned(ticketId);
            if (denied != null) return denied;
            var result = await _service.GetStatusHistoryAsync(ticketId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get-escalation-logs/{ticketId}")]
        public async Task<IActionResult> GetEscalationLogs(Guid ticketId)
        {
            var denied = await DenyIfNotAssigned(ticketId);
            if (denied != null) return denied;
            var result = await _service.GetEscalationLogsAsync(ticketId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "TicketView")]
        [HttpGet("get-attachments/{ticketId}")]
        public async Task<IActionResult> GetAttachments(Guid ticketId)
        {
            var denied = await DenyIfNotAssigned(ticketId);
            if (denied != null) return denied;
            var result = await _service.GetAttachmentsAsync(ticketId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Trả về response từ chối nếu người gọi bị giới hạn theo phân công mà phiếu
        /// <paramref name="ticketId"/> lại không phải của họ; null nghĩa là được đi tiếp.
        /// </summary>
        private async Task<IActionResult?> DenyIfNotAssigned(Guid ticketId)
        {
            var scope = User.TicketOwnerScope();
            if (!scope.HasValue) return null;

            var current = await _service.GetByIdAsync(ticketId);
            if (current.ErrorCode == 404) return NotFound(current);
            if (current.Data?.assignedToUserId == scope.Value) return null;

            return StatusCode(StatusCodes.Status403Forbidden,
                ResponseConst.Error<bool>(403, "Phiếu sự cố này không được phân công cho bạn."));
        }
    }
}
