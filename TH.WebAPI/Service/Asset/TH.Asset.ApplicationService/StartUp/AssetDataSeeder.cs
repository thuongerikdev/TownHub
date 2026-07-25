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
    /// Phủ hết 6 sub-domain (Core / Maintenance / Incident / Inventory / Vendor /
    /// System) với số lượng "đủ dùng thật" (≈30–40 bản ghi cho các bảng chính) và
    /// bảo đảm TOÀN VẸN NGHIỆP VỤ:
    ///
    ///   • Vòng đời tài sản đúng kế toán:
    ///       – Mỗi tài sản khi ghi nhận → sinh 1 chứng từ GHI_TANG
    ///         (Nợ 211/213 · Có 111/112, totalAmount = nguyên giá).
    ///       – Khấu hao hàng kỳ → chứng từ KHAU_HAO (Nợ 642 · Có 2141/2143);
    ///         accumulatedTotal của log khớp accumulatedDepreciation của tài sản,
    ///         bookValue = nguyên giá − khấu hao luỹ kế.
    ///       – Tài sản thanh lý → bản ghi AssetDisposal + chứng từ THANH_LY
    ///         (Nợ 2141 hao mòn + Nợ 811 giá trị còn lại · Có 211 nguyên giá;
    ///          thu về Nợ 111/112 · Có 711); status tài sản = DISPOSED.
    ///
    ///   • Tồn kho luôn cân: quantityOnHand được TÍNH từ sổ nhập/xuất
    ///     (IN − OUT ± ADJUST) → không bao giờ lệch "tồn ≠ nhập − xuất", không âm.
    ///
    /// Nguyên tắc kỹ thuật:
    ///   • Idempotent — có dữ liệu AssetCategories thì bỏ qua.
    ///   • Atomic — chạy trong 1 transaction qua execution strategy.
    ///   • PK Guid store-generated → lưu theo tầng phụ thuộc rồi đọc id để nối FK.
    ///   • Mọi DateTime ghi cột timestamptz BẮT BUỘC Kind=Utc.
    ///   • Cột cross-service (buildingId, reportedBy, createdBy…) KHÔNG có FK →
    ///     dùng Guid cố định khớp convention FE.
    /// </summary>
    public static class AssetDataSeeder
    {
        // ── Guid cố định cross-service (khớp convention của FE) ──────────────
        private static readonly Guid BUILDING   = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly Guid ADMIN      = Guid.Parse("22222222-2222-2222-2222-222222222222");
        private static readonly Guid KTV1       = Guid.Parse("33333333-3333-3333-3333-333333333333");
        private static readonly Guid KTV2       = Guid.Parse("44444444-4444-4444-4444-444444444444");
        private static readonly Guid MANAGER    = Guid.Parse("55555555-5555-5555-5555-555555555555");
        private static readonly Guid RESIDENT   = Guid.Parse("66666666-6666-6666-6666-666666666666");
        private static readonly Guid DEPT_KT    = Guid.Parse("77777777-7777-7777-7777-777777777777");
        private static readonly Guid CHIEF      = Guid.Parse("88888888-8888-8888-8888-888888888888"); // Kỹ sư trưởng
        private static readonly Guid ACCOUNTANT = Guid.Parse("99999999-9999-9999-9999-999999999999"); // Kế toán
        private static readonly Guid KTV3       = Guid.Parse("aaaaaaaa-3333-3333-3333-333333333333");
        private static readonly Guid FLOOR_1    = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000001");
        private static readonly Guid FLOOR_2    = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000002");
        private static readonly Guid FLOOR_3    = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000003");
        private static readonly Guid UNIT_1     = Guid.Parse("b1b1b1b1-0000-0000-0000-000000000001");
        private static readonly Guid UNIT_2     = Guid.Parse("b1b1b1b1-0000-0000-0000-000000000002");

        // Auth userID (int) của nhân sự — dùng cho assignedToUserId / createdByUserId
        private const int UID_KTV1 = 5, UID_KTV2 = 6, UID_KTV3 = 7, UID_MANAGER = 2, UID_CHIEF = 3;
        private const string NAME_KTV1 = "Nguyễn Văn A", NAME_KTV2 = "Trần Văn B", NAME_KTV3 = "Lê Văn C",
                             NAME_MANAGER = "Trần Thị Quản Lý", NAME_CHIEF = "Lê Kỹ Sư Trưởng";

        // Mốc thời gian "hiện tại" của bộ seed (khớp niên độ dữ liệu 2026)
        private static readonly DateTime AS_OF = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);

        private static DateTime Utc(int y, int m, int d, int hh = 0, int mm = 0)
            => new DateTime(y, m, d, hh, mm, 0, DateTimeKind.Utc);

        // Số kỳ (tháng) tròn giữa 2 mốc, clamp [0, cap].
        private static int MonthsBetween(DateTime from, DateTime to, int cap)
        {
            if (to <= from) return 0;
            int months = (to.Year - from.Year) * 12 + (to.Month - from.Month);
            if (to.Day < from.Day) months--; // chưa đủ tháng
            return Math.Max(0, Math.Min(cap, months));
        }

        public static async Task SeedAllAsync(AssetDbContext context, ILogger logger)
        {
            if (await context.AssetCategories.AnyAsync())
            {
                logger.LogInformation("[AssetSeeder] Dữ liệu Asset đã tồn tại — bỏ qua seeding.");
                return;
            }

            logger.LogInformation("[AssetSeeder] Bắt đầu seed dữ liệu mẫu Asset (bản đầy đủ vòng đời)...");

            var strategy = context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                context.ChangeTracker.Clear();
                await using var tx = await context.Database.BeginTransactionAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG A — Bảng gốc (không phụ thuộc bảng Asset khác)
                // ════════════════════════════════════════════════════════════

                // ── Asset categories (8) ──
                var cat = new Dictionary<string, AssetCategory>();
                foreach (var (code, name) in new[]
                {
                    ("HVAC",  "Hệ thống điều hòa không khí"),
                    ("ELEC",  "Hệ thống điện"),
                    ("ELEV",  "Thang máy"),
                    ("FIRE",  "Phòng cháy chữa cháy"),
                    ("PLUMB", "Hệ thống cấp thoát nước"),
                    ("SEC",   "An ninh - giám sát"),
                    ("IT",    "Thiết bị CNTT - mạng"),
                    ("GEN",   "Thiết bị chung & khác"),
                })
                    cat[code] = new AssetCategory { code = code, name = name };
                context.AssetCategories.AddRange(cat.Values);

                // ── Asset locations (10) ──
                var locs = new List<AssetLocation>
                {
                    new() { buildingId = BUILDING, floorId = FLOOR_1, areaCode = "B1-TANG-HAM" },
                    new() { buildingId = BUILDING, floorId = FLOOR_1, areaCode = "T1-SANH-CHINH" },
                    new() { buildingId = BUILDING, floorId = FLOOR_2, areaCode = "T2-PHONG-KY-THUAT" },
                    new() { buildingId = BUILDING, floorId = FLOOR_3, areaCode = "T3-HANH-LANG" },
                    new() { buildingId = BUILDING, floorId = null,    areaCode = "MAI-SAN-THUONG" },
                    new() { buildingId = BUILDING, floorId = FLOOR_1, areaCode = "B1-PHONG-BOM" },
                    new() { buildingId = BUILDING, floorId = FLOOR_1, areaCode = "B1-PHONG-MAY-PHAT" },
                    new() { buildingId = BUILDING, floorId = FLOOR_2, areaCode = "T2-PHONG-SERVER" },
                    new() { buildingId = BUILDING, floorId = FLOOR_2, areaCode = "T2-SANH-THANG-MAY" },
                    new() { buildingId = BUILDING, floorId = FLOOR_3, areaCode = "T3-KHU-VUC-CHUNG" },
                };
                context.AssetLocations.AddRange(locs);

                // ── Vendors (5 gốc; dataset top-up thêm 10 ở SeedDatasetCatalogAsync) ──
                var ven = new Dictionary<string, VendorEntity>();
                void AddVendor(string code, string name, string tax, string contact, string email, string phone)
                    => ven[code] = new VendorEntity
                    {
                        vendorCode = code, name = name, taxId = tax, status = "ACTIVE",
                        contactName = contact, contactEmail = email, contactPhone = phone,
                        address = "TP. Hồ Chí Minh"
                    };
                AddVendor("V001", "Công ty TNHH Cơ Điện Lạnh Bách Khoa", "0301234567", "Nguyễn Văn An", "an.nguyen@bachkhoamep.vn", "0901234567");
                AddVendor("V002", "Công ty CP Thang Máy Thái Bình",       "0302345678", "Trần Thị Bình",  "binh.tran@thaibinhlift.vn", "0902345678");
                AddVendor("V003", "Công ty TNHH Điện Quang Phát",         "0303456789", "Lê Văn Cường",   "cuong.le@quangphat.vn",     "0903456789");
                AddVendor("V004", "Công ty CP PCCC An Toàn Việt",         "0304567890", "Phạm Thị Dung",  "dung.pham@pcccatv.vn",      "0904567890");
                AddVendor("V005", "Công ty TNHH Vật Tư Kỹ Thuật Hòa Phát","0305678901", "Hoàng Văn Em",   "em.hoang@vattuhoaphat.vn",  "0905678901");
                context.Vendors.AddRange(ven.Values);

                // ── SLA configs (4) ──
                var slaCrit = new SlaConfig { name = "SLA Khẩn cấp",   buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "CRITICAL", responseTimeHours = 1,  resolutionTimeHours = 4,  escalationL1AfterHours = 1,  escalationL2AfterHours = 2,  escalationL3AfterHours = 3,  businessHoursOnly = false, isActive = true };
                var slaHigh = new SlaConfig { name = "SLA Ưu tiên cao", buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "HIGH",     responseTimeHours = 2,  resolutionTimeHours = 8,  escalationL1AfterHours = 4,  escalationL2AfterHours = 8,                               businessHoursOnly = false, isActive = true };
                var slaStd  = new SlaConfig { name = "SLA Tiêu chuẩn",  buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "MEDIUM",   responseTimeHours = 4,  resolutionTimeHours = 24, escalationL1AfterHours = 12,                                           businessHoursOnly = true,  isActive = true };
                var slaLow  = new SlaConfig { name = "SLA Thấp",        buildingId = BUILDING, issueCategory = "ALL", priorityLevel = "LOW",      responseTimeHours = 8,  resolutionTimeHours = 72, escalationL1AfterHours = 48,                                           businessHoursOnly = true,  isActive = true };
                context.SlaConfigs.AddRange(slaCrit, slaHigh, slaStd, slaLow);

                // ── Warehouses (3) ──
                var wh1 = new Warehouse { code = "WH-01", name = "Kho vật tư kỹ thuật chính", buildingId = BUILDING, managerId = MANAGER, ktvOwnerId = KTV1 };
                var wh2 = new Warehouse { code = "WH-02", name = "Kho vật tư phụ tầng hầm",   buildingId = BUILDING, managerId = MANAGER, ktvOwnerId = KTV2 };
                var wh3 = new Warehouse { code = "WH-03", name = "Kho thiết bị dự phòng",     buildingId = BUILDING, managerId = MANAGER, ktvOwnerId = KTV3 };
                context.Warehouses.AddRange(wh1, wh2, wh3);

                // ── Material categories (4 gốc; dataset top-up thêm) ──
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

                // ── OCR jobs (4) ──
                var ocr1 = new OcrJob { documentType = "INVOICE", status = "COMPLETED", ocrEngine = "paddleocr", fileName = "hoa-don-hoaphat-0325.pdf", fileSizeBytes = 245_000, confidenceScore = 0.96m, rawExtractedText = "HÓA ĐƠN GTGT - Hòa Phát - Tổng: 9.350.000đ", startedAt = Utc(2026, 3, 20, 9, 10), completedAt = Utc(2026, 3, 20, 9, 11), submittedBy = ACCOUNTANT, submittedByName = "Kế toán", reviewedBy = MANAGER, reviewedByName = "Quản lý tòa nhà", submittedAt = Utc(2026, 3, 20, 9, 9) };
                var ocr2 = new OcrJob { documentType = "INVOICE", status = "COMPLETED", ocrEngine = "vietocr",   fileName = "hoa-don-dienquang-0526.pdf", fileSizeBytes = 198_000, confidenceScore = 0.91m, rawExtractedText = "HÓA ĐƠN GTGT - Điện Quang Phát - Tổng: 22.000.000đ", startedAt = Utc(2026, 5, 26, 14, 2), completedAt = Utc(2026, 5, 26, 14, 3), submittedBy = ACCOUNTANT, submittedByName = "Kế toán", submittedAt = Utc(2026, 5, 26, 14, 0) };
                var ocr3 = new OcrJob { documentType = "INVOICE", status = "PROCESSING", ocrEngine = "paddleocr", fileName = "hoa-don-thaibinh-0626.pdf", fileSizeBytes = 210_000, submittedBy = ACCOUNTANT, submittedByName = "Kế toán", submittedAt = AS_OF.AddDays(-2) };
                var ocr4 = new OcrJob { documentType = "INVOICE", status = "FAILED", ocrEngine = "paddleocr", fileName = "hoa-don-mo.jpg", fileSizeBytes = 90_000, errorMessage = "Ảnh mờ, không nhận dạng được vùng tổng tiền.", startedAt = AS_OF.AddDays(-1), completedAt = AS_OF.AddDays(-1).AddMinutes(1), submittedBy = ACCOUNTANT, submittedByName = "Kế toán", submittedAt = AS_OF.AddDays(-1) };
                context.OcrJobs.AddRange(ocr1, ocr2, ocr3, ocr4);

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG B — Checklist templates, materials, vendor contracts
                // ════════════════════════════════════════════════════════════

                // ── Checklist templates (6, mỗi category chính 1 mẫu) ──
                var tpl = new Dictionary<string, ChecklistTemplate>
                {
                    ["CL-HVAC"]  = new ChecklistTemplate { code = "CL-HVAC",  name = "Bảo trì định kỳ điều hòa",   categoryId = cat["HVAC"].id },
                    ["CL-ELEV"]  = new ChecklistTemplate { code = "CL-ELEV",  name = "Kiểm tra an toàn thang máy", categoryId = cat["ELEV"].id },
                    ["CL-ELEC"]  = new ChecklistTemplate { code = "CL-ELEC",  name = "Kiểm tra hệ thống điện",     categoryId = cat["ELEC"].id },
                    ["CL-FIRE"]  = new ChecklistTemplate { code = "CL-FIRE",  name = "Kiểm tra hệ thống PCCC",     categoryId = cat["FIRE"].id },
                    ["CL-PLUMB"] = new ChecklistTemplate { code = "CL-PLUMB", name = "Bảo trì bơm & cấp thoát nước", categoryId = cat["PLUMB"].id },
                    ["CL-GEN"]   = new ChecklistTemplate { code = "CL-GEN",   name = "Kiểm tra thiết bị chung",    categoryId = cat["GEN"].id },
                };
                context.ChecklistTemplates.AddRange(tpl.Values);

                // ── Materials (12 gốc) ──
                var mat = new Dictionary<string, Material>();
                void AddMat(string code, string name, string mc, string uom, decimal min, decimal max, decimal reorder, decimal price)
                    => mat[code] = new Material
                    {
                        materialCode = code, name = name, categoryId = mcat[mc].id, preferredVendorId = ven["V005"].id,
                        unitOfMeasure = uom, minStock = min, maxStock = max, reorderPoint = reorder, reorderQuantity = reorder,
                        unitPrice = price, isActive = true
                    };
                AddMat("MAT-001", "Bóng đèn LED downlight 12W", "MC-ELEC",   "Cái",  20, 200,  50,  85_000);
                AddMat("MAT-002", "Aptomat MCB 32A 1P",         "MC-ELEC",   "Cái",  10, 50,   15,  120_000);
                AddMat("MAT-003", "Dây điện Cadivi 2.5mm²",     "MC-ELEC",   "Mét",  100,1000, 200, 12_000);
                AddMat("MAT-004", "Gas lạnh R410A",             "MC-HVAC",   "Bình", 5,  30,   10,  1_500_000);
                AddMat("MAT-005", "Lọc gió điều hòa",           "MC-HVAC",   "Cái",  15, 80,   30,  250_000);
                AddMat("MAT-006", "Ống đồng 1/2 inch",          "MC-HVAC",   "Mét",  50, 300,  100, 95_000);
                AddMat("MAT-007", "Van khóa nước phi 21",       "MC-PLUMB",  "Cái",  10, 60,   20,  65_000);
                AddMat("MAT-008", "Ống PVC D60",                "MC-PLUMB",  "Mét",  30, 200,  60,  45_000);
                AddMat("MAT-009", "Găng tay cách điện",         "MC-CONSUM", "Đôi",  10, 50,   20,  180_000);
                AddMat("MAT-010", "Giẻ lau công nghiệp",        "MC-CONSUM", "Kg",   20, 100,  40,  35_000);
                AddMat("MAT-CB1", "Vòng bi bơm nước 6204",      "MC-PLUMB",  "Cái",  8,  40,   12,  110_000);
                AddMat("MAT-CB2", "Phốt cơ khí bơm",            "MC-PLUMB",  "Cái",  6,  30,   10,  220_000);
                context.Materials.AddRange(mat.Values);

                // ── Vendor contracts (5) ──
                var vc1 = new VendorContract { contractCode = "HD-2026-001", vendorId = ven["V001"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 240_000_000m, paymentTerms = "Thanh toán theo quý", status = "ACTIVE",  scopeOfWork = "Bảo trì định kỳ hệ thống điều hòa trung tâm", signedByVendor = "Nguyễn Văn An", signedByBuilding = "Ban Quản lý" };
                var vc2 = new VendorContract { contractCode = "HD-2026-002", vendorId = ven["V002"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 180_000_000m, paymentTerms = "Thanh toán theo quý", status = "ACTIVE",  scopeOfWork = "Bảo trì & kiểm định an toàn thang máy", signedByVendor = "Trần Thị Bình", signedByBuilding = "Ban Quản lý" };
                var vc3 = new VendorContract { contractCode = "HD-2026-003", vendorId = ven["V004"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 120_000_000m, paymentTerms = "Thanh toán 2 đợt",   status = "ACTIVE",  scopeOfWork = "Bảo trì hệ thống PCCC, kiểm tra bình chữa cháy", signedByVendor = "Phạm Thị Dung", signedByBuilding = "Ban Quản lý" };
                var vc4 = new VendorContract { contractCode = "HD-2025-014", vendorId = ven["V003"].id, buildingId = BUILDING, startDate = Utc(2025, 1, 1), endDate = Utc(2025, 12, 31), contractValue = 95_000_000m,  paymentTerms = "Thanh toán theo đợt", status = "EXPIRED", scopeOfWork = "Bảo trì hệ thống điện năm 2025", signedByVendor = "Lê Văn Cường", signedByBuilding = "Ban Quản lý" };
                var vc5 = new VendorContract { contractCode = "HD-2026-004", vendorId = ven["V005"].id, buildingId = BUILDING, startDate = Utc(2026, 1, 1), endDate = Utc(2026, 12, 31), contractValue = 60_000_000m,  paymentTerms = "Theo đơn hàng",     status = "ACTIVE",  scopeOfWork = "Cung ứng vật tư kỹ thuật thường xuyên", signedByVendor = "Hoàng Văn Em", signedByBuilding = "Ban Quản lý" };
                context.VendorContracts.AddRange(vc1, vc2, vc3, vc4, vc5);

                await context.SaveChangesAsync();

                var vcByCode = new Dictionary<string, VendorContract>
                { ["V001"] = vc1, ["V002"] = vc2, ["V004"] = vc3, ["V003"] = vc4, ["V005"] = vc5 };

                // ── Checklist template items ──
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
                AddItems("CL-HVAC", ("Vệ sinh lưới lọc gió", "BOOLEAN", "OK"), ("Đo áp suất gas (bar)", "NUMBER", "8-10"), ("Kiểm tra dòng điện máy nén (A)", "NUMBER", "< 15"), ("Kiểm tra rò rỉ gas", "BOOLEAN", "OK"));
                AddItems("CL-ELEV", ("Kiểm tra phanh an toàn", "BOOLEAN", "OK"), ("Kiểm tra cáp tải", "BOOLEAN", "OK"), ("Thử nút gọi khẩn cấp", "BOOLEAN", "OK"), ("Bôi trơn ray dẫn hướng", "BOOLEAN", "OK"));
                AddItems("CL-ELEC", ("Đo điện trở tiếp địa (Ω)", "NUMBER", "< 4"), ("Siết lại đầu cốt", "BOOLEAN", "OK"), ("Kiểm tra nhiệt độ thanh cái", "NUMBER", "< 60"));
                AddItems("CL-FIRE", ("Kiểm tra đầu báo khói", "BOOLEAN", "OK"), ("Thử chuông báo cháy", "BOOLEAN", "OK"), ("Kiểm tra áp lực bình chữa cháy", "NUMBER", "OK"));
                AddItems("CL-PLUMB", ("Kiểm tra áp lực bơm (bar)", "NUMBER", "3-5"), ("Kiểm tra rò rỉ đường ống", "BOOLEAN", "OK"), ("Kiểm tra phao/relay mực nước", "BOOLEAN", "OK"));
                AddItems("CL-GEN", ("Kiểm tra ngoại quan", "BOOLEAN", "OK"), ("Vệ sinh thiết bị", "BOOLEAN", "OK"), ("Kiểm tra kết nối nguồn", "BOOLEAN", "OK"));

                // ── Vendor contract services ──
                context.VendorContractServices.AddRange(
                    new VendorContractService { contractId = vc1.id, serviceName = "Bảo trì định kỳ hàng tháng" },
                    new VendorContractService { contractId = vc1.id, serviceName = "Sửa chữa khẩn cấp 24/7" },
                    new VendorContractService { contractId = vc2.id, serviceName = "Bảo trì định kỳ hàng tháng" },
                    new VendorContractService { contractId = vc2.id, serviceName = "Kiểm định an toàn định kỳ" },
                    new VendorContractService { contractId = vc3.id, serviceName = "Bảo trì hệ thống báo cháy" },
                    new VendorContractService { contractId = vc3.id, serviceName = "Nạp & kiểm tra bình chữa cháy" },
                    new VendorContractService { contractId = vc5.id, serviceName = "Cung ứng vật tư điện - nước" }
                );

                // ── Vendor evaluations ──
                context.VendorEvaluations.AddRange(
                    new VendorEvaluation { vendorId = ven["V001"].id, contractId = vc1.id, evaluatorId = MANAGER, evaluationDate = Utc(2026, 4, 1),  overallScore = 5, qualityScore = 5, timelinessScore = 4, costScore = 4, safetyScore = 5, recommendation = "RENEW",  comments = "Dịch vụ tốt, phản hồi nhanh." },
                    new VendorEvaluation { vendorId = ven["V002"].id, contractId = vc2.id, evaluatorId = MANAGER, evaluationDate = Utc(2026, 4, 1),  overallScore = 4, qualityScore = 4, timelinessScore = 4, costScore = 3, safetyScore = 5, recommendation = "RENEW",  comments = "Đảm bảo an toàn, chi phí hơi cao." },
                    new VendorEvaluation { vendorId = ven["V004"].id, contractId = vc3.id, evaluatorId = MANAGER, evaluationDate = Utc(2026, 4, 1),  overallScore = 4, qualityScore = 4, timelinessScore = 5, costScore = 4, safetyScore = 5, recommendation = "RENEW",  comments = "Tuân thủ quy định PCCC tốt." },
                    new VendorEvaluation { vendorId = ven["V003"].id, contractId = vc4.id, evaluatorId = MANAGER, evaluationDate = Utc(2025, 12, 20), overallScore = 3, qualityScore = 3, timelinessScore = 2, costScore = 4, safetyScore = 3, recommendation = "REVIEW", comments = "Tiến độ chậm, cân nhắc khi gia hạn." }
                );

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // SỔ TỒN KHO CHẠY (ledger) — TÍNH tồn từ nhập/xuất
                // Guard: mọi giao dịch được ghi qua Txn() → cập nhật ledger →
                //        cuối cùng sinh InventoryLevel = tồn thực tế (≥0).
                // ════════════════════════════════════════════════════════════
                var invLedger = new Dictionary<(Guid wh, Guid mat), decimal>();
                int txnSeq = 1;
                InventoryTransaction Txn(string type, Warehouse w, string matCode, decimal qty,
                    string? refType, Guid? refId, DateTime at, Guid by, string note)
                {
                    var m = mat[matCode];
                    var unit = m.unitPrice ?? 0m;
                    // qty luôn dương; dấu áp theo loại giao dịch
                    var signed = type == "OUT" ? -qty : qty; // IN / ADJUST(+) / TRANSFER-in dương; OUT âm
                    var key = (w.id, m.id);
                    var current = invLedger.GetValueOrDefault(key);
                    if (type == "OUT" && current < qty)
                        throw new InvalidOperationException($"[Seed] Xuất kho vượt tồn: {matCode}@{w.code} tồn {current} < xuất {qty}");
                    invLedger[key] = current + signed;
                    var t = new InventoryTransaction
                    {
                        txnCode = $"TXN-2026-{txnSeq++:0000}", warehouseId = w.id, materialId = m.id,
                        txnType = type, referenceType = refType, referenceId = refId,
                        quantity = qty, unitCost = unit, totalCost = unit * qty,
                        performedBy = by, performedAt = at, notes = note
                    };
                    context.InventoryTransactions.Add(t);
                    return t;
                }

                // ── Nhập kho đầu kỳ (IN) — số lượng đủ lớn để phục vụ mọi lần xuất ──
                var initialStock = new (Warehouse w, string code, decimal qty)[]
                {
                    (wh1,"MAT-001",200),(wh1,"MAT-002",60),(wh1,"MAT-003",800),(wh1,"MAT-004",25),
                    (wh1,"MAT-005",70),(wh1,"MAT-006",250),(wh1,"MAT-007",50),(wh1,"MAT-008",180),
                    (wh1,"MAT-009",40),(wh1,"MAT-010",90),(wh1,"MAT-CB1",30),(wh1,"MAT-CB2",24),
                    (wh2,"MAT-001",80),(wh2,"MAT-003",200),(wh2,"MAT-009",20),(wh2,"MAT-010",40),
                    (wh2,"MAT-007",25),(wh3,"MAT-004",10),(wh3,"MAT-005",30),(wh3,"MAT-006",100),
                };
                foreach (var (w, code, qty) in initialStock)
                    Txn("IN", w, code, qty, "INITIAL", null, Utc(2026, 1, 5, 8, 0), KTV1, "Nhập kho đầu kỳ");

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG C — TÀI SẢN + CHỨNG TỪ GHI TĂNG (mỗi tài sản 1 chứng từ)
                // ════════════════════════════════════════════════════════════

                // Bộ sinh chứng từ kế toán dùng chung
                int docSeq = 1;
                AssetDocument NewDoc(string type, string prefix, DateTime date, string desc, decimal total, Guid by)
                {
                    var d = new AssetDocument
                    {
                        documentCode = $"{prefix}-2026-{docSeq++:000}", documentType = type,
                        documentDate = date, description = desc, totalAmount = total,
                        status = AssetDocumentStatus.Posted, createdBy = by, createdAt = date
                    };
                    context.AssetDocuments.Add(d);
                    return d;
                }
                void Line(AssetDocument d, string? debit, string? credit, decimal amount, Guid? assetId, string desc)
                    => context.AssetDocumentLines.Add(new AssetDocumentLine { document = d, debitAccount = debit, creditAccount = credit, amount = amount, assetId = assetId, description = desc });

                // Spec tài sản: (code,name,catCode,locIdx,vendorCode,serial,crit,cost,purchase(y,m,d),
                //                warrantyMonths, lifeMonths, status, acct(211/213), pay(111/112))
                var A = new List<(string code, string name, string catc, int loc, string ven, string serial,
                    string crit, decimal cost, DateTime purchase, int warr, int life, string status, string acct, string pay)>
                {
                    ("AS-HVAC-001","Điều hòa trung tâm Daikin VRV #1","HVAC",2,"V001","DKVRV-2024-0001","CRITICAL",450_000_000m,Utc(2024,3,15),36,120,"ACTIVE","211","112"),
                    ("AS-HVAC-002","Điều hòa trung tâm Daikin VRV #2","HVAC",2,"V001","DKVRV-2024-0002","CRITICAL",450_000_000m,Utc(2024,3,15),36,120,"ACTIVE","211","112"),
                    ("AS-HVAC-003","Quạt thông gió tầng hầm #1","HVAC",5,"V001","FAN-2024-001","MEDIUM",35_000_000m,Utc(2024,2,1),24,96,"ACTIVE","211","111"),
                    ("AS-HVAC-004","Quạt thông gió tầng hầm #2","HVAC",5,"V001","FAN-2024-002","MEDIUM",35_000_000m,Utc(2024,2,1),24,96,"MAINTENANCE","211","111"),
                    ("AS-HVAC-005","Dàn nóng điều hòa mái","HVAC",4,"V001","COND-2024-005","HIGH",120_000_000m,Utc(2024,4,10),36,120,"ACTIVE","211","112"),
                    ("AS-ELEV-001","Thang máy Mitsubishi NEXIEZ #1","ELEV",8,"V002","MIT-NX-2023-A1","CRITICAL",1_200_000_000m,Utc(2023,6,1),60,240,"ACTIVE","211","112"),
                    ("AS-ELEV-002","Thang máy Mitsubishi NEXIEZ #2","ELEV",3,"V002","MIT-NX-2023-A2","CRITICAL",1_200_000_000m,Utc(2023,6,1),60,240,"MAINTENANCE","211","112"),
                    ("AS-ELEV-003","Thang máy hàng Fuji #3","ELEV",8,"V002","FUJI-2023-A3","HIGH",850_000_000m,Utc(2023,6,1),60,240,"ACTIVE","211","112"),
                    ("AS-ELEC-001","Tủ điện tổng MSB","ELEC",1,"V003","MSB-2023-001","CRITICAL",320_000_000m,Utc(2023,5,10),36,180,"ACTIVE","211","112"),
                    ("AS-ELEC-002","Tủ điện phân phối tầng 2","ELEC",3,"V003","DB-2023-002","HIGH",85_000_000m,Utc(2023,5,10),36,180,"ACTIVE","211","111"),
                    ("AS-ELEC-003","Tủ điện phân phối tầng 3","ELEC",4,"V003","DB-2023-003","HIGH",85_000_000m,Utc(2023,5,10),36,180,"ACTIVE","211","111"),
                    ("AS-ELEC-004","Hệ thống tụ bù công suất","ELEC",1,"V003","CAP-2023-004","MEDIUM",60_000_000m,Utc(2023,5,10),24,120,"ACTIVE","211","111"),
                    ("AS-GEN-001","Máy phát điện dự phòng 500kVA","GEN",6,"V003","GEN-500-2023","HIGH",850_000_000m,Utc(2023,5,10),36,180,"ACTIVE","211","112"),
                    ("AS-GEN-002","Máy phát điện dự phòng 250kVA","GEN",6,"V003","GEN-250-2023","MEDIUM",480_000_000m,Utc(2023,5,10),36,180,"ACTIVE","211","112"),
                    ("AS-PLUMB-001","Bơm cấp nước sinh hoạt #1","PLUMB",6,"V005","PUMP-PEN-001","HIGH",45_000_000m,Utc(2024,1,20),24,96,"ACTIVE","211","111"),
                    ("AS-PLUMB-002","Bơm cấp nước sinh hoạt #2","PLUMB",6,"V005","PUMP-PEN-002","HIGH",45_000_000m,Utc(2024,1,20),24,96,"ACTIVE","211","111"),
                    ("AS-PLUMB-003","Bơm tăng áp tầng cao","PLUMB",6,"V005","PUMP-BST-003","MEDIUM",38_000_000m,Utc(2024,1,20),24,96,"ACTIVE","211","111"),
                    ("AS-PLUMB-004","Bơm nước thải tầng hầm","PLUMB",1,"V005","PUMP-WW-004","MEDIUM",28_000_000m,Utc(2024,1,20),24,96,"MAINTENANCE","211","111"),
                    ("AS-FIRE-001","Tủ trung tâm báo cháy","FIRE",2,"V004","FACP-2023-001","CRITICAL",180_000_000m,Utc(2023,8,1),36,120,"ACTIVE","211","112"),
                    ("AS-FIRE-002","Máy bơm chữa cháy diesel","FIRE",1,"V004","FP-2023-001","HIGH",220_000_000m,Utc(2023,8,1),36,120,"ACTIVE","211","112"),
                    ("AS-FIRE-003","Máy bơm chữa cháy điện","FIRE",1,"V004","FP-2023-002","HIGH",150_000_000m,Utc(2023,8,1),36,120,"ACTIVE","211","112"),
                    ("AS-FIRE-004","Bình chữa cháy CO2 (cụm)","FIRE",9,"V004","EXT-2023-004","LOW",12_000_000m,Utc(2023,8,1),24,60,"ACTIVE","211","111"),
                    ("AS-SEC-001","Đầu ghi hình NVR 32 kênh","SEC",7,"V003","NVR-2024-001","MEDIUM",42_000_000m,Utc(2024,5,1),24,60,"ACTIVE","211","111"),
                    ("AS-SEC-002","Camera giám sát sảnh chính","SEC",2,"V003","CAM-2024-012","LOW",8_000_000m,Utc(2024,5,1),24,60,"ACTIVE","211","111"),
                    ("AS-SEC-003","Camera giám sát hầm xe","SEC",1,"V003","CAM-2024-013","LOW",8_000_000m,Utc(2024,5,1),24,60,"ACTIVE","211","111"),
                    ("AS-SEC-004","Hệ thống kiểm soát ra vào","SEC",2,"V003","ACS-2024-004","MEDIUM",65_000_000m,Utc(2024,5,1),24,96,"ACTIVE","211","112"),
                    ("AS-IT-001","Máy chủ quản lý tòa nhà","IT",7,"V003","SRV-2024-001","HIGH",95_000_000m,Utc(2024,6,1),36,60,"ACTIVE","211","112"),
                    ("AS-IT-002","Switch mạng lõi 48 cổng","IT",7,"V003","SW-2024-002","MEDIUM",28_000_000m,Utc(2024,6,1),36,60,"ACTIVE","211","111"),
                    ("AS-IT-003","Bộ lưu điện UPS 10kVA","IT",7,"V003","UPS-2024-003","HIGH",55_000_000m,Utc(2024,6,1),24,96,"ACTIVE","211","112"),
                    ("AS-GEN-003","Xe điện vệ sinh sảnh","GEN",9,"V005","EV-2024-003","LOW",22_000_000m,Utc(2024,7,1),24,60,"ACTIVE","211","111"),
                };

                // Danh sách tài sản THANH LÝ (đã hết vòng đời) — sinh disposal + THANH_LY
                //  (code,name,catc,loc,ven,serial,crit,cost,purchase,warr,life, disposeDate, disposalValue, type, reason)
                var D = new List<(string code, string name, string catc, int loc, string ven, string serial,
                    string crit, decimal cost, DateTime purchase, int warr, int life, string acct, string pay,
                    DateTime dispose, decimal disposalValue, string dtype, string reason)>
                {
                    ("AS-HVAC-OLD1","Điều hòa cục bộ cũ sảnh (thanh lý)","HVAC",2,"V001","AC-OLD-001","LOW",18_000_000m,Utc(2019,3,1),24,72,"211","111",Utc(2026,2,15),1_500_000m,"SALE","Hết khấu hao, hỏng block, thay bằng VRV"),
                    ("AS-SEC-OLD1","Camera analog cũ (thanh lý)","SEC",2,"V003","CAM-OLD-001","LOW",6_000_000m,Utc(2019,5,1),12,60,"211","111",Utc(2026,2,20),300_000m,"SCRAP","Lỗi thời, độ phân giải thấp"),
                    ("AS-IT-OLD1","Máy chủ đời cũ (thanh lý)","IT",7,"V003","SRV-OLD-001","LOW",45_000_000m,Utc(2018,6,1),36,60,"211","112",Utc(2026,3,10),3_000_000m,"SALE","Nâng cấp máy chủ mới"),
                    ("AS-PLUMB-OLD1","Bơm nước cũ (thanh lý)","PLUMB",6,"V005","PUMP-OLD-001","LOW",20_000_000m,Utc(2018,1,1),24,72,"211","111",Utc(2026,3,20),800_000m,"SCRAP","Cháy cuộn dây, không sửa được"),
                    ("AS-GEN-OLD1","Máy hút bụi công nghiệp cũ","GEN",9,"V005","VAC-OLD-001","LOW",9_000_000m,Utc(2020,7,1),12,48,"211","111",Utc(2026,4,5),200_000m,"DONATION","Tặng lại đơn vị vệ sinh"),
                    ("AS-FIRE-OLD1","Tủ báo cháy cũ khu phụ","FIRE",9,"V004","FACP-OLD-001","LOW",30_000_000m,Utc(2018,8,1),24,84,"211","112",Utc(2026,4,25),1_000_000m,"SALE","Thay tủ mới đồng bộ"),
                };

                // Hằng số tài khoản
                string HaoMon(string acct) => acct == AssetAccount.TscdVoHinh ? AssetAccount.HaoMonVoHinh : AssetAccount.HaoMonHuuHinh;
                const string ThuNhapKhac = "711"; // thu nhập khác khi thanh lý

                var assets = new List<AssetEntity>();
                var deprLogs = new List<AssetDepreciationLog>();

                // Tạo tài sản đang hoạt động + chứng từ ghi tăng + khấu hao luỹ kế
                foreach (var s in A)
                {
                    var salvage = Math.Round(s.cost * 0.10m, 0);       // giá trị thu hồi ước tính = 10%
                    var install = s.purchase.AddDays(15);
                    var monthly = Math.Round((s.cost - salvage) / s.life, 0);
                    int elapsed = MonthsBetween(install, AS_OF, s.life);
                    var accum = monthly * elapsed;
                    var book = s.cost - accum;

                    var a = new AssetEntity
                    {
                        assetCode = s.code, name = s.name, categoryId = cat[s.catc].id, locationId = locs[s.loc].id,
                        buildingId = BUILDING, floorId = locs[s.loc].floorId,
                        vendorId = ven[s.ven].id, vendorContractId = vcByCode.TryGetValue(s.ven, out var vcc) ? vcc.id : (Guid?)null,
                        status = s.status, serialNumber = s.serial, criticalityLevel = s.crit,
                        purchasePrice = s.cost, purchaseDate = s.purchase,
                        warrantyExpiryDate = s.purchase.AddMonths(s.warr), usefulLifeMonths = s.life,
                        salvageValue = salvage, depreciationMethod = "STRAIGHT_LINE",
                        accountCode = s.acct, paymentMethod = s.pay,
                        accumulatedDepreciation = accum, bookValue = book,
                        installationDate = install, lastMaintenanceDate = AS_OF.AddMonths(-1),
                        nextMaintenanceDate = AS_OF.AddMonths(1)
                    };
                    assets.Add(a);
                }
                context.Assets.AddRange(assets);
                await context.SaveChangesAsync(); // để có asset.id

                // Chứng từ GHI TĂNG cho từng tài sản hoạt động (1 chứng từ / tài sản)
                for (int i = 0; i < A.Count; i++)
                {
                    var s = A[i]; var a = assets[i];
                    var doc = NewDoc(AssetDocumentType.GhiTang, "CT-GT", s.purchase,
                        $"Ghi tăng TSCĐ: {s.name}", s.cost, ACCOUNTANT);
                    Line(doc, s.acct, s.pay, s.cost, a.id,
                        $"Nợ {s.acct} nguyên giá / Có {s.pay} thanh toán mua {s.code}");
                }

                await context.SaveChangesAsync(); // GHI_TANG docs + lines

                // Khấu hao 3 kỳ gần nhất (T4,T5,T6/2026) + chứng từ KHAU_HAO cho tài sản đủ tuổi
                foreach (var (a, s) in assets.Zip(A))
                {
                    var salvage = Math.Round(s.cost * 0.10m, 0);
                    var install = s.purchase.AddDays(15);
                    var monthly = Math.Round((s.cost - salvage) / s.life, 0);
                    foreach (var (yy, mm) in new[] { (2026, 4), (2026, 5), (2026, 6) })
                    {
                        var endOfMonth = new DateTime(yy, mm, DateTime.DaysInMonth(yy, mm), 0, 0, 0, DateTimeKind.Utc);
                        var endOfPrev = endOfMonth.AddDays(-DateTime.DaysInMonth(yy, mm));
                        int nAfter = MonthsBetween(install, endOfMonth, s.life);
                        int nBefore = MonthsBetween(install, endOfPrev, s.life);
                        var amount = monthly * (nAfter - nBefore);
                        if (amount <= 0) continue; // chưa vận hành / đã hết khấu hao trong kỳ
                        var accBefore = monthly * nBefore;
                        var accAfter = monthly * nAfter;
                        var bookBefore = s.cost - accBefore;

                        var doc = NewDoc(AssetDocumentType.KhauHao, "CT-KH", endOfMonth,
                            $"Trích khấu hao {mm:00}/{yy}: {s.name}", amount, ACCOUNTANT);
                        Line(doc, AssetAccount.CpQuanLy, HaoMon(s.acct), amount, a.id,
                            $"Nợ 642 chi phí / Có {HaoMon(s.acct)} hao mòn {s.code} kỳ {mm:00}/{yy}");

                        deprLogs.Add(new AssetDepreciationLog
                        {
                            assetId = a.id, periodYear = yy, periodMonth = mm, depreciationAmount = amount,
                            bookValueBefore = bookBefore, bookValueAfter = bookBefore - amount,
                            accumulatedTotal = accAfter, calculatedAt = endOfMonth, calculatedBy = ACCOUNTANT,
                            documentId = doc.id
                        });
                    }
                }

                await context.SaveChangesAsync(); // KHAU_HAO docs + lines (docId cho log)
                context.AssetDepreciationLogs.AddRange(deprLogs);
                await context.SaveChangesAsync();

                // ── Tài sản THANH LÝ: tạo asset (DISPOSED) + GHI_TANG lịch sử +
                //    AssetDisposal + chứng từ THANH_LY (định khoản đầy đủ) ──
                var disposedAssets = new List<AssetEntity>();
                foreach (var s in D)
                {
                    var salvage = Math.Round(s.cost * 0.10m, 0);
                    var install = s.purchase.AddDays(15);
                    var monthly = Math.Round((s.cost - salvage) / s.life, 0);
                    // Khấu hao luỹ kế tính đến NGÀY THANH LÝ (không vượt nguyên giá − salvage → residual ≥ salvage)
                    int elapsed = MonthsBetween(install, s.dispose, s.life);
                    var accum = Math.Min(monthly * elapsed, s.cost - salvage);
                    var book = s.cost - accum; // giá trị còn lại tại thời điểm thanh lý

                    var a = new AssetEntity
                    {
                        assetCode = s.code, name = s.name, categoryId = cat[s.catc].id, locationId = locs[s.loc].id,
                        buildingId = BUILDING, floorId = locs[s.loc].floorId, vendorId = ven[s.ven].id,
                        status = "DISPOSED", serialNumber = s.serial, criticalityLevel = s.crit,
                        purchasePrice = s.cost, purchaseDate = s.purchase,
                        warrantyExpiryDate = s.purchase.AddMonths(s.warr), usefulLifeMonths = s.life,
                        salvageValue = salvage, depreciationMethod = "STRAIGHT_LINE",
                        accountCode = s.acct, paymentMethod = s.pay,
                        accumulatedDepreciation = accum, bookValue = book,
                        installationDate = install, notes = $"Đã thanh lý ngày {s.dispose:dd/MM/yyyy}"
                    };
                    disposedAssets.Add(a);
                }
                context.Assets.AddRange(disposedAssets);
                await context.SaveChangesAsync();

                for (int i = 0; i < D.Count; i++)
                {
                    var s = D[i]; var a = disposedAssets[i];
                    var salvage = Math.Round(s.cost * 0.10m, 0);
                    var accum = a.accumulatedDepreciation;
                    var book = a.bookValue ?? 0m;
                    var gainLoss = s.disposalValue - book; // lãi/lỗ thanh lý

                    // 1) Chứng từ ghi tăng lịch sử (khi mua)
                    var gt = NewDoc(AssetDocumentType.GhiTang, "CT-GT", s.purchase,
                        $"Ghi tăng TSCĐ (lịch sử): {s.name}", s.cost, ACCOUNTANT);
                    Line(gt, s.acct, s.pay, s.cost, a.id, $"Nợ {s.acct} / Có {s.pay} mua {s.code}");

                    // 2) Chứng từ thanh lý (định khoản: xoá sổ + ghi nhận thu về)
                    var tl = NewDoc(AssetDocumentType.ThanhLy, "CT-TL", s.dispose,
                        $"Thanh lý TSCĐ ({s.dtype}): {s.name}. {s.reason}", s.cost, ACCOUNTANT);
                    // Xoá hao mòn luỹ kế: Nợ 214 / Có 211
                    if (accum > 0)
                        Line(tl, HaoMon(s.acct), s.acct, accum, a.id, $"Kết chuyển hao mòn luỹ kế {s.code}");
                    // Giá trị còn lại vào chi phí khác: Nợ 811 / Có 211
                    if (book > 0)
                        Line(tl, AssetAccount.ChiPhiKhac, s.acct, book, a.id, $"Giá trị còn lại {s.code} vào 811");
                    // Thu về khi thanh lý: Nợ 111/112 / Có 711
                    if (s.disposalValue > 0)
                        Line(tl, s.pay, ThuNhapKhac, s.disposalValue, a.id, $"Thu tiền thanh lý {s.code}");

                    await context.SaveChangesAsync(); // cần tl.id cho disposal.documentId

                    // 3) Bản ghi thanh lý (snapshot sổ sách khớp chứng từ)
                    context.AssetDisposals.Add(new AssetDisposal
                    {
                        assetId = a.id, disposalDate = s.dispose,
                        originalCost = s.cost, accumulatedDepreciation = accum, bookValue = book,
                        disposalValue = s.disposalValue, gainLoss = gainLoss,
                        disposalType = s.dtype, reason = s.reason, note = "Đã hoàn tất thủ tục thanh lý.",
                        status = "COMPLETED", documentId = tl.id, createdBy = ACCOUNTANT, createdAt = s.dispose
                    });
                }
                await context.SaveChangesAsync();

                // Gộp toàn bộ tài sản để tham chiếu về sau
                var allAssets = assets.Concat(disposedAssets).ToList();

                // ── QR codes (1 / tài sản) ──
                foreach (var a in allAssets)
                    context.AssetQrCodes.Add(new AssetQrCode { assetId = a.id, qrCode = $"QR-{a.assetCode}" });

                // ── IoT sensor readings (một số tài sản trọng yếu) ──
                var aHvac1 = assets[0]; var aMsb = assets.First(x => x.assetCode == "AS-ELEC-001");
                for (int i = 0; i < 5; i++)
                {
                    context.IotSensorReadings.Add(new IotSensorReading { assetId = aHvac1.id, sensorCode = "TEMP-RM-KT", readingValue = 24.5m + i * 0.3m, readingAt = AS_OF.AddHours(-(i + 1) * 6) });
                    context.IotSensorReadings.Add(new IotSensorReading { assetId = aMsb.id, sensorCode = "TEMP-MSB", readingValue = 42.0m + i * 1.2m, readingAt = AS_OF.AddHours(-(i + 1) * 6) });
                }

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG D — Lịch bảo trì (schedules) cho tài sản hoạt động
                // ════════════════════════════════════════════════════════════
                var schedTplByCat = new Dictionary<string, string>
                { ["HVAC"] = "CL-HVAC", ["ELEV"] = "CL-ELEV", ["ELEC"] = "CL-ELEC", ["FIRE"] = "CL-FIRE", ["PLUMB"] = "CL-PLUMB", ["GEN"] = "CL-GEN", ["SEC"] = "CL-GEN", ["IT"] = "CL-GEN" };
                var schedules = new List<MaintenanceSchedule>();
                // Lập lịch cho 16 tài sản trọng yếu đầu tiên
                foreach (var (a, s) in assets.Zip(A).Where(x => x.Second.crit is "CRITICAL" or "HIGH").Take(16))
                {
                    var freq = s.crit == "CRITICAL" ? ("MONTHLY", 30) : ("QUARTERLY", 90);
                    var sc = new MaintenanceSchedule
                    {
                        assetId = a.id, scheduleType = "PREVENTIVE", checklistTemplateId = tpl[schedTplByCat[s.catc]].id,
                        autoAssignDepartmentId = DEPT_KT, frequencyType = freq.Item1, frequencyDays = freq.Item2,
                        startDate = Utc(2026, 1, 1), nextDueDate = AS_OF.AddMonths(1), lastExecutedAt = AS_OF.AddMonths(-1),
                        leadTimeDays = 3, isActive = true, description = $"Bảo trì định kỳ {s.name}"
                    };
                    schedules.Add(sc);
                }
                context.MaintenanceSchedules.AddRange(schedules);
                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG E — Tickets (36) trạng thái đa dạng
                // ════════════════════════════════════════════════════════════
                var (KTVids, KTVnames) = (new[] { UID_KTV1, UID_KTV2, UID_KTV3 }, new[] { NAME_KTV1, NAME_KTV2, NAME_KTV3 });
                var ticketSpecs = new (string title, string desc, string cat, string prio, string status, string src, int assetIdx, int slaKind)[]
                {
                    ("Điều hòa sảnh không mát","Điều hòa khu sảnh chính chạy nhưng không mát.","HVAC","HIGH","NEW","APP",0,1),
                    ("Thang máy #2 có tiếng kêu lạ","Thang máy số 2 kêu khi qua tầng 3.","ELEVATOR","HIGH","IN_PROGRESS","RECEPTION",6,1),
                    ("Mất điện cục bộ tầng 3","Hành lang tầng 3 mất điện.","ELECTRICAL","CRITICAL","RESOLVED","PHONE",10,0),
                    ("Rò rỉ nước nhà vệ sinh chung","Nước rò rỉ nhà vệ sinh tầng 2.","PLUMBING","MEDIUM","ASSIGNED","APP",14,2),
                    ("Đèn hành lang tầng 2 hỏng","Vài bóng đèn hành lang tầng 2 không sáng.","ELECTRICAL","LOW","CLOSED","APP",23,3),
                    ("Báo cháy giả tại tầng hầm","Hệ thống báo cháy kích hoạt nhầm.","FIRE","CRITICAL","RESOLVED","RECEPTION",18,0),
                    ("Camera sảnh mờ hình","Hình ảnh camera sảnh chính bị mờ.","OTHER","LOW","NEW","APP",23,3),
                    ("Bơm nước cấp yếu","Áp lực nước tầng cao yếu giờ cao điểm.","PLUMBING","MEDIUM","IN_PROGRESS","PHONE",14,1),
                    ("Quạt thông gió hầm ồn","Quạt thông gió hầm phát tiếng ồn lớn.","HVAC","MEDIUM","ASSIGNED","APP",3,2),
                    ("Cửa thang máy đóng chậm","Cửa thang máy #1 đóng chậm bất thường.","ELEVATOR","HIGH","RESOLVED","APP",5,1),
                    ("Ổ cắm hành lang tầng 3 chập","Ổ cắm hành lang tầng 3 có mùi khét.","ELECTRICAL","HIGH","IN_PROGRESS","PHONE",10,1),
                    ("Nước nóng yếu tầng 5","Nước nóng khu tầng 5 không đủ.","PLUMBING","LOW","NEW","APP",16,3),
                    ("Kẹt thẻ kiểm soát ra vào","Đầu đọc thẻ sảnh chính đọc chậm.","OTHER","MEDIUM","ASSIGNED","RECEPTION",25,2),
                    ("Mạng chậm khu văn phòng BQL","Kết nối mạng phòng BQL chập chờn.","OTHER","MEDIUM","IN_PROGRESS","APP",27,2),
                    ("UPS báo lỗi ắc quy","UPS phòng server báo thay ắc quy.","ELECTRICAL","HIGH","RESOLVED","APP",28,1),
                    ("Rò nước trần hầm xe","Trần hầm xe khu B rò nước khi mưa.","PLUMBING","MEDIUM","NEW","APP",17,2),
                    ("Bình chữa cháy hết áp","Một số bình chữa cháy tầng 3 kim về đỏ.","FIRE","MEDIUM","ASSIGNED","RECEPTION",21,2),
                    ("Đèn thoát hiểm không sáng","Đèn exit cầu thang bộ tầng 2 tắt.","ELECTRICAL","HIGH","RESOLVED","APP",11,1),
                    ("Máy phát không tự khởi động","Máy phát 250kVA không auto-start khi thử.","ELECTRICAL","CRITICAL","IN_PROGRESS","PHONE",13,0),
                    ("Điều hòa VRV #2 chảy nước","Dàn lạnh VRV #2 nhỏ nước xuống trần.","HVAC","HIGH","ASSIGNED","APP",1,1),
                    ("Cảm biến khói phòng kỹ thuật lỗi","Đầu báo khói phòng kỹ thuật báo lỗi.","FIRE","HIGH","NEW","APP",18,1),
                    ("Camera hầm mất tín hiệu","Camera hầm xe khu C mất hình.","OTHER","MEDIUM","RESOLVED","APP",24,2),
                    ("Bơm tăng áp rung mạnh","Bơm tăng áp tầng cao rung bất thường.","PLUMBING","MEDIUM","IN_PROGRESS","PHONE",16,2),
                    ("Tủ điện tầng 2 nóng","Tủ điện phân phối tầng 2 nóng bất thường.","ELECTRICAL","HIGH","ASSIGNED","APP",9,1),
                    ("Thang máy hàng dừng đột ngột","Thang máy hàng #3 dừng giữa tầng.","ELEVATOR","CRITICAL","RESOLVED","PHONE",7,0),
                    ("Mùi hôi khu thu gom rác","Khu thu gom rác tầng hầm có mùi.","OTHER","LOW","CLOSED","RECEPTION",29,3),
                    ("Switch mạng lõi nóng","Switch lõi phòng server nhiệt độ cao.","OTHER","MEDIUM","IN_PROGRESS","APP",27,2),
                    ("Đèn sân thượng chập chờn","Đèn chiếu sáng sân thượng nhấp nháy.","ELECTRICAL","LOW","NEW","APP",11,3),
                    ("Van nước tổng rò rỉ","Van nước tổng tầng hầm rò nhẹ.","PLUMBING","MEDIUM","ASSIGNED","APP",14,2),
                    ("Điều hòa mái kém lạnh","Dàn nóng mái hoạt động kém hiệu quả.","HVAC","MEDIUM","IN_PROGRESS","APP",4,2),
                    ("Bơm chữa cháy không lên áp","Bơm chữa cháy điện không đạt áp định mức.","FIRE","CRITICAL","RESOLVED","PHONE",20,0),
                    ("Máy chủ BMS treo","Máy chủ quản lý tòa nhà treo, cần khởi động lại.","OTHER","HIGH","RESOLVED","APP",26,1),
                    ("Ghế chờ sảnh hỏng","Ghế khu chờ sảnh chính bị gãy chân.","OTHER","LOW","CLOSED","RECEPTION",30,3),
                    ("Camera kiểm soát cổng lệch góc","Camera cổng vào bị lệch hướng.","OTHER","LOW","NEW","APP",22,3),
                    ("Rò rỉ gas điều hòa VRV #1","Nghi rò rỉ gas dàn nóng VRV #1.","HVAC","HIGH","IN_PROGRESS","PHONE",0,1),
                    ("Nắp hố ga hầm bung","Nắp hố ga khu hầm B bị bung.","PLUMBING","MEDIUM","ASSIGNED","RECEPTION",17,2),
                };
                var slaArr = new[] { slaCrit, slaHigh, slaStd, slaLow };
                var tickets = new List<Ticket>();
                int tSeq = 1;
                foreach (var ts in ticketSpecs)
                {
                    var asset = allAssets.ElementAtOrDefault(ts.assetIdx) ?? assets[0];
                    var created = AS_OF.AddDays(-(tSeq % 30) - 1).AddHours(-(tSeq % 8));
                    bool done = ts.status is "RESOLVED" or "CLOSED";
                    int ktvPick = tSeq % 3;
                    var t = new Ticket
                    {
                        ticketCode = $"TK-2026-{tSeq:000}", status = ts.status, buildingId = BUILDING,
                        floorId = asset.floorId, unitId = (tSeq % 4 == 0) ? UNIT_1 : (tSeq % 4 == 1 ? UNIT_2 : (Guid?)null),
                        assetId = asset.id, reportedBy = (tSeq % 3 == 0) ? MANAGER : RESIDENT,
                        reportedByName = (tSeq % 3 == 0) ? NAME_MANAGER : "Cư dân",
                        assignedToUserId = ts.status == "NEW" ? (int?)null : KTVids[ktvPick],
                        assignedToName = ts.status == "NEW" ? null : KTVnames[ktvPick],
                        slaConfigId = slaArr[ts.slaKind].id, title = ts.title, description = ts.desc,
                        category = ts.cat, priority = ts.prio, source = ts.src,
                        resolvedAt = done ? created.AddHours(6) : (DateTime?)null,
                        closedAt = ts.status == "CLOSED" ? created.AddHours(20) : (DateTime?)null,
                        resolutionNote = done ? "Đã kiểm tra và khắc phục sự cố." : null,
                        createdAt = created, updatedAt = done ? created.AddHours(6) : created
                    };
                    tickets.Add(t);
                    tSeq++;
                }
                context.Tickets.AddRange(tickets);
                await context.SaveChangesAsync();

                // ── Ticket assignments / attachments / ratings / status history / escalations ──
                foreach (var t in tickets.Where(x => x.status != "NEW"))
                    context.TicketAssignments.Add(new TicketAssignment { ticketId = t.id, assignedTo = t.assignedToUserId == UID_KTV1 ? KTV1 : (t.assignedToUserId == UID_KTV2 ? KTV2 : KTV3), assignedToUserId = t.assignedToUserId, assignedToName = t.assignedToName, assignedAt = t.createdAt.AddMinutes(20) });

                foreach (var t in tickets.Take(12))
                    context.TicketAttachments.Add(new TicketAttachment { ticketId = t.id, fileUrl = $"https://res.cloudinary.com/demo/ticket/{t.ticketCode.ToLower()}.jpg" });

                foreach (var t in tickets.Where(x => x.status is "RESOLVED" or "CLOSED"))
                    context.TicketRatings.Add(new TicketRating { ticketId = t.id, ratedBy = t.reportedBy, overallRating = (short)(4 + (t.ticketCode.GetHashCode() & 1)) });

                void AddHist(Ticket t, string? from, string to, DateTime at, Guid? by, string? note)
                    => context.TicketStatusHistories.Add(new TicketStatusHistory { ticketId = t.id, fromStatus = from, toStatus = to, changedAt = at, changedBy = by, note = note });
                foreach (var t in tickets)
                {
                    AddHist(t, null, "NEW", t.createdAt, t.reportedBy, "Tạo phiếu");
                    if (t.status is "ASSIGNED" or "IN_PROGRESS" or "RESOLVED" or "CLOSED")
                        AddHist(t, "NEW", "ASSIGNED", t.createdAt.AddMinutes(20), MANAGER, "Phân công KTV");
                    if (t.status is "IN_PROGRESS" or "RESOLVED" or "CLOSED")
                        AddHist(t, "ASSIGNED", "IN_PROGRESS", t.createdAt.AddHours(1), KTV1, "Bắt đầu xử lý");
                    if (t.status is "RESOLVED" or "CLOSED")
                        AddHist(t, "IN_PROGRESS", "RESOLVED", t.resolvedAt!.Value, KTV1, "Đã khắc phục");
                    if (t.status == "CLOSED")
                        AddHist(t, "RESOLVED", "CLOSED", t.closedAt!.Value, MANAGER, "Đóng phiếu sau xác nhận");
                }
                // Escalation cho vài ticket ưu tiên cao còn đang xử lý
                foreach (var t in tickets.Where(x => x.priority is "CRITICAL" or "HIGH" && x.status == "IN_PROGRESS").Take(5))
                    context.SlaEscalationLogs.Add(new SlaEscalationLog { ticketId = t.id, escalationLevel = 1, escalatedAt = t.createdAt.AddHours(2), escalatedTo = MANAGER, channel = "EMAIL", message = "Ticket sắp quá hạn xử lý." });

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG F — Work orders (30) + xuất kho vật tư (OUT) cân sổ
                // ════════════════════════════════════════════════════════════
                var woStatuses = new[] { "COMPLETED", "COMPLETED", "COMPLETED", "IN_PROGRESS", "ASSIGNED", "PENDING_REVIEW", "DRAFT" };
                var workOrders = new List<WorkOrder>();
                var scheduledAssets = schedules.Select(s => s.assetId).ToList();
                int woSeq = 1;
                // WO bảo trì phòng ngừa (PM) theo lịch
                foreach (var sc in schedules)
                {
                    var a = assets.First(x => x.id == sc.assetId);
                    var st = woStatuses[woSeq % woStatuses.Length];
                    var sched = AS_OF.AddDays(-(woSeq % 40));
                    bool completed = st is "COMPLETED" or "PENDING_REVIEW";
                    int ktvPick = woSeq % 3;
                    var wo = new WorkOrder
                    {
                        woCode = $"WO-2026-{woSeq:000}", assetId = a.id, scheduleId = sc.id,
                        checklistTemplateId = sc.checklistTemplateId, buildingId = BUILDING, status = st, woType = "PM",
                        title = $"Bảo trì định kỳ {a.name}", priority = a.criticalityLevel == "CRITICAL" ? "HIGH" : "MEDIUM",
                        reviewerId = MANAGER, createdBy = CHIEF, createdByUserId = UID_CHIEF, createdByName = NAME_CHIEF,
                        assignedToUserId = st == "DRAFT" ? (int?)null : KTVids[ktvPick], assignedToName = st == "DRAFT" ? null : KTVnames[ktvPick],
                        scheduledDate = sched, dueDate = sched.AddDays(1),
                        actualStartAt = completed || st == "IN_PROGRESS" ? sched.AddHours(8) : (DateTime?)null,
                        actualEndAt = completed ? sched.AddHours(11) : (DateTime?)null,
                        approvedAt = st == "COMPLETED" ? sched.AddDays(1).AddHours(9) : (DateTime?)null,
                        estimatedHours = 3m, actualHours = completed ? 3m : (decimal?)null,
                        totalCost = completed ? 1_200_000m : (decimal?)null,
                        createdAt = sched.AddDays(-2), updatedAt = sched
                    };
                    workOrders.Add(wo);
                    woSeq++;
                }
                // WO sửa chữa (CM) phát sinh từ ticket đã resolved
                foreach (var t in tickets.Where(x => x.status is "RESOLVED" or "CLOSED").Take(10))
                {
                    var a = allAssets.First(x => x.id == t.assetId);
                    int ktvPick = woSeq % 3;
                    var wo = new WorkOrder
                    {
                        woCode = $"WO-2026-{woSeq:000}", assetId = a.id, checklistTemplateId = tpl[schedTplByCat[cat.First(c => c.Value.id == a.categoryId).Key]].id,
                        buildingId = BUILDING, status = "COMPLETED", woType = "CM",
                        title = $"Khắc phục: {t.title}", priority = t.priority, reviewerId = MANAGER,
                        createdBy = CHIEF, createdByUserId = UID_CHIEF, createdByName = NAME_CHIEF,
                        assignedToUserId = KTVids[ktvPick], assignedToName = KTVnames[ktvPick],
                        scheduledDate = t.createdAt.AddHours(1), dueDate = t.createdAt.AddHours(5),
                        actualStartAt = t.createdAt.AddHours(1), actualEndAt = t.resolvedAt, approvedAt = t.resolvedAt!.Value.AddHours(2),
                        estimatedHours = 2m, actualHours = 2.5m, totalCost = 650_000m,
                        createdAt = t.createdAt, updatedAt = t.resolvedAt!.Value
                    };
                    workOrders.Add(wo);
                    woSeq++;
                }
                context.WorkOrders.AddRange(workOrders);
                await context.SaveChangesAsync();

                // ── WO assignments (mọi WO trừ DRAFT) ──
                foreach (var wo in workOrders.Where(x => x.status != "DRAFT"))
                    context.WorkOrderAssignments.Add(new WorkOrderAssignment { woId = wo.id, assignedTo = wo.assignedToUserId == UID_KTV1 ? KTV1 : (wo.assignedToUserId == UID_KTV2 ? KTV2 : KTV3), assignedToUserId = wo.assignedToUserId, assignedToName = wo.assignedToName, assignedAt = wo.createdAt.AddHours(2), checkinQrAssetId = wo.assetId });

                // ── WO checklist responses cho WO đã hoàn thành ──
                var itemsByTplId = tplItems.Values.SelectMany(x => x).GroupBy(x => x.templateId).ToDictionary(g => g.Key, g => g.ToList());
                foreach (var wo in workOrders.Where(x => x.status is "COMPLETED" or "PENDING_REVIEW"))
                    if (itemsByTplId.TryGetValue(wo.checklistTemplateId, out var items))
                        foreach (var it in items)
                            context.WorkOrderChecklistResponses.Add(new WorkOrderChecklistResponse { woId = wo.id, templateItemId = it.id, isPassed = true, valueText = it.itemType == "NUMBER" ? "9" : "Đạt", respondedAt = (wo.actualEndAt ?? wo.updatedAt).AddMinutes(-30) });

                // ── WO attachments (một số WO hoàn thành) ──
                foreach (var wo in workOrders.Where(x => x.status == "COMPLETED").Take(12))
                {
                    context.WorkOrderAttachments.Add(new WorkOrderAttachment { woId = wo.id, attachmentType = "PHOTO", fileUrl = $"https://res.cloudinary.com/demo/wo/{wo.woCode.ToLower()}-before.jpg", fileName = $"{wo.woCode}-before.jpg", fileSizeBytes = 320_000, uploadedBy = KTV1, uploadedAt = wo.actualStartAt ?? wo.updatedAt, caption = "Hiện trạng trước" });
                    context.WorkOrderAttachments.Add(new WorkOrderAttachment { woId = wo.id, attachmentType = "PHOTO", fileUrl = $"https://res.cloudinary.com/demo/wo/{wo.woCode.ToLower()}-after.jpg", fileName = $"{wo.woCode}-after.jpg", fileSizeBytes = 310_000, uploadedBy = KTV1, uploadedAt = wo.actualEndAt ?? wo.updatedAt, caption = "Sau xử lý" });
                }

                await context.SaveChangesAsync();

                // ── Xuất kho vật tư dùng cho WO hoàn thành (OUT) — cân sổ, không âm ──
                var woMatPlan = new (string mat, decimal qty, Warehouse w)[]
                { ("MAT-005", 2, wh1), ("MAT-001", 3, wh1), ("MAT-002", 1, wh1), ("MAT-004", 1, wh1), ("MAT-CB1", 1, wh1), ("MAT-CB2", 1, wh1), ("MAT-009", 1, wh1), ("MAT-010", 2, wh1) };
                int planIdx = 0;
                foreach (var wo in workOrders.Where(x => x.status == "COMPLETED").Take(16))
                {
                    var plan = woMatPlan[planIdx % woMatPlan.Length]; planIdx++;
                    var outTxn = Txn("OUT", plan.w, plan.mat, plan.qty, "WORK_ORDER", wo.id, wo.actualStartAt ?? wo.updatedAt, KTV1, $"Xuất vật tư cho {wo.woCode}");
                    context.WorkOrderMaterialsUsed.Add(new WorkOrderMaterialUsed { woId = wo.id, materialId = mat[plan.mat].id, warehouseId = plan.w.id, inventoryTransactionId = outTxn.id });
                }
                // Một vài điều chỉnh kiểm kê (ADJUST) — hao hụt vật tư tiêu hao
                Txn("OUT", wh1, "MAT-010", 5, "ADJUSTMENT", null, Utc(2026, 6, 30, 17, 0), KTV1, "Điều chỉnh kiểm kê cuối tháng 6 (hao hụt giẻ lau)");
                Txn("OUT", wh1, "MAT-003", 30, "ADJUSTMENT", null, Utc(2026, 6, 30, 17, 0), KTV1, "Điều chỉnh kiểm kê dây điện");

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG G — Mua sắm: PR → PO → Invoice + nhập kho hàng về (IN)
                // ════════════════════════════════════════════════════════════
                var pr1 = new PurchaseRequest { prCode = "PR-2026-001", departmentId = DEPT_KT, requestedBy = KTV1, requestedByUserId = UID_KTV1, requestedByName = NAME_KTV1, status = "APPROVED", title = "Bổ sung vật tư điện quý 2", justification = "Tồn kho aptomat & lọc gió dưới mức tối thiểu.", priority = "HIGH", neededByDate = Utc(2026, 6, 20), approvedBy = MANAGER, approvedAt = Utc(2026, 5, 25), createdAt = Utc(2026, 5, 20) };
                var pr2 = new PurchaseRequest { prCode = "PR-2026-002", ticketId = tickets[7].id, departmentId = DEPT_KT, requestedBy = KTV2, requestedByUserId = UID_KTV2, requestedByName = NAME_KTV2, status = "SUBMITTED", title = "Vật tư thay thế bơm nước", justification = "Phục vụ xử lý sự cố bơm cấp nước yếu.", priority = "MEDIUM", neededByDate = Utc(2026, 6, 15), createdAt = AS_OF.AddDays(-6) };
                var pr3 = new PurchaseRequest { prCode = "PR-2026-003", departmentId = DEPT_KT, requestedBy = KTV2, requestedByUserId = UID_KTV2, requestedByName = NAME_KTV2, status = "DRAFT", title = "Vật tư PCCC định kỳ", justification = "Chuẩn bị kiểm tra PCCC tháng 7.", priority = "MEDIUM", neededByDate = Utc(2026, 7, 5), createdAt = AS_OF.AddDays(-3) };
                var pr4 = new PurchaseRequest { prCode = "PR-2026-004", departmentId = DEPT_KT, requestedBy = KTV1, requestedByUserId = UID_KTV1, requestedByName = NAME_KTV1, status = "REJECTED", title = "Mua thiết bị ngoài kế hoạch", justification = "Đề xuất mua thêm máy hút bụi.", priority = "LOW", rejectedReason = "Chưa cần thiết trong kỳ, để quý sau.", createdAt = Utc(2026, 5, 10) };
                context.PurchaseRequests.AddRange(pr1, pr2, pr3, pr4);
                await context.SaveChangesAsync();

                context.PurchaseRequestItems.AddRange(
                    new PurchaseRequestItem { prId = pr1.id, materialId = mat["MAT-002"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr1.id, materialId = mat["MAT-005"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr1.id, materialId = mat["MAT-001"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr2.id, materialId = mat["MAT-CB1"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr2.id, materialId = mat["MAT-CB2"].id, targetWarehouseId = wh1.id },
                    new PurchaseRequestItem { prId = pr3.id, materialId = mat["MAT-009"].id, targetWarehouseId = wh1.id }
                );

                var po1 = new PurchaseOrder { poCode = "PO-2026-001", prId = pr1.id, vendorId = ven["V005"].id, status = "RECEIVED", issueDate = Utc(2026, 5, 26), expectedDelivery = Utc(2026, 6, 2), actualDelivery = Utc(2026, 6, 1), totalAmount = 9_350_000m, currency = "VND", paymentTerms = "Thanh toán trong 30 ngày", createdBy = MANAGER, createdAt = Utc(2026, 5, 26) };
                var po2 = new PurchaseOrder { poCode = "PO-2026-002", prId = pr2.id, vendorId = ven["V005"].id, status = "ORDERED", issueDate = AS_OF.AddDays(-5), expectedDelivery = Utc(2026, 6, 14), totalAmount = 1_100_000m, currency = "VND", paymentTerms = "Thanh toán trong 30 ngày", createdBy = MANAGER, createdAt = AS_OF.AddDays(-5) };
                context.PurchaseOrders.AddRange(po1, po2);
                await context.SaveChangesAsync();

                var poItem1 = new PurchaseOrderItem { poId = po1.id, materialId = mat["MAT-002"].id, targetWarehouseId = wh1.id };
                var poItem2 = new PurchaseOrderItem { poId = po1.id, materialId = mat["MAT-005"].id, targetWarehouseId = wh1.id };
                var poItem3 = new PurchaseOrderItem { poId = po2.id, materialId = mat["MAT-CB1"].id, targetWarehouseId = wh1.id };
                context.PurchaseOrderItems.AddRange(poItem1, poItem2, poItem3);

                context.PoApprovalWorkflows.AddRange(
                    new PoApprovalWorkflow { poId = po1.id, approverId = MANAGER, status = "APPROVED", approvalLevel = 1, amountThreshold = 50_000_000m, approvedAt = Utc(2026, 5, 26, 10, 0), notifiedAt = Utc(2026, 5, 26, 9, 0) },
                    new PoApprovalWorkflow { poId = po2.id, approverId = MANAGER, status = "PENDING", approvalLevel = 1, amountThreshold = 50_000_000m, notifiedAt = AS_OF.AddDays(-5).AddHours(1) }
                );

                await context.SaveChangesAsync();

                // Hàng của PO đã nhận → nhập kho (IN) khớp actualDelivery
                Txn("IN", wh1, "MAT-002", 15, "PURCHASE_ORDER", po1.id, Utc(2026, 6, 1, 9, 0), KTV1, "Nhập hàng theo PO-2026-001");
                Txn("IN", wh1, "MAT-005", 26, "PURCHASE_ORDER", po1.id, Utc(2026, 6, 1, 9, 0), KTV1, "Nhập hàng theo PO-2026-001");

                var inv1 = new Invoice { invoiceCode = "INV-2026-001", vendorId = ven["V005"].id, poId = po1.id, ocrJobId = ocr1.id, status = "CONFIRMED", invoiceDate = Utc(2026, 6, 1), invoiceNumber = "0000125", subtotal = 8_500_000m, taxAmount = 850_000m, totalAmount = 9_350_000m, currency = "VND", paymentDueDate = Utc(2026, 7, 1), paidDate = Utc(2026, 6, 10), paymentStatus = "PAID", paymentMethod = "BANK_TRANSFER", confirmedBy = ACCOUNTANT, confirmedAt = Utc(2026, 6, 2) };
                var inv2 = new Invoice { invoiceCode = "INV-2026-002", vendorId = ven["V001"].id, ocrJobId = ocr2.id, status = "DRAFT", invoiceDate = Utc(2026, 5, 31), invoiceNumber = "0000088", subtotal = 20_000_000m, taxAmount = 2_000_000m, totalAmount = 22_000_000m, currency = "VND", paymentDueDate = Utc(2026, 6, 30), paymentStatus = "UNPAID", notes = "Phí bảo trì điều hòa quý 2" };
                context.Invoices.AddRange(inv1, inv2);
                await context.SaveChangesAsync();

                context.InvoiceItems.AddRange(
                    new InvoiceItem { invoiceId = inv1.id, materialId = mat["MAT-002"].id, description = "Aptomat MCB 32A 1P", quantity = 15, unitPrice = 120_000m, totalPrice = 1_800_000m, poItemId = poItem1.id },
                    new InvoiceItem { invoiceId = inv1.id, materialId = mat["MAT-005"].id, description = "Lọc gió điều hòa", quantity = 26, unitPrice = 250_000m, totalPrice = 6_500_000m, poItemId = poItem2.id },
                    new InvoiceItem { invoiceId = inv2.id, materialId = mat["MAT-004"].id, description = "Phí dịch vụ bảo trì điều hòa Q2", quantity = 1, unitPrice = 20_000_000m, totalPrice = 20_000_000m }
                );

                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // CHỐT SỔ TỒN KHO — sinh InventoryLevel = tồn thực tế (IN−OUT)
                // ════════════════════════════════════════════════════════════
                foreach (var kv in invLedger)
                {
                    var qty = kv.Value;
                    if (qty < 0) qty = 0; // an toàn (không xảy ra do guard trong Txn)
                    context.InventoryLevels.Add(new InventoryLevel { warehouseId = kv.Key.wh, materialId = kv.Key.mat, quantityOnHand = qty });
                }
                await context.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // TẦNG H — System / Reporting
                // ════════════════════════════════════════════════════════════
                for (int i = 29; i >= 0; i--)
                {
                    var day = AS_OF.AddDays(-i);
                    var kpi = KpiJson(
                        mttr: 3.5 + (i % 4) * 0.4, mtbf: 40 + (i % 5) * 2,
                        tNew: 3 + (i % 4), tRes: 2 + (i % 4), tOver: i % 3,
                        woComp: 1 + (i % 3), woRate: 0.80 + (i % 5) * 0.03,
                        sla: 0.88 + (i % 4) * 0.03, avail: 0.95 + (i % 3) * 0.015,
                        pmOver: i % 2, cost: 1_500_000 + (i % 6) * 750_000);
                    context.KpiDailySnapshots.Add(new KpiDailySnapshot { snapshotDate = day, buildingId = BUILDING, kpiDataJson = kpi, createdAt = AS_OF });
                }

                // Cost tracking bám theo WO/ticket/PO/invoice thực tế
                void AddCost(string refType, Guid refId, Guid? assetId, Guid? catId, decimal amount, string costType, DateTime date, string desc)
                    => context.CostTrackings.Add(new CostTracking { referenceType = refType, referenceId = refId, assetId = assetId, categoryId = catId, buildingId = BUILDING, departmentId = DEPT_KT, amount = amount, currency = "VND", costType = costType, costDate = date, description = desc, recordedBy = ACCOUNTANT, recordedAt = date });
                int cSeq = 0;
                foreach (var wo in workOrders.Where(x => x.status == "COMPLETED").Take(14))
                {
                    var a = allAssets.First(x => x.id == wo.assetId);
                    AddCost("WORK_ORDER", wo.id, a.id, a.categoryId, wo.woType == "CM" ? 650_000m : 1_200_000m, "LABOR", wo.actualEndAt ?? wo.updatedAt, $"Nhân công {wo.title}");
                    if (cSeq % 2 == 0) AddCost("WORK_ORDER", wo.id, a.id, a.categoryId, 450_000m, "MATERIAL", (wo.actualEndAt ?? wo.updatedAt).AddHours(1), $"Vật tư cho {wo.woCode}");
                    cSeq++;
                }
                AddCost("PURCHASE_ORDER", po1.id, null, cat["ELEC"].id, 8_500_000m, "MATERIAL", Utc(2026, 6, 1), "Mua vật tư điện theo PO-2026-001");
                AddCost("INVOICE", inv2.id, aHvac1.id, cat["HVAC"].id, 20_000_000m, "SERVICE", Utc(2026, 5, 31), "Phí hợp đồng bảo trì điều hòa Q2");

                await context.SaveChangesAsync();

                await tx.CommitAsync();
            });

            logger.LogInformation("[AssetSeeder] Seeding hoàn tất — tài sản có đủ chứng từ ghi tăng/khấu hao/thanh lý, tồn kho cân sổ.");
        }

        // ════════════════════════════════════════════════════════════════════
        // Catalog top-up — bổ sung Nhà cung cấp / Danh mục vật tư / Vật tư
        // (kèm Đơn vị tính) lấy từ bộ dataset hóa đơn TownHub dùng cho OCR.
        //
        // Chạy ĐỘC LẬP với SeedAllAsync (không bị chặn bởi guard AssetCategories):
        //   • Idempotent theo mã (code / vendorCode / materialCode) — chỉ thêm
        //     phần còn thiếu nên an toàn cả khi DB đã seed lẫn DB mới.
        //   • Mỗi vật tư được điền ĐẦY ĐỦ thông tin: ĐVT, tồn min/max, điểm/số
        //     lượng đặt lại, đơn giá, nhà cung cấp ưu tiên, ghi chú, trạng thái.
        // ════════════════════════════════════════════════════════════════════
        public static async Task SeedDatasetCatalogAsync(AssetDbContext context, ILogger logger)
        {
            var strategy = context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                context.ChangeTracker.Clear();
                await using var tx = await context.Database.BeginTransactionAsync();

                // ── 1) Danh mục vật tư còn thiếu (theo dataset hàng hóa) ──────
                var catByCode = await context.MaterialCategories.ToDictionaryAsync(c => c.code, c => c);
                var newCats = new (string code, string name)[]
                {
                    ("MC-IT",    "Thiết bị tin học - văn phòng"),
                    ("MC-FURN",  "Nội thất văn phòng"),
                    ("MC-BUILD", "Vật tư xây dựng - hoàn thiện"),
                    ("MC-APPL",  "Thiết bị điện gia dụng"),
                };
                foreach (var (code, name) in newCats)
                {
                    if (catByCode.ContainsKey(code)) continue;
                    var c = new MaterialCategory { code = code, name = name };
                    context.MaterialCategories.Add(c);
                    catByCode[code] = c;
                }

                // ── 2) Nhà cung cấp còn thiếu (tên rút từ dataset hóa đơn) ────
                var venByCode = await context.Vendors.ToDictionaryAsync(v => v.vendorCode, v => v);
                void AddVendor(string code, string name, string tax, string contact,
                               string email, string phone, string address, string notes)
                {
                    if (venByCode.ContainsKey(code)) return;
                    var v = new VendorEntity
                    {
                        vendorCode = code, name = name, taxId = tax, status = "ACTIVE",
                        contactName = contact, contactEmail = email, contactPhone = phone,
                        address = address, notes = notes
                    };
                    context.Vendors.Add(v);
                    venByCode[code] = v;
                }
                AddVendor("V006", "Công ty TNHH Thương Mại Phương Nam",   "0106123456", "Trần Minh Phương", "phuong.tran@phuongnam.com.vn",  "0906123456", "Số 12 Nguyễn Trãi, Thanh Xuân, Hà Nội",       "Cung cấp thiết bị điện gia dụng, quạt, bình nóng lạnh.");
                AddVendor("V007", "Công ty Cổ Phần Đông Á",               "0106234567", "Lê Thị Hồng Đào",  "dao.le@donga.com.vn",           "0906234567", "Số 45 Trần Duy Hưng, Cầu Giấy, Hà Nội",       "Phân phối thiết bị tin học - văn phòng, camera an ninh.");
                AddVendor("V008", "Công ty TNHH Dịch Vụ Thành Đạt",       "0106345678", "Phạm Văn Thành",   "thanh.pham@thanhdat.com.vn",    "0906345678", "Số 78 Lê Văn Lương, Nam Từ Liêm, Hà Nội",     "Cung cấp nội thất văn phòng: bàn ghế, tủ tài liệu.");
                AddVendor("V009", "Công ty TNHH MTV Sơn Hà",              "0106456789", "Nguyễn Sơn Hà",    "ha.nguyen@sonha.com.vn",        "0906456789", "Số 210 Giải Phóng, Hoàng Mai, Hà Nội",        "Vật tư xây dựng, thép hộp, ống nhựa, xi măng.");
                AddVendor("V010", "Công ty TNHH Thương Mại Bình Minh",    "0106567890", "Đỗ Bình Minh",     "minh.do@binhminh.com.vn",       "0906567890", "Số 5 Nguyễn Văn Cừ, Long Biên, Hà Nội",       "Máy lạnh, thiết bị điều hòa - thông gió.");
                AddVendor("V011", "Công ty TNHH Dịch Vụ An Khang",        "0106678901", "Vũ An Khang",      "khang.vu@ankhang.com.vn",       "0906678901", "Số 33 Cầu Giấy, Cầu Giấy, Hà Nội",            "Vật tư điện: dây điện, bóng đèn, aptomat.");
                AddVendor("V012", "Công ty Cổ Phần Phú Thịnh",            "0106789012", "Hoàng Phú Thịnh",  "thinh.hoang@phuthinh.com.vn",   "0906789012", "Số 88 Phạm Hùng, Nam Từ Liêm, Hà Nội",        "Nội thất & thiết bị văn phòng nhập khẩu.");
                AddVendor("V013", "Công ty TNHH Thương Mại Trường Sơn",   "0106890123", "Bùi Trường Sơn",   "son.bui@truongson.com.vn",      "0906890123", "Số 156 Trường Chinh, Đống Đa, Hà Nội",        "Vật tư hoàn thiện: sơn nước, gạch ốp lát.");
                AddVendor("V014", "Doanh Nghiệp Tư Nhân Nam Sơn",         "0106901234", "Đinh Nam Sơn",     "son.dinh@namson.com.vn",        "0906901234", "Số 27 Khuất Duy Tiến, Thanh Xuân, Hà Nội",    "Vật liệu xây dựng, xi măng, thép.");
                AddVendor("V015", "Công ty TNHH MTV Việt Long",           "0107012345", "Trịnh Việt Long",  "long.trinh@vietlong.com.vn",    "0907012345", "Số 64 Xuân Thủy, Cầu Giấy, Hà Nội",           "Thiết bị lưu trữ, linh kiện máy tính, mực in.");

                await context.SaveChangesAsync(); // để có id cho FK bên dưới

                // ── 3) Vật tư còn thiếu — đầy đủ thông tin, theo 20 mặt hàng
                //        xuất hiện trong dataset hóa đơn OCR của TownHub ──────
                var matCodes = await context.Materials.Select(m => m.materialCode).ToListAsync();
                var existing = new HashSet<string>(matCodes);

                void AddMat(string code, string name, string catCode, string vendorCode, string uom,
                            decimal min, decimal max, decimal reorderPt, decimal reorderQty,
                            decimal price, string notes)
                {
                    if (existing.Contains(code)) return;
                    if (!catByCode.TryGetValue(catCode, out var mc)) return;         // danh mục phải tồn tại
                    venByCode.TryGetValue(vendorCode, out var pv);                    // NCC ưu tiên (nếu có)
                    context.Materials.Add(new Material
                    {
                        materialCode = code, name = name, categoryId = mc.id,
                        preferredVendorId = pv?.id, unitOfMeasure = uom,
                        minStock = min, maxStock = max, reorderPoint = reorderPt,
                        reorderQuantity = reorderQty, unitPrice = price,
                        isActive = true, notes = notes
                    });
                    existing.Add(code);
                }

                // Thiết bị tin học - văn phòng (MC-IT)
                AddMat("MAT-011", "Bàn phím cơ",           "MC-IT",   "V007", "Chiếc",   10,  60,  15,  20,     850_000, "Bàn phím cơ dùng cho khối văn phòng.");
                AddMat("MAT-012", "Chuột không dây",       "MC-IT",   "V007", "Chiếc",   10,  60,  15,  20,     350_000, "Chuột không dây kết nối USB/Bluetooth.");
                AddMat("MAT-013", "Ổ cứng SSD 512GB",      "MC-IT",   "V015", "Chiếc",    5,  40,  10,  15,   1_150_000, "Ổ SSD 512GB nâng cấp máy tính văn phòng.");
                AddMat("MAT-014", "Mực in HP 12A",         "MC-IT",   "V015", "Hộp",      8,  50,  12,  20,   1_450_000, "Hộp mực HP 12A cho máy in laser.");
                AddMat("MAT-015", "Máy in Canon 2900",     "MC-IT",   "V007", "Chiếc",    2,  15,   3,   5,   3_200_000, "Máy in laser Canon LBP 2900.");
                AddMat("MAT-016", "Giấy A4 Double A",      "MC-IT",   "V015", "Ram",     30, 200,  50,  80,      75_000, "Giấy in A4 70gsm, 500 tờ/ram.");
                AddMat("MAT-017", "Camera an ninh 4MP",    "MC-IT",   "V007", "Chiếc",    5,  40,  10,  15,   1_250_000, "Camera IP giám sát an ninh 4MP.");
                // Nội thất văn phòng (MC-FURN)
                AddMat("MAT-018", "Tủ tài liệu sắt",       "MC-FURN", "V008", "Chiếc",    3,  25,   5,   8,   2_400_000, "Tủ hồ sơ sắt 4 ngăn cho văn phòng.");
                AddMat("MAT-019", "Ghế xoay văn phòng",    "MC-FURN", "V012", "Chiếc",    5,  40,  10,  15,   1_150_000, "Ghế xoay có tựa lưng, tay vịn.");
                AddMat("MAT-020", "Bàn làm việc gỗ MDF",   "MC-FURN", "V008", "Chiếc",    3,  30,   6,  10,   1_800_000, "Bàn làm việc gỗ MDF phủ melamine.");
                // Vật tư xây dựng - hoàn thiện (MC-BUILD)
                AddMat("MAT-021", "Thép hộp mạ kẽm",       "MC-BUILD","V009", "Cây",     20, 200,  40,  60,     185_000, "Thép hộp mạ kẽm dùng cho kết cấu phụ.");
                AddMat("MAT-022", "Ống nhựa PVC D110",     "MC-BUILD","V009", "Cây",     15, 150,  30,  50,     210_000, "Ống nhựa PVC D110 thoát nước.");
                AddMat("MAT-023", "Xi măng PCB40",         "MC-BUILD","V014", "Bao",     20, 200,  40,  60,      95_000, "Xi măng PCB40 bao 50kg.");
                AddMat("MAT-024", "Sơn nước ngoại thất",   "MC-BUILD","V013", "Thùng",    5,  40,  10,  15,   1_650_000, "Sơn nước ngoại thất thùng 18L.");
                AddMat("MAT-025", "Gạch ốp lát 60x60",     "MC-BUILD","V013", "m²",      30, 300,  60, 100,     285_000, "Gạch ốp lát granite 60x60cm.");
                // Thiết bị điện gia dụng (MC-APPL)
                AddMat("MAT-026", "Máy lạnh Daikin 1.5HP", "MC-APPL", "V010", "Bộ",       2,  20,   4,   6,  12_500_000, "Máy lạnh Daikin 1.5HP inverter.");
                AddMat("MAT-027", "Quạt trần Panasonic",   "MC-APPL", "V010", "Chiếc",    3,  30,   6,  10,   1_850_000, "Quạt trần Panasonic 3 cánh.");
                AddMat("MAT-028", "Bình nước nóng 20L",    "MC-APPL", "V006", "Chiếc",    3,  25,   5,   8,   3_100_000, "Bình nước nóng gián tiếp 20L.");
                // Vật tư điện (MC-ELEC — đã tồn tại)
                AddMat("MAT-029", "Bóng đèn LED 18W",      "MC-ELEC", "V011", "Bóng",    30, 250,  60, 100,      95_000, "Bóng đèn LED tuýp/panel 18W.");

                await context.SaveChangesAsync();

                // ── 4) Tồn kho ban đầu cho vật tư mới tại kho chính (WH-01) ──
                var whMain = await context.Warehouses.FirstOrDefaultAsync(w => w.code == "WH-01");
                if (whMain != null)
                {
                    var newMats = await context.Materials
                        .Where(m => existing.Contains(m.materialCode))
                        .Select(m => new { m.id, m.materialCode })
                        .ToListAsync();
                    var leveledMatIds = await context.InventoryLevels
                        .Where(l => l.warehouseId == whMain.id)
                        .Select(l => l.materialId)
                        .ToListAsync();
                    var leveled = new HashSet<Guid>(leveledMatIds);

                    var initialQty = new Dictionary<string, decimal>
                    {
                        ["MAT-011"] = 25, ["MAT-012"] = 30, ["MAT-013"] = 18, ["MAT-014"] = 22,
                        ["MAT-015"] = 6,  ["MAT-016"] = 120,["MAT-017"] = 14, ["MAT-018"] = 8,
                        ["MAT-019"] = 16, ["MAT-020"] = 10, ["MAT-021"] = 60, ["MAT-022"] = 45,
                        ["MAT-023"] = 80, ["MAT-024"] = 12, ["MAT-025"] = 90, ["MAT-026"] = 5,
                        ["MAT-027"] = 12, ["MAT-028"] = 7,  ["MAT-029"] = 100,
                    };
                    foreach (var m in newMats)
                    {
                        if (leveled.Contains(m.id)) continue;
                        if (!initialQty.TryGetValue(m.materialCode, out var qty)) continue;
                        context.InventoryLevels.Add(new InventoryLevel
                        {
                            warehouseId = whMain.id, materialId = m.id, quantityOnHand = qty
                        });
                    }
                    await context.SaveChangesAsync();
                }

                await tx.CommitAsync();
            });

            logger.LogInformation("[AssetSeeder] Catalog top-up hoàn tất — đã đồng bộ NCC / danh mục / vật tư từ dataset.");
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
