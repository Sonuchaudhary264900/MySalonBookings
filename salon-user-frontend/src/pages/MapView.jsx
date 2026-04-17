import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../services/api";
import { salonPath } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";
import DirectionsModal from "../components/DirectionsModal";

const SalonDetails = lazy(() => import("./SalonDetails"));

/* ── Fix Leaflet default icon path (Vite/React build issue) ── */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

/* ── Constants ── */
const NAV_H       = "calc(62px + env(safe-area-inset-bottom, 0px))";
const SNAP_ORDER  = ["peek", "mid", "full"];
const lastSnapMemory = { current: "peek" }; // module-level snap memory

/* ── Helpers ── */
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

/* ── Business pin icon ── */
function salonIcon(isActive, name, distMetres, photoUrl) {
  const size    = isActive ? 48 : 38;
  const initial = (name || "S").charAt(0).toUpperCase();
  const shortName = name ? (name.length > 14 ? name.slice(0, 13) + "\u2026" : name) : "";
  const innerHtml = photoUrl
    ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size / 2.6)}px;font-weight:900;color:#fff;border-radius:50%;">${initial}</div>`;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:0;${isActive ? "animation:markerPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;will-change:transform;" : ""}">
      ${shortName ? `<div style="background:${isActive ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.96)"};color:${isActive ? "#fff" : "#1e293b"};font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.2);white-space:nowrap;margin-bottom:3px;border:1px solid ${isActive ? "transparent" : "rgba(99,102,241,0.15)"};max-width:90px;overflow:hidden;text-overflow:ellipsis;">${shortName}</div>` : ""}
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
        border:${isActive ? "3px" : "2.5px"} solid ${isActive ? "#6366f1" : "#fff"};
        box-shadow:0 3px 14px rgba(99,102,241,${isActive ? "0.72" : "0.38"}),0 1px 4px rgba(0,0,0,0.18);
        background:linear-gradient(135deg,#6366f1,#8b5cf6);flex-shrink:0;
      ">${innerHtml}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${isActive ? "#6366f1" : "#fff"};margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.18));"></div>
    </div>`,
    iconSize: [100, 90], iconAnchor: [50, 72], popupAnchor: [0, -80],
  });
}

/* ── User location dot ── */
const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 0 0 6px rgba(99,102,241,0.22),0 2px 8px rgba(99,102,241,0.5);"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

/* ── Locate Me button ── */
function LocateMe({ onLocate }) {
  const map = useMap();
  return (
    <button
      onClick={() => navigator.geolocation.getCurrentPosition(
        (p) => { map.flyTo([p.coords.latitude, p.coords.longitude], 14, { animate: true, duration: 0.8 }); onLocate({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        () => {}, { timeout: 6000 }
      )}
      title="Locate me"
      style={{ position:"absolute", top:76, right:12, zIndex:1000, width:40, height:40,
        background:"#fff", border:"none", borderRadius:10, boxShadow:"0 2px 12px rgba(0,0,0,0.15)",
        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
        <circle cx="12" cy="12" r="9" strokeDasharray="4 2"/>
      </svg>
    </button>
  );
}

/* ── FlyTo (user locate button) ── */
function FlyTo({ coords }) {
  const map = useMap();
  const prevRef = useRef(null);
  useEffect(() => {
    if (!coords) return;
    if (prevRef.current?.lat === coords.lat && prevRef.current?.lng === coords.lng) return;
    prevRef.current = coords;
    map.flyTo([coords.lat, coords.lng], 13, { animate: true, duration: 0.9 });
  }, [coords, map]);
  return null;
}

/* ── PanForCard — shifts map up when a marker is tapped ── */
function PanForCard({ selectedId }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (!selectedId || selectedId === prev.current) return;
    prev.current = selectedId;
    const peekH = Math.min(220, window.innerHeight * 0.28);
    map.panBy([0, peekH * 0.8], { animate: true, duration: 0.4 });
  }, [selectedId, map]);
  return null;
}

/* ── Star rating display ── */
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
   SALON CARD — Google Maps drag bottom sheet
   3 snap points: peek (hero) → mid (details) → full (reviews)
   Velocity + resistance physics, snap memory, entry animation
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

  /* derived values from nearby-API salon object */
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

  /* theme */
  const bg    = isDark ? "#111827" : "#fff";
  const fg    = isDark ? "#fff"    : "#0f172a";
  const fg2   = isDark ? "#9ca3af" : "#64748b";
  const fg3   = isDark ? "#6b7280" : "#94a3b8";
  const brd   = isDark ? "#374151" : "#e2e8f0";
  const chip  = isDark ? "#1f2937" : "#f1f5f9";
  const chipFg = isDark ? "#e5e7eb" : "#475569";
  const secBg  = isDark ? "#1f2937" : "#f1f5f9";

  /* ── Snap helpers (use snapRef to avoid stale closures) ── */
  const _applyTranslate = (y) => {
    if (!sheetRef.current) return;
    const clamped = Math.max(0, Math.min(window.innerHeight * 0.85, y));
    sheetRef.current.style.transform = `translateY(${clamped}px)`;
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
    Math.abs(getSnapY(s) - y) < Math.abs(getSnapY(best) - y) ? s : best
  , "peek");

  /* ── Entry animation on mount ── */
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

  /* ── Fetch full details on first FULL snap ── */
  useEffect(() => {
    if (snap !== "full" || fetchDone || fetching) return;
    setFetching(true);
    API.get(`/public/salons/${salon._id}`)
      .then(r => setDetails(r.data.data?.salon || r.data.data))
      .catch(() => {})
      .finally(() => { setFetching(false); setFetchDone(true); });
  }, [snap]); // eslint-disable-line

  /* ── Drag gesture (pointer events, handle only) ── */
  function onHandleDown(e) {
    e.preventDefault();
    drag.current = {
      active: true,
      startY: e.clientY,
      startTranslate: getSnapY(snapRef.current),
      lastY: e.clientY,
      vel: 0,
      ts: Date.now(),
      startSnap: snapRef.current,
    };
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

  /* ── Detailed service & review data from fetched details ── */
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
    <div
      ref={sheetRef}
      style={{
        position: "fixed", left: 0, right: 0,
        bottom: NAV_H,
        height: "85vh",
        zIndex: 201,
        background: isDark ? "rgba(17,24,39,0.72)" : "rgba(255,255,255,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        willChange: "transform",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes markerPop { from{transform:scale(0.55);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes mv-shine  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .mv-shimmer {
          background: linear-gradient(90deg,
            ${isDark ? "#1f2937 25%,#374151 50%,#1f2937 75%" : "#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%"});
          background-size: 200% 100%;
          animation: mv-shine 1.4s infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: showFull ? "auto" : "hidden", WebkitOverflowScrolling: "touch" }}
      >

        {/* ════════════════════════════════
            PEEK — Cinema card: image fills full height, info overlaid at bottom
        ════════════════════════════════ */}
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ position: "relative", height: "min(220px, 28vh)", overflow: "hidden",
            flexShrink: 0, touchAction: "none", userSelect: "none", cursor: "grab" }}
        >
          {/* Cover image or deep gradient fallback */}
          {coverImg
            ? <img src={coverImg} alt={salon.name}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", display: "block", pointerEvents: "none" }} />
            : <div style={{ position: "absolute", inset: 0,
                background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" }} />
          }

          {/* Cinematic scrim — lighter so photo stays visible */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
            background: "linear-gradient(to top, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.06) 75%, transparent 100%)"
          }} />

          {/* Drag handle pill */}
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
            zIndex: 3, width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.4)", pointerEvents: "none" }} />

          {/* Close — top-left glass */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ position: "absolute", top: 12, left: 12, zIndex: 4,
              width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer",
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#fff" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* Circular avatar — top-right, subtle border */}
          <div style={{ position: "absolute", top: 12, right: 14, zIndex: 4,
            width: 44, height: 44, borderRadius: "50%", overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.8)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", flexShrink: 0,
            pointerEvents: "none" }}
          >
            {logoImg
              ? <img src={logoImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff" }}>
                  {(salon.name || "S").charAt(0)}
                </div>
            }
          </div>

          {/* Bottom overlay — all salon info on the image */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "14px 16px 14px", zIndex: 3 }}>

            {/* Name + verified badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#fff",
                letterSpacing: "-0.03em", lineHeight: 1.1,
                textShadow: "0 2px 16px rgba(0,0,0,0.6)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {salon.name}
              </p>
              {rating >= 4.5 && (
                <svg viewBox="0 0 24 24" width={18} height={18} fill="#818cf8" style={{ flexShrink: 0 }}>
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              )}
            </div>

            {/* Meta row: rating · distance · open/closed */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {rating > 0 && (
                <span style={{ fontSize: 12, fontWeight: 800, color: "#FDE68A",
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                  ★ {rating.toFixed(1)}
                </span>
              )}
              {reviews > 0 && (
                <span style={{ fontSize: 11, color: "rgba(253,230,138,0.55)" }}>({reviews})</span>
              )}
              {dist && (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>· {dist} away</span>
              )}
              {openStatus && (
                <span style={{ fontSize: 11, fontWeight: 600,
                  color: openStatus.open ? "#4ADE80" : "#F87171",
                  background: openStatus.open ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)",
                  backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
                  padding: "2px 8px", borderRadius: 999,
                  border: `1px solid ${openStatus.open ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                  {openStatus.label}
                </span>
              )}
            </div>

            {/* Action row */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(salonPath(salon)); }}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                Book Now
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDirections(); }}
                style={{ width: 46, borderRadius: 14, cursor: "pointer",
                  background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════
            MID — address + phone + services
        ════════════════════════════════ */}
        {showMid && (
          <>
            <div style={{ height: 1, background: brd, margin: "0 16px" }} />
            <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 9 }}>
              {address && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor"
                    style={{ color: fg3, marginTop: 2, flexShrink: 0 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span style={{ fontSize: 13, color: fg2, lineHeight: 1.5 }}>{address}</span>
                </div>
              )}
              {phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={fg3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 9.13a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.44a16 16 0 006.29 6.29l.75-.75a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <span style={{ fontSize: 13, color: fg2 }}>{phone}</span>
                </div>
              )}
            </div>

            {nearbyServices.length > 0 && (
              <div style={{ padding: "12px 16px 0" }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: fg3,
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Services</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {nearbyServices.map((s, i) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 600, background: chip,
                      color: chipFg, padding: "4px 10px", borderRadius: 20, border: `1px solid ${brd}` }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════
            FULL — detailed services + reviews
        ════════════════════════════════ */}
        {showFull && (
          <div style={{ padding: "16px 16px 110px" }}>

            {fetching ? (
              <>
                <div style={{ height: 1, background: brd, margin: "16px 0 14px" }} />
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: fg3,
                  textTransform: "uppercase", letterSpacing: "0.06em" }}>Loading details…</p>
                {[75, 55, 68, 82, 50].map((w, i) => (
                  <div key={i} className="mv-shimmer"
                    style={{ height: 14, width: `${w}%`, marginBottom: 10 }} />
                ))}
                <div style={{ height: 1, background: brd, margin: "16px 0 14px" }} />
                {[60, 45, 70].map((w, i) => (
                  <div key={i} className="mv-shimmer"
                    style={{ height: 14, width: `${w}%`, marginBottom: 10 }} />
                ))}
              </>
            ) : (
              <>
                {/* Detailed service categories */}
                {detailCats.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ height: 1, background: brd, marginBottom: 14 }} />
                    <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: fg3,
                      textTransform: "uppercase", letterSpacing: "0.06em" }}>All Services</p>
                    {detailCats.slice(0, 5).map((cat, ci) => (
                      <div key={ci} style={{ marginBottom: 16 }}>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: fg }}>{cat.name}</p>
                        {(cat.services || []).slice(0, 5).map((svc, si) => (
                          <div key={si} style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${brd}` }}>
                            <span style={{ fontSize: 13, color: fg2, flex: 1, paddingRight: 12 }}>{svc.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                              {svc.duration && (
                                <span style={{ fontSize: 11, color: fg3 }}>{svc.duration}m</span>
                              )}
                              {svc.price != null && (
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
                                  ₹{svc.price}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reviews */}
                {detailRating > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ height: 1, background: brd, marginBottom: 14 }} />
                    <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: fg3,
                      textTransform: "uppercase", letterSpacing: "0.06em" }}>Reviews</p>

                    {/* Summary row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <p style={{ fontSize: 42, fontWeight: 900, color: fg, margin: 0, lineHeight: 1 }}>
                          {detailRating.toFixed(1)}
                        </p>
                        <Stars rating={detailRating} />
                        <p style={{ fontSize: 11, color: fg3, margin: "4px 0 0" }}>
                          {detailReviewCount} reviews
                        </p>
                      </div>
                      {breakdown && (
                        <div style={{ flex: 1 }}>
                          {[5,4,3,2,1].map(n => {
                            const count = breakdown[n] || 0;
                            const total = detailReviewCount || 1;
                            const pct   = Math.round((count / total) * 100);
                            return (
                              <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: fg3, width: 6, flexShrink: 0 }}>{n}</span>
                                <div style={{ flex: 1, height: 5, borderRadius: 3, background: brd, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`,
                                    background: "linear-gradient(90deg,#6366f1,#8b5cf6)",
                                    borderRadius: 3, transition: "width 0.6s ease" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Individual review cards */}
                    {detailReviews.slice(0, 3).map((rev, ri) => (
                      <div key={ri} style={{ padding: "12px 0",
                        borderBottom: ri < Math.min(detailReviews.length, 3) - 1 ? `1px solid ${brd}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                            background: `hsl(${(ri * 97 + 210) % 360},55%,58%)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, color: "#fff" }}>
                            {(rev.customerName || rev.userName || "A").charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: fg,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rev.customerName || rev.userName || "Customer"}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Stars rating={rev.salonRating || rev.rating || 5} />
                              {rev.createdAt && (
                                <span style={{ fontSize: 10, color: fg3 }}>
                                  {new Date(rev.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {rev.reviewText && (
                          <p style={{ margin: 0, fontSize: 13, color: fg2, lineHeight: 1.6 }}>
                            {rev.reviewText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky CTA — Book + Directions (MID and FULL) ── */}
      {showMid && (
        <div style={{ flexShrink: 0, background: bg, borderTop: `1px solid ${brd}`,
          padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => navigate(salonPath(salon))}
              style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                boxShadow: "0 4px 20px rgba(99,102,241,0.45)" }}>
              Book Now →
            </button>
            <button onClick={onDirections}
              style={{ width: 50, borderRadius: 14, border: `1.5px solid ${brd}`, cursor: "pointer",
                background: secBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#6366f1" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function MapView() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [salons,   setSalons]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [coords,   setCoords]   = useState(null);
  const [center,   setCenter]   = useState([20.5937, 78.9629]);
  const [selected, setSelected] = useState(null);
  const [modalId,  setModalId]  = useState(null);
  const [dirOpen,  setDirOpen]  = useState(false);
  const [sort,     setSort]     = useState("nearby");

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

  /* ── On mount: detect user location ── */
  useEffect(() => {
    if (!navigator.geolocation) { fetchSalons(20.5937, 78.9629, sort); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c); setCenter([c.lat, c.lng]);
        fetchSalons(c.lat, c.lng, sort);
      },
      () => fetchSalons(20.5937, 78.9629, sort),
      { timeout: 7000 }
    );
  }, []); // eslint-disable-line

  /* ── Re-fetch on sort change ── */
  useEffect(() => {
    if (!coords) return;
    fetchSalons(coords.lat, coords.lng, sort);
  }, [sort]); // eslint-disable-line

  /* ── Memoized markers ── */
  const markers = useMemo(() =>
    salons
      .filter(s => bizLat(s) && bizLng(s))
      .map(s => (
        <Marker
          key={s._id}
          position={[bizLat(s), bizLng(s)]}
          icon={salonIcon(
            selected?._id === s._id,
            s.name,
            bizDist(s, coords?.lat, coords?.lng),
            s.coverPhoto || s.photos?.[0] || s.logo || s.profilePhoto
          )}
          eventHandlers={{ click: () => { setSelected(s); setModalId(s._id); setDirOpen(false); } }}
        />
      )),
  [salons, selected?._id, coords]);

  const handleLocate = useCallback((c) => {
    setCoords(c);
    fetchSalons(c.lat, c.lng, sort);
  }, [sort, fetchSalons]);

  /* ── Intercept browser back while modal is open ── */
  useEffect(() => {
    if (!modalId) return;
    window.history.pushState({ mvModal: true }, "");
    const onPop = () => { setModalId(null); setSelected(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [modalId]);

  const salonCoords = selected?.location?.coordinates;

  return (
    <>
      {/* ── Map container — dims on FULL snap ── */}
      <div style={{
        position: "fixed", inset: 0,
        background: isDark ? "#111827" : "#f8fafc",
        filter: "none",
      }}>

        {/* Top bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000,
          background: isDark ? "rgba(17,24,39,0.92)" : "rgba(248,250,252,0.95)",
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

          <div style={{ flex: 1 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:17, color: isDark ? "#fff" : "#0f172a", letterSpacing:"-0.02em" }}>
              Nearby Businesses
            </p>
            {!loading && (
              <p style={{ margin:0, fontSize:12, color: isDark ? "#6b7280" : "#94a3b8" }}>
                {salons.length} found
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
            <style>{`@keyframes mvSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Map */}
        <div style={{ position:"absolute", inset:0, top:72 }}>
          <MapContainer center={center} zoom={13} preferCanvas
            style={{ width:"100%", height:"100%" }} zoomControl={false}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FlyTo coords={coords ? { lat: coords.lat, lng: coords.lng } : null} />
            <PanForCard selectedId={selected?._id} />
            {coords && <Marker position={[coords.lat, coords.lng]} icon={userIcon} />}
            <MarkerClusterGroup
              chunkedLoading maxClusterRadius={40}
              disableClusteringAtZoom={17} spiderfyOnMaxZoom showCoverageOnHover={false}
              iconCreateFunction={(cluster) => L.divIcon({
                className: "",
                html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 10px rgba(99,102,241,0.5);">${cluster.getChildCount()}</div>`,
                iconSize: [36, 36], iconAnchor: [18, 18],
              })}
            >
              {markers}
            </MarkerClusterGroup>
            <LocateMe onLocate={handleLocate} />
          </MapContainer>
        </div>
      </div>

      {/* Full-screen SalonDetails modal */}
      {modalId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "var(--t-bg, #0d0520)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          animation: "mvSlideUp 0.32s cubic-bezier(0.22,1,0.36,1) both",
        }}>
          <style>{`@keyframes mvSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <Suspense fallback={
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"var(--t-bg,#0d0520)" }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:"conic-gradient(from 0deg,#6366f1,#a78bfa,transparent)", animation:"mvSpin 0.85s linear infinite", padding:4 }}>
                <div style={{ width:"100%", height:"100%", borderRadius:"50%", background:"var(--t-bg,#0d0520)" }} />
              </div>
              <style>{`@keyframes mvSpin{to{transform:rotate(360deg)}}`}</style>
            </div>
          }>
            <SalonDetails
              key={modalId}
              salonId={modalId}
              onClose={() => { setModalId(null); setSelected(null); window.history.back(); }}
            />
          </Suspense>
        </div>
      )}

      {/* Directions modal */}
      {dirOpen && selected && salonCoords && (
        <DirectionsModal
          salon={selected}
          salonCoords={salonCoords}
          userCoords={coords}
          onClose={() => setDirOpen(false)}
        />
      )}
    </>
  );
}
