using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TH.Asset.Domain.Core;
using TH.Asset.Domain.Inventory;

namespace TH.Asset.Domain.Maintenance
{
    [Table("checklist_templates", Schema = "asset")]
    public class ChecklistTemplate
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string code { get; set; }

        [Required, MaxLength(200)]
        public required string name { get; set; }

        public Guid? categoryId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(categoryId))]
        public virtual AssetCategory? category { get; set; }

        // Inverse navigation
        public virtual ICollection<ChecklistTemplateItem>? items { get; set; }
        public virtual ICollection<MaintenanceSchedule>? maintenanceSchedules { get; set; }
        public virtual ICollection<WorkOrder>? workOrders { get; set; }
    }

    [Table("checklist_template_items", Schema = "asset")]
    public class ChecklistTemplateItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid templateId { get; set; }

        [MaxLength(50)]
        public string? itemCode { get; set; }

        [Required, MaxLength(20)]
        public required string itemType { get; set; }

        // Patch fields
        [Required, MaxLength(500)]
        public string itemLabel { get; set; } = "";
        public string? description { get; set; }
        public int sortOrder { get; set; } = 0;
        public bool isRequired { get; set; } = true;
        [MaxLength(200)]
        public string? expectedValue { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(templateId))]
        public virtual ChecklistTemplate? template { get; set; }

        // Inverse navigation
        public virtual ICollection<WorkOrderChecklistResponse>? responses { get; set; }
    }

    [Table("maintenance_schedules", Schema = "asset")]
    public class MaintenanceSchedule
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid assetId { get; set; }

        [Required, MaxLength(20)]
        public required string scheduleType { get; set; }

        public Guid checklistTemplateId { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid? autoAssignDepartmentId { get; set; }

        // Patch fields
        [Required, MaxLength(20)]
        public string frequencyType { get; set; } = "MONTHLY"; // DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY | CUSTOM
        public int? frequencyDays { get; set; }
        public DateTime? startDate { get; set; }
        public DateTime? endDate { get; set; }
        public DateTime? nextDueDate { get; set; }
        public DateTime? lastExecutedAt { get; set; }
        public Guid? lastWoId { get; set; }
        public int leadTimeDays { get; set; } = 0;
        public bool isActive { get; set; } = true;
        public string? description { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual TH.Asset.Domain.Core.Asset? asset { get; set; }

        [ForeignKey(nameof(checklistTemplateId))]
        public virtual ChecklistTemplate? checklistTemplate { get; set; }

        [ForeignKey(nameof(lastWoId))]
        public virtual WorkOrder? lastWorkOrder { get; set; }

        // Inverse navigation
        public virtual ICollection<WorkOrder>? workOrders { get; set; }
    }

    [Table("work_orders", Schema = "asset")]
    public class WorkOrder
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string woCode { get; set; }

        public Guid assetId { get; set; }
        public Guid? scheduleId { get; set; }
        public Guid checklistTemplateId { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid buildingId { get; set; }

        [MaxLength(30)]
        public string status { get; set; } = "DRAFT";

        // Cross-service (Auth) — không dùng navigation property
        public Guid? reviewerId { get; set; }

        // Patch fields
        [MaxLength(10)]
        public string woType { get; set; } = "PM"; // PM | CM
        [MaxLength(300)]
        public string? title { get; set; }
        public string? description { get; set; }
        [MaxLength(10)]
        public string priority { get; set; } = "MEDIUM"; // LOW | MEDIUM | HIGH | CRITICAL
        public DateTime? scheduledDate { get; set; }
        public DateTime? dueDate { get; set; }
        public DateTime? actualStartAt { get; set; }
        public DateTime? actualEndAt { get; set; }
        public DateTime? approvedAt { get; set; }
        public string? rejectedReason { get; set; }
        public decimal? estimatedHours { get; set; }
        public decimal? actualHours { get; set; }
        public decimal? totalCost { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; } = DateTime.UtcNow;
        public DateTime updatedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual TH.Asset.Domain.Core.Asset? asset { get; set; }

        [ForeignKey(nameof(scheduleId))]
        public virtual MaintenanceSchedule? schedule { get; set; }

        [ForeignKey(nameof(checklistTemplateId))]
        public virtual ChecklistTemplate? checklistTemplate { get; set; }

        // Inverse navigation
        public virtual ICollection<WorkOrderAssignment>? assignments { get; set; }
        public virtual ICollection<WorkOrderChecklistResponse>? checklistResponses { get; set; }
        public virtual ICollection<WorkOrderAttachment>? attachments { get; set; }
        public virtual ICollection<WorkOrderMaterialUsed>? materialsUsed { get; set; }
    }

    [Table("work_order_assignments", Schema = "asset")]
    public class WorkOrderAssignment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid woId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid assignedTo { get; set; }

        public Guid? checkinQrAssetId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(woId))]
        public virtual WorkOrder? workOrder { get; set; }

        [ForeignKey(nameof(checkinQrAssetId))]
        public virtual TH.Asset.Domain.Core.Asset? checkinQrAsset { get; set; }
    }

    [Table("work_order_checklist_responses", Schema = "asset")]
    public class WorkOrderChecklistResponse
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid woId { get; set; }
        public Guid templateItemId { get; set; }
        public bool isPassed { get; set; }

        // Patch fields
        [MaxLength(500)]
        public string? valueText { get; set; }
        public string? notes { get; set; }
        public string? photoUrl { get; set; }
        public DateTime respondedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(woId))]
        public virtual WorkOrder? workOrder { get; set; }

        [ForeignKey(nameof(templateItemId))]
        public virtual ChecklistTemplateItem? templateItem { get; set; }
    }

    [Table("work_order_attachments", Schema = "asset")]
    public class WorkOrderAttachment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid woId { get; set; }

        [MaxLength(30)]
        public required string attachmentType { get; set; }
        public string fileUrl { get; set; } = null!;

        // Patch fields
        [MaxLength(300)]
        public string? fileName { get; set; }
        public int? fileSizeBytes { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? uploadedBy { get; set; }
        public DateTime uploadedAt { get; set; } = DateTime.UtcNow;
        [MaxLength(500)]
        public string? caption { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(woId))]
        public virtual WorkOrder? workOrder { get; set; }
    }

    [Table("work_order_materials_used", Schema = "asset")]
    public class WorkOrderMaterialUsed
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid woId { get; set; }
        public Guid materialId { get; set; }
        public Guid warehouseId { get; set; }
        public Guid? inventoryTransactionId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(woId))]
        public virtual WorkOrder? workOrder { get; set; }

        [ForeignKey(nameof(materialId))]
        public virtual Material? material { get; set; }

        [ForeignKey(nameof(warehouseId))]
        public virtual Warehouse? warehouse { get; set; }

        [ForeignKey(nameof(inventoryTransactionId))]
        public virtual InventoryTransaction? inventoryTransaction { get; set; }
    }
}
