using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.Core;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho nghiệp vụ TÀI SẢN.
    /// Mỗi method là một "tool" mà LLM (Claude) có thể gọi. Các tham số kiểu
    /// service (IAssetService...) được DI tự động truyền vào theo scope của request;
    /// các tham số có [Description] là dữ liệu LLM cung cấp.
    /// </summary>
    [McpServerToolType]
    public static class AssetTools
    {
        [McpServerTool(Name = "search_assets")]
        [Description("Tìm/liệt kê tài sản. Có thể lọc theo toà nhà, danh mục, hoặc trạng thái " +
                     "(dang_su_dung, dang_bao_tri, nhan_roi, da_thanh_ly). Trả về JSON danh sách tài sản.")]
        public static async Task<string> SearchAssets(
            IAssetService assetService,
            [Description("ID toà nhà (GUID), bỏ trống để lấy tất cả")] Guid? buildingId = null,
            [Description("ID danh mục tài sản (GUID), bỏ trống để lấy tất cả")] Guid? categoryId = null,
            [Description("Trạng thái tài sản, ví dụ: dang_su_dung")] string? status = null)
        {
            var result = await assetService.GetAllAsync(buildingId, categoryId, status);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_asset")]
        [Description("Lấy chi tiết một tài sản theo ID (GUID): nguyên giá, khấu hao, vị trí, trạng thái...")]
        public static async Task<string> GetAsset(
            IAssetService assetService,
            [Description("ID tài sản (GUID)")] Guid id)
        {
            var result = await assetService.GetByIdAsync(id);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "list_asset_categories")]
        [Description("Liệt kê toàn bộ danh mục tài sản (mã, tên, tiền tố sinh mã, thời gian khấu hao mặc định).")]
        public static async Task<string> ListAssetCategories(IAssetCategoryService categoryService)
        {
            var result = await categoryService.GetAllAsync();
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_asset_depreciation")]
        [Description("Lấy lịch sử khấu hao của một tài sản theo ID (GUID).")]
        public static async Task<string> GetAssetDepreciation(
            IAssetDepreciationService depreciationService,
            [Description("ID tài sản (GUID)")] Guid assetId)
        {
            var result = await depreciationService.GetByAssetIdAsync(assetId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_asset_transfers")]
        [Description("Lấy lịch sử điều chuyển (cấp phát/thu hồi/luân chuyển) của một tài sản theo ID (GUID).")]
        public static async Task<string> GetAssetTransfers(
            IAssetTransferService transferService,
            [Description("ID tài sản (GUID)")] Guid assetId)
        {
            var result = await transferService.GetByAssetIdAsync(assetId);
            return McpJson.Serialize(result);
        }
    }
}
