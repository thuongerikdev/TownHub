using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using TH.TownHub.ApplicationService.Service;
using TH.TownHub.Dtos;

namespace TH.TownHub.WebAPI.Controllers
{
    // ============================================================
    // APARTMENT CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class ApartmentController : ControllerBase
    {
        private readonly IApartmentService _service;
        public ApartmentController(IApartmentService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateApartmentRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateApartmentRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? building, [FromQuery] string? status, [FromQuery] Guid? buildingId)
        {
            var result = await _service.GetAllAsync(building, status, buildingId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // RESIDENT CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class ResidentController : ControllerBase
    {
        private readonly IResidentService _service;
        public ResidentController(IResidentService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateResidentRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateResidentRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] int? apartmentId)
        {
            var result = await _service.GetAllAsync(apartmentId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // NOTIFICATION TEMPLATE CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationTemplateController : ControllerBase
    {
        private readonly INotificationTemplateService _service;
        public NotificationTemplateController(INotificationTemplateService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateNotificationTemplateRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateNotificationTemplateRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // NOTIFICATION CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _service;
        public NotificationController(INotificationService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateNotificationRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateNotificationRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPost("send/{id}")]
        public async Task<IActionResult> Send(int id)
        {
            var result = await _service.SendAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(status);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // INCIDENT CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class IncidentController : ControllerBase
    {
        private readonly IIncidentService _service;
        public IncidentController(IIncidentService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateIncidentRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateIncidentRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? priority)
        {
            var result = await _service.GetAllAsync(status, priority);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // FEE TYPE CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class FeeTypeController : ControllerBase
    {
        private readonly IFeeTypeService _service;
        public FeeTypeController(IFeeTypeService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateFeeTypeRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateFeeTypeRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ============================================================
    // FEE CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class FeeController : ControllerBase
    {
        private readonly IFeeService _service;
        public FeeController(IFeeService service) => _service = service;

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateFeeRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpPut("update-status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateFeeStatusRequestDto request)
        {
            var result = await _service.UpdateStatusAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] int? apartmentId, [FromQuery] string? billingMonth, [FromQuery] string? status)
        {
            var result = await _service.GetAllAsync(apartmentId, billingMonth, status);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // SYSTEM CONFIG CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class SystemConfigController : ControllerBase
    {
        private readonly ISystemConfigService _service;
        public SystemConfigController(ISystemConfigService service) => _service = service;

        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateSystemConfigRequestDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] bool? isPublic)
        {
            var result = await _service.GetAllAsync(isPublic);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{key}")]
        public async Task<IActionResult> GetByKey(string key)
        {
            var result = await _service.GetByKeyAsync(key);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // AUDIT LOG CONTROLLER
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class AuditLogController : ControllerBase
    {
        private readonly IAuditLogService _service;
        public AuditLogController(IAuditLogService service) => _service = service;

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? targetType, [FromQuery] int? targetId)
        {
            var result = await _service.GetAllAsync(targetType, targetId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }
    }

    // ============================================================
    // PROVIDER CONTROLLER
    // Luồng 3: NCC nộp đơn → pending → approve/reject
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class ProviderController : ControllerBase
    {
        private readonly IProviderService _service;
        public ProviderController(IProviderService service) => _service = service;

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll([FromQuery] string? registrationStatus)
        {
            var result = await _service.GetAllAsync(registrationStatus);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // Hộ dân xem hồ sơ NCC của chính mình
        [HttpGet("my-profile")]
        public async Task<IActionResult> GetMyProfile([FromQuery] int authUserId)
        {
            var result = await _service.GetMyProfileAsync(authUserId);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // BQL/Admin đăng ký NCC (có thể truyền residentId tùy chọn)
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterProviderRequestDto request)
        {
            var result = await _service.RegisterAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        // Hộ dân tự nộp đơn đăng ký NCC — hệ thống tự tra residentId qua authUserId
        [HttpPost("self-register")]
        public async Task<IActionResult> SelfRegister([FromBody] SelfRegisterProviderRequestDto request)
        {
            var result = await _service.SelfRegisterAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPut("approve")]
        public async Task<IActionResult> Approve([FromBody] ApproveProviderRequestDto request)
        {
            var result = await _service.ApproveAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPut("reject")]
        public async Task<IActionResult> Reject([FromBody] RejectProviderRequestDto request)
        {
            var result = await _service.RejectAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // PROVIDER SERVICE LISTING CONTROLLER
    // NCC đăng ký dịch vụ → BQL duyệt / từ chối
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class ProviderServiceListingController : ControllerBase
    {
        private readonly IProviderServiceListingService _service;
        public ProviderServiceListingController(IProviderServiceListingService service) => _service = service;

        // BQL xem toàn bộ danh sách đăng ký (lọc theo status / providerId)
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] int? providerId)
        {
            var result = await _service.GetAllAsync(status, providerId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // NCC đăng ký dịch vụ mới
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterServiceListingDto request)
        {
            var result = await _service.RegisterAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        // NCC chỉnh sửa dịch vụ (chỉ khi pending hoặc rejected)
        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateServiceListingDto request)
        {
            var result = await _service.UpdateAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // BQL phê duyệt
        [HttpPut("approve")]
        public async Task<IActionResult> Approve([FromBody] ApproveServiceListingDto request)
        {
            var result = await _service.ApproveAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // BQL từ chối
        [HttpPut("reject")]
        public async Task<IActionResult> Reject([FromBody] RejectServiceListingDto request)
        {
            var result = await _service.RejectAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // NCC xóa dịch vụ chưa được duyệt
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }

    // ============================================================
    // SERVICE REQUEST CONTROLLER
    // Luồng 1: không cần BQL duyệt
    // Luồng 2: cần BQL duyệt trước
    // ============================================================
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceRequestController : ControllerBase
    {
        private readonly IServiceRequestService _service;
        public ServiceRequestController(IServiceRequestService service) => _service = service;

        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? status,
            [FromQuery] int? providerId,
            [FromQuery] int? apartmentId)
        {
            var result = await _service.GetAllAsync(status, providerId, apartmentId);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        [HttpGet("get/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateServiceRequestDto request)
        {
            var result = await _service.CreateAsync(request);
            return result.ErrorCode == 200 ? Ok(result) : BadRequest(result);
        }

        // Luồng 2: BQL duyệt → chuyển sang pending_provider
        [HttpPut("approve-by-mgt")]
        public async Task<IActionResult> ApproveByMgt([FromBody] ApproveByMgtRequestDto request)
        {
            var result = await _service.ApproveByMgtAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // Luồng 2: BQL từ chối → kết thúc
        [HttpPut("reject-by-mgt")]
        public async Task<IActionResult> RejectByMgt([FromBody] RejectByMgtRequestDto request)
        {
            var result = await _service.RejectByMgtAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // NCC nhận yêu cầu → accepted_by_provider
        [HttpPut("accept-by-provider")]
        public async Task<IActionResult> AcceptByProvider([FromBody] AcceptByProviderRequestDto request)
        {
            var result = await _service.AcceptByProviderAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // NCC từ chối → kết thúc
        [HttpPut("reject-by-provider")]
        public async Task<IActionResult> RejectByProvider([FromBody] RejectByProviderRequestDto request)
        {
            var result = await _service.RejectByProviderAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }

        // Cập nhật tiến độ: in_progress | completed
        [HttpPut("update-status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateServiceRequestStatusDto request)
        {
            var result = await _service.UpdateStatusAsync(request);
            if (result.ErrorCode == 200) return Ok(result);
            if (result.ErrorCode == 404) return NotFound(result);
            return BadRequest(result);
        }
    }
}
