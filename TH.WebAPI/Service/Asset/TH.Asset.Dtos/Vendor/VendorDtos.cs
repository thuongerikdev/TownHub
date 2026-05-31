using System;

namespace TH.Asset.Dtos
{
    // ============================================================
    // VENDOR DTOs
    // ============================================================
    public class CreateVendorDto
    {
        public required string vendorCode { get; set; }
        public required string name { get; set; }
        public required string taxId { get; set; }
        public string? contactName { get; set; }
        public string? contactEmail { get; set; }
        public string? contactPhone { get; set; }
        public string? address { get; set; }
        public string? notes { get; set; }
    }

    public class UpdateVendorDto : CreateVendorDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "ACTIVE"; // ACTIVE | INACTIVE | BLACKLISTED
        public string? blacklistReason { get; set; }
        public DateTime? blacklistedAt { get; set; }
        // Cross-service (Auth)
        public Guid? blacklistedBy { get; set; }
    }

    public class VendorResponse
    {
        public Guid id { get; set; }
        public string vendorCode { get; set; } = null!;
        public string name { get; set; } = null!;
        public string taxId { get; set; } = null!;
        public string status { get; set; } = null!;
        public string? blacklistReason { get; set; }
        public DateTime? blacklistedAt { get; set; }
        public Guid? blacklistedBy { get; set; }
        public string? contactName { get; set; }
        public string? contactEmail { get; set; }
        public string? contactPhone { get; set; }
        public string? address { get; set; }
        public string? notes { get; set; }
    }

    // ============================================================
    // VENDOR CONTRACT DTOs
    // ============================================================
    public class CreateVendorContractDto
    {
        public required string contractCode { get; set; }
        public Guid vendorId { get; set; }
        // Cross-service (Base)
        public Guid? buildingId { get; set; }

        public DateTime? startDate { get; set; }
        public DateTime? endDate { get; set; }
        public decimal? contractValue { get; set; }
        public string currency { get; set; } = "VND";
        public string? paymentTerms { get; set; }
        public int renewalNoticeDays { get; set; } = 30;
        public string status { get; set; } = "ACTIVE"; // ACTIVE | EXPIRED | TERMINATED
        public string? scopeOfWork { get; set; }
        public string? fileUrl { get; set; }
        public string? signedByVendor { get; set; }
        public string? signedByBuilding { get; set; }
        public string? notes { get; set; }
    }

    public class UpdateVendorContractDto : CreateVendorContractDto
    {
        public Guid id { get; set; }
    }

    public class VendorContractResponse
    {
        public Guid id { get; set; }
        public string contractCode { get; set; } = null!;
        public Guid vendorId { get; set; }
        public string? vendorName { get; set; }
        public Guid? buildingId { get; set; }
        public DateTime? startDate { get; set; }
        public DateTime? endDate { get; set; }
        public decimal? contractValue { get; set; }
        public string currency { get; set; } = null!;
        public string? paymentTerms { get; set; }
        public int renewalNoticeDays { get; set; }
        public string status { get; set; } = null!;
        public string? scopeOfWork { get; set; }
        public string? fileUrl { get; set; }
        public string? signedByVendor { get; set; }
        public string? signedByBuilding { get; set; }
        public string? notes { get; set; }
    }

    // ============================================================
    // VENDOR CONTRACT SERVICE DTOs
    // ============================================================
    public class CreateVendorContractServiceDto
    {
        public Guid contractId { get; set; }
        public required string serviceName { get; set; }
    }

    public class UpdateVendorContractServiceDto : CreateVendorContractServiceDto
    {
        public Guid id { get; set; }
    }

    public class VendorContractServiceResponse
    {
        public Guid id { get; set; }
        public Guid contractId { get; set; }
        public string? contractCode { get; set; }
        public string serviceName { get; set; } = null!;
    }

    // ============================================================
    // VENDOR EVALUATION DTOs
    // ============================================================
    public class CreateVendorEvaluationDto
    {
        public Guid vendorId { get; set; }
        public Guid? contractId { get; set; }
        // Cross-service (Auth)
        public Guid evaluatorId { get; set; }

        public DateTime evaluationDate { get; set; }
        public short overallScore { get; set; }     // 1-5
        public short qualityScore { get; set; }
        public short timelinessScore { get; set; }
        public short costScore { get; set; }
        public short safetyScore { get; set; }
        public string? comments { get; set; }
        public string? recommendation { get; set; }  // CONTINUE | REVIEW | TERMINATE
    }

    public class VendorEvaluationResponse
    {
        public Guid id { get; set; }
        public Guid vendorId { get; set; }
        public string? vendorName { get; set; }
        public Guid? contractId { get; set; }
        public string? contractCode { get; set; }
        public Guid evaluatorId { get; set; }
        public DateTime evaluationDate { get; set; }
        public short overallScore { get; set; }
        public short qualityScore { get; set; }
        public short timelinessScore { get; set; }
        public short costScore { get; set; }
        public short safetyScore { get; set; }
        public string? comments { get; set; }
        public string? recommendation { get; set; }
    }
}
