using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Domain.Maintenance;
using TH.Asset.Dtos;
using TH.Asset.Infrastructure.Database;
using TH.Constant;

namespace TH.Asset.ApplicationService.Service.Maintenance
{
    // ════════════════════════════════════════════════════════════════════════
    // Helper sinh mã Work Order:  WO-{yyyyMM}-{NNN}  (sinh phía server, không cho sửa)
    // ════════════════════════════════════════════════════════════════════════
    internal static class WorkOrderCodeGen
    {
        public static async Task<string> NextCodeAsync(AssetDbContext db, int year, int month)
        {
            var prefix = $"WO-{year}{month:D2}-";
            var codes = await db.WorkOrders
                .Where(x => x.woCode.StartsWith(prefix))
                .Select(x => x.woCode)
                .ToListAsync();

            int next = 1;
            foreach (var c in codes)
            {
                var suffix = c.Substring(prefix.Length);
                if (int.TryParse(suffix, out int n) && n >= next) next = n + 1;
            }
            return $"{prefix}{next:D3}";
        }
    }

    // Ràng buộc chuyển trạng thái Work Order theo quy trình DRAFT→ASSIGNED→IN_PROGRESS
    // →PENDING_REVIEW→COMPLETED (rẽ nhánh REJECTED / CANCELLED). Cùng trạng thái = sửa
    // thông tin, luôn cho phép.
    internal static class WorkOrderState
    {
        private static readonly Dictionary<string, HashSet<string>> _allowed = new()
        {
            ["DRAFT"]          = new() { "ASSIGNED", "CANCELLED" },
            ["ASSIGNED"]       = new() { "IN_PROGRESS", "CANCELLED" },
            ["IN_PROGRESS"]    = new() { "PENDING_REVIEW", "CANCELLED" },
            ["PENDING_REVIEW"] = new() { "COMPLETED", "REJECTED", "CANCELLED" },
            ["REJECTED"]       = new() { "ASSIGNED", "IN_PROGRESS", "CANCELLED" },
            ["COMPLETED"]      = new(),
            ["CANCELLED"]      = new(),
        };

        public static bool CanTransition(string from, string to)
        {
            if (from == to) return true;
            return _allowed.TryGetValue(from, out var next) && next.Contains(to);
        }
    }

    // ============================================================
    // CHECKLIST TEMPLATE SERVICE
    // ============================================================
    public interface IChecklistTemplateService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateChecklistTemplateDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateChecklistTemplateDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<ChecklistTemplateResponse>>> GetAllAsync();
        Task<ResponseDto<ChecklistTemplateResponse>> GetByIdAsync(Guid id);

        // Items
        Task<ResponseDto<bool>> AddItemAsync(CreateChecklistTemplateItemDto request);
        Task<ResponseDto<bool>> UpdateItemAsync(UpdateChecklistTemplateItemDto request);
        Task<ResponseDto<bool>> DeleteItemAsync(Guid itemId);
        Task<ResponseDto<List<ChecklistTemplateItemResponse>>> GetItemsByTemplateAsync(Guid templateId);
    }

    public class ChecklistTemplateService : AssetServiceBase, IChecklistTemplateService
    {
        public ChecklistTemplateService(ILogger<ChecklistTemplateService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateChecklistTemplateDto request)
        {
            try
            {
                var codeExists = await _dbContext.ChecklistTemplates.AnyAsync(x => x.code == request.code);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã checklist '{request.code}' đã tồn tại.");

                _dbContext.ChecklistTemplates.Add(new ChecklistTemplate
                {
                    code       = request.code,
                    name       = request.name,
                    categoryId = request.categoryId
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm mẫu checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo mẫu checklist.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateChecklistTemplateDto request)
        {
            try
            {
                var entity = await _dbContext.ChecklistTemplates.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy mẫu checklist.");

                if (entity.code != request.code)
                {
                    var codeExists = await _dbContext.ChecklistTemplates.AnyAsync(x => x.code == request.code);
                    if (codeExists)
                        return ResponseConst.Error<bool>(400, $"Mã checklist '{request.code}' đã tồn tại.");
                }

                entity.code       = request.code;
                entity.name       = request.name;
                entity.categoryId = request.categoryId;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật mẫu checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật mẫu checklist. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.ChecklistTemplates.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy mẫu checklist.");

                var inUse = await _dbContext.WorkOrders.AnyAsync(x => x.checklistTemplateId == id);
                if (inUse)
                    return ResponseConst.Error<bool>(400, "Không thể xóa mẫu đang được sử dụng bởi Work Order.");

                _dbContext.ChecklistTemplates.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa mẫu checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa mẫu checklist. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<ChecklistTemplateResponse>>> GetAllAsync()
        {
            try
            {
                var result = await _dbContext.ChecklistTemplates
                    .Include(x => x.category)
                    .OrderBy(x => x.code)
                    .Select(x => new ChecklistTemplateResponse
                    {
                        id           = x.id,
                        code         = x.code,
                        name         = x.name,
                        categoryId   = x.categoryId,
                        categoryName = x.category != null ? x.category.name : null
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách mẫu checklist thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách mẫu checklist.");
                return ResponseConst.Error<List<ChecklistTemplateResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ChecklistTemplateResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.ChecklistTemplates
                    .Include(x => x.category)
                    .Where(x => x.id == id)
                    .Select(x => new ChecklistTemplateResponse
                    {
                        id           = x.id,
                        code         = x.code,
                        name         = x.name,
                        categoryId   = x.categoryId,
                        categoryName = x.category != null ? x.category.name : null
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ChecklistTemplateResponse>(404, "Không tìm thấy mẫu checklist.");

                return ResponseConst.Success("Lấy chi tiết mẫu checklist thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết mẫu checklist. ID: {Id}", id);
                return ResponseConst.Error<ChecklistTemplateResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ── Items ──
        public async Task<ResponseDto<bool>> AddItemAsync(CreateChecklistTemplateItemDto request)
        {
            try
            {
                var templateExists = await _dbContext.ChecklistTemplates.AnyAsync(x => x.id == request.templateId);
                if (!templateExists)
                    return ResponseConst.Error<bool>(400, "Mẫu checklist không tồn tại.");

                _dbContext.ChecklistTemplateItems.Add(new ChecklistTemplateItem
                {
                    templateId    = request.templateId,
                    itemCode      = request.itemCode,
                    itemType      = request.itemType,
                    itemLabel     = request.itemLabel,
                    description   = request.description,
                    sortOrder     = request.sortOrder,
                    isRequired    = request.isRequired,
                    expectedValue = request.expectedValue
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm mục checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thêm mục checklist.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateItemAsync(UpdateChecklistTemplateItemDto request)
        {
            try
            {
                var entity = await _dbContext.ChecklistTemplateItems.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy mục checklist.");

                entity.itemCode      = request.itemCode;
                entity.itemType      = request.itemType;
                entity.itemLabel     = request.itemLabel;
                entity.description   = request.description;
                entity.sortOrder     = request.sortOrder;
                entity.isRequired    = request.isRequired;
                entity.expectedValue = request.expectedValue;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật mục checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật mục checklist. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteItemAsync(Guid itemId)
        {
            try
            {
                var entity = await _dbContext.ChecklistTemplateItems.FirstOrDefaultAsync(x => x.id == itemId);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy mục checklist.");

                _dbContext.ChecklistTemplateItems.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa mục checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa mục checklist. ID: {Id}", itemId);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<ChecklistTemplateItemResponse>>> GetItemsByTemplateAsync(Guid templateId)
        {
            try
            {
                var result = await _dbContext.ChecklistTemplateItems
                    .Where(x => x.templateId == templateId)
                    .OrderBy(x => x.sortOrder)
                    .Select(x => new ChecklistTemplateItemResponse
                    {
                        id            = x.id,
                        templateId    = x.templateId,
                        itemCode      = x.itemCode,
                        itemType      = x.itemType,
                        itemLabel     = x.itemLabel,
                        description   = x.description,
                        sortOrder     = x.sortOrder,
                        isRequired    = x.isRequired,
                        expectedValue = x.expectedValue
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách mục checklist thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy mục checklist theo template. ID: {Id}", templateId);
                return ResponseConst.Error<List<ChecklistTemplateItemResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // MAINTENANCE SCHEDULE SERVICE
    // ============================================================
    public interface IMaintenanceScheduleService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateMaintenanceScheduleDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateMaintenanceScheduleDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<MaintenanceScheduleResponse>>> GetAllAsync(Guid? assetId = null, bool? isActive = null);
        Task<ResponseDto<MaintenanceScheduleResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<MaintenanceScheduleResponse>>> GetOverdueAsync();
    }

    public class MaintenanceScheduleService : AssetServiceBase, IMaintenanceScheduleService
    {
        public MaintenanceScheduleService(ILogger<MaintenanceScheduleService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        // Ép DateTime về Kind=Utc để Npgsql ghi được vào cột timestamptz (ngày client gửi
        // thường có Kind=Unspecified). Local → chuyển múi giờ; còn lại giữ nguyên mốc, gắn Utc.
        private static DateTime? AsUtc(DateTime? value)
        {
            if (value is null) return null;
            var d = value.Value;
            return d.Kind switch
            {
                DateTimeKind.Utc => d,
                DateTimeKind.Local => d.ToUniversalTime(),
                _ => DateTime.SpecifyKind(d, DateTimeKind.Utc),
            };
        }

        public async Task<ResponseDto<bool>> CreateAsync(CreateMaintenanceScheduleDto request)
        {
            try
            {
                var assetExists = await _dbContext.Assets.AnyAsync(x => x.id == request.assetId);
                if (!assetExists)
                    return ResponseConst.Error<bool>(400, "Tài sản không tồn tại.");

                var templateExists = await _dbContext.ChecklistTemplates.AnyAsync(x => x.id == request.checklistTemplateId);
                if (!templateExists)
                    return ResponseConst.Error<bool>(400, "Mẫu checklist không tồn tại.");

                // autoAssignDepartmentId là tham chiếu cross-service (Base) — KHÔNG có FK trong
                // schema asset; nếu Guid.Empty lọt vào thì coi như null để tránh dữ liệu rác.
                var autoDept = request.autoAssignDepartmentId == Guid.Empty ? null : request.autoAssignDepartmentId;

                // Ngày từ client (vd "2026-07-16") có Kind=Unspecified → Npgsql từ chối ghi vào cột
                // timestamptz. Ép về UTC trước khi lưu (coi ngày lịch là mốc UTC).
                var startDate = AsUtc(request.startDate);
                var endDate = AsUtc(request.endDate);

                _dbContext.MaintenanceSchedules.Add(new MaintenanceSchedule
                {
                    assetId                = request.assetId,
                    scheduleType           = request.scheduleType,
                    checklistTemplateId    = request.checklistTemplateId,
                    autoAssignDepartmentId = autoDept,
                    frequencyType          = request.frequencyType,
                    frequencyDays          = request.frequencyDays,
                    startDate              = startDate,
                    endDate                = endDate,
                    // Lần đến hạn đầu tiên = ngày bắt đầu → lịch mới hiện ngay trong danh sách "đến hạn".
                    nextDueDate            = startDate,
                    leadTimeDays           = request.leadTimeDays,
                    isActive               = request.isActive,
                    description            = request.description
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm lịch bảo trì thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo lịch bảo trì.");
                // Với DbUpdateException, nguyên nhân thật nằm ở InnerException (constraint/kiểu dữ liệu).
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateMaintenanceScheduleDto request)
        {
            try
            {
                var entity = await _dbContext.MaintenanceSchedules.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy lịch bảo trì.");

                entity.scheduleType           = request.scheduleType;
                entity.checklistTemplateId    = request.checklistTemplateId;
                entity.autoAssignDepartmentId = request.autoAssignDepartmentId;
                entity.frequencyType          = request.frequencyType;
                entity.frequencyDays          = request.frequencyDays;
                entity.startDate              = AsUtc(request.startDate);
                entity.endDate                = AsUtc(request.endDate);
                entity.nextDueDate            = AsUtc(request.nextDueDate);
                entity.lastExecutedAt         = AsUtc(request.lastExecutedAt);
                entity.lastWoId               = request.lastWoId;
                entity.leadTimeDays           = request.leadTimeDays;
                entity.isActive               = request.isActive;
                entity.description            = request.description;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật lịch bảo trì thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật lịch bảo trì. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.MaintenanceSchedules.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy lịch bảo trì.");

                _dbContext.MaintenanceSchedules.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa lịch bảo trì thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa lịch bảo trì. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<MaintenanceScheduleResponse>>> GetAllAsync(Guid? assetId = null, bool? isActive = null)
        {
            try
            {
                var query = _dbContext.MaintenanceSchedules
                    .Include(x => x.asset)
                    .Include(x => x.checklistTemplate)
                    .AsQueryable();

                if (assetId.HasValue) query = query.Where(x => x.assetId == assetId.Value);
                if (isActive.HasValue) query = query.Where(x => x.isActive == isActive.Value);

                var result = await query
                    .OrderBy(x => x.nextDueDate)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách lịch bảo trì thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách lịch bảo trì.");
                return ResponseConst.Error<List<MaintenanceScheduleResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<MaintenanceScheduleResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.MaintenanceSchedules
                    .Include(x => x.asset)
                    .Include(x => x.checklistTemplate)
                    .FirstOrDefaultAsync(x => x.id == id);

                if (entity == null)
                    return ResponseConst.Error<MaintenanceScheduleResponse>(404, "Không tìm thấy lịch bảo trì.");

                return ResponseConst.Success("Lấy chi tiết lịch bảo trì thành công.", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết lịch bảo trì. ID: {Id}", id);
                return ResponseConst.Error<MaintenanceScheduleResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<MaintenanceScheduleResponse>>> GetOverdueAsync()
        {
            try
            {
                var now = DateTime.UtcNow;
                var result = await _dbContext.MaintenanceSchedules
                    .Include(x => x.asset)
                    .Include(x => x.checklistTemplate)
                    .Where(x => x.isActive && x.nextDueDate.HasValue && x.nextDueDate.Value < now)
                    .OrderBy(x => x.nextDueDate)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách lịch bảo trì quá hạn thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách lịch bảo trì quá hạn.");
                return ResponseConst.Error<List<MaintenanceScheduleResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static MaintenanceScheduleResponse MapToResponse(MaintenanceSchedule x) => new()
        {
            id                      = x.id,
            assetId                 = x.assetId,
            assetCode               = x.asset?.assetCode,
            assetName               = x.asset?.name,
            scheduleType            = x.scheduleType,
            checklistTemplateId     = x.checklistTemplateId,
            checklistTemplateName   = x.checklistTemplate?.name,
            autoAssignDepartmentId  = x.autoAssignDepartmentId,
            frequencyType           = x.frequencyType,
            frequencyDays           = x.frequencyDays,
            startDate               = x.startDate,
            endDate                 = x.endDate,
            nextDueDate             = x.nextDueDate,
            lastExecutedAt          = x.lastExecutedAt,
            lastWoId                = x.lastWoId,
            leadTimeDays            = x.leadTimeDays,
            isActive                = x.isActive,
            description             = x.description
        };
    }

    // ============================================================
    // WORK ORDER SERVICE
    // ============================================================
    public interface IWorkOrderService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateWorkOrderDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateWorkOrderDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<WorkOrderResponse>>> GetAllAsync(Guid? assetId = null, string? status = null, Guid? buildingId = null, int? assignedToUserId = null);
        Task<ResponseDto<WorkOrderResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<bool>> AssignTechnicianAsync(CreateWorkOrderAssignmentDto request);
        Task<ResponseDto<bool>> AddChecklistResponseAsync(CreateWorkOrderChecklistResponseDto request);
        Task<ResponseDto<bool>> AddAttachmentAsync(CreateWorkOrderAttachmentDto request);
        Task<ResponseDto<List<WorkOrderAttachmentResponse>>> GetAttachmentsAsync(Guid woId);
        Task<ResponseDto<bool>> AddMaterialUsedAsync(CreateWorkOrderMaterialUsedDto request);
    }

    public class WorkOrderService : AssetServiceBase, IWorkOrderService
    {
        public WorkOrderService(ILogger<WorkOrderService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateWorkOrderDto request)
        {
            try
            {
                var assetExists = await _dbContext.Assets.AnyAsync(x => x.id == request.assetId);
                if (!assetExists)
                    return ResponseConst.Error<bool>(400, "Tài sản không tồn tại.");

                // Mã WO luôn sinh phía server để đảm bảo duy nhất & không cho client tự đặt.
                var now = DateTime.UtcNow;
                var woCode = await WorkOrderCodeGen.NextCodeAsync(_dbContext, now.Year, now.Month);

                _dbContext.WorkOrders.Add(new WorkOrder
                {
                    woCode              = woCode,
                    assetId             = request.assetId,
                    scheduleId          = request.scheduleId,
                    checklistTemplateId = request.checklistTemplateId,
                    buildingId          = request.buildingId,
                    woType              = request.woType,
                    title               = request.title,
                    description         = request.description,
                    priority            = request.priority,
                    scheduledDate       = request.scheduledDate,
                    dueDate             = request.dueDate,
                    estimatedHours      = request.estimatedHours,
                    createdBy           = request.createdBy,
                    createdByUserId     = request.createdByUserId,
                    createdByName       = request.createdByName
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Tạo lệnh công việc thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo Work Order.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateWorkOrderDto request)
        {
            try
            {
                var entity = await _dbContext.WorkOrders.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy Work Order.");

                // Ràng buộc quy trình: chỉ cho chuyển trạng thái hợp lệ (chống nhảy/lùi bước
                // hoặc sửa phiếu đã đóng khi gọi API trực tiếp).
                if (!WorkOrderState.CanTransition(entity.status, request.status))
                    return ResponseConst.Error<bool>(400,
                        $"Không thể chuyển trạng thái từ '{entity.status}' sang '{request.status}'.");

                // Mã WO là bất biến (sinh khi tạo) — bỏ qua giá trị client gửi lên.
                entity.status         = request.status;
                entity.reviewerId     = request.reviewerId;
                entity.woType         = request.woType;
                entity.title          = request.title;
                entity.description    = request.description;
                entity.priority       = request.priority;
                entity.scheduledDate  = request.scheduledDate;
                entity.dueDate        = request.dueDate;
                entity.actualStartAt  = request.actualStartAt;
                entity.actualEndAt    = request.actualEndAt;
                entity.approvedAt     = request.approvedAt;
                entity.rejectedReason = request.rejectedReason;
                entity.estimatedHours = request.estimatedHours;
                entity.actualHours    = request.actualHours;
                entity.totalCost      = request.totalCost;
                entity.updatedAt      = DateTime.UtcNow;

                // Đồng bộ trạng thái tài sản theo tiến độ WO: bắt đầu thực hiện → "Đang bảo trì";
                // đóng phiếu (nghiệm thu) → về "Đang hoạt động". Không đụng tài sản đã thanh lý/loại bỏ.
                if (entity.status == "IN_PROGRESS" || entity.status == "COMPLETED")
                {
                    var asset = await _dbContext.Assets.FirstOrDefaultAsync(x => x.id == entity.assetId);
                    if (asset != null && asset.status != "DISPOSED" && asset.status != "RETIRED")
                    {
                        if (entity.status == "IN_PROGRESS" && asset.status == "ACTIVE")
                            asset.status = "MAINTENANCE";
                        else if (entity.status == "COMPLETED" && asset.status == "MAINTENANCE")
                            asset.status = "ACTIVE";
                    }
                }

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật Work Order thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật Work Order. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.WorkOrders.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy Work Order.");

                if (entity.status != "DRAFT")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể xóa Work Order ở trạng thái DRAFT.");

                _dbContext.WorkOrders.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa Work Order thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa Work Order. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<WorkOrderResponse>>> GetAllAsync(
            Guid? assetId = null, string? status = null, Guid? buildingId = null, int? assignedToUserId = null)
        {
            try
            {
                var query = _dbContext.WorkOrders
                    .Include(x => x.asset)
                    .Include(x => x.checklistTemplate)
                    .AsQueryable();

                if (assetId.HasValue)          query = query.Where(x => x.assetId == assetId.Value);
                if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.status == status);
                if (buildingId.HasValue)       query = query.Where(x => x.buildingId == buildingId.Value);
                // Giới hạn theo phân công: kỹ thuật viên chỉ thấy phiếu của mình.
                if (assignedToUserId.HasValue) query = query.Where(x => x.assignedToUserId == assignedToUserId.Value);

                var result = await query
                    .OrderByDescending(x => x.createdAt)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách Work Order thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách Work Order.");
                return ResponseConst.Error<List<WorkOrderResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<WorkOrderResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.WorkOrders
                    .Include(x => x.asset)
                    .Include(x => x.checklistTemplate)
                    .FirstOrDefaultAsync(x => x.id == id);

                if (entity == null)
                    return ResponseConst.Error<WorkOrderResponse>(404, "Không tìm thấy Work Order.");

                return ResponseConst.Success("Lấy chi tiết Work Order thành công.", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết Work Order. ID: {Id}", id);
                return ResponseConst.Error<WorkOrderResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AssignTechnicianAsync(CreateWorkOrderAssignmentDto request)
        {
            try
            {
                var wo = await _dbContext.WorkOrders.FirstOrDefaultAsync(x => x.id == request.woId);
                if (wo == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy Work Order.");

                if (request.assignedToUserId.HasValue)
                {
                    var already = await _dbContext.WorkOrderAssignments
                        .AnyAsync(x => x.woId == request.woId && x.assignedToUserId == request.assignedToUserId);
                    if (already)
                        return ResponseConst.Error<bool>(400, "Kỹ thuật viên này đã được phân công vào Work Order.");
                }

                _dbContext.WorkOrderAssignments.Add(new WorkOrderAssignment
                {
                    woId              = request.woId,
                    assignedTo        = request.assignedTo,
                    assignedToUserId  = request.assignedToUserId,
                    assignedToName    = request.assignedToName,
                    assignedAt        = DateTime.UtcNow,
                    checkinQrAssetId  = request.checkinQrAssetId
                });

                // Cập nhật KTV phụ trách hiện tại trên WO
                wo.assignedToUserId = request.assignedToUserId;
                wo.assignedToName   = request.assignedToName;
                wo.updatedAt        = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Phân công kỹ thuật viên thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi phân công kỹ thuật viên.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddChecklistResponseAsync(CreateWorkOrderChecklistResponseDto request)
        {
            try
            {
                var existing = await _dbContext.WorkOrderChecklistResponses
                    .AnyAsync(x => x.woId == request.woId && x.templateItemId == request.templateItemId);
                if (existing)
                    return ResponseConst.Error<bool>(400, "Mục checklist này đã được điền. Cập nhật thay vì tạo mới.");

                _dbContext.WorkOrderChecklistResponses.Add(new WorkOrderChecklistResponse
                {
                    woId           = request.woId,
                    templateItemId = request.templateItemId,
                    isPassed       = request.isPassed,
                    valueText      = request.valueText,
                    notes          = request.notes,
                    photoUrl       = request.photoUrl
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Lưu kết quả checklist thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu kết quả checklist.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddAttachmentAsync(CreateWorkOrderAttachmentDto request)
        {
            try
            {
                _dbContext.WorkOrderAttachments.Add(new WorkOrderAttachment
                {
                    woId           = request.woId,
                    attachmentType = request.attachmentType,
                    fileUrl        = request.fileUrl,
                    fileName       = request.fileName,
                    fileSizeBytes  = request.fileSizeBytes,
                    uploadedBy     = request.uploadedBy,
                    caption        = request.caption
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm tệp đính kèm Work Order thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thêm tệp đính kèm Work Order.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<WorkOrderAttachmentResponse>>> GetAttachmentsAsync(Guid woId)
        {
            try
            {
                var result = await _dbContext.WorkOrderAttachments
                    .Where(x => x.woId == woId)
                    .OrderBy(x => x.uploadedAt)
                    .Select(x => new WorkOrderAttachmentResponse
                    {
                        id             = x.id,
                        woId           = x.woId,
                        attachmentType = x.attachmentType,
                        fileUrl        = x.fileUrl,
                        fileName       = x.fileName,
                        fileSizeBytes  = x.fileSizeBytes,
                        uploadedBy     = x.uploadedBy,
                        uploadedAt     = x.uploadedAt,
                        caption        = x.caption
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách tệp đính kèm Work Order thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy tệp đính kèm Work Order. WoId: {Id}", woId);
                return ResponseConst.Error<List<WorkOrderAttachmentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddMaterialUsedAsync(CreateWorkOrderMaterialUsedDto request)
        {
            try
            {
                var materialExists = await _dbContext.Materials.AnyAsync(x => x.id == request.materialId);
                if (!materialExists)
                    return ResponseConst.Error<bool>(400, "Vật tư không tồn tại.");

                _dbContext.WorkOrderMaterialsUsed.Add(new WorkOrderMaterialUsed
                {
                    woId                   = request.woId,
                    materialId             = request.materialId,
                    warehouseId            = request.warehouseId,
                    inventoryTransactionId = request.inventoryTransactionId
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Ghi nhận vật tư sử dụng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi ghi nhận vật tư sử dụng.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static WorkOrderResponse MapToResponse(WorkOrder x) => new()
        {
            id                    = x.id,
            woCode                = x.woCode,
            assetId               = x.assetId,
            assetCode             = x.asset?.assetCode,
            assetName             = x.asset?.name,
            scheduleId            = x.scheduleId,
            checklistTemplateId   = x.checklistTemplateId,
            checklistTemplateName = x.checklistTemplate?.name,
            buildingId            = x.buildingId,
            status                = x.status,
            reviewerId            = x.reviewerId,
            assignedToUserId      = x.assignedToUserId,
            assignedToName        = x.assignedToName,
            woType                = x.woType,
            title                 = x.title,
            description           = x.description,
            priority              = x.priority,
            scheduledDate         = x.scheduledDate,
            dueDate               = x.dueDate,
            actualStartAt         = x.actualStartAt,
            actualEndAt           = x.actualEndAt,
            approvedAt            = x.approvedAt,
            rejectedReason        = x.rejectedReason,
            estimatedHours        = x.estimatedHours,
            actualHours           = x.actualHours,
            totalCost             = x.totalCost,
            createdBy             = x.createdBy,
            createdByUserId       = x.createdByUserId,
            createdByName         = x.createdByName,
            createdAt             = x.createdAt,
            updatedAt             = x.updatedAt
        };
    }
}
