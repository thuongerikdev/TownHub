"""So sánh TRƯỚC vs SAU fine-tune cho 1 engine, chạy ở tiến trình riêng.
Gọi: python compare.py --engine vietocr|paddleocr --mode pretrain|finetune --img <path> [--drive <dir>]
In ra 1 dòng JSON kết quả (engine, mode, seconds, fields, lineItems, rawText, nLines).
Mỗi lần chạy chỉ nạp 1 biến thể model -> không OOM, không lẫn trọng số."""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

ap = argparse.ArgumentParser()
ap.add_argument('--engine', required=True, choices=['vietocr', 'paddleocr', 'paddledet_viet'])
ap.add_argument('--mode',   required=True, choices=['pretrain', 'finetune'])
ap.add_argument('--img',    required=True)
ap.add_argument('--drive',  default='/content/drive/MyDrive/townhub_ocr')
a = ap.parse_args()

# Cấu hình weight PHẢI đặt trước khi import app (app đọc env lúc nạp engine).
# pretrain: để trống -> app dùng model pretrain mặc định (vietocr vgg_transformer / paddle lang='vi').
# hybrid (paddledet_viet): cần Paddle DBNet (det) + VietOCR (rec).
if a.mode == 'finetune':
    if a.engine in ('vietocr', 'paddledet_viet'):
        os.environ['VIETOCR_WEIGHTS'] = f'{a.drive}/weights/vietocr_invoice.pth'
    if a.engine in ('paddleocr', 'paddledet_viet'):
        os.environ['PADDLE_DET_DIR']  = f'{a.drive}/inference/det_vi'
        os.environ['PADDLE_REC_DIR']  = f'{a.drive}/inference/rec_vi'
        os.environ['PADDLE_REC_DICT'] = f'{a.drive}/dict_vi.txt'

import app  # noqa: E402
import cv2  # noqa: E402

img = cv2.imread(a.img)
if img is None:
    print(json.dumps({'error': f'không đọc được ảnh: {a.img}'})); sys.exit(1)

t0 = time.time()
if a.engine == 'paddleocr':
    pocr  = app.get_paddle()
    lines = app._paddle_to_lines(pocr.ocr(img, cls=True))
elif a.engine == 'paddledet_viet':
    rgb   = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    lines = app._paddledet_viet_lines(rgb)
else:
    from PIL import Image
    im = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    lines = app._ocr_image(im)
raw, fields, items = app.parse_invoice_vietocr(lines)
secs = round(time.time() - t0, 2)

print("<<<RESULT>>>" + json.dumps({
    'engine': a.engine, 'mode': a.mode, 'seconds': secs,
    'nLines': len(lines), 'fields': fields, 'lineItems': items, 'rawText': raw,
}, ensure_ascii=False))
