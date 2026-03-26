import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Heart, Clock, CheckCircle, Scissors, MapPin } from "lucide-react";
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
  barber:        "from-blue-600 to-indigo-600",
  hair_salon:    "from-violet-500 to-purple-600",
  spa:           "from-emerald-500 to-teal-600",
  nail_salon:    "from-pink-500 to-rose-600",
  massage:       "from-orange-500 to-amber-600",
  multi_service: "from-indigo-500 to-violet-600",
};

function SalonCard({ salon, userCoords }) {
  const navigate = useNavigate();
  const [saved, setSaved]   = useState(() => getFavIds().includes(salon._id));
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

  const gradient = CATEGORY_GRADIENTS[salon.category] || "from-indigo-500 to-violet-600";
  const catLabel = salon.category?.replace(/_/g, " ") || "Salon";
  const rating = parseFloat(salon.averageRating || salon.rating || 0);
  const reviewCount = salon.totalReviews || salon.reviewCount || 0;
  const address = salon.address || [salon.city, salon.state].filter(Boolean).join(", ") || "Location not available";
  const hasPhoto = salon.photos?.[0] || salon.coverPhoto || salon.image || salon.ownerPhoto;

  return (
    <Link to={`/salon/${salon._id}`} className="group block">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

        {/* ── Image ─────────────────────────────────────────── */}
        <div className="relative h-48 overflow-hidden">
          {hasPhoto ? (
            <img
              src={hasPhoto}
              alt={salon.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2`}>
              <Scissors className="w-10 h-10 text-white/70" />
              <span className="text-xs text-white/60 font-medium">{salon.name}</span>
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

          {/* Top badges */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full capitalize backdrop-blur-sm ${hasPhoto ? "bg-black/50 text-white" : "bg-white/20 text-white"}`}>
              {catLabel}
            </span>
            {salon.isApproved && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-green-500 text-white">
                <CheckCircle className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
              saved ? "bg-rose-500 text-white scale-110" : "bg-white/90 text-slate-400 hover:text-rose-500 hover:scale-110"
            }`}
          >
            <Heart className={`w-4 h-4 ${saved ? "fill-white" : ""}`} />
          </button>

          {/* Open / Closed pill — bottom left */}
          {openStatus !== null && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                openStatus ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                {openStatus ? "Open Now" : "Closed"}
              </span>
            </div>
          )}

          {/* Distance — bottom right */}
          {distance && (
            <div className="absolute bottom-2.5 right-2.5">
              <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                📍 {distance}
              </span>
            </div>
          )}
        </div>

        {/* ── Info ──────────────────────────────────────────── */}
        <div className="p-3.5">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h2 className="font-bold text-slate-900 text-[15px] leading-tight line-clamp-1 flex-1">{salon.name}</h2>
            {rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-amber-400 text-sm">★</span>
                <span className="text-xs font-bold text-slate-800">{rating.toFixed(1)}</span>
                {reviewCount > 0 && <span className="text-[10px] text-slate-400">({reviewCount})</span>}
              </div>
            )}
          </div>

          {/* Address */}
          <p className="text-xs text-slate-500 flex items-center gap-1 mb-2 line-clamp-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            {address}
          </p>

          {/* Hours */}
          {todayHours && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
              <Clock className="w-3 h-3 shrink-0" />
              {todayHours}
            </p>
          )}

          {/* Gender + special badges */}
          {(salon.servedGender || salon.kidsHaircut || salon.atHomeServices) && (
            <div className="flex items-center gap-1 flex-wrap mb-3">
              {salon.servedGender && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  salon.servedGender === "male"   ? "bg-blue-50 text-blue-600" :
                  salon.servedGender === "female" ? "bg-pink-50 text-pink-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {salon.servedGender === "male" ? "👨 Men" : salon.servedGender === "female" ? "👩 Women" : "👥 Unisex"}
                </span>
              )}
              {salon.kidsHaircut && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">👶 Kids</span>
              )}
              {salon.atHomeServices && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">🏠 At-Home</span>
              )}
            </div>
          )}

          {/* Book Now CTA */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold py-2 rounded-xl text-center group-hover:shadow-md group-hover:shadow-indigo-200 transition-shadow">
              Book Now →
            </div>
            {salon.minPrice && (
              <div className="text-[10px] text-slate-500 text-right shrink-0">
                <span className="block font-semibold text-slate-700">from ₹{salon.minPrice}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}

export default SalonCard;
