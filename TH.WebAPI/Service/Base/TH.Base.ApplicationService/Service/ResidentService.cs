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
    public interface IResidentService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateResidentRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateResidentRequestDto request);
        Task<ResponseDto<bool>> DeleteAsync(int id);
        Task<ResponseDto<List<ResidentResponse>>> GetAllAsync(int? apartmentId = null);
        Task<ResponseDto<ResidentResponse>> GetByIdAsync(int id);
    }

    public class ResidentService : TownHubServiceBase, IResidentService
    {
        public ResidentService(ILogger<ResidentService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateResidentRequestDto request)
        {
            try
            {
                if (!string.IsNullOrEmpty(request.idCard))
                {
                    var idCardExists = await _dbContext.Residents.AnyAsync(x => x.IdCard == request.idCard);
                    if (idCardExists)
                        return ResponseConst.Error<bool>(400, "Số CCCD/CMND đã tồn tại trong hệ thống.");
                }

                if (request.apartmentId.HasValue)
                {
                    var aptExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.apartmentId.Value);
                    if (!aptExists)
                        return ResponseConst.Error<bool>(400, "Căn hộ không tồn tại.");
                }

                var entity = new Resident
                {
                    FullName = request.fullName,
                    Phone = request.phone,
                    Email = request.email,
                    IdCard = request.idCard,
                    DateOfBirth = request.dateOfBirth,
                    Gender = request.gender,
                    ApartmentId = request.apartmentId,
                    IsOwner = request.isOwner,
                    MoveInDate = request.moveInDate,
                    AvatarUrl = request.avatarUrl,
                    AuthUserId = request.authUserId
                };

                _dbContext.Residents.Add(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Thêm cư dân thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo cư dân.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateResidentRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Residents.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy cư dân.");

                if (!string.IsNullOrEmpty(request.idCard) && entity.IdCard != request.idCard)
                {
                    var idCardExists = await _dbContext.Residents.AnyAsync(x => x.IdCard == request.idCard);
                    if (idCardExists)
                        return ResponseConst.Error<bool>(400, "Số CCCD/CMND mới đã tồn tại.");
                }

                if (request.apartmentId.HasValue)
                {
                    var aptExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.apartmentId.Value);
                    if (!aptExists)
                        return ResponseConst.Error<bool>(400, "Căn hộ không tồn tại.");
                }

                entity.FullName = request.fullName;
                entity.Phone = request.phone;
                entity.Email = request.email;
                entity.IdCard = request.idCard;
                entity.DateOfBirth = request.dateOfBirth;
                entity.Gender = request.gender;
                entity.ApartmentId = request.apartmentId;
                entity.IsOwner = request.isOwner;
                entity.MoveInDate = request.moveInDate;
                entity.MoveOutDate = request.moveOutDate;
                entity.AvatarUrl = request.avatarUrl;
                entity.AuthUserId = request.authUserId;
                entity.UpdatedAt = DateTime.UtcNow;

                _dbContext.Residents.Update(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Cập nhật cư dân thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật cư dân. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(int id)
        {
            try
            {
                var entity = await _dbContext.Residents.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy cư dân.");

                _dbContext.Residents.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa cư dân thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa cư dân. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<ResidentResponse>>> GetAllAsync(int? apartmentId = null)
        {
            try
            {
                var query = _dbContext.Residents
                    .Include(x => x.Apartment)
                    .AsQueryable();

                if (apartmentId.HasValue)
                    query = query.Where(x => x.ApartmentId == apartmentId.Value);

                var result = await query
                    .OrderBy(x => x.FullName)
                    .Select(x => new ResidentResponse
                    {
                        id = x.Id,
                        fullName = x.FullName,
                        phone = x.Phone,
                        email = x.Email,
                        idCard = x.IdCard,
                        dateOfBirth = x.DateOfBirth,
                        gender = x.Gender,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment != null ? x.Apartment.Code : null,
                        isOwner = x.IsOwner,
                        moveInDate = x.MoveInDate,
                        moveOutDate = x.MoveOutDate,
                        avatarUrl = x.AvatarUrl,
                        authUserId = x.AuthUserId,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách cư dân thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách cư dân.");
                return ResponseConst.Error<List<ResidentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ResidentResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.Residents
                    .Include(x => x.Apartment)
                    .Where(x => x.Id == id)
                    .Select(x => new ResidentResponse
                    {
                        id = x.Id,
                        fullName = x.FullName,
                        phone = x.Phone,
                        email = x.Email,
                        idCard = x.IdCard,
                        dateOfBirth = x.DateOfBirth,
                        gender = x.Gender,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment != null ? x.Apartment.Code : null,
                        isOwner = x.IsOwner,
                        moveInDate = x.MoveInDate,
                        moveOutDate = x.MoveOutDate,
                        avatarUrl = x.AvatarUrl,
                        authUserId = x.AuthUserId,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ResidentResponse>(404, "Không tìm thấy cư dân.");

                return ResponseConst.Success("Lấy chi tiết cư dân thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết cư dân. ID: {Id}", id);
                return ResponseConst.Error<ResidentResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
