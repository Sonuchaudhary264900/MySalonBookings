import { createContext, useContext, useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { MAX_VIDEO_MB, MAX_VIDEO_SECONDS } from '../components/gallery/UploadModal';

const GalleryUploadContext = createContext(null);
export const useGalleryUpload = () => useContext(GalleryUploadContext);

/* ─── Constants ─────────────────────────────────────────────── */
const CONCURRENCY    = 2;          // upload 2 files simultaneously
const MAX_RETRIES    = 3;          // retry each file up to 3 times
const RETRY_BASE_MS  = 3000;       // 3s → 6s → 12s exponential backoff
const CLOUDINARY_TIMEOUT = 20 * 60 * 1000; // 20-min XHR timeout to Cloudinary

/* ─── Client-side image compression ─────────────────────────── */
const compressImage = (file, maxW = 1920) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
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

/* ─── Get Cloudinary signature from our backend ─────────────── */
const getSignature = async (resource_type) => {
  const res = await api.get(`/owner/gallery/upload-signature?resource_type=${resource_type}`);
  return res.data.data;
};

/* ─── Upload file directly to Cloudinary via XHR ────────────── */
// Uses XHR so we get granular onUploadProgress events.
// Returns the secure_url string on success.
const uploadToCloudinary = (file, sig, onProgress, xhrRef) =>
  new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file',      file);
    fd.append('api_key',   sig.api_key);
    fd.append('timestamp', sig.timestamp);
    fd.append('signature', sig.signature);
    fd.append('folder',    sig.folder);
    if (sig.max_bytes) fd.append('max_bytes', sig.max_bytes);

    const xhr = new XMLHttpRequest();
    if (xhrRef) xhrRef.current = xhr; // expose so caller can abort

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } catch {
          reject(new Error('Invalid Cloudinary response'));
        }
      } else {
        let msg = `Cloudinary error (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText)?.error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error',   () => reject(new Error('Network error during upload')));
    xhr.addEventListener('timeout',  () => reject(new Error('Upload timed out')));
    xhr.timeout = CLOUDINARY_TIMEOUT;

    const cloudUrl = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${sig.resource_type}/upload`;
    xhr.open('POST', cloudUrl);
    xhr.send(fd);
  });

/* ─── Register the Cloudinary URL with our backend ──────────── */
const registerWithBackend = (url, mediaType) =>
  api.post(
    mediaType === 'video' ? '/owner/gallery/register-video' : '/owner/gallery/register-photo',
    { url }
  );

/* ─── Exponential sleep ──────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─── Provider ───────────────────────────────────────────────── */
export function GalleryUploadProvider({ children }) {
  const [uploads, setUploads]                 = useState([]);
  const [lastCompletedAt, setLastCompletedAt] = useState(null);

  // queue of items waiting to be processed
  const queueRef    = useRef([]);
  // how many concurrent uploads are running right now
  const activeRef   = useRef(0);
  // map id → XHR so we can cancel
  const xhrRefs     = useRef({});

  /* patch a single upload item by id */
  const patchItem = useCallback((id, patch) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }, []);

  /* ── Upload one item with retry ─── */
  const uploadOne = useCallback(async (item) => {
    const xhrRef = { current: null };
    xhrRefs.current[item.id] = xhrRef;

    let lastError = null;

    // Secondary guard — reject if somehow bypassed the modal validation
    if (item.mediaType === 'video') {
      if (item.file.size > MAX_VIDEO_MB * 1024 * 1024) {
        patchItem(item.id, { status: 'error', error: `Video exceeds ${MAX_VIDEO_MB} MB limit`, progress: 0 });
        return;
      }
      if (item.duration != null && item.duration > MAX_VIDEO_SECONDS) {
        patchItem(item.id, { status: 'error', error: `Video exceeds ${MAX_VIDEO_SECONDS}s limit`, progress: 0 });
        return;
      }
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const isRetry = attempt > 1;
        patchItem(item.id, {
          status:   'uploading',
          progress: isRetry ? 2 : 5,
          error:    null,
          attempt,
        });

        // ── 1. Get signature ──
        const sig = await getSignature(item.mediaType === 'video' ? 'video' : 'image');

        // ── 2. Compress image (skip for video) ──
        let fileToUpload = item.file;
        if (item.mediaType === 'image') {
          patchItem(item.id, { progress: 10 });
          fileToUpload = await compressImage(item.file);
          patchItem(item.id, { progress: 15 });
        }

        // ── 3. Upload to Cloudinary directly ──
        const cloudinaryUrl = await uploadToCloudinary(
          fileToUpload,
          sig,
          (ratio) => {
            // ratio 0→1 from Cloudinary. Map 15%→90% for progress bar.
            const pct = Math.round(15 + ratio * 75);
            patchItem(item.id, { progress: Math.min(90, pct) });
          },
          xhrRef
        );

        // ── 4. Register URL with our backend ──
        patchItem(item.id, { progress: 95 });
        await registerWithBackend(cloudinaryUrl, item.mediaType);

        // ── 5. Done ──
        patchItem(item.id, { status: 'done', progress: 100, error: null });
        setLastCompletedAt(Date.now());
        return; // success — exit retry loop

      } catch (err) {
        lastError = err?.message || 'Upload failed';

        if (attempt < MAX_RETRIES) {
          const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 1); // 3s, 6s, 12s
          patchItem(item.id, {
            status:   'retrying',
            error:    `${lastError} — retrying in ${waitMs / 1000}s (${attempt}/${MAX_RETRIES})`,
            progress: 0,
          });
          await sleep(waitMs);
        }
      }
    }

    // All retries exhausted
    patchItem(item.id, { status: 'error', error: lastError, progress: 0 });
  }, [patchItem]);

  /* ── Drain the queue, respecting CONCURRENCY limit ─── */
  const drainQueue = useCallback(() => {
    const startNext = () => {
      if (queueRef.current.length === 0 || activeRef.current >= CONCURRENCY) return;
      const item = queueRef.current.shift();
      activeRef.current += 1;
      uploadOne(item).finally(() => {
        activeRef.current -= 1;
        startNext(); // pick up next item as soon as a slot frees
      });
    };
    // Kick off up to CONCURRENCY slots
    for (let i = 0; i < CONCURRENCY; i++) startNext();
  }, [uploadOne]);

  /* ── Public: add files to the upload queue ─── */
  const enqueueUploads = useCallback((fileItems) => {
    const items = fileItems.map(f => ({
      ...f,
      status:   'pending',
      progress: 0,
      error:    null,
      attempt:  0,
    }));
    setUploads(prev => [...prev, ...items]);
    queueRef.current.push(...items);
    drainQueue();
  }, [drainQueue]);

  /* ── Public: retry a single failed item ─── */
  const retryItem = useCallback((id) => {
    setUploads(prev => {
      const item = prev.find(u => u.id === id);
      if (!item || (item.status !== 'error')) return prev;
      // Reset to pending visually
      const reset = { ...item, status: 'pending', progress: 0, error: null, attempt: 0 };
      queueRef.current.push(reset);
      drainQueue();
      return prev.map(u => u.id === id ? reset : u);
    });
  }, [drainQueue]);

  /* ── Public: clear finished/failed entries ─── */
  const clearDone = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'done' && u.status !== 'error'));
  }, []);

  return (
    <GalleryUploadContext.Provider value={{ uploads, enqueueUploads, retryItem, clearDone, lastCompletedAt }}>
      {children}
    </GalleryUploadContext.Provider>
  );
}
