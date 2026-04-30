import { useEffect, useRef } from 'react';

const SHAPES = {
  oval:   { tag: 'ellipse', attrs: { cx: 100, cy: 120, rx: 80,  ry: 100 } },
  round:  { tag: 'circle',  attrs: { cx: 100, cy: 100, r:  95 } },
  square: { tag: 'rect',    attrs: { x: 10, y: 10, width: 180, height: 185, rx: 20 } },
  oblong: { tag: 'ellipse', attrs: { cx: 100, cy: 130, rx: 65,  ry: 115 } },
  heart:  { tag: 'path',    attrs: { d: 'M100,170 Q20,100 10,60 Q10,10 60,10 Q80,10 100,30 Q120,10 140,10 Q190,10 190,60 Q180,100 100,170Z' } },
};

export default function FaceShapeReveal({ imageUrl, faceShape, onComplete }) {
  const shapeRef  = useRef(null);
  const textRef   = useRef(null);

  useEffect(() => {
    const el = shapeRef.current;
    if (!el) return;

    const len = el.getTotalLength ? el.getTotalLength() : 400;
    el.style.strokeDasharray  = len;
    el.style.strokeDashoffset = len;
    el.style.transition       = 'stroke-dashoffset 1.2s ease-out';

    const t1 = setTimeout(() => {
      el.style.strokeDashoffset = '0';
    }, 100);

    const t2 = setTimeout(() => {
      if (textRef.current) textRef.current.style.opacity = '1';
    }, 1300);

    const t3 = setTimeout(() => {
      onComplete?.();
    }, 1900);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [faceShape]);

  const shape = SHAPES[faceShape] || SHAPES.oval;

  return (
    <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto' }}>
      {/* User photo in circle */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Your face"
          style={{ width: 220, height: 220, borderRadius: '50%', objectFit: 'cover', position: 'absolute' }}
        />
      )}

      {/* SVG outline animation */}
      <svg
        viewBox="0 0 200 200"
        style={{ position: 'absolute', top: 0, left: 0, width: 220, height: 220 }}
      >
        <defs>
          <linearGradient id="fsr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {shape.tag === 'path' ? (
          <path
            ref={shapeRef}
            d={shape.attrs.d}
            fill="none"
            stroke="url(#fsr-grad)"
            strokeWidth="3"
          />
        ) : shape.tag === 'ellipse' ? (
          <ellipse
            ref={shapeRef}
            cx={shape.attrs.cx} cy={shape.attrs.cy}
            rx={shape.attrs.rx} ry={shape.attrs.ry}
            fill="none" stroke="url(#fsr-grad)" strokeWidth="3"
          />
        ) : shape.tag === 'circle' ? (
          <circle
            ref={shapeRef}
            cx={shape.attrs.cx} cy={shape.attrs.cy} r={shape.attrs.r}
            fill="none" stroke="url(#fsr-grad)" strokeWidth="3"
          />
        ) : (
          <rect
            ref={shapeRef}
            x={shape.attrs.x} y={shape.attrs.y}
            width={shape.attrs.width} height={shape.attrs.height} rx={shape.attrs.rx}
            fill="none" stroke="url(#fsr-grad)" strokeWidth="3"
          />
        )}
      </svg>

      {/* Face shape name */}
      <div
        ref={textRef}
        style={{
          position:   'absolute', bottom: -36, left: 0, right: 0,
          textAlign:  'center',
          fontSize:   18, fontWeight: 700,
          background: 'linear-gradient(90deg, #f59e0b, #ec4899)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity:    0, transition: 'opacity 0.5s',
        }}
      >
        {faceShape ? faceShape.charAt(0).toUpperCase() + faceShape.slice(1) : ''} Face
      </div>
    </div>
  );
}
