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

// ─── Core fetch ───────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = { ...options, headers, credentials: "include" };

    if (timeoutMs > 0) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), timeoutMs);
      fetchOptions.signal = controller.signal;
    }

    const res = await fetch(`${BASE_URL}${path}`, fetchOptions);

    const body = await res.json().catch(() => ({
      errorCode: res.status,
      errorMessage: res.statusText,
      data: null,
    }));
    return body as ApiResponse<T>;
  } catch (err) {
    const message = err instanceof Error && err.name === "AbortError"
      ? "Request timeout"
      : "Lỗi kết nối";
    return { errorCode: 500, errorMessage: message, data: null as T };
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  staffLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/StaffLogin", { method: "POST", body: JSON.stringify({ userName, password }) }, 0),

  userLogin: (userName: string, password: string) =>
    apiFetch<LoginResponse>("/login/userLogin", { method: "POST", body: JSON.stringify({ userName, password }) }, 0),

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
  getMe: () => apiFetch<GetUserResponse>("/user/me"),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = {
  me: () => apiFetch<GetUserResponse>("/user/me"),
  getAll: () => apiFetch<GetUserResponse[]>("/user/getAllUsers"),
  getAllAdmin: () => apiFetch<GetUserResponse[]>("/user/admin/getAllUsers"),
  getAllSlim: () => apiFetch<UserSlim[]>("/user/getAllUsersSlim"),
  getById: (id: number) => apiFetch<GetUserResponse>(`/user/admin/getUserById?userId=${id}`),
  delete: (id: number) => apiFetch<unknown>(`/user/deleteUser?userId=${id}`, { method: "DELETE" }),
  updateProfile: (form: FormData) =>
    fetch(`${BASE_URL}/user/update/profile`, { method: "PUT", body: form, credentials: "include" })
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
export const permissions = {
  getAll: () => apiFetch<Permission[]>("/permissions/admin/getall"),
  getByUser: (id: number) => apiFetch<Permission[]>(`/permissions/getbyUserID/${id}`),
  getByRole: (id: number) => apiFetch<Permission[]>(`/permissions/getbyRoleID/${id}`),
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
  acceptByProvider: (id: number, providerId: number) =>
    apiFetch<boolean>("/api/ServiceRequest/accept-by-provider", { method: "PUT", body: JSON.stringify({ id, providerId }) }),
  rejectByProvider: (id: number, reason: string) =>
    apiFetch<boolean>("/api/ServiceRequest/reject-by-provider", { method: "PUT", body: JSON.stringify({ id, reason }) }),
  updateStatus: (id: number, status: "in_progress" | "completed") =>
    apiFetch<boolean>("/api/ServiceRequest/update-status", { method: "PUT", body: JSON.stringify({ id, status }) }),
};

// ─── Provider Service Listings ─────────────────────────────────────────────────

export interface PriceListItem {
  name: string;
  unit?: string;
  price: number;
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
