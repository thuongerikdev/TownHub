import { test, expect, APIRequestContext } from "@playwright/test";
import { roleCtx, apiGet, apiPost, findOne, BUILDING_ID } from "./helpers";
import { API_BASE } from "../playwright.config";

const WO = `${API_BASE}/api/asset/work-order`;

/** Lấy assetId + checklistTemplateId bằng quyền admin (chỉ là dữ liệu nền cho WO). */
async function refData() {
  const { ctx, token } = await roleCtx("admin");
  const assets = (await (await apiGet(ctx, token, `${API_BASE}/api/asset/asset/get-all`)).json())?.data ?? [];
  const tpls = (await (await apiGet(ctx, token, `${API_BASE}/api/asset/checklist-template/get-all`)).json())?.data ?? [];
  await ctx.dispose();
  return { assetId: assets[0]?.id, templateId: tpls[0]?.id };
}

async function managerCreatesWO(title: string, assetId: string, templateId: string) {
  const mgr = await roleCtx("manager");
  const create = await apiPost(mgr.ctx, mgr.token, `${WO}/create`, {
    assetId, checklistTemplateId: templateId, buildingId: BUILDING_ID, woType: "CM", title,
    description: "Bảo trì khắc phục — kiểm thử.",
  });
  expect(create.status(), "Ban quản lý phải tạo được WO").toBe(200);
  const wo = await findOne(mgr.ctx, mgr.token, `${WO}/get-all`, (r) => r.title === title);
  expect(wo, "Phải tìm thấy WO vừa tạo").toBeTruthy();
  return { mgr, wo };
}

test.describe("Luồng 5 — Bảo trì / Work Order (Ban quản lý tạo & giao · KTV thực thi)", () => {
  test("TC-WO-10 (happy, BQL): Ban quản lý tạo lệnh công việc (WO)", async ({}) => {
    const { assetId, templateId } = await refData();
    test.skip(!assetId || !templateId, "Thiếu tài sản/mẫu checklist nền.");
    const { mgr, wo } = await managerCreatesWO(`[E2E] WO tạo ${Date.now()}`, assetId, templateId);
    expect(wo.woCode).toMatch(/WO/i);
    await mgr.ctx.dispose();
  });

  test("TC-WO-11 (happy, BQL): Ban quản lý phân công KTV cho WO", async ({}) => {
    const { assetId, templateId } = await refData();
    test.skip(!assetId || !templateId, "Thiếu dữ liệu nền.");
    const { mgr, wo } = await managerCreatesWO(`[E2E] WO giao ${Date.now()}`, assetId, templateId);
    const assign = await apiPost(mgr.ctx, mgr.token, `${WO}/assign-technician`, {
      woId: wo.id, assignedTo: "00000000-0000-0000-0000-000000000000", assignedToUserId: 21, assignedToName: "Kỹ thuật viên",
    });
    expect(assign.status()).toBe(200);
    await mgr.ctx.dispose();
  });

  test("TC-WO-12 (side, BQL): Ban quản lý KHÔNG được thực thi WO (execute) → 403", async ({}) => {
    const { assetId, templateId } = await refData();
    test.skip(!assetId || !templateId, "Thiếu dữ liệu nền.");
    const { mgr, wo } = await managerCreatesWO(`[E2E] WO BQL-execute ${Date.now()}`, assetId, templateId);
    const res = await apiPost(mgr.ctx, mgr.token, `${WO}/add-attachment`, {
      woId: wo.id, attachmentType: "AFTER", fileUrl: "https://x/y.jpg",
    });
    expect(res.status(), "BQL chỉ giao việc, không tự thực thi").toBe(403);
    await mgr.ctx.dispose();
  });

  test("TC-WO-13 (side, KTV): Kỹ thuật viên KHÔNG được tạo WO → 403", async ({}) => {
    const { ctx, token } = await roleCtx("technician");
    const res = await apiPost(ctx, token, `${WO}/create`, {
      assetId: BUILDING_ID, checklistTemplateId: BUILDING_ID, buildingId: BUILDING_ID, woType: "CM", title: "x",
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-WO-14 (happy, KTV): Kỹ thuật viên thực thi WO (đính kèm minh chứng)", async ({}) => {
    const { assetId, templateId } = await refData();
    test.skip(!assetId || !templateId, "Thiếu dữ liệu nền.");
    const { mgr, wo } = await managerCreatesWO(`[E2E] WO KTV-execute ${Date.now()}`, assetId, templateId);
    await mgr.ctx.dispose();
    const tech = await roleCtx("technician");
    const res = await apiPost(tech.ctx, tech.token, `${WO}/add-attachment`, {
      woId: wo.id, attachmentType: "AFTER", fileUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg", fileName: "minh-chung.jpg",
    });
    expect(res.status(), "KTV có quyền thực thi (workorder.execute)").toBe(200);
    await tech.ctx.dispose();
  });

  test("TC-WO-15 (side, Kế toán): Kế toán KHÔNG có quyền xem WO → 403", async ({}) => {
    const { ctx, token } = await roleCtx("accountant");
    expect((await apiGet(ctx, token, `${WO}/get-all`)).status()).toBe(403);
    await ctx.dispose();
  });
});
