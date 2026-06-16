using CloudinaryDotNet;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Service;
using TH.Auth.ApplicationService.Service.Email;
using TH.Auth.ApplicationService.Service.MFA;
using TH.Auth.ApplicationService.Service.Role;
using TH.Auth.ApplicationService.Service.User;
using TH.Auth.Infrastructure;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.MFA;
using TH.Auth.Infrastructure.Repository.Role;
using TH.Auth.Infrastructure.Repository.Token;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;
using TH.Constant.Database;
using TH.Shared.ApplicationService;
using static Org.BouncyCastle.Math.EC.ECCurve;

namespace TH.Auth.ApplicationService.StartUp
{
    public static class AuthStartUp
    {
        // Helper: nhận URL (postgres:// / postgresql://) và trả về KV-form Npgsql hiểu được.
        // Nếu đã là KV-form thì chỉ đảm bảo có SSL Mode/Trust Server Certificate.
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

                // user:pass
                string? user = null, pass = null;
                if (!string.IsNullOrEmpty(uri.UserInfo))
                {
                    var parts = uri.UserInfo.Split(':', 2);
                    user = Uri.UnescapeDataString(parts[0]);
                    if (parts.Length == 2) pass = Uri.UnescapeDataString(parts[1]);
                }

                // db name
                var db = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/'));
                var port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port;

                // parse query (?a=b&c=d)
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

            // KV-form: đảm bảo có SSL Mode/TrustServerCertificate
            if (!raw.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase))
                raw += (raw.EndsWith(";") ? "" : ";") + "SSL Mode=Require";
            if (!raw.Contains("Trust Server Certificate", StringComparison.OrdinalIgnoreCase))
                raw += (raw.EndsWith(";") ? "" : ";") + "Trust Server Certificate=true";

            return raw;
        }

        public static void ConfigureAuth(this WebApplicationBuilder builder, string? assemblyName)
        {
            // === DB (PostgreSQL / Neon) ===
            builder.Services.AddDbContext<AuthDbContext>(
                options =>
                {
                    // Ưu tiên ConnectionStrings:Default; fallback DATABASE_URL
                    var raw =
                        builder.Configuration.GetConnectionString("Default")
                        ?? Environment.GetEnvironmentVariable("DATABASE_URL")
                        ?? throw new InvalidOperationException("Missing Postgres connection string");

                    // Chuẩn hóa: nếu là URL → chuyển sang KV; nếu KV → đảm bảo SSL Mode/TrustServerCertificate
                    var conn = NormalizePg(raw);

                    options.UseNpgsql(
                        conn,
                        npg =>
                        {
                            if (!string.IsNullOrWhiteSpace(assemblyName))
                                npg.MigrationsAssembly(assemblyName);

                            npg.MigrationsHistoryTable(DbSchema.TableMigrationsHistory, DbSchema.Auth);
                            npg.EnableRetryOnFailure();
                        });

                    // (tuỳ chọn) snake_case
                    // options.UseSnakeCaseNamingConvention();
                },
                ServiceLifetime.Scoped
            );

            //builder.Services.AddHostedService<SubscriptionExpiryWorker>();
            //builder.Services.AddScoped<IAuthorizationHandler, ActiveVipHandler>();

            var cloudSection = builder.Configuration.GetSection("Cloudinary");
            var cloudName = cloudSection["CloudName"];
            var apiKey = cloudSection["ApiKey"];
            var apiSecret = cloudSection["ApiSecret"];

            if (string.IsNullOrWhiteSpace(cloudName) ||
                string.IsNullOrWhiteSpace(apiKey) ||
                string.IsNullOrWhiteSpace(apiSecret))
            {
                throw new ArgumentException("Cloudinary configuration is missing or invalid (CloudName/ApiKey/ApiSecret).");
            }

            var account = new Account(cloudName, apiKey, apiSecret);
            var cloudinary = new Cloudinary(account) { Api = { Secure = true } };
            builder.Services.AddSingleton(cloudinary);

            // === Redis ===
            builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
            {
                var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger("Redis");
                var config = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";

                string host = null!;
                int port = 6379;
                string? user = null;
                string? password = null;
                var isTls = false;

                if (Uri.TryCreate(config, UriKind.Absolute, out var uri) &&
                    (uri.Scheme == "redis" || uri.Scheme == "rediss"))
                {
                    isTls = uri.Scheme.Equals("rediss", StringComparison.OrdinalIgnoreCase);
                    host = uri.Host;
                    port = uri.Port > 0 ? uri.Port : 6379;
                    if (!string.IsNullOrEmpty(uri.UserInfo))
                    {
                        var parts = uri.UserInfo.Split(':', 2);
                        if (parts.Length >= 1) user = parts[0];
                        if (parts.Length == 2) password = parts[1];
                    }
                }
                else
                {
                    var tmp = ConfigurationOptions.Parse(config);
                    if (tmp.EndPoints.Count == 1 && tmp.EndPoints[0] is DnsEndPoint dns)
                    {
                        host = dns.Host; port = dns.Port;
                    }
                    if (!string.IsNullOrEmpty(tmp.Password)) password = tmp.Password;
                    if (!string.IsNullOrEmpty(tmp.User)) user = tmp.User;
                    isTls = tmp.Ssl;
                }

                var options = new ConfigurationOptions
                {
                    AbortOnConnectFail = false,
                    ResolveDns = true,
                    ConnectRetry = 5,
                    ConnectTimeout = 30000,
                    SyncTimeout = 30000,
                    KeepAlive = 10,
                    ClientName = "auth-service",
                };

                if (!string.IsNullOrEmpty(host)) options.EndPoints.Add(host, port);
                else options = ConfigurationOptions.Parse(config);

                if (isTls)
                {
                    options.Ssl = true;
                    options.SslProtocols = SslProtocols.Tls12;
                    if (!string.IsNullOrEmpty(host)) options.SslHost = host;
                }

                if (!string.IsNullOrEmpty(user)) options.User = user;
                if (!string.IsNullOrEmpty(password)) options.Password = password;

                logger.LogInformation("Redis config: host={host} port={port} ssl={ssl} user={userPresent}",
                    host, port, options.Ssl, string.IsNullOrEmpty(options.User) ? "(none)" : "(present)");

                try
                {
                    var mux = ConnectionMultiplexer.ConnectAsync(options).GetAwaiter().GetResult();

                    try
                    {
                        var ping = mux.GetDatabase().Ping();
                        logger.LogInformation("Redis PING = {ms} ms", ping.TotalMilliseconds);
                    }
                    catch (Exception pingEx)
                    {
                        logger.LogWarning(pingEx, "Redis PING failed (background will retry)");
                    }

                    return mux;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Redis Connect failed (config prefix: {prefix})", (config ?? "").Split('@').FirstOrDefault());
                    throw;
                }
            });

            builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("MailSettings"));

            // === Common infra & repositories ===
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<IDeviceIdProvider, DeviceIdProvider>();

            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
            builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
            builder.Services.AddScoped<ITokenGenerate, TokenGenerate>();
            builder.Services.AddScoped<IEmailTokenRepository, TokenRepository>();
            builder.Services.AddScoped<IMFARepository, MFARepository>();
            builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
            builder.Services.AddScoped<IAuthUserSessionRepository, AuthUserSessionRepository>();
            builder.Services.AddScoped<IRoleRepository, RoleRepository>();
            builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();
            builder.Services.AddScoped<IPasswordResetRepository, PasswordResetRepository>();
            builder.Services.AddScoped<IResetTicketStore, ResetTicketStore>();
            //builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
            //builder.Services.AddScoped<IOrderRepository, OrderRepository>();
            //builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
            //builder.Services.AddScoped<IUserSubscriptionRepository, UserSubscriptionRepository>();
            //builder.Services.AddScoped<IPlanRepository, PlanRepository>();
            //builder.Services.AddScoped<IPriceRepository, PriceRepository>();
            builder.Services.AddScoped<IRolePermissionRepository, RolePermissionRepository>();
            builder.Services.AddScoped<IPermissionRepository, PermissionRepository>();

            builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
            builder.Services.AddScoped<IAuthRegisterService, AuthRegisterService>();
            builder.Services.AddScoped<IAuthLoginService, AuthLoginService>();
            builder.Services.AddScoped<IEmailService, EmailService>();
            builder.Services.AddScoped<IAuthRoleService, AuthRoleService>();
            builder.Services.AddScoped<IAuthUserService, AuthUserService>();
            builder.Services.AddScoped<IPasswordChangeService, PasswordChangeService>();
            builder.Services.AddScoped<IMfaService, MfaService>();

            //builder.Services.AddScoped<IVnPayService, VnPayService>();
            //builder.Services.AddScoped<IOrderService, OrderService>();
            //builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
            //builder.Services.AddScoped<IInvoiceService, InvoiceService>();

            //builder.Services.AddScoped<IPlanService, PlanService>();
            //builder.Services.AddScoped<IPriceService, PriceService>();

            builder.Services.AddScoped<IAuthPermissionService, AuthPermissionService>();
            builder.Services.AddScoped<IAuthRolePermissionService, AuthRolePermissionService>();
            builder.Services.AddScoped<IAuthUserRoleService, AuthUserRoleService>();

            builder.Services.AddScoped<IAuthUserSessionService, AuthUserSessionService>();
            builder.Services.AddScoped<IAuthAuditLogService, AuthAuditLogService>();


            builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();

            // === Authentication (JWT + Cookies + Google) ===
            var secretKey = builder.Configuration["Jwt:SecretKey"] ?? "A_very_long_and_secure_secret_key_1234567890";
            var key = Encoding.UTF8.GetBytes(secretKey);
            var isDev = builder.Environment.IsDevelopment();

            var googleClientId = builder.Configuration["Google:ClientId"] ?? builder.Configuration["Authentication:Google:ClientId"];
            var googleClientSecret = builder.Configuration["Google:ClientSecret"] ?? builder.Configuration["Authentication:Google:ClientSecret"];
            var googleCallbackPath = builder.Configuration["Google:CallbackPath"] ?? builder.Configuration["Authentication:Google:CallbackPath"] ?? "/signin-google";

            builder.Services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = !isDev;
                options.SaveToken = true;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),

                    RoleClaimType = "role",
                    NameClaimType = "userName"
                };

                // 👇 Quan trọng: đọc JWT từ cookie fz.access nếu không có Authorization header
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        // Nếu FE KHÔNG gửi Authorization header thì lấy từ cookie "fz.access"
                        if (string.IsNullOrEmpty(ctx.Token))
                        {
                            var tokenFromCookie = ctx.Request.Cookies["fz.access"];
                            if (!string.IsNullOrEmpty(tokenFromCookie))
                                ctx.Token = tokenFromCookie;
                        }
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = ctx =>
                    {
                        if (ctx.Exception is SecurityTokenExpiredException)
                            ctx.Response.Headers["x-token-expired"] = "true";
                        return Task.CompletedTask;
                    },
                    OnChallenge = ctx =>
                    {
                        if (!ctx.Response.HasStarted)
                        {
                            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                            ctx.Response.Headers.TryAdd("WWW-Authenticate",
                                "Bearer error=\"invalid_token\", error_description=\"The access token is expired\"");
                        }
                        ctx.HandleResponse();
                        return Task.CompletedTask;
                    }
                };
            })


            // ✅ CHỈ giữ external cookie cho OAuth handshake (Google)
            .AddCookie("External", opt =>
            {
                opt.Cookie.Name = "external.auth";
                opt.Cookie.SameSite = SameSiteMode.None;   // FE/BE khác domain
                opt.Cookie.SecurePolicy = CookieSecurePolicy.Always; // HTTPS
            });


            if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
            {
                builder.Services.AddAuthentication()
                    .AddGoogle("Google", options =>
                    {
                        options.ClientId = googleClientId!;
                        options.ClientSecret = googleClientSecret!;
                        options.SignInScheme = "External";
                        options.CallbackPath = googleCallbackPath;
                        options.SaveTokens = true;

                        options.CorrelationCookie.SameSite = SameSiteMode.None;
                        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;

                        var handler = new SocketsHttpHandler
                        {
                            UseProxy = false,
                            AutomaticDecompression = DecompressionMethods.All,
                            ConnectTimeout = TimeSpan.FromSeconds(8),
                            SslOptions = new System.Net.Security.SslClientAuthenticationOptions
                            {
                                EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
                            },
                            ConnectCallback = async (ctx, ct) =>
                            {
                                var addresses = await Dns.GetHostAddressesAsync(ctx.DnsEndPoint!.Host, ct);
                                var ipv4 = Array.Find(addresses, ip => ip.AddressFamily == AddressFamily.InterNetwork);
                                if (ipv4 == null) throw new SocketException((int)SocketError.AddressNotAvailable);

                                var ep = new IPEndPoint(ipv4, ctx.DnsEndPoint.Port);
                                var s = new Socket(ipv4.AddressFamily, SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                                using var reg = ct.Register(() => { try { s.Dispose(); } catch { } });
                                await s.ConnectAsync(ep, ct);
                                return new NetworkStream(s, ownsSocket: true);
                            }
                        };

                        options.Backchannel = new HttpClient(handler)
                        {
                            Timeout = TimeSpan.FromSeconds(20),
                            DefaultRequestVersion = HttpVersion.Version11,
#if NET8_0_OR_GREATER
                            DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower
#endif
                        };
                    });
            }

            // === Authorization ===
            builder.Services.AddAuthorization(options =>
            {
                foreach (var permission in PermissionConstants.Permissions)
                    options.AddPolicy(permission.Key, policy => policy.RequireClaim("permission", permission.Value));

                //options.AddPolicy("ActiveVIP", p => p.Requirements.Add(new ActiveVipRequirement()));
            });

            // === CORS ===
            // === CORS ===
            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
            builder.Services.AddCors(opt =>
            {
                opt.AddPolicy("FE", p =>
                {
                    if (allowedOrigins.Length > 0) p.WithOrigins(allowedOrigins);
                    else p.WithOrigins("http://localhost:3000");

                    p.AllowAnyHeader()
                     .AllowAnyMethod()
                     .AllowCredentials()
                     // 👇 THÊM DÒNG NÀY (Quan trọng)
                     // Danh sách các header bạn muốn FE đọc được
                     .WithExposedHeaders("WWW-Authenticate", "x-token-expired", "Content-Disposition");
                });
            });

            // === Forwarded headers (behind proxy) ===
            builder.Services.Configure<ForwardedHeadersOptions>(opts =>
            {
                opts.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            });
        }
        public static async Task SeedAuthDataAsync(this WebApplication app)
        {
            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("AuthSeeder");

                try
                {
                    var context = services.GetRequiredService<AuthDbContext>();

                    // 1. (Tuỳ chọn) Tự động chạy Migration nếu chưa update database
                    // logger.LogInformation("Applying migrations...");
                    await context.Database.MigrateAsync();

                    //await AuthDataSeeder.SyncRolesAsync(context);

                    // 2. Chạy Seeder
                    logger.LogInformation("Starting Permission Seeding...");
                    await AuthDataSeeder.SeedPermissionsAsync(context);
                    logger.LogInformation("Seeding completed successfully.");
                    logger.LogInformation("Seeding Admin User...");
                    await AuthDataSeeder.SeedAdminUserAsync(context, services);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "An error occurred while seeding the database.");
                }
            }
        }
    }
}
