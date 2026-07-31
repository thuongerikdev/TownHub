import { chromium } from "@playwright/test";
import fs from "fs";
const OUT = "artifacts/odoo";
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36" });
const p = await c.newPage();
await p.goto("https://demo.odoo.com", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(6000);
const base = (new URL(p.url())).origin;
console.log("base", base);
async function settle(){ await p.waitForTimeout(3500); try{await p.waitForLoadState("networkidle",{timeout:12000});}catch{} await p.waitForTimeout(1500); }
async function clickMenu(label){ try{ await p.getByRole("button",{name:label,exact:true}).first().click({timeout:6000}); }catch{ try{ await p.getByText(label,{exact:true}).first().click({timeout:6000}); }catch(e){ console.log("menu miss",label);} } await p.waitForTimeout(2500); }

// Helpdesk -> Tickets list
await p.goto(base+"/odoo/helpdesk",{waitUntil:"domcontentloaded",timeout:60000}); await settle();
await clickMenu("Tickets"); await settle();
await p.screenshot({path:`${OUT}/odoo_helpdesk_ticket_list.png`}); console.log("OK helpdesk list");

// Inventory -> Operations (transfers)
await p.goto(base+"/odoo/inventory",{waitUntil:"domcontentloaded",timeout:60000}); await settle();
await clickMenu("Operations"); await settle();
await p.screenshot({path:`${OUT}/odoo_inventory_operations.png`}); console.log("OK inventory ops");

await b.close(); console.log("DONE");
