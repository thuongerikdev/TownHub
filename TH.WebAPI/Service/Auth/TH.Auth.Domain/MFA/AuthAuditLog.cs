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
    [Table(nameof(AuthAuditLog), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthAuditLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int auditID { get; set; }

        public int? userID { get; set; }
        public string? action { get; set; }
        public string? result { get; set; }
        public string? detail { get; set; }
        public string? ip { get; set; }
        public string? userAgent { get; set; }
        public DateTime createdAt { get; set; }

        public virtual AuthUser? user { get; set; }
    }
}
