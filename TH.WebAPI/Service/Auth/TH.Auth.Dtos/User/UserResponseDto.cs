using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.User
{
    public class RegisterResponse
    {
        public int userID { get; set; }
        public string userName { get; set; }
        public string email { get; set; }
        public bool isEmailVerified { get; set; }
    }
    public class LoginResponse
    {
        public int userID { get; set; }
        public string userName { get; set; }
        public string email { get; set; }
        public bool isEmailVerified { get; set; }
        public string token { get; set; }
        public string refreshToken { get; set; }
        public int sessionId { get; set; }
        public string? mfaTicket { get; set; }
        public bool? requiresMfa { get; set; }
        public string deviceId { get; set; }
        public List<string> permissions { get; set; }
        public DateTime tokenExpiration { get; set; }
        public DateTime refreshTokenExpiration { get; set; }
        public List<RoleSlimDto> roles { get; set; } = new();
    }
    public class RoleSlimDto
    {
        public int roleID { get; set; }
        public string roleName { get; set; } = default!;
    }

    // Password reset
    public sealed class ForgotPasswordResponse
    {
        public int userID { get; set; }
        public string email { get; set; } = default!;
        public DateTime sentAt { get; set; }
        public DateTime expiresAt { get; set; }
    }
    public sealed class VerifyResetCodeResponse
    {
        public int userID { get; set; }
        public string resetTicket { get; set; } = default!;
        public DateTime expiresAt { get; set; }
    }

    //change password
    public sealed class StartChangeByEmailResponse
    {
        public string requestId { get; set; } = default!;
        public string maskedEmail { get; set; } = default!;
    }
    public sealed class VerifyChangeByEmailResponse
    {
        public DateTime verifiedAt { get; set; }
        public DateTime canChangeUntil { get; set; } // ví dụ: +10 phút
    }

    public class GetUserResponseDto
    {
        public int userID { get; set; }
        public string userName { get; set; }
        public string email { get; set; }
        public string status { get; set; }
        public bool isEmailVerified { get; set; }
        public ProfileResponseDto? profile { get; set; }

    }
    public class ProfileResponseDto
    {
        public string? firstName { get; set; }
        public string? lastName { get; set; }
        public string? avatar { get; set; }
        public string? gender { get; set; }
        public DateTime? dateOfBirth { get; set; }
    }


















    public record UserSlimDto(
        int userID,
        string userName,
        string email,
        string status,
        bool isEmailVerified,
        ProfileDto? profile,
        MfaSecretDto? mfaSecret,
        List<SessionDto> sessions,
        List<AuditLogDto> auditLogs,
        List<EmailVerificationDto> emailVerifications,
        List<PasswordResetDto> passwordResets,
        List<RefreshTokenDto> refreshTokens,
        List<roleDto> roles,
        List<permissionDto> permissions
    );

    public record roleDto(int roleID, string roleName, string roleDescription);
    public record permissionDto(int permissionID, string permissionName, string code);

    public record ProfileDto(string? firstName, string? lastName, string? avatar, string? gender, DateTime? dateOfBirth);

    // KHÔNG trả 'secret' & 'recoveryCodes' để tránh lộ bí mật
    public record MfaSecretDto(string type, bool isEnabled, DateTime updatedAt);

    public record SessionDto(int sessionID, string deviceId, string ip, string userAgent, DateTime createdAt, DateTime lastSeenAt, bool isRevoked);

    public record AuditLogDto(int auditID, string action, string result, string ip, string userAgent, DateTime createdAt, string detail);

    public record EmailVerificationDto(int emailVerificationID, DateTime createdAt, DateTime expiresAt, DateTime? consumedAt);

    public record PasswordResetDto(int passwordResetID, DateTime createdAt, DateTime expiresAt, DateTime? consumedAt);

    // KHÔNG trả thuộc tính Token (chuỗi RT) — chỉ metadata
    public record RefreshTokenDto(
        int refreshTokenID,
        int sessionID,
        DateTime created,
        DateTime expires,
        DateTime? revoked,
        string? replacedByToken, // có thể null
        bool isActive
    );
}
