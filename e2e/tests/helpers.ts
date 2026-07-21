import { Page, APIRequestContext, request as pwRequest, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { SHOTS, API_BASE } from "../playwright.config";

export const BUILDING_ID = "11111111-1111-1111-1111-111111111111";
export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
export const RANDOM_GUID = "deadbeef-0000-4000-8000-000000000000";
export const PASSWORD = "E2e@12345";

/** Tài khoản đại diện cho 6 vai trò RBAC của TownHub. */
export type RoleKey = "admin" | "manager" | "engineer" | "technician" | "accountant" | "resident";
export const ROLE_USERS: Record<RoleKey, { userName: string; password: string; scope: "staff" | "user"; roleName: string; label: string }> = {
  admin:      { userName: "admin@fz.com", password: "Admin@123", scope: "staff", roleName: "admin",         label: "Quản trị viên" },
  manager:    { userName: "e2e_manager",  password: PASSWORD,    scope: "staff", roleName: "Ban quản lý",   label: "Ban quản lý" },
  engineer:   { userName: "e2e_engineer", password: PASSWORD,    scope: "staff", roleName: "Kỹ sư trưởng",  label: "Kỹ sư trưởng" },
  technician: { userName: "e2e_tech",     password: PASSWORD,    scope: "staff", roleName: "Kỹ thuật viên", label: "Kỹ thuật viên" },
  accountant: { userName: "e2e_acct",     password: PASSWORD,    scope: "staff", roleName: "Kế toán",       label: "Kế toán" },
  resident:   { userName: "e2e_resident", password: PASSWORD,    scope: "user",  roleName: "Cư dân",        label: "Cư dân" },
};

fs.mkdirSync(SHOTS, { recursive: true });

// ─── Ảnh chụp ────────────────────────────────────────────────────────────────
export async function shot(page: Page, name: string) {
  await page.waitForTimeout(1500);
  try {
    await page.waitForLoadState("networkidle", { timeout: 8000 });
  } catch {
    /* live-feed/polling — bỏ qua */
  }
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export async function goto(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

// ─── API mức vai trò ───────────────────────────────────────────────────────────
export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}
const REQ = { timeout: 90_000 } as const;

/**
 * Tạo APIRequestContext SẠCH (không nạp storageState) rồi đăng nhập theo vai trò.
 * Context sạch là bắt buộc: nếu để mặc định, cookie admin trong storageState của
 * project sẽ bị đính kèm và làm hỏng kiểm thử 403 (backend sẽ xác thực nhầm admin).
 * Chỉ token Bearer của vai trò mới được dùng để xác thực.
 */
export async function roleCtx(key: RoleKey): Promise<{ ctx: APIRequestContext; token: string }> {
  const u = ROLE_USERS[key];
  const ctx = await pwRequest.newContext({ storageState: { cookies: [], origins: [] } });
  const endpoint = u.scope === "user" ? "userLogin" : "StaffLogin";
  // Neon free-tier đôi khi trả chậm/lỗi tạm thời → thử lại tối đa 4 lần.
  let token: string | undefined;
  for (let attempt = 0; attempt < 4 && !token; attempt++) {
    try {
      const res = await ctx.post(`${API_BASE}/login/${endpoint}`, { data: { userName: u.userName, password: u.password }, ...REQ });
      token = (await res.json())?.data?.token;
    } catch {
      /* thử lại */
    }
    if (!token) await new Promise((r) => setTimeout(r, 1500));
  }
  expect(token, `Đăng nhập vai trò '${u.label}' (${u.userName}) phải trả token`).toBeTruthy();
  return { ctx, token: token! };
}

/** Đăng nhập admin (tương thích cũ). */
export async function apiLogin(ctx?: APIRequestContext): Promise<string> {
  const res = await ctx!.post(`${API_BASE}/login/StaffLogin`, {
    data: { userName: ROLE_USERS.admin.userName, password: ROLE_USERS.admin.password },
    ...REQ,
  });
  return (await res.json())?.data?.token as string;
}

export function apiGet(ctx: APIRequestContext, token: string, url: string) {
  return ctx.get(url, { headers: authHeaders(token), ...REQ });
}
export function apiPost(ctx: APIRequestContext, token: string, url: string, data: unknown) {
  return ctx.post(url, { headers: authHeaders(token), data, ...REQ });
}
export function apiPut(ctx: APIRequestContext, token: string, url: string, data?: unknown) {
  return ctx.put(url, { headers: authHeaders(token), ...(data !== undefined ? { data } : {}), ...REQ });
}

/** API create trả {errorCode, data:true} — tra cứu lại bản ghi vừa tạo qua get-all. */
export async function findOne(
  ctx: APIRequestContext,
  token: string,
  listUrl: string,
  predicate: (row: any) => boolean,
): Promise<any | undefined> {
  const res = await apiGet(ctx, token, listUrl);
  const arr = (await res.json())?.data ?? [];
  return Array.isArray(arr) ? arr.find(predicate) : undefined;
}
