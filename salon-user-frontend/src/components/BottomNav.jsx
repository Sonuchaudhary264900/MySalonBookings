import { useLocation, useNavigate } from "react-router-dom";

/* ── cross-browser safe-area + fallback ── */
const CSS = `
  .bnav-wrap {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 4px 8px;
    padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
    border-radius: 0;
    background: var(--t-nav-bg-solid);
    border-top: 1px solid var(--t-border);
    box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
  }
  @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
    .bnav-wrap {
      background: var(--t-nav-bg);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      backdrop-filter: blur(20px) saturate(160%);
    }
  }
  @media (min-width: 768px) {
    .bnav-wrap { display: none !important; }
  }
  .bnav-btn {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: manipulation;
    outline: none;
    cursor: pointer;
    border: none;
    background: transparent;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 4px;
    border-radius: 14px;
    transition: all 0.2s ease;
    position: relative;
    min-width: 0;
  }
  .bnav-btn.active {
    background: rgba(99,102,241,0.12);
  }
  .bnav-btn svg {
    width: 20px;
    height: 20px;
    display: block;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }
  .bnav-btn.active svg {
    transform: translateY(-1px) scale(1.08);
  }
  .bnav-active-bar {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    border-radius: 0 0 4px 4px;
    background: var(--t-accent);
    box-shadow: 0 2px 8px rgba(99,102,241,0.6);
  }
  .bnav-label {
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    font-family: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  @media (max-width: 374px) {
    .bnav-label { display: none; }
    .bnav-btn { padding: 10px 2px; }
  }
`;

/* ── SVG Icons ── */
const HomeIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const BookingsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const FavoritesIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const ProfileIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const ReelsIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);
const MapIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

/* ── Tab definitions ── */
const AUTH_TABS = [
  { label: "Home",      path: "/",          Icon: HomeIcon      },
  { label: "Reels",     path: "/reels",     Icon: ReelsIcon     },
  { label: "Map",       path: "/map",       Icon: MapIcon       },
  { label: "Bookings",  path: "/dashboard", Icon: BookingsIcon  },
  { label: "Saved",     path: "/favorites", Icon: FavoritesIcon },
  { label: "Profile",   path: "/profile",   Icon: ProfileIcon   },
];

const GUEST_TABS = [
  { label: "Home",    path: "/",      Icon: HomeIcon    },
  { label: "Reels",   path: "/reels", Icon: ReelsIcon   },
  { label: "Sign In", path: "/login", Icon: ProfileIcon },
];

/* ── Smart active detection ──
   /men, /women, /salon/:id etc. all highlight the Home tab
   /dashboard/* highlights Bookings, etc.
*/
function isTabActive(tabPath, pathname) {
  if (tabPath === "/") {
    return (
      pathname === "/" ||
      pathname.startsWith("/men") ||
      pathname.startsWith("/women") ||
      pathname.startsWith("/salon/") ||
      pathname.startsWith("/barbershop/") ||
      pathname.startsWith("/spa-wellness/") ||
      pathname.startsWith("/makeup-bridal/") ||
      pathname.startsWith("/skin-derma/")
    );
  }
  if (tabPath === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (tabPath === "/favorites") return pathname === "/favorites" || pathname.startsWith("/favorites/");
  if (tabPath === "/profile")   return pathname === "/profile"   || pathname.startsWith("/profile/");
  return pathname === tabPath;
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const token    = localStorage.getItem("customerToken");

  // Always hide on auth pages
  if (["/login", "/register"].includes(location.pathname)) return null;

  const tabs = token ? AUTH_TABS : GUEST_TABS;

  return (
    <>
      <style>{CSS}</style>
      <nav className="bnav-wrap" role="navigation" aria-label="Main navigation">
        {tabs.map((tab) => {
          const active = isTabActive(tab.path, location.pathname);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={`bnav-btn${active ? " active" : ""}`}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              {active && <span className="bnav-active-bar" />}
              <span style={{ color: active ? "var(--t-accent)" : "var(--t-text-3)", display: "flex" }}>
                <tab.Icon active={active} />
              </span>
              <span
                className="bnav-label"
                style={{ color: active ? "var(--t-accent)" : "var(--t-text-3)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
