using System;

namespace TH.Asset.Dtos
{
    // ============================================================
    // WAREHOUSE DTOs
    // ============================================================
    public class CreateWarehouseDto
    {
        public required string code { get; set; }
        public required string name { get; set; }
        // Cross-service (Base)
        public Guid buildingId { get; set; }
        // Cross-service (Auth)
        public Guid? managerId { get; set; }
        public Guid? ktvOwnerId { get; set; }
    }

    public class UpdateWarehouseDto : CreateWarehouseDto
    {
        public Guid id { get; set; }
    }

    public class WarehouseResponse
    {
        public Guid id { get; set; }
        public string code { get; set; } = null!;
        public string name { get; set; } = null!;
        public Guid buildingId { get; set; }
        public Guid? managerId { get; set; }
        public Guid? ktvOwnerId { get; set; }
    }

    // ============================================================
    // MATERIAL CATEGORY DTOs
    // ============================================================
    public class CreateMaterialCategoryDto
    {
        public required string code { get; set; }
        public required string name { get; set; }
        public Guid? parentId { get; set; }
    }

    public class UpdateMaterialCategoryDto : CreateMaterialCategoryDto
    {
        public Guid id { get; set; }
    }

    public class MaterialCategoryResponse
    {
        public Guid id { get; set; }
        public string code { get; set; } = null!;
        public string name { get; set; } = null!;
        public Guid? parentId { get; set; }
        public string? parentName { get; set; }
    }

    // ============================================================
    // MATERIAL DTOs
    // ============================================================
    public class CreateMaterialDto
    {
        public required string materialCode { get; set; }
        public required string name { get; set; }
        public Guid categoryId { get; set; }
        public Guid? preferredVendorId { get; set; }
        public string? unitOfMeasure { get; set; }
        public decimal minStock { get; set; } = 0;
        public decimal? maxStock { get; set; }
        public decimal? reorderPoint { get; set; }
        public decimal? reorderQuantity { get; set; }
        public decimal? unitPrice { get; set; }
        public bool isActive { get; set; } = true;
        public string? notes { get; set; }
    }

    public class UpdateMaterialDto : CreateMaterialDto
    {
        public Guid id { get; set; }
    }

    public class MaterialResponse
    {
        public Guid id { get; set; }
        public string materialCode { get; set; } = null!;
        public string name { get; set; } = null!;
        public Guid categoryId { get; set; }
        public string? categoryName { get; set; }
        public Guid? preferredVendorId { get; set; }
        public string? vendorName { get; set; }
        public string? unitOfMeasure { get; set; }
        public decimal minStock { get; set; }
        public decimal? maxStock { get; set; }
        public decimal? reorderPoint { get; set; }
        public decimal? reorderQuantity { get; set; }
        public decimal? unitPrice { get; set; }
        public bool isActive { get; set; }
        public string? notes { get; set; }
    }

    // ============================================================
    // INVENTORY LEVEL — chỉ Response (EF tự quản lý)
    // ============================================================
    public class InventoryLevelResponse
    {
        public Guid id { get; set; }
        public Guid warehouseId { get; set; }
        public string? warehouseName { get; set; }
        public Guid materialId { get; set; }
        public string? materialCode { get; set; }
        public string? materialName { get; set; }
        public string? unitOfMeasure { get; set; }
        public decimal quantityOnHand { get; set; }
    }

    // ============================================================
    // INVENTORY TRANSACTION DTOs
    // ============================================================
    public class CreateInventoryTransactionDto
    {
        public required string txnCode { get; set; }
        public Guid warehouseId { get; set; }
        public Guid materialId { get; set; }
        public string? referenceType { get; set; }  // WORK_ORDER | PURCHASE_ORDER | ADJUSTMENT
        public Guid? referenceId { get; set; }
        public string txnType { get; set; } = "IN"; // IN | OUT | ADJUST | TRANSFER
        public decimal quantity { get; set; }
        public decimal? unitCost { get; set; }
        public decimal? totalCost { get; set; }
        public string? notes { get; set; }
        // Cross-service (Auth)
        public Guid? performedBy { get; set; }
    }

    public class InventoryTransactionResponse
    {
        public Guid id { get; set; }
        public string txnCode { get; set; } = null!;
        public Guid warehouseId { get; set; }
        public string? warehouseName { get; set; }
        public Guid materialId { get; set; }
        public string? materialCode { get; set; }
        public string? materialName { get; set; }
        public string? referenceType { get; set; }
        public Guid? referenceId { get; set; }
        public string txnType { get; set; } = null!;
        public decimal quantity { get; set; }
        public decimal? unitCost { get; set; }
        public decimal? totalCost { get; set; }
        public string? notes { get; set; }
        public Guid? performedBy { get; set; }
        public DateTime performedAt { get; set; }
    }

    // ============================================================
    // PURCHASE REQUEST DTOs
    // ============================================================
    public class CreatePurchaseRequestDto
    {
        public required string prCode { get; set; }
        public Guid? ticketId { get; set; }
        public Guid? woId { get; set; }
        // Cross-service (Base)
        public Guid? departmentId { get; set; }
        // Cross-service (Auth)
        public Guid requestedBy { get; set; }
        public string? requestedByName { get; set; }

        public string? title { get; set; }
        public string? justification { get; set; }
        public string priority { get; set; } = "MEDIUM";
        public DateTime? neededByDate { get; set; }
    }

    public class UpdatePurchaseRequestDto : CreatePurchaseRequestDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "DRAFT"; // DRAFT | PENDING | APPROVED | REJECTED
        // Cross-service (Auth)
        public Guid? approvedBy { get; set; }
        public DateTime? approvedAt { get; set; }
        public string? rejectedReason { get; set; }
    }

    public class PurchaseRequestResponse
    {
        public Guid id { get; set; }
        public string prCode { get; set; } = null!;
        public Guid? ticketId { get; set; }
        public string? ticketCode { get; set; }
        public Guid? woId { get; set; }
        public string? woCode { get; set; }
        public Guid? departmentId { get; set; }
        public Guid requestedBy { get; set; }
        public string? requestedByName { get; set; }
        public string status { get; set; } = null!;
        public string? title { get; set; }
        public string? justification { get; set; }
        public string priority { get; set; } = null!;
        public DateTime? neededByDate { get; set; }
        public Guid? approvedBy { get; set; }
        public DateTime? approvedAt { get; set; }
        public string? rejectedReason { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // PURCHASE REQUEST ITEM DTOs
    // ============================================================
    public class CreatePurchaseRequestItemDto
    {
        public Guid prId { get; set; }
        public Guid materialId { get; set; }
        public Guid? targetWarehouseId { get; set; }
    }

    public class PurchaseRequestItemResponse
    {
        public Guid id { get; set; }
        public Guid prId { get; set; }
        public string? prCode { get; set; }
        public Guid materialId { get; set; }
        public string? materialCode { get; set; }
        public string? materialName { get; set; }
        public Guid? targetWarehouseId { get; set; }
        public string? warehouseName { get; set; }
    }

    // ============================================================
    // PURCHASE ORDER DTOs
    // ============================================================
    public class CreatePurchaseOrderDto
    {
        public required string poCode { get; set; }
        public Guid? prId { get; set; }
        public Guid vendorId { get; set; }
        public DateTime? issueDate { get; set; }
        public DateTime? expectedDelivery { get; set; }
        public decimal? totalAmount { get; set; }
        public string currency { get; set; } = "VND";
        public string? paymentTerms { get; set; }
        public string? notes { get; set; }
        // Cross-service (Auth)
        public Guid? createdBy { get; set; }
    }

    public class UpdatePurchaseOrderDto : CreatePurchaseOrderDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "DRAFT"; // DRAFT | SENT | CONFIRMED | DELIVERED | CANCELLED
        public DateTime? actualDelivery { get; set; }
    }

    public class PurchaseOrderResponse
    {
        public Guid id { get; set; }
        public string poCode { get; set; } = null!;
        public Guid? prId { get; set; }
        public string? prCode { get; set; }
        public Guid vendorId { get; set; }
        public string? vendorName { get; set; }
        public string status { get; set; } = null!;
        public DateTime? issueDate { get; set; }
        public DateTime? expectedDelivery { get; set; }
        public DateTime? actualDelivery { get; set; }
        public decimal? totalAmount { get; set; }
        public string currency { get; set; } = null!;
        public string? paymentTerms { get; set; }
        public string? notes { get; set; }
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // PURCHASE ORDER ITEM DTOs
    // ============================================================
    public class CreatePurchaseOrderItemDto
    {
        public Guid poId { get; set; }
        public Guid materialId { get; set; }
        public Guid? targetWarehouseId { get; set; }
    }

    public class PurchaseOrderItemResponse
    {
        public Guid id { get; set; }
        public Guid poId { get; set; }
        public string? poCode { get; set; }
        public Guid materialId { get; set; }
        public string? materialCode { get; set; }
        public string? materialName { get; set; }
        public Guid? targetWarehouseId { get; set; }
        public string? warehouseName { get; set; }
    }

    // ============================================================
    // PO APPROVAL WORKFLOW — chỉ Response (hệ thống tạo tự động)
    // ============================================================
    public class UpdatePoApprovalDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "PENDING"; // PENDING | APPROVED | REJECTED
        public string? comment { get; set; }
    }

    public class PoApprovalWorkflowResponse
    {
        public Guid id { get; set; }
        public Guid poId { get; set; }
        public string? poCode { get; set; }
        // Cross-service (Auth)
        public Guid? approverId { get; set; }
        public string status { get; set; } = null!;
        public short approvalLevel { get; set; }
        public decimal? amountThreshold { get; set; }
        public DateTime? approvedAt { get; set; }
        public DateTime? rejectedAt { get; set; }
        public string? comment { get; set; }
        public DateTime? notifiedAt { get; set; }
    }

    // ============================================================
    // INVOICE DTOs
    // ============================================================
    public class CreateInvoiceDto
    {
        public required string invoiceCode { get; set; }
        public Guid vendorId { get; set; }
        public Guid? poId { get; set; }
        public Guid? ocrJobId { get; set; }
        public DateTime? invoiceDate { get; set; }
        public string? invoiceNumber { get; set; }
        public decimal? subtotal { get; set; }
        public decimal? taxAmount { get; set; }
        public decimal? totalAmount { get; set; }
        public string currency { get; set; } = "VND";
        public DateTime? paymentDueDate { get; set; }
        public string? notes { get; set; }
        // Hạng mục kèm theo (đối chiếu OCR → materialId). Lưu cùng lúc với hóa đơn.
        public List<CreateInvoiceItemLine>? items { get; set; }
    }

    /// <summary>Một dòng hàng gửi kèm khi tạo hóa đơn (đã đối chiếu ra materialId).</summary>
    public class CreateInvoiceItemLine
    {
        public Guid materialId { get; set; }
        public string? description { get; set; }
        public decimal? quantity { get; set; }
        public decimal? unitPrice { get; set; }
        public decimal? totalPrice { get; set; }
    }

    public class UpdateInvoiceDto : CreateInvoiceDto
    {
        public Guid id { get; set; }
        public string status { get; set; } = "DRAFT";       // DRAFT | VERIFIED | APPROVED | PAID | CANCELLED
        public string paymentStatus { get; set; } = "UNPAID"; // UNPAID | PARTIAL | PAID
        public DateTime? paidDate { get; set; }
        public string? paymentMethod { get; set; }
        // Cross-service (Auth)
        public Guid? confirmedBy { get; set; }
        public DateTime? confirmedAt { get; set; }
    }

    public class InvoiceResponse
    {
        public Guid id { get; set; }
        public string invoiceCode { get; set; } = null!;
        public Guid vendorId { get; set; }
        public string? vendorName { get; set; }
        public Guid? poId { get; set; }
        public string? poCode { get; set; }
        public Guid? ocrJobId { get; set; }
        public string status { get; set; } = null!;
        public DateTime? invoiceDate { get; set; }
        public string? invoiceNumber { get; set; }
        public decimal? subtotal { get; set; }
        public decimal? taxAmount { get; set; }
        public decimal? totalAmount { get; set; }
        public string currency { get; set; } = null!;
        public DateTime? paymentDueDate { get; set; }
        public DateTime? paidDate { get; set; }
        public string paymentStatus { get; set; } = null!;
        public string? paymentMethod { get; set; }
        public Guid? confirmedBy { get; set; }
        public DateTime? confirmedAt { get; set; }
        public string? notes { get; set; }
    }

    // ============================================================
    // INVOICE ITEM DTOs
    // ============================================================
    public class CreateInvoiceItemDto
    {
        public Guid invoiceId { get; set; }
        public Guid materialId { get; set; }
        public string? description { get; set; }
        public decimal? quantity { get; set; }
        public decimal? unitPrice { get; set; }
        public decimal? totalPrice { get; set; }
        public Guid? poItemId { get; set; }
    }

    public class InvoiceItemResponse
    {
        public Guid id { get; set; }
        public Guid invoiceId { get; set; }
        public Guid materialId { get; set; }
        public string? materialCode { get; set; }
        public string? materialName { get; set; }
        public string? description { get; set; }
        public decimal? quantity { get; set; }
        public decimal? unitPrice { get; set; }
        public decimal? totalPrice { get; set; }
        public Guid? poItemId { get; set; }
    }

    // ============================================================
    // OCR JOB — chỉ Response (background job tự xử lý)
    // ============================================================
    public class CreateOcrJobDto
    {
        public required string documentType { get; set; }
        // Engine OCR: "gemini" (API) | "vietocr" | "paddleocr". Mặc định "gemini" nếu bỏ trống.
        public string? ocrEngine { get; set; }
        public string? fileUrl { get; set; }
        public string? fileName { get; set; }
        public int? fileSizeBytes { get; set; }
        // Cross-service (Auth) — luôn nhận EMPTY_GUID từ FE; tên ghi vào submittedByName
        public Guid? submittedBy { get; set; }
        public string? submittedByName { get; set; }
    }

    public class OcrJobResponse
    {
        public Guid id { get; set; }
        public string documentType { get; set; } = null!;
        public string ocrEngine { get; set; } = "gemini";  // gemini | vietocr | paddleocr
        public string status { get; set; } = null!;  // QUEUED | PROCESSING | DONE | FAILED
        public Guid? reviewedBy { get; set; }
        public string? reviewedByName { get; set; }
        public string? fileUrl { get; set; }
        public string? fileName { get; set; }
        public int? fileSizeBytes { get; set; }
        public string? rawExtractedText { get; set; }  // JSON: { rawText, fields, lineItems }
        public decimal? confidenceScore { get; set; }
        public string? errorMessage { get; set; }
        public DateTime? startedAt { get; set; }
        public DateTime? completedAt { get; set; }
        public Guid? submittedBy { get; set; }
        public string? submittedByName { get; set; }
        public DateTime submittedAt { get; set; }
    }
}
