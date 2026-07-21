import { test, expect, request as pwRequest } from "@playwright/test";
import { ROLE_USERS, RoleKey, shot, goto, roleCtx, apiGet } from "./helpers";
import { API_BASE } from "../playwright.config";

test.describe("Luồng 1 — Xác thực & Phân quyền (Auth/RBAC)", () => {
  // ---- Giao diện đăng nhập (phiên sạch) ----
  test.describe("Giao diện đăng nhập", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("TC-AUTH-01 (happy): Đăng nhập hợp lệ → vào dashboard", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await shot(page, "tc_auth_01_login_page");
      await page.getByPlaceholder("vidu@townhub.vn").fill(ROLE_USERS.admin.userName);
      await page.getByPlaceholder("Nhập mật khẩu").fill(ROLE_USERS.admin.password);
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120_000 });
      await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible({ timeout: 60_000 });
      await shot(page, "tc_auth_02_dashboard_admin");
    });

    test("TC-AUTH-03 (side): Sai mật khẩu → báo lỗi, ở lại login", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("vidu@townhub.vn").fill(ROLE_USERS.admin.userName);
      await page.getByPlaceholder("Nhập mật khẩu").fill("SaiMatKhau@000");
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
      await expect(page.getByText(/Sai tài khoản|mật khẩu|không đúng/i).first()).toBeVisible({ timeout: 60_000 });
      await shot(page, "tc_auth_03_wrong_password");
    });

    test("TC-AUTH-04 (side): Bỏ trống trường → chặn phía client", async ({ page }) => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Đăng nhập" }).click();
      await expect(page.getByText(/Vui lòng nhập/i)).toBeVisible();
      await shot(page, "tc_auth_04_empty_validation");
    });
  });

  // ---- API xác thực ----
  test("TC-AUTH-05 (happy): API đăng nhập trả token + danh sách quyền", async ({}) => {
    const { ctx, token } = await roleCtx("admin");
    expect(token).toBeTruthy();
    await ctx.dispose();
  });

  test("TC-AUTH-06 (side): API sai mật khẩu → không có token", async ({}) => {
    const ctx = await pwRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await ctx.post(`${API_BASE}/login/StaffLogin`, { data: { userName: ROLE_USERS.admin.userName, password: "SaiMatKhau@000" } });
    expect((await res.json())?.data?.token ?? null).toBeNull();
    await ctx.dispose();
  });

  test("TC-AUTH-07 (side): Gọi API bảo vệ KHÔNG token → 401", async ({}) => {
    const ctx = await pwRequest.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await ctx.get(`${API_BASE}/api/asset/ticket/get-all`);
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  // ---- Ma trận phân quyền: mỗi vai trò CÓ những quyền nào ----
  const MATRIX: Record<Exclude<RoleKey, "admin">, { has: string[]; hasNot: string[] }> = {
    manager: {
      has: ["procurement.approve", "ticket.assign", "workorder.create", "asset.view", "notification.send"],
      hasNot: ["ticket.create", "ticket.resolve", "workorder.execute", "asset.create", "procurement.invoice"],
    },
    engineer: {
      has: ["asset.create", "ticket.create", "ticket.resolve", "workorder.execute", "procurement.request"],
      hasNot: ["procurement.approve", "procurement.invoice", "procurement.order"],
    },
    technician: {
      has: ["asset.view", "ticket.resolve", "workorder.execute", "inventory.transaction"],
      hasNot: ["ticket.create", "workorder.create", "asset.create", "ticket.assign", "procurement.request"],
    },
    accountant: {
      has: ["procurement.invoice", "procurement.order", "asset.update", "report.cost"],
      hasNot: ["asset.create", "procurement.approve", "ticket.create", "workorder.create"],
    },
    resident: {
      has: ["ticket.create", "ticket.view", "notification.view"],
      hasNot: ["asset.view", "procurement.approve", "workorder.view", "ticket.assign"],
    },
  };

  for (const key of Object.keys(MATRIX) as (keyof typeof MATRIX)[]) {
    test(`TC-RBAC-${key} : Quyền trong JWT của vai trò '${ROLE_USERS[key].label}' đúng thiết kế`, async ({}) => {
      const ctx = await pwRequest.newContext({ storageState: { cookies: [], origins: [] } });
      const u = ROLE_USERS[key];
      const res = await ctx.post(`${API_BASE}/login/${u.scope === "user" ? "userLogin" : "StaffLogin"}`, {
        data: { userName: u.userName, password: u.password },
      });
      const perms: string[] = (await res.json())?.data?.permissions ?? [];
      for (const p of MATRIX[key].has) expect(perms, `${u.label} PHẢI có '${p}'`).toContain(p);
      for (const p of MATRIX[key].hasNot) expect(perms, `${u.label} KHÔNG được có '${p}'`).not.toContain(p);
      await ctx.dispose();
    });
  }

  // ---- Ảnh minh hoạ danh mục RBAC (admin) ----
  test("TC-AUTH-20: Màn hình Quản lý người dùng", async ({ page }) => {
    await goto(page, "/users");
    await shot(page, "tc_auth_20_users");
  });
  test("TC-AUTH-21: Màn hình Vai trò (RBAC)", async ({ page }) => {
    await goto(page, "/roles");
    await shot(page, "tc_auth_21_roles");
  });
  test("TC-AUTH-22: Màn hình Danh mục quyền", async ({ page }) => {
    await goto(page, "/permissions");
    await shot(page, "tc_auth_22_permissions");
  });
});
