using System;
using System.Collections.Generic;

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
        // Kế toán
        public string accountCode { get; set; } = "211"; // 211 hữu hình | 213 vô hình
        public string? paymentMethod { get; set; }       // CASH | BANK
        public DateTime? installationDate { get; set; }
        public string criticalityLevel { get; set; } = "MEDIUM";
        public string? notes { get; set; }
        // Người lập chứng từ ghi tăng (Auth) — tuỳ chọn
        public Guid? createdBy { get; set; }
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
        public string accountCode { get; set; } = "211";
        public string? paymentMethod { get; set; }
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
        public Guid? documentId { get; set; }
        public string? documentCode { get; set; }
    }

    // ============================================================
    // CHẠY KHẤU HAO THEO KỲ
    // ============================================================
    public class RunDepreciationDto
    {
        public int year { get; set; }
        public int month { get; set; }
        public Guid? createdBy { get; set; }
    }

    public class RunDepreciationResultDto
    {
        public int year { get; set; }
        public int month { get; set; }
        public int assetCount { get; set; }        // số tài sản được trích trong lần chạy
        public decimal totalAmount { get; set; }   // tổng khấu hao kỳ
        public Guid? documentId { get; set; }
        public string? documentCode { get; set; }
        public int skippedExisting { get; set; }   // số tài sản đã có log kỳ này (bỏ qua)
    }

    // ============================================================
    // CHỨNG TỪ KẾ TOÁN
    // ============================================================
    public class AssetDocumentResponse
    {
        public Guid id { get; set; }
        public string documentCode { get; set; } = null!;
        public string documentType { get; set; } = null!;
        public DateTime documentDate { get; set; }
        public string? description { get; set; }
        public decimal totalAmount { get; set; }
        public string status { get; set; } = null!;
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; }
        public List<AssetDocumentLineResponse> lines { get; set; } = new();
    }

    public class AssetDocumentLineResponse
    {
        public Guid id { get; set; }
        public Guid documentId { get; set; }
        public string? debitAccount { get; set; }
        public string? creditAccount { get; set; }
        public decimal amount { get; set; }
        public string? description { get; set; }
        public Guid? assetId { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
    }

    // ============================================================
    // THANH LÝ TÀI SẢN
    // ============================================================
    public class CreateAssetDisposalDto
    {
        public Guid assetId { get; set; }
        public DateTime? disposalDate { get; set; }
        public decimal disposalValue { get; set; }
        public string? disposalType { get; set; }
        public string? reason { get; set; }
        public string? note { get; set; }
        public Guid? createdBy { get; set; }
    }

    public class AssetDisposalResponse
    {
        public Guid id { get; set; }
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
        public DateTime disposalDate { get; set; }
        public decimal originalCost { get; set; }
        public decimal accumulatedDepreciation { get; set; }
        public decimal bookValue { get; set; }
        public decimal disposalValue { get; set; }
        public decimal gainLoss { get; set; }
        public string? disposalType { get; set; }
        public string? reason { get; set; }
        public string? note { get; set; }
        public string status { get; set; } = null!;
        public Guid? documentId { get; set; }
        public string? documentCode { get; set; }
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; }
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
