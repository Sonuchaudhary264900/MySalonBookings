import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";

function getUserInitial() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "U";
    const payload = JSON.parse(atob(token.split(".")[1]));
    const name = payload.name || payload.firstName || payload.username || "";
    return name.charAt(0).toUpperCase() || "U";
  } catch { return "U"; }
}

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
    <div className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-32px))] t-card rounded-2xl shadow-xl z-50 overflow-hidden fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 t-divider">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: "var(--t-text)" }}>Notifications</span>
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
              className="text-xs font-medium transition"
              style={{ color: "var(--t-accent)" }}
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs transition"
              style={{ color: "var(--t-text-3)" }}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "var(--t-border)" }}>
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-sm" style={{ color: "var(--t-text-3)" }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition"
              style={{ background: !n.read ? "rgba(99,102,241,0.06)" : "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-2)"}
              onMouseLeave={e => e.currentTarget.style.background = !n.read ? "rgba(99,102,241,0.06)" : "transparent"}
            >
              <span className="text-xl mt-0.5 shrink-0">
                {TYPE_ICON[n.type] || TYPE_ICON.info}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: !n.read ? "var(--t-text)" : "var(--t-text-2)" }}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--t-text-3)" }}>{n.message}</p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--t-text-3)", opacity: 0.7 }}>{relativeTime(n.createdAt)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                className="text-xs transition shrink-0 mt-1"
                style={{ color: "var(--t-text-3)" }}
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
  const navigate         = useNavigate();
  const location         = useLocation();
  const panelRef         = useRef(null);
  const mobilePanelRef   = useRef(null);
  const profileRef       = useRef(null);
  const token            = localStorage.getItem("customerToken");
  const [scrolled,     setScrolled]    = useState(false);
  const [_panelOpen,   _setPanelOpen]  = useState(false);
  const [profileOpen,  setProfileOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const userInitial = getUserInitial();

  const panelOpen    = externalNotifOpen ?? _panelOpen;
  const setPanelOpen = setExternalNotifOpen ?? _setPanelOpen;

  const { unreadCount } = useNotifications();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const handle = (e) => {
      const inDesktop = panelRef.current && panelRef.current.contains(e.target);
      const inMobile  = mobilePanelRef.current && mobilePanelRef.current.contains(e.target);
      if (!inDesktop && !inMobile) setPanelOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [panelOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handle = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerRefreshToken");
    localStorage.removeItem("customerFavorites");
    navigate("/");
  };

  const handleSearchClick = () => {
    if (location.pathname === "/") {
      const el = document.getElementById("hero-search");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.querySelector("input")?.focus(), 280);
      }
    } else {
      navigate("/");
    }
  };

  // Icon button shared style
  const iconBtn = {
    width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--t-input-bg)", border: "1px solid var(--t-border)", cursor: "pointer",
    color: "var(--t-text-3)", transition: "all 0.18s ease",
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: "var(--t-nav-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid var(--t-border)" : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-base">✂</span>
          </div>
          <span className="text-xl font-bold text-neon-gradient">Salon Bookings</span>
        </Link>

        {/* Center — Desktop nav links (hidden on mobile where BottomNav takes over) */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {[
            { to: "/",          label: "Home",     icon: "🏠" },
            ...(token ? [
              { to: "/dashboard",  label: "Bookings", icon: "📅" },
              { to: "/favorites",  label: "Saved",    icon: "❤️" },
              { to: "/profile",    label: "Settings",  icon: "⚙️" },
            ] : []),
          ].map(({ to, label, icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                  background: active ? "rgba(99,102,241,0.12)" : "transparent",
                  color: active ? "var(--t-accent)" : "var(--t-text-2)",
                  borderBottom: active ? "2px solid var(--t-accent)" : "2px solid transparent",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--t-input-bg)"; e.currentTarget.style.color = "var(--t-text)"; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t-text-2)"; } }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">

          {/* Theme toggle — before login: leftmost; after login: rightmost (rendered below) */}
          {!token && (
            <button
              onClick={toggleTheme}
              style={iconBtn}
              title={isDark ? "Light mode" : "Dark mode"}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.color = "var(--t-accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--t-input-bg)"; e.currentTarget.style.color = "var(--t-text-3)"; }}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              )}
            </button>
          )}

          {/* Search icon — only when logged in */}
          {token && (
            <button
              onClick={handleSearchClick}
              style={iconBtn}
              title="Search"
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.color = "var(--t-accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--t-input-bg)"; e.currentTarget.style.color = "var(--t-text-3)"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
              </svg>
            </button>
          )}

          {/* Notification bell — only when logged in */}
          {token && (
            <div className="relative" ref={panelRef}>
              <button
                onClick={() => setPanelOpen(v => !v)}
                style={{ ...iconBtn, position: "relative" }}
                title="Notifications"
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.color = "var(--t-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--t-input-bg)"; e.currentTarget.style.color = "var(--t-text-3)"; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
            </div>
          )}

          {token ? (
            /* Profile avatar dropdown */
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white shadow-sm hover:shadow-md transition font-bold text-sm"
                title="My Profile"
              >
                {userInitial}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 t-card rounded-2xl shadow-xl py-1.5 z-50 fade-in">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition"
                    style={{ color: "var(--t-text-2)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    My Profile
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition"
                    style={{ color: "var(--t-text-2)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    My Bookings
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition"
                    style={{ color: "var(--t-text-2)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-bg-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    Saved Salons
                  </Link>
                  <div className="my-1 t-divider" />
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 transition"
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-error-bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Guest buttons */
            <>
              <Link
                to="/login"
                className="hidden sm:block text-sm font-semibold px-4 py-1.5 rounded-xl transition-all duration-200"
                style={{ background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text-2)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; e.currentTarget.style.color = "var(--t-text)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.color = "var(--t-text-2)"; }}
              >
                Sign In
              </Link>
              <Link to="/register" className="neon-btn text-sm font-bold px-4 py-1.5 rounded-xl text-white">
                Join Free
              </Link>
            </>
          )}

          {/* Theme toggle — after login: rightmost */}
          {token && (
            <button
              onClick={toggleTheme}
              style={iconBtn}
              title={isDark ? "Light mode" : "Dark mode"}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.color = "var(--t-accent)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--t-input-bg)"; e.currentTarget.style.color = "var(--t-text-3)"; }}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              )}
            </button>
          )}
        </div>

      </div>
    </header>
  );
}

export default Navbar;
