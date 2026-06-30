using System.Text.Json;
using System.Text.Json.Serialization;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Tiện ích serialize kết quả service (ResponseDto&lt;T&gt;) thành chuỗi JSON
    /// gọn gàng để trả về cho MCP client (LLM đọc).
    /// </summary>
    internal static class McpJson
    {
        private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false,
            ReferenceHandler = ReferenceHandler.IgnoreCycles,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);
    }
}
