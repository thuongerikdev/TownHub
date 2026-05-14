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
            modelBuilder.SeedData();
        }
    }
}
