# TownHub — Tổng quan dự án

> Tài liệu tổng hợp toàn bộ dự án **TownHub** — hệ thống quản lý tòa nhà & quản lý tài sản (Đồ án tốt nghiệp).
> Sinh viên: Nguyễn Xuân Thưởng — 66KSCS — 0220766.
> Cập nhật: 30/06/2026.

---

## 1. Giới thiệu chung

**TownHub** là một nền tảng quản lý vận hành tòa nhà (building operations) và **quản lý tài sản** quy mô doanh nghiệp, được xây dựng theo kiến trúc tách biệt **Backend (.NET 8 Web API)** và **Frontend (Next.js 16 + React 19)**, kèm theo các **mô hình AI** (OCR hóa đơn, phân tích CV) ở dạng Jupyter Notebook.

Hệ thống bao phủ nhiều nghiệp vụ chính:

- **Quản lý tài sản** (Asset): danh mục, khấu hao, QR code, điều chuyển, thanh lý, bảo trì.
- **Bảo trì phòng ngừa** (Preventive Maintenance — PM): lệnh công việc, lịch bảo trì, checklist, check-in kỹ thuật viên.
- **Quản lý sự cố / khiếu nại** (Complaint Management — CM/Tickets): phiếu sự cố, SLA, leo thang, đánh giá.
- **Quản lý kho** (Inventory): tồn kho, kiểm kê, xuất/nhập, vật tư.
- **Mua sắm** (Procurement): yêu cầu mua, đơn mua, hóa đơn, **OCR hóa đơn tự động**.
- **Quản lý nhà cung cấp** (Vendor): hồ sơ, hợp đồng, đánh giá hiệu suất.
- **Quản lý người dùng & phân quyền** (RBAC): người dùng, vai trò, quyền, nhật ký kiểm toán.
- **Quản lý tòa nhà cơ bản** (Base): căn hộ, cư dân, phí, thông báo.
- **Báo cáo & KPI**: báo cáo chi phí, KPI hiệu suất.

---

## 2. Cấu trúc thư mục gốc

```
D:\DATN\TownHub\
├── TH.WebAPI/              # Backend .NET 8 Web API (kiến trúc nhiều tầng)
├── datn/                   # Frontend Next.js 16 + React 19
├── AI/                     # Notebook AI (OCR / NLP)
│   ├── Fuzzy_Matching_best.ipynb
│   └── Resume_Paser_best.ipynb
├── Quản lý tài sản/        # Tài liệu thiết kế (UseCase .drawio)
├── Báo cáo/                # Báo cáo thực tập & đồ án (.docx)
├── createDB.txt            # Script SQL khởi tạo schema (PostgreSQL)
├── hoa-don-mau.html        # Mẫu hóa đơn (cho OCR/in ấn)
├── README.md
└── LICENSE.txt
```

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────────┐        HTTPS / REST (JSON)        ┌──────────────────────────┐
│   Frontend (Next.js 16)   │  ─────────────────────────────▶  │   Backend (.NET 8 API)    │
│   React 19 + Tailwind v4   │  ◀─────────────────────────────  │   Layered Architecture     │
│   lib/api.ts (API client)  │       JWT Bearer / Cookie         │   Controllers → Service    │
└──────────────────────────┘                                    └────────────┬─────────────┘
                                                                              │
                          ┌───────────────────────────────────────────────────┼───────────────────────┐
                          │                          │                         │                       │
                    ┌─────▼─────┐            ┌────────▼────────┐        ┌───────▼────────┐      ┌────────▼────────┐
                    │ PostgreSQL │            │     Redis        │        │   Cloudinary   │      │  OCR / Email    │
                    │ auth/asset │            │  (session/MFA)   │        │ (lưu ảnh/file) │      │ VietOCR/MailKit │
                    │   /base    │            └─────────────────┘        └────────────────┘      └─────────────────┘
                    └───────────┘
```

- **Mô hình giao tiếp**: Frontend gọi REST API qua `lib/api.ts`, xác thực bằng JWT Bearer (token lưu `localStorage`) hoặc cookie HttpOnly.
- **Backend** theo kiến trúc nhiều tầng (layered): `Controllers → ApplicationService → Domain / Infrastructure`, chia thành 3 module độc lập (Auth, Asset, Base).
- **CSDL** PostgreSQL với 3 schema riêng: `auth`, `asset`, `base`.

---

## 4. Backend — TH.WebAPI (.NET 8)

### 4.1. Công nghệ

| Hạng mục | Công nghệ |
|----------|-----------|
| Framework | .NET 8.0 (nullable + implicit usings) |
| ORM | Entity Framework Core 8.0.11 |
| CSDL | PostgreSQL (Npgsql.EntityFrameworkCore.PostgreSQL 8.0.11) |
| API Docs | Swashbuckle / Swagger 6.6.2 |
| Xác thực | JWT Bearer 8.0.10, Google OAuth 8.0.10, Identity.Core |
| MFA | Otp.NET 1.4.0 (TOTP) |
| Cache/Session | StackExchange.Redis 2.7.27 |
| Email | MailKit 4.8.0 |
| Lưu trữ file | CloudinaryDotNet 1.27.4 |
| Cấu hình env | DotNetEnv 3.1.1 |

### 4.2. Cấu trúc dự án (kiến trúc module)

```
TH.WebAPI/
├── TH.WebAPI/                    # Project API chính
│   ├── Controllers/
│   │   ├── Auth/                 # 10 controller xác thực & phân quyền
│   │   ├── Asset/                # 6 nhóm nghiệp vụ tài sản
│   │   └── Base/                 # 6 controller quản lý tòa nhà
│   ├── Migrations/               # EF Core migrations
│   ├── Program.cs                # Cấu hình khởi động
│   ├── appsettings.json
│   └── Dockerfile
└── Service/                      # Tầng service dạng module
    ├── Auth/    (ApplicationService / Domain / Dtos / Infrastructure)
    ├── Asset/   (ApplicationService / Domain / Dtos / Infrastructure)
    ├── Base/    (ApplicationService / Domain / Dtos / Infrastructure)
    └── Shared/  (TH.Constant / TH.Shared.ApplicationService)
```

Mỗi module có 4 tầng: **ApplicationService** (logic nghiệp vụ), **Domain** (entity), **Dtos** (DTO), **Infrastructure** (DbContext, repository).

### 4.3. Các Controller chính

**Module Auth (10):** `AccountController`, `LoginController`, `RegisterController`, `UserController`, `PermissionController`, `RoleController`, `RolePermissionController`, `UserRoleController`, `AuditLogController`, `UserSessionController`.

**Module Asset (6 nhóm):** Core (Asset, AssetCategory), Maintenance, Incident, Inventory, Vendor, System.

**Module Base (6):** `ApartmentController`, `ResidentController`, `NotificationTemplateController`, `NotificationController`, `FeeTypeController`, `FeeController`.

### 4.4. Các Service tiêu biểu

- **Auth**: `AuthLoginService`, `AuthRegisterService`, `MfaService`, `PasswordChangeService`, `AuthUserSessionService`, `AuthAuditLogService`, `EmailService`, `CloudinaryService`, các service Role/Permission.
- **Asset**: `AssetService` (CRUD + khấu hao + QR), `MaintenanceService`, `IncidentService`, `InventoryService`, `VendorService`, `SystemService`.
- **OCR (nổi bật)**: `IInvoiceOcrEngine` → `VietOcrEngine` / `MockOcrEngine`, xử lý nền qua `OcrProcessingWorker` + `OcrJobQueue`.

### 4.5. Xác thực & phân quyền

- **JWT Bearer**: AccessToken (~30 phút) + RefreshToken (~7 ngày), có **token rotation** và `tokenVersion` để vô hiệu hóa.
- **3 phương thức đăng nhập**: Email/Mật khẩu, Google OAuth 2.0, luồng riêng cho Mobile (trả token trong body thay vì cookie).
- **MFA/TOTP** qua ứng dụng authenticator (Otp.NET).
- **Cookie HttpOnly + CSRF token** cho web; **đa thiết bị** (session theo thiết bị, logout từng/tất cả thiết bị).
- **RBAC**: phân quyền chi tiết theo resource + action; policy tùy biến (`AssetCreate`, `AssetUpdate`, `AccountMfaSetup`...).
- **Xác thực email** & **đặt lại mật khẩu** qua email.

### 4.6. Triển khai (Deployment)

- **Dockerfile**: multi-stage build, base `dotnet/aspnet:8.0`, cổng **8080**, entrypoint `dotnet TH.WebAPI.dll`.
- **fly.toml**: app `townhub-new`, region `iad`, force HTTPS, auto-stop/start, 1GB RAM, shared CPU.
- **Kết nối CSDL**: ưu tiên `appsettings.json` → biến môi trường `DATABASE_URL` → file `.env`. Hỗ trợ URL PostgreSQL và Npgsql KV format.
- **Forwarded Headers** cho proxy (Fly.io/Koyeb).

### 4.7. Tính năng nổi bật backend

- Xử lý **OCR hóa đơn** bất đồng bộ (background worker) bằng VietOCR.
- **Cloudinary** lưu ảnh (avatar, tài sản, hóa đơn).
- **Email** xác thực/OTP/đặt lại mật khẩu qua MailKit.
- **Audit logging** đầy đủ mọi hành động.
- **Khấu hao tài sản** (đường thẳng, số dư giảm dần), theo dõi chi phí, giá trị còn lại.
- **Quy trình mua sắm** Request → PO → Approval → Invoice (workflow nhiều cấp).
- **IoT sensor readings**, **SLA & leo thang sự cố**, **seed dữ liệu** ban đầu.

---

## 5. Frontend — datn (Next.js 16 + React 19)

### 5.1. Công nghệ

| Hạng mục | Công nghệ |
|----------|-----------|
| Framework | Next.js 16.2.1 (App Router) |
| UI | React 19.2.4, TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 (CSS variables, OKLch, dark mode) |
| Component | Radix UI (29+ primitives), class-variance-authority |
| Icon/Animation | lucide-react, motion (Framer Motion API), tw-animate-css |
| Form | react-hook-form 7.55, input-otp (MFA) |
| Biểu đồ | recharts 2.15 |
| QR Code | qrcode (sinh), jsqr (quét) |
| Khác | sonner (toast), next-themes, date-fns, embla-carousel, vaul |

### 5.2. Các route chính (App Router)

Tất cả nằm trong route group `(dashboard)` có kiểm tra đăng nhập:

- **Dashboard & Auth**: `/`, `/login` (có MFA), `/register`
- **Người dùng & phân quyền**: `/users`, `/roles`, `/permissions`, `/permissions/assign`, `/audit-logs`, `/admin/system-jobs`
- **Tài sản**: `/assets`, `/assets/[id]`, `/assets/scan` (quét QR), `/assets/categories`, `/assets/depreciation`
- **Bảo trì (PM)**: `/pm/work-orders`, `/pm/work-orders/[id]` (+ `/checkin`, `/checklist`, `/review`), `/pm/schedules`
- **Sự cố (CM)**: `/tickets`, `/tickets/[id]`, `/tickets/new`, `/tickets/sla-dashboard`, `/my-tickets/[id]`
- **Kho**: `/inventory`, `/inventory/catalog`, `/inventory/stock-taking`, `/inventory/transactions/new`, `/inventory/virtual`
- **Mua sắm**: `/procurement/requests`, `/procurement/orders`, `/procurement/invoices`, `/procurement/ocr/new`, `/procurement/ocr/[id]/result`, `/procurement/ocr/[id]/verify`
- **Nhà cung cấp**: `/vendors`, `/vendors/[id]`, `/vendors/contracts`, `/vendors/performance`
- **Thông báo & báo cáo**: `/notifications`, `/notification-templates`, `/send-notification`, `/reports`, `/reports/kpi`, `/reports/cost`
- **Cài đặt**: `/settings`, `/settings/sla`, `/profile`

### 5.3. Tổ chức component

Chia theo module nghiệp vụ: `assets/`, `pm/`, `cm/`, `inventory/`, `procurement/`, `vendors/`, `reports/`, `auth/`, `system/`.

**Component dùng chung (`shared/`)**: `DataTable` (bảng sắp xếp/lọc), `EntityModal` (CRUD dialog), `FilterBar`, `PageHeader`, `StatCard`, `StatusBadge`, `states` (Loading/Empty/Error), `PhotoCapture`, `ThemeToggle`.

**`ui/`**: 60+ wrapper Radix UI (button, dialog, table, form, select, tabs...).

### 5.4. Quản lý state & dữ liệu

- **AuthContext** (`contexts/AuthContext.tsx`): user, permissions, roles, token, sessionId; phương thức `login`, `completeMfa`, `logout`, `hasPermission`, `refreshUser`, `register`.
- **Data fetching**: hook tùy biến `useApi()` / `useApiList()` (`lib/use-api.ts`) — không dùng Redux/Zustand.
- **API client**: `lib/api.ts` (~1000 dòng) gom toàn bộ endpoint theo domain; bao bọc `ApiResponse<T> { errorCode, errorMessage, data }`; tự gắn `Authorization: Bearer`, timeout 30s.
- **RBAC FE**: `lib/rbac.ts` định nghĩa catalog quyền (16 resource, nhóm CORE & MODULE) khớp với backend; menu/feature ẩn hiện theo `hasPermission()`, admin là superuser.
- **Localization**: `lib/format.ts` định dạng tiền tệ (₫), số, ngày giờ kiểu Việt Nam.
- **Mock data**: bật `NEXT_PUBLIC_USE_MOCK=1` để fallback khi API offline.

### 5.5. Luồng xác thực FE

1. Nhập thông tin → `auth.staffLogin()`.
2. Nếu cần MFA → trả `mfaTicket` → màn hình nhập OTP → `auth.verifyMFA(ticket, code)`.
3. Nhận `LoginResponse` (token, refreshToken, profile, permissions, roles) → lưu `localStorage` + cache quyền.
4. Mọi request gắn `Bearer token`; 401 → xóa token; `DashboardLayout` redirect `/login` nếu chưa đăng nhập.

### 5.6. Scripts

```bash
npm run dev      # Dev server http://localhost:3000
npm run build    # Build production
npm run start    # Chạy production
npm run lint     # ESLint
```

> Cấu hình: `NEXT_PUBLIC_API_URL` trỏ tới backend (mặc định `http://localhost:5000`).
> Lưu ý: `AGENTS.md` cảnh báo đây là **Next.js 16.2.1** có breaking changes — nên đọc `node_modules/next/dist/docs/` trước khi viết code.

---

## 6. Cơ sở dữ liệu (PostgreSQL)

Backend sử dụng 3 schema: `auth`, `asset`, `base`. File `createDB.txt` mô tả mô hình **quản lý tài sản kế toán** với các bảng chính (tên tiếng Việt không dấu):

### 6.1. Các kiểu ENUM

- `trang_thai_tai_san`: `dang_su_dung`, `dang_bao_tri`, `nhan_roi`, `da_thanh_ly`
- `loai_vai_tro`: `quan_tri_vien`, `ke_toan`, `nhan_vien_it`, `quan_ly`, `giam_doc`
- `loai_dieu_chuyen`: `cap_phat`, `thu_hoi`, `luan_chuyen`
- `trang_thai_bao_tri`: `cho_xu_ly`, `dang_thuc_hien`, `da_hoan_thanh`
- `trang_thai_thanh_ly`: `cho_duyet`, `da_duyet`, `da_hoan_thanh`
- `loai_chung_tu`: `ghi_tang`, `khau_hao`, `bao_tri`, `thanh_ly`
- `phuong_phap_khau_hao`: `duong_thang`, `so_du_giam_dan`, `tong_so_nam`

### 6.2. Các bảng chính

| Bảng | Mô tả |
|------|-------|
| `nguoi_dung` | Người dùng (vai trò, phòng ban, trạng thái) |
| `phong_ban` | Phòng ban |
| `tai_khoan_ke_toan` | Tài khoản kế toán (211, 214, 627, 711, 811...) — phân cấp cha/con |
| `danh_muc_tai_san` | Danh mục tài sản (tiền tố sinh mã, thời gian khấu hao mặc định) |
| `cau_hinh_he_thong` | Cấu hình công ty, định dạng mã, phương pháp khấu hao mặc định |
| `lo_tai_san` | Lô tài sản (mua hàng loạt) |
| `tai_san` | **Tài sản** — mã, nguyên giá, khấu hao lũy kế, giá trị còn lại, thông số kỹ thuật (JSON), trạng thái |
| `dieu_chuyen_tai_san` | Điều chuyển (cấp phát/thu hồi/luân chuyển) giữa phòng ban & người dùng |
| `bao_tri_tai_san` | Bảo trì (chi phí, sửa chữa/nâng cấp, nhà cung cấp) |
| `thanh_ly_tai_san` | Thanh lý (giá trị thu về, lãi/lỗ) |
| `lich_su_khau_hao` | Lịch sử khấu hao theo kỳ (VD: 2026-02) |
| `chung_tu` | Chứng từ kế toán (ghi tăng/khấu hao/bảo trì/thanh lý) |
| `chi_tiet_chung_tu` | Bút toán Nợ/Có liên kết tài sản |

**Quan hệ chính**: `tai_san` là trung tâm — liên kết tới `danh_muc_tai_san`, `lo_tai_san`, `phong_ban`, `nguoi_dung`, `tai_khoan_ke_toan`; các bảng `dieu_chuyen/bao_tri/thanh_ly/lich_su_khau_hao/chi_tiet_chung_tu` đều tham chiếu `tai_san`.

> Lưu ý: schema thực tế trong backend (EF Core) phong phú hơn `createDB.txt` — gồm cả các domain PM, CM, Inventory, Procurement, Vendor, IoT. File `createDB.txt` chỉ phản ánh phần lõi tài sản & kế toán.

---

## 7. Mô hình AI (thư mục AI/)

| Notebook | Nội dung |
|----------|----------|
| `Fuzzy_Matching_best.ipynb` | Fine-tune **T5** (transformers/PyTorch) cho bài toán fuzzy matching / điền tên đầy đủ từ chữ viết tắt. Có GPU detection, train/test data, Trainer. |
| `Resume_Paser_best.ipynb` | **Resume Parser** dùng spaCy + spacy-transformers + PyMuPDF (NER trích xuất thông tin từ CV PDF). Chạy trên Google Colab (mount Drive). |

> Các notebook này phục vụ nghiên cứu/POC; phần OCR hóa đơn được tích hợp vào backend qua `VietOcrEngine`.

---

## 8. Hướng dẫn chạy nhanh

### Backend
```bash
cd TH.WebAPI/TH.WebAPI
# Cấu hình ConnectionStrings:Default hoặc biến môi trường DATABASE_URL (PostgreSQL)
dotnet restore
dotnet run            # Swagger UI khả dụng để xem API
```

### Frontend
```bash
cd datn
npm install
# Tạo .env.local: NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev           # http://localhost:3000
```

### Cơ sở dữ liệu
- Tạo database PostgreSQL, EF Core migrations sẽ áp dụng (hoặc bật cờ `ASSET_AUTO_MIGRATE`).
- Tham khảo `createDB.txt` cho mô hình phần tài sản/kế toán.

---

## 9. Bảng tổng kết

| Thành phần | Công nghệ | Vai trò |
|------------|-----------|---------|
| Backend | .NET 8 Web API, EF Core, PostgreSQL | API nghiệp vụ, RBAC, OCR, khấu hao |
| Frontend | Next.js 16, React 19, Tailwind v4 | Dashboard quản trị đa module |
| CSDL | PostgreSQL (schema auth/asset/base) | Lưu trữ dữ liệu |
| Cache | Redis | Session, MFA state |
| Lưu trữ | Cloudinary | Ảnh/file |
| Email | MailKit | Xác thực, OTP |
| AI | T5, spaCy, VietOCR | OCR hóa đơn, NLP |
| Triển khai | Docker, Fly.io | Hosting |

---

*Tài liệu được tạo tự động bằng cách phân tích toàn bộ mã nguồn dự án.*
