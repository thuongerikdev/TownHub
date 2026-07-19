using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TH.Asset.Infrastructure.Database;

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
                    var cloud = scope.ServiceProvider.GetRequiredService<Cloudinary>();
                    var (hostedUrl, uploadError) = await UploadDataUrlAsync(cloud, job.fileUrl, job.fileName, ct);
                    if (string.IsNullOrWhiteSpace(hostedUrl))
                    {
                        job.status       = "FAILED";
                        job.errorMessage = "Không tải được tệp lên kho ảnh để OCR: " + (uploadError ?? "lỗi không xác định");
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

            var model = string.IsNullOrWhiteSpace(job.ocrEngine) ? "gemini" : job.ocrEngine;
            var result = await engine.ExtractAsync(job.fileUrl, model, ct);

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
        // Upload trực tiếp bằng Cloudinary (singleton) với MemoryStream seekable thật, KHÔNG
        // qua FormFile.OpenReadStream() (ReferenceReadStream có thể ném khi đọc Length →
        // SDK báo upload fail, trả SecureUrl null). Trả kèm thông điệp lỗi thật để FE thấy rõ.
        private static async Task<(string? url, string? error)> UploadDataUrlAsync(
            Cloudinary cloud, string dataUrl, string? fileName, CancellationToken ct)
        {
            // Định dạng: data:[<mediatype>][;base64],<payload>
            var comma = dataUrl.IndexOf(',');
            if (comma < 0) return (null, "fileUrl không phải data URL hợp lệ.");

            var header  = dataUrl.Substring(5, comma - 5); // bỏ tiền tố "data:"
            var payload = dataUrl.Substring(comma + 1);

            var isBase64  = header.Contains(";base64", StringComparison.OrdinalIgnoreCase);
            var mediaType = header.Split(';')[0];
            if (string.IsNullOrWhiteSpace(mediaType)) mediaType = "application/octet-stream";

            var bytes = isBase64
                ? Convert.FromBase64String(payload)
                : Encoding.UTF8.GetBytes(Uri.UnescapeDataString(payload));
            if (bytes.Length == 0) return (null, "Nội dung tệp rỗng.");

            var name = string.IsNullOrWhiteSpace(fileName)
                ? "ocr-" + Guid.NewGuid().ToString("N") + GuessExtension(mediaType)
                : fileName;

            using var ms = new MemoryStream(bytes, writable: false);

            // Dùng ImageUploadParams cho cả ảnh lẫn PDF (Cloudinary nhận PDF dưới resource_type=image).
            var result = await cloud.UploadAsync(new ImageUploadParams
            {
                File           = new FileDescription(name, ms),
                Folder         = "ocr",
                UseFilename    = true,
                UniqueFilename = true,
                Overwrite      = false
            }, ct);

            if (result?.SecureUrl != null)
                return (result.SecureUrl.ToString(), null);

            var err = result?.Error?.Message ?? ("Cloudinary trả về HTTP " + (int?)result?.StatusCode);
            return (null, err);
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
