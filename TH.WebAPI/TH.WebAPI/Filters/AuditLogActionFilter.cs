using System;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Microsoft.Net.Http.Headers;
using TH.Auth.Domain.MFA;
using TH.Auth.Infrastructure;
using TH.Auth.Infrastructure.Repository.MFA;

namespace TH.WebAPI.Filters
{
    /// <summary>
    /// Ghi audit log tự động cho MỌI hành động quan trọng (POST/PUT/PATCH/DELETE) ở cả 3 module
    /// Auth / Asset / Base. Lấy user từ JWT, IP + userAgent từ request, kết quả OK/FAIL từ response.
    /// Ghi vào bảng auth.AuthAuditLog dùng chung. Lỗi khi ghi log KHÔNG làm hỏng request gốc.
    /// Bỏ qua endpoint có [SkipAudit] và các phương thức đọc (GET/HEAD/OPTIONS).
    /// </summary>
    public sealed class AuditLogActionFilter : IAsyncActionFilter
    {
        private readonly IAuditLogRepository _audit;
        private readonly AuthDbContext _db;
        private readonly ILogger<AuditLogActionFilter> _logger;

        public AuditLogActionFilter(
            IAuditLogRepository audit,
            AuthDbContext db,
            ILogger<AuditLogActionFilter> logger)
        {
            _audit = audit;
            _db = db;
            _logger = logger;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var http = context.HttpContext;
            var method = http.Request.Method;
            var shouldAudit = IsMutating(method) && !HasSkipAudit(context);

            // Thực thi action trước để biết kết quả.
            var executed = await next();

            if (!shouldAudit) return;

            try
            {
                await WriteAuditAsync(context, executed);
            }
            catch (Exception ex)
            {
                // Không bao giờ để việc ghi log làm hỏng nghiệp vụ chính.
                _logger.LogError(ex, "Ghi audit log thất bại cho {Method} {Path}",
                    method, http.Request.Path.Value);
            }
        }

        private async Task WriteAuditAsync(ActionExecutingContext context, ActionExecutedContext executed)
        {
            var http = context.HttpContext;
            var auditAttr = GetAuditAttribute(context);

            var (result, detail) = InspectResult(executed);

            var actionLabel = auditAttr?.Action
                ?? $"{context.HttpContext.Request.Method} {ControllerName(context)}.{ActionName(context)}";

            var fullDetail = BuildDetail(context, auditAttr, detail);

            var log = new AuthAuditLog
            {
                userID = GetUserId(http.User),
                action = Truncate(actionLabel, 256),
                result = result,
                detail = Truncate(fullDetail, 2000),
                ip = GetClientIp(http) ?? "",
                userAgent = Truncate(http.Request.Headers[HeaderNames.UserAgent].ToString(), 512),
                createdAt = DateTime.UtcNow
            };

            await _audit.LogAsync(log, http.RequestAborted);
            // Repository chỉ AddAsync, cần SaveChanges tại đây (AuthDbContext dùng chung).
            await _db.SaveChangesAsync(http.RequestAborted);
        }

        // ───────────────────────── Helpers ─────────────────────────

        private static bool IsMutating(string method) =>
            HttpMethods.IsPost(method) || HttpMethods.IsPut(method) ||
            HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);

        private static bool HasSkipAudit(ActionExecutingContext context)
        {
            if (context.ActionDescriptor is not ControllerActionDescriptor cad) return false;
            return cad.MethodInfo.GetCustomAttribute<SkipAuditAttribute>() != null
                || cad.ControllerTypeInfo.GetCustomAttribute<SkipAuditAttribute>() != null;
        }

        private static AuditAttribute? GetAuditAttribute(ActionExecutingContext context)
        {
            if (context.ActionDescriptor is not ControllerActionDescriptor cad) return null;
            return cad.MethodInfo.GetCustomAttribute<AuditAttribute>()
                ?? cad.ControllerTypeInfo.GetCustomAttribute<AuditAttribute>();
        }

        private static string ControllerName(ActionExecutingContext context) =>
            context.ActionDescriptor is ControllerActionDescriptor cad
                ? cad.ControllerName
                : "Unknown";

        private static string ActionName(ActionExecutingContext context) =>
            context.ActionDescriptor is ControllerActionDescriptor cad
                ? cad.ActionName
                : "Unknown";

        /// <summary>
        /// Suy ra kết quả OK/FAIL và thông điệp lỗi từ response.
        /// Ưu tiên đọc ResponseDto.ErrorCode (chuẩn dùng chung); fallback về HTTP status.
        /// </summary>
        private static (string result, string? detail) InspectResult(ActionExecutedContext executed)
        {
            if (executed.Exception != null && !executed.ExceptionHandled)
                return ("FAIL", "Exception: " + executed.Exception.Message);

            if (executed.Result is ObjectResult obj && obj.Value != null)
            {
                var val = obj.Value;
                var errorCodeProp = val.GetType().GetProperty("ErrorCode");
                if (errorCodeProp != null && errorCodeProp.PropertyType == typeof(int))
                {
                    var code = (int)(errorCodeProp.GetValue(val) ?? 0);
                    var msgProp = val.GetType().GetProperty("ErrorMessage");
                    var msg = msgProp?.GetValue(val) as string;
                    return (code == 200 ? "OK" : "FAIL", code == 200 ? null : $"[{code}] {msg}");
                }
            }

            var status = executed.HttpContext.Response.StatusCode;
            return (status is >= 200 and < 400 ? "OK" : "FAIL", $"HTTP {status}");
        }

        private static string BuildDetail(
            ActionExecutingContext context, AuditAttribute? attr, string? resultDetail)
        {
            var http = context.HttpContext;
            var parts = new System.Collections.Generic.List<string>
            {
                $"{http.Request.Method} {http.Request.Path.Value}"
            };

            if (attr?.Module != null) parts.Add($"module={attr.Module}");
            if (attr?.Entity != null) parts.Add($"entity={attr.Entity}");

            // Route values (id...) — không log body để tránh lộ dữ liệu nhạy cảm (mật khẩu...).
            var routeIds = context.ActionArguments
                .Where(kv => kv.Value is Guid or int or long or string && kv.Value != null)
                .Where(kv => kv.Key.Contains("id", StringComparison.OrdinalIgnoreCase))
                .Select(kv => $"{kv.Key}={kv.Value}");
            parts.AddRange(routeIds);

            if (!string.IsNullOrEmpty(resultDetail)) parts.Add(resultDetail!);

            return string.Join("; ", parts);
        }

        private static int? GetUserId(ClaimsPrincipal user)
        {
            if (user?.Identity?.IsAuthenticated != true) return null;
            var raw = user.FindFirst("userId")?.Value
                ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? user.FindFirst("sub")?.Value;
            return int.TryParse(raw, out var id) ? id : null;
        }

        private static string? GetClientIp(HttpContext ctx)
        {
            var ip = ctx.Connection.RemoteIpAddress;
            if (ip != null)
            {
                if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
                return ip.ToString();
            }
            foreach (var key in new[] { "CF-Connecting-IP", "True-Client-IP", "X-Real-IP", "X-Forwarded-For" })
            {
                var raw = ctx.Request.Headers[key].ToString();
                if (string.IsNullOrWhiteSpace(raw)) continue;
                var first = raw.Split(',')[0].Trim();
                if (IPAddress.TryParse(first, out var addr))
                {
                    if (addr.IsIPv4MappedToIPv6) addr = addr.MapToIPv4();
                    return addr.ToString();
                }
            }
            return null;
        }

        private static string? Truncate(string? s, int max) =>
            string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s.Substring(0, max));
    }
}
