import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

// ── Helpers ────────────────────────────────────────────────
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_ICON = {
  success: "✅",
  error:   "❌",
  warning: "⚠️",
  info:    "ℹ️",
  booking: "📅",
  cancel:  "🚫",
};

// ── Notification Panel ─────────────────────────────────────
function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead, removeNotification, clearAll } =
    useNotifications();

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-red-500 transition"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm text-slate-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-50 ${
                !n.read ? "bg-indigo-50/40" : ""
              }`}
            >
              <span className="text-xl mt-0.5 shrink-0">
                {TYPE_ICON[n.type] || TYPE_ICON.info}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                )}
                <p className="text-xs text-slate-300 mt-1">{relativeTime(n.createdAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                className="text-slate-300 hover:text-slate-500 transition text-xs shrink-0 mt-1"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────
function Navbar() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const panelRef   = useRef(null);
  const token      = localStorage.getItem("customerToken");
  const [scrolled,   setScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [panelOpen,  setPanelOpen]  = useState(false);

  const { unreadCount } = useNotifications();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handle = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [panelOpen]);

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerRefreshToken");
    localStorage.removeItem("customerFavorites");
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
              <Link to="/login" className="btn-outline text-sm py-2 px-4">Sign In</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Join Free</Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative" ref={panelRef}>
                <button
                  onClick={() => setPanelOpen((v) => !v)}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
                  title="Notifications"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
              </div>

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
          {token && (
            <button
              onClick={() => { setMenuOpen(false); setPanelOpen(true); }}
              className="text-left text-sm font-medium text-slate-700 hover:text-indigo-600 flex items-center gap-2"
            >
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
          {!token ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Link to="/login" className="btn-outline text-center text-sm">Sign In</Link>
              <Link to="/register" className="btn-primary text-center text-sm">Join Free</Link>
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
