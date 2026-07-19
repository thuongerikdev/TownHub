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
    // Danh mục Toà nhà (master data ở Base). Asset lưu buildingId (Guid) tham chiếu cross-service,
    // không nối FK. Endpoint mở như các controller Base khác.
    public record CreateBuildingBody(string code, string name, int totalFloors, int totalUnits, string? managementCompany);
    public record UpdateBuildingBody(Guid id, string code, string name, int totalFloors, int totalUnits, string? managementCompany);

    [ApiController]
    [Route("api/building")]
    public class BuildingController : ControllerBase
    {
        private readonly TownHubDbContext _db;
        public BuildingController(TownHubDbContext db) => _db = db;

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.Buildings
                .OrderBy(x => x.name)
                .Select(x => new { x.id, x.code, x.name, x.totalFloors, x.totalUnits, x.managementCompany })
                .ToListAsync();
            return Ok(ResponseConst.Success("Lấy danh sách toà nhà thành công.", data));
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var b = await _db.Buildings
                .Where(x => x.id == id)
                .Select(x => new { x.id, x.code, x.name, x.totalFloors, x.totalUnits, x.managementCompany })
                .FirstOrDefaultAsync();
            if (b == null) return NotFound(ResponseConst.Error<object>(404, "Không tìm thấy toà nhà."));
            return Ok(ResponseConst.Success("Lấy chi tiết toà nhà thành công.", (object)b));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateBuildingBody body)
        {
            if (string.IsNullOrWhiteSpace(body.code) || string.IsNullOrWhiteSpace(body.name))
                return BadRequest(ResponseConst.Error<bool>(400, "Nhập mã và tên toà nhà."));
            if (await _db.Buildings.AnyAsync(x => x.code == body.code))
                return BadRequest(ResponseConst.Error<bool>(400, $"Mã toà nhà '{body.code}' đã tồn tại."));

            _db.Buildings.Add(new Building
            {
                code = body.code.Trim(),
                name = body.name.Trim(),
                totalFloors = body.totalFloors,
                totalUnits = body.totalUnits,
                managementCompany = body.managementCompany
            });
            await _db.SaveChangesAsync();
            return Ok(ResponseConst.Success("Thêm toà nhà thành công.", true));
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateBuildingBody body)
        {
            var entity = await _db.Buildings.FirstOrDefaultAsync(x => x.id == body.id);
            if (entity == null) return NotFound(ResponseConst.Error<bool>(404, "Không tìm thấy toà nhà."));
            if (string.IsNullOrWhiteSpace(body.code) || string.IsNullOrWhiteSpace(body.name))
                return BadRequest(ResponseConst.Error<bool>(400, "Nhập mã và tên toà nhà."));
            if (entity.code != body.code && await _db.Buildings.AnyAsync(x => x.code == body.code))
                return BadRequest(ResponseConst.Error<bool>(400, $"Mã toà nhà '{body.code}' đã tồn tại."));

            entity.code = body.code.Trim();
            entity.name = body.name.Trim();
            entity.totalFloors = body.totalFloors;
            entity.totalUnits = body.totalUnits;
            entity.managementCompany = body.managementCompany;
            await _db.SaveChangesAsync();
            return Ok(ResponseConst.Success("Cập nhật toà nhà thành công.", true));
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.Buildings.FirstOrDefaultAsync(x => x.id == id);
            if (entity == null) return NotFound(ResponseConst.Error<bool>(404, "Không tìm thấy toà nhà."));
            _db.Buildings.Remove(entity);
            await _db.SaveChangesAsync();
            return Ok(ResponseConst.Success("Xoá toà nhà thành công.", true));
        }
    }
}
