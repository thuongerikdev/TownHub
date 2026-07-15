using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TH.Asset.Domain.Core;
using TH.Asset.Domain.Inventory;

namespace TH.Asset.Domain.Incident
{
    [Table("sla_configs", Schema = "asset")]
    public class SlaConfig
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(100)]
        public required string name { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid? buildingId { get; set; }

        [MaxLength(100)]
        public string? issueCategory { get; set; }

        // Patch fields
        [MaxLength(10)]
        public string priorityLevel { get; set; } = "MEDIUM"; // LOW | MEDIUM | HIGH | CRITICAL
        public decimal? responseTimeHours { get; set; }
        public decimal? resolutionTimeHours { get; set; }
        public decimal? escalationL1AfterHours { get; set; }
        public decimal? escalationL2AfterHours { get; set; }
        public decimal? escalationL3AfterHours { get; set; }
        public string? escalationContactsJson { get; set; } // JSON: [{"level":1,"user_id":"...","channel":"EMAIL"}]
        public bool businessHoursOnly { get; set; } = false;
        public bool isActive { get; set; } = true;

        // ── Navigation Properties (inverse) ──
        public virtual ICollection<Ticket>? tickets { get; set; }
    }

    [Table("tickets", Schema = "asset")]
    public class Ticket
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string ticketCode { get; set; }

        [MaxLength(30)]
        public string status { get; set; } = "OPEN";

        // Cross-service (Base) — không dùng navigation property
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }
        public Guid? unitId { get; set; }

        public Guid? assetId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid reportedBy { get; set; }
        // Tên người báo do FE nhập tự do (Auth dùng int id, Asset dùng Guid — không có FK)
        [MaxLength(150)]
        public string? reportedByName { get; set; }

        // Kỹ thuật viên được phân công (Auth userID là int → lưu id + tên hiển thị)
        public int? assignedToUserId { get; set; }
        [MaxLength(150)]
        public string? assignedToName { get; set; }

        public Guid? slaConfigId { get; set; }
        public Guid? purchaseRequestId { get; set; }

        // Patch fields
        [MaxLength(300)]
        public string? title { get; set; }
        public string? description { get; set; }
        [MaxLength(100)]
        public string? category { get; set; } // ELECTRICAL | PLUMBING | HVAC | OTHER…
        [MaxLength(10)]
        public string priority { get; set; } = "MEDIUM"; // LOW | MEDIUM | HIGH | CRITICAL
        [MaxLength(20)]
        public string source { get; set; } = "APP"; // APP | RECEPTION | PHONE | EMAIL
        public DateTime? resolvedAt { get; set; }
        public DateTime? closedAt { get; set; }
        public bool autoClosed { get; set; } = false;
        public string? resolutionNote { get; set; }
        public DateTime createdAt { get; set; } = DateTime.UtcNow;
        public DateTime updatedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual TH.Asset.Domain.Core.Asset? asset { get; set; }

        [ForeignKey(nameof(slaConfigId))]
        public virtual SlaConfig? slaConfig { get; set; }

        [ForeignKey(nameof(purchaseRequestId))]
        public virtual PurchaseRequest? purchaseRequest { get; set; }

        // Inverse navigation
        public virtual ICollection<TicketAssignment>? assignments { get; set; }
        public virtual ICollection<TicketAttachment>? attachments { get; set; }
        public virtual TicketRating? rating { get; set; }
        public virtual ICollection<TicketStatusHistory>? statusHistory { get; set; }
        public virtual ICollection<SlaEscalationLog>? escalationLogs { get; set; }
    }

    [Table("ticket_assignments", Schema = "asset")]
    public class TicketAssignment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid ticketId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid assignedTo { get; set; }
        // Auth userID (int) + tên hiển thị của KTV được phân công
        public int? assignedToUserId { get; set; }
        [MaxLength(150)]
        public string? assignedToName { get; set; }
        public DateTime assignedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(ticketId))]
        public virtual Ticket? ticket { get; set; }
    }

    [Table("ticket_attachments", Schema = "asset")]
    public class TicketAttachment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid ticketId { get; set; }
        public string fileUrl { get; set; } = null!;

        // ── Navigation Properties ──
        [ForeignKey(nameof(ticketId))]
        public virtual Ticket? ticket { get; set; }
    }

    [Table("ticket_ratings", Schema = "asset")]
    public class TicketRating
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid ticketId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid ratedBy { get; set; }

        public short overallRating { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(ticketId))]
        public virtual Ticket? ticket { get; set; }
    }

    [Table("ticket_status_history", Schema = "asset")]
    public class TicketStatusHistory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid ticketId { get; set; }

        [MaxLength(30)]
        public string? fromStatus { get; set; }

        [Required, MaxLength(30)]
        public required string toStatus { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid? changedBy { get; set; }

        // Patch fields
        public DateTime changedAt { get; set; } = DateTime.UtcNow;
        public string? note { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(ticketId))]
        public virtual Ticket? ticket { get; set; }
    }

    [Table("sla_escalation_log", Schema = "asset")]
    public class SlaEscalationLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid ticketId { get; set; }
        public short escalationLevel { get; set; }

        // Patch fields
        public DateTime escalatedAt { get; set; } = DateTime.UtcNow;
        // Cross-service (Auth) — không dùng navigation property
        public Guid? escalatedTo { get; set; }
        [MaxLength(20)]
        public string? channel { get; set; } // EMAIL | SMS | PUSH
        public string? message { get; set; }
        public DateTime? acknowledgedAt { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? acknowledgedBy { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(ticketId))]
        public virtual Ticket? ticket { get; set; }
    }
}
