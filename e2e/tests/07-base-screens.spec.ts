import { test } from "@playwright/test";
import { shot, goto } from "./helpers";

/** Chụp ảnh THẬT các màn hình module Base + quản trị (đăng nhập admin qua storageState).
 *  Dùng để thay các ảnh mockup tự generate ở Chương 3 & 4 của báo cáo. */
test.describe("Ảnh thật — Màn hình module Base & quản trị", () => {
  const pages: [string, string][] = [
    ["/", "real_dashboard"],
    ["/assets/buildings", "real_buildings"],
    ["/assets/floors", "real_floors"],
    ["/apartments", "real_apartments"],
    ["/residents", "real_residents"],
    ["/providers", "real_providers"],
    ["/cameras", "real_cameras"],
    ["/access-alerts", "real_access_alerts"],
    ["/notifications", "real_notifications"],
    ["/send-notification", "real_send_notification"],
    ["/community", "real_community"],
    ["/services", "real_services"],
    ["/users", "real_users"],
    ["/roles", "real_roles"],
    ["/permissions", "real_permissions"],
    ["/permissions/assign", "real_permissions_assign"],
    ["/audit-logs", "real_audit_logs"],
    ["/vendors", "real_vendors"],
    ["/vendors/contracts", "real_vendor_contracts"],
    ["/vendors/performance", "real_vendor_performance"],
    ["/reports", "real_reports"],
    ["/reports/kpi", "real_reports_kpi"],
    ["/reports/cost", "real_reports_cost"],
  ];
  for (const [route, name] of pages) {
    test(`REAL ${route}`, async ({ page }) => {
      await goto(page, route);
      await shot(page, name);
    });
  }
});
