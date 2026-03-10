using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.Role
{
    public class RoleResponse
    {
        public int roleID { get; set; }
        public string roleName { get; set; }
        public string roleDescription { get; set; }
        public bool isDefault { get; set; } = false; // Vai trò mặc định khi tạo user mới
        public string? scope { get; set; }
    }
}
