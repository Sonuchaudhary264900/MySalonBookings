"""
StyleAI API — Supervised Learning Version
GlowLoox · Gigamind Technologies Pvt. Ltd.

Uses trained Random Forest / Neural Network model for face shape detection.
Falls back to rule-based if model files are not found.
Same API contract — frontend needs zero changes.
"""

import os
import math
import colorsys
import urllib.request
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import JSONResponse
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks_python
from mediapipe.tasks.python import vision as mp_vision

app = FastAPI()

INTERNAL_SECRET = os.getenv("HAIRSTYLE_INTERNAL_SECRET", "")
MODEL_VERSION   = "v2-supervised"

# ── Paths ──────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
MP_MODEL_PATH  = os.path.join(BASE_DIR, "face_landmarker.task")
ML_MODEL_PATH  = os.path.join(BASE_DIR, "face_shape_model.pkl")
ENCODER_PATH   = os.path.join(BASE_DIR, "label_encoder.pkl")
MODEL_URL      = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)

# ── Download MediaPipe model if needed ────────────────────────────
def _ensure_mp_model():
    if not os.path.exists(MP_MODEL_PATH):
        print("StyleAI: downloading face landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MP_MODEL_PATH)
        print("StyleAI: download complete.")

_ensure_mp_model()

# ── Load MediaPipe FaceLandmarker ─────────────────────────────────
_options = mp_vision.FaceLandmarkerOptions(
    base_options=mp_tasks_python.BaseOptions(model_asset_path=MP_MODEL_PATH),
    running_mode=mp_vision.RunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False,
)
_landmarker = mp_vision.FaceLandmarker.create_from_options(_options)
print("StyleAI: FaceLandmarker ready.")

# ── Load trained ML model ─────────────────────────────────────────
_ml_model  = None
_label_enc = None
_use_ml    = False

if os.path.exists(ML_MODEL_PATH) and os.path.exists(ENCODER_PATH):
    try:
        import joblib
        _ml_model  = joblib.load(ML_MODEL_PATH)
        _label_enc = joblib.load(ENCODER_PATH)
        _use_ml    = True
        print(f"StyleAI: ML model loaded — supervised learning active ({MODEL_VERSION})")
        print(f"StyleAI: Classes: {list(_label_enc.classes_)}")
    except Exception as e:
        print(f"StyleAI: ML model load failed ({e}) — falling back to rule-based")
else:
    print("StyleAI: No trained model found — using rule-based fallback")

# ── Auth middleware ───────────────────────────────────────────────
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    token = request.headers.get("X-Internal-Token", "")
    if INTERNAL_SECRET and token != INTERNAL_SECRET:
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    return await call_next(request)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": MODEL_VERSION,
        "mode": "supervised" if _use_ml else "rule-based",
    }


# ── Build feature vector from landmarks ──────────────────────────
def landmarks_to_features(lm):
    xs = [p.x for p in lm]
    ys = [p.y for p in lm]
    zs = [p.z for p in lm]

    def dist(a, b):
        return math.sqrt((lm[a].x - lm[b].x)**2 + (lm[a].y - lm[b].y)**2)

    face_height = dist(10,  152)
    face_width  = dist(234, 454)
    jaw_width   = dist(172, 58)
    forehead_w  = dist(67,  296)

    h2w = face_height / max(face_width,  1e-6)
    j2w = jaw_width   / max(face_width,  1e-6)
    f2w = forehead_w  / max(face_width,  1e-6)
    j2f = jaw_width   / max(forehead_w,  1e-6)

    features = np.array(xs + ys + zs + [h2w, j2w, f2w, j2f], dtype=np.float32)

    # Pad or trim to match training shape if needed
    if _ml_model is not None:
        try:
            expected = _ml_model.n_features_in_
        except AttributeError:
            try:
                expected = _ml_model.named_steps['mlp'].n_features_in_
            except Exception:
                expected = len(features)
        if len(features) < expected:
            features = np.pad(features, (0, expected - len(features)))
        elif len(features) > expected:
            features = features[:expected]

    return features


# ── Rule-based fallback ───────────────────────────────────────────
def rule_based_shape(lm):
    def dist(a, b):
        return math.sqrt((lm[a].x - lm[b].x)**2 + (lm[a].y - lm[b].y)**2)

    face_height = dist(10,  152)
    face_width  = dist(234, 454)
    jaw_width   = dist(172, 58)
    forehead_w  = dist(67,  296)

    if face_width < 1e-6:
        return None, None, None

    h2w = face_height / face_width
    j2w = jaw_width   / face_width
    f2w = forehead_w  / face_width
    j2f = jaw_width   / max(forehead_w, 1e-6)

    scores = {
        "oval":   max(0, h2w - 1.0)          * max(0, 1.1 - j2w),
        "round":  max(0, 1.3 - h2w)          * j2w,
        "square": max(0, 1.0 - abs(h2w-1.1)) * min(j2w, f2w),
        "heart":  f2w                         * max(0, 1.0 - j2f),
        "oblong": max(0, h2w - 1.75)         * max(0, 1.0 - f2w),
    }
    total      = sum(scores.values())
    face_shape = max(scores, key=scores.get)
    confidence = round(scores[face_shape] / max(total, 1e-9), 3)
    return face_shape, confidence, scores


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10MB)")

    nparr = np.frombuffer(contents, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    img_h, img_w = img.shape[:2]
    img_rgb      = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    gray         = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection
    if float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 50:
        return JSONResponse(status_code=422, content={
            "error": "blurry_image",
            "tips": ["Hold camera steady", "Ensure good lighting", "Move closer to camera"],
        })

    # Run FaceLandmarker
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result   = _landmarker.detect(mp_image)

    if not result.face_landmarks:
        return JSONResponse(status_code=422, content={
            "error": "no_face",
            "tips": ["Face camera directly", "Better lighting", "Remove glasses if wearing any"],
        })

    lm = result.face_landmarks[0]

    # Face size check
    xs        = [lm[234].x, lm[454].x]
    ys        = [lm[10].y,  lm[152].y]
    bbox_area = (max(xs) - min(xs)) * (max(ys) - min(ys))
    if bbox_area < 0.05:
        return JSONResponse(status_code=422, content={
            "error": "face_too_small",
            "tips": ["Move closer to camera", "Fill the frame with your face"],
        })

    # Extreme pose filter
    if abs(lm[1].x - 0.5) > 0.25:
        return JSONResponse(status_code=422, content={
            "error": "angled_photo",
            "tips": ["Face camera directly", "Keep your head straight"],
        })

    # ── Face shape detection ──────────────────────────────────────
    if _use_ml:
        features   = landmarks_to_features(lm).reshape(1, -1)
        face_shape = _label_enc.inverse_transform(_ml_model.predict(features))[0]
        proba      = _ml_model.predict_proba(features)[0]
        confidence = float(proba.max())
        scores     = {cls: round(float(p), 4) for cls, p in zip(_label_enc.classes_, proba)}
        sorted_s   = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        secondary  = sorted_s[1] if len(sorted_s) > 1 and sorted_s[1][1] > 0.15 else None
    else:
        face_shape, confidence, scores = rule_based_shape(lm)
        if face_shape is None:
            return JSONResponse(status_code=422, content={"error": "no_face", "tips": ["Ensure your face is clearly visible"]})
        if max(scores.values()) < 0.15:
            return JSONResponse(status_code=422, content={
                "ambiguous": True, "confidence": confidence,
                "tips": ["Use natural lighting", "Face camera directly", "Remove glasses"],
            })
        sorted_s  = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        secondary = sorted_s[1] if len(sorted_s) > 1 and sorted_s[1][1] > 0.4 * sorted_s[0][1] else None
        scores    = {k: round(v, 4) for k, v in scores.items()}

    # ── Hair density ──────────────────────────────────────────────
    hair_y_end   = int(lm[10].y * img_h)
    hair_y_start = max(0, hair_y_end - int(0.12 * img_h))
    patch_hair   = gray[hair_y_start:hair_y_end, :]
    hair_var     = float(np.var(patch_hair)) if patch_hair.size > 0 else 0
    hair_density = "thick" if hair_var > 800 else "medium" if hair_var > 300 else "fine"

    # ── Skin tone ─────────────────────────────────────────────────
    cx        = int(lm[234].x * img_w)
    cy        = int(lm[234].y * img_h)
    patch_sk  = img_rgb[max(0, cy-5):cy+5, max(0, cx-5):cx+5]
    lightness = colorsys.rgb_to_hsv(*(patch_sk.mean(axis=(0,1)) / 255.0))[2] if patch_sk.size > 0 else 0.6
    skin_tone = "fair" if lightness > 0.75 else "medium" if lightness > 0.55 else "olive" if lightness > 0.38 else "deep"

    return {
        "faceShape":           face_shape,
        "confidence":          round(confidence, 3),
        "secondaryShape":      secondary[0] if secondary else None,
        "secondaryConfidence": round(secondary[1], 3) if secondary else None,
        "scores":              scores,
        "hairDensity":         hair_density,
        "skinTone":            skin_tone,
        "version":             MODEL_VERSION,
        "mode":                "supervised" if _use_ml else "rule-based",
    }
