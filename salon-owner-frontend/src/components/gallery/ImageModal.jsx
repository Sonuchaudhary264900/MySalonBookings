import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  X, ChevronLeft, ChevronRight, Trash2, Edit2, Star, Tag,
  Check, Loader2, AlertTriangle, Download, Calendar, Zap, Play,
  MoreVertical, Heart, Eye, MessageCircle,
} from 'lucide-react';
import api from '../../services/api';
import { getGalleryMediaUrl, isGalleryVideo } from './galleryUtils';

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

/* ── Delete confirm (shared, used in both layouts) ── */
const DeleteConfirm = ({ onConfirm, onCancel, loading, isVideo }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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
const GENDER_OPTIONS = [
  { value: 'male',   label: 'Men',   icon: '♂', cls: 'bg-blue-900/60 text-blue-300 ring-blue-700' },
  { value: 'female', label: 'Women', icon: '♀', cls: 'bg-pink-900/60 text-pink-300 ring-pink-700' },
  { value: 'both',   label: 'Both',  icon: '⚥', cls: 'bg-violet-900/60 text-violet-300 ring-violet-700' },
];

const ImageModal = ({
  photos,
  initialIndex,
  coverId,
  onClose,
  onDeleted,
  onUpdated,
  onCoverSet,
  servedGender = 'unisex',
  offeredCategories = [],
}) => {
  const [idx,              setIdx]             = useState(initialIndex ?? 0);
  const [editMode,         setEditMode]        = useState(false);
  const [caption,          setCaption]         = useState('');
  const [tags,             setTags]            = useState([]);
  const [saving,           setSaving]          = useState(false);
  const [deleting,         setDeleting]        = useState(false);
  const [showDelete,       setShowDelete]      = useState(false);
  const [imgLoaded,        setImgLoaded]       = useState(false);
  const [settingCover,     setSettingCover]    = useState(false);
  const [inReels,          setInReels]         = useState(false);
  const [reelCategories,   setReelCategories]  = useState([]);
  const [targetGender,     setTargetGender]    = useState('both');
  const [togglingReel,     setTogglingReel]    = useState(false);
  // Hierarchical edit-panel selection
  const [editSelCat,  setEditSelCat]  = useState(null);
  const [editSelSubs, setEditSelSubs] = useState([]);
  // Video-specific
  const [isPlaying,        setIsPlaying]       = useState(true);
  const [showEditPanel,    setShowEditPanel]   = useState(false);
  const [menuOpen,         setMenuOpen]        = useState(false);
  const [videoStats,       setVideoStats]      = useState({ likeCount: 0, viewCount: 0, commentCount: 0 });
  const videoElRef = useRef(null);

  // ── Derived values (before handlers so handlers can safely reference them) ──
  const photo   = photos[idx];
  const url     = photo ? getGalleryMediaUrl(photo) : '';
  const isCover = photo ? photo._id === coverId : false;
  const isVideo = photo ? isGalleryVideo(photo) : false;
  const canDelete = photo && !photo._galleryOrphan;

  // ── Sync state on item change ──
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
      setTargetGender(photo.targetGender || (servedGender === 'male' ? 'male' : servedGender === 'female' ? 'female' : 'both'));
      setIsPlaying(true);
      setShowEditPanel(false);
      setMenuOpen(false);
      setVideoStats({ likeCount: 0, viewCount: 0, commentCount: 0 });
    }
  }, [idx, photo?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch analytics when a video opens ──
  useEffect(() => {
    if (!isVideo || !url) return;
    api.get('/owner/reels/analytics').then(res => {
      const entry = (res.data?.data || []).find(r => r.videoUrl === url || r.url === url);
      if (entry) {
        setVideoStats({
          likeCount:    entry.likeCount    || 0,
          viewCount:    entry.viewCount    || 0,
          commentCount: entry.commentCount || 0,
        });
      }
    }).catch(() => {});
  }, [isVideo, url]);

  // ── Lock body scroll ──
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const onKey = (e) => {
      if (menuOpen) { if (e.key === 'Escape') setMenuOpen(false); return; }
      if (showEditPanel) return; // don't navigate while editing
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape')     onClose();
      if (e.key === ' ' && isVideo) { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, photos.length, showEditPanel, isVideo, menuOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = useCallback(() => setIdx(i => (i > 0 ? i - 1 : photos.length - 1)), [photos.length]);
  const goNext = useCallback(() => setIdx(i => (i < photos.length - 1 ? i + 1 : 0)), [photos.length]);

  const togglePlay = useCallback(() => {
    const v = videoElRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setIsPlaying(true); }
    else          { v.pause();                setIsPlaying(false); }
  }, []);

  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/owner/gallery/${photo._id}`, { caption, tags });
      onUpdated({ ...photo, caption, tags });
      setEditMode(false);
      setShowEditPanel(false);
    } catch {
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
      const body = inReels
        ? { videoUrl: url }
        : { videoUrl: url, categories: reelCategories, targetGender };
      const res = await api.put('/owner/gallery/reel-toggle', body);
      setInReels(res.data.inReels);
      if (res.data.inReels) { setReelCategories(res.data.reelCategories || []); setTargetGender(res.data.targetGender || 'both'); }
    } catch { /* silent */ } finally {
      setTogglingReel(false);
    }
  };

  const hasOffered = offeredCategories.length > 0;

  // When edit panel opens, initialise hierarchical selection from stored reelCategories
  useEffect(() => {
    if (!showEditPanel || !hasOffered) return;
    const catNames = offeredCategories.map(c => c.name);
    const storedCat = reelCategories.find(rc => catNames.includes(rc));
    setEditSelCat(storedCat || null);
    setEditSelSubs(storedCat ? reelCategories.filter(rc => rc !== storedCat) : []);
  }, [showEditPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  const editActiveCat = useMemo(
    () => offeredCategories.find(c => c.name === editSelCat) || null,
    [offeredCategories, editSelCat]
  );

  const toggleEditSub = (sub) =>
    setEditSelSubs(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);

  const handleCategorySave = async () => {
    if (!inReels) return;
    setTogglingReel(true);
    try {
      const finalCats = hasOffered
        ? [editSelCat, ...editSelSubs].filter(Boolean)
        : reelCategories;
      const res = await api.put('/owner/gallery/reel-toggle', { videoUrl: url, categories: finalCats, targetGender });
      setReelCategories(res.data.reelCategories || finalCats);
      if (res.data.targetGender) setTargetGender(res.data.targetGender);
    } catch { /* silent */ } finally {
      setTogglingReel(false);
    }
  };

  const toggleReelCategory = (cat) => {
    setReelCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = photo.caption || (isVideo ? 'video.mp4' : 'photo.jpg');
    a.target = '_blank';
    a.click();
  };

  if (!photo) return null;

  /* ────────────────────────────────────────────────────────────────
     VIDEO: Full-screen Instagram-style layout
  ──────────────────────────────────────────────────────────────── */
  if (isVideo) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black select-none">
        {/* ── Video ── */}
        <video
          key={url}
          ref={el => {
            videoElRef.current = el;
            if (el) { el.muted = false; el.play().catch(() => {}); }
          }}
          src={url}
          playsInline
          loop
          className="absolute inset-0 w-full h-full object-contain"
          onLoadedData={() => setImgLoaded(true)}
          onClick={() => { if (menuOpen) { setMenuOpen(false); } else { togglePlay(); } }}
          style={{ cursor: 'pointer' }}
        />

        {/* Loading spinner */}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
          </div>
        )}

        {/* Paused indicator */}
        {!isPlaying && imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Top gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}
        />
        {/* Bottom gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
        />

        {/* ── Top bar ── */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center
              text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          {photos.length > 1 && (
            <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md">
              <span className="text-white text-xs font-semibold tracking-wide">
                {idx + 1} / {photos.length}
              </span>
            </div>
          )}
          {photos.length <= 1 && <div />}

          {/* Three-dot menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center
                text-white hover:bg-black/60 transition-colors"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-11 z-30 min-w-[170px] rounded-2xl overflow-hidden shadow-2xl
                  bg-gray-900/95 backdrop-blur-xl border border-white/10"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { setMenuOpen(false); setEditMode(true); setShowEditPanel(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors text-left"
                >
                  <Edit2 className="w-4 h-4 text-white/60" /> Edit Details
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleReelToggle(); }}
                  disabled={togglingReel}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                >
                  <Zap className={`w-4 h-4 ${inReels ? 'text-violet-400' : 'text-white/60'}`} />
                  {inReels ? 'Remove from Reels' : 'Add to Reels'}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleDownload(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors text-left"
                >
                  <Download className="w-4 h-4 text-white/60" /> Download
                </button>
                <div className="h-px bg-white/10 mx-3" />
                {canDelete && (
                  <button
                    onClick={() => { setMenuOpen(false); setShowDelete(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/15 transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Navigation arrows ── */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full
                bg-black/40 backdrop-blur-md flex items-center justify-center text-white
                hover:bg-black/60 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full
                bg-black/40 backdrop-blur-md flex items-center justify-center text-white
                hover:bg-black/60 active:scale-95 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* ── Bottom info bar ── */}
        <div
          className="absolute bottom-0 left-0 right-0 px-4 z-10"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          {/* Reel badge */}
          {inReels && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-600/80 backdrop-blur-md">
                <Zap className="w-3 h-3 text-white" />
                <span className="text-white text-[11px] font-bold">In Reels</span>
              </div>
              {reelCategories.slice(0, 2).map(cat => (
                <span key={cat} className="px-2 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-semibold">
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Caption */}
          {caption && (
            <p className="text-white text-sm font-medium leading-snug mb-2 line-clamp-2">
              {caption}
            </p>
          )}

          {/* Tag chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          {(videoStats.viewCount > 0 || videoStats.likeCount > 0 || videoStats.commentCount > 0) && (
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white text-xs font-semibold">{videoStats.viewCount.toLocaleString()}</span>
                <span className="text-white/40 text-xs">views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-white text-xs font-semibold">{videoStats.likeCount.toLocaleString()}</span>
                <span className="text-white/40 text-xs">likes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white text-xs font-semibold">{videoStats.commentCount.toLocaleString()}</span>
                <span className="text-white/40 text-xs">comments</span>
              </div>
            </div>
          )}

          {/* Edit details button */}
          <button
            onClick={() => { setEditMode(true); setShowEditPanel(true); }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
              bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold
              hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Details
          </button>
        </div>

        {/* ── Edit details panel (slides up from bottom) ── */}
        {showEditPanel && (
          <div className="fixed inset-0 z-20 flex flex-col justify-end">
            {/* Backdrop tap to dismiss */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowEditPanel(false)}
            />
            <div
              className="relative bg-gray-950 border-t border-white/10 rounded-t-3xl flex flex-col
                max-h-[85dvh] overflow-hidden"
              style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
                <button
                  onClick={() => setShowEditPanel(false)}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <p className="text-white text-sm font-bold">Edit Video Details</p>
                <div className="w-16" />
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Caption */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={2}
                    placeholder="Add a caption…"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5
                      text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2
                      focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all"
                  />
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TAGS.map(t => {
                      const active = tags.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTag(t)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95
                            ${active
                              ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                              : 'bg-white/8 text-white/50 border border-white/10 hover:bg-white/15 hover:text-white'
                            }`}
                        >
                          {active && <span className="mr-0.5">✓</span>}{t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reel categories + target gender (only when in Reels) */}
                {inReels && (
                  <div className="space-y-4">
                    {/* Target audience — only for unisex salons */}
                    {servedGender === 'unisex' && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Target Audience</span>
                        </div>
                        <div className="flex gap-2">
                          {GENDER_OPTIONS.map(opt => {
                            const active = targetGender === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setTargetGender(opt.value)}
                                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95
                                  ${active
                                    ? `${opt.cls} ring-1`
                                    : 'bg-white/8 text-white/50 border border-white/10 hover:bg-white/15'
                                  }`}
                              >
                                <span className="text-base">{opt.icon}</span>
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reel categories — hierarchical if salon has offeredCategories */}
                    {hasOffered ? (
                      <div className="space-y-3">
                        {/* Category picker */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Zap className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Service Category</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {offeredCategories.map(cat => {
                              const active = editSelCat === cat.name;
                              return (
                                <button
                                  key={cat.name}
                                  onClick={() => { setEditSelCat(active ? null : cat.name); setEditSelSubs([]); }}
                                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95
                                    ${active
                                      ? 'bg-violet-600 text-white ring-1 ring-violet-400'
                                      : 'bg-white/8 text-white/50 border border-white/10 hover:bg-white/15 hover:text-white'
                                    }`}
                                >
                                  {active && '✓ '}{cat.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sub-service picker */}
                        {editActiveCat && editActiveCat.subServices?.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Which service? <span className="font-normal normal-case">optional</span></span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {editActiveCat.subServices.map(s => {
                                const name   = typeof s === 'string' ? s : s.name;
                                const active = editSelSubs.includes(name);
                                return (
                                  <button
                                    key={name}
                                    onClick={() => toggleEditSub(name)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95
                                      ${active
                                        ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                                        : 'bg-white/8 text-white/50 border border-white/10 hover:bg-white/15 hover:text-white'
                                      }`}
                                  >
                                    {active && '✓ '}{name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Reel Categories</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {REEL_CATEGORIES.map(cat => {
                            const active = reelCategories.includes(cat);
                            const cls = REEL_CAT_CFG[cat] || REEL_CAT_CFG['Other'];
                            return (
                              <button
                                key={cat}
                                onClick={() => toggleReelCategory(cat)}
                                className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95
                                  ${active
                                    ? `${cls} ring-1`
                                    : 'bg-white/8 text-white/50 border border-white/10 hover:bg-white/15'
                                  }`}
                              >
                                {active && <span className="mr-0.5">✓</span>}{cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleCategorySave}
                      disabled={togglingReel}
                      className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white
                        text-xs font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {togglingReel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Categories
                    </button>
                  </div>
                )}

                {/* Upload date */}
                {photo.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/30">
                      {new Date(photo.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex gap-2 px-5 py-4 border-t border-white/10 shrink-0"
                style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
              >
                <button
                  onClick={() => setShowEditPanel(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-semibold
                    text-white/70 hover:bg-white/8 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600
                    text-white text-xs font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
                    flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {showDelete && (
          <DeleteConfirm
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            loading={deleting}
            isVideo
          />
        )}
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────
     PHOTO: 2-column card layout (improved sizing + z-index)
  ──────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Card */}
      <div className="relative z-10 flex flex-col lg:flex-row w-full max-w-5xl
        max-h-[96dvh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
        border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Delete confirm overlay (inside card) */}
        {showDelete && (
          <DeleteConfirm
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            loading={deleting}
            isVideo={false}
          />
        )}

        {/* ── Left: image ── */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[220px] lg:min-h-0">

          {/* Nav arrows */}
          {photos.length > 1 && (
            <>
              <button onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center
                  rounded-xl bg-black/40 hover:bg-black/65 text-white backdrop-blur-sm transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center
                  rounded-xl bg-black/40 hover:bg-black/65 text-white backdrop-blur-sm transition-colors">
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

          {/* Loading spinner */}
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
          )}

          {/* Image */}
          <img
            src={url}
            alt={photo.caption || 'Gallery photo'}
            onLoad={() => setImgLoaded(true)}
            className={`max-h-[55vh] lg:max-h-[85vh] w-full object-contain transition-opacity duration-300
              ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          />

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
            <p className="text-sm font-bold text-gray-900 dark:text-white">Photo Details</p>
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

            {/* Set as cover */}
            {!isCover && (
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
              canDelete ? (
                <button onClick={() => setShowDelete(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                    border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Photo
                </button>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
