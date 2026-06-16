using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TH.Asset.Domain.System
{
    // ============================================================
    // KPI_DAILY_SNAPSHOTS — Snapshot KPI hàng ngày (UC57/UC60/UC67)
    // Asset-specific: không trùng với bảng nào trong Base/Auth
    // ============================================================
    [Table("kpi_daily_snapshots", Schema = "asset")]
    public class KpiDailySnapshot
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public DateTime snapshotDate { get; set; }
        public Guid buildingId { get; set; }

        // kpiData lưu dạng JSON string, cấu trúc gợi ý:
        // {
        //   "mttr_hours": 4.2,          -- Mean Time To Repair
        //   "mtbf_days": 45.0,          -- Mean Time Between Failures
        //   "ticket_count_new": 12,
        //   "ticket_count_resolved": 10,
        //   "ticket_count_overdue": 2,
        //   "wo_count_completed": 8,
        //   "wo_completion_rate": 0.89,
        //   "sla_compliance_rate": 0.94,
        //   "asset_availability_rate": 0.98,
        //   "pm_overdue_count": 1,
        //   "total_maintenance_cost": 5500000
        // }
        public string? kpiDataJson { get; set; }

        public DateTime createdAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // COST_TRACKING — Theo dõi chi phí (UC58/UC61)
    // Asset-specific: không trùng với bảng nào trong Base/Auth
    // ============================================================
    [Table("cost_tracking", Schema = "asset")]
    public class CostTracking
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(30)]
        public required string referenceType { get; set; }   // WORK_ORDER | TICKET | PURCHASE_ORDER | INVOICE
        public Guid referenceId { get; set; }
        public Guid? assetId { get; set; }
        public Guid? categoryId { get; set; }
        public Guid buildingId { get; set; }
        public Guid? departmentId { get; set; }

        // Patch fields
        public decimal amount { get; set; } = 0;
        [MaxLength(3)]
        public string currency { get; set; } = "VND";
        [MaxLength(30)]
        public string? costType { get; set; }   // LABOR | MATERIAL | SERVICE | OTHER
        public DateTime costDate { get; set; } = DateTime.UtcNow;
        public string? description { get; set; }
        public Guid? recordedBy { get; set; }
        public DateTime recordedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // NOTE: Các bảng sau đã được CHUYỂN về module Base/Auth:
    //
    //  • Resident      → Base/Entities.cs  (thêm UnitId, UserId)
    //  • Notification  → Base/Entities.cs  (thêm RecipientId, ReferenceType, ReferenceId,
    //                                        Body, IsRead, ReadAt, SendStatus)
    //  • AuditLog      → Base/Entities.cs  (thêm TableName, RecordId, ChangedBy)
    //  • AppSetting    → Base/Entities.cs  (SystemConfig + thêm Scope, UpdatedBy)
    // ============================================================
}
