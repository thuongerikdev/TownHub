import re, io, requests, json, unicodedata, statistics, os
import numpy as np
from PIL import Image
from pdf2image import convert_from_bytes
import google.generativeai as genai
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uvicorn




# ── Cấu hình ──
GEMINI_API_KEY = os.environ.get("GEMINIKEY", "")
API_KEY        = os.environ.get("OCRKEY", "doan-ocr-2026")
genai.configure(api_key=GEMINI_API_KEY)

# ── Tự nhận GPU ──
# OCR_USE_GPU=1/0 để ép; mặc định 'auto' -> dùng GPU nếu torch thấy CUDA.
# Cùng một app.py chạy được cả Colab (GPU) lẫn HF cpu-basic (CPU).
def _use_gpu():
    v = os.environ.get("OCR_USE_GPU", "auto").lower()
    if v in ("1", "true", "yes", "on"):  return True
    if v in ("0", "false", "no", "off"): return False
    try:
        import torch; return bool(torch.cuda.is_available())
    except Exception:
        return False

# ── LAZY-LOAD engine (chỉ nạp khi gọi tới) ──
# Nạp cả 3 engine cùng lúc lúc import sẽ ngốn RAM (OOM trên Colab free / HF cpu-basic).
# Mỗi engine chỉ được khởi tạo ở lần gọi đầu và cache lại.
_det_reader = None   # easyocr detector (cho pipeline vietocr)
_recognizer = None   # VietOCR recognizer
_paddle_ocr = None   # PaddleOCR (det + rec + cls)

def get_det_reader():
    global _det_reader
    if _det_reader is None:
        import easyocr
        _det_reader = easyocr.Reader(['vi'], gpu=_use_gpu())
        print(f"✅ easyocr detector sẵn sàng ({'GPU' if _use_gpu() else 'CPU'})")
    return _det_reader

def get_recognizer():
    global _recognizer
    if _recognizer is None:
        from vietocr.tool.predictor import Predictor
        from vietocr.tool.config import Cfg
        cfg = Cfg.load_config_from_name('vgg_transformer')
        cfg['device'] = 'cuda:0' if _use_gpu() else 'cpu'
        cfg['predictor']['beamsearch'] = False
        _viet_w = os.environ.get("VIETOCR_WEIGHTS", "")
        if _viet_w:
            cfg['weights'] = _viet_w
            print(f"➡️  VietOCR dùng weights fine-tune: {_viet_w}")
        _recognizer = Predictor(cfg)
        print("✅ VietOCR sẵn sàng")
    return _recognizer

def _patch_paddle_no_ir_optim():
    """Tắt IR optim trên config inference của paddle.
    Một số CPU (Colab, HF cpu-basic) thiếu tập lệnh AVX mà pass tối ưu
    (vd SelfAttentionFusePass) dùng -> paddle crash `Illegal instruction (SIGILL)`.
    Tắt ir_optim bỏ qua các pass đó, chạy được trên mọi CPU (chậm hơn không đáng kể)."""
    import paddle.inference as pi
    if getattr(pi, "_th_no_ir", False):
        return
    _orig = pi.create_predictor
    def _patched(cfg):
        try: cfg.switch_ir_optim(False)
        except Exception: pass
        return _orig(cfg)
    pi.create_predictor = _patched
    pi._th_no_ir = True

def get_paddle():
    global _paddle_ocr
    if _paddle_ocr is None:
        _patch_paddle_no_ir_optim()
        from paddleocr import PaddleOCR
        det = os.environ.get("PADDLE_DET_DIR",  "") or None
        rec = os.environ.get("PADDLE_REC_DIR",  "") or None
        dic = os.environ.get("PADDLE_REC_DICT", "") or None
        # chỉ bật GPU cho paddle nếu bản paddle được biên dịch kèm CUDA
        pgpu = False
        if _use_gpu():
            try:
                import paddle; pgpu = bool(paddle.is_compiled_with_cuda())
            except Exception:
                pgpu = False
        kw = dict(use_angle_cls=True, lang='vi', show_log=False, use_gpu=pgpu)
        if det: kw['det_model_dir']      = det
        if rec: kw['rec_model_dir']      = rec
        if dic: kw['rec_char_dict_path'] = dic
        _paddle_ocr = PaddleOCR(**kw)
        print("✅ PaddleOCR sẵn sàng" + (" (fine-tune)" if rec or det else " (pretrain)")
              + f" [{'GPU' if pgpu else 'CPU'}]")
    return _paddle_ocr

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
                if unicodedata.category(c) != 'Mn')
    return s.replace('đ', 'd').replace('Đ', 'D').lower()   # NFD không tách đ/Đ

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
    det_reader = get_det_reader()
    recognizer = get_recognizer()
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

def _group_rows(lines, tol_ratio=0.6):
    """Gom các cell thành hàng trực quan theo trùng khớp toạ độ y."""
    items = sorted(lines, key=lambda l: (l['box'][1] + l['box'][3]) / 2)
    rows = []
    for l in items:
        cy = (l['box'][1] + l['box'][3]) / 2
        h  = max(l['box'][3] - l['box'][1], 8)
        for r in rows:
            if abs(r['cy'] - cy) <= max(h, r['h']) * tol_ratio:
                r['cells'].append(l)
                r['cy'] = (r['cy'] * r['n'] + cy) / (r['n'] + 1)
                r['n'] += 1; r['h'] = max(r['h'], h)
                break
        else:
            rows.append({'cy': cy, 'h': h, 'n': 1, 'cells': [l]})
    for r in rows:
        r['cells'].sort(key=lambda l: l['box'][0])
        r['text'] = ' '.join(c['text'] for c in r['cells'])
    rows.sort(key=lambda r: r['cy'])
    return rows

def _cx(cell): return (cell['box'][0] + cell['box'][2]) / 2

def _extract_line_items(rows):
    """Trích bảng chi tiết dựa vào toạ độ cột của hàng tiêu đề."""
    hi, cols = None, None
    for i, r in enumerate(rows):
        j = _strip(r['text'])
        has_desc = any(k in j for k in ('noi dung', 'ten hang', 'dien giai', 'san pham', 'hang hoa', 'ten')) or 'stt' in j
        if has_desc and ('thanh tien' in j or 'don gia' in j):
            cols = {}
            for c in r['cells']:
                t = _strip(c['text']); x = _cx(c)
                if 'thanh tien' in t or 'thanh tiên' in t: cols['totalPrice'] = x
                elif 'don gia' in t:                        cols['unitPrice']  = x
                elif t in ('sl',) or 'so luong' in t:       cols['quantity']   = x
                elif 'dvt' in t or 'don vi' in t:           cols['unit']       = x
                elif any(k in t for k in ('noi dung','ten hang','dien giai','san pham','hang hoa','ten','stt')):
                    cols.setdefault('description', x)
            if 'totalPrice' in cols and ('description' in cols or 'unitPrice' in cols):
                hi = i; break
    if hi is None:
        return []

    STOP = ('cong tien hang', 'cong tien', 'tong cong', 'tong tien', 'thue suat',
            'tien thue', 'thanh toan', 'nguoi mua', 'nguoi ban', 'bang chu')
    items = []
    for r in rows[hi + 1:]:
        j = _strip(r['text'])
        if any(s in j for s in STOP):
            break
        if not r['cells']:
            continue
        # gán mỗi cell vào cột gần nhất theo x
        bucket = {k: [] for k in cols}
        for c in r['cells']:
            k = min(cols, key=lambda kk: abs(_cx(c) - cols[kk]))
            bucket[k].append(c)

        def num_col(key):
            """Cột số: chọn ô có SỐ gần tâm cột nhất (KHÔNG nối nhiều ô -> tránh dính số)."""
            if key not in cols: return None
            best, bd = None, 1e9
            for c in bucket.get(key, []):
                v = _num(c['text'])
                if v is None: continue
                d = abs(_cx(c) - cols[key])
                if d < bd: bd, best = d, v
            return best

        desc = ' '.join(c['text'] for c in bucket.get('description', [])).strip()
        desc = re.sub(r'^\s*\d+\s+', '', desc)      # bỏ số thứ tự đầu dòng
        qty   = num_col('quantity')
        up    = num_col('unitPrice')
        tp    = num_col('totalPrice')
        unit  = ' '.join(c['text'] for c in bucket.get('unit', [])).strip()
        # bỏ hàng rác: cần có mô tả chữ + ít nhất 1 số tiền
        if len(re.sub(r'[^A-Za-zÀ-ỹ]', '', desc)) < 2:
            continue
        if tp is None and up is None:
            continue
        item = {'description': desc, 'unit': unit or None,
                'quantity': qty, 'unitPrice': up, 'totalPrice': tp}
        items.append(item)
    return items

def parse_invoice_vietocr(lines):
    """Bóc tách trường + bảng chi tiết từ 'lines' [{text, box:[x0,y0,x1,y1], prob}].
    Dùng chung cho cả pipeline VietOCR và PaddleOCR. Trả (raw, fields, line_items)."""
    raw    = '\n'.join(l['text'] for l in lines)
    rows   = _group_rows(lines)
    fields = {'currency': 'VND'}

    def value_after(label_keys, row):
        """Lấy giá trị sau nhãn: phần sau ':' cùng cell, hoặc các cell bên phải cùng hàng."""
        for c in row['cells']:
            if any(k in _strip(c['text']) for k in label_keys):
                after = c['text'].split(':', 1)
                if len(after) > 1 and after[1].strip():
                    return after[1].strip(), c
                right = [x for x in row['cells'] if x['box'][0] > c['box'][2] - 3]
                if right:
                    return ' '.join(x['text'] for x in right).strip(), c
                return '', c
        return None, None

    def row_number_after(label_keys, min_val=None):
        """Số nằm bên phải nhãn (cùng hàng) — cho các dòng tiền tổng."""
        for r in rows:
            if not any(k in _strip(r['text']) for k in label_keys):
                continue
            lbl = next((c for c in r['cells'] if any(k in _strip(c['text']) for k in label_keys)), None)
            best = None
            for c in r['cells']:
                if lbl and c['box'][0] < lbl['box'][2] - 3: continue
                if '%' in c['text']: continue
                v = _last_number(c['text'])
                if v is not None and (min_val is None or v >= min_val):
                    best = v
            if best is not None:
                return best
        return None

    # ── Tên người bán ──
    for r in rows:
        v, _ = value_after(('ben ban', 'don vi ban', 'nha cung cap', 'nguoi ban'), r)
        if v and _strip(v) not in ('', 'nguoi ban hang'):
            fields['sellerName'] = v; break
    # ── Tên người mua / đơn vị mua ──
    for r in rows:
        v, _ = value_after(('ten don vi', 'don vi mua', 'ho ten nguoi mua', 'nguoi mua hang', 'ten khach hang'), r)
        if v:
            fields['buyerName'] = v; break

    # ── Mã số thuế: đầu tiên = người bán, kế tiếp = người mua ──
    tax_codes = []
    for r in rows:
        if 'ma so thue' in _strip(r['text']) or 'mst' in _strip(r['text']):
            mm = re.search(r'\d{10}(?:-\d{3})?', r['text'])
            if mm: tax_codes.append(mm.group(0))
    if tax_codes: fields['sellerTaxCode'] = tax_codes[0]
    if len(tax_codes) > 1: fields['buyerTaxCode'] = tax_codes[1]

    # ── Số hoá đơn ──
    for r in rows:
        v, _ = value_after(('so:', 'so hoa don', 'so hd', 'so ct', 'invoice no', 'number'), r)
        if v is None:
            m = re.search(r'\bs[oố]\s*:\s*([A-Za-z0-9/\-]{3,20})', r['text'], re.I)
            if m: fields['invoiceNumber'] = m.group(1).strip('(): '); break
            continue
        mm = re.search(r'([A-Za-z0-9/\-]{3,20})', v)
        if mm and not mm.group(1).replace('-', '').isalpha():
            fields['invoiceNumber'] = mm.group(1); break

    # ── Ngày hoá đơn ──
    m = re.search(r'ng[aà]y\s*(\d{1,2}).{0,10}?th[aá]ng\s*(\d{1,2}).{0,10}?n[aă]m\s*(\d{4})', raw, re.I | re.DOTALL)
    if not m:
        m = re.search(r'\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b', raw)
    if m:
        d, mo, y = m.groups()
        fields['invoiceDate'] = f"{y}-{int(mo):02d}-{int(d):02d}"

    # ── Thuế suất (%) ──
    m = re.search(r'thu[eế]\s*su[aấ]t[^%\d]*(\d{1,2})\s*%', raw, re.I)
    if m: fields['taxRate'] = int(m.group(1))

    # ── Tiền: cộng tiền hàng / tiền thuế / tổng thanh toán ──
    fields['subtotal']    = row_number_after(('cong tien hang', 'tien hang', 'thanh tien chua thue', 'subtotal'))
    fields['taxAmount']   = row_number_after(('tien thue gtgt', 'tien thue', 'thue gtgt'))
    fields['totalAmount'] = row_number_after(('tong cong tien thanh toan', 'tong tien thanh toan',
                                              'tong thanh toan', 'tong cong', 'total'))

    # ── Fallback khi nhãn bị mộc/nhiễu che ──
    sub, tax, tot = fields.get('subtotal'), fields.get('taxAmount'), fields.get('totalAmount')
    if tot is None and sub is not None and tax is not None:
        fields['totalAmount'] = sub + tax
    if fields.get('taxRate') is None and sub and tax:
        fields['taxRate'] = round(tax / sub * 100)

    # ── Bảng chi tiết ──
    line_items = _extract_line_items(rows)
    return raw, fields, line_items

def extract_vietocr(url):
    content  = _download(url)
    images   = _to_images(content)
    all_lines = []
    for im in images:
        all_lines += _ocr_image(im)
    raw, fields, line_items = parse_invoice_vietocr(all_lines)
    probs = [l['prob'] for l in all_lines] or [0.0]
    return raw, fields, line_items, round(float(statistics.mean(probs)), 4)

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

def extract_paddle(url):
    paddle_ocr = get_paddle()
    content   = _download(url)
    images    = _to_images(content)
    all_lines = []
    for im in images:
        result = paddle_ocr.ocr(np.array(im), cls=True)
        all_lines += _paddle_to_lines(result)
    raw, fields, line_items = parse_invoice_vietocr(all_lines)   # tái dùng parser
    probs = [l['prob'] for l in all_lines] or [0.0]
    return raw, fields, line_items, round(float(statistics.mean(probs)), 4)

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

def extract_gemini(url):
    content = _download(url)
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
    return {"status": "ok", "engines": list(ENGINES.keys())}

@app.post("/extract")
def extract(req: ExtractReq, x_api_key: str = Header(default="")):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(401, "Sai X-API-Key")
    runner = ENGINES.get(req.model, extract_gemini)
    try:
        raw, fields, line_items, confidence = runner(req.fileUrl)
        return {"status": "DONE", "confidence": confidence,
                "rawText": raw, "fields": fields, "lineItems": line_items, "model": req.model}
    except Exception as e:
        return {"status": "FAILED", "errorMessage": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
