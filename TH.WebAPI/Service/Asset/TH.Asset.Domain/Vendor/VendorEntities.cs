using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TH.Asset.Domain.Vendor
{
    [Table("vendors", Schema = "asset")]
    public class Vendor
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string vendorCode { get; set; }

        [Required, MaxLength(300)]
        public required string name { get; set; }

        [Required, MaxLength(20)]
        public required string taxId { get; set; }

        // Patch fields
        [MaxLength(20)]
        public string status { get; set; } = "ACTIVE";
        public string? blacklistReason { get; set; }
        public DateTime? blacklistedAt { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? blacklistedBy { get; set; }
        [MaxLength(200)]
        public string? contactName { get; set; }
        [MaxLength(255)]
        public string? contactEmail { get; set; }
        [MaxLength(20)]
        public string? contactPhone { get; set; }
        public string? address { get; set; }
        public string? notes { get; set; }

        // ── Navigation Properties (inverse) ──
        public virtual ICollection<VendorContract>? contracts { get; set; }
        public virtual ICollection<VendorEvaluation>? evaluations { get; set; }
    }

    [Table("vendor_contracts", Schema = "asset")]
    public class VendorContract
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string contractCode { get; set; }

        public Guid vendorId { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid? buildingId { get; set; }

        // Patch fields
        public DateTime? startDate { get; set; }
        public DateTime? endDate { get; set; }
        public decimal? contractValue { get; set; }
        [MaxLength(3)]
        public string currency { get; set; } = "VND";
        [MaxLength(100)]
        public string? paymentTerms { get; set; }
        public int renewalNoticeDays { get; set; } = 30;
        [MaxLength(20)]
        public string status { get; set; } = "ACTIVE";
        public string? scopeOfWork { get; set; }
        public string? fileUrl { get; set; }
        [MaxLength(200)]
        public string? signedByVendor { get; set; }
        [MaxLength(200)]
        public string? signedByBuilding { get; set; }
        public string? notes { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(vendorId))]
        public virtual Vendor? vendor { get; set; }

        // Inverse navigation
        public virtual ICollection<VendorContractService>? services { get; set; }
        public virtual ICollection<VendorEvaluation>? evaluations { get; set; }
    }

    [Table("vendor_contract_services", Schema = "asset")]
    public class VendorContractService
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid contractId { get; set; }

        [Required, MaxLength(300)]
        public required string serviceName { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(contractId))]
        public virtual VendorContract? contract { get; set; }
    }

    [Table("vendor_evaluations", Schema = "asset")]
    public class VendorEvaluation
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid vendorId { get; set; }
        public Guid? contractId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid evaluatorId { get; set; }

        // Patch fields
        public DateTime evaluationDate { get; set; } = DateTime.UtcNow;
        public short overallScore { get; set; }
        public short qualityScore { get; set; }
        public short timelinessScore { get; set; }
        public short costScore { get; set; }
        public short safetyScore { get; set; }
        public string? comments { get; set; }
        [MaxLength(20)]
        public string? recommendation { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(vendorId))]
        public virtual Vendor? vendor { get; set; }

        [ForeignKey(nameof(contractId))]
        public virtual VendorContract? contract { get; set; }
    }
}
