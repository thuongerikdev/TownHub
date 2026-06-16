using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Dtos.Role
{
    public class CreatePermissionRequestDto
    {
        public required string permissionName { get; set; }
        public string? permissionDescription { get; set; }
        public required string code { get; set; }
        public required string scope { get; set; }
    }
    public class UpdatePermissionRequestDto : CreatePermissionRequestDto
    {
        public int permissionID { get; set; }
    }

    public class CreatePermissionScopeUserRequestDto
    {
        public required string permissionName { get; set; }
        public string? permissionDescription { get; set; }
        public required string code { get; set; }
    }
    public class UpdatePermissionScopeUserRequestDto : CreatePermissionScopeUserRequestDto
    {
        public int permissionID { get; set; }
    }

    public class RolePermissionRequestDto
    {
        public int roleID { get; set; }
        public List<int>? permissionIDs { get; set; }
    }
}
