import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Cấu hình kiểm thử E2E cho TownHub.
 * - Chạy tuần tự (workers=1) để tránh gây quá tải PostgreSQL Neon (free-tier).
 * - Timeout rộng vì độ trễ mạng tới Neon (us-east-1) khá cao.
 * - Ảnh chụp được lưu thủ công vào e2e/artifacts qua helper shot().
 */
export const ARTIFACTS = path.resolve(__dirname, "artifacts");
export const SHOTS = path.join(ARTIFACTS, "screenshots");
export const API_BASE = process.env.API_BASE ?? "http://localhost:5267";
export const WEB_BASE = process.env.WEB_BASE ?? "http://localhost:3000";
export const AUTH_STATE = path.join(__dirname, "tests", ".auth", "state.json");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 150_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: path.join(ARTIFACTS, "results.json") }],
  ],
  outputDir: path.join(ARTIFACTS, "test-output"),
  use: {
    baseURL: WEB_BASE,
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
    navigationTimeout: 100_000,
    ignoreHTTPSErrors: true,
    locale: "vi-VN",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "e2e",
      testIgnore: /.*\.setup\.ts/,
      dependencies: ["setup"],
      use: { storageState: AUTH_STATE },
    },
  ],
});
