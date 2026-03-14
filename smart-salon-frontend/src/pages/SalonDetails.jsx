import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import ServiceCard from "../components/ServiceCard";
import ReviewCard from "../components/ReviewCard";
import AddReview from "../components/AddReview";

const TABS = ["Services", "Reviews", "Info"];

function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("Services");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews()]).finally(() =>
      setLoading(false)
    );
  }, [id]);

  const loadSalon = async () => {
    try {
      const res = await API.get(`/public/salons/${id}`);
      setSalon(res.data.data || res.data.salon);
    } catch {/* silent */}
  };

  const loadServices = async () => {
    try {
      const res = await API.get(`/public/salons/${id}/services`);
      setServices(res.data.data?.services || res.data.data || []);
    } catch {/* silent */}
  };

  const loadReviews = async () => {
    try {
      const res = await API.get(`/public/salons/${id}/reviews`);
      setReviews(res.data.data?.reviews || res.data.data || []);
    } catch {/* silent */}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-56 skeleton" />
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <div className="h-6 skeleton rounded w-1/2" />
          <div className="h-4 skeleton rounded w-1/3" />
          <div className="h-4 skeleton rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-slate-600 mb-4">Salon not found.</p>
          <button onClick={() => navigate("/")} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  const avgRating =
    salon.averageRating || salon.rating
      ? parseFloat(salon.averageRating || salon.rating).toFixed(1)
      : null;

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HERO IMAGE ─────────────────────── */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-indigo-400 to-violet-500 overflow-hidden">
        {(salon.image || salon.photos?.[0]) ? (
          <img
            src={salon.image || salon.photos[0]}
            alt={salon.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-7xl opacity-30">✂</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:bg-white/30 transition"
        >
          ←
        </button>

        {/* Salon name overlay */}
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{salon.name}</h1>
              <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                <span>📍</span>
                {salon.address || salon.city}
              </p>
            </div>
            {avgRating && (
              <div className="bg-amber-400 text-white font-bold rounded-xl px-3 py-1.5 text-center shrink-0">
                <div className="text-lg leading-none">{avgRating}</div>
                <div className="text-xs">★ rating</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {salon.category && (
            <span className="badge bg-indigo-50 text-indigo-600 capitalize">
              {salon.category.replace("_", " ")}
            </span>
          )}
          {salon.isApproved && (
            <span className="badge bg-green-50 text-green-600">✓ Verified</span>
          )}
          {salon.phone && (
            <a href={`tel:${salon.phone}`} className="badge bg-slate-100 text-slate-600 hover:bg-slate-200">
              📞 {salon.phone}
            </a>
          )}
          {reviews.length > 0 && (
            <span className="badge bg-amber-50 text-amber-600">
              ⭐ {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-100 mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
              {t === "Services" && services.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/25" : "bg-slate-100"}`}>
                  {services.length}
                </span>
              )}
              {t === "Reviews" && reviews.length > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? "bg-white/25" : "bg-slate-100"}`}>
                  {reviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── SERVICES TAB ──────────────────── */}
        {tab === "Services" && (
          <div className="fade-in">
            {services.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">✂</div>
                <p className="text-slate-500">No services listed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <ServiceCard key={service._id} service={service} salonId={id} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS TAB ───────────────────── */}
        {tab === "Reviews" && (
          <div className="fade-in">
            {token && <AddReview salonId={id} onReviewAdded={loadReviews} />}
            {!token && (
              <div className="mb-5 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700 flex items-center justify-between gap-3">
                <span>Sign in to leave a review</span>
                <button onClick={() => navigate("/login")} className="btn-primary text-sm py-1.5 px-3">Sign In</button>
              </div>
            )}
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-slate-500">No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <ReviewCard key={r._id} review={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INFO TAB ──────────────────────── */}
        {tab === "Info" && (
          <div className="fade-in space-y-4">
            {salon.description && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-800 mb-2">About</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{salon.description}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Contact & Location</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {salon.address && (
                  <li className="flex gap-2"><span>📍</span> {salon.address}</li>
                )}
                {salon.city && (
                  <li className="flex gap-2"><span>🏙</span> {salon.city}</li>
                )}
                {salon.phone && (
                  <li className="flex gap-2"><span>📞</span>
                    <a href={`tel:${salon.phone}`} className="text-indigo-600 hover:underline">{salon.phone}</a>
                  </li>
                )}
                {salon.email && (
                  <li className="flex gap-2"><span>✉</span>
                    <a href={`mailto:${salon.email}`} className="text-indigo-600 hover:underline">{salon.email}</a>
                  </li>
                )}
              </ul>
            </div>

            {salon.workingHours && (
              <div className="bg-white rounded-xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-800 mb-3">Working Hours</h3>
                <div className="space-y-2">
                  {dayOrder.map((day) => {
                    const h = salon.workingHours[day];
                    if (!h) return null;
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize text-slate-600 font-medium">{day}</span>
                        {h.isClosed ? (
                          <span className="text-red-400">Closed</span>
                        ) : (
                          <span className="text-slate-700">{h.open} – {h.close}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SalonDetails;
