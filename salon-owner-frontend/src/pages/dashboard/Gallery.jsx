import React, { useState, useEffect, useCallback } from 'react';
import {
  Images, Upload, Star, Tag, RefreshCw, Loader2, ImagePlus, Film,
  Heart, MessageCircle, ChevronDown, ChevronUp, Play, Eye, Send, CornerDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ImageGrid  from '../../components/gallery/ImageGrid';
import UploadModal from '../../components/gallery/UploadModal';
import ImageModal  from '../../components/gallery/ImageModal';
import api from '../../services/api';
import { useGalleryUpload } from '../../context/GalleryUploadContext';
import {
  cloudinaryVideoPosterUrl,
  getGalleryMediaUrl,
  hasRenderableGalleryMedia,
  isGalleryVideo,
  normalizeOwnerGalleryPayload,
} from '../../components/gallery/galleryUtils';

const ALL_TAGS = ['Haircut', 'Beard', 'Facial', 'Spa', 'Nails', 'Makeup'];

/* ── Stat pill ── */
const StatPill = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${color}`}>
    <Icon className="w-3.5 h-3.5" />
    <span className="text-xs font-semibold">{value}</span>
    <span className="text-xs opacity-70">{label}</span>
  </div>
);

/* ── Tag filter pill ── */
const TagPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
      active
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
    }`}
  >
    {label}
  </button>
);

/* ── Empty state ── */
const EmptyState = ({ onUpload }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <style>{`
      @keyframes gallery-glow {
        0%,100% { opacity:.15; transform:scale(1); }
        50%      { opacity:.3;  transform:scale(1.08); }
      }
    `}</style>

    <div className="relative mb-6">
      <div className="absolute inset-0 w-24 h-24 rounded-full bg-indigo-400/20 blur-2xl"
        style={{ animation:'gallery-glow 3s ease-in-out infinite' }} />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100
        dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shadow-lg">
        <Images className="w-10 h-10 text-indigo-400 dark:text-indigo-500" />
      </div>
    </div>

    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No media uploaded yet</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
      Upload photos and videos to attract more customers and showcase your salon's best work
    </p>

    <button
      onClick={onUpload}
      className="flex items-center gap-2 px-6 py-2.5 rounded-xl
        bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
        hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25
        hover:shadow-indigo-500/40 hover:scale-[1.02]"
    >
      <ImagePlus className="w-4 h-4" /> Upload Your First Media
    </button>
  </div>
);

/* ── Featured Photos strip ── */
const FeaturedStrip = ({ photos, coverId, onView }) => {
  const featured = photos.filter(p => p.tags?.length > 0 || p._id === coverId).slice(0, 6);
  if (!featured.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Featured Photos</h3>
        <span className="text-xs text-gray-400 ml-auto">{featured.length} selected</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {featured.map(p => (
          <button
            key={p._id}
            onClick={() => onView(p)}
            className="shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800
              hover:ring-2 hover:ring-indigo-400 transition-all duration-150"
          >
            <img
              src={getGalleryMediaUrl(p)}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Relative time ── */
function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Reel thumbnail: Cloudinary JPEG → video element fallback ── */
const ReelThumb = ({ url }) => {
  const [cloudFailed, setCloudFailed] = useState(false);
  const thumbUrl = cloudinaryVideoPosterUrl(url);

  const videoRef = useCallback((el) => {
    if (!el) return;
    el.muted = true;
    el.onloadedmetadata = () => { el.currentTime = 0.1; };
  }, []);

  return (
    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-800 shrink-0">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      {!cloudFailed && thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setCloudFailed(true)}
        />
      ) : url ? (
        <video
          ref={videoRef}
          src={url}
          preload="metadata"
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
        <Play className="w-4 h-4 text-white fill-white" />
      </div>
    </div>
  );
};

/* ── Reel Insights card ── */
const ReelInsightCard = ({ reel }) => {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(reel.recentComments || []);
  const [replyingTo, setReplyingTo] = useState(null); // commentId
  const [replyText, setReplyText]   = useState('');
  const [posting, setPosting]       = useState(false);
  const url = reel.videoUrl || '';

  const submitReply = async (commentId) => {
    const text = replyText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const r = await api.post(`/owner/reels/comments/${commentId}/reply`, { text });
      setComments(prev => prev.map(c =>
        String(c._id) === String(commentId)
          ? { ...c, replies: [...(c.replies || []), r.data.data] }
          : c
      ));
      setReplyText('');
      setReplyingTo(null);
      toast.success('Reply posted');
    } catch {
      toast.error('Failed to post reply');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail — Cloudinary JPEG first, then video element fallback */}
        <ReelThumb url={url} />

        {/* Stats */}
        <div className="flex-1 min-w-0">
          {reel.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {reel.categories.map(c => (
                <span key={c} className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">{c}</span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-bold text-red-500">
              <Heart className="w-3.5 h-3.5 fill-red-500" /> {reel.likeCount}
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-indigo-500">
              <MessageCircle className="w-3.5 h-3.5" /> {reel.commentCount}
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-gray-500 dark:text-gray-400">
              <Eye className="w-3.5 h-3.5" /> {reel.viewCount ?? 0}
            </span>
          </div>
        </div>

        {/* Expand toggle */}
        {comments.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors shrink-0"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Comments + reply UI */}
      {open && comments.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 space-y-3">
          {comments.map((c) => (
            <div key={c._id}>
              {/* User comment */}
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{c.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{c.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600">{timeAgo(c.createdAt)}</p>
                  </div>
                  <p className="text-xs text-gray-800 dark:text-gray-200 break-words">{c.text}</p>
                  <button
                    onClick={() => setReplyingTo(replyingTo === c._id ? null : c._id)}
                    className="mt-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
                  >
                    {replyingTo === c._id ? 'Cancel' : 'Reply'}
                  </button>
                </div>
              </div>

              {/* Owner replies */}
              {c.replies?.map((r, i) => (
                <div key={i} className="flex gap-2 mt-2 ml-8 pl-2 border-l-2 border-violet-300/40 dark:border-violet-700/40">
                  <CornerDownRight className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">{r.ownerName}</span>
                      <span className="px-1.5 py-px rounded text-[9px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">Owner</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-600">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-800 dark:text-gray-200 break-words">{r.text}</p>
                  </div>
                </div>
              ))}

              {/* Reply input */}
              {replyingTo === c._id && (
                <div className="flex gap-2 mt-2 ml-8">
                  <input
                    autoFocus
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply(c._id)}
                    placeholder="Write a reply…"
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
                  />
                  <button
                    onClick={() => submitReply(c._id)}
                    disabled={posting || !replyText.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {posting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Reel Insights panel ── */
const ReelInsights = () => {
  const [analytics, setAnalytics]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get('/owner/reels/analytics')
      .then(r => setAnalytics(r.data.data || []))
      .catch(() => setAnalytics([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
    </div>
  );

  if (!analytics.length) return (
    <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
      No reel videos yet. Upload a video and toggle it as a reel to see insights.
    </div>
  );

  const totalLikes    = analytics.reduce((s, r) => s + r.likeCount, 0);
  const totalComments = analytics.reduce((s, r) => s + r.commentCount, 0);
  const totalViews    = analytics.reduce((s, r) => s + (r.viewCount ?? 0), 0);

  const fmt = (n) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M' : n >= 1_000 ? (n/1_000).toFixed(1)+'K' : String(n);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Eye className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{fmt(totalViews)}</span>
          <span className="text-xs text-gray-500/70">views</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span className="text-sm font-bold text-red-600 dark:text-red-400">{fmt(totalLikes)}</span>
          <span className="text-xs text-red-500/70">likes</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
          <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmt(totalComments)}</span>
          <span className="text-xs text-indigo-500/70">comments</span>
        </div>
        <span className="text-xs text-gray-400 ml-auto">{analytics.length} reel{analytics.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Per-reel cards */}
      <div className="space-y-2">
        {analytics.map((reel, i) => <ReelInsightCard key={i} reel={reel} />)}
      </div>
    </div>
  );
};

/* ─── Main Gallery page ──────────────────────────────────────── */
export default function Gallery() {
  const [photos,       setPhotos]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [coverId,      setCoverId]      = useState(null);
  const [activeTag,    setActiveTag]    = useState(null);
  /** Instagram-style grid: everything | photos only | reels (portrait) */
  const [gridMode,     setGridMode]     = useState('all'); // 'all' | 'photos' | 'reels'
  const [showUpload,   setShowUpload]   = useState(false);
  const [lightbox,     setLightbox]     = useState(null); // { index }
  const [deletingId,   setDeletingId]   = useState(null);

  const { enqueueUploads, lastCompletedAt } = useGalleryUpload();

  /* ── Fetch photos ── */
  const fetchPhotos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/owner/gallery');
      const raw = res.data?.data ?? res.data;
      const parsed = normalizeOwnerGalleryPayload(raw);
      let out = parsed.filter(hasRenderableGalleryMedia);
      // API returned only empty/corrupt rows but reels exist (analytics) — show those URLs
      if (out.length === 0) {
        try {
          const ar = await api.get('/owner/reels/analytics');
          const rows = (ar.data?.data || []).filter((r) => r?.videoUrl);
          if (rows.length) {
            out = rows.map((row, i) => ({
              _id: `v_${i}`,
              url: row.videoUrl,
              type: 'video',
              caption: '',
              tags: [],
              inReels: true,
              reelCategories: row.categories || [],
            }));
          }
        } catch { /* ignore */ }
      }
      setPhotos(out);
      const cover = out.find(p => p.isCover);
      if (cover) setCoverId(cover._id);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  /* ── Auto-refresh gallery when a background upload finishes ── */
  useEffect(() => {
    if (lastCompletedAt) fetchPhotos(true);
  }, [lastCompletedAt, fetchPhotos]);

  /* ── Hand files to background context, close modal immediately ── */
  const handleFilesReady = (fileItems) => {
    enqueueUploads(fileItems);
    setShowUpload(false);
  };

  /* ── Open lightbox (optional modalList e.g. featured strip = images only) ── */
  const handleView = (photo, modalList) => {
    const list = modalList ?? photosForGrid;
    const index = list.findIndex(p => p._id === photo._id);
    setLightbox({ index: index >= 0 ? index : 0, list });
  };

  /* ── Delete from grid (quick) ── */
  const handleDeleteFromGrid = async (photo) => {
    if (deletingId) return;
    setDeletingId(photo._id);
    try {
      await api.delete(`/owner/gallery/${photo._id}`);
      setPhotos(prev => prev.filter(p => p._id !== photo._id));
      if (photo._id === coverId) setCoverId(null);
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to delete photo');
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Lightbox: photo deleted ── */
  const handleLightboxDelete = (id) => {
    setPhotos(prev => prev.filter(p => p._id !== id));
    if (id === coverId) setCoverId(null);
    toast.success('Photo removed');
    setLightbox((prev) => {
      if (!prev?.list) return null;
      const nextList = prev.list.filter(p => p._id !== id);
      if (nextList.length === 0) return null;
      const nextIdx = Math.min(prev.index, nextList.length - 1);
      return { index: nextIdx, list: nextList };
    });
  };

  /* ── Lightbox: photo updated (caption/tags) ── */
  const handleLightboxUpdate = (updated) => {
    setPhotos(prev => prev.map(p => p._id === updated._id ? updated : p));
    setLightbox((prev) => {
      if (!prev?.list) return prev;
      return { ...prev, list: prev.list.map(p => p._id === updated._id ? updated : p) };
    });
  };

  /* ── Cover set ── */
  const handleCoverSet = (id) => {
    setCoverId(id);
    setPhotos(prev => prev.map(p => ({ ...p, isCover: p._id === id })));
    toast.success('Cover photo updated!');
  };

  const validPhotos = photos.filter(hasRenderableGalleryMedia);

  const imagePhotos = validPhotos.filter(p => !isGalleryVideo(p));
  const videoPhotos = validPhotos.filter(p => isGalleryVideo(p));

  // When a tag is active (posts / all), show only gallery-tagged images — same as before.
  const taggedImages = activeTag
    ? imagePhotos.filter(p => p.tags?.includes(activeTag))
    : imagePhotos;

  const photosForGrid =
    gridMode === 'reels'
      ? videoPhotos
      : gridMode === 'photos'
        ? (activeTag ? taggedImages : imagePhotos)
        : (activeTag ? taggedImages : validPhotos);

  const tagCount = (tag) => imagePhotos.filter(p => p.tags?.includes(tag)).length;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Images className="w-5 h-5 text-white" />
                </div>
                Gallery
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Showcase your salon's best work
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fetchPhotos()}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                  hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20"
              >
                <Upload className="w-4 h-4" /> Upload Media
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          {photos.length > 0 && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <StatPill
                icon={Images}
                label="photos"
                value={imagePhotos.length}
                color="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
              />
              {videoPhotos.length > 0 && (
                <StatPill
                  icon={Film}
                  label="videos"
                  value={videoPhotos.length}
                  color="border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
                />
              )}
              {coverId && (
                <StatPill
                  icon={Star}
                  label="cover set"
                  value="✓"
                  color="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                />
              )}
              {ALL_TAGS.map(t => {
                const cnt = tagCount(t);
                return cnt > 0 ? (
                  <StatPill
                    key={t}
                    icon={Tag}
                    label={t}
                    value={cnt}
                    color="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900"
                  />
                ) : null;
              })}
            </div>
          )}

          {/* ── Featured photos strip ── */}
          {imagePhotos.length > 0 && !loading && (
            <FeaturedStrip
              photos={imagePhotos}
              coverId={coverId}
              onView={(p) => handleView(p, activeTag ? taggedImages : imagePhotos)}
            />
          )}

          {/* ── Instagram-style Posts / Reels tabs ── */}
          {validPhotos.length > 0 && !loading && (
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 w-fit">
              {[
                { id: 'all', label: 'All' },
                { id: 'photos', label: 'Photos' },
                ...(videoPhotos.length > 0 ? [{ id: 'reels', label: 'Reels' }] : []),
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGridMode(id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                    gridMode === id
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/80 dark:border-gray-700'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Tag filters (gallery tags — photos / all) ── */}
          {photos.length > 0 && !loading && gridMode !== 'reels' && (
            <div className="flex items-center gap-2 flex-wrap">
              <TagPill label="All" active={!activeTag} onClick={() => setActiveTag(null)} />
              {ALL_TAGS.filter(t => tagCount(t) > 0).map(t => (
                <TagPill
                  key={t}
                  label={`${t} (${tagCount(t)})`}
                  active={activeTag === t}
                  onClick={() => setActiveTag(prev => prev === t ? null : t)}
                />
              ))}
            </div>
          )}

          {/* ── Main content ── */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-white dark:bg-gray-900
                  border border-gray-100 dark:border-gray-800 animate-pulse" />
              ))}
            </div>

          ) : photos.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <EmptyState onUpload={() => setShowUpload(true)} />
            </div>

          ) : photosForGrid.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 py-16 text-center">
              <Film className="w-10 h-10 text-violet-400 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {gridMode === 'reels' ? 'No reels yet' : 'Nothing to show in this view'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                {gridMode === 'reels'
                  ? 'Upload a video — it appears here and for customers like on Instagram.'
                  : 'Try another tab or clear filters.'}
              </p>
            </div>
          ) : (
            <ImageGrid
              photos={photosForGrid}
              loading={false}
              coverId={coverId}
              activeTag={null}
              layout={gridMode === 'reels' ? 'reels' : 'square'}
              onView={(p) => handleView(p)}
              onDelete={handleDeleteFromGrid}
            />
          )}

          {/* ── Reel Insights ── */}
          {!loading && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Reel Insights</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">Likes &amp; comments on your reel videos</span>
              </div>
              <ReelInsights />
            </div>
          )}

        </div>

      {/* ── Upload modal ── */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onFilesReady={handleFilesReady}
      />

      {/* ── Lightbox ── */}
      {lightbox !== null && lightbox.list?.length > 0 && (
        <ImageModal
          photos={lightbox.list}
          initialIndex={lightbox.index}
          coverId={coverId}
          onClose={() => setLightbox(null)}
          onDeleted={handleLightboxDelete}
          onUpdated={handleLightboxUpdate}
          onCoverSet={handleCoverSet}
        />
      )}
    </DashboardLayout>
  );
}
