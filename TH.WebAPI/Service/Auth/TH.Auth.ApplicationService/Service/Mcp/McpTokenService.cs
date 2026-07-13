using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using TH.Auth.Dtos.Mcp;
using TH.Auth.Infrastructure;
using TH.Auth.Infrastructure.Repository.Token;
using TH.Constant;

namespace TH.Auth.ApplicationService.Service.Mcp
{
    public interface IMcpTokenService
    {
        Task<ResponseDto<McpTokenCreatedResponse>> CreateAsync(int userId, CreateMcpTokenDto request);
        Task<ResponseDto<List<McpTokenItem>>> GetMineAsync(int userId);
        Task<ResponseDto<bool>> RevokeAsync(int userId, string id);
    }

    /// <summary>
    /// Quản lý mã MCP dài hạn theo từng user. Token là JWT (ký bằng khóa hệ thống),
    /// trạng thái (tên, hạn, đã thu hồi) lưu trong Redis — không cần bảng DB mới.
    /// Mã hết hạn tự biến mất nhờ TTL của Redis.
    /// </summary>
    public class McpTokenService : IMcpTokenService
    {
        private readonly AuthDbContext _db;
        private readonly ITokenGenerate _token;
        private readonly IDatabase _redis;
        private readonly ILogger<McpTokenService> _logger;

        public McpTokenService(
            AuthDbContext db,
            ITokenGenerate token,
            IConnectionMultiplexer redis,
            ILogger<McpTokenService> logger)
        {
            _db = db;
            _token = token;
            _redis = redis.GetDatabase();
            _logger = logger;
        }

        private static string HashKey(string jti) => $"mcp:token:{jti}";
        private static string UserSetKey(int userId) => $"mcp:tokens:{userId}";

        public async Task<ResponseDto<McpTokenCreatedResponse>> CreateAsync(int userId, CreateMcpTokenDto request)
        {
            if (string.IsNullOrWhiteSpace(request.name))
                return ResponseConst.Error<McpTokenCreatedResponse>(400, "Tên mã không được để trống.");

            var now = DateTime.UtcNow;
            var exp = DateTime.SpecifyKind(request.expiresAt, DateTimeKind.Utc);

            if (exp <= now.AddMinutes(5))
                return ResponseConst.Error<McpTokenCreatedResponse>(400, "Ngày hết hạn phải ở tương lai.");
            if (exp > now.AddDays(365))
                return ResponseConst.Error<McpTokenCreatedResponse>(400, "Hạn tối đa là 365 ngày.");

            var user = await _db.authUsers.FirstOrDefaultAsync(x => x.userID == userId);
            if (user == null)
                return ResponseConst.Error<McpTokenCreatedResponse>(404, "Không tìm thấy người dùng.");

            var jti = Guid.NewGuid().ToString("N");
            var ttl = exp - now;

            var jwt = await _token.CreateMcpTokenAsync(user, ttl, jti);

            // Lưu metadata + cờ thu hồi vào Redis; TTL dài hơn token một chút để dọn rác.
            var redisTtl = ttl + TimeSpan.FromMinutes(10);
            await _redis.HashSetAsync(HashKey(jti), new HashEntry[]
            {
                new("userId",    userId),
                new("name",      request.name),
                new("createdAt", now.Ticks),
                new("expiresAt", exp.Ticks),
                new("revoked",   "0")
            });
            await _redis.KeyExpireAsync(HashKey(jti), redisTtl);
            await _redis.SetAddAsync(UserSetKey(userId), jti);

            return ResponseConst.Success("Tạo mã MCP thành công.", new McpTokenCreatedResponse
            {
                id = jti,
                name = request.name,
                token = jwt,
                createdAt = now,
                expiresAt = exp
            });
        }

        public async Task<ResponseDto<List<McpTokenItem>>> GetMineAsync(int userId)
        {
            var jtis = await _redis.SetMembersAsync(UserSetKey(userId));
            var list = new List<McpTokenItem>();

            foreach (var member in jtis)
            {
                var jti = member.ToString();
                var entries = await _redis.HashGetAllAsync(HashKey(jti));
                if (entries.Length == 0)
                {
                    // Đã hết hạn (Redis tự xoá) → dọn khỏi set.
                    await _redis.SetRemoveAsync(UserSetKey(userId), jti);
                    continue;
                }

                var map = entries.ToDictionary(e => e.Name.ToString(), e => e.Value.ToString());
                list.Add(new McpTokenItem
                {
                    id = jti,
                    name = map.TryGetValue("name", out var n) ? n : string.Empty,
                    createdAt = ParseTicks(map, "createdAt"),
                    expiresAt = ParseTicks(map, "expiresAt"),
                    revoked = map.TryGetValue("revoked", out var r) && r == "1"
                });
            }

            return ResponseConst.Success("OK", list.OrderByDescending(x => x.createdAt).ToList());
        }

        public async Task<ResponseDto<bool>> RevokeAsync(int userId, string id)
        {
            var isMember = await _redis.SetContainsAsync(UserSetKey(userId), id);
            if (!isMember)
                return ResponseConst.Error<bool>(404, "Không tìm thấy mã MCP này.");

            // Giữ bản ghi (đánh dấu revoked) để vẫn hiện trong danh sách là "đã thu hồi".
            await _redis.HashSetAsync(HashKey(id), "revoked", "1");
            return ResponseConst.Success("Đã thu hồi mã MCP.", true);
        }

        private static DateTime ParseTicks(Dictionary<string, string> map, string key)
        {
            if (map.TryGetValue(key, out var v) && long.TryParse(v, out var ticks))
                return new DateTime(ticks, DateTimeKind.Utc);
            return default;
        }
    }
}
