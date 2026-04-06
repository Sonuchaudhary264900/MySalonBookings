import { useState, useRef, useEffect } from 'react';
import {
  Heart, MessageCircle, Share2, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, X,
  MoreHorizontal, Bookmark, Smile, Search, Plus, Zap,
  Loader2,
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

/* ─── helpers ─────────────────────────────────────────────── */
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
  if (!s || !isFinite(s)) return '';
  const m   = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function getAnalytics(video, analyticsMap) {
  if (!video) return null;
  const url  = getGalleryMediaUrl(video);
  const key  = galleryItemDedupeKey(url);
  const norm = normalizeClientMediaUrl(url);
  return analyticsMap[key] ?? analyticsMap[norm] ?? null;
}

/* ─── ReelGridCard ────────────────────────────────────────── */
function ReelGridCard({ video, analyticsMap, onClick }) {
  const url      = getGalleryMediaUrl(video);
  const thumbUrl = cloudinaryVideoPosterUrl(url);
  const analytics = getAnalytics(video, analyticsMap);
  const likes     = analytics?.likeCount    ?? 0;
  const comments  = analytics?.commentCount ?? 0;
  const [dur, setDur]           = useState(null);
  const [thumbErr, setThumbErr] = useState(false);

  return (
    <button
      onClick={onClick}
      className="relative group block w-full bg-neutral-950 overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9 / 16' }}
    >
      {/* Thumbnail */}
      {thumbUrl && !thumbErr ? (
        <img
          src={thumbUrl}
          alt=""
          draggable={false}
          onError={() => setThumbErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        /* Fallback: first frame from video */
        <video
          src={`${url}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.target.currentTime = 0.5;
            setDur(e.target.duration);
          }}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      )}

      {/* Hidden video just for duration when thumbnail loads fine */}
      {thumbUrl && !thumbErr && (
        <video
          src={`${url}#t=0.1`}
          preload="metadata"
          className="sr-only"
          onLoadedMetadata={(e) => setDur(e.target.duration)}
        />
      )}

      {/* Top-right: play icon */}
      <div className="absolute top-1.5 right-1.5 pointer-events-none drop-shadow">
        <Play className="w-[14px] h-[14px] text-white fill-white" />
      </div>

      {/* Bottom-right: duration */}
      {dur && (
        <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
          <span className="text-white text-[10px] font-bold drop-shadow tabular-nums">
            {fmtDuration(dur)}
          </span>
        </div>
      )}

      {/* Hover overlay — likes & comments centered */}
      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-5 pointer-events-none">
        <div className="flex items-center gap-1">
          <Heart className="w-[18px] h-[18px] text-white fill-white drop-shadow" />
          <span className="text-white font-bold text-sm drop-shadow">{fmt(likes)}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-[18px] h-[18px] text-white fill-white drop-shadow" />
          <span className="text-white font-bold text-sm drop-shadow">{fmt(comments)}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── ReelViewerModal ─────────────────────────────────────── */
function ReelViewerModal({ videos, initialIndex, analyticsMap, onClose }) {
  const [idx,        setIdx]        = useState(initialIndex);
  const [playing,    setPlaying]    = useState(true);
  const [muted,      setMuted]      = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [comment,    setComment]    = useState('');
  const [posting,    setPosting]    = useState(false);
  const [comments,   setComments]   = useState([]);
  const [localLiked, setLocalLiked] = useState(false);

  const videoRef       = useRef(null);
  const commentsEndRef = useRef(null);

  const current   = videos[idx] ?? null;
  const url       = current ? getGalleryMediaUrl(current) : '';
  const thumbUrl  = cloudinaryVideoPosterUrl(url);
  const analytics = current ? getAnalytics(current, analyticsMap) : null;
  const likes     = (analytics?.likeCount ?? 0) + (localLiked ? 1 : 0);
  const cats      = current ? (current.reelCategories || current.categories || []) : [];

  const { user }     = useAuth();
  const { salon }    = useSalon();
  const salonName    = salon?.name || user?.name || 'My Salon';
  const salonInitial = salonName[0]?.toUpperCase() || 'S';
  const salonAvatar  = salon?.profileImage || salon?.coverImage || null;

  /* Load comments on reel change */
  useEffect(() => {
    setComments(analytics?.recentComments || []);
    setLocalLiked(false);
  }, [idx]);

  /* Reset video on index change */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    setPlaying(true);
    setProgress(0);
    setDuration(0);
  }, [idx, url]);

  /* Keyboard nav */
  useEffect(() => {
    const on = (e) => {
      if (e.key === 'Escape')     { onClose(); return; }
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(videos.length - 1, i + 1));
      if (e.key === ' ')          { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  /* Scroll lock */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Scroll comments to bottom */
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

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
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
  };

  const submitComment = async () => {
    const text = comment.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      setComments(prev => [...prev, {
        _id:       `opt_${Date.now()}`,
        name:      salonName,
        text,
        createdAt: new Date().toISOString(),
        isOwner:   true,
      }]);
      setComment('');
    } finally {
      setPosting(false);
    }
  };

  if (!current) return null;

  /* ── Avatar helper ── */
  const Avatar = ({ size = 9, className = '' }) => (
    <div className={`w-${size} h-${size} rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0 ${className}`}>
      {salonAvatar
        ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
        : <span className="text-white font-bold text-xs">{salonInitial}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-black flex" style={{ fontFamily: 'inherit' }}>

      {/* ════ LEFT — Video player ════ */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">

        {/* Blurred ambient background */}
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-25 pointer-events-none"
          />
        )}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* ── 9:16 video container — fills full viewport height ── */}
        <div
          className="relative z-10 overflow-hidden rounded-xl shadow-2xl"
          style={{
            height: '100vh',
            aspectRatio: '9 / 16',
            maxWidth: 'calc(100% - 120px)', /* leave room for arrows */
          }}
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
            className="w-full h-full object-cover cursor-pointer"
          />

          {/* Play/Pause flash */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Mute toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Bottom overlay: caption + progress */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-20 pb-4 px-4 pointer-events-none">
            {cats.length > 0 && (
              <p className="text-white/70 text-xs mb-1 leading-relaxed">
                {cats.map(c => `#${c}`).join(' ')}
              </p>
            )}
            {current.caption && (
              <p className="text-white text-sm font-medium leading-snug line-clamp-2 mb-3">
                {current.caption}
              </p>
            )}
            {/* Seek bar */}
            <div
              className="h-[3px] bg-white/30 rounded-full overflow-hidden cursor-pointer pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
            >
              <div
                className="h-full bg-white rounded-full transition-[width] duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-white/50 tabular-nums">
                {fmtDuration((progress / 100) * duration)}
              </span>
              <span className="text-[10px] text-white/50 tabular-nums">{fmtDuration(duration)}</span>
            </div>
          </div>
        </div>

        {/* Prev / Next arrows */}
        {idx > 0 && (
          <button
            onClick={() => setIdx(i => i - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-black/70 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {idx < videos.length - 1 && (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-black/70 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
          <span className="text-white text-xs font-medium tabular-nums">{idx + 1} / {videos.length}</span>
        </div>
      </div>

      {/* ════ RIGHT — Comments & info panel ════ */}
      <div
        className="flex flex-col h-screen bg-black border-l border-neutral-800 shrink-0"
        style={{ width: 380 }}
      >
        {/* Profile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0 ring-2 ring-purple-500/50">
            {salonAvatar
              ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-sm">{salonInitial}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none truncate">{salonName}</p>
            {cats.length > 0 && (
              <p className="text-neutral-500 text-xs mt-0.5 truncate">{cats[0]}</p>
            )}
          </div>
          <button className="shrink-0 text-neutral-400 hover:text-white transition">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Caption row */}
        {current.caption && (
          <div className="px-4 py-3 border-b border-neutral-800">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
                {salonAvatar
                  ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-xs">{salonInitial}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-semibold mr-2">{salonName}</span>
                <span className="text-neutral-300 text-sm">{current.caption}</span>
                {cats.length > 0 && (
                  <p className="mt-1.5">
                    {cats.map(c => (
                      <span key={c} className="text-sky-400 text-sm mr-1.5">#{c}</span>
                    ))}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="px-4 py-2 border-b border-neutral-800 flex items-center gap-3 text-neutral-500 text-xs">
          <span>{fmt(analytics?.viewCount ?? 0)} views</span>
          {current.createdAt && (
            <>
              <span className="text-neutral-700">·</span>
              <span>{timeAgo(current.createdAt)} ago</span>
            </>
          )}
        </div>

        {/* Comments list — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5" style={{ scrollbarWidth: 'none' }}>
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
              <MessageCircle className="w-12 h-12 text-neutral-800" />
              <p className="text-white font-semibold">No comments yet.</p>
              <p className="text-neutral-500 text-sm text-center leading-relaxed">
                Start the conversation.
              </p>
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={c._id || i} className="flex gap-3">
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden
                  ${c.isOwner
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400'
                    : 'bg-neutral-700'}`}>
                  {c.isOwner
                    ? (salonAvatar ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white">{salonInitial}</span>)
                    : <span className="text-neutral-300">{c.name?.[0]?.toUpperCase() || '?'}</span>
                  }
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                    <span className="text-white text-sm font-semibold">{c.isOwner ? salonName : c.name}</span>
                    {c.isOwner && (
                      <span className="text-[9px] font-bold bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">Owner</span>
                    )}
                    {c.createdAt && (
                      <span className="text-neutral-500 text-[11px] ml-auto">{timeAgo(c.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-neutral-200 text-sm break-words leading-relaxed">{c.text}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <button className="text-neutral-500 hover:text-neutral-300 text-xs transition">Like</button>
                    <button className="text-neutral-500 hover:text-neutral-300 text-xs transition">Reply</button>
                  </div>
                </div>
                <button className="shrink-0 mt-0.5">
                  <Heart className="w-3.5 h-3.5 text-neutral-700 hover:text-neutral-400 transition" />
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Action buttons */}
        <div className="border-t border-neutral-800 px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocalLiked(l => !l)}
                className="transition-transform active:scale-90"
              >
                <Heart className={`w-6 h-6 transition-colors ${localLiked ? 'text-red-500 fill-red-500' : 'text-white hover:text-neutral-300'}`} />
              </button>
              <button>
                <MessageCircle className="w-6 h-6 text-white hover:text-neutral-300 transition" />
              </button>
              <button onClick={() => toast.success('Link copied!', { icon: '🔗' })}>
                <Share2 className="w-6 h-6 text-white hover:text-neutral-300 transition" />
              </button>
            </div>
            <button>
              <Bookmark className="w-6 h-6 text-white hover:text-neutral-300 transition" />
            </button>
          </div>
          <p className="text-white text-sm font-semibold mb-0.5">{fmt(likes)} likes</p>
          {current.createdAt && (
            <p className="text-neutral-600 text-[10px] uppercase tracking-wider mb-2">{timeAgo(current.createdAt)} ago</p>
          )}
        </div>

        {/* Comment input */}
        <div className="border-t border-neutral-800 px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
            {salonAvatar
              ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white font-bold text-[11px]">{salonInitial}</span>}
          </div>
          <div className="flex-1 flex items-center gap-2 border border-neutral-700 rounded-full px-3 py-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-white text-sm placeholder-neutral-600 outline-none"
            />
            <button className="shrink-0">
              <Smile className="w-4 h-4 text-neutral-600 hover:text-neutral-400 transition" />
            </button>
          </div>
          {comment.trim() && (
            <button
              onClick={submitComment}
              disabled={posting}
              className="text-sky-400 hover:text-sky-300 font-semibold text-sm transition disabled:opacity-50 shrink-0"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ReelsDashboard
   ════════════════════════════════════════════════════════════ */
export default function ReelsDashboard({
  videos       = [],
  analyticsMap = {},
  onDelete,
  onEdit,
  onUpload,
}) {
  const [query,       setQuery]       = useState('');
  const [viewerIdx,   setViewerIdx]   = useState(null);
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
          cats.some(c => c.toLowerCase().includes(query.toLowerCase())) ||
          (v.caption || '').toLowerCase().includes(query.toLowerCase())
        );
      })
    : videos;

  /* Clamp viewer index when list shrinks */
  useEffect(() => {
    if (viewerIdx !== null && viewerIdx >= filtered.length) {
      setViewerIdx(filtered.length > 0 ? filtered.length - 1 : null);
    }
  }, [filtered.length]);

  /* ── Empty state ── */
  if (!videos.length) {
    return (
      <div className="bg-black min-h-[60vh] flex flex-col items-center justify-center gap-4 rounded-2xl">
        <div className="w-20 h-20 rounded-full border-2 border-neutral-800 flex items-center justify-center">
          <Play className="w-8 h-8 text-neutral-700" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-xl mb-1">No reels yet</p>
          <p className="text-neutral-500 text-sm">Upload videos to show your best work</p>
        </div>
        <button
          onClick={onUpload}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition"
        >
          <Plus className="w-4 h-4" />
          Upload Reel
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`.ig-scroll::-webkit-scrollbar{display:none}`}</style>

      <div className="bg-black rounded-2xl overflow-hidden">

        {/* ══ Instagram-style top nav ══ */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-black sticky top-0 z-10">
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight hidden sm:block">Reels</span>
          </div>

          {/* Search */}
          <div className={`relative transition-all duration-200 ${searchFocus ? 'flex-1 max-w-md' : 'flex-1 max-w-xs'}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search by category or caption…"
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm placeholder-neutral-600 outline-none focus:border-neutral-500 transition"
            />
          </div>

          {/* Profile avatar (right of nav) */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <button
              onClick={onUpload}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-white hover:bg-neutral-800 transition"
              title="Upload Reel"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center ring-2 ring-purple-500/40 cursor-pointer shrink-0"
              title={salonName}
            >
              {salonAvatar
                ? <img src={salonAvatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-white font-bold text-xs">{salonInitial}</span>}
            </div>
          </div>
        </div>

        {/* ══ 3-column grid ══ */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-neutral-500 text-sm">No reels match your search</p>
            <button onClick={() => setQuery('')} className="mt-2 text-sky-400 text-sm hover:underline">Clear</button>
          </div>
        ) : (
          <div
            className="grid grid-cols-3"
            style={{ gap: '2px' }}
          >
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

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-600 text-xs">{filtered.length} video{filtered.length !== 1 ? 's' : ''}</span>
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload
            </button>
          </div>
        )}
      </div>

      {/* ══ Full-screen viewer modal ══ */}
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
