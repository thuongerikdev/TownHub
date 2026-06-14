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
        /// <summary>
        /// Engine có cần <c>fileUrl</c> là URL http(s) tải được không?
        /// Engine thật (VietOCR trên Colab) fetch ảnh qua <c>requests.get(fileUrl)</c> nên
        /// KHÔNG đọc được <c>data:</c> URL → worker phải upload lên kho ảnh trước.
        /// Mock engine bỏ qua fileUrl nên trả <c>false</c> (test không cần Cloudinary).
        /// </summary>
        bool RequiresHostedUrl { get; }

        Task<OcrExtractionResult> ExtractAsync(string fileUrl, string ocrEngine = "gemini", CancellationToken ct = default);
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
