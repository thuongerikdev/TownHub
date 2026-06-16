using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.Role;
using TH.Auth.Domain.User;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;

namespace TH.Auth.Infrastructure
{
    public static class AuthDataSeeder
    {
        public static async Task SeedPermissionsAsync(AuthDbContext context)
        {
            // Tập "code" chuẩn — nguồn sự thật duy nhất từ PermissionConstants.
            var constantCodes = new HashSet<string>(PermissionConstants.Permissions.Values);
            var universalCodes = PermissionConstants.UniversalCodes;

            // =========================================================
            // STEP 0: DỌN DẸP — XOÁ QUYỀN KHÔNG CÒN TRONG DANH MỤC
            // Gồm toàn bộ quyền "rác" của hệ cũ (movie/episode/subtitle/
            // subscription/payment…) hiện còn sót trong DB thật.
            // =========================================================
            var allPermsNow = await context.authPermissions.ToListAsync();
            var obsoletePerms = allPermsNow
                .Where(p => string.IsNullOrWhiteSpace(p.code) || !constantCodes.Contains(p.code))
                .ToList();

            Console.WriteLine($"[SEED] Quyền hiện có trong DB: {allPermsNow.Count}. Danh mục chuẩn: {constantCodes.Count}. Cần dọn (rác/không liên quan): {obsoletePerms.Count}.");
            if (obsoletePerms.Any())
            {
                var sample = string.Join(", ", obsoletePerms.Take(20).Select(p => p.code));
                Console.WriteLine($"[SEED] Xoá các quyền không còn trong danh mục: {sample}{(obsoletePerms.Count > 20 ? " …" : "")}");

                var obsoleteIds = obsoletePerms.Select(p => p.permissionID).ToHashSet();

                // Xoá link role-permission trỏ tới quyền sắp xoá TRƯỚC (tránh vỡ khoá ngoại).
                var obsoleteLinks = await context.authRolePermissions
                    .Where(rp => obsoleteIds.Contains(rp.permissionID))
                    .ToListAsync();
                if (obsoleteLinks.Any())
                {
                    context.authRolePermissions.RemoveRange(obsoleteLinks);
                    await context.SaveChangesAsync();
                    Console.WriteLine($"[SEED] Đã xoá {obsoleteLinks.Count} liên kết role-permission tới quyền rác.");
                }

                context.authPermissions.RemoveRange(obsoletePerms);
                await context.SaveChangesAsync();
                Console.WriteLine($"[SEED] Đã xoá {obsoletePerms.Count} quyền rác khỏi DB.");
            }

            // =========================================================
            // STEP 1: ĐỒNG BỘ QUYỀN TỪ CODE -> DB (thêm quyền còn thiếu)
            // =========================================================
            var existingCodes = (await context.authPermissions.Select(p => p.code).ToListAsync())
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .ToHashSet();

            var toAdd = new List<AuthPermission>();
            foreach (var kvp in PermissionConstants.Permissions)
            {
                if (existingCodes.Contains(kvp.Value)) continue;
                toAdd.Add(new AuthPermission
                {
                    permissionName = kvp.Key,
                    code = kvp.Value,
                    permissionDescription = kvp.Key,
                    // Quyền công khai = "user"; quyền quản trị/nghiệp vụ = "staff".
                    scope = universalCodes.Contains(kvp.Value) ? "user" : "staff",
                });
            }
            if (toAdd.Any())
            {
                await context.authPermissions.AddRangeAsync(toAdd);
                await context.SaveChangesAsync();
                Console.WriteLine($"[SEED] Đã thêm {toAdd.Count} quyền mới từ danh mục chuẩn: {string.Join(", ", toAdd.Take(20).Select(p => p.code))}{(toAdd.Count > 20 ? " …" : "")}");
            }
            else
            {
                Console.WriteLine("[SEED] Danh mục quyền đã đầy đủ — không cần thêm quyền mới.");
            }

            // =========================================================
            // STEP 2: ĐẢM BẢO CÓ ROLE 'admin'
            // (phòng trường hợp DB mới tinh — admin phải có trước khi gán quyền)
            // =========================================================
            var allRoles = await context.authRoles.ToListAsync();
            var adminRole = allRoles.FirstOrDefault(r => r.roleName != null && r.roleName.ToLower() == "admin");
            if (adminRole == null)
            {
                adminRole = new AuthRole { roleName = "admin", roleDescription = "Quản trị hệ thống (Auto Generated)", scope = "staff" };
                context.authRoles.Add(adminRole);
                await context.SaveChangesAsync();
                allRoles.Add(adminRole);
            }

            var residentRole = allRoles.FirstOrDefault(r =>
                r.roleName != null &&
                (r.roleName.ToLower() == "cư dân" || r.roleName.ToLower() == "resident"));
            if (residentRole == null)
            {
                residentRole = new AuthRole
                {
                    roleName = "Cư dân",
                    roleDescription = "Tài khoản cư dân",
                    scope = "user",
                    isDefault = false
                };
                context.authRoles.Add(residentRole);
                await context.SaveChangesAsync();
                allRoles.Add(residentRole);
                Console.WriteLine($"[SEED] Đã tạo role Cư dân (id={residentRole.roleID}).");
            }
            else if (residentRole.scope != "user")
            {
                residentRole.scope = "user";
                await context.SaveChangesAsync();
            }

            // =========================================================
            // STEP 3: GÁN QUYỀN VÀO ROLE
            //   • admin   : TẤT CẢ quyền.
            //   • role khác: tự nhận nhóm quyền "công khai" (đăng nhập, đổi mật khẩu,
            //     hồ sơ cá nhân…). Quyền nghiệp vụ do màn "Phân quyền theo vai trò"
            //     gán thủ công — KHÔNG động vào link đã có sẵn.
            // =========================================================
            var allPerms = await context.authPermissions.ToListAsync();
            var existingLinks = await context.authRolePermissions.ToListAsync();

            var linksToAdd = new List<AuthRolePermission>();
            void AddLink(int roleId, int permId)
            {
                if (existingLinks.Any(rp => rp.roleID == roleId && rp.permissionID == permId)) return;
                if (linksToAdd.Any(rp => rp.roleID == roleId && rp.permissionID == permId)) return;
                linksToAdd.Add(new AuthRolePermission { roleID = roleId, permissionID = permId });
            }

            foreach (var role in allRoles)
            {
                bool isAdmin = role.roleID == adminRole.roleID;
                foreach (var perm in allPerms)
                {
                    if (isAdmin || universalCodes.Contains(perm.code))
                        AddLink(role.roleID, perm.permissionID);
                }
            }

            if (linksToAdd.Any())
            {
                await context.authRolePermissions.AddRangeAsync(linksToAdd);
                await context.SaveChangesAsync();
            }
            Console.WriteLine($"[SEED] Vai trò 'admin' (id={adminRole.roleID}) + quyền công khai cho mọi vai trò: đã thêm {linksToAdd.Count} liên kết mới. Tổng số quyền trong hệ thống: {allPerms.Count}.");
            Console.WriteLine("[SEED] ✅ Đồng bộ phân quyền hoàn tất.");
        }

        public static async Task SeedAdminUserAsync(AuthDbContext context, IServiceProvider serviceProvider)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SeederAdmin");
            try
            {
                var adminEmail = "admin@fz.com";
                var adminUserExists = await context.authUsers.IgnoreQueryFilters().AnyAsync(u => u.email == adminEmail);
                if (adminUserExists)
                {
                    logger.LogInformation("⚠️ Admin user already exists. Skipping.");
                    return;
                }

                var adminRole = await context.authRoles.FirstOrDefaultAsync(r => r.roleName == "admin");
                if (adminRole == null)
                {
                    adminRole = new AuthRole { roleName = "admin", roleDescription = "Admin (Auto Generated)", scope = "staff" };
                    context.authRoles.Add(adminRole);
                    await context.SaveChangesAsync();
                }

                var passwordHasher = serviceProvider.GetRequiredService<IPasswordHasher>();
                string hashedPassword = passwordHasher.Hash("Admin@123");

                var adminUser = new AuthUser
                {
                    userName = "admin",
                    email = adminEmail,
                    phoneNumber = "0999999999",
                    passwordHash = hashedPassword,
                    isEmailVerified = true,
                    status = "active",
                    tokenVersion = 1,
                    scope = "staff",
                    createdAt = DateTime.UtcNow,
                    updatedAt = DateTime.UtcNow,
                    profile = new AuthProfile { firstName = "System", lastName = "Administrator", gender = "other", dateOfBirth = DateTime.UtcNow, avatar = "https://ui-avatars.com/api/?name=System+Admin" }
                };

                context.authUsers.Add(adminUser);
                await context.SaveChangesAsync();

                context.authUserRoles.Add(new AuthUserRole { userID = adminUser.userID, roleID = adminRole.roleID, assignedAt = DateTime.UtcNow });
                await context.SaveChangesAsync();
                logger.LogInformation("✅ Created Admin User.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "❌ Failed to seed Admin User");
                throw;
            }
        }
    }
}
