import { useState, useEffect, useLayoutEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useJsApiLoader, GoogleMap, OverlayView, Polyline, Circle } from "@react-google-maps/api";
import API from "../services/api";
import { salonPath } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";

const SalonDetails = lazy(() => import("./SalonDetails"));

const NAV_H      = "calc(62px + env(safe-area-inset-bottom, 0px))";
const SNAP_ORDER = ["peek", "mid", "full"];
const lastSnapMemory = { current: "peek" };

const lightMapStyles = [
  { featureType: "poi",     stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road",          elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "road.highway",  elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "landscape",     elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "water",         elementType: "geometry", stylers: [{ color: "#c9d6e3" }] },
];

const darkMapStyles = [
  { elementType: "geometry",           stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon",        stylers: [{ visibility: "off" }] },
  { featureType: "poi",      stylers: [{ visibility: "off" }] },
  { featureType: "transit",  stylers: [{ visibility: "off" }] },
  { featureType: "road",          elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway",  elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road",     elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "water",    elementType: "geometry",          stylers: [{ color: "#000000" }] },
  { featureType: "landscape",elementType: "geometry",          stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry",    stylers: [{ color: "#757575" }] },
];

function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
function bizLat(s)  { return s.location?.coordinates?.[1]; }
function bizLng(s)  { return s.location?.coordinates?.[0]; }
function bizDist(s, userLat, userLng) {
  if (typeof s.distance === "number") return s.distance;
  if (!userLat || !bizLat(s)) return null;
  const R = 6371000;
  const dLat = (bizLat(s) - userLat) * Math.PI / 180;
  const dLng = (bizLng(s) - userLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(bizLat(s) * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOpenStatus(salon) {
  const wh = salon.workingHours;
  if (!wh) return null;
  const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const today = days[new Date().getDay()];
  const h = wh[today];
  if (!h || h.closed || h.isClosed) return { open: false, label: "Closed today" };
  const toMin = (t) => { const [hh, mm] = (t || "00:00").split(":").map(Number); return hh * 60 + mm; };
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const openMin  = toMin(h.open  || h.openTime);
  const closeMin = toMin(h.close || h.closeTime || h.end);
  if (nowMin >= openMin && nowMin < closeMin) {
    const ch = Math.floor(closeMin / 60); const cm = closeMin % 60;
    const ampm = ch >= 12 ? "PM" : "AM";
    return { open: true, label: `Open · closes ${ch % 12 || 12}:${String(cm).padStart(2,"0")} ${ampm}` };
  }
  return { open: false, label: "Closed now" };
}

function getSnapY(snap) {
  const vh = window.innerHeight;
  const sheetH = vh * 0.85;
  if (snap === "full") return 0;
  if (snap === "mid")  return sheetH - vh * 0.45;
  return sheetH - Math.min(220, vh * 0.28);
}

/* ── User location dot + heading cone ── */
function UserLocationOverlay({ heading }) {
  const hasHeading = heading !== null && heading !== undefined && !isNaN(Number(heading));
  const deg = hasHeading ? Number(heading) : 0;
  return (
    <div style={{ position: "relative", width: 64, height: 64, pointerEvents: "none" }}>
      <style>{`
        @keyframes gpsRingAnim {
          0%   { transform: translate(-50%,-50%) scale(0.8); opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(3.2); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 18, height: 18, borderRadius: "50%",
        background: "rgba(66,133,244,0.22)",
        animation: "gpsRingAnim 2.6s ease-out infinite",
      }} />
      {hasHeading && (
        <svg style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }} width={64} height={64}>
          <defs>
            <radialGradient id="coneGrad" cx="50%" cy="100%" r="110%">
              <stop offset="0%" stopColor="rgba(66,133,244,0.6)" />
              <stop offset="100%" stopColor="rgba(66,133,244,0.02)" />
            </radialGradient>
          </defs>
          <g transform={`rotate(${deg},32,32)`}>
            <path d="M32,32 L20,7 Q32,0 44,7 Z" fill="url(#coneGrad)" />
          </g>
        </svg>
      )}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 18, height: 18, borderRadius: "50%",
        background: "linear-gradient(135deg,#4285f4,#1a73e8)",
        border: "3.5px solid #fff",
        boxShadow: "0 3px 14px rgba(66,133,244,0.7)",
        zIndex: 2,
      }} />
    </div>
  );
}

/* ── Salon pin marker (React, no Leaflet) ── */
function SalonMarker({ salon, isActive, onClick }) {
  const size    = isActive ? 46 : 34;
  const name    = salon.name || "S";
  const initial = name.charAt(0).toUpperCase();
  const shortName = isActive ? (name.length > 14 ? name.slice(0, 13) + "…" : name) : "";
  const photoUrl = salon.coverPhoto || salon.photos?.[0] || salon.logo || salon.profilePhoto;
  const inner = photoUrl
    ? <img src={photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }} />
    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size / 2.6), fontWeight: 900, color: "#fff" }}>{initial}</div>;

  if (!isActive) {
    return (
      <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
        <div style={{
          width: size, height: size, borderRadius: "50%", overflow: "hidden",
          border: "2.5px solid #fff",
          boxShadow: "0 2px 8px rgba(99,102,241,0.35),0 1px 3px rgba(0,0,0,0.2)",
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
        }}>{inner}</div>
        <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "6px solid #fff", marginTop: -1, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }} />
      </div>
    );
  }
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
      <style>{`@keyframes markerPop{from{transform:scale(0.55);opacity:0}to{transform:scale(1);opacity:1}} @keyframes mvPulse{0%{transform:scale(0.85);opacity:0.8}70%{transform:scale(1.35);opacity:0}100%{transform:scale(1.35);opacity:0}}`}</style>
      {shortName && (
        <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.25)", whiteSpace: "nowrap", marginBottom: 4, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
          {shortName}
        </div>
      )}
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, animation: "markerPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <div style={{ position: "absolute", inset: -7, borderRadius: "50%", border: "2.5px solid rgba(99,102,241,0.5)", animation: "mvPulse 1.6s ease-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: -14, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.22)", animation: "mvPulse 1.6s ease-out 0.5s infinite", pointerEvents: "none" }} />
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", border: "3px solid #6366f1", boxShadow: "0 4px 16px rgba(99,102,241,0.7),0 1px 4px rgba(0,0,0,0.2)", background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{inner}</div>
      </div>
      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "8px solid #6366f1", marginTop: -1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }} />
    </div>
  );
}

/* ── Destination pin for route ── */
function DestPin() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#ea4335,#c0392b)", border: "3px solid #fff", boxShadow: "0 4px 14px rgba(234,67,53,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "8px solid #ea4335", marginTop: -1 }} />
    </div>
  );
}

/* ── Floating compass + locate buttons ── */
function MapControls({ mapRef, coords, followMode, setFollowMode, onCompass, compassActive, heading }) {
  const handleLocate = () => {
    if (coords && mapRef.current) {
      mapRef.current.panTo({ lat: coords.lat, lng: coords.lng });
      mapRef.current.setZoom(16);
      setFollowMode(true);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          if (mapRef.current) {
            mapRef.current.panTo({ lat: p.coords.latitude, lng: p.coords.longitude });
            mapRef.current.setZoom(16);
            setFollowMode(true);
          }
        },
        () => {}, { timeout: 6000, enableHighAccuracy: true }
      );
    }
  };

  const northAngle = compassActive && heading != null ? -heading : 0;
  const btnBase = {
    position: "absolute", right: 12, zIndex: 1000,
    width: 42, height: 42, border: "none", borderRadius: 12,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s",
  };

  return (
    <>
      <button onClick={onCompass} title={compassActive ? "Disable compass" : "Enable compass"}
        style={{ ...btnBase, top: 16, background: "#fff",
          boxShadow: compassActive ? "0 2px 16px rgba(234,67,53,0.35),0 2px 8px rgba(0,0,0,0.12)" : "0 2px 12px rgba(0,0,0,0.15)" }}>
        <svg viewBox="0 0 24 24" width={22} height={22} style={{ transform: `rotate(${northAngle}deg)`, transition: "transform 0.12s linear" }}>
          <path d="M12 2L14.5 10H9.5L12 2Z" fill={compassActive ? "#ea4335" : "#94a3b8"} />
          <path d="M12 22L9.5 14H14.5L12 22Z" fill={compassActive ? "#bdc1c6" : "#e2e8f0"} />
          <circle cx="12" cy="12" r="2.2" fill={compassActive ? "#5f6368" : "#cbd5e1"} />
        </svg>
      </button>
      <button onClick={handleLocate} title={followMode ? "Following" : "Locate me"}
        style={{ ...btnBase, top: 68,
          background: followMode ? "linear-gradient(135deg,#4285f4,#1a73e8)" : "#fff",
          boxShadow: followMode ? "0 2px 16px rgba(66,133,244,0.5)" : "0 2px 12px rgba(0,0,0,0.15)" }}>
        {followMode ? (
          <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="#4285f4" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
            <circle cx="12" cy="12" r="8" strokeDasharray="3 2" strokeOpacity="0.4"/>
          </svg>
        )}
      </button>
    </>
  );
}

/* ── Star rating ── */
function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display:"flex", gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 20 20" width={13} height={13}>
          {i <= full
            ? <path fill="#fbbf24" d="M10 1l2.4 6.8H20l-5.9 4.3 2.3 6.9L10 14.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/>
            : i === full + 1 && half
              ? <><path fill="#e2e8f0" d="M10 1l2.4 6.8H20l-5.9 4.3 2.3 6.9L10 14.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/><path fill="#fbbf24" d="M10 1v13.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/></>
              : <path fill="#e2e8f0" d="M10 1l2.4 6.8H20l-5.9 4.3 2.3 6.9L10 14.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/>
          }
        </svg>
      ))}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   SALON CARD
══════════════════════════════════════════════════════ */
function SalonCard({ salon, userCoords, onClose, onDirections, navigate, isDark, onSnapChange }) {
  const [snap, setSnap] = useState(() => lastSnapMemory.current);
  const [details, setDetails]   = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchDone, setFetchDone] = useState(false);

  const sheetRef  = useRef(null);
  const scrollRef = useRef(null);
  const snapRef   = useRef(lastSnapMemory.current);
  const drag      = useRef({ active: false, startY: 0, startTranslate: 0, lastY: 0, vel: 0, ts: 0, startSnap: "peek" });

  const distM       = bizDist(salon, userCoords?.lat, userCoords?.lng);
  const dist        = distM != null ? fmtDist(distM) : null;
  const coverImg    = salon.coverPhoto || salon.photos?.[0];
  const logoImg     = salon.logo || salon.profilePhoto;
  const address     = [salon.locality, salon.address, salon.city].filter(Boolean).filter((v,i,a) => a.indexOf(v) === i).join(", ");
  const phone       = salon.phone || salon.contactPhone;
  const rating      = salon.averageRating || 0;
  const reviews     = salon.reviewCount || salon.totalReviews || 0;
  const openStatus  = getOpenStatus(salon);
  const nearbyServices = Array.isArray(salon.services)
    ? salon.services.slice(0, 6).map(s => typeof s === "string" ? s : s?.name).filter(Boolean)
    : [];

  const bg    = isDark ? "#111827" : "#fff";
  const fg    = isDark ? "#fff"    : "#0f172a";
  const fg2   = isDark ? "#9ca3af" : "#64748b";
  const fg3   = isDark ? "#6b7280" : "#94a3b8";
  const brd   = isDark ? "#374151" : "#e2e8f0";
  const chip  = isDark ? "#1f2937" : "#f1f5f9";
  const chipFg = isDark ? "#e5e7eb" : "#475569";
  const secBg  = isDark ? "#1f2937" : "#f1f5f9";

  const _applyTranslate = (y) => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transform = `translateY(${Math.max(0, Math.min(window.innerHeight * 0.85, y))}px)`;
  };
  const _setTransition = (on) => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transition = on ? "transform 0.32s cubic-bezier(0.22,1,0.36,1)" : "none";
  };
  const _doSnap = useCallback((newSnap) => {
    snapRef.current = newSnap;
    lastSnapMemory.current = newSnap;
    _setTransition(true);
    _applyTranslate(getSnapY(newSnap));
    setSnap(newSnap);
    onSnapChange?.(newSnap);
    if (newSnap !== "full" && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [onSnapChange]); // eslint-disable-line
  const _snapNearest = (y) => SNAP_ORDER.reduce((best, s) =>
    Math.abs(getSnapY(s) - y) < Math.abs(getSnapY(best) - y) ? s : best, "peek");

  useLayoutEffect(() => {
    if (!sheetRef.current) return;
    const start = window.innerHeight * 0.85;
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.transform  = `translateY(${start}px)`;
    requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      sheetRef.current.style.transition = "transform 0.36s cubic-bezier(0.22,1,0.36,1)";
      sheetRef.current.style.transform  = `translateY(${getSnapY(snapRef.current)}px)`;
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (snap !== "full" || fetchDone || fetching) return;
    setFetching(true);
    API.get(`/public/salons/${salon._id}`)
      .then(r => setDetails(r.data.data?.salon || r.data.data))
      .catch(() => {})
      .finally(() => { setFetching(false); setFetchDone(true); });
  }, [snap]); // eslint-disable-line

  function onHandleDown(e) {
    e.preventDefault();
    drag.current = { active: true, startY: e.clientY, startTranslate: getSnapY(snapRef.current),
      lastY: e.clientY, vel: 0, ts: Date.now(), startSnap: snapRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    _setTransition(false);
  }
  function onPointerMove(e) {
    if (!drag.current.active) return;
    const now = Date.now();
    const dt  = Math.max(now - drag.current.ts, 1);
    drag.current.vel  = (e.clientY - drag.current.lastY) / dt;
    drag.current.lastY = e.clientY;
    drag.current.ts   = now;
    const raw = e.clientY - drag.current.startY;
    const nearTop = drag.current.startSnap === "full" && raw < 0;
    const nearBot = drag.current.startSnap === "peek"  && raw > 0;
    const delta   = (nearTop || nearBot) ? raw * 0.35 : raw;
    _applyTranslate(drag.current.startTranslate + delta);
  }
  function onPointerUp(e) {
    if (!drag.current.active) return;
    drag.current.active = false;
    const FLICK = 0.45;
    const vel   = drag.current.vel;
    const idx   = SNAP_ORDER.indexOf(drag.current.startSnap);
    const raw   = e.clientY - drag.current.startY;
    const curY  = drag.current.startTranslate + raw;
    if (vel < -FLICK) {
      _doSnap(SNAP_ORDER[Math.min(idx + 1, 2)]);
    } else if (vel > FLICK) {
      if (idx === 0) { _setTransition(true); _applyTranslate(window.innerHeight * 0.85); onClose(); }
      else _doSnap(SNAP_ORDER[idx - 1]);
    } else {
      const nearest = _snapNearest(curY);
      if (nearest === "peek" && drag.current.startSnap === "peek" && raw > 80) {
        _setTransition(true); _applyTranslate(window.innerHeight * 0.85); onClose();
      } else {
        _doSnap(nearest);
      }
    }
  }

  const showMid  = snap === "mid" || snap === "full";
  const showFull = snap === "full";

  const detailCats = (() => {
    if (!details) return [];
    if (Array.isArray(details.serviceCategories)) return details.serviceCategories;
    if (Array.isArray(details.services)) {
      const named = details.services.filter(s => s?.name);
      return named.length ? [{ name: "Services", services: named }] : [];
    }
    return [];
  })();
  const detailReviews = details?.reviews || [];
  const breakdown     = details?.ratingBreakdown;
  const detailRating  = details?.averageRating || rating;
  const detailReviewCount = details?.reviewCount || details?.totalReviews || reviews;

  return (
    <div ref={sheetRef} style={{
      position: "fixed", left: 0, right: 0,
      bottom: NAV_H, height: "85vh",
      zIndex: 201,
      background: isDark ? "rgba(17,24,39,0.72)" : "rgba(255,255,255,0.88)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: "20px 20px 0 0",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      willChange: "transform", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes markerPop { from{transform:scale(0.55);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes mv-shine  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .mv-shimmer {
          background: linear-gradient(90deg, ${isDark ? "#1f2937 25%,#374151 50%,#1f2937 75%" : "#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%"});
          background-size: 200% 100%; animation: mv-shine 1.4s infinite; border-radius: 6px;
        }
      `}</style>

      <div ref={scrollRef} style={{ flex: 1, overflowY: showFull ? "auto" : "hidden", WebkitOverflowScrolling: "touch" }}>
        <div
          onPointerDown={onHandleDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{ position: "relative", height: "min(220px, 28vh)", overflow: "hidden",
            flexShrink: 0, touchAction: "none", userSelect: "none", cursor: "grab" }}
        >
          {coverImg
            ? <img src={coverImg} alt={salon.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block", pointerEvents:"none" }} />
            : <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" }} />
          }
          <div style={{ position:"absolute", inset:0, pointerEvents:"none",
            background:"linear-gradient(to top, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.06) 75%, transparent 100%)" }} />
          <div style={{ position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
            zIndex:3, width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.4)", pointerEvents:"none" }} />
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ position:"absolute", top:12, left:12, zIndex:4, width:30, height:30, borderRadius:"50%", border:"none", cursor:"pointer",
              background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#fff" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div style={{ position:"absolute", top:12, right:14, zIndex:4, width:44, height:44, borderRadius:"50%", overflow:"hidden",
            border:"2px solid rgba(255,255,255,0.8)", boxShadow:"0 2px 10px rgba(0,0,0,0.3)",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink:0, pointerEvents:"none" }}>
            {logoImg
              ? <img src={logoImg} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#fff" }}>{(salon.name||"S").charAt(0)}</div>
            }
          </div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"14px 16px 14px", zIndex:3 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <p style={{ margin:0, fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-0.03em", lineHeight:1.1,
                textShadow:"0 2px 16px rgba(0,0,0,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {salon.name}
              </p>
              {rating >= 4.5 && (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="#818cf8" style={{ flexShrink:0 }}>
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:8 }}>
              {rating > 0 && <span style={{ fontSize:12, fontWeight:800, color:"#FDE68A", textShadow:"0 1px 4px rgba(0,0,0,0.4)" }}>★ {rating.toFixed(1)}</span>}
              {reviews > 0 && <span style={{ fontSize:11, color:"rgba(253,230,138,0.55)" }}>({reviews})</span>}
              {dist && <span style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>· {dist} away</span>}
              {openStatus && (
                <span style={{ fontSize:11, fontWeight:600,
                  color: openStatus.open ? "#4ADE80" : "#F87171",
                  background: openStatus.open ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)",
                  backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)",
                  padding:"2px 8px", borderRadius:999,
                  border:`1px solid ${openStatus.open ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                  {openStatus.label}
                </span>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={(e) => { e.stopPropagation(); navigate(salonPath(salon)); }}
                style={{ flex:1, padding:"12px 0", borderRadius:12, border:"none", cursor:"pointer",
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontWeight:700, fontSize:14,
                  boxShadow:"0 4px 12px rgba(99,102,241,0.25)", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                Book Now
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDirections(); }}
                style={{ width:46, borderRadius:14, cursor:"pointer",
                  background:"rgba(255,255,255,0.15)", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                  border:"1px solid rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
              </button>
            </div>
          </div>
        </div>

        {showMid && (
          <>
            <div style={{ height:1, background:brd, margin:"0 16px" }} />
            <div style={{ padding:"14px 16px 0", display:"flex", flexDirection:"column", gap:9 }}>
              {address && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:9 }}>
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" style={{ color:fg3, marginTop:2, flexShrink:0 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span style={{ fontSize:13, color:fg2, lineHeight:1.5 }}>{address}</span>
                </div>
              )}
              {phone && (
                <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={fg3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 9.13a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.44a16 16 0 006.29 6.29l.75-.75a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <span style={{ fontSize:13, color:fg2 }}>{phone}</span>
                </div>
              )}
            </div>
            {nearbyServices.length > 0 && (
              <div style={{ padding:"12px 16px 0" }}>
                <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:fg3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Services</p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {nearbyServices.map((s,i) => (
                    <span key={i} style={{ fontSize:12, fontWeight:600, background:chip, color:chipFg, padding:"4px 10px", borderRadius:20, border:`1px solid ${brd}` }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {showFull && (
          <div style={{ padding:"16px 16px 110px" }}>
            {fetching ? (
              <>
                <div style={{ height:1, background:brd, margin:"16px 0 14px" }} />
                {[75,55,68,82,50].map((w,i) => <div key={i} className="mv-shimmer" style={{ height:14, width:`${w}%`, marginBottom:10 }} />)}
              </>
            ) : (
              <>
                {detailCats.length > 0 && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ height:1, background:brd, marginBottom:14 }} />
                    <p style={{ margin:"0 0 12px", fontSize:11, fontWeight:700, color:fg3, textTransform:"uppercase", letterSpacing:"0.06em" }}>All Services</p>
                    {detailCats.slice(0,5).map((cat,ci) => (
                      <div key={ci} style={{ marginBottom:16 }}>
                        <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:fg }}>{cat.name}</p>
                        {(cat.services||[]).slice(0,5).map((svc,si) => (
                          <div key={si} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${brd}` }}>
                            <span style={{ fontSize:13, color:fg2, flex:1, paddingRight:12 }}>{svc.name}</span>
                            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                              {svc.duration && <span style={{ fontSize:11, color:fg3 }}>{svc.duration}m</span>}
                              {svc.price != null && <span style={{ fontSize:13, fontWeight:700, color:"#6366f1" }}>₹{svc.price}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {detailRating > 0 && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ height:1, background:brd, marginBottom:14 }} />
                    <p style={{ margin:"0 0 14px", fontSize:11, fontWeight:700, color:fg3, textTransform:"uppercase", letterSpacing:"0.06em" }}>Reviews</p>
                    <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                      <div style={{ textAlign:"center", flexShrink:0 }}>
                        <p style={{ fontSize:42, fontWeight:900, color:fg, margin:0, lineHeight:1 }}>{detailRating.toFixed(1)}</p>
                        <Stars rating={detailRating} />
                        <p style={{ fontSize:11, color:fg3, margin:"4px 0 0" }}>{detailReviewCount} reviews</p>
                      </div>
                      {breakdown && (
                        <div style={{ flex:1 }}>
                          {[5,4,3,2,1].map(n => {
                            const count = breakdown[n] || 0;
                            const total = detailReviewCount || 1;
                            const pct   = Math.round((count/total)*100);
                            return (
                              <div key={n} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                                <span style={{ fontSize:10, color:fg3, width:6, flexShrink:0 }}>{n}</span>
                                <div style={{ flex:1, height:5, borderRadius:3, background:brd, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:3, transition:"width 0.6s ease" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {detailReviews.slice(0,3).map((rev,ri) => (
                      <div key={ri} style={{ padding:"12px 0", borderBottom: ri < Math.min(detailReviews.length,3)-1 ? `1px solid ${brd}` : "none" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                            background:`hsl(${(ri*97+210)%360},55%,58%)`,
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff" }}>
                            {(rev.customerName||rev.userName||"A").charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ margin:0, fontSize:13, fontWeight:700, color:fg, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {rev.customerName||rev.userName||"Customer"}
                            </p>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <Stars rating={rev.salonRating||rev.rating||5} />
                              {rev.createdAt && <span style={{ fontSize:10, color:fg3 }}>{new Date(rev.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>}
                            </div>
                          </div>
                        </div>
                        {rev.reviewText && <p style={{ margin:0, fontSize:13, color:fg2, lineHeight:1.6 }}>{rev.reviewText}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showMid && (
        <div style={{ flexShrink:0, background:bg, borderTop:`1px solid ${brd}`,
          padding:"12px 16px", paddingBottom:"calc(12px + env(safe-area-inset-bottom,0px))" }}>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => navigate(salonPath(salon))}
              style={{ flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontWeight:800, fontSize:15,
                boxShadow:"0 4px 20px rgba(99,102,241,0.45)" }}>
              Book Now →
            </button>
            <button onClick={onDirections}
              style={{ width:50, borderRadius:14, border:`1.5px solid ${brd}`, cursor:"pointer",
                background:secBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#6366f1" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   SALON SHEET
══════════════════════════════════════════ */
const PEEK_H = 340;

function SalonSheet({ salonId, onClose }) {
  const sheetRef  = useRef(null);
  const scrollRef = useRef(null);
  const snapRef   = useRef("peek");
  const drag      = useRef({ active: false, startY: 0, lastY: 0, vel: 0, ts: 0, startSnap: "peek" });
  const [snap, setSnap] = useState("peek");

  const getY = () => ({ peek: window.innerHeight - PEEK_H, full: 0 });
  const applyY = (y) => { if (!sheetRef.current) return; sheetRef.current.style.transform = `translateY(${Math.max(0,y)}px)`; };
  const setTrans = (on) => { if (!sheetRef.current) return; sheetRef.current.style.transition = on ? "transform 0.32s cubic-bezier(0.22,1,0.36,1)" : "none"; };

  const doSnap = useCallback((s) => {
    snapRef.current = s;
    setTrans(true);
    applyY(getY()[s]);
    setSnap(s);
    if (s !== "full" && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []); // eslint-disable-line

  const doClose = useCallback(() => {
    setTrans(true);
    applyY(window.innerHeight);
    setTimeout(onClose, 300);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transition = "none";
    sheetRef.current.style.transform  = `translateY(${window.innerHeight}px)`;
    requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      sheetRef.current.style.transition = "transform 0.38s cubic-bezier(0.22,1,0.36,1)";
      sheetRef.current.style.transform  = `translateY(${getY().peek}px)`;
    });
  }, []); // eslint-disable-line

  function onHandleDown(e) {
    if (snapRef.current === "full" && (scrollRef.current?.scrollTop ?? 0) > 4) return;
    e.preventDefault();
    drag.current = { active: true, startY: e.clientY, lastY: e.clientY, vel: 0, ts: Date.now(), startSnap: snapRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    setTrans(false);
  }
  function onHandleMove(e) {
    if (!drag.current.active) return;
    const now = Date.now();
    drag.current.vel  = (e.clientY - drag.current.lastY) / Math.max(now - drag.current.ts, 1);
    drag.current.lastY = e.clientY;
    drag.current.ts   = now;
    const base = getY()[drag.current.startSnap];
    const raw  = base + (e.clientY - drag.current.startY);
    const clamped = raw < 0 ? raw * 0.18 : raw > window.innerHeight - 60 ? window.innerHeight - 60 + (raw - (window.innerHeight - 60)) * 0.25 : raw;
    applyY(clamped);
  }
  function onHandleUp(e) {
    if (!drag.current.active) return;
    drag.current.active = false;
    const vel = drag.current.vel;
    const dy  = e.clientY - drag.current.startY;
    if (vel > 0.45) {
      if (drag.current.startSnap === "peek") doClose(); else doSnap("peek");
    } else if (vel < -0.45) {
      doSnap("full");
    } else {
      const curY = getY()[drag.current.startSnap] + dy;
      const mid  = getY().peek / 2;
      if (curY < mid) doSnap("full");
      else if (curY > window.innerHeight - 80) doClose();
      else doSnap("peek");
    }
  }

  return (
    <div ref={sheetRef} style={{
      position: "fixed", left: 0, right: 0, bottom: 0, height: "100vh",
      zIndex: 400, background: "var(--t-bg,#0d0520)",
      borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.45)",
      display: "flex", flexDirection: "column", willChange: "transform", overflow: "hidden",
    }}>
      <style>{`@keyframes mvSpin{to{transform:rotate(360deg)}}`}</style>
      <div
        onPointerDown={onHandleDown} onPointerMove={onHandleMove}
        onPointerUp={onHandleUp} onPointerCancel={onHandleUp}
        style={{ flexShrink:0, height:28, display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"grab", touchAction:"none", userSelect:"none", position:"relative", zIndex:2 }}
      >
        <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.22)" }} />
      </div>
      <div ref={scrollRef} style={{ flex:1, overflowY: snap==="full" ? "auto" : "hidden", WebkitOverflowScrolling:"touch" }}>
        <Suspense fallback={
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:220 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"conic-gradient(from 0deg,#6366f1,#a78bfa,transparent)", animation:"mvSpin 0.85s linear infinite", padding:3 }}>
              <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"var(--t-bg,#0d0520)" }} />
            </div>
          </div>
        }>
          <SalonDetails salonId={salonId} onClose={doClose} />
        </Suspense>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function MapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();

  const [salons,        setSalons]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [coords,        setCoords]        = useState(null);
  const [defaultCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [selected,      setSelected]      = useState(null);
  const [modalId,       setModalId]       = useState(null);
  const [sort,          setSort]          = useState("nearby");
  const [heading,       setHeading]       = useState(null);
  const [accuracy,      setAccuracy]      = useState(null);
  const [followMode,    setFollowMode]    = useState(false);
  const [compassActive, setCompassActive] = useState(false);
  const [routeData,     setRouteData]     = useState(null);
  const [routeLoading,  setRouteLoading]  = useState(false);
  const [mapMounted,    setMapMounted]    = useState(false);

  const mapRef           = useRef(null);
  const watchIdRef       = useRef(null);
  const compassHandlerRef = useRef(null);
  const coordsRef        = useRef(null);
  const didInitialPanRef = useRef(false);
  const prevSelectedRef  = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "glowloox-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  /* ── Fetch nearby salons ── */
  const fetchSalons = useCallback(async (lat, lng, sortBy) => {
    setLoading(true);
    try {
      const qs = `?latitude=${lat}&longitude=${lng}&sort=${sortBy}&limit=60`;
      const r  = await API.get(`/public/salons/nearby${qs}`);
      setSalons(r.data.data?.salons || []);
    } catch { setSalons([]); }
    finally { setLoading(false); }
  }, []);

  /* ── Mount: initial location + live tracking ── */
  useEffect(() => {
    if (!navigator.geolocation) { fetchSalons(20.5937, 78.9629, sort); return; }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c); coordsRef.current = c;
        setAccuracy(p.coords.accuracy);
        fetchSalons(c.lat, c.lng, sort);
      },
      () => fetchSalons(20.5937, 78.9629, sort),
      { timeout: 7000, enableHighAccuracy: true }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c); coordsRef.current = c;
        setAccuracy(p.coords.accuracy);
        if (!compassHandlerRef.current &&
            p.coords.heading != null &&
            !isNaN(p.coords.heading) &&
            (p.coords.speed || 0) > 0.4) {
          setHeading(p.coords.heading);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (compassHandlerRef.current) {
        window.removeEventListener("deviceorientationabsolute", compassHandlerRef.current, true);
        window.removeEventListener("deviceorientation",         compassHandlerRef.current, true);
      }
    };
  }, []); // eslint-disable-line

  /* ── Re-fetch on sort change ── */
  useEffect(() => {
    if (!coordsRef.current) return;
    fetchSalons(coordsRef.current.lat, coordsRef.current.lng, sort);
  }, [sort]); // eslint-disable-line

  /* ── Initial pan to user location once map + coords are ready ── */
  useEffect(() => {
    if (didInitialPanRef.current || !coords || !mapMounted || !mapRef.current) return;
    didInitialPanRef.current = true;
    mapRef.current.panTo({ lat: coords.lat, lng: coords.lng });
    mapRef.current.setZoom(15);
  }, [coords, mapMounted]);

  /* ── Follow mode: pan map as user moves ── */
  useEffect(() => {
    if (!followMode || !coords || !mapRef.current) return;
    mapRef.current.panTo({ lat: coords.lat, lng: coords.lng });
  }, [coords?.lat, coords?.lng, followMode]); // eslint-disable-line

  /* ── Pan down when salon selected (to reveal card) ── */
  useEffect(() => {
    if (!selected?._id || selected._id === prevSelectedRef.current || !mapRef.current) return;
    prevSelectedRef.current = selected._id;
    const peekH = Math.min(220, window.innerHeight * 0.28);
    mapRef.current.panBy(0, peekH * 0.8);
  }, [selected?._id]); // eslint-disable-line

  /* ── Fit bounds to show full route ── */
  useEffect(() => {
    if (!routeData || !mapRef.current || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    routeData.polyline.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 220, left: 60 });
  }, [routeData]);

  /* ── Update map styles when theme changes ── */
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({ styles: isDark ? darkMapStyles : lightMapStyles });
  }, [isDark]);

  /* ── Compass request ── */
  const requestCompass = useCallback(async () => {
    if (compassHandlerRef.current) {
      window.removeEventListener("deviceorientationabsolute", compassHandlerRef.current, true);
      window.removeEventListener("deviceorientation",         compassHandlerRef.current, true);
      compassHandlerRef.current = null;
      setCompassActive(false);
      setHeading(null);
      return;
    }
    try {
      if (typeof DeviceOrientationEvent?.requestPermission === "function") {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm !== "granted") return;
      }
    } catch { return; }

    const handler = (e) => {
      let h = null;
      if (e.webkitCompassHeading != null) {
        h = e.webkitCompassHeading;
      } else if (e.alpha != null) {
        h = (360 - e.alpha) % 360;
      }
      if (h !== null) setHeading(h);
    };

    window.addEventListener("deviceorientationabsolute", handler, true);
    window.addEventListener("deviceorientation",         handler, true);
    compassHandlerRef.current = handler;
    setCompassActive(true);
  }, []);

  /* ── Fetch route from OSRM ── */
  const fetchRoute = useCallback(async (salon) => {
    const from = coordsRef.current;
    const to   = salon?.location?.coordinates;
    if (!from || !to) return;
    setRouteLoading(true);
    setRouteData(null);
    setModalId(null);
    setSelected(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const json = await res.json();
      const route = json.routes?.[0];
      if (!route) throw new Error("no route");
      const polyline = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const steps = (route.legs?.[0]?.steps || []).map(s => ({
        instruction: s.maneuver?.type === "arrive"
          ? `Arrive at ${salon.name}`
          : formatStep(s),
        distance: s.distance,
        type: s.maneuver?.type,
        modifier: s.maneuver?.modifier,
      }));
      setRouteData({
        polyline,
        distance: route.distance,
        duration: route.duration,
        steps,
        salonName: salon.name,
        destLat: to[1],
        destLng: to[0],
      });
    } catch {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to[1]},${to[0]}&travelmode=driving`, "_blank");
    } finally {
      setRouteLoading(false);
    }
  }, []);

  /* ── Auto-route from URL params ── */
  const autoRoutedRef = useRef(false);
  useEffect(() => {
    if (autoRoutedRef.current) return;
    const destLat   = parseFloat(searchParams.get("destLat"));
    const destLng   = parseFloat(searchParams.get("destLng"));
    const salonName = searchParams.get("salonName") || "Destination";
    if (isNaN(destLat) || isNaN(destLng)) return;
    autoRoutedRef.current = true;
    const fakeSalon = {
      name: decodeURIComponent(salonName),
      location: { coordinates: [destLng, destLat] },
    };
    if (coordsRef.current) {
      fetchRoute(fakeSalon);
    } else {
      navigator.geolocation?.getCurrentPosition(
        (p) => {
          const c = { lat: p.coords.latitude, lng: p.coords.longitude };
          coordsRef.current = c; setCoords(c);
          fetchRoute(fakeSalon);
        },
        () => fetchRoute(fakeSalon),
        { timeout: 6000, enableHighAccuracy: true }
      );
    }
  }, [searchParams, fetchRoute]); // eslint-disable-line

  /* ── Back button while modal open ── */
  useEffect(() => {
    if (!modalId) return;
    window.history.pushState({ mvModal: true }, "");
    const onPop = () => { setModalId(null); setSelected(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [modalId]);

  const routePath = routeData?.polyline.map(([lat, lng]) => ({ lat, lng })) || [];

  return (
    <>
      <style>{`@keyframes mvSpin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ position:"fixed", inset:0, background: isDark ? "#111827" : "#f8fafc" }}>

        {/* Top bar */}
        <div style={{
          position: "absolute", top:0, left:0, right:0, zIndex:1000,
          background: isDark ? "rgba(17,24,39,0.92)" : "rgba(248,250,252,0.96)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.1)"}`,
          padding: "12px 16px",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button onClick={() => navigate(-1)} style={{ background:"none", border:"none", cursor:"pointer",
            color: isDark ? "#9ca3af" : "#64748b", padding:4, flexShrink:0, display:"flex", alignItems:"center" }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:17, color: isDark ? "#fff" : "#0f172a", letterSpacing:"-0.02em" }}>
              Nearby Businesses
            </p>
            {!loading && (
              <p style={{ margin:0, fontSize:12, color: isDark ? "#6b7280" : "#94a3b8", display:"flex", alignItems:"center", gap:5 }}>
                {salons.length} found
                {followMode && (
                  <span style={{ background:"linear-gradient(135deg,#4285f4,#1a73e8)", color:"#fff",
                    fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:999 }}>
                    LIVE
                  </span>
                )}
                {compassActive && (
                  <span style={{ background:"linear-gradient(135deg,#ea4335,#c0392b)", color:"#fff",
                    fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:999 }}>
                    COMPASS
                  </span>
                )}
              </p>
            )}
          </div>

          <div style={{ display:"flex", gap:6 }}>
            {[{ key:"nearby", label:"Nearest" },{ key:"rated", label:"Top Rated" },{ key:"booked", label:"Popular" }].map(o => (
              <button key={o.key} onClick={() => setSort(o.key)}
                style={{
                  background: sort === o.key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : isDark ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.08)",
                  color: sort === o.key ? "#fff" : isDark ? "#9ca3af" : "#6366f1",
                  border:"none", borderRadius:20, padding:"5px 11px",
                  fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* GPS accuracy badge */}
        {accuracy != null && (
          <div style={{
            position: "absolute",
            bottom: "calc(80px + env(safe-area-inset-bottom,0px))",
            left: 12, zIndex: 1000,
            background: isDark ? "rgba(17,24,39,0.88)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            borderRadius: 10, padding: "5px 10px",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: accuracy < 15 ? "#22c55e" : accuracy < 50 ? "#f59e0b" : "#ef4444",
              boxShadow: `0 0 0 2px ${accuracy < 15 ? "rgba(34,197,94,0.25)" : accuracy < 50 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#9ca3af" : "#64748b" }}>
              ±{Math.round(accuracy)}m
            </span>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div style={{ position:"absolute", inset:0, zIndex:900,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: isDark ? "rgba(17,24,39,0.6)" : "rgba(248,250,252,0.6)",
            backdropFilter:"blur(4px)" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%",
                background:"conic-gradient(from 0deg,#6366f1,#a78bfa,transparent)",
                animation:"mvSpin 0.85s linear infinite", padding:4 }}>
                <div style={{ width:"100%", height:"100%", borderRadius:"50%", background: isDark ? "#111827" : "#f8fafc" }} />
              </div>
              <p style={{ color: isDark ? "#9ca3af" : "#64748b", fontSize:13, margin:0 }}>Finding nearby businesses…</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div style={{ position:"absolute", inset:0, top:72, overflow:"hidden" }}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              defaultCenter={defaultCenter}
              defaultZoom={13}
              options={{
                disableDefaultUI: true,
                gestureHandling: "greedy",
                clickableIcons: false,
                styles: isDark ? darkMapStyles : lightMapStyles,
              }}
              onLoad={(map) => { mapRef.current = map; setMapMounted(true); }}
              onDragStart={() => setFollowMode(false)}
            >
              {/* User location dot + heading cone */}
              {coords && (
                <OverlayView
                  position={{ lat: coords.lat, lng: coords.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
                >
                  <UserLocationOverlay heading={heading} />
                </OverlayView>
              )}

              {/* GPS accuracy ring */}
              {coords && accuracy != null && accuracy < 2000 && (
                <Circle
                  center={{ lat: coords.lat, lng: coords.lng }}
                  radius={accuracy}
                  options={{
                    fillColor: "#4285f4", fillOpacity: 0.07,
                    strokeColor: "#4285f4", strokeOpacity: 0.28,
                    strokeWeight: 1.5, clickable: false,
                  }}
                />
              )}

              {/* Route: casing + line */}
              {routeData && routePath.length > 0 && (
                <>
                  <Polyline
                    path={routePath}
                    options={{ strokeColor: "#fff", strokeWeight: 10, strokeOpacity: 0.35, geodesic: true, clickable: false }}
                  />
                  <Polyline
                    path={routePath}
                    options={{ strokeColor: "#4285f4", strokeWeight: 6, strokeOpacity: 0.92, geodesic: true, clickable: false }}
                  />
                  <OverlayView
                    position={{ lat: routeData.destLat, lng: routeData.destLng }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
                  >
                    <DestPin />
                  </OverlayView>
                </>
              )}

              {/* Salon markers */}
              {salons.filter(s => bizLat(s) && bizLng(s)).map(s => (
                <OverlayView
                  key={s._id}
                  position={{ lat: bizLat(s), lng: bizLng(s) }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
                >
                  <SalonMarker
                    salon={s}
                    isActive={selected?._id === s._id}
                    onClick={() => { setRouteData(null); setSelected(s); setModalId(s._id); }}
                  />
                </OverlayView>
              ))}
            </GoogleMap>
          ) : (
            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
              background: isDark ? "#111827" : "#f1f5f9" }}>
              <div style={{ width:36, height:36, borderRadius:"50%",
                background:"conic-gradient(from 0deg,#6366f1,#a78bfa,transparent)",
                animation:"mvSpin 0.85s linear infinite", padding:3 }}>
                <div style={{ width:"100%", height:"100%", borderRadius:"50%", background: isDark ? "#111827" : "#f1f5f9" }} />
              </div>
            </div>
          )}

          {/* Floating map controls (compass + locate) */}
          <MapControls
            mapRef={mapRef}
            coords={coords}
            followMode={followMode}
            setFollowMode={setFollowMode}
            onCompass={requestCompass}
            compassActive={compassActive}
            heading={heading}
          />

          {/* GlowLoox watermark */}
          <div style={{
            position: "absolute", bottom: 90, left: 12, zIndex: 10,
            pointerEvents: "none", display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{
              fontWeight: 900, fontSize: 13, letterSpacing: "-0.02em",
              color: "#6366f1", opacity: 0.9,
              textShadow: isDark ? "0 1px 6px rgba(0,0,0,0.6)" : "0 1px 4px rgba(255,255,255,0.9)",
            }}>GlowLoox</span>
          </div>
        </div>

        {/* Route loading spinner */}
        {routeLoading && (
          <div style={{ position:"absolute", bottom:80, left:"50%", transform:"translateX(-50%)", zIndex:1200,
            background: isDark ? "rgba(17,24,39,0.95)" : "rgba(255,255,255,0.97)",
            backdropFilter:"blur(12px)", borderRadius:16, padding:"12px 20px",
            display:"flex", alignItems:"center", gap:10,
            boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
            <div style={{ width:18, height:18, borderRadius:"50%",
              background:"conic-gradient(from 0deg,#4285f4,#a78bfa,transparent)",
              animation:"mvSpin 0.7s linear infinite", padding:2 }}>
              <div style={{ width:"100%", height:"100%", borderRadius:"50%", background: isDark ? "#111827" : "#fff" }} />
            </div>
            <span style={{ fontSize:13, fontWeight:600, color: isDark ? "#e5e7eb" : "#1e293b" }}>Finding route…</span>
          </div>
        )}
      </div>

      {/* Full SalonDetails sheet */}
      {modalId && (
        <SalonSheet
          key={modalId}
          salonId={modalId}
          onClose={() => { setModalId(null); setSelected(null); window.history.back(); }}
        />
      )}

      {/* In-map directions panel */}
      {routeData && (
        <DirectionsPanel
          routeData={routeData}
          isDark={isDark}
          onClose={() => setRouteData(null)}
        />
      )}
    </>
  );
}

/* ── Step instruction formatter ── */
function formatStep(s) {
  const mod = s.maneuver?.modifier;
  const name = s.name || "";
  const type = s.maneuver?.type;
  if (type === "depart") return `Head ${mod || "forward"}${name ? ` on ${name}` : ""}`;
  if (type === "turn") {
    if (mod === "left")        return `Turn left${name ? ` onto ${name}` : ""}`;
    if (mod === "right")       return `Turn right${name ? ` onto ${name}` : ""}`;
    if (mod === "slight left") return `Keep left${name ? ` toward ${name}` : ""}`;
    if (mod === "slight right") return `Keep right${name ? ` toward ${name}` : ""}`;
    if (mod === "sharp left")  return `Sharp left${name ? ` onto ${name}` : ""}`;
    if (mod === "sharp right") return `Sharp right${name ? ` onto ${name}` : ""}`;
    if (mod === "uturn")       return `Make a U-turn${name ? ` on ${name}` : ""}`;
  }
  if (type === "roundabout" || type === "rotary") return `Enter roundabout${name ? `, take exit toward ${name}` : ""}`;
  if (type === "merge")   return `Merge${name ? ` onto ${name}` : ""}`;
  if (type === "on ramp") return `Take the ramp${name ? ` onto ${name}` : ""}`;
  if (type === "off ramp") return `Exit${name ? ` toward ${name}` : ""}`;
  return `Continue${name ? ` on ${name}` : ""}`;
}

/* ── Step direction icon ── */
function StepIcon({ type, modifier }) {
  const col = "#4285f4";
  const s = { width: 28, height: 28, borderRadius: 8, background: "rgba(66,133,244,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (type === "arrive") return <div style={s}><svg viewBox="0 0 24 24" width={14} height={14} fill={col}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div>;
  if (type === "depart") return <div style={s}><svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={col} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>;
  if (modifier === "left" || modifier === "sharp left")
    return <div style={s}><svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={col} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg></div>;
  if (modifier === "right" || modifier === "sharp right")
    return <div style={s}><svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={col} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>;
  if (modifier === "uturn")
    return <div style={s}><svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={col} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10a7 7 0 107 7v-3"/></svg></div>;
  return <div style={s}><svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={col} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div>;
}

/* ── Directions panel (bottom slide-up) ── */
function DirectionsPanel({ routeData, isDark, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const bg  = isDark ? "#111827" : "#fff";
  const fg  = isDark ? "#fff"    : "#0f172a";
  const fg2 = isDark ? "#9ca3af" : "#64748b";
  const brd = isDark ? "#374151" : "#f1f5f9";

  const distKm  = routeData.distance < 1000
    ? `${Math.round(routeData.distance)} m`
    : `${(routeData.distance / 1000).toFixed(1)} km`;
  const durMin  = Math.ceil(routeData.duration / 60);
  const durStr  = durMin < 60 ? `${durMin} min` : `${Math.floor(durMin/60)}h ${durMin%60}m`;

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 500,
      background: bg, borderRadius: "20px 20px 0 0",
      boxShadow: "0 -6px 32px rgba(0,0,0,0.22)",
      paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))",
      transition: "max-height 0.3s cubic-bezier(0.22,1,0.36,1)",
      maxHeight: expanded ? "70vh" : "auto",
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px" }}>
        <div style={{ width:36, height:4, borderRadius:2, background: isDark ? "rgba(255,255,255,0.18)" : "#e2e8f0" }} />
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"0 16px 12px" }}>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontSize:13, color:fg2, fontWeight:600 }}>Route to</p>
          <p style={{ margin:0, fontSize:17, fontWeight:800, color:fg, letterSpacing:"-0.02em",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {routeData.salonName}
          </p>
        </div>
        <div style={{ textAlign:"center" }}>
          <p style={{ margin:0, fontSize:22, fontWeight:900, color:"#4285f4", letterSpacing:"-0.03em" }}>{durStr}</p>
          <p style={{ margin:0, fontSize:11, color:fg2, fontWeight:600 }}>{distKm}</p>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, padding:"0 16px 14px" }}>
        <button
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${routeData.destLat},${routeData.destLng}&travelmode=driving`, "_blank")}
          style={{ flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#4285f4,#1a73e8)", color:"#fff",
            fontWeight:800, fontSize:15, boxShadow:"0 4px 16px rgba(66,133,244,0.4)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          Open in Google Maps
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ width:48, borderRadius:14, border:`1.5px solid ${brd}`, cursor:"pointer",
            background: isDark ? "#1f2937" : "#f8fafc",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={fg2} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
            <path d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <button
          onClick={onClose}
          style={{ width:48, borderRadius:14, border:`1.5px solid ${brd}`, cursor:"pointer",
            background: isDark ? "#1f2937" : "#f8fafc",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke={fg2} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      {expanded && (
        <div style={{ overflowY:"auto", flex:1, borderTop:`1px solid ${brd}` }}>
          {routeData.steps.map((step, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
              padding:"10px 16px", borderBottom: i < routeData.steps.length - 1 ? `1px solid ${brd}` : "none" }}>
              <StepIcon type={step.type} modifier={step.modifier} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:600, color:fg,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {step.instruction}
                </p>
              </div>
              <span style={{ fontSize:11, color:fg2, fontWeight:600, flexShrink:0 }}>
                {step.distance < 1000 ? `${Math.round(step.distance)}m` : `${(step.distance/1000).toFixed(1)}km`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
