import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

/* ── Auth helper ── */
const isLoggedIn = () => !!localStorage.getItem('customerToken');

/* ── Relative time (e.g. "2h ago") ── */
function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ── Count formatter (1200 → 1.2K) ── */
function fmtCount(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* ── CSS ── */
const CSS = `
  html, body { margin: 0; padding: 0; overflow: hidden; }

  .reels-page { background: #000; }

  /* ── Mobile: fullscreen ── */
  @media (max-width: 767px) {
    .reels-page { position: fixed; inset: 0; z-index: 60; }
    .reels-desktop-wrap { display: contents; }
    .reels-col { position: relative; width: 100%; height: 100dvh; }
    .reels-feed { height: 100dvh; }
    .reel-item { height: 100dvh; }
  }

  /* ── Tablet + Desktop ── */
  @media (min-width: 768px) {
    html, body { overflow: auto; }
    .reels-page { position: static; }
    .reels-desktop-wrap {
      display: flex;
      gap: 28px;
      max-width: 1060px;
      margin: 0 auto;
      padding: 20px 20px 40px;
      align-items: flex-start;
      box-sizing: border-box;
    }
    .reels-col {
      position: relative;
      width: 400px;
      flex-shrink: 0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 48px rgba(0,0,0,0.7);
    }
    .reels-feed { height: calc(100vh - 108px); min-height: 500px; }
    .reel-item { height: calc(100vh - 108px); min-height: 500px; }
    .reels-sidebar {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 4px;
    }
  }

  .reels-feed {
    position: relative;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    background: #000;
  }
  .reels-feed::-webkit-scrollbar { display: none; }

  .reel-item {
    position: relative;
    overflow: hidden;
    background: #111;
    flex-shrink: 0;
    scroll-snap-align: start;
  }

  .reel-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .reel-gradient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.88) 0%,
      rgba(0,0,0,0.30) 38%,
      transparent 62%
    );
  }

  /* ── Progress bar ── */
  .reel-progress-wrap {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: rgba(255,255,255,0.15);
    z-index: 25;
  }
  .reel-progress-bar {
    height: 100%;
    background: #fff;
    transition: width 0.25s linear;
  }

  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes heartPop   { 0%,100% { transform: scale(1); } 45% { transform: scale(1.45); } }
  @keyframes heartBurst { 0% { opacity:1; transform:scale(0.5); } 60% { opacity:1; transform:scale(1.6); } 100% { opacity:0; transform:scale(2); } }
  @keyframes muteAnim   { 0%,100% { opacity:0; transform:scale(0.7); } 20%,70% { opacity:1; transform:scale(1); } }
  @keyframes slideUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }

  .heart-pop   { animation: heartPop 0.32s cubic-bezier(.36,.07,.19,.97); }
  .heart-burst { animation: heartBurst 0.65s ease forwards; pointer-events: none; }
  .mute-toast  { animation: muteAnim 1.1s ease forwards; pointer-events: none; }
  .reel-info-in{ animation: slideUp 0.35s ease both; }
`;

/* ── SVG Icons ── */
const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width={28} height={28}
    fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "#fff"} strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const CommentIcon = () => (
  <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#fff" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="#fff" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#4ade80" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const MutedIcon = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="#fff">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);
const UnmutedIcon = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="#fff">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);
const PinIcon = () => (
  <svg viewBox="0 0 24 24" width={10} height={10} fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

/* ── Action button ── */
const ActionBtn = ({ onClick, children, topLabel, bottomLabel, color }) => (
  <button onClick={onClick} type="button"
    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 0 }}>
    <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
    <span style={{ color: color || '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 5px rgba(0,0,0,0.9)', letterSpacing: 0.2, lineHeight: 1.1, textAlign: 'center', maxWidth: 52 }}>
      {topLabel}
    </span>
    {bottomLabel && (
      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.9)', marginTop: -2 }}>
        {bottomLabel}
      </span>
    )}
  </button>
);

/* ── Single reel ── */
function ReelItem({ reel, muted, showMute, onMuteToggle, onComment, onShare, copied, onRegisterRef, onAuthRequired }) {
  const videoRef   = useRef(null);
  const [liked, setLiked]       = useState(reel.liked || false);
  const [likeCount, setLikeCount] = useState(reel.likeCount || 0);
  const [viewCount, setViewCount] = useState(reel.viewCount || 0);
  const [progress, setProgress]  = useState(0);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTapRef   = useRef(0);
  const viewedRef    = useRef(false);
  const viewTimerRef = useRef(null);

  /* set muted on mount and on change */
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  /* expose ref to parent */
  useEffect(() => {
    const v = videoRef.current;
    if (v) onRegisterRef(v, reel._id);
    return () => onRegisterRef(null, reel._id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* progress bar */
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  /* view tracking: record after 3 continuous seconds of play */
  const startViewTimer = useCallback(() => {
    if (viewedRef.current) return;
    viewTimerRef.current = setTimeout(async () => {
      if (viewedRef.current) return;
      viewedRef.current = true;
      try {
        const r = await API.post('/public/reels/view', { videoUrl: reel.videoUrl, salonId: reel.salon._id, fingerprint: 'anon' });
        setViewCount(r.data.viewCount || viewCount + 1);
      } catch { setViewCount(c => c + 1); }
    }, 3000);
  }, [reel.videoUrl, reel.salon._id, viewCount]);

  const stopViewTimer = useCallback(() => {
    clearTimeout(viewTimerRef.current);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay  = () => startViewTimer();
    const onPause = () => stopViewTimer();
    v.addEventListener('play',  onPlay);
    v.addEventListener('pause', onPause);
    return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); stopViewTimer(); };
  }, [startViewTimer, stopViewTimer]);

  /* like — requires auth */
  const handleLike = useCallback(async () => {
    if (!isLoggedIn()) { onAuthRequired(); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => Math.max(0, c + (wasLiked ? -1 : 1)));
    try {
      const r = await API.post('/public/reels/like', { videoUrl: reel.videoUrl, salonId: reel.salon._id });
      setLiked(r.data.liked);
      setLikeCount(r.data.count ?? (wasLiked ? likeCount - 1 : likeCount + 1));
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => Math.max(0, c + (wasLiked ? 1 : -1)));
    }
  }, [liked, likeCount, reel.videoUrl, reel.salon._id, onAuthRequired]);

  /* double-tap to like */
  const handleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (!liked) { handleLike(); }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 700);
    } else {
      onMuteToggle();
    }
    lastTapRef.current = now;
  }, [liked, handleLike, onMuteToggle]);

  /* comment — requires auth */
  const handleComment = useCallback(() => {
    if (!isLoggedIn()) { onAuthRequired(); return; }
    onComment(reel);
  }, [reel, onComment, onAuthRequired]);

  const initial = reel.salon.name?.[0]?.toUpperCase() || 'S';

  return (
    <div className="reel-item">
      {/* Progress bar */}
      <div className="reel-progress-wrap">
        <div className="reel-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="reel-video"
        loop
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onClick={handleTap}
      />
      <div className="reel-gradient" />

      {/* Double-tap heart burst */}
      {doubleTapHeart && (
        <div className="heart-burst" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30, pointerEvents: 'none' }}>
          <svg viewBox="0 0 24 24" width={100} height={100} fill="#ef4444">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
      )}

      {/* Mute toast */}
      {showMute && (
        <div className="mute-toast" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 40, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 15 }}>
          {muted ? <MutedIcon /> : <UnmutedIcon />}
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{muted ? 'Muted' : 'Sound On'}</span>
        </div>
      )}

      {/* Bottom-left: salon info + view count */}
      <div className="reel-info-in" style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)', left: 14, right: 76, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.9)', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {reel.salon.logo
              ? <img src={reel.salon.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{initial}</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reel.salon.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0 }}>📍 {reel.salon.city}</p>
          </div>
        </div>

        {/* Category chips */}
        {reel.categories?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
            {reel.categories.map(cat => (
              <span key={cat} style={{ background: 'rgba(99,102,241,0.7)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '3px 10px', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* View count + rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {viewCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <EyeIcon />
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600 }}>{fmtCount(viewCount)} views</span>
            </div>
          )}
          {reel.salon.averageRating > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600 }}>⭐ {reel.salon.averageRating.toFixed(1)}</span>
          )}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/salon/${reel.salon._id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 22, padding: '9px 20px', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 800, boxShadow: '0 4px 20px rgba(99,102,241,0.55)' }}>
            Book Now
          </Link>
          <Link to={`/salon/${reel.salon._id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 22, padding: '8px 14px', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            View Salon →
          </Link>
        </div>
      </div>

      {/* Right action buttons */}
      <div style={{ position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)', right: 10, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <ActionBtn
          onClick={handleLike}
          topLabel={fmtCount(likeCount)}
          bottomLabel="Like"
          color={liked ? '#ef4444' : '#fff'}
        >
          <div className={liked ? 'heart-pop' : ''}><HeartIcon filled={liked} /></div>
        </ActionBtn>

        <ActionBtn onClick={handleComment} topLabel={fmtCount(reel.commentCount || 0)} bottomLabel="Comment">
          <CommentIcon />
        </ActionBtn>

        <ActionBtn onClick={() => onShare(reel)} topLabel={copied === reel._id ? 'Copied!' : 'Share'} color={copied === reel._id ? '#4ade80' : '#fff'}>
          {copied === reel._id ? <CheckIcon /> : <ShareIcon />}
        </ActionBtn>

        {/* Salon avatar */}
        <Link to={`/salon/${reel.salon._id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2.5px solid #fff', padding: 2 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {reel.salon.logo
                ? <img src={reel.salon.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{initial}</span>}
            </div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 600, maxWidth: 54, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {reel.salon.name.split(' ')[0]}
          </span>
        </Link>
      </div>

      {/* Safe area bottom spacer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
}

/* ── Main Reels page ── */
export default function Reels() {
  const navigate = useNavigate();
  const [reels,    setReels]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [muted,    setMuted]   = useState(true);
  const [showMute, setShowMute] = useState(false);
  const [copied,   setCopied]  = useState(null);

  /* Feed mode + gender filter */
  const [mode,   setMode]   = useState('nearest'); // 'nearest' | 'all'
  const [gender, setGender] = useState('all');      // 'all' | 'male' | 'female'
  const [coords, setCoords] = useState(null);       // { lat, lng } or null
  const [locLabel, setLocLabel] = useState('Nearby');

  /* Auth prompt */
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  /* Comments */
  const [commentReel, setCommentReel]         = useState(null);
  const [comments,    setComments]            = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText,  setCommentText]        = useState("");
  const [posting,      setPosting]            = useState(false);

  const videoRefs   = useRef({});
  const observerRef = useRef(null);
  const muteTimer   = useRef(null);

  /* ── Fetch reels ── */
  const fetchReels = useCallback(async (currentMode, currentGender, currentCoords) => {
    setLoading(true);
    try {
      let qs = `?limit=30`;
      if (currentGender && currentGender !== 'all') qs += `&gender=${currentGender}`;
      if (currentMode === 'all') {
        qs += `&mode=all`;
      } else if (currentCoords) {
        qs += `&latitude=${currentCoords.lat}&longitude=${currentCoords.lng}`;
      }
      const res = await API.get(`/public/reels${qs}`);
      setReels(res.data.data || []);
    } catch { setReels([]); }
    finally { setLoading(false); }
  }, []);

  /* ── On mount: get location once, then load ── */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => {
          const c = { lat: p.coords.latitude, lng: p.coords.longitude };
          setCoords(c);
          setLocLabel('Nearby You');
          fetchReels('nearest', 'all', c);
        },
        () => {
          setLocLabel('All Salons');
          setMode('all');
          fetchReels('all', 'all', null);
        },
        { timeout: 6000 }
      );
    } else {
      setLocLabel('All Salons');
      setMode('all');
      fetchReels('all', 'all', null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Re-fetch when mode or gender changes (after initial load) ── */
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    setLocLabel(mode === 'nearest' && coords ? 'Nearby You' : 'All Salons');
    fetchReels(mode, gender, coords);
  }, [mode, gender]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── IntersectionObserver: autoplay/pause ── */
  useEffect(() => {
    if (!reels.length) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          v.muted = muted;
          v.play().catch(() => {});
        } else {
          v.pause();
          v.currentTime = 0;
        }
      });
    }, { threshold: 0.5 });
    Object.values(videoRefs.current).forEach(v => { if (v) observerRef.current.observe(v); });
    const firstKey = reels[0]?._id;
    if (firstKey && videoRefs.current[firstKey]) {
      videoRefs.current[firstKey].muted = muted;
      videoRefs.current[firstKey].play().catch(() => {});
    }
    return () => observerRef.current?.disconnect();
  }, [reels]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync muted state ── */
  useEffect(() => {
    Object.values(videoRefs.current).forEach(v => { if (v) v.muted = muted; });
  }, [muted]);

  const handleRegisterRef = useCallback((el, id) => {
    if (el) { el.muted = true; videoRefs.current[id] = el; if (observerRef.current) observerRef.current.observe(el); }
    else { if (observerRef.current && videoRefs.current[id]) observerRef.current.unobserve(videoRefs.current[id]); delete videoRefs.current[id]; }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(m => !m);
    setShowMute(true);
    clearTimeout(muteTimer.current);
    muteTimer.current = setTimeout(() => setShowMute(false), 1300);
  }, []);

  const handleShare = useCallback(async (reel) => {
    const url = `${window.location.origin}/salon/${reel.salon._id}`;
    if (navigator.share) {
      try { await navigator.share({ title: reel.salon.name, text: `Book at ${reel.salon.name}!`, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(reel._id);
    setTimeout(() => setCopied(null), 2200);
  }, []);

  const handleAuthRequired = useCallback(() => {
    setShowLoginPrompt(true);
  }, []);

  /* ── Comments ── */
  useEffect(() => {
    if (!commentReel) { setComments([]); return; }
    setCommentsLoading(true);
    API.get(`/public/reels/comments?videoUrl=${encodeURIComponent(commentReel.videoUrl)}`)
      .then(r => setComments(r.data.data || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [commentReel]);

  const postComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || !commentReel || posting) return;
    setPosting(true);
    try {
      const r = await API.post('/public/reels/comments', {
        videoUrl: commentReel.videoUrl, salonId: commentReel.salon._id, text,
      });
      setComments(prev => [r.data.data, ...prev]);
      setCommentText("");
    } catch { /* silent */ }
    finally { setPosting(false); }
  }, [commentText, commentReel, posting]);

  /* ── Loading screen ── */
  if (loading) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <style>{CSS}</style>
      <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Loading reels…</p>
    </div>
  );

  /* ── Empty screen ── */
  if (!reels.length) return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <style>{CSS}</style>
      <div style={{ fontSize: 52 }}>🎬</div>
      <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>No Reels Yet</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', maxWidth: 260, margin: 0 }}>No salon videos found. Try "All" mode or a different gender filter.</p>
      <button onClick={() => navigate('/')} style={{ marginTop: 8, padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Explore Salons
      </button>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="reels-page">
        <div className="reels-desktop-wrap">

          {/* ── Reel column ── */}
          <div className="reels-col">
            {/* Top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'none', paddingTop: 'max(10px, env(safe-area-inset-top))' }}>
              {/* Row 1: back + title + mute */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px 8px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }}>
                <button onClick={() => navigate(-1)} type="button" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', pointerEvents: 'all', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  <ChevronLeft />
                </button>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>Reels</p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                    <PinIcon /> {locLabel}
                  </p>
                </div>
                <button onClick={toggleMute} type="button" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', pointerEvents: 'all', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  {muted ? <MutedIcon /> : <UnmutedIcon />}
                </button>
              </div>

              {/* Row 2: mode toggle + gender filter */}
              <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 6, pointerEvents: 'all' }}>
                  {['nearest', 'all'].map(m => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: mode === m ? '#fff' : 'rgba(255,255,255,0.15)',
                        color: mode === m ? '#000' : '#fff',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        transition: 'all 0.18s ease' }}>
                      {m === 'nearest' ? '📍 Nearest' : '🌐 All'}
                    </button>
                  ))}
                </div>

                {/* Gender filter */}
                <div style={{ display: 'flex', gap: 5, pointerEvents: 'all' }}>
                  {[['all', 'All'], ['male', 'Men'], ['female', 'Women']].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setGender(val)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 16, border: `1.5px solid ${gender === val ? '#a78bfa' : 'rgba(255,255,255,0.2)'}`, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        background: gender === val ? 'rgba(139,92,246,0.55)' : 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                        transition: 'all 0.18s ease' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Scrollable feed ── */}
            <div className="reels-feed">
              {reels.map(reel => (
                <ReelItem
                  key={reel._id}
                  reel={reel}
                  muted={muted}
                  showMute={showMute}
                  onMuteToggle={toggleMute}
                  onComment={setCommentReel}
                  onShare={handleShare}
                  copied={copied}
                  onRegisterRef={handleRegisterRef}
                  onAuthRequired={handleAuthRequired}
                />
              ))}
            </div>
          </div>

          {/* ── Desktop sidebar ── */}
          <div className="reels-sidebar">
            <div style={{ background: '#111', borderRadius: 16, padding: '18px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, margin: '0 0 4px' }}>Reels</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 8px' }}>
                {mode === 'nearest' && coords ? '📍 Salons within 20km' : '🌐 Most liked globally'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>Scroll · Double-tap to like · Tap to mute</p>
            </div>
            {reels.slice(0, 8).map(r => (
              <Link key={r._id} to={`/salon/${r.salon._id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '10px 14px', background: '#111', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {r.salon.logo
                    ? <img src={r.salon.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{r.salon.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.salon.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>📍 {r.salon.city}</p>
                    {r.viewCount > 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>👁 {fmtCount(r.viewCount)}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* ── Login prompt ── */}
      {showLoginPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => setShowLoginPrompt(false)} />
          <div style={{ position: 'relative', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, textAlign: 'center' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔐</div>
            <p style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>Login Required</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.5 }}>You need to be logged in to like or comment on reels.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/login" state={{ from: '/reels' }}
                style={{ display: 'block', padding: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14 }}
                onClick={() => setShowLoginPrompt(false)}>
                Log In
              </Link>
              <Link to="/register"
                style={{ display: 'block', padding: '11px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14 }}
                onClick={() => setShowLoginPrompt(false)}>
                Create Account
              </Link>
              <button type="button" onClick={() => setShowLoginPrompt(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comment sheet ── */}
      {commentReel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setCommentReel(null)} />
          <div style={{ position: 'relative', background: '#1a1a1a', borderRadius: '24px 24px 0 0', padding: '0 0 max(24px, env(safe-area-inset-bottom))', zIndex: 1, width: '100%', maxWidth: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, margin: '0 auto 14px' }} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: '0 0 14px' }}>Comments · {commentReel.salon.name}</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', marginBottom: 4 }}>
              {commentsLoading ? (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading…</p>
              ) : comments.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No comments yet. Be the first!</p>
              ) : comments.map(c => (
                <div key={c._id} style={{ marginBottom: 18 }}>
                  {/* User comment */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{c.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, margin: 0 }}>{c.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>{timeAgo(c.createdAt)}</p>
                      </div>
                      <p style={{ color: '#fff', fontSize: 13, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>{c.text}</p>
                    </div>
                  </div>
                  {/* Owner replies */}
                  {c.replies?.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginTop: 8, marginLeft: 44, paddingLeft: 10, borderLeft: '2px solid rgba(139,92,246,0.45)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700 }}>{r.ownerName}</span>
                          <span style={{ background: 'rgba(139,92,246,0.3)', color: '#c4b5fd', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>Owner</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{timeAgo(r.createdAt)}</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                  placeholder="Add a comment…"
                  autoFocus
                  style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '11px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                />
                <button
                  onClick={postComment}
                  disabled={posting || !commentText.trim()}
                  type="button"
                  style={{ background: (posting || !commentText.trim()) ? 'rgba(99,102,241,0.35)' : '#6366f1', border: 'none', borderRadius: 14, padding: '0 20px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                >
                  {posting ? '…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
