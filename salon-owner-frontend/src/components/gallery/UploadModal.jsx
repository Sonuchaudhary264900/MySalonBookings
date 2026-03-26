import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, ImagePlus, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE_MB = 10;

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

/* ── Single file row ── */
const FileRow = ({ item, onRemove }) => {
  const statusIcon = {
    pending:    <Upload className="w-4 h-4 text-gray-400" />,
    uploading:  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />,
    done:       <CheckCircle className="w-4 h-4 text-emerald-500" />,
    error:      <AlertCircle className="w-4 h-4 text-red-500" />,
  }[item.status];

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors
      ${item.status === 'done'  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30' :
        item.status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30' :
        'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'}`}>

      {/* Thumb */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
        {item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Name + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{item.file.name}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          {(item.file.size / 1024 / 1024).toFixed(1)} MB
        </p>
        {item.status === 'uploading' && (
          <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
        {item.status === 'error' && (
          <p className="text-[10px] text-red-500 mt-0.5">{item.error}</p>
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
  const fileInputRef              = useRef(null);
  const nextId                    = useRef(0);

  const addFiles = useCallback((raw) => {
    const valid = [];
    const invalid = [];
    Array.from(raw).forEach(f => {
      if (!ACCEPT.includes(f.type)) { invalid.push(f.name); return; }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { invalid.push(`${f.name} (too large)`); return; }
      valid.push(f);
    });
    if (invalid.length) {
      // show inline error (not toast so we don't import toast here)
      console.warn('Invalid files:', invalid);
    }
    const items = valid.map(f => ({
      id:       nextId.current++,
      file:     f,
      preview:  URL.createObjectURL(f),
      status:   'pending',
      progress: 0,
      error:    null,
    }));
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
      // set uploading
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f));
      try {
        const compressed = await compressImage(item.file);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 40 } : f));

        const fd = new FormData();
        fd.append('image', compressed);

        const { default: api } = await import('../../services/api');
        await api.post('/owner/gallery', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded / e.total) * 50) + 40;
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: pct } : f));
          },
        });

        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done', progress: 100 } : f));
        uploaded++;
      } catch (err) {
        const msg = err?.data?.message || err?.message || 'Upload failed';
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: msg } : f));
      }
    }

    setUploading(false);
    if (uploaded > 0) onUploaded(uploaded);
  };

  const reset = () => {
    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const pendingCount  = files.filter(f => f.status === 'pending').length;
  const doneCount     = files.filter(f => f.status === 'done').length;
  const allDone       = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Photos</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPG, PNG or WebP · max {MAX_SIZE_MB} MB each</p>
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3
              border-2 border-dashed rounded-2xl py-10 px-6 text-center cursor-pointer
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
                {dragging ? 'Drop photos here' : 'Drag & drop photos here'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                or <span className="text-indigo-600 dark:text-indigo-400 font-medium">click to browse</span>
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
                {!uploading && (
                  <button onClick={reset}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">
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
              <button onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                  text-sm font-medium text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : <><Upload className="w-4 h-4" /> Upload {pendingCount > 0 ? `${pendingCount} photo${pendingCount !== 1 ? 's' : ''}` : ''}</>
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
