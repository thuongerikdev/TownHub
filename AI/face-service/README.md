# TownHub Face AI

Dich vu phat hien khuon mat bang YuNet va nhan dien cu dan bang SFace.

## Chay tren Windows

Tai model mot lan:

```powershell
cd D:\AI_AI_Job\TownHub-master\AI\face-service
powershell -ExecutionPolicy Bypass -File .\download-models.ps1
```

Khoi dong dich vu:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-ai.ps1
```

## Chay bang Docker

Can tai model truoc khi build:

```powershell
powershell -ExecutionPolicy Bypass -File .\download-models.ps1
docker build -t townhub-face-ai .
docker run --rm -p 8001:8001 --name townhub-face-ai townhub-face-ai
```

Kiem tra `http://localhost:8001/health`. Ket qua phai co:

```json
{"status":"ok","engine":"OpenCV YuNet + SFace"}
```

Backend doc dia chi service tu bien `FACE_AI_URL`, mac dinh la
`http://localhost:8001`.
