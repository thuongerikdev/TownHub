// Định dạng dữ liệu hiển thị (tiếng Việt). Dùng chung toàn bộ UI.

export function formatCurrency(value?: number | null, opts?: { compact?: boolean }): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value) + " ₫";
  }
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Số ngày còn lại tới mốc (âm = đã quá hạn). Null nếu không có ngày.
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

export function formatRelativeDays(iso?: string | null): string {
  const n = daysUntil(iso);
  if (n == null) return "—";
  if (n === 0) return "Hôm nay";
  if (n > 0) return `Còn ${n} ngày`;
  return `Quá ${Math.abs(n)} ngày`;
}
