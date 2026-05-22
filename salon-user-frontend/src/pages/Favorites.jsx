import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("customerToken");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await API.get("/customer/favorites");
      setFavorites(res.data.data?.salons || res.data.data || []);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="t-page py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">Saved Salons</h1>
          <p className="text-muted mt-1">Your favourite salons, all in one place.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card">
                <div className="h-44 skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="flex justify-center mb-4"><Heart size={52} strokeWidth={1.5} className="text-slate-300" /></div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No saved salons yet</h3>
            <p className="text-slate-400 text-sm mb-6">
              Tap the heart icon on any salon to save it here.
            </p>
            <button onClick={() => navigate("/")} className="btn-primary">
              Browse Salons
            </button>
          </div>
        ) : (
          <>
            <p className="text-muted mb-5">{favorites.length} saved salon{favorites.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {favorites.map((salon) => (
                <SalonCard key={salon._id} salon={salon} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Favorites;
