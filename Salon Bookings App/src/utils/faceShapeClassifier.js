/**
 * On-device face shape classifier using ML Kit contour points.
 * Mirrors the soft-scoring logic in backend/python-ai/main.py.
 */

function minMax(points, axis) {
  const vals = points.map(p => p[axis]);
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function dist2D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * @param {Array<{x:number,y:number}>} contour  ML Kit FACE contour (~36 points)
 * @returns {{ faceShape, confidence, ratios, detectionMode: 'on_device' }}
 */
export function classifyFromContour(contour) {
  if (!contour || contour.length < 10) return null;

  const xs = contour.map(p => p.x);
  const ys = contour.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);

  const faceWidth  = xMax - xMin;
  const faceHeight = yMax - yMin;
  if (faceWidth < 1e-6) return null;

  // Approximate jaw width as bottom-quarter horizontal span
  const jawPoints = contour.filter(p => p.y > yMin + faceHeight * 0.65);
  const jawXs     = jawPoints.map(p => p.x);
  const jawWidth  = jawXs.length > 1 ? Math.max(...jawXs) - Math.min(...jawXs) : faceWidth * 0.75;

  // Approximate forehead width as top-quarter horizontal span
  const forePoints = contour.filter(p => p.y < yMin + faceHeight * 0.35);
  const foreXs     = forePoints.map(p => p.x);
  const foreWidth  = foreXs.length > 1 ? Math.max(...foreXs) - Math.min(...foreXs) : faceWidth * 0.85;

  const h2w = faceHeight / faceWidth;
  const j2w = jawWidth   / faceWidth;
  const f2w = foreWidth  / faceWidth;
  const j2f = jawWidth   / Math.max(foreWidth, 1e-6);

  const scores = {
    oval:   Math.max(0, h2w - 1.0)          * Math.max(0, 1.1 - j2w),
    round:  Math.max(0, 1.3 - h2w)          * j2w,
    square: Math.max(0, 1.0 - Math.abs(h2w - 1.1)) * Math.min(j2w, f2w),
    heart:  f2w                              * Math.max(0, 1.0 - j2f),
    oblong: Math.max(0, h2w - 1.75)         * Math.max(0, 1.0 - f2w),
  };

  const total     = Object.values(scores).reduce((a, b) => a + b, 0);
  const faceShape = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  const confidence = total > 1e-9 ? Math.round((scores[faceShape] / total) * 1000) / 1000 : 0;

  if (scores[faceShape] < 0.15) return null; // ambiguous — fall through to server

  return {
    faceShape,
    confidence,
    ratios: {
      h2w: Math.round(h2w * 1000) / 1000,
      j2w: Math.round(j2w * 1000) / 1000,
      f2w: Math.round(f2w * 1000) / 1000,
      j2f: Math.round(j2f * 1000) / 1000,
    },
    detectionMode: 'on_device',
  };
}
