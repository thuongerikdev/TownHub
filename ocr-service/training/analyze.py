"""
Phân tích & so sánh mô hình OCR cho báo cáo ĐATN.
So sánh 3 ENGINE trên cùng tập val: EasyOCR ↔ VietOCR ↔ PaddleOCR, kèm ENSEMBLE (kết hợp).
Chạy trên Colab SAU khi đã fine-tune + export.

Sinh 17 biểu đồ PNG (lưu vào ./analysis) + bảng số liệu + metrics_summary.csv:

  HUẤN LUYỆN (đọc train.log của Paddle)
   01. training_curve_rec.png   — Loss & Accuracy (train/val) theo bước
   02. lr_schedule.png          — Learning-rate warmup-linear theo bước
   03. before_after.png         — Seq-acc & Char-acc TRƯỚC vs SAU fine-tune (VietOCR, PaddleOCR)

  SO SÁNH 3 ENGINE (bản tốt nhất của mỗi engine)
   04. engine_bars.png          — Seq-acc / Char-acc / NED (3 engine cạnh nhau)
   05. engine_radar.png         — Radar 5 trục: Seq, Char, NED, Tốc độ, Tỉ lệ CER<0.1
   06. latency.png              — Độ trễ (ms/ảnh) & thông lượng (ảnh/giây)
   07. accuracy_vs_latency.png  — Đánh đổi chính xác ↔ tốc độ (điểm Pareto)

  PHÂN TÍCH LỖI
   08. cer_hist.png             — Phân bố CER (histogram chồng)
   09. cer_box.png              — Boxplot CER từng engine
   10. cer_cdf.png              — CDF: % mẫu có CER ≤ ngưỡng
   11. acc_by_length.png        — Char-acc theo độ dài chuỗi
   12. error_types.png          — Cơ cấu lỗi: thay thế / chèn / xoá
   13. char_errors.png          — Top ký tự bị đọc sai (mỗi engine 1 cột)
   14. confusion_pairs.png      — Top cặp nhầm lẫn (đúng → đọc thành)

  KẾT HỢP (ensemble)
   15. correct_overlap.png      — Mẫu nào engine nào đọc đúng (giao/độc lập, kiểu Venn)
   16. ensemble_gain.png        — Seq-acc từng engine vs Ensemble (vote) vs Oracle (chặn trên)
   17. summary_table.png        — Bảng tổng hợp toàn bộ chỉ số (ảnh, dán thẳng vào báo cáo)

Chỉ số:
  - Sequence accuracy : tỉ lệ đọc ĐÚNG TOÀN BỘ chuỗi (khắt khe).
  - Character accuracy: 1 - CER (CER = Levenshtein / độ dài nhãn).
  - NED               : 1 - lev/max(len) — tương đồng mức ký tự ("mềm" hơn seq-acc).
  - Latency           : mili-giây / ảnh.
  - Ensemble (vote)   : bỏ phiếu đa số theo 3 engine (hoà → ưu tiên PaddleOCR fine-tune).
  - Oracle (best-of-3): chọn đúng nếu BẤT KỲ engine nào đúng — CHẶN TRÊN, không dùng thực tế.

Ví dụ chạy:
  python analyze.py \
    --data ./dataset/rec --label ./dataset/rec/val.txt \
    --viet /content/drive/MyDrive/townhub_ocr/weights/vietocr_invoice.pth \
    --rec  /content/drive/MyDrive/townhub_ocr/inference/rec_vi \
    --dict /content/drive/MyDrive/townhub_ocr/dict_vi.txt \
    --log  /content/drive/MyDrive/townhub_ocr/output_rec_vi/train.log \
    --limit 500
"""
import os, re, csv, time, argparse, difflib
from collections import Counter
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

OUT = "./analysis"

# Màu nhất quán theo engine cho MỌI biểu đồ.
C = {
    "EasyOCR":   "#06a77d",   # xanh lá
    "VietOCR":   "#2e86ab",   # xanh dương
    "PaddleOCR": "#e07a5f",   # cam
    "Ensemble":  "#6a4c93",   # tím
    "Oracle":    "#8d5524",   # nâu
    "before":    "#b0b0b0",   # xám (bản chưa fine-tune)
}

# ════════════════════════ CHỈ SỐ ════════════════════════
def levenshtein(a, b):
    m, n = len(a), len(b)
    if m == 0: return n
    if n == 0: return m
    prev = list(range(n + 1))
    for i in range(1, m + 1):
        cur = [i] + [0] * n
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
        prev = cur
    return prev[n]

def evaluate(preds, gts):
    """Trả về đầy đủ chỉ số + dữ liệu cho phân tích lỗi (per-sample)."""
    n = len(gts)
    correct, cers, neds = [], [], []
    sub = ins = dele = 0
    char_err = Counter()   # ký tự GT bị đọc sai/mất
    conf = Counter()       # cặp (đúng -> đọc thành)
    for p, g in zip(preds, gts):
        correct.append(1.0 if p == g else 0.0)
        d = levenshtein(p, g)
        cers.append(d / max(1, len(g)))
        neds.append(1 - d / max(1, len(p), len(g)))
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, g, p).get_opcodes():
            gi, pj = i2 - i1, j2 - j1
            if tag == "replace":
                sub += min(gi, pj)
                if pj > gi: ins += pj - gi
                elif gi > pj: dele += gi - pj
                for k in range(min(gi, pj)):
                    a, b = g[i1 + k], p[j1 + k]
                    if not a.isspace():
                        char_err[a] += 1
                        conf[f"{a}→{b}"] += 1
                for ch in g[i1 + min(gi, pj):i2]:
                    if not ch.isspace(): char_err[ch] += 1
            elif tag == "delete":
                dele += gi
                for ch in g[i1:i2]:
                    if not ch.isspace(): char_err[ch] += 1
            elif tag == "insert":
                ins += pj
    return {
        "seq_acc":  float(np.mean(correct)) if n else 0.0,
        "char_acc": float(1 - np.mean(cers)) if n else 0.0,
        "ned":      float(np.mean(neds)) if n else 0.0,
        "cer_list": cers,
        "correct":  np.array(correct, dtype=bool),
        "sub": sub, "ins": ins, "del": dele,
        "char_err": char_err, "conf": conf,
        "cer_lt01": float(np.mean([c < 0.1 for c in cers])) if n else 0.0,
        "n": n,
    }

# ════════════════════════ DỮ LIỆU ════════════════════════
def load_val(data_dir, label_file, limit=None):
    samples = []
    with open(label_file, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if "\t" not in line:
                continue
            rel, gt = line.split("\t", 1)
            samples.append((os.path.join(data_dir, rel), gt))
    if limit:
        samples = samples[:limit]
    return samples

# ════════════════════════ ENGINE ════════════════════════
def run_vietocr(samples, weights=None, device="cuda:0"):
    from vietocr.tool.predictor import Predictor
    from vietocr.tool.config import Cfg
    cfg = Cfg.load_config_from_name("vgg_transformer")
    cfg["device"] = device
    cfg["predictor"]["beamsearch"] = False
    if weights:
        cfg["weights"] = weights
    pred = Predictor(cfg)
    preds, t0 = [], time.time()
    for path, _ in samples:
        try:
            preds.append((pred.predict(Image.open(path).convert("RGB")) or "").strip())
        except Exception:
            preds.append("")
    dt = (time.time() - t0) / max(1, len(samples)) * 1000
    return preds, dt

def _paddle_text(r):
    try:
        item = r[0]
        if isinstance(item, (list, tuple)) and item and isinstance(item[0], (list, tuple)):
            item = item[0]
        return (item[0] or "").strip()
    except Exception:
        return ""

def run_paddle(samples, rec_dir=None, dict_path=None, use_gpu=True):
    # Tắt fused conv+bias+act của cuDNN — kernel này segfault trên GPU Colab
    # (FusedConv2dAddActKernel) khi paddlepaddle-gpu lệch phiên bản CUDA/cuDNN.
    os.environ.setdefault("FLAGS_conv2d_disable_cudnn", "1")
    os.environ.setdefault("FLAGS_use_cudnn", "0")
    from paddleocr import PaddleOCR
    kw = dict(use_angle_cls=False, lang="vi", show_log=False, use_gpu=use_gpu)
    if rec_dir:   kw["rec_model_dir"] = rec_dir
    if dict_path: kw["rec_char_dict_path"] = dict_path
    ocr = PaddleOCR(**kw)
    preds, t0 = [], time.time()
    for path, _ in samples:
        try:
            r = ocr.ocr(np.array(Image.open(path).convert("RGB")), det=False, cls=False)
            preds.append(_paddle_text(r))
        except Exception:
            preds.append("")
    dt = (time.time() - t0) / max(1, len(samples)) * 1000
    return preds, dt

def run_easyocr(samples, use_gpu=True):
    import easyocr
    reader = easyocr.Reader(["vi"], gpu=use_gpu, verbose=False)
    preds, t0 = [], time.time()
    for path, _ in samples:
        try:
            r = reader.readtext(np.array(Image.open(path).convert("RGB")),
                                detail=0, paragraph=True)
            preds.append((" ".join(r)).strip())
        except Exception:
            preds.append("")
    dt = (time.time() - t0) / max(1, len(samples)) * 1000
    return preds, dt

# ════════════════════════ ENSEMBLE ════════════════════════
def ensemble_vote(pv, pp, pe):
    """Bỏ phiếu đa số theo từng mẫu; hoà (3 khác nhau) → ưu tiên PaddleOCR fine-tune."""
    out = []
    for a, b, c in zip(pp, pv, pe):   # thứ tự ưu tiên: Paddle, Viet, Easy
        cnt = Counter([a, b, c])
        best, freq = cnt.most_common(1)[0]
        out.append(best if freq >= 2 else a)
    return out

# ════════════════════════ ĐỌC LOG PADDLE ════════════════════════
def parse_paddle_log(path):
    steps, losses, lrs, accs = [], [], [], []
    ev_step, ev_acc = [], []
    if not path or not os.path.exists(path):
        return {}
    tr = re.compile(r"global_step: (\d+), lr: ([\d.eE+-]+), acc: ([\d.]+), norm_edit_dis: [\d.]+, .*?loss: ([\d.]+)")
    ev = re.compile(r"cur metric, acc: ([\d.]+)")
    last_step = 0
    for line in open(path, encoding="utf-8", errors="ignore"):
        m = tr.search(line)
        if m:
            last_step = int(m.group(1))
            steps.append(last_step); lrs.append(float(m.group(2)))
            accs.append(float(m.group(3))); losses.append(float(m.group(4)))
        e = ev.search(line)
        if e:
            ev_step.append(last_step); ev_acc.append(float(e.group(1)))
    return {"steps": steps, "loss": losses, "lr": lrs, "train_acc": accs,
            "ev_step": ev_step, "ev_acc": ev_acc}

# ════════════════════════ TIỆN ÍCH VẼ ════════════════════════
def _save(fig, name):
    fig.tight_layout(); fig.savefig(f"{OUT}/{name}", dpi=140); plt.close(fig)
    print("✔", name)

def _labels(ax, bars, fmt="{:.2f}", dy=0.01):
    for b in bars:
        ax.text(b.get_x() + b.get_width() / 2, b.get_height() + dy,
                fmt.format(b.get_height()), ha="center", va="bottom", fontsize=8)

# ──────────── 01. đường cong loss/acc ────────────
def fig_training_curve(log):
    if not log or not log.get("steps"):
        print("⚠️ Không đọc được train.log — bỏ qua 01/02."); return
    fig, ax1 = plt.subplots(figsize=(8, 4.5))
    ax1.plot(log["steps"], log["loss"], color="#d1495b", lw=1.3, label="Train loss")
    ax1.set_xlabel("Bước huấn luyện (global step)"); ax1.set_ylabel("Loss", color="#d1495b")
    ax1.tick_params(axis="y", labelcolor="#d1495b")
    ax2 = ax1.twinx()
    ax2.plot(log["steps"], log["train_acc"], color="#2e86ab", lw=1.0, alpha=0.6, label="Train acc")
    if log.get("ev_step"):
        ax2.plot(log["ev_step"], log["ev_acc"], "o-", color="#06a77d", lw=1.6, label="Val acc")
    ax2.set_ylabel("Accuracy", color="#2e86ab"); ax2.set_ylim(0, 1)
    ax2.tick_params(axis="y", labelcolor="#2e86ab")
    fig.suptitle("PaddleOCR (rec) — Loss & Accuracy theo bước huấn luyện")
    l1, la = ax1.get_legend_handles_labels(); l2, lb = ax2.get_legend_handles_labels()
    ax1.legend(l1 + l2, la + lb, loc="center right", fontsize=8)
    _save(fig, "training_curve_rec.png")

# ──────────── 02. learning rate ────────────
def fig_lr_schedule(log):
    if not log or not log.get("lr"):
        return
    fig, ax = plt.subplots(figsize=(8, 3.6))
    ax.plot(log["steps"], log["lr"], color="#3d348b", lw=1.5)
    ax.set_xlabel("Bước huấn luyện"); ax.set_ylabel("Learning rate")
    ax.set_title("Lịch học warmup-linear (PaddleOCR rec)")
    ax.ticklabel_format(axis="y", style="sci", scilimits=(0, 0))
    _save(fig, "lr_schedule.png")

# ──────────── 03. trước / sau fine-tune ────────────
def fig_before_after(res):
    labels = ["VietOCR", "PaddleOCR"]
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.4))
    for ax, key, title in [(axes[0], "seq_acc", "Sequence accuracy"),
                           (axes[1], "char_acc", "Character accuracy")]:
        before = [res["viet_before"][key], res["paddle_before"][key]]
        after  = [res["viet_after"][key],  res["paddle_after"][key]]
        x = np.arange(len(labels)); w = 0.35
        b1 = ax.bar(x - w/2, before, w, label="Trước fine-tune", color=C["before"])
        b2 = ax.bar(x + w/2, after,  w, label="Sau fine-tune",  color=C["PaddleOCR"])
        ax.set_xticks(x); ax.set_xticklabels(labels); ax.set_ylim(0, 1.05)
        ax.set_title(title); _labels(ax, list(b1) + list(b2))
    axes[0].legend(loc="lower right", fontsize=8)
    fig.suptitle("Tác động của fine-tune trên hoá đơn tiếng Việt")
    _save(fig, "before_after.png")

# ──────────── 04. 3 engine — bars ────────────
def fig_engine_bars(eng):
    groups = ["Seq-acc", "Char-acc", "NED"]
    keys = ["seq_acc", "char_acc", "ned"]
    names = list(eng.keys())
    x = np.arange(len(groups)); w = 0.8 / len(names)
    fig, ax = plt.subplots(figsize=(9, 4.6))
    for i, nm in enumerate(names):
        vals = [eng[nm]["m"][k] for k in keys]
        off = (i - (len(names) - 1) / 2) * w
        bars = ax.bar(x + off, vals, w, label=nm, color=C[nm])
        for b in bars:
            ax.text(b.get_x() + b.get_width()/2, b.get_height() + 0.01,
                    f"{b.get_height():.2f}", ha="center", va="bottom", fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels(groups); ax.set_ylim(0, 1.08)
    ax.set_title("So sánh 3 engine (bản tốt nhất mỗi engine)"); ax.legend(fontsize=8)
    _save(fig, "engine_bars.png")

# ──────────── 05. radar ────────────
def fig_engine_radar(eng, lat):
    axes_lbl = ["Seq-acc", "Char-acc", "NED", "Tốc độ", "CER<0.1"]
    lat_min = min(lat.values()) if lat else 1.0
    ang = np.linspace(0, 2*np.pi, len(axes_lbl), endpoint=False).tolist()
    ang += ang[:1]
    fig, ax = plt.subplots(figsize=(6.2, 6.2), subplot_kw=dict(polar=True))
    for nm in eng:
        m = eng[nm]["m"]
        speed = lat_min / max(1e-6, lat.get(nm, lat_min))   # fastest = 1
        vals = [m["seq_acc"], m["char_acc"], m["ned"], speed, m["cer_lt01"]]
        vals += vals[:1]
        ax.plot(ang, vals, color=C[nm], lw=2, label=nm)
        ax.fill(ang, vals, color=C[nm], alpha=0.12)
    ax.set_xticks(ang[:-1]); ax.set_xticklabels(axes_lbl)
    ax.set_ylim(0, 1); ax.set_title("Radar tổng hợp (mọi trục: cao = tốt)", pad=18)
    ax.legend(loc="upper right", bbox_to_anchor=(1.28, 1.10), fontsize=8)
    _save(fig, "engine_radar.png")

# ──────────── 06. latency + throughput ────────────
def fig_latency(eng, lat):
    names = list(eng.keys())
    ms = [lat.get(nm, 0) for nm in names]
    fps = [1000 / v if v else 0 for v in ms]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10, 4.2))
    b1 = a1.bar(names, ms, color=[C[n] for n in names])
    a1.set_ylabel("ms / ảnh"); a1.set_title("Độ trễ suy luận")
    _labels(a1, b1, "{:.0f}", dy=max(ms) * 0.01 if ms else 0.1)
    b2 = a2.bar(names, fps, color=[C[n] for n in names])
    a2.set_ylabel("ảnh / giây"); a2.set_title("Thông lượng")
    _labels(a2, b2, "{:.1f}", dy=max(fps) * 0.01 if fps else 0.1)
    _save(fig, "latency.png")

# ──────────── 07. accuracy vs latency ────────────
def fig_acc_latency(eng, lat):
    fig, ax = plt.subplots(figsize=(7, 5))
    for nm in eng:
        x = lat.get(nm, 0); y = eng[nm]["m"]["seq_acc"]
        ax.scatter(x, y, s=260, color=C[nm], edgecolor="white", zorder=3)
        ax.annotate(nm, (x, y), textcoords="offset points", xytext=(0, 12),
                    ha="center", fontsize=9)
    ax.set_xlabel("Độ trễ (ms/ảnh) — trái = nhanh hơn")
    ax.set_ylabel("Sequence accuracy — cao = tốt hơn")
    ax.set_title("Đánh đổi chính xác ↔ tốc độ")
    ax.grid(alpha=0.25); ax.margins(0.2)
    _save(fig, "accuracy_vs_latency.png")

# ──────────── 08. CER histogram ────────────
def fig_cer_hist(eng):
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    for nm in eng:
        ax.hist(np.clip(eng[nm]["m"]["cer_list"], 0, 1), bins=20, alpha=0.5,
                label=nm, color=C[nm])
    ax.set_xlabel("CER (0 = đọc đúng hoàn toàn)"); ax.set_ylabel("Số mẫu")
    ax.set_title("Phân bố Character Error Rate"); ax.legend()
    _save(fig, "cer_hist.png")

# ──────────── 09. CER boxplot ────────────
def fig_cer_box(eng):
    names = list(eng.keys())
    data = [np.clip(eng[nm]["m"]["cer_list"], 0, 1) for nm in names]
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    bp = ax.boxplot(data, patch_artist=True, showmeans=True)
    ax.set_xticks(range(1, len(names) + 1)); ax.set_xticklabels(names)
    for patch, nm in zip(bp["boxes"], names):
        patch.set_facecolor(C[nm]); patch.set_alpha(0.55)
    ax.set_ylabel("CER"); ax.set_title("Phân tán CER theo engine (thấp = tốt)")
    _save(fig, "cer_box.png")

# ──────────── 10. CER CDF ────────────
def fig_cer_cdf(eng):
    fig, ax = plt.subplots(figsize=(7.5, 4.5))
    for nm in eng:
        c = np.sort(np.clip(eng[nm]["m"]["cer_list"], 0, 1))
        y = np.arange(1, len(c) + 1) / len(c)
        ax.plot(c, y, lw=2, color=C[nm], label=nm)
    ax.set_xlabel("Ngưỡng CER"); ax.set_ylabel("Tỉ lệ mẫu có CER ≤ ngưỡng")
    ax.set_title("CDF của CER (đường càng dốc/trái = càng tốt)")
    ax.grid(alpha=0.25); ax.legend()
    _save(fig, "cer_cdf.png")

# ──────────── 11. accuracy theo độ dài ────────────
def fig_acc_by_length(eng, gts):
    edges = [0, 5, 10, 20, 40, 10**9]
    lbls = ["1–5", "6–10", "11–20", "21–40", "40+"]
    lengths = np.array([len(g) for g in gts])
    idx = np.digitize(lengths, edges[1:-1], right=True)
    xs = np.arange(len(lbls))
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for nm in eng:
        cer = np.array(eng[nm]["m"]["cer_list"])
        ys = []
        for b in range(len(lbls)):
            sel = idx == b
            ys.append(float(np.mean(1 - np.clip(cer[sel], 0, 1))) if sel.any() else np.nan)
        ax.plot(xs, ys, "o-", lw=2, color=C[nm], label=nm)
    counts = [int((idx == b).sum()) for b in range(len(lbls))]
    ax.set_xticks(xs)
    ax.set_xticklabels([f"{l}\n(n={c})" for l, c in zip(lbls, counts)])
    ax.set_ylabel("Char-acc (1 - CER)"); ax.set_ylim(0, 1.02)
    ax.set_xlabel("Độ dài chuỗi (số ký tự)")
    ax.set_title("Độ chính xác theo độ dài chuỗi"); ax.grid(alpha=0.25); ax.legend()
    _save(fig, "acc_by_length.png")

# ──────────── 12. cơ cấu lỗi ────────────
def fig_error_types(eng):
    names = list(eng.keys())
    sub = [eng[n]["m"]["sub"] for n in names]
    ins = [eng[n]["m"]["ins"] for n in names]
    dele = [eng[n]["m"]["del"] for n in names]
    x = np.arange(len(names)); w = 0.25
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.bar(x - w, sub,  w, label="Thay thế (sub)", color="#e07a5f")
    ax.bar(x,     ins,  w, label="Chèn (ins)",     color="#2e86ab")
    ax.bar(x + w, dele, w, label="Xoá (del)",      color="#06a77d")
    ax.set_xticks(x); ax.set_xticklabels(names)
    ax.set_ylabel("Số thao tác chỉnh sửa"); ax.set_title("Cơ cấu lỗi theo loại")
    ax.legend()
    _save(fig, "error_types.png")

# ──────────── 13. top ký tự đọc sai (mỗi engine) ────────────
def fig_char_errors(eng, topn=15):
    names = list(eng.keys())
    fig, axes = plt.subplots(1, len(names), figsize=(5 * len(names), 4.3), squeeze=False)
    for ax, nm in zip(axes[0], names):
        items = eng[nm]["m"]["char_err"].most_common(topn)
        if not items:
            ax.text(0.5, 0.5, "Gần như không lỗi", ha="center"); ax.axis("off")
        else:
            chars = [c for c, _ in items]; vals = [v for _, v in items]
            ax.bar(range(len(chars)), vals, color=C[nm])
            ax.set_xticks(range(len(chars))); ax.set_xticklabels(chars, fontsize=12)
            ax.set_ylabel("Số lần sai")
        ax.set_title(f"{nm}")
    fig.suptitle("Top ký tự bị đọc sai (thường là dấu tiếng Việt)")
    _save(fig, "char_errors.png")

# ──────────── 14. cặp nhầm lẫn ────────────
def fig_confusion_pairs(eng, topn=15):
    # gộp cặp nhầm lẫn của engine chính xác nhất để thấy lỗi hệ thống
    best = max(eng, key=lambda n: eng[n]["m"]["seq_acc"])
    items = eng[best]["m"]["conf"].most_common(topn)
    if not items:
        print("⚠️ Không có cặp nhầm lẫn — bỏ qua 14."); return
    labels = [k for k, _ in items]; vals = [v for _, v in items]
    fig, ax = plt.subplots(figsize=(9, 4.6))
    ax.barh(range(len(labels))[::-1], vals, color=C[best])
    ax.set_yticks(range(len(labels))[::-1]); ax.set_yticklabels(labels, fontsize=11)
    ax.set_xlabel("Số lần"); ax.set_title(f"Top cặp nhầm lẫn (đúng → đọc thành) — {best}")
    _save(fig, "confusion_pairs.png")

# ──────────── 15. giao tập đọc đúng ────────────
def fig_correct_overlap(eng):
    need = ["VietOCR", "PaddleOCR", "EasyOCR"]
    if not all(n in eng for n in need):
        print("⚠️ Thiếu engine cho biểu đồ giao tập — bỏ qua 15."); return
    v = eng["VietOCR"]["m"]["correct"]; p = eng["PaddleOCR"]["m"]["correct"]; e = eng["EasyOCR"]["m"]["correct"]
    cats = {
        "Cả 3 đúng":  ( v &  p &  e),
        "Viet+Paddle":( v &  p & ~e),
        "Viet+Easy":  ( v & ~p &  e),
        "Paddle+Easy":(~v &  p &  e),
        "Chỉ Viet":   ( v & ~p & ~e),
        "Chỉ Paddle": (~v &  p & ~e),
        "Chỉ Easy":   (~v & ~p &  e),
        "Cả 3 sai":   (~v & ~p & ~e),
    }
    labels = list(cats.keys()); vals = [int(m.sum()) for m in cats.values()]
    colors = [C["Ensemble"], "#4c9f70", "#4c9f70", "#4c9f70",
              C["VietOCR"], C["PaddleOCR"], C["EasyOCR"], "#cccccc"]
    fig, ax = plt.subplots(figsize=(9, 4.6))
    bars = ax.bar(labels, vals, color=colors)
    _labels(ax, bars, "{:.0f}", dy=max(vals) * 0.01 if vals else 0.1)
    ax.set_ylabel("Số mẫu đọc đúng toàn chuỗi")
    ax.set_title("Mẫu nào engine nào đọc đúng (bổ trợ lẫn nhau)")
    plt.setp(ax.get_xticklabels(), rotation=20, ha="right")
    _save(fig, "correct_overlap.png")

# ──────────── 16. lợi ích ensemble ────────────
def fig_ensemble_gain(eng, ens_m, oracle_seq):
    names = list(eng.keys())
    seqs = [eng[n]["m"]["seq_acc"] for n in names] + [ens_m["seq_acc"], oracle_seq]
    labels = names + ["Ensemble\n(vote)", "Oracle\n(best-of-3)"]
    colors = [C[n] for n in names] + [C["Ensemble"], C["Oracle"]]
    fig, ax = plt.subplots(figsize=(9, 4.6))
    bars = ax.bar(labels, seqs, color=colors)
    _labels(ax, bars)
    ax.set_ylim(0, 1.08); ax.set_ylabel("Sequence accuracy")
    ax.set_title("Kết hợp engine: vote thực tế vs oracle (chặn trên)")
    _save(fig, "ensemble_gain.png")

# ──────────── 17. bảng tổng hợp ────────────
def fig_summary_table(rows):
    header = ["Cấu hình", "Seq-acc", "Char-acc", "NED", "CER<0.1", "ms/ảnh", "n"]
    fig, ax = plt.subplots(figsize=(9, 0.5 + 0.4 * (len(rows) + 1)))
    ax.axis("off")
    tbl = ax.table(cellText=rows, colLabels=header, loc="center", cellLoc="center")
    tbl.auto_set_font_size(False); tbl.set_fontsize(9); tbl.scale(1, 1.4)
    for j in range(len(header)):
        tbl[0, j].set_facecolor("#2e86ab"); tbl[0, j].set_text_props(color="white")
    ax.set_title("Bảng tổng hợp chỉ số OCR (tập val)", pad=12)
    _save(fig, "summary_table.png")

# ════════════════════════ MAIN ════════════════════════
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data",  default="./dataset/rec")
    ap.add_argument("--label", default="./dataset/rec/val.txt")
    ap.add_argument("--viet",  default="./weights/vietocr_invoice.pth", help="weights VietOCR sau fine-tune")
    ap.add_argument("--rec",   default="", help="thư mục inference PaddleOCR rec sau fine-tune")
    ap.add_argument("--dict",  default="./dataset/dict_vi.txt")
    ap.add_argument("--log",   default="", help="train.log của PaddleOCR để vẽ đường cong")
    ap.add_argument("--limit", type=int, default=500, help="số mẫu đánh giá (val)")
    ap.add_argument("--no-easyocr", action="store_true", help="bỏ EasyOCR (nếu chưa cài)")
    ap.add_argument("--cpu",   action="store_true")
    ap.add_argument("--paddle-gpu", action="store_true",
                    help="ép PaddleOCR chạy GPU (mặc định CPU để tránh SIGSEGV ở kernel cuDNN)")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    gpu = not args.cpu
    dev = "cpu" if args.cpu else "cuda:0"

    samples = load_val(args.data, args.label, args.limit)
    gts = [g for _, g in samples]
    print(f"Đánh giá trên {len(samples)} mẫu val\n")

    res, lat = {}, {}

    # 01/02 — đường cong & learning rate
    log = parse_paddle_log(args.log)
    fig_training_curve(log)
    fig_lr_schedule(log)

    # VietOCR trước / sau
    try:
        pv0, _  = run_vietocr(samples, weights=None, device=dev); res["viet_before"] = evaluate(pv0, gts)
        pv, dv  = run_vietocr(samples, weights=args.viet, device=dev); res["viet_after"] = evaluate(pv, gts); lat["VietOCR"] = dv
    except Exception as e:
        print("⚠️ VietOCR lỗi:", e); return

    # PaddleOCR trước (pretrain 'vi') / sau (fine-tune)
    # Mặc định CPU: kernel cuDNN fused-conv của paddle-gpu hay SIGSEGV trên Colab
    # (không bắt được bằng try/except vì nó giết cả tiến trình).
    pgpu = gpu and args.paddle_gpu
    if not pgpu:
        print("ℹ️ PaddleOCR chạy CPU (dùng --paddle-gpu để ép GPU).")
    try:
        pp0, _  = run_paddle(samples, rec_dir=None, use_gpu=pgpu); res["paddle_before"] = evaluate(pp0, gts)
        if args.rec:
            pp, dp = run_paddle(samples, rec_dir=args.rec, dict_path=args.dict, use_gpu=pgpu)
            res["paddle_after"] = evaluate(pp, gts); lat["PaddleOCR"] = dp
        else:
            pp = pp0; res["paddle_after"] = res["paddle_before"]; lat["PaddleOCR"] = 0
            print("⚠️ Chưa truyền --rec → 'Paddle sau' = 'Paddle gốc'.")
    except Exception as e:
        print("⚠️ PaddleOCR lỗi:", e)
        pp = [""] * len(gts)
        res["paddle_before"] = evaluate(pp, gts); res["paddle_after"] = res["paddle_before"]; lat["PaddleOCR"] = 0

    # EasyOCR (baseline, không fine-tune)
    pe = None
    if not args.no_easyocr:
        try:
            pe, de = run_easyocr(samples, use_gpu=gpu); res["easy"] = evaluate(pe, gts); lat["EasyOCR"] = de
        except Exception as e:
            print("⚠️ EasyOCR lỗi (bỏ qua):", e); pe = None

    # Gom 3 engine "bản tốt nhất"
    eng = {
        "VietOCR":   {"preds": pv, "m": res["viet_after"]},
        "PaddleOCR": {"preds": pp, "m": res["paddle_after"]},
    }
    if pe is not None:
        eng["EasyOCR"] = {"preds": pe, "m": res["easy"]}

    # Ensemble (chỉ khi có đủ 3)
    ens_m, oracle_seq = None, None
    if pe is not None:
        ens_preds = ensemble_vote(pv, pp, pe)
        ens_m = evaluate(ens_preds, gts)
        oracle_seq = float((res["viet_after"]["correct"] |
                            res["paddle_after"]["correct"] |
                            res["easy"]["correct"]).mean())

    # ── Bảng số liệu (console) ──
    print("\n================  BẢNG SO SÁNH  ================")
    print(f"{'Cấu hình':<22}{'Seq':>8}{'Char':>8}{'NED':>8}{'CER<.1':>8}{'ms':>8}{'n':>7}")
    order = [("viet_before", "VietOCR gốc", None), ("viet_after", "VietOCR fine-tune", "VietOCR"),
             ("paddle_before", "PaddleOCR gốc", None), ("paddle_after", "PaddleOCR fine-tune", "PaddleOCR")]
    if pe is not None:
        order.append(("easy", "EasyOCR (baseline)", "EasyOCR"))
    table_rows = []
    for key, name, latkey in order:
        r = res[key]; ms = lat.get(latkey, 0) if latkey else 0
        print(f"{name:<22}{r['seq_acc']:>8.3f}{r['char_acc']:>8.3f}{r['ned']:>8.3f}{r['cer_lt01']:>8.3f}{ms:>8.0f}{r['n']:>7}")
        table_rows.append([name, f"{r['seq_acc']:.3f}", f"{r['char_acc']:.3f}",
                           f"{r['ned']:.3f}", f"{r['cer_lt01']:.3f}", f"{ms:.0f}", r["n"]])
    if ens_m is not None:
        print(f"{'Ensemble (vote)':<22}{ens_m['seq_acc']:>8.3f}{ens_m['char_acc']:>8.3f}{ens_m['ned']:>8.3f}{ens_m['cer_lt01']:>8.3f}{'-':>8}{ens_m['n']:>7}")
        print(f"{'Oracle (best-of-3)':<22}{oracle_seq:>8.3f}{'-':>8}{'-':>8}{'-':>8}{'-':>8}{len(gts):>7}")
        table_rows.append(["Ensemble (vote)", f"{ens_m['seq_acc']:.3f}", f"{ens_m['char_acc']:.3f}",
                           f"{ens_m['ned']:.3f}", f"{ens_m['cer_lt01']:.3f}", "-", ens_m["n"]])
        table_rows.append(["Oracle (best-of-3)", f"{oracle_seq:.3f}", "-", "-", "-", "-", len(gts)])

    # CSV cho báo cáo
    with open(f"{OUT}/metrics_summary.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(["Cấu hình", "Seq-acc", "Char-acc", "NED", "CER<0.1", "ms/ảnh", "n"])
        w.writerows(table_rows)
    print(f"\n✔ metrics_summary.csv")

    # ── Biểu đồ ──
    fig_before_after(res)
    fig_engine_bars(eng)
    fig_engine_radar(eng, lat)
    fig_latency(eng, lat)
    fig_acc_latency(eng, lat)
    fig_cer_hist(eng)
    fig_cer_box(eng)
    fig_cer_cdf(eng)
    fig_acc_by_length(eng, gts)
    fig_error_types(eng)
    fig_char_errors(eng)
    fig_confusion_pairs(eng)
    fig_correct_overlap(eng)
    if ens_m is not None:
        fig_ensemble_gain(eng, ens_m, oracle_seq)
    fig_summary_table(table_rows)

    print(f"\n✅ Đã lưu toàn bộ biểu đồ + CSV vào {OUT}/")

if __name__ == "__main__":
    main()
