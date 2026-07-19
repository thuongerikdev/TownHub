"""
Fine-tune VietOCR (recognition) trên dataset synthetic do make_dataset.py sinh ra.

Dữ liệu dùng: dataset/rec/  (images/ + train.txt + val.txt, format 'img\\tlabel').
Chạy trên Colab GPU:
    !python finetune_vietocr.py --data ./dataset/rec --iters 20000 --out ./weights/vietocr_invoice.pth

Xong: nạp vào service bằng biến môi trường  VIETOCR_WEIGHTS=./weights/vietocr_invoice.pth
"""
import argparse
from vietocr.tool.config import Cfg
from vietocr.model.trainer import Trainer

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="./dataset/rec", help="thư mục chứa images/ + train.txt + val.txt")
    ap.add_argument("--iters", type=int, default=20000)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--out", default="./weights/vietocr_invoice.pth")
    args = ap.parse_args()

    config = Cfg.load_config_from_name('vgg_transformer')   # đúng backbone service đang dùng
    config['device'] = 'cuda:0'
    config['dataset'].update({
        'name'            : 'invoice',
        'data_root'       : args.data,
        'train_annotation': 'train.txt',
        'valid_annotation': 'val.txt',
    })
    config['trainer'].update({
        'batch_size' : args.batch,
        'print_every': 200,
        'valid_every': 1000,
        'iters'      : args.iters,
        'checkpoint' : './checkpoint/vietocr_ckpt.pth',
        'export'     : args.out,
        'metrics'    : 10000,
    })
    # Fine-tune từ pretrain (KHÔNG train from scratch) -> hội tụ nhanh, cần ít data.
    trainer = Trainer(config, pretrained=True)
    trainer.train()
    print(f"\n✅ Đã export weights: {args.out}")

if __name__ == "__main__":
    main()
