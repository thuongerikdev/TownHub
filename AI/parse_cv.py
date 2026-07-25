# -*- coding: utf-8 -*-
"""
Dùng model NER đã huấn luyện (output_vi/model-best) để trích thông tin từ CV PDF.

Cài đặt (một lần):
    pip install spacy spacy-transformers pymupdf
    # bản spaCy nên khớp với lúc train — xem environment.txt trong thư mục minh chứng

Dùng như CLI:
    python parse_cv.py cv.pdf
    python parse_cv.py cv1.pdf cv2.pdf --model ./output_vi/model-best --json out.json

Dùng như thư viện:
    from parse_cv import load_model, parse_pdf
    nlp = load_model('./output_vi/model-best')     # nạp MỘT lần, tái sử dụng
    data = parse_pdf('cv.pdf', nlp)
"""
import argparse
import json
import os
import sys
from collections import OrderedDict

import fitz  # pymupdf
import spacy

DEFAULT_MODEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_vi", "model-best")

# Nhãn chỉ có duy nhất một giá trị -> lấy cái model tự tin nhất (xuất hiện đầu tiên)
SINGLE = {"Name", "Email Address", "Location", "College Name", "Degree",
          "Graduation Year", "Years of Experience"}


def load_model(path=DEFAULT_MODEL):
    """Nạp model. Tốn vài giây + ~1GB RAM nên hãy giữ lại object trả về."""
    if not os.path.isdir(path):
        raise FileNotFoundError(
            f"Không thấy model tại {path}. Chép thư mục model-best từ Drive về, "
            f"hoặc truyền --model <đường dẫn>.")
    return spacy.load(path)


def pdf_to_text(pdf_path):
    """Trích text đúng cách như lúc huấn luyện (PyMuPDF, nối trang bằng \\n)."""
    with fitz.open(pdf_path) as doc:
        return "\n".join(page.get_text() for page in doc)


def parse_text(text, nlp):
    """Chạy NER trên text, gom theo nhãn, bỏ trùng lặp và giữ nguyên thứ tự xuất hiện."""
    doc = nlp(text)
    out = OrderedDict()
    for ent in doc.ents:
        val = " ".join(ent.text.split())  # gộp xuống dòng/khoảng trắng thừa
        vals = out.setdefault(ent.label_, [])
        if val not in vals:
            vals.append(val)
    # nhãn đơn trị -> rút gọn thành chuỗi
    return {k: (v[0] if k in SINGLE else v) for k, v in out.items()}


def parse_pdf(pdf_path, nlp):
    return parse_text(pdf_to_text(pdf_path), nlp)


def main():
    ap = argparse.ArgumentParser(description="Trích thông tin CV bằng model NER đã train")
    ap.add_argument("pdfs", nargs="+", help="một hoặc nhiều file PDF")
    ap.add_argument("--model", default=DEFAULT_MODEL, help="thư mục model (mặc định: %(default)s)")
    ap.add_argument("--json", help="ghi kết quả ra file JSON thay vì chỉ in ra màn hình")
    args = ap.parse_args()

    nlp = load_model(args.model)
    results = {}
    for p in args.pdfs:
        if not os.path.isfile(p):
            print(f"[bỏ qua] không thấy file: {p}", file=sys.stderr)
            continue
        info = parse_pdf(p, nlp)
        results[os.path.basename(p)] = info
        print(f"\n=== {os.path.basename(p)} ===")
        if not info:
            print("  (không nhận ra thực thể nào)")
        for label, val in info.items():
            print(f"  {label:22s} | {val if isinstance(val, str) else ', '.join(val)}")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=1)
        print(f"\nĐã ghi {args.json}")


if __name__ == "__main__":
    main()
