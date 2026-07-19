using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using TH.Constant;
using TH.TownHub.Dtos;

namespace TH.TownHub.ApplicationService.Service
{
    /// <summary>
    /// Nhận diện hư hỏng từ ảnh (YOLOv8, service Python độc lập — xem AI/damage-service) để
    /// gợi ý category khi cư dân tìm nhà cung cấp dịch vụ ở Portal (app/portal/page.tsx).
    /// </summary>
    public interface IDamageDetectionService
    {
        Task<ResponseDto<DamageDetectionResponse>> DetectAsync(DetectDamageRequestDto request);
    }

    public class DamageDetectionService : IDamageDetectionService
    {
        private readonly ILogger<DamageDetectionService> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _aiBaseUrl;

        public DamageDetectionService(ILogger<DamageDetectionService> logger)
        {
            _logger     = logger;
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
            _aiBaseUrl  = Environment.GetEnvironmentVariable("DAMAGE_AI_URL") ?? "http://localhost:8002";
        }

        // Nhãn YOLO (apartment_damage_detection.ipynb) → category dùng ở Portal (CAT_META
        // trong app/portal/page.tsx). Chỉ electrical_damage khớp trực tiếp; các lỗi kết
        // cấu/vật liệu còn lại phù hợp với nhóm "Sửa chữa & Cải tạo" hơn cả.
        private static readonly Dictionary<string, string> DamageLabelToCategory = new()
        {
            ["wall_crack"] = "renovation",
            ["floor_crack"] = "renovation",
            ["tile_defect"] = "renovation",
            ["electrical_damage"] = "electrical",
            ["building_damage"] = "renovation",
        };

        private static readonly Dictionary<string, string> DamageLabelToVi = new()
        {
            ["wall_crack"] = "Nứt tường",
            ["floor_crack"] = "Nứt sàn",
            ["tile_defect"] = "Lỗi gạch",
            ["electrical_damage"] = "Hỏng hóc điện",
            ["building_damage"] = "Hư hỏng công trình",
        };

        public async Task<ResponseDto<DamageDetectionResponse>> DetectAsync(DetectDamageRequestDto request)
        {
            // Service AI chạy độc lập, có thể chưa bật lúc dev/demo — lỗi gọi service KHÔNG
            // phải lỗi cứng, trả available=false để trang Portal vẫn tìm kiếm bình thường.
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, _aiBaseUrl.TrimEnd('/') + "/detect")
                {
                    Content = JsonContent.Create(new { imageDataUrl = request.imageDataUrl })
                };
                using var resp = await _httpClient.SendAsync(req);
                if (!resp.IsSuccessStatusCode)
                    return ResponseConst.Success("Dịch vụ AI không khả dụng.", new DamageDetectionResponse { available = false });

                var dto = await resp.Content.ReadFromJsonAsync<DamageDetectResponse>();
                var items = (dto?.Detections ?? new List<DamageDetectItem>())
                    .Select(d => new DamageDetectionItem
                    {
                        label      = d.Label,
                        labelVi    = DamageLabelToVi.TryGetValue(d.Label, out var vi) ? vi : d.Label,
                        confidence = d.Confidence
                    })
                    .ToList();

                string? suggestedCategory = dto?.TopLabel != null && DamageLabelToCategory.TryGetValue(dto.TopLabel, out var cat)
                    ? cat
                    : null;

                return ResponseConst.Success("Nhận diện hư hỏng thành công.", new DamageDetectionResponse
                {
                    available         = true,
                    detections        = items,
                    suggestedCategory = suggestedCategory,
                    topConfidence     = dto?.TopConfidence
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[DAMAGE-AI] Không gọi được service nhận diện hư hỏng tại {Url}", _aiBaseUrl);
                return ResponseConst.Success("Dịch vụ AI không khả dụng.", new DamageDetectionResponse { available = false });
            }
        }

        // ── DTO khớp JSON trả về từ damage-service (FastAPI, camelCase) ──
        private sealed class DamageDetectResponse
        {
            [JsonPropertyName("detections")]    public List<DamageDetectItem>? Detections { get; set; }
            [JsonPropertyName("topLabel")]      public string? TopLabel { get; set; }
            [JsonPropertyName("topConfidence")] public double? TopConfidence { get; set; }
        }

        private sealed class DamageDetectItem
        {
            [JsonPropertyName("label")]      public string Label { get; set; } = null!;
            [JsonPropertyName("confidence")] public double Confidence { get; set; }
        }
    }
}
