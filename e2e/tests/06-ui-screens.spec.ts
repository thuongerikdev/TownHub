import { test, expect, Page } from "@playwright/test";
import { ROLE_USERS, RoleKey, shot, goto } from "./helpers";

async function uiLogin(page: Page, key: RoleKey) {
  const u = ROLE_USERS[key];
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("vidu@townhub.vn").fill(u.userName);
  await page.getByPlaceholder("Nhập mật khẩu").fill(u.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 120_000 });
  await page.waitForTimeout(3500);
}

test.describe("Luồng 6 — Ảnh minh hoạ theo vai trò & màn hình nghiệp vụ", () => {
  // ---- Dashboard từng vai trò (phiên sạch, đăng nhập bằng chính tài khoản vai trò) ----
  test.describe("Dashboard theo vai trò", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    const roles: RoleKey[] = ["manager", "engineer", "technician", "accountant", "resident"];
    for (const key of roles) {
      test(`TC-UI-role ${ROLE_USERS[key].label}`, async ({ page }) => {
        await uiLogin(page, key);
        await shot(page, `tc_role_${key}_dashboard`);
      });
    }
  });

  // ---- Màn hình nghiệp vụ (đăng nhập admin qua storageState mặc định) ----
  const pages: [string, string][] = [
    ["/assets", "tc_ui_assets_list"],
    ["/assets/categories", "tc_ui_assets_categories"],
    ["/assets/depreciation", "tc_ui_assets_depreciation"],
    ["/assets/disposals", "tc_ui_assets_disposals"],
    ["/assets/journal", "tc_ui_assets_journal"],
    ["/assets/reports", "tc_ui_assets_reports"],
    ["/procurement/requests", "tc_ui_proc_requests"],
    ["/procurement/orders", "tc_ui_proc_orders"],
    ["/procurement/invoices", "tc_ui_proc_invoices"],
    ["/procurement/ocr/new", "tc_ui_proc_ocr_new"],
    ["/tickets", "tc_ui_tickets"],
    ["/tickets/sla-dashboard", "tc_ui_sla_dashboard"],
    ["/pm/schedules", "tc_ui_pm_schedules"],
    ["/pm/work-orders", "tc_ui_work_orders"],
  ];
  for (const [route, name] of pages) {
    test(`TC-UI ${route}`, async ({ page }) => {
      await goto(page, route);
      await shot(page, name);
    });
  }
});
