using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Constant;
using TH.TownHub.ApplicationService.Common;
using TH.TownHub.Domain.Entities;
using TH.TownHub.Dtos;
using TH.TownHub.Infrastructure.Database;

namespace TH.TownHub.ApplicationService.Service
{
    // ============================================================
    // PROVIDER SERVICE
    // ============================================================
    public interface IProviderService
    {
        Task<ResponseDto<List<ProviderResponse>>> GetAllAsync(string? registrationStatus = null);
        Task<ResponseDto<ProviderResponse>> GetByIdAsync(int id);
        Task<ResponseDto<bool>> RegisterAsync(RegisterProviderRequestDto request);
        Task<ResponseDto<ProviderResponse>> GetMyProfileAsync(int authUserId);
        Task<ResponseDto<bool>> SelfRegisterAsync(SelfRegisterProviderRequestDto request);
        Task<ResponseDto<bool>> ApproveAsync(ApproveProviderRequestDto request);
        Task<ResponseDto<bool>> RejectAsync(RejectProviderRequestDto request);
    }

    public class ProviderService : TownHubServiceBase, IProviderService
    {
        public ProviderService(ILogger<ProviderService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<List<ProviderResponse>>> GetAllAsync(string? registrationStatus = null)
        {
            try
            {
                var query = _dbContext.Providers
                    .Include(x => x.Resident).ThenInclude(r => r!.Apartment)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(registrationStatus))
                    query = query.Where(x => x.RegistrationStatus == registrationStatus);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new ProviderResponse
                    {
                        id = x.Id,
                        companyName = x.CompanyName,
                        contactName = x.ContactName,
                        phone = x.Phone,
                        email = x.Email,
                        address = x.Address,
                        serviceCategories = x.ServiceCategories,
                        registrationStatus = x.RegistrationStatus,
                        rejectionReason = x.RejectionReason,
                        approvedByAuthUserId = x.ApprovedByAuthUserId,
                        approvedAt = x.ApprovedAt,
                        residentId = x.ResidentId,
                        residentFullName = x.Resident != null ? x.Resident.FullName : null,
                        residentApartmentCode = x.Resident != null && x.Resident.Apartment != null
                            ? x.Resident.Apartment.Code : null,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách nhà cung cấp thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách nhà cung cấp.");
                return ResponseConst.Error<List<ProviderResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ProviderResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.Providers
                    .Include(x => x.Resident).ThenInclude(r => r!.Apartment)
                    .Where(x => x.Id == id)
                    .Select(x => new ProviderResponse
                    {
                        id = x.Id,
                        companyName = x.CompanyName,
                        contactName = x.ContactName,
                        phone = x.Phone,
                        email = x.Email,
                        address = x.Address,
                        serviceCategories = x.ServiceCategories,
                        registrationStatus = x.RegistrationStatus,
                        rejectionReason = x.RejectionReason,
                        approvedByAuthUserId = x.ApprovedByAuthUserId,
                        approvedAt = x.ApprovedAt,
                        residentId = x.ResidentId,
                        residentFullName = x.Resident != null ? x.Resident.FullName : null,
                        residentApartmentCode = x.Resident != null && x.Resident.Apartment != null
                            ? x.Resident.Apartment.Code : null,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ProviderResponse>(404, "Không tìm thấy nhà cung cấp.");

                return ResponseConst.Success("Lấy chi tiết nhà cung cấp thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết nhà cung cấp. ID: {Id}", id);
                return ResponseConst.Error<ProviderResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RegisterAsync(RegisterProviderRequestDto request)
        {
            try
            {
                var isDuplicate = await _dbContext.Providers
                    .AnyAsync(x => x.Phone == request.phone && x.RegistrationStatus != "rejected");
                if (isDuplicate)
                    return ResponseConst.Error<bool>(400, "Số điện thoại này đã được đăng ký.");

                // Nếu NCC là cư dân → kiểm tra và đánh dấu IsBusinessOwner
                if (request.residentId.HasValue)
                {
                    var resident = await _dbContext.Residents
                        .FirstOrDefaultAsync(x => x.Id == request.residentId.Value);
                    if (resident == null)
                        return ResponseConst.Error<bool>(400, "Không tìm thấy cư dân tương ứng.");

                    resident.IsBusinessOwner = true;
                    resident.UpdatedAt = DateTime.UtcNow;
                }

                _dbContext.Providers.Add(new Provider
                {
                    CompanyName = request.companyName,
                    ContactName = request.contactName,
                    Phone = request.phone,
                    Email = request.email,
                    Address = request.address,
                    ServiceCategories = request.serviceCategories,
                    ResidentId = request.residentId,
                    RegistrationStatus = "pending"
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Đăng ký nhà cung cấp thành công. Vui lòng chờ BQL duyệt.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đăng ký nhà cung cấp.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ProviderResponse>> GetMyProfileAsync(int authUserId)
        {
            try
            {
                var resident = await _dbContext.Residents
                    .FirstOrDefaultAsync(x => x.AuthUserId == authUserId);
                if (resident == null)
                    return ResponseConst.Error<ProviderResponse>(404,
                        "Không tìm thấy hồ sơ cư dân.");

                var result = await _dbContext.Providers
                    .Include(x => x.Resident).ThenInclude(r => r!.Apartment)
                    .Where(x => x.ResidentId == resident.Id)
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new ProviderResponse
                    {
                        id                    = x.Id,
                        companyName           = x.CompanyName,
                        contactName           = x.ContactName,
                        phone                 = x.Phone,
                        email                 = x.Email,
                        address               = x.Address,
                        serviceCategories     = x.ServiceCategories,
                        registrationStatus    = x.RegistrationStatus,
                        rejectionReason       = x.RejectionReason,
                        approvedByAuthUserId  = x.ApprovedByAuthUserId,
                        approvedAt            = x.ApprovedAt,
                        residentId            = x.ResidentId,
                        residentFullName      = x.Resident != null ? x.Resident.FullName : null,
                        residentApartmentCode = x.Resident != null && x.Resident.Apartment != null
                                                    ? x.Resident.Apartment.Code : null,
                        createdAt             = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ProviderResponse>(404,
                        "Bạn chưa có hồ sơ nhà cung cấp dịch vụ.");

                return ResponseConst.Success("Lấy hồ sơ nhà cung cấp thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy hồ sơ NCC cá nhân. AuthUserId: {AuthUserId}", authUserId);
                return ResponseConst.Error<ProviderResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> SelfRegisterAsync(SelfRegisterProviderRequestDto request)
        {
            try
            {
                // Tìm hồ sơ cư dân theo authUserId
                var resident = await _dbContext.Residents
                    .FirstOrDefaultAsync(x => x.AuthUserId == request.authUserId);
                if (resident == null)
                    return ResponseConst.Error<bool>(404,
                        "Không tìm thấy hồ sơ cư dân. Vui lòng liên hệ BQL để được tạo hồ sơ.");

                // Kiểm tra đã có đơn NCC chưa bị từ chối
                var existing = await _dbContext.Providers
                    .AnyAsync(x => x.ResidentId == resident.Id && x.RegistrationStatus != "rejected");
                if (existing)
                    return ResponseConst.Error<bool>(400,
                        "Bạn đã có đơn đăng ký nhà cung cấp dịch vụ đang chờ xử lý hoặc đã được duyệt.");

                // Kiểm tra số điện thoại trùng (dùng phone của cư dân nếu request không truyền)
                var phone = !string.IsNullOrWhiteSpace(request.phone) ? request.phone : resident.Phone;
                var isDuplicate = await _dbContext.Providers
                    .AnyAsync(x => x.Phone == phone && x.RegistrationStatus != "rejected");
                if (isDuplicate)
                    return ResponseConst.Error<bool>(400, "Số điện thoại này đã được đăng ký bởi nhà cung cấp khác.");

                // Đánh dấu cư dân là chủ kinh doanh
                resident.IsBusinessOwner = true;
                resident.UpdatedAt = DateTime.UtcNow;

                _dbContext.Providers.Add(new Provider
                {
                    CompanyName        = request.companyName,
                    ContactName        = !string.IsNullOrWhiteSpace(request.contactName)
                                            ? request.contactName : resident.FullName,
                    Phone              = phone,
                    Email              = !string.IsNullOrWhiteSpace(request.email)
                                            ? request.email : resident.Email,
                    Address            = request.address,
                    ServiceCategories  = request.serviceCategories,
                    ResidentId         = resident.Id,
                    RegistrationStatus = "pending"
                });

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success(
                    "Nộp đơn đăng ký nhà cung cấp dịch vụ thành công. Vui lòng chờ BQL xem xét và phê duyệt.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tự đăng ký NCC. AuthUserId: {AuthUserId}", request.authUserId);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> ApproveAsync(ApproveProviderRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Providers.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy nhà cung cấp.");

                if (entity.RegistrationStatus != "pending")
                    return ResponseConst.Error<bool>(400, "Chỉ duyệt được nhà cung cấp ở trạng thái 'pending'.");

                entity.RegistrationStatus = "approved";
                entity.ApprovedByAuthUserId = request.approvedByAuthUserId;
                entity.ApprovedAt = DateTime.UtcNow;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Duyệt nhà cung cấp thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi duyệt nhà cung cấp. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RejectAsync(RejectProviderRequestDto request)
        {
            try
            {
                var entity = await _dbContext.Providers.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy nhà cung cấp.");

                if (entity.RegistrationStatus != "pending")
                    return ResponseConst.Error<bool>(400, "Chỉ từ chối được nhà cung cấp ở trạng thái 'pending'.");

                entity.RegistrationStatus = "rejected";
                entity.RejectionReason = request.reason;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Từ chối nhà cung cấp thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi từ chối nhà cung cấp. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // PROVIDER SERVICE LISTING SERVICE
    // ============================================================
    public interface IProviderServiceListingService
    {
        Task<ResponseDto<List<ServiceListingResponse>>> GetAllAsync(string? status = null, int? providerId = null);
        Task<ResponseDto<ServiceListingResponse>> GetByIdAsync(int id);
        Task<ResponseDto<bool>> RegisterAsync(RegisterServiceListingDto request);
        Task<ResponseDto<bool>> UpdateAsync(UpdateServiceListingDto request);
        Task<ResponseDto<bool>> ApproveAsync(ApproveServiceListingDto request);
        Task<ResponseDto<bool>> RejectAsync(RejectServiceListingDto request);
        Task<ResponseDto<bool>> DeleteAsync(int id);
    }

    public class ProviderServiceListingService : TownHubServiceBase, IProviderServiceListingService
    {
        public ProviderServiceListingService(ILogger<ProviderServiceListingService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<List<ServiceListingResponse>>> GetAllAsync(string? status = null, int? providerId = null)
        {
            try
            {
                var query = _dbContext.ProviderServiceListings
                    .Include(x => x.Provider)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(x => x.Status == status);

                if (providerId.HasValue)
                    query = query.Where(x => x.ProviderId == providerId.Value);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new ServiceListingResponse
                    {
                        id = x.Id,
                        providerId = x.ProviderId,
                        providerCompanyName = x.Provider != null ? x.Provider.CompanyName : null,
                        providerPhone = x.Provider != null ? x.Provider.Phone : null,
                        name = x.Name,
                        category = x.Category,
                        description = x.Description,
                        contactPhone = x.ContactPhone,
                        contactEmail = x.ContactEmail,
                        contactAddress = x.ContactAddress,
                        priceList = x.PriceList,
                        status = x.Status,
                        rejectionReason = x.RejectionReason,
                        approvedByAuthUserId = x.ApprovedByAuthUserId,
                        approvedAt = x.ApprovedAt,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách dịch vụ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách dịch vụ.");
                return ResponseConst.Error<List<ServiceListingResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ServiceListingResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.ProviderServiceListings
                    .Include(x => x.Provider)
                    .Where(x => x.Id == id)
                    .Select(x => new ServiceListingResponse
                    {
                        id = x.Id,
                        providerId = x.ProviderId,
                        providerCompanyName = x.Provider != null ? x.Provider.CompanyName : null,
                        providerPhone = x.Provider != null ? x.Provider.Phone : null,
                        name = x.Name,
                        category = x.Category,
                        description = x.Description,
                        contactPhone = x.ContactPhone,
                        contactEmail = x.ContactEmail,
                        contactAddress = x.ContactAddress,
                        priceList = x.PriceList,
                        status = x.Status,
                        rejectionReason = x.RejectionReason,
                        approvedByAuthUserId = x.ApprovedByAuthUserId,
                        approvedAt = x.ApprovedAt,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ServiceListingResponse>(404, "Không tìm thấy dịch vụ.");

                return ResponseConst.Success("Lấy chi tiết dịch vụ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết dịch vụ. ID: {Id}", id);
                return ResponseConst.Error<ServiceListingResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RegisterAsync(RegisterServiceListingDto request)
        {
            try
            {
                var providerOk = await _dbContext.Providers
                    .AnyAsync(x => x.Id == request.providerId && x.RegistrationStatus == "approved");
                if (!providerOk)
                    return ResponseConst.Error<bool>(400, "Nhà cung cấp không tồn tại hoặc chưa được BQL duyệt.");

                _dbContext.ProviderServiceListings.Add(new ProviderServiceListing
                {
                    ProviderId = request.providerId,
                    Name = request.name,
                    Category = request.category,
                    Description = request.description,
                    ContactPhone = request.contactPhone,
                    ContactEmail = request.contactEmail,
                    ContactAddress = request.contactAddress,
                    PriceList = request.priceList,
                    Status = "pending"
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Đăng ký dịch vụ thành công. Vui lòng chờ BQL phê duyệt.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi đăng ký dịch vụ.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateAsync(UpdateServiceListingDto request)
        {
            try
            {
                var entity = await _dbContext.ProviderServiceListings.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy dịch vụ.");

                if (entity.Status == "approved")
                    return ResponseConst.Error<bool>(400, "Không thể chỉnh sửa dịch vụ đã được duyệt. Hãy đăng ký lại.");

                entity.Name = request.name;
                entity.Category = request.category;
                entity.Description = request.description;
                entity.ContactPhone = request.contactPhone;
                entity.ContactEmail = request.contactEmail;
                entity.ContactAddress = request.contactAddress;
                entity.PriceList = request.priceList;
                // Reset về pending nếu đang bị rejected, để BQL xét lại
                if (entity.Status == "rejected")
                {
                    entity.Status = "pending";
                    entity.RejectionReason = null;
                }
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật dịch vụ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật dịch vụ. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> ApproveAsync(ApproveServiceListingDto request)
        {
            try
            {
                var entity = await _dbContext.ProviderServiceListings.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy dịch vụ.");

                if (entity.Status != "pending")
                    return ResponseConst.Error<bool>(400, "Chỉ duyệt được dịch vụ ở trạng thái 'pending'.");

                entity.Status = "approved";
                entity.ApprovedByAuthUserId = request.approvedByAuthUserId;
                entity.ApprovedAt = DateTime.UtcNow;
                entity.RejectionReason = null;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Phê duyệt dịch vụ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi duyệt dịch vụ. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RejectAsync(RejectServiceListingDto request)
        {
            try
            {
                var entity = await _dbContext.ProviderServiceListings.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy dịch vụ.");

                if (entity.Status != "pending")
                    return ResponseConst.Error<bool>(400, "Chỉ từ chối được dịch vụ ở trạng thái 'pending'.");

                entity.Status = "rejected";
                entity.RejectionReason = request.reason;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Từ chối dịch vụ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi từ chối dịch vụ. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> DeleteAsync(int id)
        {
            try
            {
                var entity = await _dbContext.ProviderServiceListings.FirstOrDefaultAsync(x => x.Id == id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy dịch vụ.");

                if (entity.Status == "approved")
                    return ResponseConst.Error<bool>(400, "Không thể xóa dịch vụ đã được duyệt.");

                _dbContext.ProviderServiceListings.Remove(entity);
                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Xóa dịch vụ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa dịch vụ. ID: {Id}", id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }

    // ============================================================
    // SERVICE REQUEST SERVICE
    // ============================================================
    public interface IServiceRequestService
    {
        Task<ResponseDto<List<ServiceRequestResponse>>> GetAllAsync(string? status = null, int? providerId = null, int? apartmentId = null);
        Task<ResponseDto<ServiceRequestResponse>> GetByIdAsync(int id);
        Task<ResponseDto<bool>> CreateAsync(CreateServiceRequestDto request);
        Task<ResponseDto<bool>> ApproveByMgtAsync(ApproveByMgtRequestDto request);
        Task<ResponseDto<bool>> RejectByMgtAsync(RejectByMgtRequestDto request);
        Task<ResponseDto<bool>> AcceptByProviderAsync(AcceptByProviderRequestDto request);
        Task<ResponseDto<bool>> RejectByProviderAsync(RejectByProviderRequestDto request);
        Task<ResponseDto<bool>> UpdateStatusAsync(UpdateServiceRequestStatusDto request);
    }

    public class ServiceRequestService : TownHubServiceBase, IServiceRequestService
    {
        public ServiceRequestService(ILogger<ServiceRequestService> logger, TownHubDbContext dbContext)
            : base(logger, dbContext) { }

        public async Task<ResponseDto<List<ServiceRequestResponse>>> GetAllAsync(
            string? status = null, int? providerId = null, int? apartmentId = null)
        {
            try
            {
                var query = _dbContext.ServiceRequests
                    .Include(x => x.Apartment)
                    .Include(x => x.Provider)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(x => x.Status == status);

                if (providerId.HasValue)
                    query = query.Where(x => x.ProviderId == providerId.Value);

                if (apartmentId.HasValue)
                    query = query.Where(x => x.ApartmentId == apartmentId.Value);

                var result = await query
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => new ServiceRequestResponse
                    {
                        id = x.Id,
                        title = x.Title,
                        description = x.Description,
                        category = x.Category,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment != null ? x.Apartment.Code : null,
                        requesterName = _dbContext.Residents
                            .Where(r => r.AuthUserId == x.RequestedByAuthUserId)
                            .Select(r => r.FullName).FirstOrDefault(),
                        requesterPhone = _dbContext.Residents
                            .Where(r => r.AuthUserId == x.RequestedByAuthUserId)
                            .Select(r => r.Phone).FirstOrDefault(),
                        requesterApartmentCode = _dbContext.Residents
                            .Where(r => r.AuthUserId == x.RequestedByAuthUserId && r.ApartmentId != null)
                            .Select(r => r.Apartment!.Code).FirstOrDefault(),

                        requiresMgtApproval = x.RequiresMgtApproval,
                        status = x.Status,
                        providerId = x.ProviderId,
                        providerCompanyName = x.Provider != null ? x.Provider.CompanyName : null,
                        requestedByAuthUserId = x.RequestedByAuthUserId,
                        mgtApprovedByAuthUserId = x.MgtApprovedByAuthUserId,
                        mgtApprovedAt = x.MgtApprovedAt,
                        mgtRejectionReason = x.MgtRejectionReason,
                        providerRejectionReason = x.ProviderRejectionReason,
                        scheduledDate = x.ScheduledDate,
                        completedAt = x.CompletedAt,
                        note = x.Note,
                        createdAt = x.CreatedAt
                    })
                    .ToListAsync();

                return ResponseConst.Success("Lấy danh sách yêu cầu dịch vụ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách yêu cầu dịch vụ.");
                return ResponseConst.Error<List<ServiceRequestResponse>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<ServiceRequestResponse>> GetByIdAsync(int id)
        {
            try
            {
                var result = await _dbContext.ServiceRequests
                    .Include(x => x.Apartment)
                    .Include(x => x.Provider)
                    .Where(x => x.Id == id)
                    .Select(x => new ServiceRequestResponse
                    {
                        id = x.Id,
                        title = x.Title,
                        description = x.Description,
                        category = x.Category,
                        apartmentId = x.ApartmentId,
                        apartmentCode = x.Apartment != null ? x.Apartment.Code : null,
                        requesterName = _dbContext.Residents
                            .Where(r => r.AuthUserId == x.RequestedByAuthUserId)
                            .Select(r => r.FullName).FirstOrDefault(),
                        requesterPhone = _dbContext.Residents
                            .Where(r => r.AuthUserId == x.RequestedByAuthUserId)
                            .Select(r => r.Phone).FirstOrDefault(),
                        requesterApartmentCode = _dbContext.Residents
                            .Where(r => r.AuthUserId == x.RequestedByAuthUserId && r.ApartmentId != null)
                            .Select(r => r.Apartment!.Code).FirstOrDefault(),

                        requiresMgtApproval = x.RequiresMgtApproval,
                        status = x.Status,
                        providerId = x.ProviderId,
                        providerCompanyName = x.Provider != null ? x.Provider.CompanyName : null,
                        requestedByAuthUserId = x.RequestedByAuthUserId,
                        mgtApprovedByAuthUserId = x.MgtApprovedByAuthUserId,
                        mgtApprovedAt = x.MgtApprovedAt,
                        mgtRejectionReason = x.MgtRejectionReason,
                        providerRejectionReason = x.ProviderRejectionReason,
                        scheduledDate = x.ScheduledDate,
                        completedAt = x.CompletedAt,
                        note = x.Note,
                        createdAt = x.CreatedAt
                    })
                    .FirstOrDefaultAsync();

                if (result == null)
                    return ResponseConst.Error<ServiceRequestResponse>(404, "Không tìm thấy yêu cầu dịch vụ.");

                return ResponseConst.Success("Lấy chi tiết yêu cầu dịch vụ thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết yêu cầu dịch vụ. ID: {Id}", id);
                return ResponseConst.Error<ServiceRequestResponse>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> CreateAsync(CreateServiceRequestDto request)
        {
            try
            {
                if (request.apartmentId.HasValue)
                {
                    var aptExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.apartmentId.Value);
                    if (!aptExists)
                        return ResponseConst.Error<bool>(400, "Căn hộ không tồn tại.");
                }

                if (request.providerId.HasValue)
                {
                    var providerOk = await _dbContext.Providers
                        .AnyAsync(x => x.Id == request.providerId.Value && x.RegistrationStatus == "approved");
                    if (!providerOk)
                        return ResponseConst.Error<bool>(400, "Nhà cung cấp không tồn tại hoặc chưa được duyệt.");
                }

                // Luồng 2: cần BQL duyệt trước → pending_approval
                // Luồng 1: không cần BQL duyệt → pending_provider
                var initialStatus = request.requiresMgtApproval ? "pending_approval" : "pending_provider";

                _dbContext.ServiceRequests.Add(new ServiceRequest
                {
                    Title = request.title,
                    Description = request.description,
                    Category = request.category,
                    ApartmentId = request.apartmentId,
                    RequiresMgtApproval = request.requiresMgtApproval,
                    Status = initialStatus,
                    ProviderId = request.providerId,
                    RequestedByAuthUserId = request.requestedByAuthUserId,
                    ScheduledDate = request.scheduledDate,
                    Note = request.note
                });
                await _dbContext.SaveChangesAsync();

                return ResponseConst.Success("Tạo yêu cầu dịch vụ thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo yêu cầu dịch vụ.");
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> ApproveByMgtAsync(ApproveByMgtRequestDto request)
        {
            try
            {
                var entity = await _dbContext.ServiceRequests.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy yêu cầu dịch vụ.");

                if (entity.Status != "pending_approval")
                    return ResponseConst.Error<bool>(400, "Yêu cầu không ở trạng thái chờ BQL duyệt.");

                entity.Status = "pending_provider";
                entity.MgtApprovedByAuthUserId = request.approvedByAuthUserId;
                entity.MgtApprovedAt = DateTime.UtcNow;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("BQL đã duyệt yêu cầu. Yêu cầu đang chờ nhà cung cấp xác nhận.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi BQL duyệt yêu cầu. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RejectByMgtAsync(RejectByMgtRequestDto request)
        {
            try
            {
                var entity = await _dbContext.ServiceRequests.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy yêu cầu dịch vụ.");

                if (entity.Status != "pending_approval")
                    return ResponseConst.Error<bool>(400, "Yêu cầu không ở trạng thái chờ BQL duyệt.");

                entity.Status = "rejected_by_mgt";
                entity.MgtRejectionReason = request.reason;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("BQL đã từ chối yêu cầu.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi BQL từ chối yêu cầu. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> AcceptByProviderAsync(AcceptByProviderRequestDto request)
        {
            try
            {
                var entity = await _dbContext.ServiceRequests.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy yêu cầu dịch vụ.");

                if (entity.Status != "pending_provider")
                    return ResponseConst.Error<bool>(400, "Yêu cầu không ở trạng thái chờ nhà cung cấp xác nhận.");

                var providerOk = await _dbContext.Providers
                    .AnyAsync(x => x.Id == request.providerId && x.RegistrationStatus == "approved");
                if (!providerOk)
                    return ResponseConst.Error<bool>(400, "Nhà cung cấp không tồn tại hoặc chưa được duyệt.");

                entity.Status = "accepted_by_provider";
                entity.ProviderId = request.providerId;
                if (request.scheduledDate.HasValue)
                    entity.ScheduledDate = request.scheduledDate.Value;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Nhà cung cấp đã xác nhận yêu cầu.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi nhà cung cấp xác nhận yêu cầu. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> RejectByProviderAsync(RejectByProviderRequestDto request)
        {
            try
            {
                var entity = await _dbContext.ServiceRequests.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy yêu cầu dịch vụ.");

                if (entity.Status != "pending_provider")
                    return ResponseConst.Error<bool>(400, "Yêu cầu không ở trạng thái chờ nhà cung cấp xác nhận.");

                entity.Status = "rejected_by_provider";
                entity.ProviderRejectionReason = request.reason;
                entity.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Nhà cung cấp đã từ chối yêu cầu.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi nhà cung cấp từ chối yêu cầu. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        public async Task<ResponseDto<bool>> UpdateStatusAsync(UpdateServiceRequestStatusDto request)
        {
            try
            {
                var entity = await _dbContext.ServiceRequests.FirstOrDefaultAsync(x => x.Id == request.id);
                if (entity == null)
                    return ResponseConst.Error<bool>(404, "Không tìm thấy yêu cầu dịch vụ.");

                var allowedTransitions = new Dictionary<string, string[]>
                {
                    ["accepted_by_provider"] = new[] { "in_progress" },
                    ["in_progress"]           = new[] { "completed" }
                };

                if (!allowedTransitions.TryGetValue(entity.Status, out var allowed) || !allowed.Contains(request.status))
                    return ResponseConst.Error<bool>(400,
                        $"Không thể chuyển từ trạng thái '{entity.Status}' sang '{request.status}'.");

                entity.Status = request.status;
                entity.UpdatedAt = DateTime.UtcNow;

                if (request.status == "completed")
                    entity.CompletedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();
                return ResponseConst.Success("Cập nhật trạng thái yêu cầu thành công.", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật trạng thái yêu cầu. ID: {Id}", request.id);
                return ResponseConst.Error<bool>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
