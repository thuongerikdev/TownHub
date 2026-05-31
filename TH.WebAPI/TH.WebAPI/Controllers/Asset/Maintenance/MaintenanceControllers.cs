using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Maintenance;
using TH.Asset.Dtos;

namespace TH.WebAPI.Controllers.Asset.Maintenance
{
    // ════════════════════════════════════════════════════════════════════════
    // CHECKLIST TEMPLATE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/checklist-template")]
    public class ChecklistTemplateController : ControllerBase
    {
        private readonly IChecklistTemplateService _service;
        public ChecklistTemplateController(IChecklistTemplateService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateChecklistTemplateDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateChecklistTemplateDto request)
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
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
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

        // ── Items ─────────────────────────────────────────────────────────

        [HttpPost("add-item")]
        public async Task<IActionResult> AddItem([FromBody] CreateChecklistTemplateItemDto request)
        {
            var result = await _service.AddItemAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update-item")]
        public async Task<IActionResult> UpdateItem([FromBody] UpdateChecklistTemplateItemDto request)
        {
            var result = await _service.UpdateItemAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete-item/{itemId}")]
        public async Task<IActionResult> DeleteItem(Guid itemId)
        {
            var result = await _service.DeleteItemAsync(itemId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-items/{templateId}")]
        public async Task<IActionResult> GetItems(Guid templateId)
        {
            var result = await _service.GetItemsByTemplateAsync(templateId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // MAINTENANCE SCHEDULE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/maintenance-schedule")]
    public class MaintenanceScheduleController : ControllerBase
    {
        private readonly IMaintenanceScheduleService _service;
        public MaintenanceScheduleController(IMaintenanceScheduleService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateMaintenanceScheduleDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateMaintenanceScheduleDto request)
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
            [FromQuery] Guid? assetId,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetAllAsync(assetId, isActive);
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

        [HttpGet("get-overdue")]
        public async Task<IActionResult> GetOverdue()
        {
            var result = await _service.GetOverdueAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // WORK ORDER CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/work-order")]
    public class WorkOrderController : ControllerBase
    {
        private readonly IWorkOrderService _service;
        public WorkOrderController(IWorkOrderService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateWorkOrderDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateWorkOrderDto request)
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
            [FromQuery] Guid? assetId,
            [FromQuery] string? status,
            [FromQuery] Guid? buildingId)
        {
            var result = await _service.GetAllAsync(assetId, status, buildingId);
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

        [HttpPost("assign-technician")]
        public async Task<IActionResult> AssignTechnician([FromBody] CreateWorkOrderAssignmentDto request)
        {
            var result = await _service.AssignTechnicianAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPost("add-checklist-response")]
        public async Task<IActionResult> AddChecklistResponse([FromBody] CreateWorkOrderChecklistResponseDto request)
        {
            var result = await _service.AddChecklistResponseAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPost("add-attachment")]
        public async Task<IActionResult> AddAttachment([FromBody] CreateWorkOrderAttachmentDto request)
        {
            var result = await _service.AddAttachmentAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPost("add-material-used")]
        public async Task<IActionResult> AddMaterialUsed([FromBody] CreateWorkOrderMaterialUsedDto request)
        {
            var result = await _service.AddMaterialUsedAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }
}
