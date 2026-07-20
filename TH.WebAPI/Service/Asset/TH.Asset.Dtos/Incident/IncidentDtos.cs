using System;

namespace TH.Asset.Dtos
{
    // ============================================================
    // SLA CONFIG DTOs
    // ============================================================
    public class CreateSlaConfigDto
    {
        public required string name { get; set; }
        // Cross-service (Base)
        public Guid? buildingId { get; set; }
        public string? issueCategory { get; set; }
        public string priorityLevel { get; set; } = "MEDIUM";  // LOW | MEDIUM | HIGH | CRITICAL
        public decimal? responseTimeHours { get; set; }
        public decimal? resolutionTimeHours { get; set; }
        public decimal? escalationL1AfterHours { get; set; }
        public decimal? escalationL2AfterHours { get; set; }
        public decimal? escalationL3AfterHours { get; set; }
        public string? escalationContactsJson { get; set; }
        public bool businessHoursOnly { get; set; } = false;
        public bool isActive { get; set; } = true;
    }

    public class UpdateSlaConfigDto : CreateSlaConfigDto
    {
        public Guid id { get; set; }
    }

    public class SlaConfigResponse
    {
        public Guid id { get; set; }
        public string name { get; set; } = null!;
        public Guid? buildingId { get; set; }
        public string? issueCategory { get; set; }
        public string priorityLevel { get; set; } = null!;
        public decimal? responseTimeHours { get; set; }
        public decimal? resolutionTimeHours { get; set; }
        public decimal? escalationL1AfterHours { get; set; }
        public decimal? escalationL2AfterHours { get; set; }
        public decimal? escalationL3AfterHours { get; set; }
        public string? escalationContactsJson { get; set; }
        public bool businessHoursOnly { get; set; }
        public bool isActive { get; set; }
    }

    // ============================================================
    // TICKET DTOs
    // ============================================================
    public class CreateTicketDto
    {
        // Bỏ trống → server tự sinh mã dạng TK-{yyyyMM}-{####}.
        public string? ticketCode { get; set; }
        // Cross-service (Base)
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }
        public Guid? unitId { get; set; }

        public Guid? assetId { get; set; }
        // Cross-service (Auth)
        public Guid reportedBy { get; set; }
        public string? reportedByName { get; set; }

        public Guid? slaConfigId { get; set; }
        public Guid? purchaseRequestId { get; set; }

        public string? title { get; set; }
        public string? description { get; set; }
        public string? category { get; set; }         // ELECTRICAL | PLUMBING | HVAC | OTHER
        public string priority { get; set; } = "MEDIUM";
        public string source { get; set; } = "APP";   // APP | RECEPTION | PHONE | EMAIL
    }

    public class UpdateTicketDto : CreateTicketDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "NEW";   // NEW | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED
        public DateTime? resolvedAt { get; set; }
        public DateTime? closedAt { get; set; }
        public bool autoClosed { get; set; } = false;
        public string? resolutionNote { get; set; }
    }

    public class TicketResponse
    {
        public Guid id { get; set; }
        public string ticketCode { get; set; } = null!;
        public string status { get; set; } = null!;
        // Cross-service (Base)
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }
        public Guid? unitId { get; set; }
        public Guid? assetId { get; set; }
        public string? assetCode { get; set; }
        // Cross-service (Auth)
        public Guid reportedBy { get; set; }
        public string? reportedByName { get; set; }
        public int? assignedToUserId { get; set; }
        public string? assignedToName { get; set; }
        public Guid? slaConfigId { get; set; }
        public string? slaConfigName { get; set; }
        public Guid? purchaseRequestId { get; set; }
        public string? prCode { get; set; }
        public string? title { get; set; }
        public string? description { get; set; }
        public string? category { get; set; }
        public string priority { get; set; } = null!;
        public string source { get; set; } = null!;
        public DateTime? resolvedAt { get; set; }
        public DateTime? closedAt { get; set; }
        public bool autoClosed { get; set; }
        public string? resolutionNote { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime updatedAt { get; set; }
    }

    // ============================================================
    // TICKET ASSIGNMENT DTOs
    // ============================================================
    public class CreateTicketAssignmentDto
    {
        public Guid ticketId { get; set; }
        // Cross-service (Auth)
        public Guid assignedTo { get; set; }
        // KTV được chọn từ danh sách (Auth userID int + tên hiển thị)
        public int? assignedToUserId { get; set; }
        public string? assignedToName { get; set; }
    }

    public class TicketAssignmentResponse
    {
        public Guid id { get; set; }
        public Guid ticketId { get; set; }
        public string? ticketCode { get; set; }
        public Guid assignedTo { get; set; }
    }

    // ============================================================
    // TICKET ATTACHMENT DTOs
    // ============================================================
    public class CreateTicketAttachmentDto
    {
        public Guid ticketId { get; set; }
        public required string fileUrl { get; set; }
    }

    public class TicketAttachmentResponse
    {
        public Guid id { get; set; }
        public Guid ticketId { get; set; }
        public string fileUrl { get; set; } = null!;
    }

    // ============================================================
    // TICKET RATING DTOs
    // ============================================================
    public class CreateTicketRatingDto
    {
        public Guid ticketId { get; set; }
        // Cross-service (Auth)
        public Guid ratedBy { get; set; }
        public short overallRating { get; set; }  // 1-5
    }

    public class TicketRatingResponse
    {
        public Guid id { get; set; }
        public Guid ticketId { get; set; }
        public string? ticketCode { get; set; }
        public Guid ratedBy { get; set; }
        public short overallRating { get; set; }
    }

    // ============================================================
    // TICKET STATUS HISTORY DTOs
    // ============================================================
    public class CreateTicketStatusHistoryDto
    {
        public Guid ticketId { get; set; }
        public string? fromStatus { get; set; }
        public required string toStatus { get; set; }
        // Cross-service (Auth)
        public Guid? changedBy { get; set; }
        public string? note { get; set; }
    }

    public class TicketStatusHistoryResponse
    {
        public Guid id { get; set; }
        public Guid ticketId { get; set; }
        public string? fromStatus { get; set; }
        public string toStatus { get; set; } = null!;
        public Guid? changedBy { get; set; }
        public DateTime changedAt { get; set; }
        public string? note { get; set; }
    }

    // ============================================================
    // SLA ESCALATION LOG — chỉ Response (hệ thống tự sinh)
    // ============================================================
    public class SlaEscalationLogResponse
    {
        public Guid id { get; set; }
        public Guid ticketId { get; set; }
        public string? ticketCode { get; set; }
        public short escalationLevel { get; set; }
        public DateTime escalatedAt { get; set; }
        // Cross-service (Auth)
        public Guid? escalatedTo { get; set; }
        public string? channel { get; set; }  // EMAIL | SMS | PUSH
        public string? message { get; set; }
        public DateTime? acknowledgedAt { get; set; }
        public Guid? acknowledgedBy { get; set; }
    }
}
