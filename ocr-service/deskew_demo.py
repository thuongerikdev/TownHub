"""Minh hoạ thuật toán KHỬ NGHIÊNG (deskew): gom hàng TRƯỚC vs SAU khi nắn y.
Chạy tiến trình riêng (giống compare.py) -> dùng đúng env đã cài đủ thư viện.
    python deskew_demo.py --img <path> [--out /content/deskew.png]
In: SLOPE/ANGLE, ROWS_BEFORE/ROWS_AFTER, LINE_ITEMS; lưu biểu đồ ra --out."""
import argparse, os, sys, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matplotlib
matplotlib.use('Agg')                       # không cần màn hình
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import app, cv2

ap = argparse.ArgumentParser()
ap.add_argument('--img', required=True)
ap.add_argument('--out', default='/content/deskew.png')
a = ap.parse_args()

img   = cv2.imread(a.img)
pocr  = app.get_paddle()
lines = app._paddle_to_lines(pocr.ocr(img, cls=True))
cx = lambda c: (c['box'][0] + c['box'][2]) / 2
cy = lambda c: (c['box'][1] + c['box'][3]) / 2

# 1) Đo độ nghiêng từ hàng tiêu đề (khớp đường thẳng)
hc = [c for c in lines if any(k in app._strip(c['text']) for k in app._HDR_KEYS)
      or app._strip(c['text']) == 'sl']
xs = np.array([cx(c) for c in hc]); ys = np.array([cy(c) for c in hc])
slope = float(np.polyfit(xs, ys, 1)[0]) if len(hc) >= 2 else 0.0
print(f'HEADER_CELLS={len(hc)}')
print(f'SLOPE={slope:.4f} ANGLE={math.degrees(math.atan(slope)):.2f}')

# 2) Vùng bảng
hdr_y = ys.mean() if len(ys) else 0
stops = [cy(c) for c in lines if cy(c) > hdr_y and any(s in app._strip(c['text']) for s in app.STOP_KEYS)]
stop_y = min(stops) if stops else 1e9
rh = float(np.median([c['box'][3] - c['box'][1] for c in lines])) if lines else 20
tbl = [c for c in lines if hdr_y + rh * 0.4 < cy(c) < stop_y - rh * 0.2]

# 3) Cùng thuật toán gom hàng, 2 loại toạ độ y
def group(cells, yk, tol):
    out = []
    for c in sorted(cells, key=yk):
        for g in out:
            if abs(g['y'] - yk(c)) <= tol:
                g['n'].append(c); g['y'] = np.mean([yk(x) for x in g['n']]); break
        else:
            out.append({'y': yk(c), 'n': [c]})
    return out

yr = cy
yd = lambda c: cy(c) - slope * cx(c)
gb, ga = group(tbl, yr, rh * 0.6), group(tbl, yd, rh * 0.6)
print(f'ROWS_BEFORE={len(gb)} ROWS_AFTER={len(ga)}')
print(f'LINE_ITEMS={len(app.parse_invoice_vietocr(lines)[2])}')

# 4) Vẽ (tiêu đề ASCII để matplotlib khỏi thiếu font tiếng Việt)
fig, ax = plt.subplots(1, 2, figsize=(13, 5))
for a2, (t, gr, yk) in zip(ax, [('TRUOC: y tho (anh nghieng)', gb, yr),
                                 ('SAU: y - slope*x (da nan thang)', ga, yd)]):
    for gi, gp in enumerate(gr):
        for c in gp['n']:
            a2.scatter(cx(c), yk(c), s=22, color=cm.tab10(gi % 10))
    a2.set_title(f'{t}  |  {len(gr)} hang'); a2.set_xlabel('x'); a2.set_ylabel('y'); a2.invert_yaxis()
if len(xs) >= 2:
    ax[0].plot(xs, np.polyval(np.polyfit(xs, ys, 1), xs), 'r--',
               label=f'{math.degrees(math.atan(slope)):.1f} do'); ax[0].legend()
plt.tight_layout(); plt.savefig(a.out, dpi=110)
print('SAVED', a.out)
