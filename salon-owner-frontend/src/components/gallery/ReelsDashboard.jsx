import { useState, useRef, useEffect } from 'react';
import {
  Heart, MessageCircle, Eye, Share2, ChevronLeft, ChevronRight,
  Rocket, Pencil, Trash2, TrendingUp, Play, Pause, Volume2, VolumeX,
  Search, Zap, Sparkles, Calendar, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getGalleryMediaUrl,
  cloudinaryVideoPosterUrl,
  galleryItemDedupeKey,
  normalizeClientMediaUrl,
} from './galleryUtils';

/* ─────────────────────────────────────────────────── helpers ── */
const fmt = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
};

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtDuration(s) {
  if (!s || !isFinite(s)) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ══════════════════════════════════════════════════════════════
   ReelsDashboard — premium Instagram × Stripe reels viewer
   ══════════════════════════════════════════════════════════════ */
export default function ReelsDashboard({
  videos     = [],
  analyticsMap = {},
  onDelete,
  onEdit,
  onUpload,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [query,      setQuery]      = useState('');
  const [playing,    setPlaying]    = useState(true);
  const [muted,      setMuted]      = useState(true);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [deleting,   setDeleting]   = useState(false);

  const videoRef = useRef(null);

  /* ── Filtered list ── */
  const filtered = query.trim()
    ? videos.filter((v) => {
        const cats = v.reelCategories || v.categories || [];
        return (
          cats.some((c) => c.toLowerCase().includes(query.toLowerCase())) ||
          (v.caption || '').toLowerCase().includes(query.toLowerCase())
        );
      })
    : videos;

  const total   = filtered.length;
  const current = filtered[currentIdx] ?? null;

  /* ── Analytics lookup ── */
  const getAnalytics = (video) => {
    if (!video) return null;
    const url  = getGalleryMediaUrl(video);
    const key  = galleryItemDedupeKey(url);
    const norm = normalizeClientMediaUrl(url);
    return analyticsMap[key] ?? analyticsMap[norm] ?? null;
  };

  const analytics     = getAnalytics(current);
  const views         = analytics?.viewCount   ?? 0;
  const likes         = analytics?.likeCount   ?? 0;
  const comments      = analytics?.commentCount ?? 0;
  const engRate       = views > 0 ? Math.min(((likes + comments) / views) * 100, 100) : 0;
  const isTopPerform  = engRate > 5 || views > 1000;

  /* ── Navigation ── */
  const goTo = (idx) => {
    setCurrentIdx(idx);
    setProgress(0);
  };
  const prev = () => goTo(Math.max(0, currentIdx - 1));
  const next = () => goTo(Math.min(total - 1, currentIdx + 1));

  /* ── Reset player on index change ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    setPlaying(true);
    setProgress(0);
  }, [currentIdx]);

  /* ── Reset index when search changes ── */
  useEffect(() => { setCurrentIdx(0); }, [query]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === ' ')          { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

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

  const handleDelete = async () => {
    if (!current || deleting || current._galleryOrphan) return;
    setDeleting(true);
    try   { await onDelete(current); }
    finally { setDeleting(false); }
  };

  /* ── Derived media ── */
  const url      = current ? getGalleryMediaUrl(current) : '';
  const thumbUrl = cloudinaryVideoPosterUrl(url);
  const cats     = current ? (current.reelCategories || current.categories || []) : [];

  /* ── Empty / no-current guards ── */
  if (!total) {
    return (
      <div className="rounded-2xl bg-gray-950 border border-gray-800/60 flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-violet-950/40 flex items-center justify-center mb-4 border border-violet-800/30">
          <Zap className="w-8 h-8 text-violet-400" />
        </div>
        <p className="text-white font-semibold mb-1">
          {query ? 'No reels match your search' : 'No reels yet'}
        </p>
        <p className="text-gray-500 text-sm mb-5">
          {query ? 'Try different keywords' : 'Upload a video to get started'}
        </p>
        {!query && (
          <button
            onClick={onUpload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/25"
          >
            Upload Reel
          </button>
        )}
      </div>
    );
  }

  if (!current) return null;

  /* ═════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* Scrollbar hide util */}
      <style>{`.reel-filmstrip::-webkit-scrollbar{display:none}.reel-filmstrip{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      <div className="rounded-2xl overflow-hidden bg-gray-950 border border-gray-800/60 shadow-2xl">

        {/* ══ TOP BAR ══ */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 bg-gray-950/90 backdrop-blur-sm">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reels by category…"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50
                text-sm text-gray-200 placeholder-gray-500 outline-none
                focus:border-violet-500/60 focus:bg-gray-800 transition-all"
            />
          </div>

          {/* Counter */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="font-bold text-gray-200">{currentIdx + 1}</span>
            <span>/</span>
            <span>{total}</span>
          </div>

          {/* Arrows + upload */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button onClick={prev} disabled={currentIdx === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next} disabled={currentIdx >= total - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onUpload}
              className="ml-2 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md shadow-violet-500/20">
              + Upload
            </button>
          </div>
        </div>

        {/* ══ BODY ══ */}
        <div className="flex flex-col lg:flex-row">

          {/* ── LEFT: Video player (70%) ── */}
          <div className="relative flex-1 lg:w-[70%] flex items-center justify-center bg-black overflow-hidden"
            style={{ minHeight: 540 }}>

            {/* Blurred background */}
            {thumbUrl && (
              <img src={thumbUrl} alt=""
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-35 pointer-events-none" />
            )}
            {/* gradient vignette over blur */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

            {/* 9:16 reel */}
            <div className="relative z-10 flex items-center justify-center w-full h-full py-6 px-12">
              <div
                className="relative rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.25)] cursor-pointer"
                style={{ aspectRatio: '9/16', maxHeight: 520, height: '100%' }}
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
                  onEnded={() => setPlaying(false)}
                  className="w-full h-full object-cover"
                />

                {/* ── Play overlay ── */}
                {!playing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                    <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-xl">
                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}

                {/* ── Top badges ── */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  {isTopPerform ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 backdrop-blur-sm border border-amber-300/30 shadow-lg">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-bold text-white tracking-wide">Top Performing</span>
                    </div>
                  ) : <span />}

                  {/* Mute — pointer-events restored */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                    className="pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full
                      bg-black/40 backdrop-blur-sm border border-white/10 text-white hover:bg-black/60 transition-all"
                  >
                    {muted
                      ? <VolumeX className="w-3.5 h-3.5" />
                      : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* ── Bottom overlay: title, cats, vertical stats ── */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-12 pb-3 px-3">
                  <div className="flex items-end gap-3">

                    {/* Left: title + category pills */}
                    <div className="flex-1 min-w-0 mb-1">
                      {current.caption && (
                        <p className="text-white font-semibold text-sm mb-2 line-clamp-2 leading-snug drop-shadow">
                          {current.caption}
                        </p>
                      )}
                      {cats.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cats.map((c) => (
                            <span key={c}
                              className="px-2.5 py-0.5 rounded-full bg-violet-600/75 backdrop-blur-sm text-white text-[10px] font-semibold border border-violet-400/25">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: vertical icons (Instagram style) */}
                    <div className="flex flex-col items-center gap-4 shrink-0 pb-1 pointer-events-auto">
                      {[
                        { icon: Heart, val: fmt(likes),    fill: true,  color: 'hover:bg-red-500/20',     label: null },
                        { icon: MessageCircle, val: fmt(comments), fill: false, color: 'hover:bg-indigo-500/20', label: null },
                        { icon: Eye,  val: fmt(views),    fill: false, color: '',                         label: null },
                        { icon: Share2, val: 'Share',      fill: false, color: 'hover:bg-emerald-500/20', label: null },
                      ].map(({ icon: Icon, val, fill, color }) => (
                        <button key={val + Icon.displayName}
                          onClick={(e) => e.stopPropagation()}
                          className="flex flex-col items-center gap-1 group">
                          <div className={`w-9 h-9 rounded-full bg-black/35 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-colors ${color}`}>
                            <Icon className={`w-[18px] h-[18px] text-white ${fill ? 'fill-white' : ''}`} />
                          </div>
                          <span className="text-white text-[10px] font-bold drop-shadow">{val}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="mt-3 h-[3px] bg-white/20 rounded-full overflow-hidden cursor-pointer pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-[width] duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 pointer-events-none">
                    <span className="text-[10px] text-white/50">
                      {fmtDuration((progress / 100) * duration)}
                    </span>
                    <span className="text-[10px] text-white/50">{fmtDuration(duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Side navigation arrows ── */}
            {currentIdx > 0 && (
              <button onClick={prev}
                className="absolute left-3 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-white hover:bg-black/65 transition-all shadow-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentIdx < total - 1 && (
              <button onClick={next}
                className="absolute right-3 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-white hover:bg-black/65 transition-all shadow-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Pause hint */}
            {playing && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none opacity-60">
                <Pause className="w-3 h-3 text-white" />
                <span className="text-white text-[10px]">tap to pause</span>
              </div>
            )}
          </div>

          {/* ── RIGHT: Analytics glass panel (30%) ── */}
          <div className="lg:w-[30%] border-t lg:border-t-0 lg:border-l border-gray-800/60
            bg-gradient-to-b from-gray-900/70 to-gray-950/90 backdrop-blur-xl
            p-5 flex flex-col gap-5">

            {/* Panel header */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                  <TrendingUp className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">Reel Analytics</h3>
                {isTopPerform && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                    🔥 Hot
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-gray-500">Published · Live</span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Views',    value: fmt(views),    icon: Eye,           color: 'text-sky-400',    bg: 'from-sky-950/50 to-sky-900/20 border-sky-800/30' },
                { label: 'Likes',    value: fmt(likes),    icon: Heart,         color: 'text-red-400',    bg: 'from-red-950/50 to-red-900/20 border-red-800/30' },
                { label: 'Comments', value: fmt(comments), icon: MessageCircle, color: 'text-violet-400', bg: 'from-violet-950/50 to-violet-900/20 border-violet-800/30' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label}
                  className={`rounded-xl border p-3 bg-gradient-to-b ${bg} backdrop-blur-sm`}>
                  <Icon className={`w-3.5 h-3.5 ${color} mb-2 ${label === 'Likes' ? 'fill-current' : ''}`} />
                  <p className="text-base font-bold text-white leading-none">{value}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Engagement rate */}
            <div className="rounded-xl border border-gray-700/40 bg-gray-800/25 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-gray-300">Engagement Rate</span>
                </div>
                <span className={`text-sm font-bold ${engRate > 5 ? 'text-emerald-400' : 'text-gray-300'}`}>
                  {engRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 transition-all duration-700"
                  style={{ width: `${Math.min(engRate * 10, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                {engRate > 8
                  ? 'Excellent — top 10% of reels'
                  : engRate > 4
                    ? 'Good engagement · keep it up'
                    : views > 0
                      ? 'Keep posting to grow reach'
                      : 'No views yet · share your reel'}
              </p>
            </div>

            {/* Category tags */}
            {cats.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {cats.map((c) => (
                    <span key={c}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold
                        bg-gradient-to-r from-violet-950/70 to-indigo-950/70
                        border border-violet-700/30 text-violet-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta details */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Details</p>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <span className="text-xs text-gray-400">{fmtDuration(duration)} duration</span>
              </div>
              {current.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                  <span className="text-xs text-gray-400">Uploaded {timeAgo(current.createdAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-emerald-400 font-medium">Published</span>
              </div>
            </div>

            {/* ── Action buttons ── */}
            <div className="mt-auto space-y-2.5">
              {/* Boost Reel — glow CTA */}
              <button
                onClick={() => toast('Boost feature coming soon! 🚀', { icon: '🚀' })}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm
                  bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600
                  hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500
                  transition-all relative overflow-hidden group"
                style={{ boxShadow: '0 0 24px rgba(139,92,246,0.35), 0 4px 20px rgba(79,70,229,0.3)' }}
              >
                {/* shimmer sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                <Rocket className="w-4 h-4 shrink-0" />
                Boost Reel
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onEdit(current, currentIdx, filtered)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium
                    bg-gray-800/50 border border-gray-700/50 text-gray-300
                    hover:bg-gray-700/60 hover:text-white hover:border-gray-600 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || Boolean(current._galleryOrphan)}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium
                    bg-red-950/40 border border-red-900/40 text-red-400
                    hover:bg-red-900/50 hover:text-red-300 hover:border-red-700/50 transition-all
                    disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══ FILMSTRIP: reel thumbnails ══ */}
        {total > 1 && (
          <div className="border-t border-gray-800/60 bg-gray-950/90 px-4 py-3">
            <div className="reel-filmstrip flex gap-2 overflow-x-auto pb-0.5">
              {filtered.map((video, i) => {
                const vUrl   = getGalleryMediaUrl(video);
                const vThumb = cloudinaryVideoPosterUrl(vUrl);
                const isActive = i === currentIdx;
                return (
                  <button
                    key={video._id || i}
                    onClick={() => goTo(i)}
                    className={`relative shrink-0 w-10 h-[60px] rounded-lg overflow-hidden transition-all duration-200
                      ${isActive
                        ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-gray-950 scale-105'
                        : 'opacity-45 hover:opacity-70 hover:scale-105'}`}
                  >
                    {vThumb
                      ? <img src={vThumb} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Play className="w-3 h-3 text-gray-500" />
                        </div>
                    }
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
