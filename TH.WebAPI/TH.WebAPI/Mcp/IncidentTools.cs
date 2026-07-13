using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.Incident;
using TH.Asset.Dtos;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho nghiệp vụ SỰ CỐ / PHIẾU YÊU CẦU (tickets).
    /// </summary>
    [McpServerToolType]
    public static class IncidentTools
    {
        [McpServerTool(Name = "search_tickets")]
        [Description("Liệt kê phiếu sự cố. Lọc theo toà nhà, trạng thái " +
                     "(NEW | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED) hoặc người báo cáo.")]
        public static async Task<string> SearchTickets(
            ITicketService ticketService,
            [Description("ID toà nhà (GUID), bỏ trống để lấy tất cả")] Guid? buildingId = null,
            [Description("Trạng thái phiếu, ví dụ: IN_PROGRESS")] string? status = null,
            [Description("ID người báo cáo (GUID)")] Guid? reportedBy = null)
        {
            var result = await ticketService.GetAllAsync(buildingId, status, reportedBy);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_ticket")]
        [Description("Lấy chi tiết một phiếu sự cố theo ID (GUID).")]
        public static async Task<string> GetTicket(
            ITicketService ticketService,
            [Description("ID phiếu sự cố (GUID)")] Guid id)
        {
            var result = await ticketService.GetByIdAsync(id);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_ticket_status_history")]
        [Description("Lấy lịch sử thay đổi trạng thái của một phiếu sự cố theo ID (GUID).")]
        public static async Task<string> GetTicketStatusHistory(
            ITicketService ticketService,
            [Description("ID phiếu sự cố (GUID)")] Guid ticketId)
        {
            var result = await ticketService.GetStatusHistoryAsync(ticketId);
            return McpJson.Serialize(result);
        }

        // ─────────────────────────────────────────────────────────────────────
        // TOOL GHI (write): tạo phiếu sự cố mới.
        // Để bật/tắt nhóm tool ghi, xem cờ MCP_ENABLE_WRITE trong Program.cs.
        // ─────────────────────────────────────────────────────────────────────
        [McpServerTool(Name = "create_ticket")]
        [Description("Tạo phiếu sự cố mới. Cần mã phiếu, toà nhà và người báo cáo. " +
                     "category: ELECTRICAL | PLUMBING | HVAC | OTHER. priority: LOW | MEDIUM | HIGH | URGENT.")]
        public static async Task<string> CreateTicket(
            ITicketService ticketService,
            IConfiguration config,
            [Description("Mã phiếu (duy nhất), ví dụ: TK-2026-001")] string ticketCode,
            [Description("ID toà nhà (GUID)")] Guid buildingId,
            [Description("ID người báo cáo (GUID)")] Guid reportedBy,
            [Description("Tiêu đề ngắn gọn")] string? title = null,
            [Description("Mô tả chi tiết sự cố")] string? description = null,
            [Description("Phân loại: ELECTRICAL | PLUMBING | HVAC | OTHER")] string? category = null,
            [Description("Mức ưu tiên: LOW | MEDIUM | HIGH | URGENT")] string priority = "MEDIUM",
            [Description("ID tài sản liên quan (GUID), nếu có")] Guid? assetId = null)
        {
            // Tool ghi chỉ hoạt động khi bật cờ MCP_ENABLE_WRITE=true (mặc định tắt cho an toàn).
            if (!config.GetValue<bool>("MCP_ENABLE_WRITE"))
                return McpJson.Serialize(new { errorCode = 403, errorMessage = "Tool ghi đang bị tắt. Bật MCP_ENABLE_WRITE=true để cho phép." });

            var dto = new CreateTicketDto
            {
                ticketCode = ticketCode,
                buildingId = buildingId,
                reportedBy = reportedBy,
                title = title,
                description = description,
                category = category,
                priority = priority,
                assetId = assetId
            };
            var result = await ticketService.CreateAsync(dto);
            return McpJson.Serialize(result);
        }
    }
}
