import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, BarChart3, Settings } from 'lucide-react';
import ROUTES from '../../routes';
import { useNotifications } from '../../context/NotificationContext';

const TABS = [
  { name: 'dashboard', label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'profile',   label: 'Profile',   path: ROUTES.PROFILE,   icon: User            },
  { name: 'analytics', label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart3       },
  { name: 'settings',  label: 'Settings',  path: ROUTES.SETTINGS,  icon: Settings        },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-900 border-t border-gray-800 flex items-stretch h-16 shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
      {TABS.map(({ name, label, path, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={name}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
          >
            <div className="relative">
              <Icon
                className={`w-6 h-6 transition-colors ${active ? 'text-white' : 'text-gray-500'}`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              {name === 'notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold leading-none transition-colors ${active ? 'text-white' : 'text-gray-500'}`}>
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
