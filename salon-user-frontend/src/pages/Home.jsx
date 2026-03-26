import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { SearchX, Users, Star, TrendingUp, MapPin } from "lucide-react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";
import HeroSection from "../components/HeroSection";
import HowItWorks from "../components/HowItWorks";
import FeaturesSection from "../components/FeaturesSection";

// ── Helpers ────────────────────────────────────────────────────
function getUserName() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "there";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.firstName || payload.username || "there";
  } catch { return "there"; }
}

const CATEGORIES = [
  { key: "all",                  label: "All",           icon: "🏠" },
  { key: "Hair Services",        label: "Hair",          icon: "✂️" },
  { key: "Beard & Grooming",     label: "Beard",         icon: "🧔" },
  { key: "Nail Services",        label: "Nails",         icon: "💅" },
  { key: "Skin & Face / Beauty", label: "Skin & Beauty", icon: "🧖" },
  { key: "Spa & Massage",        label: "Spa",           icon: "💆" },
  { key: "Body Grooming",        label: "Body",          icon: "🧴" },
  { key: "Bridal & Events",      label: "Bridal",        icon: "👰" },
  { key: "Kids Services",        label: "Kids",          icon: "👶" },
  { key: "At-Home Services",     label: "At-Home",       icon: "🏡" },
];

const CATEGORY_ALIASES = {
  "Hair Services":        ["Hair Services", "Hair Services (Men)", "Hair Services (Women)"],
  "Skin & Face / Beauty": ["Skin & Face / Beauty", "Skin & Face (Men Grooming)", "Skin & Beauty"],
  "Spa & Massage":        ["Spa & Massage", "Spa & Relaxation"],
};

const MALE_ONLY_CHIPS   = ["Beard & Grooming", "Body Grooming"];
const FEMALE_ONLY_CHIPS = ["Bridal & Events"];

const GENDER_FILTERS = [
  { key: "all",    label: "All",    icon: <Users className="w-3.5 h-3.5" /> },
  { key: "male",   label: "Men",    icon: <span>👨</span> },
  { key: "female", label: "Women",  icon: <span>👩</span> },
  { key: "unisex", label: "Unisex", icon: <span>👥</span> },
];

const TRENDING_SERVICES = [
  { label: "Hair Cut",   icon: "✂️", cat: "Hair Services" },
  { label: "Beard Trim", icon: "🧔", cat: "Beard & Grooming" },
  { label: "Facial",     icon: "🧖", cat: "Skin & Face / Beauty" },
  { label: "Spa",        icon: "💆", cat: "Spa & Massage" },
  { label: "Nails",      icon: "💅", cat: "Nail Services" },
  { label: "Bridal",     icon: "👰", cat: "Bridal & Events" },
  { label: "Kids Hair",  icon: "👶", cat: "Kids Services" },
  { label: "At-Home",    icon: "🏡", cat: "At-Home Services" },
];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-1/3" />
      </div>
    </div>
  );
}

function MiniSalonCard({ salon, userCoords }) {
  const rating = parseFloat(salon.averageRating || salon.rating || 0);
  const hasPhoto = salon.photos?.[0] || salon.coverPhoto || salon.image || salon.ownerPhoto;
  const GRADIENTS = {
    barber:        "from-blue-500 to-indigo-600",
    hair_salon:    "from-violet-500 to-purple-600",
    spa:           "from-emerald-500 to-teal-600",
    nail_salon:    "from-pink-500 to-rose-600",
    massage:       "from-orange-500 to-amber-600",
    multi_service: "from-indigo-500 to-violet-600",
  };
  const gradient = GRADIENTS[salon.category] || "from-indigo-500 to-violet-600";

  let distLabel = null;
  if (userCoords && salon.location?.coordinates?.length === 2) {
    const [lng, lat] = salon.location.coordinates;
    const R = 6371;
    const dLat = (lat - userCoords.lat) * Math.PI / 180;
    const dLng = (lng - userCoords.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(userCoords.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distLabel = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  return (
    <Link to={`/salon/${salon._id}`} className="group block shrink-0 w-44 sm:w-48">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="relative h-28 overflow-hidden">
          {hasPhoto ? (
            <img src={hasPhoto} alt={salon.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-3xl">✂</span>
            </div>
          )}
          {rating > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {rating.toFixed(1)}
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-xs font-bold text-slate-900 truncate leading-tight">{salon.name}</p>
          {distLabel && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 shrink-0" /> {distLabel}
            </p>
          )}
          <div className="mt-1.5 text-[10px] font-bold text-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-1 rounded-lg">
            Book Now
          </div>
        </div>
      </div>
    </Link>
  );
}

function Home() {
  const isLoggedIn = !!localStorage.getItem("customerToken");
  const userName   = getUserName();

  const [salons, setSalons]             = useState([]);
  const [allSalons, setAllSalons]       = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [genderFilter, setGenderFilter] = useState(() => {
    const g = localStorage.getItem("customerGender");
    return g === "male" || g === "female" ? g : "all";
  });
  const [sort, setSort]                 = useState("nearby");
  const [loading, setLoading]           = useState(true);
  const [locLoading, setLocLoading]     = useState(false);
  const [locDenied, setLocDenied]       = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [searching, setSearching]       = useState(false);
  const [userCoords, setUserCoords]     = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");
  const [upcomingCount, setUpcomingCount] = useState(0);
  const searchTimer = useRef(null);

  // ── initial location detect ──────────────────────────────────
  useEffect(() => {
    let ignore = false;
    if (!navigator.geolocation) { setLocDenied(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (ignore) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchBySort("nearby", coords);
      },
      () => { if (!ignore) { setLocDenied(true); setLoading(false); } },
      { maximumAge: 60000, timeout: 6000 }
    );
    return () => { ignore = true; };
  }, []);

  // ── fetch upcoming count for logged-in user ──────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    API.get("/customer/bookings").then(res => {
      const arr = res.data.data?.bookings || res.data.data || [];
      const count = Array.isArray(arr) ? arr.filter(b => ["pending", "confirmed", "in_progress"].includes(b.status)).length : 0;
      setUpcomingCount(count);
    }).catch(() => {});
  }, [isLoggedIn]);

  const applyFilters = (data, cats, gender) => {
    let result = data;
    if (cats.length > 0) {
      result = result.filter((s) =>
        cats.some((cat) => {
          const aliases = CATEGORY_ALIASES[cat] || [cat];
          return (s.offeredCategoryNames || []).some((n) => aliases.includes(n));
        })
      );
    }
    if (gender === "unisex") {
      result = result.filter((s) => (s.servedGender || "unisex") === "unisex");
    } else if (gender !== "all") {
      result = result.filter((s) => {
        const sg = s.servedGender || "unisex";
        return sg === gender || sg === "unisex";
      });
    }
    return result;
  };

  const fetchBySort = async (sortKey, coords, cats, gender) => {
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
      const activeCats   = cats   ?? selectedCats;
      const activeGender = gender ?? genderFilter;
      setSalons(applyFilters(data, activeCats, activeGender));
    } catch {
      setAllSalons([]);
      setSalons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSort(key);
    setSelectedCats([]);
    setGenderFilter("all");
    fetchBySort(key, userCoords, [], "all");
  };

  const handleCategory = (cat) => {
    let newCats;
    if (cat === "all") {
      newCats = [];
    } else {
      newCats = selectedCats.includes(cat)
        ? selectedCats.filter((c) => c !== cat)
        : [...selectedCats, cat];
    }
    setSelectedCats(newCats);
    if (searchText.trim()) {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => runSearch(searchText, newCats), 0);
    } else {
      setSalons(applyFilters(allSalons, newCats, genderFilter));
    }
  };

  const handleGenderFilter = (gender) => {
    const newCats = selectedCats.filter((k) => {
      if (gender === "female" && MALE_ONLY_CHIPS.includes(k))   return false;
      if (gender === "male"   && FEMALE_ONLY_CHIPS.includes(k)) return false;
      return true;
    });
    setSelectedCats(newCats);
    setGenderFilter(gender);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchText.trim()) {
      searchTimer.current = setTimeout(() => runSearch(searchText, newCats, gender), 0);
    } else {
      setSalons(applyFilters(allSalons, newCats, gender));
    }
  };

  const runSearch = useCallback(async (text, cats, gender) => {
    if (!text.trim()) return;
    setSearching(true);
    setServiceMatchLabel("");
    const q = text.toLowerCase();
    const activeCats   = cats   ?? selectedCats;
    const activeGender = gender ?? genderFilter;

    const local = allSalons.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
    const localFiltered = applyFilters(local, activeCats, activeGender);

    if (localFiltered.length > 0) {
      setSalons(localFiltered);
      setSearching(false);
      return;
    }

    try {
      const res = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const data = res.data.data;
      if (data?.salons?.length > 0) {
        const filtered = applyFilters(data.salons, activeCats, activeGender);
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
  }, [allSalons, selectedCats, genderFilter]);

  const handleSearch = (text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setServiceMatchLabel("");
      setSalons(applyFilters(allSalons, selectedCats, genderFilter));
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(text, selectedCats), 400);
  };

  const clearSearch = () => handleSearch("");

  const handleLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocDenied(false);
        setSort("nearby");
        setGenderFilter("all");
        fetchBySort("nearby", coords, [], "all").finally(() => setLocLoading(false));
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

  // Derive smart sections from loaded data
  const topRatedSalons = [...allSalons]
    .filter(s => parseFloat(s.averageRating || s.rating || 0) >= 4.0)
    .sort((a, b) => parseFloat(b.averageRating || b.rating || 0) - parseFloat(a.averageRating || a.rating || 0))
    .slice(0, 10);

  return (
    <div className="bg-slate-50">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <HeroSection
        searchText={searchText}
        onSearch={handleSearch}
        onLocate={handleLocation}
        locLoading={locLoading}
        searching={searching}
        isLoggedIn={isLoggedIn}
        userName={userName}
        nearbyCount={allSalons.length}
        upcomingCount={upcomingCount}
      />

      {/* ── TRENDING SERVICES ────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">Trending Services</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {TRENDING_SERVICES.map(({ label, icon, cat }) => (
              <button
                key={label}
                onClick={() => {
                  handleCategory(cat);
                  document.getElementById("salons")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all shrink-0 border ${
                  selectedCats.includes(cat)
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-md shadow-indigo-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SALONS SECTION ────────────────────────────────────── */}
      <div id="salons" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">

        {/* Category chips */}
        {(() => {
          const visible = CATEGORIES.filter(({ key }) => {
            if (key === "all") return true;
            if (genderFilter === "female" && MALE_ONLY_CHIPS.includes(key))   return false;
            if (genderFilter === "male"   && FEMALE_ONLY_CHIPS.includes(key)) return false;
            return true;
          });
          return (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {visible.map(({ key, label, icon }) => {
                const isActive = key === "all" ? selectedCats.length === 0 : selectedCats.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleCategory(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Gender + sort row */}
        {(!locDenied || isSearchActive) && (
          <div className="flex items-center justify-between flex-wrap gap-2 mt-2 mb-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {GENDER_FILTERS.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => handleGenderFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
                    genderFilter === key
                      ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                      : "bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-500"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            {!isSearchActive && !locDenied && (
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value)}
                className="text-xs text-indigo-600 font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:border-indigo-300 transition"
              >
                <option value="nearby">📍 Nearest</option>
                <option value="booked">🔥 Most Booked</option>
                <option value="rated">⭐ Top Rated</option>
              </select>
            )}
          </div>
        )}

        {/* Location denied */}
        {locDenied && !isSearchActive && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
              <span className="text-4xl">📍</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Enable Location to See Salons</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-6">
              We show salons within <span className="font-semibold text-indigo-600">5 km</span> of your location.
            </p>
            <button
              onClick={handleLocation}
              disabled={locLoading}
              className="btn-primary flex items-center gap-2"
            >
              {locLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : "📍"}
              {locLoading ? "Detecting…" : "Allow Location Access"}
            </button>
          </div>
        )}

        {/* Salon grid */}
        {(!locDenied || isSearchActive) && (
          <div className="py-2">
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

            {/* Skeletons */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!loading && salons.length === 0 && (
              <div className="text-center py-20">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No salons found</h3>
                <p className="text-slate-400 text-sm mb-6">
                  {isSearchActive
                    ? "No salons or services matching your search."
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

      {/* ── TOP RATED SALONS ──────────────────────────────────── */}
      {topRatedSalons.length > 0 && !isSearchActive && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div>
                <h2 className="text-base font-bold text-slate-800">Top Rated Near You</h2>
                <p className="text-xs text-slate-400">Highest rated salons in your area</p>
              </div>
            </div>
            <button
              onClick={() => handleSort("rated")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              See all →
            </button>
          </div>
          <div className="flex gap-3.5 overflow-x-auto scrollbar-hide pb-2">
            {topRatedSalons.map(salon => (
              <MiniSalonCard key={salon._id} salon={salon} userCoords={userCoords} />
            ))}
          </div>
        </div>
      )}

      {/* ── BOOKINGS WIDGET (logged-in only) ─────────────────── */}
      {isLoggedIn && upcomingCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-2xl">📅</div>
              <div>
                <p className="text-white font-bold text-sm">You have {upcomingCount} upcoming booking{upcomingCount > 1 ? "s" : ""}</p>
                <p className="text-indigo-200 text-xs mt-0.5">Tap to view details, reschedule or cancel</p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="shrink-0 bg-white text-indigo-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-yellow-300 hover:text-indigo-800 transition shadow-sm"
            >
              View →
            </Link>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <HowItWorks />

      {/* ── FEATURES + TRUST ──────────────────────────────────── */}
      <FeaturesSection />

    </div>
  );
}

export default Home;
