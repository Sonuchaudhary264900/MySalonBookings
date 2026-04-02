import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import api from '../services/api';

const GalleryUploadContext = createContext(null);
export const useGalleryUpload = () => useContext(GalleryUploadContext);

/* ── Client-side image compression (canvas) ── */
const compressImage = (file, maxW = 1920) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg', 0.85
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

export function GalleryUploadProvider({ children }) {
  const [uploads, setUploads]               = useState([]);
  const [lastCompletedAt, setLastCompletedAt] = useState(null);

  // Internal queue — items waiting to be uploaded
  const queueRef      = useRef([]);
  const processingRef = useRef(false);

  const patchItem = useCallback((id, patch) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }, []);

  /* Run items from the queue one by one */
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      patchItem(item.id, { status: 'uploading', progress: 5 });

      try {
        if (item.mediaType === 'image') {
          const compressed = await compressImage(item.file);
          patchItem(item.id, { progress: 30 });

          const fd = new FormData();
          fd.append('image', compressed);
          await api.post('/owner/gallery', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const pct = Math.round((e.loaded / e.total) * 60) + 30;
              patchItem(item.id, { progress: pct });
            },
          });
        } else {
          // Videos: upload raw — Cloudinary optimises on delivery
          const fd = new FormData();
          fd.append('video', item.file);
          await api.post('/owner/gallery/video', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const pct = Math.round((e.loaded / e.total) * 90) + 5;
              patchItem(item.id, { progress: pct });
            },
          });
        }

        patchItem(item.id, { status: 'done', progress: 100 });
        setLastCompletedAt(Date.now());
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Upload failed';
        patchItem(item.id, { status: 'error', error: msg });
      }
    }

    processingRef.current = false;
  }, [patchItem]);

  /* Add files to queue and kick off processing */
  const enqueueUploads = useCallback((fileItems) => {
    const items = fileItems.map(f => ({
      ...f,
      status:   'pending',
      progress: 0,
      error:    null,
    }));
    setUploads(prev => [...prev, ...items]);
    queueRef.current.push(...items);
    processQueue();
  }, [processQueue]);

  /* Dismiss done/error items from the floating bar */
  const clearDone = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'done' && u.status !== 'error'));
  }, []);

  return (
    <GalleryUploadContext.Provider value={{ uploads, enqueueUploads, clearDone, lastCompletedAt }}>
      {children}
    </GalleryUploadContext.Provider>
  );
}
