import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

const HomeIcon = ({ active }) => (
  <svg className={`w-6 h-6 transition-colors ${active ? "text-indigo-400" : "text-gray-500"}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const BookingsIcon = ({ active }) => (
  <svg className={`w-6 h-6 transition-colors ${active ? "text-indigo-400" : "text-gray-500"}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FavoritesIcon = ({ active }) => (
  <svg className={`w-6 h-6 transition-colors ${active ? "text-indigo-400" : "text-gray-500"}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const BellIcon = ({ active }) => (
  <svg className={`w-6 h-6 transition-colors ${active ? "text-indigo-400" : "text-gray-500"}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const ProfileIcon = ({ active }) => (
  <svg className={`w-6 h-6 transition-colors ${active ? "text-indigo-400" : "text-gray-500"}`} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TABS = [
  { label: "Home",      path: "/",           Icon: HomeIcon      },
  { label: "Bookings",  path: "/dashboard",  Icon: BookingsIcon  },
  { label: "Favorites", path: "/favorites",  Icon: FavoritesIcon },
  { label: "Alerts",    path: "/_notif",     Icon: BellIcon,  isNotif: true },
  { label: "Profile",   path: "/profile",    Icon: ProfileIcon   },
];

export default function BottomNav({ onNotifClick }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const token     = localStorage.getItem("customerToken");
  const { unreadCount } = useNotifications();

  // Only show when logged in, and not on auth pages
  const hidden = !token || ["/login", "/register"].includes(location.pathname);
  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-900 border-t border-gray-800 flex items-stretch h-16 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
      {TABS.map(({ label, path, Icon, isNotif }) => {
        const active = isNotif ? false : location.pathname === path;
        return (
          <button
            key={label}
            onClick={() => isNotif ? onNotifClick?.() : navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
          >
            <div className="relative">
              <Icon active={active} />
              {isNotif && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold leading-none ${active ? "text-indigo-400" : "text-gray-500"}`}>
              {label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
