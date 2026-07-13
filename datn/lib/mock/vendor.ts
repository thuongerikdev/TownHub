// Dữ liệu mẫu xem trước UI Nhà thầu khi backend chưa kết nối.
import type {
  VendorResponse, VendorContractResponse, VendorEvaluationResponse,
} from "@/lib/api";

const BUILDING = "11111111-1111-1111-1111-111111111111";

export const mockVendors: VendorResponse[] = [
  { id: "v1", vendorCode: "VND-001", name: "Mitsubishi Elevator Vietnam", taxId: "0301234567", status: "ACTIVE", contactName: "Trần Văn Hùng", contactEmail: "hung.tran@mitsubishi-elevator.vn", contactPhone: "0901234567", address: "Số 5 Lê Duẩn, Q.1, TP.HCM" },
  { id: "v2", vendorCode: "VND-002", name: "Daikin Air Conditioning VN", taxId: "0302345678", status: "ACTIVE", contactName: "Lê Thị Mai", contactEmail: "mai.le@daikin.vn", contactPhone: "0902345678", address: "KCN Amata, Biên Hoà, Đồng Nai" },
  { id: "v3", vendorCode: "VND-003", name: "EBARA Pump Vietnam", taxId: "0303456789", status: "ACTIVE", contactName: "Phạm Quốc Bảo", contactEmail: "bao.pham@ebara.vn", contactPhone: "0903456789", address: "Lô A2 KCN Tân Bình, TP.HCM" },
  { id: "v4", vendorCode: "VND-004", name: "Schneider Electric VN", taxId: "0304567890", status: "ACTIVE", contactName: "Nguyễn Hải Đăng", contactEmail: "dang.nguyen@se.com", contactPhone: "0904567890", address: "Tầng 10 toà E-Town, Q.Tân Bình, TP.HCM" },
  { id: "v5", vendorCode: "VND-005", name: "ABC Cơ điện lạnh", taxId: "0305678901", status: "BLACKLISTED", blacklistReason: "Chậm tiến độ nhiều lần, chất lượng không đạt.", blacklistedAt: "2026-03-15T00:00:00Z", blacklistedBy: "QL Kỹ thuật", contactName: "Vũ Văn Tài", contactPhone: "0905678901" },
];

export const mockVendorContracts: VendorContractResponse[] = [
  { id: "ct1", contractCode: "HD-2025-001", vendorId: "v1", vendorName: "Mitsubishi Elevator Vietnam", buildingId: BUILDING, startDate: "2025-01-01T00:00:00Z", endDate: "2026-12-31T00:00:00Z", contractValue: 500_000_000, currency: "VND", paymentTerms: "Thanh toán theo quý", renewalNoticeDays: 60, status: "ACTIVE", scopeOfWork: "Bảo trì toàn bộ thang máy khu A & B." },
  { id: "ct2", contractCode: "HD-2025-002", vendorId: "v2", vendorName: "Daikin Air Conditioning VN", buildingId: BUILDING, startDate: "2025-03-01T00:00:00Z", endDate: "2026-06-30T00:00:00Z", contractValue: 180_000_000, currency: "VND", paymentTerms: "Thanh toán theo tháng", renewalNoticeDays: 30, status: "ACTIVE", scopeOfWork: "Bảo trì hệ thống điều hoà trung tâm." },
  { id: "ct3", contractCode: "HD-2024-008", vendorId: "v3", vendorName: "EBARA Pump Vietnam", buildingId: BUILDING, startDate: "2024-06-01T00:00:00Z", endDate: "2026-05-20T00:00:00Z", contractValue: 90_000_000, currency: "VND", paymentTerms: "Thanh toán 1 lần", renewalNoticeDays: 30, status: "EXPIRED", scopeOfWork: "Bảo trì hệ thống bơm nước sinh hoạt." },
];

export const mockVendorEvaluations: VendorEvaluationResponse[] = [
  { id: "ev1", vendorId: "v1", vendorName: "Mitsubishi Elevator Vietnam", contractId: "ct1", contractCode: "HD-2025-001", evaluatorId: "QL Kỹ thuật", evaluationDate: "2026-04-01T00:00:00Z", overallScore: 4.6, qualityScore: 5, timelinessScore: 4, costScore: 4, safetyScore: 5, comments: "Đội ngũ chuyên nghiệp, phản hồi nhanh.", recommendation: "Tiếp tục hợp tác" },
  { id: "ev2", vendorId: "v2", vendorName: "Daikin Air Conditioning VN", contractId: "ct2", contractCode: "HD-2025-002", evaluatorId: "QL Kỹ thuật", evaluationDate: "2026-04-01T00:00:00Z", overallScore: 4.2, qualityScore: 4, timelinessScore: 4, costScore: 4, safetyScore: 5, recommendation: "Tiếp tục hợp tác" },
  { id: "ev3", vendorId: "v3", vendorName: "EBARA Pump Vietnam", contractId: "ct3", contractCode: "HD-2024-008", evaluatorId: "QL Kỹ thuật", evaluationDate: "2026-03-20T00:00:00Z", overallScore: 3.5, qualityScore: 3, timelinessScore: 3, costScore: 4, safetyScore: 4, comments: "Cần cải thiện tiến độ.", recommendation: "Cân nhắc gia hạn" },
];
