using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.User;

namespace TH.Auth.Domain.Token
{
    [Table(nameof(AuthPasswordReset), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthPasswordReset
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Key]
        public int passwordResetID { get; set; }

        [ForeignKey(nameof(user))]
        public int userID { get; set; }

        public string codeHash { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime expiresAt { get; set; }
        public DateTime? consumedAt { get; set; }
        public string purpose { get; set; } = "Reset";

        public virtual AuthUser user { get; set; }
    }
}
