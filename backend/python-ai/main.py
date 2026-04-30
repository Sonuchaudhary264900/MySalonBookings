import os
import cv2
import math
import colorsys
import numpy as np
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.responses import JSONResponse
import mediapipe as mp

app = FastAPI()

INTERNAL_SECRET = os.getenv("HAIRSTYLE_INTERNAL_SECRET", "")
MODEL_VERSION   = "v1-rules"

mp_face_mesh = mp.solutions.face_mesh

# Pre-load model at startup (avoids cold-start delay on first request)
_face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
)

# ── Auth middleware ─────────────────────────────────────────────
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
    # Size check
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10MB)")

    # Decode
    nparr = np.frombuffer(contents, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    img_h, img_w = img.shape[:2]
    img_rgb      = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    gray         = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if laplacian_var < 50:
        return JSONResponse(status_code=422, content={
            "error": "blurry_image",
            "tips": ["Hold camera steady", "Ensure good lighting", "Move closer to the camera"],
        })

    # Run MediaPipe
    results = _face_mesh.process(img_rgb)
    if not results.multi_face_landmarks:
        return JSONResponse(status_code=422, content={
            "error": "no_face",
            "tips": ["Ensure your face is clearly visible", "Look directly at the camera", "Improve lighting"],
        })

    lm = results.multi_face_landmarks[0].landmark

    # Key landmark indices
    FOREHEAD_TOP   = 10
    CHIN_BOTTOM    = 152
    CHEEK_LEFT     = 234
    CHEEK_RIGHT    = 454
    JAW_LEFT       = 172
    JAW_RIGHT      = 58
    FOREHEAD_LEFT  = 67
    FOREHEAD_RIGHT = 296
    NOSE_TIP       = 1

    # Face size check: bounding box must be > 5% of image
    xs = [lm[CHEEK_LEFT].x, lm[CHEEK_RIGHT].x]
    ys = [lm[FOREHEAD_TOP].y, lm[CHIN_BOTTOM].y]
    bbox_area = (max(xs) - min(xs)) * (max(ys) - min(ys))
    if bbox_area < 0.05:
        return JSONResponse(status_code=422, content={
            "error": "face_too_small",
            "tips": ["Move closer to the camera", "Fill the frame with your face"],
        })

    # Extreme pose filter: nose tip should be near horizontal center
    nose_x_offset = abs(lm[NOSE_TIP].x - 0.5)
    if nose_x_offset > 0.25:
        return JSONResponse(status_code=422, content={
            "error": "angled_photo",
            "tips": ["Face the camera directly", "Keep your head straight", "Avoid tilting or turning"],
        })

    # Compute pixel distances
    def dist(a, b):
        return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

    face_height   = dist(lm[FOREHEAD_TOP], lm[CHIN_BOTTOM])
    face_width    = dist(lm[CHEEK_LEFT],   lm[CHEEK_RIGHT])
    jaw_width     = dist(lm[JAW_LEFT],     lm[JAW_RIGHT])
    forehead_w    = dist(lm[FOREHEAD_LEFT],lm[FOREHEAD_RIGHT])

    if face_width < 1e-6:
        return JSONResponse(status_code=422, content={"error": "no_face", "tips": ["Ensure your face is clearly visible"]})

    h2w = face_height / face_width
    j2w = jaw_width   / face_width
    f2w = forehead_w  / face_width
    j2f = jaw_width   / max(forehead_w, 1e-6)

    ratios = {"h2w": round(h2w, 3), "j2w": round(j2w, 3), "f2w": round(f2w, 3), "j2f": round(j2f, 3)}

    # Soft scoring — simultaneous, not if/else
    scores = {
        "oval":   max(0, h2w - 1.0)    * max(0, 1.1 - j2w),
        "round":  max(0, 1.3 - h2w)    * j2w,
        "square": max(0, 1.0 - abs(h2w - 1.1)) * min(j2w, f2w),
        "heart":  f2w                   * max(0, 1.0 - j2f),
        "oblong": max(0, h2w - 1.75)   * max(0, 1.0 - f2w),
    }

    total      = sum(scores.values())
    face_shape = max(scores, key=scores.get)
    raw_conf   = scores[face_shape] / max(total, 1e-9)
    confidence = round(raw_conf, 3)

    if max(scores.values()) < 0.15:
        return JSONResponse(status_code=422, content={
            "ambiguous":  True,
            "confidence": confidence,
            "tips": ["Use natural lighting", "Face camera directly", "Remove glasses if wearing any"],
        })

    # Probabilistic secondary shape
    sorted_shapes = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    secondary      = sorted_shapes[1] if len(sorted_shapes) > 1 and sorted_shapes[1][1] > 0.4 * sorted_shapes[0][1] else None

    # Hair density (pixel variance above forehead)
    hair_y_end   = int(lm[FOREHEAD_TOP].y * img_h)
    hair_y_start = max(0, hair_y_end - int(0.12 * img_h))
    patch_hair   = gray[hair_y_start:hair_y_end, :]
    hair_var     = float(np.var(patch_hair)) if patch_hair.size > 0 else 0
    hair_density = "thick" if hair_var > 800 else "medium" if hair_var > 300 else "fine"

    # Skin tone (cheek landmark patch)
    cx = int(lm[CHEEK_LEFT].x * img_w)
    cy = int(lm[CHEEK_LEFT].y * img_h)
    patch_skin  = img_rgb[max(0, cy-5):cy+5, max(0, cx-5):cx+5]
    if patch_skin.size > 0:
        mean_rgb    = patch_skin.mean(axis=(0, 1)) / 255.0
        lightness   = colorsys.rgb_to_hsv(*mean_rgb)[2]
    else:
        lightness = 0.6
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
