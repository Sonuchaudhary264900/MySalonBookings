import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`relative text-sm font-medium transition-colors duration-200 ${
        isActive(to)
          ? "text-indigo-600"
          : "text-slate-600 hover:text-indigo-600"
      }`}
    >
      {label}
      {isActive(to) && (
        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
      )}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass shadow-sm border-b border-white/20"
          : "bg-white border-b border-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-base">✂</span>
          </div>
          <span className="text-xl font-bold text-gradient">SmartSalon</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLink("/", "Home")}
          {token && navLink("/dashboard", "My Bookings")}
          {token && navLink("/favorites", "Favorites")}
          {token && navLink("/profile", "My Profile")}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {!token ? (
            <>
              <Link to="/login" className="btn-outline text-sm py-2 px-4">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">
                Join
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-sm hover:shadow-md transition"
                title="My Profile"
              >
                U
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 flex flex-col gap-1.5">
            <span className={`block h-0.5 bg-slate-700 rounded transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 bg-slate-700 rounded transition-all ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 bg-slate-700 rounded transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 flex flex-col gap-4 fade-in">
          <Link to="/" className="text-sm font-medium text-slate-700 hover:text-indigo-600">Home</Link>
          {token && <Link to="/dashboard" className="text-sm font-medium text-slate-700 hover:text-indigo-600">My Bookings</Link>}
          {token && <Link to="/favorites" className="text-sm font-medium text-slate-700 hover:text-indigo-600">Favorites</Link>}
          {token && <Link to="/profile" className="text-sm font-medium text-slate-700 hover:text-indigo-600">My Profile</Link>}
          {!token ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Link to="/login" className="btn-outline text-center text-sm">Sign In</Link>
              <Link to="/register" className="btn-primary text-center text-sm">Join</Link>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="text-left text-sm font-medium text-red-500 border-t border-slate-100 pt-2"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
