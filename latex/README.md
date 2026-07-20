# Bản LaTeX — Đồ án tốt nghiệp TownHub

Bản LaTeX này được sinh từ báo cáo Word `BaoCao_DATN_QUANLYKHUCHUNGCU_NHOM2.docx`,
đồng thời **viết sâu thêm phần OCR** (use case + luồng + mô hình).

## Cấu trúc thư mục
- `main.tex` — tệp chính (preamble theo chuẩn ĐATN: A4, dãn dòng 1,3, cỡ 13, bìa).
- `body.tex` — toàn bộ nội dung báo cáo (sinh tự động từ .docx).
- `frag_ocr_usecase.tex` — phần OCR đào sâu: đặc tả use case + biểu đồ tuần tự (§4.2.5.d).
- `frag_ocr_models.tex` — phần OCR đào sâu: kiến trúc & công thức các mô hình (§4.2.7.b).
- `images/` — 44 ảnh trích từ báo cáo (img01…img44).

> `body.tex` đã **nhúng sẵn** hai fragment trên đúng vị trí, nên khi biên dịch chỉ cần `main.tex`.
> Nếu chỉnh nội dung OCR, sửa file `frag_*.tex` rồi chạy lại bộ sinh (xem cuối file), hoặc sửa thẳng trong `body.tex`.

## Biên dịch (BẮT BUỘC dùng XeLaTeX)
Báo cáo tiếng Việt + font Unicode nên phải dùng **XeLaTeX** (không dùng pdfLaTeX).

**Cách 1 — trên máy này (ĐÃ CÀI MiKTeX, chạy được ngay):**
- Nhấp đúp **`build.bat`** (tự chạy xelatex 3 lần rồi mở `main.pdf`), hoặc:
```
xelatex main.tex
xelatex main.tex   # chạy 2–3 lần để cập nhật mục lục & danh mục hình
```
> Đã biên dịch thử: `main.pdf` = **79 trang**, font **Times New Roman**.
> MiKTeX ở: `C:\Users\ADMIN\AppData\Local\Programs\MiKTeX\miktex\bin\x64\xelatex.exe`.
> Lần đầu MiKTeX có thể bật popup tải gói thiếu — chọn **Always**.

**Cách 2 — Overleaf (không cần cài):**
1. Upload `TownHub_LaTeX.zip`. 2. Settings → Compiler = **XeLaTeX**. 3. Recompile.
   (Trên Overleaf phải đổi font — xem mục dưới.)

## Ghi chú về font
- **Local (Windows):** `main.tex` đang dùng `\setmainfont{Times New Roman}` (font hệ thống) — đúng chuẩn ĐATN.
- **Overleaf:** không có Times New Roman → mở `main.tex`, đổi dòng đó thành `\setmainfont{TeX Gyre Termes}` (tương đương Times, luôn có trên Overleaf).

## Điểm khác so với bản Word
- Trang bìa được dựng lại bằng LaTeX (`titlepage`).
- Mục lục / Danh mục hình vẽ là field LaTeX tự sinh (`\tableofcontents`, `\listoffigures`).
- Đánh số hình giữ nguyên như bản Word (caption ghi tay: "Hình X.Y").
- **Phần OCR bổ sung**: bảng đặc tả use case UC-OCR, biểu đồ tuần tự luồng bất đồng bộ,
  và các công thức mô hình (attention, CTC, DBNet differentiable binarization, GTC).
