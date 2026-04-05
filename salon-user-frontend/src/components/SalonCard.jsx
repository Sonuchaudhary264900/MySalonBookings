import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import { Heart, Clock, CheckCircle, Scissors, MapPin, Star, Megaphone } from "lucide-react";
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
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
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

function getOpensAt(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open) return null;
  return h.open;
}

// Returns the next available slot label derived from working hours.
// Approximation: assumes 30-min slots, ignores existing bookings (accurate for card-level display).
function getNextSlot(workingHours, intervalMins = 30) {
  if (!workingHours) return null;
  const now    = new Date();
  const nowDay = now.getDay();
  const nowM   = now.getHours() * 60 + now.getMinutes();

  // Try today first, then scan up to 6 more days
  for (let i = 0; i < 7; i++) {
    const dayIdx = (nowDay + i) % 7;
    const h = workingHours[DAYS[dayIdx]];
    if (!h || h.isClosed || !h.open || !h.close) continue;

    const [oh, om] = h.open.split(":").map(Number);
    const [ch, cm] = h.close.split(":").map(Number);
    const openM  = oh * 60 + om;
    const closeM = ch * 60 + cm;

    let slotM;
    if (i === 0) {
      // Today: if before opening use open time; if open now round up to next interval
      if (nowM >= closeM) continue;              // already closed today → try tomorrow
      if (nowM <= openM) {
        slotM = openM;
      } else {
        const elapsed = Math.ceil((nowM - openM) / intervalMins);
        slotM = openM + elapsed * intervalMins;
        if (slotM >= closeM) continue;           // no slots left today
      }
    } else {
      slotM = openM;                             // future day → first slot
    }

    const hh  = String(Math.floor(slotM / 60)).padStart(2, "0");
    const mm  = String(slotM % 60).padStart(2, "0");
    const label = `${hh}:${mm}`;
    if (i === 0) return label;
    if (i === 1) return `Tomorrow ${label}`;
    const dayName = DAYS[dayIdx].charAt(0).toUpperCase() + DAYS[dayIdx].slice(1, 3);
    return `${dayName} ${label}`;
  }
  return null;
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
  const [saved, setSaved]       = useState(() => getFavIds().includes(salon._id));
  const [saving, setSaving]     = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [heartBounce, setHeartBounce] = useState(false);
  const heartTimer = useRef(null);

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

  const openStatus  = useMemo(() => isOpenNow(salon.workingHours),     [salon.workingHours]);
  const todayHours  = useMemo(() => getTodayHours(salon.workingHours), [salon.workingHours]);
  const opensAt     = useMemo(() => getOpensAt(salon.workingHours),    [salon.workingHours]);
  const nextSlot    = useMemo(() => getNextSlot(salon.workingHours),   [salon.workingHours]);

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
      clearTimeout(heartTimer.current);
      setHeartBounce(true);
      heartTimer.current = setTimeout(() => setHeartBounce(false), 400);
    } catch (err) {
      console.error("Favourite error:", err?.message || err);
    } finally {
      setSaving(false);
    }
  };

  const gradient      = CATEGORY_GRADIENTS[salon.category] || "from-indigo-700 to-violet-800";
  const catLabel      = (salon.category?.replace(/_/g, " ") || "Salon").replace(/\bbarber\b/i, "Salon");
  const rating        = parseFloat(salon.averageRating || salon.rating || 0);
  const reviewCount   = salon.totalReviews  || salon.reviewCount  || 0;
  const totalBookings = salon.totalBookings || 0;
  const address       = salon.address || [salon.city, salon.state].filter(Boolean).join(", ") || "Location not available";
  const hasPhoto      = salon.photos?.[0] || salon.coverPhoto || salon.image;

  const isTopRated  = rating >= 4.5 && reviewCount >= 10;
  const isTrending  = !isTopRated && totalBookings >= 50;

  const offerLabel = salon.topOffer
    ? salon.topOffer.discountType === "percentage"
      ? `${salon.topOffer.discountValue}% OFF${salon.topOffer.minAmount > 0 ? ` on ₹${salon.topOffer.minAmount}+` : ""}`
      : `₹${salon.topOffer.discountValue} OFF${salon.topOffer.minAmount > 0 ? ` on ₹${salon.topOffer.minAmount}+` : ""}`
    : null;

  return (
    <Link to={`/salon/${salon._id}`} className="group block">
      <div
        className="glass-card overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 20,
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          transform: hovered ? "translateY(-5px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 24px 56px rgba(99,102,241,0.18), 0 8px 24px rgba(0,0,0,0.14)"
            : "0 4px 20px rgba(0,0,0,0.07)",
        }}
      >

        {/* ── Image ── */}
        <div className="relative overflow-hidden" style={{ height: 210, borderRadius: "20px 20px 0 0" }}>
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

          {/* Gradient overlays */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.06) 55%, transparent 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 38%)" }} />

          {/* Promoted ribbon — spans full card top */}
          {salon.isPromoted && (
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1.5 py-1.5 z-10"
              style={{
                background: "linear-gradient(90deg, rgba(124,58,237,0.92), rgba(99,102,241,0.92))",
                backdropFilter: "blur(6px)",
              }}
            >
              <Megaphone className="w-3 h-3 text-white" />
              <span className="text-[10px] font-black text-white tracking-wide uppercase">Sponsored</span>
            </div>
          )}

          {/* Top-left: category + verified + trust badge */}
          <div className={`absolute left-2.5 flex flex-wrap gap-1.5 ${salon.isPromoted ? "top-8" : "top-2.5"}`}>
            {catLabel.toLowerCase() !== "salon" && (
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize text-white"
                style={{ background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {catLabel}
              </span>
            )}
            {salon.isApproved && (
              <span
                className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full text-white"
                style={{
                  background: "rgba(16,185,129,0.92)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 0 16px rgba(16,185,129,0.6), 0 0 32px rgba(16,185,129,0.22)",
                  border: "1.5px solid rgba(255,255,255,0.22)",
                }}
              >
                <CheckCircle className="w-3 h-3" /> ✓ Verified
              </span>
            )}
            {isTopRated && (
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: "rgba(234,179,8,0.92)", backdropFilter: "blur(4px)", color: "#1a1200", boxShadow: "0 0 10px rgba(234,179,8,0.4)" }}
              >
                🏆 Top Rated
              </span>
            )}
            {isTrending && (
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
                style={{ background: "rgba(239,68,68,0.88)", backdropFilter: "blur(4px)", boxShadow: "0 0 10px rgba(239,68,68,0.35)" }}
              >
                🔥 Trending
              </span>
            )}
          </div>

          {/* Top-right: Favorite */}
          <button
            onClick={handleFavorite}
            className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: saved ? "rgba(244,63,94,0.92)" : "rgba(0,0,0,0.52)",
              backdropFilter: "blur(8px)",
              border: saved ? "1.5px solid rgba(244,63,94,0.5)" : "1px solid rgba(255,255,255,0.16)",
              boxShadow: saved ? "0 0 18px rgba(244,63,94,0.55), 0 0 36px rgba(244,63,94,0.18)" : "none",
              transform: heartBounce ? "scale(1.48)" : saved ? "scale(1.12)" : "scale(1)",
              transition: heartBounce
                ? "transform 0.18s cubic-bezier(0.17,0.89,0.32,1.49)"
                : "transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease",
            }}
          >
            <Heart
              className="w-4 h-4"
              style={{
                color: saved ? "#fff" : "#cbd5e1",
                fill: saved ? "#fff" : "none",
                filter: heartBounce ? "drop-shadow(0 0 6px rgba(244,63,94,0.8))" : "none",
                transition: "filter 0.2s ease",
              }}
            />
          </button>

          {/* Bottom-left: Open / Closed + Opens at */}
          <div className="absolute bottom-2.5 left-2.5">
            {openStatus !== null && (
              <span
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{
                  background: openStatus ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)",
                  backdropFilter: "blur(4px)",
                  boxShadow: openStatus ? "0 0 10px rgba(16,185,129,0.4)" : "0 0 8px rgba(239,68,68,0.3)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                {openStatus ? "Open Now" : opensAt ? `Opens ${opensAt}` : "Closed"}
              </span>
            )}
          </div>

          {/* Bottom-right: Rating + Distance */}
          <div className="absolute bottom-2.5 right-2.5 flex flex-col items-end gap-1">
            {rating > 0 && (
              <span
                className="flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {rating.toFixed(1)}
                {reviewCount > 0 && <span className="text-white/65 font-normal ml-0.5">({reviewCount})</span>}
              </span>
            )}
            {distance && (
              <span
                className="text-[10px] font-bold text-white/90 px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                📍 {distance}
              </span>
            )}
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
            style={{ opacity: hovered ? 1 : 0, background: "rgba(0,0,0,0.3)", backdropFilter: hovered ? "blur(2px)" : "none", pointerEvents: "none" }}
          >
            <span
              className="text-xs font-bold text-white px-4 py-2 rounded-xl"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                boxShadow: "0 0 22px rgba(99,102,241,0.55)",
                transition: "transform 0.22s ease",
                transform: hovered ? "translateY(0) scale(1)" : "translateY(10px) scale(0.94)",
              }}
            >
              View Details →
            </span>
          </div>
        </div>

        {/* ── Info ── */}
        <div className="p-4">
          {/* Name */}
          <h2 className="font-bold text-[15px] leading-snug line-clamp-1 mb-1" style={{ color: "var(--t-text)" }}>
            {salon.name}
          </h2>

          {/* Stars + rating + review count */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star
                  key={i}
                  className="w-3 h-3"
                  style={{
                    color: "#f59e0b",
                    fill: rating > 0 && i <= Math.floor(rating)
                      ? "#f59e0b"
                      : rating > 0 && i === Math.ceil(rating) && rating % 1 >= 0.5
                      ? "#f59e0b"
                      : "none",
                    opacity: rating === 0 || i > Math.ceil(rating) ? 0.25 : 1,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>
              {rating > 0 ? rating.toFixed(1) : "—"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--t-text-3)" }}>
              {reviewCount > 0
                ? `(${reviewCount.toLocaleString()} ${reviewCount === 1 ? "review" : "reviews"})`
                : "No reviews yet"}
            </span>
          </div>

          {/* Address + Hours */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs flex items-center gap-1 line-clamp-1 flex-1" style={{ color: "var(--t-text-2)" }}>
              <MapPin className="w-3 h-3 shrink-0" style={{ color: "rgba(99,102,241,0.7)" }} />
              {address}
            </p>
            {todayHours && (
              <p className="text-xs flex items-center gap-1 shrink-0" style={{ color: "var(--t-text-3)" }}>
                <Clock className="w-3 h-3 shrink-0" />
                {todayHours}
              </p>
            )}
          </div>

          {/* Next available slot */}
          {nextSlot && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <span
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: openStatus ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)",
                  border: "1px solid rgba(99,102,241,0.18)",
                  color: "var(--t-accent)",
                }}
              >
                <span style={{ fontSize: 12 }}>⏱</span>
                Next slot: {nextSlot}
              </span>
            </div>
          )}

          {/* Social proof + gender tags + price */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {totalBookings >= 10 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(239,68,68,0.09)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}
                >
                  🔥 {totalBookings >= 1000 ? `${(totalBookings / 1000).toFixed(1)}k` : `${totalBookings}+`} booked
                </span>
              )}
              {salon.servedGender && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: salon.servedGender === "male" ? "rgba(59,130,246,0.12)" : salon.servedGender === "female" ? "rgba(236,72,153,0.12)" : "rgba(139,92,246,0.12)",
                    color:      salon.servedGender === "male" ? "#60a5fa"              : salon.servedGender === "female" ? "#f472b6"              : "#c4b5fd",
                    border:    `1px solid ${salon.servedGender === "male" ? "rgba(59,130,246,0.2)" : salon.servedGender === "female" ? "rgba(236,72,153,0.2)" : "rgba(139,92,246,0.2)"}`,
                  }}
                >
                  {salon.servedGender === "male" ? "👨 Men" : salon.servedGender === "female" ? "👩 Women" : "👥 Unisex"}
                </span>
              )}
              {salon.kidsHaircut && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.12)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.2)" }}>
                  👶 Kids
                </span>
              )}
              {salon.atHomeServices && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                  🏠 At-Home
                </span>
              )}
            </div>
            {salon.minPrice && (
              <span className="text-xs font-bold shrink-0" style={{ color: "var(--t-accent)" }}>
                from ₹{salon.minPrice}
              </span>
            )}
          </div>

          {/* Offer / promo tag */}
          {offerLabel && (
            <div
              className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)" }}
            >
              <span style={{ fontSize: 14 }}>🏷️</span>
              <span className="text-[11px] font-bold flex-1" style={{ color: "#059669" }}>{offerLabel}</span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(5,150,105,0.15)", color: "#059669", border: "1px solid rgba(5,150,105,0.25)", letterSpacing: "0.5px" }}
              >
                {salon.topOffer.code}
              </span>
            </div>
          )}

          {/* Book Now CTA */}
          <div
            className="w-full text-white text-sm font-bold py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: hovered
                ? "0 0 24px rgba(99,102,241,0.52), 0 0 48px rgba(139,92,246,0.18)"
                : "0 0 14px rgba(99,102,241,0.28)",
              transition: "box-shadow 0.25s ease",
            }}
          >
            Book Now
            <span
              style={{
                display: "inline-block",
                transition: "transform 0.2s ease",
                transform: hovered ? "translateX(4px)" : "translateX(0)",
              }}
            >
              →
            </span>
          </div>
        </div>

      </div>
    </Link>
  );
}

export default SalonCard;
