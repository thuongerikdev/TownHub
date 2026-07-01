using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using TH.Constant;
using TH.TownHub.ApplicationService.Common;
using TH.TownHub.Domain.Entities;
using TH.TownHub.Dtos;
using TH.TownHub.Infrastructure.Database;

namespace TH.TownHub.ApplicationService.Service
{
    public interface IAccessControlService
    {
        Task<ResponseDto<FaceProfileResponse>> RegisterFaceAsync(RegisterFaceRequestDto request);
        Task<ResponseDto<FaceProfileResponse>> GetFaceAsync(int residentId);
        Task<ResponseDto<bool>> DeleteFaceAsync(int residentId);
        Task<ResponseDto<bool>> UpdateFaceAiResultAsync(int residentId, UpdateFaceAiResultRequestDto request);
        Task<ResponseDto<AccessEventResponse>> CreateEventAsync(CreateAccessEventRequestDto request);
        Task<ResponseDto<List<AccessEventResponse>>> GetEventsAsync(string? personType, string? status, string? direction);
        Task<ResponseDto<bool>> HandleEventAsync(long id, HandleAccessEventRequestDto request);
        Task<ResponseDto<bool>> DeleteEventAsync(long id);
        Task<ResponseDto<CameraRecognitionResponse>> AnalyzeFrameAsync(AnalyzeCameraFrameRequestDto request);
    }

    public class AccessControlService : TownHubServiceBase, IAccessControlService
    {
        public AccessControlService(ILogger<AccessControlService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext)
        {
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
            _aiBaseUrl = Environment.GetEnvironmentVariable("FACE_AI_URL") ?? "http://localhost:8001";
        }

        private readonly HttpClient _httpClient;
        private readonly string _aiBaseUrl;

        public async Task<ResponseDto<FaceProfileResponse>> RegisterFaceAsync(RegisterFaceRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.imageUrl))
                return ResponseConst.Error<FaceProfileResponse>(400, "Ảnh khuôn mặt là bắt buộc.");

            var resident = await _dbContext.Residents.FindAsync(request.residentId);
            if (resident == null)
                return ResponseConst.Error<FaceProfileResponse>(404, "Không tìm thấy cư dân.");

            var profile = await _dbContext.FaceProfiles.FirstOrDefaultAsync(x => x.ResidentId == request.residentId);
            if (profile == null)
            {
                profile = new FaceProfile { ResidentId = request.residentId, ImageUrl = request.imageUrl };
                _dbContext.FaceProfiles.Add(profile);
            }
            else
            {
                profile.ImageUrl = request.imageUrl;
                profile.AiStatus = "pending";
                profile.EmbeddingRef = null;
                profile.FailureReason = null;
                profile.RegisteredAt = DateTime.UtcNow;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            try
            {
                using var validationResponse = await _httpClient.PostAsJsonAsync(
                    $"{_aiBaseUrl.TrimEnd('/')}/validate",
                    new { imageDataUrl = request.imageUrl });
                if (validationResponse.IsSuccessStatusCode)
                {
                    var validation = await validationResponse.Content.ReadFromJsonAsync<AiValidationResult>();
                    profile.AiStatus = validation?.faceDetected == true ? "ready" : "failed";
                    profile.FailureReason = validation?.faceDetected == true
                        ? null
                        : "Không phát hiện khuôn mặt rõ ràng trong ảnh đăng ký.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Face AI chưa sẵn sàng; hồ sơ {ResidentId} giữ trạng thái pending.", request.residentId);
            }
            await _dbContext.SaveChangesAsync();
            return ResponseConst.Success("Đã tiếp nhận ảnh để đăng ký AI.", MapFace(profile, resident.FullName));
        }

        public async Task<ResponseDto<FaceProfileResponse>> GetFaceAsync(int residentId)
        {
            var profile = await _dbContext.FaceProfiles.Include(x => x.Resident)
                .FirstOrDefaultAsync(x => x.ResidentId == residentId);
            return profile == null
                ? ResponseConst.Error<FaceProfileResponse>(404, "Cư dân chưa đăng ký khuôn mặt.")
                : ResponseConst.Success("Lấy hồ sơ khuôn mặt thành công.", MapFace(profile, profile.Resident.FullName));
        }

        public async Task<ResponseDto<bool>> DeleteFaceAsync(int residentId)
        {
            var profile = await _dbContext.FaceProfiles.FirstOrDefaultAsync(x => x.ResidentId == residentId);
            if (profile == null) return ResponseConst.Error<bool>(404, "Không tìm thấy hồ sơ khuôn mặt.");
            _dbContext.FaceProfiles.Remove(profile);
            await _dbContext.SaveChangesAsync();
            return ResponseConst.Success("Đã xóa đăng ký khuôn mặt.", true);
        }

        public async Task<ResponseDto<bool>> UpdateFaceAiResultAsync(int residentId, UpdateFaceAiResultRequestDto request)
        {
            var profile = await _dbContext.FaceProfiles.FirstOrDefaultAsync(x => x.ResidentId == residentId);
            if (profile == null) return ResponseConst.Error<bool>(404, "Không tìm thấy hồ sơ khuôn mặt.");
            profile.AiStatus = request.aiStatus;
            profile.EmbeddingRef = request.embeddingRef;
            profile.FailureReason = request.failureReason;
            profile.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return ResponseConst.Success("Đã cập nhật kết quả AI.", true);
        }

        public async Task<ResponseDto<AccessEventResponse>> CreateEventAsync(CreateAccessEventRequestDto request)
        {
            if (request.direction is not ("in" or "out"))
                return ResponseConst.Error<AccessEventResponse>(400, "Hướng di chuyển phải là 'in' hoặc 'out'.");
            if (request.personType is not ("resident" or "stranger"))
                return ResponseConst.Error<AccessEventResponse>(400, "Loại đối tượng phải là 'resident' hoặc 'stranger'.");
            if (request.personType == "resident" && !request.residentId.HasValue)
                return ResponseConst.Error<AccessEventResponse>(400, "Sự kiện cư dân phải có residentId.");

            Resident? resident = null;
            if (request.residentId.HasValue)
            {
                resident = await _dbContext.Residents.FindAsync(request.residentId.Value);
                if (resident == null) return ResponseConst.Error<AccessEventResponse>(404, "Không tìm thấy cư dân.");
            }

            var entity = new AccessEvent
            {
                ResidentId = request.residentId,
                PersonType = request.personType,
                Direction = request.direction,
                CameraName = request.cameraName,
                SnapshotUrl = request.snapshotUrl,
                Confidence = request.confidence,
                DetectedAt = request.detectedAt ?? DateTime.UtcNow
            };
            _dbContext.AccessEvents.Add(entity);
            await _dbContext.SaveChangesAsync();
            return ResponseConst.Success("Đã ghi nhận sự kiện ra/vào.", MapEvent(entity, resident?.FullName));
        }

        public async Task<ResponseDto<List<AccessEventResponse>>> GetEventsAsync(string? personType, string? status, string? direction)
        {
            var query = _dbContext.AccessEvents.Include(x => x.Resident).AsQueryable();
            if (!string.IsNullOrWhiteSpace(personType)) query = query.Where(x => x.PersonType == personType);
            if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
            if (!string.IsNullOrWhiteSpace(direction)) query = query.Where(x => x.Direction == direction);
            var items = await query.OrderByDescending(x => x.DetectedAt).Take(500)
                .Select(x => new AccessEventResponse
                {
                    id = x.Id,
                    residentId = x.ResidentId,
                    residentName = x.Resident != null ? x.Resident.FullName : null,
                    personType = x.PersonType,
                    direction = x.Direction,
                    cameraName = x.CameraName,
                    snapshotUrl = x.SnapshotUrl,
                    confidence = x.Confidence,
                    status = x.Status,
                    note = x.Note,
                    handledByAuthUserId = x.HandledByAuthUserId,
                    handledAt = x.HandledAt,
                    detectedAt = x.DetectedAt
                }).ToListAsync();
            return ResponseConst.Success("Lấy sự kiện ra/vào thành công.", items);
        }

        public async Task<ResponseDto<bool>> HandleEventAsync(long id, HandleAccessEventRequestDto request)
        {
            var entity = await _dbContext.AccessEvents.FindAsync(id);
            if (entity == null) return ResponseConst.Error<bool>(404, "Không tìm thấy sự kiện.");
            entity.Status = request.status;
            entity.Note = request.note;
            entity.HandledByAuthUserId = request.handledByAuthUserId;
            entity.HandledAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return ResponseConst.Success("Đã cập nhật sự kiện.", true);
        }

        public async Task<ResponseDto<bool>> DeleteEventAsync(long id)
        {
            var entity = await _dbContext.AccessEvents.FindAsync(id);
            if (entity == null) return ResponseConst.Error<bool>(404, "Không tìm thấy sự kiện.");
            if (!string.Equals(entity.Status, "resolved", StringComparison.OrdinalIgnoreCase))
                return ResponseConst.Error<bool>(400, "Chỉ có thể xóa sự kiện đã xử lý.");

            _dbContext.AccessEvents.Remove(entity);
            await _dbContext.SaveChangesAsync();
            return ResponseConst.Success("Đã xóa sự kiện.", true);
        }

        public async Task<ResponseDto<CameraRecognitionResponse>> AnalyzeFrameAsync(AnalyzeCameraFrameRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.imageDataUrl) || string.IsNullOrWhiteSpace(request.cameraName))
                return ResponseConst.Error<CameraRecognitionResponse>(400, "Ảnh và tên camera là bắt buộc.");
            if (request.direction is not ("in" or "out"))
                return ResponseConst.Error<CameraRecognitionResponse>(400, "Hướng di chuyển phải là 'in' hoặc 'out'.");

            var candidates = await _dbContext.FaceProfiles
                .Include(x => x.Resident)
                .Select(x => new
                {
                    residentId = x.ResidentId,
                    residentName = x.Resident.FullName,
                    imageDataUrl = x.ImageUrl
                })
                .ToListAsync();

            AiRecognitionResult? aiResult;
            try
            {
                using var response = await _httpClient.PostAsJsonAsync(
                    $"{_aiBaseUrl.TrimEnd('/')}/recognize",
                    new { probeImage = request.imageDataUrl, candidates, tolerance = 0.5 });
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Face AI returned status {Status}", response.StatusCode);
                    return ResponseConst.Error<CameraRecognitionResponse>(503, "Dịch vụ AI nhận diện đang lỗi.");
                }
                aiResult = await response.Content.ReadFromJsonAsync<AiRecognitionResult>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Không kết nối được Face AI tại {Url}", _aiBaseUrl);
                return ResponseConst.Error<CameraRecognitionResponse>(503, "Không kết nối được dịch vụ AI nhận diện.");
            }

            if (aiResult == null || !aiResult.faceDetected)
            {
                return ResponseConst.Success("Không phát hiện khuôn mặt.", new CameraRecognitionResponse
                {
                    faceDetected = false,
                    matched = false,
                    result = "no_face",
                    message = "Không phát hiện khuôn mặt trong khung hình."
                });
            }

            var matchedCandidate = aiResult.matchedResidentId.HasValue
                ? candidates.FirstOrDefault(x => x.residentId == aiResult.matchedResidentId.Value)
                : null;
            var personType = matchedCandidate != null ? "resident" : "stranger";
            var cutoff = DateTime.UtcNow.AddSeconds(-30);
            var duplicateQuery = _dbContext.AccessEvents
                .Where(x => x.CameraName == request.cameraName
                    && x.Direction == request.direction
                    && x.DetectedAt >= cutoff);

            duplicateQuery = personType == "stranger"
                ? duplicateQuery.Where(x => x.PersonType == "stranger")
                : duplicateQuery.Where(x => x.PersonType == "resident" && x.ResidentId == matchedCandidate!.residentId);

            var duplicate = await duplicateQuery.OrderByDescending(x => x.DetectedAt).FirstOrDefaultAsync();
            var accessEvent = duplicate;
            if (accessEvent == null)
            {
                accessEvent = new AccessEvent
                {
                    ResidentId = matchedCandidate?.residentId,
                    PersonType = personType,
                    Direction = request.direction,
                    CameraName = request.cameraName,
                    SnapshotUrl = request.imageDataUrl,
                    Confidence = aiResult.confidence,
                    DetectedAt = DateTime.UtcNow
                };
                _dbContext.AccessEvents.Add(accessEvent);
                await _dbContext.SaveChangesAsync();
            }

            var isMatched = matchedCandidate != null;
            return ResponseConst.Success(isMatched ? "Đã nhận diện cư dân." : "Phát hiện người lạ.", new CameraRecognitionResponse
            {
                faceDetected = true,
                matched = isMatched,
                residentId = matchedCandidate?.residentId,
                residentName = matchedCandidate?.residentName,
                confidence = aiResult.confidence,
                eventCreated = duplicate == null,
                eventId = accessEvent.Id,
                result = isMatched ? "resident" : "stranger",
                message = isMatched
                    ? $"Nhận diện: {matchedCandidate!.residentName}"
                    : "Không khớp cư dân đã đăng ký. Đã chuyển sang cảnh báo người lạ."
            });
        }

        private sealed class AiRecognitionResult
        {
            public bool faceDetected { get; set; }
            public int? matchedResidentId { get; set; }
            public double? confidence { get; set; }
        }

        private sealed class AiValidationResult
        {
            public bool faceDetected { get; set; }
        }

        private static FaceProfileResponse MapFace(FaceProfile x, string residentName) => new()
        {
            id = x.Id, residentId = x.ResidentId, residentName = residentName, imageUrl = x.ImageUrl,
            aiStatus = x.AiStatus, failureReason = x.FailureReason, registeredAt = x.RegisteredAt
        };

        private static AccessEventResponse MapEvent(AccessEvent x, string? residentName) => new()
        {
            id = x.Id, residentId = x.ResidentId, residentName = residentName, personType = x.PersonType,
            direction = x.Direction, cameraName = x.CameraName, snapshotUrl = x.SnapshotUrl,
            confidence = x.Confidence, status = x.Status, note = x.Note,
            handledByAuthUserId = x.HandledByAuthUserId, handledAt = x.HandledAt, detectedAt = x.DetectedAt
        };
    }
}
