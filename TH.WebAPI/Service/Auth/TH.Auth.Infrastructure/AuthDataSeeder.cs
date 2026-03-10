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
            // =========================================================
            // STEP 0: CLEANUP - DỌN DẸP QUYỀN SAI
            // =========================================================
            var staffRoleIds = new List<int> { 2, 3, 4 };

            var badLinks = await context.authRolePermissions
                .Include(rp => rp.permission)
                .Where(rp => staffRoleIds.Contains(rp.roleID) && rp.permission.code.EndsWith(".admin"))
                .ToListAsync();

            if (badLinks.Any())
            {
                context.authRolePermissions.RemoveRange(badLinks);
                await context.SaveChangesAsync();
            }

            // =========================================================
            // STEP 1: ĐỒNG BỘ PERMISSION TỪ CODE -> DB
            // =========================================================
            var allConstantPermissions = PermissionConstants.Permissions;
            var existingPermissions = await context.authPermissions.ToListAsync();
            var newPermissionsToAdd = new List<AuthPermission>();

            foreach (var kvp in allConstantPermissions)
            {
                if (!existingPermissions.Any(p => p.code == kvp.Value))
                {
                    string scope = "user";
                    if ((kvp.Value.Contains("manage") || kvp.Value.Contains("delete") ||
                         kvp.Value.Contains("upload") || kvp.Value.Contains("read_all") ||
                         kvp.Value.Contains(".admin"))
                        && !kvp.Value.Contains("_own"))
                    {
                        scope = "staff";
                    }

                    newPermissionsToAdd.Add(new AuthPermission
                    {
                        permissionName = kvp.Key,
                        code = kvp.Value,
                        permissionDescription = kvp.Key,
                        scope = scope
                    });
                }
            }

            if (newPermissionsToAdd.Any())
            {
                await context.authPermissions.AddRangeAsync(newPermissionsToAdd);
                await context.SaveChangesAsync();
            }

            // =========================================================
            // STEP 2: ĐỊNH NGHĨA NHÓM QUYỀN
            // =========================================================

            var guestCodes = new HashSet<string> { "auth.login", "auth.login_google", "auth.register", "auth.forgot_password", "system.health", "payment.callback", "subtitle.callback" };

            var customerFreeCodes = new HashSet<string> {
                "account.mfa_setup", "account.change_password", "auth.logout", "auth.refresh", "auth.mfa_verify",
                "comment.read", "episode.read", "movie.read_details", "movie.browse", "movie_person.read", "movie_tag.read",
                "person.read", "tag.read",
                "user.read_profile", "user.update_profile", "user.read_details",
                "rating.read",
                "plan.read", "price.read", "region.read", "search.movie", "search.suggest", "search.person",
                "subscription.read_own", "subscription.cancel", "order.read_own", "invoice.read_own", "payment.checkout", "image.read"
            };

            var customerVipCodes = new HashSet<string> {
                "comment.create", "comment.update_own", "comment.delete_own",
                "source.read", "progress.track", "progress.read",
                "movie.watch_stream", "movie.watch_vip", "subtitle.read",
                "saved_movie.manage", "saved_movie.read",
                "rating.create", "rating.update", "rating.delete"
            };

            // Danh sách các nhóm chức năng dành cho Staff
            var staffCodes = new HashSet<string> {
                "upload.archive", "upload.vimeo", "upload.youtube",
                "episode.manage", "source.manage", "image.manage",
                "invoice.read_all", "movie.manage", "movie_person.manage", "movie_tag.manage",
                "subtitle.upload", "subtitle.translate", "subtitle.manage",
                "order.read_all", "permission.read", "person.manage", "plan.manage", "price.manage", "region.manage",
                "subscription.read_all", "subscription.manage", "tag.manage",
                "user.read_list", "user.read_details",
                "search.advanced",
                "role.assign", "permission.assign",
                // --- THÊM 2 QUYỀN NÀY ---
                "audit_log.manage", "usersession.manage"
            };

            // =========================================================
            // STEP 3: GÁN QUYỀN VÀO ROLE
            // =========================================================

            var allPermissionsInDb = await context.authPermissions.ToListAsync();
            var allRolePermissionsInDb = await context.authRolePermissions.ToListAsync();

            int adminRoleId = 1;
            int contentMgrId = 2;
            int userMgrId = 3;
            int financeMgrId = 4;
            int customerId = 10;
            int vipId = 11;

            var linksToAdd = new List<AuthRolePermission>();

            void AddLinkIfNotExist(int rId, int pId)
            {
                bool existsInDb = allRolePermissionsInDb.Any(rp => rp.roleID == rId && rp.permissionID == pId);
                bool existsInPending = linksToAdd.Any(rp => rp.roleID == rId && rp.permissionID == pId);

                if (!existsInDb && !existsInPending)
                {
                    linksToAdd.Add(new AuthRolePermission { roleID = rId, permissionID = pId });
                }
            }

            foreach (var perm in allPermissionsInDb)
            {
                if (guestCodes.Contains(perm.code)) continue;

                // --- 1. ADMIN ---
                AddLinkIfNotExist(adminRoleId, perm.permissionID);

                // --- 2. STAFF ROLES ---
                // Logic: Phải nằm trong staffCodes HOẶC chứa từ khóa quản lý
                bool isStaffPerm = staffCodes.Contains(perm.code) ||
                                   (perm.code.Contains("manage") || perm.code.Contains("read_list"));

                // CHẶN QUYỀN ADMIN
                if (isStaffPerm && !perm.code.EndsWith(".admin"))
                {
                    // A. Content Manager
                    if (perm.code.StartsWith("movie") || perm.code.StartsWith("episode") ||
                        perm.code.StartsWith("person") || perm.code.StartsWith("tag") ||
                        perm.code.StartsWith("image") || perm.code.StartsWith("source") ||
                        perm.code.StartsWith("subtitle") || perm.code.StartsWith("upload"))
                    {
                        AddLinkIfNotExist(contentMgrId, perm.permissionID);
                    }

                    // B. User Manager
                    // - usersession.manage bắt đầu bằng "user" nên tự động được nhận.
                    // - audit_log.manage cần check thêm.
                    if (perm.code.StartsWith("user") ||
                        perm.code.StartsWith("role.assign") ||
                        perm.code.StartsWith("permission.assign") ||
                        perm.code.StartsWith("audit_log")) // <--- THÊM AUDIT LOG
                    {
                        AddLinkIfNotExist(userMgrId, perm.permissionID);
                    }

                    // C. Finance Manager
                    if (perm.code.StartsWith("order") || perm.code.StartsWith("invoice") ||
                        perm.code.StartsWith("plan") || perm.code.StartsWith("price") ||
                        perm.code.StartsWith("subscription"))
                    {
                        AddLinkIfNotExist(financeMgrId, perm.permissionID);
                    }

                    // D. Shared Staff
                    if (perm.code == "permission.read" || perm.code == "search.advanced")
                    {
                        AddLinkIfNotExist(contentMgrId, perm.permissionID);
                        AddLinkIfNotExist(userMgrId, perm.permissionID);
                        AddLinkIfNotExist(financeMgrId, perm.permissionID);
                    }
                }

                // --- 3. CUSTOMER RIGHTS ---
                if (customerFreeCodes.Contains(perm.code))
                {
                    AddLinkIfNotExist(customerId, perm.permissionID);
                    AddLinkIfNotExist(vipId, perm.permissionID);
                    AddLinkIfNotExist(contentMgrId, perm.permissionID);
                    AddLinkIfNotExist(userMgrId, perm.permissionID);
                    AddLinkIfNotExist(financeMgrId, perm.permissionID);
                }

                // --- 4. VIP RIGHTS ---
                if (customerVipCodes.Contains(perm.code))
                {
                    AddLinkIfNotExist(vipId, perm.permissionID);
                }
            }

            if (linksToAdd.Any())
            {
                await context.authRolePermissions.AddRangeAsync(linksToAdd);
                await context.SaveChangesAsync();
            }
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
