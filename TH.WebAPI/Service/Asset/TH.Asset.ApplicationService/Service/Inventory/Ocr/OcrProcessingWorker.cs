using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
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
    }
}
