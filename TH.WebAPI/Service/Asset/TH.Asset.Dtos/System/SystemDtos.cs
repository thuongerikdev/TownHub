using System;

namespace TH.Asset.Dtos
{
    // ============================================================
    // KPI DAILY SNAPSHOT — chỉ Response (batch job tự tạo)
    // ============================================================
    public class KpiDailySnapshotResponse
    {
        public Guid id { get; set; }
        public DateTime snapshotDate { get; set; }
        // Cross-service (Base)
        public Guid buildingId { get; set; }

        // JSON string chứa tất cả KPI
        // Gợi ý cấu trúc:
        // {
        //   "mttr_hours": 4.2,
        //   "mtbf_days": 45.0,
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
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // COST TRACKING DTOs
    // ============================================================
    public class CreateCostTrackingDto
    {
        public required string referenceType { get; set; }  // WORK_ORDER | TICKET | PURCHASE_ORDER | INVOICE
        public Guid referenceId { get; set; }
        public Guid? assetId { get; set; }
        public Guid? categoryId { get; set; }
        // Cross-service (Base)
        public Guid buildingId { get; set; }
        public Guid? departmentId { get; set; }

        public decimal amount { get; set; } = 0;
        public string currency { get; set; } = "VND";
        public string? costType { get; set; }     // LABOR | MATERIAL | SERVICE | OTHER
        public DateTime costDate { get; set; }
        public string? description { get; set; }
        // Cross-service (Auth)
        public Guid? recordedBy { get; set; }
    }

    public class CostTrackingResponse
    {
        public Guid id { get; set; }
        public string referenceType { get; set; } = null!;
        public Guid referenceId { get; set; }
        public Guid? assetId { get; set; }
        public string? assetCode { get; set; }
        public Guid? categoryId { get; set; }
        public Guid buildingId { get; set; }
        public Guid? departmentId { get; set; }
        public decimal amount { get; set; }
        public string currency { get; set; } = null!;
        public string? costType { get; set; }
        public DateTime costDate { get; set; }
        public string? description { get; set; }
        public Guid? recordedBy { get; set; }
        public DateTime recordedAt { get; set; }
    }
}
