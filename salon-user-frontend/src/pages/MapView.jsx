import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../services/api";
import { salonPath } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";
import DirectionsModal from "../components/DirectionsModal";

/* ── Fix Leaflet default icon path (Vite/React build issue) ── */
import markerIcon2x   from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon     from "leaflet/dist/images/marker-icon.png";
import markerShadow   from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

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

/* ── Business pin icon — circular profile photo ── */
function salonIcon(isActive, name, distMetres, photoUrl) {
  const size = isActive ? 48 : 38;
  const initial = (name || "S").charAt(0).toUpperCase();
  const distLabel = typeof distMetres === "number"
    ? `<span style="font-size:9px;font-weight:700;color:${isActive ? "#6366f1" : "#64748b"};margin-top:1px;white-space:nowrap;">${fmtDist(distMetres)}</span>`
    : "";
  const shortName = name ? (name.length > 14 ? name.slice(0, 13) + "\u2026" : name) : "";

  const innerHtml = photoUrl
    ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size / 2.6)}px;font-weight:900;color:#fff;border-radius:50%;">${initial}</div>`;

  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:0;">
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;
        border:${isActive ? "3px" : "2.5px"} solid ${isActive ? "#6366f1" : "#fff"};
        box-shadow:0 3px 14px rgba(99,102,241,${isActive ? "0.72" : "0.38"}),0 1px 4px rgba(0,0,0,0.18);
        background:linear-gradient(135deg,#6366f1,#8b5cf6);
        flex-shrink:0;
      ">${innerHtml}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${isActive ? "#6366f1" : "#fff"};margin-top:-1px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.18));"></div>
      ${shortName ? `<div style="background:${isActive ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.96)"};color:${isActive ? "#fff" : "#1e293b"};font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,0.18);white-space:nowrap;margin-top:2px;border:1px solid ${isActive ? "transparent" : "rgba(99,102,241,0.15)"};max-width:90px;overflow:hidden;text-overflow:ellipsis;">${shortName}</div>` : ""}
      ${distLabel ? `<div style="margin-top:1px;">${distLabel}</div>` : ""}
    </div>`,
    iconSize: [100, 90],
    iconAnchor: [50, 55],
    popupAnchor: [0, -60],
  });
}

/* ── User location dot ── */
const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 0 0 6px rgba(99,102,241,0.22),0 2px 8px rgba(99,102,241,0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* ── Locate Me button ── */
function LocateMe({ onLocate }) {
  const map = useMap();
  const handleClick = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => {
        map.flyTo([p.coords.latitude, p.coords.longitude], 14, { animate: true, duration: 0.8 });
        onLocate({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {},
      { timeout: 6000 }
    );
  };
  return (
    <button
      onClick={handleClick}
      title="Locate me"
      style={{
        position: "absolute", top: 76, right: 12, zIndex: 1000,
        width: 40, height: 40,
        background: "#fff", border: "none", borderRadius: 10,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
        <circle cx="12" cy="12" r="9" strokeDasharray="4 2"/>
      </svg>
    </button>
  );
}

/* ── FlyTo ── */
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

/* ── Star rating display ── */
function Stars({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  return (
    <span style={{ display: "flex", gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 20 20" width={13} height={13}>
          {i <= full
            ? <path fill="#fbbf24" d="M10 1l2.4 6.8H20l-5.9 4.3 2.3 6.9L10 14.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/>
            : i === full + 1 && half
              ? <>
                  <path fill="#e2e8f0" d="M10 1l2.4 6.8H20l-5.9 4.3 2.3 6.9L10 14.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/>
                  <path fill="#fbbf24" d="M10 1v13.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/>
                </>
              : <path fill="#e2e8f0" d="M10 1l2.4 6.8H20l-5.9 4.3 2.3 6.9L10 14.9l-6.4 4.1 2.3-6.9L0 7.8h7.6z"/>
          }
        </svg>
      ))}
    </span>
  );
}

/* ══════════════════════════════════════════
   RICH SALON DETAIL CARD (Google Maps style)
══════════════════════════════════════════ */
function SalonCard({ salon, userCoords, onClose, onDirections, navigate, isDark }) {
  const distM     = bizDist(salon, userCoords?.lat, userCoords?.lng);
  const dist      = distM != null ? fmtDist(distM) : null;
  const coverImg  = salon.coverPhoto || salon.photos?.[0];
  const logoImg   = salon.logo || salon.profilePhoto;
  const address   = [salon.locality, salon.address, salon.city]
    .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  const phone     = salon.phone || salon.contactPhone;
  const rating    = salon.averageRating || 0;
  const reviews   = salon.reviewCount   || salon.totalReviews || 0;
  const category  = salon.category      || salon.businessType;
  const services  = Array.isArray(salon.services)
    ? salon.services.slice(0, 6).map(s => (typeof s === "string" ? s : s?.name)).filter(Boolean)
    : [];

  const bg    = isDark ? "#111827" : "#fff";
  const fg    = isDark ? "#fff"    : "#0f172a";
  const fg2   = isDark ? "#9ca3af" : "#64748b";
  const fg3   = isDark ? "#6b7280" : "#94a3b8";
  const brd   = isDark ? "#1f2937" : "#f1f5f9";
  const chip  = isDark ? "#1f2937" : "#f1f5f9";
  const chipFg = isDark ? "#e5e7eb" : "#475569";

  return (
    <div
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
        background: bg,
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.28)",
        overflow: "hidden",
        paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        animation: "mvSlideUp 0.28s cubic-bezier(0.22,1,0.36,1) both",
        maxHeight: "88vh",
        overflowY: "auto",
      }}
    >
      <style>{`@keyframes mvSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {/* Drag handle */}
      <div style={{ width: 36, height: 4, borderRadius: 2, background: brd, margin: "12px auto 0" }} />

      {/* ── Cover photo hero ── */}
      <div style={{ position: "relative", height: 160, background: isDark ? "#1f2937" : "#e2e8f0", marginTop: 10, overflow: "hidden" }}>
        {coverImg
          ? <img src={coverImg} alt={salon.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a78bfa 100%)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: "rgba(255,255,255,0.3)" }}>
                {(salon.name || "S").charAt(0)}
              </span>
            </div>
        }
        {/* Gradient fade at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64,
          background: `linear-gradient(to top, ${bg}, transparent)` }} />
        {/* Close button */}
        <button onClick={onClose}
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.45)",
            border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.5}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* ── Business info ── */}
      <div style={{ padding: "0 16px", marginTop: -20, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 8 }}>
          {/* Logo / avatar bubble */}
          <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", flexShrink: 0,
            border: `3px solid ${bg}`, boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {logoImg
              ? <img src={logoImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff" }}>
                  {(salon.name || "S").charAt(0)}
                </div>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 18, color: fg, lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {salon.name}
            </p>
          </div>
        </div>

        {/* Rating + category */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {rating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Stars rating={rating} />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#fbbf24" }}>{rating.toFixed(1)}</span>
              {reviews > 0 && (
                <span style={{ fontSize: 12, color: fg2 }}>({reviews})</span>
              )}
            </div>
          )}
          {category && (
            <span style={{ fontSize: 11, fontWeight: 700, background: chip, color: "#6366f1",
              padding: "3px 8px", borderRadius: 20, border: "1px solid rgba(99,102,241,0.2)" }}>
              {category}
            </span>
          )}
        </div>

        {/* Distance + address */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          {dist && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>{dist} away</span>
            </div>
          )}
          {address && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" style={{ color: fg3, marginTop: 1, flexShrink: 0 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span style={{ fontSize: 12, color: fg2, lineHeight: 1.4 }}>{address}</span>
            </div>
          )}
          {phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={fg3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 9.13a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.44a16 16 0 006.29 6.29l.75-.75a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <span style={{ fontSize: 12, color: fg2 }}>{phone}</span>
            </div>
          )}
        </div>

        {/* ── Action buttons row (Google Maps style) ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {/* Book */}
          <button
            onClick={() => navigate(salonPath(salon))}
            style={{ flex: 1, padding: "12px 8px", borderRadius: 14, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
              color: "#fff", fontWeight: 800, fontSize: 14,
              boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Book
          </button>

          {/* Directions */}
          <button
            onClick={onDirections}
            style={{ flex: 1, padding: "12px 8px", borderRadius: 14, border: "none", cursor: "pointer",
              background: isDark ? "#1f2937" : "#f1f5f9",
              color: isDark ? "#e5e7eb" : "#1e293b", fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#6366f1" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            <span style={{ color: "#6366f1" }}>Directions</span>
          </button>

          {/* Call (only if phone available) */}
          {phone && (
            <button
              onClick={() => window.open(`tel:${phone}`)}
              style={{ flex: 1, padding: "12px 8px", borderRadius: 14, border: "none", cursor: "pointer",
                background: isDark ? "#1f2937" : "#f1f5f9",
                color: isDark ? "#e5e7eb" : "#1e293b", fontWeight: 700, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#10b981" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.5 9.13a19.79 19.79 0 01-3.07-8.67A2 2 0 012.41 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.44a16 16 0 006.29 6.29l.75-.75a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <span style={{ color: "#10b981" }}>Call</span>
            </button>
          )}
        </div>

        {/* ── Services preview ── */}
        {services.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: fg3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Services
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {services.map((s, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 600, background: chip,
                  color: chipFg, padding: "4px 10px", borderRadius: 20,
                  border: `1px solid ${isDark ? "#374151" : "#e2e8f0"}` }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function MapView() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [salons,    setSalons]   = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [coords,    setCoords]   = useState(null);
  const [center,    setCenter]   = useState([20.5937, 78.9629]);
  const [selected,  setSelected] = useState(null);
  const [dirOpen,   setDirOpen]  = useState(false);
  const [sort,      setSort]     = useState("nearby");

  /* ── Fetch nearby salons ── */
  const fetchSalons = useCallback(async (lat, lng, sortBy) => {
    setLoading(true);
    try {
      const qs = `?latitude=${lat}&longitude=${lng}&sort=${sortBy}&limit=60`;
      const r = await API.get(`/public/salons/nearby${qs}`);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Re-fetch on sort change ── */
  useEffect(() => {
    if (!coords) return;
    fetchSalons(coords.lat, coords.lng, sort);
  }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps

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
          eventHandlers={{ click: () => { setSelected(s); setDirOpen(false); } }}
        />
      )),
  [salons, selected?._id, coords]);

  const handleLocate = useCallback((c) => {
    setCoords(c);
    fetchSalons(c.lat, c.lng, sort);
  }, [sort, fetchSalons]);

  const salonCoords = selected?.location?.coordinates;   // [lng, lat]

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: isDark ? "#111827" : "#f8fafc" }}>

        {/* ── Top bar ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000,
          background: isDark ? "rgba(17,24,39,0.92)" : "rgba(248,250,252,0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.1)"}`,
          padding: "12px 16px",
          paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", cursor: "pointer",
            color: isDark ? "#9ca3af" : "#64748b", padding: 4, flexShrink: 0,
            display: "flex", alignItems: "center" }}>
            <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: isDark ? "#fff" : "#0f172a", letterSpacing: "-0.02em" }}>
              Nearby Businesses
            </p>
            {!loading && (
              <p style={{ margin: 0, fontSize: 12, color: isDark ? "#6b7280" : "#94a3b8" }}>
                {salons.length} found
              </p>
            )}
          </div>

          {/* Sort chips */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "nearby", label: "Nearest"   },
              { key: "rated",  label: "Top Rated"  },
              { key: "booked", label: "Popular"    },
            ].map(o => (
              <button key={o.key} onClick={() => setSort(o.key)}
                style={{
                  background: sort === o.key
                    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                    : isDark ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.08)",
                  color: sort === o.key ? "#fff" : isDark ? "#9ca3af" : "#6366f1",
                  border: "none", borderRadius: 20, padding: "5px 11px",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading overlay ── */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, zIndex: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isDark ? "rgba(17,24,39,0.6)" : "rgba(248,250,252,0.6)",
            backdropFilter: "blur(4px)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%",
                background: "conic-gradient(from 0deg, #6366f1, #a78bfa, transparent)",
                animation: "spin 0.85s linear infinite", padding: 4 }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: isDark ? "#111827" : "#f8fafc" }} />
              </div>
              <p style={{ color: isDark ? "#9ca3af" : "#64748b", fontSize: 13, margin: 0 }}>Finding nearby businesses…</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Map ── */}
        <div style={{ position: "absolute", inset: 0, top: 72 }}>
          <MapContainer
            center={center}
            zoom={13}
            preferCanvas
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FlyTo coords={coords ? { lat: coords.lat, lng: coords.lng } : null} />
            {coords && <Marker position={[coords.lat, coords.lng]} icon={userIcon} />}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={40}
              disableClusteringAtZoom={17}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
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

      {/* ── Tap-outside overlay ── */}
      {selected && !dirOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200 }}
          onClick={() => setSelected(null)}
        />
      )}

      {/* ── Rich business detail card ── */}
      {selected && !dirOpen && (
        <SalonCard
          salon={selected}
          userCoords={coords}
          onClose={() => setSelected(null)}
          onDirections={() => setDirOpen(true)}
          navigate={navigate}
          isDark={isDark}
        />
      )}

      {/* ── In-app directions modal ── */}
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
