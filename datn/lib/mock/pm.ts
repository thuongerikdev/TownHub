// Dữ liệu mẫu xem trước UI Bảo trì định kỳ (PM) khi backend chưa kết nối.
import type {
  ChecklistTemplateResponse, ChecklistTemplateItemResponse,
  MaintenanceScheduleResponse, WorkOrderResponse,
} from "@/lib/api";

const BUILDING = "11111111-1111-1111-1111-111111111111";

export const mockChecklistTemplates: ChecklistTemplateResponse[] = [
  { id: "t1", code: "ELEV-60", name: "Bảo trì thang máy 60 ngày", categoryId: "c1", categoryName: "Thang máy" },
  { id: "t2", code: "PUMP-30", name: "Bảo trì máy bơm 30 ngày", categoryId: "c3", categoryName: "Hệ thống bơm nước" },
  { id: "t3", code: "GEN-90", name: "Bảo trì máy phát 90 ngày", categoryId: "c4", categoryName: "Máy phát điện" },
  { id: "t4", code: "HVAC-30", name: "Bảo trì điều hoà 30 ngày", categoryId: "c2", categoryName: "Điều hoà không khí" },
];

export const mockMaintenanceSchedules: MaintenanceScheduleResponse[] = [
  { id: "sch1", assetId: "a1", assetCode: "AST-2025-0042", assetName: "Thang máy khách T1", scheduleType: "PM", checklistTemplateId: "t1", checklistTemplateName: "Bảo trì thang máy 60 ngày", frequencyType: "INTERVAL", frequencyDays: 60, startDate: "2025-01-01T00:00:00Z", nextDueDate: "2026-06-05T00:00:00Z", lastExecutedAt: "2026-04-06T00:00:00Z", leadTimeDays: 7, isActive: true, description: "Bảo trì định kỳ thang máy khách theo hợp đồng." },
  { id: "sch2", assetId: "a2", assetCode: "AST-2025-0043", assetName: "Máy bơm nước sinh hoạt A1", scheduleType: "PM", checklistTemplateId: "t2", checklistTemplateName: "Bảo trì máy bơm 30 ngày", frequencyType: "INTERVAL", frequencyDays: 30, startDate: "2025-01-01T00:00:00Z", nextDueDate: "2026-06-10T00:00:00Z", lastExecutedAt: "2026-05-11T00:00:00Z", leadTimeDays: 5, isActive: true },
  { id: "sch3", assetId: "a3", assetCode: "AST-2025-0044", assetName: "Máy phát điện dự phòng", scheduleType: "PM", checklistTemplateId: "t3", checklistTemplateName: "Bảo trì máy phát 90 ngày", frequencyType: "INTERVAL", frequencyDays: 90, startDate: "2025-01-01T00:00:00Z", nextDueDate: "2026-05-28T00:00:00Z", lastExecutedAt: "2026-02-27T00:00:00Z", leadTimeDays: 10, isActive: true, description: "Đã quá hạn — cần lập WO." },
  { id: "sch4", assetId: "a4", assetCode: "AST-2025-0045", assetName: "Điều hoà trung tâm AHU-T5", scheduleType: "PM", checklistTemplateId: "t4", checklistTemplateName: "Bảo trì điều hoà 30 ngày", frequencyType: "INTERVAL", frequencyDays: 30, startDate: "2025-01-01T00:00:00Z", nextDueDate: "2026-06-15T00:00:00Z", lastExecutedAt: "2026-05-16T00:00:00Z", leadTimeDays: 5, isActive: false },
];

export const mockChecklistItems: ChecklistTemplateItemResponse[] = [
  { id: "ci1", templateId: "t1", itemCode: "C-01", itemType: "BOOLEAN", itemLabel: "Kiểm tra hệ thống phanh an toàn", description: "Phanh cơ + phanh điện từ", sortOrder: 1, isRequired: true },
  { id: "ci2", templateId: "t1", itemCode: "C-02", itemType: "NUMERIC", itemLabel: "Đo điện áp động cơ kéo", description: "Đo tại tủ điều khiển", sortOrder: 2, isRequired: true, expectedValue: "380V ± 5%" },
  { id: "ci3", templateId: "t1", itemCode: "C-03", itemType: "BOOLEAN", itemLabel: "Kiểm tra cáp tải & đối trọng", sortOrder: 3, isRequired: true },
  { id: "ci4", templateId: "t1", itemCode: "C-04", itemType: "BOOLEAN", itemLabel: "Bôi trơn ray dẫn hướng", sortOrder: 4, isRequired: false },
  { id: "ci5", templateId: "t1", itemCode: "C-05", itemType: "NUMERIC", itemLabel: "Đo độ rung cabin khi vận hành", sortOrder: 5, isRequired: true, expectedValue: "< 15 mm/s" },
  { id: "ci6", templateId: "t1", itemCode: "C-06", itemType: "BOOLEAN", itemLabel: "Kiểm tra cửa tầng & cảm biến an toàn", sortOrder: 6, isRequired: true },
  { id: "ci7", templateId: "t1", itemCode: "C-07", itemType: "TEXT", itemLabel: "Ghi nhận tình trạng tổng quát", sortOrder: 7, isRequired: false },
];

export const mockWorkOrders: WorkOrderResponse[] = [
  { id: "wo1", woCode: "WO-2026-0112", assetId: "a1", assetCode: "AST-2025-0042", assetName: "Thang máy khách T1", checklistTemplateId: "t1", checklistTemplateName: "Bảo trì thang máy 60 ngày", buildingId: BUILDING, status: "DRAFT", woType: "PM", title: "Bảo trì định kỳ thang máy T1", priority: "MEDIUM", scheduledDate: "2026-06-05T00:00:00Z", dueDate: "2026-06-08T00:00:00Z", estimatedHours: 3, createdAt: "2026-05-28T03:00:00Z", updatedAt: "2026-05-28T03:00:00Z" },
  { id: "wo2", woCode: "WO-2026-0098", assetId: "a3", assetCode: "AST-2025-0044", assetName: "Máy phát điện dự phòng", checklistTemplateId: "t3", checklistTemplateName: "Bảo trì máy phát 90 ngày", buildingId: BUILDING, status: "ASSIGNED", woType: "PM", title: "Bảo trì máy phát điện quý II", priority: "MEDIUM", scheduledDate: "2026-06-01T00:00:00Z", dueDate: "2026-06-03T00:00:00Z", estimatedHours: 4, createdBy: "Nguyễn Văn An", createdAt: "2026-05-25T02:00:00Z", updatedAt: "2026-05-26T02:00:00Z" },
  { id: "wo3", woCode: "WO-2026-0099", assetId: "a4", assetCode: "AST-2025-0045", assetName: "Điều hoà trung tâm AHU-T5", checklistTemplateId: "t4", checklistTemplateName: "Bảo trì điều hoà 30 ngày", buildingId: BUILDING, status: "ASSIGNED", woType: "CM", title: "Sửa AHU tầng 5 không lạnh", priority: "URGENT", dueDate: "2026-05-29T00:00:00Z", estimatedHours: 2, createdBy: "Trần Thị Bình", createdAt: "2026-05-27T08:00:00Z", updatedAt: "2026-05-27T09:00:00Z" },
  { id: "wo4", woCode: "WO-2026-0100", assetId: "a2", assetCode: "AST-2025-0043", assetName: "Máy bơm nước sinh hoạt A1", checklistTemplateId: "t2", checklistTemplateName: "Bảo trì máy bơm 30 ngày", buildingId: BUILDING, status: "IN_PROGRESS", woType: "PM", title: "Bảo trì máy bơm A1", priority: "HIGH", scheduledDate: "2026-05-30T00:00:00Z", dueDate: "2026-06-02T00:00:00Z", actualStartAt: "2026-05-30T01:30:00Z", estimatedHours: 2, actualHours: 1, createdBy: "Nguyễn Văn An", createdAt: "2026-05-24T02:00:00Z", updatedAt: "2026-05-30T01:30:00Z" },
  { id: "wo5", woCode: "WO-2026-0089", assetId: "a1", assetCode: "AST-2025-0042", assetName: "Thang máy khách T1", checklistTemplateId: "t1", checklistTemplateName: "Bảo trì thang máy 60 ngày", buildingId: BUILDING, status: "PENDING_REVIEW", woType: "PM", title: "Bảo trì thang máy T1 (chờ nghiệm thu)", priority: "MEDIUM", dueDate: "2026-05-28T00:00:00Z", actualStartAt: "2026-05-27T01:00:00Z", actualEndAt: "2026-05-27T04:30:00Z", estimatedHours: 3, actualHours: 3.5, totalCost: 2_400_000, createdBy: "Nguyễn Văn An", createdAt: "2026-05-20T02:00:00Z", updatedAt: "2026-05-27T04:30:00Z" },
  { id: "wo6", woCode: "WO-2026-0085", assetId: "a5", assetCode: "AST-2025-0046", assetName: "Tủ điện tổng MSB-A", checklistTemplateId: "t3", checklistTemplateName: "Bảo trì máy phát 90 ngày", buildingId: BUILDING, status: "COMPLETED", woType: "PM", title: "Kiểm tra tủ điện tổng MSB-A", priority: "LOW", dueDate: "2026-05-22T00:00:00Z", actualStartAt: "2026-05-21T01:00:00Z", actualEndAt: "2026-05-21T03:00:00Z", approvedAt: "2026-05-22T06:00:00Z", estimatedHours: 2, actualHours: 2, totalCost: 1_800_000, createdBy: "Lê Văn Cường", createdAt: "2026-05-15T02:00:00Z", updatedAt: "2026-05-22T06:00:00Z" },
];
