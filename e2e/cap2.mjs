import { chromium } from "@playwright/test";
const WEB="http://localhost:3000", OUT="artifacts/screenshots";
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:1440,height:900},locale:"vi-VN"});
const p=await c.newPage();
await p.goto(WEB+"/login",{waitUntil:"domcontentloaded"});await p.waitForTimeout(1500);
await p.getByPlaceholder("vidu@townhub.vn").fill("admin@fz.com");
await p.getByPlaceholder("Nhập mật khẩu").fill("Admin@123");
await p.getByRole("button",{name:"Đăng nhập"}).click();
await p.waitForURL(u=>!u.pathname.startsWith("/login"),{timeout:120000});
for(const [nm,url] of [["gap_asset_docs","/assets/documents"]]){
  await p.goto(WEB+url,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2500);
  try{await p.waitForLoadState("networkidle",{timeout:8000});}catch{}
  await p.screenshot({path:`${OUT}/${nm}.png`,fullPage:true});
  console.log("OK",nm);
}
await b.close();console.log("DONE");
