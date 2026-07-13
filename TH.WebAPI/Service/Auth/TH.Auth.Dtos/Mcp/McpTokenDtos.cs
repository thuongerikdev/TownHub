using System;

namespace TH.Auth.Dtos.Mcp
{
    /// <summary>Yêu cầu tạo mã MCP (token dài hạn để cắm vào MCP client).</summary>
    public class CreateMcpTokenDto
    {
        /// <summary>Tên gợi nhớ, ví dụ: "Claude Desktop máy nhà".</summary>
        public string name { get; set; } = string.Empty;

        /// <summary>Thời điểm hết hạn (UTC).</summary>
        public DateTime expiresAt { get; set; }
    }

    /// <summary>Kết quả tạo mã — token chỉ trả về MỘT LẦN tại đây.</summary>
    public class McpTokenCreatedResponse
    {
        public string id { get; set; } = string.Empty;     // jti
        public string name { get; set; } = string.Empty;
        public string token { get; set; } = string.Empty;  // JWT đầy đủ — copy ngay
        public DateTime createdAt { get; set; }
        public DateTime expiresAt { get; set; }
    }

    /// <summary>Một mục trong danh sách mã MCP của user (KHÔNG chứa token).</summary>
    public class McpTokenItem
    {
        public string id { get; set; } = string.Empty;
        public string name { get; set; } = string.Empty;
        public DateTime createdAt { get; set; }
        public DateTime expiresAt { get; set; }
        public bool revoked { get; set; }
    }
}
