# OCR Service — 3 engine + fine-tune (TownHub)

Service bóc tách hóa đơn với **3 lựa chọn** engine, backend .NET gọi qua `POST /extract`
với field `model`:

| `model`       | Detect          | Recognize        | Fine-tune?          |
|---------------|-----------------|------------------|---------------------|
| `gemini`      | (API lo)        | (API lo)         | ❌ không (API đóng) |
| `vietocr`     | easyocr         | VietOCR          | ✅ recognition       |
| `paddleocr`   | PaddleOCR det   | PaddleOCR rec    | ✅ detect + recognize|

## Cấu trúc
```
ocr-service/
  app.py                     # service FastAPI 3 engine (port 7860)
  requirements.txt
  finetune_colab.ipynb       # ⭐ notebook Colab BẤM-CHẠY-HẾT: sinh data → train VietOCR+Paddle → export
  training/
    make_dataset.py          # SINH dataset hóa đơn tiếng Việt synthetic (det + rec) — không gán tay
    finetune_vietocr.py      # fine-tune VietOCR recognition
    finetune_paddle.md       # lệnh fine-tune PaddleOCR det + rec
```

**Nhanh nhất:** mở [finetune_colab.ipynb](finetune_colab.ipynb) trên Google Colab (bật GPU T4),
Runtime → Run all. Notebook tự clone repo, sinh data, train cả 2 engine, export, lưu Drive.

## Quy trình đầy đủ (Colab)

### Bước 1 — Sinh dataset (vì chưa có dữ liệu thật)
```bash
python training/make_dataset.py --n 500 --out ./dataset \
       --fonts /usr/share/fonts/truetype/dejavu
```
Ra: `dataset/rec` (crop dòng + text cho recognition), `dataset/det` (ảnh trang + box cho detection),
`dataset/dict_vi.txt`. Một dataset dùng chung cho cả VietOCR và Paddle.

**Augment (bật mặc định) = bản SCAN nền trắng** — box luôn được transform theo bằng homography
nên nhãn vẫn khớp (đã kiểm chứng bằng cách vẽ box đè lên ảnh đã méo). Mặc định gồm:
- Nghiêng/méo phối cảnh nhẹ, **nền giấy** có vân, ánh sáng không đều, nhiễu cảm biến, mờ nhẹ, nén JPEG.
- **Dấu mộc tròn đỏ**: 2 vòng + sao 5 cánh, **ghi đủ TÊN CÔNG TY (cong trên) + MST thật (cong dưới)**,
  bán trong suốt, xoay, đè lệch lên chữ ký.
- **Chữ ký tay**: chuỗi Bézier nối nhau (vòng mở đầu + nét thảo cao thấp + hoa tay cuối), nét đậm/nhạt
  theo tốc độ bút — đặt đúng vùng trống *bên dưới* dòng "(Ký, ghi rõ họ tên)".

Tuỳ chọn bật thêm (không bật mặc định vì dễ trông giả nếu lạm dụng):
- `--photo` : thêm ~45% ảnh **CHỤP** trên mặt bàn gỗ/xám (vân thật + vignette + mờ hậu cảnh),
  xoay, bóng đổ, **ngón tay giữ mép giấy**.
- `--marks` : thêm **watermark "BẢN SAO / COPY"**, **nếp gập giấy**, **vệt mực lem**.
- `--clean` : tắt hết augment (ảnh sạch) để làm ablation cho báo cáo.

Cần `opencv-python-headless` cho phần nghiêng/méo/nền chụp (thiếu thì tự bỏ qua, các phần khác vẫn chạy).

- `--clean` : tắt toàn bộ augment → ảnh sạch. Dùng để **so sánh trong báo cáo** (train trên ảnh sạch
  vs ảnh giống thật → chứng minh augment giúp mô hình bền hơn với hóa đơn thực tế).

> Nâng chất lượng thêm: trộn hóa đơn thật đã gán nhãn (rec: tự gõ text vào crop; det: dùng
> `PPOCRLabel --lang vi` bấm *Auto annotation* rồi sửa). 50–150 ảnh thật là đủ tạo khác biệt.

### Bước 2 — Fine-tune
```bash
# VietOCR (recognition)
python training/finetune_vietocr.py --data ./dataset/rec --iters 20000 \
       --out ./weights/vietocr_invoice.pth
# PaddleOCR (detect + recognize): xem training/finetune_paddle.md
```

### Bước 3 — Nạp weights vào service (chỉ set biến môi trường, KHÔNG sửa code)
```bash
export VIETOCR_WEIGHTS=./weights/vietocr_invoice.pth
export PADDLE_DET_DIR=./PaddleOCR/inference/det_vi
export PADDLE_REC_DIR=./PaddleOCR/inference/rec_vi
export PADDLE_REC_DICT=./dataset/dict_vi.txt
export GEMINIKEY=<key gemini>
export OCRKEY=doan-ocr-2026
python app.py
```

### Bước 4 — Gọi thử
```bash
curl -X POST http://localhost:7860/extract \
  -H "X-API-Key: doan-ocr-2026" -H "Content-Type: application/json" \
  -d '{"fileUrl":"https://.../hoadon.jpg","model":"paddleocr"}'
```

## Phía backend .NET + Frontend (ĐÃ NỐI SẴN chọn engine)
Người dùng chọn engine ngay trên màn "Số hóa chứng từ (AI OCR)":
- **FE** [OCRUpload.tsx](../datn/components/procurement/OCRUpload.tsx): dropdown "Engine AI"
  (gemini / vietocr / paddleocr) → gửi field `ocrEngine` khi submit job.
- **.NET**: `ocrEngine` lưu vào cột `ocr_jobs.ocrEngine` (migration `AddOcrEngine`), worker
  [OcrProcessingWorker.cs](../TH.WebAPI/Service/Asset/TH.Asset.ApplicationService/Service/Inventory/Ocr/OcrProcessingWorker.cs)
  đọc ra và truyền xuống service qua field `model` (`{ fileUrl, model }`).

Chỉ cần cấu hình `.env` phía .NET: `OCR_SERVICE_URL` = URL cloudflared của service này,
`OCR_API_KEY` = `OCRKEY`. Bỏ trống `OCR_SERVICE_URL` → dùng `MockOcrEngine` (test không cần Colab).

## Gợi ý số liệu cho báo cáo ĐATN
So sánh 3 engine trên cùng tập test theo độ chính xác từng trường
(số hóa đơn, ngày, MST, cộng tiền hàng, tiền thuế, tổng thanh toán) → bảng kết quả +
nhận xét trade-off (Gemini: chính xác cao nhưng phụ thuộc API/chi phí; VietOCR/Paddle:
tự chủ, fine-tune được, chạy offline).
