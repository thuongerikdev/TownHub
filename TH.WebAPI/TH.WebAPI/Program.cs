//using FilmZone.Middlewares;
//using FZ.Auth.ApplicationService.StartUp;
//using FZ.Movie.ApplicationService.Search;
//using FZ.Movie.ApplicationService.StartUp;
//using FZ.WebAPI.SignalR;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.OpenApi.Models;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using TH.Auth.ApplicationService.StartUp;
using TH.Base.ApplicationService.StartUp;

namespace TH.WebAPI
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            ThreadPool.GetMinThreads(out var worker, out var iocp);
            var target = Math.Max(worker, Environment.ProcessorCount * 16);
            ThreadPool.SetMinThreads(target, iocp);

            var builder = WebApplication.CreateBuilder(args);


            // === 1) LOAD .env (DEV) TRƯỚC: thử nhiều vị trí ===
            try
            {
                // Ưu tiên ContentRoot (thư mục project) → thường là nơi bạn đặt .env
                var candidates = new[]
                {
                    builder.Environment.ContentRootPath,              // <project folder>
                    Directory.GetCurrentDirectory(),                  // đôi khi trùng ContentRoot
                    AppContext.BaseDirectory                          // bin/Debug/netX.Y/
                }
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => Path.Combine(p!, ".env"))
                .Distinct()
                .ToList();

                foreach (var envPath in candidates)
                {
                    if (File.Exists(envPath))
                    {
                        DotNetEnv.Env.Load(envPath);
                        Console.WriteLine($"[BOOT] Loaded .env from: {envPath}");
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[BOOT] .env load failed: " + ex.Message);
            }

            // === 2) MERGE ENV VARS vào Configuration sau khi đã load .env ===
            builder.Configuration.AddEnvironmentVariables();

            // (Tuỳ chọn) In ra connection string (đã mask) để xác minh
            try
            {
                var raw = builder.Configuration.GetConnectionString("Default")
                          ?? builder.Configuration["ConnectionStrings:Default"];
                if (string.IsNullOrWhiteSpace(raw))
                    Console.WriteLine("[BOOT] ConnectionStrings:Default = <NULL>");
                else
                {
                    var masked = Regex.Replace(raw, @"Password=[^;]*", "Password=***", RegexOptions.IgnoreCase);
                    Console.WriteLine("[BOOT] ConnectionStrings:Default (masked) = " + masked);
                }
            }
            catch { /* ignore */ }

            // === 3) Modules (đăng ký DbContext sẽ đọc từ Configuration ở trên) ===
            builder.ConfigureAuth(typeof(Program).Namespace);
            builder.ConfigureBase(typeof(Program).Namespace);
            //builder.ConfigureMovie(typeof(Program).Namespace);
            builder.Services.AddHealthChecks();

            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // Dòng này giúp bỏ qua các vòng lặp tham chiếu (Fix lỗi Object cycle)
                    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;

                    // (Tùy chọn) Giữ nguyên định dạng Property (viết hoa/thường) như Model
                    // options.JsonSerializerOptions.PropertyNamingPolicy = null; 
                });
            builder.Services.AddEndpointsApiExplorer();

            // Redis cache (tuỳ dùng) - đọc Redis__ConnectionString từ env/.env
            builder.Services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = builder.Configuration["Redis:ConnectionString"]; // map Redis__ConnectionString
                options.InstanceName = "SampleInstance";
            });

            // Swagger
            builder.Services.AddSwaggerGen(option =>
            {
                option.SwaggerDoc("v1", new OpenApiInfo { Title = "Demo API", Version = "v1" });
                option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    In = ParameterLocation.Header,
                    Description = "Enter JWT like: Bearer {token}",
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    BearerFormat = "JWT",
                    Scheme = "Bearer"
                });
                option.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                        },
                        Array.Empty<string>()
                    }
                });
            });



            var app = builder.Build();

            await app.SeedAuthDataAsync();


            app.UseSwagger();
            app.UseSwaggerUI();


            var fwd = new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost
                // (tuỳ thích thêm) | ForwardedHeaders.XForwardedFor
            };
            // Chấp nhận proxy của Koyeb (rất quan trọng)
            fwd.KnownNetworks.Clear();
            fwd.KnownProxies.Clear();

            app.UseForwardedHeaders(fwd);

            // (sau đó mới tới swagger/ui/cors/routing/auth...)
            app.UseSwagger();
            app.UseSwaggerUI();

            //using (var scope = app.Services.CreateScope())
            //{
            //    var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>().GetSection("OpenSearch");
            //    await IndexBootstrap.EnsureMoviesIndexAsync(
            //        baseUrl: cfg["Url"]!,
            //        indexName: cfg["MoviesIndex"]!,
            //        username: cfg["Username"],
            //        password: cfg["Password"]
            //    );

            //    await IndexBootstrap.EnsurePersonsIndexAsync(
            //        baseUrl: cfg["Url"]!,
            //        indexName: cfg["PersonsIndex"]!,
            //        username: cfg["Username"],
            //        password: cfg["Password"]
            //    );
            //}

            app.MapGet("/healthz", () => Results.Ok("OK"));


            // app.UseHttpsRedirection(); // prod có thể bật, dev có thể tắt
            app.UseRouting();
            app.UseCors("FE");                  // policy "FE" phải được AddCors trước đó
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            await app.RunAsync();
        }



    }
}
