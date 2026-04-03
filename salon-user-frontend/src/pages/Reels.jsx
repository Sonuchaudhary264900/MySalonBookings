import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

/* ── CSS ── */
const CSS = `
  /* Mobile: fullscreen feed */
  .reels-root {
    background: #000;
    display: flex;
    flex-direction: column;
  }
  @media (max-width: 767px) {
    .reels-root {
      position: fixed; inset: 0; z-index: 60;
    }
  }
  @media (min-width: 768px) {
    .reels-root {
      position: relative;
      width: 420px;
      flex-shrink: 0;
      height: calc(100vh - 72px);
      border-radius: 18px;
      overflow: hidden;
    }
    .reels-desktop-wrap {
      display: flex;
      gap: 24px;
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px 24px 32px;
      align-items: flex-start;
    }
    .reels-sidebar {
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      min-width: 0;
      padding-top: 4px;
    }
  }
  @media (max-width: 767px) {
    .reels-desktop-wrap { display: contents; }
    .reels-sidebar { display: none !important; }
  }
  .reels-feed {
    flex: 1;
    height: 100%;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .reels-feed::-webkit-scrollbar { display: none; }
  .reel-item {
    height: 100%; scroll-snap-align: start; scroll-snap-stop: always;
    position: relative; overflow: hidden; background: #111;
    flex-shrink: 0;
  }
  @media (max-width: 767px) {
    .reel-item { height: 100dvh; }
  }
  .reel-video {
    width: 100%; height: 100%; object-fit: cover;
    display: block; position: absolute; inset: 0;
  }
  .reel-gradient {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(0,0,0,0.88) 0%,
      rgba(0,0,0,0.4) 35%,
      transparent 65%
    );
  }
  @keyframes heartPop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.35); } }
  .heart-pop { animation: heartPop 0.28s ease; }
  @keyframes muteAnim { 0%,100% { opacity: 0; transform: scale(0.7); } 20%,70% { opacity: 1; transform: scale(1); } }
  .mute-toast { animation: muteAnim 1.1s ease forwards; pointer-events: none; }
  @keyframes reelFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
  .reel-info-in { animation: reelFadeIn 0.35s ease both; }
`;

/* ── Icon helpers ── */
const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width={26} height={26}
    fill={filled ? "#ef4444" : "none"} stroke={filled ? "#ef4444" : "#fff"} strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const CommentIcon = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="#fff" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="#fff" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
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
  <svg viewBox="0 0 24 24" width={11} height={11} fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

export default function Reels() {
  const navigate = useNavigate();
  const [reels, setReels]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [locLabel, setLocLabel] = useState("Nearby");
  const [liked, setLiked]     = useState(new Set());
  const [muted, setMuted]     = useState(true);
  const [showMute, setShowMute] = useState(false);
  const [commentReel, setCommentReel] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [copied, setCopied]   = useState(null);

  const videoRefs   = useRef({});
  const observerRef = useRef(null);
  const muteTimer   = useRef(null);

  /* Fetch reels */
  useEffect(() => {
    const load = async (lat, lng) => {
      try {
        const qs = lat != null ? `?latitude=${lat}&longitude=${lng}&limit=30` : `?limit=30`;
        const res = await API.get(`/public/reels${qs}`);
        setReels(res.data.data || []);
      } catch { setReels([]); }
      finally { setLoading(false); }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { setLocLabel("Nearby You"); load(p.coords.latitude, p.coords.longitude); },
        () => { setLocLabel("All Salons"); load(); },
        { timeout: 6000 }
      );
    } else { setLocLabel("All Salons"); load(); }
  }, []);

  /* IntersectionObserver — autoplay visible video, pause others */
  useEffect(() => {
    if (!reels.length) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          v.play().catch(() => {});
        } else {
          v.pause();
          v.currentTime = 0;
        }
      });
    }, { threshold: 0.6 });
    Object.values(videoRefs.current).forEach(v => { if (v) observerRef.current.observe(v); });

    // Kick-start the first visible video — the observer may not fire on already-visible elements
    const firstKey = reels[0]?._id;
    const firstVid = firstKey ? videoRefs.current[firstKey] : null;
    if (firstVid) firstVid.play().catch(() => {});

    return () => observerRef.current?.disconnect();
  }, [reels]);

  /* Sync muted state — React's muted prop is broken, must set via DOM */
  useEffect(() => {
    Object.values(videoRefs.current).forEach(v => { if (v) v.muted = muted; });
  }, [muted]);

  /* Set muted=true on every new video ref (React doesn't apply muted prop to DOM) */
  const setVideoRef = useCallback((el, id) => {
    if (!el) return;
    el.muted = true; // always start muted so autoplay is allowed
    videoRefs.current[id] = el;
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(m => !m);
    setShowMute(true);
    clearTimeout(muteTimer.current);
    muteTimer.current = setTimeout(() => setShowMute(false), 1200);
  }, []);

  const toggleLike = (id) => {
    setLiked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleShare = async (reel) => {
    const url = `${window.location.origin}/salon/${reel.salon._id}`;
    if (navigator.share) {
      try { await navigator.share({ title: reel.salon.name, text: `Book at ${reel.salon.name}!`, url }); return; }
      catch {}
    }
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(reel._id);
    setTimeout(() => setCopied(null), 2000);
  };

  const postComment = () => { setCommentText(""); setCommentReel(null); };

  const loaderStyle = { background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: '60vh' };

  /* ── Loading ── */
  if (loading) return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={loaderStyle}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Finding nearby salon reels…</p>
      </div>
    </>
  );

  /* ── Empty ── */
  if (!reels.length) return (
    <div style={{ ...loaderStyle, padding: 24 }}>
      <div style={{ fontSize: 52 }}>🎬</div>
      <p style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>No Reels Yet</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', maxWidth: 260, margin: 0 }}>No nearby salon videos yet. Check back soon!</p>
      <button onClick={() => navigate('/')} style={{ marginTop: 8, padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Explore Salons
      </button>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="reels-desktop-wrap" style={{ boxSizing: 'border-box' }}>
      <div className="reels-root">

        {/* ── Fixed top bar ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))', background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)', pointerEvents: 'none' }}>
          {/* Back */}
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', pointerEvents: 'all' }}>
            <ChevronLeft />
          </button>

          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>Reels</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
              <PinIcon /> {locLabel}
            </p>
          </div>

          {/* Mute toggle */}
          <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', pointerEvents: 'all' }}>
            {muted ? <MutedIcon /> : <UnmutedIcon />}
          </button>
        </div>

        {/* ── Feed ── */}
        <div className="reels-feed">
          {reels.map((reel, idx) => {
            const isLiked = liked.has(reel._id);
            const initial = reel.salon.name?.[0]?.toUpperCase() || 'S';

            return (
              <div key={reel._id} className="reel-item">
                <video
                  ref={el => setVideoRef(el, reel._id)}
                  src={reel.videoUrl}
                  className="reel-video"
                  autoPlay
                  loop
                  playsInline
                  preload={idx < 2 ? 'auto' : 'metadata'}
                  onClick={(e) => { e.currentTarget.play().catch(() => {}); toggleMute(); }}
                />
                <div className="reel-gradient" />

                {/* Mute toast */}
                {showMute && (
                  <div className="mute-toast" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 40, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 8 }}>
                    {muted ? <MutedIcon /> : <UnmutedIcon />}
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{muted ? 'Muted' : 'Sound On'}</span>
                  </div>
                )}

                {/* Bottom-left: salon info */}
                <div className="reel-info-in" style={{ position: 'absolute', bottom: 90, left: 16, right: 86, zIndex: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.85)', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {reel.salon.logo
                        ? <img src={reel.salon.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{initial}</span>
                      }
                    </div>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{reel.salon.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, margin: 0 }}>📍 {reel.salon.city}</p>
                    </div>
                  </div>
                  {reel.salon.averageRating > 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: '0 0 8px', fontWeight: 600 }}>⭐ {reel.salon.averageRating.toFixed(1)}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/salon/${reel.salon._id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 20, padding: '8px 18px', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 800, boxShadow: '0 4px 16px rgba(99,102,241,0.5)' }}>
                      Book Now
                    </Link>
                    <Link to={`/salon/${reel.salon._id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '7px 14px', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                      View Salon →
                    </Link>
                  </div>
                </div>

                {/* Right-side buttons */}
                <div style={{ position: 'absolute', bottom: 100, right: 12, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>

                  {/* Like */}
                  <button onClick={() => toggleLike(reel._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div className={isLiked ? 'heart-pop' : ''} style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HeartIcon filled={isLiked} />
                    </div>
                    <span style={{ color: isLiked ? '#ef4444' : '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                      {isLiked ? 'Liked' : 'Like'}
                    </span>
                  </button>

                  {/* Comment */}
                  <button onClick={() => setCommentReel(reel._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CommentIcon />
                    </div>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Comment</span>
                  </button>

                  {/* Share */}
                  <button onClick={() => handleShare(reel)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {copied === reel._id ? <CheckIcon /> : <ShareIcon />}
                    </div>
                    <span style={{ color: copied === reel._id ? '#4ade80' : '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                      {copied === reel._id ? 'Copied!' : 'Share'}
                    </span>
                  </button>

                  {/* Salon account avatar (tap → salon page) */}
                  <Link to={`/salon/${reel.salon._id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2.5px solid #fff', padding: 2, background: 'transparent' }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {reel.salon.logo
                          ? <img src={reel.salon.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{initial}</span>
                        }
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 600, maxWidth: 58, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reel.salon.name.split(' ')[0]}
                    </span>
                  </Link>
                </div>

                {/* Safe area bottom spacer */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 'env(safe-area-inset-bottom,0px)', background: 'rgba(0,0,0,0.5)' }} />
              </div>
            );
          })}
        </div>

        {/* ── Comment sheet ── */}
        {commentReel && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setCommentReel(null)} />
            <div style={{ position: 'relative', background: '#181818', borderRadius: '22px 22px 0 0', padding: '20px 16px 40px', zIndex: 1, width: '100%', maxWidth: 520 }}>
              <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 18px' }} />
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Comments</p>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>Be the first to comment on this reel!</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  autoFocus
                  style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                />
                <button onClick={postComment} style={{ background: '#6366f1', border: 'none', borderRadius: 14, padding: '0 18px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop sidebar (nearby salons info) ── */}
      <div className="reels-sidebar">
        <div style={{ background: '#111', borderRadius: 16, padding: '20px 18px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Reels</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 16 }}>
            {locLabel === 'Nearby You' ? '📍 Salons within 20km of you' : '🌐 All salon reels'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Scroll to explore · Tap to mute/unmute</p>
        </div>
        {reels.slice(0, 6).map((r) => (
          <Link key={r._id} to={`/salon/${r.salon._id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', padding: '10px 14px', background: '#111', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.salon.logo
                ? <img src={r.salon.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{r.salon.name?.[0]?.toUpperCase()}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.salon.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>📍 {r.salon.city}</p>
            </div>
          </Link>
        ))}
      </div>

      </div>
      </div>
    </>
  );
}
