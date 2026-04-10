using Microsoft.EntityFrameworkCore;
using TH.TownHub.Domain.Entities;

namespace TH.TownHub.Infrastructure.Database
{
    public class TownHubDbContext : DbContext
    {
        public DbSet<Apartment> Apartments { get; set; }
        public DbSet<Resident> Residents { get; set; }
        public DbSet<NotificationTemplate> NotificationTemplates { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<NotificationLog> NotificationLogs { get; set; }
        public DbSet<Incident> Incidents { get; set; }
        public DbSet<IncidentComment> IncidentComments { get; set; }
        public DbSet<FeeType> FeeTypes { get; set; }
        public DbSet<Fee> Fees { get; set; }
        public DbSet<SystemConfig> SystemConfigs { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<FileStorage> FileStorages { get; set; }

        public TownHubDbContext(DbContextOptions<TownHubDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ── Unique indexes ──
            modelBuilder.Entity<Apartment>()
                .HasIndex(x => x.Code).IsUnique();
            modelBuilder.Entity<Apartment>()
                .HasIndex(x => new { x.Building, x.Floor, x.UnitNumber }).IsUnique();

            modelBuilder.Entity<Resident>()
                .HasIndex(x => x.IdCard).IsUnique()
                .HasFilter($"\"{nameof(Resident.IdCard)}\" IS NOT NULL");

            modelBuilder.Entity<NotificationTemplate>()
                .HasIndex(x => x.Name).IsUnique();

            modelBuilder.Entity<SystemConfig>()
                .HasIndex(x => x.Key).IsUnique();

            modelBuilder.Entity<FileStorage>()
                .HasIndex(x => x.StorageKey).IsUnique();

            // ── Fee: unique per apartment + fee_type + billing_month ──
            modelBuilder.Entity<Fee>()
                .HasIndex(x => new { x.ApartmentId, x.FeeTypeId, x.BillingMonth }).IsUnique();

            // ── Decimal precision ──
            modelBuilder.Entity<Apartment>()
                .Property(x => x.AreaM2).HasColumnType("numeric(6,2)");
            modelBuilder.Entity<Fee>()
                .Property(x => x.Amount).HasColumnType("numeric(14,0)");
            modelBuilder.Entity<FeeType>()
                .Property(x => x.UnitPrice).HasColumnType("numeric(14,0)");

            // ── Seed SystemConfig ──
            modelBuilder.Entity<SystemConfig>().HasData(
                new SystemConfig { Id = 1, Key = "project_name", Value = "TownHub", DataType = "string", Description = "Tên dự án hiển thị", IsPublic = true },
                new SystemConfig { Id = 2, Key = "project_code", Value = "LUX_RES_01", DataType = "string", Description = "Mã dự án (bất biến)", IsPublic = false },
                new SystemConfig { Id = 3, Key = "support_email", Value = "support@TownHub.vn", DataType = "string", Description = "Email hỗ trợ BQL", IsPublic = true },
                new SystemConfig { Id = 4, Key = "hotline", Value = "1900 1234", DataType = "string", Description = "Hotline liên hệ", IsPublic = true },
                new SystemConfig { Id = 5, Key = "maintenance_mode", Value = "false", DataType = "boolean", Description = "Bật/tắt chế độ bảo trì", IsPublic = false },
                new SystemConfig { Id = 6, Key = "sms_gateway", Value = "ESMS", DataType = "string", Description = "Nhà cung cấp SMS", IsPublic = false },
                new SystemConfig { Id = 7, Key = "payment_gateways", Value = "VNPay,MoMo", DataType = "string", Description = "Cổng thanh toán hỗ trợ", IsPublic = false },
                new SystemConfig { Id = 8, Key = "max_notification_daily", Value = "50", DataType = "integer", Description = "Giới hạn thông báo/ngày", IsPublic = false },
                new SystemConfig { Id = 9, Key = "storage_provider", Value = "AWS S3", DataType = "string", Description = "Nơi lưu trữ file", IsPublic = false },
                new SystemConfig { Id = 10, Key = "session_timeout_min", Value = "30", DataType = "integer", Description = "Timeout phiên đăng nhập (phút)", IsPublic = false }
            );

            // ── Seed FeeType ──
            modelBuilder.Entity<FeeType>().HasData(
                new FeeType { Id = 1, Name = "Phí quản lý", Description = "Phí quản lý hàng tháng", UnitPrice = 800000, IsPerM2 = false, IsActive = true },
                new FeeType { Id = 2, Name = "Phí dịch vụ", Description = "Phí dịch vụ tiện ích", UnitPrice = 500000, IsPerM2 = false, IsActive = true },
                new FeeType { Id = 3, Name = "Phí gửi xe", Description = "Phí giữ xe hàng tháng", UnitPrice = 300000, IsPerM2 = false, IsActive = true },
                new FeeType { Id = 4, Name = "Phí vệ sinh", Description = "Phí vệ sinh chung cư", UnitPrice = 50000, IsPerM2 = false, IsActive = true }
            );
        }
    }
}
