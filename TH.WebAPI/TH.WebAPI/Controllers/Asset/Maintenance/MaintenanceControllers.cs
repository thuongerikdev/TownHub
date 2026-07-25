using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Maintenance;
using TH.Asset.Dtos;
using TH.Constant;

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

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateChecklistTemplateDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateChecklistTemplateDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // ── Items ─────────────────────────────────────────────────────────

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPost("add-item")]
        public async Task<IActionResult> AddItem([FromBody] CreateChecklistTemplateItemDto request)
        {
            var result = await _service.AddItemAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPut("update-item")]
        public async Task<IActionResult> UpdateItem([FromBody] UpdateChecklistTemplateItemDto request)
        {
            var result = await _service.UpdateItemAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpDelete("delete-item/{itemId}")]
        public async Task<IActionResult> DeleteItem(Guid itemId)
        {
            var result = await _service.DeleteItemAsync(itemId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
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

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateMaintenanceScheduleDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateMaintenanceScheduleDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? assetId,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetAllAsync(assetId, isActive);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
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

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateWorkOrderDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        // KTV cần PUT được để check-in (→ IN_PROGRESS) và nộp nghiệm thu (→ PENDING_REVIEW),
        // nên chấp nhận cả workorder.execute chứ không chỉ workorder.create.
        [Authorize(Policy = "WorkOrderWrite")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateWorkOrderDto request)
        {
            // Kỹ thuật viên chỉ được thao tác trên phiếu của mình — nếu không chặn ở đây
            // thì WorkOrderWrite sẽ cho phép họ đẩy trạng thái phiếu của người khác.
            var denied = await DenyIfNotAssigned(request.id);
            if (denied != null) return denied;

            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderCreate")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? assetId,
            [FromQuery] string? status,
            [FromQuery] Guid? buildingId)
        {
            // Kỹ thuật viên chỉ thấy phiếu được phân công cho mình (xem AssignmentScope).
            var result = await _service.GetAllAsync(assetId, status, buildingId, User.WorkOrderOwnerScope());
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200)
            {
                var scope = User.WorkOrderOwnerScope();
                if (scope.HasValue && result.Data?.assignedToUserId != scope.Value)
                    return StatusCode(StatusCodes.Status403Forbidden,
                        ResponseConst.Error<WorkOrderResponse>(403, "Phiếu công việc này không được phân công cho bạn."));
                return Ok(result);
            }
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderAssign")]
        [HttpPost("assign-technician")]
        public async Task<IActionResult> AssignTechnician([FromBody] CreateWorkOrderAssignmentDto request)
        {
            var result = await _service.AssignTechnicianAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderExecute")]
        [HttpPost("add-checklist-response")]
        public async Task<IActionResult> AddChecklistResponse([FromBody] CreateWorkOrderChecklistResponseDto request)
        {
            var denied = await DenyIfNotAssigned(request.woId);
            if (denied != null) return denied;
            var result = await _service.AddChecklistResponseAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderExecute")]
        [HttpPost("add-attachment")]
        public async Task<IActionResult> AddAttachment([FromBody] CreateWorkOrderAttachmentDto request)
        {
            var denied = await DenyIfNotAssigned(request.woId);
            if (denied != null) return denied;
            var result = await _service.AddAttachmentAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderView")]
        [HttpGet("get-attachments/{woId}")]
        public async Task<IActionResult> GetAttachments(Guid woId)
        {
            var denied = await DenyIfNotAssigned(woId);
            if (denied != null) return denied;
            var result = await _service.GetAttachmentsAsync(woId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "WorkOrderExecute")]
        [HttpPost("add-material-used")]
        public async Task<IActionResult> AddMaterialUsed([FromBody] CreateWorkOrderMaterialUsedDto request)
        {
            var denied = await DenyIfNotAssigned(request.woId);
            if (denied != null) return denied;
            var result = await _service.AddMaterialUsedAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Trả về response từ chối nếu người gọi bị giới hạn theo phân công mà phiếu
        /// <paramref name="woId"/> lại không phải của họ; null nghĩa là được đi tiếp.
        /// </summary>
        private async Task<IActionResult?> DenyIfNotAssigned(Guid woId)
        {
            var scope = User.WorkOrderOwnerScope();
            if (!scope.HasValue) return null;

            var current = await _service.GetByIdAsync(woId);
            if (current.ErrorCode == 404) return NotFound(current);
            if (current.Data?.assignedToUserId == scope.Value) return null;

            return StatusCode(StatusCodes.Status403Forbidden,
                ResponseConst.Error<bool>(403, "Phiếu công việc này không được phân công cho bạn."));
        }
    }
}
