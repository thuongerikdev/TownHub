using Microsoft.Extensions.Logging;
using TH.Asset.Infrastructure.Database;

namespace TH.Asset.ApplicationService.Common
{
    /// <summary>
    /// Base class cho tất cả Application Service của module Asset.
    /// Cung cấp sẵn _logger và _dbContext.
    /// </summary>
    public abstract class AssetServiceBase
    {
        protected readonly ILogger _logger;
        protected readonly AssetDbContext _dbContext;

        protected AssetServiceBase(ILogger logger, AssetDbContext dbContext)
        {
            _logger = logger;
            _dbContext = dbContext;
        }
    }
}
