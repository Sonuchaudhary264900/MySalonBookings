import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, ImagePlus, Film, Trash2, AlertTriangle, Clock, HardDrive, ChevronLeft, Check } from 'lucide-react';

const ACCEPT_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ACCEPT_VIDEO = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];

export const MAX_IMAGE_MB      = 10;
export const MAX_VIDEO_MB      = 100;
export const MAX_VIDEO_SECONDS = 90;

const REEL_CATEGORIES = [
  'Hair Styling', 'Hair Colouring', 'Hair Treatment', 'Haircut',
  'Beard & Shave', 'Facial', 'Skin Care', 'Nail Art',
  'Makeup', 'Spa & Massage', 'Bridal', 'Other',
];

const REEL_CAT_CFG = {
  'Hair Styling':   'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 ring-indigo-300 dark:ring-indigo-700',
  'Hair Colouring': 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400 ring-pink-300 dark:ring-pink-700',
  'Hair Treatment': 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 ring-purple-300 dark:ring-purple-700',
  'Haircut':        'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 ring-blue-300 dark:ring-blue-700',
  'Beard & Shave':  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-300 dark:ring-slate-600',
  'Facial':         'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 ring-rose-300 dark:ring-rose-700',
  'Skin Care':      'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 ring-amber-300 dark:ring-amber-700',
  'Nail Art':       'bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-400 ring-fuchsia-300 dark:ring-fuchsia-700',
  'Makeup':         'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 ring-orange-300 dark:ring-orange-700',
  'Spa & Massage':  'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-emerald-300 dark:ring-emerald-700',
  'Bridal':         'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 ring-red-300 dark:ring-red-700',
  'Other':          'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 ring-gray-300 dark:ring-gray-600',
};

const fmtDuration = (s) => {
  if (!isFinite(s)) return '?';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

const getVideoMeta = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted   = true;
    video.src     = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(video.src);
    video.onloadedmetadata = () => { cleanup(); resolve({ duration: video.duration, w: video.videoWidth, h: video.videoHeight }); };
    video.onerror          = () => { cleanup(); resolve({ duration: Infinity }); };
    setTimeout(() => { cleanup(); resolve({ duration: Infinity }); }, 8000);
  });

const getVideoThumbnail = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted   = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    const cleanup = () => { try { URL.revokeObjectURL(objectUrl); } catch {} };
    const capture = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 320;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
      cleanup();
    };
    // Wait for metadata → seek to 1s → wait for seek → capture frame
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration || 1);
    };
    video.onseeked = capture;
    video.onerror = () => { resolve(null); cleanup(); };
    // Fallback: if seek never fires in 10s, resolve null
    setTimeout(() => { resolve(null); cleanup(); }, 10000);
  });

/* ── Single image file row (multi-upload list) ── */
const FileRow = ({ item, onRemove }) => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl border
    border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
      {item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{item.file.name}</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
        {(item.file.size / 1024 / 1024).toFixed(1)} MB
      </p>
    </div>
    <button
      onClick={() => onRemove(item.id)}
      className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400
        hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

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

/* ────────────────────────────────────────────────────────────────
   STEP A — Video picker (single video at a time, like Instagram)
────────────────────────────────────────────────────────────────── */
const VideoPickStep = ({ onVideoPicked, onClose, checking }) => {
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    await onVideoPicked(file);
  };

  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Video</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            One video at a time · Max {MAX_VIDEO_SECONDS}s &amp; {MAX_VIDEO_MB} MB
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Limit chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
            <Clock className="w-3 h-3 text-violet-500" />
            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Max {MAX_VIDEO_SECONDS}s</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <HardDrive className="w-3 h-3 text-indigo-500" />
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Max {MAX_VIDEO_MB} MB</span>
          </div>
        </div>

        {/* Drop / pick zone */}
        <button
          type="button"
          disabled={checking}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-4 py-16
            border-2 border-dashed rounded-2xl border-violet-200 dark:border-violet-800
            hover:border-violet-400 dark:hover:border-violet-600
            hover:bg-violet-50/50 dark:hover:bg-violet-950/20
            transition-all duration-200 disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            {checking
              ? <div className="w-7 h-7 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              : <Film className="w-8 h-8 text-violet-500" />
            }
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {checking ? 'Checking video…' : 'Tap to pick a video'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {checking ? 'Validating size and duration' : 'MP4, MOV, WebM supported'}
            </p>
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi"
          className="hidden"
          onChange={onInputChange}
        />

        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl
          bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
          <Film className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700 dark:text-violet-400">
            Videos auto-post as Reels so your customers can discover your work.
            You'll pick the service category in the next step.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm font-medium text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────────
   STEP B — Video details (category required + optional caption)
────────────────────────────────────────────────────────────────── */
const GENDER_OPTIONS = [
  { value: 'male',   label: 'Men',        icon: '♂', color: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 ring-blue-300 dark:ring-blue-700' },
  { value: 'female', label: 'Women',      icon: '♀', color: 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400 ring-pink-300 dark:ring-pink-700' },
  { value: 'both',   label: 'Both',       icon: '⚥', color: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 ring-violet-300 dark:ring-violet-700' },
];

const VideoDetailsStep = ({ videoItem, onBack, onUpload, servedGender }) => {
  const [categories,    setCategories]    = useState([]);
  const [caption,       setCaption]       = useState('');
  const [targetGender,  setTargetGender]  = useState(
    servedGender === 'male' ? 'male' : servedGender === 'female' ? 'female' : ''
  );

  const toggleCat = (cat) =>
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const needsGender = servedGender === 'unisex';
  const canUpload = categories.length > 0 && (!needsGender || targetGender !== '');

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Reel Details</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Choose at least one category for your Reel
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Video preview card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
            {videoItem.preview
              ? <img src={videoItem.preview} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-6 h-6 text-gray-400" />
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{videoItem.file.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {(videoItem.file.size / 1024 / 1024).toFixed(1)} MB
              {videoItem.duration != null && ` · ${fmtDuration(videoItem.duration)}`}
            </p>
          </div>
          <div className="px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900/50">
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">Reel</span>
          </div>
        </div>

        {/* Target audience — only for unisex salons */}
        {needsGender && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Target Audience</span>
              <span className="text-[10px] text-red-500 font-semibold">*required</span>
            </div>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map(opt => {
                const active = targetGender === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTargetGender(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95
                      ${active
                        ? `${opt.color} ring-1`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {targetGender === '' && (
              <p className="text-[11px] text-red-400 mt-1.5">Select who this reel is for</p>
            )}
          </div>
        )}

        {/* Categories — required */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Category</span>
            <span className="text-[10px] text-red-500 font-semibold">*required</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {REEL_CATEGORIES.map(cat => {
              const active = categories.includes(cat);
              const cls = REEL_CAT_CFG[cat] || REEL_CAT_CFG['Other'];
              return (
                <button
                  key={cat}
                  onClick={() => toggleCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95
                    ${active
                      ? `${cls} ring-1`
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {active && <span className="mr-0.5">✓</span>}{cat}
                </button>
              );
            })}
          </div>
          {categories.length === 0 && (
            <p className="text-[11px] text-red-400 mt-2">Select at least one category to continue</p>
          )}
        </div>

        {/* Caption — optional */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1.5">
            Caption <span className="font-normal text-gray-400 normal-case tracking-normal">optional</span>
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={2}
            placeholder="Describe your work…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
              resize-none transition-all"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm font-medium text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => onUpload({ categories, caption, targetGender: needsGender ? targetGender : (servedGender === 'male' ? 'male' : servedGender === 'female' ? 'female' : 'both') })}
          disabled={!canUpload}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white
            text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all
            shadow-md shadow-violet-500/20 disabled:opacity-50
            flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Start Upload
        </button>
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────────
   PHOTO upload (multi-file, unchanged behaviour)
────────────────────────────────────────────────────────────────── */
const PhotoUploadStep = ({ onFilesReady, onClose }) => {
  const [files,    setFiles]    = useState([]);
  const [rejected, setRejected] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);
  const nextId   = useRef(0);

  const addFiles = useCallback(async (raw) => {
    setChecking(true);
    const accepted = [];
    const declined = [];
    for (const f of Array.from(raw)) {
      if (!ACCEPT_IMAGE.includes(f.type)) {
        declined.push({ name: f.name, reason: 'Not an image — use the Video option for videos' });
        continue;
      }
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
        declined.push({ name: f.name, reason: `Too large — max ${MAX_IMAGE_MB} MB (yours: ${(f.size / 1024 / 1024).toFixed(1)} MB)` });
        continue;
      }
      accepted.push({ id: nextId.current++, file: f, mediaType: 'image', preview: URL.createObjectURL(f), duration: null });
    }
    setFiles(prev => [...prev, ...accepted]);
    setRejected(prev => [...prev, ...declined]);
    setChecking(false);
  }, []);

  const onDrop      = useCallback((e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }, [addFiles]);
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const removeFile  = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const reset       = () => { setFiles([]); setRejected([]); };

  const handleUpload = () => {
    if (!files.length) return;
    onFilesReady([...files]);
    reset();
    onClose();
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Photos</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPEG, PNG, WebP · Max {MAX_IMAGE_MB} MB each</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
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
              : <ImagePlus className={`w-7 h-7 ${dragging ? 'text-indigo-500' : 'text-gray-400'}`} />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {checking ? 'Checking files…' : dragging ? 'Drop photos here' : 'Drag & drop photos'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">or browse</p>
          </div>
          <button type="button" disabled={checking} onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
              bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50">
            <ImagePlus className="w-3.5 h-3.5" /> Choose Photos
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        {rejected.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {rejected.length} rejected
              </p>
              <button onClick={() => setRejected([])} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Clear</button>
            </div>
            {rejected.map((r, i) => <RejectedRow key={i} name={r.name} reason={r.reason} />)}
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {files.length} photo{files.length !== 1 ? 's' : ''} ready
              </p>
              <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
            </div>
            {files.map(item => <FileRow key={item.id} item={item} onRemove={removeFile} />)}
          </div>
        )}
      </div>

      <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-sm font-medium text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </button>
        <button onClick={handleUpload} disabled={files.length === 0 || checking}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
            text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
            shadow-md shadow-indigo-500/20 disabled:opacity-50
            flex items-center justify-center gap-2">
          <Upload className="w-4 h-4" />
          {checking ? 'Checking…' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
        </button>
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────────
   MODE PICKER — Photo vs Video choice screen
────────────────────────────────────────────────────────────────── */
const ModePicker = ({ onChoose, onClose }) => (
  <>
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
      <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Media</h2>
      <button onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>

    <div className="flex-1 p-5 flex flex-col gap-4 justify-center">
      {/* Photo option */}
      <button
        onClick={() => onChoose('photo')}
        className="w-full flex items-center gap-5 p-5 rounded-2xl border-2
          border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500
          hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20
          group transition-all duration-200 text-left"
      >
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0
          group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/60 transition-colors">
          <ImagePlus className="w-7 h-7 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Photos</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Upload multiple photos to your gallery</p>
          <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-1 font-medium">JPEG, PNG, WebP · Max {MAX_IMAGE_MB} MB</p>
        </div>
      </button>

      {/* Video option */}
      <button
        onClick={() => onChoose('video')}
        className="w-full flex items-center gap-5 p-5 rounded-2xl border-2
          border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500
          hover:bg-violet-50/50 dark:hover:bg-violet-950/20
          group transition-all duration-200 text-left"
      >
        <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0
          group-hover:bg-violet-200 dark:group-hover:bg-violet-900/60 transition-colors">
          <Film className="w-7 h-7 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Video Reel</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Upload one video — auto-posts as a public Reel</p>
          <p className="text-[11px] text-violet-500 dark:text-violet-400 mt-1 font-medium">MP4, MOV · Max {MAX_VIDEO_SECONDS}s &amp; {MAX_VIDEO_MB} MB</p>
        </div>
        <div className="ml-auto shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-[10px] font-bold text-violet-600 dark:text-violet-400">
            AUTO REEL
          </span>
        </div>
      </button>
    </div>

    <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
      <button onClick={onClose}
        className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
          text-sm font-medium text-gray-600 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        Cancel
      </button>
    </div>
  </>
);

/* ────────────────────────────────────────────────────────────────
   MAIN UploadModal — orchestrates all steps
────────────────────────────────────────────────────────────────── */
const UploadModal = ({ isOpen, onClose, onFilesReady, servedGender = 'unisex' }) => {
  // mode: null (picker) | 'photo' | 'video-pick' | 'video-details'
  const [mode,      setMode]      = useState(null);
  const [videoItem, setVideoItem] = useState(null);
  const [checking,  setChecking]  = useState(false);
  const [rejected,  setRejected]  = useState(null);
  const nextId = useRef(0);

  const handleClose = () => {
    setMode(null);
    setVideoItem(null);
    setRejected(null);
    onClose();
  };

  const handleChooseMode = (m) => {
    setMode(m === 'photo' ? 'photo' : 'video-pick');
  };

  /* ── Video picked — validate then move to details step ── */
  const handleVideoPicked = async (file) => {
    setChecking(true);
    setRejected(null);

    const nameLooksVideo = /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(file.name || '');
    const isVideo =
      ACCEPT_VIDEO.includes(file.type) ||
      (file.type === 'application/octet-stream' && nameLooksVideo) ||
      ((!file.type || file.type === '') && nameLooksVideo);

    if (!isVideo) {
      setRejected({ name: file.name, reason: 'Unsupported file type' });
      setChecking(false);
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setRejected({ name: file.name, reason: `Too large — max ${MAX_VIDEO_MB} MB (yours: ${(file.size / 1024 / 1024).toFixed(1)} MB)` });
      setChecking(false);
      return;
    }

    const { duration } = await getVideoMeta(file);
    if (duration > MAX_VIDEO_SECONDS) {
      setRejected({ name: file.name, reason: `Too long — max ${MAX_VIDEO_SECONDS}s (yours: ${fmtDuration(duration)}). Trim and re-upload.` });
      setChecking(false);
      return;
    }

    const preview = await getVideoThumbnail(file);
    setVideoItem({ id: nextId.current++, file, mediaType: 'video', preview, duration });
    setChecking(false);
    setMode('video-details');
  };

  /* ── Video details confirmed → enqueue upload ── */
  const handleVideoUpload = ({ categories, caption, targetGender }) => {
    const item = { ...videoItem, categories, caption, targetGender };
    onFilesReady([item]);
    setMode(null);
    setVideoItem(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {mode === null && (
          <ModePicker onChoose={handleChooseMode} onClose={handleClose} />
        )}

        {mode === 'photo' && (
          <PhotoUploadStep onFilesReady={onFilesReady} onClose={handleClose} />
        )}

        {(mode === 'video-pick' || mode === 'video-details') && mode === 'video-pick' && (
          <VideoPickStep
            onVideoPicked={handleVideoPicked}
            onClose={handleClose}
            checking={checking}
          />
        )}

        {mode === 'video-pick' && rejected && (
          /* show rejection inline after the pick step renders — handled inside VideoPickStep via rejected prop */
          null
        )}

        {mode === 'video-details' && videoItem && (
          <VideoDetailsStep
            videoItem={videoItem}
            onBack={() => { setMode('video-pick'); setVideoItem(null); }}
            onUpload={handleVideoUpload}
            servedGender={servedGender}
          />
        )}
      </div>

      {/* Rejection toast — shown when validation fails in video-pick step */}
      {mode === 'video-pick' && rejected && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60]
          flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl
          bg-red-600 text-white text-xs font-semibold max-w-xs w-full">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            <p className="font-bold truncate">{rejected.name}</p>
            <p className="text-red-100 font-normal mt-0.5">{rejected.reason}</p>
          </div>
          <button onClick={() => setRejected(null)} className="ml-auto shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadModal;
