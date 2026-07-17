using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace TH.Asset.ApplicationService.Service.Inventory.Ocr
{
    /// <summary>
    /// Engine thật: gọi service VietOCR đang chạy trên Google Colab (qua tunnel cloudflared).
    /// HttpClient.BaseAddress được cấu hình ở AssetStartUp từ .env (OCR_SERVICE_URL);
    /// khoá bảo vệ đọc từ OCR_API_KEY và gửi qua header X-API-Key.
    /// JSON response khớp notebook: { status, confidence, rawText, fields{...}, errorMessage }.
    /// </summary>
    public class VietOcrEngine : IInvoiceOcrEngine
    {
        private readonly HttpClient _http;
        private readonly ILogger<VietOcrEngine> _logger;
        private readonly string _apiKey;

        public VietOcrEngine(HttpClient http, IConfiguration config, ILogger<VietOcrEngine> logger)
        {
            _http    = http;
            _logger  = logger;
            _apiKey  = config["OCR_API_KEY"] ?? "";
        }

        // VietOCR service fetch ảnh qua requests.get(fileUrl) → bắt buộc URL http(s) tải được.
        public bool RequiresHostedUrl => true;

        public async Task<OcrExtractionResult> ExtractAsync(string fileUrl, string model, CancellationToken ct = default)
        {
            try
            {
                // Gửi kèm "model" để service Python chọn engine (gemini | vietocr | paddleocr).
                using var req = new HttpRequestMessage(HttpMethod.Post, "extract")
                {
                    Content = JsonContent.Create(new { fileUrl, model })
                };
                if (!string.IsNullOrEmpty(_apiKey))
                    req.Headers.Add("X-API-Key", _apiKey);

                using var resp = await _http.SendAsync(req, ct);
                resp.EnsureSuccessStatusCode();

                var dto = await resp.Content.ReadFromJsonAsync<VietOcrResponse>(cancellationToken: ct);
                if (dto == null)
                    return new OcrExtractionResult { Success = false, ErrorMessage = "OCR service trả về rỗng." };

                if (!string.Equals(dto.Status, "DONE", StringComparison.OrdinalIgnoreCase))
                    return new OcrExtractionResult { Success = false, ErrorMessage = dto.ErrorMessage ?? "OCR thất bại." };

                var f = dto.Fields ?? new VietOcrFields();
                return new OcrExtractionResult
                {
                    Success    = true,
                    RawText    = dto.RawText,
                    Confidence = dto.Confidence,
                    Fields = new OcrInvoiceFields
                    {
                        InvoiceNumber = f.InvoiceNumber,
                        InvoiceDate   = f.InvoiceDate,
                        SellerName    = f.SellerName,
                        SellerTaxCode = f.SellerTaxCode,
                        Subtotal      = f.Subtotal,
                        TaxAmount     = f.TaxAmount,
                        TotalAmount   = f.TotalAmount,
                        Currency      = string.IsNullOrWhiteSpace(f.Currency) ? "VND" : f.Currency
                    },
                    // Đọc bảng chi tiết do service bóc tách (parser deskew + gán cột).
                    LineItems = (dto.LineItems ?? new List<VietOcrLineItem>())
                        .Select(li => new OcrLineItem
                        {
                            Description = li.Description,
                            Quantity    = li.Quantity,
                            UnitPrice   = li.UnitPrice,
                            TotalPrice  = li.TotalPrice
                        })
                        .ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OCR-VIET] Lỗi gọi VietOCR service cho {Url}", fileUrl);
                return new OcrExtractionResult { Success = false, ErrorMessage = "Không gọi được OCR service: " + ex.Message };
            }
        }

        // ── DTO khớp JSON từ notebook Colab (camelCase) ──
        private sealed class VietOcrResponse
        {
            [JsonPropertyName("status")]       public string? Status { get; set; }
            [JsonPropertyName("confidence")]   public decimal? Confidence { get; set; }
            [JsonPropertyName("rawText")]      public string? RawText { get; set; }
            [JsonPropertyName("fields")]       public VietOcrFields? Fields { get; set; }
            [JsonPropertyName("lineItems")]    public List<VietOcrLineItem>? LineItems { get; set; }
            [JsonPropertyName("errorMessage")] public string? ErrorMessage { get; set; }
        }

        private sealed class VietOcrLineItem
        {
            [JsonPropertyName("description")] public string? Description { get; set; }
            [JsonPropertyName("quantity")]    public decimal? Quantity { get; set; }
            [JsonPropertyName("unitPrice")]   public decimal? UnitPrice { get; set; }
            [JsonPropertyName("totalPrice")]  public decimal? TotalPrice { get; set; }
        }

        private sealed class VietOcrFields
        {
            [JsonPropertyName("invoiceNumber")] public string? InvoiceNumber { get; set; }
            [JsonPropertyName("invoiceDate")]   public string? InvoiceDate { get; set; }
            [JsonPropertyName("sellerName")]    public string? SellerName { get; set; }
            [JsonPropertyName("sellerTaxCode")] public string? SellerTaxCode { get; set; }
            [JsonPropertyName("subtotal")]      public decimal? Subtotal { get; set; }
            [JsonPropertyName("taxAmount")]     public decimal? TaxAmount { get; set; }
            [JsonPropertyName("totalAmount")]   public decimal? TotalAmount { get; set; }
            [JsonPropertyName("currency")]      public string? Currency { get; set; }
        }
    }
}
