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
  const [uploads, setUploads]                 = useState([]);
  const [lastCompletedAt, setLastCompletedAt] = useState(null);

  const queueRef      = useRef([]);
  const processingRef = useRef(false);

  const patchItem = useCallback((id, patch) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }, []);

  /* ── Animate progress bar from current% toward cap over time ── */
  const animateTo = useCallback((id, cap, intervalMs = 400) => {
    const timer = setInterval(() => {
      setUploads(prev => {
        const u = prev.find(x => x.id === id);
        if (!u || u.progress >= cap || u.status === 'done' || u.status === 'error') {
          clearInterval(timer);
          return prev;
        }
        // creep 2% per tick toward cap
        const next = Math.min(cap, u.progress + 2);
        return prev.map(x => x.id === id ? { ...x, progress: next } : x);
      });
    }, intervalMs);
    return timer;
  }, []);

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

          // Creep bar to 88 while waiting for server response
          const timer = animateTo(item.id, 88);
          await api.post('/owner/gallery', fd, {
            headers: { 'Content-Type': undefined }, // let axios auto-set multipart boundary
            onUploadProgress: (e) => {
              clearInterval(timer);
              // e.progress is 0-1 in axios ≥1.x; fallback for older
              const ratio = typeof e.progress === 'number'
                ? e.progress
                : (e.total > 0 ? e.loaded / e.total : 0);
              patchItem(item.id, { progress: Math.min(90, Math.round(ratio * 60) + 30) });
            },
          });
          clearInterval(timer);

        } else {
          const fd = new FormData();
          fd.append('video', item.file);

          // Creep bar to 92 while waiting — video can take a while server→Cloudinary
          const timer = animateTo(item.id, 92, 600);
          await api.post('/owner/gallery/video', fd, {
            headers: { 'Content-Type': undefined }, // let axios auto-set multipart boundary
            onUploadProgress: (e) => {
              const ratio = typeof e.progress === 'number'
                ? e.progress
                : (e.total > 0 ? e.loaded / e.total : 0);
              if (ratio > 0) {
                clearInterval(timer);
                patchItem(item.id, { progress: Math.min(92, Math.round(ratio * 87) + 5) });
              }
            },
          });
          clearInterval(timer);
        }

        patchItem(item.id, { status: 'done', progress: 100 });
        setLastCompletedAt(Date.now());
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Upload failed';
        patchItem(item.id, { status: 'error', error: msg });
      }
    }

    processingRef.current = false;
  }, [patchItem, animateTo]);

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

  const clearDone = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'done' && u.status !== 'error'));
  }, []);

  return (
    <GalleryUploadContext.Provider value={{ uploads, enqueueUploads, clearDone, lastCompletedAt }}>
      {children}
    </GalleryUploadContext.Provider>
  );
}
