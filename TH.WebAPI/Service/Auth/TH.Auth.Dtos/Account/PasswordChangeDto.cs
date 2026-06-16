using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.Account
{
    public class StartChangeByEmailRequest
    {
        public string email { get; set; } = default!;
    }

    public class VerifyEmailCodeRequest
    {
        public string email { get; set; } = default!;
        public string code { get; set; } = default!;
    }

    public class VerifyMfaCodeRequest
    {
        public string code { get; set; } = default!;
    }

    public class CommitPasswordChangeRequest
    {
        public string ticket { get; set; } = default!;
        public string oldPassword { get; set; } = default!;
        public string newPassword { get; set; } = default!;
    }
}
