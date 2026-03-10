using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Domain.Role
{
    [Table(nameof(AuthRole), Schema = Constant.Database.DbSchema.Auth)]
    public class AuthRole
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int roleID { get; set; }

        [Required, MaxLength(100)]
        public string roleName { get; set; }
        [MaxLength(255)]
        public string roleDescription { get; set; }
        public bool isDefault { get; set; } = false; // Vai trò mặc định khi tạo user mới
        public string? scope { get; set; }

        public virtual ICollection<AuthUserRole> userRoles { get; set; }
        public virtual ICollection<AuthRolePermission> rolePermissions { get; set; }

        //public virtual ICollection<FZ.Auth.Domain.Billing.Plan> plans { get; set; }
    }
}
