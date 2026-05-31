using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.Core;
using TH.Asset.Dtos;

namespace TH.WebAPI.Controllers.Asset.Core
{
    // ════════════════════════════════════════════════════════════════════════
    // ASSET CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset")]
    public class AssetController : ControllerBase
    {
        private readonly IAssetService _service;
        public AssetController(IAssetService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateAssetDto request)
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
            [FromQuery] Guid? categoryId,
            [FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(buildingId, categoryId, status);
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
    // ASSET CATEGORY CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-category")]
    public class AssetCategoryController : ControllerBase
    {
        private readonly IAssetCategoryService _service;
        public AssetCategoryController(IAssetCategoryService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetCategoryDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateAssetCategoryDto request)
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
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET LOCATION CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-location")]
    public class AssetLocationController : ControllerBase
    {
        private readonly IAssetLocationService _service;
        public AssetLocationController(IAssetLocationService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetLocationDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateAssetLocationDto request)
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
        public async Task<IActionResult> GetAll([FromQuery] Guid? buildingId)
        {
            var result = await _service.GetAllAsync(buildingId);
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
    // ASSET QR CODE CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-qrcode")]
    public class AssetQrCodeController : ControllerBase
    {
        private readonly IAssetQrCodeService _service;
        public AssetQrCodeController(IAssetQrCodeService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetQrCodeDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAssetId(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-by-code")]
        public async Task<IActionResult> GetByQrCode([FromQuery] string qrCode)
        {
            var result = await _service.GetByQrCodeAsync(qrCode);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET TRANSFER CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-transfer")]
    public class AssetTransferController : ControllerBase
    {
        private readonly IAssetTransferService _service;
        public AssetTransferController(IAssetTransferService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetTransferDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAssetId(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET DEPRECIATION CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-depreciation")]
    public class AssetDepreciationController : ControllerBase
    {
        private readonly IAssetDepreciationService _service;
        public AssetDepreciationController(IAssetDepreciationService service) => _service = service;

        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAssetId(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get-by-period")]
        public async Task<IActionResult> GetByPeriod([FromQuery] int year, [FromQuery] int month)
        {
            var result = await _service.GetByPeriodAsync(year, month);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }
}
