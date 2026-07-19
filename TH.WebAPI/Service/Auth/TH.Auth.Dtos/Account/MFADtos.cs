using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.Account
{
    public class StartTotpResponse
    {
        public string secretBase32 { get; set; } = default!;
        public string otpauthUri { get; set; } = default!;
        public string? label { get; set; }
    }

    public class ConfirmTotpRequest
    {
        public string code { get; set; } = default!;
    }

    public class DisableMfaRequest
    {
        public string? confirmCode { get; set; } // tuỳ chọn: yêu cầu nhập code để tắt
    }

    /// <summary>Trạng thái MFA của user hiện tại (dùng cho màn Cài đặt).</summary>
    public class MfaStatusResponse
    {
        public bool enabled { get; set; }
        public string status { get; set; } = "Disabled"; // Pending | Enabled | Disabled
        public string type { get; set; } = "TOTP";
        public string? label { get; set; }
        public DateTime? enabledAt { get; set; }
        public DateTime? lastVerifiedAt { get; set; }
    }
}
