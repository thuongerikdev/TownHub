import re, io, requests, json, unicodedata, statistics, os
import numpy as np
from PIL import Image
from pdf2image import convert_from_bytes
import google.generativeai as genai
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uvicorn

# Đọc hóa đơn điện tử PDF (lớp text) — không cần OCR. Thiếu thư viện thì tự bỏ qua nhánh PDF.
try:
    import pdfplumber
    _HAS_PDFPLUMBER = True
except ImportError:
    _HAS_PDFPLUMBER = False

# ── Cấu hình ──
GEMINI_API_KEY = os.environ.get("GEMINIKEY", "")
API_KEY        = os.environ.get("OCRKEY", "doan-ocr-2026")
genai.configure(api_key=GEMINI_API_KEY)

# ── Load VietOCR một lần lúc khởi động ──
import torch, easyocr
from vietocr.tool.predictor import Predictor
from vietocr.tool.config import Cfg

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
det_reader = easyocr.Reader(['vi'], gpu=False)
cfg = Cfg.load_config_from_name('vgg_transformer')
cfg['device'] = 'cpu'
cfg['predictor']['beamsearch'] = False
# Nạp weights fine-tune nếu có (đặt VIETOCR_WEIGHTS=./weights/vietocr_invoice.pth).
# Không set -> dùng pretrain mặc định do VietOCR tự tải.
_viet_w = os.environ.get("VIETOCR_WEIGHTS", "")
if _viet_w:
    cfg['weights'] = _viet_w
    print(f"➡️  VietOCR dùng weights fine-tune: {_viet_w}")
recognizer = Predictor(cfg)
print("✅ VietOCR sẵn sàng")

# ── Load PaddleOCR một lần lúc khởi động ──
# Chưa fine-tune: để trống các biến -> dùng pretrain 'vi'.
# Sau khi fine-tune + export: trỏ 3 biến dưới sang thư mục inference của bạn.
from paddleocr import PaddleOCR

PADDLE_DET_DIR  = os.environ.get("PADDLE_DET_DIR",  "") or None
PADDLE_REC_DIR  = os.environ.get("PADDLE_REC_DIR",  "") or None
PADDLE_REC_DICT = os.environ.get("PADDLE_REC_DICT", "") or None

_paddle_kwargs = dict(use_angle_cls=True, lang='vi', show_log=False,
                      use_gpu=(DEVICE == 'cuda'))
if PADDLE_DET_DIR:  _paddle_kwargs['det_model_dir']      = PADDLE_DET_DIR
if PADDLE_REC_DIR:  _paddle_kwargs['rec_model_dir']      = PADDLE_REC_DIR
if PADDLE_REC_DICT: _paddle_kwargs['rec_char_dict_path'] = PADDLE_REC_DICT
paddle_ocr = PaddleOCR(**_paddle_kwargs)
print("✅ PaddleOCR sẵn sàng"
      + (" (weights fine-tune)" if PADDLE_REC_DIR or PADDLE_DET_DIR else " (pretrain)"))

# ════════════════════════════════════════
# UTILS CHUNG
# ════════════════════════════════════════
def _download(url):
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    return r.content

def _to_images(content):
    if content[:4] == b'%PDF':
        return convert_from_bytes(content, dpi=200)
    return [Image.open(io.BytesIO(content)).convert('RGB')]

def _strip(s):
    s = ''.join(c for c in unicodedata.normalize('NFD', s)
                if unicodedata.category(c) != 'Mn').lower()
    return s.replace('đ', 'd')   # đ/Đ không tách được bằng NFD → gộp thủ công về 'd'

def _num(s):
    s = re.sub(r'[^\d.,]', '', s)
    if not s: return None
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'): s = s.replace('.', '').replace(',', '.')
        else: s = s.replace(',', '')
    elif ',' in s:
        s = s.replace('.', '').replace(',', '.') if len(s.split(',')[-1]) == 2 else s.replace(',', '')
    elif s.count('.') > 1 or (s.count('.') == 1 and len(s.split('.')[-1]) == 3):
        s = s.replace('.', '')
    try: return float(s)
    except: return None

def _last_number(s):
    nums = re.findall(r'\d[\d.,]*', s)
    return _num(nums[-1]) if nums else None

# ════════════════════════════════════════
# PIPELINE VIETOCR  (easyocr detect + VietOCR recognize)
# ════════════════════════════════════════
def _ocr_image(pil_img):
    horizontal, _ = det_reader.detect(np.array(pil_img))
    boxes = horizontal[0] if horizontal else []
    lines = []
    for (x0, x1, y0, y1) in boxes:
        x0, y0, x1, y1 = max(0, int(x0)), max(0, int(y0)), int(x1), int(y1)
        if x1 - x0 < 3 or y1 - y0 < 3: continue
        try:
            text, prob = recognizer.predict(pil_img.crop((x0, y0, x1, y1)), return_prob=True)
        except: continue
        text = (text or '').strip()
        if text:
            lines.append({'text': text, 'box': [x0, y0, x1, y1], 'prob': float(prob)})
    lines.sort(key=lambda l: (l['box'][1] // 10, l['box'][0]))
    return lines

def parse_invoice_vietocr(lines):
    """Bóc tách trường từ danh sách 'lines' [{text, box:[x0,y0,x1,y1], prob}].
    Dùng chung cho cả pipeline VietOCR và PaddleOCR."""
    raw = '\n'.join(l['text'] for l in lines)
    fields = {'currency': 'VND'}

    def row_h(l): return max(l['box'][3] - l['box'][1], 8)

    def same_row_number(anchor, min_val=1000):
        # Lấy số CÙNG DÒNG với nhãn: chọn box gần theo phương dọc nhất, dung sai chặt (0.9×
        # chiều cao dòng) để không "rỉ" sang dòng kế (tránh lấy nhầm Tổng cộng khi đọc Tiền thuế).
        ay = (anchor['box'][1] + anchor['box'][3]) / 2
        rh = row_h(anchor)
        best = None; best_dy = None
        for c in lines:
            if c is anchor or '%' in c['text']: continue
            cy = (c['box'][1] + c['box'][3]) / 2
            dy = abs(cy - ay)
            if dy > rh * 0.9: continue
            v = _last_number(c['text'])
            if v is not None and v >= min_val and (best_dy is None or dy < best_dy):
                best = v; best_dy = dy
        return best

    def next_row_number(anchor, min_val=1000, max_rows=3):
        ay_bot = anchor['box'][3]
        rh = row_h(anchor)
        below = sorted([c for c in lines
                        if c is not anchor
                        and c['box'][1] >= ay_bot - 4
                        and c['box'][1] <= ay_bot + rh * max_rows
                        and '%' not in c['text']],
                       key=lambda c: c['box'][1])
        for c in below:
            v = _last_number(c['text'])
            if v is not None and v >= min_val: return v
        return None

    def find_amount(keys, min_val=1000):
        for l in lines:
            n = _strip(l['text'])
            if not any(k in n for k in keys): continue
            if '%' not in l['text']:                     # số nằm ngay trên dòng nhãn (1 box)
                v = _last_number(l['text'])
                if v is not None and v >= min_val: return v
            v = same_row_number(l, min_val)              # số ở box khác cùng dòng
            if v is not None: return v
            v = next_row_number(l, min_val)              # số ở dòng dưới
            if v is not None: return v
        return None

    for l in lines:
        n = _strip(l['text'])
        if 'mst' in n or 'ma so thue' in n:
            mm = re.search(r'\d{10}(?:-\d{3})?', l['text'])
            if mm: fields['sellerTaxCode'] = mm.group(0); break

    for i, l in enumerate(lines):
        n = _strip(l['text'])
        if 'hoa don' in n:                               # bỏ qua dòng tiêu đề "HÓA ĐƠN ..."
            continue
        if ('don vi ban hang' in n or 'nha cung cap' in n or 'ben ban' in n or 'don vi ban' in n
                or ('ban hang' in n and 'nguoi' not in n)):
            parts = l['text'].split(':', 1)
            name = parts[1].strip() if len(parts) > 1 else ''
            if not name and i + 1 < len(lines):
                name = lines[i + 1]['text'].strip()
            if name: fields['sellerName'] = name
            break

    for l in lines:
        n = _strip(l['text'])
        if ('so' in n or 'no' in n) and ('hoa don' in n or 'invoice' in n or len(n) < 35):
            mm = re.search(r'(?:so|no)[^:A-Za-z]{0,12}:?\s*\)?\s*([A-Za-z0-9/\-]{4,20})', l['text'], re.I)
            if mm:
                val = mm.group(1).strip('(): ')
                if not val.replace('-', '').isalpha():
                    fields['invoiceNumber'] = val; break

    m = re.search(r'\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b', raw)
    if not m:
        m = re.search(r'ng[aà]y.{0,30}?(\d{1,2}).{0,20}?th[aá]ng.{0,10}?(\d{1,2}).{0,20}?n[aă]m.{0,10}?(\d{4})',
                      raw, re.I | re.DOTALL)
    if m:
        d, mo, y = m.groups()
        fields['invoiceDate'] = f"{y}-{int(mo):02d}-{int(d):02d}"

    fields['subtotal']    = find_amount(['cong tien hang', 'tien hang', 'thanh tien chua thue',
                                          'tong tien hang', 'cong tien chua thue', 'subtotal'])
    fields['taxAmount']   = find_amount(['tien thue', 'thue gtgt', 'thue gia tri gia tang',
                                         'thue suat vat', 'thue vat'])
    if fields['taxAmount'] is None:
        for l in lines:
            if 'vat' in _strip(l['text']) or 'thue suat' in _strip(l['text']):
                v = same_row_number(l, 1000) or next_row_number(l, 1000)
                if v: fields['taxAmount'] = v; break
    fields['totalAmount'] = find_amount(['tong cong tien thanh toan', 'tong tien thanh toan',
                                          'tong cong thanh toan', 'tong tien phai thanh toan',
                                          'tong cong tien', 'tong thanh toan', 'total amount'])
    if fields['totalAmount'] is None:
        fields['totalAmount'] = find_amount(['tong cong', 'total'])

    return raw, fields

def extract_vietocr(content):
    images   = _to_images(content)
    all_lines = []
    for im in images:
        all_lines += _ocr_image(im)
    raw, fields = parse_invoice_vietocr(all_lines)
    probs = [l['prob'] for l in all_lines] or [0.0]
    return raw, fields, [], round(float(statistics.mean(probs)), 4)

# ════════════════════════════════════════
# PIPELINE PADDLEOCR  (Paddle detect + Paddle recognize)
# ════════════════════════════════════════
def _paddle_to_lines(result):
    """Chuyển output PaddleOCR về cùng format 'lines' của pipeline VietOCR."""
    lines = []
    for page in (result or []):
        if not page:
            continue
        for box, (text, conf) in page:
            xs = [p[0] for p in box]; ys = [p[1] for p in box]
            text = (text or '').strip()
            if not text:
                continue
            lines.append({
                'text': text,
                'box' : [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))],
                'prob': float(conf),
            })
    lines.sort(key=lambda l: (l['box'][1] // 10, l['box'][0]))
    return lines

def extract_paddle(content):
    images    = _to_images(content)
    all_lines = []
    for im in images:
        result = paddle_ocr.ocr(np.array(im), cls=True)
        all_lines += _paddle_to_lines(result)
    raw, fields = parse_invoice_vietocr(all_lines)   # tái dùng parser
    probs = [l['prob'] for l in all_lines] or [0.0]
    return raw, fields, [], round(float(statistics.mean(probs)), 4)

# ════════════════════════════════════════
# PIPELINE GEMINI VISION
# ════════════════════════════════════════
INVOICE_PROMPT = """Bạn là chuyên gia đọc hóa đơn Việt Nam và quốc tế.
Phân tích hình ảnh hóa đơn và trả về JSON với cấu trúc sau (null nếu không tìm thấy):
{
  "invoiceNumber": "số hóa đơn",
  "invoiceDate": "yyyy-MM-dd",
  "sellerName": "tên đơn vị bán hàng",
  "sellerTaxCode": "mã số thuế người bán",
  "buyerName": "tên người/đơn vị mua",
  "buyerTaxCode": "mã số thuế người mua",
  "subtotal": <số nguyên>,
  "taxRate": <tỷ lệ % VAT>,
  "taxAmount": <số nguyên>,
  "totalAmount": <số nguyên>,
  "currency": "VND",
  "paymentMethod": "hình thức thanh toán",
  "lineItems": [{"description":"","unit":"","quantity":0,"unitPrice":0,"totalPrice":0}]
}
Chỉ trả JSON thuần, KHÔNG markdown, KHÔNG giải thích."""

def _resize_for_gemini(img, max_dim=1200):
    if max(img.width, img.height) <= max_dim: return img
    scale = max_dim / max(img.width, img.height)
    img = img.resize((int(img.width*scale), int(img.height*scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=85)
    buf.seek(0)
    return Image.open(buf)

def extract_gemini(content):
    images  = _to_images(content)
    if len(images) == 1:
        img = _resize_for_gemini(images[0])
    else:
        total_h = sum(p.height for p in images)
        max_w   = max(p.width  for p in images)
        combined = Image.new('RGB', (max_w, total_h), (255, 255, 255))
        y = 0
        for p in images:
            combined.paste(p, (0, y)); y += p.height
        img = _resize_for_gemini(combined)

    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content([INVOICE_PROMPT, img],
                                       generation_config={"temperature": 0})
    text = re.sub(r'^```(?:json)?\s*|\s*```$', '', response.text.strip(), flags=re.MULTILINE).strip()
    data = json.loads(text)
    fields = {
        "invoiceNumber": data.get("invoiceNumber"),
        "invoiceDate":   data.get("invoiceDate"),
        "sellerName":    data.get("sellerName"),
        "sellerTaxCode": data.get("sellerTaxCode"),
        "subtotal":      data.get("subtotal"),
        "taxAmount":     data.get("taxAmount"),
        "totalAmount":   data.get("totalAmount"),
        "currency":      data.get("currency") or "VND",
    }
    return json.dumps(data, ensure_ascii=False, indent=2), fields, data.get("lineItems") or [], 0.95

# ════════════════════════════════════════
# PIPELINE PDF — hóa đơn điện tử có lớp text (đọc trực tiếp, KHÔNG OCR → chính xác nhất)
# ════════════════════════════════════════
def _pdf_to_lines(content):
    """Trích từng dòng text + toạ độ từ PDF (bản thể hiện hóa đơn điện tử), dựng về format 'lines'."""
    lines, yo = [], 0.0
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            try:
                tl = page.extract_text_lines()
            except Exception:
                tl = []
            for ln in tl:
                t = (ln.get("text") or "").strip()
                if not t:
                    continue
                lines.append({"text": t,
                              "box": [int(ln["x0"]), int(ln["top"] + yo),
                                      int(ln["x1"]), int(ln["bottom"] + yo)],
                              "prob": 1.0})
            yo += float(page.height or 0)
    lines.sort(key=lambda l: (l["box"][1] // 10, l["box"][0]))
    return lines

def extract_pdf(content):
    """Đọc hóa đơn từ lớp text PDF. Trả None nếu PDF không có text (bản scan) → để OCR xử lý."""
    if not _HAS_PDFPLUMBER:
        return None
    lines = _pdf_to_lines(content)
    if len(lines) < 3:                       # gần như không có chữ → PDF scan → chuyển OCR
        return None
    raw, fields = parse_invoice_vietocr(lines)   # tái dùng đúng parser đang có
    return raw, fields, [], 1.0

# ════════════════════════════════════════
# FASTAPI
# ════════════════════════════════════════
app = FastAPI(title="Invoice OCR Service")

ENGINES = {
    "gemini":    extract_gemini,
    "vietocr":   extract_vietocr,
    "paddleocr": extract_paddle,
}

class ExtractReq(BaseModel):
    fileUrl: str
    model: str = "gemini"

@app.get("/health")
def health():
    return {"status": "ok", "engines": list(ENGINES.keys()), "pdfTextLayer": _HAS_PDFPLUMBER}

@app.post("/extract")
def extract(req: ExtractReq, x_api_key: str = Header(default="")):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Sai X-API-Key")
    try:
        content = _download(req.fileUrl)   # tải 1 lần, dùng cho cả 2 nhánh

        # ── Nhánh 1: PDF hóa đơn điện tử có lớp text → đọc thẳng, KHÔNG OCR ──
        if content[:4] == b"%PDF":
            try:
                pr = extract_pdf(content)
            except Exception:
                pr = None
            if pr:
                raw, fields, line_items, confidence = pr
                return {"status": "DONE", "confidence": confidence, "rawText": raw,
                        "fields": fields, "lineItems": line_items,
                        "model": req.model, "source": "pdf-text"}

        # ── Nhánh 2: ảnh (hoặc PDF scan không có text) → OCR bằng engine đã chọn ──
        runner = ENGINES.get(req.model, extract_gemini)
        raw, fields, line_items, confidence = runner(content)
        return {"status": "DONE", "confidence": confidence, "rawText": raw,
                "fields": fields, "lineItems": line_items,
                "model": req.model, "source": "ocr"}
    except Exception as e:
        return {"status": "FAILED", "errorMessage": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
