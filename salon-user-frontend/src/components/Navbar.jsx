import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";

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
function Navbar({ notifOpen: externalNotifOpen, setNotifOpen: setExternalNotifOpen }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const panelRef   = useRef(null);
  const token      = localStorage.getItem("customerToken");
  const [scrolled,   setScrolled]   = useState(false);
  const [_panelOpen, _setPanelOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  // Allow external control (from BottomNav bell tap) or internal control
  const panelOpen    = externalNotifOpen ?? _panelOpen;
  const setPanelOpen = setExternalNotifOpen ?? _setPanelOpen;

  const { unreadCount } = useNotifications();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


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
          <span className="text-xl font-bold text-gradient">My Salon Bookings</span>
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
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition"
            title={isDark ? "Switch to Light" : "Switch to Dark"}
          >
            {isDark ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>
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
                className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white shadow-sm hover:shadow-md transition"
                title="My Profile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
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

      </div>
    </header>
  );
}

export default Navbar;
