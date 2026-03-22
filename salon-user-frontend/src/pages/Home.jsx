import { useEffect, useState, useCallback, useRef } from "react";
import { Store, Scissors, Sparkles, Leaf, Heart, TrendingUp, Star, MapPin, LocateFixed, SearchX, X, MoreHorizontal } from "lucide-react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";

const CATEGORIES = [
  { key: "all",        label: "All",        icon: <Store className="w-4 h-4" /> },
  { key: "barber",     label: "Barber",     icon: <Scissors className="w-4 h-4" /> },
  { key: "hair_salon", label: "Hair Salon", icon: <Sparkles className="w-4 h-4" /> },
  { key: "spa",        label: "Spa",        icon: <Leaf className="w-4 h-4" /> },
  { key: "massage",    label: "Massage",    icon: <Heart className="w-4 h-4" /> },
  { key: "other",      label: "Other",      icon: <MoreHorizontal className="w-4 h-4" /> },
];

const SORT_OPTIONS = [
  { key: "nearby", label: "Nearest",       icon: <MapPin className="w-3.5 h-3.5" /> },
  { key: "booked", label: "Most Booked",   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: "rated",  label: "Top Rated",     icon: <Star className="w-3.5 h-3.5" /> },
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
  const [salons, setSalons]             = useState([]);
  const [allSalons, setAllSalons]       = useState([]);
  const [category, setCategory]         = useState("all");
  const [sort, setSort]                 = useState("nearby");
  const [loading, setLoading]           = useState(true);
  const [locLoading, setLocLoading]     = useState(false);
  const [locDenied, setLocDenied]       = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [searching, setSearching]       = useState(false);
  const [userCoords, setUserCoords]     = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");
  const searchTimer                     = useRef(null);

  // ── initial location detect ──────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setLocDenied(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchBySort("nearby", coords);
      },
      () => { setLocDenied(true); setLoading(false); },
      { maximumAge: 60000, timeout: 6000 }
    );
  }, []);

  // ── fetch salons from API ─────────────────────────────────────
  const fetchBySort = async (sortKey, coords, cat) => {
    if (!coords) return;
    setLoading(true);
    setSearchText("");
    setServiceMatchLabel("");
    try {
      const res = await API.get(
        `/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`
      );
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      const activeCat = cat ?? category;
      setSalons(activeCat === "all" ? data : data.filter((s) => s.category === activeCat));
    } catch {
      setAllSalons([]);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  // ── sort tab ──────────────────────────────────────────────────
  const handleSort = (key) => {
    setSort(key);
    setCategory("all");
    fetchBySort(key, userCoords, "all");
  };

  // ── category filter (client-side) ────────────────────────────
  const handleCategory = (cat) => {
    setCategory(cat);
    if (searchText.trim()) {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => runSearch(searchText, cat), 0);
    } else {
      setSalons(cat === "all" ? allSalons : allSalons.filter((s) => s.category === cat));
    }
  };

  // ── search (debounced 400 ms) ─────────────────────────────────
  const runSearch = useCallback(async (text, cat) => {
    if (!text.trim()) return;
    setSearching(true);
    setServiceMatchLabel("");
    const q = text.toLowerCase();
    const activeCat = cat ?? category;

    // local match first
    const local = allSalons.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
    const localFiltered = activeCat === "all" ? local : local.filter((s) => s.category === activeCat);

    if (localFiltered.length > 0) {
      setSalons(localFiltered);
      setSearching(false);
      return;
    }

    // service search
    try {
      const res = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const data = res.data.data;
      if (data?.salons?.length > 0) {
        const filtered = activeCat === "all" ? data.salons : data.salons.filter((s) => s.category === activeCat);
        setSalons(filtered);
        setServiceMatchLabel(`Salons offering "${data.matchedService}"`);
      } else {
        setSalons([]);
      }
    } catch {
      setSalons([]);
    } finally {
      setSearching(false);
    }
  }, [allSalons, category]);

  const handleSearch = (text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setServiceMatchLabel("");
      setSalons(category === "all" ? allSalons : allSalons.filter((s) => s.category === category));
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(text, category), 400);
  };

  const clearSearch = () => handleSearch("");

  // ── "Enable Location" button ──────────────────────────────────
  const handleLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocDenied(false);
        setSort("nearby");
        fetchBySort("nearby", coords, "all").finally(() => setLocLoading(false));
      },
      () => {
        setLocLoading(false);
        alert("Could not get your location. Please allow location access in your browser settings.");
      }
    );
  };

  const isSearchActive = searchText.trim().length > 0;

  const sectionTitle = serviceMatchLabel
    ? serviceMatchLabel
    : isSearchActive
    ? "Search Results"
    : sort === "nearby" ? "Salons Near You"
    : sort === "rated"  ? "Top Rated Salons"
    : "Most Booked Salons";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER (matches app HomeScreen header) ───────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 pt-5 pb-4">
        <div className="max-w-3xl mx-auto">

          {/* Top row: title + subtitle left | location btn right */}
          <div className="flex items-center justify-between mb-[14px]">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-tight">Find Nearby Salons</h1>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {locDenied ? "Search to find salons" : "Salons within 5 km"}
              </p>
            </div>
            <button
              onClick={handleLocation}
              disabled={locLoading}
              title="Use my location"
              className="w-9 h-9 rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition disabled:opacity-50 shrink-0"
            >
              {locLoading
                ? <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                : <LocateFixed className="w-5 h-5" />}
            </button>
          </div>

          {/* Search bar: matches app searchBar style exactly */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl border border-slate-200 px-3 h-[46px] focus-within:border-indigo-400 focus-within:bg-white transition">
            <svg className="w-[18px] h-[18px] text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search salons, services, city..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-slate-800 placeholder-slate-400 outline-none"
            />
            {isSearchActive && !searching && (
              <button onClick={clearSearch} className="text-slate-400 hover:text-slate-600 transition shrink-0">
                <X className="w-[18px] h-[18px]" />
              </button>
            )}
            {searching && (
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">

        {/* ── CATEGORY CHIPS ──────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {CATEGORIES.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => handleCategory(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                category === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── SORT TABS ───────────────────────────────────────── */}
        {!locDenied && !isSearchActive && (
          <div className="flex gap-2 mt-2 mb-1 pb-1">
            {SORT_OPTIONS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all border ${
                  sort === key
                    ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {/* ── LOCATION DENIED ─────────────────────────────────── */}
        {locDenied && !isSearchActive && (
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

        {/* ── SALONS GRID ─────────────────────────────────────── */}
        {(!locDenied || isSearchActive) && (
          <div className="py-4">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">{sectionTitle}</h2>
                {!loading && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {salons.length} salon{salons.length !== 1 ? "s" : ""} {isSearchActive ? "found" : "nearby"}
                  </p>
                )}
              </div>
              {isSearchActive && (
                <button onClick={clearSearch} className="text-sm text-indigo-600 hover:underline font-medium">
                  ← Show All
                </button>
              )}
            </div>

            {/* Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!loading && salons.length === 0 && (
              <div className="text-center py-20">
                <div className="flex justify-center mb-4">
                  <SearchX className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No salons found</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {isSearchActive
                    ? "No salons or services matching your search were found."
                    : "No salons found within 5 km of your location."}
                </p>
                <button onClick={clearSearch} className="btn-primary">Reset Filters</button>
              </div>
            )}

            {/* Cards */}
            {!loading && salons.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {salons.map((salon) => (
                  <div key={salon._id} className="relative">
                    <SalonCard salon={salon} userCoords={userCoords} />
                    {salon.matchedServices?.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-3 pb-3 -mt-1">
                        {salon.matchedServices.slice(0, 3).map((svcName) => (
                          <span key={svcName} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            {svcName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Home;
