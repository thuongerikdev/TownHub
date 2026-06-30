# TownHub MCP Server

Tích hợp **Model Context Protocol (MCP)** vào backend `TH.WebAPI`, cho phép LLM (Claude
Desktop / Claude Code / bất kỳ MCP client nào) gọi trực tiếp nghiệp vụ TownHub bằng
ngôn ngữ tự nhiên.

MCP server được **host ngay trong TH.WebAPI** (không phải process riêng), dùng lại trực
tiếp tầng Service qua DI nên không cần gọi vòng qua HTTP REST.

---

## 1. Thành phần đã thêm

| File | Vai trò |
|------|---------|
| `TH.WebAPI.csproj` | Thêm package `ModelContextProtocol.AspNetCore` 1.4.0 |
| `Program.cs` | Đăng ký `AddMcpServer().WithHttpTransport().WithToolsFromAssembly()` và `app.MapMcp("/mcp")` |
| `Mcp/McpJson.cs` | Helper serialize `ResponseDto<T>` → JSON |
| `Mcp/AssetTools.cs` | Tài sản: search/get/categories/depreciation/transfers |
| `Mcp/IncidentTools.cs` | Phiếu sự cố: search/get/status-history + `create_ticket` (tool ghi) |
| `Mcp/MaintenanceTools.cs` | Bảo trì: work order, lịch bảo trì, quá hạn, checklist |
| `Mcp/InventoryTools.cs` | Kho/vật tư: kho, vật tư, tồn kho thấp, mức tồn, giao dịch |
| `Mcp/ProcurementTools.cs` | Mua sắm: PR, PO, hoá đơn, job OCR |
| `Mcp/VendorTools.cs` | Nhà cung cấp: hồ sơ, hợp đồng, sắp hết hạn, đánh giá |
| `Mcp/ReportTools.cs` | Báo cáo: KPI snapshot, chi phí theo toà nhà / theo tài sản |

## 2. Danh sách tools

**Tài sản:** `search_assets` · `get_asset` · `list_asset_categories` · `get_asset_depreciation` · `get_asset_transfers`

**Sự cố:** `search_tickets` · `get_ticket` · `get_ticket_status_history`

**Bảo trì:** `search_work_orders` · `get_work_order` · `search_maintenance_schedules` · `get_overdue_maintenance` · `list_checklist_templates`

**Kho/vật tư:** `list_warehouses` · `search_materials` · `get_low_stock_materials` · `get_inventory_levels` · `search_inventory_transactions`

**Mua sắm:** `search_purchase_requests` · `get_purchase_request` · `search_purchase_orders` · `search_invoices` · `search_ocr_jobs`

**Nhà cung cấp:** `search_vendors` · `get_vendor` · `search_vendor_contracts` · `get_expiring_contracts` · `get_vendor_evaluations`

**Báo cáo:** `get_kpi_snapshots` · `get_cost_by_building` · `get_cost_by_asset`

**Tool ghi (mặc định TẮT — cần `MCP_ENABLE_WRITE=true`):** `create_ticket`

> Các domain Bảo trì / Kho / Mua sắm / Nhà cung cấp hiện chỉ có tool ĐỌC.
> Muốn thêm tool ghi, làm theo mẫu `create_ticket` (xem mục 7).

## 3. Cấu hình (biến môi trường / .env)

```dotenv
# Bắt buộc JWT cho /mcp (mặc định true). Đặt false để demo cục bộ không cần token.
MCP_REQUIRE_AUTH=true

# Bật tool ghi (mặc định false cho an toàn)
MCP_ENABLE_WRITE=false
```

> Kết nối DB, Redis... dùng chung cấu hình sẵn có của TH.WebAPI (xem `Program.cs`).

## 4. Chạy

```bash
cd TH.WebAPI/TH.WebAPI
dotnet run
# MCP endpoint: http://localhost:<port>/mcp   (Streamable HTTP)
```

## 5. Kết nối từ client

Vì mặc định `/mcp` bắt buộc JWT, client phải gửi header `Authorization: Bearer <token>`.
Lấy `<token>` bằng cách đăng nhập qua API (vd `POST /login/StaffLogin`) rồi copy accessToken.

### a) Claude Code (HTTP trực tiếp, kèm token)
```bash
claude mcp add --transport http townhub http://localhost:5000/mcp \
  --header "Authorization: Bearer <token>"
```

### b) Claude Desktop (qua cầu nối mcp-remote)
`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "townhub": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "http://localhost:5000/mcp",
        "--header", "Authorization: Bearer <token>"
      ]
    }
  }
}
```

> Demo nhanh không cần token: đặt `MCP_REQUIRE_AUTH=false` rồi bỏ phần `--header`.

Sau khi kết nối, có thể hỏi tự nhiên, ví dụ:
- *"Liệt kê các tài sản đang bảo trị của toà nhà X"*
- *"Cho tôi lịch sử khấu hao của tài sản <GUID>"*
- *"Tổng chi phí phát sinh trên tài sản <GUID> là bao nhiêu?"*

## 6. Bảo mật (khuyến nghị cho production)

`/mcp` **mặc định bắt buộc JWT** (`.RequireAuthorization()` được bật khi `MCP_REQUIRE_AUTH=true`,
là mặc định). Client phải gửi header `Authorization: Bearer <token>` — token lấy từ API đăng nhập
như mọi request khác.

Lưu ý thêm: tầng Service **không tự kiểm tra quyền chi tiết** (quyền vốn được kiểm ở Controller
qua policy). Vì vậy hiện mọi user đã đăng nhập đều gọi được mọi tool. Để siết chặt hơn:

1. Giữ `MCP_REQUIRE_AUTH=true` (đã mặc định) để chặn truy cập ẩn danh.
2. Đặt MCP server sau API gateway / mạng nội bộ.
3. Giữ `MCP_ENABLE_WRITE=false` trừ khi thực sự cần tool ghi.
4. (Nâng cao) Gắn policy quyền cụ thể cho từng nhóm tool nếu cần.

## 7. Cách mở rộng thêm tool

Tạo class mới trong `Mcp/` với `[McpServerToolType]`, mỗi method gắn `[McpServerTool]`
và `[Description]`. Tham số kiểu service (vd `IWorkOrderService`) sẽ được DI tự inject;
tham số có `[Description]` là dữ liệu LLM cung cấp. `WithToolsFromAssembly()` tự quét nên
không cần đăng ký thủ công.

```csharp
[McpServerToolType]
public static class WorkOrderTools
{
    [McpServerTool(Name = "list_work_orders")]
    [Description("Liệt kê lệnh công việc bảo trì.")]
    public static async Task<string> ListWorkOrders(IWorkOrderService svc, Guid? buildingId = null)
        => McpJson.Serialize(await svc.GetAllAsync(buildingId));
}
```
