"""
Sinh dataset hóa đơn GTGT tiếng Việt TỔNG HỢP (synthetic) cho fine-tune OCR.

Vì không có dữ liệu gán nhãn thật, script này TỰ render hóa đơn giả và TỰ ghi lại
toạ độ + nội dung từng ô chữ. Nhờ đó xuất ra CẢ HAI loại nhãn, không cần gán tay:

  dataset/
    det/  images/inv_00001.jpg     + train_label.txt / val_label.txt   (cho Paddle DET)
    rec/  images/inv_00001_00.jpg  + train.txt / val.txt               (cho VietOCR & Paddle REC)
    dict_vi.txt                                                        (bảng ký tự cho Paddle REC)

Cách chạy (Colab hoặc local):
    python make_dataset.py --n 400 --out ./dataset --fonts /usr/share/fonts/truetype/dejavu

Gợi ý font hỗ trợ tiếng Việt:
  - Colab/Linux:  /usr/share/fonts/truetype/dejavu   (DejaVuSans.ttf có sẵn)
  - Windows:      C:\\Windows\\Fonts (arial.ttf, times.ttf, tahoma.ttf ...)
Trộn thêm ảnh/dòng hóa đơn THẬT vào sau sẽ nâng chất lượng rõ rệt.
"""
import os, io, json, math, random, argparse, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

try:
    import cv2
    _HAS_CV2 = True
except ImportError:
    _HAS_CV2 = False   # nghiêng/méo phối cảnh cần opencv; thiếu thì bỏ qua phần warp

# ───────────────────────── Ngân hàng nội dung (để random) ─────────────────────────
COMPANIES = [
    "CÔNG TY TNHH THƯƠNG MẠI {}", "CÔNG TY CỔ PHẦN {}", "CÔNG TY TNHH MTV {}",
    "DOANH NGHIỆP TƯ NHÂN {}", "CÔNG TY TNHH DỊCH VỤ {}",
]
BRANDS = ["MINH PHÁT", "AN KHANG", "HOÀNG GIA", "THÀNH ĐẠT", "PHÚ THỊNH", "ĐẠI DƯƠNG",
          "TÂN TIẾN", "VIỆT LONG", "SƠN HÀ", "BÌNH MINH", "HỒNG PHÚC", "NAM SƠN",
          "TRƯỜNG SƠN", "KIM LONG", "ĐÔNG Á", "PHƯƠNG NAM"]
STREETS = ["Nguyễn Trãi", "Lê Lợi", "Trần Hưng Đạo", "Hai Bà Trưng", "Giải Phóng",
           "Cầu Giấy", "Nguyễn Văn Cừ", "Phạm Văn Đồng", "Trường Chinh", "Láng Hạ"]
CITIES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Bắc Ninh", "Hưng Yên"]
PRODUCTS = [
    "Xi măng PCB40", "Thép hộp mạ kẽm", "Sơn nước ngoại thất", "Gạch ốp lát 60x60",
    "Ống nhựa PVC D110", "Dây điện Cadivi 2.5", "Bóng đèn LED 18W", "Bàn làm việc gỗ MDF",
    "Ghế xoay văn phòng", "Máy in Canon 2900", "Giấy A4 Double A", "Mực in HP 12A",
    "Bình nước nóng 20L", "Quạt trần Panasonic", "Máy lạnh Daikin 1.5HP", "Tủ tài liệu sắt",
    "Camera an ninh 4MP", "Ổ cứng SSD 512GB", "Bàn phím cơ", "Chuột không dây",
]
UNITS = ["Cái", "Bộ", "Chiếc", "Kg", "Tấn", "Mét", "Hộp", "Thùng", "Cuộn", "Lít"]
PAYMENTS = ["Tiền mặt", "Chuyển khoản", "TM/CK"]

def money(n):
    return f"{int(n):,}".replace(",", ".")

def rand_mst():
    base = "".join(random.choice("0123456789") for _ in range(10))
    return base + ("-" + "".join(random.choice("0123456789") for _ in range(3)) if random.random() < 0.3 else "")

# ───────────────────────── Font ─────────────────────────
def load_fonts(font_dir):
    paths = []
    if font_dir:
        paths = glob.glob(os.path.join(font_dir, "*.ttf")) + glob.glob(os.path.join(font_dir, "*.TTF"))
    if not paths:
        for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                  "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/times.ttf",
                  "C:/Windows/Fonts/tahoma.ttf", "C:/Windows/Fonts/segoeui.ttf"]:
            if os.path.exists(p):
                paths.append(p)
    paths = sorted(set(os.path.normcase(p) for p in paths))   # bỏ trùng (Windows *.ttf/*.TTF)
    if not paths:
        raise SystemExit("❌ Không tìm thấy font .ttf. Truyền --fonts <thư mục font hỗ trợ tiếng Việt>.")
    print(f"✅ Dùng {len(paths)} font: {[os.path.basename(p) for p in paths]}")
    return paths

def _bold(fp):
    b = fp.replace(".ttf", "-Bold.ttf").replace(".TTF", "-Bold.ttf")
    if os.path.exists(b):
        return b
    for cand in [fp.replace("arial", "arialbd"), fp.replace("times", "timesbd"),
                 fp.replace("tahoma", "tahomabd")]:
        if os.path.exists(cand):
            return cand
    return fp  # không có bold -> dùng regular

# ───────────────────────── Augment "giống scan/chụp thật" ─────────────────────────
def make_paper(W, H):
    """Nền giấy: hơi ngả vàng + vân nhiễu nhẹ."""
    base = random.randint(236, 252)
    arr = np.full((H, W, 3), base, np.int16)
    arr += np.random.normal(0, 3.0, (H, W, 1)).astype(np.int16)   # vân giấy
    arr[:, :, 2] -= random.randint(0, 7)                          # ngả vàng nhẹ
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def _star(cx, cy, ro, ri, n=5):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.pi / 2 + i * math.pi / n
        pts.append((cx + r * math.cos(a), cy - r * math.sin(a)))
    return pts

def _paste_char(base, ch, font, color, cx, cy, rot_deg):
    s = font.size * 2
    tmp = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(tmp).text((s / 2, s / 2), ch, font=font, fill=color, anchor="mm")
    tmp = tmp.rotate(rot_deg, resample=Image.BICUBIC, expand=False)
    base.alpha_composite(tmp, (int(cx - s / 2), int(cy - s / 2)))

def _arc_text(base, cx, cy, r, text, font, color, top=True, span_deg=None):
    if not text:
        return
    n = len(text)
    if span_deg is None:
        span_deg = min(300, n * 13)
    per = math.radians(span_deg) / max(1, n)
    for i, ch in enumerate(text):
        a = (i - (n - 1) / 2) * per
        if top:
            x, y, rot = cx + r * math.sin(a), cy - r * math.cos(a), -math.degrees(a)
        else:
            x, y, rot = cx + r * math.sin(a), cy + r * math.cos(a), math.degrees(a)
        _paste_char(base, ch, font, color, x, y, rot)

def make_stamp(seller, mst, font_path):
    """Dấu mộc tròn đỏ: 2 vòng + sao 5 cánh + TÊN CÔNG TY đầy đủ (cong trên) + MST (cong dưới)."""
    S = 340
    stamp = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(stamp)
    red = (198, 26, 30, 205)
    d.ellipse([8, 8, S - 8, S - 8], outline=red, width=6)
    d.ellipse([34, 34, S - 34, S - 34], outline=red, width=2)
    d.polygon(_star(S / 2, S / 2, 40, 17), fill=red)

    top_text = seller.upper()
    fs = 24 if len(top_text) <= 18 else (19 if len(top_text) <= 28 else 15)
    _arc_text(stamp, S / 2, S / 2, S / 2 - 26, top_text,
              ImageFont.truetype(font_path, fs), red, top=True)
    bot = f"MST: {mst}"
    _arc_text(stamp, S / 2, S / 2, S / 2 - 26, bot,
              ImageFont.truetype(font_path, 20), red, top=False, span_deg=min(150, len(bot) * 12))
    return stamp

def add_stamp(img, cx, cy, seller, mst, font_path):
    stamp = make_stamp(seller, mst, font_path)
    scale = random.uniform(0.55, 0.8)
    stamp = stamp.resize((int(stamp.width * scale), int(stamp.height * scale)), Image.LANCZOS)
    stamp = stamp.rotate(random.uniform(-25, 25), resample=Image.BICUBIC, expand=True)
    fade = random.uniform(0.6, 0.85)                          # tính 1 lần (tránh LUT ngẫu nhiên)
    stamp.putalpha(stamp.getchannel("A").point(lambda p: int(p * fade)))
    base = img.convert("RGBA")
    base.alpha_composite(stamp, (int(cx - stamp.width / 2), int(cy - stamp.height / 2)))
    return base.convert("RGB")

def _bezier(p0, p1, p2, p3, n=26):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        x = u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0]
        y = u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
        out.append((x, y))
    return out

def _draw_stroke(d, pts, col, wmax=3):
    """Vẽ polyline với độ đậm biến thiên theo tốc độ (đi chậm -> đậm hơn)."""
    for i in range(len(pts) - 1):
        spd = math.hypot(pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1])
        w = max(1, int(round(wmax - min(wmax - 1, spd / 7))))
        d.line([pts[i], pts[i+1]], fill=col, width=w)

def add_signature(img, x0, y0, w, h):
    """Chữ ký tay: chuỗi Bézier nối nhau + vòng lặp (viết thảo) + hoa tay cuối."""
    d = ImageDraw.Draw(img)
    col = random.choice([(20, 35, 120), (15, 15, 15), (35, 35, 95)])
    wmax = random.choice([2, 3, 3])
    cy = y0 + h * 0.55
    baseline = random.uniform(-0.12, 0.06)                    # hơi dốc lên/xuống
    x = x0 + w * 0.04

    # 1) Vòng mở đầu (như chữ hoa) — một loop lớn
    r = h * random.uniform(0.28, 0.42)
    loop = _bezier((x, cy),
                   (x - r*0.4, cy - r*1.6),
                   (x + r*1.5, cy - r*1.7),
                   (x + r*1.2, cy), 22)
    _draw_stroke(d, loop, col, wmax)
    x = x + r * 1.2

    # 2) Thân chữ ký: nhiều đoạn Bézier nối nhau, thỉnh thoảng tạo vòng
    prev = (x, cy)
    k = random.randint(3, 5)
    seg_w = (x0 + w * 0.9 - x) / k
    for i in range(k):
        nx = prev[0] + seg_w
        ny = cy + random.uniform(-h*0.28, h*0.28) + (i/k) * h * baseline
        overshoot = random.random() < 0.45                    # vòng cuộn
        c1 = (prev[0] + seg_w*0.3, prev[1] + random.uniform(-h*0.7, h*0.7) * (1.6 if overshoot else 1))
        c2 = (prev[0] + seg_w*0.7, ny + random.uniform(-h*0.7, h*0.7) * (1.6 if overshoot else 1))
        _draw_stroke(d, _bezier(prev, c1, c2, (nx, ny)), col, wmax)
        prev = (nx, ny)

    # 3) Hoa tay cuối: nét quét dài về sau, hơi cong
    end = (prev[0], prev[1])
    fl = _bezier(end,
                 (end[0] - w*0.25, end[1] + h*random.uniform(0.1, 0.4)),
                 (x0 + w*0.2,  end[1] + h*random.uniform(0.2, 0.5)),
                 (x0 + w*random.uniform(0.05, 0.35), end[1] + h*random.uniform(-0.1, 0.25)), 30)
    _draw_stroke(d, fl, col, max(1, wmax - 1))

    if random.random() < 0.35:                                # dấu chấm/nhấn
        dx, dy = x0 + w*random.uniform(0.5, 0.85), y0 + h*random.uniform(0.15, 0.4)
        d.ellipse([dx-2, dy-2, dx+2, dy+2], fill=col)
    return img

def warp_perspective(img, ann):
    """Nghiêng + méo phối cảnh; transform luôn toạ độ box để nhãn vẫn khớp."""
    if not _HAS_CV2:
        return img, ann
    W, H = img.width, img.height
    ang = math.radians(random.uniform(-3.5, 3.5))
    ca, sa, cx, cy = math.cos(ang), math.sin(ang), W / 2, H / 2
    R = np.array([[ca, -sa, cx - ca * cx + sa * cy],
                  [sa,  ca, cy - sa * cx - ca * cy],
                  [0,   0,  1]], np.float32)
    m = 0.028
    src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    dst = np.float32([[W * random.uniform(0, m),     H * random.uniform(0, m)],
                      [W * (1 - random.uniform(0, m)), H * random.uniform(0, m)],
                      [W * (1 - random.uniform(0, m)), H * (1 - random.uniform(0, m))],
                      [W * random.uniform(0, m),       H * (1 - random.uniform(0, m))]])
    Hm = cv2.getPerspectiveTransform(src, dst) @ R
    border = tuple(int(v) for v in np.array(img)[2, 2])
    out = cv2.warpPerspective(np.array(img), Hm, (W, H),
                              borderMode=cv2.BORDER_CONSTANT, borderValue=border)
    new_ann = []
    for pts, text in ann:
        p = np.array(pts, np.float32).reshape(-1, 1, 2)
        q = cv2.perspectiveTransform(p, Hm).reshape(-1, 2)
        new_ann.append(([[float(x), float(y)] for x, y in q], text))
    return Image.fromarray(out), new_ann

def camera_noise(img):
    """Ánh sáng không đều + nhiễu cảm biến + mờ nhẹ (không dịch box)."""
    arr = np.array(img).astype(np.float32)
    H, W = arr.shape[:2]
    # gradient ánh sáng chéo
    gx = np.linspace(random.uniform(0.85, 1.0), random.uniform(1.0, 1.12), W)
    gy = np.linspace(random.uniform(0.9, 1.0), random.uniform(1.0, 1.08), H)
    light = np.outer(gy, gx)[:, :, None]
    arr *= light
    arr += np.random.normal(0, random.uniform(2, 7), arr.shape)   # nhiễu cảm biến
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    if random.random() < 0.5:
        img = img.filter(ImageFilter.GaussianBlur(random.uniform(0.4, 1.1)))
    return img

def add_fold(img):
    """Bóng nếp gập giấy: dải tối mềm + vệt sáng ở tâm nếp."""
    arr = np.array(img).astype(np.float32)
    H, W = arr.shape[:2]
    for _ in range(random.randint(1, 2)):
        if random.random() < 0.55:                    # gập dọc
            pos = int(W * random.uniform(0.25, 0.75)); sig = W * 0.02
            band = np.exp(-((np.arange(W) - pos) ** 2) / (2 * sig ** 2))
            arr *= (1 - band * random.uniform(0.14, 0.3))[None, :, None]
            arr[:, max(0, pos - 1):pos + 1, :] += random.uniform(6, 14)
        else:                                         # gập ngang
            pos = int(H * random.uniform(0.25, 0.75)); sig = H * 0.02
            band = np.exp(-((np.arange(H) - pos) ** 2) / (2 * sig ** 2))
            arr *= (1 - band * random.uniform(0.14, 0.3))[:, None, None]
            arr[max(0, pos - 1):pos + 1, :, :] += random.uniform(6, 14)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def add_ink(img):
    """Vệt mực lem: cụm nhoè bất đối xứng, lõi đậm + đuôi kéo (như bị quệt tay)."""
    d = ImageDraw.Draw(img, "RGBA")
    W, H = img.size
    tone = random.choice([(15, 15, 20), (20, 25, 70)])           # đen hoặc xanh mực
    for _ in range(random.randint(1, 3)):
        x, y = random.randint(60, W - 80), random.randint(80, H - 60)
        ang = random.uniform(0, 6.28); L = random.randint(14, 55)
        for k in range(random.randint(3, 6)):        # nhiều đốm chồng nhau dọc theo hướng quệt
            t = k / 5.0
            cxk = x + math.cos(ang) * L * t + random.uniform(-3, 3)
            cyk = y + math.sin(ang) * L * t + random.uniform(-3, 3)
            rw = random.uniform(3, 9) * (1 - 0.5 * t); rh = random.uniform(2, 5) * (1 - 0.5 * t)
            a = int((110 if k == 0 else 70) * (1 - 0.6 * t))
            d.ellipse([cxk - rw, cyk - rh, cxk + rw, cyk + rh], fill=tone + (a,))
    return img

def add_watermark(img, font_path):
    """Watermark 'BẢN SAO'/'COPY' xám mờ, chéo, lặp lại."""
    W, H = img.size
    txt = random.choice(["BẢN SAO", "COPY", "BẢN SAO - COPY", "BẢN GỐC"])
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    f = ImageFont.truetype(font_path, int(H * random.uniform(0.09, 0.14)))
    g = random.randint(110, 160); alpha = random.randint(38, 70)
    step = int(H * 0.32)
    for row, yy in enumerate(range(int(H * 0.15), H, step)):
        off = (row % 2) * int(W * 0.25)
        for xx in range(-int(W * 0.1) + off, W, int(W * 0.55)):
            d.text((xx, yy), txt, font=f, fill=(g, g, g, alpha))
    ov = ov.rotate(random.uniform(20, 40), resample=Image.BICUBIC, expand=False)
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def _octave_noise(CH, CW, scale):
    """Nhiễu mượt bằng cách phóng to nhiễu thô (giả Perlin)."""
    sh, sw = max(2, CH // scale), max(2, CW // scale)
    small = np.random.normal(0, 1, (sh, sw)).astype(np.float32)
    if _HAS_CV2:
        return cv2.resize(small, (CW, CH), interpolation=cv2.INTER_CUBIC)
    return np.array(Image.fromarray(small).resize((CW, CH), Image.BICUBIC))

def make_desk(CW, CH):
    """Mặt bàn thật hơn: nhiều tầng nhiễu + vân gỗ dọc thớ + hạt mịn + vignette + hơi mờ (DoF)."""
    wood = random.random() < 0.6
    if wood:
        base = np.array([random.randint(120, 165), random.randint(85, 120), random.randint(55, 85)], np.float32)
    else:
        g = random.randint(90, 175)
        base = np.array([g, g, g], np.float32) + np.random.uniform(-8, 8, 3)
    arr = np.tile(base, (CH, CW, 1))

    # Nhiều tầng nhiễu -> loang màu tự nhiên
    blob = sum(_octave_noise(CH, CW, s) * w for s, w in [(3, 10), (8, 7), (20, 4)])
    arr += blob[:, :, None]

    if wood:
        # Vân gỗ: nhiễu kéo dài theo 1 phương (thớ gỗ) + vài đường thớ đậm
        streak = np.random.normal(0, 1, (CH, CW)).astype(np.float32)
        if _HAS_CV2:
            vertical = random.random() < 0.5
            streak = cv2.GaussianBlur(streak, (0, 0),
                                      sigmaX=2.5 if vertical else 40,
                                      sigmaY=40 if vertical else 2.5)
        arr += (streak * random.uniform(14, 24))[:, :, None]
        arr[:, :, 0] += 6; arr[:, :, 2] -= 4          # ngả ấm

    # Hạt mịn cảm biến
    arr += np.random.normal(0, 3.5, (CH, CW, 3))

    # Vignette (tối dần ra mép)
    yy, xx = np.linspace(-1, 1, CH)[:, None], np.linspace(-1, 1, CW)[None, :]
    vig = 1 - 0.35 * np.clip(xx ** 2 + yy ** 2, 0, 1)
    arr *= vig[:, :, None]

    desk = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return desk.filter(ImageFilter.GaussianBlur(random.uniform(1.2, 2.6)))  # hậu cảnh out-of-focus

def add_finger(img, edge):
    """Ngón cái giữ giấy: khối trụ có sáng-tối + móng + bóng đổ (tip hướng vào trong)."""
    W, H = img.size
    fh = random.randint(int(H * 0.34), int(H * 0.58))
    fw = random.randint(int(min(W, H) * 0.1), int(min(W, H) * 0.15))
    skin = np.array(random.choice([(233, 197, 165), (214, 172, 137), (188, 143, 111)]), np.float32)

    # Tô bóng khối trụ: sáng ở giữa, tối ở mép (theo trục ngang) + gốc hơi tối
    xs = np.linspace(-1, 1, fw)
    cyl = 0.45 + 0.7 * np.sqrt(np.clip(1 - xs ** 2, 0, 1))           # tiết diện trụ
    length = np.linspace(1.02, 0.82, fh)[:, None]                    # gốc tối dần
    rgb = np.clip(skin[None, None, :] * (cyl[None, :, None] * length[:, :, None]), 0, 255).astype(np.uint8)
    finger = Image.fromarray(rgb, "RGB").convert("RGBA")

    a = Image.new("L", (fw, fh), 0)
    ImageDraw.Draw(a).rounded_rectangle([0, 0, fw - 1, fh - 1], radius=fw // 2, fill=255)
    finger.putalpha(a)
    fd = ImageDraw.Draw(finger)                                      # móng ở tip (đục, sáng hơn da)
    nail = tuple(int(min(255, c * 1.22)) for c in skin) + (255,)
    fd.ellipse([fw * 0.24, fh * 0.03, fw * 0.76, fh * 0.2], fill=nail)

    rot = {"left": -90, "right": 90, "bottom": 0}[edge]
    finger = finger.rotate(rot + random.uniform(-8, 8), resample=Image.BICUBIC, expand=True)
    fw2, fh2 = finger.size
    if edge == "left":
        pos = (-fw2 // 3, random.randint(int(H * 0.25), int(H * 0.6)))
    elif edge == "right":
        pos = (W - 2 * fw2 // 3, random.randint(int(H * 0.25), int(H * 0.6)))
    else:
        pos = (random.randint(int(W * 0.3), int(W * 0.65)), H - 2 * fh2 // 3)

    base = img.convert("RGBA")
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))             # bóng ngón tay đổ lên giấy
    smask = finger.getchannel("A").point(lambda p: int(p * 0.5))
    shadow.paste((0, 0, 0, 255), (pos[0] + 10, pos[1] + 10), smask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(7))
    base = Image.alpha_composite(base, shadow)
    base.alpha_composite(finger.filter(ImageFilter.GaussianBlur(0.8)), pos)
    return base.convert("RGB")

def photo_background(img, ann):
    """Đặt hóa đơn lên mặt bàn + xoay/nghiêng + bóng đổ + ngón tay (giống ảnh CHỤP)."""
    if not _HAS_CV2:
        return warp_perspective(img, ann)
    W, H = img.width, img.height
    M = int(min(W, H) * random.uniform(0.14, 0.3))
    CW, CH = W + 2 * M, H + 2 * M
    desk = make_desk(CW, CH)

    ang = math.radians(random.uniform(-9, 9))
    ca, sa, cx, cy = math.cos(ang), math.sin(ang), CW / 2, CH / 2
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]], np.float32)
    m = 0.04
    src = np.float32([[0, 0], [W, 0], [W, H], [0, H]])
    dst = np.float32([[M + W * random.uniform(0, m),       M + H * random.uniform(0, m)],
                      [M + W * (1 - random.uniform(0, m)),  M + H * random.uniform(0, m)],
                      [M + W * (1 - random.uniform(0, m)),  M + H * (1 - random.uniform(0, m))],
                      [M + W * random.uniform(0, m),        M + H * (1 - random.uniform(0, m))]])
    # xoay quanh tâm canvas
    dstc = (dst - [cx, cy]) @ np.array([[ca, sa], [-sa, ca]], np.float32) + [cx, cy]
    Hm = cv2.getPerspectiveTransform(src, dstc.astype(np.float32))

    rgba = np.dstack([np.array(img.convert("RGB")), np.full((H, W), 255, np.uint8)])
    warp = cv2.warpPerspective(rgba, Hm, (CW, CH), flags=cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    paper, mask = warp[:, :, :3].astype(np.float32), (warp[:, :, 3:4].astype(np.float32) / 255.0)

    deskarr = np.array(desk).astype(np.float32)
    # bóng đổ dưới giấy
    sh = cv2.GaussianBlur((mask[:, :, 0] * 255).astype(np.uint8), (0, 0), 9).astype(np.float32) / 255.0
    off = random.randint(6, 16)
    shm = np.zeros_like(sh); shm[off:, off:] = sh[:-off, :-off]
    deskarr *= (1 - 0.45 * shm[:, :, None])
    comp = deskarr * (1 - mask) + paper * mask
    out = Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8))

    if random.random() < 0.6:
        out = add_finger(out, random.choice(["left", "right", "bottom"]))

    new_ann = []
    for pts, text in ann:
        p = np.array(pts, np.float32).reshape(-1, 1, 2)
        q = cv2.perspectiveTransform(p, Hm).reshape(-1, 2)
        new_ann.append(([[float(x), float(y)] for x, y in q], text))
    return out, new_ann

def augment_realistic(img, ann, font_path, meta, photo=False, marks=False):
    """Mặc định = bản SCAN nền trắng (nghiêng nhẹ + giấy + nhiễu + mộc + chữ ký).
    photo=True: thêm chế độ ảnh chụp trên bàn + ngón tay.
    marks=True: thêm watermark BẢN SAO/COPY, nếp gập, vệt mực lem."""
    sx, sy, sw, sh = meta["sign"]                     # vùng trống bên dưới "(Ký, ghi rõ họ tên)"
    if random.random() < 0.9:                         # chữ ký -> đặt trong vùng trống
        img = add_signature(img, sx, sy, sw, sh)
    if random.random() < 0.85:                        # dấu mộc: đè lệch sang phải (lộ đầu chữ ký)
        img = add_stamp(img, sx + sw * random.uniform(0.6, 0.85),
                        sy + sh * 0.5 + random.uniform(-6, 10),
                        meta["seller"], meta["mst"], font_path)
    if marks:
        if random.random() < 0.35: img = add_ink(img)
        if random.random() < 0.25: img = add_watermark(img, font_path)
        if random.random() < 0.4:  img = add_fold(img)

    if photo and random.random() < 0.45:              # ẢNH CHỤP: đặt lên bàn + ngón tay
        img, ann = photo_background(img, ann)
    else:                                             # ẢNH SCAN: chỉ nghiêng/méo nhẹ
        img, ann = warp_perspective(img, ann)
    img = camera_noise(img)
    return img, ann

# ───────────────────────── Sinh 1 hóa đơn ─────────────────────────
def build_invoice(font_paths):
    """Trả về (PIL image, list[(box4points, text)])."""
    W  = random.randint(900, 980)
    fp = random.choice(font_paths)
    fs = random.randint(19, 23)
    F  = ImageFont.truetype(fp, fs)
    FB = ImageFont.truetype(_bold(fp), fs + 2)
    FT = ImageFont.truetype(_bold(fp), fs + 8)

    # ── Nội dung random ──
    seller = random.choice(COMPANIES).format(random.choice(BRANDS))
    addr   = f"Số {random.randint(1,300)} {random.choice(STREETS)}, {random.choice(CITIES)}"
    mst    = rand_mst()
    sym    = f"{random.randint(1,4)}C{random.randint(23,26)}T{random.choice('ABEK')}"
    no     = f"{random.randint(0, 999999):06d}"
    d, mo, yr = random.randint(1, 28), random.randint(1, 12), random.randint(2023, 2026)

    rows = []
    for i in range(random.randint(2, 7)):
        qty   = random.randint(1, 60)
        price = random.choice([10, 15, 20, 25, 50, 75, 100, 150, 200, 350, 500]) * 1000
        rows.append((i + 1, random.choice(PRODUCTS), random.choice(UNITS), qty, price, qty * price))
    subtotal = sum(r[5] for r in rows)
    rate = random.choice([5, 8, 10])
    tax  = round(subtotal * rate / 100)
    total = subtotal + tax

    # ── Lên danh sách phần tử (x, y, text, font) + đường kẻ ──
    cx = [42, 92, 430, 500, 590, 700]     # STT | Tên | ĐVT | SL | Đơn giá | Thành tiền
    elems, hlines = [], []
    y = 24
    elems.append((W // 2 - 175, y, "HÓA ĐƠN GIÁ TRỊ GIA TĂNG", FT)); y += 44
    elems.append((W // 2 - 90, y, f"Ký hiệu: {sym}", F)); y += 26
    elems.append((W // 2 - 55, y, f"Số: {no}", F)); y += 28
    elems.append((40, y, f"Ngày {d} tháng {mo} năm {yr}", F)); y += 34
    elems.append((40, y, "Đơn vị bán hàng: " + seller, FB)); y += 30
    elems.append((40, y, "Mã số thuế: " + mst, F)); y += 26
    elems.append((40, y, "Địa chỉ: " + addr, F)); y += 26
    elems.append((40, y, "Hình thức thanh toán: " + random.choice(PAYMENTS), F)); y += 36

    hlines.append(y - 4)
    for h, x in zip(["STT", "Tên hàng hóa, dịch vụ", "ĐVT", "SL", "Đơn giá", "Thành tiền"], cx):
        elems.append((x, y, h, FB))
    y += 30
    hlines.append(y - 4)
    for stt, name, unit, qty, price, amt in rows:
        elems += [(cx[0], y, str(stt), F), (cx[1], y, name, F), (cx[2], y, unit, F),
                  (cx[3], y, str(qty), F), (cx[4], y, money(price), F), (cx[5], y, money(amt), F)]
        y += 28
    hlines.append(y - 2)
    y += 12

    # Tổng kết: canh số tiền ngay sau nhãn (theo độ rộng thật) để không đè nhau.
    lx = 440
    def wd(text, font): return int(font.getlength(text))
    l1 = "Cộng tiền hàng:"
    elems += [(lx, y, l1, F), (lx + wd(l1, F) + 18, y, money(subtotal), F)]; y += 28
    elems.append((lx, y, f"Thuế suất GTGT: {rate}%", F)); y += 28
    l3 = "Tiền thuế GTGT:"
    elems += [(lx, y, l3, F), (lx + wd(l3, F) + 18, y, money(tax), F)]; y += 28
    l4 = "Tổng cộng tiền thanh toán:"
    elems += [(lx, y, l4, FB), (lx + wd(l4, FB) + 18, y, money(total), FB)]; y += 44

    # Khu vực ký tên (để chỗ cho chữ ký + dấu mộc)
    elems.append((110, y, "Người mua hàng", FB))
    elems.append((W - 300, y, "Người bán hàng", FB)); y += 26
    elems.append((92, y, "(Ký, ghi rõ họ tên)", F))
    elems.append((W - 330, y, "(Ký, ghi rõ họ tên)", F)); y += 30
    sign_top = y                                       # vùng TRỐNG bên dưới nhãn để ký
    y += 92
    H = y + 16
    sign_box = (W - 320, sign_top, 210, 74)            # (x, y, w, h) chỗ ký của người bán

    # ── Vẽ thật + ghi box (trên nền giấy có vân) ──
    img = make_paper(W, H)
    draw = ImageDraw.Draw(img)
    for hy in hlines:
        draw.line([(38, hy), (W - 38, hy)], fill=(0, 0, 0), width=1)
    ann = []
    ink = (random.randint(0, 35),) * 3
    for x, yy, text, font in elems:
        if not text:
            continue
        draw.text((x, yy), text, fill=ink, font=font)
        bb = draw.textbbox((x, yy), text, font=font)
        ann.append(([[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]], text))

    return img, ann, fp, {"seller": seller, "mst": mst, "sign": sign_box}

# ───────────────────────── Main ─────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=400, help="số hóa đơn sinh ra")
    ap.add_argument("--out", default="./dataset")
    ap.add_argument("--fonts", default="", help="thư mục chứa font .ttf hỗ trợ tiếng Việt")
    ap.add_argument("--val", type=float, default=0.1, help="tỷ lệ validation")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--clean", action="store_true",
                    help="tắt augment 'giống thật' (ảnh sạch) — dùng để so sánh trong báo cáo")
    ap.add_argument("--photo", action="store_true",
                    help="thêm chế độ ẢNH CHỤP (mặt bàn + ngón tay). Mặc định: chỉ SCAN nền trắng")
    ap.add_argument("--marks", action="store_true",
                    help="thêm watermark BẢN SAO/COPY + nếp gập + vệt mực lem")
    args = ap.parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    if not args.clean and not _HAS_CV2:
        print("⚠️  Không có opencv (cv2) -> bỏ phần nghiêng/méo phối cảnh. "
              "Cài: pip install opencv-python-headless")

    fonts = load_fonts(args.fonts)
    det_img = os.path.join(args.out, "det", "images")
    rec_img = os.path.join(args.out, "rec", "images")
    os.makedirs(det_img, exist_ok=True)
    os.makedirs(rec_img, exist_ok=True)

    det_lines, rec_lines, charset = [], [], set()

    for i in range(1, args.n + 1):
        img, ann, fp, meta = build_invoice(fonts)
        if not args.clean:
            img, ann = augment_realistic(img, ann, _bold(fp), meta,
                                         photo=args.photo, marks=args.marks)
        name = f"inv_{i:05d}.jpg"
        img.save(os.path.join(det_img, name), quality=random.randint(58, 92))

        det_ann = [{"transcription": t, "points": [[int(x), int(y)] for x, y in pts]}
                   for pts, t in ann]
        det_lines.append(f"images/{name}\t{json.dumps(det_ann, ensure_ascii=False)}")

        W, H = img.width, img.height
        for j, (pts, t) in enumerate(ann):
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            x0, y0 = max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2)
            x1, y1 = min(W, int(max(xs)) + 2), min(H, int(max(ys)) + 2)
            if x1 <= x0 or y1 <= y0:
                continue
            crop = img.crop((x0, y0, x1, y1))
            if crop.width < 4 or crop.height < 4:
                continue
            cname = f"inv_{i:05d}_{j:02d}.jpg"
            crop.save(os.path.join(rec_img, cname), quality=90)
            rec_lines.append(f"images/{cname}\t{t}")
            charset.update(t)
        if i % 50 == 0:
            print(f"  ... {i}/{args.n} hóa đơn")

    def split(lines):
        random.shuffle(lines)
        k = int(len(lines) * (1 - args.val))
        return lines[:k], lines[k:]

    det_tr, det_va = split(det_lines)
    rec_tr, rec_va = split(rec_lines)

    def dump(path, lines):
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    dump(os.path.join(args.out, "det", "train_label.txt"), det_tr)
    dump(os.path.join(args.out, "det", "val_label.txt"),   det_va)
    dump(os.path.join(args.out, "rec", "train.txt"),       rec_tr)
    dump(os.path.join(args.out, "rec", "val.txt"),         rec_va)

    chars = sorted(c for c in charset if c not in ("\n", "\t"))
    dump(os.path.join(args.out, "dict_vi.txt"), chars)

    print("\n✅ XONG.")
    print(f"   DET: {len(det_tr)} train / {len(det_va)} val  ->  {args.out}/det")
    print(f"   REC: {len(rec_tr)} train / {len(rec_va)} val  ->  {args.out}/rec")
    print(f"   dict_vi.txt: {len(chars)} ký tự")

if __name__ == "__main__":
    main()
