using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using TH.Constant.Database;
using TH.Asset.Infrastructure.Database;
using TH.Asset.ApplicationService.Service.Core;
using TH.Asset.ApplicationService.Service.Maintenance;
using TH.Asset.ApplicationService.Service.Incident;
using TH.Asset.ApplicationService.Service.Inventory;
using TH.Asset.ApplicationService.Service.Vendor;
using TH.Asset.ApplicationService.Service.System;

namespace TH.Asset.ApplicationService.StartUp
{
    public static class AssetStartUp
    {
        // ════════════════════════════════════════════════════════════════════
        // Helper: chuẩn hóa connection string
        //   • Nếu là URL (postgres:// / postgresql://) → chuyển sang KV-form
        //   • Nếu đã là KV-form → đảm bảo có SSL Mode & Trust Server Certificate
        // ════════════════════════════════════════════════════════════════════
        private static string NormalizePg(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return raw;
            raw = raw.Trim();

            bool IsUrl(string s) =>
                s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

            if (IsUrl(raw))
            {
                var uri = new Uri(raw);

                string? user = null, pass = null;
                if (!string.IsNullOrEmpty(uri.UserInfo))
                {
                    var parts = uri.UserInfo.Split(':', 2);
                    user = Uri.UnescapeDataString(parts[0]);
                    if (parts.Length == 2) pass = Uri.UnescapeDataString(parts[1]);
                }

                var db   = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/'));
                var port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port;

                var qs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
                {
                    var kv = pair.Split('=', 2);
                    var k  = Uri.UnescapeDataString(kv[0]);
                    var v  = kv.Length == 2 ? Uri.UnescapeDataString(kv[1]) : "";
                    qs[k] = v;
                }

                var sslMode = qs.TryGetValue("sslmode", out var s) ? s : "require";
                var channel = qs.TryGetValue("channel_binding", out var cb) ? cb : null;

                var sb = new StringBuilder();
                sb.Append($"Host={uri.Host};Port={port};Database={db};Username={user};");
                if (!string.IsNullOrEmpty(pass)) sb.Append($"Password={pass};");
                sb.Append($"SSL Mode={sslMode};Trust Server Certificate=true;");
                if (!string.IsNullOrEmpty(channel)) sb.Append($"Channel Binding={channel};");

                return sb.ToString();
            }

            // KV-form: đảm bảo có SSL Mode & TrustServerCertificate
            if (!raw.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase))
                raw += (raw.EndsWith(";") ? "" : ";") + "SSL Mode=Require";
            if (!raw.Contains("Trust Server Certificate", StringComparison.OrdinalIgnoreCase))
                raw += (raw.EndsWith(";") ? "" : ";") + "Trust Server Certificate=true";

            return raw;
        }

        // ════════════════════════════════════════════════════════════════════
        // ConfigureAsset — đăng ký DbContext + tất cả Application Service
        //   assemblyName: tên assembly chứa EF Migrations (thường là project API)
        // ════════════════════════════════════════════════════════════════════
        public static void ConfigureAsset(this WebApplicationBuilder builder, string? assemblyName = null)
        {
            // ── PostgreSQL / AssetDbContext ───────────────────────────────
            builder.Services.AddDbContext<AssetDbContext>(options =>
            {
                var raw =
                    builder.Configuration.GetConnectionString("AssetDb")       // ưu tiên key riêng
                    ?? builder.Configuration.GetConnectionString("Default")     // fallback key chung
                    ?? Environment.GetEnvironmentVariable("ASSET_DATABASE_URL") // env var riêng
                    ?? Environment.GetEnvironmentVariable("DATABASE_URL")       // env var chung
                    ?? throw new InvalidOperationException(
                        "Thiếu connection string cho Asset module. " +
                        "Cấu hình 'AssetDb' hoặc 'Default' trong appsettings.json, " +
                        "hoặc biến môi trường ASSET_DATABASE_URL / DATABASE_URL.");

                var conn = NormalizePg(raw);

                options.UseNpgsql(conn, npg =>
                {
                    if (!string.IsNullOrWhiteSpace(assemblyName))
                        npg.MigrationsAssembly(assemblyName);

                    // Migration history lưu trong schema "asset"
                    npg.MigrationsHistoryTable(
                        DbSchema.TableMigrationsHistory,
                        DbSchema.Asset);

                    npg.EnableRetryOnFailure();
                });
            }, ServiceLifetime.Scoped);

            // ── APPLICATION SERVICES (DI) ─────────────────────────────────

            // ── Core ──
            builder.Services.AddScoped<IAssetService,              AssetService>();
            builder.Services.AddScoped<IAssetCategoryService,      AssetCategoryService>();
            builder.Services.AddScoped<IAssetLocationService,      AssetLocationService>();
            builder.Services.AddScoped<IAssetQrCodeService,        AssetQrCodeService>();
            builder.Services.AddScoped<IAssetTransferService,      AssetTransferService>();
            builder.Services.AddScoped<IAssetDepreciationService,  AssetDepreciationService>();

            // ── Maintenance ──
            builder.Services.AddScoped<IChecklistTemplateService,  ChecklistTemplateService>();
            builder.Services.AddScoped<IMaintenanceScheduleService,MaintenanceScheduleService>();
            builder.Services.AddScoped<IWorkOrderService,          WorkOrderService>();

            // ── Incident ──
            builder.Services.AddScoped<ISlaConfigService,          SlaConfigService>();
            builder.Services.AddScoped<ITicketService,             TicketService>();

            // ── Inventory ──
            builder.Services.AddScoped<IWarehouseService,          WarehouseService>();
            builder.Services.AddScoped<IMaterialService,           MaterialService>();
            builder.Services.AddScoped<IInventoryTransactionService,InventoryTransactionService>();
            builder.Services.AddScoped<IPurchaseRequestService,    PurchaseRequestService>();
            builder.Services.AddScoped<IPurchaseOrderService,      PurchaseOrderService>();
            builder.Services.AddScoped<IInvoiceService,            InvoiceService>();
            builder.Services.AddScoped<IOcrJobService,             OcrJobService>();

            // ── Vendor ──
            builder.Services.AddScoped<IVendorService,                VendorService>();
            builder.Services.AddScoped<IVendorContractService,        VendorContractService>();
            builder.Services.AddScoped<IVendorContractServiceService, VendorContractServiceService>();
            builder.Services.AddScoped<IVendorEvaluationService,      VendorEvaluationService>();

            // ── System / Reporting ──
            builder.Services.AddScoped<IKpiSnapshotService,        KpiSnapshotService>();
            builder.Services.AddScoped<ICostTrackingService,       CostTrackingService>();
        }

        // ════════════════════════════════════════════════════════════════════
        // SeedAssetDataAsync — chạy migration & seed dữ liệu mặc định
        // Gọi trong Program.cs sau khi app đã build:
        //   await app.SeedAssetDataAsync();
        // ════════════════════════════════════════════════════════════════════
        public static async Task SeedAssetDataAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var services = scope.ServiceProvider;
            var logger   = services.GetRequiredService<ILoggerFactory>()
                                   .CreateLogger("AssetSeeder");
            try
            {
                var context = services.GetRequiredService<AssetDbContext>();

                logger.LogInformation("Applying migrations for Asset module...");
                await context.Database.MigrateAsync();

                // ── Seed dữ liệu mẫu cho toàn bộ module (idempotent) ──────
                await AssetDataSeeder.SeedAllAsync(context, logger);

                logger.LogInformation("Asset module migration completed successfully.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Lỗi khi migrate/seed database của Asset module.");
                throw; // re-throw để app không khởi động khi DB lỗi
            }
        }
    }
}
