import { useLocation, useNavigate } from "react-router-dom";

const HomeIcon = ({ active }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const BookingsIcon = ({ active }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const FavoritesIcon = ({ active }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const ProfileIcon = ({ active }) => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TABS = [
  { label: "Home",      path: "/",          Icon: HomeIcon,      authRequired: false },
  { label: "Bookings",  path: "/dashboard", Icon: BookingsIcon,  authRequired: true  },
  { label: "Favorites", path: "/favorites", Icon: FavoritesIcon, authRequired: true  },
  { label: "Profile",   path: "/profile",   Icon: ProfileIcon,   authRequired: true  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const token    = localStorage.getItem("customerToken");

  if (["/login", "/register"].includes(location.pathname)) return null;

  const handleTab = (tab) => {
    if (tab.authRequired && !token) { navigate("/login"); }
    else { navigate(tab.path); }
  };

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 md:hidden flex items-center px-2 py-2 rounded-3xl"
      style={{
        background: "rgba(10,10,20,0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)",
        width: "calc(100vw - 32px)",
        maxWidth: 360,
      }}
    >
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => handleTab(tab)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-all duration-200 relative"
            style={{
              background: active ? "rgba(99,102,241,0.18)" : "transparent",
              boxShadow: active ? "0 0 12px rgba(99,102,241,0.2)" : "none",
            }}
          >
            {/* Active dot */}
            {active && (
              <span
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ background: "#818cf8", boxShadow: "0 0 6px rgba(129,140,248,0.8)" }}
              />
            )}
            <span style={{ color: active ? "#818cf8" : "rgba(148,163,184,0.5)" }}>
              <tab.Icon active={active} />
            </span>
            <span
              className="text-[10px] font-semibold leading-none"
              style={{ color: active ? "#818cf8" : "rgba(148,163,184,0.45)" }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
