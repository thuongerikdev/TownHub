using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using TH.Base.Domain.Entities;
using TH.Constant;
using TH.TownHub.Infrastructure.Database;

namespace TH.TownHub.WebAPI.Controllers
{
    // Danh mục Tầng thuộc Toà nhà (master data ở Base). 1 toà có nhiều tầng, 1 tầng có nhiều căn hộ.
    // Apartment/AssetLocation lưu floorId (Guid) tham chiếu cross-service, không nối FK.
    public record CreateFloorBody(Guid buildingId, int floorNumber, string floorName, string? floorType);
    public record UpdateFloorBody(Guid id, Guid buildingId, int floorNumber, string floorName, string? floorType);

    [ApiController]
    [Route("api/floor")]
    public class FloorController : ControllerBase
    {
        private readonly TownHubDbContext _db;
        public FloorController(TownHubDbContext db) => _db = db;

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] Guid? buildingId)
        {
            var query = _db.Floors.AsQueryable();
            if (buildingId.HasValue) query = query.Where(x => x.buildingId == buildingId.Value);
            var data = await query
                .OrderBy(x => x.buildingId).ThenBy(x => x.floorNumber)
                .Select(x => new { x.id, x.buildingId, x.floorNumber, x.floorName, x.floorType })
                .ToListAsync();
            return Ok(ResponseConst.Success("Lấy danh sách tầng thành công.", data));
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var f = await _db.Floors
                .Where(x => x.id == id)
                .Select(x => new { x.id, x.buildingId, x.floorNumber, x.floorName, x.floorType })
                .FirstOrDefaultAsync();
            if (f == null) return NotFound(ResponseConst.Error<object>(404, "Không tìm thấy tầng."));
            return Ok(ResponseConst.Success("Lấy chi tiết tầng thành công.", (object)f));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateFloorBody body)
        {
            if (body.buildingId == Guid.Empty) return BadRequest(ResponseConst.Error<bool>(400, "Chọn toà nhà."));
            if (string.IsNullOrWhiteSpace(body.floorName)) return BadRequest(ResponseConst.Error<bool>(400, "Nhập tên tầng."));
            if (await _db.Floors.AnyAsync(x => x.buildingId == body.buildingId && x.floorNumber == body.floorNumber))
                return BadRequest(ResponseConst.Error<bool>(400, $"Tầng {body.floorNumber} đã tồn tại trong toà nhà này."));

            _db.Floors.Add(new Floor
            {
                buildingId = body.buildingId,
                floorNumber = body.floorNumber,
                floorName = body.floorName.Trim(),
                floorType = body.floorType
            });
            await _db.SaveChangesAsync();
            return Ok(ResponseConst.Success("Thêm tầng thành công.", true));
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateFloorBody body)
        {
            var entity = await _db.Floors.FirstOrDefaultAsync(x => x.id == body.id);
            if (entity == null) return NotFound(ResponseConst.Error<bool>(404, "Không tìm thấy tầng."));
            if (string.IsNullOrWhiteSpace(body.floorName)) return BadRequest(ResponseConst.Error<bool>(400, "Nhập tên tầng."));
            if ((entity.buildingId != body.buildingId || entity.floorNumber != body.floorNumber) &&
                await _db.Floors.AnyAsync(x => x.buildingId == body.buildingId && x.floorNumber == body.floorNumber))
                return BadRequest(ResponseConst.Error<bool>(400, $"Tầng {body.floorNumber} đã tồn tại trong toà nhà này."));

            entity.buildingId = body.buildingId;
            entity.floorNumber = body.floorNumber;
            entity.floorName = body.floorName.Trim();
            entity.floorType = body.floorType;
            await _db.SaveChangesAsync();
            return Ok(ResponseConst.Success("Cập nhật tầng thành công.", true));
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Floors.FirstOrDefaultAsync(x => x.id == id);
            if (entity == null) return NotFound(ResponseConst.Error<bool>(404, "Không tìm thấy tầng."));
            _db.Floors.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok(ResponseConst.Success("Xoá tầng thành công.", true));
        }
    }
}
