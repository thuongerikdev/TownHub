const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://localhost:7029";

// ─── Response wrapper ────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  errorCode: number;
  errorMessage: string;
  data: T;
}

// ─── Domain types ────────────────────────────────────────────────────────────
export interface LoginResponse {
  userID: number; userName: string; email: string; isEmailVerified: boolean;
  token: string; refreshToken: string; tokenExpiration: string; refreshTokenExpiration: string;
  sessionId: number; deviceId: string; permissions: string[];
  roles: { roleID: number; roleName: string }[];
  requiresMfa?: boolean; mfaTicket?: string;
}
export interface GetUserResponse {
  userID: number; userName: string; email: string; status: string; isEmailVerified: boolean;
  profile?: { firstName?: string; lastName?: string; avatar?: string; gender?: string; dateOfBirth?: string; };
}
export interface UserSlim {
  userID: number; userName: string; email: string; status: string; isEmailVerified: boolean;
  profile?: { firstName: string; lastName: string; avatar?: string; gender?: string; dateOfBirth?: string; };
  roles?: { roleID: number; roleName: string; roleDescription: string }[];
}
export interface Role {
  roleID: number; roleName: string; roleDescription: string; isDefault: boolean; scope?: string;
}
export interface Permission {
  permissionID: number; permissionName: string; permissionDescription: string; code: string; scope?: string;
}
export interface ApartmentResponse {
  id: number; code: string; building: string; floor: number; unitNumber: string;
  type: string; areaM2: number; status: string; note?: string; createdAt: string;
}
export interface ResidentResponse {
  id: number; fullName: string; phone: string; email?: string; idCard?: string;
  dateOfBirth?: string; gender?: string; apartmentId?: number; apartmentCode?: string;
  isOwner: boolean; moveInDate?: string; moveOutDate?: string; avatarUrl?: string;
  authUserId?: number; createdAt: string;
}
export interface NotificationResponse {
  id: number; title: string; content: string; channel: string; audience: string;
  status: string; totalRecipients: number; sentCount: number; failedCount: number;
  scheduledAt?: string; sentAt?: string; createdByAuthUserId: number; createdAt: string;
}
export interface SystemConfigResponse {
  id: number; key: string; value: string; dataType: string;
  description?: string; isPublic: boolean; updatedAt: string;
}
export interface AuditLog {
  auditID: number; userID?: number; action?: string; result?: string;
  detail?: string; ip?: string; userAgent?: string; createdAt: string;
}
export interface UserSession {
  sessionID: number; userID: number; deviceId: string; ip?: string;
  userAgent?: string; createdAt: string; lastSeenAt: string; isRevoked: boolean;
}

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_USERS: GetUserResponse[] = [
  { userID: 1, userName: "admin", email: "admin@fz.com", status: "active", isEmailVerified: true, profile: { firstName: "Nguyễn", lastName: "Admin" } },
  { userID: 2, userName: "bql_truong", email: "bql.truong@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Trần Thị", lastName: "Bình" } },
  { userID: 3, userName: "kythuat01", email: "kythuat01@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Lê Văn", lastName: "Cường" } },
  { userID: 4, userName: "resident_p1204", email: "resident.1204@gmail.com", status: "pending", isEmailVerified: false, profile: { firstName: "Phạm", lastName: "Dũng" } },
  { userID: 5, userName: "le_tan01", email: "le_tan@townhub.vn", status: "inactive", isEmailVerified: true, profile: { firstName: "Hoàng Thị", lastName: "Em" } },
  { userID: 6, userName: "ke_toan01", email: "ke_toan@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Vũ Minh", lastName: "Phúc" } },
  { userID: 7, userName: "bao_ve01", email: "baove01@townhub.vn", status: "active", isEmailVerified: true, profile: { firstName: "Đinh Văn", lastName: "Giang" } },
];

const MOCK_ME: GetUserResponse = {
  userID: 1, userName: "admin", email: "admin@fz.com", status: "active", isEmailVerified: true,
  profile: { firstName: "Nguyễn", lastName: "Admin", gender: "male" },
};

const MOCK_ROLES: Role[] = [
  { roleID: 1, roleName: "admin", roleDescription: "Quản trị viên", isDefault: false, scope: "staff" },
  { roleID: 2, roleName: "content_manager", roleDescription: "Quản lý nội dung", isDefault: false, scope: "staff" },
  { roleID: 3, roleName: "user_manager", roleDescription: "Quản lý người dùng", isDefault: false, scope: "staff" },
  { roleID: 4, roleName: "finance_manager", roleDescription: "Quản lý tài chính", isDefault: false, scope: "staff" },
  { roleID: 10, roleName: "customer", roleDescription: "Khách hàng", isDefault: true, scope: "user" },
  { roleID: 11, roleName: "customer-vip", roleDescription: "Khách hàng VIP", isDefault: false, scope: "user" },
];

const MOCK_PERMISSIONS: Permission[] = [
  { permissionID: 1, permissionName: "AccountMfaSetup", code: "account.mfa_setup", permissionDescription: "Thiết lập MFA", scope: "user" },
  { permissionID: 2, permissionName: "UserDelete", code: "user.delete", permissionDescription: "Xóa người dùng", scope: "staff" },
  { permissionID: 3, permissionName: "UserReadDetails", code: "user.read_details", permissionDescription: "Xem chi tiết user", scope: "staff" },
  { permissionID: 4, permissionName: "RoleManage", code: "role.manage", permissionDescription: "Quản lý vai trò", scope: "staff" },
  { permissionID: 5, permissionName: "AuditLogManage", code: "audit_log.manage", permissionDescription: "Xem audit log", scope: "staff" },
];

function buildMockApartments(): ApartmentResponse[] {
  const out: ApartmentResponse[] = [];
  let id = 1;
  for (const b of ["Tòa A", "Tòa B", "Villa"]) {
    for (let f = 12; f >= 8; f--) {
      for (let u = 1; u <= 8; u++) {
        const prefix = b === "Tòa A" ? "A" : b === "Tòa B" ? "B" : "V";
        const roll = Math.random();
        out.push({
          id: id++, code: `${prefix}${f}${String(u).padStart(2, "0")}`,
          building: b, floor: f, unitNumber: String(u).padStart(2, "0"),
          type: ["Studio", "1PN", "2PN", "3PN"][u % 4], areaM2: 55 + u * 7,
          status: roll > 0.65 ? (roll > 0.85 ? "maintenance" : "vacant") : "occupied",
          note: "", createdAt: new Date(2025, 0, id).toISOString(),
        });
      }
    }
  }
  return out;
}
const MOCK_APARTMENTS = buildMockApartments();

const MOCK_NOTIFICATIONS: NotificationResponse[] = [
  { id: 1, title: "Thông báo đóng phí dịch vụ T7/2026", content: "Quý cư dân vui lòng đóng phí trước ngày 15/7.", channel: "email", audience: "all", status: "sent", totalRecipients: 240, sentCount: 238, failedCount: 2, sentAt: new Date(Date.now() - 3600000).toISOString(), createdByAuthUserId: 1, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, title: "Bảo trì thang máy Tòa A", content: "Thang máy Tòa A sẽ bảo trì từ 8h-12h ngày 20/7.", channel: "push", audience: "building_a", status: "sent", totalRecipients: 80, sentCount: 80, failedCount: 0, sentAt: new Date(Date.now() - 86400000).toISOString(), createdByAuthUserId: 1, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 3, title: "Cảnh báo an ninh khu vực hầm B1", content: "Phát hiện đối tượng khả nghi tại hầm B1.", channel: "sms", audience: "staff", status: "failed", totalRecipients: 10, sentCount: 7, failedCount: 3, createdByAuthUserId: 1, createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 4, title: "Mời họp Hội nghị nhà chung cư", content: "Hội nghị sẽ tổ chức lúc 18h ngày 25/7/2026.", channel: "email", audience: "owners", status: "draft", totalRecipients: 0, sentCount: 0, failedCount: 0, createdByAuthUserId: 1, createdAt: new Date(Date.now() - 259200000).toISOString() },
];

const MOCK_SYSTEM_CONFIGS: SystemConfigResponse[] = [
  { id: 1, key: "project_name", value: "TownHub", dataType: "string", description: "Tên dự án hiển thị", isPublic: true, updatedAt: new Date().toISOString() },
  { id: 2, key: "project_code", value: "LUX_RES_01", dataType: "string", description: "Mã dự án (bất biến)", isPublic: false, updatedAt: new Date().toISOString() },
  { id: 3, key: "support_email", value: "support@TownHub.vn", dataType: "string", description: "Email hỗ trợ BQL", isPublic: true, updatedAt: new Date().toISOString() },
  { id: 4, key: "hotline", value: "1900 1234", dataType: "string", description: "Hotline liên hệ", isPublic: true, updatedAt: new Date().toISOString() },
  { id: 5, key: "maintenance_mode", value: "false", dataType: "boolean", description: "Bật/tắt chế độ bảo trì", isPublic: false, updatedAt: new Date().toISOString() },
  { id: 6, key: "sms_gateway", value: "ESMS", dataType: "string", description: "Nhà cung cấp SMS", isPublic: false, updatedAt: new Date().toISOString() },
  { id: 7, key: "payment_gateways", value: "VNPay,MoMo", dataType: "string", description: "Cổng thanh toán hỗ trợ", isPublic: false, updatedAt: new Date().toISOString() },
  { id: 8, key: "max_notification_daily", value: "50", dataType: "integer", description: "Giới hạn thông báo/ngày", isPublic: false, updatedAt: new Date().toISOString() },
  { id: 9, key: "storage_provider", value: "AWS S3", dataType: "string", description: "Nơi lưu trữ file", isPublic: false, updatedAt: new Date().toISOString() },
  { id: 10, key: "session_timeout_min", value: "30", dataType: "integer", description: "Timeout phiên đăng nhập (phút)", isPublic: false, updatedAt: new Date().toISOString() },
];

const MOCK_AUDIT_LOGS: AuditLog[] = [
  { auditID: 1, userID: 1, action: "LoginStaff", result: "OK", detail: "Roles: admin", ip: "127.0.0.1", userAgent: "Chrome/124", createdAt: new Date(Date.now() - 600000).toISOString() },
  { auditID: 2, userID: 1, action: "LoginStaff", result: "OK", detail: "Roles: admin", ip: "192.168.1.10", userAgent: "Safari/17", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { auditID: 3, userID: 2, action: "Login", result: "OK", detail: "sessionID=42", ip: "10.0.0.5", userAgent: "Firefox/125", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { auditID: 4, userID: 3, action: "Login", result: "BadCode", detail: "Wrong TOTP", ip: "10.0.0.8", userAgent: "Chrome/124", createdAt: new Date(Date.now() - 10800000).toISOString() },
  { auditID: 5, userID: 1, action: "Logout", result: "OK", detail: "via RefreshToken", ip: "127.0.0.1", userAgent: "Chrome/124", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { auditID: 6, userID: 4, action: "Login", result: "OK", detail: "sessionID=50", ip: "192.168.2.1", userAgent: "Mobile Safari", createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const MOCK_SESSIONS: UserSession[] = [
  { sessionID: 1, userID: 1, deviceId: "abc123", ip: "127.0.0.1", userAgent: "Chrome/124.0", createdAt: new Date(Date.now() - 3600000).toISOString(), lastSeenAt: new Date().toISOString(), isRevoked: false },
  { sessionID: 2, userID: 1, deviceId: "mobile-x9", ip: "192.168.1.5", userAgent: "Mobile Safari/17", createdAt: new Date(Date.now() - 86400000).toISOString(), lastSeenAt: new Date(Date.now() - 3600000).toISOString(), isRevoked: false },
  { sessionID: 3, userID: 2, deviceId: "laptop-ff", ip: "10.0.0.5", userAgent: "Firefox/125.0", createdAt: new Date(Date.now() - 7200000).toISOString(), lastSeenAt: new Date(Date.now() - 1800000).toISOString(), isRevoked: false },
];

const MOCK_RESIDENTS: ResidentResponse[] = [
  { id: 1, fullName: "Nguyễn Văn An", phone: "0901234567", email: "an@email.com", idCard: "012345678901", gender: "male", apartmentId: 1, apartmentCode: "A1201", isOwner: true, moveInDate: "2024-01-15", createdAt: "2024-01-01" },
  { id: 2, fullName: "Trần Thị Bảo", phone: "0912345678", email: "bao@email.com", idCard: "012345678902", gender: "female", apartmentId: 1, apartmentCode: "A1201", isOwner: false, moveInDate: "2024-01-15", createdAt: "2024-01-01" },
  { id: 3, fullName: "Lê Hoàng Cường", phone: "0923456789", email: "cuong@email.com", idCard: "012345678903", gender: "male", apartmentId: 2, apartmentCode: "A1202", isOwner: true, moveInDate: "2024-03-01", createdAt: "2024-02-15" },
];

// ─── Token helpers ────────────────────────────────────────────────────────────
export const setToken = (token: string) => {
  if (typeof window !== "undefined") localStorage.setItem("token", token);
};
export const getToken = (): string | null => {
  if (typeof window !== "undefined") return localStorage.getItem("token");
  return null;
};
export const clearToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem("token");
};

// ─── Core fetch với fallback mock ─────────────────────────────────────────────
let _offlineMode = false;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  mockData?: T,
): Promise<ApiResponse<T>> {
  if (_offlineMode && mockData !== undefined) {
    return { errorCode: 200, errorMessage: "mock", data: mockData };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add token if available
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({ errorCode: res.status, errorMessage: res.statusText, data: null }));
        return body as ApiResponse<T>;
      }
      if (mockData !== undefined) {
        console.warn(`[API] ${path} → ${res.status}, fallback to mock`);
        return { errorCode: 200, errorMessage: "fallback mock", data: mockData };
      }
      const err = await res.json().catch(() => ({ errorCode: res.status, errorMessage: res.statusText, data: null }));
      return err as ApiResponse<T>;
    }

    _offlineMode = false;
    return res.json();
  } catch {
    if (mockData !== undefined) {
      _offlineMode = true;
      console.warn(`[API] ${path} → network error, fallback to mock`);
      return { errorCode: 200, errorMessage: "offline mock", data: mockData };
    }
    return { errorCode: 500, errorMessage: "Lỗi kết nối", data: null as T };
  }
}

const ok = <T>(data: T): ApiResponse<T> => ({ errorCode: 200, errorMessage: "mock", data });

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  staffLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/StaffLogin", { method: "POST", body: JSON.stringify({ userName, password }) }, {
      userID: 1, userName, email: `${userName}@mock.com`, isEmailVerified: true,
      token: "mock_token", refreshToken: "mock_refresh",
      tokenExpiration: new Date(Date.now() + 1800000).toISOString(),
      refreshTokenExpiration: new Date(Date.now() + 604800000).toISOString(),
      sessionId: 1, deviceId: "mock_device",
      permissions: ["user.read_details.admin", "role.manage", "audit_log.manage", "usersession.manage"],
      roles: [{ roleID: 1, roleName: "admin" }],
    } as LoginResponse),

  userLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/userLogin", { method: "POST", body: JSON.stringify({ userName, password }) }),

  verifyMfa: (mfaTicket: string, code: string) =>
    apiFetch<LoginResponse>("/login/mfa/verify", { method: "POST", body: JSON.stringify({ mfaTicket, code }) }),

  refreshToken: () =>
    apiFetch<{ accessToken: string; refreshToken: string; permissions: string[] }>("/login/auth/refresh", { method: "POST" }),

  logout: () => apiFetch<boolean>("/login/logout", { method: "POST" }, true),
  logoutAll: () => apiFetch<boolean>("/login/logout/all", { method: "POST" }, true),

  forgotStart: (email: string) =>
    apiFetch<boolean>("/account/password/forgot/email/start", { method: "POST", body: JSON.stringify({ email }) }, true),

  forgotVerify: (email: string, code: string) =>
    apiFetch<string>("/account/password/forgot/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }, "mock_ticket_abc123"),

  forgotCommit: (ticket: string, newPassword: string) =>
    apiFetch<boolean>("/account/password/forgot/commit", { method: "POST", body: JSON.stringify({ ticket, newPassword }) }, true),

  registerStart: (email: string) =>
    apiFetch<boolean>("/register/email/start", { method: "POST", body: JSON.stringify({ email }) }, true),

  registerVerify: (email: string, code: string) =>
    apiFetch<string>("/register/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }, "mock_register_ticket_abc123"),

  register: (data: { userName: string; email: string; password: string; firstName: string; lastName: string; gender?: string }) =>
    apiFetch<{ userID: number; userName: string; email: string; isEmailVerified: boolean }>(
      "/register",
      { method: "POST", body: JSON.stringify(data) },
      { userID: Math.floor(Math.random() * 9000) + 100, userName: data.userName, email: data.email, isEmailVerified: false }
    ),

  verifyRegisterEmail: (userID: number, token: string) =>
    apiFetch<boolean>("/register/verifyRegisterEmail", { method: "POST", body: JSON.stringify({ userID, token }) }),

  registerCommit: (body: { email: string; password: string; fullName: string; phone: string; idCard?: string; scope?: string }) =>
    apiFetch<LoginResponse>("/register/commit", { method: "POST", body: JSON.stringify(body) }, {
      userID: Math.floor(Math.random() * 9000) + 100,
      userName: body.email.split("@")[0],
      email: body.email,
      isEmailVerified: true,
      token: "mock_token",
      refreshToken: "mock_refresh",
      tokenExpiration: new Date(Date.now() + 1800000).toISOString(),
      refreshTokenExpiration: new Date(Date.now() + 604800000).toISOString(),
      sessionId: Math.floor(Math.random() * 100) + 1,
      deviceId: "mock_device",
      permissions: body.scope === "staff" ? ["user.read_details", "audit_log.manage"] : [],
      roles: body.scope === "staff" ? [{ roleID: 2, roleName: "content_manager" }] : [{ roleID: 10, roleName: "customer" }],
    } as LoginResponse),
};

// ─── Account ─────────────────────────────────────────────────────────────────
export const account = {
  getMe: () => apiFetch<GetUserResponse>("/user/me", {}, MOCK_ME),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = {
  me: () => apiFetch<GetUserResponse>("/user/me", {}, MOCK_ME),
  getAll: () => apiFetch<GetUserResponse[]>("/user/getAllUsers", {}, MOCK_USERS),
  getAllAdmin: () => apiFetch<GetUserResponse[]>("/user/admin/getAllUsers", {}, MOCK_USERS),
  getAllSlim: () => apiFetch<UserSlim[]>("/user/getAllUsersSlim", {}, MOCK_USERS as UserSlim[]),
  getById: (id: number) => apiFetch<GetUserResponse>(`/user/admin/getUserById?userId=${id}`, {},
    MOCK_USERS.find((u) => u.userID === id) ?? MOCK_ME),
  delete: (id: number) => apiFetch<unknown>(`/user/deleteUser?userId=${id}`, { method: "DELETE" }, true),
  updateProfile: (form: FormData) =>
    fetch(`${BASE_URL}/user/update/profile`, { method: "PUT", body: form, credentials: "include" })
      .then((r) => r.json())
      .catch(() => ok(true)),
  updateUsername: (userId: number, newUsername: string) =>
    apiFetch<boolean>(`/user/update/username?userId=${userId}&newUsername=${encodeURIComponent(newUsername)}`, { method: "PUT" }, true),
  createUser: (body: { userName: string; email: string; password: string; roleIds?: number[]; firstName?: string; lastName?: string; scope?: string; autoVerifyEmail?: boolean }) =>
    apiFetch<{ userID: number; userName: string; email: string }>(
      "/register/createUser",
      { method: "POST", body: JSON.stringify({ scope: "staff", autoVerifyEmail: true, ...body }) },
      { userID: Math.floor(Math.random() * 9000) + 100, userName: body.userName, email: body.email }
    ),
};

// ─── Roles ───────────────────────────────────────────────────────────────────
export const roles = {
  getAll: () => apiFetch<Role[]>("/roles/getall", {}, MOCK_ROLES),
  getAllScopeUser: () => apiFetch<Role[]>("/roles/getallscope-user", {}, MOCK_ROLES.filter((r) => r.scope === "user")),
  getByUser: (userID: number) => apiFetch<Role[]>(`/roles/getRoleByUserID/${userID}`, {}, [MOCK_ROLES[0]]),
  add: (body: { roleName: string; roleDescription: string; isDefault?: boolean }) =>
    apiFetch<Role>("/roles/addRole", { method: "POST", body: JSON.stringify(body) },
      { roleID: Math.floor(Math.random() * 900) + 100, ...body, isDefault: body.isDefault ?? false, scope: "user" }),
  adminAdd: (body: { roleName: string; roleDescription: string; isDefault?: boolean; scope?: string }) =>
    apiFetch<Role>("/roles/admin/addRole", { method: "POST", body: JSON.stringify(body) },
      { roleID: Math.floor(Math.random() * 900) + 100, ...body, isDefault: body.isDefault ?? false }),
  update: (body: { roleID: number; roleName: string; roleDescription: string; isDefault?: boolean }) =>
    apiFetch<Role>("/roles/updateRole", { method: "PUT", body: JSON.stringify(body) },
      { ...body, isDefault: body.isDefault ?? false }),
  delete: (roleID: number) => apiFetch<boolean>(`/roles/deleteRole/${roleID}`, { method: "DELETE" }, true),
  assignToUser: (userID: number, roleIDs: number[]) =>
    apiFetch<boolean>("/user-roles/admin/assign-roles", { method: "POST", body: JSON.stringify({ userID, roleIDs }) }, true),
};

// ─── Permissions ──────────────────────────────────────────────────────────────
export const permissions = {
  getAll: () => apiFetch<Permission[]>("/permissions/admin/getall", {}, MOCK_PERMISSIONS),
  getByUser: (id: number) => apiFetch<Permission[]>(`/permissions/getbyUserID/${id}`, {}, MOCK_PERMISSIONS),
  getByRole: (id: number) => apiFetch<Permission[]>(`/permissions/getbyRoleID/${id}`, {}, MOCK_PERMISSIONS.slice(0, 3)),
  assignToRole: (roleID: number, permissionIDs: number[]) =>
    apiFetch<boolean>("/role-permissions/admin/assign-permissions", { method: "POST", body: JSON.stringify({ roleID, permissionIDs }) }, true),
};

// ─── Apartments ───────────────────────────────────────────────────────────────
export const apartments = {
  getAll: (params?: { building?: string; status?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<ApartmentResponse[]>(`/api/Apartment/get-all${q ? "?" + q : ""}`, {}, MOCK_APARTMENTS);
  },
  getById: (id: number) => apiFetch<ApartmentResponse>(`/api/Apartment/get/${id}`, {},
    MOCK_APARTMENTS.find((a) => a.id === id) ?? MOCK_APARTMENTS[0]),
  create: (body: { code: string; building: string; floor: number; unitNumber: string; type: string; areaM2: number; status?: string; note?: string }) =>
    apiFetch<boolean>("/api/Apartment/create", { method: "POST", body: JSON.stringify(body) }, true),
  update: (body: { id: number; code: string; building: string; floor: number; unitNumber: string; type: string; areaM2: number; status: string; note?: string }) =>
    apiFetch<boolean>("/api/Apartment/update", { method: "PUT", body: JSON.stringify(body) }, true),
  delete: (id: number) => apiFetch<boolean>(`/api/Apartment/delete/${id}`, { method: "DELETE" }, true),
};

// ─── Residents ────────────────────────────────────────────────────────────────
export const residents = {
  getAll: (apartmentId?: number) => {
    const q = apartmentId ? `?apartmentId=${apartmentId}` : "";
    return apiFetch<ResidentResponse[]>(`/api/Resident/get-all${q}`, {},
      apartmentId ? MOCK_RESIDENTS.filter((r) => r.apartmentId === apartmentId) : MOCK_RESIDENTS);
  },
  getById: (id: number) => apiFetch<ResidentResponse>(`/api/Resident/get/${id}`, {}, MOCK_RESIDENTS[0]),
  create: (body: Partial<ResidentResponse> & { fullName: string; phone: string }) =>
    apiFetch<boolean>("/api/Resident/create", { method: "POST", body: JSON.stringify(body) }, true),
  update: (body: Partial<ResidentResponse> & { id: number }) =>
    apiFetch<boolean>("/api/Resident/update", { method: "PUT", body: JSON.stringify(body) }, true),
  delete: (id: number) => apiFetch<boolean>(`/api/Resident/delete/${id}`, { method: "DELETE" }, true),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = {
  getAll: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return apiFetch<NotificationResponse[]>(`/api/Notification/get-all${q}`, {},
      status ? MOCK_NOTIFICATIONS.filter((n) => n.status === status) : MOCK_NOTIFICATIONS);
  },
  getById: (id: number) => apiFetch<NotificationResponse>(`/api/Notification/get/${id}`, {}, MOCK_NOTIFICATIONS[0]),
  create: (body: { title: string; content: string; channel: string; audience: string; templateId?: number; scheduledAt?: string; createdByAuthUserId: number }) =>
    apiFetch<boolean>("/api/Notification/create", { method: "POST", body: JSON.stringify(body) }, true),
  send: (id: number) => apiFetch<boolean>(`/api/Notification/send/${id}`, { method: "POST" }, true),
};

// ─── System Config ─────────────────────────────────────────────────────────────
export const systemConfig = {
  getAll: (isPublic?: boolean) => {
    const q = isPublic !== undefined ? `?isPublic=${isPublic}` : "";
    return apiFetch<SystemConfigResponse[]>(`/api/SystemConfig/get-all${q}`, {},
      isPublic !== undefined ? MOCK_SYSTEM_CONFIGS.filter((c) => c.isPublic === isPublic) : MOCK_SYSTEM_CONFIGS);
  },
  getByKey: (key: string) => apiFetch<SystemConfigResponse>(`/api/SystemConfig/get/${key}`, {},
    MOCK_SYSTEM_CONFIGS.find((c) => c.key === key) ?? MOCK_SYSTEM_CONFIGS[0]),
  update: (key: string, value: string, updatedByAuthUserId?: number) =>
    apiFetch<boolean>("/api/SystemConfig/update", { method: "PUT", body: JSON.stringify({ key, value, updatedByAuthUserId }) }, true),
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────
export const auditLogs = {
  getAll: () => apiFetch<AuditLog[]>("/auditlogs/getall", {}, MOCK_AUDIT_LOGS),
  getByUser: (userId: number) => apiFetch<AuditLog[]>(`/auditlogs/getbyuser/${userId}`, {},
    MOCK_AUDIT_LOGS.filter((l) => l.userID === userId)),
  getById: (id: number) => apiFetch<AuditLog>(`/auditlogs/getbyid/${id}`, {}, MOCK_AUDIT_LOGS[0]),
  townhubGetAll: (params?: { targetType?: string; targetId?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<unknown[]>(`/api/AuditLog/get-all${q ? "?" + q : ""}`, {}, []);
  },
};

// ─── Sessions ──────────────────────────────────────────────────────────────────
export const sessions = {
  getAll: () => apiFetch<UserSession[]>("/userSession/getall", {}, MOCK_SESSIONS),
  getByUser: (userId: number) => apiFetch<UserSession[]>(`/userSession/getByUserId/${userId}`, {},
    MOCK_SESSIONS.filter((s) => s.userID === userId)),
};

// ─── Health ────────────────────────────────────────────────────────────────────
export const health = {
  check: () => fetch(`${BASE_URL}/healthz`).then((r) => r.text()).catch(() => "offline"),
};

export const isMockMode = () => _offlineMode;