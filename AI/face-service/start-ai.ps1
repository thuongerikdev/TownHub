$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Chua co .venv. Chay: python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

$detectionModel = Join-Path $root "models\face_detection_yunet_2023mar.onnx"
$recognitionModel = Join-Path $root "models\face_recognition_sface_2021dec.onnx"
if (-not (Test-Path -LiteralPath $detectionModel) -or -not (Test-Path -LiteralPath $recognitionModel)) {
    throw "Chua co model AI. Chay: powershell -ExecutionPolicy Bypass -File .\download-models.ps1"
}

Set-Location $root
Write-Host "TownHub Face AI: http://localhost:8001" -ForegroundColor Green
Write-Host "Nhan Ctrl+C de dung service." -ForegroundColor DarkGray
& $python -m uvicorn app:app --host 127.0.0.1 --port 8001
