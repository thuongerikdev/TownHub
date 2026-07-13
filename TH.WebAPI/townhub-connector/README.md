# TownHub Connector — gói cài 1 chạm cho Claude Desktop (.mcpb)

Gói **Desktop Extension** (`.mcpb`) giúp **người dùng thường** kết nối Claude Desktop tới
TownHub mà **không cần sửa JSON hay cài Node thủ công** — chỉ kéo-thả file và nhập token vào 1 ô.

Bên trong, extension chạy cầu nối `mcp-remote` trỏ tới endpoint `/mcp` của TownHub, kèm
header `Authorization: Bearer <token>`. Hai giá trị `server_url` và `token` được Claude Desktop
hỏi qua form lúc cài (`user_config` trong `manifest.json`).

## Đóng gói thành file .mcpb

Cần Node.js. Tại thư mục này:

```bash
npx @anthropic-ai/mcpb pack
```

→ sinh ra file `townhub.mcpb`. (Lệnh `npx @anthropic-ai/mcpb validate manifest.json` để kiểm tra trước.)

## Người dùng cài đặt

1. Gửi file `townhub.mcpb` cho người dùng.
2. Mở **Claude Desktop → Settings → Extensions**.
3. **Kéo-thả** `townhub.mcpb` vào (hoặc bấm Install).
4. Form hiện ra → nhập:
   - **Địa chỉ MCP**: để mặc định `https://townhub-new.fly.dev/mcp`.
   - **Mã MCP**: dán token sinh từ trang **Quản trị hệ thống → Mã MCP** trong web TownHub.
5. Bật extension → xong. Hỏi tự nhiên: *"Liệt kê tài sản đang bảo trì"*.

## Yêu cầu

- Claude Desktop bản hỗ trợ Extensions (.mcpb / .dxt).
- Backend đã deploy có endpoint `/mcp` (kiểm tra: gọi trả về 401 khi chưa có token).
- Người dùng có một **Mã MCP** còn hạn (sinh trong app TownHub).

## Lưu ý

- Token hết hạn thì cài lại/nhập token mới trong phần cấu hình extension.
- `manifest.json` ở đây là bản mẫu; `npx @anthropic-ai/mcpb` là công cụ chuẩn để
  validate/đóng gói — nếu phiên bản schema khác, chạy `npx @anthropic-ai/mcpb init`
  để sinh khung mới rồi chép phần `server` + `user_config` ở trên sang.
