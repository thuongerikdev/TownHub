using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Inventory;
using TH.Asset.Dtos;
using TH.Constant;

namespace TH.WebAPI.Controllers.Asset.Inventory
{
    // ── Request bodies cho action endpoints ──────────────────────────────────
    public record ApproveRequestBody(Guid ApprovedBy);
    public record RejectRequestBody(string Reason);
    // ConfirmedBy là Guid? người dùng thực (để null khi FE chưa có lookup user-Guid);
    // thông tin người xác nhận / mã giao dịch / ghi chú đưa vào Notes.
    public record MarkPaidRequestBody(string PaymentMethod, DateTime? PaidDate = null, string? Notes = null, Guid? ConfirmedBy = null);
    public record MarkReviewedRequestBody(Guid ReviewedBy, string? ReviewedByName = null);

    // ════════════════════════════════════════════════════════════════════════
    // WAREHOUSE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/warehouse")]
    public class WarehouseController : ControllerBase
    {
        private readonly IWarehouseService _service;
        public WarehouseController(IWarehouseService service) => _service = service;

        [Authorize(Policy = "InventoryManage")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateWarehouseDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryManage")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateWarehouseDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "InventoryManage")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] Guid? buildingId)
        {
            var result = await _service.GetAllAsync(buildingId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
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
    // MATERIAL CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/material")]
    public class MaterialController : ControllerBase
    {
        private readonly IMaterialService _service;
        public MaterialController(IMaterialService service) => _service = service;

        [Authorize(Policy = "InventoryManage")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateMaterialDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryManage")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateMaterialDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "InventoryManage")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? categoryId,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetAllAsync(categoryId, isActive);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-low-stock")]
        public async Task<IActionResult> GetLowStock([FromQuery] Guid? warehouseId)
        {
            var result = await _service.GetLowStockAsync(warehouseId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-inventory-levels")]
        public async Task<IActionResult> GetInventoryLevels(
            [FromQuery] Guid? warehouseId,
            [FromQuery] Guid? materialId)
        {
            var result = await _service.GetInventoryLevelsAsync(warehouseId, materialId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-categories")]
        public async Task<IActionResult> GetCategories()
        {
            var result = await _service.GetCategoriesAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // INVENTORY TRANSACTION CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/inventory-transaction")]
    public class InventoryTransactionController : ControllerBase
    {
        private readonly IInventoryTransactionService _service;
        public InventoryTransactionController(IInventoryTransactionService service) => _service = service;

        [Authorize(Policy = "InventoryTransaction")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateInventoryTransactionDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? warehouseId,
            [FromQuery] Guid? materialId,
            [FromQuery] string? txnType,
            [FromQuery] string? referenceType,
            [FromQuery] Guid? referenceId)
        {
            var result = await _service.GetAllAsync(warehouseId, materialId, txnType, referenceType, referenceId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
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
    // STOCK TAKE CONTROLLER (Kiểm kê kho)
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/stock-take")]
    public class StockTakeController : ControllerBase
    {
        private readonly IStockTakeService _service;
        public StockTakeController(IStockTakeService service) => _service = service;

        [Authorize(Policy = "InventoryAudit")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateStockTakeDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? warehouseId,
            [FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(warehouseId, status);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "InventoryView")]
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
    // PURCHASE REQUEST CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/purchase-request")]
    public class PurchaseRequestController : ControllerBase
    {
        private readonly IPurchaseRequestService _service;
        public PurchaseRequestController(IPurchaseRequestService service) => _service = service;

        [Authorize(Policy = "ProcurementRequest")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRequest")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdatePurchaseRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRequest")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRead")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] Guid? ticketId,
            [FromQuery] Guid? woId)
        {
            // KTV chỉ thấy phiếu đề xuất do mình lập (xem AssignmentScope).
            var result = await _service.GetAllAsync(status, ticketId, woId, User.PurchaseRequestOwnerScope());
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRead")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200)
            {
                var scope = User.PurchaseRequestOwnerScope();
                if (scope.HasValue && result.Data?.requestedByUserId != scope.Value)
                    return StatusCode(StatusCodes.Status403Forbidden,
                        ResponseConst.Error<PurchaseRequestResponse>(403, "Phiếu đề xuất này không phải của bạn."));
                return Ok(result);
            }
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRequest")]
        [HttpPut("submit/{id}")]
        public async Task<IActionResult> Submit(Guid id)
        {
            var denied = await DenyIfNotOwnPr(id);
            if (denied != null) return denied;
            var result = await _service.SubmitAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementApprove")]
        [HttpPut("approve/{id}")]
        public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveRequestBody body)
        {
            var result = await _service.ApproveAsync(id, body.ApprovedBy);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementApprove")]
        [HttpPut("reject/{id}")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequestBody body)
        {
            var result = await _service.RejectAsync(id, body.Reason);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRequest")]
        [HttpPost("add-item")]
        public async Task<IActionResult> AddItem([FromBody] CreatePurchaseRequestItemDto request)
        {
            var result = await _service.AddItemAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementRead")]
        [HttpGet("get-items/{prId}")]
        public async Task<IActionResult> GetItems(Guid prId)
        {
            var denied = await DenyIfNotOwnPr(prId);
            if (denied != null) return denied;
            var result = await _service.GetItemsAsync(prId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        /// <summary>
        /// Từ chối nếu người gọi chỉ được xem phiếu đề xuất của mình mà PR này lại của người khác.
        /// </summary>
        private async Task<IActionResult?> DenyIfNotOwnPr(Guid prId)
        {
            var scope = User.PurchaseRequestOwnerScope();
            if (!scope.HasValue) return null;

            var current = await _service.GetByIdAsync(prId);
            if (current.ErrorCode == 404) return NotFound(current);
            if (current.Data?.requestedByUserId == scope.Value) return null;

            return StatusCode(StatusCodes.Status403Forbidden,
                ResponseConst.Error<bool>(403, "Phiếu đề xuất này không phải của bạn."));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PURCHASE ORDER CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/purchase-order")]
    public class PurchaseOrderController : ControllerBase
    {
        private readonly IPurchaseOrderService _service;
        public PurchaseOrderController(IPurchaseOrderService service) => _service = service;

        [Authorize(Policy = "ProcurementOrder")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementOrder")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdatePurchaseOrderDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementOrder")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] Guid? vendorId)
        {
            var result = await _service.GetAllAsync(status, vendorId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementOrder")]
        [HttpPost("add-item")]
        public async Task<IActionResult> AddItem([FromBody] CreatePurchaseOrderItemDto request)
        {
            var result = await _service.AddItemAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get-items/{poId}")]
        public async Task<IActionResult> GetItems(Guid poId)
        {
            var result = await _service.GetItemsAsync(poId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // INVOICE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/invoice")]
    public class InvoiceController : ControllerBase
    {
        private readonly IInvoiceService _service;
        public InvoiceController(IInvoiceService service) => _service = service;

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateInvoiceDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateInvoiceDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? vendorId,
            [FromQuery] string? paymentStatus)
        {
            var result = await _service.GetAllAsync(vendorId, paymentStatus);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpPut("mark-paid/{id}")]
        public async Task<IActionResult> MarkPaid(Guid id, [FromBody] MarkPaidRequestBody body)
        {
            var result = await _service.MarkPaidAsync(id, body.PaymentMethod, body.PaidDate, body.Notes, body.ConfirmedBy);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpPost("add-item")]
        public async Task<IActionResult> AddItem([FromBody] CreateInvoiceItemDto request)
        {
            var result = await _service.AddItemAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get-items/{invoiceId}")]
        public async Task<IActionResult> GetItems(Guid invoiceId)
        {
            var result = await _service.GetItemsAsync(invoiceId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // OCR JOB CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/ocr-job")]
    public class OcrJobController : ControllerBase
    {
        private readonly IOcrJobService _service;
        public OcrJobController(IOcrJobService service) => _service = service;

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpPost("submit")]
        public async Task<IActionResult> Submit([FromBody] CreateOcrJobDto request)
        {
            var result = await _service.SubmitAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(status);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "ProcurementView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "ProcurementInvoice")]
        [HttpPut("mark-reviewed/{id}")]
        public async Task<IActionResult> MarkReviewed(Guid id, [FromBody] MarkReviewedRequestBody body)
        {
            var result = await _service.MarkReviewedAsync(id, body.ReviewedBy, body.ReviewedByName);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }
}
