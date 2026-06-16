import base64
import io
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel, Field


app = FastAPI(title="TownHub Face Recognition", version="2.0.0")

MODEL_DIR = Path(__file__).resolve().parent / "models"
DETECTION_MODEL = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNITION_MODEL = MODEL_DIR / "face_recognition_sface_2021dec.onnx"

_detector = None
_recognizer = None


class Candidate(BaseModel):
    residentId: int
    residentName: str
    imageDataUrl: str


class RecognitionRequest(BaseModel):
    probeImage: str
    candidates: List[Candidate] = Field(default_factory=list)
    tolerance: float = 0.5


class RecognitionResponse(BaseModel):
    faceDetected: bool
    matchedResidentId: Optional[int] = None
    confidence: Optional[float] = None


class ValidationRequest(BaseModel):
    imageDataUrl: str


def get_models():
    global _detector, _recognizer
    if not DETECTION_MODEL.exists() or not RECOGNITION_MODEL.exists():
        raise HTTPException(
            status_code=503,
            detail="Face AI model files are missing. Run download-models.ps1.",
        )

    if _detector is None:
        _detector = cv2.FaceDetectorYN.create(
            str(DETECTION_MODEL), "", (320, 320), 0.75, 0.3, 5000
        )
    if _recognizer is None:
        _recognizer = cv2.FaceRecognizerSF.create(str(RECOGNITION_MODEL), "")
    return _detector, _recognizer


def decode_image(value: str) -> np.ndarray:
    try:
        encoded = value.split(",", 1)[1] if "," in value else value
        raw = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(raw)).convert("RGB")
        return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image data") from exc


def extract_feature(image_data: str) -> Optional[np.ndarray]:
    image = decode_image(image_data)
    height, width = image.shape[:2]
    detector, recognizer = get_models()
    detector.setInputSize((width, height))
    _, faces = detector.detect(image)
    if faces is None or len(faces) == 0:
        return None

    face = max(faces, key=lambda item: float(item[2] * item[3]))
    aligned_face = recognizer.alignCrop(image, face)
    return recognizer.feature(aligned_face)


@app.get("/health")
def health():
    get_models()
    return {"status": "ok", "engine": "OpenCV YuNet + SFace"}


@app.post("/validate")
def validate(request: ValidationRequest):
    feature = extract_feature(request.imageDataUrl)
    return {"faceDetected": feature is not None}


@app.post("/recognize", response_model=RecognitionResponse)
def recognize(request: RecognitionRequest):
    probe = extract_feature(request.probeImage)
    if probe is None:
        return RecognitionResponse(faceDetected=False)

    _, recognizer = get_models()
    best_resident_id = None
    best_score = -1.0

    for candidate in request.candidates:
        known = extract_feature(candidate.imageDataUrl)
        if known is None:
            continue
        score = float(
            recognizer.match(probe, known, cv2.FaceRecognizerSF_FR_COSINE)
        )
        if score > best_score:
            best_score = score
            best_resident_id = candidate.residentId

    if best_resident_id is None:
        return RecognitionResponse(faceDetected=True, confidence=0.0)

    # OpenCV SFace recommends cosine >= 0.363 for matching identities.
    tolerance = max(0.0, min(1.0, request.tolerance))
    threshold = max(0.32, min(0.42, 0.413 - tolerance * 0.1))
    confidence = max(0.0, min(1.0, best_score))

    if best_score >= threshold:
        return RecognitionResponse(
            faceDetected=True,
            matchedResidentId=best_resident_id,
            confidence=confidence,
        )
    return RecognitionResponse(faceDetected=True, confidence=confidence)
