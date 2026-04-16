import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../services/api";
import { salonPath } from "../utils/formatters";
import { useTheme } from "../context/ThemeContext";

/* ── Fix Leaflet default icon path (Vite/React build issue) ── */
import markerIcon2x   from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon     from "leaflet/dist/images/marker-icon.png";
import markerShadow   from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

/* ── Helpers ── */
function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
// Extract lat/lng from Business location GeoJSON { type:"Point", coordinates:[lng,lat] }
function bizLat(s) { return s.location?.coordinates?.[1]; }
function bizLng(s) { return s.location?.coordinates?.[0]; }
// Distance in metres: use API-provided `distance` field (from $geoNear) or fallback to haversine
function bizDist(s, userLat, userLng) {
  if (typeof s.distance === "number") return s.distance;
  if (!userLat || !bizLat(s)) return null;
  const R = 6371000;
  const dLat = (bizLat(s) - userLat) * Math.PI / 180;
  const dLng = (bizLng(s) - userLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(bizLat(s) * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Custom business pin icon (with name label) ── */
function salonIcon(isActive, name, distMetres) {
  const distLabel = typeof distMetres === "number"
    ? `<span style="font-size:9px;font-weight:700;color:${isActive ? "#6366f1" : "#64748b"};margin-top:1px;white-space:nowrap;">${fmtDist(distMetres)}</span>`
    : "";
  const shortName = name ? (name.length > 14 ? name.slice(0, 13) + "…" : name) : "";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:0;">
      <div style="
        width:${isActive ? "40px" : "34px"};height:${isActive ? "40px" : "34px"};border-radius:50%;
        background:${isActive ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#a78bfa,#c4b5fd)"};
        border:3px solid #fff;
        box-shadow:0 3px 12px rgba(99,102,241,${isActive ? "0.65" : "0.35"});
        display:flex;align-items:center;justify-content:center;
        transition:all 0.15s ease;
      ">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
        </svg>
      </div>
      ${shortName ? `<div style="
        background:${isActive ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.95)"};
        color:${isActive ? "#fff" : "#1e293b"};
        font-size:10px;font-weight:700;
        padding:2px 6px;border-radius:6px;
        box-shadow:0 1px 6px rgba(0,0,0,0.18);
        white-space:nowrap;margin-top:2px;
        border:1px solid ${isActive ? "transparent" : "rgba(99,102,241,0.15)"};
        max-width:90px;overflow:hidden;text-overflow:ellipsis;
      ">${shortName}</div>` : ""}
      ${distLabel ? `<div style="margin-top:1px;">${distLabel}</div>` : ""}
    </div>`,
    iconSize: [90, 70],
    iconAnchor: [45, 40],
    popupAnchor: [0, -44],
  });
}

/* ── User location pin ── */
const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#6366f1;
    border:3px solid #fff;
    box-shadow:0 0 0 6px rgba(99,102,241,0.22),0 2px 8px rgba(99,102,241,0.5);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* ── Locate Me button (uses useMap hook — must be inside MapContainer) ── */
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

/* ── Fly to new coords when they change ── */
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

/* ── Selected salon bottom sheet ── */
function SalonCard({ salon, userCoords, onClose, navigate, isDark }) {
  const distM = bizDist(salon, userCoords?.lat, userCoords?.lng);
  const dist = distM != null ? fmtDist(distM) : null;
  const coverImg = salon.coverPhoto || salon.photos?.[0];

  return (
    <div
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
        background: isDark ? "#111827" : "#fff",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
        paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        animation: "slideUp 0.28s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      {/* Drag handle */}
      <div style={{ width: 36, height: 4, borderRadius: 2, background: isDark ? "#374151" : "#e2e8f0", margin: "12px auto 0" }} />

      <div style={{ padding: "14px 16px 20px", display: "flex", gap: 14 }}>
        {/* Cover image / logo */}
        <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", flexShrink: 0,
          background: isDark ? "#1f2937" : "#f1f5f9" }}>
          {coverImg
            ? <img src={coverImg} alt={salon.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, fontWeight: 900, color: "#6366f1" }}>
                {(salon.name || "S").charAt(0)}
              </div>
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: isDark ? "#fff" : "#0f172a",
            margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {salon.name}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            {salon.averageRating > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ color: "#fbbf24", fontSize: 12 }}>★</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#fbbf24" }}>{salon.averageRating.toFixed(1)}</span>
              </span>
            )}
            {dist && (
              <span style={{ fontSize: 12, color: isDark ? "#9ca3af" : "#64748b", display: "flex", alignItems: "center", gap: 3 }}>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {dist}
              </span>
            )}
          </div>
          {(salon.address || salon.locality || salon.city) && (
            <p style={{ fontSize: 12, color: isDark ? "#6b7280" : "#94a3b8", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {[salon.address, salon.locality, salon.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Close */}
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
          color: isDark ? "#6b7280" : "#94a3b8", padding: 4, flexShrink: 0, alignSelf: "flex-start" }}>
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Book button */}
      <div style={{ padding: "0 16px 4px" }}>
        <button
          onClick={() => navigate(salonPath(salon))}
          style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
            color: "#fff", fontWeight: 800, fontSize: 15,
            boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
          </svg>
          Book Appointment
        </button>
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
  const [coords,    setCoords]   = useState(null);     // user location
  const [center,    setCenter]   = useState([20.5937, 78.9629]); // India center fallback
  const [selected,  setSelected] = useState(null);
  const [sort,      setSort]     = useState("nearby"); // nearby | rated | booked

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
    if (!navigator.geolocation) {
      fetchSalons(20.5937, 78.9629, sort);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(c);
        setCenter([c.lat, c.lng]);
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

  /* ── Memoized markers to prevent re-renders on selection change ── */
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
            bizDist(s, coords?.lat, coords?.lng)
          )}
          eventHandlers={{ click: () => setSelected(s) }}
        />
      )),
  [salons, selected?._id, coords]);

  const handleLocate = useCallback((c) => {
    setCoords(c);
    fetchSalons(c.lat, c.lng, sort);
  }, [sort, fetchSalons]);

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
        {/* Back */}
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
            { key: "nearby", label: "Nearest" },
            { key: "rated",  label: "Top Rated" },
            { key: "booked", label: "Popular" },
          ].map(o => (
            <button key={o.key} onClick={() => setSort(o.key)}
              style={{
                background: sort === o.key
                  ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                  : isDark ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.08)",
                color: sort === o.key ? "#fff" : isDark ? "#9ca3af" : "#6366f1",
                border: "none", borderRadius: 20, padding: "5px 11px",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                transition: "all 0.2s",
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

          {/* User location dot */}
          {coords && <Marker position={[coords.lat, coords.lng]} icon={userIcon} />}

          {/* Salon markers with clustering — uncluster at zoom ≥17, spiderfy at max zoom */}
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            disableClusteringAtZoom={17}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            iconCreateFunction={(cluster) => L.divIcon({
              className: "",
              html: `<div style="
                width:36px;height:36px;border-radius:50%;
                background:linear-gradient(135deg,#6366f1,#8b5cf6);
                color:#fff;font-size:13px;font-weight:800;
                display:flex;align-items:center;justify-content:center;
                border:2px solid #fff;
                box-shadow:0 2px 10px rgba(99,102,241,0.5);
              ">${cluster.getChildCount()}</div>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            })}
          >
            {markers}
          </MarkerClusterGroup>

          <LocateMe onLocate={handleLocate} />
        </MapContainer>
      </div>

    </div>

      {/* ── Tap outside to dismiss card (above BottomNav: zIndex 200) ── */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200 }}
          onClick={() => setSelected(null)}
        />
      )}

      {/* ── Selected salon card (above BottomNav: zIndex 201) ── */}
      {selected && (
        <SalonCard
          salon={selected}
          userCoords={coords}
          onClose={() => setSelected(null)}
          navigate={navigate}
          isDark={isDark}
        />
      )}
    </>
  );
}
