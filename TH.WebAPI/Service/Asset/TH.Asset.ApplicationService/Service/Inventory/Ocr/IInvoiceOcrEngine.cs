using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace TH.Asset.ApplicationService.Service.Inventory.Ocr
{
    /// <summary>
    /// Trừu tượng hoá engine OCR đọc hoá đơn. Cho phép hoán đổi giữa
    /// <see cref="MockOcrEngine"/> (test, không cần backend) và
    /// <see cref="VietOcrEngine"/> (gọi service VietOCR thật trên Colab).
    /// </summary>
    public interface IInvoiceOcrEngine
    {
        Task<OcrExtractionResult> ExtractAsync(string fileUrl, CancellationToken ct = default);
    }

    /// <summary>Kết quả OCR đã chuẩn hoá để worker ghi vào OcrJob + (sau này) Invoice.</summary>
    public class OcrExtractionResult
    {
        public bool Success { get; set; }
        public string? RawText { get; set; }
        public decimal? Confidence { get; set; }
        public OcrInvoiceFields Fields { get; set; } = new();
        public List<OcrLineItem> LineItems { get; set; } = new();
        public string? ErrorMessage { get; set; }
    }

    /// <summary>Các trường hoá đơn bóc được (best-effort; người dùng đối chiếu lại).</summary>
    public class OcrInvoiceFields
    {
        public string? InvoiceNumber { get; set; }
        public string? InvoiceDate { get; set; }   // ISO yyyy-MM-dd
        public string? SellerName { get; set; }
        public string? SellerTaxCode { get; set; }
        public decimal? Subtotal { get; set; }
        public decimal? TaxAmount { get; set; }
        public decimal? TotalAmount { get; set; }
        public string? Currency { get; set; }
    }

    public class OcrLineItem
    {
        public string? Description { get; set; }
        public decimal? Quantity { get; set; }
        public decimal? UnitPrice { get; set; }
        public decimal? TotalPrice { get; set; }
    }
}
