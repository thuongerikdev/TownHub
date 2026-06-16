using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Domain.User
{
    [Table(nameof(AuthProfile), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthProfile
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int profileID { get; set; }

        [ForeignKey(nameof(user))]
        public int userID { get; set; }

        [MaxLength(100)]
        public string firstName { get; set; }
        [MaxLength(100)]
        public string lastName { get; set; }
        public string? avatar { get; set; }
        [MaxLength(16)]
        public string? gender { get; set; }
        public DateTime? dateOfBirth { get; set; }

        public virtual AuthUser user { get; set; }
    }
}
