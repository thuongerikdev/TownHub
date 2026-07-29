import { test, expect } from "@playwright/test";
import { roleCtx, apiGet, apiPost, apiPut, findOne, BUILDING_ID } from "./helpers";
import { API_BASE } from "../playwright.config";

const A = `${API_BASE}/api/asset/asset`;

test.describe("Luồng 4 — Quản lý tài sản (Kỹ sư trưởng tạo · Kế toán vận hành · KTV/ Cư dân giới hạn)", () => {
  test("TC-AST-10 (happy, Kỹ sư trưởng): Tạo tài sản mới", async ({}) => {
    const { ctx, token } = await roleCtx("engineer");
    const cats = (await (await apiGet(ctx, token, `${API_BASE}/api/asset/asset-category/get-all`)).json())?.data ?? [];
    test.skip(cats.length === 0, "Chưa có danh mục tài sản.");
    const code = `E2E-AS-${Date.now()}`;
    const res = await apiPost(ctx, token, `${A}/create`, {
      assetCode: code, name: "Máy bơm nước kiểm thử", categoryId: cats[0].id, buildingId: BUILDING_ID,
      status: "ACTIVE", purchasePrice: 25000000, purchaseDate: new Date("2026-02-01").toISOString(),
      usefulLifeMonths: 60, depreciationMethod: "STRAIGHT_LINE",
    });
    expect(res.status(), "Kỹ sư trưởng phải tạo được tài sản").toBe(200);
    expect((await res.json()).errorCode, "Server báo tạo thành công").toBe(200);
    await ctx.dispose();
  });

  test("TC-AST-11 (side, KTV): Kỹ thuật viên KHÔNG được tạo tài sản → 403", async ({}) => {
    const { ctx, token } = await roleCtx("technician");
    const res = await apiPost(ctx, token, `${A}/create`, { assetCode: `X-${Date.now()}`, name: "x", categoryId: BUILDING_ID, buildingId: BUILDING_ID });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-AST-12 (side, Kế toán): Kế toán KHÔNG được tạo tài sản → 403", async ({}) => {
    const { ctx, token } = await roleCtx("accountant");
    const res = await apiPost(ctx, token, `${A}/create`, { assetCode: `X-${Date.now()}`, name: "x", categoryId: BUILDING_ID, buildingId: BUILDING_ID });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-AST-13 (happy, Kế toán): Kế toán xem tài sản + báo cáo bảng cân đối", async ({}) => {
    const { ctx, token } = await roleCtx("accountant");
    expect((await apiGet(ctx, token, `${A}/get-all`)).status()).toBe(200);
    expect((await apiGet(ctx, token, `${API_BASE}/api/asset/asset-report/trial-balance`)).status()).toBe(200);
    await ctx.dispose();
  });

  test("TC-AST-14 (RBAC, Kế toán): Kế toán CÓ quyền cập nhật tài sản (qua kiểm tra phân quyền)", async ({}) => {
    const { ctx, token } = await roleCtx("accountant");
    // Không bị 403 (được phép); có thể 400/404 do dữ liệu → miễn không bị chặn phân quyền.
    const res = await apiPut(ctx, token, `${A}/update`, { id: "00000000-0000-0000-0000-000000000000", assetCode: "x", name: "x", categoryId: BUILDING_ID, buildingId: BUILDING_ID });
    expect(res.status(), "Kế toán được phép cập nhật (asset.update)").not.toBe(403);
    await ctx.dispose();
  });

  test("TC-AST-15 (side, KTV): Kỹ thuật viên KHÔNG được cập nhật tài sản → 403", async ({}) => {
    const { ctx, token } = await roleCtx("technician");
    const res = await apiPut(ctx, token, `${A}/update`, { id: "00000000-0000-0000-0000-000000000000", assetCode: "x", name: "x", categoryId: BUILDING_ID, buildingId: BUILDING_ID });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test("TC-AST-16 (happy, KTV): Kỹ thuật viên xem được danh sách tài sản", async ({}) => {
    const { ctx, token } = await roleCtx("technician");
    expect((await apiGet(ctx, token, `${A}/get-all`)).status()).toBe(200);
    await ctx.dispose();
  });

  test("TC-AST-17 (side, Cư dân): Cư dân KHÔNG được xem tài sản → 403", async ({}) => {
    const { ctx, token } = await roleCtx("resident");
    expect((await apiGet(ctx, token, `${A}/get-all`)).status()).toBe(403);
    await ctx.dispose();
  });
});
