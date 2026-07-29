using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TH.Asset.Domain.Core;
using TH.Asset.Domain.Incident;
using TH.Asset.Domain.Inventory;
using TH.Asset.Domain.Maintenance;
using TH.Asset.Domain.System;
using TH.Asset.Domain.Vendor;

// Alias để tránh xung đột tên class Asset với namespace TH.Asset
using AssetEntity = TH.Asset.Domain.Core.Asset;
using VendorEntity = TH.Asset.Domain.Vendor.Vendor;

namespace TH.Asset.Infrastructure.Database
{
    public class AssetDbContext : DbContext
    {
        // ── Core ──────────────────────────────────────────────────────────────
        public DbSet<AssetEntity> Assets { get; set; }
        public DbSet<AssetCategory> AssetCategories { get; set; }
        public DbSet<AssetLocation> AssetLocations { get; set; }
        public DbSet<AssetQrCode> AssetQrCodes { get; set; }
        public DbSet<AssetTransfer> AssetTransfers { get; set; }
        public DbSet<AssetDepreciationLog> AssetDepreciationLogs { get; set; }
        public DbSet<IotSensorReading> IotSensorReadings { get; set; }

        // ── Kế toán (chứng từ / định khoản / thanh lý) ─────────────────────────
        public DbSet<AssetDocument> AssetDocuments { get; set; }
        public DbSet<AssetDocumentLine> AssetDocumentLines { get; set; }
        public DbSet<AssetDisposal> AssetDisposals { get; set; }

        // ── Maintenance ───────────────────────────────────────────────────────
        public DbSet<ChecklistTemplate> ChecklistTemplates { get; set; }
        public DbSet<ChecklistTemplateItem> ChecklistTemplateItems { get; set; }
        public DbSet<MaintenanceSchedule> MaintenanceSchedules { get; set; }
        public DbSet<WorkOrder> WorkOrders { get; set; }
        public DbSet<WorkOrderAssignment> WorkOrderAssignments { get; set; }
        public DbSet<WorkOrderChecklistResponse> WorkOrderChecklistResponses { get; set; }
        public DbSet<WorkOrderAttachment> WorkOrderAttachments { get; set; }
        public DbSet<WorkOrderMaterialUsed> WorkOrderMaterialsUsed { get; set; }

        // ── Incident ──────────────────────────────────────────────────────────
        public DbSet<SlaConfig> SlaConfigs { get; set; }
        public DbSet<Ticket> Tickets { get; set; }
        public DbSet<TicketAssignment> TicketAssignments { get; set; }
        public DbSet<TicketAttachment> TicketAttachments { get; set; }
        public DbSet<TicketRating> TicketRatings { get; set; }
        public DbSet<TicketStatusHistory> TicketStatusHistories { get; set; }
        public DbSet<SlaEscalationLog> SlaEscalationLogs { get; set; }

        // ── Inventory ─────────────────────────────────────────────────────────
        public DbSet<Warehouse> Warehouses { get; set; }
        public DbSet<MaterialCategory> MaterialCategories { get; set; }
        public DbSet<Material> Materials { get; set; }
        public DbSet<InventoryLevel> InventoryLevels { get; set; }
        public DbSet<InventoryTransaction> InventoryTransactions { get; set; }
        public DbSet<PurchaseRequest> PurchaseRequests { get; set; }
        public DbSet<PurchaseRequestItem> PurchaseRequestItems { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public DbSet<PoApprovalWorkflow> PoApprovalWorkflows { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }
        public DbSet<OcrJob> OcrJobs { get; set; }
        public DbSet<StockTake> StockTakes { get; set; }
        public DbSet<StockTakeLine> StockTakeLines { get; set; }

        // ── Vendor ────────────────────────────────────────────────────────────
        public DbSet<VendorEntity> Vendors { get; set; }
        public DbSet<VendorContract> VendorContracts { get; set; }
        public DbSet<VendorContractService> VendorContractServices { get; set; }
        public DbSet<VendorEvaluation> VendorEvaluations { get; set; }

        // ── System ────────────────────────────────────────────────────────────
        public DbSet<KpiDailySnapshot> KpiDailySnapshots { get; set; }
        public DbSet<CostTracking> CostTrackings { get; set; }

        public AssetDbContext(DbContextOptions<AssetDbContext> options) : base(options) { }

        // ════════════════════════════════════════════════════════════════════
        // UTC NORMALIZATION
        // Tất cả cột thời gian trong schema 'asset' là 'timestamp with time zone'
        // (timestamptz) → Npgsql bắt buộc DateTime phải có Kind=Utc khi ghi.
        // DateTime đến từ JSON (vd '2026-05-31' từ <input type="date">) bị parse
        // thành Kind=Unspecified → SaveChanges sẽ ném lỗi. Chuẩn hoá tập trung tại
        // đây để mọi entity (asset/ticket/work-order/PR…) ghi an toàn, không phải
        // sửa từng service.
        // ════════════════════════════════════════════════════════════════════
        public override int SaveChanges()
        {
            NormalizeDateTimesToUtc();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            NormalizeDateTimesToUtc();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void NormalizeDateTimesToUtc()
        {
            foreach (var entry in ChangeTracker.Entries())
            {
                if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
                    continue;

                foreach (var prop in entry.Properties)
                {
                    if (prop.CurrentValue is DateTime dt && dt.Kind != DateTimeKind.Utc)
                    {
                        prop.CurrentValue = dt.Kind == DateTimeKind.Local
                            ? dt.ToUniversalTime()
                            : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                    }
                }
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ════════════════════════════════════════════════════════════════
            // RELATIONSHIPS — khử nhập nhằng khi 2 entity nối nhau bằng >1 FK.
            // EF không tự suy ra được inverse navigation nên phải cấu hình tay.
            // Dùng DeleteBehavior.Restrict để tránh vòng cascade (Ticket↔PR, WO↔Schedule).
            // ════════════════════════════════════════════════════════════════

            // AssetTransfer có 2 FK tới AssetLocation: fromLocationId / toLocationId
            modelBuilder.Entity<AssetTransfer>(b =>
            {
                b.HasOne(x => x.fromLocation)
                    .WithMany(l => l.fromTransfers)
                    .HasForeignKey(x => x.fromLocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.toLocation)
                    .WithMany(l => l.toTransfers)
                    .HasForeignKey(x => x.toLocationId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // WorkOrder.scheduleId ↔ MaintenanceSchedule.workOrders (1 chiều có inverse)
            modelBuilder.Entity<WorkOrder>()
                .HasOne(x => x.schedule)
                .WithMany(s => s.workOrders)
                .HasForeignKey(x => x.scheduleId)
                .OnDelete(DeleteBehavior.Restrict);

            // MaintenanceSchedule.lastWoId → WorkOrder (con trỏ "WO gần nhất", không inverse)
            modelBuilder.Entity<MaintenanceSchedule>()
                .HasOne(x => x.lastWorkOrder)
                .WithMany()
                .HasForeignKey(x => x.lastWoId)
                .OnDelete(DeleteBehavior.Restrict);

            // Ticket ↔ PurchaseRequest tham chiếu vòng (mỗi bên 1 FB, không inverse)
            modelBuilder.Entity<Ticket>()
                .HasOne(x => x.purchaseRequest)
                .WithMany()
                .HasForeignKey(x => x.purchaseRequestId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseRequest>()
                .HasOne(x => x.ticket)
                .WithMany()
                .HasForeignKey(x => x.ticketId)
                .OnDelete(DeleteBehavior.Restrict);

            // ════════════════════════════════════════════════════════════════
            // UNIQUE INDEXES
            // ════════════════════════════════════════════════════════════════

            // ── Core ──
            modelBuilder.Entity<AssetEntity>()
                .HasIndex(x => x.assetCode).IsUnique();

            // ── Kế toán ──
            // Mã chứng từ duy nhất
            modelBuilder.Entity<AssetDocument>()
                .HasIndex(x => x.documentCode).IsUnique();

            // Line → Document: xoá chứng từ thì xoá luôn dòng định khoản
            modelBuilder.Entity<AssetDocumentLine>(b =>
            {
                b.HasOne(x => x.document)
                    .WithMany(d => d.lines)
                    .HasForeignKey(x => x.documentId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Line → Asset: giữ lại (Restrict) để tránh vòng cascade qua Asset
                b.HasOne(x => x.asset)
                    .WithMany()
                    .HasForeignKey(x => x.assetId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // DepreciationLog → Document: không xoá theo (Restrict)
            modelBuilder.Entity<AssetDepreciationLog>()
                .HasOne(x => x.document)
                .WithMany()
                .HasForeignKey(x => x.documentId)
                .OnDelete(DeleteBehavior.SetNull);

            // Disposal → Asset / Document
            modelBuilder.Entity<AssetDisposal>(b =>
            {
                b.HasOne(x => x.asset)
                    .WithMany()
                    .HasForeignKey(x => x.assetId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(x => x.document)
                    .WithMany()
                    .HasForeignKey(x => x.documentId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Chống 1 tài sản bị khấu hao trùng trong cùng 1 kỳ
            modelBuilder.Entity<AssetDepreciationLog>()
                .HasIndex(x => new { x.assetId, x.periodYear, x.periodMonth }).IsUnique();

            modelBuilder.Entity<AssetCategory>()
                .HasIndex(x => x.code).IsUnique();

            modelBuilder.Entity<AssetQrCode>()
                .HasIndex(x => x.qrCode).IsUnique();
            modelBuilder.Entity<AssetQrCode>()
                .HasIndex(x => x.assetId).IsUnique(); // mỗi tài sản chỉ có 1 QR

            // ── Maintenance ──
            modelBuilder.Entity<ChecklistTemplate>()
                .HasIndex(x => x.code).IsUnique();

            modelBuilder.Entity<WorkOrder>()
                .HasIndex(x => x.woCode).IsUnique();

            // ── Incident ──
            modelBuilder.Entity<Ticket>()
                .HasIndex(x => x.ticketCode).IsUnique();

            // ── Inventory ──
            modelBuilder.Entity<Warehouse>()
                .HasIndex(x => x.code).IsUnique();

            modelBuilder.Entity<MaterialCategory>()
                .HasIndex(x => x.code).IsUnique();

            modelBuilder.Entity<Material>()
                .HasIndex(x => x.materialCode).IsUnique();

            modelBuilder.Entity<InventoryLevel>()
                .HasIndex(x => new { x.warehouseId, x.materialId }).IsUnique();

            modelBuilder.Entity<InventoryTransaction>()
                .HasIndex(x => x.txnCode).IsUnique();

            modelBuilder.Entity<PurchaseRequest>()
                .HasIndex(x => x.prCode).IsUnique();

            modelBuilder.Entity<PurchaseOrder>()
                .HasIndex(x => x.poCode).IsUnique();

            modelBuilder.Entity<Invoice>()
                .HasIndex(x => x.invoiceCode).IsUnique();

            // Kiểm kê kho: mã phiếu duy nhất; xoá phiếu → xoá dòng (Cascade),
            // giữ Material (Restrict) để tránh vòng cascade.
            modelBuilder.Entity<StockTake>(b =>
            {
                b.HasIndex(x => x.stkCode).IsUnique();
                b.HasOne(x => x.warehouse)
                    .WithMany()
                    .HasForeignKey(x => x.warehouseId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<StockTakeLine>(b =>
            {
                b.HasOne(x => x.stockTake)
                    .WithMany(s => s.lines)
                    .HasForeignKey(x => x.stockTakeId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(x => x.material)
                    .WithMany()
                    .HasForeignKey(x => x.materialId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // ── Vendor ──
            modelBuilder.Entity<VendorEntity>()
                .HasIndex(x => x.vendorCode).IsUnique();
            modelBuilder.Entity<VendorEntity>()
                .HasIndex(x => x.taxId).IsUnique();

            modelBuilder.Entity<VendorContract>()
                .HasIndex(x => x.contractCode).IsUnique();

            // ── System ──
            modelBuilder.Entity<KpiDailySnapshot>()
                .HasIndex(x => new { x.buildingId, x.snapshotDate }).IsUnique();

            // ════════════════════════════════════════════════════════════════
            // DECIMAL PRECISION
            // ════════════════════════════════════════════════════════════════

            // Asset tài chính
            modelBuilder.Entity<AssetEntity>(b =>
            {
                b.Property(x => x.purchasePrice).HasColumnType("numeric(18,2)");
                b.Property(x => x.salvageValue).HasColumnType("numeric(18,2)");
                b.Property(x => x.accumulatedDepreciation).HasColumnType("numeric(18,2)");
                b.Property(x => x.bookValue).HasColumnType("numeric(18,2)");
            });

            // Depreciation log
            modelBuilder.Entity<AssetDepreciationLog>(b =>
            {
                b.Property(x => x.depreciationAmount).HasColumnType("numeric(18,2)");
                b.Property(x => x.bookValueBefore).HasColumnType("numeric(18,2)");
                b.Property(x => x.bookValueAfter).HasColumnType("numeric(18,2)");
                b.Property(x => x.accumulatedTotal).HasColumnType("numeric(18,2)");
            });

            // Kế toán: chứng từ / định khoản / thanh lý
            modelBuilder.Entity<AssetDocument>()
                .Property(x => x.totalAmount).HasColumnType("numeric(18,2)");

            modelBuilder.Entity<AssetDocumentLine>()
                .Property(x => x.amount).HasColumnType("numeric(18,2)");

            modelBuilder.Entity<AssetDisposal>(b =>
            {
                b.Property(x => x.originalCost).HasColumnType("numeric(18,2)");
                b.Property(x => x.accumulatedDepreciation).HasColumnType("numeric(18,2)");
                b.Property(x => x.bookValue).HasColumnType("numeric(18,2)");
                b.Property(x => x.disposalValue).HasColumnType("numeric(18,2)");
                b.Property(x => x.gainLoss).HasColumnType("numeric(18,2)");
            });

            // SLA thời gian (giờ)
            modelBuilder.Entity<SlaConfig>(b =>
            {
                b.Property(x => x.responseTimeHours).HasColumnType("numeric(8,2)");
                b.Property(x => x.resolutionTimeHours).HasColumnType("numeric(8,2)");
                b.Property(x => x.escalationL1AfterHours).HasColumnType("numeric(8,2)");
                b.Property(x => x.escalationL2AfterHours).HasColumnType("numeric(8,2)");
                b.Property(x => x.escalationL3AfterHours).HasColumnType("numeric(8,2)");
            });

            // WorkOrder
            modelBuilder.Entity<WorkOrder>(b =>
            {
                b.Property(x => x.estimatedHours).HasColumnType("numeric(8,2)");
                b.Property(x => x.actualHours).HasColumnType("numeric(8,2)");
                b.Property(x => x.totalCost).HasColumnType("numeric(18,0)");
            });

            // Material
            modelBuilder.Entity<Material>(b =>
            {
                b.Property(x => x.minStock).HasColumnType("numeric(12,3)");
                b.Property(x => x.maxStock).HasColumnType("numeric(12,3)");
                b.Property(x => x.reorderPoint).HasColumnType("numeric(12,3)");
                b.Property(x => x.reorderQuantity).HasColumnType("numeric(12,3)");
                b.Property(x => x.unitPrice).HasColumnType("numeric(14,0)");
            });

            // InventoryLevel / Transaction
            modelBuilder.Entity<InventoryLevel>()
                .Property(x => x.quantityOnHand).HasColumnType("numeric(12,3)");

            modelBuilder.Entity<InventoryTransaction>(b =>
            {
                b.Property(x => x.quantity).HasColumnType("numeric(12,3)");
                b.Property(x => x.unitCost).HasColumnType("numeric(14,0)");
                b.Property(x => x.totalCost).HasColumnType("numeric(18,0)");
            });

            // PurchaseOrder / Approval / Invoice
            modelBuilder.Entity<PurchaseOrder>()
                .Property(x => x.totalAmount).HasColumnType("numeric(18,0)");

            modelBuilder.Entity<PoApprovalWorkflow>()
                .Property(x => x.amountThreshold).HasColumnType("numeric(18,0)");

            modelBuilder.Entity<Invoice>(b =>
            {
                b.Property(x => x.subtotal).HasColumnType("numeric(18,0)");
                b.Property(x => x.taxAmount).HasColumnType("numeric(18,0)");
                b.Property(x => x.totalAmount).HasColumnType("numeric(18,0)");
            });

            modelBuilder.Entity<InvoiceItem>(b =>
            {
                b.Property(x => x.quantity).HasColumnType("numeric(12,3)");
                b.Property(x => x.unitPrice).HasColumnType("numeric(14,0)");
                b.Property(x => x.totalPrice).HasColumnType("numeric(18,0)");
            });

            // OcrJob confidence score
            modelBuilder.Entity<OcrJob>()
                .Property(x => x.confidenceScore).HasColumnType("numeric(5,4)");

            // Kiểm kê kho
            modelBuilder.Entity<StockTake>()
                .Property(x => x.totalDiffValue).HasColumnType("numeric(18,0)");

            modelBuilder.Entity<StockTakeLine>(b =>
            {
                b.Property(x => x.systemQty).HasColumnType("numeric(12,3)");
                b.Property(x => x.countedQty).HasColumnType("numeric(12,3)");
                b.Property(x => x.diff).HasColumnType("numeric(12,3)");
                b.Property(x => x.unitPrice).HasColumnType("numeric(14,0)");
                b.Property(x => x.diffValue).HasColumnType("numeric(18,0)");
            });

            // VendorContract
            modelBuilder.Entity<VendorContract>()
                .Property(x => x.contractValue).HasColumnType("numeric(18,0)");

            // CostTracking
            modelBuilder.Entity<CostTracking>()
                .Property(x => x.amount).HasColumnType("numeric(18,0)");

            // ====== UTC CONVERTERS ======
            // Ngày client gửi (vd "2026-07-16") có Kind=Unspecified → Npgsql từ chối ghi vào cột
            // timestamptz. Ép mọi DateTime về UTC khi ghi & đọc (giống AuthDbContext). Đây là cách
            // đáng tin cậy hơn interceptor SaveChanges (vốn không chặn được ca này).
            var utcDateTimeConverter = new ValueConverter<DateTime, DateTime>(
                v => v.Kind == DateTimeKind.Utc ? v : (v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc)),
                v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            var utcNullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(
                v => v == null ? (DateTime?)null : (v.Value.Kind == DateTimeKind.Utc ? v.Value : (v.Value.Kind == DateTimeKind.Local ? v.Value.ToUniversalTime() : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc))),
                v => v == null ? (DateTime?)null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var prop in entity.GetProperties())
                {
                    if (prop.ClrType == typeof(DateTime)) prop.SetValueConverter(utcDateTimeConverter);
                    if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcNullableDateTimeConverter);
                }
            }
        }
    }
}
