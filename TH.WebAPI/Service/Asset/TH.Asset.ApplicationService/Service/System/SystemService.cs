using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Dtos;
using TH.Asset.Domain.System;
using TH.Asset.Infrastructure.Database;
using TH.Constant;
using AssetEntity = TH.Asset.Domain.Core.Asset;

namespace TH.Asset.ApplicationService.Service.System
{
    // ════════════════════════════════════════════════════════════════════════
    // KPI SNAPSHOT SERVICE
    // ════════════════════════════════════════════════════════════════════════
    public interface IKpiSnapshotService
    {
        Task<ResponseDto<bool>> CreateAsync(Guid buildingId, DateTime snapshotDate, string kpiDataJson);
        Task<ResponseDto<KpiDailySnapshotResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<KpiDailySnapshotResponse>>> GetByBuildingAsync(Guid buildingId, int take = 90);
        Task<ResponseDto<List<KpiDailySnapshotResponse>>> GetByDateRangeAsync(Guid buildingId, DateTime from, DateTime to);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
    }

    public class KpiSnapshotService : AssetServiceBase, IKpiSnapshotService
    {
        public KpiSnapshotService(ILogger<KpiSnapshotService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(Guid buildingId, DateTime snapshotDate, string kpiDataJson)
        {
            try
            {
                var date = DateTime.SpecifyKind(snapshotDate.Date, DateTimeKind.Utc);

                if (await _dbContext.KpiDailySnapshots.AnyAsync(s =>
                        s.buildingId == buildingId && s.snapshotDate == date))
                    return ResponseConst.Error<bool>(400,
                        $"Snapshot KPI cho tòa nhà và ngày {date:yyyy-MM-dd} đã tồn tại.");

                _dbContext.KpiDailySnapshots.Add(new KpiDailySnapshot
                {
                    buildingId   = buildingId,
                    snapshotDate = date,
                    kpiDataJson  = kpiDataJson,
                    createdAt    = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Tạo KPI snapshot thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo KPI snapshot.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<KpiDailySnapshotResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.KpiDailySnapshots.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<KpiDailySnapshotResponse>(404, "Không tìm thấy KPI snapshot.");

                return ResponseConst.Success("OK", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy KPI snapshot {Id}.", id);
                return ResponseConst.Error<KpiDailySnapshotResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<KpiDailySnapshotResponse>>> GetByBuildingAsync(Guid buildingId, int take = 90)
        {
            try
            {
                var list = await _dbContext.KpiDailySnapshots
                    .Where(s => s.buildingId == buildingId)
                    .OrderByDescending(s => s.snapshotDate)
                    .Take(take)
                    .Select(s => MapToResponse(s))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy KPI snapshots của tòa nhà {BuildingId}.", buildingId);
                return ResponseConst.Error<List<KpiDailySnapshotResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<KpiDailySnapshotResponse>>> GetByDateRangeAsync(
            Guid buildingId, DateTime from, DateTime to)
        {
            try
            {
                var fromDate = DateTime.SpecifyKind(from.Date, DateTimeKind.Utc);
                var toDate   = DateTime.SpecifyKind(to.Date, DateTimeKind.Utc);

                if (fromDate > toDate)
                    return ResponseConst.Error<List<KpiDailySnapshotResponse>>(400,
                        "Ngày bắt đầu phải trước ngày kết thúc.");

                var list = await _dbContext.KpiDailySnapshots
                    .Where(s => s.buildingId == buildingId
                             && s.snapshotDate >= fromDate
                             && s.snapshotDate <= toDate)
                    .OrderBy(s => s.snapshotDate)
                    .Select(s => MapToResponse(s))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy KPI snapshots theo ngày.");
                return ResponseConst.Error<List<KpiDailySnapshotResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.KpiDailySnapshots.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy KPI snapshot.");

                _dbContext.KpiDailySnapshots.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa KPI snapshot thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa KPI snapshot {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static KpiDailySnapshotResponse MapToResponse(KpiDailySnapshot e) => new()
        {
            id           = e.id,
            buildingId   = e.buildingId,
            snapshotDate = e.snapshotDate,
            kpiDataJson  = e.kpiDataJson,
            createdAt    = e.createdAt
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // COST TRACKING SERVICE
    // ════════════════════════════════════════════════════════════════════════
    public interface ICostTrackingService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateCostTrackingDto request);
        Task<ResponseDto<CostTrackingResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<CostTrackingResponse>>> GetByReferenceAsync(string referenceType, Guid referenceId);
        Task<ResponseDto<List<CostTrackingResponse>>> GetByBuildingAsync(
            Guid buildingId, DateTime? from = null, DateTime? to = null, string? costType = null);
        Task<ResponseDto<List<CostTrackingResponse>>> GetByAssetAsync(Guid assetId);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
    }

    public class CostTrackingService : AssetServiceBase, ICostTrackingService
    {
        private static readonly string[] ValidReferenceTypes =
            { "WORK_ORDER", "TICKET", "PURCHASE_ORDER", "INVOICE" };

        private static readonly string[] ValidCostTypes =
            { "LABOR", "MATERIAL", "SERVICE", "OTHER" };

        public CostTrackingService(ILogger<CostTrackingService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateCostTrackingDto request)
        {
            try
            {
                if (!ValidReferenceTypes.Contains(request.referenceType))
                    return ResponseConst.Error<bool>(400,
                        $"referenceType không hợp lệ. Giá trị cho phép: {string.Join(", ", ValidReferenceTypes)}.");

                if (!string.IsNullOrWhiteSpace(request.costType) && !ValidCostTypes.Contains(request.costType))
                    return ResponseConst.Error<bool>(400,
                        $"costType không hợp lệ. Giá trị cho phép: {string.Join(", ", ValidCostTypes)}.");

                if (request.amount < 0)
                    return ResponseConst.Error<bool>(400, "Số tiền không được âm.");

                if (request.assetId.HasValue &&
                    !await _dbContext.Assets.AnyAsync(a => a.id == request.assetId.Value))
                    return ResponseConst.Error<bool>(400, "Tài sản không tồn tại.");

                _dbContext.CostTrackings.Add(new CostTracking
                {
                    referenceType = request.referenceType,
                    referenceId   = request.referenceId,
                    assetId       = request.assetId,
                    categoryId    = request.categoryId,
                    buildingId    = request.buildingId,
                    departmentId  = request.departmentId,
                    amount        = request.amount,
                    currency      = request.currency,
                    costType      = request.costType,
                    costDate      = request.costDate,
                    description   = request.description,
                    recordedBy    = request.recordedBy,
                    recordedAt    = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm bản ghi chi phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo cost tracking.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<CostTrackingResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.CostTrackings.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<CostTrackingResponse>(404, "Không tìm thấy bản ghi chi phí.");

                string? assetCode = null;
                if (entity.assetId.HasValue)
                {
                    var asset = await _dbContext.Assets.FindAsync(entity.assetId.Value);
                    assetCode = asset?.assetCode;
                }

                return ResponseConst.Success("OK", MapToResponse(entity, assetCode));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy cost tracking {Id}.", id);
                return ResponseConst.Error<CostTrackingResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<CostTrackingResponse>>> GetByReferenceAsync(
            string referenceType, Guid referenceId)
        {
            try
            {
                var records = await _dbContext.CostTrackings
                    .Where(c => c.referenceType == referenceType && c.referenceId == referenceId)
                    .OrderByDescending(c => c.costDate)
                    .ToListAsync();

                var list = await EnrichWithAssetCodesAsync(records);
                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy cost tracking theo reference.");
                return ResponseConst.Error<List<CostTrackingResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<CostTrackingResponse>>> GetByBuildingAsync(
            Guid buildingId, DateTime? from = null, DateTime? to = null, string? costType = null)
        {
            try
            {
                var query = _dbContext.CostTrackings.Where(c => c.buildingId == buildingId);

                // Query string truyền 'from'/'to' dạng date không có offset → Kind=Unspecified.
                // costDate là 'timestamp with time zone' nên Npgsql bắt buộc DateTime phải là UTC.
                if (from.HasValue)
                {
                    var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
                    query = query.Where(c => c.costDate >= fromUtc);
                }
                if (to.HasValue)
                {
                    var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
                    query = query.Where(c => c.costDate <= toUtc);
                }
                if (!string.IsNullOrWhiteSpace(costType))
                    query = query.Where(c => c.costType == costType);

                var records = await query.OrderByDescending(c => c.costDate).ToListAsync();
                var list    = await EnrichWithAssetCodesAsync(records);
                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy cost tracking của tòa nhà {BuildingId}.", buildingId);
                return ResponseConst.Error<List<CostTrackingResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<CostTrackingResponse>>> GetByAssetAsync(Guid assetId)
        {
            try
            {
                var asset = await _dbContext.Assets.FindAsync(assetId);
                if (asset is null)
                    return ResponseConst.Error<List<CostTrackingResponse>>(404, "Tài sản không tồn tại.");

                var list = await _dbContext.CostTrackings
                    .Where(c => c.assetId == assetId)
                    .OrderByDescending(c => c.costDate)
                    .Select(c => MapToResponse(c, asset.assetCode))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy cost tracking của tài sản {AssetId}.", assetId);
                return ResponseConst.Error<List<CostTrackingResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.CostTrackings.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy bản ghi chi phí.");

                _dbContext.CostTrackings.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa bản ghi chi phí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa cost tracking {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ── helpers ──────────────────────────────────────────────────────────

        /// <summary>Batch-load asset codes — avoids N+1 queries.</summary>
        private async Task<List<CostTrackingResponse>> EnrichWithAssetCodesAsync(List<CostTracking> records)
        {
            var assetIds = records
                .Where(r => r.assetId.HasValue)
                .Select(r => r.assetId!.Value)
                .Distinct()
                .ToList();

            var codeMap = assetIds.Count > 0
                ? await _dbContext.Assets
                    .Where(a => assetIds.Contains(a.id))
                    .ToDictionaryAsync(a => a.id, a => a.assetCode)
                : new Dictionary<Guid, string>();

            return records.Select(r =>
            {
                string? code = r.assetId.HasValue && codeMap.TryGetValue(r.assetId.Value, out var c) ? c : null;
                return MapToResponse(r, code);
            }).ToList();
        }

        private static CostTrackingResponse MapToResponse(CostTracking e, string? assetCode) => new()
        {
            id            = e.id,
            referenceType = e.referenceType,
            referenceId   = e.referenceId,
            assetId       = e.assetId,
            assetCode     = assetCode,
            categoryId    = e.categoryId,
            buildingId    = e.buildingId,
            departmentId  = e.departmentId,
            amount        = e.amount,
            currency      = e.currency,
            costType      = e.costType,
            costDate      = e.costDate,
            description   = e.description,
            recordedBy    = e.recordedBy,
            recordedAt    = e.recordedAt
        };
    }
}
