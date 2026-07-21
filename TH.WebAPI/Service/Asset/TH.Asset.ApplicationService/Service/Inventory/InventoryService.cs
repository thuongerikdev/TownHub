using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Domain.Inventory;
using TH.Asset.Dtos;
using TH.Asset.Infrastructure.Database;
using TH.Constant;
using TH.Asset.ApplicationService.Service.Inventory.Ocr;

using VendorEntity = TH.Asset.Domain.Vendor.Vendor;

namespace TH.Asset.ApplicationService.Service.Inventory
{
    // ════════════════════════════════════════════════════════════════════════
    // Helper sinh mã Phiếu đề xuất mua vật tư:  PR-{yyyyMM}-{NNN}  (server sinh)
    // ════════════════════════════════════════════════════════════════════════
    internal static class PurchaseRequestCodeGen
    {
        public static async Task<string> NextCodeAsync(AssetDbContext db, int year, int month)
        {
            var prefix = $"PR-{year}{month:D2}-";
            var codes = await db.PurchaseRequests
                .Where(x => x.prCode.StartsWith(prefix))
                .Select(x => x.prCode)
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
    // Helper sinh mã Đơn đặt hàng:  PO-{yyyyMM}-{NNN}  (server sinh)
    // ════════════════════════════════════════════════════════════════════════
    internal static class PurchaseOrderCodeGen
    {
        public static async Task<string> NextCodeAsync(AssetDbContext db, int year, int month)
        {
            var prefix = $"PO-{year}{month:D2}-";
            var codes = await db.PurchaseOrders
                .Where(x => x.poCode.StartsWith(prefix))
                .Select(x => x.poCode)
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

    // ============================================================
    // WAREHOUSE SERVICE
    // ============================================================
    public interface IWarehouseService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateWarehouseDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateWarehouseDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<WarehouseResponse>>> GetAllAsync(Guid? buildingId = null);
        Task<ResponseDto<WarehouseResponse>> GetByIdAsync(Guid id);
    }

    public class WarehouseService : AssetServiceBase, IWarehouseService
    {
        public WarehouseService(ILogger<WarehouseService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateWarehouseDto request)
        {
            try
            {
                var codeExists = await _dbContext.Warehouses.AnyAsync(x => x.code == request.code);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã kho '{request.code}' đã tồn tại.");

                _dbContext.Warehouses.Add(new Warehouse
                {
                    code        = request.code,
                    name        = request.name,
                    buildingId  = request.buildingId,
                    managerId   = request.managerId,
                    ktvOwnerId  = request.ktvOwnerId
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm kho vật tư thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo kho vật tư.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateWarehouseDto request)
        {
            try
            {
                var entity = await _dbContext.Warehouses.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy kho vật tư.");

                if (entity.code != request.code)
                {
                    var codeExists = await _dbContext.Warehouses.AnyAsync(x => x.code == request.code);
                    if (codeExists)
                        return ResponseConst.Error<bool>(400, $"Mã kho '{request.code}' đã tồn tại.");
                }

                entity.code       = request.code;
                entity.name       = request.name;
                entity.buildingId = request.buildingId;
                entity.managerId  = request.managerId;
                entity.ktvOwnerId = request.ktvOwnerId;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật kho vật tư thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật kho vật tư. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Warehouses.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy kho vật tư.");

                var hasLevels = await _dbContext.InventoryLevels.AnyAsync(x => x.warehouseId == id);
                if (hasLevels)
                    return ResponseConst.Error<bool>(400, "Không thể xóa kho đang có tồn kho.");

                _dbContext.Warehouses.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa kho vật tư thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa kho vật tư. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<WarehouseResponse>>> GetAllAsync(Guid? buildingId = null)
        {
            try
            {
                var query = _dbContext.Warehouses.AsQueryable();
                if (buildingId.HasValue) query = query.Where(x => x.buildingId == buildingId.Value);

                var result = await query
                    .OrderBy(x => x.code)
                    .Select(x => new WarehouseResponse
                    {
                        id         = x.id,
                        code       = x.code,
                        name       = x.name,
                        buildingId = x.buildingId,
                        managerId  = x.managerId,
                        ktvOwnerId = x.ktvOwnerId
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách kho vật tư thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách kho.");
                return ResponseConst.Error<List<WarehouseResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<WarehouseResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.Warehouses
                    .Where(x => x.id == id)
                    .Select(x => new WarehouseResponse
                    {
                        id         = x.id,
                        code       = x.code,
                        name       = x.name,
                        buildingId = x.buildingId,
                        managerId  = x.managerId,
                        ktvOwnerId = x.ktvOwnerId
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<WarehouseResponse>(404, "Không tìm thấy kho vật tư.");

                return ResponseConst.Success("Lấy chi tiết kho vật tư thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết kho. ID: {Id}", id);
                return ResponseConst.Error<WarehouseResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // MATERIAL SERVICE
    // ============================================================
    public interface IMaterialService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateMaterialDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateMaterialDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<MaterialResponse>>> GetAllAsync(Guid? categoryId = null, bool? isActive = null);
        Task<ResponseDto<MaterialResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<MaterialResponse>>> GetLowStockAsync(Guid? warehouseId = null);
        Task<ResponseDto<List<InventoryLevelResponse>>> GetInventoryLevelsAsync(Guid? warehouseId = null, Guid? materialId = null);
    }

    public class MaterialService : AssetServiceBase, IMaterialService
    {
        public MaterialService(ILogger<MaterialService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateMaterialDto request)
        {
            try
            {
                var codeExists = await _dbContext.Materials.AnyAsync(x => x.materialCode == request.materialCode);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã vật tư '{request.materialCode}' đã tồn tại.");

                var categoryExists = await _dbContext.MaterialCategories.AnyAsync(x => x.id == request.categoryId);
                if (!categoryExists)
                    return ResponseConst.Error<bool>(400, "Danh mục vật tư không tồn tại.");

                _dbContext.Materials.Add(new Material
                {
                    materialCode      = request.materialCode,
                    name              = request.name,
                    categoryId        = request.categoryId,
                    preferredVendorId = request.preferredVendorId,
                    unitOfMeasure     = request.unitOfMeasure,
                    minStock          = request.minStock,
                    maxStock          = request.maxStock,
                    reorderPoint      = request.reorderPoint,
                    reorderQuantity   = request.reorderQuantity,
                    unitPrice         = request.unitPrice,
                    isActive          = request.isActive,
                    notes             = request.notes
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm vật tư thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo vật tư.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateMaterialDto request)
        {
            try
            {
                var entity = await _dbContext.Materials.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy vật tư.");

                if (entity.materialCode != request.materialCode)
                {
                    var codeExists = await _dbContext.Materials.AnyAsync(x => x.materialCode == request.materialCode);
                    if (codeExists)
                        return ResponseConst.Error<bool>(400, $"Mã vật tư '{request.materialCode}' đã tồn tại.");
                }

                entity.materialCode      = request.materialCode;
                entity.name              = request.name;
                entity.categoryId        = request.categoryId;
                entity.preferredVendorId = request.preferredVendorId;
                entity.unitOfMeasure     = request.unitOfMeasure;
                entity.minStock          = request.minStock;
                entity.maxStock          = request.maxStock;
                entity.reorderPoint      = request.reorderPoint;
                entity.reorderQuantity   = request.reorderQuantity;
                entity.unitPrice         = request.unitPrice;
                entity.isActive          = request.isActive;
                entity.notes             = request.notes;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật vật tư thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật vật tư. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Materials.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy vật tư.");

                var hasInventory = await _dbContext.InventoryLevels.AnyAsync(x => x.materialId == id && x.quantityOnHand > 0);
                if (hasInventory)
                    return ResponseConst.Error<bool>(400, "Không thể xóa vật tư còn tồn kho.");

                _dbContext.Materials.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa vật tư thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa vật tư. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<MaterialResponse>>> GetAllAsync(Guid? categoryId = null, bool? isActive = null)
        {
            try
            {
                var query = _dbContext.Materials
                    .Include(x => x.category)
                    .Include(x => x.preferredVendor)
                    .AsQueryable();

                if (categoryId.HasValue) query = query.Where(x => x.categoryId == categoryId.Value);
                if (isActive.HasValue)   query = query.Where(x => x.isActive == isActive.Value);

                var result = await query
                    .OrderBy(x => x.materialCode)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách vật tư thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách vật tư.");
                return ResponseConst.Error<List<MaterialResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<MaterialResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Materials
                    .Include(x => x.category)
                    .Include(x => x.preferredVendor)
                    .FirstOrDefaultAsync(x => x.id == id);

                if (entity == null)
                    return ResponseConst.Error<MaterialResponse>(404, "Không tìm thấy vật tư.");

                return ResponseConst.Success("Lấy chi tiết vật tư thành công.", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết vật tư. ID: {Id}", id);
                return ResponseConst.Error<MaterialResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<MaterialResponse>>> GetLowStockAsync(Guid? warehouseId = null)
        {
            try
            {
                // Lấy tất cả vật tư có tồn kho dưới reorderPoint
                var lowStockMaterialIds = await _dbContext.InventoryLevels
                    .Where(il => !warehouseId.HasValue || il.warehouseId == warehouseId.Value)
                    .Join(_dbContext.Materials,
                        il => il.materialId,
                        m  => m.id,
                        (il, m) => new { il, m })
                    .Where(x => x.m.reorderPoint.HasValue && x.il.quantityOnHand <= x.m.reorderPoint.Value)
                    .Select(x => x.m.id)
                    .Distinct()
                    .ToListAsync();

                var result = await _dbContext.Materials
                    .Include(x => x.category)
                    .Include(x => x.preferredVendor)
                    .Where(x => lowStockMaterialIds.Contains(x.id))
                    .OrderBy(x => x.materialCode)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success($"Tìm thấy {result.Count} vật tư sắp hết.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách vật tư sắp hết.");
                return ResponseConst.Error<List<MaterialResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<InventoryLevelResponse>>> GetInventoryLevelsAsync(
            Guid? warehouseId = null, Guid? materialId = null)
        {
            try
            {
                var query = _dbContext.InventoryLevels
                    .Include(x => x.warehouse)
                    .Include(x => x.material)
                    .AsQueryable();

                if (warehouseId.HasValue) query = query.Where(x => x.warehouseId == warehouseId.Value);
                if (materialId.HasValue)  query = query.Where(x => x.materialId  == materialId.Value);

                var result = await query
                    .OrderBy(x => x.material != null ? x.material.materialCode : "")
                    .Select(x => new InventoryLevelResponse
                    {
                        id              = x.id,
                        warehouseId     = x.warehouseId,
                        warehouseName   = x.warehouse != null ? x.warehouse.name : null,
                        materialId      = x.materialId,
                        materialCode    = x.material != null ? x.material.materialCode : null,
                        materialName    = x.material != null ? x.material.name : null,
                        unitOfMeasure   = x.material != null ? x.material.unitOfMeasure : null,
                        quantityOnHand  = x.quantityOnHand
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy tồn kho thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy tồn kho.");
                return ResponseConst.Error<List<InventoryLevelResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static MaterialResponse MapToResponse(Material x) => new()
        {
            id                = x.id,
            materialCode      = x.materialCode,
            name              = x.name,
            categoryId        = x.categoryId,
            categoryName      = x.category?.name,
            preferredVendorId = x.preferredVendorId,
            vendorName        = x.preferredVendor?.name,
            unitOfMeasure     = x.unitOfMeasure,
            minStock          = x.minStock,
            maxStock          = x.maxStock,
            reorderPoint      = x.reorderPoint,
            reorderQuantity   = x.reorderQuantity,
            unitPrice         = x.unitPrice,
            isActive          = x.isActive,
            notes             = x.notes
        };
    }

    // ============================================================
    // INVENTORY TRANSACTION SERVICE
    // ============================================================
    public interface IInventoryTransactionService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateInventoryTransactionDto request);
        Task<ResponseDto<List<InventoryTransactionResponse>>> GetAllAsync(Guid? warehouseId = null, Guid? materialId = null, string? txnType = null, string? referenceType = null, Guid? referenceId = null);
        Task<ResponseDto<InventoryTransactionResponse>> GetByIdAsync(Guid id);
    }

    public class InventoryTransactionService : AssetServiceBase, IInventoryTransactionService
    {
        public InventoryTransactionService(ILogger<InventoryTransactionService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateInventoryTransactionDto request)
        {
            try
            {
                var codeExists = await _dbContext.InventoryTransactions.AnyAsync(x => x.txnCode == request.txnCode);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã giao dịch '{request.txnCode}' đã tồn tại.");

                var materialExists = await _dbContext.Materials.AnyAsync(x => x.id == request.materialId);
                if (!materialExists)
                    return ResponseConst.Error<bool>(400, "Vật tư không tồn tại.");

                var warehouseExists = await _dbContext.Warehouses.AnyAsync(x => x.id == request.warehouseId);
                if (!warehouseExists)
                    return ResponseConst.Error<bool>(400, "Kho không tồn tại.");

                // Kiểm tra tồn kho khi xuất kho
                if (request.txnType == "OUT" || request.txnType == "TRANSFER")
                {
                    var level = await _dbContext.InventoryLevels
                        .FirstOrDefaultAsync(x => x.warehouseId == request.warehouseId && x.materialId == request.materialId);
                    if (level == null || level.quantityOnHand < request.quantity)
                        return ResponseConst.Error<bool>(400, "Tồn kho không đủ để thực hiện giao dịch.");
                }

                _dbContext.InventoryTransactions.Add(new InventoryTransaction
                {
                    txnCode       = request.txnCode,
                    warehouseId   = request.warehouseId,
                    materialId    = request.materialId,
                    referenceType = request.referenceType,
                    referenceId   = request.referenceId,
                    txnType       = request.txnType,
                    quantity      = request.quantity,
                    unitCost      = request.unitCost,
                    totalCost     = request.totalCost,
                    notes         = request.notes,
                    performedBy   = request.performedBy
                });

                // Cập nhật InventoryLevel
                var inventoryLevel = await _dbContext.InventoryLevels
                    .FirstOrDefaultAsync(x => x.warehouseId == request.warehouseId && x.materialId == request.materialId);

                if (inventoryLevel == null)
                {
                    inventoryLevel = new InventoryLevel
                    {
                        warehouseId    = request.warehouseId,
                        materialId     = request.materialId,
                        quantityOnHand = 0
                    };
                    _dbContext.InventoryLevels.Add(inventoryLevel);
                }

                inventoryLevel.quantityOnHand += request.txnType == "IN" || request.txnType == "ADJUST"
                    ? request.quantity
                    : -request.quantity;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Tạo giao dịch kho thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo giao dịch kho.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<InventoryTransactionResponse>>> GetAllAsync(
            Guid? warehouseId = null, Guid? materialId = null, string? txnType = null,
            string? referenceType = null, Guid? referenceId = null)
        {
            try
            {
                var query = _dbContext.InventoryTransactions
                    .Include(x => x.warehouse)
                    .Include(x => x.material)
                    .AsQueryable();

                if (warehouseId.HasValue)               query = query.Where(x => x.warehouseId   == warehouseId.Value);
                if (materialId.HasValue)                query = query.Where(x => x.materialId    == materialId.Value);
                if (!string.IsNullOrEmpty(txnType))     query = query.Where(x => x.txnType       == txnType);
                if (!string.IsNullOrEmpty(referenceType)) query = query.Where(x => x.referenceType == referenceType);
                if (referenceId.HasValue)               query = query.Where(x => x.referenceId   == referenceId.Value);

                var result = await query
                    .OrderByDescending(x => x.performedAt)
                    .Select(x => new InventoryTransactionResponse
                    {
                        id            = x.id,
                        txnCode       = x.txnCode,
                        warehouseId   = x.warehouseId,
                        warehouseName = x.warehouse != null ? x.warehouse.name : null,
                        materialId    = x.materialId,
                        materialCode  = x.material  != null ? x.material.materialCode : null,
                        materialName  = x.material  != null ? x.material.name : null,
                        referenceType = x.referenceType,
                        referenceId   = x.referenceId,
                        txnType       = x.txnType,
                        quantity      = x.quantity,
                        unitCost      = x.unitCost,
                        totalCost     = x.totalCost,
                        notes         = x.notes,
                        performedBy   = x.performedBy,
                        performedAt   = x.performedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách giao dịch kho thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách giao dịch kho.");
                return ResponseConst.Error<List<InventoryTransactionResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<InventoryTransactionResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.InventoryTransactions
                    .Include(x => x.warehouse)
                    .Include(x => x.material)
                    .Where(x => x.id == id)
                    .Select(x => new InventoryTransactionResponse
                    {
                        id            = x.id,
                        txnCode       = x.txnCode,
                        warehouseId   = x.warehouseId,
                        warehouseName = x.warehouse != null ? x.warehouse.name : null,
                        materialId    = x.materialId,
                        materialCode  = x.material  != null ? x.material.materialCode : null,
                        materialName  = x.material  != null ? x.material.name : null,
                        referenceType = x.referenceType,
                        referenceId   = x.referenceId,
                        txnType       = x.txnType,
                        quantity      = x.quantity,
                        unitCost      = x.unitCost,
                        totalCost     = x.totalCost,
                        notes         = x.notes,
                        performedBy   = x.performedBy,
                        performedAt   = x.performedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<InventoryTransactionResponse>(404, "Không tìm thấy giao dịch kho.");

                return ResponseConst.Success("Lấy chi tiết giao dịch kho thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết giao dịch kho. ID: {Id}", id);
                return ResponseConst.Error<InventoryTransactionResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // PURCHASE REQUEST SERVICE
    // ============================================================
    public interface IPurchaseRequestService
    {
        Task<ResponseDto<bool>> CreateAsync(CreatePurchaseRequestDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdatePurchaseRequestDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<PurchaseRequestResponse>>> GetAllAsync(string? status = null, Guid? ticketId = null, Guid? woId = null);
        Task<ResponseDto<PurchaseRequestResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<bool>> SubmitAsync(Guid id);
        Task<ResponseDto<bool>> ApproveAsync(Guid id, Guid approvedBy);
        Task<ResponseDto<bool>> RejectAsync(Guid id, string reason);
        Task<ResponseDto<bool>> AddItemAsync(CreatePurchaseRequestItemDto request);
        Task<ResponseDto<List<PurchaseRequestItemResponse>>> GetItemsAsync(Guid prId);
    }

    public class PurchaseRequestService : AssetServiceBase, IPurchaseRequestService
    {
        public PurchaseRequestService(ILogger<PurchaseRequestService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreatePurchaseRequestDto request)
        {
            try
            {
                // Mã PR luôn sinh phía server, duy nhất, không cho client tự đặt.
                var now = DateTime.UtcNow;
                var prCode = await PurchaseRequestCodeGen.NextCodeAsync(_dbContext, now.Year, now.Month);

                // Người đề xuất mặc định = KTV chịu trách nhiệm xử lý WO/Ticket (lưu id, không phải chuỗi tự do).
                var requestedByUserId = request.requestedByUserId;
                var requestedByName   = request.requestedByName;
                if (request.woId.HasValue)
                {
                    var wo = await _dbContext.WorkOrders
                        .FirstOrDefaultAsync(x => x.id == request.woId.Value);
                    if (wo == null)
                        return ResponseConst.Error<bool>(400, "Work Order không tồn tại.");
                    requestedByUserId = wo.assignedToUserId;
                    requestedByName   = wo.assignedToName;
                }
                else if (request.ticketId.HasValue)
                {
                    var ticket = await _dbContext.Tickets
                        .FirstOrDefaultAsync(x => x.id == request.ticketId.Value);
                    if (ticket == null)
                        return ResponseConst.Error<bool>(400, "Ticket không tồn tại.");
                    requestedByUserId = ticket.assignedToUserId;
                    requestedByName   = ticket.assignedToName;
                }

                _dbContext.PurchaseRequests.Add(new PurchaseRequest
                {
                    prCode       = prCode,
                    ticketId     = request.ticketId,
                    woId         = request.woId,
                    departmentId = request.departmentId,
                    requestedBy       = request.requestedBy,
                    requestedByUserId = requestedByUserId,
                    requestedByName   = requestedByName,
                    title        = request.title,
                    justification = request.justification,
                    priority     = request.priority,
                    neededByDate = request.neededByDate
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Tạo phiếu đề xuất mua hàng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo Purchase Request.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdatePurchaseRequestDto request)
        {
            try
            {
                var entity = await _dbContext.PurchaseRequests.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu đề xuất.");

                if (entity.status != "DRAFT")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể sửa phiếu đề xuất ở trạng thái DRAFT.");

                entity.title         = request.title;
                entity.justification = request.justification;
                entity.priority      = request.priority;
                entity.neededByDate  = request.neededByDate;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật phiếu đề xuất thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật Purchase Request. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.PurchaseRequests.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu đề xuất.");

                if (entity.status != "DRAFT")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể xóa phiếu đề xuất ở trạng thái DRAFT.");

                _dbContext.PurchaseRequests.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa phiếu đề xuất thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa Purchase Request. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<PurchaseRequestResponse>>> GetAllAsync(string? status = null, Guid? ticketId = null, Guid? woId = null)
        {
            try
            {
                var query = _dbContext.PurchaseRequests
                    .Include(x => x.ticket)
                    .Include(x => x.workOrder)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.status == status);
                if (ticketId.HasValue)             query = query.Where(x => x.ticketId == ticketId.Value);
                if (woId.HasValue)                 query = query.Where(x => x.woId     == woId.Value);

                var result = await query
                    .OrderByDescending(x => x.createdAt)
                    .Select(x => new PurchaseRequestResponse
                    {
                        id             = x.id,
                        prCode         = x.prCode,
                        ticketId       = x.ticketId,
                        ticketCode     = x.ticket     != null ? x.ticket.ticketCode : null,
                        woId           = x.woId,
                        woCode         = x.workOrder  != null ? x.workOrder.woCode  : null,
                        departmentId   = x.departmentId,
                        requestedBy    = x.requestedBy,
                        requestedByUserId = x.requestedByUserId,
                        requestedByName = x.requestedByName,
                        status         = x.status,
                        title          = x.title,
                        justification  = x.justification,
                        priority       = x.priority,
                        neededByDate   = x.neededByDate,
                        approvedBy     = x.approvedBy,
                        approvedAt     = x.approvedAt,
                        rejectedReason = x.rejectedReason,
                        createdAt      = x.createdAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách phiếu đề xuất thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách Purchase Request.");
                return ResponseConst.Error<List<PurchaseRequestResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<PurchaseRequestResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.PurchaseRequests
                    .Include(x => x.ticket)
                    .Include(x => x.workOrder)
                    .Where(x => x.id == id)
                    .Select(x => new PurchaseRequestResponse
                    {
                        id             = x.id,
                        prCode         = x.prCode,
                        ticketId       = x.ticketId,
                        ticketCode     = x.ticket    != null ? x.ticket.ticketCode : null,
                        woId           = x.woId,
                        woCode         = x.workOrder != null ? x.workOrder.woCode  : null,
                        departmentId   = x.departmentId,
                        requestedBy    = x.requestedBy,
                        requestedByUserId = x.requestedByUserId,
                        requestedByName = x.requestedByName,
                        status         = x.status,
                        title          = x.title,
                        justification  = x.justification,
                        priority       = x.priority,
                        neededByDate   = x.neededByDate,
                        approvedBy     = x.approvedBy,
                        approvedAt     = x.approvedAt,
                        rejectedReason = x.rejectedReason,
                        createdAt      = x.createdAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<PurchaseRequestResponse>(404, "Không tìm thấy phiếu đề xuất.");

                return ResponseConst.Success("Lấy chi tiết phiếu đề xuất thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết Purchase Request. ID: {Id}", id);
                return ResponseConst.Error<PurchaseRequestResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> SubmitAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.PurchaseRequests.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu đề xuất.");

                // Chỉ gửi duyệt được phiếu nháp; REJECTED có thể gửi lại.
                if (entity.status != "DRAFT" && entity.status != "REJECTED")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể gửi duyệt phiếu đề xuất ở trạng thái nháp.");

                entity.status         = "SUBMITTED";
                entity.rejectedReason = null;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Đã gửi phiếu đề xuất chờ duyệt.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gửi duyệt Purchase Request. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> ApproveAsync(Guid id, Guid approvedBy)
        {
            try
            {
                var entity = await _dbContext.PurchaseRequests.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu đề xuất.");

                // Chỉ duyệt được phiếu đã gửi duyệt (SUBMITTED); "PENDING" giữ cho dữ liệu cũ.
                if (entity.status != "SUBMITTED" && entity.status != "PENDING")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể duyệt phiếu đề xuất đã gửi duyệt.");

                entity.status     = "APPROVED";
                entity.approvedBy = approvedBy;
                entity.approvedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Duyệt phiếu đề xuất thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi duyệt Purchase Request. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RejectAsync(Guid id, string reason)
        {
            try
            {
                var entity = await _dbContext.PurchaseRequests.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu đề xuất.");

                if (entity.status != "SUBMITTED" && entity.status != "PENDING")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể từ chối phiếu đề xuất đã gửi duyệt.");

                entity.status         = "REJECTED";
                entity.rejectedReason = reason;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Từ chối phiếu đề xuất thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi từ chối Purchase Request. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddItemAsync(CreatePurchaseRequestItemDto request)
        {
            try
            {
                var prExists = await _dbContext.PurchaseRequests.AnyAsync(x => x.id == request.prId);
                if (!prExists)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy phiếu đề xuất.");

                var matExists = await _dbContext.Materials.AnyAsync(x => x.id == request.materialId);
                if (!matExists)
                    return ResponseConst.Error<bool>(400, "Vật tư không tồn tại.");

                _dbContext.PurchaseRequestItems.Add(new PurchaseRequestItem
                {
                    prId              = request.prId,
                    materialId        = request.materialId,
                    targetWarehouseId = request.targetWarehouseId
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm vật tư vào phiếu đề xuất thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thêm item vào Purchase Request.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<PurchaseRequestItemResponse>>> GetItemsAsync(Guid prId)
        {
            try
            {
                var result = await _dbContext.PurchaseRequestItems
                    .Include(x => x.purchaseRequest)
                    .Include(x => x.material)
                    .Include(x => x.targetWarehouse)
                    .Where(x => x.prId == prId)
                    .Select(x => new PurchaseRequestItemResponse
                    {
                        id              = x.id,
                        prId            = x.prId,
                        prCode          = x.purchaseRequest != null ? x.purchaseRequest.prCode : null,
                        materialId      = x.materialId,
                        materialCode    = x.material        != null ? x.material.materialCode  : null,
                        materialName    = x.material        != null ? x.material.name          : null,
                        targetWarehouseId = x.targetWarehouseId,
                        warehouseName   = x.targetWarehouse != null ? x.targetWarehouse.name   : null
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách vật tư trong phiếu đề xuất thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy items của Purchase Request. ID: {Id}", prId);
                return ResponseConst.Error<List<PurchaseRequestItemResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // PURCHASE ORDER SERVICE
    // ============================================================
    public interface IPurchaseOrderService
    {
        Task<ResponseDto<bool>> CreateAsync(CreatePurchaseOrderDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdatePurchaseOrderDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<PurchaseOrderResponse>>> GetAllAsync(string? status = null, Guid? vendorId = null);
        Task<ResponseDto<PurchaseOrderResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<bool>> AddItemAsync(CreatePurchaseOrderItemDto request);
        Task<ResponseDto<List<PurchaseOrderItemResponse>>> GetItemsAsync(Guid poId);
    }

    public class PurchaseOrderService : AssetServiceBase, IPurchaseOrderService
    {
        public PurchaseOrderService(ILogger<PurchaseOrderService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreatePurchaseOrderDto request)
        {
            try
            {
                var vendorExists = await _dbContext.Vendors.AnyAsync(x => x.id == request.vendorId);
                if (!vendorExists)
                    return ResponseConst.Error<bool>(400, "Nhà cung cấp không tồn tại.");

                // Mã PO luôn sinh phía server, duy nhất, không cho client tự đặt.
                var now = DateTime.UtcNow;
                var poCode = await PurchaseOrderCodeGen.NextCodeAsync(_dbContext, now.Year, now.Month);

                _dbContext.PurchaseOrders.Add(new PurchaseOrder
                {
                    poCode           = poCode,
                    prId             = request.prId,
                    vendorId         = request.vendorId,
                    issueDate        = request.issueDate,
                    expectedDelivery = request.expectedDelivery,
                    totalAmount      = request.totalAmount,
                    currency         = request.currency,
                    paymentTerms     = request.paymentTerms,
                    notes            = request.notes,
                    createdBy        = request.createdBy
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Tạo đơn đặt hàng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo Purchase Order.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdatePurchaseOrderDto request)
        {
            try
            {
                var entity = await _dbContext.PurchaseOrders.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy đơn đặt hàng.");

                entity.status           = request.status;
                entity.issueDate        = request.issueDate;
                entity.expectedDelivery = request.expectedDelivery;
                entity.actualDelivery   = request.actualDelivery;
                entity.totalAmount      = request.totalAmount;
                entity.paymentTerms     = request.paymentTerms;
                entity.notes            = request.notes;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật đơn đặt hàng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật Purchase Order. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + (ex.InnerException?.Message ?? ex.Message));
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.PurchaseOrders.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy đơn đặt hàng.");

                if (entity.status != "DRAFT")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể xóa đơn đặt hàng ở trạng thái DRAFT.");

                _dbContext.PurchaseOrders.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa đơn đặt hàng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa Purchase Order. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<PurchaseOrderResponse>>> GetAllAsync(string? status = null, Guid? vendorId = null)
        {
            try
            {
                var query = _dbContext.PurchaseOrders
                    .Include(x => x.purchaseRequest)
                    .Include(x => x.vendor)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.status   == status);
                if (vendorId.HasValue)             query = query.Where(x => x.vendorId == vendorId.Value);

                var result = await query
                    .OrderByDescending(x => x.createdAt)
                    .Select(x => new PurchaseOrderResponse
                    {
                        id               = x.id,
                        poCode           = x.poCode,
                        prId             = x.prId,
                        prCode           = x.purchaseRequest != null ? x.purchaseRequest.prCode : null,
                        vendorId         = x.vendorId,
                        vendorName       = x.vendor          != null ? x.vendor.name             : null,
                        status           = x.status,
                        issueDate        = x.issueDate,
                        expectedDelivery = x.expectedDelivery,
                        actualDelivery   = x.actualDelivery,
                        totalAmount      = x.totalAmount,
                        currency         = x.currency,
                        paymentTerms     = x.paymentTerms,
                        notes            = x.notes,
                        createdBy        = x.createdBy,
                        createdAt        = x.createdAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách đơn đặt hàng thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách Purchase Order.");
                return ResponseConst.Error<List<PurchaseOrderResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<PurchaseOrderResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var result = await _dbContext.PurchaseOrders
                    .Include(x => x.purchaseRequest)
                    .Include(x => x.vendor)
                    .Where(x => x.id == id)
                    .Select(x => new PurchaseOrderResponse
                    {
                        id               = x.id,
                        poCode           = x.poCode,
                        prId             = x.prId,
                        prCode           = x.purchaseRequest != null ? x.purchaseRequest.prCode : null,
                        vendorId         = x.vendorId,
                        vendorName       = x.vendor          != null ? x.vendor.name             : null,
                        status           = x.status,
                        issueDate        = x.issueDate,
                        expectedDelivery = x.expectedDelivery,
                        actualDelivery   = x.actualDelivery,
                        totalAmount      = x.totalAmount,
                        currency         = x.currency,
                        paymentTerms     = x.paymentTerms,
                        notes            = x.notes,
                        createdBy        = x.createdBy,
                        createdAt        = x.createdAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<PurchaseOrderResponse>(404, "Không tìm thấy đơn đặt hàng.");

                return ResponseConst.Success("Lấy chi tiết đơn đặt hàng thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết Purchase Order. ID: {Id}", id);
                return ResponseConst.Error<PurchaseOrderResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddItemAsync(CreatePurchaseOrderItemDto request)
        {
            try
            {
                var matExists = await _dbContext.Materials.AnyAsync(x => x.id == request.materialId);
                if (!matExists)
                    return ResponseConst.Error<bool>(400, "Vật tư không tồn tại.");

                _dbContext.PurchaseOrderItems.Add(new PurchaseOrderItem
                {
                    poId              = request.poId,
                    materialId        = request.materialId,
                    targetWarehouseId = request.targetWarehouseId
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm vật tư vào đơn đặt hàng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thêm item vào Purchase Order.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<PurchaseOrderItemResponse>>> GetItemsAsync(Guid poId)
        {
            try
            {
                var result = await _dbContext.PurchaseOrderItems
                    .Include(x => x.purchaseOrder)
                    .Include(x => x.material)
                    .Include(x => x.targetWarehouse)
                    .Where(x => x.poId == poId)
                    .Select(x => new PurchaseOrderItemResponse
                    {
                        id                = x.id,
                        poId              = x.poId,
                        poCode            = x.purchaseOrder  != null ? x.purchaseOrder.poCode  : null,
                        materialId        = x.materialId,
                        materialCode      = x.material       != null ? x.material.materialCode  : null,
                        materialName      = x.material       != null ? x.material.name          : null,
                        targetWarehouseId = x.targetWarehouseId,
                        warehouseName     = x.targetWarehouse != null ? x.targetWarehouse.name  : null
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách vật tư trong đơn đặt hàng thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy items của Purchase Order. ID: {Id}", poId);
                return ResponseConst.Error<List<PurchaseOrderItemResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // INVOICE SERVICE
    // ============================================================
    public interface IInvoiceService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateInvoiceDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateInvoiceDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<InvoiceResponse>>> GetAllAsync(Guid? vendorId = null, string? paymentStatus = null);
        Task<ResponseDto<InvoiceResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<bool>> MarkPaidAsync(Guid id, string paymentMethod, Guid confirmedBy);
        Task<ResponseDto<bool>> AddItemAsync(CreateInvoiceItemDto request);
        Task<ResponseDto<List<InvoiceItemResponse>>> GetItemsAsync(Guid invoiceId);
    }

    public class InvoiceService : AssetServiceBase, IInvoiceService
    {
        public InvoiceService(ILogger<InvoiceService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateInvoiceDto request)
        {
            try
            {
                var codeExists = await _dbContext.Invoices.AnyAsync(x => x.invoiceCode == request.invoiceCode);
                if (codeExists)
                    return ResponseConst.Error<bool>(400, $"Mã hóa đơn '{request.invoiceCode}' đã tồn tại.");

                var invoice = new Invoice
                {
                    invoiceCode    = request.invoiceCode,
                    vendorId       = request.vendorId,
                    poId           = request.poId,
                    ocrJobId       = request.ocrJobId,
                    invoiceDate    = request.invoiceDate,
                    invoiceNumber  = request.invoiceNumber,
                    subtotal       = request.subtotal,
                    taxAmount      = request.taxAmount,
                    totalAmount    = request.totalAmount,
                    currency       = request.currency,
                    paymentDueDate = request.paymentDueDate,
                    notes          = request.notes
                };

                // Lưu kèm hạng mục đã đối chiếu (materialId). EF gán invoiceId qua navigation.
                if (request.items != null && request.items.Count > 0)
                {
                    invoice.items = request.items
                        .Where(it => it.materialId != Guid.Empty)
                        .Select(it => new InvoiceItem
                        {
                            materialId  = it.materialId,
                            description = it.description,
                            quantity    = it.quantity,
                            unitPrice   = it.unitPrice,
                            totalPrice  = it.totalPrice ?? (it.quantity * it.unitPrice)
                        })
                        .ToList();
                }

                _dbContext.Invoices.Add(invoice);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm hóa đơn thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo hóa đơn.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateInvoiceDto request)
        {
            try
            {
                var entity = await _dbContext.Invoices.FirstOrDefaultAsync(x => x.id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy hóa đơn.");

                entity.status        = request.status;
                entity.invoiceDate   = request.invoiceDate;
                entity.invoiceNumber = request.invoiceNumber;
                entity.subtotal      = request.subtotal;
                entity.taxAmount     = request.taxAmount;
                entity.totalAmount   = request.totalAmount;
                entity.paymentDueDate = request.paymentDueDate;
                entity.paymentStatus = request.paymentStatus;
                entity.paidDate      = request.paidDate;
                entity.paymentMethod = request.paymentMethod;
                entity.confirmedBy   = request.confirmedBy;
                entity.confirmedAt   = request.confirmedAt;
                entity.notes         = request.notes;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật hóa đơn thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật hóa đơn. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Invoices.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy hóa đơn.");

                if (entity.status != "DRAFT")
                    return ResponseConst.Error<bool>(400, "Chỉ có thể xóa hóa đơn ở trạng thái DRAFT.");

                _dbContext.Invoices.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa hóa đơn thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa hóa đơn. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<InvoiceResponse>>> GetAllAsync(Guid? vendorId = null, string? paymentStatus = null)
        {
            try
            {
                var query = _dbContext.Invoices
                    .Include(x => x.vendor)
                    .Include(x => x.purchaseOrder)
                    .AsQueryable();

                if (vendorId.HasValue)                  query = query.Where(x => x.vendorId      == vendorId.Value);
                if (!string.IsNullOrEmpty(paymentStatus)) query = query.Where(x => x.paymentStatus == paymentStatus);

                var result = await query
                    .OrderByDescending(x => x.invoiceDate)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách hóa đơn thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách hóa đơn.");
                return ResponseConst.Error<List<InvoiceResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<InvoiceResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Invoices
                    .Include(x => x.vendor)
                    .Include(x => x.purchaseOrder)
                    .FirstOrDefaultAsync(x => x.id == id);

                if (entity == null)
                    return ResponseConst.Error<InvoiceResponse>(404, "Không tìm thấy hóa đơn.");

                return ResponseConst.Success("Lấy chi tiết hóa đơn thành công.", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết hóa đơn. ID: {Id}", id);
                return ResponseConst.Error<InvoiceResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> MarkPaidAsync(Guid id, string paymentMethod, Guid confirmedBy)
        {
            try
            {
                var entity = await _dbContext.Invoices.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy hóa đơn.");

                if (entity.paymentStatus == "PAID")
                    return ResponseConst.Error<bool>(400, "Hóa đơn đã được thanh toán.");

                entity.paymentStatus = "PAID";
                entity.paidDate      = DateTime.UtcNow;
                entity.paymentMethod = paymentMethod;
                entity.confirmedBy   = confirmedBy;
                entity.confirmedAt   = DateTime.UtcNow;
                entity.status        = "PAID";

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xác nhận thanh toán hóa đơn thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xác nhận thanh toán hóa đơn. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AddItemAsync(CreateInvoiceItemDto request)
        {
            try
            {
                _dbContext.InvoiceItems.Add(new InvoiceItem
                {
                    invoiceId   = request.invoiceId,
                    materialId  = request.materialId,
                    description = request.description,
                    quantity    = request.quantity,
                    unitPrice   = request.unitPrice,
                    totalPrice  = request.totalPrice,
                    poItemId    = request.poItemId
                });
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm dòng hóa đơn thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thêm invoice item.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<InvoiceItemResponse>>> GetItemsAsync(Guid invoiceId)
        {
            try
            {
                var result = await _dbContext.InvoiceItems
                    .Include(x => x.material)
                    .Where(x => x.invoiceId == invoiceId)
                    .Select(x => new InvoiceItemResponse
                    {
                        id           = x.id,
                        invoiceId    = x.invoiceId,
                        materialId   = x.materialId,
                        materialCode = x.material != null ? x.material.materialCode : null,
                        materialName = x.material != null ? x.material.name         : null,
                        description  = x.description,
                        quantity     = x.quantity,
                        unitPrice    = x.unitPrice,
                        totalPrice   = x.totalPrice,
                        poItemId     = x.poItemId
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách dòng hóa đơn thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy items của hóa đơn. ID: {Id}", invoiceId);
                return ResponseConst.Error<List<InvoiceItemResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static InvoiceResponse MapToResponse(Invoice x) => new()
        {
            id            = x.id,
            invoiceCode   = x.invoiceCode,
            vendorId      = x.vendorId,
            vendorName    = x.vendor?.name,
            poId          = x.poId,
            poCode        = x.purchaseOrder?.poCode,
            ocrJobId      = x.ocrJobId,
            status        = x.status,
            invoiceDate   = x.invoiceDate,
            invoiceNumber = x.invoiceNumber,
            subtotal      = x.subtotal,
            taxAmount     = x.taxAmount,
            totalAmount   = x.totalAmount,
            currency      = x.currency,
            paymentDueDate = x.paymentDueDate,
            paidDate      = x.paidDate,
            paymentStatus = x.paymentStatus,
            paymentMethod = x.paymentMethod,
            confirmedBy   = x.confirmedBy,
            confirmedAt   = x.confirmedAt,
            notes         = x.notes
        };
    }

    // ============================================================
    // OCR JOB SERVICE
    // ============================================================
    public interface IOcrJobService
    {
        Task<ResponseDto<Guid>> SubmitAsync(CreateOcrJobDto request);
        Task<ResponseDto<List<OcrJobResponse>>> GetAllAsync(string? status = null);
        Task<ResponseDto<OcrJobResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<bool>> MarkReviewedAsync(Guid id, Guid reviewedBy, string? reviewedByName = null);
    }

    public class OcrJobService : AssetServiceBase, IOcrJobService
    {
        private readonly OcrJobQueue _queue;
        public OcrJobService(ILogger<OcrJobService> logger, AssetDbContext dbContext, OcrJobQueue queue)
            : base(logger, dbContext) => _queue = queue;

        public async Task<ResponseDto<Guid>> SubmitAsync(CreateOcrJobDto request)
        {
            try
            {
                // Hợp lệ: "pdf" (đọc lớp text hóa đơn điện tử) hoặc 2 engine OCR tự chủ; lạ → "paddleocr".
                var engine = (request.ocrEngine ?? "").Trim().ToLowerInvariant();
                if (engine != "vietocr" && engine != "paddleocr" && engine != "pdf") engine = "paddleocr";

                var job = new OcrJob
                {
                    documentType  = request.documentType,
                    ocrEngine     = engine,
                    fileUrl       = request.fileUrl,
                    fileName      = request.fileName,
                    fileSizeBytes   = request.fileSizeBytes,
                    submittedBy     = request.submittedBy,
                    submittedByName = request.submittedByName
                };
                _dbContext.OcrJobs.Add(job);
                await _dbContext.SaveChangesAsync();

                // Đẩy vào hàng đợi để worker OCR xử lý nền (QUEUED → PROCESSING → COMPLETED/FAILED).
                await _queue.EnqueueAsync(job.id);
                // Trả id job mới để FE điều hướng sang màn kết quả và poll trạng thái.
                return ResponseConst.Success("Gửi job OCR thành công.", job.id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi submit OCR job.");
                return ResponseConst.Error<Guid>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<OcrJobResponse>>> GetAllAsync(string? status = null)
        {
            try
            {
                var query = _dbContext.OcrJobs.AsQueryable();
                if (!string.IsNullOrEmpty(status)) query = query.Where(x => x.status == status);

                var result = await query
                    .OrderByDescending(x => x.submittedAt)
                    .Select(x => MapToResponse(x))
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách OCR job thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách OCR job.");
                return ResponseConst.Error<List<OcrJobResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<OcrJobResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.OcrJobs.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<OcrJobResponse>(404, "Không tìm thấy OCR job.");

                return ResponseConst.Success("Lấy chi tiết OCR job thành công.", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy OCR job. ID: {Id}", id);
                return ResponseConst.Error<OcrJobResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> MarkReviewedAsync(Guid id, Guid reviewedBy, string? reviewedByName = null)
        {
            try
            {
                var entity = await _dbContext.OcrJobs.FirstOrDefaultAsync(x => x.id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy OCR job.");

                entity.status     = "REVIEWED";
                entity.reviewedBy = reviewedBy;
                if (!string.IsNullOrWhiteSpace(reviewedByName)) entity.reviewedByName = reviewedByName;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Đánh dấu OCR job đã xem xét thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đánh dấu OCR job. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static OcrJobResponse MapToResponse(OcrJob x) => new()
        {
            id              = x.id,
            documentType    = x.documentType,
            ocrEngine       = x.ocrEngine,
            status          = x.status,
            reviewedBy      = x.reviewedBy,
            reviewedByName  = x.reviewedByName,
            fileUrl         = x.fileUrl,
            fileName        = x.fileName,
            fileSizeBytes   = x.fileSizeBytes,
            rawExtractedText = x.rawExtractedText,
            confidenceScore = x.confidenceScore,
            errorMessage    = x.errorMessage,
            startedAt       = x.startedAt,
            completedAt     = x.completedAt,
            submittedBy     = x.submittedBy,
            submittedByName = x.submittedByName,
            submittedAt     = x.submittedAt
        };
    }
}
