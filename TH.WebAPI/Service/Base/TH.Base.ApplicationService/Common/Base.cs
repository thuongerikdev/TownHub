using Microsoft.Extensions.Logging;
using TH.TownHub.Infrastructure.Database;

namespace TH.TownHub.ApplicationService.Common
{
    // ── Response wrapper (giống pattern của bạn) ──
    //public class ResponseDto<T>
    //{
    //    public int ErrorCode { get; set; }
    //    public string Message { get; set; } = null!;
    //    public T? Data { get; set; }
    //}

    //public static class ResponseConst
    //{
    //    public static ResponseDto<T> Success<T>(string message, T data) =>
    //        new() { ErrorCode = 200, Message = message, Data = data };

    //    public static ResponseDto<T> Error<T>(int code, string message) =>
    //        new() { ErrorCode = code, Message = message, Data = default };
    //}

    // ── Base service ──
    public abstract class TownHubServiceBase
    {
        protected readonly ILogger _logger;
        protected readonly TownHubDbContext _dbContext;

        protected TownHubServiceBase(ILogger logger, TownHubDbContext dbContext)
        {
            _logger = logger;
            _dbContext = dbContext;
        }
    }
}
