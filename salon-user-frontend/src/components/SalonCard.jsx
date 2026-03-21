import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Heart, Clock, CheckCircle, Scissors } from "lucide-react";
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

// Haversine formula — returns distance in km between two lat/lng points
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

function StarRating({ rating }) {
  const r = parseFloat(rating) || 4.5;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-sm ${star <= Math.round(r) ? "text-amber-400" : "text-slate-200"}`}
        >
          ★
        </span>
      ))}
      <span className="text-xs text-slate-500 ml-1">{r.toFixed(1)}</span>
    </div>
  );
}

function SalonCard({ salon, userCoords }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => getFavIds().includes(salon._id));
  const [saving, setSaving] = useState(false);

  // Keep in sync if another card updates localStorage
  useEffect(() => {
    setSaved(getFavIds().includes(salon._id));
  }, [salon._id]);

  // Memoised — only recalculates when the user moves or a different salon is shown
  const distance = useMemo(() => {
    if (!userCoords) return null;
    const coords = salon.location?.coordinates;
    if (!coords || coords.length < 2) return null;
    const [salonLng, salonLat] = coords; // GeoJSON is [lng, lat]
    const km = getDistanceKm(userCoords.lat, userCoords.lng, salonLat, salonLng);
    return formatDistance(km);
  }, [userCoords, salon.location]);

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;

    if (!isCustomer()) {
      navigate("/login");
      return;
    }

    setSaving(true);
    try {
      const res = await API.post(`/customer/favorites/${salon._id}`);
      const liked = res.data?.liked ?? !saved;
      // persist to localStorage
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
    barber: "bg-blue-50 text-blue-600",
    hair_salon: "bg-purple-50 text-purple-600",
    spa: "bg-green-50 text-green-600",
    nail_salon: "bg-pink-50 text-pink-600",
    massage: "bg-orange-50 text-orange-600",
    multi_service: "bg-indigo-50 text-indigo-600",
  };
  const catClass = categoryColors[salon.category] || "bg-slate-100 text-slate-600";
  const catLabel = salon.category?.replace("_", " ") || "Salon";

  return (
    <Link to={`/salon/${salon._id}`} className="group block">
      <div className="card group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200">
        {/* Image */}
        <div className="relative h-44 bg-gradient-to-br from-indigo-100 to-violet-100 overflow-hidden">
          {salon.coverPhoto || salon.image || salon.photos?.[0] || salon.ownerPhoto ? (
            <img
              src={salon.coverPhoto || salon.image || salon.photos?.[0] || salon.ownerPhoto}
              alt={salon.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Scissors className="w-10 h-10 text-indigo-300" />
              <span className="text-sm text-slate-400">{salon.name}</span>
            </div>
          )}

          {/* Owner logo */}
          {salon.logo && (
            <div className="absolute bottom-3 left-3">
              <img
                src={salon.logo}
                alt="logo"
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
              />
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className={`badge ${catClass} capitalize text-xs`}>
              {catLabel}
            </span>
          </div>

          {/* Online indicator */}
          {salon.isOnline && (
            <div className="absolute top-3 right-12 flex items-center gap-1 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span>
              Online
            </div>
          )}

          {/* Favorite button */}
          <button
            onClick={handleFavorite}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all ${
              saved
                ? "bg-rose-500 text-white"
                : "bg-white/90 text-slate-400 hover:text-rose-500"
            }`}
            title={saved ? "Saved!" : "Save"}
          >
            <Heart className={`w-4 h-4 ${saved ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <h2 className="font-semibold text-slate-900 truncate">{salon.name}</h2>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-slate-500 flex items-center gap-1 min-w-0">
              <img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-4 h-4 object-contain shrink-0" />
              <span className="truncate">{salon.city || salon.address || "Location"}</span>
            </p>
            {distance && (
              <span className="ml-2 shrink-0 flex items-center gap-0.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                <img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-3.5 h-3.5 object-contain" /> {distance}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <StarRating rating={salon.averageRating || salon.rating} />
            {salon.totalReviews > 0 && (
              <span className="text-xs text-slate-400">({salon.totalReviews})</span>
            )}
          </div>

          {salon.workingHours?.monday && !salon.workingHours.monday.isClosed && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{salon.workingHours.monday.open} – {salon.workingHours.monday.close}</span>
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
            <span className="text-xs text-indigo-600 font-medium">View Details →</span>
            {salon.isApproved && (
              <span className="badge bg-green-50 text-green-600 text-xs flex items-center gap-1">
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
