// Danh mục phân quyền (RBAC) — định nghĩa TẤT CẢ action trong hệ thống,
// chia 2 nhóm lớn: CORE (nền tảng: tài khoản, vai trò, quyền, thông báo, cư dân…)
// và MODULE (nghiệp vụ kỹ thuật/tài sản: tài sản, PM, CM, kho, mua sắm, nhà thầu…).
//
// Quyền lưu ở backend qua bảng AuthPermission { code, permissionName, scope }.
// Nhóm Core/Module + tài nguyên được suy ra từ tiền tố `code` (vd "asset.create"),
// nên KHÔNG cần thêm cột DB. `scope` giữ "staff" cho mọi quyền quản trị.

export type PermGroup = "core" | "module";

export interface ResourceDef {
  key: string;          // tiền tố code, vd "asset"
  label: string;        // nhãn hiển thị tiếng Việt
  group: PermGroup;
  icon: string;         // tên icon lucide (tham khảo)
  actions: { action: string; label: string; description?: string }[];
}

export interface CatalogPermission {
  code: string;             // "<resource>.<action>"
  permissionName: string;   // nhãn ngắn, vd "Xem tài sản"
  permissionDescription: string;
  group: PermGroup;
  resource: string;         // key tài nguyên
  resourceLabel: string;
  action: string;
  actionLabel: string;
}

// Action dùng lại nhiều nơi (suffix sau dấu chấm = phần `action` của code)
const A = {
  view: { action: "view", label: "Xem" },
  create: { action: "create", label: "Tạo mới" },
  update: { action: "update", label: "Cập nhật" },
  delete: { action: "delete", label: "Xoá" },
};

// LƯU Ý: mọi `code` (= `${key}.${action}`) phải KHỚP TUYỆT ĐỐI với value trong
// backend TH.Constant/PermissionConstants.cs — để RBAC thông suốt đầu-cuối:
// seed DB → gán vai trò → claim JWT → hasPermission(code) ở FE → [Authorize] ở BE.
// Vì vậy nhóm CORE dùng đúng các code "thật" của Auth (role.read, permission.manage,
// audit_log.manage…) thay vì view/create/update/delete cho đồng nhất.
export const RESOURCE_DEFS: ResourceDef[] = [
  // ───────────────── CORE ─────────────────
  {
    key: "user", label: "Tài khoản người dùng", group: "core", icon: "Users",
    actions: [
      { action: "read_details", label: "Xem", description: "Xem danh sách & chi tiết tài khoản" },
      { action: "delete", label: "Xoá", description: "Vô hiệu hoá / xoá tài khoản" },
    ],
  },
  {
    key: "role", label: "Vai trò (nhóm người dùng)", group: "core", icon: "ClipboardList",
    actions: [
      { action: "read", label: "Xem", description: "Xem danh sách vai trò" },
      { action: "manage", label: "Quản lý", description: "Tạo / sửa / xoá vai trò" },
      { action: "assign", label: "Gán cho người dùng", description: "Gán vai trò cho tài khoản" },
    ],
  },
  {
    key: "permission", label: "Phân quyền (nhóm quyền)", group: "core", icon: "Shield",
    actions: [
      { action: "read", label: "Xem", description: "Xem danh mục quyền" },
      { action: "manage", label: "Quản lý danh mục", description: "Tạo / sửa / xoá định nghĩa quyền" },
      { action: "assign", label: "Gán quyền cho vai trò", description: "Phân quyền cho vai trò" },
    ],
  },
  {
    key: "notification", label: "Thông báo", group: "core", icon: "BellRing",
    actions: [
      { ...A.view, description: "Xem lịch sử thông báo" },
      { action: "send", label: "Gửi thông báo", description: "Soạn & gửi thông báo tới cư dân/nhân viên" },
      { action: "manage", label: "Quản lý mẫu", description: "Tạo/sửa mẫu & cấu hình kênh" },
    ],
  },
  {
    key: "audit_log", label: "Nhật ký hệ thống", group: "core", icon: "FileText",
    actions: [
      { action: "manage", label: "Xem & quản lý", description: "Xem nhật ký truy cập & thao tác (audit log)" },
    ],
  },
  {
    key: "apartment", label: "Căn hộ", group: "core", icon: "Building2",
    actions: [
      { ...A.view, description: "Xem danh sách căn hộ" },
      { ...A.create, description: "Thêm căn hộ" },
      { ...A.update, description: "Sửa thông tin căn hộ" },
      { ...A.delete, description: "Xoá căn hộ" },
    ],
  },
  {
    key: "resident", label: "Cư dân", group: "core", icon: "Users",
    actions: [
      { ...A.view, description: "Xem danh sách cư dân" },
      { ...A.create, description: "Thêm cư dân" },
      { ...A.update, description: "Sửa hồ sơ cư dân" },
      { ...A.delete, description: "Xoá cư dân" },
      { action: "face_register", label: "Đăng ký khuôn mặt", description: "Đăng ký và cập nhật dữ liệu khuôn mặt AI" },
      { action: "access_review", label: "Xử lý người lạ", description: "Xem và xử lý cảnh báo người lạ ra/vào" },
    ],
  },

  // ───────────────── MODULE ─────────────────
  {
    key: "asset", label: "Tài sản", group: "module", icon: "Boxes",
    actions: [
      { ...A.view, description: "Xem danh sách & chi tiết tài sản" },
      { ...A.create, description: "Khai báo tài sản, gắn QR" },
      { ...A.update, description: "Cập nhật tình trạng, vị trí, khấu hao" },
      { ...A.delete, description: "Thanh lý / xoá tài sản" },
      { action: "accounting", label: "Kế toán tài sản", description: "Khấu hao, chứng từ, thanh lý, nhật ký chung, sổ cái, báo cáo kế toán" },
    ],
  },
  {
    key: "workorder", label: "Bảo trì định kỳ (PM)", group: "module", icon: "Wrench",
    actions: [
      { ...A.view, description: "Xem lệnh công việc bảo trì" },
      { ...A.create, description: "Tạo lệnh & lịch bảo trì" },
      { action: "assign", label: "Phân công KTV", description: "Giao lệnh cho kỹ thuật viên" },
      { action: "execute", label: "Thực hiện", description: "Check-in, làm checklist, xuất vật tư" },
      { action: "review", label: "Nghiệm thu", description: "KST duyệt/từ chối kết quả" },
      { action: "close", label: "Đóng lệnh", description: "Hoàn tất & đóng WO" },
    ],
  },
  {
    key: "ticket", label: "Sự cố (CM)", group: "module", icon: "Ticket",
    actions: [
      { ...A.view, description: "Xem phiếu sự cố" },
      { ...A.create, description: "Tiếp nhận / tạo phiếu sự cố" },
      { action: "assign", label: "Phân công KTV", description: "Giao phiếu cho kỹ thuật viên" },
      { action: "resolve", label: "Xử lý", description: "Khảo sát, xuất vật tư, khắc phục" },
      { action: "close", label: "Đóng phiếu", description: "Đóng phiếu & ghi nhận đánh giá" },
    ],
  },
  {
    key: "inventory", label: "Kho vật tư", group: "module", icon: "Package",
    actions: [
      { ...A.view, description: "Xem tồn kho & danh mục vật tư" },
      { action: "transaction", label: "Nhập / Xuất kho", description: "Tạo phiếu nhập, xuất, điều chuyển" },
      { action: "manage", label: "Quản lý danh mục & kho", description: "Thêm/sửa/xoá danh mục vật tư và danh sách kho" },
      { action: "audit", label: "Kiểm kê", description: "Tạo & chốt kỳ kiểm kê, điều chỉnh tồn" },
    ],
  },
  {
    key: "procurement", label: "Mua sắm", group: "module", icon: "ShoppingCart",
    actions: [
      { ...A.view, description: "Xem PR/PO/hoá đơn" },
      { action: "request", label: "Đề xuất mua (PR)", description: "Tạo yêu cầu mua hàng" },
      { action: "approve", label: "Duyệt PR", description: "Phê duyệt yêu cầu mua" },
      { action: "order", label: "Tạo đơn (PO)", description: "Lập đơn đặt hàng cho NCC" },
      { action: "invoice", label: "Xử lý hoá đơn", description: "OCR, đối chiếu & xác nhận hoá đơn" },
    ],
  },
  {
    key: "vendor", label: "Nhà thầu", group: "module", icon: "Handshake",
    actions: [
      { ...A.view, description: "Xem danh sách nhà cung cấp" },
      { ...A.create, description: "Thêm nhà cung cấp & hợp đồng" },
      { ...A.update, description: "Cập nhật thông tin NCC" },
      { action: "evaluate", label: "Đánh giá", description: "Chấm điểm & đánh giá nhà thầu" },
    ],
  },
  {
    key: "report", label: "Báo cáo", group: "module", icon: "BarChart3",
    actions: [
      { action: "kpi", label: "Báo cáo KPI", description: "Xem báo cáo KPI vận hành" },
      { action: "cost", label: "Báo cáo chi phí", description: "Xem báo cáo chi phí bảo trì" },
    ],
  },
];

// Phẳng hoá catalog
export const PERMISSION_CATALOG: CatalogPermission[] = RESOURCE_DEFS.flatMap((r) =>
  r.actions.map((a) => ({
    code: `${r.key}.${a.action}`,
    permissionName: `${a.label} · ${r.label}`,
    permissionDescription: a.description ?? `${a.label} ${r.label}`,
    group: r.group,
    resource: r.key,
    resourceLabel: r.label,
    action: a.action,
    actionLabel: a.label,
  })),
);

// ─── Tra cứu nhanh ──────────────────────────────────────────────────────────
const RESOURCE_BY_KEY: Record<string, ResourceDef> = Object.fromEntries(
  RESOURCE_DEFS.map((r) => [r.key, r]),
);

export function resourceOf(code: string): string {
  return (code || "").split(".")[0] || "other";
}
export function actionOf(code: string): string {
  return (code || "").split(".")[1] || "";
}

/** Suy nhóm + nhãn tài nguyên cho 1 code bất kỳ (kể cả code lạ ngoài catalog). */
export function metaOf(code: string): { group: PermGroup; resourceKey: string; resourceLabel: string; actionLabel: string } {
  const resourceKey = resourceOf(code);
  const action = actionOf(code);
  const def = RESOURCE_BY_KEY[resourceKey];
  const known = PERMISSION_CATALOG.find((p) => p.code === code);
  return {
    group: def?.group ?? "module",
    resourceKey,
    resourceLabel: def?.label ?? resourceKey,
    actionLabel: known?.actionLabel ?? action ?? "",
  };
}

/**
 * Người dùng chỉ được xem phiếu do mình phụ trách hay xem toàn bộ?
 *
 * Phải khớp với `AssignmentScope` ở backend (TH.WebAPI/Controllers/Asset/
 * AssignmentScope.cs) — backend mới là nơi chặn thật, hai hàm này chỉ dùng để
 * hiển thị ghi chú cho đúng. Người chỉ có quyền thi hành (execute/resolve) mà
 * không có quyền điều phối thì là người thừa hành ⇒ chỉ thấy việc của mình.
 */
export function isWorkOrderOwnerScoped(has: (code: string) => boolean): boolean {
  if (!has("workorder.execute")) return false;
  return !["workorder.assign", "workorder.review", "workorder.close", "workorder.create"].some(has);
}

export function isTicketOwnerScoped(has: (code: string) => boolean): boolean {
  if (!has("ticket.resolve")) return false;
  return !["ticket.assign", "ticket.close"].some(has);
}

export const GROUP_LABEL: Record<PermGroup, string> = {
  core: "Hệ thống nền (Core)",
  module: "Nghiệp vụ kỹ thuật (Module)",
};

export const GROUP_DESC: Record<PermGroup, string> = {
  core: "Quyền quản trị nền tảng: tài khoản, vai trò, phân quyền, cư dân, thông báo, nhật ký.",
  module: "Quyền nghiệp vụ tài sản & kỹ thuật: tài sản, bảo trì, sự cố, kho, mua sắm, nhà thầu, báo cáo.",
};
