import { test } from "@playwright/test";
import { shot, goto, roleCtx, apiGet } from "./helpers";
import { API_BASE } from "../playwright.config";

/** Ảnh THẬT cho các hình giao diện Chương 4 (thay mockup img17-img26, img40-41). */
test.describe("Ảnh thật — Hình giao diện Chương 4", () => {
  test("fig_asset_list", async ({ page }) => { await goto(page, "/assets"); await shot(page, "fig_asset_list"); });
  test("fig_work_orders", async ({ page }) => { await goto(page, "/pm/work-orders"); await shot(page, "fig_work_orders"); });
  test("fig_inventory", async ({ page }) => { await goto(page, "/inventory"); await shot(page, "fig_inventory"); });
  test("fig_ocr_new", async ({ page }) => { await goto(page, "/procurement/ocr/new"); await shot(page, "fig_ocr_new"); });
  test("fig_tickets", async ({ page }) => { await goto(page, "/tickets"); await shot(page, "fig_tickets"); });
  test("fig_sla", async ({ page }) => { await goto(page, "/tickets/sla-dashboard"); await shot(page, "fig_sla"); });

  test("fig_asset_detail", async ({ page }) => {
    // Lấy id tài sản đầu tiên để mở màn chi tiết.
    const { ctx, token } = await roleCtx("admin");
    const assets = (await (await apiGet(ctx, token, `${API_BASE}/api/asset/asset/get-all`)).json())?.data ?? [];
    await ctx.dispose();
    const id = assets[0]?.id;
    test.skip(!id, "Không có tài sản để mở chi tiết.");
    await goto(page, `/assets/${id}`);
    await shot(page, "fig_asset_detail");
  });
});
