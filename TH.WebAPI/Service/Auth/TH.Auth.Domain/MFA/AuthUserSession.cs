using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Token;
using TH.Auth.Domain.User;

namespace TH.Auth.Domain.MFA
{
    [Table(nameof(AuthUserSession), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthUserSession
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int sessionID { get; set; }

        [ForeignKey(nameof(user))]
        public int userID { get; set; }

        public string deviceId { get; set; }
        public string? ip { get; set; }
        public string? userAgent { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime lastSeenAt { get; set; }
        public bool isRevoked { get; set; }

        public virtual AuthUser user { get; set; }
        public virtual ICollection<AuthRefreshToken> refreshTokens { get; set; } = new List<AuthRefreshToken>();
    }
}
