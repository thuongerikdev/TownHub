# Fine-tune PaddleOCR (DET + REC) trên dataset synthetic

Dữ liệu dùng chính là output của `make_dataset.py`:

```
dataset/
  det/  images/  train_label.txt  val_label.txt      ← DET (định dạng ICDAR, khớp Paddle)
  rec/  images/  train.txt        val.txt            ← REC (định dạng 'img\tlabel', khớp Paddle)
  dict_vi.txt                                         ← bảng ký tự cho REC
```

Format nhãn do script sinh ra **đã khớp sẵn** với PaddleOCR — không cần convert.

## 0. Chuẩn bị (Colab)
```bash
!pip install paddlepaddle-gpu==2.6.1
!git clone https://github.com/PaddlePaddle/PaddleOCR.git
%cd PaddleOCR
!pip install -r requirements.txt
```

## 1. Fine-tune RECOGNITION (PP-OCRv4 rec)
Tải pretrain rec (latin/vi) về `./pretrain/`, rồi:
```bash
!python tools/train.py -c configs/rec/PP-OCRv4/PP-OCRv4_rec.yml \
  -o Global.pretrained_model=./pretrain/rec_vi \
     Global.character_dict_path=../dataset/dict_vi.txt \
     Global.use_space_char=True \
     Global.epoch_num=100 \
     Global.save_model_dir=./output/rec_vi \
     Train.dataset.data_dir=../dataset/rec \
     Train.dataset.label_file_list=[../dataset/rec/train.txt] \
     Eval.dataset.data_dir=../dataset/rec \
     Eval.dataset.label_file_list=[../dataset/rec/val.txt]
```

## 2. Fine-tune DETECTION (PP-OCRv4 det)
Tải pretrain det về `./pretrain/`, rồi:
```bash
!python tools/train.py -c configs/det/PP-OCRv4/PP-OCRv4_det_student.yml \
  -o Global.pretrained_model=./pretrain/det \
     Global.epoch_num=200 \
     Global.save_model_dir=./output/det_vi \
     Train.dataset.data_dir=../dataset/det \
     Train.dataset.label_file_list=[../dataset/det/train_label.txt] \
     Eval.dataset.data_dir=../dataset/det \
     Eval.dataset.label_file_list=[../dataset/det/val_label.txt]
```

## 3. Export sang inference model (BẮT BUỘC để service dùng)
```bash
!python tools/export_model.py -c configs/rec/PP-OCRv4/PP-OCRv4_rec.yml \
  -o Global.pretrained_model=./output/rec_vi/best_accuracy \
     Global.save_inference_dir=./inference/rec_vi

!python tools/export_model.py -c configs/det/PP-OCRv4/PP-OCRv4_det_student.yml \
  -o Global.pretrained_model=./output/det_vi/best_accuracy \
     Global.save_inference_dir=./inference/det_vi
```

## 4. Nạp vào service (không sửa code — chỉ set biến môi trường)
```bash
export PADDLE_DET_DIR=/path/PaddleOCR/inference/det_vi
export PADDLE_REC_DIR=/path/PaddleOCR/inference/rec_vi
export PADDLE_REC_DICT=/path/dataset/dict_vi.txt
```

> Lưu ý cho đồ án: DET fine-tune tốt nhất khi có thêm **hóa đơn scan/chụp thật** đã gán box
> (dùng `PPOCRLabel --lang vi`, bấm *Auto annotation* rồi sửa lại). Synthetic đủ để chạy demo
> và cho ra số liệu so sánh, nhưng trộn ~50–150 ảnh thật sẽ tăng độ chính xác trên hóa đơn thực tế.
