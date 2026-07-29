import { test, expect } from "@playwright/test";
import { roleCtx, apiGet, apiPost, findOne, BUILDING_ID, EMPTY_GUID, ROLE_USERS } from "./helpers";
import { API_BASE } from "../playwright.config";

const T = `${API_BASE}/api/asset/ticket`;

/**
 * LUỒNG SỰ CỐ THEO VAI TRÒ (đúng use case):
 *   Cư dân báo sự cố → Ban quản lý phân công KTV → Kỹ thuật viên xử lý.
 * Kèm kiểm tra tách bạch quyền (separation of duties) bằng các ca 403.
 */
test.describe("Luồng 2 — Sự cố (Cư dân → Ban quản lý → Kỹ thuật viên)", () => {
  test("TC-INC-10 (happy, Cư dân): Cư dân tạo ticket báo sự cố", async ({}) => {
    const { ctx, token } = await roleCtx("resident");
    const title = `[E2E] Mất điện hành lang ${Date.now()}`;
    const res = await apiPost(ctx, token, `${T}/create`, {
      buildingId: BUILDING_ID, reportedBy: EMPTY_GUID, reportedByName: ROLE_USERS.resident.label,
      title, description: "Cư dân báo mất điện.", category: "ELECTRICAL", priority: "HIGH", source: "APP",
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).errorCode).toBe(200);
    const t = await findOne(ctx, token, `${T}/get-all`, (r) => r.title === title);
    expect(t?.ticketCode).toMatch(/^TK-/);
    await ctx.dispose();
  });

  test("TC-INC-11 (side, Cư dân): Cư dân KHÔNG được xem danh sách tài sản → 403", async ({}) => {
    const { ctx, token } = await roleCtx("resident");
    const res = await apiGet(ctx, token, `${API_BASE}/api/asset/asset/get-all`);
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-INC-12 (side, KTV): Kỹ thuật viên KHÔNG được tạo ticket → 403", async ({}) => {
    const { ctx, token } = await roleCtx("technician");
    const res = await apiPost(ctx, token, `${T}/create`, {
      buildingId: BUILDING_ID, reportedBy: EMPTY_GUID, title: "[E2E] KTV thử tạo", category: "OTHER", priority: "LOW", source: "APP",
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-INC-13 (happy, BQL): Ban quản lý phân công KTV cho ticket", async ({}) => {
    // Cư dân tạo trước.
    const resident = await roleCtx("resident");
    const title = `[E2E] Rò rỉ nước B1 ${Date.now()}`;
    await apiPost(resident.ctx, resident.token, `${T}/create`, {
      buildingId: BUILDING_ID, reportedBy: EMPTY_GUID, reportedByName: ROLE_USERS.resident.label,
      title, description: "Cư dân báo rò rỉ.", category: "PLUMBING", priority: "HIGH", source: "APP",
    });
    await resident.ctx.dispose();

    // Ban quản lý phân công.
    const mgr = await roleCtx("manager");
    const t = await findOne(mgr.ctx, mgr.token, `${T}/get-all`, (r) => r.title === title);
    expect(t, "BQL phải thấy ticket để phân công").toBeTruthy();
    const assign = await apiPost(mgr.ctx, mgr.token, `${T}/assign`, {
      ticketId: t.id, assignedTo: EMPTY_GUID, assignedToUserId: 21, assignedToName: ROLE_USERS.technician.label,
    });
    expect(assign.status()).toBe(200);
    await mgr.ctx.dispose();
  });

  test("TC-INC-14 (side, BQL): Ban quản lý KHÔNG được tự xử lý (resolve) → 403", async ({}) => {
    const resident = await roleCtx("resident");
    const title = `[E2E] BQL thử resolve ${Date.now()}`;
    await apiPost(resident.ctx, resident.token, `${T}/create`, {
      buildingId: BUILDING_ID, reportedBy: EMPTY_GUID, title, category: "OTHER", priority: "LOW", source: "APP",
    });
    await resident.ctx.dispose();
    const mgr = await roleCtx("manager");
    const t = await findOne(mgr.ctx, mgr.token, `${T}/get-all`, (r) => r.title === title);
    const res = await apiPost(mgr.ctx, mgr.token, `${T}/change-status`, {
      ticketId: t.id, toStatus: "RESOLVED", changedBy: EMPTY_GUID,
    });
    expect(res.status()).toBe(403);
    await mgr.ctx.dispose();
  });

  test("TC-INC-15 (happy, KTV): Kỹ thuật viên chuyển trạng thái xử lý ticket", async ({}) => {
    const resident = await roleCtx("resident");
    const title = `[E2E] KTV xử lý ${Date.now()}`;
    await apiPost(resident.ctx, resident.token, `${T}/create`, {
      buildingId: BUILDING_ID, reportedBy: EMPTY_GUID, title, category: "ELECTRICAL", priority: "MEDIUM", source: "APP",
    });
    await resident.ctx.dispose();
    const tech = await roleCtx("technician");
    const t = await findOne(tech.ctx, tech.token, `${T}/get-all`, (r) => r.title === title);
    expect(t, "KTV phải thấy ticket để xử lý").toBeTruthy();
    const chg = await apiPost(tech.ctx, tech.token, `${T}/change-status`, {
      ticketId: t.id, fromStatus: t.status, toStatus: "IN_PROGRESS", changedBy: EMPTY_GUID, note: "KTV đang xử lý.",
    });
    expect(chg.status()).toBe(200);
    await tech.ctx.dispose();
  });

  test("TC-INC-16 (side, Cư dân): Cư dân KHÔNG được phân công ticket → 403", async ({}) => {
    const { ctx, token } = await roleCtx("resident");
    const res = await apiPost(ctx, token, `${T}/assign`, {
      ticketId: EMPTY_GUID, assignedTo: EMPTY_GUID, assignedToName: "x",
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });
});
