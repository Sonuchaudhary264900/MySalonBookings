import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import {
  Home, Play, CalendarDays, Heart, Bell,
  Sun, Moon, LogOut, User, Bookmark, Scissors, Settings, Menu, X,
} from "lucide-react";

function getUserInitial() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "U";
    const payload = JSON.parse(atob(token.split(".")[1]));
    const name = payload.name || payload.firstName || payload.username || "";
    return name.charAt(0).toUpperCase() || "U";
  } catch { return "U"; }
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLOR = {
  success: "#10b981",
  error:   "#ef4444",
  warning: "#f59e0b",
  info:    "#6366f1",
  booking: "#6366f1",
  cancel:  "#ef4444",
};

// ── Notification Panel ──────────────────────────────────────
function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markRead, markAllRead, removeNotification, clearAll } =
    useNotifications();

  return (
    <div style={{
      position: "absolute", right: 0, top: "calc(100% + 10px)",
      width: "min(360px, calc(100vw - 32px))",
      background: "var(--t-card)",
      border: "1px solid var(--t-border)",
      borderRadius: 18,
      boxShadow: "0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      zIndex: 60,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: "1px solid var(--t-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--t-text)" }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: "#6366f1", color: "#fff",
              fontSize: 10, fontWeight: 800,
              padding: "2px 7px", borderRadius: 999,
            }}>{unreadCount}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ fontSize: 11, fontWeight: 600, color: "var(--t-accent)", background: "none", border: "none", cursor: "pointer" }}>
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll}
              style={{ fontSize: 11, color: "var(--t-text-3)", background: "none", border: "none", cursor: "pointer" }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <Bell size={28} style={{ color: "var(--t-border)", display: "block", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "var(--t-text-3)" }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 16px", cursor: "pointer",
                background: !n.read ? "rgba(99,102,241,0.05)" : "transparent",
                borderBottom: "1px solid var(--t-border)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = !n.read ? "rgba(99,102,241,0.05)" : "transparent"}
            >
              <div style={{
                width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                background: TYPE_COLOR[n.type] || "#6366f1",
                opacity: n.read ? 0.3 : 1,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: "var(--t-text)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {n.title}
                </p>
                {n.message && (
                  <p style={{ fontSize: 12, color: "var(--t-text-3)", margin: "0 0 4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {n.message}
                  </p>
                )}
                <p style={{ fontSize: 11, color: "var(--t-text-3)", opacity: 0.7, margin: 0 }}>{relativeTime(n.createdAt)}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeNotification(n.id); }}
                style={{ fontSize: 12, color: "var(--t-text-3)", background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
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

// ── Shared action button ────────────────────────────────────
function IconBtn({ onClick, title, children, active }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: hov || active ? "rgba(99,102,241,0.1)" : "var(--t-input-bg)",
        border: `1px solid ${hov || active ? "rgba(99,102,241,0.25)" : "var(--t-border)"}`,
        color: hov || active ? "var(--t-accent)" : "var(--t-text-3)",
        cursor: "pointer",
        transition: "all 0.18s ease",
        position: "relative",
      }}
    >
      {children}
    </button>
  );
}

// ── Navbar ──────────────────────────────────────────────────
function Navbar({ notifOpen: externalNotifOpen, setNotifOpen: setExternalNotifOpen }) {
  const navigate       = useNavigate();
  const location       = useLocation();
  const panelRef       = useRef(null);
  const profileRef     = useRef(null);
  const token          = localStorage.getItem("customerToken");
  const [scrolled,     setScrolled]    = useState(false);
  const [_panelOpen,   _setPanelOpen]  = useState(false);
  const [profileOpen,  setProfileOpen] = useState(false);
  const [drawerOpen,   setDrawerOpen]  = useState(false);
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
    const handle = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [panelOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handle = e => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [profileOpen]);

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerRefreshToken");
    localStorage.removeItem("customerFavorites");
    navigate("/");
  };

  const NAV_LINKS = [
    { to: "/",          label: "Home",     Icon: Home,        auth: false },
    { to: "/reels",     label: "Reels",    Icon: Play,        auth: false },
    { to: "/dashboard", label: "Bookings", Icon: CalendarDays,auth: true  },
    { to: "/favorites", label: "Saved",    Icon: Heart,       auth: true  },
    { to: "/profile",   label: "Settings", Icon: Settings,    auth: true  },
  ];
  // Desktop center nav: only show auth items if logged in
  const DESKTOP_NAV = token ? NAV_LINKS : NAV_LINKS.filter(l => !l.auth);

  return (
  <>
    <header
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: scrolled
          ? "var(--t-nav-bg)"
          : "var(--t-nav-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${scrolled ? "var(--t-border)" : "transparent"}`,
        boxShadow: scrolled ? "0 2px 32px rgba(0,0,0,0.07)" : "none",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      }}
    >
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "0 14px",
        height: 58,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>

        {/* ── HAMBURGER — mobile only, far left ── */}
        <button
          className="flex md:hidden"
          onClick={() => setDrawerOpen(true)}
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none",
            color: "var(--t-text-2)", cursor: "pointer",
          }}
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        {/* ── LOGO — centered on mobile, left on desktop ── */}
        <Link
          to="/"
          className="flex-1 flex items-center justify-center md:flex-none md:justify-start"
          style={{ textDecoration: "none", gap: 10 }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 18px rgba(99,102,241,0.35)",
            flexShrink: 0,
          }}>
            <Scissors size={16} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "-0.025em",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Salon Bookings
          </span>
        </Link>

        {/* ── CENTER: Nav links — desktop only ── */}
        <nav style={{ alignItems: "center", gap: 2 }} className="hidden md:flex flex-1 justify-center">
          {DESKTOP_NAV.map(({ to, label, Icon }) => {
            const active = location.pathname === to;
            return (
              <NavItem key={to} to={to} label={label} Icon={Icon} active={active} />
            );
          })}
        </nav>

        {/* ── RIGHT: Actions ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>

          {/* Bell — logged in only */}
          {token && (
            <div style={{ position: "relative" }} ref={panelRef}>
              <IconBtn onClick={() => setPanelOpen(v => !v)} title="Notifications" active={panelOpen}>
                <Bell size={15} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -2, right: -2,
                    minWidth: 16, height: 16,
                    background: "#ef4444", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    borderRadius: 999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 4px",
                    lineHeight: 1,
                    border: "1.5px solid var(--t-nav-bg)",
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </IconBtn>
              {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
            </div>
          )}

          {/* Profile avatar — logged in */}
          {token && (
            <div style={{ position: "relative" }} ref={profileRef}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                title="My Account"
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  border: "2px solid rgba(99,102,241,0.3)",
                  color: "#fff", fontWeight: 800, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: profileOpen ? "0 0 0 3px rgba(99,102,241,0.2)" : "none",
                  transition: "box-shadow 0.18s ease",
                }}
              >
                {userInitial}
              </button>
              {profileOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 10px)",
                  width: 210,
                  background: "var(--t-card)",
                  border: "1px solid var(--t-border)",
                  borderRadius: 16,
                  boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
                  zIndex: 60, overflow: "hidden",
                  padding: "6px 0",
                }}>
                  {[
                    { to: "/profile",   Icon: User,        label: "My Profile"    },
                    { to: "/dashboard", Icon: CalendarDays, label: "My Bookings"  },
                    { to: "/favorites", Icon: Bookmark,     label: "Saved Salons" },
                  ].map(({ to, Icon, label }) => (
                    <Link key={to} to={to}
                      onClick={() => setProfileOpen(false)}
                      style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "var(--t-text-2)", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <Icon size={14} strokeWidth={2} style={{ color: "var(--t-text-3)" }} />
                      {label}
                    </Link>
                  ))}
                  <div style={{ height: 1, background: "var(--t-border)", margin: "4px 0" }} />
                  <button
                    onClick={() => { setProfileOpen(false); handleLogout(); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#f87171", background: "none", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut size={14} strokeWidth={2} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Theme toggle — desktop only */}
          <span className="hidden md:flex">
            <IconBtn onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
              {isDark
                ? <Sun size={15} strokeWidth={2} />
                : <Moon size={15} strokeWidth={2} />
              }
            </IconBtn>
          </span>

          {/* Guest: Sign In + Join Free (desktop only) */}
          {!token && (
            <>
              <Link to="/login"
                style={{
                  textDecoration: "none", fontSize: 13, fontWeight: 600,
                  padding: "7px 14px", borderRadius: 999,
                  border: "1.5px solid var(--t-border)",
                  color: "var(--t-text-2)", transition: "all 0.18s ease",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; e.currentTarget.style.color = "var(--t-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.color = "var(--t-text-2)"; }}
              >
                <User size={14} strokeWidth={2} />
                Sign In
              </Link>
              <Link to="/register"
                className="hidden md:inline-flex"
                style={{
                  textDecoration: "none", fontSize: 13, fontWeight: 700,
                  padding: "7px 18px", borderRadius: 10,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  boxShadow: "0 0 18px rgba(99,102,241,0.3)",
                  transition: "box-shadow 0.18s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 28px rgba(99,102,241,0.5)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 18px rgba(99,102,241,0.3)"}
              >
                Join Free
              </Link>
            </>
          )}
        </div>

      </div>
    </header>

    {/* ── Mobile Drawer ── */}
    {drawerOpen && (
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />
    )}
    <div style={{
      position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201,
      width: 280,
      background: "var(--t-card)",
      borderRight: "1px solid var(--t-border)",
      boxShadow: "4px 0 40px rgba(0,0,0,0.18)",
      transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
      transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      display: "flex", flexDirection: "column",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      overflowY: "auto",
    }}>
      {/* Drawer header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 16px 14px",
        borderBottom: "1px solid var(--t-border)",
      }}>
        <Link to="/" onClick={() => setDrawerOpen(false)} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px rgba(99,102,241,0.35)",
          }}>
            <Scissors size={14} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{
            fontSize: 14, fontWeight: 800,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>Salon Bookings</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(false)}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--t-input-bg)", border: "1px solid var(--t-border)",
            color: "var(--t-text-3)", cursor: "pointer",
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: "10px 8px", flex: 1 }}>
        {NAV_LINKS.map(({ to, label, Icon, auth }) => {
          const active = location.pathname === to;
          const locked = auth && !token;
          const dest   = locked ? "/login" : to;
          return (
            <Link
              key={label}
              to={dest}
              onClick={() => setDrawerOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 14px", borderRadius: 14,
                textDecoration: "none",
                marginBottom: 2,
                background: active ? "rgba(99,102,241,0.1)" : "transparent",
                color: active ? "var(--t-accent)" : "var(--t-text-2)",
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--t-input-bg)")}
              onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {locked && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "var(--t-accent)",
                  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)",
                  padding: "2px 8px", borderRadius: 99,
                }}>Login</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Drawer footer */}
      <div style={{ padding: "12px 8px 24px", borderTop: "1px solid var(--t-border)" }}>
        {token ? (
          <button
            onClick={() => { setDrawerOpen(false); handleLogout(); }}
            style={{
              display: "flex", alignItems: "center", gap: 14, width: "100%",
              padding: "12px 14px", borderRadius: 14, border: "none",
              background: "transparent", color: "#f87171",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <LogOut size={18} strokeWidth={2} />
            Sign Out
          </button>
        ) : (
          <Link
            to="/register"
            onClick={() => setDrawerOpen(false)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "12px 14px", borderRadius: 14,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 0 18px rgba(99,102,241,0.3)",
            }}
          >
            Join Free
          </Link>
        )}
      </div>
    </div>
  </>
  );
}

// ── Nav link item ───────────────────────────────────────────
function NavItem({ to, label, Icon, active }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 999,
        fontSize: 13, fontWeight: active ? 700 : 500,
        textDecoration: "none",
        color: active ? "var(--t-accent)" : hov ? "var(--t-text)" : "var(--t-text-2)",
        background: active
          ? "rgba(99,102,241,0.1)"
          : hov ? "var(--t-input-bg)" : "transparent",
        border: `1px solid ${active ? "rgba(99,102,241,0.2)" : "transparent"}`,
        boxShadow: active ? "0 0 0 0px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
        transition: "all 0.18s ease",
      }}
    >
      <Icon size={14} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}

export default Navbar;
