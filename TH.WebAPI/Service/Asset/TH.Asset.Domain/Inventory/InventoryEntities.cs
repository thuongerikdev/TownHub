using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using TH.Asset.Domain.Incident;
using TH.Asset.Domain.Maintenance;
using TH.Asset.Domain.Vendor;

namespace TH.Asset.Domain.Inventory
{
    [Table("warehouses", Schema = "asset")]
    public class Warehouse
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(20)]
        public required string code { get; set; }

        [Required, MaxLength(200)]
        public required string name { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid buildingId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid? managerId { get; set; }
        public Guid? ktvOwnerId { get; set; }

        // ── Navigation Properties (inverse) ──
        public virtual ICollection<InventoryLevel>? inventoryLevels { get; set; }
        public virtual ICollection<InventoryTransaction>? inventoryTransactions { get; set; }
        public virtual ICollection<PurchaseRequestItem>? purchaseRequestItems { get; set; }
        public virtual ICollection<PurchaseOrderItem>? purchaseOrderItems { get; set; }
        public virtual ICollection<WorkOrderMaterialUsed>? workOrderMaterials { get; set; }
    }

    [Table("material_categories", Schema = "asset")]
    public class MaterialCategory
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string code { get; set; }

        [Required, MaxLength(200)]
        public required string name { get; set; }

        public Guid? parentId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(parentId))]
        public virtual MaterialCategory? parentCategory { get; set; }
        public virtual ICollection<MaterialCategory>? childCategories { get; set; }

        // Inverse navigation
        public virtual ICollection<Material>? materials { get; set; }
    }

    [Table("materials", Schema = "asset")]
    public class Material
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string materialCode { get; set; }

        [Required, MaxLength(200)]
        public required string name { get; set; }

        public Guid categoryId { get; set; }
        public Guid? preferredVendorId { get; set; }

        // Patch fields
        [MaxLength(30)]
        public string? unitOfMeasure { get; set; }
        public decimal minStock { get; set; } = 0;
        public decimal? maxStock { get; set; }
        public decimal? reorderPoint { get; set; }
        public decimal? reorderQuantity { get; set; }
        public decimal? unitPrice { get; set; }
        public bool isActive { get; set; } = true;
        public string? notes { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(categoryId))]
        public virtual MaterialCategory? category { get; set; }

        [ForeignKey(nameof(preferredVendorId))]
        public virtual TH.Asset.Domain.Vendor.Vendor? preferredVendor { get; set; }

        // Inverse navigation
        public virtual ICollection<InventoryLevel>? inventoryLevels { get; set; }
        public virtual ICollection<InventoryTransaction>? inventoryTransactions { get; set; }
        public virtual ICollection<PurchaseRequestItem>? purchaseRequestItems { get; set; }
        public virtual ICollection<PurchaseOrderItem>? purchaseOrderItems { get; set; }
        public virtual ICollection<InvoiceItem>? invoiceItems { get; set; }
    }

    [Table("inventory_levels", Schema = "asset")]
    public class InventoryLevel
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid warehouseId { get; set; }
        public Guid materialId { get; set; }
        public decimal quantityOnHand { get; set; } = 0;

        // ── Navigation Properties ──
        [ForeignKey(nameof(warehouseId))]
        public virtual Warehouse? warehouse { get; set; }

        [ForeignKey(nameof(materialId))]
        public virtual Material? material { get; set; }
    }

    [Table("inventory_transactions", Schema = "asset")]
    public class InventoryTransaction
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string txnCode { get; set; }

        public Guid warehouseId { get; set; }
        public Guid materialId { get; set; }

        [MaxLength(30)]
        public string? referenceType { get; set; }
        public Guid? referenceId { get; set; }

        // Patch fields
        [Required, MaxLength(20)]
        public string txnType { get; set; } = "IN"; // IN | OUT | ADJUST | TRANSFER
        public decimal quantity { get; set; } = 0;
        public decimal? unitCost { get; set; }
        public decimal? totalCost { get; set; }
        public string? notes { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? performedBy { get; set; }
        public DateTime performedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(warehouseId))]
        public virtual Warehouse? warehouse { get; set; }

        [ForeignKey(nameof(materialId))]
        public virtual Material? material { get; set; }
    }

    [Table("purchase_requests", Schema = "asset")]
    public class PurchaseRequest
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string prCode { get; set; }

        public Guid? ticketId { get; set; }
        public Guid? woId { get; set; }

        // Cross-service (Base) — không dùng navigation property
        public Guid? departmentId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid requestedBy { get; set; }
        // Tên người đề xuất do FE nhập tự do (Auth dùng int id, Asset dùng Guid — không có FK)
        [MaxLength(150)]
        public string? requestedByName { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "DRAFT";

        // Patch fields
        [MaxLength(300)]
        public string? title { get; set; }
        public string? justification { get; set; }
        [MaxLength(10)]
        public string priority { get; set; } = "MEDIUM";
        public DateTime? neededByDate { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? approvedBy { get; set; }
        public DateTime? approvedAt { get; set; }
        public string? rejectedReason { get; set; }
        public DateTime createdAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(ticketId))]
        public virtual Ticket? ticket { get; set; }

        [ForeignKey(nameof(woId))]
        public virtual WorkOrder? workOrder { get; set; }

        // Inverse navigation
        public virtual ICollection<PurchaseRequestItem>? items { get; set; }
    }

    [Table("purchase_request_items", Schema = "asset")]
    public class PurchaseRequestItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid prId { get; set; }
        public Guid materialId { get; set; }
        public Guid? targetWarehouseId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(prId))]
        public virtual PurchaseRequest? purchaseRequest { get; set; }

        [ForeignKey(nameof(materialId))]
        public virtual Material? material { get; set; }

        [ForeignKey(nameof(targetWarehouseId))]
        public virtual Warehouse? targetWarehouse { get; set; }
    }

    [Table("purchase_orders", Schema = "asset")]
    public class PurchaseOrder
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string poCode { get; set; }

        public Guid? prId { get; set; }
        public Guid vendorId { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "DRAFT";

        // Patch fields
        public DateTime? issueDate { get; set; }
        public DateTime? expectedDelivery { get; set; }
        public DateTime? actualDelivery { get; set; }
        public decimal? totalAmount { get; set; }
        [MaxLength(3)]
        public string currency { get; set; } = "VND";
        [MaxLength(100)]
        public string? paymentTerms { get; set; }
        public string? notes { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties ──
        [ForeignKey(nameof(prId))]
        public virtual PurchaseRequest? purchaseRequest { get; set; }

        [ForeignKey(nameof(vendorId))]
        public virtual TH.Asset.Domain.Vendor.Vendor? vendor { get; set; }

        // Inverse navigation
        public virtual ICollection<PurchaseOrderItem>? items { get; set; }
        public virtual ICollection<PoApprovalWorkflow>? approvalWorkflows { get; set; }
        public virtual ICollection<Invoice>? invoices { get; set; }
    }

    [Table("purchase_order_items", Schema = "asset")]
    public class PurchaseOrderItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid poId { get; set; }
        public Guid materialId { get; set; }
        public Guid? targetWarehouseId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(poId))]
        public virtual PurchaseOrder? purchaseOrder { get; set; }

        [ForeignKey(nameof(materialId))]
        public virtual Material? material { get; set; }

        [ForeignKey(nameof(targetWarehouseId))]
        public virtual Warehouse? targetWarehouse { get; set; }

        // Inverse navigation
        public virtual ICollection<InvoiceItem>? invoiceItems { get; set; }
    }

    [Table("po_approval_workflow", Schema = "asset")]
    public class PoApprovalWorkflow
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid poId { get; set; }

        // Cross-service (Auth) — không dùng navigation property
        public Guid? approverId { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "PENDING";

        // Patch fields
        public short approvalLevel { get; set; } = 1;
        public decimal? amountThreshold { get; set; }
        public DateTime? approvedAt { get; set; }
        public DateTime? rejectedAt { get; set; }
        public string? comment { get; set; }
        public DateTime? notifiedAt { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(poId))]
        public virtual PurchaseOrder? purchaseOrder { get; set; }
    }

    [Table("invoices", Schema = "asset")]
    public class Invoice
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string invoiceCode { get; set; }

        public Guid vendorId { get; set; }
        public Guid? poId { get; set; }
        public Guid? ocrJobId { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "DRAFT";

        // Patch fields
        public DateTime? invoiceDate { get; set; }
        [MaxLength(100)]
        public string? invoiceNumber { get; set; }
        public decimal? subtotal { get; set; }
        public decimal? taxAmount { get; set; }
        public decimal? totalAmount { get; set; }
        [MaxLength(3)]
        public string currency { get; set; } = "VND";
        public DateTime? paymentDueDate { get; set; }
        public DateTime? paidDate { get; set; }
        [MaxLength(20)]
        public string paymentStatus { get; set; } = "UNPAID";
        [MaxLength(30)]
        public string? paymentMethod { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? confirmedBy { get; set; }
        public DateTime? confirmedAt { get; set; }
        public string? notes { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(vendorId))]
        public virtual TH.Asset.Domain.Vendor.Vendor? vendor { get; set; }

        [ForeignKey(nameof(poId))]
        public virtual PurchaseOrder? purchaseOrder { get; set; }

        [ForeignKey(nameof(ocrJobId))]
        public virtual OcrJob? ocrJob { get; set; }

        // Inverse navigation
        public virtual ICollection<InvoiceItem>? items { get; set; }
    }

    [Table("invoice_items", Schema = "asset")]
    public class InvoiceItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid invoiceId { get; set; }
        public Guid materialId { get; set; }

        [MaxLength(500)]
        public string? description { get; set; }
        public decimal? quantity { get; set; }
        public decimal? unitPrice { get; set; }
        public decimal? totalPrice { get; set; }
        public Guid? poItemId { get; set; }

        // ── Navigation Properties ──
        [ForeignKey(nameof(invoiceId))]
        public virtual Invoice? invoice { get; set; }

        [ForeignKey(nameof(materialId))]
        public virtual Material? material { get; set; }

        [ForeignKey(nameof(poItemId))]
        public virtual PurchaseOrderItem? poItem { get; set; }
    }

    [Table("ocr_jobs", Schema = "asset")]
    public class OcrJob
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(20)]
        public required string documentType { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "QUEUED";

        // Cross-service (Auth) — không dùng navigation property
        public Guid? reviewedBy { get; set; }
        // Tên người duyệt (free-text) — đi kèm reviewedBy do chưa có Auth directory
        [MaxLength(150)]
        public string? reviewedByName { get; set; }

        // Patch fields
        public string? fileUrl { get; set; }
        [MaxLength(300)]
        public string? fileName { get; set; }
        public int? fileSizeBytes { get; set; }
        public string? rawExtractedText { get; set; }
        public decimal? confidenceScore { get; set; }
        public string? errorMessage { get; set; }
        public DateTime? startedAt { get; set; }
        public DateTime? completedAt { get; set; }
        // Cross-service (Auth) — không dùng navigation property
        public Guid? submittedBy { get; set; }
        // Tên người gửi (free-text) — đi kèm submittedBy do chưa có Auth directory
        [MaxLength(150)]
        public string? submittedByName { get; set; }
        public DateTime submittedAt { get; set; } = DateTime.UtcNow;

        // ── Navigation Properties (inverse) ──
        public virtual ICollection<Invoice>? invoices { get; set; }
    }
}
