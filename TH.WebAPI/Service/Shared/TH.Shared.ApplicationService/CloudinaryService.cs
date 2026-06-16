using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Shared.ApplicationService
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file);
        public Task DeleteImageAsync(string imageUrl);

        Task<string> UploadSrtAsync(IFormFile file);
        Task DeleteRawAsync(string publicId);
    }
}
