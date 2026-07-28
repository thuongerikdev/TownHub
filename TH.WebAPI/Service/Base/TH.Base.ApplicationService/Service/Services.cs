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
using TH.Auth.ApplicationService.Service.Email;

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
        Task<ResponseDto<List<NotificationInboxResponse>>> GetInboxAsync(int authUserId);
    }

    public class NotificationService : TownHubServiceBase, INotificationService
    {
        private readonly IEmailService _emailService;

        public NotificationService(ILogger<NotificationService> logger, TownHubDbContext dbContext, IEmailService emailService)
            : base(logger, dbContext) => _emailService = emailService;

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

                // Audience supports the standard groups (all, owners, building_a...)
                // and precise targeting values such as `floor:5` or `building:A|floor:5`.
                var recipients = await GetRecipientsAsync(request.audience);
                _dbContext.Notifications.Add(new Notification
                {
                    Title = request.title,
                    Content = request.content,
                    Channel = request.channel,
                    Audience = request.audience,
                    TemplateId = request.templateId,
                    Status = "draft",
                    TotalRecipients = recipients.Count,
                    ScheduledAt = request.scheduledAt,
                    CreatedByAuthUserId = request.createdByAuthUserId,
                    // Individual notification fields (UC63)
                    RecipientId = request.recipientId,
                    ReferenceType = request.referenceType,
                    ReferenceId = request.referenceId,
                    Body = request.body,
                    SendStatus = request.sendStatus
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
                // Individual notification fields (UC63)
                entity.RecipientId = request.recipientId;
                entity.ReferenceType = request.referenceType;
                entity.ReferenceId = request.referenceId;
                entity.Body = request.body;
                entity.SendStatus = request.sendStatus;
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

                var isEmail = string.Equals(entity.Channel, "email", StringComparison.OrdinalIgnoreCase);
                var recipients = await GetRecipientsAsync(entity.Audience);

                var logs = new List<NotificationLog>();
                foreach (var resident in recipients)
                {
                    var address = isEmail ? resident.Email : resident.Phone;
                    var log = new NotificationLog
                    {
                        NotificationId = entity.Id,
                        ResidentId = resident.Id,
                        Channel = entity.Channel,
                        // Lưu địa chỉ đích để mỗi người nhận đều truy vết được.
                        Recipient = address ?? resident.Phone ?? "",
                        Status = "delivered",
                        SentAt = DateTime.UtcNow
                    };

                    if (isEmail)
                    {
                        // Kênh Email: gửi thật qua SMTP đã cấu hình sẵn (IEmailService).
                        if (string.IsNullOrWhiteSpace(resident.Email))
                        {
                            log.Status = "failed";
                            log.ErrorMessage = "Cư dân chưa có địa chỉ email.";
                            log.SentAt = null;
                        }
                        else
                        {
                            try
                            {
                                await _emailService.SendEmailAsync(resident.Email, entity.Title, BuildEmailBody(entity));
                            }
                            catch (Exception mailEx)
                            {
                                log.Status = "failed";
                                log.ErrorMessage = mailEx.Message;
                                log.SentAt = null;
                                _logger.LogWarning(mailEx, "Gửi email thông báo thất bại tới {Email}", resident.Email);
                            }
                        }
                    }
                    // Kênh Push App (in-app): chỉ cần dòng log này để hộp thư cá nhân
                    // của cư dân đọc được — không cần dịch vụ ngoài.

                    logs.Add(log);
                }
                _dbContext.NotificationLogs.AddRange(logs);

                var failed = logs.Count(l => l.Status == "failed");
                entity.Status = "sent";
                entity.SentAt = DateTime.UtcNow;
                entity.TotalRecipients = recipients.Count;
                entity.SentCount = recipients.Count - failed;
                entity.FailedCount = failed;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                var msg = failed == 0
                    ? "Gửi thông báo thành công."
                    : $"Gửi thông báo hoàn tất: {entity.SentCount} thành công, {failed} thất bại.";
                return ResponseConst.Success(msg, true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gửi thông báo. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private async Task<List<Resident>> GetRecipientsAsync(string audience)
        {
            var query = _dbContext.Residents
                .Include(x => x.Apartment)
                .Where(x => x.MoveOutDate == null);

            if (audience == "owners") query = query.Where(x => x.IsOwner);
            else if (audience == "building_a") query = query.Where(x => x.Apartment != null && x.Apartment.Building == "Tòa A");
            else if (audience == "building_b") query = query.Where(x => x.Apartment != null && x.Apartment.Building == "Tòa B");
            else if (audience == "villa") query = query.Where(x => x.Apartment != null && x.Apartment.Building == "Villa");
            else if (audience.StartsWith("floor:") && int.TryParse(audience[6..], out var floor))
                query = query.Where(x => x.Apartment != null && x.Apartment.Floor == floor);
            else if (audience.StartsWith("building:") && audience.Contains("|floor:"))
            {
                var parts = audience.Split("|floor:", StringSplitOptions.RemoveEmptyEntries);
                var building = parts[0].Replace("building:", "Tòa ");
                if (parts.Length == 2 && int.TryParse(parts[1], out floor))
                    query = query.Where(x => x.Apartment != null && x.Apartment.Building == building && x.Apartment.Floor == floor);
            }
            // `staff` is intentionally not resolved from Residents; it is delivered by
            // the authentication service's staff directory.
            else if (audience == "staff") return new List<Resident>();

            return await query.ToListAsync();
        }

        // Bọc nội dung thông báo vào một khung HTML tối giản cho email.
        private static string BuildEmailBody(Notification n)
        {
            var content = System.Net.WebUtility.HtmlEncode(n.Content).Replace("\n", "<br/>");
            return $@"<div style=""font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;padding:20px"">
                <h2 style=""color:#111"">{System.Net.WebUtility.HtmlEncode(n.Title)}</h2>
                <div style=""color:#333;line-height:1.6;font-size:15px"">{content}</div>
                <hr style=""border:none;height:1px;background:#eee;margin:20px 0""/>
                <small style=""color:#888"">TownHub — Ban Quản Lý Toà Nhà</small>
            </div>";
        }

        // Hộp thư cá nhân: các thông báo đã được GỬI tới cư dân gắn với tài khoản này.
        // Vì log chỉ sinh khi bấm "Gửi", nháp/chưa gửi sẽ không xuất hiện.
        public async Task<ResponseDto<List<NotificationInboxResponse>>> GetInboxAsync(int authUserId)
        {
            try
            {
                var result = await _dbContext.NotificationLogs
                    .Where(l => l.Resident != null && l.Resident.AuthUserId == authUserId)
                    .OrderByDescending(l => l.SentAt ?? l.CreatedAt)
                    .Select(l => new NotificationInboxResponse
                    {
                        id = l.NotificationId,
                        logId = l.Id,
                        title = l.Notification.Title,
                        content = l.Notification.Content,
                        channel = l.Notification.Channel,
                        audience = l.Notification.Audience,
                        sentAt = l.SentAt,
                        createdAt = l.Notification.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy hộp thư thông báo thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy hộp thư thông báo cho authUserId={AuthUserId}", authUserId);
                return ResponseConst.Error<List<NotificationInboxResponse>>(500, "Lỗi hệ thống: " + ex.Message);
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
                        recipientId = x.RecipientId,
                        referenceType = x.ReferenceType,
                        referenceId = x.ReferenceId,
                        body = x.Body,
                        isRead = x.IsRead,
                        readAt = x.ReadAt,
                        sendStatus = x.SendStatus,
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
                        recipientId = x.RecipientId,
                        referenceType = x.ReferenceType,
                        referenceId = x.ReferenceId,
                        body = x.Body,
                        isRead = x.IsRead,
                        readAt = x.ReadAt,
                        sendStatus = x.SendStatus,
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
                if (request.scope != null) entity.Scope = request.scope;
                if (request.updatedBy.HasValue) entity.UpdatedBy = request.updatedBy;
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
                        scope = x.Scope,
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
                        scope = x.Scope,
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
                    UserAgent = request.userAgent,
                    // DB-level audit fields (UC từ Asset module)
                    TableName = request.tableName,
                    RecordId = request.recordId,
                    ChangedBy = request.changedBy
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
                        tableName = x.TableName,
                        recordId = x.RecordId,
                        changedBy = x.ChangedBy,
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
