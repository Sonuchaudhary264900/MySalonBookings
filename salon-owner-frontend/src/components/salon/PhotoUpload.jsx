import React, { useRef, useState } from 'react';
import { Camera, X, Loader } from 'lucide-react';

/* ── Image compression via Canvas API (zero dependencies) ─────────────────
   • Resizes longest side to max 1920 px
   • Re-encodes as JPEG at 82% quality
   • If compressed blob is larger than original, keeps original
   • Non-image files (PDFs etc.) pass through untouched
────────────────────────────────────────────────────────────────────────── */
const MAX_DIMENSION = 1920;
const JPEG_QUALITY  = 0.82;

const compressImage = (file) =>
  new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }

    const img       = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width  = MAX_DIMENSION;
        } else {
          width  = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // no gain — keep original
          } else {
            const name = file.name.replace(/\.[^.]+$/, '.jpg');
            resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
          }
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });

/* ── Component ─────────────────────────────────────────────────────────── */
const PhotoUpload = ({ photos = [], onPhotosChange, disabled = false }) => {
  const inputRef                      = useRef(null);
  const [compressing, setCompressing] = useState(false);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;

    setCompressing(true);
    try {
      const compressed = await Promise.all(files.map(compressImage));
      onPhotosChange([...photos, ...compressed]);
    } finally {
      setCompressing(false);
    }
  };

  const handleRemove = (index) => onPhotosChange(photos.filter((_, i) => i !== index));

  const busy = disabled || compressing;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => !busy && inputRef.current?.click()}
          disabled={busy}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            busy
              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer'
          }`}
        >
          {compressing ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {compressing ? 'Compressing…' : 'Upload Photos'}
        </button>

        {photos.length > 0 && (
          <span className="text-sm text-gray-500">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </span>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <p className="text-xs text-gray-400">
        JPG, PNG, WebP · Auto-compressed to max 1920 px, 82% quality for faster uploads
      </p>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((file, i) => {
            const url = file instanceof File ? URL.createObjectURL(file) : file;
            return (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden bg-gray-100"
                style={{ aspectRatio: '1' }}
              >
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
