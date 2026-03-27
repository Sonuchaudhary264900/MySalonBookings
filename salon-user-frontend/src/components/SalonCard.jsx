import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Heart, Clock, CheckCircle, Scissors, MapPin, Star } from "lucide-react";
import API from "../services/api";
import { isCustomer } from "../utils/auth";

function getFavIds() {
  try { return JSON.parse(localStorage.getItem("customerFavorites") || "[]"); }
  catch { return []; }
}
function setFavIds(ids) {
  localStorage.setItem("customerFavorites", JSON.stringify(ids));
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function isOpenNow(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

function getTodayHours(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open || !h.close) return null;
  return `${h.open} – ${h.close}`;
}

const CATEGORY_GRADIENTS = {
  barber:        "from-blue-700 to-indigo-800",
  hair_salon:    "from-violet-700 to-purple-800",
  spa:           "from-emerald-700 to-teal-800",
  nail_salon:    "from-pink-700 to-rose-800",
  massage:       "from-orange-700 to-amber-800",
  multi_service: "from-indigo-700 to-violet-800",
};

function SalonCard({ salon, userCoords }) {
  const navigate = useNavigate();
  const [saved, setSaved]   = useState(() => getFavIds().includes(salon._id));
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setSaved(getFavIds().includes(salon._id));
  }, [salon._id]);

  const distance = useMemo(() => {
    if (!userCoords) return null;
    const coords = salon.location?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [salonLng, salonLat] = coords;
    const km = getDistanceKm(userCoords.lat, userCoords.lng, salonLat, salonLng);
    return formatDistance(km);
  }, [userCoords, salon.location]);

  const openStatus = useMemo(() => isOpenNow(salon.workingHours), [salon.workingHours]);
  const todayHours = useMemo(() => getTodayHours(salon.workingHours), [salon.workingHours]);

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    if (!isCustomer()) { navigate("/login"); return; }
    setSaving(true);
    try {
      const res = await API.post(`/customer/favorites/${salon._id}`);
      const liked = res.data?.liked ?? !saved;
      const ids = getFavIds();
      if (liked) {
        if (!ids.includes(salon._id)) setFavIds([...ids, salon._id]);
      } else {
        setFavIds(ids.filter((id) => id !== salon._id));
      }
      setSaved(liked);
    } catch (err) {
      console.error("Favourite error:", err?.message || err);
    } finally {
      setSaving(false);
    }
  };

  const gradient = CATEGORY_GRADIENTS[salon.category] || "from-indigo-700 to-violet-800";
  const catLabel = salon.category?.replace(/_/g, " ") || "Salon";
  const rating = parseFloat(salon.averageRating || salon.rating || 0);
  const reviewCount = salon.totalReviews || salon.reviewCount || 0;
  const address = salon.address || [salon.city, salon.state].filter(Boolean).join(", ") || "Location not available";
  const hasPhoto = salon.photos?.[0] || salon.coverPhoto || salon.image || salon.ownerPhoto;

  return (
    <Link to={`/salon/${salon._id}`} className="group block">
      <div
        className="glass-card overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          transform: hovered ? "translateY(-5px)" : "translateY(0)",
          boxShadow: hovered ? "0 20px 48px rgba(99,102,241,0.18), 0 6px 20px rgba(0,0,0,0.15)" : undefined,
        }}
      >

        {/* ── Image ── */}
        <div className="relative h-52 overflow-hidden" style={{ borderRadius: "20px 20px 0 0" }}>
          {hasPhoto ? (
            <img
              src={hasPhoto}
              alt={salon.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2`}>
              <Scissors className="w-10 h-10 text-white/40" />
              <span className="text-xs text-white/30 font-medium">{salon.name}</span>
            </div>
          )}

          {/* Dark gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)" }} />

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize text-white"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {catLabel}
            </span>
            {salon.isApproved && (
              <span
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full text-white"
                style={{ background: "rgba(16,185,129,0.85)", backdropFilter: "blur(4px)", boxShadow: "0 0 10px rgba(16,185,129,0.4)" }}
              >
                <CheckCircle className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
            style={{
              background: saved ? "rgba(244,63,94,0.9)" : "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: saved ? "1px solid rgba(244,63,94,0.4)" : "1px solid rgba(255,255,255,0.12)",
              boxShadow: saved ? "0 0 12px rgba(244,63,94,0.4)" : "none",
              transform: saved ? "scale(1.1)" : "scale(1)",
            }}
          >
            <Heart className="w-4 h-4 text-white" fill={saved ? "white" : "none"} />
          </button>

          {/* Open / Closed pill */}
          {openStatus !== null && (
            <div className="absolute bottom-2.5 left-2.5">
              <span
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{
                  background: openStatus ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)",
                  backdropFilter: "blur(4px)",
                  boxShadow: openStatus ? "0 0 10px rgba(16,185,129,0.4)" : "0 0 10px rgba(239,68,68,0.3)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                {openStatus ? "Open Now" : "Closed"}
              </span>
            </div>
          )}

          {/* Distance */}
          {distance && (
            <div className="absolute bottom-2.5 right-2.5">
              <span
                className="text-[10px] font-bold text-white/90 px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                📍 {distance}
              </span>
            </div>
          )}

          {/* Hover overlay: quick actions */}
          <div
            className="absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-200"
            style={{ opacity: hovered ? 1 : 0, background: "rgba(0,0,0,0.35)", backdropFilter: hovered ? "blur(2px)" : "none" }}
          >
            <span
              className="text-xs font-bold text-white px-3 py-1.5 rounded-xl transition-transform duration-200"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                boxShadow: "0 0 16px rgba(99,102,241,0.5)",
                transform: hovered ? "translateY(0)" : "translateY(8px)",
              }}
            >
              View Details
            </span>
          </div>
        </div>

        {/* ── Info ── */}
        <div className="p-3.5" style={{ background: "transparent" }}>
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h2 className="font-bold text-[15px] leading-tight line-clamp-1 flex-1" style={{ color: 'var(--t-text)' }}>{salon.name}</h2>
            {rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-amber-400">{rating.toFixed(1)}</span>
                {reviewCount > 0 && <span className="text-[10px]" style={{ color: "var(--t-text-3)" }}>({reviewCount})</span>}
              </div>
            )}
          </div>

          {/* Address */}
          <p className="text-xs flex items-center gap-1 mb-2 line-clamp-1" style={{ color: "var(--t-text-2)" }}>
            <MapPin className="w-3 h-3 shrink-0" style={{ color: "rgba(99,102,241,0.7)" }} />
            {address}
          </p>

          {/* Hours */}
          {todayHours && (
            <p className="text-xs flex items-center gap-1 mb-2" style={{ color: "var(--t-text-3)" }}>
              <Clock className="w-3 h-3 shrink-0" />
              {todayHours}
            </p>
          )}

          {/* Gender + special badges */}
          {(salon.servedGender || salon.kidsHaircut || salon.atHomeServices) && (
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {salon.servedGender && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: salon.servedGender === "male"
                      ? "rgba(59,130,246,0.15)" : salon.servedGender === "female"
                      ? "rgba(236,72,153,0.15)" : "rgba(139,92,246,0.15)",
                    color: salon.servedGender === "male"
                      ? "#60a5fa" : salon.servedGender === "female"
                      ? "#f472b6" : "#c4b5fd",
                    border: `1px solid ${salon.servedGender === "male" ? "rgba(59,130,246,0.2)" : salon.servedGender === "female" ? "rgba(236,72,153,0.2)" : "rgba(139,92,246,0.2)"}`,
                  }}
                >
                  {salon.servedGender === "male" ? "👨 Men" : salon.servedGender === "female" ? "👩 Women" : "👥 Unisex"}
                </span>
              )}
              {salon.kidsHaircut && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.15)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.2)" }}>👶 Kids</span>
              )}
              {salon.atHomeServices && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>🏠 At-Home</span>
              )}
            </div>
          )}

          {/* Book Now CTA */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 text-white text-xs font-bold py-2.5 rounded-xl text-center transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: hovered ? "0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(139,92,246,0.2)" : "0 0 12px rgba(99,102,241,0.25)",
              }}
            >
              Book Now →
            </div>
            {salon.minPrice && (
              <div className="text-[10px] text-right shrink-0" style={{ color: "var(--t-text-3)" }}>
                <span className="block font-semibold" style={{ color: "var(--t-text-2)" }}>from ₹{salon.minPrice}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}

export default SalonCard;
