using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace TH.Auth.Infrastructure.Repository.MFA
{
    public interface IDeviceIdProvider
    {
        string GetOrCreate();
    }
    public sealed class DeviceIdProvider : IDeviceIdProvider
    {
        private readonly IHttpContextAccessor _http;
        private const string CookieName = "fz.did";
        private static readonly Regex Safe = new("^[A-Za-z0-9_-]{16,128}$", RegexOptions.Compiled);

        public DeviceIdProvider(IHttpContextAccessor http) => _http = http;

        public string GetOrCreate()
        {
            var ctx = _http.HttpContext;
            if (ctx is null) return Guid.NewGuid().ToString("N");

            var did = ctx.Request.Cookies[CookieName];
            if (string.IsNullOrWhiteSpace(did) || !Safe.IsMatch(did))
            {
                did = Guid.NewGuid().ToString("N"); // ⬅️ dùng GUID thay ULID

                ctx.Response.Cookies.Append(CookieName, did, new CookieOptions
                {
                    SameSite = SameSiteMode.Lax, // khác domain thì dùng None
                    Secure = true,
                    HttpOnly = false,
                    Expires = DateTimeOffset.UtcNow.AddYears(2),
                    IsEssential = true,
                    Path = "/"
                });
            }
            return did;
        }
    }
}
