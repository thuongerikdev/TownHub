using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TH.Auth.ApplicationService.Service.MFA;
using TH.Auth.ApplicationService.Service.User;
using TH.Auth.Dtos.Account;

namespace TH.WebAPI.Controllers.Auth
{
    [ApiController]
    [Route("account")]
    //[Authorize] // yêu cầu user đăng nhập (JWT)
    public sealed class AccountController : ControllerBase
    {
        private readonly IMfaService _mfa;
        private readonly IPasswordChangeService _pwd;

        public AccountController(IMfaService mfa, IPasswordChangeService pwd)
        {
            _mfa = mfa;
            _pwd = pwd;
        }

        private int CurrentUserId()
        {
            var s = User.FindFirstValue("userId");
            return int.TryParse(s, out var id) ? id : 0;
        }

        // ===== MFA (TOTP) =====

        [HttpPost("mfa/totp/start")]
        [Authorize(Policy = "AccountMfaSetup")]
        public async Task<IActionResult> StartTotp(CancellationToken ct)
        {
            var uid = CurrentUserId();
            if (uid <= 0) return Unauthorized();

            // Lấy đúng các claim đã có trong JWT mới
            var email =
                User.FindFirstValue("email") ??
                User.FindFirstValue(ClaimTypes.Email);

            var userName =
                User.FindFirstValue("userName") ??                 // ← token có key này
                User.FindFirstValue("preferred_username") ??
                User.FindFirstValue(ClaimTypes.Name) ??
                User.FindFirstValue("name") ??
                User.Identity?.Name;

            // Account label: ưu tiên email -> userName -> user:{id}
            var account = !string.IsNullOrWhiteSpace(email)
                ? email!.Trim()
                : !string.IsNullOrWhiteSpace(userName) ? userName!.Trim() : $"user:{uid}";

            // Truyền 'account' vào service; Issuer sẽ set = "FilmZone" ở service
            var res = await _mfa.StartTotpEnrollmentAsync(uid, account, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        [HttpPost("mfa/totp/confirm")]
        [Authorize(Policy = "AccountMfaSetup")]
        public async Task<IActionResult> ConfirmTotp([FromBody] ConfirmTotpRequest req, CancellationToken ct)
        {
            var uid = CurrentUserId();
            if (uid <= 0) return Unauthorized();

            var res = await _mfa.ConfirmTotpEnrollmentAsync(uid, req.code, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        [HttpPost("mfa/totp/disable")]
        [Authorize(Policy = "AccountMfaSetup")]
        public async Task<IActionResult> DisableTotp([FromBody] DisableMfaRequest req, CancellationToken ct)
        {
            var uid = CurrentUserId();
            if (uid <= 0) return Unauthorized();

            var res = await _mfa.DisableTotpAsync(uid, req.confirmCode, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        // ===== Password change via EMAIL =====


        [HttpPost("password/change/email/start")]
        [Authorize(Policy = "AccountChangePassword")]
        public async Task<IActionResult> StartChangeByEmail([FromBody] StartChangeByEmailRequest req, CancellationToken ct)
        {
            var res = await _pwd.StartChangeByEmailAsync(req.email, ct);
            // luôn trả 200 để tránh lộ email tồn tại hay không
            return Ok(res);
        }


        [HttpPost("password/change/email/verify")]
        [Authorize(Policy = "AccountChangePassword")]
        public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyEmailCodeRequest req, CancellationToken ct)
        {
            var res = await _pwd.VerifyEmailCodeAsync(req.email, req.code, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        // ===== Password change via MFA (TOTP) =====

        [HttpPost("password/change/mfa/verify")]
        [Authorize(Policy = "AccountChangePassword")]
        public async Task<IActionResult> VerifyMfa([FromBody] VerifyMfaCodeRequest req, CancellationToken ct)
        {
            var uid = CurrentUserId();
            if (uid <= 0) return Unauthorized();
            var res = await _pwd.VerifyMfaCodeAsync(uid, req.code, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        // ===== Commit change (common) =====
        [HttpPost("password/change/commit")]
        [Authorize(Policy = "AccountChangePassword")]
        public async Task<IActionResult> CommitChange([FromBody] CommitPasswordChangeRequest req, CancellationToken ct)
        {
            var uid = CurrentUserId();
            if (uid <= 0) return Unauthorized();

            var res = await _pwd.CommitChangeAsync(uid, req.ticket, req.oldPassword, req.newPassword, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }



        // ====== FORGOT BY EMAIL ======
        [HttpPost("password/forgot/email/start")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotStart([FromBody] ForgotStartRequest req, CancellationToken ct)
        {
            var res = await _pwd.StartForgotByEmailAsync(req.email, ct);
            return Ok(res); // luôn 200 để không lộ email
        }

        [HttpPost("password/forgot/email/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotVerifyEmail([FromBody] ForgotVerifyEmailCodeRequest req, CancellationToken ct)
        {
            var res = await _pwd.VerifyForgotEmailCodeAsync(req.email, req.code, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        // ====== FORGOT BY MFA (tuỳ chọn) ======
        [HttpPost("password/forgot/mfa/verify")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotVerifyMfa([FromBody] ForgotVerifyMfaRequest req, CancellationToken ct)
        {
            var res = await _pwd.VerifyForgotMfaCodeAsync(req.email, req.code, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }

        // ====== COMMIT FORGOT (anonymous) ======
        [HttpPost("password/forgot/commit")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotCommit([FromBody] ForgotCommitRequest req, CancellationToken ct)
        {
            var res = await _pwd.CommitForgotAsync(req.ticket, req.newPassword, ct);
            return StatusCode(res.ErrorCode == 200 ? 200 : 400, res);
        }
    }
}
