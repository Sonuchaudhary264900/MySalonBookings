import { Link } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";

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

function SalonCard({ salon }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (saving || saved) return;
    setSaving(true);
    try {
      await API.post(`/customer/favorites/${salon._id}`);
      setSaved(true);
    } catch {
      // silent
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
          {salon.image || salon.photos?.[0] ? (
            <img
              src={salon.image || salon.photos[0]}
              alt={salon.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">✂</span>
              <span className="text-sm text-slate-400">{salon.name}</span>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className={`badge ${catClass} capitalize text-xs`}>
              {catLabel}
            </span>
          </div>

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
            <span className="text-sm">{saved ? "♥" : "♡"}</span>
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <h2 className="font-semibold text-slate-900 truncate">{salon.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{salon.city || salon.address || "Location"}</span>
          </p>

          <div className="mt-2 flex items-center justify-between">
            <StarRating rating={salon.averageRating || salon.rating} />
            {salon.totalReviews > 0 && (
              <span className="text-xs text-slate-400">({salon.totalReviews})</span>
            )}
          </div>

          {salon.workingHours?.monday && !salon.workingHours.monday.isClosed && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <span>🕐</span>
              <span>{salon.workingHours.monday.open} – {salon.workingHours.monday.close}</span>
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
            <span className="text-xs text-indigo-600 font-medium">View Details →</span>
            {salon.isApproved && (
              <span className="badge bg-green-50 text-green-600 text-xs">✓ Verified</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default SalonCard;
