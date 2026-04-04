import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Scissors, MessageSquare, Settings } from 'lucide-react';
import ROUTES from '../../routes';
import { useNotifications } from '../../context/NotificationContext';

const TABS = [
  { name: 'dashboard', label: 'Home',      path: ROUTES.DASHBOARD, icon: LayoutDashboard, exact: true },
  { name: 'analytics', label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart2        },
  { name: 'services',  label: 'Services',  path: ROUTES.SERVICES,  icon: Scissors         },
  { name: 'messages',  label: 'Messages',  path: ROUTES.MESSAGES,  icon: MessageSquare    },
  { name: 'settings',  label: 'Settings',  path: ROUTES.SETTINGS,  icon: Settings         },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatUnreadCount } = useNotifications();

  const isActive = (tab) => {
    if (tab.exact) return location.pathname === tab.path;
    return location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden
      bg-white/90 dark:bg-[#0d1424]/95 backdrop-blur-2xl
      border-t border-gray-200/60 dark:border-gray-800/50
      flex items-stretch h-16
      shadow-[0_-8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)]
      transition-colors duration-300">
      {TABS.map((tab) => {
        const { name, label, icon: Icon } = tab;
        const active = isActive(tab);
        return (
          <button
            key={name}
            onClick={() => navigate(tab.path)}
            type="button"
            aria-label={label}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative group"
          >
            {/* Active pill — animated width */}
            <span className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-300
              ${active ? 'w-8 bg-indigo-600 dark:bg-indigo-400' : 'w-0 bg-transparent'}`}
            />

            <div className="relative">
              <div className={`p-1.5 rounded-xl transition-all duration-200
                ${active
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 scale-110'
                  : 'scale-100 group-active:scale-95 group-hover:bg-gray-100 dark:group-hover:bg-gray-800/60'
                }`}>
                <Icon
                  className={`w-[22px] h-[22px] transition-all duration-200 ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </div>
              {/* Unread badge */}
              {name === 'messages' && chatUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </div>

            <span className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
              active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
