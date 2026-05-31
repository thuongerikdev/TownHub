// Dữ liệu mẫu xem trước UI Sự cố (CM) khi backend chưa kết nối.
import type { SlaConfigResponse, TicketResponse } from "@/lib/api";

const BUILDING = "11111111-1111-1111-1111-111111111111";

export const mockSlaConfigs: SlaConfigResponse[] = [
  { id: "sla1", name: "SLA Khẩn cấp — Điện/Thang máy", buildingId: BUILDING, issueCategory: "ELECTRICAL", priorityLevel: "CRITICAL", responseTimeHours: 1, resolutionTimeHours: 4, escalationL1AfterHours: 1, escalationL2AfterHours: 2, escalationL3AfterHours: 3, businessHoursOnly: false, isActive: true },
  { id: "sla2", name: "SLA Cao — HVAC/Nước", buildingId: BUILDING, issueCategory: "HVAC", priorityLevel: "HIGH", responseTimeHours: 2, resolutionTimeHours: 8, escalationL1AfterHours: 4, businessHoursOnly: false, isActive: true },
  { id: "sla3", name: "SLA Trung bình", buildingId: BUILDING, priorityLevel: "MEDIUM", responseTimeHours: 4, resolutionTimeHours: 24, businessHoursOnly: true, isActive: true },
  { id: "sla4", name: "SLA Thấp", buildingId: BUILDING, priorityLevel: "LOW", responseTimeHours: 8, resolutionTimeHours: 72, businessHoursOnly: true, isActive: true },
];

export const mockTickets: TicketResponse[] = [
  { id: "tk1", ticketCode: "TKT-2026-0158", status: "OPEN", buildingId: BUILDING, assetId: "a1", assetCode: "AST-2025-0042", reportedBy: "Cư dân P.1204", slaConfigId: "sla1", slaConfigName: "SLA Khẩn cấp — Điện/Thang máy", title: "Thang máy T12 không hoạt động", description: "Thang dừng giữa tầng 7-8, có người mắc kẹt.", category: "ELEVATOR", priority: "CRITICAL", source: "RESIDENT", autoClosed: false, createdAt: "2026-05-31T07:30:00Z", updatedAt: "2026-05-31T07:30:00Z" },
  { id: "tk2", ticketCode: "TKT-2026-0156", status: "ASSIGNED", buildingId: BUILDING, reportedBy: "Bảo vệ ca sáng", slaConfigId: "sla1", slaConfigName: "SLA Khẩn cấp — Điện/Thang máy", title: "Cửa tầng 8 bị kẹt", description: "Cửa thoát hiểm tầng 8 không đóng được.", category: "OTHER", priority: "CRITICAL", source: "STAFF", autoClosed: false, createdAt: "2026-05-31T06:00:00Z", updatedAt: "2026-05-31T06:20:00Z" },
  { id: "tk3", ticketCode: "TKT-2026-0155", status: "IN_PROGRESS", buildingId: BUILDING, unitId: "P.502", assetId: "a4", assetCode: "AST-2025-0045", reportedBy: "Cư dân P.502", slaConfigId: "sla2", slaConfigName: "SLA Cao — HVAC/Nước", title: "Điều hoà P.502 không lạnh", category: "HVAC", priority: "MEDIUM", source: "RESIDENT", autoClosed: false, createdAt: "2026-05-30T09:00:00Z", updatedAt: "2026-05-30T11:00:00Z" },
  { id: "tk4", ticketCode: "TKT-2026-0151", status: "IN_PROGRESS", buildingId: BUILDING, assetId: "a2", assetCode: "AST-2025-0043", reportedBy: "Cảm biến IoT", slaConfigId: "sla2", slaConfigName: "SLA Cao — HVAC/Nước", title: "Bơm nước khu A không lên áp", description: "Áp lực nước tầng cao thấp bất thường.", category: "PLUMBING", priority: "HIGH", source: "IOT", autoClosed: false, createdAt: "2026-05-29T14:00:00Z", updatedAt: "2026-05-30T08:00:00Z" },
  { id: "tk5", ticketCode: "TKT-2026-0149", status: "RESOLVED", buildingId: BUILDING, reportedBy: "Cư dân P.305", slaConfigId: "sla4", slaConfigName: "SLA Thấp", title: "Đèn hành lang tầng 3 hỏng", category: "ELECTRICAL", priority: "LOW", source: "RESIDENT", resolvedAt: "2026-05-29T10:00:00Z", autoClosed: false, resolutionNote: "Đã thay bóng LED.", createdAt: "2026-05-28T15:00:00Z", updatedAt: "2026-05-29T10:00:00Z" },
  { id: "tk6", ticketCode: "TKT-2026-0140", status: "CLOSED", buildingId: BUILDING, assetId: "a5", assetCode: "AST-2025-0046", reportedBy: "QL Vận hành", slaConfigId: "sla1", slaConfigName: "SLA Khẩn cấp — Điện/Thang máy", title: "Mất điện khu B tầng hầm", category: "ELECTRICAL", priority: "HIGH", source: "STAFF", resolvedAt: "2026-05-25T12:00:00Z", closedAt: "2026-05-26T02:00:00Z", autoClosed: false, resolutionNote: "Reset MCCB nhánh 3, kiểm tra tải.", createdAt: "2026-05-25T08:00:00Z", updatedAt: "2026-05-26T02:00:00Z" },
];
