using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Incident;
using TH.Asset.Dtos;

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

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateSlaConfigDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateSlaConfigDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? buildingId,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetAllAsync(buildingId, isActive);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

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

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateTicketDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateTicketDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? buildingId,
            [FromQuery] string? status,
            [FromQuery] Guid? reportedBy)
        {
            var result = await _service.GetAllAsync(buildingId, status, reportedBy);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPost("change-status")]
        public async Task<IActionResult> ChangeStatus([FromBody] CreateTicketStatusHistoryDto request)
        {
            var result = await _service.ChangeStatusAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] CreateTicketAssignmentDto request)
        {
            var result = await _service.AssignAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPost("add-attachment")]
        public async Task<IActionResult> AddAttachment([FromBody] CreateTicketAttachmentDto request)
        {
            var result = await _service.AddAttachmentAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPost("rate")]
        public async Task<IActionResult> Rate([FromBody] CreateTicketRatingDto request)
        {
            var result = await _service.RateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-status-history/{ticketId}")]
        public async Task<IActionResult> GetStatusHistory(Guid ticketId)
        {
            var result = await _service.GetStatusHistoryAsync(ticketId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get-escalation-logs/{ticketId}")]
        public async Task<IActionResult> GetEscalationLogs(Guid ticketId)
        {
            var result = await _service.GetEscalationLogsAsync(ticketId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }
}
