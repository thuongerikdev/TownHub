using System;

namespace TH.WebAPI.Filters
{
    /// <summary>
    /// Gắn nhãn tiếng Việt (và thông tin phụ) cho một hành động để audit log dễ đọc hơn.
    /// Ví dụ: [Audit("Tạo phiếu sự cố", Module = "Asset", Entity = "Ticket")].
    /// Không bắt buộc — nếu thiếu, filter sẽ tự sinh nhãn từ tên controller/action.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public sealed class AuditAttribute : Attribute
    {
        public AuditAttribute(string action) => Action = action;

        /// <summary>Mô tả hành động, ví dụ "Thanh lý tài sản".</summary>
        public string Action { get; }

        /// <summary>Module nghiệp vụ: Auth / Asset / Base.</summary>
        public string? Module { get; set; }

        /// <summary>Loại đối tượng tác động, ví dụ "Asset", "Ticket".</summary>
        public string? Entity { get; set; }
    }

    /// <summary>
    /// Bỏ qua ghi audit cho endpoint/controller này (dùng cho các endpoint đã tự ghi log chi tiết,
    /// ví dụ đăng nhập/đăng xuất trong Auth, hoặc các endpoint nội bộ không cần theo dõi).
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public sealed class SkipAuditAttribute : Attribute
    {
    }
}
