using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.Vendor;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho NHÀ CUNG CẤP: hồ sơ, hợp đồng, đánh giá hiệu suất.
    /// </summary>
    [McpServerToolType]
    public static class VendorTools
    {
        [McpServerTool(Name = "search_vendors")]
        [Description("Liệt kê nhà cung cấp. Lọc theo trạng thái (ví dụ: ACTIVE | BLACKLISTED).")]
        public static async Task<string> SearchVendors(
            IVendorService vendorService,
            [Description("Trạng thái nhà cung cấp")] string? status = null)
        {
            var result = await vendorService.GetAllAsync(status);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_vendor")]
        [Description("Lấy chi tiết một nhà cung cấp theo ID (GUID).")]
        public static async Task<string> GetVendor(
            IVendorService vendorService,
            [Description("ID nhà cung cấp (GUID)")] Guid id)
        {
            var result = await vendorService.GetByIdAsync(id);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_vendor_contracts")]
        [Description("Liệt kê hợp đồng nhà cung cấp. Lọc theo nhà cung cấp, toà nhà hoặc trạng thái.")]
        public static async Task<string> SearchVendorContracts(
            IVendorContractService contractService,
            [Description("ID nhà cung cấp (GUID)")] Guid? vendorId = null,
            [Description("ID toà nhà (GUID)")] Guid? buildingId = null,
            [Description("Trạng thái hợp đồng")] string? status = null)
        {
            var result = await contractService.GetAllAsync(vendorId, buildingId, status);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_expiring_contracts")]
        [Description("Lấy danh sách hợp đồng sắp hết hạn trong N ngày tới (mặc định 30 ngày).")]
        public static async Task<string> GetExpiringContracts(
            IVendorContractService contractService,
            [Description("Số ngày tới để xét sắp hết hạn")] int daysAhead = 30)
        {
            var result = await contractService.GetExpiringAsync(daysAhead);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_vendor_evaluations")]
        [Description("Lấy các đánh giá hiệu suất của một nhà cung cấp theo ID (GUID).")]
        public static async Task<string> GetVendorEvaluations(
            IVendorEvaluationService evaluationService,
            [Description("ID nhà cung cấp (GUID)")] Guid vendorId)
        {
            var result = await evaluationService.GetByVendorAsync(vendorId);
            return McpJson.Serialize(result);
        }
    }
}
