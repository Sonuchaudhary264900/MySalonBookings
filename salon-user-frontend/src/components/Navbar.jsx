import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import {
  Home, Play, CalendarDays, Heart, Bell, CheckCircle, ChevronLeft,
  Sun, Moon, LogOut, User, Bookmark, Scissors, Settings, Menu, X, Crown, MapPin, Sparkles, Compass,
  Wallet, LifeBuoy,
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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function groupNotifications(notifications) {
  const now = Date.now();
  const groups = { new: [], thisWeek: [], earlier: [] };
  notifications.forEach(n => {
    const diff = now - new Date(n.createdAt).getTime();
    const hours = diff / 3600000;
    if (hours < 24) groups.new.push(n);
    else if (hours < 168) groups.thisWeek.push(n);
    else groups.earlier.push(n);
  });
  return groups;
}

function iconForType(type) {
  if (type === "booking") return { bg: "rgba(99,102,241,0.18)", color: "#6366f1", icon: <CalendarDays size={16} strokeWidth={2} /> };
  if (type === "success") return { bg: "rgba(16,185,129,0.18)", color: "#10b981", icon: <CheckCircle size={16} strokeWidth={2} /> };
  if (type === "cancel")  return { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", icon: <X size={16} strokeWidth={2} /> };
  return { bg: "rgba(99,102,241,0.18)", color: "#6366f1", icon: <Bell size={16} strokeWidth={2} /> };
}

// ── Notification Row ──────────────────────────────────────────
function NotifRow({ n, onRead, onRemove, compact = false }) {
  const ic = iconForType(n.type);
  return (
    <div
      onClick={() => onRead(n.id)}
      style={{
        display: "flex", alignItems: "center", gap: compact ? 12 : 14,
        padding: compact ? "10px 14px" : "12px 16px",
        background: !n.read ? "var(--t-notif-unread, rgba(99,102,241,0.05))" : "transparent",
        cursor: "pointer", position: "relative",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
      onMouseLeave={e => e.currentTarget.style.background = !n.read ? "var(--t-notif-unread, rgba(99,102,241,0.05))" : "transparent"}
    >
      {/* Avatar / Icon circle */}
      <div style={{
        width: compact ? 42 : 46, height: compact ? 42 : 46,
        borderRadius: "50%", flexShrink: 0,
        background: ic.bg, color: ic.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${ic.color}22`,
      }}>
        {ic.icon}
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: compact ? 13 : 13.5,
          fontWeight: n.read ? 400 : 600,
          color: "var(--t-text)",
          lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          <span style={{ fontWeight: n.read ? 600 : 700 }}>{n.title}</span>
          {n.message && <span style={{ fontWeight: n.read ? 400 : 500, color: "var(--t-text-2)" }}> {n.message}</span>}
        </span>
        <p style={{ fontSize: 12, color: !n.read ? "#6366f1" : "var(--t-text-3)", margin: "3px 0 0", fontWeight: !n.read ? 600 : 400 }}>
          {relativeTime(n.createdAt)}
        </p>
      </div>

      {/* Unread blue dot */}
      {!n.read && (
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
      )}

      {/* Dismiss on hover */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(n.id); }}
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          width: 24, height: 24, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--t-input-bg)", border: "1px solid var(--t-border)",
          color: "var(--t-text-3)", cursor: "pointer",
          opacity: 0, transition: "opacity 0.15s",
        }}
        className="notif-dismiss"
      >
        <X size={11} strokeWidth={2.5} />
      </button>

      <style>{`.notif-dismiss { opacity: 0 !important; } div:hover > .notif-dismiss, div:hover .notif-dismiss { opacity: 1 !important; }`}</style>
    </div>
  );
}

// ── Notification Panel ──────────────────────────────────────
function NotificationPanel({ onClose, mobile = false }) {
  const { notifications, unreadCount, markRead, markAllRead, removeNotification, clearAll } =
    useNotifications();

  const groups = groupNotifications(notifications);

  const renderGroup = (label, items, compact) => items.length === 0 ? null : (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text-3)", padding: compact ? "10px 16px 4px" : "12px 16px 4px", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      {items.map(n => (
        <NotifRow key={n.id} n={n} onRead={markRead} onRemove={removeNotification} compact={compact} />
      ))}
    </div>
  );

  const body = notifications.length === 0 ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "56px 24px" }}>
      <div style={{ width: 62, height: 62, borderRadius: "50%", background: "var(--t-input-bg)", border: "2px solid var(--t-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Bell size={26} style={{ color: "var(--t-text-3)" }} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--t-text)", margin: "0 0 6px" }}>Activity on GlowLoox</p>
      <p style={{ fontSize: 13, color: "var(--t-text-3)", margin: 0, textAlign: "center", maxWidth: 240 }}>
        When you get bookings or updates, you'll see them here.
      </p>
    </div>
  ) : (
    <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
      {renderGroup("New", groups.new, false)}
      {renderGroup("This Week", groups.thisWeek, false)}
      {renderGroup("Earlier", groups.earlier, true)}
    </div>
  );

  /* ── MOBILE: full-screen slide-in from right (Instagram-style) ── */
  if (mobile) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 499, background: "rgba(0,0,0,0.3)" }} />
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "var(--t-card)",
          display: "flex", flexDirection: "column",
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          animation: "igNotifIn 0.22s cubic-bezier(0.32,0.72,0,1)",
          overscrollBehavior: "contain",
        }}>
          {/* Header — Instagram-style: back arrow + title + mark read */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "0 8px 0 4px",
            height: 54,
            borderBottom: "1px solid var(--t-border)",
            flexShrink: 0,
          }}>
            <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--t-text)", cursor: "pointer" }}>
              <ChevronLeft size={24} strokeWidth={2.2} />
            </button>
            <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "var(--t-text)", paddingLeft: 4 }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 13, fontWeight: 600, color: "var(--t-accent)", background: "none", border: "none", cursor: "pointer", padding: "0 12px" }}>
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} style={{ fontSize: 13, color: "var(--t-text-3)", background: "none", border: "none", cursor: "pointer", padding: "0 12px 0 0" }}>
                Clear all
              </button>
            )}
          </div>
          {body}
        </div>
        <style>{`@keyframes igNotifIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }`}</style>
      </>
    );
  }

  /* ── DESKTOP: popover panel next to sidebar ── */
  return (
    <div style={{
      background: "var(--t-card)",
      border: "1px solid var(--t-border)",
      borderRadius: 16,
      boxShadow: "0 -8px 40px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      overflow: "hidden",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      display: "flex", flexDirection: "column",
      maxHeight: "min(460px, 60vh)",
    }}>
      {/* Desktop header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--t-border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--t-text)" }}>Notifications</span>
          {unreadCount > 0 && <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>{unreadCount}</span>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 600, color: "var(--t-accent)", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>}
          {notifications.length > 0 && <button onClick={clearAll} style={{ fontSize: 12, color: "var(--t-text-3)", background: "none", border: "none", cursor: "pointer" }}>Clear</button>}
        </div>
      </div>
      {body}
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
    { to: "/",               label: "Home",            Icon: Home,        auth: false },
    { to: "/explore",        label: "Explore",         Icon: Compass,     auth: false },
    { to: "/map",            label: "Map",             Icon: MapPin,      auth: false },
    { to: "/dashboard",      label: "Bookings",        Icon: CalendarDays,auth: true  },
    { to: "/favorites",      label: "Saved",           Icon: Heart,       auth: true  },
    { to: "/feedback",       label: "Help & Feedback", Icon: LifeBuoy,    auth: true  },
    { to: "/profile",        label: "Settings",        Icon: Settings,    auth: true  },
    // ── Hidden for MVP (route still works) ──
    // { to: "/reels",          label: "Reels",           Icon: Play,        auth: false },
    // { to: "/wallet",         label: "Wallet",          Icon: Wallet,      auth: true  }, // cash-only
    // { to: "/my-subscription",label: "My Subscription", Icon: Crown,       auth: true  },
  ];
  // Desktop center nav: only show auth items if logged in
  const DESKTOP_NAV = token ? NAV_LINKS : NAV_LINKS.filter(l => !l.auth);

  return (
  <>
    <header
      className="md:hidden"
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
            background: "linear-gradient(135deg,#4C1D95,#A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 18px rgba(124,58,237,0.40)",
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 512 512" width="18" height="18" fill="none">
              <path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/>
            </svg>
          </div>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: "-0.025em",
            background: "linear-gradient(135deg,#4C1D95,#A78BFA)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            GlowLoox
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

          {/* Bell — logged in only (navigates to /notifications page) */}
          {token && (
            <IconBtn onClick={() => navigate("/notifications")} title="Notifications">
              <Bell size={15} strokeWidth={2} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  minWidth: 16, height: 16,
                  background: "#ef4444", color: "#fff",
                  fontSize: 9, fontWeight: 800,
                  borderRadius: 999,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px", lineHeight: 1,
                  border: "1.5px solid var(--t-nav-bg)",
                }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </IconBtn>
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
                    { to: "/profile",          Icon: User,        label: "My Profile"       },
                    { to: "/dashboard",        Icon: CalendarDays, label: "My Bookings"     },
                    // { to: "/wallet",           Icon: Wallet,       label: "Wallet"          }, // hidden for cash-only launch

                    { to: "/favorites",        Icon: Bookmark,     label: "Saved Salons"    },
                    // { to: "/my-subscription",  Icon: Crown,        label: "My Subscription" }, // hidden for MVP
                    { to: "/feedback",         Icon: LifeBuoy,     label: "Help & Feedback" },
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

          {/* Theme toggle */}
          <IconBtn onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}>
            {isDark
              ? <Sun size={15} strokeWidth={2} />
              : <Moon size={15} strokeWidth={2} />
            }
          </IconBtn>

          {/* Guest: Sign In */}
          {!token && (
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
          )}
        </div>

      </div>
    </header>

    {/* ── Mobile Drawer backdrop ── */}
    {drawerOpen && (
      <div
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
        {/* Theme toggle row */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%",
            padding: "12px 14px", borderRadius: 14, border: "none",
            background: "transparent", color: "var(--t-text-2)",
            fontWeight: 500, fontSize: 14, cursor: "pointer",
            transition: "background 0.15s", marginBottom: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {isDark
            ? <Sun size={18} strokeWidth={2} style={{ color: "var(--t-accent)" }} />
            : <Moon size={18} strokeWidth={2} style={{ color: "var(--t-accent)" }} />
          }
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
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

    {/* ══════════════════════════════════════════════════════════
        DESKTOP PERSISTENT SIDEBAR (ChatGPT / Instagram style)
    ══════════════════════════════════════════════════════════ */}
    <aside className="hidden md:flex flex-col" style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: 220, zIndex: 50,
      background: "var(--t-card)",
      borderRight: "1px solid var(--t-border)",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    }}>

      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--t-border)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#4C1D95,#A78BFA)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 18px rgba(124,58,237,0.40)",flexShrink:0 }}>
            <svg viewBox="0 0 512 512" width="18" height="18" fill="none">
              <path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize:15,fontWeight:800,letterSpacing:"-0.025em",background:"linear-gradient(135deg,#4C1D95,#A78BFA)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>GlowLoox</span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="scrollbar-hide" style={{ padding: "8px 8px", flex: 1, overflowY: "auto", minHeight: 0 }}>
        {DESKTOP_NAV.map(({ to, label, Icon, auth, ai }) => {
          const active = location.pathname === to || (ai && location.pathname.startsWith('/style-ai'));
          const locked = auth && !token;
          if (ai) return (
            <Link key={label} to={to}
              style={{
                display:"flex", alignItems:"center", gap:14,
                padding:"11px 14px", borderRadius:12,
                textDecoration:"none", marginBottom:2, marginTop:4,
                background: active
                  ? "linear-gradient(135deg,rgba(245,158,11,0.18),rgba(236,72,153,0.18))"
                  : "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(236,72,153,0.08))",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "#f59e0b",
                fontWeight: 700, fontSize:14,
                transition:"background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg,rgba(245,158,11,0.22),rgba(236,72,153,0.22))"}
              onMouseLeave={e => e.currentTarget.style.background = active
                ? "linear-gradient(135deg,rgba(245,158,11,0.18),rgba(236,72,153,0.18))"
                : "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(236,72,153,0.08))"}
            >
              <Sparkles size={18} strokeWidth={2.2} style={{ flexShrink:0, color:"#f59e0b" }} />
              <span style={{ flex:1, background:"linear-gradient(135deg,#f59e0b,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>StyleAI</span>
              <span style={{ fontSize:9,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f59e0b,#ec4899)",padding:"2px 6px",borderRadius:99,letterSpacing:"0.04em" }}>NEW</span>
            </Link>
          );
          return (
            <Link key={label} to={locked ? "/login" : to}
              style={{
                display:"flex", alignItems:"center", gap:14,
                padding:"9px 14px", borderRadius:12,
                textDecoration:"none", marginBottom:2,
                background: active ? "rgba(99,102,241,0.1)" : "transparent",
                color: active ? "var(--t-accent)" : "var(--t-text-2)",
                fontWeight: active ? 700 : 500, fontSize:14,
                transition:"background 0.15s",
              }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--t-input-bg)")}
              onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} style={{ flexShrink:0 }} />
              <span style={{ flex:1 }}>{label}</span>
              {locked && <span style={{ fontSize:10,fontWeight:700,color:"var(--t-accent)",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.2)",padding:"2px 8px",borderRadius:99 }}>Login</span>}
            </Link>
          );
        })}

        <div style={{ height:1, background:"var(--t-border)", margin:"6px 6px" }} />

        {/* Notifications — scrolls with the rest of the nav */}
        {token && (
          <div ref={panelRef}>
            <button
              onClick={() => setPanelOpen(v => !v)}
              style={{ display:"flex",alignItems:"center",gap:14,width:"100%",padding:"9px 14px",borderRadius:12,border:"none",background:"transparent",color:"var(--t-text-2)",fontWeight:500,fontSize:14,cursor:"pointer",transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ position:"relative",flexShrink:0 }}>
                <Bell size={18} strokeWidth={2} />
                {unreadCount > 0 && (
                  <span style={{ position:"absolute",top:-4,right:-4,minWidth:14,height:14,background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",border:"1.5px solid var(--t-card)" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              Notifications
            </button>
            {panelOpen && (
              <div style={{ position:"fixed", left:228, bottom:20, width:360, zIndex:70 }}>
                <NotificationPanel onClose={() => setPanelOpen(false)} />
              </div>
            )}
          </div>
        )}

        {/* Theme toggle — scrolls with the rest of the nav */}
        <button
          onClick={toggleTheme}
          style={{ display:"flex",alignItems:"center",gap:14,width:"100%",padding:"9px 14px",borderRadius:12,border:"none",background:"transparent",color:"var(--t-text-2)",fontWeight:500,fontSize:14,cursor:"pointer",transition:"background 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          {isDark ? <Sun size={18} strokeWidth={2} style={{ color:"var(--t-accent)" }} /> : <Moon size={18} strokeWidth={2} style={{ color:"var(--t-accent)" }} />}
          {isDark ? "Light Mode" : "Dark Mode"}
        </button>
      </nav>

      {/* Bottom pinned section: My Account only */}
      <div style={{ padding:"8px 8px 14px", borderTop:"1px solid var(--t-border)", display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>

        {/* Profile or Sign In */}
        {token ? (
          <div style={{ position:"relative" }} ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{ display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 14px",borderRadius:12,border:"none",background:"transparent",cursor:"pointer",transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"2px solid rgba(99,102,241,0.3)",color:"#fff",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{userInitial}</div>
              <span style={{ fontSize:13,fontWeight:600,color:"var(--t-text-2)",flex:1,textAlign:"left" }}>My Account</span>
            </button>
            {profileOpen && (
              <div style={{ position:"absolute",bottom:"calc(100% + 8px)",left:0,right:0,background:"var(--t-card)",border:"1px solid var(--t-border)",borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.12)",zIndex:60,overflow:"hidden",padding:"6px 0" }}>
                {[
                  { to:"/profile",         Icon:User,        label:"My Profile"       },
                  { to:"/dashboard",       Icon:CalendarDays,label:"My Bookings"      },
                  // { to:"/wallet",          Icon:Wallet,      label:"Wallet"           }, // hidden for cash-only launch

                  { to:"/favorites",       Icon:Bookmark,    label:"Saved Salons"     },
                  // { to:"/my-subscription", Icon:Crown,       label:"My Subscription"  }, // hidden for MVP
                  { to:"/feedback",        Icon:LifeBuoy,    label:"Help & Feedback"  },
                ].map(({ to, Icon, label }) => (
                  <Link key={to} to={to} onClick={() => setProfileOpen(false)}
                    style={{ textDecoration:"none",display:"flex",alignItems:"center",gap:10,padding:"10px 16px",fontSize:13,fontWeight:500,color:"var(--t-text-2)",transition:"background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Icon size={14} strokeWidth={2} style={{ color:"var(--t-text-3)" }} />{label}
                  </Link>
                ))}
                <div style={{ height:1,background:"var(--t-border)",margin:"4px 0" }} />
                <button
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",fontSize:13,fontWeight:500,color:"#f87171",background:"none",border:"none",cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <LogOut size={14} strokeWidth={2} />Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:"11px 14px",borderRadius:12,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none",boxShadow:"0 0 18px rgba(99,102,241,0.3)",marginTop:4 }}>
            Sign In
          </Link>
        )}

      </div>
    </aside>

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
