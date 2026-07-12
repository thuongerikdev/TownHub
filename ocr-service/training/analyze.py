"""
Phân tích & so sánh mô hình OCR (VietOCR vs PaddleOCR) — dùng cho báo cáo ĐATN.
Chạy trên Colab SAU khi đã fine-tune + export.

Sinh ra (lưu PNG vào ./analysis):
  1. training_curve_rec.png  — đường cong Loss & Accuracy theo bước huấn luyện (đọc train.log của Paddle)
  2. before_after.png        — accuracy TRƯỚC vs SAU fine-tune (VietOCR & PaddleOCR)
  3. engine_compare.png      — VietOCR vs PaddleOCR (sau fine-tune): seq-acc, char-acc, NED, độ trễ
  4. cer_distribution.png    — phân bố Character Error Rate
  5. char_errors.png         — các ký tự bị đọc sai nhiều nhất (thường là dấu tiếng Việt)
  + bảng số liệu in ra màn hình.

Chỉ số:
  - Sequence accuracy : tỉ lệ đọc ĐÚNG TOÀN BỘ chuỗi (khắt khe).
  - Character accuracy: 1 - CER (CER = khoảng cách Levenshtein / độ dài nhãn).
  - NED              : normalized edit distance similarity = 1 - lev/max(len) (mức ký tự, "mềm" hơn seq-acc).
  - Latency          : mili-giây / ảnh (tốc độ suy luận).

Ví dụ chạy:
  python analyze.py \
    --data ./dataset/rec --label ./dataset/rec/val.txt \
    --viet ./weights/vietocr_invoice.pth \
    --rec  /content/drive/MyDrive/townhub_ocr/inference/rec_vi \
    --dict /content/drive/MyDrive/townhub_ocr/dict_vi.txt \
    --log  /content/drive/MyDrive/townhub_ocr/output_rec_vi/train.log \
    --limit 500
"""
import os, re, time, argparse, difflib
from collections import Counter
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

OUT = "./analysis"

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

def metrics(preds, gts):
    seq = np.mean([1.0 if p == g else 0.0 for p, g in zip(preds, gts)])
    cers, neds = [], []
    for p, g in zip(preds, gts):
        d = levenshtein(p, g)
        cers.append(d / max(1, len(g)))
        neds.append(1 - d / max(1, len(p), len(g)))
    return {
        "seq_acc":  float(seq),
        "char_acc": float(1 - np.mean(cers)),
        "ned":      float(np.mean(neds)),
        "cer_list": cers,
        "n": len(gts),
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
    # r có thể là [[(text,score)]] hoặc [(text,score)] tùy phiên bản
    try:
        item = r[0]
        if isinstance(item, (list, tuple)) and item and isinstance(item[0], (list, tuple)):
            item = item[0]
        return (item[0] or "").strip()
    except Exception:
        return ""

def run_paddle(samples, rec_dir=None, dict_path=None, use_gpu=True):
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

# ════════════════════════ VẼ BIỂU ĐỒ ════════════════════════
def fig_training_curve(log):
    if not log or not log.get("steps"):
        print("⚠️ Không đọc được train.log — bỏ qua đường cong huấn luyện.")
        return
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
    fig.tight_layout(); fig.savefig(f"{OUT}/training_curve_rec.png", dpi=140); plt.close(fig)
    print("✔ training_curve_rec.png")

def fig_before_after(res):
    labels = ["VietOCR", "PaddleOCR"]
    before = [res["viet_before"]["seq_acc"], res["paddle_before"]["seq_acc"]]
    after  = [res["viet_after"]["seq_acc"],  res["paddle_after"]["seq_acc"]]
    x = np.arange(len(labels)); w = 0.35
    fig, ax = plt.subplots(figsize=(7, 4.5))
    b1 = ax.bar(x - w/2, before, w, label="Trước fine-tune", color="#b0b0b0")
    b2 = ax.bar(x + w/2, after,  w, label="Sau fine-tune",  color="#2e86ab")
    ax.set_xticks(x); ax.set_xticklabels(labels); ax.set_ylim(0, 1)
    ax.set_ylabel("Sequence accuracy"); ax.set_title("Trước vs Sau fine-tune")
    for b in list(b1) + list(b2):
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 0.01,
                f"{b.get_height():.2f}", ha="center", fontsize=8)
    ax.legend(); fig.tight_layout(); fig.savefig(f"{OUT}/before_after.png", dpi=140); plt.close(fig)
    print("✔ before_after.png")

def fig_engine_compare(res, lat):
    va, pa = res["viet_after"], res["paddle_after"]
    groups = ["Seq-acc", "Char-acc", "NED"]
    viet = [va["seq_acc"], va["char_acc"], va["ned"]]
    padd = [pa["seq_acc"], pa["char_acc"], pa["ned"]]
    x = np.arange(len(groups)); w = 0.35
    fig, (ax, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), gridspec_kw={"width_ratios": [2, 1]})
    ax.bar(x - w/2, viet, w, label="VietOCR", color="#2e86ab")
    ax.bar(x + w/2, padd, w, label="PaddleOCR", color="#e07a5f")
    ax.set_xticks(x); ax.set_xticklabels(groups); ax.set_ylim(0, 1)
    ax.set_title("VietOCR vs PaddleOCR (sau fine-tune)"); ax.legend()
    for i, (vv, pp) in enumerate(zip(viet, padd)):
        ax.text(i - w/2, vv + 0.01, f"{vv:.2f}", ha="center", fontsize=8)
        ax.text(i + w/2, pp + 0.01, f"{pp:.2f}", ha="center", fontsize=8)
    ax2.bar(["VietOCR", "PaddleOCR"], [lat["viet"], lat["paddle"]], color=["#2e86ab", "#e07a5f"])
    ax2.set_ylabel("ms / ảnh"); ax2.set_title("Độ trễ suy luận")
    for i, v in enumerate([lat["viet"], lat["paddle"]]):
        ax2.text(i, v, f"{v:.0f}", ha="center", va="bottom", fontsize=8)
    fig.tight_layout(); fig.savefig(f"{OUT}/engine_compare.png", dpi=140); plt.close(fig)
    print("✔ engine_compare.png")

def fig_cer_distribution(res):
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.hist(np.clip(res["viet_after"]["cer_list"], 0, 1), bins=20, alpha=0.6, label="VietOCR", color="#2e86ab")
    ax.hist(np.clip(res["paddle_after"]["cer_list"], 0, 1), bins=20, alpha=0.6, label="PaddleOCR", color="#e07a5f")
    ax.set_xlabel("CER (0 = đọc đúng hoàn toàn)"); ax.set_ylabel("Số mẫu")
    ax.set_title("Phân bố Character Error Rate (sau fine-tune)"); ax.legend()
    fig.tight_layout(); fig.savefig(f"{OUT}/cer_distribution.png", dpi=140); plt.close(fig)
    print("✔ cer_distribution.png")

def fig_char_errors(preds, gts, topn=20):
    cnt = Counter()
    for p, g in zip(preds, gts):
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, g, p).get_opcodes():
            if tag in ("replace", "delete"):
                for ch in g[i1:i2]:
                    if not ch.isspace():
                        cnt[ch] += 1
    if not cnt:
        print("⚠️ Không có lỗi ký tự để vẽ (mô hình gần như đúng hết)."); return
    items = cnt.most_common(topn)
    chars = [c for c, _ in items]; vals = [v for _, v in items]
    fig, ax = plt.subplots(figsize=(9, 4.5))
    ax.bar(range(len(chars)), vals, color="#8d5524")
    ax.set_xticks(range(len(chars))); ax.set_xticklabels(chars, fontsize=12)
    ax.set_ylabel("Số lần đọc sai"); ax.set_title("Top ký tự bị đọc sai (VietOCR sau fine-tune)")
    fig.tight_layout(); fig.savefig(f"{OUT}/char_errors.png", dpi=140); plt.close(fig)
    print("✔ char_errors.png")

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
    ap.add_argument("--cpu",   action="store_true")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    gpu = not args.cpu
    dev = "cpu" if args.cpu else "cuda:0"

    samples = load_val(args.data, args.label, args.limit)
    gts = [g for _, g in samples]
    print(f"Đánh giá trên {len(samples)} mẫu val\n")

    res, lat = {}, {}

    # 1) Đường cong huấn luyện (Paddle)
    fig_training_curve(parse_paddle_log(args.log))

    # 2) VietOCR trước/sau
    try:
        p, _  = run_vietocr(samples, weights=None, device=dev); res["viet_before"] = metrics(p, gts)
        pv, dv = run_vietocr(samples, weights=args.viet, device=dev); res["viet_after"] = metrics(pv, gts); lat["viet"] = dv
        viet_preds_after = pv
    except Exception as e:
        print("⚠️ VietOCR lỗi:", e); return

    # 3) PaddleOCR trước (mặc định 'vi') / sau (fine-tune)
    try:
        p, _  = run_paddle(samples, rec_dir=None, use_gpu=gpu); res["paddle_before"] = metrics(p, gts)
        if args.rec:
            pp, dp = run_paddle(samples, rec_dir=args.rec, dict_path=args.dict, use_gpu=gpu)
            res["paddle_after"] = metrics(pp, gts); lat["paddle"] = dp
        else:
            res["paddle_after"] = res["paddle_before"]; lat["paddle"] = 0
            print("⚠️ Chưa truyền --rec (inference fine-tune) → 'Paddle sau' = 'Paddle gốc'.")
    except Exception as e:
        print("⚠️ PaddleOCR lỗi:", e)
        res.setdefault("paddle_before", metrics([""]*len(gts), gts))
        res.setdefault("paddle_after", res["paddle_before"]); lat["paddle"] = 0

    # Bảng số liệu
    print("\n================  BẢNG SO SÁNH  ================")
    print(f"{'Cấu hình':<22}{'Seq-acc':>9}{'Char-acc':>10}{'NED':>8}{'n':>7}")
    for k in ["viet_before", "viet_after", "paddle_before", "paddle_after"]:
        r = res[k]
        print(f"{k:<22}{r['seq_acc']:>9.3f}{r['char_acc']:>10.3f}{r['ned']:>8.3f}{r['n']:>7}")
    print(f"\nĐộ trễ: VietOCR {lat.get('viet',0):.0f} ms/ảnh | PaddleOCR {lat.get('paddle',0):.0f} ms/ảnh")

    # Biểu đồ
    fig_before_after(res)
    fig_engine_compare(res, lat)
    fig_cer_distribution(res)
    fig_char_errors(viet_preds_after, gts)
    print(f"\n✅ Đã lưu biểu đồ vào {OUT}/")

if __name__ == "__main__":
    main()
