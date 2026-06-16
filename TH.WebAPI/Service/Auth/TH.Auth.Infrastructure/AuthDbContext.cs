using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.MFA;
using TH.Auth.Domain.Role;
using TH.Auth.Domain.Token;
using TH.Auth.Domain.User;

namespace TH.Auth.Infrastructure
{
    public class AuthDbContext : DbContext
    {
        public DbSet<AuthUser> authUsers { get; set; }
        public DbSet<AuthProfile> authProfiles { get; set; }
        public DbSet<AuthPermission> authPermissions { get; set; }
        public DbSet<AuthRole> authRoles { get; set; }
        public DbSet<AuthUserRole> authUserRoles { get; set; }
        public DbSet<AuthRolePermission> authRolePermissions { get; set; }
        public DbSet<AuthRefreshToken> authRefreshTokens { get; set; }
        public DbSet<AuthEmailVerification> authEmailVerifications { get; set; }
        public DbSet<AuthPasswordReset> authPasswordResets { get; set; }
        public DbSet<AuthMfaSecret> authMfaSecrets { get; set; }
        public DbSet<AuthAuditLog> authAuditLogs { get; set; }
        public DbSet<AuthUserSession> authUserSessions { get; set; }

        //public DbSet<Plan> plans { get; set; }
        //public DbSet<Price> prices { get; set; }
        //public DbSet<UserSubscription> userSubscriptions { get; set; }
        //public DbSet<Order> orders { get; set; }
        //public DbSet<Invoice> invoices { get; set; }
        //public DbSet<Payment> payments { get; set; }

        public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ====== AUTH CORE CONFIGURATION ======
            modelBuilder.Entity<AuthUser>().HasOne(u => u.profile).WithOne(p => p.user).HasForeignKey<AuthProfile>(p => p.userID);
            modelBuilder.Entity<AuthUser>().HasMany(u => u.userRoles).WithOne(ur => ur.user).HasForeignKey(ur => ur.userID);
            modelBuilder.Entity<AuthUser>().HasMany(u => u.auditLogs).WithOne(al => al.user).HasForeignKey(al => al.userID);
            modelBuilder.Entity<AuthUser>().HasOne(u => u.mfaSecret).WithOne(ms => ms.user).HasForeignKey<AuthMfaSecret>(ms => ms.userID);
            modelBuilder.Entity<AuthUser>().HasMany(u => u.sessions).WithOne(s => s.user).HasForeignKey(s => s.userID);
            modelBuilder.Entity<AuthUser>().HasMany(u => u.emailVerifications).WithOne(ev => ev.user).HasForeignKey(ev => ev.userID);
            modelBuilder.Entity<AuthUser>().HasMany(u => u.passwordResets).WithOne(pr => pr.user).HasForeignKey(pr => pr.userID);
            modelBuilder.Entity<AuthUser>().HasMany(u => u.refreshTokens).WithOne(rt => rt.user).HasForeignKey(rt => rt.userID).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<AuthUserSession>().HasMany(s => s.refreshTokens).WithOne(rt => rt.session).HasForeignKey(rt => rt.sessionID).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<AuthRole>().HasMany(r => r.userRoles).WithOne(ur => ur.role).HasForeignKey(ur => ur.roleID);
            modelBuilder.Entity<AuthRole>().HasMany(r => r.rolePermissions).WithOne(rp => rp.role).HasForeignKey(rp => rp.roleID);
            //modelBuilder.Entity<AuthRole>().HasMany(p => p.plans).WithOne(rp => rp.role).HasForeignKey(rp => rp.roleID);

            modelBuilder.Entity<AuthUserRole>(b =>
            {
                b.ToTable("AuthUserRole", "auth");
                b.HasKey(x => new { x.userID, x.roleID });
                b.Property(x => x.assignedAt).HasColumnType("timestamp with time zone");
            });

            modelBuilder.Entity<AuthPermission>().HasMany(p => p.rolePermissions).WithOne(rp => rp.permission).HasForeignKey(rp => rp.permissionID);

            //// ====== BILLING CONFIGURATION ======
            //modelBuilder.Entity<Plan>(e =>
            //{
            //    e.HasKey(x => x.planID); e.HasIndex(x => x.code).IsUnique(); e.Property(x => x.name).HasMaxLength(128);
            //    e.HasMany(x => x.prices).WithOne(p => p.plan).HasForeignKey(p => p.planID).OnDelete(DeleteBehavior.Restrict);
            //});
            //modelBuilder.Entity<Price>(e =>
            //{
            //    e.HasKey(x => x.priceID); e.HasIndex(x => new { x.planID, x.currency, x.intervalUnit, x.intervalCount }).IsUnique();
            //    e.Property(x => x.amount).HasColumnType("decimal(18,2)"); e.Property(x => x.intervalUnit).HasMaxLength(16);
            //});
            //modelBuilder.Entity<UserSubscription>(e =>
            //{
            //    e.HasKey(x => x.subscriptionID);
            //    e.HasOne(x => x.user).WithMany(u => u.subscriptions).HasForeignKey(x => x.userID).OnDelete(DeleteBehavior.Restrict);
            //    e.HasOne(x => x.plan).WithMany().HasForeignKey(x => x.planID).OnDelete(DeleteBehavior.Restrict);
            //    e.HasOne(x => x.price).WithMany().HasForeignKey(x => x.priceID).OnDelete(DeleteBehavior.SetNull);
            //    e.HasIndex(x => new { x.userID, x.planID, x.status }); e.HasIndex(x => x.currentPeriodEnd);
            //});
            //modelBuilder.Entity<Order>(e =>
            //{
            //    e.HasKey(x => x.orderID); e.Property(x => x.amount).HasColumnType("decimal(18,2)");
            //    e.HasOne(x => x.user).WithMany(u => u.orders).HasForeignKey(x => x.userID).OnDelete(DeleteBehavior.Cascade);
            //    e.HasOne(x => x.plan).WithMany(p => p.orders).HasForeignKey(x => x.planID).IsRequired().OnDelete(DeleteBehavior.Restrict);
            //    e.HasOne(x => x.price).WithMany(p => p.orders).HasForeignKey(x => x.priceID).IsRequired().OnDelete(DeleteBehavior.Restrict);
            //    e.HasIndex(x => new { x.provider, x.providerSessionId }).IsUnique();
            //});
            //modelBuilder.Entity<Invoice>(e =>
            //{
            //    e.HasKey(x => x.invoiceID);
            //    e.HasOne(x => x.user).WithMany(u => u.invoices).HasForeignKey(x => x.userID).OnDelete(DeleteBehavior.NoAction);
            //    e.HasOne(x => x.subscription).WithMany(s => s.invoices).HasForeignKey(x => x.subscriptionID).OnDelete(DeleteBehavior.SetNull);
            //    e.HasOne(x => x.order).WithMany(o => o.invoices).HasForeignKey(x => x.orderID).OnDelete(DeleteBehavior.SetNull);
            //    e.HasIndex(x => new { x.userID, x.issuedAt });
            //});
            //modelBuilder.Entity<Payment>(e =>
            //{
            //    e.HasKey(x => x.paymentID);
            //    e.HasOne(x => x.invoice).WithMany(i => i.payments).HasForeignKey(x => x.invoiceID).OnDelete(DeleteBehavior.Cascade);
            //    e.HasIndex(x => new { x.provider, x.providerPaymentId }).IsUnique(false);
            //});

            // ====== UTC CONVERTERS ======
            var utcDateTimeConverter = new ValueConverter<DateTime, DateTime>(v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(), v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
            var utcNullableDateTimeConverter = new ValueConverter<DateTime?, DateTime?>(v => v == null ? (DateTime?)null : (v.Value.Kind == DateTimeKind.Utc ? v.Value : v.Value.ToUniversalTime()), v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var prop in entity.GetProperties())
                {
                    if (prop.ClrType == typeof(DateTime)) prop.SetValueConverter(utcDateTimeConverter);
                    if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcNullableDateTimeConverter);
                }
            }

            // =========================================================
            // ====== STATIC SEED DATA (Dữ liệu tĩnh, ít thay đổi) ======
            // =========================================================

            // Seed Plans & Prices
            //modelBuilder.Entity<Plan>().HasData(new Plan { planID = 1, code = "VIP", name = "Gói VIP", description = "Quyền lợi VIP", isActive = true, roleID = 11 });
            //modelBuilder.Entity<Price>().HasData(
            //    new Price { priceID = 101, planID = 1, currency = "VND", amount = 99000m, intervalUnit = "month", intervalCount = 1, isActive = true },
            //    new Price { priceID = 102, planID = 1, currency = "VND", amount = 249000m, intervalUnit = "month", intervalCount = 3, isActive = true },
            //    new Price { priceID = 103, planID = 1, currency = "VND", amount = 459000m, intervalUnit = "month", intervalCount = 6, isActive = true }
            //);

            // Seed Auth Roles
            modelBuilder.Entity<AuthRole>(e =>
            {
                e.HasKey(r => r.roleID); e.Property(r => r.roleName).HasMaxLength(100).IsRequired(); e.Property(r => r.roleDescription).HasMaxLength(255); e.HasIndex(r => r.roleName).IsUnique();
                e.HasData(
                    new AuthRole { roleID = 1, roleName = "admin", roleDescription = "Quản trị viên", scope = "staff", isDefault = false },
                    new AuthRole { roleID = 2, roleName = "content_manager", roleDescription = "Quản lý nội dung", scope = "staff", isDefault = false },
                    new AuthRole { roleID = 3, roleName = "user_manager", roleDescription = "Quản lý người dùng", scope = "staff", isDefault = false },
                    new AuthRole { roleID = 4, roleName = "finance_manager", roleDescription = "Quản lý tài chính", scope = "staff", isDefault = false },
                    new AuthRole { roleID = 10, roleName = "customer", roleDescription = "Khách hàng", scope = "user", isDefault = true },
                    new AuthRole { roleID = 11, roleName = "customer-vip", roleDescription = "Khách hàng VIP", scope = "user", isDefault = false }
                );
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}
