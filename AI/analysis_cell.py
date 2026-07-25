# PHÂN TÍCH KẾT QUẢ TRƯỚC & SAU HUẤN LUYỆN + 12 BIỂU ĐỒ (dán vào session đang chạy)
%matplotlib inline
import json, os, re, glob
from collections import Counter
import numpy as np, matplotlib.pyplot as plt
import spacy
from spacy.util import load_config, load_model_from_config
from spacy.training import Corpus

spacy.prefer_gpu()

def evaluate_ner(nlp, path='./dev_vi.spacy'):
    """So khớp span (start,end,label) giữa dự đoán và nhãn vàng -> TP/FP/FN từng nhãn."""
    tp, fp, fn = Counter(), Counter(), Counter()
    n_pred = n_gold = n_doc = 0
    conf = Counter()          # nhầm nhãn: cùng vị trí, khác nhãn
    for eg in Corpus(path)(nlp):
        gold = {(e.start_char, e.end_char, e.label_) for e in eg.reference.ents}
        pred = {(e.start_char, e.end_char, e.label_) for e in nlp(eg.reference.text).ents}
        n_doc += 1; n_gold += len(gold); n_pred += len(pred)
        for s in pred & gold: tp[s[2]] += 1
        for s in pred - gold: fp[s[2]] += 1
        for s in gold - pred: fn[s[2]] += 1
        gpos = {(s, e): l for s, e, l in gold}
        for s, e, l in pred - gold:
            if (s, e) in gpos: conf[(gpos[(s, e)], l)] += 1
    labels = sorted(set(tp) | set(fp) | set(fn))
    per = {}
    for l in labels:
        p = tp[l] / (tp[l] + fp[l]) if tp[l] + fp[l] else 0.0
        r = tp[l] / (tp[l] + fn[l]) if tp[l] + fn[l] else 0.0
        per[l] = {'p': p, 'r': r, 'f': 2 * p * r / (p + r) if p + r else 0.0,
                  'tp': tp[l], 'fp': fp[l], 'fn': fn[l]}
    TP, FP, FN = sum(tp.values()), sum(fp.values()), sum(fn.values())
    P = TP / (TP + FP) if TP + FP else 0.0
    R = TP / (TP + FN) if TP + FN else 0.0
    return {'micro': {'p': P, 'r': R, 'f': 2 * P * R / (P + R) if P + R else 0.0,
                      'tp': TP, 'fp': FP, 'fn': FN},
            'per_label': per, 'n_doc': n_doc, 'n_gold': n_gold, 'n_pred': n_pred,
            'confusions': {f'{a}->{b}': c for (a, b), c in conf.items()}}

# Dựng pipeline y hệt cấu hình train nhưng CHƯA huấn luyện (trọng số NER khởi tạo ngẫu nhiên)
cfg  = load_config('config_vi.cfg', overrides={'paths.train': './train_vi.spacy',
                                               'paths.dev':   './dev_vi.spacy'})
nlp0 = load_model_from_config(cfg, auto_fill=True)
nlp0.initialize(lambda: Corpus('./train_vi.spacy')(nlp0))
print('Pipeline:', nlp0.pipe_names)
print('Nhãn đã đăng ký:', nlp0.get_pipe('ner').labels)

before = evaluate_ner(nlp0)
json.dump(before, open('metrics_before.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
m = before['micro']
print(f"\nTRƯỚC HUẤN LUYỆN  ->  P={m['p']*100:.2f}  R={m['r']*100:.2f}  F={m['f']*100:.2f}"
      f"  (dự đoán {before['n_pred']} thực thể / {before['n_gold']} thực thể vàng)")
print('Đã ghi metrics_before.json')


os.makedirs('charts', exist_ok=True)
plt.rcParams.update({'figure.dpi': 110, 'font.size': 9, 'axes.grid': True,
                     'grid.alpha': .25, 'axes.axisbelow': True})
C_BEF, C_AFT = '#c0504d', '#2e75b6'

# ---------- 1. Số liệu TRƯỚC (chạy Bước 4b) và SAU huấn luyện ----------
nlp = spacy.load('output_vi/model-best')
after = evaluate_ner(nlp)
ma = after['micro']
print(f"SAU HUẤN LUYỆN    ->  P={ma['p']*100:.2f}  R={ma['r']*100:.2f}  F={ma['f']*100:.2f}")
json.dump(after, open('metrics_after.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

labels = sorted(after['per_label'])
short  = [l.replace(' Address', '').replace('Companies worked at', 'Companies')
           .replace('College Name', 'College').replace('Years of Experience', 'YoE')
           .replace('Graduation Year', 'Grad.Year') for l in labels]
get = lambda d, l, k: d['per_label'].get(l, {}).get(k, 0)

# ---------- 2. Đọc log huấn luyện ----------
if not os.path.exists('train_log.txt'):
    print('Chưa có train_log.txt — chọn file train_log.txt để vẽ H6–H9 (bỏ qua nếu không có):')
    try:
        from google.colab import files; files.upload()
    except Exception as e:
        print('  bỏ qua:', e)
log = open('train_log.txt', encoding='utf-8', errors='ignore').read() \
      if os.path.exists('train_log.txt') else None
rows = []
if log:
    for ln in log.splitlines():
        s = re.sub(r'\x1b\[[\d;]*m', '', ln).strip()
        if not re.fullmatch(r'[\d.\s-]+', s):   # bỏ dòng có chữ (thanh tiến trình tải model...)
            continue
        c = s.split()
        if len(c) == 8 and c[0].isdigit() and c[1].isdigit():
            rows.append([float(x) for x in c])
steps = np.array([r[1] for r in rows]) if rows else np.array([])
lt, ln_, ef, ep, er, sc = (np.array([r[i] for r in rows]) for i in (2, 3, 4, 5, 6, 7)) \
    if rows else ([np.array([])] * 6)
if not rows:
    print('! Không thấy train_log.txt -> bỏ qua 4 biểu đồ đường cong huấn luyện.')

# ---------- 3. Thống kê tập dữ liệu ----------
data = json.load(open('train_data_vi.json', encoding='utf-8'))
ent_per_label = Counter(l for _, a in data for *_, l in a['entities'])
doc_chars     = [len(t) for t, _ in data]
ents_per_doc  = [len(a['entities']) for _, a in data]

def save(fig, name):
    fig.tight_layout(); fig.savefig(f'charts/{name}.png', bbox_inches='tight'); plt.show()

# --- H1: P/R/F tổng thể trước vs sau ---
fig, ax = plt.subplots(figsize=(5.2, 3.4)); x = np.arange(3); w = .36
b = [before['micro'][k] * 100 for k in 'prf']; a = [after['micro'][k] * 100 for k in 'prf']
ax.bar(x - w/2, b, w, label='Trước', color=C_BEF); ax.bar(x + w/2, a, w, label='Sau', color=C_AFT)
for i, (u, v) in enumerate(zip(b, a)):
    ax.text(i - w/2, u + 1, f'{u:.1f}', ha='center', fontsize=8)
    ax.text(i + w/2, v + 1, f'{v:.1f}', ha='center', fontsize=8)
ax.set_xticks(x, ['Precision', 'Recall', 'F1']); ax.set_ylim(0, 108); ax.set_ylabel('%')
ax.set_title('H1. Hiệu năng tổng thể trên tập dev'); ax.legend()
save(fig, 'h01_micro_prf')

# --- H2: F1 theo từng nhãn ---
fig, ax = plt.subplots(figsize=(7, 4.2)); y = np.arange(len(labels))
ax.barh(y - .2, [get(before, l, 'f') * 100 for l in labels], .4, label='Trước', color=C_BEF)
ax.barh(y + .2, [get(after,  l, 'f') * 100 for l in labels], .4, label='Sau',   color=C_AFT)
ax.set_yticks(y, short); ax.set_xlabel('F1 (%)'); ax.set_xlim(0, 105)
ax.set_title('H2. F1 theo từng nhãn'); ax.legend(loc='lower right')
save(fig, 'h02_f1_per_label')

# --- H3: Precision & Recall sau huấn luyện, theo nhãn ---
fig, ax = plt.subplots(figsize=(7, 4.2))
ax.barh(y - .2, [get(after, l, 'p') * 100 for l in labels], .4, label='Precision', color='#548235')
ax.barh(y + .2, [get(after, l, 'r') * 100 for l in labels], .4, label='Recall',    color='#bf8f00')
ax.set_yticks(y, short); ax.set_xlim(0, 105); ax.set_xlabel('%')
ax.set_title('H3. Precision / Recall từng nhãn (sau huấn luyện)'); ax.legend(loc='lower right')
save(fig, 'h03_pr_per_label')

# --- H4: TP / FP / FN theo nhãn (sau) ---
fig, ax = plt.subplots(figsize=(7, 4))
tp = np.array([get(after, l, 'tp') for l in labels]); fp = np.array([get(after, l, 'fp') for l in labels])
fn = np.array([get(after, l, 'fn') for l in labels])
ax.bar(short, tp, label='TP (đúng)', color='#548235')
ax.bar(short, fp, bottom=tp, label='FP (thừa)', color='#c0504d')
ax.bar(short, fn, bottom=tp + fp, label='FN (sót)', color='#7f7f7f')
ax.set_ylabel('Số thực thể'); ax.set_title('H4. TP / FP / FN từng nhãn (sau huấn luyện)')
plt.setp(ax.get_xticklabels(), rotation=35, ha='right'); ax.legend()
save(fig, 'h04_tp_fp_fn')

# --- H5: Số thực thể dự đoán: trước vs sau vs nhãn vàng ---
fig, ax = plt.subplots(figsize=(7, 4)); x = np.arange(len(labels)); w = .27
gold_n = [get(after, l, 'tp') + get(after, l, 'fn') for l in labels]
ax.bar(x - w, [get(before, l, 'tp') + get(before, l, 'fp') for l in labels], w, label='Trước', color=C_BEF)
ax.bar(x,     [get(after,  l, 'tp') + get(after,  l, 'fp') for l in labels], w, label='Sau',   color=C_AFT)
ax.bar(x + w, gold_n, w, label='Nhãn vàng', color='#a6a6a6')
ax.set_xticks(x, short); plt.setp(ax.get_xticklabels(), rotation=35, ha='right')
ax.set_ylabel('Số thực thể'); ax.set_title('H5. Số thực thể nhận ra so với nhãn vàng'); ax.legend()
save(fig, 'h05_counts_vs_gold')

# --- H6: Đường cong F1 trên dev theo bước huấn luyện ---
if rows:
    fig, ax = plt.subplots(figsize=(6, 3.6))
    ax.plot(steps, ef, color=C_AFT, lw=1.8, label='ENTS_F (dev)')
    i = int(np.argmax(ef)); ax.scatter([steps[i]], [ef[i]], color='#c00000', zorder=5)
    ax.annotate(f'best {ef[i]:.2f} @ {int(steps[i])}', (steps[i], ef[i]),
                textcoords='offset points', xytext=(-20, -16), fontsize=8, color='#c00000')
    ax.axhline(before['micro']['f'] * 100, ls='--', color=C_BEF, lw=1.2, label='Trước huấn luyện')
    ax.set_xlabel('Bước'); ax.set_ylabel('F1 (%)'); ax.set_title('H6. F1 trên tập dev theo bước'); ax.legend()
    save(fig, 'h06_f1_curve')

    # --- H7: Loss ---
    fig, ax = plt.subplots(figsize=(6, 3.6))
    ax.plot(steps, lt, label='LOSS TRANS', color='#7030a0')
    ax.plot(steps, ln_, label='LOSS NER', color='#ed7d31')
    ax.set_yscale('log'); ax.set_xlabel('Bước'); ax.set_ylabel('Loss (log)')
    ax.set_title('H7. Suy giảm hàm mất mát'); ax.legend()
    save(fig, 'h07_loss')

    # --- H8: Precision vs Recall theo bước ---
    fig, ax = plt.subplots(figsize=(6, 3.6))
    ax.plot(steps, ep, label='Precision', color='#548235')
    ax.plot(steps, er, label='Recall', color='#bf8f00')
    ax.set_xlabel('Bước'); ax.set_ylabel('%'); ax.set_title('H8. Precision / Recall theo bước'); ax.legend()
    save(fig, 'h08_pr_curve')

    # --- H9: Số bước cần để vượt các ngưỡng F1 ---
    fig, ax = plt.subplots(figsize=(5.6, 3.4))
    th = [10, 30, 50, 70, 90, 95, 99]
    need = [int(steps[np.argmax(ef >= t)]) if (ef >= t).any() else np.nan for t in th]
    ax.bar([str(t) for t in th], need, color='#2e75b6')
    for i, v in enumerate(need):
        if not np.isnan(v): ax.text(i, v, str(int(v)), ha='center', va='bottom', fontsize=8)
    ax.set_xlabel('Ngưỡng F1 (%)'); ax.set_ylabel('Bước đầu tiên đạt được')
    ax.set_title('H9. Tốc độ hội tụ'); save(fig, 'h09_convergence')

# --- H10: Phân bố nhãn trong tập dữ liệu ---
fig, ax = plt.subplots(figsize=(7, 3.8))
ks = sorted(ent_per_label, key=ent_per_label.get, reverse=True)
ax.bar([k[:14] for k in ks], [ent_per_label[k] for k in ks], color='#4472c4')
plt.setp(ax.get_xticklabels(), rotation=35, ha='right'); ax.set_ylabel('Số thực thể')
ax.set_title(f'H10. Phân bố nhãn trên {len(data)} CV'); save(fig, 'h10_label_dist')

# --- H11: Phân bố độ dài CV & số thực thể mỗi CV ---
fig, axes = plt.subplots(1, 2, figsize=(8, 3.2))
axes[0].hist(doc_chars, bins=30, color='#4472c4'); axes[0].set_xlabel('Số ký tự / CV')
axes[0].set_ylabel('Số CV'); axes[0].set_title('Độ dài văn bản')
axes[1].hist(ents_per_doc, bins=range(min(ents_per_doc), max(ents_per_doc) + 2), color='#70ad47')
axes[1].set_xlabel('Số thực thể / CV'); axes[1].set_title('Mật độ nhãn')
fig.suptitle('H11. Đặc điểm tập dữ liệu', y=1.02); save(fig, 'h11_dataset')

# --- H12: Các trường hợp nhầm nhãn (cùng vị trí, sai loại) ---
fig, ax = plt.subplots(figsize=(6.4, 3.4))
cf = after['confusions']
if cf:
    ks = sorted(cf, key=cf.get, reverse=True)[:10]
    ax.barh(ks[::-1], [cf[k] for k in ks][::-1], color='#c0504d')
    ax.set_xlabel('Số lần'); ax.set_title('H12. Nhầm nhãn sau huấn luyện (vàng -> dự đoán)')
else:
    ax.text(.5, .5, 'Không có trường hợp nhầm nhãn\n(mọi span khớp vị trí đều đúng loại)',
            ha='center', va='center', fontsize=11); ax.set_axis_off()
    ax.set_title('H12. Nhầm nhãn sau huấn luyện')
save(fig, 'h12_confusions')

# ---------- 4. Bảng tổng hợp ----------
print(f"\n{'Nhãn':24s}{'F1 trước':>10s}{'F1 sau':>9s}{'P sau':>8s}{'R sau':>8s}{'TP':>5s}{'FP':>5s}{'FN':>5s}")
for l in labels:
    print(f'{l:24s}{get(before,l,"f")*100:>10.2f}{get(after,l,"f")*100:>9.2f}'
          f'{get(after,l,"p")*100:>8.2f}{get(after,l,"r")*100:>8.2f}'
          f'{get(after,l,"tp"):>5d}{get(after,l,"fp"):>5d}{get(after,l,"fn"):>5d}')
mb, ma = before['micro'], after['micro']
print(f'{"TỔNG (micro)":24s}{mb["f"]*100:>10.2f}{ma["f"]*100:>9.2f}{ma["p"]*100:>8.2f}{ma["r"]*100:>8.2f}'
      f'{ma["tp"]:>5d}{ma["fp"]:>5d}{ma["fn"]:>5d}')
print(f'\nĐã lưu {len(glob.glob("charts/*.png"))} biểu đồ trong thư mục charts/')
