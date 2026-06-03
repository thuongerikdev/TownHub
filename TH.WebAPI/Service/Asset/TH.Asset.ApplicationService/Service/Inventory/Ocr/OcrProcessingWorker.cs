using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TH.Asset.Infrastructure.Database;
using TH.Shared.ApplicationService;

namespace TH.Asset.ApplicationService.Service.Inventory.Ocr
{
    /// <summary>
    /// Worker nền xử lý job OCR: dequeue → PROCESSING → gọi engine → COMPLETED/FAILED.
    /// Kết quả (rawText + field cấu trúc) được lưu JSON vào <c>OcrJob.rawExtractedText</c>
    /// để FE đọc và prefill form Invoice ở màn InvoiceVerify (không cần migration mới).
    /// Worker là Singleton nên tự tạo scope để dùng AssetDbContext (Scoped) an toàn.
    /// </summary>
    public class OcrProcessingWorker : BackgroundService
    {
        private static readonly JsonSerializerOptions JsonOpts =
            new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        private readonly OcrJobQueue _queue;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OcrProcessingWorker> _logger;

        public OcrProcessingWorker(
            OcrJobQueue queue,
            IServiceScopeFactory scopeFactory,
            ILogger<OcrProcessingWorker> logger)
        {
            _queue        = queue;
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[OCR-WORKER] Bắt đầu lắng nghe hàng đợi OCR.");
            await foreach (var jobId in _queue.DequeueAllAsync(stoppingToken))
            {
                try { await ProcessAsync(jobId, stoppingToken); }
                catch (Exception ex) { _logger.LogError(ex, "[OCR-WORKER] Lỗi xử lý job {JobId}", jobId); }
            }
        }

        private async Task ProcessAsync(Guid jobId, CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db     = scope.ServiceProvider.GetRequiredService<AssetDbContext>();
            var engine = scope.ServiceProvider.GetRequiredService<IInvoiceOcrEngine>();

            var job = await db.OcrJobs.FirstOrDefaultAsync(x => x.id == jobId, ct);
            if (job == null) { _logger.LogWarning("[OCR-WORKER] Không tìm thấy job {JobId}", jobId); return; }

            job.status    = "PROCESSING";
            job.startedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            if (string.IsNullOrWhiteSpace(job.fileUrl))
            {
                job.status       = "FAILED";
                job.errorMessage = "Thiếu fileUrl để OCR.";
                job.completedAt  = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
                return;
            }

            // Engine thật (VietOCR/Colab) fetch ảnh qua HTTP requests.get(fileUrl) nên KHÔNG đọc
            // được 'data:' URL → lỗi "No connection adapters were found for 'data:...'".
            // FE gửi tệp dưới dạng data URL base64; ở đây upload lên Cloudinary để có URL https
            // tải được, rồi lưu lại fileUrl (vừa gọn DB, vừa cho FE xem lại chứng từ).
            if (engine.RequiresHostedUrl &&
                job.fileUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var cloud     = scope.ServiceProvider.GetRequiredService<ICloudinaryService>();
                    var hostedUrl = await UploadDataUrlAsync(cloud, job.fileUrl, job.fileName);
                    if (string.IsNullOrWhiteSpace(hostedUrl))
                    {
                        job.status       = "FAILED";
                        job.errorMessage = "Không tải được tệp lên kho ảnh để OCR. Vui lòng thử lại.";
                        job.completedAt  = DateTime.UtcNow;
                        await db.SaveChangesAsync(ct);
                        return;
                    }
                    job.fileUrl = hostedUrl;
                    await db.SaveChangesAsync(ct);
                    _logger.LogInformation("[OCR-WORKER] Job {JobId}: data URL → {Url}", jobId, hostedUrl);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[OCR-WORKER] Lỗi upload data URL job {JobId}", jobId);
                    job.status       = "FAILED";
                    job.errorMessage = "Không tải được tệp lên kho ảnh: " + ex.Message;
                    job.completedAt  = DateTime.UtcNow;
                    await db.SaveChangesAsync(ct);
                    return;
                }
            }

            var result = await engine.ExtractAsync(job.fileUrl, ct);

            if (result.Success)
            {
                job.rawExtractedText = JsonSerializer.Serialize(new
                {
                    rawText   = result.RawText,
                    fields    = result.Fields,
                    lineItems = result.LineItems
                }, JsonOpts);
                job.confidenceScore = result.Confidence;
                job.status          = "COMPLETED";   // khớp từ vựng trạng thái phía FE (OCRUpload/OCRResult/mock)
                job.errorMessage    = null;
            }
            else
            {
                job.status       = "FAILED";
                job.errorMessage = result.ErrorMessage;
            }
            job.completedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            _logger.LogInformation("[OCR-WORKER] Job {JobId} → {Status} (confidence={Conf})",
                jobId, job.status, job.confidenceScore);
        }

        // ── Helpers: decode 'data:' URL base64 → upload Cloudinary → URL https ───────
        private static async Task<string?> UploadDataUrlAsync(
            ICloudinaryService cloud, string dataUrl, string? fileName)
        {
            // Định dạng: data:[<mediatype>][;base64],<payload>
            var comma = dataUrl.IndexOf(',');
            if (comma < 0) return null;

            var header  = dataUrl.Substring(5, comma - 5); // bỏ tiền tố "data:"
            var payload = dataUrl.Substring(comma + 1);

            var isBase64  = header.Contains(";base64", StringComparison.OrdinalIgnoreCase);
            var mediaType = header.Split(';')[0];
            if (string.IsNullOrWhiteSpace(mediaType)) mediaType = "application/octet-stream";

            var bytes = isBase64
                ? Convert.FromBase64String(payload)
                : Encoding.UTF8.GetBytes(Uri.UnescapeDataString(payload));
            if (bytes.Length == 0) return null;

            var name = string.IsNullOrWhiteSpace(fileName)
                ? "ocr-" + Guid.NewGuid().ToString("N") + GuessExtension(mediaType)
                : fileName;

            using var ms = new MemoryStream(bytes);
            IFormFile form = new FormFile(ms, 0, bytes.Length, "file", name)
            {
                Headers     = new HeaderDictionary(),
                ContentType = mediaType
            };
            return await cloud.UploadImageAsync(form);
        }

        private static string GuessExtension(string mediaType) => mediaType.ToLowerInvariant() switch
        {
            "image/jpeg"      => ".jpg",
            "image/jpg"       => ".jpg",
            "image/png"       => ".png",
            "image/webp"      => ".webp",
            "image/gif"       => ".gif",
            "application/pdf" => ".pdf",
            _                 => ".bin"
        };
    }
}
