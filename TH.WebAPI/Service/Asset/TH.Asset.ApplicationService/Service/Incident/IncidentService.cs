using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Domain.Incident;
using TH.Asset.Dtos;
using TH.Asset.Infrastructure.Database;
using TH.Constant;

namespace TH.Asset.ApplicationService.Service.Incident
{
    // ============================================================
    // SLA CONFIG SERVICE
    // ============================================================
    public interface ISlaConfigService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateSlaConfigDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateSlaConfigDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<SlaConfigResponse>>> GetAllAsync(Guid? buildingId = null, bool? isActive = null);
        Task<ResponseDto<SlaConfigResponse>> GetByIdAsync(Guid id);
    }

    public class SlaConfigService : AssetServiceBase, ISlaConfigService
    {
        public SlaConfigService(ILogger<SlaConfigService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateSlaConfigDto request)
        {
            try
            {
                _dbContext.SlaConfigs.Add(new SlaConfig
                {
                    name                   = request.name,
                    buildingId             = request.buildingId,
                    issueCategory          = request.issueCategory,
                    priorityLevel          = request.priorityLevel,
                    responseTimeHours      = request.responseTimeHours,
                    resolutionTimeHours    = request.resolutionTimeHours,
                    escalationL1AfterHours = request.escalationL1AfterHours,
                    escalationL2AfterHours = request.escalationL2AfterHours,
                    escalationL3AfterHours = request.escalationL3AfterHours,
                    escalationContactsJson = request.escalationContactsJson,
                    businessHoursOnly      = request.businessHoursOnly,
                    isActive               = request.isActive
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm cấu hình SLA thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo SLA Config.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateSlaConfigDto request)
        {
            try
            {
                var entity = await _dbContext.SlaConfigs.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy cấu hình SLA.");

                entity.name                   = request.name;
                entity.buildingId             = request.buildingId;
                entity.issueCategory          = request.issueCategory;
                entity.priorityLevel          = request.priorityLevel;
                entity.responseTimeHours      = request.responseTimeHours;
                entity.resolutionTimeHours    = request.resolutionTimeHours;
                entity.escalationL1AfterHours = request.escalationL1AfterHours;
                entity.escalationL2AfterHours = request.escalationL2AfterHours;
                entity.escalationL3AfterHours = request.escalationL3AfterHours;
                entity.escalationContactsJson = request.escalationContactsJson;
                entity.businessHoursOnly      = request.businessHoursOnly;
                entity.isActive               = request.isActive;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật cấu hình SLA thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật SLA Config. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.SlaConfigs.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy cấu hình SLA.");

                var inUse = await _dbContext.Tickets.AnyAsync(x => x.slaConfigId == id);
                if (inUse)
                    return ResponseConst.Error<bool>(400, "Không thể xóa SLA đang được áp dụng cho ticket.");

                _dbContext.SlaConfigs.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa cấu hình SLA thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa SLA Config. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<SlaConfigResponse>>> GetAllAsync(Guid? buildingId = null, bool? isActive = null)
        {
            try
            {
                var query = _dbContext.SlaConfigs.AsQueryable();
                if (buildingId.HasValue) query = query.Where(x => x.buildingId == buildingId.Value);
                if (isActive.HasValue)   query = query.Where(x => x.isActive == isActive.Value);

                var result = await query
                    .OrderBy(x => x.priorityLevel).ThenBy(x => x.name)
                    .Select(x => new SlaConfigResponse
                    {
                        id                   = x.id,
                        name                 = x.name,
                        buildingId           = x.buildingId,
                        issueCategory        = x.issueCategory,
                        priorityLevel        = x.priorityLevel,
                        responseTimeHours    = x.responseTimeHours,
                        resolutionTimeHours  = x.resolutionTimeHours,
                        escalationL1AfterHours = x.escalationL1AfterHours,
                        escalationL2AfterHours = x.escalationL2AfterHours,
                        escalationL3AfterHours = x.escalationL3AfterHours,
                        escalationContactsJson = x.escalationContactsJson,
                        businessHoursOnly    = x.businessHoursOnly,
                        isActive             = x.isActive
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách cấu hình SLA thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách SLA Config.");
                return ResponseConst.Error<List<SlaConfigResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<SlaConfigResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.SlaConfigs
                    .Where(x => x.id == id)
                    .Select(x => new SlaConfigResponse
                    {
                        id                   = x.id,
                        name                 = x.name,
                        buildingId           = x.buildingId,
                        issueCategory        = x.issueCategory,
                        priorityLevel        = x.priorityLevel,
                        responseTimeHours    = x.responseTimeHours,
                        resolutionTimeHours  = x.resolutionTimeHours,
                        escalationL1AfterHours = x.escalationL1AfterHours,
                        escalationL2AfterHours = x.escalationL2AfterHours,
                        escalationL3AfterHours = x.escalationL3AfterHours,
                        escalationContactsJson = x.escalationContactsJson,
                        businessHoursOnly    = x.businessHoursOnly,
                        isActive             = x.isActive
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<SlaConfigResponse>(404, "Không tìm thấy cấu hình SLA.");

                return ResponseConst.Success("Lấy chi tiết SLA Config thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết SLA Config. ID: {Id}", id);
                return ResponseConst.Error<SlaConfigResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // TICKET SERVICE
    // ============================================================
    public interface ITicketService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateTicketDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateTicketDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<TicketResponse>>> GetAllAsync(Guid? buildingId = null, string? status = null, Guid? reportedBy = null);
        Task<ResponseDto<TicketResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<bool>> ChangeStatusAsync(CreateTicketStatusHistoryDto request);
        Task<ResponseDto<bool>> AssignAsync(CreateTicketAssignmentDto request);
        Task<ResponseDto<bool>> AddAttachmentAsync(CreateTicketAttachmentDto request);
        Task<ResponseDto<List<TicketAttachmentResponse>>> GetAttachmentsAsync(Guid ticketId);
        Task<ResponseDto<bool>> RateAsync(CreateTicketRatingDto request);
        Task<ResponseDto<List<TicketStatusHistoryResponse>>> GetStatusHistoryAsync(Guid ticketId);
        Task<ResponseDto<List<SlaEscalationLogResponse>>> GetEscalationLogsAsync(Guid ticketId);
    }

    public class TicketService : AssetServiceBase, ITicketService
    {
        public TicketService(ILogger<TicketService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateTicketDto request)
        {
            try
            {
                var codeExists = await _dbContext.Tickets.AnyAsync(x => x.ticketCode == request.ticketCode);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã ticket '{request.ticketCode}' đã tồn tại.");

                var ticket = new Ticket
                {
                    ticketCode        = request.ticketCode,
                    buildingId        = request.buildingId,
                    floorId           = request.floorId,
                    unitId            = request.unitId,
                    assetId           = request.assetId,
                    reportedBy        = request.reportedBy,
                    reportedByName    = request.reportedByName,
                    slaConfigId       = request.slaConfigId,
                    purchaseRequestId = request.purchaseRequestId,
                    title             = request.title,
                    description       = request.description,
                    category          = request.category,
                    priority          = request.priority,
                    source            = request.source
                };

                _dbContext.Tickets.Add(ticket);
                await _dbContext.SaveChangesAsync();

                // Ghi lịch sử trạng thái ban đầu
                _dbContext.TicketStatusHistories.Add(new TicketStatusHistory
                {
                    ticketId   = ticket.id,
                    fromStatus = null,
                    toStatus   = "NEW",
                    changedBy  = request.reportedBy,
                    note       = "Ticket được tạo mới."
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Tạo ticket thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo ticket.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateTicketDto request)
        {
            try
            {
                var entity = await _dbContext.Tickets.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy ticket.");

                entity.title             = request.title;
                entity.description       = request.description;
                entity.category          = request.category;
                entity.priority          = request.priority;
                entity.assetId           = request.assetId;
                entity.slaConfigId       = request.slaConfigId;
                entity.purchaseRequestId = request.purchaseRequestId;
                entity.status            = request.status;
                entity.resolvedAt        = request.resolvedAt;
                entity.closedAt          = request.closedAt;
                entity.autoClosed        = request.autoClosed;
                entity.resolutionNote    = request.resolutionNote;
                entity.updatedAt         = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật ticket thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật ticket. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Tickets.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy ticket.");

                if (entity.status != "NEW")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể xóa ticket ở trạng thái NEW.");

                _dbContext.Tickets.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa ticket thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa ticket. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<TicketResponse>>> GetAllAsync(
            Guid? buildingId = null, string? status = null, Guid? reportedBy = null)
        {
            try
            {
                var query = _dbContext.Tickets
                    .Include(x => x.asset)
                    .Include(x => x.slaConfig)
                    .Include(x => x.purchaseRequest)
                    .AsQueryable();

                if (buildingId.HasValue)           query = query.Where(x => x.buildingId == buildingId.Value);
                if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.status == status);
                if (reportedBy.HasValue)           query = query.Where(x => x.reportedBy == reportedBy.Value);

                var result = await query
                    .OrderByDescending(x => x.createdAt)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách ticket thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách ticket.");
                return ResponseConst.Error<List<TicketResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<TicketResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Tickets
                    .Include(x => x.asset)
                    .Include(x => x.slaConfig)
                    .Include(x => x.purchaseRequest)
                    .FirstOrDefaultAsync(x => x.id == id);

                if (entity == null)
                    return ResponseConst.Error<TicketResponse>(404, "Không tìm thấy ticket.");

                return ResponseConst.Success("Lấy chi tiết ticket thành công.", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết ticket. ID: {Id}", id);
                return ResponseConst.Error<TicketResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> ChangeStatusAsync(CreateTicketStatusHistoryDto request)
        {
            try
            {
                var entity = await _dbContext.Tickets.FirstOrDefaultAsync(x => x.id == request.ticketId);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy ticket.");

                var oldStatus = entity.status;
                entity.status    = request.toStatus;
                entity.updatedAt = DateTime.UtcNow;

                if (request.toStatus == "RESOLVED") entity.resolvedAt = DateTime.UtcNow;
                if (request.toStatus == "CLOSED")   entity.closedAt   = DateTime.UtcNow;

                _dbContext.TicketStatusHistories.Add(new TicketStatusHistory
                {
                    ticketId   = request.ticketId,
                    fromStatus = oldStatus,
                    toStatus   = request.toStatus,
                    changedBy  = request.changedBy,
                    note       = request.note
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success($"Cập nhật trạng thái ticket sang '{request.toStatus}' thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đổi trạng thái ticket. ID: {Id}", request.ticketId);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AssignAsync(CreateTicketAssignmentDto request)
        {
            try
            {
                var ticket = await _dbContext.Tickets.FirstOrDefaultAsync(x => x.id == request.ticketId);
                if (ticket == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy ticket.");

                // Ưu tiên định danh theo user (int) nếu FE gửi; fallback về Guid cũ.
                if (request.assignedToUserId.HasValue)
                {
                    var already = await _dbContext.TicketAssignments
                        .AnyAsync(x => x.ticketId == request.ticketId && x.assignedToUserId == request.assignedToUserId);
                    if (already)
                        return ResponseConst.Error<bool>(400, "Kỹ thuật viên này đã được phân công vào ticket.");
                }

                _dbContext.TicketAssignments.Add(new TicketAssignment
                {
                    ticketId         = request.ticketId,
                    assignedTo       = request.assignedTo,
                    assignedToUserId = request.assignedToUserId,
                    assignedToName   = request.assignedToName,
                    assignedAt       = DateTime.UtcNow
                });

                // Cập nhật người phụ trách hiện tại trên ticket (để hiển thị ở danh sách/chi tiết)
                ticket.assignedToUserId = request.assignedToUserId;
                ticket.assignedToName   = request.assignedToName;
                ticket.updatedAt        = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Phân công ticket thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi phân công ticket.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddAttachmentAsync(CreateTicketAttachmentDto request)
        {
            try
            {
                var ticketExists = await _dbContext.Tickets.AnyAsync(x => x.id == request.ticketId);
                if (!ticketExists)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy ticket.");

                _dbContext.TicketAttachments.Add(new TicketAttachment
                {
                    ticketId = request.ticketId,
                    fileUrl  = request.fileUrl
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm tệp đính kèm ticket thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thêm tệp đính kèm ticket.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<TicketAttachmentResponse>>> GetAttachmentsAsync(Guid ticketId)
        {
            try
            {
                var result = await _dbContext.TicketAttachments
                    .Where(x => x.ticketId == ticketId)
                    .OrderBy(x => x.id)
                    .Select(x => new TicketAttachmentResponse
                    {
                        id       = x.id,
                        ticketId = x.ticketId,
                        fileUrl  = x.fileUrl
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách tệp đính kèm ticket thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy tệp đính kèm ticket. TicketId: {Id}", ticketId);
                return ResponseConst.Error<List<TicketAttachmentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RateAsync(CreateTicketRatingDto request)
        {
            try
            {
                var ticket = await _dbContext.Tickets.FirstOrDefaultAsync(x => x.id == request.ticketId);
                if (ticket == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy ticket.");

                if (ticket.status != "RESOLVED" && ticket.status != "CLOSED")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể đánh giá ticket đã được giải quyết hoặc đóng.");

                var alreadyRated = await _dbContext.TicketRatings.AnyAsync(x => x.ticketId == request.ticketId);
                if (alreadyRated)
                    return ResponseConst.Error<bool>(400, "Ticket này đã được đánh giá.");

                if (request.overallRating < 1 || request.overallRating > 5)
                    return ResponseConst.Error<bool>(400, "Điểm đánh giá phải từ 1 đến 5.");

                _dbContext.TicketRatings.Add(new TicketRating
                {
                    ticketId      = request.ticketId,
                    ratedBy       = request.ratedBy,
                    overallRating = request.overallRating
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Đánh giá ticket thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đánh giá ticket.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<TicketStatusHistoryResponse>>> GetStatusHistoryAsync(Guid ticketId)
        {
            try
            {
                var result = await _dbContext.TicketStatusHistories
                    .Where(x => x.ticketId == ticketId)
                    .OrderBy(x => x.changedAt)
                    .Select(x => new TicketStatusHistoryResponse
                    {
                        id         = x.id,
                        ticketId   = x.ticketId,
                        fromStatus = x.fromStatus,
                        toStatus   = x.toStatus,
                        changedBy  = x.changedBy,
                        changedAt  = x.changedAt,
                        note       = x.note
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy lịch sử trạng thái ticket thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy lịch sử trạng thái ticket. ID: {Id}", ticketId);
                return ResponseConst.Error<List<TicketStatusHistoryResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<SlaEscalationLogResponse>>> GetEscalationLogsAsync(Guid ticketId)
        {
            try
            {
                var result = await _dbContext.SlaEscalationLogs
                    .Include(x => x.ticket)
                    .Where(x => x.ticketId == ticketId)
                    .OrderBy(x => x.escalatedAt)
                    .Select(x => new SlaEscalationLogResponse
                    {
                        id              = x.id,
                        ticketId        = x.ticketId,
                        ticketCode      = x.ticket != null ? x.ticket.ticketCode : null,
                        escalationLevel = x.escalationLevel,
                        escalatedAt     = x.escalatedAt,
                        escalatedTo     = x.escalatedTo,
                        channel         = x.channel,
                        message         = x.message,
                        acknowledgedAt  = x.acknowledgedAt,
                        acknowledgedBy  = x.acknowledgedBy
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy log leo thang SLA thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy log leo thang SLA. TicketId: {Id}", ticketId);
                return ResponseConst.Error<List<SlaEscalationLogResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static TicketResponse MapToResponse(Ticket x) => new()
        {
            id                = x.id,
            ticketCode        = x.ticketCode,
            status            = x.status,
            buildingId        = x.buildingId,
            floorId           = x.floorId,
            unitId            = x.unitId,
            assetId           = x.assetId,
            assetCode         = x.asset?.assetCode,
            reportedBy        = x.reportedBy,
            reportedByName    = x.reportedByName,
            assignedToUserId  = x.assignedToUserId,
            assignedToName    = x.assignedToName,
            slaConfigId       = x.slaConfigId,
            slaConfigName     = x.slaConfig?.name,
            purchaseRequestId = x.purchaseRequestId,
            prCode            = x.purchaseRequest?.prCode,
            title             = x.title,
            description       = x.description,
            category          = x.category,
            priority          = x.priority,
            source            = x.source,
            resolvedAt        = x.resolvedAt,
            closedAt          = x.closedAt,
            autoClosed        = x.autoClosed,
            resolutionNote    = x.resolutionNote,
            createdAt         = x.createdAt,
            updatedAt         = x.updatedAt
        };
    }
}
