# HỒ SƠ THỰC TẬP TỐT NGHIỆP

| | |
|---|---|
| **Sinh viên** | Nguyễn Xuân Thưởng |
| **Mã số sinh viên** | 0220766 |
| **Lớp / Khoá** | 66KSCS / Khoá 66 |
| **Ngành** | Khoa học máy tính |
| **Khoa** | Công nghệ thông tin — Trường Đại học Xây dựng Hà Nội |
| **Học phần** | Thực tập tốt nghiệp — mã 608821 (11 tín chỉ) |
| **Giảng viên hướng dẫn** | TS. Hoàng Nam Thắng |
| **Đơn vị hướng dẫn** | Công ty Cổ phần Giải pháp Chuyển đổi số THG (MST 0109563064) |
| **Cán bộ hướng dẫn tại ĐVHD** | Nguyễn Ngọc Hải |
| **Thời gian thực tập** | 11 tuần, từ 26/01/2026 đến 19/04/2026 |
| **Đề tài** | Module tuyển dụng trên nền tảng Odoo, tích hợp AI phân tích hồ sơ ứng viên |

> **Lưu ý về đơn vị hướng dẫn:** trong suốt kỳ thực tập, đơn vị hoạt động dưới tên
> Công ty Cổ phần Giải pháp Chuyển đổi số THG (MST 0109563064). Sau kỳ thực tập,
> bộ phận liên quan được tách thành pháp nhân độc lập là Công ty Cổ phần Đầu tư và
> Công nghệ THG (MST **0111535219**), cùng địa chỉ trụ sở. Đây là **hai mã số thuế
> khác nhau**, tức hai pháp nhân riêng biệt — cần giải trình với Khoa khi xin xác nhận.

---

## Cấu trúc thư mục

### `01_Bao_cao`
`Bao_cao_TTTN_Nguyen_Xuan_Thuong_66KSCS_0220766.docx` — báo cáo hoàn chỉnh.

Cấu trúc: Bìa → Mục lục → Mục lục hình ảnh → Mục lục bảng biểu → Lời cảm ơn →
Phần 1 (đơn vị thực tập) → Phần 2 (mục tiêu theo 5 CLO + kế hoạch 11 tuần) →
Phần 3 (nội dung và kết quả, gồm mục 3.3.2 về pipeline AI) → Phần 4 (phân tích,
đánh giá, đề xuất) → Phần 5 (tự nhận xét) → Phần 6 (kết luận) →
Tài liệu tham khảo → IV. Xác nhận hoàn thành.

Định dạng: A4, lề 3–2–2–2 cm, Times New Roman 13, giãn dòng 1,5, có đánh số trang.

> **Mở file lần đầu:** nhấn `Ctrl+A` rồi `F9`, chọn *Update entire table* để mục lục
> cập nhật lại số trang.

### `02_Bieu_mau`
- `Bieu_mau_TTTN_01_den_08b_da_dien.docx` — bộ Mẫu TTTN-01 → TTTN-08b đã điền sẵn
  thông tin sinh viên, đơn vị, thời gian thực tập; đã thay bộ chuẩn đầu ra trong
  Mẫu TTTN-07 và TTTN-08b cho khớp đề cương (5 CLO); cột "Minh chứng bản thân"
  trong TTTN-08b đã điền sẵn. Các ô dành cho người đánh giá để trống.
- `Bieu_mau_goc_cua_Khoa_(tham_chieu).docx` — bản gốc, giữ để đối chiếu.
- `Don_giai_trinh_xac_nhan_DVHD.docx` — đơn giải trình gửi Khoa về việc chưa xin được
  con dấu của pháp nhân cũ do đơn vị tái cơ cấu. Cần điền ngày tháng, ký tên, và xin
  chữ ký của ông Nguyễn Ngọc Hải ở ô bên trái nếu được.

### `03_Colab`
`Resume_Parser_VI_Colab.ipynb` — notebook huấn luyện mô hình trích xuất thông tin CV
tiếng Việt. Chạy trên Google Colab: *Runtime → Change runtime type → GPU*, rồi *Run all*.

### `04_Minh_chung`
8 ảnh tương ứng các hình trong báo cáo, đặt tên theo đúng số hiệu hình:

| Tệp | Nội dung |
|---|---|
| `Hinh_1.1_...` | Cấu trúc hội đồng quản trị |
| `Hinh_1.2_...` | Cấu trúc ban điều hành |
| `Hinh_3.1_...` | Sơ đồ luồng quy trình tuyển dụng |
| `Hinh_3.2_...` | Kế hoạch triển khai dự án và phân công theo tuần |
| `Hinh_3.3_...` | Nhóm trao đổi BA – Dev (nhận yêu cầu, báo cáo kết quả) |
| `Hinh_3.4_...` | Trao đổi làm rõ yêu cầu phân quyền, duyệt lịch họp |
| `Hinh_3.5_...` | Lịch sử commit và pull request trên GitHub |
| `Hinh_3.6_...` | Bảng theo dõi lỗi và phân công của BA |

### `05_Phu_luc`
- `De_cuong_hoc_phan_TTTN_V2_(608821).docx` — đề cương chi tiết học phần (căn cứ của 5 CLO).
- Mã nguồn pipeline AI, tách từ notebook thành tệp chạy độc lập:

| Tệp | Vai trò | Mục tương ứng trong báo cáo |
|---|---|---|
| `Ma_nguon_gen_cv_pdfs.py` | Sinh 300 CV PDF khổ A4 từ 4 mẫu bố cục kèm nhãn tham chiếu | 3.3.2.3 |
| `Ma_nguon_pdf_to_dataset.py` | Trích văn bản bằng PyMuPDF và tự động gán nhãn | 3.3.2.4 |
| `Ma_nguon_json_to_spacy_vi.py` | Chuyển sang DocBin, chia tập 80/20 | 3.3.2.5 |
| `Ma_nguon_base_config_vi.cfg` | Cấu hình huấn luyện NER trên `xlm-roberta-base` | 3.3.2.6 |

---

## Việc còn phải làm

1. Cập nhật mục lục báo cáo (`Ctrl+A` → `F9`).
2. Xin chữ ký xác nhận của anh Nguyễn Ngọc Hải và TS. Hoàng Nam Thắng ở mục
   **IV. Xác nhận hoàn thành** (trang cuối báo cáo).
3. Nộp `02_Bieu_mau\Don_giai_trinh_xac_nhan_DVHD.docx` cho Khoa và báo TS. Hoàng Nam Thắng
   **trước** hạn nộp hồ sơ, không để đến lúc nộp mới trình bày.
4. Xác minh người đại diện theo pháp luật của Công ty CP Đầu tư và Công nghệ THG trước
   khi xin dấu (dữ liệu công khai ghi ĐÀO TRẦN THANH, khác với thông tin đang có).
5. Tự chấm mức đạt CLO (0–4) trong Mẫu TTTN-08b — phần minh chứng đã điền sẵn.
6. Bổ sung số liệu độ chính xác (ENTS_F) của mô hình vào mục 3.3.2.6 nếu còn log
   của lần huấn luyện.
