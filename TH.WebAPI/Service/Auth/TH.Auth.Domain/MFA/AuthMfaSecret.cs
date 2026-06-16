using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.User;

namespace TH.Auth.Domain.MFA
{
    [Table(nameof(AuthMfaSecret), Schema = Constant.Database.DbSchema.Auth)]
    [Index(nameof(userID), nameof(type), IsUnique = true)]
    public class AuthMfaSecret
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int mfaID { get; set; }

        [ForeignKey(nameof(user))]
        public int userID { get; set; }

        [Required, MaxLength(32)]
        public string type { get; set; } = "TOTP"; // TOTP (Google Authenticator)

        [Required, MaxLength(16)]
        public string status { get; set; } = "Disabled"; // Pending | Enabled | Disabled

        public string? secret { get; set; }

        // Giữ để tương thích ngược
        public bool isEnabled { get; set; } = false;

        [MaxLength(128)]
        public string? label { get; set; }

        public string? recoveryCodes { get; set; }

        public DateTime? enrollmentStartedAt { get; set; }
        public DateTime? enabledAt { get; set; }
        public DateTime? lastVerifiedAt { get; set; }
        public DateTime updatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        public virtual AuthUser user { get; set; } = null!;
    }
}
