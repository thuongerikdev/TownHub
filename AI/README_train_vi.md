# Resume Parser cho CV TIẾNG VIỆT — pipeline chuẩn (PDF → text → nhãn → train)

Quy trình đúng như thực tế: **sinh file PDF CV thật (khổ A4 dọc) → trích text từ PDF
(PyMuPDF) → gán nhãn trên text trích được → train NER**. Không sinh text trực tiếp.

PDF được render bằng **Chrome (Playwright) từ 4 template HTML/CSS** dựng bám sát các mẫu
CV người dùng cung cấp (bố cục, màu, chữ đậm/nhạt, vị trí ảnh, câu chữ):

| Template | Mẫu gốc | Đặc trưng |
|---|---|---|
| `teal`  | #1 (Quỳnh My) | sidebar teal 2 cột, ô ảnh, 2 mục "Kỹ năng" (thường + có ★) |
| `navy`  | #2 (Hoàng Nam) | sidebar navy, ảnh tròn, "Mục tiêu học tập – nghề nghiệp", "Hoạt động" |
| `en`    | #4 (An Nguyen) | 1 cột tiếng Anh: SUMMARY / WORK EXPERIENCE / Technologies / EDUCATION |
| `topcv` | #5 (Ngọc Linh) | TopCV serif, liên hệ 1 dòng có icon, kỹ năng dạng "kỹ năng — mô tả" |

> Lưu ý: **font không thể giống 100%** (template gốc dùng font bản quyền) — dùng font
> Google gần nhất (Oswald / Montserrat / Roboto / PT Serif). Ảnh dùng avatar xám (ảnh thật
> không ảnh hưởng tới việc trích text để train).

## File trong thư mục
| File | Vai trò |
|---|---|
| `gen_cv_pdfs.py` | **Bước 1**: render `cv_pdfs/*.pdf` (A4 dọc) + `cv_pdfs/gt/*.json` |
| `pdf_to_dataset.py` | **Bước 2**: trích text từ PDF (PyMuPDF), dò nhãn → `train_data_vi.json` |
| `json_to_spacy_vi.py` | **Bước 3**: JSON → `train_vi.spacy` / `dev_vi.spacy` (split 80/20) |
| `base_config_vi.cfg` | Cấu hình spaCy NER, transformer `xlm-roberta-base` |
| `Resume_Parser_VI_Colab.ipynb` | Notebook Colab chạy trọn pipeline (khuyến nghị) |

## Nhãn (10, khớp mô hình gốc)
`Name, Designation, Email Address, Location, College Name, Degree, Graduation Year,
Companies worked at, Skills, Years of Experience`

## Chạy nhanh — notebook (khuyến nghị)
Upload `Resume_Parser_VI_Colab.ipynb` lên Google Colab → *Runtime → Change runtime type →
GPU* → *Run all*. Notebook tự cài `playwright + chromium + pymupdf + spacy`, sinh PDF, trích
text, train và test.

## Chạy thủ công (máy có Chrome + GPU)
```bash
pip install -U playwright pymupdf spacy spacy-transformers scikit-learn
# dùng Chrome sẵn có (gen_cv_pdfs tự dùng channel="chrome"); Colab: playwright install chromium

python gen_cv_pdfs.py       # Bước 1: render PDF thật A4 dọc (đổi N_CV nếu muốn nhiều hơn)
python pdf_to_dataset.py    # Bước 2: PDF -> text -> train_data_vi.json
python json_to_spacy_vi.py  # Bước 3
python -m spacy init fill-config base_config_vi.cfg config_vi.cfg
python -m spacy train config_vi.cfg --output ./output_vi \
    --paths.train ./train_vi.spacy --paths.dev ./dev_vi.spacy --gpu-id 0
```

Kiểm thử (đúng luồng inference):
```python
import spacy, fitz
nlp = spacy.load("output_vi/model-best")
text = "\n".join(p.get_text() for p in fitz.open("cv_pdfs/cv_0003.pdf"))
for e in nlp(text).ents:
    print(f"{e.label_:22s} | {e.text}")
```

## Cách gán nhãn (weak labeling)
`gen_cv_pdfs.py` biết chính xác giá trị từng trường khi render PDF và lưu vào
`cv_pdfs/gt/*.json`. `pdf_to_dataset.py` trích text từ PDF rồi **dò lại các giá trị đó** với:
khoảng trắng linh hoạt (bắt cả khi PDF ngắt dòng), không phân biệt hoa/thường (tên header bị
CSS in hoa vẫn khớp), và ranh giới từ (tránh "Git" khớp nhầm trong "github"). Nhãn dễ trùng
(Graduation Year) chỉ lấy lần xuất hiện đầu. Kết quả round-trip: **100% giá trị được dò khớp**.

## Đổi mô hình nền
`base_config_vi.cfg`, dòng `name`:
- `xlm-roberta-base` — **khuyến nghị**: đa ngôn ngữ, không cần tách từ, chạy ngay.
- `vinai/phobert-base` — chuyên tiếng Việt, thường chính xác hơn nhưng cần tách từ (VnCoreNLP/pyvi).

## Lưu ý trung thực
CV là dữ liệu tổng hợp theo 4 mẫu nên rất đều → điểm trên tập dev tổng hợp sẽ cao, nhưng CV
thật đa dạng hơn nên độ chính xác thực tế sẽ thấp hơn. Đủ tốt để **demo + minh chứng CLO3**.
Muốn khỏe hơn: tăng `N_CV`, mở rộng kho trường/công ty/kỹ năng, thêm template; hoặc bổ sung
CV thật rồi gán nhãn (có thể dùng LLM auto-label).
