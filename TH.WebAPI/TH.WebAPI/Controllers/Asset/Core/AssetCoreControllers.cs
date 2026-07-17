using Microsoft.AspNetCore.Authorization;
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

        [Authorize(Policy = "AssetCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetUpdate")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateAssetDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetDelete")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? buildingId,
            [FromQuery] Guid? categoryId,
            [FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(buildingId, categoryId, status);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
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

        [Authorize(Policy = "AssetCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetCategoryDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetUpdate")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateAssetCategoryDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetDelete")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
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

        [Authorize(Policy = "AssetCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetLocationDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetUpdate")]
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateAssetLocationDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetDelete")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] Guid? buildingId)
        {
            var result = await _service.GetAllAsync(buildingId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
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

        [Authorize(Policy = "AssetCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetQrCodeDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetDelete")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAssetId(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
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

        [Authorize(Policy = "AssetCreate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetTransferDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
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

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAssetId(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-by-period")]
        public async Task<IActionResult> GetByPeriod([FromQuery] int year, [FromQuery] int month)
        {
            var result = await _service.GetByPeriodAsync(year, month);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetUpdate")]
        [HttpPost("run-period")]
        public async Task<IActionResult> RunPeriod([FromBody] RunDepreciationDto request)
        {
            var result = await _service.RunDepreciationForPeriodAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET DOCUMENT CONTROLLER (chứng từ kế toán)
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-document")]
    public class AssetDocumentController : ControllerBase
    {
        private readonly IAssetDocumentService _service;
        public AssetDocumentController(IAssetDocumentService service) => _service = service;

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? documentType)
        {
            var result = await _service.GetAllAsync(documentType);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAsset(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET DISPOSAL CONTROLLER (thanh lý)
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-disposal")]
    public class AssetDisposalController : ControllerBase
    {
        private readonly IAssetDisposalService _service;
        public AssetDisposalController(IAssetDisposalService service) => _service = service;

        [Authorize(Policy = "AssetUpdate")]
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateAssetDisposalDto request)
        {
            var result = await _service.CreateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAsset(Guid assetId)
        {
            var result = await _service.GetByAssetIdAsync(assetId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET REPORT CONTROLLER — Sổ kế toán & báo cáo (Nhật ký chung, Sổ cái,
    // Bảng cân đối SPS, Sổ TSCĐ, Báo cáo tăng/giảm TSCĐ)
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/asset-report")]
    public class AssetReportController : ControllerBase
    {
        private readonly IAssetReportService _service;
        public AssetReportController(IAssetReportService service) => _service = service;

        [Authorize(Policy = "AssetView")]
        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts()
        {
            var result = await _service.GetAccountsAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("journal")]
        public async Task<IActionResult> GetJournal(
            [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? account)
        {
            var result = await _service.GetJournalAsync(from, to, account);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("ledger")]
        public async Task<IActionResult> GetLedger(
            [FromQuery] string account, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var result = await _service.GetLedgerAsync(account, from, to);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 400) return BadRequest(result);
            return BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("trial-balance")]
        public async Task<IActionResult> GetTrialBalance([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var result = await _service.GetTrialBalanceAsync(from, to);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("asset-register")]
        public async Task<IActionResult> GetAssetRegister()
        {
            var result = await _service.GetAssetRegisterAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [Authorize(Policy = "AssetView")]
        [HttpGet("movement")]
        public async Task<IActionResult> GetMovement([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var result = await _service.GetAssetMovementAsync(from, to);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }
}
