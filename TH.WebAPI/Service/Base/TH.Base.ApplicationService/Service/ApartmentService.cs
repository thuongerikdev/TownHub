using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Constant;
using TH.TownHub.ApplicationService.Common;
using TH.TownHub.Domain.Entities;
using TH.TownHub.Dtos;
using TH.TownHub.Infrastructure.Database;

namespace TH.TownHub.ApplicationService.Service
{
    public interface IApartmentService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateApartmentRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateApartmentRequestDto request);
        Task<ResponseDto<bool>> DeleteAsync(int id);
        Task<ResponseDto<List<ApartmentResponse>>> GetAllAsync(string? building = null, string? status = null);
        Task<ResponseDto<ApartmentResponse>> GetByIdAsync(int id);
    }

    public class ApartmentService : TownHubServiceBase, IApartmentService
    {
        public ApartmentService(ILogger<ApartmentService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateApartmentRequestDto request)
        {
            try
            {
                var isExist = await _dbContext.Apartments.AnyAsync(x => x.Code == request.code);
                if (isExist)
                    return ResponseConst.Error<bool>(400, "Mã căn hộ đã tồn tại.");

                var entity = new Apartment
                {
                    Code = request.code,
                    Building = request.building,
                    Floor = request.floor,
                    UnitNumber = request.unitNumber,
                    Type = request.type,
                    AreaM2 = request.areaM2,
                    Status = request.status,
                    Note = request.note
                };

                _dbContext.Apartments.Add(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Thêm căn hộ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo căn hộ.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateApartmentRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Apartments.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy căn hộ.");

                if (entity.Code != request.code)
                {
                    var isExist = await _dbContext.Apartments.AnyAsync(x => x.Code == request.code);
                    if (isExist)
                        return ResponseConst.Error<bool>(400, "Mã căn hộ mới đã tồn tại.");
                }

                entity.Code = request.code;
                entity.Building = request.building;
                entity.Floor = request.floor;
                entity.UnitNumber = request.unitNumber;
                entity.Type = request.type;
                entity.AreaM2 = request.areaM2;
                entity.Status = request.status;
                entity.Note = request.note;
                entity.UpdatedAt = DateTime.UtcNow;

                _dbContext.Apartments.Update(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Cập nhật căn hộ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật căn hộ. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(int id)
        {
            try
            {
                var entity = await _dbContext.Apartments.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy căn hộ.");

                var hasResidents = await _dbContext.Residents.AnyAsync(x => x.ApartmentId == id);
                if (hasResidents)
                    return ResponseConst.Error<bool>(400, "Không thể xóa căn hộ đang có cư dân.");

                var hasFees = await _dbContext.Fees.AnyAsync(x => x.ApartmentId == id);
                if (hasFees)
                    return ResponseConst.Error<bool>(400, "Không thể xóa căn hộ đang có dữ liệu phí.");

                _dbContext.Apartments.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa căn hộ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa căn hộ. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<ApartmentResponse>>> GetAllAsync(string? building = null, string? status = null)
        {
            try
            {
                var query = _dbContext.Apartments.AsQueryable();

                if (!string.IsNullOrEmpty(building))
                    query = query.Where(x => x.Building == building);

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(x => x.Status == status);

                var result = await query
                    .OrderBy(x => x.Building).ThenBy(x => x.Floor).ThenBy(x => x.UnitNumber)
                    .Select(x => new ApartmentResponse
                    {
                        id = x.Id,
                        code = x.Code,
                        building = x.Building,
                        floor = x.Floor,
                        unitNumber = x.UnitNumber,
                        type = x.Type,
                        areaM2 = x.AreaM2,
                        status = x.Status,
                        note = x.Note,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách căn hộ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách căn hộ.");
                return ResponseConst.Error<List<ApartmentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ApartmentResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.Apartments
                    .Where(x => x.Id == id)
                    .Select(x => new ApartmentResponse
                    {
                        id = x.Id,
                        code = x.Code,
                        building = x.Building,
                        floor = x.Floor,
                        unitNumber = x.UnitNumber,
                        type = x.Type,
                        areaM2 = x.AreaM2,
                        status = x.Status,
                        note = x.Note,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ApartmentResponse>(404, "Không tìm thấy căn hộ.");

                return ResponseConst.Success("Lấy chi tiết căn hộ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết căn hộ. ID: {Id}", id);
                return ResponseConst.Error<ApartmentResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
