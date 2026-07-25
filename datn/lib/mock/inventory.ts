// Dữ liệu mẫu xem trước UI Kho vật tư khi backend chưa kết nối.
import type {
  WarehouseResponse, MaterialResponse, InventoryLevelResponse, InventoryTransactionResponse,
} from "@/lib/api";

const BUILDING = "11111111-1111-1111-1111-111111111111";

export const mockWarehouses: WarehouseResponse[] = [
  { id: "w1", code: "WH-A", name: "Kho vật tư khu A", buildingId: BUILDING },
  { id: "w2", code: "WH-B", name: "Kho kỹ thuật khu B", buildingId: BUILDING },
];

export const mockMaterials: MaterialResponse[] = [
  { id: "m1", materialCode: "MAT-0001", name: "Cáp thép thang máy 12mm", categoryId: "mc1", categoryName: "Phụ tùng thang máy", unitOfMeasure: "mét", minStock: 50, maxStock: 400, reorderPoint: 80, reorderQuantity: 200, unitPrice: 120_000, isActive: true },
  { id: "m2", materialCode: "MAT-0002", name: "Dầu thuỷ lực ISO VG46", categoryId: "mc2", categoryName: "Dầu nhớt", unitOfMeasure: "lít", minStock: 40, maxStock: 200, reorderPoint: 60, reorderQuantity: 100, unitPrice: 85_000, isActive: true },
  { id: "m3", materialCode: "MAT-0003", name: "Lọc gió AHU 595x595", categoryId: "mc3", categoryName: "Vật tư HVAC", unitOfMeasure: "cái", minStock: 20, maxStock: 120, reorderPoint: 30, reorderQuantity: 60, unitPrice: 250_000, isActive: true },
  { id: "m4", materialCode: "MAT-0004", name: "Vòng bi máy bơm 6204", categoryId: "mc4", categoryName: "Phụ tùng bơm", unitOfMeasure: "cái", minStock: 10, maxStock: 60, reorderPoint: 15, reorderQuantity: 30, unitPrice: 180_000, isActive: true },
  { id: "m5", materialCode: "MAT-0005", name: "Aptomat MCCB 100A 3P", categoryId: "mc5", categoryName: "Thiết bị điện", unitOfMeasure: "cái", minStock: 5, maxStock: 30, reorderPoint: 8, reorderQuantity: 15, unitPrice: 1_450_000, isActive: true },
  { id: "m6", materialCode: "MAT-0006", name: "Bình chữa cháy CO2 5kg", categoryId: "mc6", categoryName: "Phòng cháy chữa cháy", unitOfMeasure: "bình", minStock: 15, maxStock: 80, reorderPoint: 25, reorderQuantity: 40, unitPrice: 520_000, isActive: true },
  { id: "m7", materialCode: "MAT-0007", name: "Băng tải cao su B650", categoryId: "mc4", categoryName: "Phụ tùng bơm", unitOfMeasure: "mét", minStock: 10, maxStock: 50, reorderPoint: 12, reorderQuantity: 25, unitPrice: 320_000, isActive: true },
];

// Tồn kho hiện tại theo TỪNG KHO. Một vật tư có thể nằm ở nhiều kho với số lượng
// khác nhau (VD: MAT-0001 có 35 mét ở kho A và 60 mét ở kho B).
export const mockInventoryLevels: InventoryLevelResponse[] = [
  // ── Kho vật tư khu A ──
  { id: "il1", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m1", materialCode: "MAT-0001", materialName: "Cáp thép thang máy 12mm", unitOfMeasure: "mét", quantityOnHand: 35 },
  { id: "il2", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m2", materialCode: "MAT-0002", materialName: "Dầu thuỷ lực ISO VG46", unitOfMeasure: "lít", quantityOnHand: 90 },
  { id: "il3", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m3", materialCode: "MAT-0003", materialName: "Lọc gió AHU 595x595", unitOfMeasure: "cái", quantityOnHand: 0 },
  { id: "il4", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m4", materialCode: "MAT-0004", materialName: "Vòng bi máy bơm 6204", unitOfMeasure: "cái", quantityOnHand: 12 },
  { id: "il5", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m5", materialCode: "MAT-0005", materialName: "Aptomat MCCB 100A 3P", unitOfMeasure: "cái", quantityOnHand: 6 },
  { id: "il6", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m6", materialCode: "MAT-0006", materialName: "Bình chữa cháy CO2 5kg", unitOfMeasure: "bình", quantityOnHand: 40 },
  // ── Kho kỹ thuật khu B ── (một số vật tư trùng với kho A, số lượng khác nhau)
  { id: "il7", warehouseId: "w2", warehouseName: "Kho kỹ thuật khu B", materialId: "m1", materialCode: "MAT-0001", materialName: "Cáp thép thang máy 12mm", unitOfMeasure: "mét", quantityOnHand: 60 },
  { id: "il8", warehouseId: "w2", warehouseName: "Kho kỹ thuật khu B", materialId: "m4", materialCode: "MAT-0004", materialName: "Vòng bi máy bơm 6204", unitOfMeasure: "cái", quantityOnHand: 3 },
  { id: "il9", warehouseId: "w2", warehouseName: "Kho kỹ thuật khu B", materialId: "m5", materialCode: "MAT-0005", materialName: "Aptomat MCCB 100A 3P", unitOfMeasure: "cái", quantityOnHand: 20 },
  { id: "il10", warehouseId: "w2", warehouseName: "Kho kỹ thuật khu B", materialId: "m7", materialCode: "MAT-0007", materialName: "Băng tải cao su B650", unitOfMeasure: "mét", quantityOnHand: 15 },
];

export const mockInventoryTransactions: InventoryTransactionResponse[] = [
  { id: "tx1", txnCode: "TXN-2026-0301", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m1", materialCode: "MAT-0001", materialName: "Cáp thép thang máy 12mm", referenceType: "PO", referenceId: "po1", txnType: "IN", quantity: 200, unitCost: 120_000, totalCost: 24_000_000, performedBy: "Thủ kho A", performedAt: "2026-05-20T03:00:00Z" },
  { id: "tx2", txnCode: "TXN-2026-0302", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m3", materialCode: "MAT-0003", materialName: "Lọc gió AHU 595x595", referenceType: "WO", referenceId: "wo3", txnType: "OUT", quantity: 4, unitCost: 250_000, totalCost: 1_000_000, performedBy: "Trần Thị Bình", performedAt: "2026-05-28T06:00:00Z" },
  { id: "tx3", txnCode: "TXN-2026-0303", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m4", materialCode: "MAT-0004", materialName: "Vòng bi máy bơm 6204", referenceType: "WO", referenceId: "wo4", txnType: "OUT", quantity: 2, unitCost: 180_000, totalCost: 360_000, performedBy: "Nguyễn Văn An", performedAt: "2026-05-29T07:00:00Z" },
  { id: "tx4", txnCode: "TXN-2026-0304", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m6", materialCode: "MAT-0006", materialName: "Bình chữa cháy CO2 5kg", referenceType: "PO", referenceId: "po2", txnType: "IN", quantity: 10, unitCost: 520_000, totalCost: 5_200_000, performedBy: "Thủ kho A", performedAt: "2026-05-30T04:00:00Z" },
];

// Giao dịch điều chỉnh sinh từ các kỳ kiểm kê (referenceType = STOCK_TAKE), gộp theo referenceId.
export const mockStockTakeTransactions: InventoryTransactionResponse[] = [
  { id: "stk1", txnCode: "STK-2026-4821-1", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m1", materialCode: "MAT-0001", materialName: "Cáp thép thang máy 12mm", referenceType: "STOCK_TAKE", referenceId: "STK-2026-4821", txnType: "ADJUST", quantity: -3, unitCost: 120_000, totalCost: 360_000, notes: "Hao hụt do cắt mẫu · Người thực hiện: Nguyễn Văn A", performedAt: "2026-06-30T08:00:00Z" },
  { id: "stk2", txnCode: "STK-2026-4821-2", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m6", materialCode: "MAT-0006", materialName: "Bình chữa cháy CO2 5kg", referenceType: "STOCK_TAKE", referenceId: "STK-2026-4821", txnType: "ADJUST", quantity: 2, unitCost: 520_000, totalCost: 1_040_000, notes: "Kiểm kê Tháng 06/2026 · Người thực hiện: Nguyễn Văn A", performedAt: "2026-06-30T08:00:00Z" },
  { id: "stk3", txnCode: "STK-2026-3907", warehouseId: "w1", warehouseName: "Kho vật tư khu A", materialId: "m3", materialCode: "MAT-0003", materialName: "Lọc gió AHU 595x595", referenceType: "STOCK_TAKE", referenceId: "STK-2026-3907", txnType: "ADJUST", quantity: -1, unitCost: 250_000, totalCost: 250_000, notes: "Kiểm kê Tháng 05/2026 · Người thực hiện: Trần Văn B", performedAt: "2026-05-31T09:30:00Z" },
];
