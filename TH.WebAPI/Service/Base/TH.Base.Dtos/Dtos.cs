using System;

namespace TH.TownHub.Dtos
{
    // ============================================================
    // APARTMENT DTOs
    // ============================================================
    public class CreateApartmentRequestDto
    {
        public required string code { get; set; }
        public required string building { get; set; }
        public int floor { get; set; }
        public required string unitNumber { get; set; }
        public required string type { get; set; }
        public decimal areaM2 { get; set; }
        public string status { get; set; } = "vacant";
        public string? note { get; set; }
    }

    public class UpdateApartmentRequestDto : CreateApartmentRequestDto
    {
        public int id { get; set; }
    }

    public class ApartmentResponse
    {
        public int id { get; set; }
        public string code { get; set; } = null!;
        public string building { get; set; } = null!;
        public int floor { get; set; }
        public string unitNumber { get; set; } = null!;
        public string type { get; set; } = null!;
        public decimal areaM2 { get; set; }
        public string status { get; set; } = null!;
        public string? note { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // RESIDENT DTOs
    // ============================================================
    public class CreateResidentRequestDto
    {
        public required string fullName { get; set; }
        public required string phone { get; set; }
        public string? email { get; set; }
        public string? idCard { get; set; }
        public DateTime? dateOfBirth { get; set; }
        public string? gender { get; set; }
        // Căn hộ chỉ dùng để ở — không kinh doanh tại đây
        public int? apartmentId { get; set; }
        // UC: unit_id — FK đến units (uuid) trong schema asset
        public Guid? unitId { get; set; }
        public bool isOwner { get; set; } = false;      // true = chủ hộ, false = thuê
        public DateTime? moveInDate { get; set; }
        public string? avatarUrl { get; set; }
        public int? authUserId { get; set; }
        // UC: userId (Guid) — liên kết AuthUser khi dùng uuid
        public Guid? userId { get; set; }
        // Đánh dấu cư dân có hoạt động kinh doanh (là NCC)
        public bool isBusinessOwner { get; set; } = false;
    }

    public class UpdateResidentRequestDto : CreateResidentRequestDto
    {
        public int id { get; set; }
        public DateTime? moveOutDate { get; set; }
    }

    public class ResidentResponse
    {
        public int id { get; set; }
        public string fullName { get; set; } = null!;
        public string phone { get; set; } = null!;
        public string? email { get; set; }
        public string? idCard { get; set; }
        public DateTime? dateOfBirth { get; set; }
        public string? gender { get; set; }
        public int? apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        public Guid? unitId { get; set; }
        public bool isOwner { get; set; }           // Chủ hộ / người thuê
        public bool isBusinessOwner { get; set; }   // Có kinh doanh dịch vụ
        public DateTime? moveInDate { get; set; }
        public DateTime? moveOutDate { get; set; }
        public string? avatarUrl { get; set; }
        public int? authUserId { get; set; }
        public Guid? userId { get; set; }
        public DateTime createdAt { get; set; }
    }

    public class RegisterFaceRequestDto
    {
        public int residentId { get; set; }
        public required string imageUrl { get; set; }
    }

    public class UpdateFaceAiResultRequestDto
    {
        public required string aiStatus { get; set; }
        public string? embeddingRef { get; set; }
        public string? failureReason { get; set; }
    }

    public class FaceProfileResponse
    {
        public int id { get; set; }
        public int residentId { get; set; }
        public string residentName { get; set; } = null!;
        public string imageUrl { get; set; } = null!;
        public string aiStatus { get; set; } = null!;
        public string? failureReason { get; set; }
        public DateTime registeredAt { get; set; }
    }

    public class CreateAccessEventRequestDto
    {
        public int? residentId { get; set; }
        public string personType { get; set; } = "stranger";
        public required string direction { get; set; }
        public required string cameraName { get; set; }
        public string? snapshotUrl { get; set; }
        public double? confidence { get; set; }
        public DateTime? detectedAt { get; set; }
    }

    public class HandleAccessEventRequestDto
    {
        public string status { get; set; } = "resolved";
        public string? note { get; set; }
        public int? handledByAuthUserId { get; set; }
    }

    public class AccessEventResponse
    {
        public long id { get; set; }
        public int? residentId { get; set; }
        public string? residentName { get; set; }
        public string personType { get; set; } = null!;
        public string direction { get; set; } = null!;
        public string cameraName { get; set; } = null!;
        public string? snapshotUrl { get; set; }
        public double? confidence { get; set; }
        public string status { get; set; } = null!;
        public string? note { get; set; }
        public int? handledByAuthUserId { get; set; }
        public DateTime? handledAt { get; set; }
        public DateTime detectedAt { get; set; }
    }

    public class AnalyzeCameraFrameRequestDto
    {
        public required string imageDataUrl { get; set; }
        public required string cameraName { get; set; }
        public string direction { get; set; } = "in";
    }

    public class CameraRecognitionResponse
    {
        public bool faceDetected { get; set; }
        public bool matched { get; set; }
        public int? residentId { get; set; }
        public string? residentName { get; set; }
        public double? confidence { get; set; }
        public bool eventCreated { get; set; }
        public long? eventId { get; set; }
        public string result { get; set; } = "no_face";
        public string message { get; set; } = null!;
    }

    // ============================================================
    // NOTIFICATION TEMPLATE DTOs
    // ============================================================
    public class CreateNotificationTemplateRequestDto
    {
        public required string name { get; set; }
        public required string channel { get; set; }
        public string? subject { get; set; }
        public required string body { get; set; }
        public string? variables { get; set; }
        public bool isActive { get; set; } = true;
        public int? createdByAuthUserId { get; set; }
    }

    public class UpdateNotificationTemplateRequestDto : CreateNotificationTemplateRequestDto
    {
        public int id { get; set; }
    }

    public class NotificationTemplateResponse
    {
        public int id { get; set; }
        public string name { get; set; } = null!;
        public string channel { get; set; } = null!;
        public string? subject { get; set; }
        public string body { get; set; } = null!;
        public string? variables { get; set; }
        public bool isActive { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // NOTIFICATION DTOs
    // ============================================================
    public class CreateNotificationRequestDto
    {
        public required string title { get; set; }
        public required string content { get; set; }
        public required string channel { get; set; }
        public required string audience { get; set; }
        public int? templateId { get; set; }
        public DateTime? scheduledAt { get; set; }
        public int createdByAuthUserId { get; set; }

        // ── Individual notification fields (UC63) ──
        // Dùng khi push tới 1 người cụ thể (không bắt buộc với broadcast)
        public Guid? recipientId { get; set; }
        public string? referenceType { get; set; }  // TICKET | WORK_ORDER | INVOICE…
        public Guid? referenceId { get; set; }
        public string? body { get; set; }           // nội dung chi tiết
        public string sendStatus { get; set; } = "PENDING"; // PENDING | SENT | FAILED
    }

    public class UpdateNotificationRequestDto : CreateNotificationRequestDto
    {
        public int id { get; set; }
    }

    public class NotificationResponse
    {
        public int id { get; set; }
        public string title { get; set; } = null!;
        public string content { get; set; } = null!;
        public string channel { get; set; } = null!;
        public string audience { get; set; } = null!;
        public string status { get; set; } = null!;
        public int totalRecipients { get; set; }
        public int sentCount { get; set; }
        public int failedCount { get; set; }
        public DateTime? scheduledAt { get; set; }
        public DateTime? sentAt { get; set; }
        public int createdByAuthUserId { get; set; }

        // Individual notification fields
        public Guid? recipientId { get; set; }
        public string? referenceType { get; set; }
        public Guid? referenceId { get; set; }
        public string? body { get; set; }
        public bool isRead { get; set; }
        public DateTime? readAt { get; set; }
        public string sendStatus { get; set; } = "PENDING";

        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // INCIDENT DTOs
    // ============================================================
    public class CreateIncidentRequestDto
    {
        public required string title { get; set; }
        public string? description { get; set; }
        public string? location { get; set; }
        public int? apartmentId { get; set; }
        public required string category { get; set; }
        public required string priority { get; set; }
        public int reportedByAuthUserId { get; set; }
        public int? assignedToAuthUserId { get; set; }
        public string? attachments { get; set; }
    }

    public class UpdateIncidentRequestDto : CreateIncidentRequestDto
    {
        public int id { get; set; }
        public required string status { get; set; }
        public string? resolutionNote { get; set; }
    }

    public class IncidentResponse
    {
        public int id { get; set; }
        public string title { get; set; } = null!;
        public string? description { get; set; }
        public string? location { get; set; }
        public int? apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        public string category { get; set; } = null!;
        public string priority { get; set; } = null!;
        public string status { get; set; } = null!;
        public int reportedByAuthUserId { get; set; }
        public int? assignedToAuthUserId { get; set; }
        public DateTime? resolvedAt { get; set; }
        public string? resolutionNote { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // FEE TYPE DTOs
    // ============================================================
    public class CreateFeeTypeRequestDto
    {
        public required string name { get; set; }
        public string? description { get; set; }
        public decimal unitPrice { get; set; }
        public bool isPerM2 { get; set; } = false;
    }

    public class UpdateFeeTypeRequestDto : CreateFeeTypeRequestDto
    {
        public int id { get; set; }
    }

    public class FeeTypeResponse
    {
        public int id { get; set; }
        public string name { get; set; } = null!;
        public string? description { get; set; }
        public decimal unitPrice { get; set; }
        public bool isPerM2 { get; set; }
        public bool isActive { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // FEE DTOs
    // ============================================================
    public class CreateFeeRequestDto
    {
        public int apartmentId { get; set; }
        public int feeTypeId { get; set; }
        public required string billingMonth { get; set; }
        public decimal amount { get; set; }
        public DateTime dueDate { get; set; }
        public int? createdByAuthUserId { get; set; }
        public string? note { get; set; }
    }

    public class UpdateFeeStatusRequestDto
    {
        public int id { get; set; }
        public required string status { get; set; }
        public string? paymentMethod { get; set; }
        public string? paymentRef { get; set; }
    }

    public class FeeResponse
    {
        public int id { get; set; }
        public int apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        public int feeTypeId { get; set; }
        public string? feeTypeName { get; set; }
        public string billingMonth { get; set; } = null!;
        public decimal amount { get; set; }
        public DateTime dueDate { get; set; }
        public string status { get; set; } = null!;
        public DateTime? paidAt { get; set; }
        public string? paymentMethod { get; set; }
        public string? paymentRef { get; set; }
        public string? note { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // SYSTEM CONFIG DTOs
    // ============================================================
    public class UpdateSystemConfigRequestDto
    {
        public required string key { get; set; }
        public required string value { get; set; }
        public int? updatedByAuthUserId { get; set; }
        // UC: scope — phạm vi cấu hình (GLOBAL | BUILDING | MODULE)
        public string? scope { get; set; }
        // UC: updatedBy (Guid) — khi cần trace cross-service bằng UUID
        public Guid? updatedBy { get; set; }
    }

    public class SystemConfigResponse
    {
        public int id { get; set; }
        public string key { get; set; } = null!;
        public string value { get; set; } = null!;
        public string dataType { get; set; } = null!;
        public string? description { get; set; }
        public bool isPublic { get; set; }
        public string? scope { get; set; }
        public DateTime updatedAt { get; set; }
    }

    // ============================================================
    // AUDIT LOG DTOs
    // ============================================================
    public class CreateAuditLogRequestDto
    {
        public int actorAuthUserId { get; set; }
        public required string action { get; set; }
        public string? targetType { get; set; }
        public int? targetId { get; set; }
        public string? oldData { get; set; }
        public string? newData { get; set; }
        public string? ipAddress { get; set; }
        public string? userAgent { get; set; }

        // ── DB-level audit fields (từ Asset module) ──
        public string? tableName { get; set; }   // tên bảng bị thay đổi
        public Guid? recordId { get; set; }      // UUID bản ghi
        public Guid? changedBy { get; set; }     // UUID người thực hiện (cross-service)
    }

    public class AuditLogResponse
    {
        public long id { get; set; }
        public int actorAuthUserId { get; set; }
        public string action { get; set; } = null!;
        public string? targetType { get; set; }
        public int? targetId { get; set; }
        public string? tableName { get; set; }
        public Guid? recordId { get; set; }
        public Guid? changedBy { get; set; }
        public string? ipAddress { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // PROVIDER DTOs
    // ============================================================
    public class RegisterProviderRequestDto
    {
        public required string companyName { get; set; }
        public required string contactName { get; set; }
        public required string phone { get; set; }
        public string? email { get; set; }
        public string? address { get; set; }
        public string? serviceCategories { get; set; }  // JSON array
        // Nếu NCC là cư dân trong toà nhà — hệ thống sẽ đánh dấu IsBusinessOwner = true
        public int? residentId { get; set; }
    }

    // Hộ dân đã có tài khoản tự nộp đơn đăng ký NCC — authUserId lấy từ token
    public class SelfRegisterProviderRequestDto
    {
        public int authUserId { get; set; }             // ID tài khoản đang đăng nhập
        public required string companyName { get; set; }
        public string? contactName { get; set; }        // nếu null → tự lấy từ hồ sơ cư dân
        public string? phone { get; set; }              // nếu null → tự lấy từ hồ sơ cư dân
        public string? email { get; set; }
        public string? address { get; set; }
        public string? serviceCategories { get; set; }  // JSON array
    }

    public class ApproveProviderRequestDto
    {
        public int id { get; set; }
        public int approvedByAuthUserId { get; set; }
    }

    public class RejectProviderRequestDto
    {
        public int id { get; set; }
        public required string reason { get; set; }
    }

    public class ProviderResponse
    {
        public int id { get; set; }
        public string companyName { get; set; } = null!;
        public string contactName { get; set; } = null!;
        public string phone { get; set; } = null!;
        public string? email { get; set; }
        public string? address { get; set; }
        public string? serviceCategories { get; set; }
        public string registrationStatus { get; set; } = null!;
        public string? rejectionReason { get; set; }
        public int? approvedByAuthUserId { get; set; }
        public DateTime? approvedAt { get; set; }
        // Nếu NCC là cư dân
        public int? residentId { get; set; }
        public string? residentFullName { get; set; }
        public string? residentApartmentCode { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // SERVICE REQUEST DTOs
    // ============================================================
    public class CreateServiceRequestDto
    {
        public required string title { get; set; }
        public string? description { get; set; }
        public required string category { get; set; }
        public int? apartmentId { get; set; }
        public bool requiresMgtApproval { get; set; } = false;
        public int requestedByAuthUserId { get; set; }
        public int? providerId { get; set; }
        public DateTime? scheduledDate { get; set; }
        public string? note { get; set; }
    }

    public class ApproveByMgtRequestDto
    {
        public int id { get; set; }
        public int approvedByAuthUserId { get; set; }
    }

    public class RejectByMgtRequestDto
    {
        public int id { get; set; }
        public required string reason { get; set; }
    }

    public class AcceptByProviderRequestDto
    {
        public int id { get; set; }
        public int providerId { get; set; }
        // NCC xác nhận/điều chỉnh thời điểm thợ đến — nếu null thì giữ nguyên thời gian cư dân đã đề xuất
        public DateTime? scheduledDate { get; set; }
    }

    public class RejectByProviderRequestDto
    {
        public int id { get; set; }
        public required string reason { get; set; }
    }

    public class UpdateServiceRequestStatusDto
    {
        public int id { get; set; }
        public required string status { get; set; }  // in_progress | completed
    }

    public class ServiceRequestResponse
    {
        public int id { get; set; }
        public string title { get; set; } = null!;
        public string? description { get; set; }
        public string category { get; set; } = null!;
        public int? apartmentId { get; set; }
        public string? apartmentCode { get; set; }
        // Thông tin liên hệ người gửi yêu cầu — để NCC biết cách liên lạc
        public string? requesterName { get; set; }
        public string? requesterPhone { get; set; }
        public string? requesterApartmentCode { get; set; }
        public bool requiresMgtApproval { get; set; }
        public string status { get; set; } = null!;
        public int? providerId { get; set; }
        public string? providerCompanyName { get; set; }
        public int requestedByAuthUserId { get; set; }
        public int? mgtApprovedByAuthUserId { get; set; }
        public DateTime? mgtApprovedAt { get; set; }
        public string? mgtRejectionReason { get; set; }
        public string? providerRejectionReason { get; set; }
        public DateTime? scheduledDate { get; set; }
        public DateTime? completedAt { get; set; }
        public string? note { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // PROVIDER SERVICE LISTING DTOs — Dịch vụ NCC đăng ký
    // ============================================================

    // NCC đăng ký một dịch vụ cụ thể
    public class RegisterServiceListingDto
    {
        public int providerId { get; set; }
        public required string name { get; set; }
        public required string category { get; set; }   // plumbing | electrical | cleaning | renovation | camera | other
        public string? description { get; set; }

        // Thông tin liên hệ cho dịch vụ (có thể khác với thông tin NCC)
        public string? contactPhone { get; set; }
        public string? contactEmail { get; set; }
        public string? contactAddress { get; set; }

        // Bảng giá — JSON array, giá theo khoảng (báo giá thực tế tùy hiện trạng sửa chữa)
        // Ví dụ: [{"name":"Sửa ổ điện","unit":"cái","priceFrom":100000,"priceTo":200000}]
        public string? priceList { get; set; }
    }

    public class UpdateServiceListingDto
    {
        public int id { get; set; }
        public required string name { get; set; }
        public required string category { get; set; }
        public string? description { get; set; }
        public string? contactPhone { get; set; }
        public string? contactEmail { get; set; }
        public string? contactAddress { get; set; }
        // Bảng giá — JSON array, giá theo khoảng. Ví dụ: [{"name":"...","unit":"...","priceFrom":100000,"priceTo":200000}]
        public string? priceList { get; set; }
    }

    public class ApproveServiceListingDto
    {
        public int id { get; set; }
        public int approvedByAuthUserId { get; set; }
    }

    public class RejectServiceListingDto
    {
        public int id { get; set; }
        public required string reason { get; set; }
    }

    public class ServiceListingResponse
    {
        public int id { get; set; }
        public int providerId { get; set; }
        public string? providerCompanyName { get; set; }
        public string? providerPhone { get; set; }
        public string name { get; set; } = null!;
        public string category { get; set; } = null!;
        public string? description { get; set; }
        public string? contactPhone { get; set; }
        public string? contactEmail { get; set; }
        public string? contactAddress { get; set; }
        public string? priceList { get; set; }
        public string status { get; set; } = null!;
        public string? rejectionReason { get; set; }
        public int? approvedByAuthUserId { get; set; }
        public DateTime? approvedAt { get; set; }
        public DateTime createdAt { get; set; }
    }

    // ============================================================
    // REGISTRATION DTOs — Tạo tài khoản theo từng đối tượng
    // ============================================================

    // Admin tạo tài khoản Ban Quản Lý — không có căn hộ
    public class CreateBQLAccountRequestDto
    {
        public required string userName { get; set; }
        public required string email { get; set; }
        public required string password { get; set; }
        public string? firstName { get; set; }
        public string? lastName { get; set; }
        public string? gender { get; set; }
        public DateTime? dateOfBirth { get; set; }
        // ID các role BQL cần gán; bỏ trống → gán role BQL mặc định
        public List<int>? roleIds { get; set; }
    }

    // BQL / Admin tạo tài khoản Cư dân — có căn hộ để ở
    // Nếu cư dân có kinh doanh → hệ thống tạo thêm hồ sơ NCC (chờ duyệt)
    public class CreateResidentAccountRequestDto
    {
        // --- Thông tin đăng nhập ---
        public required string userName { get; set; }
        public required string email { get; set; }
        public required string password { get; set; }

        // --- Hồ sơ cư dân ---
        public required string fullName { get; set; }
        public required string phone { get; set; }
        public string? idCard { get; set; }
        public DateTime? dateOfBirth { get; set; }
        public string? gender { get; set; }
        public string? avatarUrl { get; set; }

        // --- Căn hộ (chỉ dùng để ở) ---
        public int? apartmentId { get; set; }
        public bool isOwner { get; set; } = false;      // true = chủ hộ, false = người thuê
        public DateTime? moveInDate { get; set; }

        // --- Kinh doanh dịch vụ (nếu có) ---
        public bool isBusinessOwner { get; set; } = false;
        public string? businessCompanyName { get; set; }        // Tên công ty / hộ kinh doanh
        public string? businessServiceCategories { get; set; }  // JSON array
        public string? businessAddress { get; set; }
    }

    // ============================================================
    // FILE STORAGE DTOs
    // ============================================================
    public class CreateFileRequestDto
    {
        public required string originalName { get; set; }
        public required string storageKey { get; set; }
        public required string url { get; set; }
        public string? mimeType { get; set; }
        public long? sizeBytes { get; set; }
        public string? entityType { get; set; }
        public int? entityId { get; set; }
        public int uploadedByAuthUserId { get; set; }
    }

    public class FileStorageResponse
    {
        public int id { get; set; }
        public string originalName { get; set; } = null!;
        public string url { get; set; } = null!;
        public string? mimeType { get; set; }
        public long? sizeBytes { get; set; }
        public string? entityType { get; set; }
        public int? entityId { get; set; }
        public int uploadedByAuthUserId { get; set; }
        public DateTime createdAt { get; set; }
    }
}
