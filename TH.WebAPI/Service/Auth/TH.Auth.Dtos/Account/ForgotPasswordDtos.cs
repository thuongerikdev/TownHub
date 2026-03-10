using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.Account
{
    public class ForgotStartRequest
    {
        public string email { get; set; } = default!;
    }

    public class ForgotVerifyEmailCodeRequest
    {
        public string email { get; set; } = default!;
        public string code { get; set; } = default!;
    }

    // Nếu bạn muốn cho phép xác minh bằng MFA trong flow Forgot (không đăng nhập),
    // FE gửi email + code MFA, BE tra user theo email rồi verify TOTP.
    public class ForgotVerifyMfaRequest
    {
        public string email { get; set; } = default!;
        public string code { get; set; } = default!;
    }

    public class ForgotCommitRequest
    {
        public string ticket { get; set; } = default!;
        public string newPassword { get; set; } = default!;
    }
}
