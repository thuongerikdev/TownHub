// Dữ liệu mẫu xem trước UI Báo cáo (KPI + Chi phí) khi backend chưa kết nối.
import type {
  KpiDailySnapshotResponse, KpiData, CostTrackingResponse,
} from "@/lib/api";

const BUILDING = "11111111-1111-1111-1111-111111111111";

function snap(id: string, date: string, kpi: KpiData): KpiDailySnapshotResponse {
  return { id, snapshotDate: date, buildingId: BUILDING, kpiDataJson: JSON.stringify(kpi), createdAt: date };
}

// 7 mốc theo tuần, xu hướng cải thiện dần đến cuối tháng 5/2026.
export const mockKpiSnapshots: KpiDailySnapshotResponse[] = [
  snap("k1", "2026-04-19T00:00:00Z", { mttr_hours: 3.1, mtbf_days: 38, ticket_count_new: 22, ticket_count_resolved: 18, ticket_count_overdue: 5, wo_count_completed: 31, wo_completion_rate: 0.82, sla_compliance_rate: 0.88, asset_availability_rate: 0.96, pm_overdue_count: 6, total_maintenance_cost: 41_000_000 }),
  snap("k2", "2026-04-26T00:00:00Z", { mttr_hours: 2.9, mtbf_days: 40, ticket_count_new: 19, ticket_count_resolved: 20, ticket_count_overdue: 4, wo_count_completed: 28, wo_completion_rate: 0.85, sla_compliance_rate: 0.90, asset_availability_rate: 0.965, pm_overdue_count: 5, total_maintenance_cost: 36_500_000 }),
  snap("k3", "2026-05-03T00:00:00Z", { mttr_hours: 2.7, mtbf_days: 41, ticket_count_new: 24, ticket_count_resolved: 22, ticket_count_overdue: 4, wo_count_completed: 33, wo_completion_rate: 0.87, sla_compliance_rate: 0.905, asset_availability_rate: 0.97, pm_overdue_count: 4, total_maintenance_cost: 52_000_000 }),
  snap("k4", "2026-05-10T00:00:00Z", { mttr_hours: 2.6, mtbf_days: 42, ticket_count_new: 17, ticket_count_resolved: 19, ticket_count_overdue: 3, wo_count_completed: 30, wo_completion_rate: 0.88, sla_compliance_rate: 0.915, asset_availability_rate: 0.975, pm_overdue_count: 4, total_maintenance_cost: 44_000_000 }),
  snap("k5", "2026-05-17T00:00:00Z", { mttr_hours: 2.5, mtbf_days: 43, ticket_count_new: 16, ticket_count_resolved: 18, ticket_count_overdue: 3, wo_count_completed: 29, wo_completion_rate: 0.89, sla_compliance_rate: 0.928, asset_availability_rate: 0.98, pm_overdue_count: 3, total_maintenance_cost: 39_000_000 }),
  snap("k6", "2026-05-24T00:00:00Z", { mttr_hours: 2.4, mtbf_days: 44, ticket_count_new: 14, ticket_count_resolved: 16, ticket_count_overdue: 2, wo_count_completed: 27, wo_completion_rate: 0.90, sla_compliance_rate: 0.936, asset_availability_rate: 0.982, pm_overdue_count: 3, total_maintenance_cost: 33_000_000 }),
  snap("k7", "2026-05-31T00:00:00Z", { mttr_hours: 2.3, mtbf_days: 45, ticket_count_new: 12, ticket_count_resolved: 15, ticket_count_overdue: 2, wo_count_completed: 26, wo_completion_rate: 0.91, sla_compliance_rate: 0.942, asset_availability_rate: 0.985, pm_overdue_count: 2, total_maintenance_cost: 30_500_000 }),
];

function cost(
  id: string, costType: string, amount: number, costDate: string, assetCode: string, description: string,
): CostTrackingResponse {
  return {
    id, referenceType: "WORK_ORDER", referenceId: `WO-${id}`, assetId: assetCode, assetCode,
    buildingId: BUILDING, amount, currency: "VND", costType, costDate, description,
    recordedBy: "Kế toán kỹ thuật", recordedAt: costDate,
  };
}

// Chi phí bảo trì rải theo tháng 1–5/2026, gồm 3 loại: vật tư, nhân công, dịch vụ.
export const mockCostTracking: CostTrackingResponse[] = [
  cost("c01", "MATERIAL", 22_000_000, "2026-01-12T00:00:00Z", "AST-0089", "Thay lọc gió, gas điều hoà khu A"),
  cost("c02", "LABOR", 15_000_000, "2026-01-18T00:00:00Z", "AST-0045", "Nhân công bảo trì thang máy quý 1"),
  cost("c03", "SERVICE", 8_000_000, "2026-01-25T00:00:00Z", "AST-0112", "Kiểm định an toàn hệ thống điện"),
  cost("c04", "MATERIAL", 18_000_000, "2026-02-08T00:00:00Z", "AST-0067", "Thay phớt, vòng bi bơm nước"),
  cost("c05", "LABOR", 12_000_000, "2026-02-15T00:00:00Z", "AST-0045", "Nhân công sửa chữa cửa tầng thang máy"),
  cost("c06", "SERVICE", 6_000_000, "2026-02-22T00:00:00Z", "AST-0098", "Dịch vụ bảo dưỡng máy phát"),
  cost("c07", "MATERIAL", 28_000_000, "2026-03-05T00:00:00Z", "AST-0089", "Thay block nén điều hoà trung tâm"),
  cost("c08", "LABOR", 19_000_000, "2026-03-14T00:00:00Z", "AST-0112", "Nhân công đấu nối tủ điện tầng hầm"),
  cost("c09", "SERVICE", 9_000_000, "2026-03-26T00:00:00Z", "AST-0045", "Hiệu chỉnh tốc độ thang máy"),
  cost("c10", "MATERIAL", 24_000_000, "2026-04-07T00:00:00Z", "AST-0067", "Thay bơm tăng áp khu B"),
  cost("c11", "LABOR", 16_000_000, "2026-04-16T00:00:00Z", "AST-0089", "Nhân công vệ sinh dàn lạnh AHU"),
  cost("c12", "SERVICE", 7_000_000, "2026-04-28T00:00:00Z", "AST-0098", "Kiểm tra tải máy phát dự phòng"),
  cost("c13", "MATERIAL", 28_000_000, "2026-05-06T00:00:00Z", "AST-0089", "Thay van điều áp hệ thống HVAC"),
  cost("c14", "LABOR", 23_000_000, "2026-05-13T00:00:00Z", "AST-0045", "Nhân công đại tu thang máy T2"),
  cost("c15", "SERVICE", 10_500_000, "2026-05-21T00:00:00Z", "AST-0112", "Dịch vụ đo điện trở tiếp địa"),
  cost("c16", "MATERIAL", 12_000_000, "2026-05-27T00:00:00Z", "AST-0067", "Vật tư thay thế bơm nước sinh hoạt"),
];
