using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Dtos;
using TH.Asset.Infrastructure.Database;
using TH.Constant;
using VendorEntity = TH.Asset.Domain.Vendor.Vendor;
using VendorContractEntity = TH.Asset.Domain.Vendor.VendorContract;
using VendorContractServiceEntity = TH.Asset.Domain.Vendor.VendorContractService;
using VendorEvaluationEntity = TH.Asset.Domain.Vendor.VendorEvaluation;

namespace TH.Asset.ApplicationService.Service.Vendor
{
    // ════════════════════════════════════════════════════════════════════════
    // VENDOR SERVICE
    // ════════════════════════════════════════════════════════════════════════
    public interface IVendorService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateVendorDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateVendorDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<VendorResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<VendorResponse>>> GetAllAsync(string? status = null);
        Task<ResponseDto<bool>> BlacklistAsync(Guid id, string reason, Guid blacklistedBy);
        Task<ResponseDto<bool>> ActivateAsync(Guid id);
    }

    public class VendorService : AssetServiceBase, IVendorService
    {
        public VendorService(ILogger<VendorService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateVendorDto request)
        {
            try
            {
                if (await _dbContext.Vendors.AnyAsync(v => v.vendorCode == request.vendorCode))
                    return ResponseConst.Error<bool>(400, $"Mã nhà cung cấp '{request.vendorCode}' đã tồn tại.");

                if (await _dbContext.Vendors.AnyAsync(v => v.taxId == request.taxId))
                    return ResponseConst.Error<bool>(400, $"Mã số thuế '{request.taxId}' đã tồn tại.");

                _dbContext.Vendors.Add(new VendorEntity
                {
                    vendorCode   = request.vendorCode,
                    name         = request.name,
                    taxId        = request.taxId,
                    contactName  = request.contactName,
                    contactEmail = request.contactEmail,
                    contactPhone = request.contactPhone,
                    address      = request.address,
                    notes        = request.notes,
                    status       = "ACTIVE"
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm nhà cung cấp thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo vendor.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateVendorDto request)
        {
            try
            {
                var entity = await _dbContext.Vendors.FindAsync(request.id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy nhà cung cấp.");

                if (await _dbContext.Vendors.AnyAsync(v => v.vendorCode == request.vendorCode && v.id != request.id))
                    return ResponseConst.Error<bool>(400, $"Mã nhà cung cấp '{request.vendorCode}' đã tồn tại.");

                if (await _dbContext.Vendors.AnyAsync(v => v.taxId == request.taxId && v.id != request.id))
                    return ResponseConst.Error<bool>(400, $"Mã số thuế '{request.taxId}' đã tồn tại.");

                entity.vendorCode      = request.vendorCode;
                entity.name            = request.name;
                entity.taxId           = request.taxId;
                entity.contactName     = request.contactName;
                entity.contactEmail    = request.contactEmail;
                entity.contactPhone    = request.contactPhone;
                entity.address         = request.address;
                entity.notes           = request.notes;
                entity.status          = request.status;
                entity.blacklistReason = request.blacklistReason;
                entity.blacklistedAt   = request.blacklistedAt;
                entity.blacklistedBy   = request.blacklistedBy;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật nhà cung cấp thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật vendor {Id}.", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Vendors.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy nhà cung cấp.");

                if (await _dbContext.VendorContracts.AnyAsync(c => c.vendorId == id))
                    return ResponseConst.Error<bool>(400, "Không thể xóa nhà cung cấp đang có hợp đồng.");

                if (await _dbContext.VendorEvaluations.AnyAsync(e => e.vendorId == id))
                    return ResponseConst.Error<bool>(400, "Không thể xóa nhà cung cấp đã có đánh giá.");

                _dbContext.Vendors.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa nhà cung cấp thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa vendor {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<VendorResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Vendors.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<VendorResponse>(404, "Không tìm thấy nhà cung cấp.");

                return ResponseConst.Success("OK", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy vendor {Id}.", id);
                return ResponseConst.Error<VendorResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<VendorResponse>>> GetAllAsync(string? status = null)
        {
            try
            {
                var query = _dbContext.Vendors.AsQueryable();

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(v => v.status == status);

                var list = await query
                    .OrderBy(v => v.name)
                    .Select(v => MapToResponse(v))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách vendor.");
                return ResponseConst.Error<List<VendorResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> BlacklistAsync(Guid id, string reason, Guid blacklistedBy)
        {
            try
            {
                var entity = await _dbContext.Vendors.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy nhà cung cấp.");

                if (entity.status == "BLACKLISTED")
                    return ResponseConst.Error<bool>(400, "Nhà cung cấp đã bị đưa vào danh sách đen.");

                entity.status          = "BLACKLISTED";
                entity.blacklistReason = reason;
                entity.blacklistedAt   = DateTime.UtcNow;
                entity.blacklistedBy   = blacklistedBy;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Đã đưa nhà cung cấp vào danh sách đen.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi blacklist vendor {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> ActivateAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.Vendors.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy nhà cung cấp.");

                entity.status          = "ACTIVE";
                entity.blacklistReason = null;
                entity.blacklistedAt   = null;
                entity.blacklistedBy   = null;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Đã kích hoạt lại nhà cung cấp.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi activate vendor {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static VendorResponse MapToResponse(VendorEntity e) => new()
        {
            id              = e.id,
            vendorCode      = e.vendorCode,
            name            = e.name,
            taxId           = e.taxId,
            status          = e.status,
            blacklistReason = e.blacklistReason,
            blacklistedAt   = e.blacklistedAt,
            blacklistedBy   = e.blacklistedBy,
            contactName     = e.contactName,
            contactEmail    = e.contactEmail,
            contactPhone    = e.contactPhone,
            address         = e.address,
            notes           = e.notes
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR CONTRACT SERVICE
    // ════════════════════════════════════════════════════════════════════════
    public interface IVendorContractService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateVendorContractDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateVendorContractDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<VendorContractResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<VendorContractResponse>>> GetAllAsync(Guid? vendorId = null, Guid? buildingId = null, string? status = null);
        Task<ResponseDto<List<VendorContractResponse>>> GetExpiringAsync(int daysAhead = 30);
    }

    public class VendorContractService : AssetServiceBase, IVendorContractService
    {
        public VendorContractService(ILogger<VendorContractService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateVendorContractDto request)
        {
            try
            {
                if (!await _dbContext.Vendors.AnyAsync(v => v.id == request.vendorId))
                    return ResponseConst.Error<bool>(400, "Nhà cung cấp không tồn tại.");

                if (await _dbContext.VendorContracts.AnyAsync(c => c.contractCode == request.contractCode))
                    return ResponseConst.Error<bool>(400, $"Mã hợp đồng '{request.contractCode}' đã tồn tại.");

                _dbContext.VendorContracts.Add(new VendorContractEntity
                {
                    contractCode      = request.contractCode,
                    vendorId          = request.vendorId,
                    buildingId        = request.buildingId,
                    startDate         = request.startDate,
                    endDate           = request.endDate,
                    contractValue     = request.contractValue,
                    currency          = request.currency,
                    paymentTerms      = request.paymentTerms,
                    renewalNoticeDays = request.renewalNoticeDays,
                    status            = request.status,
                    scopeOfWork       = request.scopeOfWork,
                    fileUrl           = request.fileUrl,
                    signedByVendor    = request.signedByVendor,
                    signedByBuilding  = request.signedByBuilding,
                    notes             = request.notes
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm hợp đồng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo vendor contract.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateVendorContractDto request)
        {
            try
            {
                var entity = await _dbContext.VendorContracts.FindAsync(request.id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy hợp đồng.");

                if (await _dbContext.VendorContracts.AnyAsync(c => c.contractCode == request.contractCode && c.id != request.id))
                    return ResponseConst.Error<bool>(400, $"Mã hợp đồng '{request.contractCode}' đã tồn tại.");

                entity.contractCode      = request.contractCode;
                entity.vendorId          = request.vendorId;
                entity.buildingId        = request.buildingId;
                entity.startDate         = request.startDate;
                entity.endDate           = request.endDate;
                entity.contractValue     = request.contractValue;
                entity.currency          = request.currency;
                entity.paymentTerms      = request.paymentTerms;
                entity.renewalNoticeDays = request.renewalNoticeDays;
                entity.status            = request.status;
                entity.scopeOfWork       = request.scopeOfWork;
                entity.fileUrl           = request.fileUrl;
                entity.signedByVendor    = request.signedByVendor;
                entity.signedByBuilding  = request.signedByBuilding;
                entity.notes             = request.notes;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật hợp đồng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật vendor contract {Id}.", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.VendorContracts.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy hợp đồng.");

                if (entity.status == "ACTIVE")
                    return ResponseConst.Error<bool>(400, "Không thể xóa hợp đồng đang ACTIVE. Hãy chấm dứt hợp đồng trước.");

                if (await _dbContext.VendorEvaluations.AnyAsync(e => e.contractId == id))
                    return ResponseConst.Error<bool>(400, "Không thể xóa hợp đồng đã có đánh giá.");

                _dbContext.VendorContracts.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa hợp đồng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa vendor contract {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<VendorContractResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.VendorContracts
                    .Include(c => c.vendor)
                    .FirstOrDefaultAsync(c => c.id == id);

                if (entity is null)
                    return ResponseConst.Error<VendorContractResponse>(404, "Không tìm thấy hợp đồng.");

                return ResponseConst.Success("OK", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy vendor contract {Id}.", id);
                return ResponseConst.Error<VendorContractResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<VendorContractResponse>>> GetAllAsync(
            Guid? vendorId = null, Guid? buildingId = null, string? status = null)
        {
            try
            {
                var query = _dbContext.VendorContracts.Include(c => c.vendor).AsQueryable();

                if (vendorId.HasValue)
                    query = query.Where(c => c.vendorId == vendorId.Value);

                if (buildingId.HasValue)
                    query = query.Where(c => c.buildingId == buildingId.Value);

                if (!string.IsNullOrWhiteSpace(status))
                    query = query.Where(c => c.status == status);

                var list = await query
                    .OrderByDescending(c => c.startDate)
                    .Select(c => MapToResponse(c))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách vendor contracts.");
                return ResponseConst.Error<List<VendorContractResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<VendorContractResponse>>> GetExpiringAsync(int daysAhead = 30)
        {
            try
            {
                var now       = DateTime.UtcNow;
                var threshold = now.AddDays(daysAhead);

                var list = await _dbContext.VendorContracts
                    .Include(c => c.vendor)
                    .Where(c => c.status == "ACTIVE"
                             && c.endDate.HasValue
                             && c.endDate.Value >= now
                             && c.endDate.Value <= threshold)
                    .OrderBy(c => c.endDate)
                    .Select(c => MapToResponse(c))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy hợp đồng sắp hết hạn.");
                return ResponseConst.Error<List<VendorContractResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static VendorContractResponse MapToResponse(VendorContractEntity e) => new()
        {
            id                = e.id,
            contractCode      = e.contractCode,
            vendorId          = e.vendorId,
            vendorName        = e.vendor?.name,
            buildingId        = e.buildingId,
            startDate         = e.startDate,
            endDate           = e.endDate,
            contractValue     = e.contractValue,
            currency          = e.currency,
            paymentTerms      = e.paymentTerms,
            renewalNoticeDays = e.renewalNoticeDays,
            status            = e.status,
            scopeOfWork       = e.scopeOfWork,
            fileUrl           = e.fileUrl,
            signedByVendor    = e.signedByVendor,
            signedByBuilding  = e.signedByBuilding,
            notes             = e.notes
        };
    }

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR CONTRACT SERVICE ITEMS SERVICE
    // ════════════════════════════════════════════════════════════════════════
    public interface IVendorContractServiceService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateVendorContractServiceDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateVendorContractServiceDto request);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
        Task<ResponseDto<List<VendorContractServiceResponse>>> GetByContractAsync(Guid contractId);
    }

    public class VendorContractServiceService : AssetServiceBase, IVendorContractServiceService
    {
        public VendorContractServiceService(ILogger<VendorContractServiceService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateVendorContractServiceDto request)
        {
            try
            {
                if (!await _dbContext.VendorContracts.AnyAsync(c => c.id == request.contractId))
                    return ResponseConst.Error<bool>(400, "Hợp đồng không tồn tại.");

                _dbContext.VendorContractServices.Add(new VendorContractServiceEntity
                {
                    contractId  = request.contractId,
                    serviceName = request.serviceName
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm dịch vụ hợp đồng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo vendor contract service.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateVendorContractServiceDto request)
        {
            try
            {
                var entity = await _dbContext.VendorContractServices.FindAsync(request.id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy dịch vụ hợp đồng.");

                entity.contractId  = request.contractId;
                entity.serviceName = request.serviceName;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật dịch vụ hợp đồng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật vendor contract service {Id}.", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.VendorContractServices.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy dịch vụ hợp đồng.");

                _dbContext.VendorContractServices.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa dịch vụ hợp đồng thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa vendor contract service {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<VendorContractServiceResponse>>> GetByContractAsync(Guid contractId)
        {
            try
            {
                var contract = await _dbContext.VendorContracts.FindAsync(contractId);
                if (contract is null)
                    return ResponseConst.Error<List<VendorContractServiceResponse>>(404, "Hợp đồng không tồn tại.");

                var list = await _dbContext.VendorContractServices
                    .Where(s => s.contractId == contractId)
                    .OrderBy(s => s.serviceName)
                    .Select(s => new VendorContractServiceResponse
                    {
                        id           = s.id,
                        contractId   = s.contractId,
                        contractCode = contract.contractCode,
                        serviceName  = s.serviceName
                    })
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy dịch vụ của hợp đồng {ContractId}.", contractId);
                return ResponseConst.Error<List<VendorContractServiceResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // VENDOR EVALUATION SERVICE
    // ════════════════════════════════════════════════════════════════════════
    public interface IVendorEvaluationService
    {
        Task<ResponseDto<bool>> CreateAsync(CreateVendorEvaluationDto request);
        Task<ResponseDto<VendorEvaluationResponse>> GetByIdAsync(Guid id);
        Task<ResponseDto<List<VendorEvaluationResponse>>> GetByVendorAsync(Guid vendorId);
        Task<ResponseDto<List<VendorEvaluationResponse>>> GetByContractAsync(Guid contractId);
        Task<ResponseDto<bool>> DeleteAsync(Guid id);
    }

    public class VendorEvaluationService : AssetServiceBase, IVendorEvaluationService
    {
        public VendorEvaluationService(ILogger<VendorEvaluationService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<bool>> CreateAsync(CreateVendorEvaluationDto request)
        {
            try
            {
                if (request.overallScore < 1 || request.overallScore > 5 ||
                    request.qualityScore < 1 || request.qualityScore > 5 ||
                    request.timelinessScore < 1 || request.timelinessScore > 5 ||
                    request.costScore < 1 || request.costScore > 5 ||
                    request.safetyScore < 1 || request.safetyScore > 5)
                    return ResponseConst.Error<bool>(400, "Điểm đánh giá phải từ 1 đến 5.");

                if (!await _dbContext.Vendors.AnyAsync(v => v.id == request.vendorId))
                    return ResponseConst.Error<bool>(400, "Nhà cung cấp không tồn tại.");

                if (request.contractId.HasValue &&
                    !await _dbContext.VendorContracts.AnyAsync(c => c.id == request.contractId.Value))
                    return ResponseConst.Error<bool>(400, "Hợp đồng không tồn tại.");

                if (!string.IsNullOrWhiteSpace(request.recommendation) &&
                    request.recommendation != "CONTINUE" &&
                    request.recommendation != "REVIEW" &&
                    request.recommendation != "TERMINATE")
                    return ResponseConst.Error<bool>(400, "Khuyến nghị phải là CONTINUE, REVIEW hoặc TERMINATE.");

                _dbContext.VendorEvaluations.Add(new VendorEvaluationEntity
                {
                    vendorId        = request.vendorId,
                    contractId      = request.contractId,
                    evaluatorId     = request.evaluatorId,
                    evaluationDate  = request.evaluationDate,
                    overallScore    = request.overallScore,
                    qualityScore    = request.qualityScore,
                    timelinessScore = request.timelinessScore,
                    costScore       = request.costScore,
                    safetyScore     = request.safetyScore,
                    comments        = request.comments,
                    recommendation  = request.recommendation
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Thêm đánh giá nhà cung cấp thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo vendor evaluation.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<VendorEvaluationResponse>> GetByIdAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.VendorEvaluations
                    .Include(e => e.vendor)
                    .Include(e => e.contract)
                    .FirstOrDefaultAsync(e => e.id == id);

                if (entity is null)
                    return ResponseConst.Error<VendorEvaluationResponse>(404, "Không tìm thấy đánh giá.");

                return ResponseConst.Success("OK", MapToResponse(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy vendor evaluation {Id}.", id);
                return ResponseConst.Error<VendorEvaluationResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<VendorEvaluationResponse>>> GetByVendorAsync(Guid vendorId)
        {
            try
            {
                if (!await _dbContext.Vendors.AnyAsync(v => v.id == vendorId))
                    return ResponseConst.Error<List<VendorEvaluationResponse>>(404, "Nhà cung cấp không tồn tại.");

                var list = await _dbContext.VendorEvaluations
                    .Include(e => e.vendor)
                    .Include(e => e.contract)
                    .Where(e => e.vendorId == vendorId)
                    .OrderByDescending(e => e.evaluationDate)
                    .Select(e => MapToResponse(e))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đánh giá của vendor {VendorId}.", vendorId);
                return ResponseConst.Error<List<VendorEvaluationResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<List<VendorEvaluationResponse>>> GetByContractAsync(Guid contractId)
        {
            try
            {
                if (!await _dbContext.VendorContracts.AnyAsync(c => c.id == contractId))
                    return ResponseConst.Error<List<VendorEvaluationResponse>>(404, "Hợp đồng không tồn tại.");

                var list = await _dbContext.VendorEvaluations
                    .Include(e => e.vendor)
                    .Include(e => e.contract)
                    .Where(e => e.contractId == contractId)
                    .OrderByDescending(e => e.evaluationDate)
                    .Select(e => MapToResponse(e))
                    .ToListAsync();

                return ResponseConst.Success("OK", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đánh giá của hợp đồng {ContractId}.", contractId);
                return ResponseConst.Error<List<VendorEvaluationResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(Guid id)
        {
            try
            {
                var entity = await _dbContext.VendorEvaluations.FindAsync(id);
                if (entity is null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy đánh giá.");

                _dbContext.VendorEvaluations.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa đánh giá thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa vendor evaluation {Id}.", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        private static VendorEvaluationResponse MapToResponse(VendorEvaluationEntity e) => new()
        {
            id              = e.id,
            vendorId        = e.vendorId,
            vendorName      = e.vendor?.name,
            contractId      = e.contractId,
            contractCode    = e.contract?.contractCode,
            evaluatorId     = e.evaluatorId,
            evaluationDate  = e.evaluationDate,
            overallScore    = e.overallScore,
            qualityScore    = e.qualityScore,
            timelinessScore = e.timelinessScore,
            costScore       = e.costScore,
            safetyScore     = e.safetyScore,
            comments        = e.comments,
            recommendation  = e.recommendation
        };
    }
}
