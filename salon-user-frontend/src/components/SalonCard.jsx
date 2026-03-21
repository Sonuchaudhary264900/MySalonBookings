import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Heart, Clock, CheckCircle, Scissors, MapPin } from "lucide-react";
import API from "../services/api";
import { isCustomer } from "../utils/auth";

// ── localStorage helpers ──────────────────────────────────────
function getFavIds() {
  try { return JSON.parse(localStorage.getItem("customerFavorites") || "[]"); }
  catch { return []; }
}
function setFavIds(ids) {
  localStorage.setItem("customerFavorites", JSON.stringify(ids));
}

// ── Distance ──────────────────────────────────────────────────
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

// ── Working hours helpers ─────────────────────────────────────
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

// ── Star Rating ───────────────────────────────────────────────
function StarRating({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= Math.round(r) ? "text-amber-400" : "text-slate-200"}`}
        >
          ★
        </span>
      ))}
      {r > 0 && <span className="text-xs text-slate-500 ml-1">{r.toFixed(1)}</span>}
    </div>
  );
}

function SalonCard({ salon, userCoords }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => getFavIds().includes(salon._id));
  const [saving, setSaving] = useState(false);

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

  const categoryColors = {
    barber:        "bg-blue-900/60 text-white",
    hair_salon:    "bg-purple-900/60 text-white",
    spa:           "bg-green-900/60 text-white",
    nail_salon:    "bg-pink-900/60 text-white",
    massage:       "bg-orange-900/60 text-white",
    multi_service: "bg-indigo-900/60 text-white",
  };
  const catBadgeClass = categoryColors[salon.category] || "bg-black/50 text-white";
  const catLabel = salon.category?.replace("_", " ") || "Salon";
  const rating = salon.averageRating || salon.rating || 0;
  const reviewCount = salon.totalReviews || salon.reviewCount || 0;
  const address = salon.address || [salon.city, salon.state].filter(Boolean).join(", ") || "Address not available";

  return (
    <Link to={`/salon/${salon._id}`} className="group block">
      <div className="card group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200">

        {/* ── Image ─────────────────────────────────────────── */}
        <div className="relative h-44 bg-gradient-to-br from-indigo-100 to-violet-100 overflow-hidden">
          {salon.photos?.[0] || salon.coverPhoto || salon.image || salon.ownerPhoto ? (
            <img
              src={salon.photos?.[0] || salon.coverPhoto || salon.image || salon.ownerPhoto}
              alt={salon.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Scissors className="w-10 h-10 text-indigo-300" />
              <span className="text-sm text-slate-400">{salon.name}</span>
            </div>
          )}

          {/* Owner avatar */}
          {salon.ownerPhoto && salon.photos?.[0] && (
            <div className="absolute bottom-3 left-3">
              <img
                src={salon.ownerPhoto}
                alt="owner"
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md"
              />
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${catBadgeClass}`}>
              {catLabel}
            </span>
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
              saved ? "bg-rose-500 text-white" : "bg-white/90 text-slate-400 hover:text-rose-500"
            }`}
            title={saved ? "Saved!" : "Save"}
          >
            <Heart className={`w-4 h-4 ${saved ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* ── Info ──────────────────────────────────────────── */}
        <div className="p-3 pt-4 space-y-1.5">
          <h2 className="font-bold text-slate-900 truncate text-[15px]">{salon.name}</h2>

          {/* Rating row + Open/Closed pill */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <StarRating rating={rating} />
              {reviewCount > 0 && (
                <span className="text-xs text-slate-400">({reviewCount})</span>
              )}
            </div>
            {openStatus !== null && (
              <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                openStatus ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${openStatus ? "bg-green-500" : "bg-red-500"}`} />
                {openStatus ? "Open" : "Closed"}
              </span>
            )}
          </div>

          {/* Address + Hours */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-slate-500 flex items-start gap-1 min-w-0 flex-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span className="truncate">{address}</span>
            </p>
            {todayHours && (
              <p className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 shrink-0" />
                {todayHours}
              </p>
            )}
          </div>

          {/* Distance */}
          {distance && (
            <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {distance}
            </p>
          )}

          {/* Footer */}
          <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
              Book Now
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            {salon.isApproved && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}

export default SalonCard;
