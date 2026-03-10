using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Domain.Role
{
    [Table(nameof(AuthPermission), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthPermission
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int permissionID { get; set; }

        [Required, MaxLength(150)]
        public string permissionName { get; set; }
        [MaxLength(255)]
        public string permissionDescription { get; set; }
        public string code { get; set; }
        public string? scope { get; set; }

        public virtual ICollection<AuthRolePermission> rolePermissions { get; set; }
    }
}
