import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const salonPin = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid #fff;box-shadow:0 3px 10px rgba(99,102,241,0.5);display:flex;align-items:center;justify-content:center;">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/></svg>
  </div>`,
  iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -36],
});

const userPin = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 0 0 5px rgba(99,102,241,0.25),0 2px 8px rgba(99,102,241,0.5);"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
  }, [map, points]);
  return null;
}

function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
function fmtDur(s) {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`;
}

/**
 * DirectionsModal
 * Props:
 *   salon       — { name, locality, address, city }
 *   salonCoords — [lng, lat]  (GeoJSON order)
 *   userCoords  — { lat, lng }
 *   onClose     — () => void
 */
export default function DirectionsModal({ salon, salonCoords, userCoords, onClose }) {
  const [mode, setMode]       = useState("driving");
  const [route, setRoute]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userCoords || !salonCoords) return;
    setLoading(true);
    const [sLng, sLat] = salonCoords;
    const url = `https://router.project-osrm.org/route/v1/${mode}/${userCoords.lng},${userCoords.lat};${sLng},${sLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const r0 = data.routes?.[0];
        if (!r0) return;
        const coords = r0.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setRoute({ coords, distM: r0.distance, durS: r0.duration });
      })
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [mode, salonCoords, userCoords]);

  const bg   = "var(--t-bg)";
  const fg   = "var(--t-text)";
  const fg2  = "var(--t-text-3)";
  const card = "var(--t-bg-2)";
  const brd  = "var(--t-border)";

  const [sLng, sLat] = salonCoords || [0, 0];
  const mapPoints = userCoords
    ? [[userCoords.lat, userCoords.lng], [sLat, sLng]]
    : [[sLat, sLng]];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", flexDirection: "column" }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        background: bg, borderRadius: "22px 22px 0 0",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.28)",
        display: "flex", flexDirection: "column",
        maxHeight: "92vh", overflow: "hidden",
        animation: "dmSlideUp 0.28s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        <style>{`@keyframes dmSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        {/* Drag handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: brd, margin: "12px auto 0", flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {salon?.name || "Directions"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: fg2 }}>
              {[salon?.locality, salon?.address, salon?.city]
                .filter(Boolean)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(", ") || "Tap the pin for details"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: fg2, padding: 4, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Drive / Walk toggle + ETA */}
        <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", flexShrink: 0 }}>
          {[
            { key: "driving", label: "🚗 Drive" },
            { key: "foot",    label: "🚶 Walk"  },
          ].map(o => (
            <button key={o.key} onClick={() => setMode(o.key)} style={{
              padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: mode === o.key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : card,
              color: mode === o.key ? "#fff" : fg2,
              boxShadow: mode === o.key ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
              transition: "all 0.2s",
            }}>{o.label}</button>
          ))}
          {route && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>{fmtDist(route.distM)}</span>
              <span style={{ fontSize: 12, color: fg2 }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{fmtDur(route.durS)}</span>
            </div>
          )}
          {loading && <div style={{ marginLeft: "auto", fontSize: 12, color: fg2 }}>Calculating…</div>}
        </div>

        {/* Map */}
        <div style={{ height: 300, flexShrink: 0, position: "relative" }}>
          <MapContainer
            center={[sLat || 20.5937, sLng || 78.9629]}
            zoom={13}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds points={mapPoints} />
            {route && (
              <Polyline
                positions={route.coords}
                pathOptions={{ color: "#6366f1", weight: 5, opacity: 0.85, lineCap: "round", lineJoin: "round" }}
              />
            )}
            {salonCoords && <Marker position={[sLat, sLng]} icon={salonPin} />}
            {userCoords && <Marker position={[userCoords.lat, userCoords.lng]} icon={userPin} />}
          </MapContainer>
        </div>

        <div style={{ height: "env(safe-area-inset-bottom, 12px)", flexShrink: 0, background: bg }} />
      </div>
    </div>
  );
}
