#!/usr/bin/env node
/**
 * Cầu nối MCP cho TownHub. Chạy `mcp-remote` (đóng gói sẵn) NGAY TRONG tiến trình
 * hiện tại — KHÔNG spawn tiến trình con.
 *
 * Lý do: Claude Desktop chạy file này bằng runtime của nó (process.execPath là
 * claude.exe/Electron). Nếu spawn lại process.execPath để chạy proxy, Electron
 * mở như app và thoát ngay (exit -1). Nạp proxy in-process tránh hẳn vấn đề đó,
 * vì tiến trình này VỐN đã chạy được (Claude Desktop đã khởi động nó thành công)
 * và mcp-remote dùng chính stdin/stdout của tiến trình để giao tiếp với Claude.
 *
 * Log ghi vào <thư mục tạm>/townhub-mcp.log để chẩn đoán.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const LOG_FILE = path.join(os.tmpdir(), "townhub-mcp.log");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch { /* ignore */ }
  try { process.stderr.write(line + "\n"); } catch { /* ignore */ }
}

const url = process.env.TOWNHUB_URL;
const token = process.env.TOWNHUB_TOKEN;

log(`khởi động (in-process). execPath=${process.execPath}`);
log(`URL=${url || "(trống)"} token=${token ? token.slice(0, 8) + "…(" + token.length + " ký tự)" : "(trống)"}`);

if (!url || !token) {
  log("LỖI: thiếu TOWNHUB_URL hoặc TOWNHUB_TOKEN — kiểm tra cấu hình extension.");
  process.exit(1);
}

let proxyPath;
try {
  proxyPath = require.resolve("mcp-remote/dist/proxy.js");
} catch (e) {
  log("LỖI: không tìm thấy mcp-remote đã đóng gói: " + e.message);
  process.exit(1);
}

// Giả lập argv như khi gọi CLI: node proxy.js <url> --header "Authorization: Bearer <token>"
process.argv = [process.argv[0], proxyPath, url, "--header", `Authorization: Bearer ${token}`];
log("nạp proxy in-process: " + proxyPath);

// Nếu mcp-remote gặp lỗi nghiêm trọng (token 401 → OAuth thất bại...) nó sẽ tự process.exit.
import(pathToFileURL(proxyPath).href).catch((e) => {
  log("LỖI nạp proxy: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
