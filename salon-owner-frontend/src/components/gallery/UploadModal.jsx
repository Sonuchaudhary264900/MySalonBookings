import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, ImagePlus, Film, Trash2, AlertTriangle, Clock, HardDrive } from 'lucide-react';

const ACCEPT_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ACCEPT_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];

export const MAX_IMAGE_MB      = 10;
export const MAX_VIDEO_MB      = 100;
export const MAX_VIDEO_SECONDS = 90;   // Instagram Reels standard

const fmtDuration = (s) => {
  if (!isFinite(s)) return '?';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

/* ── Read video duration via hidden element ── */
const getVideoMeta = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted   = true;
    video.src     = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(video.src);
    video.onloadedmetadata = () => { cleanup(); resolve({ duration: video.duration, w: video.videoWidth, h: video.videoHeight }); };
    video.onerror          = () => { cleanup(); resolve({ duration: Infinity }); };
    // Fallback if event never fires
    setTimeout(() => { cleanup(); resolve({ duration: Infinity }); }, 8000);
  });

/* ── Video thumbnail via canvas ── */
const getVideoThumbnail = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted   = true;
    video.src     = URL.createObjectURL(file);
    video.currentTime = 1;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => { resolve(null); URL.revokeObjectURL(video.src); };
  });

/* ── Single file row ── */
const FileRow = ({ item, onRemove }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl border
    border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">

    {/* Thumb */}
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 relative">
      {item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />}
      {item.mediaType === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Film className="w-4 h-4 text-white" />
        </div>
      )}
    </div>

    {/* Name + size + duration */}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{item.file.name}</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
        {(item.file.size / 1024 / 1024).toFixed(1)} MB
        {item.mediaType === 'video' && item.duration != null && (
          <span className="ml-1.5">· {fmtDuration(item.duration)}</span>
        )}
        {item.mediaType === 'video' && (
          <span className="ml-1.5 text-violet-500 dark:text-violet-400 font-medium">video</span>
        )}
      </p>
    </div>

    {/* Remove */}
    <button
      onClick={() => onRemove(item.id)}
      className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400
        hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

/* ── Rejected file row ── */
const RejectedRow = ({ name, reason }) => (
  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl
    bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 truncate">{name}</p>
      <p className="text-[10px] text-red-500/80">{reason}</p>
    </div>
  </div>
);

/* ── UploadModal — pure file picker ── */
const UploadModal = ({ isOpen, onClose, onFilesReady }) => {
  const [files,    setFiles]    = useState([]);
  const [rejected, setRejected] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const nextId        = useRef(0);

  const addFiles = useCallback(async (raw) => {
    setChecking(true);
    const accepted = [];
    const declined = [];

    for (const f of Array.from(raw)) {
      const isImage = ACCEPT_IMAGE.includes(f.type);
      const isVideo = ACCEPT_VIDEO.includes(f.type) ||
        // catch generic octet-stream with video extension
        (f.type === 'application/octet-stream' && /\.(mp4|mov|webm|avi|mkv)$/i.test(f.name));

      if (!isImage && !isVideo) {
        declined.push({ name: f.name, reason: 'Unsupported file type' });
        continue;
      }

      if (isImage) {
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
          declined.push({ name: f.name, reason: `Image too large — max ${MAX_IMAGE_MB} MB (yours: ${(f.size / 1024 / 1024).toFixed(1)} MB)` });
          continue;
        }
        const preview = URL.createObjectURL(f);
        accepted.push({ id: nextId.current++, file: f, mediaType: 'image', preview, duration: null });
        continue;
      }

      // Video — check size first (fast), then duration (needs element)
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        declined.push({ name: f.name, reason: `Video too large — max ${MAX_VIDEO_MB} MB (yours: ${(f.size / 1024 / 1024).toFixed(1)} MB)` });
        continue;
      }

      const { duration } = await getVideoMeta(f);
      if (duration > MAX_VIDEO_SECONDS) {
        declined.push({ name: f.name, reason: `Video too long — max ${MAX_VIDEO_SECONDS}s (yours: ${fmtDuration(duration)}). Trim it and re-upload.` });
        continue;
      }

      const preview = await getVideoThumbnail(f);
      accepted.push({ id: nextId.current++, file: f, mediaType: 'video', preview, duration });
    }

    setFiles(prev => [...prev, ...accepted]);
    setRejected(prev => [...prev, ...declined]);
    setChecking(false);
  }, []);

  const onDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }, [addFiles]);
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const removeFile  = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const reset = () => { setFiles([]); setRejected([]); };

  const handleClose = () => { reset(); onClose(); };

  const handleUpload = () => {
    if (!files.length) return;
    onFilesReady([...files]);
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const videoCount = files.filter(f => f.mediaType === 'video').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Media</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Photos up to {MAX_IMAGE_MB} MB · Videos up to {MAX_VIDEO_SECONDS}s &amp; {MAX_VIDEO_MB} MB
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Limit info chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
              <Clock className="w-3 h-3 text-violet-500" />
              <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Max {MAX_VIDEO_SECONDS}s per video</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <HardDrive className="w-3 h-3 text-indigo-500" />
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Max {MAX_VIDEO_MB} MB per video</span>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`flex flex-col items-center justify-center gap-3
              border-2 border-dashed rounded-2xl py-10 px-6 text-center transition-all duration-200
              ${dragging
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 scale-[1.01]'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
              ${dragging ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {checking
                ? <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                : <ImagePlus className={`w-7 h-7 ${dragging ? 'text-indigo-500' : 'text-gray-400'}`} />}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {checking ? 'Checking files…' : dragging ? 'Drop files here' : 'Drag & drop photos or videos'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {checking ? 'Validating size and duration' : 'or choose file type below'}
              </p>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                disabled={checking}
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                  bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Photos
              </button>
              <button
                type="button"
                disabled={checking}
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                  bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
              >
                <Film className="w-3.5 h-3.5" /> Videos
              </button>
            </div>

            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi" multiple className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {/* Rejected files */}
          {rejected.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {rejected.length} file{rejected.length !== 1 ? 's' : ''} rejected
                </p>
                <button onClick={() => setRejected([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                  Clear
                </button>
              </div>
              {rejected.map((r, i) => <RejectedRow key={i} name={r.name} reason={r.reason} />)}
            </div>
          )}

          {/* Info notice when videos selected */}
          {videoCount > 0 && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl
              bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
              <Film className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 dark:text-violet-400">
                Videos upload in the background — you can keep browsing while they finish.
              </p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {files.length} file{files.length !== 1 ? 's' : ''} ready
                </p>
                <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Clear all
                </button>
              </div>
              {files.map(item => (
                <FileRow key={item.id} item={item} onRemove={removeFile} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
              text-sm font-medium text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || checking}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
              text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
              shadow-md shadow-indigo-500/20 disabled:opacity-50
              flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {checking ? 'Checking…' : `Start Upload${files.length > 0 ? ` (${files.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
