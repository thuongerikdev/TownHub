using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Npgsql.BackendMessages;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using TH.Shared.ApplicationService;

namespace TH.Auth.ApplicationService.Service
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        private readonly ILogger<CloudinaryService> _logger;

        public CloudinaryService(Cloudinary cloudinary, ILogger<CloudinaryService> logger)
        {
            _cloudinary = cloudinary ?? throw new ArgumentNullException(nameof(cloudinary));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Upload nguyên bản gốc KHÔNG transform để tránh degrade chất lượng.
        /// Khuyến nghị: lưu PUBLIC ID để build URL transform khi hiển thị.
        /// </summary>
        public async Task<string> UploadImageAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                _logger.LogWarning("File is null or empty");
                return null;
            }

            try
            {
                _logger.LogInformation("Uploading file {FileName} with size {FileSize}", file.FileName, file.Length);
                await using var stream = file.OpenReadStream();

                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    // KHÔNG cần ResourceType ở đây, ImageUploadParams đã là image
                    UseFilename = true,
                    UniqueFilename = true,
                    Overwrite = false,
                    // Folder = "your_folder"
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);
                if (uploadResult?.SecureUrl == null)
                {
                    _logger.LogError("Cloudinary upload failed. Status: {Status}, Error: {Error}",
                        uploadResult?.StatusCode, uploadResult?.Error?.Message);
                    return null;
                }

                _logger.LogInformation("Image uploaded. PublicId: {PublicId}, URL: {Url}",
                    uploadResult.PublicId, uploadResult.SecureUrl);

                return uploadResult.SecureUrl.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload image to Cloudinary");
                throw new InvalidOperationException("Failed to upload image to Cloudinary", ex);
            }
        }



        private static bool IsCloudinaryUrl(string input)
        {
            if (!Uri.TryCreate(input, UriKind.Absolute, out var uri)) return false;
            // res.cloudinary.com hoặc subdomain tuỳ cấu hình — thường là res.cloudinary.com
            return uri.Host.EndsWith("res.cloudinary.com", StringComparison.OrdinalIgnoreCase);
        }

        public async Task DeleteImageAsync(string imageUrlOrPublicId)
        {
            if (string.IsNullOrWhiteSpace(imageUrlOrPublicId))
            {
                _logger.LogInformation("Skip delete: empty identifier");
                return; // KHÔNG throw
            }

            try
            {
                string publicId;

                // Nếu là URL nhưng KHÔNG phải Cloudinary => bỏ qua (không cố xóa nguồn ngoài)
                if (Uri.TryCreate(imageUrlOrPublicId, UriKind.Absolute, out var asUrl))
                {
                    if (!IsCloudinaryUrl(imageUrlOrPublicId))
                    {
                        _logger.LogInformation("Skip delete: not a Cloudinary URL: {Url}", imageUrlOrPublicId);
                        return; // KHÔNG throw
                    }

                    publicId = ExtraPublicIdFromUrl(imageUrlOrPublicId);
                    if (string.IsNullOrWhiteSpace(publicId))
                    {
                        _logger.LogWarning("Cannot extra public_id from URL: {Url}", imageUrlOrPublicId);
                        return; // KHÔNG throw
                    }
                }
                else
                {
                    // Không phải URL => coi như truyền thẳng publicId
                    publicId = imageUrlOrPublicId;
                }

                _logger.LogInformation("Deleting Cloudinary image. public_id={PublicId}", publicId);

                var deletionParams = new DeletionParams(publicId)
                {
                    ResourceType = ResourceType.Image,
                    Invalidate = true // xoá CDN cache
                };

                var result = await _cloudinary.DestroyAsync(deletionParams);

                var status = result?.Result?.ToLowerInvariant();
                var errMsg = result?.Error?.Message;

                // Idempotent: "ok" hoặc "not found" đều coi là xóa xong
                if (status == "ok" || status == "not found")
                {
                    _logger.LogInformation("Cloudinary delete finished. public_id={PublicId}, result={Status}", publicId, status);
                    return;
                }

                // Các trạng thái khác: log cảnh báo, KHÔNG throw để không chặn business flow
                _logger.LogWarning("Cloudinary delete returned non-ok. public_id={PublicId}, result={Status}, error={Error}",
                    publicId, status, errMsg);
            }
            catch (Exception ex)
            {
                // Không throw — chỉ log và tiếp tục, để việc cập nhật vẫn chạy
                _logger.LogWarning(ex, "Ignore delete error and continue. input={Input}", imageUrlOrPublicId);
            }
        }


        public string BuildDeliveryUrl(string publicId, int width, int? height = null, bool fillCrop = false, string gravity = "auto", string qualityPreset = "good")
        {
            if (string.IsNullOrWhiteSpace(publicId)) return null;

            var t = new Transformation()
                .FetchFormat("auto")
                .Quality($"auto:{qualityPreset}")
                .Dpr("auto");

            if (fillCrop)
            {
                t = t.Width(width)
                     .Height(height ?? width)
                     .Gravity(gravity)
                     .Crop("fill");
            }
            else
            {
                t = t.Width(width)
                     .Crop("limit"); // KHÔNG upscale nếu width > ảnh gốc
                if (height.HasValue)
                    t = t.Height(height.Value);
            }

            return _cloudinary.Api.UrlImgUp.Transform(t).BuildUrl(publicId);
        }

        private static bool IsUrl(string input)
        {
            return Uri.TryCreate(input, UriKind.Absolute, out var uri) && !string.IsNullOrEmpty(uri.Scheme) && !string.IsNullOrEmpty(uri.Host);
        }

        /// <summary>
        /// Hỗ trợ URL có transform & version, có/không thư mục, có/không phần mở rộng.
        /// Ví dụ:
        ///  .../image/upload/f_auto,q_auto:good,c_limit,w_1600,dpr_auto/v1712345678/my/folder/abc.jpg
        ///  .../image/upload/v1712345678/my/folder/abc.png
        ///  .../image/upload/my/folder/abc
        /// </summary>
        private string ExtraPublicIdFromUrl(string imageUrl)
        {
            try
            {
                var uri = new Uri(imageUrl);
                var path = uri.AbsolutePath; // /<cloud>/image/upload/.../<public_id>.(ext)?

                // Tìm vị trí sau "/image/upload/"
                var marker = "/image/upload/";
                var idx = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
                if (idx < 0) return null;

                var remainder = path.Substring(idx + marker.Length).TrimStart('/');

                // Nếu có segment transform (chứa dấu phẩy, ví dụ f_auto,q_auto:good,...) thì bỏ segment đầu
                var firstSlash = remainder.IndexOf('/');
                if (firstSlash > 0)
                {
                    var firstSeg = remainder.Substring(0, firstSlash);
                    if (firstSeg.Contains(",") || firstSeg.Contains("_:")) // thô nhưng hiệu quả với transform phổ biến
                    {
                        remainder = remainder.Substring(firstSlash + 1);
                    }
                }

                // Nếu có version v123456/ thì bỏ tiếp
                remainder = Regex.Replace(remainder, @"^v\d+\/", "", RegexOptions.IgnoreCase);

                // Loại phần mở rộng cuối (nếu có)
                remainder = Regex.Replace(remainder, @"\.[a-zA-Z0-9]+$", "");

                return string.IsNullOrWhiteSpace(remainder) ? null : remainder;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to extra public ID from URL: {Url}", imageUrl);
                return null;
            }
        }

        public async Task<string> UploadSrtAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                _logger.LogWarning("SRT file is null or empty");
                return null;
            }

            // Kiểm tra đuôi file cơ bản
            var extension = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".srt" && extension != ".vtt")
            {
                throw new InvalidOperationException("Only .srt or .vtt files are allowed for subtitles.");
            }

            try
            {
                _logger.LogInformation("Uploading raw file {FileName} with size {FileSize}", file.FileName, file.Length);
                await using var stream = file.OpenReadStream();

                // Dùng RawUploadParams cho các file không phải media (srt, txt, pdf...)
                var uploadParams = new RawUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    UseFilename = true,
                    UniqueFilename = true,
                    Overwrite = false,
                    // Folder = "subtitles", // Tùy chọn: gom vào thư mục riêng

                    // QUAN TRỌNG: Cần giữ lại đuôi file trong PublicId cho file Raw 
                    // để URL sinh ra có dạng .../filename.srt thì player mới hiểu.
                    // Cloudinary mặc định RawUploadParams sẽ giữ đuôi file nếu UseFilename = true.
                };

                var uploadResult = await _cloudinary.UploadAsync(uploadParams);

                if (uploadResult?.SecureUrl == null)
                {
                    _logger.LogError("Cloudinary raw upload failed. Status: {Status}, Error: {Error}",
                        uploadResult?.StatusCode, uploadResult?.Error?.Message);
                    return null;
                }

                _logger.LogInformation("SRT uploaded. PublicId: {PublicId}, URL: {Url}",
                    uploadResult.PublicId, uploadResult.SecureUrl);

                return uploadResult.SecureUrl.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload SRT to Cloudinary");
                throw new InvalidOperationException("Failed to upload SRT to Cloudinary", ex);
            }
        }

        /// <summary>
        /// Xóa file Raw (SRT). 
        /// Cần hàm riêng vì hàm DeleteImageAsync đang set ResourceType = Image.
        /// </summary>
        /// <param name="publicId">PublicId của file srt (Lưu ý: với file Raw, PublicId thường bao gồm cả đuôi file, ví dụ: "my_sub.srt")</param>
        public async Task DeleteRawAsync(string publicId)
        {
            if (string.IsNullOrWhiteSpace(publicId)) return;

            // Nếu lỡ truyền vào URL, cố gắng tách lấy PublicId (Logic khác với Image một chút)
            if (IsUrl(publicId))
            {
                publicId = ExtraPublicIdFromRawUrl(publicId); // Hàm tách ID cho Raw (viết thêm bên dưới)
                if (string.IsNullOrWhiteSpace(publicId)) return;
            }

            try
            {
                _logger.LogInformation("Deleting Cloudinary RAW file. public_id={PublicId}", publicId);

                var deletionParams = new DeletionParams(publicId)
                {
                    ResourceType = ResourceType.Raw, // <--- BẮT BUỘC PHẢI LÀ RAW
                    Invalidate = true
                };

                var result = await _cloudinary.DestroyAsync(deletionParams);

                if (result.Result == "ok" || result.Result == "not found")
                {
                    _logger.LogInformation("Delete raw success: {Result}", result.Result);
                }
                else
                {
                    _logger.LogWarning("Delete raw failed: {Result}, {Error}", result.Result, result.Error?.Message);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error deleting raw file: {PublicId}", publicId);
            }
        }

        /// <summary>
        /// Hàm tách PublicId dành riêng cho URL dạng Raw (khác cấu trúc URL Image)
        /// URL Raw thường là: .../raw/upload/v12345/filename.srt
        /// </summary>
        private string ExtraPublicIdFromRawUrl(string rawUrl)
        {
            try
            {
                var uri = new Uri(rawUrl);
                var path = uri.AbsolutePath;
                // Tìm vị trí sau "/raw/upload/"
                var marker = "/raw/upload/";
                var idx = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
                if (idx < 0) return null;

                var remainder = path.Substring(idx + marker.Length).TrimStart('/');

                // Bỏ version (v12345/)
                remainder = Regex.Replace(remainder, @"^v\d+\/", "", RegexOptions.IgnoreCase);

                // LƯU Ý: Với file Raw, Public ID BAO GỒM cả đuôi file (.srt)
                // Nên ta KHÔNG dùng Regex để cắt đuôi file như hàm xử lý ảnh.

                return string.IsNullOrWhiteSpace(remainder) ? null : remainder;
            }
            catch
            {
                return null;
            }
        }
    }
}
