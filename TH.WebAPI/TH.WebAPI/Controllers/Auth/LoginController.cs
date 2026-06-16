using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.SqlServer.Server;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using TH.Auth.ApplicationService.Service.User;
using TH.Auth.Dtos.User;
using TH.Auth.Infrastructure.Repository.Token;
using TH.Constant;

namespace TH.WebAPI.Controllers.Auth
{
    [Route("login")]
    [ApiController]
    public class LoginController : Controller
    {
        private const string AccessCookie = "fz.access";
        private const string RefreshCookie = "fz.refresh";

        private readonly IAuthLoginService _authLoginService;
        private readonly ITokenGenerate _tokenGenerate;
        private readonly IConfiguration _cfg;

        public LoginController(IAuthLoginService authLoginService, ITokenGenerate tokenGenerate, IConfiguration cfg)
        {
            _authLoginService = authLoginService;
            _tokenGenerate = tokenGenerate;
            _cfg = cfg;
        }

        [HttpPost("userLogin")]
        public async Task<IActionResult> UserLogin([FromBody] LoginRequest loginRequest, CancellationToken ct)
        {
            var result = await _authLoginService.LoginAsync(loginRequest, ct);

            if (result.ErrorCode != 200 || result.Data is null)
                return StatusCode(result.ErrorCode, result);

            // MFA Required -> FE tự chuyển hướng
            if (TryGetBoolProp(result.Data, "requiresMfa") == true) return Ok(result);

            if (TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
            {
                // 1. Set JWT & Refresh Cookie (HttpOnly - Bảo mật)
                SetAuthCookies(access!, refresh!, accessExp, refreshExp);

                // 2. Set Permission Cookie (Not HttpOnly - Cho UI Logic ẩn hiện nút)
                // Lấy permissions từ LoginResponse
                var perms = TryGetPermissions(result.Data);
                if (perms != null)
                {
                    Response.Cookies.Append("fz.permissions", JsonSerializer.Serialize(perms), new CookieOptions
                    {
                        HttpOnly = false, // JS đọc được
                        Secure = true,
                        SameSite = SameSiteMode.None,
                        Expires = accessExp
                    });
                }
            }

            return Ok(result);
        }
        [HttpPost("StaffLogin")]
        public async Task<IActionResult> StaffLogin([FromBody] LoginRequest loginRequest, CancellationToken ct)
        {
            var result = await _authLoginService.LoginStaffAsync(loginRequest, ct);

            if (result.ErrorCode != 200 || result.Data is null)
                return StatusCode(result.ErrorCode, result);

            // MFA Required -> FE tự chuyển hướng
            if (TryGetBoolProp(result.Data, "requiresMfa") == true) return Ok(result);

            if (TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
            {
                // 1. Set JWT & Refresh Cookie (HttpOnly - Bảo mật)
                SetAuthCookies(access!, refresh!, accessExp, refreshExp);

                // 2. Set Permission Cookie (Not HttpOnly - Cho UI Logic ẩn hiện nút)
                // Lấy permissions từ LoginResponse
                var perms = TryGetPermissions(result.Data);
                if (perms != null)
                {
                    Response.Cookies.Append("fz.permissions", JsonSerializer.Serialize(perms), new CookieOptions
                    {
                        HttpOnly = false, // JS đọc được
                        Secure = true,
                        SameSite = SameSiteMode.None,
                        Expires = accessExp
                    });
                }
            }

            return Ok(result);
        }

        [HttpPost("login/mobile")]
        [AllowAnonymous]
        public async Task<IActionResult> MobileLogin([FromBody] LoginRequest req, CancellationToken ct)
        {
            var result = await _authLoginService.LoginAsync(req, ct);
            if (result.ErrorCode != 200 || result.Data is null) return StatusCode(result.ErrorCode, result);

            if (TryGetBoolProp(result.Data, "requiresMfa") == true) return Ok(result);

            if (!TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
                return StatusCode(500, ResponseConst.Error<string>(500, "Token error"));

            // Mobile: Trả hết trong JSON
            return Ok(new
            {
                accessToken = access,
                refreshToken = refresh,
                permissions = TryGetPermissions(result.Data), // Mobile dev lấy list này lưu local storage
                user = new { id = TryGetStringProp(result.Data, "userID"), name = TryGetStringProp(result.Data, "userName") }
            });
        }


        [HttpGet("google-login")]
        [AllowAnonymous]
        public IActionResult GoogleLogin([FromQuery] string? returnUrl = null)
        {
            var safeReturnUrl = GetSafeReturnUrl(returnUrl);
            var props = new AuthenticationProperties
            {
                RedirectUri = Url.Action(nameof(GoogleCallback), "Login", new { returnUrl = safeReturnUrl })
            };
            return Challenge(props, GoogleDefaults.AuthenticationScheme);
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromServices] IAuthLoginService svc, CancellationToken ct)
        {
            var rt = Request.Cookies[RefreshCookie];
            if (!string.IsNullOrWhiteSpace(rt))
            {
                _ = await svc.LogoutByRefreshTokenAsync(rt!, ct);
            }

            ClearAuthCookies();
            return Ok(ResponseConst.Success("Đã đăng xuất.", true));
        }

        [HttpPost("logout/session/{sessionId:int}")]
        public async Task<IActionResult> LogoutSession(int sessionId, [FromServices] IAuthLoginService svc, CancellationToken ct)
        {
            var userIdStr = User.FindFirstValue("userId");
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var res = await svc.LogoutSessionAsync(userId, sessionId, ct);
            // Tuỳ chọn: nếu session hiện tại thì xoá cookie local
            ClearAuthCookies();
            return Ok(res);
        }

        [HttpPost("logout/all")]
        public async Task<IActionResult> LogoutAll([FromServices] IAuthLoginService svc, CancellationToken ct)
        {
            var userIdStr = User.FindFirstValue("userId");
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var res = await svc.LogoutAllDevicesAsync(userId, ct);
            ClearAuthCookies();
            return Ok(res);
        }

        [HttpPost("login/mobile/google")]
        [AllowAnonymous]
        public async Task<IActionResult> MobileGoogleLogin([FromBody] GoogleMobileLoginRequest req, CancellationToken ct)
        {
            // --- BƯỚC 1: Validate đầu vào ---
            if (string.IsNullOrWhiteSpace(req.IdToken))
                return BadRequest(ResponseConst.Error<string>(400, "Thiếu idToken từ Google"));

            try
            {
                // --- BƯỚC 2: Xác thực Token với Google ---
                // Đây là bước quan trọng nhất: Server tự hỏi Google xem token này có phải đồ thật không
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    // QUAN TRỌNG: Chỉ chấp nhận token được cấp cho Client ID của hệ thống mình
                    // Vì Mobile App đã config dùng Web Client ID, nên ở đây ta check theo Web Client ID
                    Audience = new[]
                    {
                        _cfg["Google:ClientId"] // Hoặc _cfg["Authentication:Google:ClientId"] tùy config
                    }
                };

                // Hàm này sẽ throw Exception nếu token giả, hết hạn, hoặc sai ClientID
                var payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, settings);

                // --- BƯỚC 3: Mapping thông tin ---
                var dto = new AuthLoginGoogleRequest
                {
                    GoogleSub = payload.Subject,       // ID người dùng duy nhất bên Google
                    email = payload.Email,
                    fullName = payload.Name,
                    avatar = payload.Picture,
                    // Nếu cần verify email:
                    // IsEmailVerified = payload.EmailVerified 
                };

                // --- BƯỚC 4: Gọi Service xử lý Login/Register (Giống hệt Web) ---
                var result = await _authLoginService.LoginWithGoogleAsync(dto, ct);

                // Nếu lỗi từ Service
                if (result.ErrorCode != 200 || result.Data is null)
                    return StatusCode(result.ErrorCode, result);

                // --- BƯỚC 5: Xử lý MFA (Nếu hệ thống có bật) ---
                if (TryGetBoolProp(result.Data, "requiresMfa") == true)
                {
                    // Mobile tự lo việc điều hướng sang màn nhập OTP
                    return Ok(result);
                }

                // --- BƯỚC 6: Trả về Token (JSON) ---
                // Mobile không dùng Cookie, phải trả JSON thẳng
                if (!TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
                    return StatusCode(500, ResponseConst.Error<string>(500, "Không tạo được token hệ thống"));

                return Ok(new
                {
                    accessToken = access,
                    accessTokenExpiresAt = accessExp,
                    refreshToken = refresh,
                    refreshTokenExpiresAt = refreshExp,
                    // Trả thêm thông tin user nếu mobile cần hiển thị ngay
                    user = new
                    {
                        email = payload.Email,
                        name = payload.Name,
                        avatar = payload.Picture
                    }
                });
            }
            catch (InvalidJwtException ex)
            {
                // Token Google hết hạn hoặc không hợp lệ
                return Unauthorized(ResponseConst.Error<string>(401, $"Token Google không hợp lệ: {ex.Message}"));
            }
            catch (Exception ex)
            {
                // Lỗi hệ thống khác
                return StatusCode(500, ResponseConst.Error<string>(500, $"Lỗi server: {ex.Message}"));
            }
        }

        [HttpGet("google/callback")]
        [HttpGet("signin-google")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl, CancellationToken ct)
        {
            var safeReturnUrl = GetSafeReturnUrl(returnUrl);

            var authResult = await HttpContext.AuthenticateAsync("External");
            if (authResult?.Succeeded != true || authResult.Principal is null)
            {
                return Redirect(AppendQuery(safeReturnUrl, "error", "google_auth_failed"));
            }

            var p = authResult.Principal;
            string? sub = p.FindFirstValue(ClaimTypes.NameIdentifier) ?? p.FindFirstValue("sub");
            string? email = p.FindFirstValue(ClaimTypes.Email);
            string? fullName = p.FindFirstValue(ClaimTypes.Name);
            string? given = p.FindFirstValue(ClaimTypes.GivenName);
            string? family = p.FindFirstValue(ClaimTypes.Surname);
            string? picture = p.FindFirstValue("urn:google:picture") ?? p.FindFirstValue("picture");

            if (string.IsNullOrWhiteSpace(fullName))
                fullName = string.Join(' ', new[] { given, family }.Where(s => !string.IsNullOrWhiteSpace(s)));

            if (string.IsNullOrWhiteSpace(sub) || string.IsNullOrWhiteSpace(email))
            {
                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                return Redirect(AppendQuery(safeReturnUrl, "error", "missing_google_claims"));
            }

            var dto = new AuthLoginGoogleRequest
            {
                GoogleSub = sub,
                email = email,
                fullName = fullName,
                avatar = picture
            };

            var result = await _authLoginService.LoginWithGoogleAsync(dto, ct);

            // Dọn external cookie
            await HttpContext.SignOutAsync("External");

            if (result.ErrorCode != 200 || result.Data is null)
            {
                var loginUrl = _cfg["Frontend:LoginUrl"]
                               ?? $"{_cfg["Frontend:AppUrl"] ?? "http://localhost:3000"}/login";
                return Redirect(AppendQuery(loginUrl, "error", "google_login_failed"));
            }

            // Nếu cần MFA: không set cookie, chuyển FE
            if (TryGetBoolProp(result.Data, "requiresMfa") == true &&
                !string.IsNullOrWhiteSpace(TryGetStringProp(result.Data, "mfaTicket")))
            {
                var appUrl = _cfg["Frontend:AppUrl"] ?? "http://localhost:3000";
                var mfaPath = _cfg["Frontend:MfaVerifyPath"] ?? "/mfa/verify";
                var mfaUrl = $"{appUrl.TrimEnd('/')}{mfaPath}";
                return Redirect(AppendQuery(mfaUrl, "ticket", TryGetStringProp(result.Data, "mfaTicket")!));
            }

            // Set cookie access & refresh nếu có
            if (TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
            {
                SetAuthCookies(access!, refresh!, accessExp, refreshExp);
            }

            var appBase = _cfg["Frontend:AppUrl"] ?? "http://localhost:3000";
            var successUrl = $"{appBase.TrimEnd('/')}/business/mainScreen";
            return Redirect(appBase);
        }
        public sealed class GoogleIdLoginRequest { public string IdToken { get; set; } = default!; }

        //[HttpPost("login/mobile/google-id")] // đổi thành [HttpPost("google-id")] nếu muốn /login/google-id
        //[AllowAnonymous]
        //public async Task<IActionResult> LoginWithGoogleId([FromBody] GoogleIdLoginRequest req, CancellationToken ct)
        //{
        //    if (string.IsNullOrWhiteSpace(req.IdToken))
        //        return BadRequest(ResponseConst.Error<string>(400, "Missing idToken"));

        //    // 1) Xác thực ID Token từ Google (chữ ký, iss, aud, exp, ...)
        //    var settings = new GoogleJsonWebSignature.ValidationSettings
        //    {
        //        Audience = new[]
        //        {
        //    _cfg["Google:ClientId:Web"],
        //    _cfg["Google:ClientId:Android"],
        //    _cfg["Google:ClientId:iOS"]
        //}.Where(x => !string.IsNullOrWhiteSpace(x)).ToArray()
        //    };

        //    GoogleJsonWebSignature.Payload payload;
        //    try
        //    {
        //        payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken, settings);
        //    }
        //    catch
        //    {
        //        return Unauthorized(ResponseConst.Error<string>(401, "Invalid Google token"));
        //    }

        //    if (payload.EmailVerified != true)
        //        return Conflict(ResponseConst.Error<string>(409, "Email not verified"));

        //    // 2) Gọi service giống flow Google web
        //    var dto = new AuthLoginGoogleRequest
        //    {
        //        GoogleSub = payload.Subject,
        //        email = payload.Email,
        //        fullName = payload.Name,
        //        avatar = payload.Picture
        //    };

        //    var result = await _authLoginService.LoginWithGoogleAsync(dto, ct);
        //    if (result is null)
        //        return StatusCode(500, ResponseConst.Error<string>(500, "Auth service error"));

        //    if (result.ErrorCode != 200 || result.Data is null)
        //        return StatusCode(result.ErrorCode, result);

        //    // 3) Nếu yêu cầu MFA: trả về để app chuyển sang màn hình nhập code
        //    if (TryGetBoolProp(result.Data, "requiresMfa") == true &&
        //        !string.IsNullOrWhiteSpace(TryGetStringProp(result.Data, "mfaTicket")))
        //    {
        //        return Ok(result); // { requiresMfa: true, mfaTicket: "..." }
        //    }

        //    // 4) Trả token dạng JSON (mobile không dùng cookie)
        //    if (!TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
        //        return StatusCode(500, ResponseConst.Error<string>(500, "Không lấy được token"));

        //    Response.Headers["Cache-Control"] = "no-store";
        //    return Ok(new
        //    {
        //        accessToken = access,
        //        accessTokenExpiresAt = accessExp,
        //        refreshToken = refresh,
        //        refreshTokenExpiresAt = refreshExp
        //    });
        //}

        [HttpPost("mfa/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyMfa([FromBody] MfaLoginVerifyRequest req, CancellationToken ct)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.mfaTicket) || string.IsNullOrWhiteSpace(req.code))
                return BadRequest(ResponseConst.Error<bool>(400, "Thiếu mfaTicket hoặc code"));

            var result = await _authLoginService.VerifyMfaAndLoginAsync(req, ct);
            if (result.ErrorCode != 200 || result.Data is null)
                return BadRequest(result);

            if (!TryExtractTokens(result.Data, out var access, out var refresh, out var accessExp, out var refreshExp))
                return StatusCode(500, ResponseConst.Error<string>(500, "Không lấy được token"));

            SetAuthCookies(access!, refresh!, accessExp, refreshExp);

            // Có thể trả minimal cho FE
            return Ok(new { authenticated = true });
        }

        public sealed record RefreshRequest(string? RefreshToken);

        [HttpPost("auth/refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh([FromBody] RefreshRequest? body, CancellationToken ct)
        {
            try
            {
                // 1) Ưu tiên RT trong body (mobile); nếu không có thì lấy từ cookie (web)
                // Lưu ý: Mobile thường gửi body, Web (nếu bảo mật cao) sẽ gửi cookie HttpOnly
                var usingBody = !string.IsNullOrWhiteSpace(body?.RefreshToken);
                var rtRaw = usingBody ? body!.RefreshToken! : Request.Cookies["fz.refresh"];

                // Nếu không tìm thấy token ở đâu cả
                if (string.IsNullOrWhiteSpace(rtRaw))
                {
                    return BadRequest(new { errorCode = 400, errorMessage = "Refresh token is missing." });
                }

                // 2) CSRF cho luồng cookie (web)
                // Nếu dùng Cookie, bắt buộc phải check CSRF để tránh tấn công giả mạo
                if (!usingBody)
                {
                    var csrfCookie = Request.Cookies["fz.csrf"];
                    var csrfHeader = Request.Headers["X-CSRF"].ToString();

                    if (string.IsNullOrEmpty(csrfCookie) || string.IsNullOrEmpty(csrfHeader) || csrfCookie != csrfHeader)
                    {
                        // Xóa cookie để force login lại
                        DeleteAuthCookies();
                        return StatusCode(StatusCodes.Status403Forbidden, new { errorCode = 403, errorMessage = "CSRF validation failed." });
                    }
                }

                // 3) Xoay token (CÓ TRY-CATCH)
                // Hàm này sẽ ném Exception nếu token cũ không hợp lệ (hết hạn/thu hồi/dùng lại)
                var (access, newRt, permissions) = await _tokenGenerate.RotateAsync(
                    incomingRefreshToken: rtRaw,
                    ip: _tokenGenerate.GetClientIp() ?? "unknown",
                    accessTtl: TimeSpan.FromMinutes(30),
                    refreshTtl: TimeSpan.FromDays(7)
                );

                // 4) Set lại cookie cho web (Nếu request gốc dùng cookie hoặc muốn đồng bộ cả 2)
                var accessExp = DateTimeOffset.UtcNow.AddMinutes(30);
                SetAuthCookies(access, newRt.Token, accessExp, newRt.Expires);

                // 5) Trả kết quả JSON
                Response.Headers["Cache-Control"] = "no-store";

                return Ok(new ResponseDto<object>
                {
                    ErrorCode = 200,
                    ErrorMessage = "Làm mới token thành công",
                    Data = new
                    {
                        accessToken = access,
                        accessTokenExpiresAt = accessExp,
                        refreshToken = newRt.Token,
                        refreshTokenExpiresAt = newRt.Expires,
                        permissions = permissions
                    }
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                // ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT: Bắt lỗi token không hợp lệ
                // Xóa cookie cũ đi để trình duyệt không gửi rác nữa
                DeleteAuthCookies();

                return StatusCode(401, new ResponseDto<object>
                {
                    ErrorCode = 401,
                    ErrorMessage = "Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ResponseDto<object> { ErrorCode = 500, ErrorMessage = "Lỗi hệ thống." });
            }
        }

        // --- Helper Set Cookie (Tham khảo) ---
        private void SetAuthCookies(string accessToken, string refreshToken, DateTimeOffset accessExp, DateTimeOffset refreshExp)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true, // JS không đọc được (chống XSS)
                Secure = true,   // Chỉ chạy trên HTTPS
                SameSite = SameSiteMode.None, // Cần thiết nếu FE và BE khác domain (ví dụ localhost:3000 và localhost:5000)
                Path = "/"       // Access token dùng cho toàn site
            };

            // 1. Access Token Cookie
            Response.Cookies.Append("fz.access", accessToken, cookieOptions);

            // 2. Refresh Token Cookie (Quan trọng: Path chỉ định)
            var refreshOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/login/auth/refresh", // Chỉ gửi cookie này khi gọi đúng endpoint refresh (Bảo mật hơn)
                Expires = refreshExp
            };
            Response.Cookies.Append("fz.refresh", refreshToken, refreshOptions);
        }

        private void DeleteAuthCookies()
        {
            Response.Cookies.Delete("fz.access");
            Response.Cookies.Delete("fz.refresh");
            Response.Cookies.Delete("fz.csrf");
        }


        // ====================== helpers ======================
        private static List<string>? TryGetPermissions(object data)
        {
            try
            {
                // Giả sử LoginResponse có field public List<string> permissions { get; set; }
                if (data is LoginResponse lr) return lr.permissions;
                return null;
            }
            catch { return null; }
        }
        private void SetAuthCookies(
            string access, string refresh,
            DateTimeOffset accessExp, DateTimeOffset refreshExp,
            bool limitRefreshPath = false)
        {
            var domain = _cfg["Cookie:Domain"];

            var baseOpt = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Domain = string.IsNullOrWhiteSpace(domain) ? null : domain
            };

            Response.Cookies.Append("fz.access", access, new CookieOptions
            {
                HttpOnly = baseOpt.HttpOnly,
                Secure = baseOpt.Secure,
                SameSite = baseOpt.SameSite,
                Domain = baseOpt.Domain,
                Path = "/",
                Expires = accessExp
            });

            Response.Cookies.Append("fz.refresh", refresh, new CookieOptions
            {
                HttpOnly = baseOpt.HttpOnly,
                Secure = baseOpt.Secure,
                SameSite = baseOpt.SameSite,
                Domain = baseOpt.Domain,
                Path = limitRefreshPath ? "/login/auth" : "/",
                Expires = refreshExp
            });

            // (tuỳ chọn) set/cập nhật CSRF cookie cho web
            var csrf = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            Response.Cookies.Append("fz.csrf", csrf, new CookieOptions
            {
                HttpOnly = false,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/"
            });
        }


        private void ClearAuthCookies()
        {
            var domain = _cfg["Cookie:Domain"];
            var opt = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.None,
                Path = "/",
                Domain = string.IsNullOrWhiteSpace(domain) ? null : domain
            };

            Response.Cookies.Delete(AccessCookie, opt);
            Response.Cookies.Delete(RefreshCookie, opt);
        }

        /// <summary>
        /// Bóc token từ DTO trả về (linh hoạt với TokenPairDto hoặc object ẩn danh).
        /// Yêu cầu các field: AccessToken, RefreshToken, AccessTokenExpiresAt, RefreshTokenExpiresAt (UTC).
        /// </summary>
        private static bool TryExtractTokens(
            object data,
            out string? access, out string? refresh,
            out DateTimeOffset accessExp, out DateTimeOffset refreshExp)
        {
            access = null; refresh = null;
            accessExp = DateTimeOffset.UtcNow.AddMinutes(30);
            refreshExp = DateTimeOffset.UtcNow.AddDays(7);

            // ✅ 1) Nếu service trả về LoginResponse (case của bạn)
            if (data is LoginResponse lr)
            {
                access = lr.token;
                refresh = lr.refreshToken;

                if (lr.tokenExpiration != default) accessExp = lr.tokenExpiration;
                if (lr.refreshTokenExpiration != default) refreshExp = lr.refreshTokenExpiration;

                return !string.IsNullOrWhiteSpace(access) && !string.IsNullOrWhiteSpace(refresh);
            }

            // ✅ 2) Nếu là TokenPairDto (giữ nguyên nhánh cũ)
            if (data is TokenPairDto dto)
            {
                access = dto.AccessToken;
                refresh = dto.RefreshToken;
                if (dto.AccessTokenExpiresAt != default) accessExp = dto.AccessTokenExpiresAt;
                if (dto.RefreshTokenExpiresAt != default) refreshExp = dto.RefreshTokenExpiresAt;
                return !string.IsNullOrWhiteSpace(access) && !string.IsNullOrWhiteSpace(refresh);
            }

            // ✅ 3) Fallback JSON linh hoạt (có thể giữ bản bạn đang có,
            // hoặc dùng bản mình đã gửi ở tin trước để bắt cả accessToken/token/jwt...)
            // ... (giữ nguyên phần parse JSON hiện tại của bạn) ...

            return false;
        }

        private static bool? TryGetBoolProp(object data, string name)
        {
            try
            {
                var json = JsonSerializer.Serialize(data);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.True) return true;
                if (doc.RootElement.TryGetProperty(name, out v) && v.ValueKind == JsonValueKind.False) return false;
                return null;
            }
            catch { return null; }
        }

        private static string? TryGetStringProp(object data, string name)
        {
            try
            {
                var json = JsonSerializer.Serialize(data);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String)
                    return v.GetString();
                return null;
            }
            catch { return null; }
        }

        private string GetSafeReturnUrl(string? returnUrl)
        {
            var allowed = _cfg.GetSection("Frontend:AllowedReturnUrls").Get<string[]>() ?? Array.Empty<string>();
            if (!string.IsNullOrWhiteSpace(returnUrl) &&
                allowed.Any(a => returnUrl.StartsWith(a, StringComparison.OrdinalIgnoreCase)))
                return returnUrl;

            return _cfg["Frontend:AppUrl"] ?? "http://localhost:3000";
        }

        private static string AppendQuery(string url, string key, string value)
        {
            var sep = url.Contains('?') ? "&" : "?";
            return $"{url}{sep}{Uri.EscapeDataString(key)}={Uri.EscapeDataString(value)}";
        }
    }

    // Ví dụ DTO nếu bạn có
    public sealed class TokenPairDto
    {
        public string AccessToken { get; set; } = default!;
        public string RefreshToken { get; set; } = default!;
        public DateTimeOffset AccessTokenExpiresAt { get; set; }
        public DateTimeOffset RefreshTokenExpiresAt { get; set; }
    }
    public sealed class GoogleMobileLoginRequest
    {
        public string IdToken { get; set; } = default!;
    }
}
