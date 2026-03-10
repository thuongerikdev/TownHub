using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Auth.Infrastructure.Repository
{
    public interface IUnitOfWork
    {
        Task<int> SaveChangesAsync(CancellationToken ct = default);
        Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action,
                                             System.Data.IsolationLevel iso = System.Data.IsolationLevel.ReadCommitted,
                                             CancellationToken ct = default);
    }
    public sealed class UnitOfWork : IUnitOfWork
    {
        private readonly AuthDbContext _db;
        public UnitOfWork(AuthDbContext db) => _db = db;

        public Task<int> SaveChangesAsync(CancellationToken ct = default)
            => _db.SaveChangesAsync(ct);

        public async Task<T> ExecuteInTransactionAsync<T>(
            Func<CancellationToken, Task<T>> action,
            IsolationLevel iso = IsolationLevel.ReadCommitted,
            CancellationToken ct = default)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(iso, ct);
                try
                {
                    var result = await action(ct);
                    await _db.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);
                    return result;
                }
                catch
                {
                    await tx.RollbackAsync(ct);
                    throw;
                }
            });
        }
    }
}
