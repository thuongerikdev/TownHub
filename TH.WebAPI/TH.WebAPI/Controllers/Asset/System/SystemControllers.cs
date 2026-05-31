using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Service.System;
using TH.Asset.Dtos;

namespace TH.WebAPI.Controllers.Asset.System
{
    // ── Request bodies ────────────────────────────────────────────────────────
    public record CreateKpiSnapshotRequestBody(Guid BuildingId, DateTime SnapshotDate, string KpiDataJson);

    // ════════════════════════════════════════════════════════════════════════
    // KPI SNAPSHOT CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/kpi-snapshot")]
    public class KpiSnapshotController : ControllerBase
    {
        private readonly IKpiSnapshotService _service;
        public KpiSnapshotController(IKpiSnapshotService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateKpiSnapshotRequestBody body)
        {
            var result = await _service.CreateAsync(body.BuildingId, body.SnapshotDate, body.KpiDataJson);
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

        [HttpGet("get-by-building/{buildingId}")]
        public async Task<IActionResult> GetByBuilding(Guid buildingId, [FromQuery] int take = 90)
        {
            var result = await _service.GetByBuildingAsync(buildingId, take);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get-by-date-range")]
        public async Task<IActionResult> GetByDateRange(
            [FromQuery] Guid buildingId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            var result = await _service.GetByDateRangeAsync(buildingId, from, to);
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
    }

    // ════════════════════════════════════════════════════════════════════════
    // COST TRACKING CONTROLLER
    // ════════════════════════════════════════════════════════════════════════
    [ApiController]
    [Route("api/asset/cost-tracking")]
    public class CostTrackingController : ControllerBase
    {
        private readonly ICostTrackingService _service;
        public CostTrackingController(ICostTrackingService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateCostTrackingDto request)
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

        [HttpGet("get-by-reference")]
        public async Task<IActionResult> GetByReference(
            [FromQuery] string referenceType,
            [FromQuery] Guid referenceId)
        {
            var result = await _service.GetByReferenceAsync(referenceType, referenceId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get-by-building/{buildingId}")]
        public async Task<IActionResult> GetByBuilding(
            Guid buildingId,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] string? costType)
        {
            var result = await _service.GetByBuildingAsync(buildingId, from, to, costType);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get-by-asset/{assetId}")]
        public async Task<IActionResult> GetByAsset(Guid assetId)
        {
            var result = await _service.GetByAssetAsync(assetId);
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
