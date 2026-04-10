
using System;
using System.Collections.Generic;
using TH.Constant.Database;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TH.TownHub.Domain.Entities
{
    // ============================================================
    // APARTMENTS — Định danh căn hộ
    // ===========================================================

    [Table("apartments", Schema = Constant.Database.DbSchema.Auth)]
    public class Apartment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string Code { get; set; }           // VD: A1201

        [Required]
        public required string Building { get; set; }       // Tòa A, Tòa B, Villa

        public int Floor { get; set; }

        [Required]
        public required string UnitNumber { get; set; }

        [Required]
        public required string Type { get; set; }           // 1PN, 2PN, 3PN, Villa, Studio

        public decimal AreaM2 { get; set; }

        [Required]
        public required string Status { get; set; } = "vacant"; // occupied | vacant | maintenance

        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual ICollection<Resident>? Residents { get; set; }
        public virtual ICollection<Fee>? Fees { get; set; }
        public virtual ICollection<Incident>? Incidents { get; set; }
    }

    // ============================================================
    // RESIDENTS — Cư dân
    // Không FK đến bảng users của service Auth — sẽ liên kết qua service trung gian
    // ============================================================
    [Table("residents", Schema = Constant.Database.DbSchema.TownHub)]
    public class Resident
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string FullName { get; set; }

        [Required]
        public required string Phone { get; set; }

        public string? Email { get; set; }

        public string? IdCard { get; set; }     // CCCD / CMND

        public DateTime? DateOfBirth { get; set; }

        public string? Gender { get; set; }     // male | female | other

        public int? ApartmentId { get; set; }
        [ForeignKey(nameof(ApartmentId))]
        public virtual Apartment? Apartment { get; set; }

        public bool IsOwner { get; set; } = false;

        public DateTime? MoveInDate { get; set; }
        public DateTime? MoveOutDate { get; set; }

        public string? AvatarUrl { get; set; }

        // ID của user bên service Auth — KHÔNG dùng FK, liên kết qua service trung gian
        public int? AuthUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // NOTIFICATION TEMPLATES — Mẫu thông báo
    // ============================================================
    [Table("notification_templates", Schema = Constant.Database.DbSchema.TownHub)]
    public class NotificationTemplate
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string Name { get; set; }

        [Required]
        public required string Channel { get; set; }    // push | email | sms

        public string? Subject { get; set; }

        [Required]
        public required string Body { get; set; }

        public string? Variables { get; set; }          // JSON array: ["resident_name","month"]

        public bool IsActive { get; set; } = true;

        // ID người tạo bên service Auth — KHÔNG dùng FK
        public int? CreatedByAuthUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Notification>? Notifications { get; set; }
    }

    // ============================================================
    // NOTIFICATIONS — Chiến dịch thông báo
    // ============================================================
    [Table("notifications", Schema = Constant.Database.DbSchema.TownHub)]
    public class Notification
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string Title { get; set; }

        [Required]
        public required string Content { get; set; }

        [Required]
        public required string Channel { get; set; }    // push | email | sms

        [Required]
        public required string Audience { get; set; }   // all | building_a | building_b | villa | owners | staff

        public int? TemplateId { get; set; }
        [ForeignKey(nameof(TemplateId))]
        public virtual NotificationTemplate? Template { get; set; }

        [Required]
        public required string Status { get; set; } = "draft"; // draft | scheduled | sending | sent | failed

        public int TotalRecipients { get; set; } = 0;
        public int SentCount { get; set; } = 0;
        public int FailedCount { get; set; } = 0;

        public DateTime? ScheduledAt { get; set; }
        public DateTime? SentAt { get; set; }

        // ID người tạo bên service Auth — KHÔNG dùng FK
        public int CreatedByAuthUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<NotificationLog>? Logs { get; set; }
    }

    // ============================================================
    // NOTIFICATION LOGS — Log gửi thông báo đến từng người
    // ============================================================
    [Table("notification_logs", Schema = Constant.Database.DbSchema.TownHub)]
    public class NotificationLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int NotificationId { get; set; }
        [ForeignKey(nameof(NotificationId))]
        public virtual Notification Notification { get; set; } = null!;

        public int? ResidentId { get; set; }
        [ForeignKey(nameof(ResidentId))]
        public virtual Resident? Resident { get; set; }

        [Required]
        public required string Channel { get; set; }

        [Required]
        public required string Recipient { get; set; }  // email / phone / device token

        public string Status { get; set; } = "pending"; // pending | delivered | failed

        public string? ErrorMessage { get; set; }

        public DateTime? SentAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // INCIDENTS — Sự cố
    // ============================================================
    [Table("incidents", Schema = Constant.Database.DbSchema.TownHub)]
    public class Incident
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string Title { get; set; }

        public string? Description { get; set; }

        public string? Location { get; set; }

        public int? ApartmentId { get; set; }
        [ForeignKey(nameof(ApartmentId))]
        public virtual Apartment? Apartment { get; set; }

        [Required]
        public required string Category { get; set; }   // elevator | plumbing | electrical | security | safety | cleaning | parking | other

        [Required]
        public required string Priority { get; set; }   // low | medium | high | critical

        [Required]
        public required string Status { get; set; } = "open"; // open | in_progress | resolved | closed

        // ID bên service Auth — KHÔNG dùng FK
        public int ReportedByAuthUserId { get; set; }
        public int? AssignedToAuthUserId { get; set; }

        public DateTime? ResolvedAt { get; set; }
        public string? ResolutionNote { get; set; }

        public string? Attachments { get; set; }        // JSON array of URLs

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<IncidentComment>? Comments { get; set; }
    }

    // ============================================================
    // INCIDENT COMMENTS — Cập nhật tiến độ xử lý
    // ============================================================
    [Table("incident_comments", Schema = Constant.Database.DbSchema.TownHub)]
    public class IncidentComment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int IncidentId { get; set; }
        [ForeignKey(nameof(IncidentId))]
        public virtual Incident Incident { get; set; } = null!;

        // ID bên service Auth — KHÔNG dùng FK
        public int AuthorAuthUserId { get; set; }

        [Required]
        public required string Content { get; set; }

        public string? Attachments { get; set; }        // JSON array of URLs

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // FEE TYPES — Danh mục loại phí
    // ============================================================
    [Table("fee_types", Schema = Constant.Database.DbSchema.TownHub)]
    public class FeeType
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string Name { get; set; }       // Phí quản lý, Phí dịch vụ…

        public string? Description { get; set; }

        public decimal UnitPrice { get; set; } = 0;    // VNĐ

        public bool IsPerM2 { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<Fee>? Fees { get; set; }
    }

    // ============================================================
    // FEES — Phiếu phí dịch vụ
    // ============================================================
    [Table("fees", Schema = Constant.Database.DbSchema.TownHub)]
    public class Fee
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int ApartmentId { get; set; }
        [ForeignKey(nameof(ApartmentId))]
        public virtual Apartment Apartment { get; set; } = null!;

        public int FeeTypeId { get; set; }
        [ForeignKey(nameof(FeeTypeId))]
        public virtual FeeType FeeType { get; set; } = null!;

        [Required]
        public required string BillingMonth { get; set; }  // Format: YYYY-MM

        public decimal Amount { get; set; }

        public DateTime DueDate { get; set; }

        [Required]
        public required string Status { get; set; } = "unpaid"; // unpaid | paid | overdue | cancelled

        public DateTime? PaidAt { get; set; }

        public string? PaymentMethod { get; set; }      // VNPay, MoMo, Bank Transfer

        public string? PaymentRef { get; set; }

        public string? Note { get; set; }

        // ID bên service Auth — KHÔNG dùng FK
        public int? CreatedByAuthUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // SYSTEM CONFIG — Cấu hình hệ thống
    // ============================================================
    [Table("system_configs", Schema = Constant.Database.DbSchema.TownHub)]
    public class SystemConfig
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string Key { get; set; }

        [Required]
        public required string Value { get; set; }

        [Required]
        public required string DataType { get; set; } = "string"; // string | integer | boolean | json

        public string? Description { get; set; }

        public bool IsPublic { get; set; } = false;

        // ID bên service Auth — KHÔNG dùng FK
        public int? UpdatedByAuthUserId { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // AUDIT LOGS — Lịch sử hoạt động
    // ============================================================
    [Table("audit_logs", Schema = Constant.Database.DbSchema.TownHub)]
    public class AuditLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; }

        // ID bên service Auth — KHÔNG dùng FK
        public int ActorAuthUserId { get; set; }

        [Required]
        public required string Action { get; set; }     // SEND_NOTIFICATION, RESOLVE_INCIDENT…

        public string? TargetType { get; set; }         // Notification | Incident | Fee…

        public int? TargetId { get; set; }

        public string? OldData { get; set; }            // JSON snapshot trước khi thay đổi

        public string? NewData { get; set; }            // JSON snapshot sau khi thay đổi

        public string? IpAddress { get; set; }

        public string? UserAgent { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // ============================================================
    // FILES — Quản lý file upload
    // ============================================================
    [Table("files", Schema = Constant.Database.DbSchema.TownHub)]
    public class FileStorage
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public required string OriginalName { get; set; }

        [Required]
        public required string StorageKey { get; set; }     // path trên S3

        [Required]
        public required string Url { get; set; }

        public string? MimeType { get; set; }

        public long? SizeBytes { get; set; }

        public string? EntityType { get; set; }             // incident | notification | resident

        public int? EntityId { get; set; }

        // ID bên service Auth — KHÔNG dùng FK
        public int UploadedByAuthUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
