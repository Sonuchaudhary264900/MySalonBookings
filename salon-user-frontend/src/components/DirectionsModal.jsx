import { useState, useEffect } from "react";
import { useJsApiLoader, GoogleMap, DirectionsRenderer } from "@react-google-maps/api";

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
  const [mode, setMode]           = useState("driving");
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo]  = useState(null);
  const [loading, setLoading]      = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "glowloox-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [sLng, sLat] = salonCoords || [0, 0];

  useEffect(() => {
    if (!isLoaded || !userCoords || !salonCoords) return;
    const travelMode = mode === "driving" ? "DRIVING" : "WALKING";
    setLoading(true);
    setDirections(null);
    setRouteInfo(null);
    const ds = new window.google.maps.DirectionsService();
    ds.route(
      {
        origin: { lat: userCoords.lat, lng: userCoords.lng },
        destination: { lat: sLat, lng: sLng },
        travelMode,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) setRouteInfo({ distM: leg.distance.value, durS: leg.duration.value });
        }
        setLoading(false);
      }
    );
  }, [isLoaded, mode, salonCoords, userCoords]); // eslint-disable-line

  const bg   = "var(--t-bg)";
  const fg   = "var(--t-text)";
  const fg2  = "var(--t-text-3)";
  const card = "var(--t-bg-2)";
  const brd  = "var(--t-border)";

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

        {/* Mode toggle + ETA */}
        <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", flexShrink: 0 }}>
          {[
            { key: "driving", label: "Drive" },
            { key: "walking", label: "Walk"  },
          ].map(o => (
            <button key={o.key} onClick={() => setMode(o.key)} style={{
              padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: mode === o.key ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : card,
              color: mode === o.key ? "#fff" : fg2,
              boxShadow: mode === o.key ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
              transition: "all 0.2s",
            }}>{o.label}</button>
          ))}
          {routeInfo && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>{fmtDist(routeInfo.distM)}</span>
              <span style={{ fontSize: 12, color: fg2 }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: fg }}>{fmtDur(routeInfo.durS)}</span>
            </div>
          )}
          {loading && <div style={{ marginLeft: "auto", fontSize: 12, color: fg2 }}>Calculating…</div>}
        </div>

        {/* Map */}
        <div style={{ height: 300, flexShrink: 0, position: "relative" }}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              defaultCenter={{ lat: sLat || 20.5937, lng: sLng || 78.9629 }}
              defaultZoom={13}
              options={{
                disableDefaultUI: true,
                gestureHandling: "greedy",
                clickableIcons: false,
              }}
            >
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    polylineOptions: {
                      strokeColor: "#6366f1",
                      strokeWeight: 5,
                      strokeOpacity: 0.85,
                    },
                    suppressMarkers: false,
                  }}
                />
              )}
            </GoogleMap>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-bg-2)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "conic-gradient(from 0deg,#6366f1,#a78bfa,transparent)", animation: "dmSlideUp 0.85s linear infinite" }} />
            </div>
          )}
        </div>

        <div style={{ height: "env(safe-area-inset-bottom, 12px)", flexShrink: 0, background: bg }} />
      </div>
    </div>
  );
}
