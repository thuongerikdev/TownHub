using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TH.Asset.ApplicationService.Common;
using TH.Asset.Domain.Core;
using TH.Asset.Dtos;
using TH.Asset.Infrastructure.Database;
using TH.Constant;

namespace TH.Asset.ApplicationService.Service.Core
{
    // ════════════════════════════════════════════════════════════════════════
    // SỔ KẾ TOÁN & BÁO CÁO — thuần đọc, dẫn xuất từ chứng từ kế toán
    //   • Nhật ký chung        (GetJournalAsync)
    //   • Sổ cái tài khoản      (GetLedgerAsync)
    //   • Bảng cân đối SPS      (GetTrialBalanceAsync)
    //   • Sổ tài sản cố định    (GetAssetRegisterAsync)
    //   • Báo cáo tăng/giảm TSCĐ(GetAssetMovementAsync)
    // Quy ước số dư: dư Nợ > 0, dư Có < 0  (net = ΣNợ − ΣCó).
    // ════════════════════════════════════════════════════════════════════════
    public interface IAssetReportService
    {
        Task<ResponseDto<List<AccountInfoDto>>> GetAccountsAsync();
        Task<ResponseDto<JournalReportDto>> GetJournalAsync(DateTime? from, DateTime? to, string? account);
        Task<ResponseDto<LedgerReportDto>> GetLedgerAsync(string account, DateTime? from, DateTime? to);
        Task<ResponseDto<TrialBalanceReportDto>> GetTrialBalanceAsync(DateTime? from, DateTime? to);
        Task<ResponseDto<AssetRegisterReportDto>> GetAssetRegisterAsync();
        Task<ResponseDto<AssetMovementReportDto>> GetAssetMovementAsync(DateTime? from, DateTime? to);
    }

    public class AssetReportService : AssetServiceBase, IAssetReportService
    {
        public AssetReportService(ILogger<AssetReportService> logger, AssetDbContext dbContext)
            : base(logger, dbContext) { }

        // ── Danh mục tài khoản chuẩn (TT200) dùng trong module TSCĐ ──────────
        private static readonly Dictionary<string, string> AccountNames = new()
        {
            ["111"]  = "Tiền mặt",
            ["112"]  = "Tiền gửi ngân hàng",
            ["211"]  = "TSCĐ hữu hình",
            ["213"]  = "TSCĐ vô hình",
            ["214"]  = "Hao mòn TSCĐ",
            ["2141"] = "Hao mòn TSCĐ hữu hình",
            ["2143"] = "Hao mòn TSCĐ vô hình",
            ["627"]  = "Chi phí sản xuất chung",
            ["641"]  = "Chi phí bán hàng",
            ["642"]  = "Chi phí quản lý doanh nghiệp",
            ["811"]  = "Chi phí khác",
        };

        private static string NameOf(string account) =>
            AccountNames.TryGetValue(account, out var n) ? n : "Tài khoản " + account;

        // Chuẩn hoá khoảng thời gian: from theo đầu ngày, to inclusive (đến hết ngày).
        private static (DateTime? from, DateTime? toExclusive) NormalizeRange(DateTime? from, DateTime? to)
        {
            DateTime? f = from.HasValue ? DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc) : null;
            DateTime? t = to.HasValue ? DateTime.SpecifyKind(to.Value.Date, DateTimeKind.Utc).AddDays(1) : null;
            return (f, t);
        }

        // Dòng bút toán đã "phẳng" kèm thông tin chứng từ, phục vụ mọi báo cáo sổ.
        private sealed class FlatLine
        {
            public Guid lineId;
            public Guid documentId;
            public string documentCode = null!;
            public string documentType = null!;
            public DateTime documentDate;
            public string? description;
            public string? debitAccount;
            public string? creditAccount;
            public decimal amount;
            public string? assetCode;
            public string? assetName;
        }

        private IQueryable<FlatLine> PostedLinesQuery()
        {
            return from l in _dbContext.AssetDocumentLines
                   join d in _dbContext.AssetDocuments on l.documentId equals d.id
                   where d.status == AssetDocumentStatus.Posted
                   select new FlatLine
                   {
                       lineId       = l.id,
                       documentId   = d.id,
                       documentCode = d.documentCode,
                       documentType = d.documentType,
                       documentDate = d.documentDate,
                       description  = l.description ?? d.description,
                       debitAccount = l.debitAccount,
                       creditAccount= l.creditAccount,
                       amount       = l.amount,
                       assetCode    = l.asset != null ? l.asset.assetCode : null,
                       assetName    = l.asset != null ? l.asset.name : null,
                   };
        }

        // ────────────────────────────────────────────────────────────────────
        // Danh mục tài khoản đang phát sinh (union chuẩn + thực tế trong sổ)
        // ────────────────────────────────────────────────────────────────────
        public async Task<ResponseDto<List<AccountInfoDto>>> GetAccountsAsync()
        {
            try
            {
                // Lấy riêng TK Nợ và TK Có rồi hợp nhất — tránh SelectMany(new[]{…})
                // vốn không dịch được sang SQL (gây lỗi 500 → danh mục trống).
                var debit = await _dbContext.AssetDocumentLines
                    .Where(l => l.debitAccount != null && l.debitAccount != "")
                    .Select(l => l.debitAccount!)
                    .Distinct()
                    .ToListAsync();
                var credit = await _dbContext.AssetDocumentLines
                    .Where(l => l.creditAccount != null && l.creditAccount != "")
                    .Select(l => l.creditAccount!)
                    .Distinct()
                    .ToListAsync();

                var codes = new SortedSet<string>(AccountNames.Keys, StringComparer.Ordinal);
                foreach (var a in debit) codes.Add(a);
                foreach (var a in credit) codes.Add(a);

                var result = codes
                    .Select(a => new AccountInfoDto { account = a, accountName = NameOf(a) })
                    .ToList();

                return ResponseConst.Success("Lấy danh mục tài khoản thành công.", result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh mục tài khoản.");
                return ResponseConst.Error<List<AccountInfoDto>>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // NHẬT KÝ CHUNG
        // ────────────────────────────────────────────────────────────────────
        public async Task<ResponseDto<JournalReportDto>> GetJournalAsync(DateTime? from, DateTime? to, string? account)
        {
            try
            {
                var (f, t) = NormalizeRange(from, to);
                var query = PostedLinesQuery();
                if (f.HasValue) query = query.Where(x => x.documentDate >= f.Value);
                if (t.HasValue) query = query.Where(x => x.documentDate < t.Value);
                if (!string.IsNullOrWhiteSpace(account))
                    query = query.Where(x => x.debitAccount == account || x.creditAccount == account);

                var lines = await query
                    .OrderBy(x => x.documentDate).ThenBy(x => x.documentCode)
                    .ToListAsync();

                var entries = lines.Select(x => new JournalEntryDto
                {
                    lineId       = x.lineId,
                    documentId   = x.documentId,
                    documentCode = x.documentCode,
                    documentType = x.documentType,
                    documentDate = x.documentDate,
                    description  = x.description,
                    debitAccount = x.debitAccount,
                    creditAccount= x.creditAccount,
                    amount       = x.amount,
                    assetCode    = x.assetCode,
                    assetName    = x.assetName,
                }).ToList();

                var report = new JournalReportDto
                {
                    fromDate    = from,
                    toDate      = to,
                    entries     = entries,
                    totalDebit  = entries.Where(e => !string.IsNullOrEmpty(e.debitAccount)).Sum(e => e.amount),
                    totalCredit = entries.Where(e => !string.IsNullOrEmpty(e.creditAccount)).Sum(e => e.amount),
                };

                return ResponseConst.Success("Lấy nhật ký chung thành công.", report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy nhật ký chung.");
                return ResponseConst.Error<JournalReportDto>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // SỔ CÁI TÀI KHOẢN
        // ────────────────────────────────────────────────────────────────────
        public async Task<ResponseDto<LedgerReportDto>> GetLedgerAsync(string account, DateTime? from, DateTime? to)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(account))
                    return ResponseConst.Error<LedgerReportDto>(400, "Chưa chọn tài khoản.");

                var (f, t) = NormalizeRange(from, to);

                // Tất cả bút toán liên quan tài khoản này (mọi thời điểm)
                var all = await PostedLinesQuery()
                    .Where(x => x.debitAccount == account || x.creditAccount == account)
                    .OrderBy(x => x.documentDate).ThenBy(x => x.documentCode)
                    .ToListAsync();

                // Dư đầu kỳ = net các bút toán trước from
                decimal opening = 0m;
                if (f.HasValue)
                {
                    opening = all.Where(x => x.documentDate < f.Value)
                                 .Sum(x => (x.debitAccount == account ? x.amount : 0m)
                                         - (x.creditAccount == account ? x.amount : 0m));
                }

                var inPeriod = all.Where(x =>
                        (!f.HasValue || x.documentDate >= f.Value) &&
                        (!t.HasValue || x.documentDate < t.Value))
                    .ToList();

                decimal running = opening;
                decimal periodDebit = 0m, periodCredit = 0m;
                var entries = new List<LedgerEntryDto>();
                foreach (var x in inPeriod)
                {
                    decimal debit  = x.debitAccount == account ? x.amount : 0m;
                    decimal credit = x.creditAccount == account ? x.amount : 0m;
                    running += debit - credit;
                    periodDebit += debit;
                    periodCredit += credit;
                    entries.Add(new LedgerEntryDto
                    {
                        lineId        = x.lineId,
                        documentId    = x.documentId,
                        documentCode  = x.documentCode,
                        documentDate  = x.documentDate,
                        description   = x.description,
                        counterAccount= debit > 0 ? x.creditAccount : x.debitAccount,
                        debit         = debit,
                        credit        = credit,
                        balance       = running,
                        assetCode     = x.assetCode,
                    });
                }

                var report = new LedgerReportDto
                {
                    account        = account,
                    accountName    = NameOf(account),
                    fromDate       = from,
                    toDate         = to,
                    openingBalance = opening,
                    periodDebit    = periodDebit,
                    periodCredit   = periodCredit,
                    closingBalance = running,
                    entries        = entries,
                };

                return ResponseConst.Success("Lấy sổ cái thành công.", report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy sổ cái. Account: {Acc}", account);
                return ResponseConst.Error<LedgerReportDto>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // BẢNG CÂN ĐỐI SỐ PHÁT SINH
        // ────────────────────────────────────────────────────────────────────
        public async Task<ResponseDto<TrialBalanceReportDto>> GetTrialBalanceAsync(DateTime? from, DateTime? to)
        {
            try
            {
                var (f, t) = NormalizeRange(from, to);
                var all = await PostedLinesQuery().ToListAsync();

                // Tập tài khoản xuất hiện
                var accounts = new SortedSet<string>(StringComparer.Ordinal);
                foreach (var x in all)
                {
                    if (!string.IsNullOrEmpty(x.debitAccount)) accounts.Add(x.debitAccount!);
                    if (!string.IsNullOrEmpty(x.creditAccount)) accounts.Add(x.creditAccount!);
                }

                var rows = new List<TrialBalanceRowDto>();
                foreach (var acc in accounts)
                {
                    decimal opening = all.Where(x => (!f.HasValue || x.documentDate < f.Value))
                        .Sum(x => (x.debitAccount == acc ? x.amount : 0m)
                                - (x.creditAccount == acc ? x.amount : 0m));

                    var period = all.Where(x =>
                        (!f.HasValue || x.documentDate >= f.Value) &&
                        (!t.HasValue || x.documentDate < t.Value));

                    decimal pDebit  = period.Sum(x => x.debitAccount == acc ? x.amount : 0m);
                    decimal pCredit = period.Sum(x => x.creditAccount == acc ? x.amount : 0m);
                    decimal closing = opening + pDebit - pCredit;

                    // Bỏ dòng hoàn toàn trống (không dư, không phát sinh)
                    if (opening == 0m && pDebit == 0m && pCredit == 0m && closing == 0m) continue;

                    rows.Add(new TrialBalanceRowDto
                    {
                        account       = acc,
                        accountName   = NameOf(acc),
                        openingDebit  = opening > 0 ? opening : 0m,
                        openingCredit = opening < 0 ? -opening : 0m,
                        periodDebit   = pDebit,
                        periodCredit  = pCredit,
                        closingDebit  = closing > 0 ? closing : 0m,
                        closingCredit = closing < 0 ? -closing : 0m,
                    });
                }

                var totals = new TrialBalanceRowDto
                {
                    account       = "TỔNG",
                    accountName   = "Tổng cộng",
                    openingDebit  = rows.Sum(r => r.openingDebit),
                    openingCredit = rows.Sum(r => r.openingCredit),
                    periodDebit   = rows.Sum(r => r.periodDebit),
                    periodCredit  = rows.Sum(r => r.periodCredit),
                    closingDebit  = rows.Sum(r => r.closingDebit),
                    closingCredit = rows.Sum(r => r.closingCredit),
                };

                var report = new TrialBalanceReportDto { fromDate = from, toDate = to, rows = rows, totals = totals };
                return ResponseConst.Success("Lấy bảng cân đối số phát sinh thành công.", report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy bảng cân đối số phát sinh.");
                return ResponseConst.Error<TrialBalanceReportDto>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // SỔ TÀI SẢN CỐ ĐỊNH (Sổ chi tiết TSCĐ)
        // ────────────────────────────────────────────────────────────────────
        public async Task<ResponseDto<AssetRegisterReportDto>> GetAssetRegisterAsync()
        {
            try
            {
                var rows = await (from a in _dbContext.Assets
                                  join c in _dbContext.AssetCategories on a.categoryId equals c.id into cj
                                  from c in cj.DefaultIfEmpty()
                                  select new AssetRegisterRowDto
                                  {
                                      assetId                 = a.id,
                                      assetCode               = a.assetCode,
                                      name                    = a.name,
                                      categoryName            = c != null ? c.name : null,
                                      accountCode             = a.accountCode,
                                      purchaseDate            = a.purchaseDate,
                                      usefulLifeMonths        = a.usefulLifeMonths,
                                      originalCost            = a.purchasePrice ?? 0m,
                                      accumulatedDepreciation = a.accumulatedDepreciation,
                                      bookValue               = a.bookValue ?? ((a.purchasePrice ?? 0m) - a.accumulatedDepreciation),
                                      status                  = a.status,
                                  })
                                  .OrderBy(x => x.assetCode)
                                  .ToListAsync();

                var report = new AssetRegisterReportDto
                {
                    rows                         = rows,
                    assetCount                   = rows.Count,
                    totalOriginalCost            = rows.Sum(r => r.originalCost),
                    totalAccumulatedDepreciation = rows.Sum(r => r.accumulatedDepreciation),
                    totalBookValue               = rows.Sum(r => r.bookValue),
                };

                return ResponseConst.Success("Lấy sổ tài sản cố định thành công.", report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy sổ tài sản cố định.");
                return ResponseConst.Error<AssetRegisterReportDto>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }

        // ────────────────────────────────────────────────────────────────────
        // BÁO CÁO TĂNG / GIẢM TSCĐ
        //   Tăng  = chứng từ GHI_TANG (nguyên giá)
        //   Giảm  = phiếu thanh lý    (giá trị còn lại + lãi/lỗ)
        // ────────────────────────────────────────────────────────────────────
        public async Task<ResponseDto<AssetMovementReportDto>> GetAssetMovementAsync(DateTime? from, DateTime? to)
        {
            try
            {
                var (f, t) = NormalizeRange(from, to);

                // TĂNG: chứng từ ghi tăng
                var incQuery = from d in _dbContext.AssetDocuments
                               where d.status == AssetDocumentStatus.Posted
                                     && d.documentType == AssetDocumentType.GhiTang
                               select d;
                if (f.HasValue) incQuery = incQuery.Where(d => d.documentDate >= f.Value);
                if (t.HasValue) incQuery = incQuery.Where(d => d.documentDate < t.Value);

                var incDocs = await incQuery
                    .Select(d => new
                    {
                        d.id, d.documentCode, d.documentDate, d.totalAmount, d.description,
                        line = d.lines!.FirstOrDefault(l => l.assetId != null)
                    })
                    .ToListAsync();

                var increases = incDocs.Select(d => new AssetMovementRowDto
                {
                    assetId      = d.line != null && d.line.assetId.HasValue ? d.line.assetId.Value : Guid.Empty,
                    assetCode    = d.line != null && d.line.asset != null ? d.line.asset.assetCode : null,
                    assetName    = d.line != null && d.line.asset != null ? d.line.asset.name : null,
                    documentCode = d.documentCode,
                    date         = d.documentDate,
                    movementType = "INCREASE",
                    amount       = d.totalAmount,
                    note         = d.description,
                }).OrderBy(x => x.date).ToList();

                // GIẢM: phiếu thanh lý
                var disQuery = _dbContext.AssetDisposals.Include(x => x.asset).Include(x => x.document).AsQueryable();
                if (f.HasValue) disQuery = disQuery.Where(x => x.disposalDate >= f.Value);
                if (t.HasValue) disQuery = disQuery.Where(x => x.disposalDate < t.Value);

                var disposals = await disQuery.ToListAsync();
                var decreases = disposals.Select(x => new AssetMovementRowDto
                {
                    assetId      = x.assetId,
                    assetCode    = x.asset != null ? x.asset.assetCode : null,
                    assetName    = x.asset != null ? x.asset.name : null,
                    documentCode = x.document != null ? x.document.documentCode : "—",
                    date         = x.disposalDate,
                    movementType = "DECREASE",
                    amount       = x.originalCost,
                    gainLoss     = x.gainLoss,
                    note         = x.reason ?? x.note,
                }).OrderBy(x => x.date).ToList();

                var report = new AssetMovementReportDto
                {
                    fromDate      = from,
                    toDate        = to,
                    increases     = increases,
                    decreases     = decreases,
                    increaseCount = increases.Count,
                    decreaseCount = decreases.Count,
                    totalIncrease = increases.Sum(x => x.amount),
                    totalDecrease = decreases.Sum(x => x.amount),
                };

                return ResponseConst.Success("Lấy báo cáo tăng/giảm TSCĐ thành công.", report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy báo cáo tăng/giảm TSCĐ.");
                return ResponseConst.Error<AssetMovementReportDto>(500, "Lỗi hệ thống: " + ex.Message);
            }
        }
    }
}
