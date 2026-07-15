# -*- coding: utf-8 -*-
"""
Chuyển train_data_vi.json -> train_vi.spacy / dev_vi.spacy (định dạng spaCy v3).
Dùng tokenizer 'xx' (đa ngôn ngữ) để không phải cài pyvi.
Chạy trên máy có cài spacy (hoặc trên Colab):
    pip install -U spacy spacy-transformers scikit-learn
    python json_to_spacy_vi.py
"""
import json
import spacy
from spacy.tokens import DocBin
from sklearn.model_selection import train_test_split

data = json.load(open("train_data_vi.json", encoding="utf-8"))
train, dev = train_test_split(data, test_size=0.2, random_state=42)
print(f"train={len(train)}  dev={len(dev)}")

def build(rows, path):
    nlp = spacy.blank("xx")           # tokenizer đa ngôn ngữ
    db = DocBin()
    dropped = 0
    for text, annot in rows:
        doc = nlp.make_doc(text)
        ents, occupied = [], set()
        for start, end, label in annot["entities"]:
            span = doc.char_span(start, end, label=label, alignment_mode="contract")
            if span is None:
                dropped += 1
                continue
            if any(i in occupied for i in range(span.start, span.end)):
                continue
            occupied.update(range(span.start, span.end))
            ents.append(span)
        doc.ents = ents
        db.add(doc)
    db.to_disk(path)
    print(f"  -> {path}  (bỏ {dropped} span lệch token)")

build(train, "train_vi.spacy")
build(dev, "dev_vi.spacy")
print("Xong.")
