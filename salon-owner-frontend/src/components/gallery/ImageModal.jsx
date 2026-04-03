import React, { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, Trash2, Edit2, Star, Tag,
  Check, Loader2, AlertTriangle, Download, Calendar, Zap,
} from 'lucide-react';
import api from '../../services/api';

const ALL_TAGS  = ['Haircut', 'Beard', 'Facial', 'Spa', 'Nails', 'Makeup'];

const TAG_CFG = {
  Haircut: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 ring-indigo-200 dark:ring-indigo-800',
  Beard:   'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 ring-violet-200 dark:ring-violet-800',
  Facial:  'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400 ring-pink-200 dark:ring-pink-800',
  Spa:     'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800',
  Nails:   'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 ring-rose-200 dark:ring-rose-800',
  Makeup:  'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800',
};

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

/* ── Delete confirm ── */
const DeleteConfirm = ({ onConfirm, onCancel, loading, isVideo }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800
      p-6 w-full max-w-sm space-y-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Delete this {isVideo ? 'video' : 'photo'}?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            This will permanently remove it from your gallery{isVideo ? ' and from Reels' : ''}.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold
            text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold
            transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {loading ? 'Deleting…' : `Delete ${isVideo ? 'Video' : 'Photo'}`}
        </button>
      </div>
    </div>
  </div>
);

/* ── Main ImageModal (Lightbox) ── */
const ImageModal = ({
  photos,
  initialIndex,
  coverId,
  onClose,
  onDeleted,
  onUpdated,
  onCoverSet,
}) => {
  const [idx,         setIdx]         = useState(initialIndex ?? 0);
  const [editMode,    setEditMode]     = useState(false);
  const [caption,     setCaption]      = useState('');
  const [tags,        setTags]         = useState([]);
  const [saving,      setSaving]       = useState(false);
  const [deleting,    setDeleting]     = useState(false);
  const [showDelete,  setShowDelete]   = useState(false);
  const [imgLoaded,   setImgLoaded]    = useState(false);
  const [settingCover, setSettingCover] = useState(false);
  const [inReels,         setInReels]         = useState(false);
  const [reelCategories,  setReelCategories]  = useState([]);
  const [togglingReel,    setTogglingReel]    = useState(false);

  const photo = photos[idx];

  useEffect(() => {
    setIdx(initialIndex ?? 0);
  }, [initialIndex]);

  useEffect(() => {
    if (photo) {
      setCaption(photo.caption || '');
      setTags(photo.tags || []);
      setEditMode(false);
      setImgLoaded(false);
      setShowDelete(false);
      setInReels(photo.inReels || false);
      setReelCategories(photo.reelCategories || []);
    }
  }, [idx, photo]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, photos.length]);

  const goPrev = useCallback(() => {
    setIdx(i => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIdx(i => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  const toggleTag = (t) => {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/owner/gallery/${photo._id}`, { caption, tags });
      onUpdated({ ...photo, caption, tags });
      setEditMode(false);
    } catch {
      // silently keep local state
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/owner/gallery/${photo._id}`);
      onDeleted(photo._id);
      if (photos.length === 1) { onClose(); return; }
      setIdx(i => (i >= photos.length - 1 ? i - 1 : i));
      setShowDelete(false);
    } catch {
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetCover = async () => {
    setSettingCover(true);
    try {
      await api.put(`/owner/gallery/${photo._id}`, { isCover: true });
      onCoverSet(photo._id);
    } catch { /* silent */ } finally {
      setSettingCover(false);
    }
  };

  const handleReelToggle = async () => {
    setTogglingReel(true);
    try {
      // If adding to reels, send current categories. If removing, send no categories (toggle off).
      const body = inReels
        ? { videoUrl: url }                                    // toggle off (remove)
        : { videoUrl: url, categories: reelCategories };      // toggle on (add with categories)
      const res = await api.put('/owner/gallery/reel-toggle', body);
      setInReels(res.data.inReels);
      if (res.data.inReels) setReelCategories(res.data.reelCategories || []);
    } catch { /* silent */ } finally {
      setTogglingReel(false);
    }
  };

  const handleCategorySave = async () => {
    if (!inReels) return;
    setTogglingReel(true);
    try {
      const res = await api.put('/owner/gallery/reel-toggle', { videoUrl: url, categories: reelCategories });
      setReelCategories(res.data.reelCategories || reelCategories);
    } catch { /* silent */ } finally {
      setTogglingReel(false);
    }
  };

  const toggleReelCategory = (cat) => {
    setReelCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  if (!photo) return null;
  const url     = photo.url || photo.imageUrl || photo.image || '';
  const isCover = photo._id === coverId;
  const isVideo = photo.type === 'video';

  const handleDownload = () => {
    const ext = isVideo ? 'mp4' : 'jpg';
    const a = document.createElement('a');
    a.href = url;
    a.download = photo.caption || (isVideo ? `video.${ext}` : `photo.${ext}`);
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* ── Container ── */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full max-w-5xl max-h-[90vh]
        bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Delete confirm overlay */}
        {showDelete && (
          <DeleteConfirm
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            loading={deleting}
            isVideo={isVideo}
          />
        )}

        {/* ── Left: image ── */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[260px] lg:min-h-0">

          {/* Nav arrows */}
          {photos.length > 1 && (
            <>
              <button onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center
                  rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center
                  rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Counter */}
          {photos.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full
              bg-black/50 backdrop-blur-sm text-white text-xs font-semibold">
              {idx + 1} / {photos.length}
            </div>
          )}

          {/* Media */}
          {isVideo ? (
            <video
              key={url}
              src={url}
              controls
              autoPlay
              playsInline
              className="max-h-[50vh] lg:max-h-[80vh] w-full object-contain"
              onLoadedData={() => setImgLoaded(true)}
            />
          ) : (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                </div>
              )}
              <img
                src={url}
                alt={photo.caption || 'Gallery photo'}
                onLoad={() => setImgLoaded(true)}
                className={`max-h-[50vh] lg:max-h-[80vh] w-full object-contain transition-opacity duration-300
                  ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          )}

          {/* Cover badge */}
          {isCover && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full
              bg-amber-500 text-white text-[11px] font-bold shadow-lg">
              <Star className="w-3 h-3" /> Cover Photo
            </div>
          )}
        </div>

        {/* ── Right: details panel ── */}
        <div className="w-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{isVideo ? 'Video Details' : 'Photo Details'}</p>
            <div className="flex items-center gap-1">
              <button onClick={handleDownload}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Download">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Caption</label>
                {!editMode && (
                  <button onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
              {editMode ? (
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={2}
                  placeholder="Add a caption…"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
                    resize-none transition-all"
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {caption || <span className="text-gray-300 dark:text-gray-600 italic">No caption</span>}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map(t => {
                  const active = tags.includes(t);
                  const cfgCls = TAG_CFG[t] || TAG_CFG.Haircut;
                  return (
                    <button
                      key={t}
                      onClick={() => editMode && toggleTag(t)}
                      disabled={!editMode}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all
                        ${active
                          ? `${cfgCls} ring-1`
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }
                        ${editMode ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                      `}
                    >
                      {active && <span className="mr-0.5">✓</span>}{t}
                    </button>
                  );
                })}
              </div>
              {!editMode && tags.length === 0 && (
                <p className="text-xs text-gray-300 dark:text-gray-600 italic mt-1">No tags — click Edit to add</p>
              )}
            </div>

            {/* Upload date */}
            {photo.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(photo.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}

            {/* Cover photo — photos only */}
            {!isVideo && !isCover && (
              <button
                onClick={handleSetCover}
                disabled={settingCover}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                  border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400
                  hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold transition-colors
                  disabled:opacity-60"
              >
                {settingCover
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Star className="w-3.5 h-3.5" />
                }
                Set as Cover Photo
              </button>
            )}

            {/* Feature in Reels — videos only */}
            {isVideo && (
              <div className="space-y-3">
                {/* Toggle button */}
                <button
                  onClick={handleReelToggle}
                  disabled={togglingReel}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl
                    text-xs font-semibold transition-colors disabled:opacity-60
                    ${inReels
                      ? 'bg-violet-600 hover:bg-violet-700 text-white border border-violet-600'
                      : 'border border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40'
                    }`}
                >
                  {togglingReel
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Zap className="w-3.5 h-3.5" />
                  }
                  {inReels ? 'Remove from Reels' : 'Feature in Reels'}
                </button>

                {/* Category picker — shown only when featured in Reels */}
                {inReels && (
                  <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/50 dark:bg-violet-950/20 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
                      Reel Categories
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {REEL_CATEGORIES.map(cat => {
                        const active = reelCategories.includes(cat);
                        const cls = REEL_CAT_CFG[cat] || REEL_CAT_CFG['Other'];
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleReelCategory(cat)}
                            type="button"
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all hover:scale-105
                              ${active ? `${cls} ring-1` : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'}
                            `}
                          >
                            {active && <span className="mr-0.5">✓</span>}{cat}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={handleCategorySave}
                      disabled={togglingReel}
                      className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white
                        text-[11px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {togglingReel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save Categories
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                    text-xs font-semibold text-gray-600 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                    text-xs font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
                    flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
              </>
            ) : (
              <button onClick={() => setShowDelete(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                  border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> {isVideo ? 'Delete Video' : 'Delete Photo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
