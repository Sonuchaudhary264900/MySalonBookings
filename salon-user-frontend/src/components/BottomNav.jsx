import { useLocation, useNavigate } from "react-router-dom";

// ── Icons ─────────────────────────────────────────────────────
const HomeIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const BookingsIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FavoritesIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const SettingsIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TABS = [
  { label: "Home",      path: "/",          Icon: HomeIcon,      authRequired: false },
  { label: "Bookings",  path: "/dashboard", Icon: BookingsIcon,  authRequired: true  },
  { label: "Favorites", path: "/favorites", Icon: FavoritesIcon, authRequired: true  },
  { label: "Settings",  path: "/profile",   Icon: SettingsIcon,  authRequired: true  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const token    = localStorage.getItem("customerToken");

  // Hide on auth pages
  if (["/login", "/register"].includes(location.pathname)) return null;

  const handleTab = (tab) => {
    if (tab.authRequired && !token) {
      navigate("/login");
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-slate-200 flex items-stretch h-[62px] shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.label}
            onClick={() => handleTab(tab)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative pt-1"
          >
            {/* Active indicator line at top */}
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full" />
            )}

            {/* Icon */}
            <span className={active ? "text-indigo-600" : "text-slate-400"}>
              <tab.Icon active={active} />
            </span>

            {/* Label */}
            <span className={`text-[10px] font-semibold leading-none ${active ? "text-indigo-600" : "text-slate-400"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
