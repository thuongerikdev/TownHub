using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TH.Asset.Domain.Maintenance;
using TH.Asset.Domain.Vendor;

namespace TH.Asset.Domain.Core
{
    [Table("assets", Schema = "asset")]
    public class Asset
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string assetCode { get; set; }

        [Required, MaxLength(200)]
        public required string name { get; set; }

        public Guid categoryId { get; set; }
        public Guid? locationId { get; set; }
        public Guid? parentAssetId { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }

        public Guid? vendorId { get; set; }
        public Guid? vendorContractId { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "ACTIVE";

        [MaxLength(100)]
        public string? serialNumber { get; set; }

        // Financial & Lifecycle (UC14/UC66)
        public decimal? purchasePrice { get; set; }
        public DateTime? purchaseDate { get; set; }
        public DateTime? warrantyExpiryDate { get; set; }
        public int? usefulLifeMonths { get; set; }
        public decimal salvageValue { get; set; } = 0;
        [MaxLength(20)]
        public string depreciationMethod { get; set; } = "STRAIGHT_LINE"; // STRAIGHT_LINE | DECLINING_BALANCE
        public decimal accumulatedDepreciation { get; set; } = 0;
        public decimal? bookValue { get; set; }
        public DateTime? installationDate { get; set; }
        public DateTime? lastMaintenanceDate { get; set; }
        public DateTime? nextMaintenanceDate { get; set; }
        [MaxLength(20)]
        public string criticalityLevel { get; set; } = "MEDIUM"; // LOW | MEDIUM | HIGH | CRITICAL
        public string? notes { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(categoryId))]
        public virtual AssetCategory? category { get; set; }

        [ForeignKey(nameof(locationId))]
        public virtual AssetLocation? location { get; set; }

        [ForeignKey(nameof(parentAssetId))]
        public virtual Asset? parentAsset { get; set; }
        public virtual ICollection<Asset>? childAssets { get; set; }

        [ForeignKey(nameof(vendorId))]
        public virtual TH.Asset.Domain.Vendor.Vendor? vendor { get; set; }

        [ForeignKey(nameof(vendorContractId))]
        public virtual VendorContract? vendorContract { get; set; }

        // Inverse navigation
        public virtual AssetQrCode? qrCode { get; set; }
        public virtual ICollection<AssetTransfer>? transfers { get; set; }
        public virtual ICollection<AssetDepreciationLog>? depreciationLogs { get; set; }
        public virtual ICollection<IotSensorReading>? sensorReadings { get; set; }
    }

    [Table("asset_categories", Schema = "asset")]
    public class AssetCategory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string code { get; set; }

        [Required, MaxLength(200)]
        public required string name { get; set; }

        public Guid? parentId { get; set; }
        public Guid? defaultChecklistTemplateId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(parentId))]
        public virtual AssetCategory? parentCategory { get; set; }
        public virtual ICollection<AssetCategory>? childCategories { get; set; }

        [ForeignKey(nameof(defaultChecklistTemplateId))]
        public virtual ChecklistTemplate? defaultChecklistTemplate { get; set; }

        // Inverse navigation
        public virtual ICollection<Asset>? assets { get; set; }
    }

    [Table("asset_locations", Schema = "asset")]
    public class AssetLocation
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }

        [MaxLength(50)]
        public string? areaCode { get; set; }

        // ── Navigation Properties (inverse) ──
        public virtual ICollection<Asset>? assets { get; set; }
        public virtual ICollection<AssetTransfer>? fromTransfers { get; set; }
        public virtual ICollection<AssetTransfer>? toTransfers { get; set; }
    }

    [Table("asset_qr_codes", Schema = "asset")]
    public class AssetQrCode
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid assetId { get; set; }

        [Required, MaxLength(200)]
        public required string qrCode { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual Asset? asset { get; set; }
    }

    [Table("asset_transfers", Schema = "asset")]
    public class AssetTransfer
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid assetId { get; set; }
        public Guid? fromLocationId { get; set; }
        public Guid toLocationId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid? transferredBy { get; set; }

        public Guid? workOrderId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual Asset? asset { get; set; }

        [ForeignKey(nameof(fromLocationId))]
        public virtual AssetLocation? fromLocation { get; set; }

        [ForeignKey(nameof(toLocationId))]
        public virtual AssetLocation? toLocation { get; set; }

        [ForeignKey(nameof(workOrderId))]
        public virtual TH.Asset.Domain.Maintenance.WorkOrder? workOrder { get; set; }
    }

    [Table("asset_depreciation_log", Schema = "asset")]
    public class AssetDepreciationLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid assetId { get; set; }
        public int periodYear { get; set; }
        public int periodMonth { get; set; }
        public decimal depreciationAmount { get; set; }

        // Patch fields
        public decimal? bookValueBefore { get; set; }
        public decimal? bookValueAfter { get; set; }
        public decimal? accumulatedTotal { get; set; }
        public DateTime calculatedAt { get; set; } = DateTime.UtcNow;
        // Cross-service (Auth) — không dùng navigation property
        public Guid? calculatedBy { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual Asset? asset { get; set; }
    }

    [Table("iot_sensor_readings", Schema = "asset")]
    public class IotSensorReading
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid assetId { get; set; }

        [Required, MaxLength(100)]
        public required string sensorCode { get; set; }

        public decimal readingValue { get; set; }
        public DateTime readingAt { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(assetId))]
        public virtual Asset? asset { get; set; }
    }
}
