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
    // ============================================================
    // NOTIFICATION TEMPLATE SERVICE
    // ============================================================
    public interface INotificationTemplateService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateNotificationTemplateRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateNotificationTemplateRequestDto request);
        Task<ResponseDto<bool>> DeleteAsync(int id);
        Task<ResponseDto<List<NotificationTemplateResponse>>> GetAllAsync();
        Task<ResponseDto<NotificationTemplateResponse>> GetByIdAsync(int id);
    }

    public class NotificationTemplateService : TownHubServiceBase, INotificationTemplateService
    {
        public NotificationTemplateService(ILogger<NotificationTemplateService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateNotificationTemplateRequestDto request)
        {
            try
            {
                var isExist = await _dbContext.NotificationTemplates.AnyAsync(x => x.Name == request.name);
                if (isExist)
                    return ResponseConst.Error<bool>(400, "Tên template đã tồn tại.");

                _dbContext.NotificationTemplates.Add(new NotificationTemplate
                {
                    Name = request.name,
                    Channel = request.channel,
                    Subject = request.subject,
                    Body = request.body,
                    Variables = request.variables,
                    IsActive = request.isActive,
                    CreatedByAuthUserId = request.createdByAuthUserId
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Thêm template thông báo thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo template thông báo.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateNotificationTemplateRequestDto request)
        {
            try
            {
                var entity = await _dbContext.NotificationTemplates.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy template.");

                if (entity.Name != request.name)
                {
                    var isExist = await _dbContext.NotificationTemplates.AnyAsync(x => x.Name == request.name);
                    if (isExist)
                        return ResponseConst.Error<bool>(400, "Tên template mới đã tồn tại.");
                }

                entity.Name = request.name;
                entity.Channel = request.channel;
                entity.Subject = request.subject;
                entity.Body = request.body;
                entity.Variables = request.variables;
                entity.IsActive = request.isActive;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật template thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật template. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(int id)
        {
            try
            {
                var entity = await _dbContext.NotificationTemplates.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy template.");

                var isUsed = await _dbContext.Notifications.AnyAsync(x => x.TemplateId == id);
                if (isUsed)
                    return ResponseConst.Error<bool>(400, "Không thể xóa template đang được sử dụng.");

                _dbContext.NotificationTemplates.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa template thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa template. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<NotificationTemplateResponse>>> GetAllAsync()
        {
            try
            {
                var result = await _dbContext.NotificationTemplates
                    .OrderBy(x => x.Name)
                    .Select(x => new NotificationTemplateResponse
                    {
                        id = x.Id,
                        name = x.Name,
                        channel = x.Channel,
                        subject = x.Subject,
                        body = x.Body,
                        variables = x.Variables,
                        isActive = x.IsActive,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách template thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách template.");
                return ResponseConst.Error<List<NotificationTemplateResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<NotificationTemplateResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.NotificationTemplates
                    .Where(x => x.Id == id)
                    .Select(x => new NotificationTemplateResponse
                    {
                        id = x.Id,
                        name = x.Name,
                        channel = x.Channel,
                        subject = x.Subject,
                        body = x.Body,
                        variables = x.Variables,
                        isActive = x.IsActive,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<NotificationTemplateResponse>(404, "Không tìm thấy template.");

                return ResponseConst.Success("Lấy chi tiết template thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết template. ID: {Id}", id);
                return ResponseConst.Error<NotificationTemplateResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // NOTIFICATION SERVICE
    // ============================================================
    public interface INotificationService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateNotificationRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateNotificationRequestDto request);
        Task<ResponseDto<bool>> SendAsync(int id);
        Task<ResponseDto<List<NotificationResponse>>> GetAllAsync(string? status = null);
        Task<ResponseDto<NotificationResponse>> GetByIdAsync(int id);
    }

    public class NotificationService : TownHubServiceBase, INotificationService
    {
        public NotificationService(ILogger<NotificationService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateNotificationRequestDto request)
        {
            try
            {
                if (request.templateId.HasValue)
                {
                    var tmplExists = await _dbContext.NotificationTemplates.AnyAsync(x => x.Id == request.templateId.Value);
                    if (!tmplExists)
                        return ResponseConst.Error<bool>(400, "Template không tồn tại.");
                }

                _dbContext.Notifications.Add(new Notification
                {
                    Title = request.title,
                    Content = request.content,
                    Channel = request.channel,
                    Audience = request.audience,
                    TemplateId = request.templateId,
                    Status = "draft",
                    ScheduledAt = request.scheduledAt,
                    CreatedByAuthUserId = request.createdByAuthUserId
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Tạo thông báo thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo thông báo.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateNotificationRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Notifications.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy thông báo.");

                if (entity.Status == "sent")
                    return ResponseConst.Error<bool>(400, "Không thể chỉnh sửa thông báo đã gửi.");

                entity.Title = request.title;
                entity.Content = request.content;
                entity.Channel = request.channel;
                entity.Audience = request.audience;
                entity.TemplateId = request.templateId;
                entity.ScheduledAt = request.scheduledAt;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật thông báo thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật thông báo. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> SendAsync(int id)
        {
            try
            {
                var entity = await _dbContext.Notifications.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy thông báo.");

                if (entity.Status == "sent")
                    return ResponseConst.Error<bool>(400, "Thông báo đã được gửi trước đó.");

                // Cập nhật trạng thái — logic gửi thực tế sẽ qua message queue
                entity.Status = "sent";
                entity.SentAt = DateTime.UtcNow;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Gửi thông báo thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gửi thông báo. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<NotificationResponse>>> GetAllAsync(string? status = null)
        {
            try
            {
                var query = _dbContext.Notifications.AsQueryable();

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(x => x.Status == status);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new NotificationResponse
                    {
                        id = x.Id,
                        title = x.Title,
                        content = x.Content,
                        channel = x.Channel,
                        audience = x.Audience,
                        status = x.Status,
                        totalRecipients = x.TotalRecipients,
                        sentCount = x.SentCount,
                        failedCount = x.FailedCount,
                        scheduledAt = x.ScheduledAt,
                        sentAt = x.SentAt,
                        createdByAuthUserId = x.CreatedByAuthUserId,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách thông báo thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách thông báo.");
                return ResponseConst.Error<List<NotificationResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<NotificationResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.Notifications
                    .Where(x => x.Id == id)
                    .Select(x => new NotificationResponse
                    {
                        id = x.Id,
                        title = x.Title,
                        content = x.Content,
                        channel = x.Channel,
                        audience = x.Audience,
                        status = x.Status,
                        totalRecipients = x.TotalRecipients,
                        sentCount = x.SentCount,
                        failedCount = x.FailedCount,
                        scheduledAt = x.ScheduledAt,
                        sentAt = x.SentAt,
                        createdByAuthUserId = x.CreatedByAuthUserId,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<NotificationResponse>(404, "Không tìm thấy thông báo.");

                return ResponseConst.Success("Lấy chi tiết thông báo thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết thông báo. ID: {Id}", id);
                return ResponseConst.Error<NotificationResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // INCIDENT SERVICE
    // ============================================================
    public interface IIncidentService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateIncidentRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateIncidentRequestDto request);
        Task<ResponseDto<bool>> DeleteAsync(int id);
        Task<ResponseDto<List<IncidentResponse>>> GetAllAsync(string? status = null, string? priority = null);
        Task<ResponseDto<IncidentResponse>> GetByIdAsync(int id);
    }

    public class IncidentService : TownHubServiceBase, IIncidentService
    {
        public IncidentService(ILogger<IncidentService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateIncidentRequestDto request)
        {
            try
            {
                if (request.apartmentId.HasValue)
                {
                    var aptExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.apartmentId.Value);
                    if (!aptExists)
                        return ResponseConst.Error<bool>(400, "Căn hộ không tồn tại.");
                }

                _dbContext.Incidents.Add(new Incident
                {
                    Title = request.title,
                    Description = request.description,
                    Location = request.location,
                    ApartmentId = request.apartmentId,
                    Category = request.category,
                    Priority = request.priority,
                    Status = "open",
                    ReportedByAuthUserId = request.reportedByAuthUserId,
                    AssignedToAuthUserId = request.assignedToAuthUserId,
                    Attachments = request.attachments
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Tạo sự cố thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo sự cố.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateIncidentRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Incidents.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy sự cố.");

                entity.Title = request.title;
                entity.Description = request.description;
                entity.Location = request.location;
                entity.ApartmentId = request.apartmentId;
                entity.Category = request.category;
                entity.Priority = request.priority;
                entity.Status = request.status;
                entity.AssignedToAuthUserId = request.assignedToAuthUserId;
                entity.ResolutionNote = request.resolutionNote;
                entity.Attachments = request.attachments;
                entity.UpdatedAt = DateTime.UtcNow;

                if (request.status == "resolved" && entity.ResolvedAt == null)
                    entity.ResolvedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật sự cố thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật sự cố. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(int id)
        {
            try
            {
                var entity = await _dbContext.Incidents.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy sự cố.");

                if (entity.Status != "open")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể xóa sự cố ở trạng thái 'open'.");

                _dbContext.Incidents.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa sự cố thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa sự cố. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<IncidentResponse>>> GetAllAsync(string? status = null, string? priority = null)
        {
            try
            {
                var query = _dbContext.Incidents.Include(x => x.Apartment).AsQueryable();

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(x => x.Status == status);

                if (!string.IsNullOrEmpty(priority))
                    query = query.Where(x => x.Priority == priority);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new IncidentResponse
                    {
                        id = x.Id,
                        title = x.Title,
                        description = x.Description,
                        location = x.Location,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment != null ? x.Apartment.Code : null,
                        category = x.Category,
                        priority = x.Priority,
                        status = x.Status,
                        reportedByAuthUserId = x.ReportedByAuthUserId,
                        assignedToAuthUserId = x.AssignedToAuthUserId,
                        resolvedAt = x.ResolvedAt,
                        resolutionNote = x.ResolutionNote,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách sự cố thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách sự cố.");
                return ResponseConst.Error<List<IncidentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<IncidentResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.Incidents
                    .Include(x => x.Apartment)
                    .Where(x => x.Id == id)
                    .Select(x => new IncidentResponse
                    {
                        id = x.Id,
                        title = x.Title,
                        description = x.Description,
                        location = x.Location,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment != null ? x.Apartment.Code : null,
                        category = x.Category,
                        priority = x.Priority,
                        status = x.Status,
                        reportedByAuthUserId = x.ReportedByAuthUserId,
                        assignedToAuthUserId = x.AssignedToAuthUserId,
                        resolvedAt = x.ResolvedAt,
                        resolutionNote = x.ResolutionNote,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<IncidentResponse>(404, "Không tìm thấy sự cố.");

                return ResponseConst.Success("Lấy chi tiết sự cố thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết sự cố. ID: {Id}", id);
                return ResponseConst.Error<IncidentResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // FEE TYPE SERVICE
    // ============================================================
    public interface IFeeTypeService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateFeeTypeRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateFeeTypeRequestDto request);
        Task<ResponseDto<bool>> DeleteAsync(int id);
        Task<ResponseDto<List<FeeTypeResponse>>> GetAllAsync();
    }

    public class FeeTypeService : TownHubServiceBase, IFeeTypeService
    {
        public FeeTypeService(ILogger<FeeTypeService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateFeeTypeRequestDto request)
        {
            try
            {
                var isExist = await _dbContext.FeeTypes.AnyAsync(x => x.Name == request.name);
                if (isExist)
                    return ResponseConst.Error<bool>(400, "Tên loại phí đã tồn tại.");

                _dbContext.FeeTypes.Add(new FeeType
                {
                    Name = request.name,
                    Description = request.description,
                    UnitPrice = request.unitPrice,
                    IsPerM2 = request.isPerM2
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Thêm loại phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo loại phí.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateFeeTypeRequestDto request)
        {
            try
            {
                var entity = await _dbContext.FeeTypes.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy loại phí.");

                if (entity.Name != request.name)
                {
                    var isExist = await _dbContext.FeeTypes.AnyAsync(x => x.Name == request.name);
                    if (isExist)
                        return ResponseConst.Error<bool>(400, "Tên loại phí mới đã tồn tại.");
                }

                entity.Name = request.name;
                entity.Description = request.description;
                entity.UnitPrice = request.unitPrice;
                entity.IsPerM2 = request.isPerM2;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật loại phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật loại phí. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(int id)
        {
            try
            {
                var entity = await _dbContext.FeeTypes.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy loại phí.");

                var isUsed = await _dbContext.Fees.AnyAsync(x => x.FeeTypeId == id);
                if (isUsed)
                    return ResponseConst.Error<bool>(400, "Không thể xóa loại phí đang được sử dụng.");

                _dbContext.FeeTypes.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa loại phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa loại phí. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<FeeTypeResponse>>> GetAllAsync()
        {
            try
            {
                var result = await _dbContext.FeeTypes
                    .OrderBy(x => x.Name)
                    .Select(x => new FeeTypeResponse
                    {
                        id = x.Id,
                        name = x.Name,
                        description = x.Description,
                        unitPrice = x.UnitPrice,
                        isPerM2 = x.IsPerM2,
                        isActive = x.IsActive,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách loại phí thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách loại phí.");
                return ResponseConst.Error<List<FeeTypeResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // FEE SERVICE
    // ============================================================
    public interface IFeeService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateFeeRequestDto request);
        Task<ResponseDto<bool>> UpdateStatusAsync(UpdateFeeStatusRequestDto request);
        Task<ResponseDto<List<FeeResponse>>> GetAllAsync(int? apartmentId = null, string? billingMonth = null, string? status = null);
        Task<ResponseDto<FeeResponse>> GetByIdAsync(int id);
    }

    public class FeeService : TownHubServiceBase, IFeeService
    {
        public FeeService(ILogger<FeeService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateFeeRequestDto request)
        {
            try
            {
                var aptExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.apartmentId);
                if (!aptExists)
                    return ResponseConst.Error<bool>(400, "Căn hộ không tồn tại.");

                var feeTypeExists = await _dbContext.FeeTypes.AnyAsync(x => x.Id == request.feeTypeId);
                if (!feeTypeExists)
                    return ResponseConst.Error<bool>(400, "Loại phí không tồn tại.");

                var isDuplicate = await _dbContext.Fees.AnyAsync(x =>
                    x.ApartmentId == request.apartmentId &&
                    x.FeeTypeId == request.feeTypeId &&
                    x.BillingMonth == request.billingMonth);
                if (isDuplicate)
                    return ResponseConst.Error<bool>(400, "Phiếu phí tháng này đã tồn tại cho căn hộ và loại phí đã chọn.");

                _dbContext.Fees.Add(new Fee
                {
                    ApartmentId = request.apartmentId,
                    FeeTypeId = request.feeTypeId,
                    BillingMonth = request.billingMonth,
                    Amount = request.amount,
                    DueDate = request.dueDate,
                    Status = "unpaid",
                    Note = request.note,
                    CreatedByAuthUserId = request.createdByAuthUserId
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Tạo phiếu phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo phiếu phí.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateStatusAsync(UpdateFeeStatusRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Fees.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu phí.");

                if (entity.Status == "paid")
                    return ResponseConst.Error<bool>(400, "Phiếu phí đã được thanh toán.");

                entity.Status = request.status;
                entity.PaymentMethod = request.paymentMethod;
                entity.PaymentRef = request.paymentRef;
                entity.UpdatedAt = DateTime.UtcNow;

                if (request.status == "paid")
                    entity.PaidAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật trạng thái phiếu phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật phiếu phí. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<FeeResponse>>> GetAllAsync(int? apartmentId = null, string? billingMonth = null, string? status = null)
        {
            try
            {
                var query = _dbContext.Fees
                    .Include(x => x.Apartment)
                    .Include(x => x.FeeType)
                    .AsQueryable();

                if (apartmentId.HasValue)
                    query = query.Where(x => x.ApartmentId == apartmentId.Value);

                if (!string.IsNullOrEmpty(billingMonth))
                    query = query.Where(x => x.BillingMonth == billingMonth);

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(x => x.Status == status);

                var result = await query
                    .OrderByDescending(x => x.BillingMonth)
                    .Select(x => new FeeResponse
                    {
                        id = x.Id,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment.Code,
                        feeTypeId = x.FeeTypeId,
                        feeTypeName = x.FeeType.Name,
                        billingMonth = x.BillingMonth,
                        amount = x.Amount,
                        dueDate = x.DueDate,
                        status = x.Status,
                        paidAt = x.PaidAt,
                        paymentMethod = x.PaymentMethod,
                        paymentRef = x.PaymentRef,
                        note = x.Note,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách phiếu phí thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách phiếu phí.");
                return ResponseConst.Error<List<FeeResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<FeeResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.Fees
                    .Include(x => x.Apartment)
                    .Include(x => x.FeeType)
                    .Where(x => x.Id == id)
                    .Select(x => new FeeResponse
                    {
                        id = x.Id,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment.Code,
                        feeTypeId = x.FeeTypeId,
                        feeTypeName = x.FeeType.Name,
                        billingMonth = x.BillingMonth,
                        amount = x.Amount,
                        dueDate = x.DueDate,
                        status = x.Status,
                        paidAt = x.PaidAt,
                        paymentMethod = x.PaymentMethod,
                        paymentRef = x.PaymentRef,
                        note = x.Note,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<FeeResponse>(404, "Không tìm thấy phiếu phí.");

                return ResponseConst.Success("Lấy chi tiết phiếu phí thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết phiếu phí. ID: {Id}", id);
                return ResponseConst.Error<FeeResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // SYSTEM CONFIG SERVICE
    // ============================================================
    public interface ISystemConfigService
    {
        Task<ResponseDto<bool>> UpdateAsync(UpdateSystemConfigRequestDto request);
        Task<ResponseDto<List<SystemConfigResponse>>> GetAllAsync(bool? isPublic = null);
        Task<ResponseDto<SystemConfigResponse>> GetByKeyAsync(string key);
    }

    public class SystemConfigService : TownHubServiceBase, ISystemConfigService
    {
        public SystemConfigService(ILogger<SystemConfigService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateSystemConfigRequestDto request)
        {
            try
            {
                var entity = await _dbContext.SystemConfigs.FirstOrDefaultAsync(x => x.Key == request.key);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy cấu hình.");

                entity.Value = request.value;
                entity.UpdatedByAuthUserId = request.updatedByAuthUserId;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật cấu hình thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật cấu hình. Key: {Key}", request.key);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<SystemConfigResponse>>> GetAllAsync(bool? isPublic = null)
        {
            try
            {
                var query = _dbContext.SystemConfigs.AsQueryable();

                if (isPublic.HasValue)
                    query = query.Where(x => x.IsPublic == isPublic.Value);

                var result = await query
                    .OrderBy(x => x.Key)
                    .Select(x => new SystemConfigResponse
                    {
                        id = x.Id,
                        key = x.Key,
                        value = x.Value,
                        dataType = x.DataType,
                        description = x.Description,
                        isPublic = x.IsPublic,
                        updatedAt = x.UpdatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách cấu hình thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách cấu hình.");
                return ResponseConst.Error<List<SystemConfigResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<SystemConfigResponse>> GetByKeyAsync(string key)
        {
            try
            {
                var result = await _dbContext.SystemConfigs
                    .Where(x => x.Key == key)
                    .Select(x => new SystemConfigResponse
                    {
                        id = x.Id,
                        key = x.Key,
                        value = x.Value,
                        dataType = x.DataType,
                        description = x.Description,
                        isPublic = x.IsPublic,
                        updatedAt = x.UpdatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<SystemConfigResponse>(404, "Không tìm thấy cấu hình.");

                return ResponseConst.Success("Lấy cấu hình thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy cấu hình. Key: {Key}", key);
                return ResponseConst.Error<SystemConfigResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // AUDIT LOG SERVICE
    // ============================================================
    public interface IAuditLogService
    {
        Task WriteAsync(CreateAuditLogRequestDto request);
        Task<ResponseDto<List<AuditLogResponse>>> GetAllAsync(string? targetType = null, int? targetId = null);
    }

    public class AuditLogService : TownHubServiceBase, IAuditLogService
    {
        public AuditLogService(ILogger<AuditLogService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task WriteAsync(CreateAuditLogRequestDto request)
        {
            try
            {
                _dbContext.AuditLogs.Add(new AuditLog
                {
                    ActorAuthUserId = request.actorAuthUserId,
                    Action = request.action,
                    TargetType = request.targetType,
                    TargetId = request.targetId,
                    OldData = request.oldData,
                    NewData = request.newData,
                    IpAddress = request.ipAddress,
                    UserAgent = request.userAgent
                });
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi ghi audit log.");
            }
        }

        public async Task<ResponseDto<List<AuditLogResponse>>> GetAllAsync(string? targetType = null, int? targetId = null)
        {
            try
            {
                var query = _dbContext.AuditLogs.AsQueryable();

                if (!string.IsNullOrEmpty(targetType))
                    query = query.Where(x => x.TargetType == targetType);

                if (targetId.HasValue)
                    query = query.Where(x => x.TargetId == targetId.Value);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .Take(500)
                    .Select(x => new AuditLogResponse
                    {
                        id = x.Id,
                        actorAuthUserId = x.ActorAuthUserId,
                        action = x.Action,
                        targetType = x.TargetType,
                        targetId = x.TargetId,
                        ipAddress = x.IpAddress,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy audit log thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy audit log.");
                return ResponseConst.Error<List<AuditLogResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
