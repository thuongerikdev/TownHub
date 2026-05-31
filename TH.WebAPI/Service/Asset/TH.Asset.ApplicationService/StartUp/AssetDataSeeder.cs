using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TH.Asset.Domain.Core;
using TH.Asset.Domain.Incident;
using TH.Asset.Domain.Inventory;
using TH.Asset.Domain.Maintenance;
using TH.Asset.Domain.System;
using TH.Asset.Domain.Vendor;
using TH.Asset.Infrastructure.Database;

// Alias để tránh xung đột tên class Asset/Vendor với namespace TH.Asset
using AssetEntity = TH.Asset.Domain.Core.Asset;
using VendorEntity = TH.Asset.Domain.Vendor.Vendor;

namespace TH.Asset.ApplicationService.StartUp
{
    /// <summary>
    /// Seed dữ liệu mẫu cho toàn bộ module Quản lý Tài sản & Kỹ thuật.
    /// "Vừa đủ dùng": phủ hết 6 sub-domain (Core / Maintenance / Incident /
    /// Inventory / Vendor / System) với số lượng hợp lý để FE hiển thị đầy đủ.
    ///
    /// Nguyên tắc:
    ///   • Idempotent — kiểm tra AssetCategories trước, đã có thì bỏ qua.
    ///   • Atomic — chạy trong 1 transaction qua execution strategy (DB bật retry).
    ///   • PK là Guid store-generated → lưu theo từng tầng phụ thuộc rồi đọc lại
    ///     entity.id để nối khóa ngoại (không đoán trước Guid).
    ///   • Mọi DateTime ghi vào cột timestamptz BẮT BUỘC Kind=Utc.
    ///   • Các cột cross-service (buildingId, reportedBy, createdBy…) KHÔNG có FK
    ///     → dùng Guid cố định, khớp BUILDING_ID mà FE hard-code.
    /// </summary>
    public static class AssetDataSeeder
    {
        // ── Guid cố định cross-service (khớp convention của FE) ──────────────
        private static readonly Guid BUILDING = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly Guid ADMIN    = Guid.Parse("22222222-2222-2222-2222-222222222222");
        private static readonly Guid KTV1     = Guid.Parse("33333333-3333-3333-3333-333333333333");
        private static readonly Guid KTV2     = Guid.Parse("44444444-4444-4444-4444-444444444444");
        private static readonly Guid MANAGER  = Guid.Parse("55555555-5555-5555-5555-555555555555");
        private static readonly Guid RESIDENT = Guid.Parse("66666666-6666-6666-6666-666666666666");
        private static readonly Guid DEPT_KT  = Guid.Parse("77777777-7777-7777-7777-777777777777");
        private static readonly Guid FLOOR_1  = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000001");
        private static readonly Guid FLOOR_2  = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000002");
        private static readonly Guid FLOOR_3  = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000003");
        private static readonly Guid UNIT_1   = Guid.Parse("b1b1b1b1-0000-0000-0000-000000000001");
        private static readonly Guid UNIT_2   = Guid.Parse("b1b1b1b1-0000-0000-0000-000000000002");

        private static DateTime Utc(int y, int m, int d, int hh = 0, int mm = 0)
            => new DateTime(y, m, d, hh, mm, 0, DateTimeKind.Utc);

        public static async Task SeedAllAsync(AssetDbContext context, ILogger logger)
        {
            if (await context.AssetCategories.AnyAsync())
            {
                logger.LogInformation("[AssetSeeder] Dữ liệu Asset đã tồn tại — bỏ qua seeding.");
                return;
            }

            logger.LogInformation("[AssetSeeder] Bắt đầu seed dữ liệu mẫu Asset...");

            var strategy = context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                context.ChangeTracker.Clear();
                await using var tx = await context.Database.BeginTransactionAsync();

                var now = DateTime.UtcNow;

                // ════════════════════════════════════════════════════════════
                // TẦNG A — Các bảng gốc (không phụ thuộc bảng Asset khác)
                // ════════════════════════════════════════════════════════════

                // ── Asset categories ──
                var cat = new Dictionary<string, AssetCategory>();
                foreach (var (code, name) in new[]
                {
                    ("HVAC",  "Hệ thống điều hòa không khí"),
                    ("ELEC",  "Hệ thống điện"),
                    ("ELEV",  "Thang máy"),
                    ("FIRE",  "Phòng cháy chữa cháy"),
                    ("PLUMB", "Hệ thống cấp thoát nước"),
                    ("GEN",   "Thiết bị chung & khác"),
                })
                    cat[code] = new AssetCategory { code = code, name = name };
                context.AssetCategories.AddRange(cat.Values);

                // ── Asset locations ──
                var loc1 = new AssetLocation { buildingId = BUILDING, floorId = FLOOR_1, areaCode = "B1-TANG-HAM" };
                var loc2 = new AssetLocation { buildingId = BUILDING, floorId = FLOOR_1, areaCode = "T1-SANH-CHINH" };
                var loc3 = new AssetLocation { buildingId = BUILDING, floorId = FLOOR_2, areaCode = "T2-PHONG-KY-THUAT" };
                var loc4 = new AssetLocation { buildingId = BUILDING, floorId = FLOOR_3, areaCode = "T3-HANH-LANG" };
                var loc5 = new AssetLocation { buildingId = BUILDING, floorId = null,    areaCode = "MAI-SAN-THUONG" };
                context.AssetLocations.AddRange(loc1, loc2, loc3, loc4, loc5);

                // ── Vendors ──
                var ven = new Dictionary<string, VendorEntity>();
                void AddVendor(string code, string name, string tax, string contact, string email, string phone)
                    => ven[code] = new VendorEntity
                    {
                        vendorCode = code, name = name, taxId = tax, status = "ACTIVE",
                        contactName = contact, contactEmail = email, contactPhone = phone,
                        address = "TP. Hồ Chí Minh"
                    };
                AddVendor("V001", "Công ty TNHH Cơ Điện Lạnh Bách Khoa", "0301234567", "Nguyễn Văn An", "an.nguyen@bachkhoamep.vn", "0901234567");
                AddVendor("V002", "Công ty CP Thang Máy Thái Bình",      "0302345678", "Trần Thị Bình",  "binh.tran@thaibinhlift.vn", "0902345678");
                AddVendor("V003", "Công ty TNHH Điện Quang Phát",        "0303456789", "Lê Văn Cường",   "cuong.le@quangphat.vn",     "0903456789");
                AddVendor("V004", "Công ty CP PCCC An Toàn Việt",        "0304567890", "Phạm Thị Dung",  "dung.pham@pcccatv.vn",      "0904567890");
                AddVendor("V005", "Công ty TNHH Vật Tư Kỹ Thuật Hòa Phát","0305678901", "Hoàng Văn Em",  "em.hoang@vattuhoaphat.vn",  "0905678901");
                context.Vendors.AddRange(ven.Values);

                // ── SLA configs ──
                var slaCrit = new SlaConfig { name = "SLA Khẩn cấp",  buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "CRITICAL", responseTimeHours = 1,  resolutionTimeHours = 4,  escalationL1AfterHours = 1,  escalationL2AfterHours = 2,  escalationL3AfterHours = 3,  businessHoursOnly = false, isActive = true };
                var slaHigh = new SlaConfig { name = "SLA Ưu tiên cao", buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "HIGH",     responseTimeHours = 2,  resolutionTimeHours = 8,  escalationL1AfterHours = 4,  escalationL2AfterHours = 8,                                businessHoursOnly = false, isActive = true };
                var slaStd  = new SlaConfig { name = "SLA Tiêu chuẩn",  buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "MEDIUM",   responseTimeHours = 4,  resolutionTimeHours = 24, escalationL1AfterHours = 12,                                            businessHoursOnly = true,  isActive = true };
                context.SlaConfigs.AddRange(slaCrit, slaHigh, slaStd);

                // ── Warehouses ──
                var wh1 = new Warehouse { code = "WH-01", name = "Kho vật tư kỹ thuật chính", buildingId = BUILDING, managerId = MANAGER, ktvOwnerId = KTV1 };
                var wh2 = new Warehouse { code = "WH-02", name = "Kho vật tư phụ tầng hầm",   buildingId = BUILDING, managerId = MANAGER, ktvOwnerId = KTV2 };
                context.Warehouses.AddRange(wh1, wh2);

                // ── Material categories ──
                var mcat = new Dictionary<string, MaterialCategory>();
                foreach (var (code, name) in new[]
                {
                    ("MC-ELEC",   "Vật tư điện"),
                    ("MC-HVAC",   "Vật tư điều hòa - thông gió"),
                    ("MC-PLUMB",  "Vật tư cấp thoát nước"),
                    ("MC-CONSUM", "Vật tư tiêu hao - bảo hộ"),
                })
                    mcat[code] = new MaterialCategory { code = code, name = name };
                context.MaterialCategories.AddRange(mcat.Values);

                // ── OCR jobs (độc lập) ──
                var ocr1 = new OcrJob { documentType = "INVOICE", status = "COMPLETED", fileName = "hoa-don-hoaphat-0325.pdf", fileSizeBytes = 245_000, confidenceScore = 0.96m, rawExtractedText = "HÓA ĐƠN GTGT - Hòa Phát - Tổng: 9.350.000đ", startedAt = Utc(2026, 3, 20, 9, 10), completedAt = Utc(2026, 3, 20, 9, 11), submittedBy = MANAGER, reviewedBy = MANAGER, submittedAt = Utc(2026, 3, 20, 9, 9) };
                var ocr2 = new OcrJob { documentType = "INVOICE", status = "PROCESSING", fileName = "hoa-don-dienquang-0526.pdf", fileSizeBytes = 198_000, submittedBy = KTV1, submittedAt = now.AddHours(-2) };
                context.OcrJobs.AddRange(ocr1, ocr2);

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG B — Phụ thuộc tầng A
                // ════════════════════════════════════════════════════════════

                // ── Checklist templates ──
                var tpl = new Dictionary<string, ChecklistTemplate>
                {
                    ["CL-HVAC"] = new ChecklistTemplate { code = "CL-HVAC", name = "Bảo trì định kỳ điều hòa", categoryId = cat["HVAC"].id },
                    ["CL-ELEV"] = new ChecklistTemplate { code = "CL-ELEV", name = "Kiểm tra an toàn thang máy", categoryId = cat["ELEV"].id },
                    ["CL-ELEC"] = new ChecklistTemplate { code = "CL-ELEC", name = "Kiểm tra hệ thống điện",     categoryId = cat["ELEC"].id },
                    ["CL-FIRE"] = new ChecklistTemplate { code = "CL-FIRE", name = "Kiểm tra hệ thống PCCC",     categoryId = cat["FIRE"].id },
                };
                context.ChecklistTemplates.AddRange(tpl.Values);

                // ── Materials ──
                var mat = new Dictionary<string, Material>();
                void AddMat(string code, string name, string mc, string uom, decimal min, decimal max, decimal reorder, decimal price)
                    => mat[code] = new Material
                    {
                        materialCode = code, name = name, categoryId = mcat[mc].id, preferredVendorId = ven["V005"].id,
                        unitOfMeasure = uom, minStock = min, maxStock = max, reorderPoint = reorder, reorderQuantity = reorder,
                        unitPrice = price, isActive = true
                    };
                AddMat("MAT-001", "Bóng đèn LED downlight 12W", "MC-ELEC",   "Cái",  20, 200, 50,  85_000);
                AddMat("MAT-002", "Aptomat MCB 32A 1P",         "MC-ELEC",   "Cái",  10, 50,  15,  120_000);
                AddMat("MAT-003", "Dây điện Cadivi 2.5mm²",      "MC-ELEC",   "Mét",  100, 1000, 200, 12_000);
                AddMat("MAT-004", "Gas lạnh R410A",              "MC-HVAC",   "Bình", 5,  30,  10,  1_500_000);
                AddMat("MAT-005", "Lọc gió điều hòa",            "MC-HVAC",   "Cái",  15, 80,  30,  250_000);
                AddMat("MAT-006", "Ống đồng 1/2 inch",           "MC-HVAC",   "Mét",  50, 300, 100, 95_000);
                AddMat("MAT-007", "Van khóa nước phi 21",        "MC-PLUMB",  "Cái",  10, 60,  20,  65_000);
                AddMat("MAT-008", "Ống PVC D60",                 "MC-PLUMB",  "Mét",  30, 200, 60,  45_000);
                AddMat("MAT-009", "Găng tay cách điện",          "MC-CONSUM", "Đôi",  10, 50,  20,  180_000);
                AddMat("MAT-010", "Giẻ lau công nghiệp",         "MC-CONSUM", "Kg",   20, 100, 40,  35_000);
                context.Materials.AddRange(mat.Values);

                // ── Vendor contracts ──
                var vc1 = new VendorContract { contractCode = "HD-2026-001", vendorId = ven["V001"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 240_000_000m, paymentTerms = "Thanh toán theo quý", status = "ACTIVE", scopeOfWork = "Bảo trì định kỳ hệ thống điều hòa trung tâm", signedByVendor = "Nguyễn Văn An", signedByBuilding = "Ban Quản lý" };
                var vc2 = new VendorContract { contractCode = "HD-2026-002", vendorId = ven["V002"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 180_000_000m, paymentTerms = "Thanh toán theo quý", status = "ACTIVE", scopeOfWork = "Bảo trì & kiểm định an toàn thang máy", signedByVendor = "Trần Thị Bình", signedByBuilding = "Ban Quản lý" };
                var vc3 = new VendorContract { contractCode = "HD-2026-003", vendorId = ven["V004"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 120_000_000m, paymentTerms = "Thanh toán 2 đợt", status = "ACTIVE", scopeOfWork = "Bảo trì hệ thống PCCC, kiểm tra bình chữa cháy", signedByVendor = "Phạm Thị Dung", signedByBuilding = "Ban Quản lý" };
                var vc4 = new VendorContract { contractCode = "HD-2025-014", vendorId = ven["V003"].id, buildingId = BUILDING, startDate = Utc(2025, 1, 1), endDate = Utc(2025, 12, 31), contractValue = 95_000_000m,  paymentTerms = "Thanh toán theo đợt", status = "EXPIRED", scopeOfWork = "Bảo trì hệ thống điện năm 2025", signedByVendor = "Lê Văn Cường", signedByBuilding = "Ban Quản lý" };
                context.VendorContracts.AddRange(vc1, vc2, vc3, vc4);

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG C — Phụ thuộc tầng B
                // ════════════════════════════════════════════════════════════

                // ── Assets (12) ──
                var assets = new List<AssetEntity>
                {
                    new() { assetCode = "AS-HVAC-001", name = "Điều hòa trung tâm Daikin VRV #1", categoryId = cat["HVAC"].id,  locationId = loc3.id, buildingId = BUILDING, floorId = FLOOR_2, vendorId = ven["V001"].id, vendorContractId = vc1.id, status = "ACTIVE", serialNumber = "DKVRV-2024-0001", criticalityLevel = "CRITICAL", purchasePrice = 450_000_000m, purchaseDate = Utc(2024, 3, 15), warrantyExpiryDate = Utc(2027, 3, 15), installationDate = Utc(2024, 4, 1), usefulLifeMonths = 120, salvageValue = 45_000_000m, accumulatedDepreciation = 67_500_000m, bookValue = 382_500_000m, lastMaintenanceDate = Utc(2026, 4, 10), nextMaintenanceDate = Utc(2026, 6, 10) },
                    new() { assetCode = "AS-HVAC-002", name = "Điều hòa trung tâm Daikin VRV #2", categoryId = cat["HVAC"].id,  locationId = loc3.id, buildingId = BUILDING, floorId = FLOOR_2, vendorId = ven["V001"].id, vendorContractId = vc1.id, status = "ACTIVE", serialNumber = "DKVRV-2024-0002", criticalityLevel = "CRITICAL", purchasePrice = 450_000_000m, purchaseDate = Utc(2024, 3, 15), warrantyExpiryDate = Utc(2027, 3, 15), installationDate = Utc(2024, 4, 1), usefulLifeMonths = 120, salvageValue = 45_000_000m, accumulatedDepreciation = 67_500_000m, bookValue = 382_500_000m, lastMaintenanceDate = Utc(2026, 4, 10), nextMaintenanceDate = Utc(2026, 6, 10) },
                    new() { assetCode = "AS-ELEV-001", name = "Thang máy Mitsubishi NEXIEZ #1",   categoryId = cat["ELEV"].id,  locationId = loc2.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V002"].id, vendorContractId = vc2.id, status = "ACTIVE", serialNumber = "MIT-NX-2023-A1",  criticalityLevel = "CRITICAL", purchasePrice = 1_200_000_000m, purchaseDate = Utc(2023, 6, 1), warrantyExpiryDate = Utc(2028, 6, 1), installationDate = Utc(2023, 7, 1), usefulLifeMonths = 240, salvageValue = 120_000_000m, accumulatedDepreciation = 180_000_000m, bookValue = 1_020_000_000m, lastMaintenanceDate = Utc(2026, 5, 5), nextMaintenanceDate = Utc(2026, 6, 5) },
                    new() { assetCode = "AS-ELEV-002", name = "Thang máy Mitsubishi NEXIEZ #2",   categoryId = cat["ELEV"].id,  locationId = loc4.id, buildingId = BUILDING, floorId = FLOOR_3, vendorId = ven["V002"].id, vendorContractId = vc2.id, status = "MAINTENANCE", serialNumber = "MIT-NX-2023-A2", criticalityLevel = "CRITICAL", purchasePrice = 1_200_000_000m, purchaseDate = Utc(2023, 6, 1), warrantyExpiryDate = Utc(2028, 6, 1), installationDate = Utc(2023, 7, 1), usefulLifeMonths = 240, salvageValue = 120_000_000m, accumulatedDepreciation = 180_000_000m, bookValue = 1_020_000_000m, lastMaintenanceDate = Utc(2026, 5, 5), nextMaintenanceDate = Utc(2026, 6, 5) },
                    new() { assetCode = "AS-ELEC-001", name = "Tủ điện tổng MSB",                 categoryId = cat["ELEC"].id,  locationId = loc1.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V003"].id, status = "ACTIVE", serialNumber = "MSB-2023-001", criticalityLevel = "CRITICAL", purchasePrice = 320_000_000m, purchaseDate = Utc(2023, 5, 10), warrantyExpiryDate = Utc(2026, 5, 10), installationDate = Utc(2023, 6, 1), usefulLifeMonths = 180, salvageValue = 32_000_000m, accumulatedDepreciation = 48_000_000m, bookValue = 272_000_000m, lastMaintenanceDate = Utc(2026, 3, 1), nextMaintenanceDate = Utc(2026, 6, 1) },
                    new() { assetCode = "AS-GEN-001",  name = "Máy phát điện dự phòng 500kVA",    categoryId = cat["GEN"].id,   locationId = loc1.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V003"].id, status = "ACTIVE", serialNumber = "CUM-500-2023", criticalityLevel = "HIGH", purchasePrice = 850_000_000m, purchaseDate = Utc(2023, 5, 10), warrantyExpiryDate = Utc(2026, 5, 10), installationDate = Utc(2023, 6, 1), usefulLifeMonths = 180, salvageValue = 85_000_000m, accumulatedDepreciation = 127_500_000m, bookValue = 722_500_000m, lastMaintenanceDate = Utc(2026, 4, 1), nextMaintenanceDate = Utc(2026, 7, 1) },
                    new() { assetCode = "AS-PLUMB-001",name = "Bơm cấp nước sinh hoạt #1",        categoryId = cat["PLUMB"].id, locationId = loc1.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V005"].id, status = "ACTIVE", serialNumber = "PUMP-PEN-001", criticalityLevel = "HIGH", purchasePrice = 45_000_000m, purchaseDate = Utc(2024, 1, 20), warrantyExpiryDate = Utc(2026, 1, 20), installationDate = Utc(2024, 2, 1), usefulLifeMonths = 96, salvageValue = 4_500_000m, accumulatedDepreciation = 9_000_000m, bookValue = 36_000_000m, lastMaintenanceDate = Utc(2026, 5, 1), nextMaintenanceDate = Utc(2026, 6, 15) },
                    new() { assetCode = "AS-PLUMB-002",name = "Bơm cấp nước sinh hoạt #2",        categoryId = cat["PLUMB"].id, locationId = loc1.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V005"].id, status = "INACTIVE", serialNumber = "PUMP-PEN-002", criticalityLevel = "MEDIUM", purchasePrice = 45_000_000m, purchaseDate = Utc(2024, 1, 20), warrantyExpiryDate = Utc(2026, 1, 20), installationDate = Utc(2024, 2, 1), usefulLifeMonths = 96, salvageValue = 4_500_000m, accumulatedDepreciation = 9_000_000m, bookValue = 36_000_000m, lastMaintenanceDate = Utc(2026, 5, 1), nextMaintenanceDate = Utc(2026, 6, 15) },
                    new() { assetCode = "AS-FIRE-001", name = "Tủ trung tâm báo cháy",            categoryId = cat["FIRE"].id,  locationId = loc2.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V004"].id, vendorContractId = vc3.id, status = "ACTIVE", serialNumber = "FACP-2023-001", criticalityLevel = "CRITICAL", purchasePrice = 180_000_000m, purchaseDate = Utc(2023, 8, 1), warrantyExpiryDate = Utc(2026, 8, 1), installationDate = Utc(2023, 9, 1), usefulLifeMonths = 120, salvageValue = 18_000_000m, accumulatedDepreciation = 27_000_000m, bookValue = 153_000_000m, lastMaintenanceDate = Utc(2026, 5, 10), nextMaintenanceDate = Utc(2026, 6, 10) },
                    new() { assetCode = "AS-FIRE-002", name = "Máy bơm chữa cháy",                categoryId = cat["FIRE"].id,  locationId = loc1.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V004"].id, vendorContractId = vc3.id, status = "ACTIVE", serialNumber = "FP-2023-001", criticalityLevel = "HIGH", purchasePrice = 220_000_000m, purchaseDate = Utc(2023, 8, 1), warrantyExpiryDate = Utc(2026, 8, 1), installationDate = Utc(2023, 9, 1), usefulLifeMonths = 120, salvageValue = 22_000_000m, accumulatedDepreciation = 33_000_000m, bookValue = 187_000_000m, lastMaintenanceDate = Utc(2026, 5, 10), nextMaintenanceDate = Utc(2026, 8, 10) },
                    new() { assetCode = "AS-HVAC-003", name = "Quạt thông gió tầng hầm",          categoryId = cat["HVAC"].id,  locationId = loc1.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V001"].id, status = "ACTIVE", serialNumber = "FAN-2024-001", criticalityLevel = "MEDIUM", purchasePrice = 35_000_000m, purchaseDate = Utc(2024, 2, 1), warrantyExpiryDate = Utc(2026, 2, 1), installationDate = Utc(2024, 2, 15), usefulLifeMonths = 96, salvageValue = 3_500_000m, accumulatedDepreciation = 7_000_000m, bookValue = 28_000_000m, lastMaintenanceDate = Utc(2026, 3, 15), nextMaintenanceDate = Utc(2026, 6, 15) },
                    new() { assetCode = "AS-GEN-002",  name = "Camera giám sát sảnh chính",       categoryId = cat["GEN"].id,   locationId = loc2.id, buildingId = BUILDING, floorId = FLOOR_1, vendorId = ven["V003"].id, status = "ACTIVE", serialNumber = "CAM-2024-012", criticalityLevel = "LOW", purchasePrice = 8_000_000m, purchaseDate = Utc(2024, 5, 1), warrantyExpiryDate = Utc(2026, 5, 1), installationDate = Utc(2024, 5, 10), usefulLifeMonths = 60, salvageValue = 800_000m, accumulatedDepreciation = 1_600_000m, bookValue = 6_400_000m, lastMaintenanceDate = Utc(2026, 2, 1), nextMaintenanceDate = Utc(2026, 8, 1) },
                };
                context.Assets.AddRange(assets);

                // ── Checklist template items (3 mục / template) ──
                var tplItems = new Dictionary<string, List<ChecklistTemplateItem>>();
                void AddItems(string code, params (string label, string type, string? expected)[] items)
                {
                    var list = new List<ChecklistTemplateItem>();
                    int order = 1;
                    foreach (var (label, type, expected) in items)
                        list.Add(new ChecklistTemplateItem { templateId = tpl[code].id, itemCode = $"{code}-{order:00}", itemType = type, itemLabel = label, sortOrder = order++, isRequired = true, expectedValue = expected });
                    tplItems[code] = list;
                    context.ChecklistTemplateItems.AddRange(list);
                }
                AddItems("CL-HVAC", ("Vệ sinh lưới lọc gió", "BOOLEAN", "OK"), ("Đo áp suất gas (bar)", "NUMBER", "8-10"), ("Kiểm tra dòng điện máy nén (A)", "NUMBER", "< 15"));
                AddItems("CL-ELEV", ("Kiểm tra phanh an toàn", "BOOLEAN", "OK"), ("Kiểm tra cáp tải", "BOOLEAN", "OK"), ("Thử nút gọi khẩn cấp", "BOOLEAN", "OK"));
                AddItems("CL-ELEC", ("Đo điện trở tiếp địa (Ω)", "NUMBER", "< 4"), ("Siết lại đầu cốt", "BOOLEAN", "OK"), ("Kiểm tra nhiệt độ thanh cái", "NUMBER", "< 60"));
                AddItems("CL-FIRE", ("Kiểm tra đầu báo khói", "BOOLEAN", "OK"), ("Thử chuông báo cháy", "BOOLEAN", "OK"), ("Kiểm tra áp lực bình chữa cháy", "NUMBER", "OK"));

                // ── Vendor contract services ──
                context.VendorContractServices.AddRange(
                    new VendorContractService { contractId = vc1.id, serviceName = "Bảo trì định kỳ hàng tháng" },
                    new VendorContractService { contractId = vc1.id, serviceName = "Sửa chữa khẩn cấp 24/7" },
                    new VendorContractService { contractId = vc2.id, serviceName = "Bảo trì định kỳ hàng tháng" },
                    new VendorContractService { contractId = vc2.id, serviceName = "Kiểm định an toàn định kỳ" },
                    new VendorContractService { contractId = vc3.id, serviceName = "Bảo trì hệ thống báo cháy" },
                    new VendorContractService { contractId = vc3.id, serviceName = "Nạp & kiểm tra bình chữa cháy" }
                );

                // ── Vendor evaluations ──
                context.VendorEvaluations.AddRange(
                    new VendorEvaluation { vendorId = ven["V001"].id, contractId = vc1.id, evaluatorId = MANAGER, evaluationDate = Utc(2026, 4, 1), overallScore = 5, qualityScore = 5, timelinessScore = 4, costScore = 4, safetyScore = 5, recommendation = "RENEW",   comments = "Dịch vụ tốt, phản hồi nhanh." },
                    new VendorEvaluation { vendorId = ven["V002"].id, contractId = vc2.id, evaluatorId = MANAGER, evaluationDate = Utc(2026, 4, 1), overallScore = 4, qualityScore = 4, timelinessScore = 4, costScore = 3, safetyScore = 5, recommendation = "RENEW",   comments = "Đảm bảo an toàn, chi phí hơi cao." },
                    new VendorEvaluation { vendorId = ven["V004"].id, contractId = vc3.id, evaluatorId = MANAGER, evaluationDate = Utc(2026, 4, 1), overallScore = 4, qualityScore = 4, timelinessScore = 5, costScore = 4, safetyScore = 5, recommendation = "RENEW",   comments = "Tuân thủ quy định PCCC tốt." },
                    new VendorEvaluation { vendorId = ven["V003"].id, contractId = vc4.id, evaluatorId = MANAGER, evaluationDate = Utc(2025, 12, 20), overallScore = 3, qualityScore = 3, timelinessScore = 2, costScore = 4, safetyScore = 3, recommendation = "REVIEW", comments = "Tiến độ chậm, cân nhắc khi gia hạn." }
                );

                await context.SaveChangesAsync();

                // ── Inventory levels (sau khi có warehouse + material) ──
                void AddLevel(Warehouse w, string code, decimal qty)
                    => context.InventoryLevels.Add(new InventoryLevel { warehouseId = w.id, materialId = mat[code].id, quantityOnHand = qty });
                AddLevel(wh1, "MAT-001", 60); AddLevel(wh1, "MAT-002", 8);  AddLevel(wh1, "MAT-003", 300);
                AddLevel(wh1, "MAT-004", 4);  AddLevel(wh1, "MAT-005", 0);  AddLevel(wh1, "MAT-006", 150);
                AddLevel(wh1, "MAT-007", 25); AddLevel(wh1, "MAT-008", 80); AddLevel(wh1, "MAT-009", 12);
                AddLevel(wh1, "MAT-010", 50);
                AddLevel(wh2, "MAT-001", 30); AddLevel(wh2, "MAT-003", 100); AddLevel(wh2, "MAT-009", 5); AddLevel(wh2, "MAT-010", 20);

                // ── Inventory transactions: nhập kho ban đầu (IN) ──
                int txnSeq = 1;
                void AddInTxn(Warehouse w, string code, decimal qty)
                {
                    var unit = mat[code].unitPrice ?? 0m;
                    context.InventoryTransactions.Add(new InventoryTransaction { txnCode = $"TXN-2026-{txnSeq++:0000}", warehouseId = w.id, materialId = mat[code].id, txnType = "IN", referenceType = "INITIAL", quantity = qty, unitCost = unit, totalCost = unit * qty, performedBy = KTV1, performedAt = Utc(2026, 1, 5, 8, 0), notes = "Nhập kho đầu kỳ" });
                }
                AddInTxn(wh1, "MAT-001", 100); AddInTxn(wh1, "MAT-003", 500); AddInTxn(wh1, "MAT-004", 12);
                AddInTxn(wh1, "MAT-006", 200); AddInTxn(wh1, "MAT-008", 120); AddInTxn(wh2, "MAT-001", 50);

                await context.SaveChangesAsync();

                // Named asset refs cho dễ đọc
                var aHvac1 = assets[0]; var aHvac2 = assets[1]; var aElev1 = assets[2]; var aElev2 = assets[3];
                var aMsb = assets[4]; var aGen = assets[5]; var aPump1 = assets[6]; var aPump2 = assets[7];
                var aFireP = assets[8]; var aFirePump = assets[9]; var aFan = assets[10]; var aCam = assets[11];

                // ════════════════════════════════════════════════════════════
                // TẦNG D — QR, lịch bảo trì, khấu hao, IoT, ticket
                // ════════════════════════════════════════════════════════════

                // ── QR codes (1 / asset) ──
                foreach (var a in assets)
                    context.AssetQrCodes.Add(new AssetQrCode { assetId = a.id, qrCode = $"QR-{a.assetCode}" });

                // ── Maintenance schedules ──
                var schHvac = new MaintenanceSchedule { assetId = aHvac1.id, scheduleType = "PREVENTIVE", checklistTemplateId = tpl["CL-HVAC"].id, autoAssignDepartmentId = DEPT_KT, frequencyType = "MONTHLY", frequencyDays = 30, startDate = Utc(2026, 1, 1), nextDueDate = Utc(2026, 6, 10), lastExecutedAt = Utc(2026, 4, 10), leadTimeDays = 3, isActive = true, description = "Bảo trì điều hòa trung tâm hàng tháng" };
                var schElev = new MaintenanceSchedule { assetId = aElev1.id, scheduleType = "PREVENTIVE", checklistTemplateId = tpl["CL-ELEV"].id, autoAssignDepartmentId = DEPT_KT, frequencyType = "MONTHLY", frequencyDays = 30, startDate = Utc(2026, 1, 1), nextDueDate = Utc(2026, 6, 5), lastExecutedAt = Utc(2026, 5, 5), leadTimeDays = 3, isActive = true, description = "Bảo trì thang máy hàng tháng" };
                var schMsb  = new MaintenanceSchedule { assetId = aMsb.id, scheduleType = "INSPECTION", checklistTemplateId = tpl["CL-ELEC"].id, autoAssignDepartmentId = DEPT_KT, frequencyType = "QUARTERLY", frequencyDays = 90, startDate = Utc(2026, 1, 1), nextDueDate = Utc(2026, 6, 1), lastExecutedAt = Utc(2026, 3, 1), leadTimeDays = 7, isActive = true, description = "Kiểm tra tủ điện tổng theo quý" };
                var schFire = new MaintenanceSchedule { assetId = aFireP.id, scheduleType = "INSPECTION", checklistTemplateId = tpl["CL-FIRE"].id, autoAssignDepartmentId = DEPT_KT, frequencyType = "MONTHLY", frequencyDays = 30, startDate = Utc(2026, 1, 1), nextDueDate = Utc(2026, 6, 10), lastExecutedAt = Utc(2026, 5, 10), leadTimeDays = 3, isActive = true, description = "Kiểm tra hệ thống PCCC hàng tháng" };
                var schGen  = new MaintenanceSchedule { assetId = aGen.id, scheduleType = "PREVENTIVE", checklistTemplateId = tpl["CL-ELEC"].id, autoAssignDepartmentId = DEPT_KT, frequencyType = "QUARTERLY", frequencyDays = 90, startDate = Utc(2026, 1, 1), nextDueDate = Utc(2026, 7, 1), lastExecutedAt = Utc(2026, 4, 1), leadTimeDays = 7, isActive = true, description = "Chạy thử & bảo trì máy phát điện theo quý" };
                context.MaintenanceSchedules.AddRange(schHvac, schElev, schMsb, schFire, schGen);

                // ── Depreciation logs (3 kỳ cho HVAC#1 & Thang máy#1) ──
                void AddDepr(AssetEntity a, int year, int month, decimal amount, decimal before, decimal accBefore)
                    => context.AssetDepreciationLogs.Add(new AssetDepreciationLog { assetId = a.id, periodYear = year, periodMonth = month, depreciationAmount = amount, bookValueBefore = before, bookValueAfter = before - amount, accumulatedTotal = accBefore + amount, calculatedAt = Utc(year, month, 28), calculatedBy = ADMIN });
                AddDepr(aHvac1, 2026, 1, 3_375_000m, 392_625_000m, 57_375_000m);
                AddDepr(aHvac1, 2026, 2, 3_375_000m, 389_250_000m, 60_750_000m);
                AddDepr(aHvac1, 2026, 3, 3_375_000m, 385_875_000m, 64_125_000m);
                AddDepr(aElev1, 2026, 1, 4_500_000m, 1_033_500_000m, 166_500_000m);
                AddDepr(aElev1, 2026, 2, 4_500_000m, 1_029_000_000m, 171_000_000m);
                AddDepr(aElev1, 2026, 3, 4_500_000m, 1_024_500_000m, 175_500_000m);

                // ── IoT sensor readings (cảm biến nhiệt độ phòng máy) ──
                for (int i = 0; i < 3; i++)
                {
                    context.IotSensorReadings.Add(new IotSensorReading { assetId = aHvac1.id, sensorCode = "TEMP-RM-KT", readingValue = 24.5m + i * 0.3m, readingAt = now.AddHours(-(i + 1) * 6) });
                    context.IotSensorReadings.Add(new IotSensorReading { assetId = aMsb.id, sensorCode = "TEMP-MSB", readingValue = 42.0m + i * 1.2m, readingAt = now.AddHours(-(i + 1) * 6) });
                }

                // ── Tickets (8, trạng thái đa dạng) ──
                var tkNew1   = new Ticket { ticketCode = "TK-2026-001", status = "NEW",         buildingId = BUILDING, floorId = FLOOR_1, unitId = UNIT_1, assetId = aHvac1.id, reportedBy = RESIDENT, slaConfigId = slaHigh.id, title = "Điều hòa sảnh không mát", description = "Điều hòa khu sảnh chính chạy nhưng không mát từ sáng.", category = "HVAC", priority = "HIGH", source = "APP", createdAt = now.AddDays(-1) };
                var tkInprog1= new Ticket { ticketCode = "TK-2026-002", status = "IN_PROGRESS", buildingId = BUILDING, floorId = FLOOR_3, assetId = aElev2.id, reportedBy = RESIDENT, slaConfigId = slaHigh.id, title = "Thang máy #2 có tiếng kêu lạ", description = "Thang máy số 2 phát ra tiếng kêu khi di chuyển qua tầng 3.", category = "ELEVATOR", priority = "HIGH", source = "RECEPTION", createdAt = now.AddDays(-2) };
                var tkResolved1 = new Ticket { ticketCode = "TK-2026-003", status = "RESOLVED", buildingId = BUILDING, floorId = FLOOR_3, assetId = aMsb.id, reportedBy = RESIDENT, slaConfigId = slaCrit.id, title = "Mất điện cục bộ tầng 3", description = "Khu vực hành lang tầng 3 bị mất điện.", category = "ELECTRICAL", priority = "CRITICAL", source = "PHONE", resolvedAt = now.AddDays(-3).AddHours(3), resolutionNote = "Đã reset aptomat nhánh bị nhảy.", createdAt = now.AddDays(-3) };
                var tkAssigned1 = new Ticket { ticketCode = "TK-2026-004", status = "ASSIGNED", buildingId = BUILDING, floorId = FLOOR_2, unitId = UNIT_2, reportedBy = RESIDENT, slaConfigId = slaStd.id, title = "Rò rỉ nước nhà vệ sinh chung", description = "Nước rò rỉ tại nhà vệ sinh chung tầng 2.", category = "PLUMBING", priority = "MEDIUM", source = "APP", createdAt = now.AddDays(-1).AddHours(-4) };
                var tkClosed1 = new Ticket { ticketCode = "TK-2026-005", status = "CLOSED", buildingId = BUILDING, floorId = FLOOR_2, assetId = aCam.id, reportedBy = RESIDENT, slaConfigId = slaStd.id, title = "Đèn hành lang tầng 2 bị hỏng", description = "Một số bóng đèn hành lang tầng 2 không sáng.", category = "ELECTRICAL", priority = "LOW", source = "APP", resolvedAt = now.AddDays(-5).AddHours(5), closedAt = now.AddDays(-4), resolutionNote = "Đã thay 3 bóng LED.", createdAt = now.AddDays(-6) };
                var tkResolved2 = new Ticket { ticketCode = "TK-2026-006", status = "RESOLVED", buildingId = BUILDING, floorId = FLOOR_1, assetId = aFireP.id, reportedBy = MANAGER, slaConfigId = slaCrit.id, title = "Báo cháy giả tại tầng hầm", description = "Hệ thống báo cháy kích hoạt nhầm tại tầng hầm.", category = "FIRE", priority = "CRITICAL", source = "RECEPTION", resolvedAt = now.AddDays(-7).AddHours(2), resolutionNote = "Vệ sinh đầu báo bị bám bụi.", createdAt = now.AddDays(-7) };
                var tkNew2 = new Ticket { ticketCode = "TK-2026-007", status = "NEW", buildingId = BUILDING, floorId = FLOOR_1, assetId = aCam.id, reportedBy = RESIDENT, slaConfigId = slaStd.id, title = "Camera sảnh bị mờ hình", description = "Hình ảnh camera sảnh chính bị mờ, khó quan sát.", category = "OTHER", priority = "LOW", source = "APP", createdAt = now.AddHours(-8) };
                var tkInprog2 = new Ticket { ticketCode = "TK-2026-008", status = "IN_PROGRESS", buildingId = BUILDING, floorId = FLOOR_1, assetId = aPump1.id, reportedBy = MANAGER, slaConfigId = slaHigh.id, title = "Bơm nước cấp yếu", description = "Áp lực nước các tầng cao bị yếu vào giờ cao điểm.", category = "PLUMBING", priority = "MEDIUM", source = "PHONE", createdAt = now.AddDays(-1).AddHours(-2) };
                var tickets = new[] { tkNew1, tkInprog1, tkResolved1, tkAssigned1, tkClosed1, tkResolved2, tkNew2, tkInprog2 };
                context.Tickets.AddRange(tickets);

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG E — Work orders (cần asset/schedule/template id)
                // ════════════════════════════════════════════════════════════
                var woHvac = new WorkOrder { woCode = "WO-2026-001", assetId = aHvac1.id, scheduleId = schHvac.id, checklistTemplateId = tpl["CL-HVAC"].id, buildingId = BUILDING, status = "COMPLETED", woType = "PM", title = "Bảo trì định kỳ điều hòa VRV #1", priority = "MEDIUM", reviewerId = MANAGER, createdBy = KTV1, scheduledDate = Utc(2026, 4, 10), dueDate = Utc(2026, 4, 12), actualStartAt = Utc(2026, 4, 10, 8, 0), actualEndAt = Utc(2026, 4, 10, 11, 0), approvedAt = Utc(2026, 4, 11, 9, 0), estimatedHours = 3m, actualHours = 3m, totalCost = 1_200_000m, createdAt = Utc(2026, 4, 8), updatedAt = Utc(2026, 4, 11) };
                var woElev = new WorkOrder { woCode = "WO-2026-002", assetId = aElev1.id, scheduleId = schElev.id, checklistTemplateId = tpl["CL-ELEV"].id, buildingId = BUILDING, status = "COMPLETED", woType = "PM", title = "Bảo trì định kỳ thang máy #1", priority = "HIGH", reviewerId = MANAGER, createdBy = KTV2, scheduledDate = Utc(2026, 5, 5), dueDate = Utc(2026, 5, 6), actualStartAt = Utc(2026, 5, 5, 8, 0), actualEndAt = Utc(2026, 5, 5, 12, 0), approvedAt = Utc(2026, 5, 6, 9, 0), estimatedHours = 4m, actualHours = 4m, totalCost = 1_500_000m, createdAt = Utc(2026, 5, 3), updatedAt = Utc(2026, 5, 6) };
                var woMsb  = new WorkOrder { woCode = "WO-2026-003", assetId = aMsb.id, scheduleId = schMsb.id, checklistTemplateId = tpl["CL-ELEC"].id, buildingId = BUILDING, status = "IN_PROGRESS", woType = "PM", title = "Kiểm tra tủ điện tổng MSB Q2", priority = "HIGH", createdBy = KTV1, scheduledDate = Utc(2026, 6, 1), dueDate = Utc(2026, 6, 2), actualStartAt = now.AddHours(-3), estimatedHours = 4m, createdAt = now.AddDays(-2), updatedAt = now.AddHours(-3) };
                var woFire = new WorkOrder { woCode = "WO-2026-004", assetId = aFireP.id, scheduleId = schFire.id, checklistTemplateId = tpl["CL-FIRE"].id, buildingId = BUILDING, status = "ASSIGNED", woType = "PM", title = "Kiểm tra hệ thống PCCC tháng 6", priority = "HIGH", createdBy = KTV2, scheduledDate = Utc(2026, 6, 10), dueDate = Utc(2026, 6, 11), estimatedHours = 3m, createdAt = now.AddDays(-1), updatedAt = now.AddDays(-1) };
                var woGen  = new WorkOrder { woCode = "WO-2026-005", assetId = aGen.id, scheduleId = schGen.id, checklistTemplateId = tpl["CL-ELEC"].id, buildingId = BUILDING, status = "PENDING_REVIEW", woType = "PM", title = "Bảo trì máy phát điện Q2", priority = "MEDIUM", reviewerId = MANAGER, createdBy = KTV1, scheduledDate = Utc(2026, 4, 1), dueDate = Utc(2026, 4, 2), actualStartAt = Utc(2026, 4, 1, 8, 0), actualEndAt = Utc(2026, 4, 1, 10, 30), estimatedHours = 2.5m, actualHours = 2.5m, totalCost = 900_000m, createdAt = Utc(2026, 3, 30), updatedAt = Utc(2026, 4, 1) };
                var woPump = new WorkOrder { woCode = "WO-2026-006", assetId = aPump1.id, checklistTemplateId = tpl["CL-ELEC"].id, buildingId = BUILDING, status = "DRAFT", woType = "PM", title = "Bảo trì bơm cấp nước #1", priority = "MEDIUM", createdBy = KTV2, scheduledDate = Utc(2026, 6, 15), dueDate = Utc(2026, 6, 16), estimatedHours = 2m, createdAt = now.AddHours(-12), updatedAt = now.AddHours(-12) };
                var woCmElec = new WorkOrder { woCode = "WO-2026-007", assetId = aMsb.id, checklistTemplateId = tpl["CL-ELEC"].id, buildingId = BUILDING, status = "COMPLETED", woType = "CM", title = "Khắc phục mất điện tầng 3", priority = "CRITICAL", reviewerId = MANAGER, createdBy = KTV1, scheduledDate = now.AddDays(-3), dueDate = now.AddDays(-3).AddHours(4), actualStartAt = now.AddDays(-3).AddMinutes(30), actualEndAt = now.AddDays(-3).AddHours(3), approvedAt = now.AddDays(-3).AddHours(5), estimatedHours = 2m, actualHours = 2.5m, totalCost = 650_000m, createdAt = now.AddDays(-3), updatedAt = now.AddDays(-3) };
                var woCmPump = new WorkOrder { woCode = "WO-2026-008", assetId = aPump1.id, checklistTemplateId = tpl["CL-ELEC"].id, buildingId = BUILDING, status = "IN_PROGRESS", woType = "CM", title = "Xử lý bơm nước cấp yếu", priority = "MEDIUM", createdBy = KTV2, scheduledDate = now, dueDate = now.AddHours(8), actualStartAt = now.AddHours(-1), estimatedHours = 3m, createdAt = now.AddHours(-2), updatedAt = now.AddHours(-1) };
                var workOrders = new[] { woHvac, woElev, woMsb, woFire, woGen, woPump, woCmElec, woCmPump };
                context.WorkOrders.AddRange(workOrders);

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG F — Phụ thuộc WO & Ticket
                // ════════════════════════════════════════════════════════════

                // ── WO assignments (mọi WO trừ DRAFT) ──
                context.WorkOrderAssignments.AddRange(
                    new WorkOrderAssignment { woId = woHvac.id, assignedTo = KTV1, checkinQrAssetId = aHvac1.id },
                    new WorkOrderAssignment { woId = woElev.id, assignedTo = KTV2, checkinQrAssetId = aElev1.id },
                    new WorkOrderAssignment { woId = woMsb.id,  assignedTo = KTV1, checkinQrAssetId = aMsb.id },
                    new WorkOrderAssignment { woId = woFire.id, assignedTo = KTV2, checkinQrAssetId = aFireP.id },
                    new WorkOrderAssignment { woId = woGen.id,  assignedTo = KTV1, checkinQrAssetId = aGen.id },
                    new WorkOrderAssignment { woId = woCmElec.id, assignedTo = KTV1, checkinQrAssetId = aMsb.id },
                    new WorkOrderAssignment { woId = woCmPump.id, assignedTo = KTV2, checkinQrAssetId = aPump1.id }
                );

                // ── WO checklist responses (cho 2 WO PM đã hoàn thành) ──
                foreach (var it in tplItems["CL-HVAC"])
                    context.WorkOrderChecklistResponses.Add(new WorkOrderChecklistResponse { woId = woHvac.id, templateItemId = it.id, isPassed = true, valueText = it.itemType == "NUMBER" ? "9" : "Đạt", respondedAt = Utc(2026, 4, 10, 10, 30) });
                foreach (var it in tplItems["CL-ELEV"])
                    context.WorkOrderChecklistResponses.Add(new WorkOrderChecklistResponse { woId = woElev.id, templateItemId = it.id, isPassed = true, valueText = "Đạt", respondedAt = Utc(2026, 5, 5, 11, 30) });

                // ── WO attachments ──
                context.WorkOrderAttachments.AddRange(
                    new WorkOrderAttachment { woId = woHvac.id, attachmentType = "PHOTO", fileUrl = "https://res.cloudinary.com/demo/asset/wo-2026-001-before.jpg", fileName = "wo-2026-001-before.jpg", fileSizeBytes = 320_000, uploadedBy = KTV1, uploadedAt = Utc(2026, 4, 10, 8, 5), caption = "Hiện trạng trước bảo trì" },
                    new WorkOrderAttachment { woId = woHvac.id, attachmentType = "PHOTO", fileUrl = "https://res.cloudinary.com/demo/asset/wo-2026-001-after.jpg", fileName = "wo-2026-001-after.jpg", fileSizeBytes = 310_000, uploadedBy = KTV1, uploadedAt = Utc(2026, 4, 10, 11, 0), caption = "Sau khi vệ sinh lưới lọc" },
                    new WorkOrderAttachment { woId = woElev.id, attachmentType = "DOCUMENT", fileUrl = "https://res.cloudinary.com/demo/asset/wo-2026-002-report.pdf", fileName = "bien-ban-bao-tri.pdf", fileSizeBytes = 180_000, uploadedBy = KTV2, uploadedAt = Utc(2026, 5, 5, 12, 0), caption = "Biên bản nghiệm thu" }
                );

                // ── Inventory transactions: xuất kho dùng cho WO (OUT) ──
                var outTxn1 = new InventoryTransaction { txnCode = $"TXN-2026-{txnSeq++:0000}", warehouseId = wh1.id, materialId = mat["MAT-005"].id, txnType = "OUT", referenceType = "WORK_ORDER", referenceId = woHvac.id, quantity = 2, unitCost = mat["MAT-005"].unitPrice, totalCost = (mat["MAT-005"].unitPrice ?? 0m) * 2, performedBy = KTV1, performedAt = Utc(2026, 4, 10, 9, 0), notes = "Thay lọc gió cho VRV #1" };
                var outTxn2 = new InventoryTransaction { txnCode = $"TXN-2026-{txnSeq++:0000}", warehouseId = wh1.id, materialId = mat["MAT-001"].id, txnType = "OUT", referenceType = "WORK_ORDER", referenceId = woCmElec.id, quantity = 3, unitCost = mat["MAT-001"].unitPrice, totalCost = (mat["MAT-001"].unitPrice ?? 0m) * 3, performedBy = KTV1, performedAt = now.AddDays(-3).AddHours(1), notes = "Thay bóng đèn hành lang tầng 3" };
                var outTxn3 = new InventoryTransaction { txnCode = $"TXN-2026-{txnSeq++:0000}", warehouseId = wh1.id, materialId = mat["MAT-002"].id, txnType = "OUT", referenceType = "WORK_ORDER", referenceId = woCmElec.id, quantity = 1, unitCost = mat["MAT-002"].unitPrice, totalCost = mat["MAT-002"].unitPrice, performedBy = KTV1, performedAt = now.AddDays(-3).AddHours(1), notes = "Thay aptomat nhánh tầng 3" };
                context.InventoryTransactions.AddRange(outTxn1, outTxn2, outTxn3);

                // ── Ticket assignments ──
                context.TicketAssignments.AddRange(
                    new TicketAssignment { ticketId = tkInprog1.id, assignedTo = KTV2 },
                    new TicketAssignment { ticketId = tkResolved1.id, assignedTo = KTV1 },
                    new TicketAssignment { ticketId = tkAssigned1.id, assignedTo = KTV2 },
                    new TicketAssignment { ticketId = tkClosed1.id, assignedTo = KTV1 },
                    new TicketAssignment { ticketId = tkResolved2.id, assignedTo = KTV2 },
                    new TicketAssignment { ticketId = tkInprog2.id, assignedTo = KTV2 }
                );

                // ── Ticket attachments ──
                context.TicketAttachments.AddRange(
                    new TicketAttachment { ticketId = tkNew1.id, fileUrl = "https://res.cloudinary.com/demo/ticket/tk-001-hvac.jpg" },
                    new TicketAttachment { ticketId = tkInprog1.id, fileUrl = "https://res.cloudinary.com/demo/ticket/tk-002-elev.jpg" },
                    new TicketAttachment { ticketId = tkResolved1.id, fileUrl = "https://res.cloudinary.com/demo/ticket/tk-003-elec.jpg" }
                );

                // ── Ticket ratings (cho ticket đã resolved/closed) ──
                context.TicketRatings.AddRange(
                    new TicketRating { ticketId = tkResolved1.id, ratedBy = RESIDENT, overallRating = 5 },
                    new TicketRating { ticketId = tkClosed1.id, ratedBy = RESIDENT, overallRating = 4 },
                    new TicketRating { ticketId = tkResolved2.id, ratedBy = MANAGER, overallRating = 5 }
                );

                // ── Ticket status history ──
                void AddHist(Ticket t, string? from, string to, DateTime at, Guid? by, string? note)
                    => context.TicketStatusHistories.Add(new TicketStatusHistory { ticketId = t.id, fromStatus = from, toStatus = to, changedAt = at, changedBy = by, note = note });
                AddHist(tkResolved1, null, "NEW", now.AddDays(-3), RESIDENT, "Cư dân tạo phiếu");
                AddHist(tkResolved1, "NEW", "ASSIGNED", now.AddDays(-3).AddMinutes(20), MANAGER, "Phân công KTV");
                AddHist(tkResolved1, "ASSIGNED", "IN_PROGRESS", now.AddDays(-3).AddHours(1), KTV1, "Bắt đầu xử lý");
                AddHist(tkResolved1, "IN_PROGRESS", "RESOLVED", now.AddDays(-3).AddHours(3), KTV1, "Đã khắc phục");
                AddHist(tkClosed1, "RESOLVED", "CLOSED", now.AddDays(-4), MANAGER, "Đóng phiếu sau xác nhận");
                AddHist(tkInprog1, null, "NEW", now.AddDays(-2), RESIDENT, "Tiếp nhận tại lễ tân");
                AddHist(tkInprog1, "NEW", "IN_PROGRESS", now.AddDays(-2).AddHours(2), KTV2, "KTV đang kiểm tra");

                // ── SLA escalation logs (ticket trễ hạn) ──
                context.SlaEscalationLogs.AddRange(
                    new SlaEscalationLog { ticketId = tkInprog1.id, escalationLevel = 1, escalatedAt = now.AddDays(-1).AddHours(-6), escalatedTo = MANAGER, channel = "EMAIL", message = "Ticket sắp quá hạn xử lý." },
                    new SlaEscalationLog { ticketId = tkInprog2.id, escalationLevel = 1, escalatedAt = now.AddHours(-2), escalatedTo = MANAGER, channel = "PUSH", message = "Ticket cần được ưu tiên." }
                );

                await context.SaveChangesAsync();

                // ── WO materials used (sau khi có OUT txn) ──
                context.WorkOrderMaterialsUsed.AddRange(
                    new WorkOrderMaterialUsed { woId = woHvac.id, materialId = mat["MAT-005"].id, warehouseId = wh1.id, inventoryTransactionId = outTxn1.id },
                    new WorkOrderMaterialUsed { woId = woCmElec.id, materialId = mat["MAT-001"].id, warehouseId = wh1.id, inventoryTransactionId = outTxn2.id },
                    new WorkOrderMaterialUsed { woId = woCmElec.id, materialId = mat["MAT-002"].id, warehouseId = wh1.id, inventoryTransactionId = outTxn3.id }
                );

                // ════════════════════════════════════════════════════════════
                // TẦNG G — Mua sắm: Purchase requests (cần ticket/WO id)
                // ════════════════════════════════════════════════════════════
                var pr1 = new PurchaseRequest { prCode = "PR-2026-001", departmentId = DEPT_KT, requestedBy = KTV1, status = "APPROVED", title = "Bổ sung vật tư điện quý 2", justification = "Tồn kho aptomat & lọc gió dưới mức tối thiểu.", priority = "HIGH", neededByDate = Utc(2026, 6, 20), approvedBy = MANAGER, approvedAt = Utc(2026, 5, 25), createdAt = Utc(2026, 5, 20) };
                var pr2 = new PurchaseRequest { prCode = "PR-2026-002", ticketId = tkInprog2.id, departmentId = DEPT_KT, requestedBy = KTV2, status = "SUBMITTED", title = "Vật tư thay thế bơm nước", justification = "Phục vụ xử lý sự cố bơm cấp nước yếu.", priority = "MEDIUM", neededByDate = Utc(2026, 6, 15), createdAt = now.AddDays(-1) };
                var pr3 = new PurchaseRequest { prCode = "PR-2026-003", woId = woFire.id, departmentId = DEPT_KT, requestedBy = KTV2, status = "DRAFT", title = "Vật tư PCCC định kỳ", justification = "Chuẩn bị cho đợt kiểm tra PCCC tháng 6.", priority = "MEDIUM", neededByDate = Utc(2026, 6, 25), createdAt = now.AddHours(-10) };
                context.PurchaseRequests.AddRange(pr1, pr2, pr3);

                await context.SaveChangesAsync();

                // ── PR items ──
                context.PurchaseRequestItems.AddRange(
                    new PurchaseRequestItem { prId = pr1.id, materialId = mat["MAT-002"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr1.id, materialId = mat["MAT-005"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr1.id, materialId = mat["MAT-001"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr2.id, materialId = mat["MAT-007"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr2.id, materialId = mat["MAT-008"].id, targetWarehouseId = wh1.id }
                );

                // ── Purchase orders ──
                var po1 = new PurchaseOrder { poCode = "PO-2026-001", prId = pr1.id, vendorId = ven["V005"].id, status = "RECEIVED", issueDate = Utc(2026, 5, 26), expectedDelivery = Utc(2026, 6, 2), actualDelivery = Utc(2026, 6, 1), totalAmount = 9_350_000m, currency = "VND", paymentTerms = "Thanh toán trong 30 ngày", createdBy = MANAGER, createdAt = Utc(2026, 5, 26) };
                var po2 = new PurchaseOrder { poCode = "PO-2026-002", prId = pr2.id, vendorId = ven["V005"].id, status = "ORDERED", issueDate = now.AddHours(-20), expectedDelivery = Utc(2026, 6, 14), totalAmount = 1_100_000m, currency = "VND", paymentTerms = "Thanh toán trong 30 ngày", createdBy = MANAGER, createdAt = now.AddHours(-20) };
                context.PurchaseOrders.AddRange(po1, po2);

                await context.SaveChangesAsync();

                // ── PO items ──
                var poItem1 = new PurchaseOrderItem { poId = po1.id, materialId = mat["MAT-002"].id, targetWarehouseId = wh1.id };
                var poItem2 = new PurchaseOrderItem { poId = po1.id, materialId = mat["MAT-005"].id, targetWarehouseId = wh1.id };
                var poItem3 = new PurchaseOrderItem { poId = po2.id, materialId = mat["MAT-007"].id, targetWarehouseId = wh1.id };
                context.PurchaseOrderItems.AddRange(poItem1, poItem2, poItem3);

                // ── PO approval workflow ──
                context.PoApprovalWorkflows.AddRange(
                    new PoApprovalWorkflow { poId = po1.id, approverId = MANAGER, status = "APPROVED", approvalLevel = 1, amountThreshold = 50_000_000m, approvedAt = Utc(2026, 5, 26, 10, 0), notifiedAt = Utc(2026, 5, 26, 9, 0) },
                    new PoApprovalWorkflow { poId = po2.id, approverId = MANAGER, status = "PENDING", approvalLevel = 1, amountThreshold = 50_000_000m, notifiedAt = now.AddHours(-19) }
                );

                // ── Invoices ──
                var inv1 = new Invoice { invoiceCode = "INV-2026-001", vendorId = ven["V005"].id, poId = po1.id, ocrJobId = ocr1.id, status = "CONFIRMED", invoiceDate = Utc(2026, 6, 1), invoiceNumber = "0000125", subtotal = 8_500_000m, taxAmount = 850_000m, totalAmount = 9_350_000m, currency = "VND", paymentDueDate = Utc(2026, 7, 1), paidDate = Utc(2026, 6, 10), paymentStatus = "PAID", paymentMethod = "BANK_TRANSFER", confirmedBy = MANAGER, confirmedAt = Utc(2026, 6, 2) };
                var inv2 = new Invoice { invoiceCode = "INV-2026-002", vendorId = ven["V001"].id, status = "DRAFT", invoiceDate = Utc(2026, 5, 31), invoiceNumber = "0000088", subtotal = 20_000_000m, taxAmount = 2_000_000m, totalAmount = 22_000_000m, currency = "VND", paymentDueDate = Utc(2026, 6, 30), paymentStatus = "UNPAID", notes = "Phí bảo trì điều hòa quý 2" };
                context.Invoices.AddRange(inv1, inv2);

                await context.SaveChangesAsync();

                // ── Invoice items ──
                context.InvoiceItems.AddRange(
                    new InvoiceItem { invoiceId = inv1.id, materialId = mat["MAT-002"].id, description = "Aptomat MCB 32A 1P", quantity = 15, unitPrice = 120_000m, totalPrice = 1_800_000m, poItemId = poItem1.id },
                    new InvoiceItem { invoiceId = inv1.id, materialId = mat["MAT-005"].id, description = "Lọc gió điều hòa", quantity = 26, unitPrice = 250_000m, totalPrice = 6_500_000m, poItemId = poItem2.id },
                    new InvoiceItem { invoiceId = inv2.id, materialId = mat["MAT-004"].id, description = "Phí dịch vụ bảo trì điều hòa Q2", quantity = 1, unitPrice = 20_000_000m, totalPrice = 20_000_000m }
                );

                // ════════════════════════════════════════════════════════════
                // TẦNG H — System / Reporting
                // ════════════════════════════════════════════════════════════

                // ── KPI daily snapshots (14 ngày gần nhất) ──
                var today = Utc(now.Year, now.Month, now.Day);
                for (int i = 13; i >= 0; i--)
                {
                    var day = today.AddDays(-i);
                    var kpi = KpiJson(
                        mttr: 3.5 + (i % 4) * 0.4,
                        mtbf: 40 + (i % 5) * 2,
                        tNew: 3 + (i % 4),
                        tRes: 2 + (i % 4),
                        tOver: i % 3,
                        woComp: 1 + (i % 3),
                        woRate: 0.80 + (i % 5) * 0.03,
                        sla: 0.88 + (i % 4) * 0.03,
                        avail: 0.95 + (i % 3) * 0.015,
                        pmOver: i % 2,
                        cost: 1_500_000 + (i % 6) * 750_000);
                    context.KpiDailySnapshots.Add(new KpiDailySnapshot { snapshotDate = day, buildingId = BUILDING, kpiDataJson = kpi, createdAt = now });
                }

                // ── Cost tracking (12 bản ghi rải Jan–May 2026) ──
                void AddCost(string refType, Guid refId, Guid? assetId, Guid? catId, decimal amount, string costType, DateTime date, string desc)
                    => context.CostTrackings.Add(new CostTracking { referenceType = refType, referenceId = refId, assetId = assetId, categoryId = catId, buildingId = BUILDING, departmentId = DEPT_KT, amount = amount, currency = "VND", costType = costType, costDate = date, description = desc, recordedBy = MANAGER, recordedAt = date });
                AddCost("WORK_ORDER", woHvac.id, aHvac1.id, cat["HVAC"].id, 1_200_000m, "LABOR",    Utc(2026, 1, 10), "Nhân công bảo trì điều hòa VRV #1");
                AddCost("WORK_ORDER", woHvac.id, aHvac1.id, cat["HVAC"].id, 850_000m,   "MATERIAL", Utc(2026, 1, 12), "Vật tư lọc gió điều hòa");
                AddCost("TICKET",     tkInprog1.id, aElev2.id, cat["ELEV"].id, 2_500_000m, "SERVICE", Utc(2026, 2, 5),  "Thuê kỹ thuật xử lý thang máy #2");
                AddCost("WORK_ORDER", woMsb.id,  aMsb.id,  cat["ELEC"].id, 1_500_000m, "LABOR",    Utc(2026, 2, 18), "Nhân công kiểm tra tủ điện tổng");
                AddCost("PURCHASE_ORDER", po1.id, null,    cat["ELEC"].id, 8_500_000m, "MATERIAL", Utc(2026, 3, 3),  "Mua vật tư điện theo PO-2026-001");
                AddCost("INVOICE",    inv2.id,  aHvac1.id, cat["HVAC"].id, 12_000_000m,"SERVICE",  Utc(2026, 3, 20), "Phí hợp đồng bảo trì điều hòa");
                AddCost("WORK_ORDER", woFire.id, aFireP.id, cat["FIRE"].id, 900_000m,   "LABOR",    Utc(2026, 4, 8),  "Nhân công kiểm tra PCCC");
                AddCost("TICKET",     tkInprog2.id, aPump1.id, cat["PLUMB"].id, 1_800_000m, "MATERIAL", Utc(2026, 4, 15), "Vật tư sửa bơm cấp nước");
                AddCost("WORK_ORDER", woGen.id,  aGen.id,  cat["GEN"].id,  600_000m,   "OTHER",    Utc(2026, 5, 2),  "Nhiên liệu chạy thử máy phát");
                AddCost("PURCHASE_ORDER", po2.id, null,    cat["PLUMB"].id, 4_200_000m, "MATERIAL", Utc(2026, 5, 10), "Mua vật tư nước theo PO-2026-002");
                AddCost("WORK_ORDER", woCmElec.id, aMsb.id, cat["ELEC"].id, 1_100_000m, "LABOR",    Utc(2026, 5, 20), "Nhân công khắc phục mất điện tầng 3");
                AddCost("TICKET",     tkResolved2.id, aFireP.id, cat["FIRE"].id, 3_300_000m, "SERVICE", Utc(2026, 5, 28), "Dịch vụ vệ sinh & hiệu chỉnh đầu báo");

                await context.SaveChangesAsync();

                await tx.CommitAsync();
            });

            logger.LogInformation("[AssetSeeder] Seeding hoàn tất — đã tạo dữ liệu mẫu cho 6 sub-domain Asset.");
        }

        private static string KpiJson(double mttr, double mtbf, int tNew, int tRes, int tOver,
            int woComp, double woRate, double sla, double avail, int pmOver, long cost)
        {
            var map = new Dictionary<string, object>
            {
                ["mttr_hours"] = Math.Round(mttr, 2),
                ["mtbf_days"] = Math.Round(mtbf, 1),
                ["ticket_count_new"] = tNew,
                ["ticket_count_resolved"] = tRes,
                ["ticket_count_overdue"] = tOver,
                ["wo_count_completed"] = woComp,
                ["wo_completion_rate"] = Math.Round(woRate, 2),
                ["sla_compliance_rate"] = Math.Round(sla, 2),
                ["asset_availability_rate"] = Math.Round(avail, 3),
                ["pm_overdue_count"] = pmOver,
                ["total_maintenance_cost"] = cost
            };
            return JsonSerializer.Serialize(map);
        }
    }
}
