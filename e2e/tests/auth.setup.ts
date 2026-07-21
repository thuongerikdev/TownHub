import { test as setup, expect } from "@playwright/test";
import { ROLE_USERS, shot } from "./helpers";
const ADMIN = ROLE_USERS.admin;
import { AUTH_STATE } from "../playwright.config";
import fs from "fs";
import path from "path";

fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });

/**
 * TC-AUTH-01 (happy): Đăng nhập nhân viên hợp lệ → vào được dashboard.
 * Lưu storageState (localStorage token) để các test sau tái sử dụng.
 */
setup("Đăng nhập admin và lưu phiên", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await shot(page, "tc_auth_01_login_page");

  await page.getByPlaceholder("vidu@townhub.vn").fill(ADMIN.userName);
  await page.getByPlaceholder("Nhập mật khẩu").fill(ADMIN.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  // Chờ rời khỏi /login (đăng nhập thành công → điều hướng về "/").
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120_000 });
  // Chờ khung dashboard: nút Đăng xuất trong sidebar.
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible({ timeout: 60_000 });

  await shot(page, "tc_auth_02_dashboard");
  await page.context().storageState({ path: AUTH_STATE });
});
