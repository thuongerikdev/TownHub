// Dữ liệu mẫu xem trước UI khi backend chưa kết nối (NEXT_PUBLIC_USE_MOCK=1).
import type {
  AssetResponse, AssetCategoryResponse, AssetLocationResponse, AssetDepreciationLogResponse,
} from "@/lib/api";

const BUILDING = "11111111-1111-1111-1111-111111111111";

export const mockAssetCategories: AssetCategoryResponse[] = [
  { id: "c1", code: "ELEV", name: "Thang máy" },
  { id: "c2", code: "HVAC", name: "Điều hoà không khí" },
  { id: "c3", code: "PUMP", name: "Hệ thống bơm nước" },
  { id: "c4", code: "GEN", name: "Máy phát điện" },
  { id: "c5", code: "FIRE", name: "Phòng cháy chữa cháy" },
];

export const mockAssetLocations: AssetLocationResponse[] = [
  { id: "l1", buildingId: BUILDING, areaCode: "A-Tầng hầm B1" },
  { id: "l2", buildingId: BUILDING, areaCode: "A-Tầng 1" },
  { id: "l3", buildingId: BUILDING, areaCode: "A-Sân thượng" },
  { id: "l4", buildingId: BUILDING, areaCode: "B-Phòng kỹ thuật" },
];

export const mockAssets: AssetResponse[] = [
  {
    id: "a1", assetCode: "AST-2025-0042", name: "Thang máy khách T1",
    categoryId: "c1", categoryName: "Thang máy", locationId: "l2", locationAreaCode: "A-Tầng 1",
    buildingId: BUILDING, status: "ACTIVE", serialNumber: "MIT-EL-7781",
    purchasePrice: 2_500_000_000, purchaseDate: "2021-03-15T00:00:00Z", warrantyExpiryDate: "2026-03-15T00:00:00Z",
    usefulLifeMonths: 180, salvageValue: 50_000_000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 680_000_000, bookValue: 1_820_000_000,
    installationDate: "2021-04-01T00:00:00Z", lastMaintenanceDate: "2025-05-05T00:00:00Z",
    nextMaintenanceDate: "2025-07-05T00:00:00Z", criticalityLevel: "CRITICAL",
    notes: "Bảo trì định kỳ 2 tháng/lần theo hợp đồng Mitsubishi.",
  },
  {
    id: "a2", assetCode: "AST-2025-0043", name: "Máy bơm nước sinh hoạt A1",
    categoryId: "c3", categoryName: "Hệ thống bơm nước", locationId: "l1", locationAreaCode: "A-Tầng hầm B1",
    buildingId: BUILDING, status: "ACTIVE", serialNumber: "EBARA-PMP-221",
    purchasePrice: 85_000_000, purchaseDate: "2022-06-10T00:00:00Z", warrantyExpiryDate: "2025-06-10T00:00:00Z",
    usefulLifeMonths: 120, salvageValue: 5_000_000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 22_000_000, bookValue: 63_000_000,
    lastMaintenanceDate: "2025-04-20T00:00:00Z", nextMaintenanceDate: "2025-05-20T00:00:00Z",
    criticalityLevel: "HIGH", notes: undefined,
  },
  {
    id: "a3", assetCode: "AST-2025-0044", name: "Máy phát điện dự phòng",
    categoryId: "c4", categoryName: "Máy phát điện", locationId: "l1", locationAreaCode: "A-Tầng hầm B1",
    buildingId: BUILDING, status: "MAINTENANCE", serialNumber: "CAT-GEN-9920",
    purchasePrice: 450_000_000, purchaseDate: "2020-11-01T00:00:00Z", warrantyExpiryDate: "2023-11-01T00:00:00Z",
    usefulLifeMonths: 240, salvageValue: 20_000_000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 130_000_000, bookValue: 320_000_000,
    lastMaintenanceDate: "2025-05-10T00:00:00Z", nextMaintenanceDate: "2025-05-25T00:00:00Z",
    criticalityLevel: "CRITICAL", notes: "Đang thay thế bộ điều áp.",
  },
  {
    id: "a4", assetCode: "AST-2025-0045", name: "Điều hoà trung tâm AHU-T5",
    categoryId: "c2", categoryName: "Điều hoà không khí", locationId: "l4", locationAreaCode: "B-Phòng kỹ thuật",
    buildingId: BUILDING, status: "ACTIVE", serialNumber: "DAIKIN-AHU-505",
    purchasePrice: 180_000_000, purchaseDate: "2023-01-20T00:00:00Z", warrantyExpiryDate: "2026-01-20T00:00:00Z",
    usefulLifeMonths: 150, salvageValue: 8_000_000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 28_000_000, bookValue: 152_000_000,
    lastMaintenanceDate: "2025-05-01T00:00:00Z", nextMaintenanceDate: "2025-06-01T00:00:00Z",
    criticalityLevel: "MEDIUM",
  },
  {
    id: "a5", assetCode: "AST-2025-0046", name: "Tủ điện tổng MSB-A",
    categoryId: "c5", categoryName: "Phòng cháy chữa cháy", locationId: "l1", locationAreaCode: "A-Tầng hầm B1",
    buildingId: BUILDING, status: "BROKEN", serialNumber: "SCH-MSB-118",
    purchasePrice: 320_000_000, purchaseDate: "2019-09-09T00:00:00Z",
    usefulLifeMonths: 240, salvageValue: 15_000_000, depreciationMethod: "STRAIGHT_LINE",
    accumulatedDepreciation: 190_000_000, bookValue: 130_000_000,
    lastMaintenanceDate: "2025-03-15T00:00:00Z", nextMaintenanceDate: "2025-05-15T00:00:00Z",
    criticalityLevel: "HIGH", notes: "Sự cố chập tại MCCB nhánh 3 — chờ vật tư.",
  },
];

export const mockDepreciationLogs: AssetDepreciationLogResponse[] = [
  { id: "d1", assetId: "a1", assetCode: "AST-2025-0042", periodYear: 2025, periodMonth: 5, depreciationAmount: 13_611_111, bookValueBefore: 1_833_611_111, bookValueAfter: 1_820_000_000, accumulatedTotal: 680_000_000, calculatedAt: "2025-05-31T02:00:00Z" },
  { id: "d2", assetId: "a2", assetCode: "AST-2025-0043", periodYear: 2025, periodMonth: 5, depreciationAmount: 666_667, bookValueBefore: 63_666_667, bookValueAfter: 63_000_000, accumulatedTotal: 22_000_000, calculatedAt: "2025-05-31T02:00:00Z" },
  { id: "d3", assetId: "a3", assetCode: "AST-2025-0044", periodYear: 2025, periodMonth: 5, depreciationAmount: 1_791_667, bookValueBefore: 321_791_667, bookValueAfter: 320_000_000, accumulatedTotal: 130_000_000, calculatedAt: "2025-05-31T02:00:00Z" },
  { id: "d4", assetId: "a4", assetCode: "AST-2025-0045", periodYear: 2025, periodMonth: 5, depreciationAmount: 1_146_667, bookValueBefore: 153_146_667, bookValueAfter: 152_000_000, accumulatedTotal: 28_000_000, calculatedAt: "2025-05-31T02:00:00Z" },
  { id: "d5", assetId: "a5", assetCode: "AST-2025-0046", periodYear: 2025, periodMonth: 5, depreciationAmount: 1_270_833, bookValueBefore: 131_270_833, bookValueAfter: 130_000_000, accumulatedTotal: 190_000_000, calculatedAt: "2025-05-31T02:00:00Z" },
];
