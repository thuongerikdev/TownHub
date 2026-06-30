using System.ComponentModel;
using ModelContextProtocol.Server;
using TH.Asset.ApplicationService.Service.Inventory;

namespace TH.WebAPI.Mcp
{
    /// <summary>
    /// Bộ công cụ MCP cho MUA SẮM: yêu cầu mua (PR), đơn mua (PO), hoá đơn, job OCR.
    /// </summary>
    [McpServerToolType]
    public static class ProcurementTools
    {
        [McpServerTool(Name = "search_purchase_requests")]
        [Description("Liệt kê yêu cầu mua (PR). Lọc theo trạng thái, phiếu sự cố hoặc lệnh công việc.")]
        public static async Task<string> SearchPurchaseRequests(
            IPurchaseRequestService prService,
            [Description("Trạng thái PR, ví dụ: PENDING | APPROVED | REJECTED")] string? status = null,
            [Description("ID phiếu sự cố liên quan (GUID)")] Guid? ticketId = null,
            [Description("ID lệnh công việc liên quan (GUID)")] Guid? woId = null)
        {
            var result = await prService.GetAllAsync(status, ticketId, woId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "get_purchase_request")]
        [Description("Lấy chi tiết một yêu cầu mua (PR) theo ID (GUID).")]
        public static async Task<string> GetPurchaseRequest(
            IPurchaseRequestService prService,
            [Description("ID yêu cầu mua (GUID)")] Guid id)
        {
            var result = await prService.GetByIdAsync(id);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_purchase_orders")]
        [Description("Liệt kê đơn mua (PO). Lọc theo trạng thái hoặc nhà cung cấp.")]
        public static async Task<string> SearchPurchaseOrders(
            IPurchaseOrderService poService,
            [Description("Trạng thái PO")] string? status = null,
            [Description("ID nhà cung cấp (GUID)")] Guid? vendorId = null)
        {
            var result = await poService.GetAllAsync(status, vendorId);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_invoices")]
        [Description("Liệt kê hoá đơn. Lọc theo nhà cung cấp hoặc trạng thái thanh toán.")]
        public static async Task<string> SearchInvoices(
            IInvoiceService invoiceService,
            [Description("ID nhà cung cấp (GUID)")] Guid? vendorId = null,
            [Description("Trạng thái thanh toán, ví dụ: UNPAID | PAID")] string? paymentStatus = null)
        {
            var result = await invoiceService.GetAllAsync(vendorId, paymentStatus);
            return McpJson.Serialize(result);
        }

        [McpServerTool(Name = "search_ocr_jobs")]
        [Description("Liệt kê các job OCR hoá đơn. Lọc theo trạng thái xử lý.")]
        public static async Task<string> SearchOcrJobs(
            IOcrJobService ocrJobService,
            [Description("Trạng thái job OCR, ví dụ: PENDING | DONE | FAILED")] string? status = null)
        {
            var result = await ocrJobService.GetAllAsync(status);
            return McpJson.Serialize(result);
        }
    }
}
