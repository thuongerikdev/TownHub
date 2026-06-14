using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace TH.Asset.ApplicationService.Service.Inventory.Ocr
{
    /// <summary>
    /// Engine giả lập — dùng khi chưa cấu hình OCR_SERVICE_URL. Trả dữ liệu mẫu để test
    /// toàn luồng QUEUED → PROCESSING → DONE mà không cần Colab/VietOCR thật.
    /// </summary>
    public class MockOcrEngine : IInvoiceOcrEngine
    {
        private readonly ILogger<MockOcrEngine> _logger;
        public MockOcrEngine(ILogger<MockOcrEngine> logger) => _logger = logger;

        // Mock bỏ qua fileUrl (không fetch) → không cần URL http, không cần Cloudinary.
        public bool RequiresHostedUrl => false;

        public async Task<OcrExtractionResult> ExtractAsync(string fileUrl, string ocrEngine = "gemini", CancellationToken ct = default)
        {
            _logger.LogInformation("[OCR-MOCK] Giả lập đọc hoá đơn từ: {Url}", fileUrl);
            await Task.Delay(800, ct); // giả lập độ trễ xử lý OCR

            return new OcrExtractionResult
            {
                Success    = true,
                Confidence = 0.92m,
                RawText    = "CÔNG TY TNHH MẪU\nMST: 0312345678\nSố: HD000123\n"
                           + "Ngày 20 tháng 05 năm 2026\n"
                           + "Cộng tiền hàng: 1.000.000\nTiền thuế GTGT: 100.000\n"
                           + "Tổng cộng tiền thanh toán: 1.100.000",
                Fields = new OcrInvoiceFields
                {
                    InvoiceNumber = "HD000123",
                    InvoiceDate   = "2026-05-20",
                    SellerName    = "CÔNG TY TNHH MẪU",
                    SellerTaxCode = "0312345678",
                    Subtotal      = 1_000_000m,
                    TaxAmount     = 100_000m,
                    TotalAmount   = 1_100_000m,
                    Currency      = "VND"
                }
            };
        }
    }
}
