const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5267";

/** All-zero GUID — used for Asset-module cross-service user references that have
 *  no Auth directory yet (we record the human name separately, not as a GUID). */
export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
/** Canonical building for this single-complex deployment. Matches the backend
 *  AssetDataSeeder `BUILDING` Guid. Asset-module `buildingId` references default
 *  to this when the screen has no explicit building picker. */
export const BUILDING_ID = "11111111-1111-1111-1111-111111111111";
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Returns a human label for a user-reference value, or undefined when the value
 *  is empty / a raw GUID (so the UI can fall back instead of showing an ugly id). */
export function displayUser(v?: string | null): string | undefined {
  if (!v) return undefined;
  if (v === EMPTY_GUID || GUID_RE.test(v)) return undefined;
  return v;
}

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
export interface FaceProfileResponse {
  id: number; residentId: number; residentName: string; imageUrl: string;
  aiStatus: string; failureReason?: string; registeredAt: string;
}
export interface AccessEventResponse {
  id: number; residentId?: number; residentName?: string; personType: "resident" | "stranger";
  direction: "in" | "out"; cameraName: string; snapshotUrl?: string; confidence?: number;
  status: string; note?: string; handledByAuthUserId?: number; handledAt?: string; detectedAt: string;
}
export interface CameraRecognitionResponse {
  faceDetected: boolean; matched: boolean; residentId?: number; residentName?: string;
  confidence?: number; eventCreated: boolean; eventId?: number;
  result: "no_face" | "resident" | "stranger"; message: string;
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
export interface ServiceCategory {
  id: number; name: string; description?: string; colorKey: string;
}
export interface ServiceItem {
  id: number; name: string; categoryId: number; categoryName?: string;
  description?: string; contact?: string; openHours?: string; location?: string;
  status: string; tags?: string; rating?: number | null; createdAt: string;
}
export interface ServiceMenuItem {
  id: number; serviceId: number; name: string; description?: string;
  price: number; unit?: string; category?: string; isAvailable: boolean;
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

// Refresh token: lưu ở localStorage để gọi refresh theo body (backend ưu tiên
// body, bỏ qua CSRF). Cookie HttpOnly `fz.refresh` chỉ dùng cho luồng cookie —
// không hoạt động trên localhost http vì Secure=true.
export const setRefreshToken = (rt: string) => {
  if (typeof window !== "undefined") localStorage.setItem("refreshToken", rt);
};
export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") return localStorage.getItem("refreshToken");
  return null;
};
export const clearRefreshToken = () => {
  if (typeof window !== "undefined") localStorage.removeItem("refreshToken");
};

// ─── Permission cache ──────────────────────────────────────────────────────
// Lưu permissions/roles của phiên đăng nhập để hasPermission() sống sót qua
// reload trang (login response chỉ trả 1 lần; account.getMe không kèm quyền).
const PERMS_KEY = "auth.permissions";
const ROLES_KEY = "auth.roles";
export type CachedRole = { roleID: number; roleName: string };
export const setAuthCache = (permissions: string[], roles: CachedRole[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERMS_KEY, JSON.stringify(permissions ?? []));
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles ?? []));
};
export const getCachedPermissions = (): string[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PERMS_KEY) || "[]"); } catch { return []; }
};
export const getCachedRoles = (): CachedRole[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(ROLES_KEY) || "[]"); } catch { return []; }
};
export const clearAuthCache = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PERMS_KEY);
  localStorage.removeItem(ROLES_KEY);
};

// ─── Core fetch ───────────────────────────────────────────────────────────────
type ApiFetchOptions = RequestInit & {
  silentStatuses?: number[];
  /** Nội bộ: đánh dấu request đã là lần thử lại sau khi refresh (chống lặp vô hạn). */
  _isRetry?: boolean;
};

const REFRESH_PATH = "/login/auth/refresh";

// Khi access token hết hạn (401), tự động dùng refresh token lấy access token mới.
// Nhiều request 401 đồng thời sẽ dùng chung 1 lần refresh (single-flight) để tránh
// gọi refresh nhiều lần và làm xoay vòng refresh token liên tục.
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE_URL}${REFRESH_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
        credentials: "include",
      });
      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      const data = json?.data;
      const newAccess: string | undefined = data?.accessToken;
      if (!newAccess) return false;

      setToken(newAccess);
      if (data?.refreshToken) setRefreshToken(data.refreshToken);
      // refresh trả về permissions mới → cập nhật cache (giữ nguyên roles).
      if (Array.isArray(data?.permissions)) {
        localStorage.setItem(PERMS_KEY, JSON.stringify(data.permissions));
      }
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const { silentStatuses = [], _isRetry = false, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutMs = 60_000;
  const timer = setTimeout(
    () => controller.abort(new Error(`Request timed out after ${timeoutMs / 1000}s`)),
    timeoutMs,
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type");
    const isJson = contentType?.includes("application/json");
    const data = isJson ? await res.json() : { errorCode: res.status, errorMessage: res.statusText, data: null };

    if (!res.ok) {
      if (
        res.status === 401 &&
        typeof window !== "undefined" &&
        !_isRetry &&
        path !== REFRESH_PATH
      ) {
        // Access token hết hạn → thử làm mới rồi gọi lại request gốc đúng 1 lần.
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          clearTimeout(timer);
          return apiFetch<T>(path, { ...options, _isRetry: true });
        }
        // Refresh thất bại (hết/thu hồi refresh token) → coi như đăng xuất.
        clearToken();
        clearRefreshToken();
        clearAuthCache();
      }
      if (silentStatuses.includes(res.status)) {
        return data as ApiResponse<T>;
      }
      console.error(`[API] Error: ${path} → ${res.status}`, data);
      return data as ApiResponse<T>;
    }

    return data as ApiResponse<T>;
  } catch (err) {
    console.error(`[API] Network error: ${path}`, err);
    const message = controller.signal.aborted
      ? `Backend không phản hồi sau ${timeoutMs / 1000} giây (${BASE_URL})`
      : `Lỗi kết nối đến backend (${BASE_URL})`;
    return {
      errorCode: 500,
      errorMessage: message,
      data: null as T
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  staffLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/StaffLogin", { method: "POST", body: JSON.stringify({ userName, password }) }),

  userLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/userLogin", { method: "POST", body: JSON.stringify({ userName, password }) }),

  verifyMfa: (mfaTicket: string, code: string) =>
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

  changePasswordStart: (email: string) =>
    apiFetch<boolean>("/account/password/change/email/start", { method: "POST", body: JSON.stringify({ email }) }),

  changePasswordVerify: (email: string, code: string) =>
    apiFetch<string>("/account/password/change/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  changePasswordCommit: (ticket: string, oldPassword: string, newPassword: string) =>
    apiFetch<boolean>("/account/password/change/commit", {
      method: "POST",
      body: JSON.stringify({ ticket, oldPassword, newPassword }),
    }),

  registerStart: (email: string) =>
    apiFetch<boolean>("/register/email/start", { method: "POST", body: JSON.stringify({ email }) }),

  registerVerify: (email: string, code: string) =>
    apiFetch<string>("/register/email/verify", { method: "POST", body: JSON.stringify({ email, code }) }),

  register: (data: { userName: string; email: string; password: string; firstName: string; lastName: string; gender?: string }) =>
    apiFetch<{ userID: number; userName: string; email: string; isEmailVerified: boolean }>(
      "/register",
      { method: "POST", body: JSON.stringify(data) },
    ),

  verifyRegisterEmail: (userID: number, token: string) =>
    apiFetch<boolean>("/register/verifyRegisterEmail", { method: "POST", body: JSON.stringify({ userID, token }) }),

  registerCommit: (body: { email: string; password: string; fullName: string; phone: string; idCard?: string; scope?: string }) =>
    apiFetch<LoginResponse>("/register/commit", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Account ─────────────────────────────────────────────────────────────────
export const account = {
  getMe: () => apiFetch<GetUserResponse>("/user/me", { silentStatuses: [401] }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = {
  me: () => apiFetch<GetUserResponse>("/user/me", {}),
  getAll: () => apiFetch<GetUserResponse[]>("/user/admin/getAllUsers", {}),
  getAllAdmin: () => apiFetch<GetUserResponse[]>("/user/admin/getAllUsers", {}),
  getAllResidents: () => apiFetch<GetUserResponse[]>("/user/getAllUsers", {}),
  getAllSlim: () => apiFetch<UserSlim[]>("/user/getAllUsersSlim", {}),
  getById: (id: number) => apiFetch<GetUserResponse>(`/user/admin/getUserById?userId=${id}`, {}),
  deleteUser: (id: number) => apiFetch<unknown>(`/user/deleteUser?userId=${id}`, { method: "DELETE" }),
  updateProfile: (form: FormData) =>
    fetch(`${BASE_URL}/user/update/profile`, {
      method: "PUT",
      body: form,
      credentials: "include",
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : undefined,
    })
      .then((r) => r.json()),
  updateUsername: (userId: number, newUsername: string) =>
    apiFetch<boolean>(`/user/update/username?userId=${userId}&newUsername=${encodeURIComponent(newUsername)}`, { method: "PUT" }),
  createUser: (body: { userName: string; email: string; password: string; roleIds?: number[]; firstName?: string; lastName?: string; scope?: string; autoVerifyEmail?: boolean }) =>
    apiFetch<{ userID: number; userName: string; email: string }>(
      "/register/createUser",
      { method: "POST", body: JSON.stringify({ scope: "staff", autoVerifyEmail: true, ...body }) },
    ),
  createBql: (body: { userName: string; email: string; password: string; firstName: string; lastName: string; gender?: string; dateOfBirth?: string; roleIds: number[] }) =>
    apiFetch<{ userID: number; userName: string; email: string; isEmailVerified: boolean }>(
      "/register/create-bql",
      { method: "POST", body: JSON.stringify(body) },
    ),
};

// ─── Roles ───────────────────────────────────────────────────────────────────
export const roles = {
  getAll: () => apiFetch<Role[]>("/roles/getall"),
  getAllScopeUser: () => apiFetch<Role[]>("/roles/getallscope-user"),
  getByUser: (userID: number) => apiFetch<Role[]>(`/roles/getRoleByUserID/${userID}`),
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
export interface CreatePermissionInput {
  permissionName: string; permissionDescription?: string; code: string; scope?: string;
}
export const permissions = {
  getAll: () => apiFetch<Permission[]>("/permissions/admin/getall", {}),
  getByUser: (id: number) => apiFetch<Permission[]>(`/permissions/admin/getbyUserID/${id}`, {}),
  getByRole: (id: number) => apiFetch<Permission[]>(`/permissions/admin/getbyRoleID/${id}`, {}),
  create: (body: CreatePermissionInput) =>
    apiFetch<Permission>("/permissions/admin/addPermission", {
      method: "POST",
      body: JSON.stringify({ scope: "staff", ...body }),
    }),
  bulkCreate: (items: CreatePermissionInput[]) =>
    apiFetch<unknown>("/permissions/admin/BulkCreate", {
      method: "POST",
      body: JSON.stringify(items.map((i) => ({ scope: "staff", ...i }))),
    }),
  update: (body: CreatePermissionInput & { permissionID: number }) =>
    apiFetch<Permission>("/permissions/admin/updatePermission", {
      method: "PUT",
      body: JSON.stringify({ scope: "staff", ...body }),
    }),
  delete: (id: number) =>
    apiFetch<boolean>(`/permissions/admin/delete?permissionId=${id}`, { method: "DELETE" }),
  assignToRole: (roleID: number, permissionIDs: number[]) =>
    apiFetch<boolean>("/role-permissions/admin/assign-permissions", { method: "POST", body: JSON.stringify({ roleID, permissionIDs }) }),
};

// ─── Apartments ───────────────────────────────────────────────────────────────
export const apartments = {
  getAll: (params?: { building?: string; status?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<ApartmentResponse[]>(`/api/Apartment/get-all${q ? "?" + q : ""}`);
  },
  getById: (id: number) => apiFetch<ApartmentResponse>(`/api/Apartment/get/${id}`),
  create: (body: { code: string; building: string; floor: number; unitNumber: string; type: string; areaM2: number; status?: string; note?: string }) =>
    apiFetch<boolean>("/api/Apartment/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: { id: number; code: string; building: string; floor: number; unitNumber: string; type: string; areaM2: number; status: string; note?: string }) =>
    apiFetch<boolean>("/api/Apartment/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) => apiFetch<boolean>(`/api/Apartment/delete/${id}`, { method: "DELETE" }),
};

export interface CreateResidentBody {
  userName: string;
  email?: string;
  password: string;
  fullName: string;
  phone: string;
  idCard: string;
  dateOfBirth: string;
  gender: string;
  avatarUrl?: string | null;
  apartmentId: number;
  isOwner: boolean;
  moveInDate: string;
  isBusinessOwner: boolean;
  businessCompanyName?: string | null;
  businessServiceCategories?: string | null;
  businessAddress?: string | null;
}

export interface CreateResidentResult {
  authUser?: { userID: number; userName: string; email: string | null; isEmailVerified: boolean };
  residentId?: number;
  isBusinessOwner?: boolean;
  message?: string;
  resident?: string;
  warning?: string;
}

// ─── Residents ────────────────────────────────────────────────────────────────
export const residents = {
  getAll: (apartmentId?: number) => {
    const q = apartmentId ? `?apartmentId=${apartmentId}` : "";
    return apiFetch<ResidentResponse[]>(`/api/Resident/get-all${q}`);
  },
  getById: (id: number) => apiFetch<ResidentResponse>(`/api/Resident/get/${id}`),
  registerCreate: (body: CreateResidentBody) =>
    apiFetch<CreateResidentResult>("/register/create-resident", { method: "POST", body: JSON.stringify(body) }),
  create: (body: Partial<ResidentResponse> & { fullName: string; phone: string }) =>
    apiFetch<boolean>("/api/Resident/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: Partial<ResidentResponse> & { id: number }) =>
    apiFetch<boolean>("/api/Resident/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) => apiFetch<boolean>(`/api/Resident/delete/${id}`, { method: "DELETE" }),
};

export const accessControl = {
  getFace: (residentId: number) =>
    apiFetch<FaceProfileResponse>(`/api/access-control/faces/${residentId}`, {
      silentStatuses: [404],
    }),
  registerFace: (residentId: number, imageUrl: string) =>
    apiFetch<FaceProfileResponse>("/api/access-control/faces/register", {
      method: "POST", body: JSON.stringify({ residentId, imageUrl }),
    }),
  deleteFace: (residentId: number) =>
    apiFetch<boolean>(`/api/access-control/faces/${residentId}`, { method: "DELETE" }),
  getEvents: (params?: { personType?: string; status?: string; direction?: string }) => {
    const query = params
      ? new URLSearchParams(Object.entries(params).filter(([, value]) => value) as [string, string][]).toString()
      : "";
    return apiFetch<AccessEventResponse[]>(`/api/access-control/events${query ? `?${query}` : ""}`, {});
  },
  handleEvent: (id: number, body: { status: string; note?: string; handledByAuthUserId?: number }) =>
    apiFetch<boolean>(`/api/access-control/events/${id}/handle`, {
      method: "PUT", body: JSON.stringify(body),
    }),
  deleteEvent: (id: number) =>
    apiFetch<boolean>(`/api/access-control/events/${id}`, { method: "DELETE" }),
  analyzeFrame: (body: { imageDataUrl: string; cameraName: string; direction: "in" | "out" }) =>
    apiFetch<CameraRecognitionResponse>("/api/access-control/camera/analyze", {
      method: "POST", body: JSON.stringify(body),
    }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = {
  getAll: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return apiFetch<NotificationResponse[]>(`/api/Notification/get-all${q}`);
  },
  getById: (id: number) => apiFetch<NotificationResponse>(`/api/Notification/get/${id}`),
  create: (body: { title: string; content: string; channel: string; audience: string; templateId?: number; scheduledAt?: string; createdByAuthUserId: number }) =>
    apiFetch<boolean>("/api/Notification/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: { id: number; title: string; content: string; channel: string; audience: string; templateId?: number; scheduledAt?: string; createdByAuthUserId: number }) =>
    apiFetch<boolean>("/api/Notification/update", { method: "PUT", body: JSON.stringify(body) }),
  send: (id: number) => apiFetch<boolean>(`/api/Notification/send/${id}`, { method: "POST" }),
};

// ─── System Config ─────────────────────────────────────────────────────────────
export const systemConfig = {
  getAll: (isPublic?: boolean) => {
    const q = isPublic !== undefined ? `?isPublic=${isPublic}` : "";
    return apiFetch<SystemConfigResponse[]>(`/api/SystemConfig/get-all${q}`);
  },
  getByKey: (key: string) => apiFetch<SystemConfigResponse>(`/api/SystemConfig/get/${key}`),
  update: (key: string, value: string, updatedByAuthUserId?: number) =>
    apiFetch<boolean>("/api/SystemConfig/update", { method: "PUT", body: JSON.stringify({ key, value, updatedByAuthUserId }) }),
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────
export const auditLogs = {
  getAll: () => apiFetch<AuditLog[]>("/auditlogs/getall"),
  getByUser: (userId: number) => apiFetch<AuditLog[]>(`/auditlogs/getbyuser/${userId}`),
  getById: (id: number) => apiFetch<AuditLog>(`/auditlogs/getbyid/${id}`),
  townhubGetAll: (params?: { targetType?: string; targetId?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<unknown[]>(`/api/AuditLog/get-all${q ? "?" + q : ""}`);
  },
};

// ─── Sessions ──────────────────────────────────────────────────────────────────
export const sessions = {
  getAll: () => apiFetch<UserSession[]>("/userSession/getall"),
  getByUser: (userId: number) => apiFetch<UserSession[]>(`/userSession/getByUserId/${userId}`),
};

// ─── Service management – workflow types ──────────────────────────────────────

export interface Provider {
  id: number;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  address?: string;
  serviceCategories: string; // JSON array string e.g. "[\"electrical\",\"cleaning\"]"
  registrationStatus: "pending" | "approved" | "rejected";
  residentId?: number;
  residentFullName?: string;
  residentApartmentCode?: string;
  approvedByAuthUserId?: number;
  approvedAt?: string;
  rejectReason?: string;
  rejectionReason?: string;
  rating?: number;
  completedJobs?: number;
  createdAt: string;
}

export type ServiceRequestStatus =
  | "pending_approval"
  | "approved_by_mgt"
  | "rejected_by_mgt"
  | "pending_provider"
  | "accepted_by_provider"
  | "rejected_by_provider"
  | "in_progress"
  | "completed";

export interface ServiceRequest {
  id: number;
  providerId?: number;
  providerName?: string;
  providerCompanyName?: string;
  title: string;
  description?: string;
  category?: string;
  requestedBy?: "management" | "resident";
  requestedByAuthUserId?: number;
  /** @deprecated use requesterName */
  requestedByName?: string;
  requesterName?: string;
  requesterPhone?: string;
  requesterApartmentCode?: string;
  apartmentId?: number;
  apartmentCode?: string;
  requiresMgtApproval: boolean;
  status: ServiceRequestStatus;
  approvedByAuthUserId?: number;
  mgtApprovedByAuthUserId?: number;
  approvedAt?: string;
  mgtApprovedAt?: string;
  mgtRejectReason?: string;
  mgtRejectionReason?: string;
  providerRejectReason?: string;
  providerRejectionReason?: string;
  acceptedAt?: string;
  completedAt?: string;
  scheduledDate?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Service Menu Items ────────────────────────────────────────────────────────
export const serviceMenuItems = {
  getByService: (serviceId: number) =>
    apiFetch<ServiceMenuItem[]>(`/api/ServiceMenuItem/get-by-service/${serviceId}`),
  create: (body: Omit<ServiceMenuItem, "id">) =>
    apiFetch<boolean>("/api/ServiceMenuItem/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: ServiceMenuItem) =>
    apiFetch<boolean>("/api/ServiceMenuItem/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    apiFetch<boolean>(`/api/ServiceMenuItem/delete/${id}`, { method: "DELETE" }),
};

// ─── Service Categories ────────────────────────────────────────────────────────
export const serviceCategories = {
  getAll: () => apiFetch<ServiceCategory[]>("/api/ServiceCategory/get-all"),
};

// ─── Services ──────────────────────────────────────────────────────────────────
export const services = {
  getAll: (categoryId?: number) => {
    const q = categoryId ? `?categoryId=${categoryId}` : "";
    return apiFetch<ServiceItem[]>(`/api/Service/get-all${q}`);
  },
  getById: (id: number) =>
    apiFetch<ServiceItem>(`/api/Service/get/${id}`),
  create: (body: Omit<ServiceItem, "id" | "createdAt" | "categoryName">) =>
    apiFetch<boolean>("/api/Service/create", { method: "POST", body: JSON.stringify(body) }),
  update: (body: Partial<ServiceItem> & { id: number }) =>
    apiFetch<boolean>("/api/Service/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) => apiFetch<boolean>(`/api/Service/delete/${id}`, { method: "DELETE" }),
};

// ─── Providers ────────────────────────────────────────────────────────────────
export const providers = {
  getAll: (registrationStatus?: Provider["registrationStatus"]) => {
    const q = registrationStatus ? `?registrationStatus=${registrationStatus}` : "";
    return apiFetch<Provider[]>(`/api/Provider/get-all${q}`);
  },
  getById: (id: number) =>
    apiFetch<Provider>(`/api/Provider/get/${id}`),
  myProfile: (authUserId: number) =>
    apiFetch<Provider>(`/api/Provider/my-profile?authUserId=${authUserId}`),
  register: (body: {
    companyName: string;
    contactName: string;
    phone: string;
    email: string;
    address?: string;
    serviceCategories: string;
    residentId?: number;
  }) =>
    apiFetch<boolean>("/api/Provider/register", { method: "POST", body: JSON.stringify(body) }),
  selfRegister: (body: {
    authUserId: number;
    companyName: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    serviceCategories: string;
  }) =>
    apiFetch<boolean>("/api/Provider/self-register", { method: "POST", body: JSON.stringify(body) }),
  approve: (id: number, approvedByAuthUserId: number) =>
    apiFetch<boolean>("/api/Provider/approve", { method: "PUT", body: JSON.stringify({ id, approvedByAuthUserId }) }),
  reject: (id: number, reason: string) =>
    apiFetch<boolean>("/api/Provider/reject", { method: "PUT", body: JSON.stringify({ id, reason }) }),
  update: (body: Partial<Provider> & { id: number }) =>
    apiFetch<boolean>("/api/Provider/update", { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: number) =>
    apiFetch<boolean>(`/api/Provider/delete/${id}`, { method: "DELETE" }),
};

// ─── Service Requests ──────────────────────────────────────────────────────────
export const serviceRequests = {
  getAll: (params?: { providerId?: number; apartmentId?: number; status?: ServiceRequestStatus; requestedBy?: ServiceRequest["requestedBy"] }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<ServiceRequest[]>(`/api/ServiceRequest/get-all${q ? "?" + q : ""}`);
  },
  getById: (id: number) =>
    apiFetch<ServiceRequest>(`/api/ServiceRequest/get/${id}`),
  create: (body: {
    title: string;
    description?: string;
    category?: string;
    apartmentId?: number;
    requiresMgtApproval: boolean;
    requestedByAuthUserId: number;
    providerId?: number;
    scheduledDate?: string;
    note?: string;
  }) =>
    apiFetch<ServiceRequest>("/api/ServiceRequest/create", { method: "POST", body: JSON.stringify(body) }),
  approveByMgt: (id: number, approvedByAuthUserId: number) =>
    apiFetch<boolean>("/api/ServiceRequest/approve-by-mgt", { method: "PUT", body: JSON.stringify({ id, approvedByAuthUserId }) }),
  rejectByMgt: (id: number, reason: string) =>
    apiFetch<boolean>("/api/ServiceRequest/reject-by-mgt", { method: "PUT", body: JSON.stringify({ id, reason }) }),
  acceptByProvider: (id: number, providerId: number, scheduledDate?: string) =>
    apiFetch<boolean>("/api/ServiceRequest/accept-by-provider", { method: "PUT", body: JSON.stringify({ id, providerId, scheduledDate }) }),
  rejectByProvider: (id: number, reason: string) =>
    apiFetch<boolean>("/api/ServiceRequest/reject-by-provider", { method: "PUT", body: JSON.stringify({ id, reason }) }),
  updateStatus: (id: number, status: "in_progress" | "completed") =>
    apiFetch<boolean>("/api/ServiceRequest/update-status", { method: "PUT", body: JSON.stringify({ id, status }) }),
};

// ─── Provider Service Listings ─────────────────────────────────────────────────

export interface PriceListItem {
  name: string;
  unit?: string;
  priceFrom: number;
  priceTo?: number;
}

export function formatPriceRange(p: PriceListItem): string {
  const from = p.priceFrom.toLocaleString("vi-VN");
  if (!p.priceTo || p.priceTo <= p.priceFrom) return `${from}đ`;
  return `${from} - ${p.priceTo.toLocaleString("vi-VN")}đ`;
}

export interface ProviderServiceListing {
  id: number;
  providerId: number;
  name: string;
  category: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
  priceList?: string; // JSON array of PriceListItem
  status: "pending" | "approved" | "rejected";
  approvedByAuthUserId?: number;
  approvedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

export const providerServiceListings = {
  getAll: (params?: { status?: string; providerId?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<ProviderServiceListing[]>(`/api/ProviderServiceListing/get-all${q ? "?" + q : ""}`);
  },
  getById: (id: number) =>
    apiFetch<ProviderServiceListing>(`/api/ProviderServiceListing/get/${id}`),
  register: (body: {
    providerId: number;
    name: string;
    category: string;
    description?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
    priceList?: string;
  }) =>
    apiFetch<boolean>("/api/ProviderServiceListing/register", { method: "POST", body: JSON.stringify(body) }),
  update: (body: {
    id: number;
    name?: string;
    category?: string;
    description?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactAddress?: string;
    priceList?: string;
  }) =>
    apiFetch<boolean>("/api/ProviderServiceListing/update", { method: "PUT", body: JSON.stringify(body) }),
  approve: (id: number, approvedByAuthUserId: number) =>
    apiFetch<boolean>("/api/ProviderServiceListing/approve", { method: "PUT", body: JSON.stringify({ id, approvedByAuthUserId }) }),
  reject: (id: number, reason: string) =>
    apiFetch<boolean>("/api/ProviderServiceListing/reject", { method: "PUT", body: JSON.stringify({ id, reason }) }),
  delete: (id: number) =>
    apiFetch<boolean>(`/api/ProviderServiceListing/delete/${id}`, { method: "DELETE" }),
};

// ─── Health ────────────────────────────────────────────────────────────────────
export const health = {
  check: () => fetch(`${BASE_URL}/healthz`).then((r) => r.text()).catch(() => "offline"),
};

// ─── MCP Tokens ───────────────────────────────────────────────────────────────
export interface McpTokenItem {
  id: string; name: string; createdAt: string; expiresAt: string; revoked: boolean;
}
export interface McpTokenCreated {
  id: string; name: string; token: string; createdAt: string; expiresAt: string;
}
export const mcpTokens = {
  getMine: () => apiFetch<McpTokenItem[]>("/api/mcp-token/mine", {}),
  create: (body: { name: string; expiresAt: string }) =>
    apiFetch<McpTokenCreated>("/api/mcp-token/create", { method: "POST", body: JSON.stringify(body) }),
  revoke: (id: string) => apiFetch<boolean>(`/api/mcp-token/${id}`, { method: "DELETE" }),
};

// ════════════════════════════════════════════════════════════════════════════
// ASSET MODULE (Kỹ thuật & Tài sản) — api/asset/*
// PK = Guid (string). decimal→number, DateTime→ISO string.
// Convention: create | update | delete/{id} | get-all | get/{id}
// Mutations trả ResponseDto<bool>; get-all trả T[]; get/{id} trả T.
// ════════════════════════════════════════════════════════════════════════════

// Query-string helper: bỏ qua key rỗng/undefined/null.
function qs(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Core: Asset types ─────────────────────────────────────────────────────────
export interface AssetResponse {
  id: string; assetCode: string; name: string;
  categoryId: string; categoryName?: string;
  locationId?: string; locationAreaCode?: string;
  parentAssetId?: string; parentAssetCode?: string;
  buildingId: string; floorId?: string;
  vendorId?: string; vendorName?: string; vendorContractId?: string;
  status: string; serialNumber?: string;
  purchasePrice?: number; purchaseDate?: string; warrantyExpiryDate?: string;
  usefulLifeMonths?: number; salvageValue: number; depreciationMethod: string;
  accumulatedDepreciation: number; bookValue?: number;
  installationDate?: string; lastMaintenanceDate?: string; nextMaintenanceDate?: string;
  criticalityLevel: string; notes?: string;
}
export interface CreateAssetInput {
  assetCode: string; name: string; categoryId: string;
  locationId?: string; parentAssetId?: string;
  buildingId: string; floorId?: string;
  vendorId?: string; vendorContractId?: string;
  status?: string; serialNumber?: string;
  purchasePrice?: number; purchaseDate?: string; warrantyExpiryDate?: string;
  usefulLifeMonths?: number; salvageValue?: number; depreciationMethod?: string;
  installationDate?: string; criticalityLevel?: string; notes?: string;
}
export interface UpdateAssetInput extends CreateAssetInput {
  id: string;
  lastMaintenanceDate?: string; nextMaintenanceDate?: string;
  accumulatedDepreciation?: number; bookValue?: number;
}
export interface AssetCategoryResponse {
  id: string; code: string; name: string;
  parentId?: string; parentName?: string;
  defaultChecklistTemplateId?: string; defaultChecklistTemplateName?: string;
}
export interface CreateAssetCategoryInput {
  code: string; name: string; parentId?: string; defaultChecklistTemplateId?: string;
}
export interface UpdateAssetCategoryInput extends CreateAssetCategoryInput { id: string; }
export interface AssetLocationResponse {
  id: string; buildingId: string; floorId?: string; areaCode?: string;
}
export interface CreateAssetLocationInput { buildingId: string; floorId?: string; areaCode?: string; }
export interface UpdateAssetLocationInput extends CreateAssetLocationInput { id: string; }
export interface AssetQrCodeResponse {
  id: string; assetId: string; assetCode?: string; assetName?: string; qrCode: string;
}
export interface AssetTransferResponse {
  id: string; assetId: string; assetCode?: string;
  fromLocationId?: string; fromAreaCode?: string;
  toLocationId: string; toAreaCode?: string;
  transferredBy?: string; workOrderId?: string; woCode?: string;
}
export interface AssetDepreciationLogResponse {
  id: string; assetId: string; assetCode?: string;
  periodYear: number; periodMonth: number;
  depreciationAmount: number; bookValueBefore?: number; bookValueAfter?: number;
  accumulatedTotal?: number; calculatedAt: string; calculatedBy?: string;
}

// ─── Core: Asset endpoints ─────────────────────────────────────────────────────
export const assetApi = {
  getAll: (params?: { buildingId?: string; categoryId?: string; status?: string }) =>
    apiFetch<AssetResponse[]>(`/api/asset/asset/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<AssetResponse>(`/api/asset/asset/get/${id}`, {}),
  create: (body: CreateAssetInput) =>
    apiFetch<boolean>(`/api/asset/asset/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateAssetInput) =>
    apiFetch<boolean>(`/api/asset/asset/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/asset/delete/${id}`, { method: "DELETE" }),
};
export const assetCategories = {
  getAll: () => apiFetch<AssetCategoryResponse[]>(`/api/asset/asset-category/get-all`, {}),
  getById: (id: string) => apiFetch<AssetCategoryResponse>(`/api/asset/asset-category/get/${id}`, {}),
  create: (body: CreateAssetCategoryInput) =>
    apiFetch<boolean>(`/api/asset/asset-category/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateAssetCategoryInput) =>
    apiFetch<boolean>(`/api/asset/asset-category/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/asset-category/delete/${id}`, { method: "DELETE" }),
};
export const assetLocations = {
  getAll: (buildingId?: string) =>
    apiFetch<AssetLocationResponse[]>(`/api/asset/asset-location/get-all${qs({ buildingId })}`, {}),
  getById: (id: string) => apiFetch<AssetLocationResponse>(`/api/asset/asset-location/get/${id}`, {}),
  create: (body: CreateAssetLocationInput) =>
    apiFetch<boolean>(`/api/asset/asset-location/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateAssetLocationInput) =>
    apiFetch<boolean>(`/api/asset/asset-location/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/asset-location/delete/${id}`, { method: "DELETE" }),
};
export const assetQrCodes = {
  getByAsset: (assetId: string) => apiFetch<AssetQrCodeResponse>(`/api/asset/asset-qrcode/get-by-asset/${assetId}`, {}),
  getByCode: (qrCode: string) => apiFetch<AssetQrCodeResponse>(`/api/asset/asset-qrcode/get-by-code${qs({ qrCode })}`, {}),
  create: (body: { assetId: string; qrCode: string }) =>
    apiFetch<boolean>(`/api/asset/asset-qrcode/create`, { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/asset-qrcode/delete/${id}`, { method: "DELETE" }),
};
export const assetTransfers = {
  getByAsset: (assetId: string) => apiFetch<AssetTransferResponse[]>(`/api/asset/asset-transfer/get-by-asset/${assetId}`, {}),
  create: (body: { assetId: string; toLocationId: string; fromLocationId?: string; transferredBy?: string; workOrderId?: string }) =>
    apiFetch<boolean>(`/api/asset/asset-transfer/create`, { method: "POST", body: JSON.stringify(body) }),
};
export const assetDepreciation = {
  getByAsset: (assetId: string) => apiFetch<AssetDepreciationLogResponse[]>(`/api/asset/asset-depreciation/get-by-asset/${assetId}`, {}),
  getByPeriod: (year: number, month: number) =>
    apiFetch<AssetDepreciationLogResponse[]>(`/api/asset/asset-depreciation/get-by-period${qs({ year, month })}`, {}),
};

// ─── Maintenance (PM): types ───────────────────────────────────────────────────
export interface ChecklistTemplateResponse {
  id: string; code: string; name: string; categoryId?: string; categoryName?: string;
}
export interface ChecklistTemplateItemResponse {
  id: string; templateId: string; itemCode?: string; itemType: string; itemLabel: string;
  description?: string; sortOrder: number; isRequired: boolean; expectedValue?: string;
}
export interface MaintenanceScheduleResponse {
  id: string; assetId: string; assetCode?: string; assetName?: string;
  scheduleType: string; checklistTemplateId: string; checklistTemplateName?: string;
  autoAssignDepartmentId?: string; frequencyType: string; frequencyDays?: number;
  startDate?: string; endDate?: string; nextDueDate?: string; lastExecutedAt?: string;
  lastWoId?: string; leadTimeDays: number; isActive: boolean; description?: string;
}
export interface WorkOrderResponse {
  id: string; woCode: string; assetId: string; assetCode?: string; assetName?: string;
  scheduleId?: string; checklistTemplateId: string; checklistTemplateName?: string;
  buildingId: string; status: string; reviewerId?: string; woType: string;
  title?: string; description?: string; priority: string;
  scheduledDate?: string; dueDate?: string; actualStartAt?: string; actualEndAt?: string;
  approvedAt?: string; rejectedReason?: string;
  estimatedHours?: number; actualHours?: number; totalCost?: number;
  createdBy?: string; createdAt: string; updatedAt: string;
}
export interface WorkOrderChecklistResponse {
  id: string; woId: string; templateItemId: string; itemLabel?: string; itemType?: string;
  isPassed: boolean; valueText?: string; notes?: string; photoUrl?: string; respondedAt: string;
}
export interface WorkOrderAttachmentResponse {
  id: string; woId: string; attachmentType: string; fileUrl: string;
  fileName?: string; fileSizeBytes?: number; uploadedBy?: string; uploadedAt: string; caption?: string;
}
export interface WorkOrderMaterialUsedResponse {
  id: string; woId: string; woCode?: string; materialId: string; materialCode?: string;
  materialName?: string; warehouseId: string; warehouseName?: string; inventoryTransactionId?: string;
}
export interface CreateChecklistTemplateInput { code: string; name: string; categoryId?: string; }
export interface UpdateChecklistTemplateInput extends CreateChecklistTemplateInput { id: string; }
export interface CreateChecklistItemInput {
  templateId: string; itemType: string; itemLabel?: string; itemCode?: string;
  description?: string; sortOrder?: number; isRequired?: boolean; expectedValue?: string;
}
export interface UpdateChecklistItemInput extends CreateChecklistItemInput { id: string; }
export interface CreateMaintenanceScheduleInput {
  assetId: string; scheduleType: string; checklistTemplateId: string;
  autoAssignDepartmentId?: string; frequencyType?: string; frequencyDays?: number;
  startDate?: string; endDate?: string; leadTimeDays?: number; isActive?: boolean; description?: string;
}
export interface UpdateMaintenanceScheduleInput extends CreateMaintenanceScheduleInput {
  id: string; nextDueDate?: string; lastExecutedAt?: string; lastWoId?: string;
}
export interface CreateWorkOrderInput {
  woCode: string; assetId: string; checklistTemplateId: string; buildingId: string;
  scheduleId?: string; woType?: string; title?: string; description?: string;
  priority?: string; scheduledDate?: string; dueDate?: string; estimatedHours?: number; createdBy?: string;
}
export interface UpdateWorkOrderInput extends CreateWorkOrderInput {
  id: string; status?: string; reviewerId?: string;
  actualStartAt?: string; actualEndAt?: string; approvedAt?: string; rejectedReason?: string;
  actualHours?: number; totalCost?: number;
}

// ─── Maintenance (PM): endpoints ───────────────────────────────────────────────
export const checklistTemplates = {
  getAll: () => apiFetch<ChecklistTemplateResponse[]>(`/api/asset/checklist-template/get-all`, {}),
  getById: (id: string) => apiFetch<ChecklistTemplateResponse>(`/api/asset/checklist-template/get/${id}`, {}),
  create: (body: CreateChecklistTemplateInput) =>
    apiFetch<boolean>(`/api/asset/checklist-template/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateChecklistTemplateInput) =>
    apiFetch<boolean>(`/api/asset/checklist-template/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/checklist-template/delete/${id}`, { method: "DELETE" }),
  getItems: (templateId: string) =>
    apiFetch<ChecklistTemplateItemResponse[]>(`/api/asset/checklist-template/get-items/${templateId}`, {}),
  addItem: (body: CreateChecklistItemInput) =>
    apiFetch<boolean>(`/api/asset/checklist-template/add-item`, { method: "POST", body: JSON.stringify(body) }),
  updateItem: (body: UpdateChecklistItemInput) =>
    apiFetch<boolean>(`/api/asset/checklist-template/update-item`, { method: "PUT", body: JSON.stringify(body) }),
  deleteItem: (itemId: string) =>
    apiFetch<boolean>(`/api/asset/checklist-template/delete-item/${itemId}`, { method: "DELETE" }),
};
export const maintenanceSchedules = {
  getAll: (params?: { assetId?: string; isActive?: boolean }) =>
    apiFetch<MaintenanceScheduleResponse[]>(`/api/asset/maintenance-schedule/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<MaintenanceScheduleResponse>(`/api/asset/maintenance-schedule/get/${id}`, {}),
  getOverdue: () => apiFetch<MaintenanceScheduleResponse[]>(`/api/asset/maintenance-schedule/get-overdue`, {}),
  create: (body: CreateMaintenanceScheduleInput) =>
    apiFetch<boolean>(`/api/asset/maintenance-schedule/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateMaintenanceScheduleInput) =>
    apiFetch<boolean>(`/api/asset/maintenance-schedule/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/maintenance-schedule/delete/${id}`, { method: "DELETE" }),
};
export const workOrders = {
  getAll: (params?: { assetId?: string; status?: string; buildingId?: string }) =>
    apiFetch<WorkOrderResponse[]>(`/api/asset/work-order/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<WorkOrderResponse>(`/api/asset/work-order/get/${id}`, {}),
  create: (body: CreateWorkOrderInput) =>
    apiFetch<boolean>(`/api/asset/work-order/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateWorkOrderInput) =>
    apiFetch<boolean>(`/api/asset/work-order/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/work-order/delete/${id}`, { method: "DELETE" }),
  assignTechnician: (body: { woId: string; assignedTo?: string; checkinQrAssetId?: string }) =>
    apiFetch<boolean>(`/api/asset/work-order/assign-technician`, { method: "POST", body: JSON.stringify(body) }),
  addChecklistResponse: (body: { woId: string; templateItemId: string; isPassed: boolean; valueText?: string; notes?: string; photoUrl?: string }) =>
    apiFetch<boolean>(`/api/asset/work-order/add-checklist-response`, { method: "POST", body: JSON.stringify(body) }),
  addAttachment: (body: { woId: string; attachmentType: string; fileUrl: string; fileName?: string; fileSizeBytes?: number; uploadedBy?: string; caption?: string }) =>
    apiFetch<boolean>(`/api/asset/work-order/add-attachment`, { method: "POST", body: JSON.stringify(body) }),
  getAttachments: (woId: string) =>
    apiFetch<WorkOrderAttachmentResponse[]>(`/api/asset/work-order/get-attachments/${woId}`),
  addMaterialUsed: (body: { woId: string; materialId: string; warehouseId: string; inventoryTransactionId?: string }) =>
    apiFetch<boolean>(`/api/asset/work-order/add-material-used`, { method: "POST", body: JSON.stringify(body) }),
};

// ─── Incident (CM): types ──────────────────────────────────────────────────────
export interface SlaConfigResponse {
  id: string; name: string; buildingId?: string; issueCategory?: string; priorityLevel: string;
  responseTimeHours?: number; resolutionTimeHours?: number;
  escalationL1AfterHours?: number; escalationL2AfterHours?: number; escalationL3AfterHours?: number;
  escalationContactsJson?: string; businessHoursOnly: boolean; isActive: boolean;
}
export interface TicketResponse {
  id: string; ticketCode: string; status: string;
  buildingId: string; floorId?: string; unitId?: string;
  assetId?: string; assetCode?: string; reportedBy: string; reportedByName?: string;
  slaConfigId?: string; slaConfigName?: string; purchaseRequestId?: string; prCode?: string;
  title?: string; description?: string; category?: string; priority: string; source: string;
  resolvedAt?: string; closedAt?: string; autoClosed: boolean; resolutionNote?: string;
  createdAt: string; updatedAt: string;
}
export interface TicketStatusHistoryResponse {
  id: string; ticketId: string; fromStatus?: string; toStatus: string;
  changedBy?: string; changedAt: string; note?: string;
}
export interface TicketAttachmentResponse {
  id: string; ticketId: string; fileUrl: string;
}
export interface SlaEscalationLogResponse {
  id: string; ticketId: string; ticketCode?: string; escalationLevel: number; escalatedAt: string;
  escalatedTo?: string; channel?: string; message?: string; acknowledgedAt?: string; acknowledgedBy?: string;
}
export interface CreateSlaConfigInput {
  name: string; buildingId?: string; issueCategory?: string; priorityLevel?: string;
  responseTimeHours?: number; resolutionTimeHours?: number;
  escalationL1AfterHours?: number; escalationL2AfterHours?: number; escalationL3AfterHours?: number;
  escalationContactsJson?: string; businessHoursOnly?: boolean; isActive?: boolean;
}
export interface UpdateSlaConfigInput extends CreateSlaConfigInput { id: string; }
export interface CreateTicketInput {
  ticketCode: string; buildingId: string; floorId?: string; unitId?: string;
  assetId?: string; reportedBy?: string; reportedByName?: string; slaConfigId?: string; purchaseRequestId?: string;
  title?: string; description?: string; category?: string; priority?: string; source?: string;
}
export interface UpdateTicketInput extends CreateTicketInput {
  id: string; status?: string; resolvedAt?: string; closedAt?: string;
  autoClosed?: boolean; resolutionNote?: string;
}

// ─── Incident (CM): endpoints ──────────────────────────────────────────────────
export const slaConfigs = {
  getAll: (params?: { buildingId?: string; isActive?: boolean }) =>
    apiFetch<SlaConfigResponse[]>(`/api/asset/sla-config/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<SlaConfigResponse>(`/api/asset/sla-config/get/${id}`, {}),
  create: (body: CreateSlaConfigInput) =>
    apiFetch<boolean>(`/api/asset/sla-config/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateSlaConfigInput) =>
    apiFetch<boolean>(`/api/asset/sla-config/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/sla-config/delete/${id}`, { method: "DELETE" }),
};
export const tickets = {
  getAll: (params?: { buildingId?: string; status?: string; reportedBy?: string }) =>
    apiFetch<TicketResponse[]>(`/api/asset/ticket/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<TicketResponse>(`/api/asset/ticket/get/${id}`, {}),
  create: (body: CreateTicketInput) =>
    apiFetch<boolean>(`/api/asset/ticket/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateTicketInput) =>
    apiFetch<boolean>(`/api/asset/ticket/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/ticket/delete/${id}`, { method: "DELETE" }),
  changeStatus: (body: { ticketId: string; toStatus: string; fromStatus?: string; changedBy?: string; note?: string }) =>
    apiFetch<boolean>(`/api/asset/ticket/change-status`, { method: "POST", body: JSON.stringify(body) }),
  assign: (body: { ticketId: string; assignedTo?: string }) =>
    apiFetch<boolean>(`/api/asset/ticket/assign`, { method: "POST", body: JSON.stringify(body) }),
  addAttachment: (body: { ticketId: string; fileUrl: string }) =>
    apiFetch<boolean>(`/api/asset/ticket/add-attachment`, { method: "POST", body: JSON.stringify(body) }),
  getAttachments: (ticketId: string) =>
    apiFetch<TicketAttachmentResponse[]>(`/api/asset/ticket/get-attachments/${ticketId}`, {}),
  rate: (body: { ticketId: string; ratedBy?: string; overallRating: number }) =>
    apiFetch<boolean>(`/api/asset/ticket/rate`, { method: "POST", body: JSON.stringify(body) }),
  getStatusHistory: (ticketId: string) =>
    apiFetch<TicketStatusHistoryResponse[]>(`/api/asset/ticket/get-status-history/${ticketId}`, {}),
  getEscalationLogs: (ticketId: string) =>
    apiFetch<SlaEscalationLogResponse[]>(`/api/asset/ticket/get-escalation-logs/${ticketId}`, {}),
};

// ─── Inventory (Kho): types ────────────────────────────────────────────────────
export interface WarehouseResponse {
  id: string; code: string; name: string; buildingId: string; managerId?: string; ktvOwnerId?: string;
}
export interface MaterialCategoryResponse { id: string; code: string; name: string; parentId?: string; parentName?: string; }
export interface MaterialResponse {
  id: string; materialCode: string; name: string; categoryId: string; categoryName?: string;
  preferredVendorId?: string; vendorName?: string; unitOfMeasure?: string;
  minStock: number; maxStock?: number; reorderPoint?: number; reorderQuantity?: number;
  unitPrice?: number; isActive: boolean; notes?: string;
}
export interface InventoryLevelResponse {
  id: string; warehouseId: string; warehouseName?: string; materialId: string;
  materialCode?: string; materialName?: string; unitOfMeasure?: string; quantityOnHand: number;
}
export interface InventoryTransactionResponse {
  id: string; txnCode: string; warehouseId: string; warehouseName?: string;
  materialId: string; materialCode?: string; materialName?: string;
  referenceType?: string; referenceId?: string; txnType: string;
  quantity: number; unitCost?: number; totalCost?: number; notes?: string;
  performedBy?: string; performedAt: string;
}
export interface CreateWarehouseInput { code: string; name: string; buildingId: string; managerId?: string; ktvOwnerId?: string; }
export interface UpdateWarehouseInput extends CreateWarehouseInput { id: string; }
export interface CreateMaterialInput {
  materialCode: string; name: string; categoryId: string; preferredVendorId?: string;
  unitOfMeasure?: string; minStock?: number; maxStock?: number; reorderPoint?: number;
  reorderQuantity?: number; unitPrice?: number; isActive?: boolean; notes?: string;
}
export interface UpdateMaterialInput extends CreateMaterialInput { id: string; }
export interface CreateInventoryTransactionInput {
  txnCode: string; warehouseId: string; materialId: string;
  referenceType?: string; referenceId?: string; txnType?: string;
  quantity: number; unitCost?: number; totalCost?: number; notes?: string; performedBy?: string;
}

// ─── Inventory (Kho): endpoints ────────────────────────────────────────────────
export const warehouses = {
  getAll: (buildingId?: string) => apiFetch<WarehouseResponse[]>(`/api/asset/warehouse/get-all${qs({ buildingId })}`, {}),
  getById: (id: string) => apiFetch<WarehouseResponse>(`/api/asset/warehouse/get/${id}`, {}),
  create: (body: CreateWarehouseInput) =>
    apiFetch<boolean>(`/api/asset/warehouse/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateWarehouseInput) =>
    apiFetch<boolean>(`/api/asset/warehouse/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/warehouse/delete/${id}`, { method: "DELETE" }),
};
export const materials = {
  getAll: (params?: { categoryId?: string; isActive?: boolean }) =>
    apiFetch<MaterialResponse[]>(`/api/asset/material/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<MaterialResponse>(`/api/asset/material/get/${id}`, {}),
  getLowStock: (warehouseId?: string) =>
    apiFetch<MaterialResponse[]>(`/api/asset/material/get-low-stock${qs({ warehouseId })}`, {}),
  getInventoryLevels: (params?: { warehouseId?: string; materialId?: string }) =>
    apiFetch<InventoryLevelResponse[]>(`/api/asset/material/get-inventory-levels${qs(params)}`, {}),
  create: (body: CreateMaterialInput) =>
    apiFetch<boolean>(`/api/asset/material/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateMaterialInput) =>
    apiFetch<boolean>(`/api/asset/material/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/material/delete/${id}`, { method: "DELETE" }),
};
export const inventoryTransactions = {
  getAll: (params?: { warehouseId?: string; materialId?: string; txnType?: string; referenceType?: string; referenceId?: string }) =>
    apiFetch<InventoryTransactionResponse[]>(`/api/asset/inventory-transaction/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<InventoryTransactionResponse>(`/api/asset/inventory-transaction/get/${id}`, {}),
  create: (body: CreateInventoryTransactionInput) =>
    apiFetch<boolean>(`/api/asset/inventory-transaction/create`, { method: "POST", body: JSON.stringify(body) }),
};

// ─── Procurement (Mua sắm): types ──────────────────────────────────────────────
export interface PurchaseRequestResponse {
  id: string; prCode: string; ticketId?: string; ticketCode?: string; woId?: string; woCode?: string;
  departmentId?: string; requestedBy: string; requestedByName?: string; status: string; title?: string; justification?: string;
  priority: string; neededByDate?: string; approvedBy?: string; approvedAt?: string;
  rejectedReason?: string; createdAt: string;
}
export interface PurchaseRequestItemResponse {
  id: string; prId: string; prCode?: string; materialId: string; materialCode?: string;
  materialName?: string; targetWarehouseId?: string; warehouseName?: string;
}
export interface PurchaseOrderResponse {
  id: string; poCode: string; prId?: string; prCode?: string; vendorId: string; vendorName?: string;
  status: string; issueDate?: string; expectedDelivery?: string; actualDelivery?: string;
  totalAmount?: number; currency: string; paymentTerms?: string; notes?: string;
  createdBy?: string; createdAt: string;
}
export interface PurchaseOrderItemResponse {
  id: string; poId: string; poCode?: string; materialId: string; materialCode?: string;
  materialName?: string; targetWarehouseId?: string; warehouseName?: string;
}
export interface InvoiceResponse {
  id: string; invoiceCode: string; vendorId: string; vendorName?: string; poId?: string; poCode?: string;
  ocrJobId?: string; status: string; invoiceDate?: string; invoiceNumber?: string;
  subtotal?: number; taxAmount?: number; totalAmount?: number; currency: string;
  paymentDueDate?: string; paidDate?: string; paymentStatus: string; paymentMethod?: string;
  confirmedBy?: string; confirmedAt?: string; notes?: string;
}
export interface InvoiceItemResponse {
  id: string; invoiceId: string; materialId: string; materialCode?: string; materialName?: string;
  description?: string; quantity?: number; unitPrice?: number; totalPrice?: number; poItemId?: string;
}
export interface OcrJobResponse {
  id: string; documentType: string; ocrEngine?: string; status: string; reviewedBy?: string; reviewedByName?: string;
  fileUrl?: string; fileName?: string; fileSizeBytes?: number; confidenceScore?: number;
  rawExtractedText?: string;   // JSON do worker OCR ghi: { rawText, fields, lineItems }
  errorMessage?: string; startedAt?: string; completedAt?: string; submittedBy?: string; submittedByName?: string; submittedAt: string;
}

// Cấu trúc JSON bóc tách trong OcrJobResponse.rawExtractedText (worker serialize camelCase).
export interface OcrExtractedFields {
  invoiceNumber?: string; invoiceDate?: string; sellerName?: string; sellerTaxCode?: string;
  subtotal?: number; taxAmount?: number; totalAmount?: number; currency?: string;
}
export interface OcrExtractedLineItem {
  description?: string; quantity?: number; unitPrice?: number; totalPrice?: number;
}
export interface OcrExtractedPayload {
  rawText?: string; fields?: OcrExtractedFields; lineItems?: OcrExtractedLineItem[];
}
/** Parse an toàn OcrJobResponse.rawExtractedText → payload có cấu trúc (trả null nếu lỗi/empty). */
export function parseOcrPayload(raw?: string | null): OcrExtractedPayload | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as OcrExtractedPayload;
    return p && typeof p === "object" ? p : null;
  } catch { return null; }
}
export interface CreatePurchaseRequestInput {
  prCode: string; ticketId?: string; woId?: string; departmentId?: string; requestedBy?: string; requestedByName?: string;
  title?: string; justification?: string; priority?: string; neededByDate?: string;
}
export interface UpdatePurchaseRequestInput extends CreatePurchaseRequestInput {
  id: string; status?: string; approvedBy?: string; approvedAt?: string; rejectedReason?: string;
}
export interface CreatePurchaseOrderInput {
  poCode: string; prId?: string; vendorId: string; issueDate?: string; expectedDelivery?: string;
  totalAmount?: number; currency?: string; paymentTerms?: string; notes?: string; createdBy?: string;
}
export interface UpdatePurchaseOrderInput extends CreatePurchaseOrderInput { id: string; status?: string; actualDelivery?: string; }
export interface CreateInvoiceItemLine {
  materialId: string; description?: string; quantity?: number; unitPrice?: number; totalPrice?: number;
}
export interface CreateInvoiceInput {
  invoiceCode: string; vendorId: string; poId?: string; ocrJobId?: string; invoiceDate?: string;
  invoiceNumber?: string; subtotal?: number; taxAmount?: number; totalAmount?: number;
  currency?: string; paymentDueDate?: string; notes?: string;
  items?: CreateInvoiceItemLine[];   // hạng mục đã đối chiếu ra materialId, lưu cùng hóa đơn
}
export interface UpdateInvoiceInput extends CreateInvoiceInput {
  id: string; status?: string; paymentStatus?: string; paidDate?: string; paymentMethod?: string;
  confirmedBy?: string; confirmedAt?: string;
}

// ─── Procurement (Mua sắm): endpoints ──────────────────────────────────────────
export const purchaseRequests = {
  getAll: (params?: { status?: string; ticketId?: string; woId?: string }) =>
    apiFetch<PurchaseRequestResponse[]>(`/api/asset/purchase-request/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<PurchaseRequestResponse>(`/api/asset/purchase-request/get/${id}`, {}),
  create: (body: CreatePurchaseRequestInput) =>
    apiFetch<boolean>(`/api/asset/purchase-request/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdatePurchaseRequestInput) =>
    apiFetch<boolean>(`/api/asset/purchase-request/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/purchase-request/delete/${id}`, { method: "DELETE" }),
  approve: (id: string, approvedBy: string) =>
    apiFetch<boolean>(`/api/asset/purchase-request/approve/${id}`, { method: "PUT", body: JSON.stringify({ approvedBy }) }),
  reject: (id: string, reason: string) =>
    apiFetch<boolean>(`/api/asset/purchase-request/reject/${id}`, { method: "PUT", body: JSON.stringify({ reason }) }),
  getItems: (prId: string) => apiFetch<PurchaseRequestItemResponse[]>(`/api/asset/purchase-request/get-items/${prId}`, {}),
  addItem: (body: { prId: string; materialId: string; targetWarehouseId?: string }) =>
    apiFetch<boolean>(`/api/asset/purchase-request/add-item`, { method: "POST", body: JSON.stringify(body) }),
};
export const purchaseOrders = {
  getAll: (params?: { status?: string; vendorId?: string }) =>
    apiFetch<PurchaseOrderResponse[]>(`/api/asset/purchase-order/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<PurchaseOrderResponse>(`/api/asset/purchase-order/get/${id}`, {}),
  create: (body: CreatePurchaseOrderInput) =>
    apiFetch<boolean>(`/api/asset/purchase-order/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdatePurchaseOrderInput) =>
    apiFetch<boolean>(`/api/asset/purchase-order/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/purchase-order/delete/${id}`, { method: "DELETE" }),
  getItems: (poId: string) => apiFetch<PurchaseOrderItemResponse[]>(`/api/asset/purchase-order/get-items/${poId}`, {}),
  addItem: (body: { poId: string; materialId: string; targetWarehouseId?: string }) =>
    apiFetch<boolean>(`/api/asset/purchase-order/add-item`, { method: "POST", body: JSON.stringify(body) }),
};
export const invoices = {
  getAll: (params?: { vendorId?: string; paymentStatus?: string }) =>
    apiFetch<InvoiceResponse[]>(`/api/asset/invoice/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<InvoiceResponse>(`/api/asset/invoice/get/${id}`, {}),
  create: (body: CreateInvoiceInput) =>
    apiFetch<boolean>(`/api/asset/invoice/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateInvoiceInput) =>
    apiFetch<boolean>(`/api/asset/invoice/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/invoice/delete/${id}`, { method: "DELETE" }),
  markPaid: (id: string, paymentMethod: string, confirmedBy: string) =>
    apiFetch<boolean>(`/api/asset/invoice/mark-paid/${id}`, { method: "PUT", body: JSON.stringify({ paymentMethod, confirmedBy }) }),
  getItems: (invoiceId: string) => apiFetch<InvoiceItemResponse[]>(`/api/asset/invoice/get-items/${invoiceId}`, {}),
  addItem: (body: { invoiceId: string; materialId: string; description?: string; quantity?: number; unitPrice?: number; totalPrice?: number; poItemId?: string }) =>
    apiFetch<boolean>(`/api/asset/invoice/add-item`, { method: "POST", body: JSON.stringify(body) }),
};
export const ocrJobs = {
  getAll: (status?: string) => apiFetch<OcrJobResponse[]>(`/api/asset/ocr-job/get-all${qs({ status })}`, {}),
  getById: (id: string) => apiFetch<OcrJobResponse>(`/api/asset/ocr-job/get/${id}`, {}),
  // submit trả về id (Guid) của job vừa tạo để FE điều hướng sang màn kết quả + poll.
  // submittedBy là Guid? cross-service (Auth) — chưa có directory người dùng nên luôn gửi
  // EMPTY_GUID; tên người gửi (free-text) ghi riêng vào submittedByName (theo pattern
  // reportedByName/requestedByName). Tránh lỗi 400 khi serialize tên → Guid.
  submit: (body: { documentType: string; ocrEngine?: string; fileUrl?: string; fileName?: string; fileSizeBytes?: number; submittedByName?: string }) =>
    apiFetch<string>(`/api/asset/ocr-job/submit`, { method: "POST", body: JSON.stringify({ ...body, submittedBy: EMPTY_GUID }) }),
  markReviewed: (id: string, reviewedByName?: string) =>
    apiFetch<boolean>(`/api/asset/ocr-job/mark-reviewed/${id}`, { method: "PUT", body: JSON.stringify({ reviewedBy: EMPTY_GUID, reviewedByName }) }),
};

// ─── Vendor (Nhà thầu): types ──────────────────────────────────────────────────
export interface VendorResponse {
  id: string; vendorCode: string; name: string; taxId: string; status: string;
  blacklistReason?: string; blacklistedAt?: string; blacklistedBy?: string;
  contactName?: string; contactEmail?: string; contactPhone?: string; address?: string; notes?: string;
}
export interface VendorContractResponse {
  id: string; contractCode: string; vendorId: string; vendorName?: string; buildingId?: string;
  startDate?: string; endDate?: string; contractValue?: number; currency: string; paymentTerms?: string;
  renewalNoticeDays: number; status: string; scopeOfWork?: string; fileUrl?: string;
  signedByVendor?: string; signedByBuilding?: string; notes?: string;
}
export interface VendorContractServiceResponse { id: string; contractId: string; contractCode?: string; serviceName: string; }
export interface VendorEvaluationResponse {
  id: string; vendorId: string; vendorName?: string; contractId?: string; contractCode?: string;
  evaluatorId: string; evaluationDate: string; overallScore: number; qualityScore: number;
  timelinessScore: number; costScore: number; safetyScore: number; comments?: string; recommendation?: string;
}
export interface CreateVendorInput {
  vendorCode: string; name: string; taxId: string; contactName?: string; contactEmail?: string;
  contactPhone?: string; address?: string; notes?: string;
}
export interface UpdateVendorInput extends CreateVendorInput {
  id: string; status?: string; blacklistReason?: string; blacklistedAt?: string; blacklistedBy?: string;
}
export interface CreateVendorContractInput {
  contractCode: string; vendorId: string; buildingId?: string; startDate?: string; endDate?: string;
  contractValue?: number; currency?: string; paymentTerms?: string; renewalNoticeDays?: number;
  status?: string; scopeOfWork?: string; fileUrl?: string; signedByVendor?: string; signedByBuilding?: string; notes?: string;
}
export interface UpdateVendorContractInput extends CreateVendorContractInput { id: string; }
export interface CreateVendorEvaluationInput {
  vendorId: string; contractId?: string; evaluatorId: string; evaluationDate: string;
  overallScore: number; qualityScore: number; timelinessScore: number; costScore: number; safetyScore: number;
  comments?: string; recommendation?: string;
}

// ─── Vendor (Nhà thầu): endpoints ──────────────────────────────────────────────
export const vendorsApi = {
  getAll: (status?: string) => apiFetch<VendorResponse[]>(`/api/asset/vendor/get-all${qs({ status })}`, {}),
  getById: (id: string) => apiFetch<VendorResponse>(`/api/asset/vendor/get/${id}`, {}),
  create: (body: CreateVendorInput) =>
    apiFetch<boolean>(`/api/asset/vendor/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateVendorInput) =>
    apiFetch<boolean>(`/api/asset/vendor/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/vendor/delete/${id}`, { method: "DELETE" }),
  blacklist: (id: string, reason: string, blacklistedBy: string) =>
    apiFetch<boolean>(`/api/asset/vendor/blacklist/${id}`, { method: "PUT", body: JSON.stringify({ reason, blacklistedBy }) }),
  activate: (id: string) => apiFetch<boolean>(`/api/asset/vendor/activate/${id}`, { method: "PUT" }),
};
export const vendorContracts = {
  getAll: (params?: { vendorId?: string; buildingId?: string; status?: string }) =>
    apiFetch<VendorContractResponse[]>(`/api/asset/vendor-contract/get-all${qs(params)}`, {}),
  getById: (id: string) => apiFetch<VendorContractResponse>(`/api/asset/vendor-contract/get/${id}`, {}),
  getExpiring: (daysAhead = 30) =>
    apiFetch<VendorContractResponse[]>(`/api/asset/vendor-contract/get-expiring${qs({ daysAhead })}`, {}),
  create: (body: CreateVendorContractInput) =>
    apiFetch<boolean>(`/api/asset/vendor-contract/create`, { method: "POST", body: JSON.stringify(body) }),
  update: (body: UpdateVendorContractInput) =>
    apiFetch<boolean>(`/api/asset/vendor-contract/update`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/vendor-contract/delete/${id}`, { method: "DELETE" }),
  getServices: (contractId: string) =>
    apiFetch<VendorContractServiceResponse[]>(`/api/asset/vendor-contract-service/get-by-contract/${contractId}`, {}),
  addService: (body: { contractId: string; serviceName: string }) =>
    apiFetch<boolean>(`/api/asset/vendor-contract-service/create`, { method: "POST", body: JSON.stringify(body) }),
};
export const vendorEvaluations = {
  getById: (id: string) => apiFetch<VendorEvaluationResponse>(`/api/asset/vendor-evaluation/get/${id}`, {}),
  getByVendor: (vendorId: string) => apiFetch<VendorEvaluationResponse[]>(`/api/asset/vendor-evaluation/get-by-vendor/${vendorId}`, {}),
  getByContract: (contractId: string) => apiFetch<VendorEvaluationResponse[]>(`/api/asset/vendor-evaluation/get-by-contract/${contractId}`, {}),
  create: (body: CreateVendorEvaluationInput) =>
    apiFetch<boolean>(`/api/asset/vendor-evaluation/create`, { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/vendor-evaluation/delete/${id}`, { method: "DELETE" }),
};

// ─── System / Reporting (Báo cáo KT): types ────────────────────────────────────
export interface KpiDailySnapshotResponse {
  id: string; snapshotDate: string; buildingId: string; kpiDataJson?: string; createdAt: string;
}
export interface CostTrackingResponse {
  id: string; referenceType: string; referenceId: string; assetId?: string; assetCode?: string;
  categoryId?: string; buildingId: string; departmentId?: string; amount: number; currency: string;
  costType?: string; costDate: string; description?: string; recordedBy?: string; recordedAt: string;
}
export interface CreateCostTrackingInput {
  referenceType: string; referenceId: string; assetId?: string; categoryId?: string;
  buildingId: string; departmentId?: string; amount?: number; currency?: string;
  costType?: string; costDate: string; description?: string; recordedBy?: string;
}

// Cấu trúc gợi ý bên trong KpiDailySnapshotResponse.kpiDataJson (parse khi dùng).
export interface KpiData {
  mttr_hours?: number; mtbf_days?: number;
  ticket_count_new?: number; ticket_count_resolved?: number; ticket_count_overdue?: number;
  wo_count_completed?: number; wo_completion_rate?: number; sla_compliance_rate?: number;
  asset_availability_rate?: number; pm_overdue_count?: number; total_maintenance_cost?: number;
}

// ─── System / Reporting (Báo cáo KT): endpoints ────────────────────────────────
export const kpiSnapshots = {
  getById: (id: string) => apiFetch<KpiDailySnapshotResponse>(`/api/asset/kpi-snapshot/get/${id}`, {}),
  getByBuilding: (buildingId: string, take = 90) =>
    apiFetch<KpiDailySnapshotResponse[]>(`/api/asset/kpi-snapshot/get-by-building/${buildingId}${qs({ take })}`, {}),
  getByDateRange: (buildingId: string, from: string, to: string) =>
    apiFetch<KpiDailySnapshotResponse[]>(`/api/asset/kpi-snapshot/get-by-date-range${qs({ buildingId, from, to })}`, {}),
  create: (body: { buildingId: string; snapshotDate: string; kpiDataJson: string }) =>
    apiFetch<boolean>(`/api/asset/kpi-snapshot/create`, { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/kpi-snapshot/delete/${id}`, { method: "DELETE" }),
};
export const costTracking = {
  getById: (id: string) => apiFetch<CostTrackingResponse>(`/api/asset/cost-tracking/get/${id}`, {}),
  getByReference: (referenceType: string, referenceId: string) =>
    apiFetch<CostTrackingResponse[]>(`/api/asset/cost-tracking/get-by-reference${qs({ referenceType, referenceId })}`, {}),
  getByBuilding: (buildingId: string, params?: { from?: string; to?: string; costType?: string }) =>
    apiFetch<CostTrackingResponse[]>(`/api/asset/cost-tracking/get-by-building/${buildingId}${qs(params)}`, {}),
  getByAsset: (assetId: string) => apiFetch<CostTrackingResponse[]>(`/api/asset/cost-tracking/get-by-asset/${assetId}`, {}),
  create: (body: CreateCostTrackingInput) =>
    apiFetch<boolean>(`/api/asset/cost-tracking/create`, { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<boolean>(`/api/asset/cost-tracking/delete/${id}`, { method: "DELETE" }),
};
