using System.Text.Json;
using Anthropic;
using Anthropic.Models.Messages;
using TH.Asset.ApplicationService.Service.Core;
using TH.Asset.ApplicationService.Service.Incident;
using TH.Asset.ApplicationService.Service.Inventory;
using TH.Asset.ApplicationService.Service.Maintenance;
using TH.Asset.ApplicationService.Service.Vendor;
using TH.WebAPI.Mcp;

namespace TH.WebAPI.Ai
{
    public sealed class AiMessage
    {
        public string role { get; set; } = "user";   // "user" | "assistant"
        public string content { get; set; } = string.Empty;
    }

    public sealed class AiChatRequest
    {
        public List<AiMessage> messages { get; set; } = new();
    }

    public sealed class AiChatResponse
    {
        public string answer { get; set; } = string.Empty;
        public List<string> toolsUsed { get; set; } = new();
    }

    public interface IAiChatService
    {
        Task<AiChatResponse> ChatAsync(AiChatRequest request, CancellationToken ct = default);
    }

    /// <summary>
    /// Trợ lý AI trong ứng dụng: gọi Claude (Anthropic) với bộ công cụ map sang
    /// các Service nghiệp vụ TownHub. Người dùng cuối chỉ chat — server tự gọi tool,
    /// lấy dữ liệu thật, rồi để Claude trả lời tiếng Việt.
    /// </summary>
    public sealed class AiChatService : IAiChatService
    {
        private const string ModelId = "claude-opus-4-8";
        private const int MaxToolIterations = 6;

        private const string SystemPrompt =
            "Bạn là trợ lý AI của hệ thống quản lý tài sản & vận hành toà nhà TownHub. " +
            "Trả lời ngắn gọn, rõ ràng bằng tiếng Việt. " +
            "Luôn dùng công cụ để tra cứu dữ liệu thật khi câu hỏi liên quan đến tài sản, sự cố, kho, bảo trì hay nhà cung cấp — KHÔNG bịa số liệu. " +
            "Nếu thiếu thông tin (ví dụ ID), hãy hỏi lại người dùng. " +
            "Chỉ trả lời câu cuối cùng cho người dùng, không trình bày quá trình suy luận.";

        private readonly AnthropicClient _client;
        private readonly IConfiguration _config;
        private readonly ILogger<AiChatService> _logger;
        private readonly IAssetService _assets;
        private readonly ITicketService _tickets;
        private readonly IMaterialService _materials;
        private readonly IMaintenanceScheduleService _schedules;
        private readonly IVendorService _vendors;

        public AiChatService(
            AnthropicClient client,
            IConfiguration config,
            ILogger<AiChatService> logger,
            IAssetService assets,
            ITicketService tickets,
            IMaterialService materials,
            IMaintenanceScheduleService schedules,
            IVendorService vendors)
        {
            _client = client;
            _config = config;
            _logger = logger;
            _assets = assets;
            _tickets = tickets;
            _materials = materials;
            _schedules = schedules;
            _vendors = vendors;
        }

        // ── Định nghĩa công cụ cho Claude ─────────────────────────────────────
        private static Tool StrTool(string name, string description, params (string key, string desc)[] props)
        {
            var properties = new Dictionary<string, JsonElement>();
            foreach (var (key, desc) in props)
                properties[key] = JsonSerializer.SerializeToElement(new { type = "string", description = desc });

            return new Tool
            {
                Name = name,
                Description = description,
                InputSchema = new() { Properties = properties, Required = [] }
            };
        }

        private static ToolUnion[] BuildTools() =>
        [
            StrTool("search_assets", "Tìm/liệt kê tài sản. Lọc theo toà nhà, danh mục hoặc trạng thái (dang_su_dung, dang_bao_tri, nhan_roi, da_thanh_ly).",
                ("buildingId", "ID toà nhà (GUID)"), ("categoryId", "ID danh mục (GUID)"), ("status", "Trạng thái tài sản")),
            StrTool("get_asset", "Lấy chi tiết một tài sản theo ID (GUID).", ("id", "ID tài sản (GUID)")),
            StrTool("search_tickets", "Liệt kê phiếu sự cố. Lọc theo toà nhà hoặc trạng thái (NEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED).",
                ("buildingId", "ID toà nhà (GUID)"), ("status", "Trạng thái phiếu")),
            StrTool("get_low_stock_materials", "Lấy danh sách vật tư đang dưới mức tồn kho tối thiểu.", ("warehouseId", "ID kho (GUID), tùy chọn")),
            StrTool("get_overdue_maintenance", "Lấy danh sách lịch bảo trì đã quá hạn."),
            StrTool("search_vendors", "Liệt kê nhà cung cấp. Lọc theo trạng thái (ACTIVE, BLACKLISTED).", ("status", "Trạng thái nhà cung cấp")),
        ];

        // ── Thực thi một tool call → trả JSON ─────────────────────────────────
        private async Task<string> ExecuteToolAsync(string name, IReadOnlyDictionary<string, JsonElement> input)
        {
            try
            {
                switch (name)
                {
                    case "search_assets":
                        return McpJson.Serialize(await _assets.GetAllAsync(OptGuid(input, "buildingId"), OptGuid(input, "categoryId"), OptStr(input, "status")));
                    case "get_asset":
                        var aid = OptGuid(input, "id");
                        if (aid is null) return Err("Thiếu hoặc sai ID tài sản.");
                        return McpJson.Serialize(await _assets.GetByIdAsync(aid.Value));
                    case "search_tickets":
                        return McpJson.Serialize(await _tickets.GetAllAsync(OptGuid(input, "buildingId"), OptStr(input, "status"), null));
                    case "get_low_stock_materials":
                        return McpJson.Serialize(await _materials.GetLowStockAsync(OptGuid(input, "warehouseId")));
                    case "get_overdue_maintenance":
                        return McpJson.Serialize(await _schedules.GetOverdueAsync());
                    case "search_vendors":
                        return McpJson.Serialize(await _vendors.GetAllAsync(OptStr(input, "status")));
                    default:
                        return Err($"Không hỗ trợ công cụ '{name}'.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi chạy tool {Tool}", name);
                return Err($"Lỗi khi chạy công cụ: {ex.Message}");
            }
        }

        // ── Vòng lặp tool-use ─────────────────────────────────────────────────
        public async Task<AiChatResponse> ChatAsync(AiChatRequest request, CancellationToken ct = default)
        {
            var apiKey = _config["ANTHROPIC_API_KEY"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return new AiChatResponse { answer = "Chưa cấu hình ANTHROPIC_API_KEY trên server nên trợ lý AI chưa hoạt động." };

            var messages = new List<MessageParam>();
            foreach (var m in request.messages)
            {
                if (string.IsNullOrWhiteSpace(m.content)) continue;
                messages.Add(new MessageParam
                {
                    Role = m.role == "assistant" ? Role.Assistant : Role.User,
                    Content = m.content
                });
            }
            if (messages.Count == 0)
                return new AiChatResponse { answer = "Bạn hãy nhập câu hỏi." };

            var tools = BuildTools();
            var toolsUsed = new List<string>();

            for (var i = 0; i < MaxToolIterations; i++)
            {
                var response = await _client.Messages.Create(new MessageCreateParams
                {
                    Model = ModelId,
                    MaxTokens = 2048,
                    System = SystemPrompt,
                    Tools = tools,
                    Messages = messages
                });

                if (response.StopReason != "tool_use")
                    return new AiChatResponse { answer = CollectText(response), toolsUsed = toolsUsed };

                // Dựng lại assistant turn + chạy tool, gắn tool_result
                var assistantContent = new List<ContentBlockParam>();
                var toolResults = new List<ContentBlockParam>();

                foreach (var block in response.Content)
                {
                    if (block.TryPickText(out TextBlock? t))
                    {
                        assistantContent.Add(new TextBlockParam { Text = t!.Text });
                    }
                    else if (block.TryPickToolUse(out ToolUseBlock? tu))
                    {
                        assistantContent.Add(new ToolUseBlockParam { ID = tu!.ID, Name = tu.Name, Input = tu.Input });
                        toolsUsed.Add(tu.Name);
                        var result = await ExecuteToolAsync(tu.Name, tu.Input);
                        toolResults.Add(new ToolResultBlockParam { ToolUseID = tu.ID, Content = result });
                    }
                }

                messages.Add(new MessageParam { Role = Role.Assistant, Content = assistantContent });
                messages.Add(new MessageParam { Role = Role.User, Content = toolResults });
            }

            return new AiChatResponse
            {
                answer = "Xin lỗi, yêu cầu cần quá nhiều bước tra cứu. Bạn thử hỏi cụ thể hơn nhé.",
                toolsUsed = toolsUsed
            };
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        private static string CollectText(Message response)
        {
            var parts = response.Content.Select(b => b.Value).OfType<TextBlock>().Select(t => t.Text);
            var text = string.Join("\n", parts).Trim();
            return string.IsNullOrEmpty(text) ? "(Không có nội dung trả lời)" : text;
        }

        private static string Err(string message) =>
            JsonSerializer.Serialize(new { errorCode = 400, errorMessage = message });

        private static Guid? OptGuid(IReadOnlyDictionary<string, JsonElement> input, string key)
            => input.TryGetValue(key, out var v) && v.ValueKind == JsonValueKind.String
               && Guid.TryParse(v.GetString(), out var g) ? g : null;

        private static string? OptStr(IReadOnlyDictionary<string, JsonElement> input, string key)
            => input.TryGetValue(key, out var v) && v.ValueKind == JsonValueKind.String
               ? v.GetString() : null;
    }
}
