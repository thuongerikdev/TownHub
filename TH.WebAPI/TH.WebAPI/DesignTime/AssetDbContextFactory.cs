using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using TH.Asset.Infrastructure.Database;
using TH.Constant.Database;

namespace TH.WebAPI.DesignTime
{
    /// <summary>
    /// Design-time factory cho AssetDbContext. EF Core tooling dùng class này khi chạy
    /// <c>dotnet ef migrations add ...</c> / <c>database update</c> để khỏi phải boot toàn bộ
    /// web host (Redis, Swagger, các module khác). Việc tạo migration KHÔNG kết nối DB —
    /// chỉ cần một connection string parse được để cấu hình Npgsql provider.
    /// </summary>
    public class AssetDbContextFactory : IDesignTimeDbContextFactory<AssetDbContext>
    {
        public AssetDbContext CreateDbContext(string[] args)
        {
            // Tooling không chạy Program.Main nên .env chưa được nạp → tự nạp để lấy connection string.
            TryLoadEnv();

            var raw =
                Environment.GetEnvironmentVariable("ASSET_DATABASE_URL")
                ?? Environment.GetEnvironmentVariable("DATABASE_URL")
                ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
                ?? "Host=localhost;Port=5432;Database=townhub_asset_design;Username=postgres;Password=postgres";

            var conn = NormalizePg(raw);

            var options = new DbContextOptionsBuilder<AssetDbContext>()
                .UseNpgsql(conn, npg =>
                {
                    npg.MigrationsAssembly("TH.WebAPI");
                    npg.MigrationsHistoryTable(DbSchema.TableMigrationsHistory, DbSchema.Asset);
                })
                .Options;

            return new AssetDbContext(options);
        }

        private static void TryLoadEnv()
        {
            try
            {
                foreach (var dir in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
                {
                    if (string.IsNullOrWhiteSpace(dir)) continue;
                    var p = Path.Combine(dir, ".env");
                    if (File.Exists(p)) { DotNetEnv.Env.Load(p); break; }
                }
            }
            catch { /* tooling-only, bỏ qua lỗi nạp .env */ }
        }

        // Bản sao của AssetStartUp.NormalizePg để factory độc lập với app host.
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

                var db = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/'));
                var port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port;

                var qs = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
                {
                    var kv = pair.Split('=', 2);
                    var k = Uri.UnescapeDataString(kv[0]);
                    var v = kv.Length == 2 ? Uri.UnescapeDataString(kv[1]) : "";
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

            if (!raw.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase))
                raw += (raw.EndsWith(";") ? "" : ";") + "SSL Mode=Require";
            if (!raw.Contains("Trust Server Certificate", StringComparison.OrdinalIgnoreCase))
                raw += (raw.EndsWith(";") ? "" : ";") + "Trust Server Certificate=true";

            return raw;
        }
    }
}
