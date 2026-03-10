using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TH.Auth.Domain.User;
using TH.Auth.Dtos.User;
using TH.Auth.Infrastructure.Repository;
using TH.Auth.Infrastructure.Repository.User;
using TH.Constant;
using TH.Shared.ApplicationService;

namespace TH.Auth.ApplicationService.Service.User
{
    public interface IAuthUserService
    {
        Task<ResponseDto<List<UserSlimDto>>> GetAllSlimAsync(CancellationToken ct);
        Task<ResponseDto<AuthUser>> DeleteUserAsync(int userID, CancellationToken ct);
        Task<ResponseDto<GetUserResponseDto>> GetUserByIDAsync(int userID, CancellationToken ct);

        Task<ResponseDto<bool>> AuthUpdateProfileRequest(AuthUpdateProfileRequest req, CancellationToken ct);
        Task<ResponseDto<bool>> AuthUpdateUserName(int userID, string userName, CancellationToken ct);
        Task<ResponseDto<UserSlimDto?>> GetSlimUserByID(int userID, CancellationToken ct);
        Task<ResponseDto<List<GetUserResponseDto?>>> GetAllUserAsync(CancellationToken ct);

        Task<ResponseDto<UserSlimDto?>> GetSlimUserWhereScopeUserByID(int userID, CancellationToken ct);
        Task<ResponseDto<List<GetUserResponseDto?>>> GetAllUserWhereScopeUserAsync(CancellationToken ct);
    }
    public class AuthUserService : IAuthUserService
    {
        private readonly ILogger<AuthUserService> _logger;
        private readonly IUserRepository _users;   // <-- inject repo, không phải IAuthUserService
        private readonly IUnitOfWork _uow;
        private readonly IProfileRepository _profiles;
        private ICloudinaryService _cloudinaryService;

        public AuthUserService(ILogger<AuthUserService> logger, IUserRepository users, IUnitOfWork unitOfWork, IProfileRepository profiles, ICloudinaryService cloudinaryService)
        {
            _logger = logger;
            _users = users;
            _uow = unitOfWork;
            _profiles = profiles;
            _cloudinaryService = cloudinaryService;
        }

        public async Task<ResponseDto<List<UserSlimDto>>> GetAllSlimAsync(CancellationToken ct)
        {
            _logger.LogInformation("Fetching all users in slim mode.");
            try
            {
                var list = await _users.GetAllSlimAsync(ct);
                _logger.LogInformation("Successfully fetched all users in slim mode.");
                return ResponseConst.Success("Fetched all users in slim mode successfully.", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching all users in slim mode.");
                return ResponseConst.Error<List<UserSlimDto>>(500, "Internal error");
            }
        }
        public async Task<ResponseDto<AuthUser>> DeleteUserAsync(int userID, CancellationToken ct)
        {
            _logger.LogInformation("Deleting user with ID: {UserID}", userID);
            try
            {
                var user = await _users.DeleteUser(userID, ct);
                await _uow.SaveChangesAsync(ct);


                _logger.LogInformation("Successfully deleted user with ID: {UserID}", userID);
                return ResponseConst.Success("User deleted successfully", user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deleting user with ID: {UserID}", userID);
                return ResponseConst.Error<AuthUser>(500, "Internal error");
            }
        }
        public async Task<ResponseDto<GetUserResponseDto>> GetUserByIDAsync(int userID, CancellationToken ct)
        {
            _logger.LogInformation("Fetching user with ID: {UserID}", userID);
            try
            {
                var user = await _users.GetUserByIDAsync(userID, ct);
                if (user == null)
                {
                    _logger.LogWarning("User with ID: {UserID} not found.", userID);
                    return ResponseConst.Error<GetUserResponseDto>(404, "User not found");
                }
                _logger.LogInformation("Successfully fetched user with ID: {UserID}", userID);
                return ResponseConst.Success("Fetched user successfully", user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching user with ID: {UserID}", userID);
                return ResponseConst.Error<GetUserResponseDto>(500, "Internal error");
            }
        }

        public async Task<ResponseDto<UserSlimDto?>> GetSlimUserByID(int userID, CancellationToken ct)
        {
            _logger.LogInformation("Fetching slim user with ID: {UserID}", userID);
            try
            {
                var user = await _users.GetSlimUserByID(userID, ct);
                if (user == null)
                {
                    _logger.LogWarning("Slim user with ID: {UserID} not found.", userID);
                    return ResponseConst.Error<UserSlimDto>(500, "User not found");
                }
                _logger.LogInformation("Successfully fetched slim user with ID: {UserID}", userID);
                return ResponseConst.Success("Fetched user successfully", user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching slim user with ID: {UserID}", userID);
                return ResponseConst.Error<UserSlimDto>(500, "Internal error");
            }
        }

        public async Task<ResponseDto<List<GetUserResponseDto?>>> GetAllUserAsync(CancellationToken ct)
        {
            _logger.LogInformation("Fetching all users with full details.");
            try
            {
                var list = await _users.GetAllUserAsync(ct);
                _logger.LogInformation("Successfully fetched all users with full details.");
                return ResponseConst.Success("Fetched all users successfully.", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching all users with full details.");
                return ResponseConst.Error<List<GetUserResponseDto?>>(500, "Internal error");
            }

        }
        public async Task<ResponseDto<UserSlimDto?>> GetSlimUserWhereScopeUserByID(int userID, CancellationToken ct)
        {
            _logger.LogInformation("Fetching slim user with scope for user ID: {UserID}", userID);
            try
            {
                var user = await _users.GetSlimUserWhereScopeUserByID(userID, ct);
                if (user == null)
                {
                    _logger.LogWarning("Slim user with ID: {UserID} not found.", userID);
                    return ResponseConst.Error<UserSlimDto>(500, "User not found");
                }
                _logger.LogInformation("Successfully fetched slim user with ID: {UserID}", userID);
                return ResponseConst.Success("Fetched user successfully", user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching slim user with scope for user ID: {UserID}", userID);
                return ResponseConst.Error<UserSlimDto>(500, "Internal error");
            }
        }

        public async Task<ResponseDto<List<GetUserResponseDto?>>> GetAllUserWhereScopeUserAsync(CancellationToken ct)
        {
            _logger.LogInformation("Fetching all users with scope.");
            try
            {
                var list = await _users.GetAllUserWhereScopeUserAsync(ct);
                if (list == null)
                {
                    _logger.LogWarning("No users found with scope.");
                    return ResponseConst.Error<List<GetUserResponseDto?>>(500, "No users found");
                }
                _logger.LogInformation("Successfully fetched all users with scope.");
                return ResponseConst.Success("Fetched all users successfully.", list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching all users with scope.");
                return ResponseConst.Error<List<GetUserResponseDto?>>(500, "Internal error");
            }

        }

        public async Task<ResponseDto<bool>> AuthUpdateUserName(int userID, string userName, CancellationToken ct)
        {
            _logger.LogInformation("Updating username for user ID: {UserID}", userID);
            try
            {
                var user = await _users.FindByIdAsync(userID, ct);
                if (user == null)
                {
                    _logger.LogWarning("User with ID: {UserID} not found.", userID);
                    return ResponseConst.Error<bool>(404, "User not found");
                }
                await _users.UpdateUserName(userName, userID, ct);
                await _uow.SaveChangesAsync(ct);
                _logger.LogInformation("Successfully updated username for user ID: {UserID}", userID);
                return ResponseConst.Success("Username updated successfully", true);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating username for user ID: {UserID}", userID);
                return ResponseConst.Error<bool>(500, "Internal error");
            }

        }
        public async Task<ResponseDto<bool>> AuthUpdateProfileRequest(AuthUpdateProfileRequest req, CancellationToken ct)
        {
            _logger.LogInformation("Updating profile for user ID: {UserID}", req.userID);
            try
            {
                var user = await _users.FindByIdAsync(req.userID, ct);
                if (user == null)
                {
                    _logger.LogWarning("User with ID: {UserID} not found.", req.userID);
                    return ResponseConst.Error<bool>(404, "User not found");
                }
                var profile = await _profiles.GetByUserIdAsync(req.userID, ct);
                if (profile == null)
                {
                    _logger.LogWarning("Profile for user ID: {UserID} not found.", req.userID);
                    return ResponseConst.Error<bool>(404, "Profile not found");
                }
                if (req.avatar != null)
                {
                    var img = await _cloudinaryService.UploadImageAsync(req.avatar);
                    profile.avatar = img;
                }
                await _users.UpdateUserName(req.newUserName, req.userID, ct);


                profile.firstName = req.firstName;
                profile.lastName = req.lastName;
                profile.gender = req.gender;
                profile.dateOfBirth = req.dateOfBirth;
                await _profiles.UpdateAsync(profile, ct);


                await _uow.SaveChangesAsync(ct);
                _logger.LogInformation("Successfully updated profile for user ID: {UserID}", req.userID);
                return ResponseConst.Success("Profile updated successfully", true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating profile for user ID: {UserID}", req.userID);
                return ResponseConst.Error<bool>(500, "Internal error");
            }

        }


    }
}
