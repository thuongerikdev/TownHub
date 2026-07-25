using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Constant
{
    /// <summary>
    /// Danh mục quyền của hệ thống QUẢN LÝ KHU CHUNG CƯ.
    ///
    /// Key   = tên Policy (PascalCase) dùng cho [Authorize(Policy = "...")] trên controller
    ///         và đồng thời là permissionName lưu DB.
    /// Value = "code" của quyền (dạng "&lt;resource&gt;.&lt;action&gt;") — chính là claim "permission"
    ///         nhúng trong JWT và là chuỗi FE kiểm tra qua hasPermission(code).
    ///
    /// Quy ước resource khớp 100% với FE datn/lib/rbac.ts để RBAC thông suốt
    /// đầu-cuối: seed DB → gán role → claim JWT → FE gate → BE [Authorize].
    ///
    /// 2 nhóm lớn:
    ///   • CORE   : nền tảng (tài khoản, vai trò, phân quyền, cư dân, căn hộ, thông báo, nhật ký…)
    ///   • MODULE : nghiệp vụ kỹ thuật/tài sản (tài sản, PM, CM, kho, mua sắm, nhà thầu, báo cáo)
    /// Nhóm được suy ra từ tiền tố code (xem AuthDataSeeder) nên không cần cột DB riêng.
    /// </summary>
    public static class PermissionConstants
    {
        public static readonly Dictionary<string, string> Permissions = new()
        {
            // ══════════════════════════ CORE ══════════════════════════

            // --- Hệ thống & Xác thực (public/universal, gán cho mọi tài khoản) ---
            { "SystemHealth", "system.health" },
            { "AuthLogin", "auth.login" },
            { "AuthLoginGoogle", "auth.login_google" },
            { "AuthRegister", "auth.register" },
            { "AuthForgotPassword", "auth.forgot_password" },
            { "AuthRefresh", "auth.refresh" },
            { "AuthLogout", "auth.logout" },
            { "AuthMfaVerify", "auth.mfa_verify" },

            // --- User ---
            { "UserCreate", "user.create" },             // BQL + Admin tạo tài khoản Resident/Provider
            { "UserCreateBQL", "user.create_bql" },      // Admin tạo tài khoản BQL

            // --- Tài khoản cá nhân (mọi user đã đăng nhập) ---
            { "AccountMfaSetup", "account.mfa_setup" },
            { "AccountChangePassword", "account.change_password" },
            { "UserReadProfile", "user.read_profile" },
            { "UserUpdateProfile", "user.update_profile" },

            // --- Quản lý tài khoản người dùng (Core) ---
            { "UserReadDetails", "user.read_details" },
            { "UserReadDetailsAdmin", "user.read_details.admin" },
            { "UserDelete", "user.delete" },

            // --- Vai trò (nhóm người dùng) ---
            { "RoleRead", "role.read" },
            { "RoleManage", "role.manage" },
            { "RoleManageAdmin", "role.manage.admin" },
            { "RoleAssign", "role.assign" },
            { "RoleAssignAdmin", "role.assign.admin" },

            // --- Phân quyền (nhóm quyền) ---
            { "PermissionRead", "permission.read" },
            { "PermissionReadAdmin", "permission.read.admin" },
            { "PermissionManage", "permission.manage" },
            { "PermissionManageAdmin", "permission.manage.admin" },
            { "PermissionAssign", "permission.assign" },
            { "PermissionAssignAdmin", "permission.assign.admin" },

            // --- Nhật ký hệ thống & Phiên đăng nhập ---
            { "AuditLogManage", "audit_log.manage" },
            { "UserSessionManage", "usersession.manage" },

            // --- Căn hộ ---
            { "ApartmentView", "apartment.view" },
            { "ApartmentCreate", "apartment.create" },
            { "ApartmentUpdate", "apartment.update" },
            { "ApartmentDelete", "apartment.delete" },

            // --- Cư dân ---
            { "ResidentView", "resident.view" },
            { "ResidentCreate", "resident.create" },
            { "ResidentUpdate", "resident.update" },
            { "ResidentDelete", "resident.delete" },
            { "ResidentFaceRegister", "resident.face_register" },
            { "ResidentAccessReview", "resident.access_review" },   // camera giám sát + người lạ ra/vào

            // --- Thông báo ---
            { "NotificationView", "notification.view" },
            { "NotificationSend", "notification.send" },
            { "NotificationManage", "notification.manage" },

            // ══════════════════════════ MODULE ══════════════════════════

            // --- Tài sản ---
            { "AssetView", "asset.view" },
            { "AssetCreate", "asset.create" },
            { "AssetUpdate", "asset.update" },
            { "AssetDelete", "asset.delete" },
            // Kế toán tài sản: khấu hao, chứng từ, thanh lý, nhật ký chung, sổ cái, báo cáo kế toán.
            // Tách khỏi asset.view để KTV xem được tài sản mà không thấy phần sổ sách.
            { "AssetAccounting", "asset.accounting" },

            // --- Bảo trì định kỳ (PM / Work Order) ---
            { "WorkOrderView", "workorder.view" },
            { "WorkOrderCreate", "workorder.create" },
            { "WorkOrderAssign", "workorder.assign" },
            { "WorkOrderExecute", "workorder.execute" },
            { "WorkOrderReview", "workorder.review" },
            { "WorkOrderClose", "workorder.close" },

            // --- Sự cố (CM / Ticket) ---
            { "TicketView", "ticket.view" },
            { "TicketCreate", "ticket.create" },
            { "TicketAssign", "ticket.assign" },
            { "TicketResolve", "ticket.resolve" },
            { "TicketClose", "ticket.close" },

            // --- Kho vật tư ---
            { "InventoryView", "inventory.view" },
            { "InventoryTransaction", "inventory.transaction" },   // nhập/xuất/điều chuyển (KTV có)
            { "InventoryManage", "inventory.manage" },             // danh mục vật tư & danh sách kho (KTV KHÔNG có)
            { "InventoryAudit", "inventory.audit" },

            // --- Mua sắm ---
            { "ProcurementView", "procurement.view" },
            { "ProcurementRequest", "procurement.request" },
            { "ProcurementApprove", "procurement.approve" },
            { "ProcurementOrder", "procurement.order" },
            { "ProcurementInvoice", "procurement.invoice" },

            // --- Nhà thầu ---
            { "VendorView", "vendor.view" },
            { "VendorCreate", "vendor.create" },
            { "VendorUpdate", "vendor.update" },
            { "VendorEvaluate", "vendor.evaluate" },

            // --- Báo cáo ---
            { "ReportKpi", "report.kpi" },
            { "ReportCost", "report.cost" },
        };

        /// <summary>
        /// Policy tổng hợp "hoặc" (OR) — chỉ dùng cho [Authorize(Policy = "...")],
        /// KHÔNG phải quyền lưu DB nên không seed và không hiện ở màn Phân quyền.
        ///
        /// Cần thiết vì endpoint `update` của WorkOrder/Ticket vừa là chỗ người quản lý
        /// sửa nội dung phiếu, vừa là chỗ kỹ thuật viên đẩy trạng thái khi check-in /
        /// hoàn tất xử lý. KTV chỉ có execute/resolve nên nếu chỉ gác bằng create thì
        /// check-in trả 403.
        /// </summary>
        public static readonly Dictionary<string, string[]> CompositePolicies = new()
        {
            { "WorkOrderWrite", new[] { "workorder.create", "workorder.execute" } },
            { "TicketWrite",    new[] { "ticket.create",    "ticket.resolve"    } },
            // KTV được đề xuất mua vật tư nên phải đọc lại được phiếu đề xuất của mình,
            // dù không có quyền xem toàn bộ hồ sơ mua sắm (procurement.view).
            { "ProcurementRead", new[] { "procurement.view", "procurement.request" } },
        };

        /// <summary>
        /// Quyền "công khai" — cấp cho MỌI tài khoản (kể cả cư dân) khi seed,
        /// không cần admin gán thủ công. Dùng trong AuthDataSeeder.
        /// </summary>
        public static readonly HashSet<string> UniversalCodes = new()
        {
            "system.health",
            "auth.login", "auth.login_google", "auth.register", "auth.forgot_password",
            "auth.refresh", "auth.logout", "auth.mfa_verify",
            "account.mfa_setup", "account.change_password",
            "user.read_profile", "user.update_profile",
        };
    }
}
