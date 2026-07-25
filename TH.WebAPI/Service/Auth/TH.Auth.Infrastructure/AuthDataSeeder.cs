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

            await SeedBusinessRolesAsync(context);
        }

        // =========================================================
        // QUY HOẠCH VAI TRÒ NGHIỆP VỤ (RBAC) theo Use Case TownHub.
        //   Actor: Quản trị viên (admin) · Ban quản lý · Kỹ sư trưởng ·
        //          Kỹ thuật viên · Kế toán · Cư dân.
        //   - Tạo các vai trò còn thiếu + gán quyền theo ma trận (idempotent).
        //   - Xoá 5 vai trò rác kế thừa từ project cũ (FilmZone) + gán lại user.
        //   Quyền "công khai" (auth/account/hồ sơ) đã được gán cho MỌI vai trò ở STEP 3.
        // =========================================================
        private static async Task SeedBusinessRolesAsync(AuthDbContext context)
        {
            // Ma trận: vai trò → danh sách permission code nghiệp vụ.
            var matrix = new Dictionary<string, string[]>
            {
                ["Ban quản lý"] = new[]
                {
                    "apartment.view","apartment.create","apartment.update","apartment.delete",
                    "resident.view","resident.create","resident.update","resident.delete",
                    "asset.view","asset.update",
                    "workorder.view","workorder.create","workorder.assign","workorder.review","workorder.close",
                    "ticket.view","ticket.assign","ticket.close",
                    "inventory.view",
                    "procurement.view","procurement.request","procurement.order","procurement.approve",
                    "vendor.view","vendor.create","vendor.update","vendor.evaluate",
                    "report.cost","report.kpi",
                    "notification.view","notification.send","notification.manage",
                    "user.read_details","user.create_bql","role.read",
                },
                ["Kỹ sư trưởng"] = new[]
                {
                    "asset.view","asset.create","asset.update","asset.delete",
                    "workorder.view","workorder.create","workorder.assign","workorder.execute","workorder.review","workorder.close",
                    "ticket.view","ticket.create","ticket.assign","ticket.resolve","ticket.close",
                    "inventory.view","inventory.transaction","inventory.audit",
                    "procurement.view","procurement.request",
                    "vendor.view","vendor.evaluate",
                    "report.kpi",
                    "notification.view",
                },
                ["Kỹ thuật viên"] = new[]
                {
                    "asset.view",
                    "workorder.view","workorder.execute",
                    "ticket.view","ticket.resolve",
                    "inventory.view","inventory.transaction",
                    "notification.view",
                },
                ["Kế toán"] = new[]
                {
                    "asset.view","asset.update",
                    "procurement.view","procurement.order","procurement.invoice",
                    "vendor.view",
                    "report.cost","report.kpi",
                    "notification.view",
                },
                ["Cư dân"] = new[]
                {
                    "ticket.create","ticket.view",
                    "notification.view",
                },
            };
            var staffRoles = new HashSet<string> { "Ban quản lý", "Kỹ sư trưởng", "Kỹ thuật viên", "Kế toán" };

            // 1) Đảm bảo vai trò tồn tại
            var roles = await context.authRoles.ToListAsync();
            foreach (var roleName in matrix.Keys)
            {
                if (roles.Any(r => r.roleName == roleName)) continue;
                var newRole = new AuthRole
                {
                    roleName = roleName,
                    roleDescription = roleName,
                    scope = staffRoles.Contains(roleName) ? "staff" : "user",
                    isDefault = false,
                };
                context.authRoles.Add(newRole);
                roles.Add(newRole);
                Console.WriteLine($"[SEED] Tạo vai trò '{roleName}'.");
            }
            await context.SaveChangesAsync();

            // 2) Gán quyền theo ma trận (idempotent)
            var perms = await context.authPermissions.ToListAsync();
            var permByCode = perms.ToDictionary(p => p.code, p => p.permissionID);
            var links = await context.authRolePermissions.ToListAsync();
            var toAdd = new List<AuthRolePermission>();
            foreach (var (roleName, codes) in matrix)
            {
                var role = roles.First(r => r.roleName == roleName);
                foreach (var code in codes)
                {
                    if (!permByCode.TryGetValue(code, out var permId)) continue;
                    if (links.Any(l => l.roleID == role.roleID && l.permissionID == permId)) continue;
                    if (toAdd.Any(l => l.roleID == role.roleID && l.permissionID == permId)) continue;
                    toAdd.Add(new AuthRolePermission { roleID = role.roleID, permissionID = permId });
                }
            }
            if (toAdd.Count > 0)
            {
                await context.authRolePermissions.AddRangeAsync(toAdd);
                await context.SaveChangesAsync();
                Console.WriteLine($"[SEED] Gán {toAdd.Count} quyền cho các vai trò nghiệp vụ.");
            }

            // 3) Gán lại user staff (theo userName) sang vai trò đúng
            var reassign = new Dictionary<string, string>
            {
                ["tkbql"]         = "Ban quản lý",
                ["nguyen.van.a"]  = "Kỹ thuật viên",
                ["nguyen.xuan.k"] = "Kỹ thuật viên",
            };
            foreach (var (userName, roleName) in reassign)
            {
                var user = await context.authUsers.FirstOrDefaultAsync(u => u.userName == userName);
                var role = roles.FirstOrDefault(r => r.roleName == roleName);
                if (user == null || role == null) continue;
                bool has = await context.authUserRoles.AnyAsync(ur => ur.userID == user.userID && ur.roleID == role.roleID);
                if (!has)
                {
                    context.authUserRoles.Add(new AuthUserRole { userID = user.userID, roleID = role.roleID });
                    Console.WriteLine($"[SEED] Gán user '{userName}' → vai trò '{roleName}'.");
                }
            }
            await context.SaveChangesAsync();

            // 4) Xoá 5 vai trò rác (FilmZone) + gỡ mọi liên kết trước
            var junkNames = new[] { "content_manager", "user_manager", "finance_manager", "customer", "customer-vip" };
            var junkRoles = await context.authRoles.Where(r => junkNames.Contains(r.roleName)).ToListAsync();
            if (junkRoles.Count > 0)
            {
                var junkIds = junkRoles.Select(r => r.roleID).ToList();
                var junkRolePerms = await context.authRolePermissions.Where(rp => junkIds.Contains(rp.roleID)).ToListAsync();
                var junkUserRoles = await context.authUserRoles.Where(ur => junkIds.Contains(ur.roleID)).ToListAsync();
                context.authRolePermissions.RemoveRange(junkRolePerms);
                context.authUserRoles.RemoveRange(junkUserRoles);
                context.authRoles.RemoveRange(junkRoles);
                await context.SaveChangesAsync();
                Console.WriteLine($"[SEED] Đã xoá {junkRoles.Count} vai trò rác + {junkRolePerms.Count} link quyền + {junkUserRoles.Count} link user.");
            }

            Console.WriteLine("[SEED] ✅ Quy hoạch vai trò nghiệp vụ hoàn tất.");
        }

        // =========================================================
        // SEED NHÂN SỰ + CƯ DÂN DEMO (idempotent theo userName)
        //   • 6 nhân sự vận hành (BQL / Kỹ sư trưởng / Kế toán / 3 KTV)
        //     — tên khớp với AssetDataSeeder (Nguyễn Văn A/Trần Văn B/Lê Văn C…)
        //   • 30 cư dân (cudan01..cudan30) gán vai trò "Cư dân".
        //   Mỗi user gồm AuthUser + AuthProfile + AuthUserRole.
        //   Trả về map userName→userID để module Base liên kết Resident.AuthUserId.
        // =========================================================
        public static async Task<Dictionary<string, int>> SeedDemoUsersAsync(
            AuthDbContext context, IServiceProvider serviceProvider)
        {
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SeedDemoUsers");
            var hasher = serviceProvider.GetRequiredService<IPasswordHasher>();
            var now = DateTime.UtcNow;

            var roles = await context.authRoles.ToListAsync();
            int? RoleId(string name) => roles.FirstOrDefault(r => r.roleName == name)?.roleID;

            // Bảo đảm đã có các vai trò nghiệp vụ (SeedPermissionsAsync chạy trước là đủ,
            // nhưng gọi lại cho chắc khi seed độc lập).
            if (RoleId("Cư dân") == null || RoleId("Kỹ thuật viên") == null)
            {
                await SeedBusinessRolesAsync(context);
                roles = await context.authRoles.ToListAsync();
            }

            var result = new Dictionary<string, int>();

            async Task<int> EnsureUser(string userName, string firstName, string lastName,
                string email, string phone, string gender, string roleName, string scope, string password)
            {
                var existing = await context.authUsers.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.userName == userName);
                if (existing != null)
                {
                    result[userName] = existing.userID;
                    return existing.userID;
                }
                var user = new AuthUser
                {
                    userName = userName, email = email, phoneNumber = phone,
                    passwordHash = hasher.Hash(password), isEmailVerified = true, status = "active",
                    tokenVersion = 1, scope = scope, createdAt = now, updatedAt = now,
                    profile = new AuthProfile
                    {
                        firstName = firstName, lastName = lastName, gender = gender,
                        dateOfBirth = new DateTime(1990, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                        avatar = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(firstName + " " + lastName)}"
                    }
                };
                context.authUsers.Add(user);
                await context.SaveChangesAsync();

                var rid = RoleId(roleName);
                if (rid != null)
                {
                    context.authUserRoles.Add(new AuthUserRole { userID = user.userID, roleID = rid.Value, assignedAt = now });
                    await context.SaveChangesAsync();
                }
                result[userName] = user.userID;
                return user.userID;
            }

            // ── Nhân sự vận hành (staff) ──
            await EnsureUser("tkbql",        "Trần Thị", "Quản Lý",    "bql@townhub.vn",     "0911000001", "female", "Ban quản lý",    "staff", "TownHub@123");
            await EnsureUser("ksut",         "Lê",       "Kỹ Sư Trưởng","ksut@townhub.vn",   "0911000002", "male",   "Kỹ sư trưởng",   "staff", "TownHub@123");
            await EnsureUser("ketoan",       "Phạm",     "Kế Toán",    "ketoan@townhub.vn",  "0911000003", "female", "Kế toán",        "staff", "TownHub@123");
            await EnsureUser("nguyen.van.a", "Nguyễn Văn","A",         "ktv.a@townhub.vn",   "0911000004", "male",   "Kỹ thuật viên",  "staff", "TownHub@123");
            await EnsureUser("tran.van.b",   "Trần Văn", "B",          "ktv.b@townhub.vn",   "0911000005", "male",   "Kỹ thuật viên",  "staff", "TownHub@123");
            await EnsureUser("le.van.c",     "Lê Văn",   "C",          "ktv.c@townhub.vn",   "0911000006", "male",   "Kỹ thuật viên",  "staff", "TownHub@123");

            // ── Cư dân (30) ──
            var ho = new[] { "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ" };
            var tenDem = new[] { "Văn", "Thị", "Minh", "Hữu", "Thu", "Quang", "Ngọc", "Đức", "Hồng", "Anh" };
            var ten = new[] { "An", "Bình", "Cường", "Dung", "Em", "Giang", "Hải", "Khoa", "Lan", "Mai", "Nam", "Oanh", "Phúc", "Quân", "Sơn", "Trang", "Uyên", "Vinh", "Xuân", "Yến" };
            for (int i = 1; i <= 30; i++)
            {
                var first = $"{ho[i % ho.Length]} {tenDem[i % tenDem.Length]}";
                var last = ten[i % ten.Length];
                var gender = (i % 2 == 0) ? "male" : "female";
                await EnsureUser($"cudan{i:00}", first, last, $"cudan{i:00}@townhub.vn",
                    $"0922{i:000000}", gender, "Cư dân", "user", "TownHub@123");
            }

            logger.LogInformation("[SEED] Demo users hoàn tất — {n} tài khoản (6 nhân sự + 30 cư dân).", result.Count);
            return result;
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
