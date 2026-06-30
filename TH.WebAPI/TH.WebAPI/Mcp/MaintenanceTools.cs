using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.Maintenance;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho BẢO TRÌ: lệnh công việc (work order), lịch bảo trì, checklist.
    /// </summary>
    [McpServerToolType]
    public static class MaintenanceTools
    {
        [McpServerTool(Name = "search_work_orders")]
        [Description("Liệt kê lệnh công việc bảo trì. Lọc theo tài sản, trạng thái hoặc toà nhà.")]
        public static async Task<string> SearchWorkOrders(
            IWorkOrderService workOrderService,
            [Description("ID tài sản (GUID)")] Guid? assetId = null,
            [Description("Trạng thái lệnh công việc")] string? status = null,
            [Description("ID toà nhà (GUID)")] Guid? buildingId = null)
        {
            var result = await workOrderService.GetAllAsync(assetId, status, buildingId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_work_order")]
        [Description("Lấy chi tiết một lệnh công việc bảo trì theo ID (GUID).")]
        public static async Task<string> GetWorkOrder(
            IWorkOrderService workOrderService,
            [Description("ID lệnh công việc (GUID)")] Guid id)
        {
            var result = await workOrderService.GetByIdAsync(id);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_maintenance_schedules")]
        [Description("Liệt kê lịch bảo trì định kỳ. Lọc theo tài sản hoặc trạng thái kích hoạt.")]
        public static async Task<string> SearchMaintenanceSchedules(
            IMaintenanceScheduleService scheduleService,
            [Description("ID tài sản (GUID)")] Guid? assetId = null,
            [Description("Chỉ lấy lịch đang kích hoạt? true/false")] bool? isActive = null)
        {
            var result = await scheduleService.GetAllAsync(assetId, isActive);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_overdue_maintenance")]
        [Description("Lấy danh sách lịch bảo trì đã quá hạn (cần thực hiện gấp).")]
        public static async Task<string> GetOverdueMaintenance(IMaintenanceScheduleService scheduleService)
        {
            var result = await scheduleService.GetOverdueAsync();
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "list_checklist_templates")]
        [Description("Liệt kê toàn bộ mẫu checklist bảo trì.")]
        public static async Task<string> ListChecklistTemplates(IChecklistTemplateService templateService)
        {
            var result = await templateService.GetAllAsync();
            return McpJson.Serialize(result);
        }
    }
}
