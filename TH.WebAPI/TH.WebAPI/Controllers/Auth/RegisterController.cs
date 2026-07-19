using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Auth.ApplicationService.Service.User;
using TH.Auth.Dtos.User;
using TH.TownHub.ApplicationService.Service;
using TH.TownHub.Dtos;

namespace TH.WebAPI.Controllers.Auth
{
    /// <summary>
    /// Quản lý tạo tài khoản theo từng đối tượng:
    ///   POST /register/create-bql      → Admin tạo tài khoản Ban Quản Lý (không có căn hộ)
    ///   POST /register/create-resident → BQL/Admin tạo tài khoản Cư dân (có căn hộ để ở)
    ///                                    Nếu isBusinessOwner=true → tự động tạo hồ sơ NCC (chờ duyệt)
    ///   POST /register/verifyRegisterEmail → Public, xác thực email
    /// </summary>
    [Route("register")]
    [ApiController]
    public class RegisterController : Controller
    {
        private readonly IAuthRegisterService _authRegisterService;
        private readonly IResidentService _residentService;
        private readonly IProviderService _providerService;

        public RegisterController(
            IAuthRegisterService authRegisterService,
            IResidentService residentService,
            IProviderService providerService)
        {
            _authRegisterService = authRegisterService;
            _residentService = residentService;
            _providerService = providerService;
        }

        // ── Public ─────────────────────────────────────────────────────────────────

        /// <summary>
        /// Cư dân tự đăng ký tài khoản (public).
        /// Tạo AuthUser (scope="user") + gán role mặc định. Email được xác thực ngay
        /// (RegisterAsync set isEmailVerified=true) nên đăng nhập được luôn, không cần OTP.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
        {
            var result = await _authRegisterService.RegisterAsync(req, ct);
            if (result.ErrorCode != 200) return BadRequest(result);
            return Ok(result);
        }

        // ── Admin only ────────────────────────────────────────────────────────────

        /// <summary>
        /// Admin tạo tài khoản Ban Quản Lý.
        /// Scope tự động = "staff". Không được gắn căn hộ.
        /// </summary>
        [HttpPost("create-bql")]
        [Authorize(Policy = "UserCreateBQL")]
        public async Task<IActionResult> CreateBQL([FromBody] CreateBQLAccountRequestDto req, CancellationToken ct)
        {
            var authReq = new SimpleCreateUserRequest
            {
                userName        = req.userName,
                email           = req.email,
                password        = req.password,
                scope           = "staff",          // cố định
                autoVerifyEmail = true,
                roleIds         = req.roleIds,
                firstName       = req.firstName,
                lastName        = req.lastName,
                gender          = req.gender,
                dateOfBirth     = req.dateOfBirth
            };

            var result = await _authRegisterService.CreateSimpleUserAsync(authReq, ct);
            if (result.ErrorCode != 200) return BadRequest(result);
            return Ok(result);
        }

        // ── BQL + Admin ───────────────────────────────────────────────────────────

        /// <summary>
        /// BQL / Admin tạo tài khoản Cư dân.
        /// Tạo AuthUser (scope="user") + hồ sơ Resident gắn căn hộ để ở.
        /// Nếu isBusinessOwner = true → tạo thêm hồ sơ NCC (trạng thái pending, chờ BQL duyệt).
        /// </summary>
        [HttpPost("create-resident")]
        [Authorize(Policy = "UserCreate")]
        public async Task<IActionResult> CreateResident(
            [FromBody] CreateResidentAccountRequestDto req, CancellationToken ct)
        {
            // ── Bước 1: Tạo AuthUser (scope="user") ───────────────────────────
            var authReq = new SimpleCreateUserRequest
            {
                userName        = req.userName,
                email           = string.IsNullOrWhiteSpace(req.email) ? null : req.email,
                password        = req.password,
                scope           = "user",           // cố định — cư dân
                autoVerifyEmail = true,
                firstName       = req.fullName,     // dùng fullName làm firstName
                gender          = req.gender,
                dateOfBirth     = req.dateOfBirth
            };

            var authResult = await _authRegisterService.CreateResidentUserAsync(authReq, ct);
            if (authResult.ErrorCode != 200) return BadRequest(authResult);

            var authUserId = authResult.Data!.userID;

            // ── Bước 2: Tạo hồ sơ Cư dân ─────────────────────────────────────
            var residentReq = new CreateResidentRequestDto
            {
                fullName        = req.fullName,
                phone           = req.phone,
                email           = req.email,
                idCard          = req.idCard,
                dateOfBirth     = req.dateOfBirth,
                gender          = req.gender,
                avatarUrl       = req.avatarUrl,
                apartmentId     = req.apartmentId,
                isOwner         = req.isOwner,
                moveInDate      = req.moveInDate,
                isBusinessOwner = req.isBusinessOwner,
                authUserId      = authUserId
            };

            var residentResult = await _residentService.CreateAndGetIdAsync(residentReq);
            if (residentResult.ErrorCode != 200)
            {
                // AuthUser đã tạo nhưng Resident thất bại — log để xử lý thủ công nếu cần
                return StatusCode(207, new
                {
                    authUser  = authResult.Data,
                    resident  = residentResult.ErrorMessage,
                    warning   = "Tài khoản đã tạo nhưng hồ sơ cư dân thất bại. Vui lòng liên hệ admin."
                });
            }

            var residentId = residentResult.Data;

            // ── Bước 3 (tuỳ chọn): Tạo hồ sơ NCC nếu kinh doanh ─────────────
            if (req.isBusinessOwner)
            {
                var providerReq = new RegisterProviderRequestDto
                {
                    companyName        = req.businessCompanyName ?? req.fullName,
                    contactName        = req.fullName,
                    phone              = req.phone,
                    email              = req.email,
                    address            = req.businessAddress,
                    serviceCategories  = req.businessServiceCategories,
                    residentId         = residentId         // liên kết với Resident vừa tạo
                };

                // Không bắt lỗi cứng ở đây — NCC chỉ là pending, thất bại có thể đăng ký lại
                await _providerService.RegisterAsync(providerReq);
            }

            return Ok(new
            {
                authUser        = authResult.Data,
                residentId      = residentId,
                isBusinessOwner = req.isBusinessOwner,
                message         = req.isBusinessOwner
                    ? "Tạo tài khoản cư dân thành công. Hồ sơ nhà cung cấp đang chờ BQL duyệt."
                    : "Tạo tài khoản cư dân thành công."
            });
        }
    }
}
