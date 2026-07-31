import { chromium } from "@playwright/test";
import fs from "fs";

const WEB = "http://localhost:3000";
const OUT = "artifacts/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const shots = [
  { name: "gap_settings",     url: "/settings" },
  { name: "gap_settings_sla", url: "/settings/sla" },
  { name: "gap_profile",      url: "/profile" },
  { name: "gap_register",     url: "/register", noauth: true },
  { name: "gap_files",        url: "/files" },
  { name: "gap_asset_scan",   url: "/assets/scan" },
  { name: "gap_asset_new",    url: "/assets", click: "Ghi tăng" },
  { name: "gap_inv_txn_new",  url: "/inventory/transactions/new" },
];

async function settle(page) {
  await page.waitForTimeout(1500);
  try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
  try {
    await page.waitForFunction(
      () => !document.querySelector(".animate-spin, [data-loading='true']"),
      { timeout: 20000 });
  } catch {}
  await page.waitForTimeout(700);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
const page = await ctx.newPage();

// login as admin
await page.goto(WEB + "/login", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByPlaceholder("vidu@townhub.vn").fill("admin@fz.com");
await page.getByPlaceholder("Nhập mật khẩu").fill("Admin@123");
await page.getByRole("button", { name: "Đăng nhập" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000 });
console.log("logged in");

for (const s of shots) {
  try {
    await page.goto(WEB + s.url, { waitUntil: "domcontentloaded" });
    await settle(page);
    if (s.click) {
      try {
        await page.getByRole("button", { name: s.click }).first().click({ timeout: 6000 });
        await page.waitForTimeout(1500);
      } catch (e) { console.log("  click miss:", s.click, e.message.split("\n")[0]); }
    }
    await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: true });
    console.log("OK", s.name, "->", s.url);
  } catch (e) {
    console.log("FAIL", s.name, e.message.split("\n")[0]);
  }
}
await browser.close();
console.log("DONE");
