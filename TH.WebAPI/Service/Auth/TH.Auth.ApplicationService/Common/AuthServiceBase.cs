using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.ApplicationService.Common
{
    public class AuthServiceBase
    {
        protected readonly ILogger _logger;

        protected AuthServiceBase(ILogger logger)
        {
            _logger = logger;

        }

    }
}
