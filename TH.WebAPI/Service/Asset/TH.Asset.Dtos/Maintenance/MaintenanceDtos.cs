using System;

namespace TH.Asset.Dtos
{
    // ============================================================
    // CHECKLIST TEMPLATE DTOs
    // ============================================================
    public class CreateChecklistTemplateDto
    {
        public required string code { get; set; }
        public required string name { get; set; }
        public Guid? categoryId { get; set; }
    }

    public class UpdateChecklistTemplateDto : CreateChecklistTemplateDto
    {
        public Guid id { get; set; }
    }

    public class ChecklistTemplateResponse
    {
        public Guid id { get; set; }
        public string code { get; set; } = null!;
        public string name { get; set; } = null!;
        public Guid? categoryId { get; set; }
        public string? categoryName { get; set; }
    }

    // ============================================================
    // CHECKLIST TEMPLATE ITEM DTOs
    // ============================================================
    public class CreateChecklistTemplateItemDto
    {
        public Guid templateId { get; set; }
        public string? itemCode { get; set; }
        public required string itemType { get; set; }  // YESNO | TEXT | NUMBER | PHOTO
        public string itemLabel { get; set; } = "";
        public string? description { get; set; }
        public int sortOrder { get; set; } = 0;
        public bool isRequired { get; set; } = true;
        public string? expectedValue { get; set; }
    }

    public class UpdateChecklistTemplateItemDto : CreateChecklistTemplateItemDto
    {
        public Guid id { get; set; }
    }

    public class ChecklistTemplateItemResponse
    {
        public Guid id { get; set; }
        public Guid templateId { get; set; }
        public string? itemCode { get; set; }
        public string itemType { get; set; } = null!;
        public string itemLabel { get; set; } = null!;
        public string? description { get; set; }
        public int sortOrder { get; set; }
        public bool isRequired { get; set; }
        public string? expectedValue { get; set; }
    }

    // ============================================================
    // MAINTENANCE SCHEDULE DTOs
    // ============================================================
    public class CreateMaintenanceScheduleDto
    {
        public Guid assetId { get; set; }
        public required string scheduleType { get; set; }  // PM | INSPECTION | CALIBRATION
        public Guid checklistTemplateId { get; set; }
        // Cross-service (Base)
        public Guid? autoAssignDepartmentId { get; set; }

        public string frequencyType { get; set; } = "MONTHLY";
        public int? frequencyDays { get; set; }
        public DateTime? startDate { get; set; }
        public DateTime? endDate { get; set; }
        public int leadTimeDays { get; set; } = 0;
        public bool isActive { get; set; } = true;
        public string? description { get; set; }
    }

    public class UpdateMaintenanceScheduleDto : CreateMaintenanceScheduleDto
    {
        public Guid id { get; set; }
        public DateTime? nextDueDate { get; set; }
        public DateTime? lastExecutedAt { get; set; }
        public Guid? lastWoId { get; set; }
    }

    public class MaintenanceScheduleResponse
    {
        public Guid id { get; set; }
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
        public string scheduleType { get; set; } = null!;
        public Guid checklistTemplateId { get; set; }
        public string? checklistTemplateName { get; set; }
        public Guid? autoAssignDepartmentId { get; set; }
        public string frequencyType { get; set; } = null!;
        public int? frequencyDays { get; set; }
        public DateTime? startDate { get; set; }
        public DateTime? endDate { get; set; }
        public DateTime? nextDueDate { get; set; }
        public DateTime? lastExecutedAt { get; set; }
        public Guid? lastWoId { get; set; }
        public int leadTimeDays { get; set; }
        public bool isActive { get; set; }
        public string? description { get; set; }
    }

    // ============================================================
    // WORK ORDER DTOs
    // ============================================================
    public class CreateWorkOrderDto
    {
        // Mã WO do server sinh — client không cần gửi.
        public string? woCode { get; set; }
        public Guid assetId { get; set; }
        public Guid? scheduleId { get; set; }
        public Guid checklistTemplateId { get; set; }
        // Cross-service (Base)
        public Guid buildingId { get; set; }

        public string woType { get; set; } = "PM";    // PM | CM
        public string? title { get; set; }
        public string? description { get; set; }
        public string priority { get; set; } = "MEDIUM";
        public DateTime? scheduledDate { get; set; }
        public DateTime? dueDate { get; set; }
        public decimal? estimatedHours { get; set; }
        // Cross-service (Auth)
        public Guid? createdBy { get; set; }
        public int? createdByUserId { get; set; }
        public string? createdByName { get; set; }
    }

    public class UpdateWorkOrderDto : CreateWorkOrderDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "DRAFT";
        // Cross-service (Auth)
        public Guid? reviewerId { get; set; }
        public DateTime? actualStartAt { get; set; }
        public DateTime? actualEndAt { get; set; }
        public DateTime? approvedAt { get; set; }
        public string? rejectedReason { get; set; }
        public decimal? actualHours { get; set; }
        public decimal? totalCost { get; set; }
    }

    public class WorkOrderResponse
    {
        public Guid id { get; set; }
        public string woCode { get; set; } = null!;
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
        public Guid? scheduleId { get; set; }
        public Guid checklistTemplateId { get; set; }
        public string? checklistTemplateName { get; set; }
        public Guid buildingId { get; set; }
        public string status { get; set; } = null!;
        public Guid? reviewerId { get; set; }
        public int? assignedToUserId { get; set; }
        public string? assignedToName { get; set; }
        public string woType { get; set; } = null!;
        public string? title { get; set; }
        public string? description { get; set; }
        public string priority { get; set; } = null!;
        public DateTime? scheduledDate { get; set; }
        public DateTime? dueDate { get; set; }
        public DateTime? actualStartAt { get; set; }
        public DateTime? actualEndAt { get; set; }
        public DateTime? approvedAt { get; set; }
        public string? rejectedReason { get; set; }
        public decimal? estimatedHours { get; set; }
        public decimal? actualHours { get; set; }
        public decimal? totalCost { get; set; }
        public Guid? createdBy { get; set; }
        public int? createdByUserId { get; set; }
        public string? createdByName { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime updatedAt { get; set; }
    }

    // ============================================================
    // WORK ORDER ASSIGNMENT DTOs
    // ============================================================
    public class CreateWorkOrderAssignmentDto
    {
        public Guid woId { get; set; }
        // Cross-service (Auth)
        public Guid assignedTo { get; set; }
        // KTV được chọn từ danh sách (Auth userID int + tên hiển thị)
        public int? assignedToUserId { get; set; }
        public string? assignedToName { get; set; }
        public Guid? checkinQrAssetId { get; set; }
    }

    public class WorkOrderAssignmentResponse
    {
        public Guid id { get; set; }
        public Guid woId { get; set; }
        public string? woCode { get; set; }
        public Guid assignedTo { get; set; }
        public Guid? checkinQrAssetId { get; set; }
    }

    // ============================================================
    // WORK ORDER CHECKLIST RESPONSE DTOs
    // ============================================================
    public class CreateWorkOrderChecklistResponseDto
    {
        public Guid woId { get; set; }
        public Guid templateItemId { get; set; }
        public bool isPassed { get; set; }
        public string? valueText { get; set; }
        public string? notes { get; set; }
        public string? photoUrl { get; set; }
    }

    public class WorkOrderChecklistResponseDto
    {
        public Guid id { get; set; }
        public Guid woId { get; set; }
        public Guid templateItemId { get; set; }
        public string? itemLabel { get; set; }
        public string? itemType { get; set; }
        public bool isPassed { get; set; }
        public string? valueText { get; set; }
        public string? notes { get; set; }
        public string? photoUrl { get; set; }
        public DateTime respondedAt { get; set; }
    }

    // ============================================================
    // WORK ORDER ATTACHMENT DTOs
    // ============================================================
    public class CreateWorkOrderAttachmentDto
    {
        public Guid woId { get; set; }
        public required string attachmentType { get; set; }  // BEFORE | AFTER | SIGNATURE | OTHER
        public required string fileUrl { get; set; }
        public string? fileName { get; set; }
        public int? fileSizeBytes { get; set; }
        // Cross-service (Auth)
        public Guid? uploadedBy { get; set; }
        public string? caption { get; set; }
    }

    public class WorkOrderAttachmentResponse
    {
        public Guid id { get; set; }
        public Guid woId { get; set; }
        public string attachmentType { get; set; } = null!;
        public string fileUrl { get; set; } = null!;
        public string? fileName { get; set; }
        public int? fileSizeBytes { get; set; }
        public Guid? uploadedBy { get; set; }
        public DateTime uploadedAt { get; set; }
        public string? caption { get; set; }
    }

    // ============================================================
    // WORK ORDER MATERIAL USED DTOs
    // ============================================================
    public class CreateWorkOrderMaterialUsedDto
    {
        public Guid woId { get; set; }
        public Guid materialId { get; set; }
        public Guid warehouseId { get; set; }
        public Guid? inventoryTransactionId { get; set; }
    }

    public class WorkOrderMaterialUsedResponse
    {
        public Guid id { get; set; }
        public Guid woId { get; set; }
        public string? woCode { get; set; }
        public Guid materialId { get; set; }
        public string? materialCode { get; set; }
        public string? materialName { get; set; }
        public Guid warehouseId { get; set; }
        public string? warehouseName { get; set; }
        public Guid? inventoryTransactionId { get; set; }
    }
}
