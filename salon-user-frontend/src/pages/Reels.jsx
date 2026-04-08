import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { salonPath } from "../utils/formatters";

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const isLoggedIn = () => !!localStorage.getItem('customerToken');

function cloudinaryThumb(url) {
  if (!url || !url.includes('/video/upload/')) return '';
  return url
    .replace('/video/upload/', '/video/upload/w_720,h_1280,c_fill,q_auto,f_jpg/')
    .replace(/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i, '.jpg');
}

function getSessionId() {
  let id = localStorage.getItem('reelSessionId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('reelSessionId', id);
  }
  return id;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtCount(n) {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/* ─────────────────────────────────────────────────────────────
   Global CSS
───────────────────────────────────────────────────────────── */
const CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  /* ── mobile: true fullscreen ── */
  @media (max-width: 767px) {
    html, body { margin: 0; padding: 0; overflow: hidden; }
    .reels-page {
      position: fixed; inset: 0; z-index: 60;
      background: #000;
    }
    .reels-col {
      position: relative;
      width: 100%;
      height: 100dvh;
    }
    /* FIX: feed and item must match col height exactly */
    .reels-feed { height: 100dvh; }
    .reel-item  { height: 100dvh; }
  }

  /* ── desktop: cinema-style centered column ── */
  @media (min-width: 768px) {
    html, body { margin: 0; padding: 0; overflow: hidden; }
    .reels-page {
      position: fixed; inset: 0;
      background: #050505;
      background-image:
        radial-gradient(ellipse 60% 50% at 30% 20%, rgba(99,102,241,0.07) 0%, transparent 70%),
        radial-gradient(ellipse 60% 50% at 70% 80%, rgba(139,92,246,0.05) 0%, transparent 70%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .reels-col {
      position: relative;
      width: 390px;
      /* FIX: use a single CSS variable for height so feed/item/strip all agree */
      --reel-h: min(calc(100vh - 80px), 820px);
      height: var(--reel-h);
      min-height: 500px;
      border-radius: 30px;
      overflow: hidden;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.07),
        0 32px 96px rgba(0,0,0,0.95),
        0 0 80px rgba(99,102,241,0.06);
    }
    .reels-feed { height: var(--reel-h, calc(100vh - 80px)); min-height: 500px; }
    .reel-item  { height: var(--reel-h, calc(100vh - 80px)); min-height: 500px; max-height: 820px; }
  }

  /* ── feed container ── */
  .reels-feed {
    position: relative;
    overflow-y: auto;
    background: #000;
    /* FIX: allow touch to propagate correctly */
    touch-action: pan-y;
  }

  /* ── strip ── */
  .reels-strip {
    display: flex;
    flex-direction: column;
    will-change: transform;
    /* FIX: strip must NOT have overflow:hidden and must be tall enough */
  }

  /* ── individual reel ── */
  .reel-item {
    position: relative;
    overflow: hidden;
    background: #080808;
    /* FIX: flex-shrink:0 + width:100% ensures items don't collapse */
    flex-shrink: 0;
    width: 100%;
    touch-action: pan-y;
  }

  /* ── video ── */
  .reel-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* ── cinematic gradient overlay ── */
  .reel-gradient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to bottom,
        rgba(0,0,0,0.60) 0%,
        rgba(0,0,0,0.10) 18%,
        transparent 36%,
        transparent 48%,
        rgba(0,0,0,0.55) 72%,
        rgba(0,0,0,0.93) 100%
      );
  }

  /* ── progress bar ── */
  .reel-progress-wrap {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: rgba(255,255,255,0.10);
    z-index: 26;
  }
  .reel-progress-bar {
    height: 100%;
    background: linear-gradient(to right, #6366f1, #a78bfa, #f0abfc);
    border-radius: 0 3px 3px 0;
    box-shadow: 0 0 10px rgba(167,139,250,0.75);
    transition: width 0.2s linear;
    will-change: width;
  }

  /* ── keyframes ── */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes heartPop {
    0%, 100% { transform: scale(1); }
    40%       { transform: scale(1.55); }
  }
  @keyframes heartBurst {
    0%   { opacity: 1; transform: scale(0.25); }
    45%  { opacity: 1; transform: scale(1.75); }
    100% { opacity: 0; transform: scale(2.4);  }
  }
  @keyframes muteAnim {
    0%, 100% { opacity: 0; transform: scale(0.70); }
    18%, 72%  { opacity: 1; transform: scale(1);    }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.88) translateY(16px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes glowLike {
    0%, 100% { box-shadow: 0 0 14px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.12); }
    50%       { box-shadow: 0 0 32px rgba(239,68,68,0.80), inset 0 1px 0 rgba(255,255,255,0.12); }
  }
  @keyframes dotPulse {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
    40%          { transform: scale(1);   opacity: 1;   }
  }

  @media (min-width: 768px) {
    .reels-desktop-nav { display: flex !important; }
  }

  .heart-pop     { animation: heartPop   0.35s cubic-bezier(.36,.07,.19,.97); }
  .heart-burst   { animation: heartBurst 0.72s ease forwards; pointer-events: none; }
  .mute-toast    { animation: muteAnim   1.25s ease forwards; pointer-events: none; }
  .reel-info-in  { animation: slideUp    0.42s cubic-bezier(0.22,1,0.36,1) both; }
  .fade-in       { animation: fadeIn     0.30s ease both; }
  .scale-in      { animation: scaleIn    0.42s cubic-bezier(0.22,1,0.36,1) both; }
  .like-glow     { animation: glowLike   1.6s ease infinite; }

  .btn-action {
    background: none; border: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-action-icon {
    width: 54px; height: 54px; border-radius: 50%;
    background: rgba(10,10,10,0.55);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.14);
    display: flex; align-items: center; justify-content: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 16px rgba(0,0,0,0.4);
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }
  .btn-action:active .btn-action-icon { transform: scale(0.90); }
  .btn-action-label {
    color: rgba(255,255,255,0.92);
    font-size: 11px; font-weight: 800;
    text-shadow: 0 1px 6px rgba(0,0,0,0.9);
    letter-spacing: 0.3px; line-height: 1.1;
    text-align: center; max-width: 58px;
  }
  .btn-action-sub {
    color: rgba(255,255,255,0.40);
    font-size: 9px; font-weight: 600;
    margin-top: -3px;
  }

  .comment-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    padding: 12px 16px;
    color: #fff;
    font-size: 13px;
    outline: none;
    font-family: inherit;
    transition: border-color 0.2s;
    resize: none;
  }
  .comment-input:focus { border-color: rgba(139,92,246,0.5); }
  .comment-input::placeholder { color: rgba(255,255,255,0.28); }

  /* FIX: allow touch-action pan on interactive elements inside the column,
     but NOT on the feed itself (we handle all scroll ourselves) */
  .reels-col button, .reels-col a { touch-action: manipulation; }
`;

/* ─────────────────────────────────────────────────────────────
   SVG Icons
───────────────────────────────────────────────────────────── */
const IcoBack = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 19l-7-7 7-7" />
  </svg>
);
const IcoHeart = ({ filled }) => (
  <svg viewBox="0 0 24 24" width={26} height={26}
    fill={filled ? '#ef4444' : 'none'}
    stroke={filled ? '#ef4444' : '#fff'} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const IcoComment = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const IcoShare = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);
const IcoEye = () => (
  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#4ade80" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);
const IcoMuted = () => (
  <svg viewBox="0 0 24 24" width={19} height={19} fill="#fff">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);
const IcoUnmuted = () => (
  <svg viewBox="0 0 24 24" width={19} height={19} fill="#fff">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);
const IcoPin = () => (
  <svg viewBox="0 0 24 24" width={9} height={9} fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);
const IcoScissors = () => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Action button (right rail)
───────────────────────────────────────────────────────────── */
function ActionBtn({ onClick, children, label, subLabel, color, liked }) {
  return (
    <button onClick={onClick} type="button" className="btn-action">
      <div className={`btn-action-icon${liked ? ' like-glow' : ''}`}
        style={liked ? { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)' } : {}}>
        {children}
      </div>
      <span className="btn-action-label" style={color ? { color } : {}}>{label}</span>
      {subLabel && <span className="btn-action-sub">{subLabel}</span>}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Salon avatar
───────────────────────────────────────────────────────────── */
function SalonAvatar({ logo, initial, size = 44, ringColor = '#6366f1', fontSize = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${ringColor}, #a78bfa, #ec4899)`,
      padding: 2.5,
      boxShadow: `0 0 18px rgba(99,102,241,0.45)`,
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(0,0,0,0.6)',
      }}>
        {logo
          ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#fff', fontWeight: 900, fontSize, lineHeight: 1 }}>{initial}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Single Reel Item
───────────────────────────────────────────────────────────── */
function ReelItem({ reel, muted, showMute, onMuteToggle, onComment, onShare, copied, onRegisterRef, onAuthRequired }) {
  const videoRef = useRef(null);

  const [liked,     setLiked]     = useState(reel.liked || false);
  const [likeCount, setLikeCount] = useState(reel.likeCount || 0);
  const [viewCount, setViewCount] = useState(reel.viewCount || 0);
  const [progress,  setProgress]  = useState(0);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);

  const lastTapRef    = useRef(0);
  const viewedRef     = useRef(false);
  const viewTimerRef  = useRef(null);
  const watchStartRef = useRef(null);
  const totalWatchRef = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) onRegisterRef(v, reel._id);
    return () => onRegisterRef(null, reel._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  const accumulateWatch = useCallback(() => {
    if (watchStartRef.current !== null) {
      totalWatchRef.current += (Date.now() - watchStartRef.current) / 1000;
      watchStartRef.current = null;
    }
  }, []);

  const startViewTimer = useCallback(() => {
    if (viewedRef.current) return;
    watchStartRef.current = Date.now();
    viewTimerRef.current = setTimeout(async () => {
      if (viewedRef.current) return;
      viewedRef.current = true;
      accumulateWatch();
      const v = videoRef.current;
      const videoDuration = v?.duration || 0;
      const watchTime     = totalWatchRef.current;
      try {
        const r = await API.post('/public/reels/view', {
          videoUrl:      reel.videoUrl,
          salonId:       reel.salon._id,
          fingerprint:   getSessionId(),
          categories:    reel.categories || [],
          watchTime,
          videoDuration,
        });
        setViewCount(r.data.viewCount || viewCount + 1);
      } catch { setViewCount(c => c + 1); }
    }, 3000);
  }, [reel.videoUrl, reel.salon._id, reel.categories, viewCount, accumulateWatch]);

  const stopViewTimer = useCallback(() => {
    clearTimeout(viewTimerRef.current);
    accumulateWatch();
    if (!viewedRef.current && totalWatchRef.current > 0.3) {
      const v = videoRef.current;
      API.post('/public/reels/interaction', {
        videoUrl:      reel.videoUrl,
        salonId:       reel.salon._id,
        fingerprint:   getSessionId(),
        categories:    reel.categories || [],
        action:        'skip',
        watchTime:     totalWatchRef.current,
        videoDuration: v?.duration || 0,
      }).catch(() => {});
    }
  }, [reel.videoUrl, reel.salon._id, reel.categories, accumulateWatch]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay  = () => startViewTimer();
    const onPause = () => stopViewTimer();
    v.addEventListener('play',  onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('play',  onPlay);
      v.removeEventListener('pause', onPause);
      stopViewTimer();
    };
  }, [startViewTimer, stopViewTimer]);

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

  const handleTap = useCallback((e) => {
    // Don't intercept taps on interactive children
    if (e.target.closest('button') || e.target.closest('a')) return;
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (!liked) handleLike();
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 750);
    } else {
      onMuteToggle();
    }
    lastTapRef.current = now;
  }, [liked, handleLike, onMuteToggle]);

  const handleComment = useCallback(() => {
    if (!isLoggedIn()) { onAuthRequired(); return; }
    onComment(reel);
  }, [reel, onComment, onAuthRequired]);

  const initial = reel.salon.name?.[0]?.toUpperCase() || 'S';
  const safeBottom = 'env(safe-area-inset-bottom, 0px)';

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
        poster={cloudinaryThumb(reel.videoUrl)}
        className="reel-video"
        loop playsInline preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onClick={handleTap}
      />

      {/* Gradient overlay */}
      <div className="reel-gradient" />

      {/* Double-tap heart burst */}
      {doubleTapHeart && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 30, pointerEvents: 'none',
        }}>
          <div className="heart-burst">
            <svg viewBox="0 0 24 24" width={120} height={120} fill="#ef4444"
              style={{ filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.9)) drop-shadow(0 0 48px rgba(239,68,68,0.5))' }}>
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mute toast */}
      {showMute && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 15,
        }}>
          <div className="mute-toast" style={{
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 44, padding: '11px 24px',
            display: 'flex', alignItems: 'center', gap: 9,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {muted ? <IcoMuted /> : <IcoUnmuted />}
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>
              {muted ? 'Muted' : 'Sound On'}
            </span>
          </div>
        </div>
      )}

      {/* Right rail: action buttons */}
      <div style={{
        position: 'absolute',
        bottom: `calc(${safeBottom} + 108px)`,
        right: 14, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
      }}>
        <ActionBtn
          onClick={handleLike}
          label={fmtCount(likeCount)}
          subLabel="Like"
          color={liked ? '#ef4444' : undefined}
          liked={liked}
        >
          <div className={liked ? 'heart-pop' : ''}>
            <IcoHeart filled={liked} />
          </div>
        </ActionBtn>

        <ActionBtn onClick={handleComment} label={fmtCount(reel.commentCount || 0)} subLabel="Comment">
          <IcoComment />
        </ActionBtn>

        <ActionBtn
          onClick={() => onShare(reel)}
          label={copied === reel._id ? 'Copied!' : 'Share'}
          color={copied === reel._id ? '#4ade80' : undefined}
        >
          {copied === reel._id ? <IcoCheck /> : <IcoShare />}
        </ActionBtn>

        <Link to={salonPath(reel.salon)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
          <SalonAvatar logo={reel.salon.logo} initial={initial} size={50} fontSize={15} />
          <span style={{
            color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: 700,
            maxWidth: 58, textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textShadow: '0 1px 5px rgba(0,0,0,0.9)',
          }}>
            {reel.salon.name.split(' ')[0]}
          </span>
        </Link>
      </div>

      {/* Bottom info overlay */}
      <div className="reel-info-in" style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        zIndex: 10,
        padding: `20px 16px calc(${safeBottom} + 20px)`,
        paddingRight: 82,
      }}>

        {/* Salon row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <SalonAvatar logo={reel.salon.logo} initial={initial} size={44} fontSize={16} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: '#fff', fontWeight: 900, fontSize: 14.5, margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.95)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.1px',
            }}>
              {reel.salon.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
              <IcoPin />
              <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: 500 }}>
                {reel.salon.city}
              </span>
              {reel.salon.averageRating > 0 && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>•</span>
                  <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800 }}>
                    ★ {reel.salon.averageRating.toFixed(1)}
                  </span>
                </>
              )}
              {viewCount > 0 && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>•</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <IcoEye />
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600 }}>
                      {fmtCount(viewCount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Category chips */}
        {reel.categories?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
            {reel.categories.slice(0, 4).map(cat => (
              <span key={cat} style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.55))',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(167,139,250,0.28)',
                borderRadius: 20, padding: '4px 11px',
                color: '#ddd6fe', fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
              }}>
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Book Now CTA */}
        <Link to={salonPath(reel.salon)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'linear-gradient(135deg, #5b5ef7 0%, #7c3aed 50%, #9333ea 100%)',
          backgroundSize: '200% auto',
          borderRadius: 18, padding: '13px 20px',
          color: '#fff', textDecoration: 'none',
          fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
          boxShadow: '0 6px 28px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
          border: '1px solid rgba(139,92,246,0.45)',
          transition: 'opacity 0.15s ease',
        }}>
          <IcoScissors />
          Book Appointment
        </Link>
      </div>

      {/* safe-area spacer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Loading dots
───────────────────────────────────────────────────────────── */
function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#a78bfa)',
          animation: `dotPulse 1.2s ease ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Reels page
───────────────────────────────────────────────────────────── */
export default function Reels() {
  const navigate = useNavigate();
  const [reels,    setReels]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [muted,    setMuted]   = useState(true);
  const [showMute, setShowMute] = useState(false);
  const [copied,   setCopied]  = useState(null);

  const [mode,     setMode]     = useState('nearest');
  const [gender,   setGender]   = useState('all');
  const [coords,   setCoords]   = useState(null);
  const [locLabel, setLocLabel] = useState('Nearby');

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const [commentReel,      setCommentReel]      = useState(null);
  const [comments,         setComments]         = useState([]);
  const [commentsLoading,  setCommentsLoading]  = useState(false);
  const [commentText,      setCommentText]      = useState('');
  const [posting,          setPosting]          = useState(false);

  const videoRefs   = useRef({});
  const muteTimer   = useRef(null);
  const feedRef     = useRef(null);
  const stripRef    = useRef(null);
  const colRef      = useRef(null);
  const pageRef     = useRef(null);
  const currentIdx  = useRef(0);
  const scrolling   = useRef(false);
  const mutedRef    = useRef(muted);
  const reelsRef    = useRef([]);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  // FIX: track if a touch is a swipe vs tap so we don't fire mute on swipe
  const isSwiping   = useRef(false);

  /* ── FIX: get the actual item height from the feed element ── */
  const getItemHeight = useCallback(() => {
    return feedRef.current?.clientHeight || window.innerHeight;
  }, []);

  /* ── Apply transform + play current video ── */
  const scrollToIdx = useCallback((idx, total, animated = true) => {
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(idx, total - 1));
    currentIdx.current = clamped;
    const strip = stripRef.current;
    if (!strip) return;

    const itemH = getItemHeight();

    strip.style.transition = animated
      ? 'transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none';
    strip.style.transform = `translateY(-${clamped * itemH}px)`;

    // Play current, pause + reset others
    const currentId = reelsRef.current[clamped]?._id;
    Object.entries(videoRefs.current).forEach(([id, v]) => {
      if (!v) return;
      if (id === currentId) { v.muted = mutedRef.current; v.play().catch(() => {}); }
      else                  { v.pause(); v.currentTime = 0; }
    });
  }, [getItemHeight]);

  /* ── Keep reelsRef in sync ── */
  useEffect(() => { reelsRef.current = reels; }, [reels]);

  /* ── Wheel — desktop ── */
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let t = null;
    const onWheel = (e) => {
      e.preventDefault();
      if (scrolling.current) return;
      scrolling.current = true;
      clearTimeout(t);
      scrollToIdx(currentIdx.current + (e.deltaY > 0 ? 1 : -1), reelsRef.current.length);
      // FIX: reduced cooldown from 450ms → 300ms for snappier desktop scroll
      t = setTimeout(() => { scrolling.current = false; }, 300);
    };
    page.addEventListener('wheel', onWheel, { passive: false });
    return () => { page.removeEventListener('wheel', onWheel); clearTimeout(t); };
  }, [scrollToIdx]);

  /* ── Touch — mobile swipe ── */
  useEffect(() => {
    const col  = feedRef.current;
    const feed = feedRef.current;
    if (!col || !feed) return;

    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
      isSwiping.current   = false;
      if (stripRef.current) stripRef.current.style.transition = 'none';
    };

    const onTouchMove = (e) => {
      const strip = stripRef.current;
      if (!strip) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      touchDeltaY.current = dy;

      // FIX: mark as swipe early so tap handler ignores it
      if (Math.abs(dy) > 8) {
        isSwiping.current = true;
        // FIX: prevent any ancestor scroll while we're swiping reels
        e.preventDefault();
      }

      const itemH = getItemHeight();
      const base  = -currentIdx.current * itemH;
      // FIX: add rubber-band resistance at the edges
      const total    = reelsRef.current.length;
      const atTop    = currentIdx.current === 0 && dy > 0;
      const atBottom = currentIdx.current === total - 1 && dy < 0;
      const delta    = (atTop || atBottom) ? dy * 0.25 : dy;
      strip.style.transform = `translateY(${base + delta}px)`;
    };

    const onTouchEnd = () => {
      const total     = reelsRef.current.length;
      const itemH     = getItemHeight();
      // FIX: use pixel threshold rather than fraction — feels more natural
      const threshold = Math.min(itemH * 0.18, 80);

      if      (touchDeltaY.current < -threshold) scrollToIdx(currentIdx.current + 1, total);
      else if (touchDeltaY.current >  threshold) scrollToIdx(currentIdx.current - 1, total);
      else                                        scrollToIdx(currentIdx.current,     total);
    };

    col.addEventListener('touchstart', onTouchStart, { passive: true });
    // FIX: passive:false on touchmove so we can preventDefault() and block page scroll
    col.addEventListener('touchmove',  onTouchMove,  { passive: false });
    col.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      col.removeEventListener('touchstart', onTouchStart);
      col.removeEventListener('touchmove',  onTouchMove);
      col.removeEventListener('touchend',   onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToIdx, getItemHeight, reels.length]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown' || e.key === 'j') scrollToIdx(currentIdx.current + 1, reelsRef.current.length);
      if (e.key === 'ArrowUp'   || e.key === 'k') scrollToIdx(currentIdx.current - 1, reelsRef.current.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scrollToIdx]);

  /* ── Recalculate transform on resize ── */
  useEffect(() => {
    const onResize = () => {
      const strip = stripRef.current;
      if (!strip) return;
      const itemH = getItemHeight();
      strip.style.transition = 'none';
      strip.style.transform  = `translateY(-${currentIdx.current * itemH}px)`;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getItemHeight]);

  /* ── fetch reels ── */
  const fetchReels = useCallback(async (currentMode, currentGender, currentCoords) => {
    setLoading(true);
    try {
      let qs = '?limit=30';
      if (currentGender && currentGender !== 'all') qs += `&gender=${currentGender}`;
      if (currentMode === 'all') {
        qs += '&mode=all';
      } else if (currentCoords) {
        qs += `&latitude=${currentCoords.lat}&longitude=${currentCoords.lng}`;
      }
      const res = await API.get(`/public/reels${qs}`);
      setReels(res.data.data || []);
    } catch { setReels([]); }
    finally { setLoading(false); }
  }, []);

  /* ── geolocation on mount ── */
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => {
          const c = { lat: p.coords.latitude, lng: p.coords.longitude };
          setCoords(c); setLocLabel('Nearby You');
          fetchReels('nearest', 'all', c);
        },
        () => {
          setLocLabel('All Salons'); setMode('all');
          fetchReels('all', 'all', null);
        },
        { timeout: 6000 }
      );
    } else {
      setLocLabel('All Salons'); setMode('all');
      fetchReels('all', 'all', null);
    }
  }, [fetchReels]);

  /* ── re-fetch on filter change ── */
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    setLocLabel(mode === 'nearest' && coords ? 'Nearby You' : 'All Salons');
    fetchReels(mode, gender, coords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gender, fetchReels]);

  /* ── Keep mutedRef fresh ── */
  useEffect(() => {
    mutedRef.current = muted;
    Object.values(videoRefs.current).forEach(v => { if (v) v.muted = muted; });
  }, [muted]);

  /* ── Auto-play first reel when list loads ── */
  useEffect(() => {
    if (!reels.length) return;
    currentIdx.current = 0;
    // FIX: wait one frame so feed has been laid out and clientHeight is correct
    requestAnimationFrame(() => {
      if (stripRef.current) {
        stripRef.current.style.transition = 'none';
        stripRef.current.style.transform  = 'translateY(0px)';
      }
      const firstId = reels[0]?._id;
      if (firstId && videoRefs.current[firstId]) {
        videoRefs.current[firstId].muted = mutedRef.current;
        videoRefs.current[firstId].play().catch(() => {});
      }
    });
  }, [reels]);

  /* ── Register video refs ── */
  const handleRegisterRef = useCallback((el, id) => {
    if (el) {
      el.muted = mutedRef.current;
      videoRefs.current[id] = el;
      const idx = reelsRef.current.findIndex(r => r._id === id);
      if (idx === currentIdx.current) { el.play().catch(() => {}); }
    } else {
      delete videoRefs.current[id];
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(m => !m);
    setShowMute(true);
    clearTimeout(muteTimer.current);
    muteTimer.current = setTimeout(() => setShowMute(false), 1300);
  }, []);

  const handleShare = useCallback(async (reel) => {
    const url = `${window.location.origin}${salonPath(reel.salon)}`;
    if (navigator.share) {
      try { await navigator.share({ title: reel.salon.name, text: `Book at ${reel.salon.name}!`, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(reel._id);
    setTimeout(() => setCopied(null), 2200);
  }, []);

  const handleAuthRequired = useCallback(() => setShowLoginPrompt(true), []);

  /* ── comments ── */
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
      setCommentText('');
    } catch { /* silent */ }
    finally { setPosting(false); }
  }, [commentText, commentReel, posting]);

  /* ─── Render ─── */
  return (
    <>
      <style>{CSS}</style>

      <div className="reels-page" ref={pageRef}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #6366f1, #a78bfa, #f0abfc, transparent)',
              animation: 'spin 0.9s linear infinite',
              padding: 4,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#050505' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <LoadingDots />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0, letterSpacing: 0.3 }}>
                Discovering reels…
              </p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !reels.length && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, fontSize: 38,
              boxShadow: '0 0 40px rgba(99,102,241,0.12)',
            }}>
              🎬
            </div>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              No Reels Found
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center',
              maxWidth: 260, margin: '0 0 28px', lineHeight: 1.6,
            }}>
              No salon videos in your area yet. Try "All Salons" or change your filter.
            </p>
            <button onClick={() => navigate('/')} style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
              color: '#fff', border: 'none', borderRadius: 16,
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(99,102,241,0.45)',
              letterSpacing: 0.2,
            }}>
              Explore Salons
            </button>
          </div>
        )}

        {/* Reels column */}
        {!loading && reels.length > 0 && (
        <div className="reels-col" ref={colRef}>

          {/* Top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            pointerEvents: 'none',
            paddingTop: 'max(10px, env(safe-area-inset-top, 10px))',
          }}>
            {/* Row 1: back · title · mute */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 14px 10px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)',
            }}>
              <button onClick={() => navigate(-1)} type="button" style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '50%', width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', pointerEvents: 'all',
                boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
              }}>
                <IcoBack />
              </button>

              <div style={{ textAlign: 'center' }}>
                <p style={{
                  color: '#fff', fontSize: 16, fontWeight: 900, margin: 0,
                  letterSpacing: '-0.3px', textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}>
                  Reels
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.45)', fontSize: 10.5, margin: 0,
                  display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center',
                  fontWeight: 600,
                }}>
                  <IcoPin /> {locLabel}
                </p>
              </div>

              <button onClick={toggleMute} type="button" style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '50%', width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', pointerEvents: 'all',
                boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
              }}>
                {muted ? <IcoMuted /> : <IcoUnmuted />}
              </button>
            </div>

            {/* Row 2: mode + gender filters */}
            <div style={{ padding: '0 14px 6px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{
                display: 'flex', gap: 6, pointerEvents: 'all',
                background: 'rgba(0,0,0,0.38)',
                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                borderRadius: 22, padding: 4,
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {[['nearest', '📍 Nearest'], ['all', '🌐 All Salons']].map(([m, label]) => (
                  <button key={m} type="button" onClick={() => setMode(m)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 18, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 800,
                    background: mode === m
                      ? 'linear-gradient(135deg,#6366f1,#7c3aed)'
                      : 'transparent',
                    color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)',
                    boxShadow: mode === m ? '0 2px 12px rgba(99,102,241,0.45)' : 'none',
                    transition: 'all 0.2s ease',
                    letterSpacing: 0.1,
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, pointerEvents: 'all' }}>
                {[['all', 'All'], ['male', 'Men'], ['female', 'Women']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setGender(val)} style={{
                    flex: 1, padding: '5px 0', borderRadius: 14,
                    border: `1.5px solid ${gender === val ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.12)'}`,
                    cursor: 'pointer', fontSize: 11, fontWeight: 800,
                    background: gender === val
                      ? 'rgba(139,92,246,0.45)'
                      : 'rgba(0,0,0,0.28)',
                    color: gender === val ? '#e9d5ff' : 'rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    transition: 'all 0.18s ease',
                    boxShadow: gender === val ? '0 2px 10px rgba(139,92,246,0.3)' : 'none',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable feed (transform-based) */}
          <div className="reels-feed" ref={feedRef}>
            <div className="reels-strip" ref={stripRef}>
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

          {/* Desktop prev/next nav arrows */}
          <div style={{
            display: 'none',
            position: 'absolute',
            bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 25, gap: 12,
          }} className="reels-desktop-nav">
            <button
              type="button"
              onClick={() => scrollToIdx(currentIdx.current - 1, reels.length)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                transition: 'background 0.15s',
              }}
              title="Previous (↑)"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollToIdx(currentIdx.current + 1, reels.length)}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                transition: 'background 0.15s',
              }}
              title="Next (↓)"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 120,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowLoginPrompt(false)}
          />
          <div className="scale-in" style={{
            position: 'relative',
            background: 'linear-gradient(145deg, #141414, #1c1624)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 24, padding: 28,
            width: '100%', maxWidth: 320, textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 120, height: 2,
              background: 'linear-gradient(to right, transparent, #7c3aed, transparent)',
              borderRadius: 2,
            }} />
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28,
              boxShadow: '0 0 24px rgba(99,102,241,0.2)',
            }}>
              🔐
            </div>
            <p style={{ color: '#fff', fontSize: 18, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Login Required
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
              Sign in to like and comment on reels.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/login" state={{ from: '/reels' }}
                style={{
                  display: 'block', padding: '13px',
                  background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
                  color: '#fff', textDecoration: 'none', borderRadius: 14,
                  fontWeight: 800, fontSize: 14, letterSpacing: 0.2,
                  boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
                }}
                onClick={() => setShowLoginPrompt(false)}>
                Log In
              </Link>
              <Link to="/register"
                style={{
                  display: 'block', padding: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', textDecoration: 'none', borderRadius: 14,
                  fontWeight: 700, fontSize: 14,
                }}
                onClick={() => setShowLoginPrompt(false)}>
                Create Account
              </Link>
              <button type="button" onClick={() => setShowLoginPrompt(false)}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', padding: '6px 0',
                }}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment bottom sheet */}
      {commentReel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => setCommentReel(null)}
          />
          <div className="scale-in" style={{
            position: 'relative',
            background: 'linear-gradient(160deg, #111118, #0d0d14)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderBottom: 'none',
            borderRadius: '26px 26px 0 0',
            padding: '0 0 max(24px, env(safe-area-inset-bottom, 24px))',
            zIndex: 1, width: '100%', maxWidth: 540,
            maxHeight: '82vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
              <div style={{
                width: 36, height: 4,
                background: 'linear-gradient(to right, #6366f1, #a78bfa)',
                borderRadius: 2, margin: '0 auto 16px',
                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: 0, letterSpacing: '-0.2px' }}>
                    Comments
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}>
                    {commentReel.salon.name}
                  </p>
                </div>
                <button onClick={() => setCommentReel(null)} type="button" style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%', width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14,
                }}>
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 4px' }}>
              {commentsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <LoadingDots />
                </div>
              ) : comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, margin: 0 }}>
                    No comments yet. Be the first!
                  </p>
                </div>
              ) : comments.map(c => (
                <div key={c._id} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, color: '#fff',
                    }}>
                      {c.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 800 }}>{c.name}</span>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{timeAgo(c.createdAt)}</span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                  {c.replies?.map((r, i) => (
                    <div key={i} style={{
                      marginTop: 10, marginLeft: 46,
                      paddingLeft: 12,
                      borderLeft: '2px solid rgba(139,92,246,0.4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 800 }}>{r.ownerName}</span>
                        <span style={{
                          background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))',
                          color: '#c4b5fd', fontSize: 9, fontWeight: 800,
                          padding: '2px 6px', borderRadius: 5, letterSpacing: 0.3,
                          border: '1px solid rgba(139,92,246,0.2)',
                        }}>
                          OWNER
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{timeAgo(r.createdAt)}</span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {r.text}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ padding: '12px 16px 0', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <input
                  className="comment-input"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                  placeholder="Add a comment…"
                  autoFocus
                />
                <button
                  onClick={postComment}
                  disabled={posting || !commentText.trim()}
                  type="button"
                  style={{
                    flexShrink: 0,
                    background: posting || !commentText.trim()
                      ? 'rgba(99,102,241,0.25)'
                      : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                    border: 'none', borderRadius: 14,
                    padding: '0 20px', height: 48,
                    color: '#fff', fontWeight: 800, fontSize: 13,
                    cursor: posting || !commentText.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: commentText.trim() && !posting ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                    letterSpacing: 0.2,
                  }}
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