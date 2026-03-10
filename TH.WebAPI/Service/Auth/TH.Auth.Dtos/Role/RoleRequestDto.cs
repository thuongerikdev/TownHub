using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.Role
{
    public class AddRoleRequest
    {
        public string roleName { get; set; }
        public string roleDescription { get; set; }
        public bool isDefault { get; set; } = false; // Vai trò mặc định khi tạo user mới
        public string? scope { get; set; }
    }
    public class UpdateRoleRequest : AddRoleRequest
    {
        public int roleID { get; set; }

    }

    public class AddRoleWhereScopeUserRequest
    {
        public string roleName { get; set; }
        public string roleDescription { get; set; }
        public bool isDefault { get; set; } = false; // Vai trò mặc định khi tạo user mới
    }
    public class UpdateRoleWhereScopeUserRequest : AddRoleWhereScopeUserRequest
    {
        public int roleID { get; set; }
    }


    public class UserRoleRequestDto
    {
        [Required]
        public int userID { get; set; }
        [Required]
        public List<int> roleIDs { get; set; }

    }

    public class CloneRoleRequest
    {
        public int sourceRoleId { get; set; } // ID role muốn nhân bản
        public string newRoleName { get; set; } = default!;
        public string newRoleDescription { get; set; } = default!;
        public string? newScope { get; set; } // Tùy chọn, nếu null thì lấy theo role cũ
        public bool isDefault { get; set; } = false;
    }
    public class CloneUserRoleRequest
    {
        public int sourceRoleId { get; set; } // ID role muốn nhân bản
        public string newRoleName { get; set; } = default!;
        public string newRoleDescription { get; set; } = default!;
        public bool isDefault { get; set; } = false;
        // KHÔNG CÓ trường scope ở đây
    }
}
