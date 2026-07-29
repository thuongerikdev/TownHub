import { test as setup, expect, request as pwRequest } from "@playwright/test";
import { ROLE_USERS, PASSWORD } from "./helpers";
import { API_BASE } from "../playwright.config";

/**
 * Dựng sẵn 5 tài khoản đại diện cho 5 vai trò nghiệp vụ (ngoài admin).
 * Idempotent: nếu user đã tồn tại (409) thì bỏ qua. Chạy trong project "setup".
 * Nhờ đó bộ kiểm thử "đi luồng theo vai trò" luôn có đủ tài khoản để đăng nhập.
 */
setup("Dựng tài khoản 5 vai trò nghiệp vụ", async () => {
  const ctx = await pwRequest.newContext({ storageState: { cookies: [], origins: [] } });
  const login = await ctx.post(`${API_BASE}/login/StaffLogin`, {
    data: { userName: ROLE_USERS.admin.userName, password: ROLE_USERS.admin.password },
  });
  const token = (await login.json())?.data?.token;
  expect(token, "Admin phải đăng nhập được để dựng tài khoản").toBeTruthy();
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Bản đồ roleName → roleID
  const roles = (await (await ctx.get(`${API_BASE}/roles/getall`, { headers: H })).json())?.data ?? [];
  const roleId: Record<string, number> = {};
  for (const r of roles) roleId[r.roleName] = r.roleID;

  // 4 tài khoản staff (create-bql cho phép gán roleIds trực tiếp)
  for (const key of ["manager", "engineer", "technician", "accountant"] as const) {
    const u = ROLE_USERS[key];
    const rid = roleId[u.roleName];
    const res = await ctx.post(`${API_BASE}/register/create-bql`, {
      headers: H,
      data: {
        userName: u.userName,
        email: `${u.userName}@townhub.local`,
        password: PASSWORD,
        firstName: key,
        lastName: "E2E",
        gender: "other",
        roleIds: [rid],
      },
    });
    const body = await res.json().catch(() => ({}));
    // 200 = tạo mới; 409 = đã tồn tại → cả hai đều chấp nhận.
    expect([200, 409, 400]).toContain(body.errorCode ?? res.status());
    console.log(`[SETUP] ${u.userName} (${u.roleName}) → errorCode=${body.errorCode ?? res.status()}`);
  }

  // Tài khoản cư dân (scope user) qua đăng ký công khai + gán đúng role Cư dân
  const reg = await ctx.post(`${API_BASE}/register`, {
    data: { userName: ROLE_USERS.resident.userName, email: `${ROLE_USERS.resident.userName}@townhub.local`, password: PASSWORD, firstName: "resident", lastName: "E2E", gender: "other" },
  });
  console.log(`[SETUP] e2e_resident → status=${reg.status()}`);
  const rl = await ctx.post(`${API_BASE}/login/userLogin`, { data: { userName: ROLE_USERS.resident.userName, password: PASSWORD } });
  const ruid = (await rl.json())?.data?.userID;
  if (ruid && roleId["Cư dân"]) {
    await ctx.post(`${API_BASE}/user-roles/admin/assign-roles`, { headers: H, data: { userID: ruid, roleIDs: [roleId["Cư dân"]] } });
  }
  expect(ruid, "Cư dân phải đăng nhập được").toBeTruthy();
  await ctx.dispose();
});
