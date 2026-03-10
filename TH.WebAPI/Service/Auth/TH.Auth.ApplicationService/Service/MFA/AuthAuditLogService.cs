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
    public interface IAuthAuditLogService
    {
        Task<ResponseDto<List<AuthAuditLog>>> GetLogsByUserIdAsync(int userId, CancellationToken ct);
        Task<ResponseDto<AuthAuditLog>> GetLogsByID(int auditID, CancellationToken ct);
        Task<ResponseDto<List<AuthAuditLog>>> GetAllLogsAsync(CancellationToken ct);
    }
    public class AuthAuditLogService : AuthServiceBase, IAuthAuditLogService
    {
        private readonly IAuditLogRepository _authAuditLogRepository;
        public AuthAuditLogService(
            ILogger<AuthAuditLogService> logger,
            IAuditLogRepository authAuditLogRepository
            ) : base(logger)
        {
            _authAuditLogRepository = authAuditLogRepository;
        }
        public async Task<ResponseDto<List<AuthAuditLog>>> GetLogsByUserIdAsync(int userId, CancellationToken ct)
        {
            try
            {
                var logs = await _authAuditLogRepository.GetLogsByUserIdAsync(userId, ct);
                return ResponseConst.Success("Logs retrieved successfully.", logs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving logs by user ID.");
                return ResponseConst.Error<List<AuthAuditLog>>(500, "Internal server error.");
            }
        }
        public async Task<ResponseDto<AuthAuditLog>> GetLogsByID(int auditID, CancellationToken ct)
        {
            try
            {
                var log = await _authAuditLogRepository.GetLogsByID(auditID, ct);
                if (log == null)
                {
                    return ResponseConst.Error<AuthAuditLog>(404, "Log not found.");
                }
                return ResponseConst.Success("Log retrieved successfully.", log);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving log by ID.");
                return ResponseConst.Error<AuthAuditLog>(500, "Internal server error.");
            }
        }
        public async Task<ResponseDto<List<AuthAuditLog>>> GetAllLogsAsync(CancellationToken ct)
        {
            try
            {
                var logs = await _authAuditLogRepository.GetAllLogsAsync(ct);
                return ResponseConst.Success("All logs retrieved successfully.", logs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all logs.");
                return ResponseConst.Error<List<AuthAuditLog>>(500, "Internal server error.");
            }
        }
    }
}
