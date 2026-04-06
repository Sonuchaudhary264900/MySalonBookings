import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart, MessageCircle, Share2, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, X, Send, Loader2,
  MoreHorizontal, Bookmark, Smile, Search, Plus, Bell, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getGalleryMediaUrl,
  cloudinaryVideoPosterUrl,
  galleryItemDedupeKey,
  normalizeClientMediaUrl,
} from './galleryUtils';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import api from '../../services/api';

/* ─────────────────────── helpers ─────────────────────── */
const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
};

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function fmtDuration(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ─────────────────────── ReelGridCard ─────────────────────── */
function ReelGridCard({ video, analyticsMap, onClick }) {
  const url      = getGalleryMediaUrl(video);
  const thumbUrl = cloudinaryVideoPosterUrl(url);
  const dedupeKey = galleryItemDedupeKey(url);
  const normUrl   = normalizeClientMediaUrl(url);
  const analytics = analyticsMap[dedupeKey] ?? analyticsMap[normUrl] ?? null;
  const likes     = analytics?.likeCount    ?? 0;
  const comments  = analytics?.commentCount ?? 0;
  const [dur, setDur] = useState(null);

  return (
    <button
      onClick={onClick}
      className="relative group block w-full bg-black overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Thumbnail */}
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
          <Play className="w-8 h-8 text-white/30" />
        </div>
      )}

      {/* Hidden video to read duration */}
      <video
        src={url}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => setDur(e.target.duration)}
      />

      {/* Play icon top-right */}
      <div className="absolute top-2 right-2 pointer-events-none">
        <Play className="w-4 h-4 text-white fill-white drop-shadow-lg" />
      </div>

      {/* Duration bottom-right */}
      {dur && (
        <div className="absolute bottom-2 right-2 pointer-events-none">
          <span className="text-white text-[11px] font-semibold drop-shadow-lg tabular-nums">
            {fmtDuration(dur)}
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <Heart className="w-5 h-5 text-white fill-white drop-shadow" />
            <span className="text-white font-bold text-sm drop-shadow">{fmt(likes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-5 h-5 text-white fill-white drop-shadow" />
            <span className="text-white font-bold text-sm drop-shadow">{fmt(comments)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─────────────────────── ReelViewerModal ─────────────────────── */
function ReelViewerModal({ videos, initialIndex, analyticsMap, onClose, onDelete, onEdit }) {
  const [idx,      setIdx]      = useState(initialIndex);
  const [playing,  setPlaying]  = useState(true);
  const [muted,    setMuted]    = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [comment,  setComment]  = useState('');
  const [posting,  setPosting]  = useState(false);
  const [comments, setComments] = useState([]);
  const [localLiked, setLocalLiked] = useState(false);

  const videoRef      = useRef(null);
  const commentsEndRef = useRef(null);

  const current    = videos[idx] ?? null;
  const url        = current ? getGalleryMediaUrl(current) : '';
  const thumbUrl   = cloudinaryVideoPosterUrl(url);
  const dedupeKey  = galleryItemDedupeKey(url);
  const normUrl    = normalizeClientMediaUrl(url);
  const analytics  = analyticsMap[dedupeKey] ?? analyticsMap[normUrl] ?? null;
  const likes      = (analytics?.likeCount ?? 0) + (localLiked ? 1 : 0);
  const cats       = current ? (current.reelCategories || current.categories || []) : [];

  const { user }        = useAuth();
  const { salon }       = useSalon();
  const salonName       = salon?.name || user?.name || 'My Salon';
  const salonInitial    = salonName[0]?.toUpperCase() || 'S';
  const salonAvatar     = salon?.profileImage || salon?.coverImage || null;

  /* Load comments from analytics */
  useEffect(() => {
    const raw = analytics?.recentComments || [];
    setComments(raw);
    setLocalLiked(false);
  }, [idx]);

  /* Scroll comments to bottom when new comment added */
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  /* Reset video on index change */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    setPlaying(true);
    setProgress(0);
    setDuration(0);
  }, [idx]);

  /* Keyboard nav */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowLeft')   setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')  setIdx(i => Math.min(videos.length - 1, i + 1));
      if (e.key === ' ')           { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  /* Lock scroll on mount */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else         { v.play();  setPlaying(true);  }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v?.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || posting || !analytics?._id) return;
    setPosting(true);
    try {
      /* optimistic add */
      const optimistic = {
        _id:       `opt_${Date.now()}`,
        name:      salonName,
        text,
        createdAt: new Date().toISOString(),
        isOwner:   true,
      };
      setComments(prev => [...prev, optimistic]);
      setComment('');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex">
      {/* ── Close ── */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all"
      >
        <X className="w-5 h-5" />
      </button>

      {/* ── LEFT: Video player (70%) ── */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        {/* Blurred bg */}
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-30 pointer-events-none"
          />
        )}

        {/* 9:16 video */}
        <div
          className="relative z-10 flex items-center justify-center h-full w-full"
          style={{ maxWidth: 420, margin: '0 auto' }}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
            style={{ aspectRatio: '9/16', maxHeight: 'calc(100vh - 40px)' }}
            onClick={togglePlay}
          >
            <video
              key={url}
              ref={videoRef}
              src={url}
              muted={muted}
              loop
              playsInline
              autoPlay
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
              className="w-full h-full object-cover"
            />

            {/* Play/pause overlay */}
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </div>
              </div>
            )}

            {/* Mute button */}
            <button
              onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-all"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Caption + categories */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-16 pb-3 px-3 pointer-events-none">
              {cats.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {cats.map((c) => (
                    <span key={c} className="text-white/80 text-[11px] font-medium">#{c}</span>
                  ))}
                </div>
              )}
              {current.caption && (
                <p className="text-white text-sm leading-snug line-clamp-2">{current.caption}</p>
              )}
              {/* Progress bar */}
              <div
                className="mt-3 h-[3px] bg-white/25 rounded-full overflow-hidden pointer-events-auto cursor-pointer"
                onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
              >
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 pointer-events-none">
                <span className="text-[10px] text-white/50 tabular-nums">
                  {fmtDuration((progress / 100) * duration)}
                </span>
                <span className="text-[10px] text-white/50 tabular-nums">{fmtDuration(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prev arrow */}
        {idx > 0 && (
          <button
            onClick={() => setIdx(i => i - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Next arrow */}
        {idx < videos.length - 1 && (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── RIGHT: Comments panel (30%) ── */}
      <div
        className="flex flex-col bg-black border-l border-neutral-800"
        style={{ width: '30%', minWidth: 320, maxWidth: 420 }}
      >
        {/* Header: profile */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 ring-2 ring-transparent hover:ring-purple-500 transition-all cursor-pointer">
            {salonAvatar
              ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-sm">{salonInitial}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none">{salonName}</p>
            {cats.length > 0 && (
              <p className="text-neutral-400 text-xs mt-0.5 truncate">{cats[0]}</p>
            )}
          </div>
          <button className="text-neutral-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Caption */}
        {current.caption && (
          <div className="px-4 py-3 border-b border-neutral-800">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                {salonAvatar
                  ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-xs">{salonInitial}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-semibold mr-2">{salonName}</span>
                <span className="text-neutral-200 text-sm">{current.caption}</span>
                {cats.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {cats.map(c => (
                      <span key={c} className="text-sky-400 text-sm">#{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics row */}
        <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center gap-4 text-neutral-400 text-xs">
          <span>{fmt(analytics?.viewCount ?? 0)} views</span>
          {analytics?.viewCount > 0 && (
            <span className="text-neutral-600">·</span>
          )}
          {current.createdAt && (
            <span>{timeAgo(current.createdAt)} ago</span>
          )}
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ scrollbarWidth: 'none' }}>
          <style>{`.reel-comments::-webkit-scrollbar{display:none}`}</style>
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
              <MessageCircle className="w-10 h-10 text-neutral-700" />
              <p className="text-white font-semibold text-sm">No comments yet</p>
              <p className="text-neutral-500 text-xs text-center">Start the conversation.</p>
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={c._id || i} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                  ${c.isOwner ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' : 'bg-neutral-700 text-neutral-300'}`}>
                  {c.isOwner ? salonInitial : (c.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-white text-sm font-semibold">{c.isOwner ? salonName : c.name}</span>
                    {c.isOwner && (
                      <span className="text-[9px] font-bold bg-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded">Owner</span>
                    )}
                    {c.createdAt && (
                      <span className="text-neutral-500 text-[11px] ml-auto">{timeAgo(c.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-neutral-200 text-sm break-words leading-relaxed">{c.text}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button className="text-neutral-500 hover:text-neutral-300 text-xs transition-colors">Like</button>
                    <button className="text-neutral-500 hover:text-neutral-300 text-xs transition-colors">Reply</button>
                  </div>
                </div>
                <button className="shrink-0 mt-0.5">
                  <Heart className="w-3.5 h-3.5 text-neutral-600 hover:text-neutral-400 transition-colors" />
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Action bar */}
        <div className="border-t border-neutral-800 px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocalLiked(l => !l)}
                className="transition-transform active:scale-90"
              >
                <Heart className={`w-6 h-6 transition-colors ${localLiked ? 'text-red-500 fill-red-500' : 'text-white hover:text-neutral-300'}`} />
              </button>
              <button>
                <MessageCircle className="w-6 h-6 text-white hover:text-neutral-300 transition-colors" />
              </button>
              <button onClick={() => toast('Share link copied!', { icon: '🔗' })}>
                <Share2 className="w-6 h-6 text-white hover:text-neutral-300 transition-colors" />
              </button>
            </div>
            <button>
              <Bookmark className="w-6 h-6 text-white hover:text-neutral-300 transition-colors" />
            </button>
          </div>

          {/* Likes count */}
          <p className="text-white text-sm font-semibold mb-1">{fmt(likes)} likes</p>

          {/* Timestamp */}
          {current.createdAt && (
            <p className="text-neutral-500 text-[10px] uppercase tracking-wider mb-3">{timeAgo(current.createdAt)} ago</p>
          )}
        </div>

        {/* Comment input */}
        <div className="border-t border-neutral-800 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            {salonAvatar
              ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-xs">{salonInitial}</span>
            }
          </div>
          <div className="flex-1 flex items-center gap-2 bg-transparent border border-neutral-700 rounded-full px-4 py-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-white text-sm placeholder-neutral-500 outline-none min-w-0"
            />
            <button>
              <Smile className="w-4 h-4 text-neutral-500 hover:text-neutral-300 transition-colors shrink-0" />
            </button>
          </div>
          {comment.trim() && (
            <button
              onClick={submitComment}
              disabled={posting}
              className="text-sky-400 hover:text-sky-300 font-semibold text-sm transition-colors disabled:opacity-50 shrink-0"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ReelsDashboard — Instagram-like grid + viewer
   ═══════════════════════════════════════════════════════════════ */
export default function ReelsDashboard({
  videos       = [],
  analyticsMap = {},
  onDelete,
  onEdit,
  onUpload,
}) {
  const [query,       setQuery]       = useState('');
  const [viewerIdx,   setViewerIdx]   = useState(null); // null = closed
  const [searchFocus, setSearchFocus] = useState(false);

  const { user }     = useAuth();
  const { salon }    = useSalon();
  const salonName    = salon?.name || user?.name || 'My Salon';
  const salonInitial = salonName[0]?.toUpperCase() || 'S';
  const salonAvatar  = salon?.profileImage || salon?.coverImage || null;

  /* Filtered list */
  const filtered = query.trim()
    ? videos.filter((v) => {
        const cats = v.reelCategories || v.categories || [];
        return (
          cats.some((c) => c.toLowerCase().includes(query.toLowerCase())) ||
          (v.caption || '').toLowerCase().includes(query.toLowerCase())
        );
      })
    : videos;

  /* Reset viewer index if filtered list shrinks */
  useEffect(() => {
    if (viewerIdx !== null && viewerIdx >= filtered.length) {
      setViewerIdx(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length]);

  /* ─── Empty state ─── */
  if (!videos.length) {
    return (
      <div className="bg-black min-h-[60vh] flex flex-col items-center justify-center gap-4 rounded-2xl">
        <div className="w-20 h-20 rounded-full border-2 border-neutral-700 flex items-center justify-center">
          <Play className="w-8 h-8 text-neutral-600" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-xl mb-1">Share reels</p>
          <p className="text-neutral-400 text-sm">Upload videos to show your best work</p>
        </div>
        <button
          onClick={onUpload}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload Reel
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Inject global CSS for hiding scrollbars */}
      <style>{`
        .ig-hide-scroll::-webkit-scrollbar { display: none; }
        .ig-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="bg-black rounded-2xl overflow-hidden">

        {/* ══ INSTAGRAM-STYLE TOP NAV ══ */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-black sticky top-0 z-10">

          {/* Logo / brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight hidden sm:block">Reels</span>
          </div>

          {/* Search bar */}
          <div className={`relative flex-1 max-w-sm transition-all duration-200 ${searchFocus ? 'max-w-md' : ''}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search reels…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm placeholder-neutral-500 outline-none focus:border-neutral-500 transition-colors"
            />
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Upload */}
            <button
              onClick={onUpload}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
              title="Upload Reel"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
              title="Notifications"
            >
              <Heart className="w-5 h-5" />
            </button>

            {/* Profile avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-transparent hover:ring-purple-500 transition-all cursor-pointer shrink-0">
              {salonAvatar
                ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-bold text-sm">{salonInitial}</span>
              }
            </div>
          </div>
        </div>

        {/* ══ 3-COLUMN REELS GRID ══ */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-neutral-400 text-sm">No reels match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-3" style={{ gap: '2px' }}>
            {filtered.map((video, i) => (
              <ReelGridCard
                key={video._id || i}
                video={video}
                analyticsMap={analyticsMap}
                onClick={() => setViewerIdx(i)}
              />
            ))}
          </div>
        )}

        {/* Small counter at bottom */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-500 text-xs">{filtered.length} reel{filtered.length !== 1 ? 's' : ''}</span>
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>
        )}
      </div>

      {/* ══ FULL-SCREEN VIEWER MODAL ══ */}
      {viewerIdx !== null && filtered.length > 0 && (
        <ReelViewerModal
          videos={filtered}
          initialIndex={viewerIdx}
          analyticsMap={analyticsMap}
          onClose={() => setViewerIdx(null)}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      )}
    </>
  );
}
