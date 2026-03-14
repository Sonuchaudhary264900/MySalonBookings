import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";
import SearchBar from "../components/SearchBar";

const CATEGORIES = [
  { key: "all", label: "All", icon: "🏪" },
  { key: "barber", label: "Barber", icon: "✂" },
  { key: "hair_salon", label: "Hair Salon", icon: "💇" },
  { key: "spa", label: "Spa", icon: "🧖" },
  { key: "massage", label: "Massage", icon: "💆" },
];

const STATS = [
  { label: "Salons Listed", value: "200+", icon: "🏪" },
  { label: "Happy Customers", value: "10K+", icon: "😊" },
  { label: "Cities Covered", value: "25+", icon: "📍" },
  { label: "Bookings Made", value: "50K+", icon: "📅" },
];

function SkeletonCard() {
  return (
    <div className="card">
      <div className="h-44 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-1/3" />
      </div>
    </div>
  );
}

function Home() {
  const [allSalons, setAllSalons] = useState([]);
  const [salons, setSalons] = useState([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [isNearby, setIsNearby] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  useEffect(() => {
    loadSalons();
  }, []);

  const loadSalons = async () => {
    setLoading(true);
    try {
      const res = await API.get("/public/salons");
      const data = res.data.data?.salons || res.data.salons || [];
      setAllSalons(data);
      setSalons(data);
    } catch {
      setAllSalons([]);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const applyCategory = useCallback(
    (cat, base = allSalons) => {
      setCategory(cat);
      if (cat === "all") {
        setSalons(base);
      } else {
        setSalons(base.filter((s) => s.category === cat));
      }
    },
    [allSalons]
  );

  const handleSearch = (query) => {
    if (!query.trim()) {
      setSalons(allSalons);
      setSearchActive(false);
      return;
    }
    setSearchActive(true);
    setIsNearby(false);
    setCategory("all");
    const q = query.toLowerCase();
    setSalons(
      allSalons.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q)
      )
    );
  };

  const handleLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await API.get(`/public/salons/nearby?latitude=${lat}&longitude=${lng}`);
          const data = res.data.data?.salons || res.data.salons || [];
          setAllSalons(data);
          setSalons(data);
          setIsNearby(true);
          setSearchActive(false);
          setCategory("all");
        } catch {
          alert("Could not find nearby salons.");
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        setLocLoading(false);
        alert("Could not get your location.");
      }
    );
  };

  const resetFilters = () => {
    loadSalons();
    setIsNearby(false);
    setSearchActive(false);
    setCategory("all");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HERO ─────────────────────────────── */}
      <section className="gradient-primary py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full mb-5">
            <span>⭐</span> Trusted by 10,000+ customers
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Book Your Perfect Look <br className="hidden sm:block" />
            <span className="text-amber-300">Instantly</span>
          </h1>
          <p className="text-indigo-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Discover top-rated salons near you. Browse services, read reviews, and book appointments in seconds.
          </p>

          {/* Search bar in hero */}
          <div className="max-w-2xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              onUseLocation={handleLocation}
              loading={locLoading}
            />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ label, value, icon }) => (
            <div key={label} className="text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xl font-extrabold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORY FILTER ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => applyCategory(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
              }`}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── SALONS GRID ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="section-title">
              {isNearby ? "Salons Near You" : searchActive ? "Search Results" : "Featured Salons"}
            </h2>
            {!loading && (
              <p className="text-muted mt-0.5">
                {salons.length} salon{salons.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
          {(isNearby || searchActive) && (
            <button
              onClick={resetFilters}
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              ← Show All
            </button>
          )}
        </div>

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && salons.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No salons found</h3>
            <p className="text-slate-400 text-sm mb-6">Try a different search or browse all salons.</p>
            <button onClick={resetFilters} className="btn-primary">Browse All Salons</button>
          </div>
        )}

        {/* Grid */}
        {!loading && salons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {salons.map((salon) => (
              <SalonCard key={salon._id} salon={salon} />
            ))}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ──────────────────────── */}
      <section className="bg-white border-t border-slate-100 mt-12 py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-2">How It Works</h2>
          <p className="text-muted text-center mb-10">Book your appointment in 3 easy steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: "🔍", title: "Find a Salon", desc: "Search by name, city, or use your location to find the nearest salons." },
              { step: "02", icon: "📋", title: "Choose a Service", desc: "Browse services, check prices and durations, then pick what suits you." },
              { step: "03", icon: "✅", title: "Book Instantly", desc: "Pick your date and time slot and confirm your booking in seconds." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-md">
                  {icon}
                </div>
                <div className="text-xs font-bold text-indigo-400 mb-1">STEP {step}</div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
