using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Domain.Core;
using TH.Asset.Dtos;
using TH.Asset.Infrastructure.Database;
using TH.Constant;

using AssetEntity = TH.Asset.Domain.Core.Asset;

namespace TH.Asset.ApplicationService.Service.Core
{
    // ════════════════════════════════════════════════════════════════════════
    // Helper sinh mã chứng từ:  CT-{GT|KH|TL}-{yyyyMM}-{NNN}
    // ════════════════════════════════════════════════════════════════════════
    internal static class AssetDocGen
    {
        public static async Task<string> NextCodeAsync(AssetDbContext db, string documentType, int year, int month)
        {
            var abbr = documentType switch
            {
                AssetDocumentType.GhiTang => "GT",
                AssetDocumentType.KhauHao => "KH",
                AssetDocumentType.ThanhLy => "TL",
                _ => "CT"
            };
            var prefix = $"CT-{abbr}-{year}{month:D2}-";

            var codes = await db.AssetDocuments
                .Where(x => x.documentCode.StartsWith(prefix))
                .Select(x => x.documentCode)
                .ToListAsync();

            int next = 1;
            foreach (var c in codes)
            {
                var suffix = c.Substring(prefix.Length);
                if (int.TryParse(suffix, out int n) && n >= next) next = n + 1;
            }
            return $"{prefix}{next:D3}";
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET DOCUMENT SERVICE (chỉ đọc — chứng từ do các nghiệp vụ tự sinh)
    // ════════════════════════════════════════════════════════════════════════
    public interface IAssetDocumentService
    {
        Task<ResponseDto<List<AssetDocumentResponse>>> GetAllAsync(string? documentType);
        Task<ResponseDto<AssetDocumentResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<AssetDocumentResponse>>> GetByAssetIdAsync(Guid assetId);
    }

    public class AssetDocumentService : AssetServiceBase, IAssetDocumentService
    {
        public AssetDocumentService(ILogger<AssetDocumentService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<List<AssetDocumentResponse>>> GetAllAsync(string? documentType)
        {
            try
            {
                var query = _dbContext.AssetDocuments
                    .Include(x => x.lines!).ThenInclude(l => l.asset)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(documentType))
                    query = query.Where(x => x.documentType == documentType);

                var docs = await query
                    .OrderByDescending(x => x.documentDate)
                    .ThenByDescending(x => x.createdAt)
                    .ToListAsync();
                var result = docs.Select(MapDocument).ToList();

                return ResponseConst.Success("Lấy danh sách chứng từ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách chứng từ.");
                return ResponseConst.Error<List<AssetDocumentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetDocumentResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var doc = await _dbContext.AssetDocuments
                    .Include(x => x.lines!).ThenInclude(l => l.asset)
                    .FirstOrDefaultAsync(x => x.id == id);

                if (doc == null)
                    return ResponseConst.Error<AssetDocumentResponse>(404, "Không tìm thấy chứng từ.");

                return ResponseConst.Success("Lấy chi tiết chứng từ thành công.", MapDocument(doc));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết chứng từ. ID: {Id}", id);
                return ResponseConst.Error<AssetDocumentResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetDocumentResponse>>> GetByAssetIdAsync(Guid assetId)
        {
            try
            {
                var docs = await _dbContext.AssetDocuments
                    .Include(x => x.lines!).ThenInclude(l => l.asset)
                    .Where(x => x.lines!.Any(l => l.assetId == assetId))
                    .OrderByDescending(x => x.documentDate)
                    .ToListAsync();
                var result = docs.Select(MapDocument).ToList();

                return ResponseConst.Success("Lấy chứng từ theo tài sản thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chứng từ theo tài sản. AssetId: {Id}", assetId);
                return ResponseConst.Error<List<AssetDocumentResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static AssetDocumentResponse MapDocument(AssetDocument x) => new()
        {
            id           = x.id,
            documentCode = x.documentCode,
            documentType = x.documentType,
            documentDate = x.documentDate,
            description  = x.description,
            totalAmount  = x.totalAmount,
            status       = x.status,
            createdBy    = x.createdBy,
            createdAt    = x.createdAt,
            lines = x.lines == null ? new() : x.lines.Select(l => new AssetDocumentLineResponse
            {
                id            = l.id,
                documentId    = l.documentId,
                debitAccount  = l.debitAccount,
                creditAccount = l.creditAccount,
                amount        = l.amount,
                description   = l.description,
                assetId       = l.assetId,
                assetCode     = l.asset != null ? l.asset.assetCode : null,
                assetName     = l.asset != null ? l.asset.name : null
            }).ToList()
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASSET DISPOSAL SERVICE (thanh lý)
    // ════════════════════════════════════════════════════════════════════════
    public interface IAssetDisposalService
    {
        Task<ResponseDto<AssetDisposalResponse>> CreateAsync(CreateAssetDisposalDto request);
        Task<ResponseDto<List<AssetDisposalResponse>>> GetAllAsync();
        Task<ResponseDto<AssetDisposalResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<AssetDisposalResponse>>> GetByAssetIdAsync(Guid assetId);
    }

    public class AssetDisposalService : AssetServiceBase, IAssetDisposalService
    {
        public AssetDisposalService(ILogger<AssetDisposalService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<AssetDisposalResponse>> CreateAsync(CreateAssetDisposalDto request)
        {
            try
            {
                var asset = await _dbContext.Assets.FirstOrDefaultAsync(x => x.id == request.assetId);
                if (asset == null)
                    return ResponseConst.Error<AssetDisposalResponse>(404, "Không tìm thấy tài sản.");
                if (asset.status == "DISPOSED")
                    return ResponseConst.Error<AssetDisposalResponse>(400, "Tài sản này đã được thanh lý trước đó.");

                decimal originalCost = asset.purchasePrice ?? 0;
                decimal accumulated  = asset.accumulatedDepreciation;
                decimal bookValue    = asset.bookValue ?? (originalCost - accumulated);
                decimal disposalValue = request.disposalValue;
                decimal gainLoss     = disposalValue - bookValue;

                var strategy = _dbContext.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    using var transaction = await _dbContext.Database.BeginTransactionAsync();
                    try
                    {
                        var now = DateTime.UtcNow;
                        var disposalDate = request.disposalDate ?? now;

                        // 1. Chứng từ thanh lý (Master) + định khoản xoá sổ
                        string tkNguyenGia = string.IsNullOrWhiteSpace(asset.accountCode) ? AssetAccount.TscdHuuHinh : asset.accountCode;
                        string tkHaoMon    = tkNguyenGia.StartsWith("213") ? AssetAccount.HaoMonVoHinh : AssetAccount.HaoMonHuuHinh;

                        var doc = new AssetDocument
                        {
                            documentCode = await AssetDocGen.NextCodeAsync(_dbContext, AssetDocumentType.ThanhLy, disposalDate.Year, disposalDate.Month),
                            documentType = AssetDocumentType.ThanhLy,
                            documentDate = disposalDate,
                            description  = $"Thanh lý tài sản {asset.assetCode} - {asset.name}",
                            totalAmount  = originalCost,
                            status       = AssetDocumentStatus.Posted,
                            createdBy    = request.createdBy,
                            createdAt    = now
                        };
                        _dbContext.AssetDocuments.Add(doc);
                        await _dbContext.SaveChangesAsync();

                        var lines = new List<AssetDocumentLine>();
                        if (accumulated > 0)
                            lines.Add(new AssetDocumentLine { documentId = doc.id, assetId = asset.id, debitAccount = tkHaoMon, creditAccount = null, amount = accumulated, description = $"Xoá sổ hao mòn luỹ kế TSCĐ {asset.assetCode}" });
                        if (bookValue > 0)
                            lines.Add(new AssetDocumentLine { documentId = doc.id, assetId = asset.id, debitAccount = AssetAccount.ChiPhiKhac, creditAccount = null, amount = bookValue, description = $"Ghi nhận giá trị còn lại TSCĐ {asset.assetCode} khi thanh lý" });
                        lines.Add(new AssetDocumentLine { documentId = doc.id, assetId = asset.id, debitAccount = null, creditAccount = tkNguyenGia, amount = originalCost, description = $"Ghi giảm nguyên giá TSCĐ {asset.assetCode} do thanh lý" });
                        _dbContext.AssetDocumentLines.AddRange(lines);

                        // 2. Phiếu thanh lý
                        var disposal = new AssetDisposal
                        {
                            assetId = asset.id,
                            disposalDate = disposalDate,
                            originalCost = originalCost,
                            accumulatedDepreciation = accumulated,
                            bookValue = bookValue,
                            disposalValue = disposalValue,
                            gainLoss = gainLoss,
                            disposalType = request.disposalType,
                            reason = request.reason,
                            note = request.note,
                            status = "COMPLETED",
                            documentId = doc.id,
                            createdBy = request.createdBy,
                            createdAt = now
                        };
                        _dbContext.AssetDisposals.Add(disposal);

                        // 3. Cập nhật trạng thái tài sản
                        asset.status = "DISPOSED";

                        await _dbContext.SaveChangesAsync();
                        await transaction.CommitAsync();

                        return ResponseConst.Success("Tạo phiếu thanh lý và chứng từ thành công.", Map(disposal, asset.assetCode, asset.name, doc.documentCode));
                    }
                    catch (Exception exTx)
                    {
                        await transaction.RollbackAsync();
                        _logger.LogError(exTx, "Lỗi khi tạo phiếu thanh lý.");
                        return ResponseConst.Error<AssetDisposalResponse>(500, "Lỗi hệ thống: " + exTx.Message);
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo phiếu thanh lý.");
                return ResponseConst.Error<AssetDisposalResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetDisposalResponse>>> GetAllAsync()
        {
            try
            {
                var result = await _dbContext.AssetDisposals
                    .Include(x => x.asset)
                    .Include(x => x.document)
                    .OrderByDescending(x => x.disposalDate)
                    .Select(x => new AssetDisposalResponse
                    {
                        id = x.id,
                        assetId = x.assetId,
                        assetCode = x.asset != null ? x.asset.assetCode : null,
                        assetName = x.asset != null ? x.asset.name : null,
                        disposalDate = x.disposalDate,
                        originalCost = x.originalCost,
                        accumulatedDepreciation = x.accumulatedDepreciation,
                        bookValue = x.bookValue,
                        disposalValue = x.disposalValue,
                        gainLoss = x.gainLoss,
                        disposalType = x.disposalType,
                        reason = x.reason,
                        note = x.note,
                        status = x.status,
                        documentId = x.documentId,
                        documentCode = x.document != null ? x.document.documentCode : null,
                        createdBy = x.createdBy,
                        createdAt = x.createdAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách phiếu thanh lý thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách phiếu thanh lý.");
                return ResponseConst.Error<List<AssetDisposalResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetDisposalResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.AssetDisposals
                    .Include(x => x.asset)
                    .Include(x => x.document)
                    .Where(x => x.id == id)
                    .Select(x => new AssetDisposalResponse
                    {
                        id = x.id,
                        assetId = x.assetId,
                        assetCode = x.asset != null ? x.asset.assetCode : null,
                        assetName = x.asset != null ? x.asset.name : null,
                        disposalDate = x.disposalDate,
                        originalCost = x.originalCost,
                        accumulatedDepreciation = x.accumulatedDepreciation,
                        bookValue = x.bookValue,
                        disposalValue = x.disposalValue,
                        gainLoss = x.gainLoss,
                        disposalType = x.disposalType,
                        reason = x.reason,
                        note = x.note,
                        status = x.status,
                        documentId = x.documentId,
                        documentCode = x.document != null ? x.document.documentCode : null,
                        createdBy = x.createdBy,
                        createdAt = x.createdAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<AssetDisposalResponse>(404, "Không tìm thấy phiếu thanh lý.");

                return ResponseConst.Success("Lấy chi tiết phiếu thanh lý thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết phiếu thanh lý. ID: {Id}", id);
                return ResponseConst.Error<AssetDisposalResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetDisposalResponse>>> GetByAssetIdAsync(Guid assetId)
        {
            try
            {
                var result = await _dbContext.AssetDisposals
                    .Include(x => x.asset)
                    .Include(x => x.document)
                    .Where(x => x.assetId == assetId)
                    .OrderByDescending(x => x.disposalDate)
                    .Select(x => new AssetDisposalResponse
                    {
                        id = x.id,
                        assetId = x.assetId,
                        assetCode = x.asset != null ? x.asset.assetCode : null,
                        assetName = x.asset != null ? x.asset.name : null,
                        disposalDate = x.disposalDate,
                        originalCost = x.originalCost,
                        accumulatedDepreciation = x.accumulatedDepreciation,
                        bookValue = x.bookValue,
                        disposalValue = x.disposalValue,
                        gainLoss = x.gainLoss,
                        disposalType = x.disposalType,
                        reason = x.reason,
                        note = x.note,
                        status = x.status,
                        documentId = x.documentId,
                        documentCode = x.document != null ? x.document.documentCode : null,
                        createdBy = x.createdBy,
                        createdAt = x.createdAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy phiếu thanh lý theo tài sản thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy phiếu thanh lý theo tài sản. AssetId: {Id}", assetId);
                return ResponseConst.Error<List<AssetDisposalResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static AssetDisposalResponse Map(AssetDisposal d, string? assetCode, string? assetName, string? documentCode) => new()
        {
            id = d.id,
            assetId = d.assetId,
            assetCode = assetCode,
            assetName = assetName,
            disposalDate = d.disposalDate,
            originalCost = d.originalCost,
            accumulatedDepreciation = d.accumulatedDepreciation,
            bookValue = d.bookValue,
            disposalValue = d.disposalValue,
            gainLoss = d.gainLoss,
            disposalType = d.disposalType,
            reason = d.reason,
            note = d.note,
            status = d.status,
            documentId = d.documentId,
            documentCode = documentCode,
            createdBy = d.createdBy,
            createdAt = d.createdAt
        };
    }
}
