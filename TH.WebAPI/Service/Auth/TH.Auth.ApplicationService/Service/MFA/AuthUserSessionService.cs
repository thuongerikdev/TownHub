using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.ApplicationService.Common;
using TH.Auth.Domain.MFA;
using TH.Auth.Infrastructure.Repository.MFA;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.MFA
{
    public interface IAuthUserSessionService
    {
        Task<ResponseDto<AuthUserSession?>> FindByIdAsync(int sessionId, CancellationToken ct);
        Task<ResponseDto<List<AuthUserSession>>> GetActiveSessionsByUserIdAsync(int userId, CancellationToken ct);
        Task<ResponseDto<List<AuthUserSession>>> GetAllSessionsAsync(CancellationToken ct);
    }
    public class AuthUserSessionService : AuthServiceBase, IAuthUserSessionService
    {
        private readonly IAuthUserSessionRepository _authUserSessionRepository;
        public AuthUserSessionService(
            ILogger<AuthUserSessionService> logger,
            IAuthUserSessionRepository authUserSessionRepository
            ) : base(logger)
        {
            _authUserSessionRepository = authUserSessionRepository;
        }
        public async Task<ResponseDto<AuthUserSession?>> FindByIdAsync(int sessionId, CancellationToken ct)
        {
            try
            {
                var session = await _authUserSessionRepository.FindByIdAsync(sessionId, ct);
                return ResponseConst.Success("Lấy session thành công", session);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in FindByIdAsync");
                return ResponseConst.Error<AuthUserSession?>(500, "Internal Server Error");
            }
        }
        public async Task<ResponseDto<List<AuthUserSession>>> GetActiveSessionsByUserIdAsync(int userId, CancellationToken ct)
        {
            try
            {
                var sessions = await _authUserSessionRepository.GetActiveSessionsByUserIdAsync(userId, ct);
                return ResponseConst.Success("Lấy danh sách session thành công", sessions);


            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetActiveSessionsByUserIdAsync");
                return ResponseConst.Error<List<AuthUserSession>>(500, "Internal Server Error");
            }
        }
        public async Task<ResponseDto<List<AuthUserSession>>> GetAllSessionsAsync(CancellationToken ct)
        {
            try
            {
                var sessions = await _authUserSessionRepository.GetAllSessionsAsync(ct);
                return ResponseConst.Success("Lấy danh sách session thành công", sessions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAllSessionsAsync");
                return ResponseConst.Error<List<AuthUserSession>>(500, "Internal Server Error");
            }
        }
    }
}
