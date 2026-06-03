using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace TH.Asset.ApplicationService.Service.Inventory.Ocr
{
    /// <summary>
    /// Hàng đợi job OCR trong bộ nhớ (Channel). <c>OcrJobService.SubmitAsync</c> đẩy id job vào,
    /// <c>OcrProcessingWorker</c> lấy ra xử lý nền. Đăng ký dạng Singleton.
    /// </summary>
    public class OcrJobQueue
    {
        private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        public ValueTask EnqueueAsync(Guid jobId, CancellationToken ct = default)
            => _channel.Writer.WriteAsync(jobId, ct);

        public IAsyncEnumerable<Guid> DequeueAllAsync(CancellationToken ct)
            => _channel.Reader.ReadAllAsync(ct);
    }
}
