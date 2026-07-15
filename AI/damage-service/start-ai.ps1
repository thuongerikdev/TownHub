$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Chua co .venv. Chay: python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

$model = Join-Path $root "models\best.pt"
if (-not (Test-Path -LiteralPath $model)) {
    throw "Chua co model AI. Copy best.pt (tu runs\train\apartment_damage_v1\weights\) vao models\."
}

Set-Location $root
Write-Host "TownHub Damage Detection AI: http://localhost:8002" -ForegroundColor Green
Write-Host "Nhan Ctrl+C de dung service." -ForegroundColor DarkGray
& $python -m uvicorn app:app --host 127.0.0.1 --port 8002
