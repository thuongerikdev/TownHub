using System.Linq;
using System.Security.Claims;

namespace TH.WebAPI.Controllers.Asset
{
    /// <summary>
    /// Giới hạn tầm nhìn dữ liệu theo phân công (row-level scoping).
    ///
    /// Khác với RBAC ở tầng endpoint (được/không được gọi API), phần này quyết định
    /// người gọi được thấy NHỮNG DÒNG NÀO: kỹ thuật viên chỉ thấy phiếu bảo trì và
    /// phiếu sự cố mà mình được phân công, còn cấp điều hành thấy toàn bộ.
    ///
    /// Cách phân biệt dựa trên QUYỀN chứ không dựa trên tên vai trò — tên vai trò có
    /// thể đổi theo từng lần triển khai, còn mã quyền là hợp đồng cố định. Người chỉ
    /// có quyền *thi hành* (execute/resolve) mà không có quyền điều phối (assign /
    /// review / close / create) thì là người thừa hành ⇒ bị giới hạn.
    /// </summary>
    public static class AssignmentScope
    {
        public static int CurrentUserId(this ClaimsPrincipal user)
        {
            var s = user.FindFirstValue("userId");
            return int.TryParse(s, out var id) ? id : 0;
        }

        private static bool HasPerm(this ClaimsPrincipal user, string code) =>
            user.Claims.Any(c => c.Type == "permission" && c.Value == code);

        private static bool HasAnyPerm(this ClaimsPrincipal user, params string[] codes) =>
            user.Claims.Any(c => c.Type == "permission" && codes.Contains(c.Value));

        /// <summary>
        /// userId của người gọi nếu chỉ được xem Work Order của mình; null nếu xem toàn bộ.
        /// Kỹ sư trưởng có cả execute lẫn assign/review/close nên không bị giới hạn.
        /// </summary>
        public static int? WorkOrderOwnerScope(this ClaimsPrincipal user)
        {
            if (!user.HasPerm("workorder.execute")) return null;
            if (user.HasAnyPerm("workorder.assign", "workorder.review", "workorder.close", "workorder.create"))
                return null;
            var uid = user.CurrentUserId();
            return uid > 0 ? uid : null;
        }

        /// <summary>
        /// userId của người gọi nếu chỉ được xem phiếu sự cố của mình; null nếu xem toàn bộ.
        /// Không xét ticket.create để không thay đổi tầm nhìn của vai trò Cư dân.
        /// </summary>
        public static int? TicketOwnerScope(this ClaimsPrincipal user)
        {
            if (!user.HasPerm("ticket.resolve")) return null;
            if (user.HasAnyPerm("ticket.assign", "ticket.close")) return null;
            var uid = user.CurrentUserId();
            return uid > 0 ? uid : null;
        }

        /// <summary>
        /// userId của người gọi nếu chỉ được xem phiếu đề xuất mua do mình lập; null nếu
        /// xem toàn bộ. KTV chỉ có procurement.request (đề xuất) chứ không có
        /// procurement.view (xem hồ sơ mua sắm) nên bị giới hạn.
        /// </summary>
        public static int? PurchaseRequestOwnerScope(this ClaimsPrincipal user)
        {
            if (user.HasPerm("procurement.view")) return null;
            if (!user.HasPerm("procurement.request")) return null;
            var uid = user.CurrentUserId();
            return uid > 0 ? uid : null;
        }
    }
}
