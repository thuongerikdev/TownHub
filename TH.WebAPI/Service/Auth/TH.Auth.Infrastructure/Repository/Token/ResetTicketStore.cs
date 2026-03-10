using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Infrastructure.Repository.Token
{
    public interface IResetTicketStore
    {
        Task<string> IssueAsync(int userId, TimeSpan ttl, CancellationToken ct);
        Task<bool> ConsumeAsync(int userId, string ticket, CancellationToken ct);
    }
    public sealed class ResetTicketStore : IResetTicketStore
    {
        private readonly IDatabase _db;
        public ResetTicketStore(IConnectionMultiplexer mux) => _db = mux.GetDatabase();

        private static string Key(int userId) => $"pwdreset:uid:{userId}:ticket";

        public async Task<string> IssueAsync(int userId, TimeSpan ttl, CancellationToken ct)
        {
            // random token
            var bytes = RandomNumberGenerator.GetBytes(32);
            var ticket = Convert.ToBase64String(bytes);

            await _db.StringSetAsync(Key(userId), ticket, ttl);
            return ticket;
        }

        public async Task<bool> ConsumeAsync(int userId, string ticket, CancellationToken ct)
        {
            var key = Key(userId);
            var current = await _db.StringGetAsync(key);
            if (!current.HasValue) return false;
            if (!CryptographicEquals(current!, ticket)) return false;

            await _db.KeyDeleteAsync(key); // single-use
            return true;
        }

        private static bool CryptographicEquals(ReadOnlyMemory<byte> a, string b)
        {
            var bBytes = System.Text.Encoding.UTF8.GetBytes(b);
            return CryptographicOperations.FixedTimeEquals(a.ToArray(), bBytes);
        }
    }
}
