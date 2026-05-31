// Dữ liệu mẫu xem trước UI Mua sắm khi backend chưa kết nối.
import type {
  PurchaseRequestResponse, PurchaseOrderResponse, InvoiceResponse, OcrJobResponse,
} from "@/lib/api";

export const mockPurchaseRequests: PurchaseRequestResponse[] = [
  { id: "pr1", prCode: "PR-2026-0042", woId: "wo3", woCode: "WO-2026-0099", requestedBy: "Nguyễn Văn An", status: "SUBMITTED", title: "Mua cáp thép thang máy", justification: "Tồn kho dưới mức tối thiểu, cần cho WO-2026-0099.", priority: "HIGH", neededByDate: "2026-06-10T00:00:00Z", createdAt: "2026-05-26T02:00:00Z" },
  { id: "pr2", prCode: "PR-2026-0041", ticketId: "tk3", ticketCode: "TKT-2026-0155", requestedBy: "Trần Thị Bình", status: "APPROVED", title: "Bổ sung lọc gió AHU", justification: "Thay định kỳ cho AHU tầng 5.", priority: "MEDIUM", neededByDate: "2026-06-05T00:00:00Z", approvedBy: "QL Kỹ thuật", approvedAt: "2026-05-25T08:00:00Z", createdAt: "2026-05-22T03:00:00Z" },
  { id: "pr3", prCode: "PR-2026-0040", requestedBy: "Lê Văn Cường", status: "DRAFT", title: "Thay vòng bi máy bơm", priority: "LOW", createdAt: "2026-05-28T06:00:00Z" },
  { id: "pr4", prCode: "PR-2026-0039", requestedBy: "Nguyễn Văn An", status: "REJECTED", title: "Mua aptomat dự phòng", priority: "MEDIUM", rejectedReason: "Vượt ngân sách quý II.", createdAt: "2026-05-18T04:00:00Z" },
];

export const mockPurchaseOrders: PurchaseOrderResponse[] = [
  { id: "po1", poCode: "PO-2026-0021", prId: "pr1", prCode: "PR-2026-0042", vendorId: "v1", vendorName: "Mitsubishi Elevator Vietnam", status: "SENT", issueDate: "2026-05-27T00:00:00Z", expectedDelivery: "2026-06-05T00:00:00Z", totalAmount: 24_000_000, currency: "VND", paymentTerms: "30 ngày", createdBy: "QL Mua sắm", createdAt: "2026-05-27T02:00:00Z" },
  { id: "po2", poCode: "PO-2026-0020", prId: "pr2", prCode: "PR-2026-0041", vendorId: "v2", vendorName: "Daikin Air Conditioning VN", status: "RECEIVED", issueDate: "2026-05-23T00:00:00Z", expectedDelivery: "2026-05-28T00:00:00Z", actualDelivery: "2026-05-28T00:00:00Z", totalAmount: 1_000_000, currency: "VND", paymentTerms: "Trả ngay", createdBy: "QL Mua sắm", createdAt: "2026-05-23T02:00:00Z" },
  { id: "po3", poCode: "PO-2026-0019", vendorId: "v4", vendorName: "Schneider Electric VN", status: "DRAFT", totalAmount: 2_900_000, currency: "VND", createdBy: "QL Mua sắm", createdAt: "2026-05-29T03:00:00Z" },
];

export const mockInvoices: InvoiceResponse[] = [
  { id: "inv1", invoiceCode: "INV-2026-0033", vendorId: "v1", vendorName: "Mitsubishi Elevator Vietnam", poId: "po1", poCode: "PO-2026-0021", status: "PENDING", invoiceDate: "2026-05-29T00:00:00Z", invoiceNumber: "MEV-0529", subtotal: 21_818_182, taxAmount: 2_181_818, totalAmount: 24_000_000, currency: "VND", paymentDueDate: "2026-06-15T00:00:00Z", paymentStatus: "UNPAID" },
  { id: "inv2", invoiceCode: "INV-2026-0030", vendorId: "v2", vendorName: "Daikin Air Conditioning VN", poId: "po2", poCode: "PO-2026-0020", status: "CONFIRMED", invoiceDate: "2026-05-28T00:00:00Z", invoiceNumber: "DKN-1180", subtotal: 1_000_000, taxAmount: 100_000, totalAmount: 1_100_000, currency: "VND", paymentDueDate: "2026-06-04T00:00:00Z", paidDate: "2026-05-29T00:00:00Z", paymentStatus: "PAID", confirmedBy: "Kế toán", confirmedAt: "2026-05-28T09:00:00Z" },
  { id: "inv3", invoiceCode: "INV-2026-0028", vendorId: "v3", vendorName: "EBARA Pump Vietnam", status: "PENDING", invoiceDate: "2026-05-26T00:00:00Z", invoiceNumber: "EBR-0526", subtotal: 5_000_000, taxAmount: 500_000, totalAmount: 5_500_000, currency: "VND", paymentDueDate: "2026-06-02T00:00:00Z", paymentStatus: "UNPAID" },
];

export const mockOcrJobs: OcrJobResponse[] = [
  { id: "ocr1", documentType: "INVOICE", status: "COMPLETED", fileName: "invoice_mitsubishi.pdf", fileSizeBytes: 248_500, confidenceScore: 0.96, submittedBy: "Kế toán", submittedAt: "2026-05-29T02:00:00Z", completedAt: "2026-05-29T02:01:00Z" },
  { id: "ocr2", documentType: "INVOICE", status: "PROCESSING", fileName: "scan_daikin.jpg", fileSizeBytes: 1_820_000, submittedBy: "Kế toán", submittedAt: "2026-05-31T03:00:00Z" },
  { id: "ocr3", documentType: "CONTRACT", status: "FAILED", fileName: "hopdong_ebara.pdf", fileSizeBytes: 512_000, errorMessage: "Không đọc được vùng chữ ký.", submittedBy: "QL Mua sắm", submittedAt: "2026-05-30T07:00:00Z", completedAt: "2026-05-30T07:02:00Z" },
];
