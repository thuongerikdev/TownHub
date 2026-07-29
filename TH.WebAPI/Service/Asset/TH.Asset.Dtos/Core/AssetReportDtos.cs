using System;
using System.Collections.Generic;

namespace TH.Asset.Dtos
{
    // ════════════════════════════════════════════════════════════════════════
    // SỔ KẾ TOÁN & BÁO CÁO (hình thức Nhật ký chung)
    // Dữ liệu dẫn xuất thuần từ chứng từ (asset_document + asset_document_line).
    // ════════════════════════════════════════════════════════════════════════

    // ── Danh mục tài khoản (cho ô chọn Sổ cái) ──────────────────────────────
    public class AccountInfoDto
    {
        public string account { get; set; } = null!;
        public string accountName { get; set; } = null!;
    }

    // ── Nhật ký chung: mỗi bút toán = 1 dòng ────────────────────────────────
    public class JournalEntryDto
    {
        public Guid lineId { get; set; }
        public Guid documentId { get; set; }
        public string documentCode { get; set; } = null!;
        public string documentType { get; set; } = null!;
        public DateTime documentDate { get; set; }
        public string? description { get; set; }
        public string? debitAccount { get; set; }
        public string? creditAccount { get; set; }
        public decimal amount { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
    }

    public class JournalReportDto
    {
        public DateTime? fromDate { get; set; }
        public DateTime? toDate { get; set; }
        public decimal totalDebit { get; set; }
        public decimal totalCredit { get; set; }
        public List<JournalEntryDto> entries { get; set; } = new();
    }

    // ── Sổ cái tài khoản ────────────────────────────────────────────────────
    public class LedgerEntryDto
    {
        public Guid lineId { get; set; }
        public Guid documentId { get; set; }
        public string documentCode { get; set; } = null!;
        public DateTime documentDate { get; set; }
        public string? description { get; set; }
        public string? counterAccount { get; set; } // TK đối ứng
        public decimal debit { get; set; }          // phát sinh Nợ
        public decimal credit { get; set; }         // phát sinh Có
        public decimal balance { get; set; }        // số dư luỹ kế (dư Nợ > 0, dư Có < 0)
        public string? assetCode { get; set; }
    }

    public class LedgerReportDto
    {
        public string account { get; set; } = null!;
        public string accountName { get; set; } = null!;
        public DateTime? fromDate { get; set; }
        public DateTime? toDate { get; set; }
        public decimal openingBalance { get; set; }  // dư đầu kỳ (Nợ > 0, Có < 0)
        public decimal periodDebit { get; set; }
        public decimal periodCredit { get; set; }
        public decimal closingBalance { get; set; }  // dư cuối kỳ (Nợ > 0, Có < 0)
        public List<LedgerEntryDto> entries { get; set; } = new();
    }

    // ── Bảng cân đối số phát sinh (Trial balance) ───────────────────────────
    public class TrialBalanceRowDto
    {
        public string account { get; set; } = null!;
        public string accountName { get; set; } = null!;
        public decimal openingDebit { get; set; }
        public decimal openingCredit { get; set; }
        public decimal periodDebit { get; set; }
        public decimal periodCredit { get; set; }
        public decimal closingDebit { get; set; }
        public decimal closingCredit { get; set; }
    }

    public class TrialBalanceReportDto
    {
        public DateTime? fromDate { get; set; }
        public DateTime? toDate { get; set; }
        public List<TrialBalanceRowDto> rows { get; set; } = new();
        public TrialBalanceRowDto totals { get; set; } = new() { account = "TỔNG", accountName = "Tổng cộng" };
    }

    // ── Sổ tài sản cố định (Sổ chi tiết TSCĐ) ───────────────────────────────
    public class AssetRegisterRowDto
    {
        public Guid assetId { get; set; }
        public string assetCode { get; set; } = null!;
        public string name { get; set; } = null!;
        public string? categoryName { get; set; }
        public string? accountCode { get; set; }
        public DateTime? purchaseDate { get; set; }
        public int? usefulLifeMonths { get; set; }
        public decimal originalCost { get; set; }
        public decimal accumulatedDepreciation { get; set; }
        public decimal bookValue { get; set; }
        public string status { get; set; } = null!;
    }

    public class AssetRegisterReportDto
    {
        public decimal totalOriginalCost { get; set; }
        public decimal totalAccumulatedDepreciation { get; set; }
        public decimal totalBookValue { get; set; }
        public int assetCount { get; set; }
        public List<AssetRegisterRowDto> rows { get; set; } = new();
    }

    // ── Báo cáo tăng / giảm TSCĐ ────────────────────────────────────────────
    public class AssetMovementRowDto
    {
        public Guid assetId { get; set; }
        public string? assetCode { get; set; }
        public string? assetName { get; set; }
        public string documentCode { get; set; } = null!;
        public DateTime date { get; set; }
        public string movementType { get; set; } = null!; // INCREASE | DECREASE
        public decimal amount { get; set; }               // nguyên giá tăng / giá trị còn lại giảm
        public decimal? gainLoss { get; set; }            // với thanh lý
        public string? note { get; set; }
    }

    public class AssetMovementReportDto
    {
        public DateTime? fromDate { get; set; }
        public DateTime? toDate { get; set; }
        public decimal totalIncrease { get; set; }
        public decimal totalDecrease { get; set; }
        public int increaseCount { get; set; }
        public int decreaseCount { get; set; }
        public List<AssetMovementRowDto> increases { get; set; } = new();
        public List<AssetMovementRowDto> decreases { get; set; } = new();
    }
}
