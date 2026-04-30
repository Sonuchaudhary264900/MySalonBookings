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
MODEL_VERSION   = "v1-rules"

# ── Download face landmarker model on first run ──────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
MODEL_URL  = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)

def _ensure_model():
    if not os.path.exists(MODEL_PATH):
        print(f"StyleAI: downloading face landmarker model to {MODEL_PATH} ...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("StyleAI: model download complete.")

_ensure_model()

# ── Pre-load landmarker at startup ───────────────────────────────
_options = mp_vision.FaceLandmarkerOptions(
    base_options=mp_tasks_python.BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=mp_vision.RunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False,
)
_landmarker = mp_vision.FaceLandmarker.create_from_options(_options)
print("StyleAI: FaceLandmarker ready.")

# ── Auth middleware ──────────────────────────────────────────────
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
    return {"status": "ok", "version": MODEL_VERSION}

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

    # Run FaceLandmarker (new Tasks API)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result   = _landmarker.detect(mp_image)

    if not result.face_landmarks:
        return JSONResponse(status_code=422, content={
            "error": "no_face",
            "tips": ["Face camera directly", "Better lighting", "Remove glasses if wearing any"],
        })

    lm = result.face_landmarks[0]  # list of NormalizedLandmark (x, y, z, 0..1)

    # Landmark indices (same as before — 468 landmark model)
    FOREHEAD_TOP   = 10
    CHIN_BOTTOM    = 152
    CHEEK_LEFT     = 234
    CHEEK_RIGHT    = 454
    JAW_LEFT       = 172
    JAW_RIGHT      = 58
    FOREHEAD_LEFT  = 67
    FOREHEAD_RIGHT = 296
    NOSE_TIP       = 1

    # Face size check
    xs        = [lm[CHEEK_LEFT].x, lm[CHEEK_RIGHT].x]
    ys        = [lm[FOREHEAD_TOP].y, lm[CHIN_BOTTOM].y]
    bbox_area = (max(xs) - min(xs)) * (max(ys) - min(ys))
    if bbox_area < 0.05:
        return JSONResponse(status_code=422, content={
            "error": "face_too_small",
            "tips": ["Move closer to camera", "Fill the frame with your face"],
        })

    # Extreme pose filter
    if abs(lm[NOSE_TIP].x - 0.5) > 0.25:
        return JSONResponse(status_code=422, content={
            "error": "angled_photo",
            "tips": ["Face camera directly", "Keep your head straight"],
        })

    # Ratios (normalized coordinates — no pixel conversion needed)
    def dist(a, b):
        return math.sqrt((lm[a].x - lm[b].x) ** 2 + (lm[a].y - lm[b].y) ** 2)

    face_height = dist(FOREHEAD_TOP, CHIN_BOTTOM)
    face_width  = dist(CHEEK_LEFT,   CHEEK_RIGHT)
    jaw_width   = dist(JAW_LEFT,     JAW_RIGHT)
    forehead_w  = dist(FOREHEAD_LEFT, FOREHEAD_RIGHT)

    if face_width < 1e-6:
        return JSONResponse(status_code=422, content={"error": "no_face", "tips": ["Ensure your face is clearly visible"]})

    h2w = face_height / face_width
    j2w = jaw_width   / face_width
    f2w = forehead_w  / face_width
    j2f = jaw_width   / max(forehead_w, 1e-6)
    ratios = {"h2w": round(h2w, 3), "j2w": round(j2w, 3), "f2w": round(f2w, 3), "j2f": round(j2f, 3)}

    # Soft scoring
    scores = {
        "oval":   max(0, h2w - 1.0)         * max(0, 1.1 - j2w),
        "round":  max(0, 1.3 - h2w)         * j2w,
        "square": max(0, 1.0 - abs(h2w-1.1))* min(j2w, f2w),
        "heart":  f2w                        * max(0, 1.0 - j2f),
        "oblong": max(0, h2w - 1.75)        * max(0, 1.0 - f2w),
    }
    total      = sum(scores.values())
    face_shape = max(scores, key=scores.get)
    confidence = round(scores[face_shape] / max(total, 1e-9), 3)

    if max(scores.values()) < 0.15:
        return JSONResponse(status_code=422, content={
            "ambiguous":  True,
            "confidence": confidence,
            "tips": ["Use natural lighting", "Face camera directly", "Remove glasses"],
        })

    # Secondary shape
    sorted_s  = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    secondary = sorted_s[1] if len(sorted_s) > 1 and sorted_s[1][1] > 0.4 * sorted_s[0][1] else None

    # Hair density (pixel region above forehead)
    hair_y_end   = int(lm[FOREHEAD_TOP].y * img_h)
    hair_y_start = max(0, hair_y_end - int(0.12 * img_h))
    patch_hair   = gray[hair_y_start:hair_y_end, :]
    hair_var     = float(np.var(patch_hair)) if patch_hair.size > 0 else 0
    hair_density = "thick" if hair_var > 800 else "medium" if hair_var > 300 else "fine"

    # Skin tone (cheek patch)
    cx        = int(lm[CHEEK_LEFT].x * img_w)
    cy        = int(lm[CHEEK_LEFT].y * img_h)
    patch_sk  = img_rgb[max(0, cy-5):cy+5, max(0, cx-5):cx+5]
    lightness = colorsys.rgb_to_hsv(*(patch_sk.mean(axis=(0,1)) / 255.0))[2] if patch_sk.size > 0 else 0.6
    skin_tone = "fair" if lightness > 0.75 else "medium" if lightness > 0.55 else "olive" if lightness > 0.38 else "deep"

    return {
        "faceShape":           face_shape,
        "confidence":          confidence,
        "secondaryShape":      secondary[0] if secondary else None,
        "secondaryConfidence": round(secondary[1] / max(total, 1e-9), 3) if secondary else None,
        "ratios":              ratios,
        "scores":              {k: round(v, 4) for k, v in scores.items()},
        "hairDensity":         hair_density,
        "skinTone":            skin_tone,
        "version":             MODEL_VERSION,
    }
