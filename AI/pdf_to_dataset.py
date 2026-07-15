# -*- coding: utf-8 -*-
"""
BƯỚC 2 — Từ các PDF đã sinh: TRÍCH TEXT bằng PyMuPDF (giống lúc inference),
rồi DÒ LẠI giá trị ground-truth trong text để gán nhãn (start,end,label).

=> dataset huấn luyện phản ánh đúng text thật khi đọc PDF (thứ tự, xuống dòng...).

Xuất: train_data_vi.json  (định dạng notebook gốc: [ [text, {"entities":[[s,e,l],...]}], ... ])
Chạy: python pdf_to_dataset.py
Yêu cầu: pip install pymupdf
"""
import os, re, json, glob, fitz
from collections import Counter

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_DIR = os.path.join(OUT_DIR, "cv_pdfs")
GT_DIR  = os.path.join(PDF_DIR, "gt")

# nhãn số/dễ trùng -> chỉ lấy lần xuất hiện đầu để giảm nhiễu
FIRST_ONLY = {"Graduation Year"}

_W = r"0-9A-Za-zÀ-ỹ"  # ký tự "chữ" (gồm tiếng Việt) để chặn khớp nửa từ

def spans_of(text, value, first_only=False):
    """Dò 'value' trong text:
    - khoảng trắng linh hoạt (PDF hay ngắt dòng giữa cụm),
    - KHÔNG phân biệt hoa/thường (header CSS in hoa: 'NGUYỄN...' vẫn khớp 'Nguyễn...'),
    - có ranh giới từ (tránh 'Git' khớp nhầm trong 'github')."""
    toks = value.split()
    if not toks:
        return []
    body = r"\s+".join(re.escape(t) for t in toks)
    pat = re.compile(rf"(?<![{_W}]){body}(?![{_W}])", re.IGNORECASE)
    out = []
    for m in pat.finditer(text):
        out.append((m.start(), m.end()))
        if first_only:
            break
    return out

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    return "\n".join(page.get_text() for page in doc)

def main():
    pdfs = sorted(glob.glob(os.path.join(PDF_DIR, "*.pdf")))
    assert pdfs, f"Không thấy PDF trong {PDF_DIR}. Chạy gen_cv_pdfs.py trước."
    data = []
    total_vals = matched_vals = 0
    miss = Counter()
    label_cnt = Counter()

    for p in pdfs:
        stem = os.path.splitext(os.path.basename(p))[0]
        gt = json.load(open(os.path.join(GT_DIR, stem + ".json"), encoding="utf-8"))
        text = extract_text(p)

        cand = []  # (start,end,label)
        for label, values in gt.items():
            fo = label in FIRST_ONLY
            for v in values:
                total_vals += 1
                sp = spans_of(text, v, first_only=fo)
                if sp:
                    matched_vals += 1
                else:
                    miss[label] += 1
                for s, e in sp:
                    cand.append((s, e, label))

        # giải quyết chồng lấn: ưu tiên span DÀI hơn
        cand.sort(key=lambda x: -(x[1] - x[0]))
        occupied, ents = set(), []
        for s, e, l in cand:
            if any(i in occupied for i in range(s, e)):
                continue
            occupied.update(range(s, e))
            ents.append([s, e, l]); label_cnt[l] += 1
        ents.sort()
        data.append([text, {"entities": ents}])

    json.dump(data, open(os.path.join(OUT_DIR, "train_data_vi.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"PDF xử lý: {len(pdfs)}  |  CV có nhãn: {len(data)}")
    print(f"Giá trị dò được: {matched_vals}/{total_vals} ({100*matched_vals/max(total_vals,1):.1f}%)")
    print("Nhãn thu được:", dict(label_cnt))
    if miss:
        print("Giá trị KHÔNG khớp (theo nhãn):", dict(miss))

if __name__ == "__main__":
    main()
