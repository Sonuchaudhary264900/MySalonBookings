import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, ImagePlus, CheckCircle, AlertCircle, Loader2, Trash2, Film } from 'lucide-react';

const ACCEPT_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ACCEPT_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 300;

/* ── Image compression (canvas) ── */
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

/* ── Helper: video thumbnail ── */
const getVideoThumbnail = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = URL.createObjectURL(file);
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
const FileRow = ({ item, onRemove }) => {
  const isVideo = item.mediaType === 'video';
  const statusIcon = {
    pending:   <Upload className="w-4 h-4 text-gray-400" />,
    uploading: <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />,
    done:      <CheckCircle className="w-4 h-4 text-emerald-500" />,
    error:     <AlertCircle className="w-4 h-4 text-red-500" />,
  }[item.status];

  const statusLabel = {
    pending:   null,
    uploading: `Uploading… ${item.progress || 0}%`,
    done:      'Done',
    error:     item.error,
  }[item.status];

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors
      ${item.status === 'done'  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30' :
        item.status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30' :
        'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>

      {/* Thumb */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 relative">
        {item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Film className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Name + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{item.file.name}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          {(item.file.size / 1024 / 1024).toFixed(1)} MB
          {isVideo && <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">video</span>}
        </p>
        {item.status === 'uploading' && (
          <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${item.progress || 5}%` }}
            />
          </div>
        )}
        {statusLabel && (
          <p className={`text-[10px] mt-0.5 font-medium ${
            item.status === 'error' ? 'text-red-500' : 'text-indigo-500'
          }`}>{statusLabel}</p>
        )}
      </div>

      {/* Status icon + remove */}
      <div className="flex items-center gap-1.5 shrink-0">
        {statusIcon}
        {item.status === 'pending' && (
          <button
            onClick={() => onRemove(item.id)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Main UploadModal ── */
const UploadModal = ({ isOpen, onClose, onUploaded }) => {
  const [files,     setFiles]     = useState([]);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const nextId        = useRef(0);

  const addFiles = useCallback(async (raw) => {
    const items = [];
    for (const f of Array.from(raw)) {
      const isImage = ACCEPT_IMAGE.includes(f.type);
      const isVideo = ACCEPT_VIDEO.includes(f.type);
      if (!isImage && !isVideo) continue;
      if (isImage && f.size > MAX_IMAGE_MB * 1024 * 1024) continue;
      if (isVideo && f.size > MAX_VIDEO_MB * 1024 * 1024) continue;

      let preview = null;
      if (isImage) {
        preview = URL.createObjectURL(f);
      } else {
        preview = await getVideoThumbnail(f);
      }

      items.push({
        id:              nextId.current++,
        file:            f,
        mediaType:       isImage ? 'image' : 'video',
        preview,
        status:          'pending',
        progress:        0,
        compressProgress: 0,
        error:           null,
      });
    }
    setFiles(prev => [...prev, ...items]);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const handleUpload = async () => {
    const pending = files.filter(f => f.status === 'pending');
    if (!pending.length) return;
    setUploading(true);

    let uploaded = 0;
    for (const item of pending) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 5 } : f));
      try {
        const { default: api } = await import('../../services/api');

        if (item.mediaType === 'image') {
          const compressed = await compressImage(item.file);
          setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 30 } : f));

          const fd = new FormData();
          fd.append('image', compressed);
          await api.post('/owner/gallery', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const pct = Math.round((e.loaded / e.total) * 60) + 30;
              setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
            },
          });

        } else {
          // Upload video directly — Cloudinary optimises on delivery
          const fd = new FormData();
          fd.append('video', item.file);
          await api.post('/owner/gallery/video', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
              const pct = Math.round((e.loaded / e.total) * 90) + 5;
              setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
            },
          });
        }

        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
        uploaded++;
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || 'Upload failed';
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: msg } : f));
      }
    }

    setUploading(false);
    if (uploaded > 0) onUploaded(uploaded);
  };

  const reset = () => {
    files.forEach(f => { if (f.preview && f.mediaType === 'image') URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setUploading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount    = files.filter(f => f.status === 'done').length;
  const allDone      = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!uploading ? handleClose : undefined} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Media</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Photos (JPG, PNG, WebP · max {MAX_IMAGE_MB} MB) · Videos (MP4, MOV, WebM · max {MAX_VIDEO_MB} MB)
            </p>
          </div>
          <button onClick={handleClose} disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`relative flex flex-col items-center justify-center gap-3
              border-2 border-dashed rounded-2xl py-10 px-6 text-center
              transition-all duration-200
              ${dragging
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 scale-[1.01]'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
              ${dragging ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <ImagePlus className={`w-7 h-7 ${dragging ? 'text-indigo-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {dragging ? 'Drop files here' : 'Drag & drop photos or videos'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">or choose file type below</p>
            </div>

            {/* Two pick buttons */}
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                  bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Photos
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                  bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-40"
              >
                <Film className="w-3.5 h-3.5" /> Videos
              </button>
            </div>

            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" multiple className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {/* Video info notice */}
          {files.some(f => f.mediaType === 'video' && f.status === 'pending') && !uploading && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
              <Film className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 dark:text-violet-400">
                Videos are uploaded directly and optimised on delivery — no wait time.
              </p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
                {!uploading && (
                  <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
              {files.map(item => (
                <FileRow key={item.id} item={item} onRemove={removeFile} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          {allDone ? (
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-500/20">
              Done — {doneCount} uploaded
            </button>
          ) : (
            <>
              <button onClick={handleClose} disabled={uploading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                  text-sm font-medium text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || pendingCount === 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                  text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
                  shadow-md shadow-indigo-500/20 disabled:opacity-50
                  flex items-center justify-center gap-2"
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><Upload className="w-4 h-4" /> Upload {pendingCount > 0 ? `${pendingCount} file${pendingCount !== 1 ? 's' : ''}` : ''}</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
