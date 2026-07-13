using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.System;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho BÁO CÁO / KPI / CHI PHÍ.
    /// </summary>
    [McpServerToolType]
    public static class ReportTools
    {
        [McpServerTool(Name = "get_kpi_snapshots")]
        [Description("Lấy các bản chụp KPI gần nhất của một toà nhà (mặc định 90 bản gần nhất).")]
        public static async Task<string> GetKpiSnapshots(
            IKpiSnapshotService kpiService,
            [Description("ID toà nhà (GUID)")] Guid buildingId,
            [Description("Số bản ghi muốn lấy")] int take = 90)
        {
            var result = await kpiService.GetByBuildingAsync(buildingId, take);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_cost_by_building")]
        [Description("Lấy danh sách chi phí (cost tracking) theo toà nhà, có thể lọc khoảng ngày.")]
        public static async Task<string> GetCostByBuilding(
            ICostTrackingService costService,
            [Description("ID toà nhà (GUID)")] Guid buildingId,
            [Description("Từ ngày (yyyy-MM-dd), bỏ trống để không giới hạn")] DateTime? from = null,
            [Description("Đến ngày (yyyy-MM-dd), bỏ trống để không giới hạn")] DateTime? to = null)
        {
            var result = await costService.GetByBuildingAsync(buildingId, from, to);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_cost_by_asset")]
        [Description("Lấy toàn bộ chi phí phát sinh gắn với một tài sản theo ID (GUID).")]
        public static async Task<string> GetCostByAsset(
            ICostTrackingService costService,
            [Description("ID tài sản (GUID)")] Guid assetId)
        {
            var result = await costService.GetByAssetAsync(assetId);
            return McpJson.Serialize(result);
        }
    }
}
