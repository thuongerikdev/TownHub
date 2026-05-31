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
    // ============================================================
    // ASSET SERVICE
    // ============================================================
    public interface IAssetService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateAssetDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateAssetDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<AssetResponse>>> GetAllAsync(Guid? buildingId = null, Guid? categoryId = null, string? status = null);
        Task<ResponseDto<AssetResponse>> GetByIdAsync(Guid id);
    }

    public class AssetService : AssetServiceBase, IAssetService
    {
        public AssetService(ILogger<AssetService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateAssetDto request)
        {
            try
            {
                var codeExists = await _dbContext.Assets.AnyAsync(x => x.assetCode == request.assetCode);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã tài sản '{request.assetCode}' đã tồn tại.");

                var categoryExists = await _dbContext.AssetCategories.AnyAsync(x => x.id == request.categoryId);
                if (!categoryExists)
                    return ResponseConst.Error<bool>(400, "Danh mục tài sản không tồn tại.");

                if (request.locationId.HasValue)
                {
                    var locExists = await _dbContext.AssetLocations.AnyAsync(x => x.id == request.locationId.Value);
                    if (!locExists)
                        return ResponseConst.Error<bool>(400, "Vị trí tài sản không tồn tại.");
                }

                if (request.parentAssetId.HasValue)
                {
                    var parentExists = await _dbContext.Assets.AnyAsync(x => x.id == request.parentAssetId.Value);
                    if (!parentExists)
                        return ResponseConst.Error<bool>(400, "Tài sản cha không tồn tại.");
                }

                var entity = new AssetEntity
                {
                    assetCode           = request.assetCode,
                    name                = request.name,
                    categoryId          = request.categoryId,
                    locationId          = request.locationId,
                    parentAssetId       = request.parentAssetId,
                    buildingId          = request.buildingId,
                    floorId             = request.floorId,
                    vendorId            = request.vendorId,
                    vendorContractId    = request.vendorContractId,
                    status              = request.status,
                    serialNumber        = request.serialNumber,
                    purchasePrice       = request.purchasePrice,
                    purchaseDate        = request.purchaseDate,
                    warrantyExpiryDate  = request.warrantyExpiryDate,
                    usefulLifeMonths    = request.usefulLifeMonths,
                    salvageValue        = request.salvageValue,
                    depreciationMethod  = request.depreciationMethod,
                    installationDate    = request.installationDate,
                    criticalityLevel    = request.criticalityLevel,
                    notes               = request.notes
                };

                _dbContext.Assets.Add(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Thêm tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo tài sản.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateAssetDto request)
        {
            try
            {
                var entity = await _dbContext.Assets.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy tài sản.");

                if (entity.assetCode != request.assetCode)
                {
                    var codeExists = await _dbContext.Assets.AnyAsync(x => x.assetCode == request.assetCode);
                    if (codeExists)
                        return ResponseConst.Error<bool>(400, $"Mã tài sản '{request.assetCode}' đã tồn tại.");
                }

                entity.assetCode          = request.assetCode;
                entity.name               = request.name;
                entity.categoryId         = request.categoryId;
                entity.locationId         = request.locationId;
                entity.parentAssetId      = request.parentAssetId;
                entity.buildingId         = request.buildingId;
                entity.floorId            = request.floorId;
                entity.vendorId           = request.vendorId;
                entity.vendorContractId   = request.vendorContractId;
                entity.status             = request.status;
                entity.serialNumber       = request.serialNumber;
                entity.purchasePrice      = request.purchasePrice;
                entity.purchaseDate       = request.purchaseDate;
                entity.warrantyExpiryDate = request.warrantyExpiryDate;
                entity.usefulLifeMonths   = request.usefulLifeMonths;
                entity.salvageValue       = request.salvageValue;
                entity.depreciationMethod = request.depreciationMethod;
                entity.accumulatedDepreciation = request.accumulatedDepreciation;
                entity.bookValue          = request.bookValue;
                entity.installationDate   = request.installationDate;
                entity.lastMaintenanceDate = request.lastMaintenanceDate;
                entity.nextMaintenanceDate = request.nextMaintenanceDate;
                entity.criticalityLevel   = request.criticalityLevel;
                entity.notes              = request.notes;

                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Cập nhật tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật tài sản. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Assets.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy tài sản.");

                _dbContext.Assets.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa tài sản. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetResponse>>> GetAllAsync(
            Guid? buildingId = null, Guid? categoryId = null, string? status = null)
        {
            try
            {
                var query = _dbContext.Assets
                    .Include(x => x.category)
                    .Include(x => x.location)
                    .Include(x => x.parentAsset)
                    .Include(x => x.vendor)
                    .AsQueryable();

                if (buildingId.HasValue)  query = query.Where(x => x.buildingId == buildingId.Value);
                if (categoryId.HasValue)  query = query.Where(x => x.categoryId == categoryId.Value);
                if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.status == status);

                var result = await query
                    .OrderBy(x => x.assetCode)
                    .Select(x => new AssetResponse
                    {
                        id                   = x.id,
                        assetCode            = x.assetCode,
                        name                 = x.name,
                        categoryId           = x.categoryId,
                        categoryName         = x.category != null ? x.category.name : null,
                        locationId           = x.locationId,
                        locationAreaCode     = x.location != null ? x.location.areaCode : null,
                        parentAssetId        = x.parentAssetId,
                        parentAssetCode      = x.parentAsset != null ? x.parentAsset.assetCode : null,
                        buildingId           = x.buildingId,
                        floorId              = x.floorId,
                        vendorId             = x.vendorId,
                        vendorName           = x.vendor != null ? x.vendor.name : null,
                        vendorContractId     = x.vendorContractId,
                        status               = x.status,
                        serialNumber         = x.serialNumber,
                        purchasePrice        = x.purchasePrice,
                        purchaseDate         = x.purchaseDate,
                        warrantyExpiryDate   = x.warrantyExpiryDate,
                        usefulLifeMonths     = x.usefulLifeMonths,
                        salvageValue         = x.salvageValue,
                        depreciationMethod   = x.depreciationMethod,
                        accumulatedDepreciation = x.accumulatedDepreciation,
                        bookValue            = x.bookValue,
                        installationDate     = x.installationDate,
                        lastMaintenanceDate  = x.lastMaintenanceDate,
                        nextMaintenanceDate  = x.nextMaintenanceDate,
                        criticalityLevel     = x.criticalityLevel,
                        notes                = x.notes
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách tài sản thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách tài sản.");
                return ResponseConst.Error<List<AssetResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.Assets
                    .Include(x => x.category)
                    .Include(x => x.location)
                    .Include(x => x.parentAsset)
                    .Include(x => x.vendor)
                    .Where(x => x.id == id)
                    .Select(x => new AssetResponse
                    {
                        id                   = x.id,
                        assetCode            = x.assetCode,
                        name                 = x.name,
                        categoryId           = x.categoryId,
                        categoryName         = x.category != null ? x.category.name : null,
                        locationId           = x.locationId,
                        locationAreaCode     = x.location != null ? x.location.areaCode : null,
                        parentAssetId        = x.parentAssetId,
                        parentAssetCode      = x.parentAsset != null ? x.parentAsset.assetCode : null,
                        buildingId           = x.buildingId,
                        floorId              = x.floorId,
                        vendorId             = x.vendorId,
                        vendorName           = x.vendor != null ? x.vendor.name : null,
                        vendorContractId     = x.vendorContractId,
                        status               = x.status,
                        serialNumber         = x.serialNumber,
                        purchasePrice        = x.purchasePrice,
                        purchaseDate         = x.purchaseDate,
                        warrantyExpiryDate   = x.warrantyExpiryDate,
                        usefulLifeMonths     = x.usefulLifeMonths,
                        salvageValue         = x.salvageValue,
                        depreciationMethod   = x.depreciationMethod,
                        accumulatedDepreciation = x.accumulatedDepreciation,
                        bookValue            = x.bookValue,
                        installationDate     = x.installationDate,
                        lastMaintenanceDate  = x.lastMaintenanceDate,
                        nextMaintenanceDate  = x.nextMaintenanceDate,
                        criticalityLevel     = x.criticalityLevel,
                        notes                = x.notes
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<AssetResponse>(404, "Không tìm thấy tài sản.");

                return ResponseConst.Success("Lấy chi tiết tài sản thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết tài sản. ID: {Id}", id);
                return ResponseConst.Error<AssetResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // ASSET CATEGORY SERVICE
    // ============================================================
    public interface IAssetCategoryService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateAssetCategoryDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateAssetCategoryDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<AssetCategoryResponse>>> GetAllAsync();
        Task<ResponseDto<AssetCategoryResponse>> GetByIdAsync(Guid id);
    }

    public class AssetCategoryService : AssetServiceBase, IAssetCategoryService
    {
        public AssetCategoryService(ILogger<AssetCategoryService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateAssetCategoryDto request)
        {
            try
            {
                var codeExists = await _dbContext.AssetCategories.AnyAsync(x => x.code == request.code);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã danh mục '{request.code}' đã tồn tại.");

                _dbContext.AssetCategories.Add(new AssetCategory
                {
                    code                       = request.code,
                    name                       = request.name,
                    parentId                   = request.parentId,
                    defaultChecklistTemplateId = request.defaultChecklistTemplateId
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Thêm danh mục tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo danh mục tài sản.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateAssetCategoryDto request)
        {
            try
            {
                var entity = await _dbContext.AssetCategories.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy danh mục.");

                if (entity.code != request.code)
                {
                    var codeExists = await _dbContext.AssetCategories.AnyAsync(x => x.code == request.code);
                    if (codeExists)
                        return ResponseConst.Error<bool>(400, $"Mã danh mục '{request.code}' đã tồn tại.");
                }

                entity.code                       = request.code;
                entity.name                       = request.name;
                entity.parentId                   = request.parentId;
                entity.defaultChecklistTemplateId = request.defaultChecklistTemplateId;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật danh mục thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật danh mục. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.AssetCategories.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy danh mục.");

                var hasAssets = await _dbContext.Assets.AnyAsync(x => x.categoryId == id);
                if (hasAssets)
                    return ResponseConst.Error<bool>(400, "Không thể xóa danh mục đang được sử dụng bởi tài sản.");

                _dbContext.AssetCategories.Remove(entity);
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Xóa danh mục thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa danh mục. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetCategoryResponse>>> GetAllAsync()
        {
            try
            {
                var result = await _dbContext.AssetCategories
                    .Include(x => x.parentCategory)
                    .OrderBy(x => x.code)
                    .Select(x => new AssetCategoryResponse
                    {
                        id                          = x.id,
                        code                        = x.code,
                        name                        = x.name,
                        parentId                    = x.parentId,
                        parentName                  = x.parentCategory != null ? x.parentCategory.name : null,
                        defaultChecklistTemplateId  = x.defaultChecklistTemplateId,
                        defaultChecklistTemplateName = x.defaultChecklistTemplate != null ? x.defaultChecklistTemplate.name : null
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách danh mục thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách danh mục.");
                return ResponseConst.Error<List<AssetCategoryResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetCategoryResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.AssetCategories
                    .Include(x => x.parentCategory)
                    .Include(x => x.defaultChecklistTemplate)
                    .Where(x => x.id == id)
                    .Select(x => new AssetCategoryResponse
                    {
                        id                           = x.id,
                        code                         = x.code,
                        name                         = x.name,
                        parentId                     = x.parentId,
                        parentName                   = x.parentCategory != null ? x.parentCategory.name : null,
                        defaultChecklistTemplateId   = x.defaultChecklistTemplateId,
                        defaultChecklistTemplateName = x.defaultChecklistTemplate != null ? x.defaultChecklistTemplate.name : null
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<AssetCategoryResponse>(404, "Không tìm thấy danh mục.");

                return ResponseConst.Success("Lấy chi tiết danh mục thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết danh mục. ID: {Id}", id);
                return ResponseConst.Error<AssetCategoryResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // ASSET LOCATION SERVICE
    // ============================================================
    public interface IAssetLocationService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateAssetLocationDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateAssetLocationDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<AssetLocationResponse>>> GetAllAsync(Guid? buildingId = null);
        Task<ResponseDto<AssetLocationResponse>> GetByIdAsync(Guid id);
    }

    public class AssetLocationService : AssetServiceBase, IAssetLocationService
    {
        public AssetLocationService(ILogger<AssetLocationService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateAssetLocationDto request)
        {
            try
            {
                _dbContext.AssetLocations.Add(new AssetLocation
                {
                    buildingId = request.buildingId,
                    floorId    = request.floorId,
                    areaCode   = request.areaCode
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm vị trí tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo vị trí tài sản.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateAssetLocationDto request)
        {
            try
            {
                var entity = await _dbContext.AssetLocations.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy vị trí tài sản.");

                entity.buildingId = request.buildingId;
                entity.floorId    = request.floorId;
                entity.areaCode   = request.areaCode;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật vị trí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật vị trí. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.AssetLocations.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy vị trí tài sản.");

                var inUse = await _dbContext.Assets.AnyAsync(x => x.locationId == id);
                if (inUse)
                    return ResponseConst.Error<bool>(400, "Không thể xóa vị trí đang được tài sản sử dụng.");

                _dbContext.AssetLocations.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa vị trí thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa vị trí. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetLocationResponse>>> GetAllAsync(Guid? buildingId = null)
        {
            try
            {
                var query = _dbContext.AssetLocations.AsQueryable();
                if (buildingId.HasValue) query = query.Where(x => x.buildingId == buildingId.Value);

                var result = await query
                    .OrderBy(x => x.areaCode)
                    .Select(x => new AssetLocationResponse
                    {
                        id         = x.id,
                        buildingId = x.buildingId,
                        floorId    = x.floorId,
                        areaCode   = x.areaCode
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách vị trí thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách vị trí.");
                return ResponseConst.Error<List<AssetLocationResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetLocationResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.AssetLocations
                    .Where(x => x.id == id)
                    .Select(x => new AssetLocationResponse
                    {
                        id         = x.id,
                        buildingId = x.buildingId,
                        floorId    = x.floorId,
                        areaCode   = x.areaCode
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<AssetLocationResponse>(404, "Không tìm thấy vị trí tài sản.");

                return ResponseConst.Success("Lấy chi tiết vị trí thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết vị trí. ID: {Id}", id);
                return ResponseConst.Error<AssetLocationResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // ASSET QR CODE SERVICE
    // ============================================================
    public interface IAssetQrCodeService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateAssetQrCodeDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<AssetQrCodeResponse>> GetByAssetIdAsync(Guid assetId);
        Task<ResponseDto<AssetQrCodeResponse>> GetByQrCodeAsync(string qrCode);
    }

    public class AssetQrCodeService : AssetServiceBase, IAssetQrCodeService
    {
        public AssetQrCodeService(ILogger<AssetQrCodeService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateAssetQrCodeDto request)
        {
            try
            {
                var assetExists = await _dbContext.Assets.AnyAsync(x => x.id == request.assetId);
                if (!assetExists)
                    return ResponseConst.Error<bool>(400, "Tài sản không tồn tại.");

                var alreadyHasQr = await _dbContext.AssetQrCodes.AnyAsync(x => x.assetId == request.assetId);
                if (alreadyHasQr)
                    return ResponseConst.Error<bool>(400, "Tài sản đã có mã QR. Xóa mã cũ trước khi tạo mới.");

                var qrExists = await _dbContext.AssetQrCodes.AnyAsync(x => x.qrCode == request.qrCode);
                if (qrExists)
                    return ResponseConst.Error<bool>(400, "Mã QR đã được sử dụng.");

                _dbContext.AssetQrCodes.Add(new AssetQrCode
                {
                    assetId = request.assetId,
                    qrCode  = request.qrCode
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Tạo mã QR cho tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo QR Code.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.AssetQrCodes.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy mã QR.");

                _dbContext.AssetQrCodes.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa mã QR thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa QR Code. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetQrCodeResponse>> GetByAssetIdAsync(Guid assetId)
        {
            try
            {
                var result = await _dbContext.AssetQrCodes
                    .Include(x => x.asset)
                    .Where(x => x.assetId == assetId)
                    .Select(x => new AssetQrCodeResponse
                    {
                        id        = x.id,
                        assetId   = x.assetId,
                        assetCode = x.asset != null ? x.asset.assetCode : null,
                        assetName = x.asset != null ? x.asset.name : null,
                        qrCode    = x.qrCode
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<AssetQrCodeResponse>(404, "Tài sản chưa có mã QR.");

                return ResponseConst.Success("Lấy mã QR thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy QR Code theo assetId. ID: {Id}", assetId);
                return ResponseConst.Error<AssetQrCodeResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<AssetQrCodeResponse>> GetByQrCodeAsync(string qrCode)
        {
            try
            {
                var result = await _dbContext.AssetQrCodes
                    .Include(x => x.asset)
                    .Where(x => x.qrCode == qrCode)
                    .Select(x => new AssetQrCodeResponse
                    {
                        id        = x.id,
                        assetId   = x.assetId,
                        assetCode = x.asset != null ? x.asset.assetCode : null,
                        assetName = x.asset != null ? x.asset.name : null,
                        qrCode    = x.qrCode
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<AssetQrCodeResponse>(404, "Không tìm thấy tài sản theo mã QR này.");

                return ResponseConst.Success("Tra cứu QR thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tra cứu QR Code: {Code}", qrCode);
                return ResponseConst.Error<AssetQrCodeResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // ASSET TRANSFER SERVICE
    // ============================================================
    public interface IAssetTransferService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateAssetTransferDto request);
        Task<ResponseDto<List<AssetTransferResponse>>> GetByAssetIdAsync(Guid assetId);
    }

    public class AssetTransferService : AssetServiceBase, IAssetTransferService
    {
        public AssetTransferService(ILogger<AssetTransferService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateAssetTransferDto request)
        {
            try
            {
                var assetExists = await _dbContext.Assets.AnyAsync(x => x.id == request.assetId);
                if (!assetExists)
                    return ResponseConst.Error<bool>(400, "Tài sản không tồn tại.");

                var toLocExists = await _dbContext.AssetLocations.AnyAsync(x => x.id == request.toLocationId);
                if (!toLocExists)
                    return ResponseConst.Error<bool>(400, "Vị trí đích không tồn tại.");

                _dbContext.AssetTransfers.Add(new AssetTransfer
                {
                    assetId        = request.assetId,
                    fromLocationId = request.fromLocationId,
                    toLocationId   = request.toLocationId,
                    transferredBy  = request.transferredBy,
                    workOrderId    = request.workOrderId
                });

                // Cập nhật vị trí hiện tại của tài sản
                var asset = await _dbContext.Assets.FindAsync(request.assetId);
                if (asset != null) asset.locationId = request.toLocationId;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Chuyển vị trí tài sản thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo yêu cầu chuyển tài sản.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetTransferResponse>>> GetByAssetIdAsync(Guid assetId)
        {
            try
            {
                var result = await _dbContext.AssetTransfers
                    .Include(x => x.asset)
                    .Include(x => x.fromLocation)
                    .Include(x => x.toLocation)
                    .Include(x => x.workOrder)
                    .Where(x => x.assetId == assetId)
                    .OrderByDescending(x => x.id)
                    .Select(x => new AssetTransferResponse
                    {
                        id             = x.id,
                        assetId        = x.assetId,
                        assetCode      = x.asset != null ? x.asset.assetCode : null,
                        fromLocationId = x.fromLocationId,
                        fromAreaCode   = x.fromLocation != null ? x.fromLocation.areaCode : null,
                        toLocationId   = x.toLocationId,
                        toAreaCode     = x.toLocation != null ? x.toLocation.areaCode : null,
                        transferredBy  = x.transferredBy,
                        workOrderId    = x.workOrderId,
                        woCode         = x.workOrder != null ? x.workOrder.woCode : null
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy lịch sử chuyển tài sản thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy lịch sử chuyển tài sản. ID: {Id}", assetId);
                return ResponseConst.Error<List<AssetTransferResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // ASSET DEPRECIATION SERVICE
    // ============================================================
    public interface IAssetDepreciationService
    {
        Task<ResponseDto<List<AssetDepreciationLogResponse>>> GetByAssetIdAsync(Guid assetId);
        Task<ResponseDto<List<AssetDepreciationLogResponse>>> GetByPeriodAsync(int year, int month);
    }

    public class AssetDepreciationService : AssetServiceBase, IAssetDepreciationService
    {
        public AssetDepreciationService(ILogger<AssetDepreciationService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<List<AssetDepreciationLogResponse>>> GetByAssetIdAsync(Guid assetId)
        {
            try
            {
                var result = await _dbContext.AssetDepreciationLogs
                    .Include(x => x.asset)
                    .Where(x => x.assetId == assetId)
                    .OrderByDescending(x => x.periodYear)
                    .ThenByDescending(x => x.periodMonth)
                    .Select(x => new AssetDepreciationLogResponse
                    {
                        id                 = x.id,
                        assetId            = x.assetId,
                        assetCode          = x.asset != null ? x.asset.assetCode : null,
                        periodYear         = x.periodYear,
                        periodMonth        = x.periodMonth,
                        depreciationAmount = x.depreciationAmount,
                        bookValueBefore    = x.bookValueBefore,
                        bookValueAfter     = x.bookValueAfter,
                        accumulatedTotal   = x.accumulatedTotal,
                        calculatedAt       = x.calculatedAt,
                        calculatedBy       = x.calculatedBy
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy lịch sử khấu hao thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy lịch sử khấu hao. AssetId: {Id}", assetId);
                return ResponseConst.Error<List<AssetDepreciationLogResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<AssetDepreciationLogResponse>>> GetByPeriodAsync(int year, int month)
        {
            try
            {
                var result = await _dbContext.AssetDepreciationLogs
                    .Include(x => x.asset)
                    .Where(x => x.periodYear == year && x.periodMonth == month)
                    .OrderBy(x => x.asset != null ? x.asset.assetCode : "")
                    .Select(x => new AssetDepreciationLogResponse
                    {
                        id                 = x.id,
                        assetId            = x.assetId,
                        assetCode          = x.asset != null ? x.asset.assetCode : null,
                        periodYear         = x.periodYear,
                        periodMonth        = x.periodMonth,
                        depreciationAmount = x.depreciationAmount,
                        bookValueBefore    = x.bookValueBefore,
                        bookValueAfter     = x.bookValueAfter,
                        accumulatedTotal   = x.accumulatedTotal,
                        calculatedAt       = x.calculatedAt,
                        calculatedBy       = x.calculatedBy
                    })
                    .ToListAsync();

                return ResponseConst.Success($"Lấy danh sách khấu hao kỳ {month}/{year} thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy khấu hao theo kỳ {Year}/{Month}", year, month);
                return ResponseConst.Error<List<AssetDepreciationLogResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
