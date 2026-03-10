using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TH.Auth.ApplicationService.Service.User;
using TH.Auth.Dtos.User;

namespace TH.WebAPI.Controllers.Auth
{
    [Route("register")]
    [ApiController]
    public class RegisterController : Controller
    {
        private readonly IAuthRegisterService _authRegisterService;
        public RegisterController(IAuthRegisterService authRegisterService)
        {
            _authRegisterService = authRegisterService;
        }
        [HttpPost]
        public async Task<IActionResult> Register(RegisterRequest registerRequest, CancellationToken ct)
        {
            var result = await _authRegisterService.RegisterAsync(registerRequest, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);

        }
        [HttpPost("verifyRegisterEmail")]
        public async Task<IActionResult> VerifyRegisterEmail(VerifyEmailRequest verifyEmailRequest, CancellationToken ct)
        {
            var result = await _authRegisterService.VerifyEmailAsync(verifyEmailRequest, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        [HttpPost("createUser")]
        [Authorize(Policy = "RoleManage")]
        public async Task<IActionResult> CreateUser(SimpleCreateUserRequest createUserRequest, CancellationToken ct)
        {
            var result = await _authRegisterService.CreateSimpleUserAsync(createUserRequest, ct);
            if (result.ErrorCode != 200)
            {
                return BadRequest(result);
            }
            return Ok(result);
        }

    }
}
