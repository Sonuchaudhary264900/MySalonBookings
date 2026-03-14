import { useEffect, useState, useCallback } from "react";
import { Store, Scissors, Sparkles, Leaf, Heart, Smile, CalendarDays, Search, ClipboardList, CheckCircle, SearchX, TrendingUp, Star, MapPin, LocateFixed } from "lucide-react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";
import SearchBar from "../components/SearchBar";

const CATEGORIES = [
  { key: "all",       label: "All",        icon: <Store className="w-4 h-4" /> },
  { key: "barber",    label: "Barber",     icon: <Scissors className="w-4 h-4" /> },
  { key: "hair_salon",label: "Hair Salon", icon: <Sparkles className="w-4 h-4" /> },
  { key: "spa",       label: "Spa",        icon: <Leaf className="w-4 h-4" /> },
  { key: "massage",   label: "Massage",    icon: <Heart className="w-4 h-4" /> },
];

const STATS = [
  { label: "Salons Listed",    value: "200+", icon: <Store className="w-7 h-7 text-indigo-500" /> },
  { label: "Happy Customers",  value: "10K+", icon: <Smile className="w-7 h-7 text-amber-500" /> },
  { label: "Cities Covered",   value: "25+",  iconImg: "https://img.freepik.com/free-vector/location_53876-25530.jpg" },
  { label: "Bookings Made",    value: "50K+", icon: <CalendarDays className="w-7 h-7 text-green-500" /> },
];

const SORT_OPTIONS = [
  { key: "booked", label: "Most Booked",   icon: <TrendingUp className="w-4 h-4" /> },
  { key: "rated",  label: "Highest Rated", icon: <Star className="w-4 h-4" /> },
  { key: "nearby", label: "Nearest",       icon: <MapPin className="w-4 h-4" /> },
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
  const [salons, setSalons]           = useState([]);
  const [category, setCategory]       = useState("all");
  const [sort, setSort]               = useState("nearby");
  const [loading, setLoading]         = useState(true);
  const [locLoading, setLocLoading]   = useState(false);
  const [locDenied, setLocDenied]     = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [userCoords, setUserCoords]   = useState(null);
  // raw fetched list before category filter
  const [fetchedSalons, setFetchedSalons] = useState([]);

  // ── initial load: detect location and fetch ─────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setLocDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserCoords({ lat, lng });
        fetchBySort("nearby", { lat, lng });
      },
      () => { setLocDenied(true); setLoading(false); },
      { maximumAge: 60000, timeout: 6000 }
    );
  }, []);

  // ── fetch salons by sort + optional coords ───────────────────
  // Always uses nearby endpoint (5km radius) when coords available
  const fetchBySort = async (sortKey, coords) => {
    if (!coords) return; // no location → show prompt
    setLoading(true);
    setSearchActive(false);
    setCategory("all");
    try {
      const res = await API.get(
        `/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`
      );
      const data = res.data.data?.salons || res.data.data || [];
      setFetchedSalons(data);
      setSalons(data);
    } catch {
      setFetchedSalons([]);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  // ── sort tab click ───────────────────────────────────────────
  const handleSort = (key) => {
    setSort(key);
    fetchBySort(key, userCoords);
  };

  // ── category filter (client-side from fetched list) ──────────
  const applyCategory = useCallback(
    (cat) => {
      setCategory(cat);
      if (cat === "all") {
        setSalons(fetchedSalons);
      } else {
        setSalons(fetchedSalons.filter((s) => s.category === cat));
      }
    },
    [fetchedSalons]
  );

  // ── search ───────────────────────────────────────────────────
  const handleSearch = (query) => {
    if (!query.trim()) {
      setSalons(fetchedSalons);
      setSearchActive(false);
      return;
    }
    setSearchActive(true);
    setCategory("all");
    const q = query.toLowerCase();
    setSalons(
      fetchedSalons.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q)
      )
    );
  };

  // ── "Near Me" / "Enable Location" button ────────────────────
  const handleLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const coords = { lat, lng };
        setUserCoords(coords);
        setLocDenied(false);
        setSort("nearby");
        fetchBySort("nearby", coords).finally(() => setLocLoading(false));
      },
      () => { setLocLoading(false); alert("Could not get your location. Please allow location access in your browser settings."); }
    );
  };

  const resetFilters = () => {
    setSort("nearby");
    fetchBySort("nearby", userCoords);
  };

  const sectionTitle = searchActive
    ? "Search Results"
    : sort === "nearby" ? "Salons Near You"
    : sort === "rated"  ? "Highest Rated Salons"
    : "Most Booked Salons";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── HERO ─────────────────────────────── */}
      <section className="gradient-primary py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3 py-1 rounded-full mb-5">
            <Sparkles className="w-4 h-4" /> Trusted by 10,000+ customers
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Book Your Perfect Look <br className="hidden sm:block" />
            <span className="text-amber-300">Instantly</span>
          </h1>
          <p className="text-indigo-100 text-base sm:text-lg mb-8 max-w-xl mx-auto">
            Discover top-rated salons near you. Browse services, read reviews, and book appointments in seconds.
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar onSearch={handleSearch} onUseLocation={handleLocation} loading={locLoading} />
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ label, value, icon, iconImg }) => (
            <div key={label} className="text-center">
              <div className="mb-1 flex justify-center">
                {iconImg ? <img src={iconImg} alt={label} className="w-7 h-7 object-contain" /> : icon}
              </div>
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
              {icon} {label}
            </button>
          ))}
        </div>
      </section>

      {/* ── SORT TABS ─────────────────────────── */}
      {!locDenied && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {SORT_OPTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  sort === key
                    ? "bg-amber-400 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-amber-300"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── SALONS GRID ───────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Location denied — prompt to enable */}
        {locDenied && !searchActive && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
              <LocateFixed className="w-9 h-9 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Enable Location to See Salons</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-6">
              We show salons within <span className="font-semibold text-indigo-600">5 km</span> of your location. Please allow location access to continue.
            </p>
            <button
              onClick={handleLocation}
              disabled={locLoading}
              className="btn-primary flex items-center gap-2"
            >
              {locLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <LocateFixed className="w-4 h-4" />}
              {locLoading ? "Detecting…" : "Allow Location Access"}
            </button>
          </div>
        )}

        {!locDenied && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="section-title">{sectionTitle}</h2>
                {!loading && (
                  <p className="text-muted mt-0.5">
                    {salons.length} salon{salons.length !== 1 ? "s" : ""} within 5 km
                  </p>
                )}
              </div>
              {searchActive && (
                <button onClick={resetFilters} className="text-sm text-indigo-600 hover:underline font-medium">
                  ← Show All
                </button>
              )}
            </div>

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!loading && salons.length === 0 && (
              <div className="text-center py-20">
                <div className="flex justify-center mb-4"><SearchX className="w-12 h-12 text-slate-300" /></div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No salons found nearby</h3>
                <p className="text-slate-400 text-sm mb-6">No salons found within 5 km of your location.</p>
                <button onClick={resetFilters} className="btn-primary">Reset Filters</button>
              </div>
            )}

            {!loading && salons.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {salons.map((salon) => (
                  <SalonCard key={salon._id} salon={salon} userCoords={userCoords} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── HOW IT WORKS ──────────────────────── */}
      <section className="bg-white border-t border-slate-100 mt-12 py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-2">How It Works</h2>
          <p className="text-muted text-center mb-10">Book your appointment in 3 easy steps</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: <Search className="w-7 h-7 text-white" />,        title: "Find a Salon",     desc: "Search by name, city, or use your location to find the nearest salons." },
              { step: "02", icon: <ClipboardList className="w-7 h-7 text-white" />, title: "Choose a Service", desc: "Browse services, check prices and durations, then pick what suits you." },
              { step: "03", icon: <CheckCircle className="w-7 h-7 text-white" />,   title: "Book Instantly",   desc: "Pick your date and time slot and confirm your booking in seconds." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
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
