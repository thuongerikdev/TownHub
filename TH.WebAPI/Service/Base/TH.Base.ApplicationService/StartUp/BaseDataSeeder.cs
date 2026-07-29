using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TH.Base.Domain.Entities;      // Building, Floor
using TH.TownHub.Domain.Entities;   // Apartment, Resident, Fee, Incident, Notification, Provider…
using TH.TownHub.Infrastructure.Database;

namespace TH.Base.ApplicationService.StartUp
{
    /// <summary>
    /// Seed dữ liệu mẫu cho module Base/TownHub (vận hành cư dân).
    /// Liên kết chặt & đúng luồng:
    ///   • Toà nhà → tầng → căn hộ → cư dân (cư dân gắn tài khoản Auth qua userMap).
    ///   • Phí dịch vụ: mỗi căn hộ có phí quản lý theo m² + gửi xe, trạng thái
    ///     paid/unpaid/overdue nhất quán với PaidAt/PaymentMethod.
    ///   • Sự cố → bình luận; thông báo → log gửi; NCC → dịch vụ đăng ký → yêu cầu dịch vụ.
    ///
    /// Guid cross-service khớp AssetDataSeeder (BUILDING/FLOOR_1..3) để 2 module
    /// cùng trỏ về một toà nhà. Idempotent: đã có Resident thì bỏ qua.
    /// </summary>
    public static class BaseDataSeeder
    {
        private static readonly Guid BUILDING = Guid.Parse("11111111-1111-1111-1111-111111111111");
        private static readonly Guid FLOOR_1  = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000001");
        private static readonly Guid FLOOR_2  = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000002");
        private static readonly Guid FLOOR_3  = Guid.Parse("a1a1a1a1-0000-0000-0000-000000000003");

        private static DateTime Utc(int y, int m, int d, int hh = 0, int mm = 0)
            => new DateTime(y, m, d, hh, mm, 0, DateTimeKind.Utc);

        public static async Task SeedAllAsync(TownHubDbContext ctx, Dictionary<string, int> userMap, ILogger logger)
        {
            if (await ctx.Residents.AnyAsync())
            {
                logger.LogInformation("[BaseSeeder] Đã có cư dân — bỏ qua seeding Base.");
                return;
            }

            logger.LogInformation("[BaseSeeder] Bắt đầu seed dữ liệu Base/TownHub...");

            int Uid(string userName, int fallback) => userMap.TryGetValue(userName, out var id) ? id : fallback;
            int UidResident(int n) => Uid($"cudan{n:00}", 1000 + n);
            var ktvUsers = new[] { Uid("nguyen.van.a", 4), Uid("tran.van.b", 5), Uid("le.van.c", 6) };
            int bqlUser = Uid("tkbql", 2);

            var strategy = ctx.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                ctx.ChangeTracker.Clear();
                await using var tx = await ctx.Database.BeginTransactionAsync();

                // ════════════════════════════════════════════════════════════
                // TOÀ NHÀ + TẦNG
                // ════════════════════════════════════════════════════════════
                var mainBuilding = new Building { id = BUILDING, code = "TH-A", name = "TownHub Tower A", totalFloors = 20, totalUnits = 240, managementCompany = "Công ty QLVH TownHub" };
                var bB = new Building { code = "TH-B", name = "TownHub Tower B", totalFloors = 18, totalUnits = 200, managementCompany = "Công ty QLVH TownHub" };
                var bC = new Building { code = "TH-C", name = "TownHub Tower C", totalFloors = 15, totalUnits = 150, managementCompany = "Công ty QLVH TownHub" };
                var bVilla = new Building { code = "TH-V", name = "TownHub Villa", totalFloors = 3, totalUnits = 30, managementCompany = "Công ty QLVH TownHub" };
                ctx.Buildings.AddRange(mainBuilding, bB, bC, bVilla);
                await ctx.SaveChangesAsync();

                // Tầng cho toà chính (10 tầng; 3 tầng đầu dùng Guid cố định khớp Asset)
                var floors = new List<Floor>();
                for (int n = 1; n <= 10; n++)
                {
                    var f = new Floor
                    {
                        buildingId = mainBuilding.id, floorNumber = n,
                        floorName = n == 1 ? "Tầng trệt" : $"Tầng {n}",
                        floorType = n <= 2 ? "commercial" : "residential"
                    };
                    if (n == 1) f.id = FLOOR_1;
                    if (n == 2) f.id = FLOOR_2;
                    if (n == 3) f.id = FLOOR_3;
                    floors.Add(f);
                }
                // Vài tầng cho toà B & C
                for (int n = 1; n <= 4; n++)
                    floors.Add(new Floor { buildingId = bB.id, floorNumber = n, floorName = $"Tầng {n}", floorType = "residential" });
                for (int n = 1; n <= 3; n++)
                    floors.Add(new Floor { buildingId = bC.id, floorNumber = n, floorName = $"Tầng {n}", floorType = "residential" });
                ctx.Floors.AddRange(floors);
                await ctx.SaveChangesAsync();

                var mainFloors = floors.Where(f => f.buildingId == mainBuilding.id).OrderBy(f => f.floorNumber).ToList();

                // ════════════════════════════════════════════════════════════
                // CĂN HỘ (36) — toà chính, tầng 1..9, 4 căn/tầng
                // ════════════════════════════════════════════════════════════
                var aptTypes = new[] { ("Studio", 35m), ("1PN", 52m), ("2PN", 74m), ("3PN", 98m) };
                var apartments = new List<Apartment>();
                for (int fl = 1; fl <= 9; fl++)
                {
                    var floor = mainFloors.First(f => f.floorNumber == fl);
                    for (int u = 1; u <= 4; u++)
                    {
                        var t = aptTypes[(u - 1) % aptTypes.Length];
                        int seq = (fl - 1) * 4 + u;
                        // 30 căn đầu có người ở, còn lại trống/bảo trì
                        string status = seq <= 30 ? "occupied" : (seq % 2 == 0 ? "vacant" : "maintenance");
                        apartments.Add(new Apartment
                        {
                            Code = $"A{fl:00}{u:00}", Building = mainBuilding.name, BuildingId = mainBuilding.id,
                            FloorId = floor.id, Floor = fl, UnitNumber = $"{u:00}", Type = t.Item1, AreaM2 = t.Item2,
                            Status = status, CreatedAt = Utc(2025, 12, 1), UpdatedAt = Utc(2026, 1, 1)
                        });
                    }
                }
                ctx.Apartments.AddRange(apartments);
                await ctx.SaveChangesAsync();

                var occupied = apartments.Where(a => a.Status == "occupied").OrderBy(a => a.Code).ToList();

                // ════════════════════════════════════════════════════════════
                // CƯ DÂN (30) — gắn căn hộ + tài khoản Auth (cudanNN)
                // ════════════════════════════════════════════════════════════
                var ho = new[] { "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ" };
                var ten = new[] { "An", "Bình", "Cường", "Dung", "Em", "Giang", "Hải", "Khoa", "Lan", "Mai", "Nam", "Oanh", "Phúc", "Quân", "Sơn", "Trang", "Uyên", "Vinh", "Xuân", "Yến" };
                var residents = new List<Resident>();
                for (int i = 1; i <= 30; i++)
                {
                    var apt = occupied[(i - 1) % occupied.Count];
                    var gender = (i % 2 == 0) ? "male" : "female";
                    residents.Add(new Resident
                    {
                        FullName = $"{ho[i % ho.Length]} {ten[(i * 3) % ten.Length]} {ten[i % ten.Length]}",
                        Phone = $"0922{i:000000}", Email = $"cudan{i:00}@townhub.vn",
                        IdCard = $"0010900{i:00000}", DateOfBirth = Utc(1985 + (i % 15), (i % 12) + 1, (i % 27) + 1),
                        Gender = gender, ApartmentId = apt.Id, IsOwner = (i % 3 != 0),
                        IsBusinessOwner = (i % 10 == 0), MoveInDate = Utc(2025, 6, 1).AddDays(i * 3),
                        AuthUserId = UidResident(i), AvatarUrl = $"https://ui-avatars.com/api/?name=CD{i:00}",
                        CreatedAt = Utc(2025, 6, 1), UpdatedAt = Utc(2026, 1, 1)
                    });
                }
                ctx.Residents.AddRange(residents);
                await ctx.SaveChangesAsync();

                // ── Face profiles (15 cư dân đầu) + access events (30) ──
                foreach (var r in residents.Take(15))
                    ctx.FaceProfiles.Add(new FaceProfile { ResidentId = r.Id, ImageUrl = $"https://res.cloudinary.com/demo/face/{r.Id}.jpg", AiStatus = "active", EmbeddingRef = $"emb_{r.Id:0000}", RegisteredAt = Utc(2025, 7, 1), UpdatedAt = Utc(2025, 7, 1) });

                var cams = new[] { "Cổng chính", "Sảnh thang máy T1", "Hầm B1", "Cổng phụ" };
                for (int i = 0; i < 30; i++)
                {
                    bool known = i % 4 != 0;
                    var r = residents[i % residents.Count];
                    ctx.AccessEvents.Add(new AccessEvent
                    {
                        ResidentId = known ? r.Id : (int?)null,
                        PersonType = known ? "resident" : "stranger",
                        Direction = (i % 2 == 0) ? "in" : "out", CameraName = cams[i % cams.Length],
                        SnapshotUrl = $"https://res.cloudinary.com/demo/access/{i:000}.jpg",
                        Confidence = known ? 0.95 - (i % 5) * 0.02 : 0.40,
                        Status = known ? "matched" : "new",
                        DetectedAt = Utc(2026, 6, 20).AddHours(-i * 3), CreatedAt = Utc(2026, 6, 20).AddHours(-i * 3)
                    });
                }
                await ctx.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // PHÍ DỊCH VỤ — loại phí + phiếu phí (paid/unpaid/overdue)
                // ════════════════════════════════════════════════════════════
                var ftQuanLy  = new FeeType { Name = "Phí quản lý",   Description = "Phí quản lý vận hành theo m²", UnitPrice = 16_000m, IsPerM2 = true,  IsActive = true, CreatedAt = Utc(2025, 12, 1) };
                var ftXeMay   = new FeeType { Name = "Phí gửi xe máy", Description = "Phí gửi xe máy hàng tháng",   UnitPrice = 100_000m, IsPerM2 = false, IsActive = true, CreatedAt = Utc(2025, 12, 1) };
                var ftOto     = new FeeType { Name = "Phí gửi ô tô",   Description = "Phí gửi ô tô hàng tháng",    UnitPrice = 1_200_000m, IsPerM2 = false, IsActive = true, CreatedAt = Utc(2025, 12, 1) };
                var ftNuoc    = new FeeType { Name = "Phí nước",       Description = "Phí nước sinh hoạt",         UnitPrice = 15_000m, IsPerM2 = false, IsActive = true, CreatedAt = Utc(2025, 12, 1) };
                var ftDichVu  = new FeeType { Name = "Phí dịch vụ",    Description = "Phí tiện ích chung",         UnitPrice = 50_000m, IsPerM2 = false, IsActive = true, CreatedAt = Utc(2025, 12, 1) };
                ctx.FeeTypes.AddRange(ftQuanLy, ftXeMay, ftOto, ftNuoc, ftDichVu);
                await ctx.SaveChangesAsync();

                var fees = new List<Fee>();
                void AddFee(Apartment apt, FeeType ft, string month, decimal amount, string status, DateTime due, DateTime? paid)
                    => fees.Add(new Fee
                    {
                        ApartmentId = apt.Id, FeeTypeId = ft.Id, BillingMonth = month, Amount = amount,
                        DueDate = due, Status = status, PaidAt = paid,
                        PaymentMethod = paid == null ? null : (apt.Id % 2 == 0 ? "VNPay" : "Bank Transfer"),
                        PaymentRef = paid == null ? null : $"TXN{apt.Id:000}{month.Replace("-", "")}",
                        CreatedByAuthUserId = bqlUser, CreatedAt = Utc(2026, int.Parse(month.Split('-')[1]), 1), UpdatedAt = Utc(2026, int.Parse(month.Split('-')[1]), 1)
                    });

                foreach (var apt in occupied)
                {
                    var mgmt = Math.Round(apt.AreaM2 * ftQuanLy.UnitPrice, 0);
                    // Tháng 5: đã thanh toán
                    AddFee(apt, ftQuanLy, "2026-05", mgmt, "paid", Utc(2026, 5, 10), Utc(2026, 5, 8));
                    // Tháng 6: một phần chưa trả / quá hạn
                    bool overdue = apt.Id % 3 == 0;
                    bool paid6 = apt.Id % 3 == 1;
                    AddFee(apt, ftQuanLy, "2026-06", mgmt, paid6 ? "paid" : (overdue ? "overdue" : "unpaid"),
                        Utc(2026, 6, 10), paid6 ? Utc(2026, 6, 9) : (DateTime?)null);
                    // Phí gửi xe cho ~2/3 căn (tháng 6)
                    if (apt.Id % 3 != 2)
                        AddFee(apt, ftXeMay, "2026-06", ftXeMay.UnitPrice, apt.Id % 2 == 0 ? "paid" : "unpaid",
                            Utc(2026, 6, 10), apt.Id % 2 == 0 ? Utc(2026, 6, 7) : (DateTime?)null);
                }
                ctx.Fees.AddRange(fees);
                await ctx.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // SỰ CỐ (30) + bình luận
                // ════════════════════════════════════════════════════════════
                var incCats = new[] { "elevator", "plumbing", "electrical", "security", "cleaning", "parking", "other" };
                var incPri = new[] { "low", "medium", "high", "critical" };
                var incStatus = new[] { "open", "in_progress", "resolved", "closed" };
                var incTitles = new[]
                {
                    "Thang máy dừng đột ngột","Rò rỉ nước trần nhà","Mất điện căn hộ","Camera hành lang hỏng",
                    "Rác chưa được thu gom","Xe đỗ sai vị trí","Ồn ào quá giờ quy định","Cửa ra vào kẹt",
                    "Mùi hôi cống thoát","Đèn hành lang không sáng","Nước yếu giờ cao điểm","Chuông báo cháy kêu",
                };
                var incidents = new List<Incident>();
                for (int i = 0; i < 30; i++)
                {
                    var apt = occupied[i % occupied.Count];
                    var status = incStatus[i % incStatus.Length];
                    bool assigned = status != "open";
                    bool done = status is "resolved" or "closed";
                    var created = Utc(2026, 6, 1).AddDays(i).AddHours(i % 12);
                    incidents.Add(new Incident
                    {
                        Title = incTitles[i % incTitles.Length], Description = "Cư dân phản ánh sự cố cần xử lý.",
                        Location = $"{apt.Building} - {apt.Code}", ApartmentId = apt.Id,
                        Category = incCats[i % incCats.Length], Priority = incPri[i % incPri.Length], Status = status,
                        ReportedByAuthUserId = UidResident((i % 30) + 1),
                        AssignedToAuthUserId = assigned ? ktvUsers[i % ktvUsers.Length] : (int?)null,
                        ResolvedAt = done ? created.AddHours(8) : (DateTime?)null,
                        ResolutionNote = done ? "Đã kiểm tra và xử lý xong." : null,
                        CreatedAt = created, UpdatedAt = done ? created.AddHours(8) : created
                    });
                }
                ctx.Incidents.AddRange(incidents);
                await ctx.SaveChangesAsync();

                foreach (var inc in incidents)
                {
                    ctx.IncidentComments.Add(new IncidentComment { IncidentId = inc.Id, AuthorAuthUserId = inc.ReportedByAuthUserId, Content = "Mong ban quản lý xử lý sớm.", CreatedAt = inc.CreatedAt.AddMinutes(30) });
                    if (inc.AssignedToAuthUserId != null)
                        ctx.IncidentComments.Add(new IncidentComment { IncidentId = inc.Id, AuthorAuthUserId = inc.AssignedToAuthUserId.Value, Content = "Kỹ thuật đã tiếp nhận, đang kiểm tra.", CreatedAt = inc.CreatedAt.AddHours(1) });
                }
                await ctx.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // THÔNG BÁO — mẫu + chiến dịch + log gửi
                // ════════════════════════════════════════════════════════════
                var tplPhi   = new NotificationTemplate { Name = "Nhắc phí dịch vụ", Channel = "email", Subject = "Thông báo phí tháng {month}", Body = "Kính gửi {resident_name}, phí tháng {month} là {amount}đ.", Variables = "[\"resident_name\",\"month\",\"amount\"]", IsActive = true, CreatedByAuthUserId = bqlUser, CreatedAt = Utc(2026, 1, 1), UpdatedAt = Utc(2026, 1, 1) };
                var tplBaoTri= new NotificationTemplate { Name = "Thông báo bảo trì", Channel = "push", Subject = "Lịch bảo trì {system}", Body = "Hệ thống {system} sẽ bảo trì ngày {date}.", Variables = "[\"system\",\"date\"]", IsActive = true, CreatedByAuthUserId = bqlUser, CreatedAt = Utc(2026, 1, 1), UpdatedAt = Utc(2026, 1, 1) };
                var tplKhanCap = new NotificationTemplate { Name = "Cảnh báo khẩn cấp", Channel = "sms", Subject = null, Body = "CẢNH BÁO: {content}", Variables = "[\"content\"]", IsActive = true, CreatedByAuthUserId = bqlUser, CreatedAt = Utc(2026, 1, 1), UpdatedAt = Utc(2026, 1, 1) };
                var tplSuKien = new NotificationTemplate { Name = "Thông báo sự kiện", Channel = "push", Subject = "Sự kiện {name}", Body = "Mời cư dân tham gia {name} ngày {date}.", Variables = "[\"name\",\"date\"]", IsActive = true, CreatedByAuthUserId = bqlUser, CreatedAt = Utc(2026, 1, 1), UpdatedAt = Utc(2026, 1, 1) };
                var tplTiepNhan = new NotificationTemplate { Name = "Xác nhận tiếp nhận sự cố", Channel = "push", Subject = null, Body = "Sự cố \"{title}\" đã được tiếp nhận.", Variables = "[\"title\"]", IsActive = true, CreatedByAuthUserId = bqlUser, CreatedAt = Utc(2026, 1, 1), UpdatedAt = Utc(2026, 1, 1) };
                ctx.NotificationTemplates.AddRange(tplPhi, tplBaoTri, tplKhanCap, tplSuKien, tplTiepNhan);
                await ctx.SaveChangesAsync();

                var notifications = new List<Notification>();
                // Chiến dịch broadcast (đã gửi)
                for (int i = 0; i < 8; i++)
                {
                    var sent = Utc(2026, 6, 5).AddDays(i * 2);
                    notifications.Add(new Notification
                    {
                        Title = i % 2 == 0 ? "Nhắc nộp phí tháng 6" : "Thông báo bảo trì thang máy",
                        Content = i % 2 == 0 ? "Vui lòng nộp phí dịch vụ tháng 6 trước ngày 10." : "Thang máy sẽ bảo trì cuối tuần này.",
                        Channel = i % 2 == 0 ? "email" : "push", Audience = "all",
                        TemplateId = i % 2 == 0 ? tplPhi.Id : tplBaoTri.Id, Status = "sent",
                        TotalRecipients = 30, SentCount = 29, FailedCount = 1,
                        SentAt = sent, CreatedByAuthUserId = bqlUser, SendStatus = "SENT",
                        CreatedAt = sent.AddHours(-1), UpdatedAt = sent
                    });
                }
                // Thông báo cá nhân (individual inbox) gắn nguồn sự cố
                for (int i = 0; i < 6; i++)
                {
                    var inc = incidents[i];
                    notifications.Add(new Notification
                    {
                        Title = "Cập nhật sự cố của bạn", Content = $"Sự cố \"{inc.Title}\" đang được xử lý.",
                        Channel = "push", Audience = "owners", Status = "sent", TotalRecipients = 1, SentCount = 1,
                        SentAt = inc.CreatedAt.AddHours(2), CreatedByAuthUserId = bqlUser,
                        RecipientId = null, ReferenceType = "INCIDENT", ReferenceId = null,
                        Body = "Kỹ thuật viên đã tiếp nhận và đang xử lý sự cố của bạn.",
                        IsRead = i % 2 == 0, ReadAt = i % 2 == 0 ? inc.CreatedAt.AddHours(3) : (DateTime?)null,
                        SendStatus = "SENT", CreatedAt = inc.CreatedAt.AddHours(2), UpdatedAt = inc.CreatedAt.AddHours(2)
                    });
                }
                ctx.Notifications.AddRange(notifications);
                await ctx.SaveChangesAsync();

                // Log gửi cho 3 chiến dịch broadcast đầu × 6 cư dân
                foreach (var noti in notifications.Where(n => n.Audience == "all").Take(3))
                    foreach (var r in residents.Take(6))
                        ctx.NotificationLogs.Add(new NotificationLog
                        {
                            NotificationId = noti.Id, ResidentId = r.Id, Channel = noti.Channel,
                            Recipient = noti.Channel == "email" ? r.Email! : r.Phone,
                            Status = "delivered", SentAt = noti.SentAt, CreatedAt = noti.SentAt ?? noti.CreatedAt
                        });
                await ctx.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // NHÀ CUNG CẤP DỊCH VỤ — provider + listing + service request
                // ════════════════════════════════════════════════════════════
                var bizResidents = residents.Where(r => r.IsBusinessOwner).ToList();
                var providers = new List<Provider>();
                var provSpecs = new (string company, string contact, string phone, string cats, string status)[]
                {
                    ("Dịch vụ Sửa ống nước Minh Phát","Nguyễn Minh Phát","0933000001","[\"plumbing\"]","approved"),
                    ("Điện nước 24/7 Hoàng Gia","Trần Hoàng Gia","0933000002","[\"electrical\",\"plumbing\"]","approved"),
                    ("Vệ sinh công nghiệp Sạch Xanh","Lê Sạch Xanh","0933000003","[\"cleaning\"]","approved"),
                    ("Lắp đặt camera An Ninh Việt","Phạm An Ninh","0933000004","[\"camera\"]","approved"),
                    ("Cải tạo nội thất Nhà Đẹp","Vũ Nhà Đẹp","0933000005","[\"renovation\"]","pending"),
                    ("Sửa điều hòa Mát Lạnh","Đỗ Mát Lạnh","0933000006","[\"electrical\"]","approved"),
                    ("Diệt côn trùng An Toàn","Bùi An Toàn","0933000007","[\"other\"]","rejected"),
                    ("Giặt là Sạch Thơm","Hồ Sạch Thơm","0933000008","[\"other\"]","approved"),
                };
                for (int i = 0; i < provSpecs.Length; i++)
                {
                    var s = provSpecs[i];
                    bool approved = s.status == "approved";
                    providers.Add(new Provider
                    {
                        CompanyName = s.company, ContactName = s.contact, Phone = s.phone,
                        Email = $"provider{i + 1}@service.vn", Address = "TownHub Tower A",
                        ServiceCategories = s.cats,
                        ResidentId = i < bizResidents.Count ? bizResidents[i].Id : (int?)null,
                        RegistrationStatus = s.status,
                        RejectionReason = s.status == "rejected" ? "Thiếu giấy phép kinh doanh." : null,
                        ApprovedByAuthUserId = approved ? bqlUser : (int?)null,
                        ApprovedAt = approved ? Utc(2026, 3, 1).AddDays(i) : (DateTime?)null,
                        CreatedAt = Utc(2026, 2, 15).AddDays(i), UpdatedAt = Utc(2026, 3, 1).AddDays(i)
                    });
                }
                ctx.Providers.AddRange(providers);
                await ctx.SaveChangesAsync();

                var approvedProviders = providers.Where(p => p.RegistrationStatus == "approved").ToList();
                foreach (var p in approvedProviders)
                {
                    var cat = p.ServiceCategories!.Trim('[', ']', '"').Split("\",\"")[0];
                    ctx.ProviderServiceListings.Add(new ProviderServiceListing { ProviderId = p.Id, Name = $"{p.CompanyName} - Gói cơ bản", Category = cat, Description = "Dịch vụ theo yêu cầu, có bảo hành.", ContactPhone = p.Phone, ContactEmail = p.Email, PriceList = "[{\"name\":\"Gói cơ bản\",\"unit\":\"lần\",\"priceFrom\":200000,\"priceTo\":500000}]", Status = "approved", ApprovedByAuthUserId = bqlUser, ApprovedAt = p.ApprovedAt, CreatedAt = p.CreatedAt, UpdatedAt = p.UpdatedAt });
                    ctx.ProviderServiceListings.Add(new ProviderServiceListing { ProviderId = p.Id, Name = $"{p.CompanyName} - Gói cao cấp", Category = cat, Description = "Dịch vụ trọn gói, ưu tiên phản hồi nhanh.", ContactPhone = p.Phone, ContactEmail = p.Email, PriceList = "[{\"name\":\"Gói cao cấp\",\"unit\":\"lần\",\"priceFrom\":500000,\"priceTo\":1500000}]", Status = "approved", ApprovedByAuthUserId = bqlUser, ApprovedAt = p.ApprovedAt, CreatedAt = p.CreatedAt, UpdatedAt = p.UpdatedAt });
                }
                await ctx.SaveChangesAsync();

                // Yêu cầu dịch vụ (20) — cư dân đặt, gắn NCC & trạng thái luồng
                var srCats = new[] { "plumbing", "electrical", "cleaning", "renovation", "camera", "other" };
                var srStatus = new[] { "pending_provider", "accepted_by_provider", "in_progress", "completed", "rejected_by_provider" };
                for (int i = 0; i < 20; i++)
                {
                    var apt = occupied[i % occupied.Count];
                    var prov = approvedProviders[i % approvedProviders.Count];
                    var status = srStatus[i % srStatus.Length];
                    bool done = status == "completed";
                    var created = Utc(2026, 5, 1).AddDays(i);
                    ctx.ServiceRequests.Add(new ServiceRequest
                    {
                        Title = $"Yêu cầu dịch vụ #{i + 1}", Description = "Cư dân yêu cầu dịch vụ tại căn hộ.",
                        Category = srCats[i % srCats.Length], ApartmentId = apt.Id,
                        RequiresMgtApproval = i % 5 == 0, Status = status,
                        ProviderId = status == "pending_provider" ? (int?)null : prov.Id,
                        RequestedByAuthUserId = UidResident((i % 30) + 1),
                        ProviderRejectionReason = status == "rejected_by_provider" ? "NCC bận, không nhận thêm việc." : null,
                        ScheduledDate = created.AddDays(2), CompletedAt = done ? created.AddDays(3) : (DateTime?)null,
                        CreatedAt = created, UpdatedAt = created.AddDays(1)
                    });
                }
                await ctx.SaveChangesAsync();

                // ════════════════════════════════════════════════════════════
                // AUDIT LOGS (20) — hành động nghiệp vụ của nhân sự
                // ════════════════════════════════════════════════════════════
                var actions = new[] { ("SEND_NOTIFICATION", "Notification"), ("RESOLVE_INCIDENT", "Incident"), ("CREATE_FEE", "Fee"), ("APPROVE_PROVIDER", "Provider"), ("UPDATE_APARTMENT", "Apartment") };
                for (int i = 0; i < 20; i++)
                {
                    var act = actions[i % actions.Length];
                    ctx.AuditLogs.Add(new AuditLog
                    {
                        ActorAuthUserId = bqlUser, Action = act.Item1, TargetType = act.Item2, TargetId = i + 1,
                        IpAddress = "192.168.1." + (10 + i), UserAgent = "Mozilla/5.0 (TownHub Admin)",
                        CreatedAt = Utc(2026, 6, 1).AddDays(i)
                    });
                }
                await ctx.SaveChangesAsync();

                await tx.CommitAsync();
            });

            logger.LogInformation("[BaseSeeder] Seeding Base/TownHub hoàn tất — toà nhà/căn hộ/cư dân/phí/sự cố/thông báo/NCC đầy đủ và liên kết.");
        }
    }
}
