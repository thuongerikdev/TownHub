using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TH.Asset.Domain.Core
{
    // ════════════════════════════════════════════════════════════════════════
    // HẰNG SỐ KẾ TOÁN
    // Loại chứng từ + mã tài khoản chuẩn VN (TT200/TT133) dùng cho định khoản.
    // ════════════════════════════════════════════════════════════════════════
    public static class AssetDocumentType
    {
        public const string GhiTang = "GHI_TANG"; // Ghi tăng TSCĐ khi nhập
        public const string KhauHao = "KHAU_HAO"; // Trích khấu hao kỳ
        public const string ThanhLy = "THANH_LY"; // Thanh lý / nhượng bán
    }

    public static class AssetDocumentStatus
    {
        public const string Draft  = "DRAFT";   // Nháp
        public const string Posted = "POSTED";  // Đã ghi sổ (không cho sửa/xoá)
    }

    public static class AssetAccount
    {
        // Nguyên giá
        public const string TscdHuuHinh = "211"; // TSCĐ hữu hình
        public const string TscdVoHinh  = "213"; // TSCĐ vô hình
        // Hao mòn luỹ kế
        public const string HaoMonHuuHinh = "2141";
        public const string HaoMonVoHinh  = "2143";
        // Chi phí khấu hao (Nợ)
        public const string CpQuanLy   = "642"; // Chi phí quản lý DN (mặc định)
        public const string CpSanXuat  = "627"; // Chi phí sản xuất chung
        public const string CpBanHang  = "641"; // Chi phí bán hàng
        // Thanh lý
        public const string ChiPhiKhac = "811"; // Giá trị còn lại khi thanh lý (Nợ)
        // Thanh toán khi mua
        public const string TienMat   = "111";
        public const string TienGuiNH = "112";
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHỨNG TỪ KẾ TOÁN (Master)
    // ════════════════════════════════════════════════════════════════════════
    [Table("asset_document", Schema = "asset")]
    public class AssetDocument
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        [Required, MaxLength(50)]
        public required string documentCode { get; set; }

        [MaxLength(20)]
        public string documentType { get; set; } = AssetDocumentType.GhiTang; // GHI_TANG | KHAU_HAO | THANH_LY

        public DateTime documentDate { get; set; } = DateTime.UtcNow;

        public string? description { get; set; }

        public decimal totalAmount { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = AssetDocumentStatus.Posted; // DRAFT | POSTED

        // Cross-service (Auth) — không dùng navigation property
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; } = DateTime.UtcNow;

        // ── Navigation ──
        public virtual ICollection<AssetDocumentLine>? lines { get; set; }
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHI TIẾT CHỨNG TỪ (dòng định khoản Nợ/Có)
    // ════════════════════════════════════════════════════════════════════════
    [Table("asset_document_line", Schema = "asset")]
    public class AssetDocumentLine
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid documentId { get; set; }

        [MaxLength(20)]
        public string? debitAccount { get; set; }  // Tài khoản Nợ

        [MaxLength(20)]
        public string? creditAccount { get; set; } // Tài khoản Có

        public decimal amount { get; set; }
        public string? description { get; set; }

        public Guid? assetId { get; set; }

        // ── Navigation ──
        [ForeignKey(nameof(documentId))]
        public virtual AssetDocument? document { get; set; }

        [ForeignKey(nameof(assetId))]
        public virtual Asset? asset { get; set; }
    }

    // ════════════════════════════════════════════════════════════════════════
    // THANH LÝ TÀI SẢN
    // ════════════════════════════════════════════════════════════════════════
    [Table("asset_disposal", Schema = "asset")]
    public class AssetDisposal
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }

        public Guid assetId { get; set; }
        public DateTime disposalDate { get; set; } = DateTime.UtcNow;

        // Snapshot sổ sách tại thời điểm thanh lý
        public decimal originalCost { get; set; }
        public decimal accumulatedDepreciation { get; set; }
        public decimal bookValue { get; set; }

        public decimal disposalValue { get; set; } // Giá trị thu về khi thanh lý
        public decimal gainLoss { get; set; }       // Lãi/lỗ = disposalValue - bookValue

        [MaxLength(30)]
        public string? disposalType { get; set; }   // SALE | SCRAP | DONATION ...
        public string? reason { get; set; }
        public string? note { get; set; }

        [MaxLength(20)]
        public string status { get; set; } = "COMPLETED";

        public Guid? documentId { get; set; }
        // Cross-service (Auth)
        public Guid? createdBy { get; set; }
        public DateTime createdAt { get; set; } = DateTime.UtcNow;

        // ── Navigation ──
        [ForeignKey(nameof(assetId))]
        public virtual Asset? asset { get; set; }

        [ForeignKey(nameof(documentId))]
        public virtual AssetDocument? document { get; set; }
    }
}
