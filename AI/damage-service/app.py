import base64
import io
from pathlib import Path
from typing import List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO


app = FastAPI(title="TownHub Damage Detection", version="1.0.0")

MODEL_DIR = Path(__file__).resolve().parent / "models"
DETECTION_MODEL = MODEL_DIR / "best.pt"

CONF_THRESHOLD = 0.25
IOU_THRESHOLD = 0.6

_model: Optional[YOLO] = None


class DetectRequest(BaseModel):
    imageDataUrl: str


class Detection(BaseModel):
    label: str
    confidence: float
    bbox: List[float]


class DetectResponse(BaseModel):
    detections: List[Detection]
    topLabel: Optional[str] = None
    topConfidence: Optional[float] = None


def get_model() -> YOLO:
    global _model
    if not DETECTION_MODEL.exists():
        raise HTTPException(
            status_code=503,
            detail="Damage detection model is missing. Copy best.pt into models/.",
        )
    if _model is None:
        _model = YOLO(str(DETECTION_MODEL))
    return _model


def decode_image(value: str) -> Image.Image:
    try:
        encoded = value.split(",", 1)[1] if "," in value else value
        raw = base64.b64decode(encoded)
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image data") from exc


@app.get("/health")
def health():
    get_model()
    return {"status": "ok", "engine": "YOLOv8"}


@app.post("/detect", response_model=DetectResponse)
def detect(request: DetectRequest):
    model = get_model()
    image = decode_image(request.imageDataUrl)

    results = model.predict(
        np.asarray(image), conf=CONF_THRESHOLD, iou=IOU_THRESHOLD, verbose=False
    )
    result = results[0]

    detections: List[Detection] = []
    for box in result.boxes:
        cls_id = int(box.cls[0])
        detections.append(
            Detection(
                label=result.names[cls_id],
                confidence=float(box.conf[0]),
                bbox=[float(v) for v in box.xyxy[0].tolist()],
            )
        )
    detections.sort(key=lambda d: d.confidence, reverse=True)

    top = detections[0] if detections else None
    return DetectResponse(
        detections=detections,
        topLabel=top.label if top else None,
        topConfidence=top.confidence if top else None,
    )
