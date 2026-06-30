using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.Inventory;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho KHO / VẬT TƯ: kho, vật tư, tồn kho, giao dịch xuất-nhập.
    /// </summary>
    [McpServerToolType]
    public static class InventoryTools
    {
        [McpServerTool(Name = "list_warehouses")]
        [Description("Liệt kê kho. Có thể lọc theo toà nhà.")]
        public static async Task<string> ListWarehouses(
            IWarehouseService warehouseService,
            [Description("ID toà nhà (GUID)")] Guid? buildingId = null)
        {
            var result = await warehouseService.GetAllAsync(buildingId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_materials")]
        [Description("Liệt kê vật tư. Lọc theo danh mục hoặc trạng thái kích hoạt.")]
        public static async Task<string> SearchMaterials(
            IMaterialService materialService,
            [Description("ID danh mục vật tư (GUID)")] Guid? categoryId = null,
            [Description("Chỉ lấy vật tư đang dùng? true/false")] bool? isActive = null)
        {
            var result = await materialService.GetAllAsync(categoryId, isActive);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_low_stock_materials")]
        [Description("Lấy danh sách vật tư đang dưới mức tồn kho tối thiểu (cần nhập thêm).")]
        public static async Task<string> GetLowStockMaterials(
            IMaterialService materialService,
            [Description("ID kho (GUID), bỏ trống để xét tất cả kho")] Guid? warehouseId = null)
        {
            var result = await materialService.GetLowStockAsync(warehouseId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_inventory_levels")]
        [Description("Lấy mức tồn kho hiện tại. Lọc theo kho và/hoặc vật tư.")]
        public static async Task<string> GetInventoryLevels(
            IMaterialService materialService,
            [Description("ID kho (GUID)")] Guid? warehouseId = null,
            [Description("ID vật tư (GUID)")] Guid? materialId = null)
        {
            var result = await materialService.GetInventoryLevelsAsync(warehouseId, materialId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_inventory_transactions")]
        [Description("Liệt kê giao dịch kho (nhập/xuất/chuyển). Lọc theo kho, vật tư hoặc loại giao dịch.")]
        public static async Task<string> SearchInventoryTransactions(
            IInventoryTransactionService transactionService,
            [Description("ID kho (GUID)")] Guid? warehouseId = null,
            [Description("ID vật tư (GUID)")] Guid? materialId = null,
            [Description("Loại giao dịch, ví dụ: IN | OUT | TRANSFER")] string? txnType = null)
        {
            var result = await transactionService.GetAllAsync(warehouseId, materialId, txnType);
            return McpJson.Serialize(result);
        }
    }
}
