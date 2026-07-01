#!/usr/bin/env node
/**
 * Cầu nối MCP cho TownHub: chạy `mcp-remote` (đóng gói sẵn trong node_modules)
 * để Claude Desktop kết nối tới endpoint /mcp từ xa, kèm header
 * Authorization: Bearer <token>. URL và token đến từ biến môi trường (manifest.json).
 *
 * Vì Claude Desktop nuốt stderr, mọi log/ lỗi được ghi thêm vào file
 *   <thư mục tạm>/townhub-mcp.log
 * để chẩn đoán (mở file này khi gặp lỗi).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const LOG_FILE = path.join(os.tmpdir(), "townhub-mcp.log");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch { /* ignore */ }
  try { process.stderr.write(line + "\n"); } catch { /* ignore */ }
}

const url = process.env.TOWNHUB_URL;
const token = process.env.TOWNHUB_TOKEN;

log(`khởi động. URL=${url || "(trống)"} token=${token ? token.slice(0, 8) + "…(" + token.length + " ký tự)" : "(trống)"}`);

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

const args = [proxyPath, url, "--header", `Authorization: Bearer ${token}`];
log("execPath=" + process.execPath);
log("chạy: node mcp-remote " + url + " --header Authorization: Bearer ***");

// ELECTRON_RUN_AS_NODE=1: Claude Desktop chạy bằng Node tích hợp (binary Electron);
// biến này buộc nó hành xử như Node thuần khi ta spawn lại để chạy proxy.
// stderr của mcp-remote được pipe ra để ghi log (nơi hiện lỗi 401/404/mạng).
const child = spawn(process.execPath, args, {
  stdio: ["inherit", "inherit", "pipe"],
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
});

child.stderr.on("data", (d) => log("[mcp-remote] " + d.toString().trimEnd()));
child.on("error", (err) => { log("LỖI khởi chạy mcp-remote: " + err.message); process.exit(1); });
child.on("exit", (code, signal) => {
  log(`mcp-remote thoát code=${code} signal=${signal || "-"}`);
  process.exit(code == null ? 0 : code);
});
