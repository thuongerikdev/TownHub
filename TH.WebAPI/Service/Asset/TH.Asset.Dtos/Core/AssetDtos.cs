using System;

namespace TH.Asset.Dtos
{
    // ============================================================
    // ASSET DTOs
    // ============================================================
    public class CreateAssetDto
    {
        public required string assetCode { get; set; }
        public required string name { get; set; }
        public Guid categoryId { get; set; }
        public Guid? locationId { get; set; }
        public Guid? parentAssetId { get; set; }

        // Cross-service (Base) — chỉ lưu FK scalar
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }

        public Guid? vendorId { get; set; }
        public Guid? vendorContractId { get; set; }

        public string status { get; set; } = "ACTIVE";
        public string? serialNumber { get; set; }

        // Financial & Lifecycle
        public decimal? purchasePrice { get; set; }
        public DateTime? purchaseDate { get; set; }
        public DateTime? warrantyExpiryDate { get; set; }
        public int? usefulLifeMonths { get; set; }
        public decimal salvageValue { get; set; } = 0;
        public string depreciationMethod { get; set; } = "STRAIGHT_LINE";
        public DateTime? installationDate { get; set; }
        public string criticalityLevel { get; set; } = "MEDIUM";
        public string? notes { get; set; }
    }

    public class UpdateAssetDto : CreateAssetDto
    {
        public Guid id { get; set; }
        public DateTime? lastMaintenanceDate { get; set; }
        public DateTime? nextMaintenanceDate { get; set; }
        public decimal accumulatedDepreciation { get; set; } = 0;
        public decimal? bookValue { get; set; }
    }

    public class AssetResponse
    {
        public Guid id { get; set; }
        public string assetCode { get; set; } = null!;
        public string name { get; set; } = null!;
        public Guid categoryId { get; set; }
        public string? categoryName { get; set; }
        public Guid? locationId { get; set; }
        public string? locationAreaCode { get; set; }
        public Guid? parentAssetId { get; set; }
        public string? parentAssetCode { get; set; }
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }
        public Guid? vendorId { get; set; }
        public string? vendorName { get; set; }
        public Guid? vendorContractId { get; set; }
        public string status { get; set; } = null!;
        public string? serialNumber { get; set; }
        public decimal? purchasePrice { get; set; }
        public DateTime? purchaseDate { get; set; }
        public DateTime? warrantyExpiryDate { get; set; }
        public int? usefulLifeMonths { get; set; }
        public decimal salvageValue { get; set; }
        public string depreciationMethod { get; set; } = null!;
        public decimal accumulatedDepreciation { get; set; }
        public decimal? bookValue { get; set; }
        public DateTime? installationDate { get; set; }
        public DateTime? lastMaintenanceDate { get; set; }
        public DateTime? nextMaintenanceDate { get; set; }
        public string criticalityLevel { get; set; } = null!;
        public string? notes { get; set; }
    }

    // ============================================================
    // ASSET CATEGORY DTOs
    // ============================================================
    public class CreateAssetCategoryDto
    {
        public required string code { get; set; }
        public required string name { get; set; }
        public Guid? parentId { get; set; }
        public Guid? defaultChecklistTemplateId { get; set; }
    }

    public class UpdateAssetCategoryDto : CreateAssetCategoryDto
    {
        public Guid id { get; set; }
    }

    public class AssetCategoryResponse
    {
        public Guid id { get; set; }
        public string code { get; set; } = null!;
        public string name { get; set; } = null!;
        public Guid? parentId { get; set; }
        public string? parentName { get; set; }
        public Guid? defaultChecklistTemplateId { get; set; }
        public string? defaultChecklistTemplateName { get; set; }
    }

    // ============================================================
    // ASSET LOCATION DTOs
    // ============================================================
    public class CreateAssetLocationDto
    {
        // Cross-service (Base)
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }
        public string? areaCode { get; set; }
    }

    public class UpdateAssetLocationDto : CreateAssetLocationDto
    {
        public Guid id { get; set; }
    }

    public class AssetLocationResponse
    {
        public Guid id { get; set; }
        public Guid buildingId { get; set; }
        public Guid? floorId { get; set; }
        public string? areaCode { get; set; }
    }

    // ============================================================
    // ASSET QR CODE DTOs
    // ============================================================
    public class CreateAssetQrCodeDto
    {
        public Guid assetId { get; set; }
        public required string qrCode { get; set; }
    }

    public class AssetQrCodeResponse
    {
        public Guid id { get; set; }
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
        public string qrCode { get; set; } = null!;
    }

    // ============================================================
    // ASSET TRANSFER DTOs
    // ============================================================
    public class CreateAssetTransferDto
    {
        public Guid assetId { get; set; }
        public Guid? fromLocationId { get; set; }
        public Guid toLocationId { get; set; }
        // Cross-service (Auth)
        public Guid? transferredBy { get; set; }
        public Guid? workOrderId { get; set; }
    }

    public class AssetTransferResponse
    {
        public Guid id { get; set; }
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public Guid? fromLocationId { get; set; }
        public string? fromAreaCode { get; set; }
        public Guid toLocationId { get; set; }
        public string? toAreaCode { get; set; }
        public Guid? transferredBy { get; set; }
        public Guid? workOrderId { get; set; }
        public string? woCode { get; set; }
    }

    // ============================================================
    // ASSET DEPRECIATION LOG — chỉ Response (hệ thống tự sinh)
    // ============================================================
    public class AssetDepreciationLogResponse
    {
        public Guid id { get; set; }
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public int periodYear { get; set; }
        public int periodMonth { get; set; }
        public decimal depreciationAmount { get; set; }
        public decimal? bookValueBefore { get; set; }
        public decimal? bookValueAfter { get; set; }
        public decimal? accumulatedTotal { get; set; }
        public DateTime calculatedAt { get; set; }
        // Cross-service (Auth)
        public Guid? calculatedBy { get; set; }
    }

    // ============================================================
    // IOT SENSOR READING — chỉ Response (thiết bị tự đẩy)
    // ============================================================
    public class IotSensorReadingResponse
    {
        public Guid id { get; set; }
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public string sensorCode { get; set; } = null!;
        public decimal readingValue { get; set; }
        public DateTime readingAt { get; set; }
    }
}
