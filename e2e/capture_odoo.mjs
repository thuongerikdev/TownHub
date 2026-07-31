import { chromium } from "@playwright/test";
import fs from "fs";
const OUT = "artifacts/odoo";
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const c = await b.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
});
const p = await c.newPage();

// Provision a fresh demo (auto-login admin/admin). Retry on 500.
let base = null;
for (let i = 0; i < 5 && !base; i++) {
  try {
    const r = await p.goto("https://demo.odoo.com", { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(4000);
    const u = new URL(p.url());
    if (r && r.status() < 500 && !/login\?db/.test(p.url())) { base = `${u.protocol}//${u.host}`; }
    else if (/saas_worker\/demo\/login/.test(p.url())) {
      // follow the auto-login link once more
      await p.waitForTimeout(3000);
      const u2 = new URL(p.url()); base = `${u2.protocol}//${u2.host}`;
    }
  } catch (e) { console.log("provision try", i, e.message.split("\n")[0]); }
  if (!base) await p.waitForTimeout(3000);
}
console.log("landed on:", p.url());
base = base || (new URL(p.url())).origin;

async function settle() {
  await p.waitForTimeout(3500);
  try { await p.waitForLoadState("networkidle", { timeout: 12000 }); } catch {}
  await p.waitForTimeout(1500);
}
async function shot(name, path) {
  try {
    await p.goto(base + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settle();
    await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log("OK", name, "->", path, "| title:", (await p.title()).slice(0,40));
  } catch (e) { console.log("FAIL", name, e.message.split("\n")[0]); }
}

// Odoo 17/18 clean URLs; fall back to legacy web# if needed
await shot("odoo_inventory_overview", "/odoo/inventory");
await shot("odoo_inventory_products", "/odoo/inventory/products");
await shot("odoo_maintenance_requests", "/odoo/maintenance");
await shot("odoo_helpdesk_tickets", "/odoo/helpdesk");

await b.close();
console.log("DONE");
