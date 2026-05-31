using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Vendor;
using TH.Asset.Dtos;

namespace TH.WebAPI.Controllers.Asset.Vendor
{
    // ── Request bodies cho action endpoints ──────────────────────────────────
    public record BlacklistRequestBody(string Reason, Guid BlacklistedBy);

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/vendor")]
    public class VendorController : ControllerBase
    {
        private readonly IVendorService _service;
        public VendorController(IVendorService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateVendorDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateVendorDto request)
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
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(status);
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

        [HttpPut("blacklist/{id}")]
        public async Task<IActionResult> Blacklist(Guid id, [FromBody] BlacklistRequestBody body)
        {
            var result = await _service.BlacklistAsync(id, body.Reason, body.BlacklistedBy);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPut("activate/{id}")]
        public async Task<IActionResult> Activate(Guid id)
        {
            var result = await _service.ActivateAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR CONTRACT CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/vendor-contract")]
    public class VendorContractController : ControllerBase
    {
        private readonly IVendorContractService _service;
        public VendorContractController(IVendorContractService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateVendorContractDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateVendorContractDto request)
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
            [FromQuery] Guid? vendorId,
            [FromQuery] Guid? buildingId,
            [FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(vendorId, buildingId, status);
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

        [HttpGet("get-expiring")]
        public async Task<IActionResult> GetExpiring([FromQuery] int daysAhead = 30)
        {
            var result = await _service.GetExpiringAsync(daysAhead);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR CONTRACT SERVICE (line items) CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/vendor-contract-service")]
    public class VendorContractServiceController : ControllerBase
    {
        private readonly IVendorContractServiceService _service;
        public VendorContractServiceController(IVendorContractServiceService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateVendorContractServiceDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateVendorContractServiceDto request)
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

        [HttpGet("get-by-contract/{contractId}")]
        public async Task<IActionResult> GetByContract(Guid contractId)
        {
            var result = await _service.GetByContractAsync(contractId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR EVALUATION CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/vendor-evaluation")]
    public class VendorEvaluationController : ControllerBase
    {
        private readonly IVendorEvaluationService _service;
        public VendorEvaluationController(IVendorEvaluationService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateVendorEvaluationDto request)
        {
            var result = await _service.CreateAsync(request);
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

        [HttpGet("get-by-vendor/{vendorId}")]
        public async Task<IActionResult> GetByVendor(Guid vendorId)
        {
            var result = await _service.GetByVendorAsync(vendorId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-by-contract/{contractId}")]
        public async Task<IActionResult> GetByContract(Guid contractId)
        {
            var result = await _service.GetByContractAsync(contractId);
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
    }
}
