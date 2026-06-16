using Microsoft.EntityFrameworkCore;
using System;
using TH.TownHub.Domain.Entities;

namespace TH.TownHub.Infrastructure.Database
{
    public static class ModelBuilderExtensions
    {
        public static void SeedData(this ModelBuilder modelBuilder)
        {
            // Cố định thời gian để tránh lỗi sinh migration liên tục
            var seedDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            // ==========================================
            // 0. SYSTEM CONFIGS
            // ==========================================
            modelBuilder.Entity<SystemConfig>().HasData(
                new SystemConfig { Id = 1, Key = "project_name", Value = "TownHub", DataType = "string", Description = "Tên dự án hiển thị", IsPublic = true, UpdatedAt = seedDate },
                new SystemConfig { Id = 2, Key = "project_code", Value = "LUX_RES_01", DataType = "string", Description = "Mã dự án (bất biến)", IsPublic = false, UpdatedAt = seedDate },
                new SystemConfig { Id = 3, Key = "support_email", Value = "support@TownHub.vn", DataType = "string", Description = "Email hỗ trợ BQL", IsPublic = true, UpdatedAt = seedDate },
                new SystemConfig { Id = 4, Key = "hotline", Value = "1900 1234", DataType = "string", Description = "Hotline liên hệ", IsPublic = true, UpdatedAt = seedDate },
                new SystemConfig { Id = 5, Key = "maintenance_mode", Value = "false", DataType = "boolean", Description = "Bật/tắt chế độ bảo trì", IsPublic = false, UpdatedAt = seedDate }
            );

            // ==========================================
            // 1. FEE TYPES (BẮT BUỘC PHẢI CÓ TRƯỚC BẢNG FEES)
            // ==========================================
            modelBuilder.Entity<FeeType>().HasData(
                new FeeType { Id = 1, Name = "Phí quản lý", Description = "Phí quản lý hàng tháng", UnitPrice = 800000, IsPerM2 = false, IsActive = true, CreatedAt = seedDate },
                new FeeType { Id = 2, Name = "Phí dịch vụ", Description = "Phí dịch vụ tiện ích", UnitPrice = 500000, IsPerM2 = false, IsActive = true, CreatedAt = seedDate },
                new FeeType { Id = 3, Name = "Phí gửi xe", Description = "Phí giữ xe hàng tháng", UnitPrice = 300000, IsPerM2 = false, IsActive = true, CreatedAt = seedDate },
                new FeeType { Id = 4, Name = "Phí vệ sinh", Description = "Phí vệ sinh chung cư", UnitPrice = 50000, IsPerM2 = false, IsActive = true, CreatedAt = seedDate }
            );

            // ==========================================
            // 2. APARTMENTS (10 Căn hộ mẫu)
            // ==========================================
            modelBuilder.Entity<Apartment>().HasData(
                new Apartment { Id = 1, Code = "A0101", Building = "Tòa A", Floor = 1, UnitNumber = "01", Type = "2PN", AreaM2 = 70.5m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 2, Code = "A0102", Building = "Tòa A", Floor = 1, UnitNumber = "02", Type = "3PN", AreaM2 = 95.0m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 3, Code = "A0201", Building = "Tòa A", Floor = 2, UnitNumber = "01", Type = "1PN", AreaM2 = 45.0m, Status = "vacant", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 4, Code = "A0202", Building = "Tòa A", Floor = 2, UnitNumber = "02", Type = "Studio", AreaM2 = 35.0m, Status = "maintenance", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 5, Code = "B0101", Building = "Tòa B", Floor = 1, UnitNumber = "01", Type = "3PN", AreaM2 = 110.0m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 6, Code = "B0102", Building = "Tòa B", Floor = 1, UnitNumber = "02", Type = "2PN", AreaM2 = 68.0m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 7, Code = "V0001", Building = "Villa", Floor = 1, UnitNumber = "01", Type = "Villa", AreaM2 = 250.0m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 8, Code = "V0002", Building = "Villa", Floor = 1, UnitNumber = "02", Type = "Villa", AreaM2 = 300.0m, Status = "vacant", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 9, Code = "A0505", Building = "Tòa A", Floor = 5, UnitNumber = "05", Type = "2PN", AreaM2 = 72.0m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate },
                new Apartment { Id = 10, Code = "B1201", Building = "Tòa B", Floor = 12, UnitNumber = "01", Type = "Penthouse", AreaM2 = 180.0m, Status = "occupied", CreatedAt = seedDate, UpdatedAt = seedDate }
            );

            // ==========================================
            // 3. RESIDENTS (Chủ hộ và thành viên gia đình)
            // ==========================================
            modelBuilder.Entity<Resident>().HasData(
                new Resident { Id = 1, FullName = "Nguyễn Văn Tuấn", Phone = "0901111222", Email = "tuan.nv@gmail.com", IdCard = "001090123456", DateOfBirth = new DateTime(1990, 5, 10, 0, 0, 0, DateTimeKind.Utc), Gender = "male", ApartmentId = 1, IsOwner = true, MoveInDate = seedDate, AuthUserId = 101, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Resident { Id = 2, FullName = "Trần Thị Mai", Phone = "0902222333", Email = "mai.tt@gmail.com", IdCard = "001092654321", DateOfBirth = new DateTime(1992, 8, 15, 0, 0, 0, DateTimeKind.Utc), Gender = "female", ApartmentId = 1, IsOwner = false, MoveInDate = seedDate, AuthUserId = 102, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Resident { Id = 3, FullName = "Lê Hoàng Bách", Phone = "0903333444", Email = "bach.lh@gmail.com", IdCard = "001085112233", DateOfBirth = new DateTime(1985, 2, 20, 0, 0, 0, DateTimeKind.Utc), Gender = "male", ApartmentId = 2, IsOwner = true, MoveInDate = seedDate, AuthUserId = 103, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Resident { Id = 4, FullName = "Phạm Quang Hưng", Phone = "0904444555", Email = "hung.pq@gmail.com", IdCard = "001080998877", DateOfBirth = new DateTime(1980, 11, 5, 0, 0, 0, DateTimeKind.Utc), Gender = "male", ApartmentId = 5, IsOwner = true, MoveInDate = seedDate, AuthUserId = 104, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Resident { Id = 5, FullName = "Đặng Thu Thảo", Phone = "0905555666", Email = "thao.dt@gmail.com", IdCard = "001095334455", DateOfBirth = new DateTime(1995, 1, 25, 0, 0, 0, DateTimeKind.Utc), Gender = "female", ApartmentId = 6, IsOwner = true, MoveInDate = seedDate, AuthUserId = 105, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Resident { Id = 6, FullName = "Vũ Đình Phong", Phone = "0906666777", Email = "phong.vd@gmail.com", IdCard = "001078556677", DateOfBirth = new DateTime(1978, 12, 12, 0, 0, 0, DateTimeKind.Utc), Gender = "male", ApartmentId = 7, IsOwner = true, MoveInDate = seedDate, AuthUserId = 106, CreatedAt = seedDate, UpdatedAt = seedDate }
            );

            // ==========================================
            // 4. NOTIFICATION TEMPLATES
            // ==========================================
            modelBuilder.Entity<NotificationTemplate>().HasData(
                new NotificationTemplate { Id = 1, Name = "Nhắc đóng phí tháng", Channel = "push", Subject = "Nhắc nhở thanh toán phí {month}", Body = "Kính gửi {resident_name}, vui lòng thanh toán phí dịch vụ tháng {month} trước ngày {due_date}.", Variables = "[\"resident_name\",\"month\",\"due_date\"]", IsActive = true, CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate },
                new NotificationTemplate { Id = 2, Name = "Bảo trì thang máy", Channel = "push", Subject = "Thông báo bảo trì thang máy {building}", Body = "Kính gửi quý cư dân, BQL xin thông báo bảo trì thang máy tòa {building} vào lúc {time}.", Variables = "[\"building\",\"time\"]", IsActive = true, CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate }
            );

            // ==========================================
            // 5. NOTIFICATIONS
            // ==========================================
            modelBuilder.Entity<Notification>().HasData(
                new Notification { Id = 1, Title = "Bảo trì thang máy Tòa A", Content = "Bảo trì thang số 1 từ 22h-24h ngày 15/05.", Channel = "push", Audience = "building_a", TemplateId = 2, Status = "sent", TotalRecipients = 50, SentCount = 50, FailedCount = 0, SentAt = seedDate, CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Notification { Id = 2, Title = "Nhắc nợ phí tháng 5", Content = "Vui lòng thanh toán phí quản lý tháng 5.", Channel = "push", Audience = "all", TemplateId = 1, Status = "scheduled", TotalRecipients = 200, SentCount = 0, ScheduledAt = seedDate.AddDays(15), CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate }
            );

            // ==========================================
            // 6. NOTIFICATION LOGS
            // ==========================================
            modelBuilder.Entity<NotificationLog>().HasData(
                new NotificationLog { Id = 1, NotificationId = 1, ResidentId = 1, Channel = "push", Recipient = "device_token_abc123", Status = "delivered", SentAt = seedDate, CreatedAt = seedDate },
                new NotificationLog { Id = 2, NotificationId = 1, ResidentId = 2, Channel = "push", Recipient = "device_token_xyz789", Status = "delivered", SentAt = seedDate, CreatedAt = seedDate }
            );

            // ==========================================
            // 7. INCIDENTS (Sự cố)
            // ==========================================
            modelBuilder.Entity<Incident>().HasData(
                new Incident { Id = 1, Title = "Bóng đèn hành lang tầng 1 hỏng", Description = "Bóng đèn trước cửa căn A0101 bị cháy.", Location = "Hành lang Tòa A Tầng 1", ApartmentId = 1, Category = "electrical", Priority = "low", Status = "resolved", ReportedByAuthUserId = 101, AssignedToAuthUserId = 201, ResolvedAt = seedDate.AddDays(1), ResolutionNote = "Đã thay bóng mới.", CreatedAt = seedDate, UpdatedAt = seedDate.AddDays(1) },
                new Incident { Id = 2, Title = "Thấm nước trần nhà vệ sinh", Description = "Trần nhà vệ sinh master bị thấm nước từ tầng trên.", Location = "WC Master", ApartmentId = 5, Category = "plumbing", Priority = "high", Status = "in_progress", ReportedByAuthUserId = 104, AssignedToAuthUserId = 202, CreatedAt = seedDate.AddDays(2), UpdatedAt = seedDate.AddDays(2) },
                new Incident { Id = 3, Title = "Mất thẻ từ thang máy", Description = "Tôi làm rơi thẻ từ, cần cấp lại thẻ mới.", Location = "Lễ tân", ApartmentId = 2, Category = "security", Priority = "medium", Status = "open", ReportedByAuthUserId = 103, CreatedAt = seedDate.AddDays(3), UpdatedAt = seedDate.AddDays(3) }
            );

            // ==========================================
            // 8. INCIDENT COMMENTS
            // ==========================================
            modelBuilder.Entity<IncidentComment>().HasData(
                new IncidentComment { Id = 1, IncidentId = 1, AuthorAuthUserId = 201, Content = "Đã tiếp nhận và cho kỹ thuật viên qua kiểm tra.", CreatedAt = seedDate.AddHours(2) },
                new IncidentComment { Id = 2, IncidentId = 2, AuthorAuthUserId = 202, Content = "Đang liên hệ căn hộ tầng trên để khóa van nước tạm thời.", CreatedAt = seedDate.AddDays(2).AddHours(1) },
                new IncidentComment { Id = 3, IncidentId = 2, AuthorAuthUserId = 104, Content = "Mong BQL xử lý nhanh giúp, nước chảy nhiều quá.", CreatedAt = seedDate.AddDays(2).AddHours(2) }
            );

            // ==========================================
            // 9. FEES (Hóa đơn)
            // ==========================================
            modelBuilder.Entity<Fee>().HasData(
                // Căn A0101
                new Fee { Id = 1, ApartmentId = 1, FeeTypeId = 1, BillingMonth = "2024-01", Amount = 800000, DueDate = seedDate.AddDays(15), Status = "paid", PaidAt = seedDate.AddDays(5), PaymentMethod = "VNPay", PaymentRef = "VNP123456", Note = "Thanh toán đúng hạn", CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate.AddDays(5) },
                new Fee { Id = 2, ApartmentId = 1, FeeTypeId = 3, BillingMonth = "2024-01", Amount = 300000, DueDate = seedDate.AddDays(15), Status = "paid", PaidAt = seedDate.AddDays(5), PaymentMethod = "VNPay", PaymentRef = "VNP123457", CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate.AddDays(5) },

                // Căn B0101 (Đang nợ)
                new Fee { Id = 3, ApartmentId = 5, FeeTypeId = 1, BillingMonth = "2024-01", Amount = 1200000, DueDate = seedDate.AddDays(15), Status = "unpaid", CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate },
                new Fee { Id = 4, ApartmentId = 5, FeeTypeId = 2, BillingMonth = "2024-01", Amount = 500000, DueDate = seedDate.AddDays(15), Status = "unpaid", CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate },

                // Căn Villa
                new Fee { Id = 5, ApartmentId = 7, FeeTypeId = 1, BillingMonth = "2024-01", Amount = 5000000, DueDate = seedDate.AddDays(15), Status = "paid", PaidAt = seedDate.AddDays(2), PaymentMethod = "Bank Transfer", PaymentRef = "VCB999888", CreatedByAuthUserId = 1, CreatedAt = seedDate, UpdatedAt = seedDate.AddDays(2) }
            );

            // ==========================================
            // 10. AUDIT LOGS
            // ==========================================
            modelBuilder.Entity<AuditLog>().HasData(
                new AuditLog { Id = 1, ActorAuthUserId = 1, Action = "CREATE_NOTIFICATION", TargetType = "Notification", TargetId = 1, NewData = "{\"Title\":\"Bảo trì thang máy Tòa A\"}", IpAddress = "192.168.1.10", UserAgent = "Chrome/120.0.0", CreatedAt = seedDate },
                new AuditLog { Id = 2, ActorAuthUserId = 201, Action = "RESOLVE_INCIDENT", TargetType = "Incident", TargetId = 1, OldData = "{\"Status\":\"open\"}", NewData = "{\"Status\":\"resolved\"}", IpAddress = "192.168.1.15", UserAgent = "TownHubStaffApp/1.0", CreatedAt = seedDate.AddDays(1) },
                new AuditLog { Id = 3, ActorAuthUserId = 101, Action = "PAY_FEE", TargetType = "Fee", TargetId = 1, OldData = "{\"Status\":\"unpaid\"}", NewData = "{\"Status\":\"paid\"}", IpAddress = "113.190.23.45", UserAgent = "TownHubResidentApp/1.0", CreatedAt = seedDate.AddDays(5) }
            );

            // ==========================================
            // 11. FILES (Quản lý file đính kèm)
            // ==========================================
            modelBuilder.Entity<FileStorage>().HasData(
                new FileStorage { Id = 1, OriginalName = "bong_den_hong.jpg", StorageKey = "incidents/2024/01/bong_den_hong_abc123.jpg", Url = "https://townhub-s3.amazonaws.com/incidents/2024/01/bong_den_hong_abc123.jpg", MimeType = "image/jpeg", SizeBytes = 1024500, EntityType = "incident", EntityId = 1, UploadedByAuthUserId = 101, CreatedAt = seedDate },
                new FileStorage { Id = 2, OriginalName = "tran_nha_tham.png", StorageKey = "incidents/2024/01/tran_nha_tham_xyz789.png", Url = "https://townhub-s3.amazonaws.com/incidents/2024/01/tran_nha_tham_xyz789.png", MimeType = "image/png", SizeBytes = 3500200, EntityType = "incident", EntityId = 2, UploadedByAuthUserId = 104, CreatedAt = seedDate.AddDays(2) },
                new FileStorage { Id = 3, OriginalName = "avatar_tuan.jpg", StorageKey = "avatars/101/avatar_tuan.jpg", Url = "https://townhub-s3.amazonaws.com/avatars/101/avatar_tuan.jpg", MimeType = "image/jpeg", SizeBytes = 500000, EntityType = "resident", EntityId = 1, UploadedByAuthUserId = 101, CreatedAt = seedDate }
            );
        }
    }
}