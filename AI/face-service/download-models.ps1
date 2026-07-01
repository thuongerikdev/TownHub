$ErrorActionPreference = "Stop"

$modelDirectory = Join-Path $PSScriptRoot "models"
New-Item -ItemType Directory -Force -Path $modelDirectory | Out-Null

$models = @{
    "face_detection_yunet_2023mar.onnx" = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    "face_recognition_sface_2021dec.onnx" = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
}

foreach ($model in $models.GetEnumerator()) {
    $destination = Join-Path $modelDirectory $model.Key
    if (Test-Path $destination) {
        Write-Host "Da co: $($model.Key)"
        continue
    }

    Write-Host "Dang tai: $($model.Key)"
    Invoke-WebRequest -Uri $model.Value -OutFile $destination
}

Write-Host "Da tai xong mo hinh YuNet va SFace."
