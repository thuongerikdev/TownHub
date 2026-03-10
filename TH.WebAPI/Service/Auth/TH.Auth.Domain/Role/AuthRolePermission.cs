using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Domain.Role
{
    [Table(nameof(AuthRolePermission), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthRolePermission
    {
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Key]
        public int rolePermissionID { get; set; }
        public int roleID { get; set; }
        public int permissionID { get; set; }

        public virtual AuthRole role { get; set; }
        public virtual AuthPermission permission { get; set; }
    }
}
