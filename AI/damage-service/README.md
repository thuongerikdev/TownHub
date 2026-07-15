# TownHub Damage Detection AI

Dich vu nhan dien hu hong chung cu (nut tuong, nut san, loi gach, hong dien, hu hong cong trinh)
bang YOLOv8m, dung de goi y `category` khi tao Ticket trong module Complaint Management.

## Chay tren Windows

Cai moi truong mot lan:

```powershell
cd D:\DATN\TownHub\AI\damage-service
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Khoi dong dich vu:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-ai.ps1
```

Kiem tra `http://localhost:8002/health`. Ket qua phai co:

```json
{"status":"ok","engine":"YOLOv8"}
```

Backend doc dia chi service tu bien `DAMAGE_AI_URL`, mac dinh la `http://localhost:8002`.

## Model

`models/best.pt` la YOLOv8m fine-tune tu `D:\DATN\AI\apartment_damage_detection.ipynb`
(5 lop: wall_crack, floor_crack, tile_defect, electrical_damage, building_damage).
