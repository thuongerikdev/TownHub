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
  requiresMFA?: boolean; mfaTicket?: string;
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

// ─── Core fetch ───────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add token if available
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log(`[API] Calling: ${BASE_URL}${path}`);

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timer);

    const contentType = res.headers.get("content-type");
    const isJson = contentType?.includes("application/json");
    const data = isJson ? await res.json() : { errorCode: res.status, errorMessage: res.statusText, data: null };

    if (!res.ok) {
      console.error(`[API] Error: ${path} → ${res.status}`, data);

      if (res.status === 401 || res.status === 403) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
        }
      }
      return data as ApiResponse<T>;
    }

    console.log(`[API] Success: ${path}`);
    return data as ApiResponse<T>;
  } catch (err) {
    console.error(`[API] Network error: ${path}`, err);
    return {
      errorCode: 500,
      errorMessage: `Lỗi kết nối đến backend (${BASE_URL})`,
      data: null as T
    };
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  staffLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/StaffLogin", { method: "POST", body: JSON.stringify({ userName, password }) }),

  userLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/userLogin", { method: "POST", body: JSON.stringify({ userName, password }) }),

  verifyMFA: (mfaTicket: string, code: string) =>
    apiFetch<LoginResponse>("/login/mfa/verify", { method: "POST", body: JSON.stringify({ mfaTicket, code }) }),

  refreshToken: () =>
    apiFetch<{ accessToken: string; refreshToken: string; permissions: string[] }>("/login/auth/refresh", { method: "POST" }),

  logout: () => apiFetch<boolean>("/login/logout", { method: "POST" }),
  logoutAll: () => apiFetch<boolean>("/login/logout/all", { method: "POST" }),

  forgotStart: (email: string) =>
    apiFetch<boolean>("/account/password/forgot/email/start", { method: "POST", body: JSON.stringify({ email }) }),

  forgotVerify: (email: string, code: string) =>
    apiFetch<string>("/account/password/forgot/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  forgotCommit: (ticket: string, newPassword: string) =>
    apiFetch<boolean>("/account/password/forgot/commit", { method: "POST", body: JSON.stringify({ ticket, newPassword }) }),

  registerStart: (email: string) =>
    apiFetch<boolean>("/register/email/start", { method: "POST", body: JSON.stringify({ email }) }),

  registerVerify: (email: string, code: string) =>
    apiFetch<string>("/register/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  register: (data: { userName: string; email: string; password: string; firstName: string; lastName: string; gender?: string }) =>
    apiFetch<{ userID: number; userName: string; email: string; isEmailVerified: boolean }>(
      "/register",
      { method: "POST", body: JSON.stringify(data) }
    ),

  verifyRegisterEmail: (userID: number, token: string) =>
    apiFetch<boolean>("/register/verifyRegisterEmail", { method: "POST", body: JSON.stringify({ userID, token }) }),

  registerCommit: (body: { email: string; password: string; fullName: string; phone: string; idCard?: string; scope?: string }) =>
    apiFetch<LoginResponse>("/register/commit", { method: "POST", body: JSON.stringify(body) }),

  createUser: (body: { userName: string; email: string; password: string; roleIds?: number[]; firstName?: string; lastName?: string; scope?: string; autoVerifyEmail?: boolean }) =>
    apiFetch<{ userID: number; userName: string; email: string }>(
      "/register/createUser",
      { method: "POST", body: JSON.stringify({ scope: "staff", autoVerifyEmail: true, ...body }) }
    ),
};

// ─── Account ─────────────────────────────────────────────────────────────────
export const account = {
  getMe: () => apiFetch<GetUserResponse>("/user/me", {}),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = {
  me: () => apiFetch<GetUserResponse>("/user/me", {}),
  getAll: () => apiFetch<GetUserResponse[]>("/user/admin/getAllUsers", {}),
  getAllAdmin: () => apiFetch<GetUserResponse[]>("/user/admin/getAllUsers", {}),
  getAllSlim: () => apiFetch<UserSlim[]>("/user/getAllUsersSlim", {}),
  getById: (id: number) => apiFetch<GetUserResponse>(`/user/admin/getUserById?userId=${id}`, {}),
  deleteUser: (id: number) => apiFetch<unknown>(`/user/deleteUser?userId=${id}`, { method: "DELETE" }),
  updateProfile: (form: FormData) =>
    fetch(`${BASE_URL}/user/update/profile`, { method: "PUT", body: form, credentials: "include" })
      .then((r) => r.json()),
  updateUsername: (userId: number, newUsername: string) =>
    apiFetch<boolean>(`/user/update/username?userId=${userId}&newUsername=${encodeURIComponent(newUsername)}`, { method: "PUT" }),
};

// ─── Roles ───────────────────────────────────────────────────────────────────
export const roles = {
  getAll: () => apiFetch<Role[]>("/roles/getall", {}),
  getAllScopeUser: () => apiFetch<Role[]>("/roles/getallscope-user", {}),
  getByUser: (userID: number) => apiFetch<Role[]>(`/roles/getRoleByUserID/${userID}`, {}),
  add: (body: { roleName: string; roleDescription: string; isDefault?: boolean }) =>
    apiFetch<Role>("/roles/addRole", { method: "POST", body: JSON.stringify(body) }),
  adminAdd: (body: { roleName: string; roleDescription: string; isDefault?: boolean; scope?: string }) =>
    apiFetch<Role>("/roles/admin/addRole", { method: "POST", body: JSON.stringify(body) }),
  update: (body: { roleID: number; roleName: string; roleDescription: string; isDefault?: boolean }) =>
    apiFetch<Role>("/roles/updateRole", { method: "PUT", body: JSON.stringify(body) }),
  delete: (roleID: number) => apiFetch<boolean>(`/roles/deleteRole/${roleID}`, { method: "DELETE" }),
  assignToUser: (userID: number, roleIDs: number[]) =>
    apiFetch<boolean>("/user-roles/admin/assign-roles", { method: "POST", body: JSON.stringify({ userID, roleIDs }) }),
};

// ─── Permissions ──────────────────────────────────────────────────────────────
export const permissions = {
  getAll: () => apiFetch<Permission[]>("/permissions/admin/getall", {}),
  getByUser: (id: number) => apiFetch<Permission[]>(`/permissions/getbyUserID/${id}`, {}),
  getByRole: (id: number) => apiFetch<Permission[]>(`/permissions/getbyRoleID/${id}`, {}),
  assignToRole: (roleID: number, permissionIDs: number[]) =>
    apiFetch<boolean>("/role-permissions/admin/assign-permissions", { method: "POST", body: JSON.stringify({ roleID, permissionIDs }) }),
};

// ─── Apartments ───────────────────────────────────────────────────────────────
export const apartments = {
  getAll: (params?: { building?: string; status?: string }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<ApartmentResponse[]>(`/api/Apartment/get-all${q ? "?" + q : ""}`, {});
  },
  getById: (id: number) => apiFetch<ApartmentResponse>(`/api/Apartment/get/${id}`, {}),
  create: (body: { code: string; building: string; floor: number; unitNumber: string; type: string; areaM2: number; status?: string; note?: string }) =>
    apiFetch<boolean>("/api/Apartment/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: { id: number; code: string; building: string; floor: number; unitNumber: string; type: string; areaM2: number; status: string; note?: string }) =>
    apiFetch<boolean>("/api/Apartment/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) => apiFetch<boolean>(`/api/Apartment/delete/${id}`, { method: "DELETE" }),
};

// ─── Residents ────────────────────────────────────────────────────────────────
export const residents = {
  getAll: (apartmentId?: number) => {
    const q = apartmentId ? `?apartmentId=${apartmentId}` : "";
    return apiFetch<ResidentResponse[]>(`/api/Resident/get-all${q}`, {});
  },
  getById: (id: number) => apiFetch<ResidentResponse>(`/api/Resident/get/${id}`, {}),
  create: (body: Partial<ResidentResponse> & { fullName: string; phone: string }) =>
    apiFetch<boolean>("/api/Resident/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: Partial<ResidentResponse> & { id: number }) =>
    apiFetch<boolean>("/api/Resident/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) => apiFetch<boolean>(`/api/Resident/delete/${id}`, { method: "DELETE" }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = {
  getAll: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return apiFetch<NotificationResponse[]>(`/api/Notification/get-all${q}`, {});
  },
  getById: (id: number) => apiFetch<NotificationResponse>(`/api/Notification/get/${id}`, {}),
  create: (body: { title: string; content: string; channel: string; audience: string; templateId?: number; scheduledAt?: string; createdByAuthUserId: number }) =>
    apiFetch<boolean>("/api/Notification/create", { method: "POST", body: JSON.stringify(body) }),
  send: (id: number) => apiFetch<boolean>(`/api/Notification/send/${id}`, { method: "POST" }),
};

// ─── System Config ────────────────────────────────────────────────────────────
export const systemConfig = {
  getAll: (isPublic?: boolean) => {
    const q = isPublic !== undefined ? `?isPublic=${isPublic}` : "";
    return apiFetch<SystemConfigResponse[]>(`/api/SystemConfig/get-all${q}`, {});
  },
  getByKey: (key: string) => apiFetch<SystemConfigResponse>(`/api/SystemConfig/get/${key}`, {}),
  update: (key: string, value: string, updatedByAuthUserId?: number) =>
    apiFetch<boolean>("/api/SystemConfig/update", { method: "PUT", body: JSON.stringify({ key, value, updatedByAuthUserId }) }),
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = {
  getAll: () => apiFetch<AuditLog[]>("/auditlogs/getall", {}),
  getByUser: (userId: number) => apiFetch<AuditLog[]>(`/auditlogs/getbyuser/${userId}`, {}),
  getById: (id: number) => apiFetch<AuditLog>(`/auditlogs/getbyid/${id}`, {}),
  townhubGetAll: (params?: { targetType?: string; targetId?: number }) => {
    const q = params ? new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<unknown[]>(`/api/AuditLog/get-all${q ? "?" + q : ""}`, {});
  },
};

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = {
  getAll: () => apiFetch<UserSession[]>("/userSession/getall", {}),
  getByUser: (userId: number) => apiFetch<UserSession[]>(`/userSession/getByUserId/${userId}`, {}),
};

// ─── Health ───────────────────────────────────────────────────────────────────
export const health = {
  check: () => fetch(`${BASE_URL}/healthz`).then((r) => r.text()).catch(() => "offline"),
};