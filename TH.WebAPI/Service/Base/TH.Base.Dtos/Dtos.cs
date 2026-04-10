using System;

namespace TH.TownHub.Dtos
{
    // ============================================================
    // APARTMENT DTOs
    // ============================================================
    public class CreateApartmentRequestDto
    {
        public required string code { get; set; }
        public required string building { get; set; }
        public int floor { get; set; }
        public required string unitNumber { get; set; }
        public required string type { get; set; }
        public decimal areaM2 { get; set; }
        public string status { get; set; } = "vacant";
        public string? note { get; set; }
    }

    public class UpdateApartmentRequestDto : CreateApartmentRequestDto
    {
        public int id { get; set; }
    }

    public class ApartmentResponse
    {
        public int id { get; set; }
        public string code { get; set; } = null!;
        public string building { get; set; } = null!;
        public int floor { get; set; }
        public string unitNumber { get; set; } = null!;
        public string type { get; set; } = null!;
        public decimal areaM2 { get; set; }
        public string status { get; set; } = null!;
        public string? note { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // RESIDENT DTOs
    // ============================================================
    public class CreateResidentRequestDto
    {
        public required string fullName { get; set; }
        public required string phone { get; set; }
        public string? email { get; set; }
        public string? idCard { get; set; }
        public DateTime? dateOfBirth { get; set; }
        public string? gender { get; set; }
        public int? apartmentId { get; set; }
        public bool isOwner { get; set; } = false;
        public DateTime? moveInDate { get; set; }
        public string? avatarUrl { get; set; }
        public int? authUserId { get; set; }
    }

    public class UpdateResidentRequestDto : CreateResidentRequestDto
    {
        public int id { get; set; }
        public DateTime? moveOutDate { get; set; }
    }

    public class ResidentResponse
    {
        public int id { get; set; }
        public string fullName { get; set; } = null!;
        public string phone { get; set; } = null!;
        public string? email { get; set; }
        public string? idCard { get; set; }
        public DateTime? dateOfBirth { get; set; }
        public string? gender { get; set; }
        public int? apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        public bool isOwner { get; set; }
        public DateTime? moveInDate { get; set; }
        public DateTime? moveOutDate { get; set; }
        public string? avatarUrl { get; set; }
        public int? authUserId { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // NOTIFICATION TEMPLATE DTOs
    // ============================================================
    public class CreateNotificationTemplateRequestDto
    {
        public required string name { get; set; }
        public required string channel { get; set; }
        public string? subject { get; set; }
        public required string body { get; set; }
        public string? variables { get; set; }
        public bool isActive { get; set; } = true;
        public int? createdByAuthUserId { get; set; }
    }

    public class UpdateNotificationTemplateRequestDto : CreateNotificationTemplateRequestDto
    {
        public int id { get; set; }
    }

    public class NotificationTemplateResponse
    {
        public int id { get; set; }
        public string name { get; set; } = null!;
        public string channel { get; set; } = null!;
        public string? subject { get; set; }
        public string body { get; set; } = null!;
        public string? variables { get; set; }
        public bool isActive { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // NOTIFICATION DTOs
    // ============================================================
    public class CreateNotificationRequestDto
    {
        public required string title { get; set; }
        public required string content { get; set; }
        public required string channel { get; set; }
        public required string audience { get; set; }
        public int? templateId { get; set; }
        public DateTime? scheduledAt { get; set; }
        public int createdByAuthUserId { get; set; }
    }

    public class UpdateNotificationRequestDto : CreateNotificationRequestDto
    {
        public int id { get; set; }
    }

    public class NotificationResponse
    {
        public int id { get; set; }
        public string title { get; set; } = null!;
        public string content { get; set; } = null!;
        public string channel { get; set; } = null!;
        public string audience { get; set; } = null!;
        public string status { get; set; } = null!;
        public int totalRecipients { get; set; }
        public int sentCount { get; set; }
        public int failedCount { get; set; }
        public DateTime? scheduledAt { get; set; }
        public DateTime? sentAt { get; set; }
        public int createdByAuthUserId { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // INCIDENT DTOs
    // ============================================================
    public class CreateIncidentRequestDto
    {
        public required string title { get; set; }
        public string? description { get; set; }
        public string? location { get; set; }
        public int? apartmentId { get; set; }
        public required string category { get; set; }
        public required string priority { get; set; }
        public int reportedByAuthUserId { get; set; }
        public int? assignedToAuthUserId { get; set; }
        public string? attachments { get; set; }
    }

    public class UpdateIncidentRequestDto : CreateIncidentRequestDto
    {
        public int id { get; set; }
        public required string status { get; set; }
        public string? resolutionNote { get; set; }
    }

    public class IncidentResponse
    {
        public int id { get; set; }
        public string title { get; set; } = null!;
        public string? description { get; set; }
        public string? location { get; set; }
        public int? apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        public string category { get; set; } = null!;
        public string priority { get; set; } = null!;
        public string status { get; set; } = null!;
        public int reportedByAuthUserId { get; set; }
        public int? assignedToAuthUserId { get; set; }
        public DateTime? resolvedAt { get; set; }
        public string? resolutionNote { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // FEE TYPE DTOs
    // ============================================================
    public class CreateFeeTypeRequestDto
    {
        public required string name { get; set; }
        public string? description { get; set; }
        public decimal unitPrice { get; set; }
        public bool isPerM2 { get; set; } = false;
    }

    public class UpdateFeeTypeRequestDto : CreateFeeTypeRequestDto
    {
        public int id { get; set; }
    }

    public class FeeTypeResponse
    {
        public int id { get; set; }
        public string name { get; set; } = null!;
        public string? description { get; set; }
        public decimal unitPrice { get; set; }
        public bool isPerM2 { get; set; }
        public bool isActive { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // FEE DTOs
    // ============================================================
    public class CreateFeeRequestDto
    {
        public int apartmentId { get; set; }
        public int feeTypeId { get; set; }
        public required string billingMonth { get; set; }
        public decimal amount { get; set; }
        public DateTime dueDate { get; set; }
        public int? createdByAuthUserId { get; set; }
        public string? note { get; set; }
    }

    public class UpdateFeeStatusRequestDto
    {
        public int id { get; set; }
        public required string status { get; set; }
        public string? paymentMethod { get; set; }
        public string? paymentRef { get; set; }
    }

    public class FeeResponse
    {
        public int id { get; set; }
        public int apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        public int feeTypeId { get; set; }
        public string? feeTypeName { get; set; }
        public string billingMonth { get; set; } = null!;
        public decimal amount { get; set; }
        public DateTime dueDate { get; set; }
        public string status { get; set; } = null!;
        public DateTime? paidAt { get; set; }
        public string? paymentMethod { get; set; }
        public string? paymentRef { get; set; }
        public string? note { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // SYSTEM CONFIG DTOs
    // ============================================================
    public class UpdateSystemConfigRequestDto
    {
        public required string key { get; set; }
        public required string value { get; set; }
        public int? updatedByAuthUserId { get; set; }
    }

    public class SystemConfigResponse
    {
        public int id { get; set; }
        public string key { get; set; } = null!;
        public string value { get; set; } = null!;
        public string dataType { get; set; } = null!;
        public string? description { get; set; }
        public bool isPublic { get; set; }
        public DateTime updatedAt { get; set; }
    }

    // ============================================================
    // AUDIT LOG DTOs
    // ============================================================
    public class CreateAuditLogRequestDto
    {
        public int actorAuthUserId { get; set; }
        public required string action { get; set; }
        public string? targetType { get; set; }
        public int? targetId { get; set; }
        public string? oldData { get; set; }
        public string? newData { get; set; }
        public string? ipAddress { get; set; }
        public string? userAgent { get; set; }
    }

    public class AuditLogResponse
    {
        public long id { get; set; }
        public int actorAuthUserId { get; set; }
        public string action { get; set; } = null!;
        public string? targetType { get; set; }
        public int? targetId { get; set; }
        public string? ipAddress { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // FILE STORAGE DTOs
    // ============================================================
    public class CreateFileRequestDto
    {
        public required string originalName { get; set; }
        public required string storageKey { get; set; }
        public required string url { get; set; }
        public string? mimeType { get; set; }
        public long? sizeBytes { get; set; }
        public string? entityType { get; set; }
        public int? entityId { get; set; }
        public int uploadedByAuthUserId { get; set; }
    }

    public class FileStorageResponse
    {
        public int id { get; set; }
        public string originalName { get; set; } = null!;
        public string url { get; set; } = null!;
        public string? mimeType { get; set; }
        public long? sizeBytes { get; set; }
        public string? entityType { get; set; }
        public int? entityId { get; set; }
        public int uploadedByAuthUserId { get; set; }
        public DateTime createdAt { get; set; }
    }
}
