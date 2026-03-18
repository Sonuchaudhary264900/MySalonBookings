import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Scissors,
  Calendar,
  BarChart3,
  Star,
  User,
  Settings,
  Bell,
  ChevronRight,
  X,
} from 'lucide-react';
import ROUTES from '../../routes';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Sidebar Component
 * 
 * Features:
 * - Navigation menu items
 * - Active route highlighting
 * - Mobile close button
 * - Icons for each item
 * - Responsive design
 */
const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard',     label: t('nav_dashboard'),     path: ROUTES.DASHBOARD,     icon: LayoutDashboard },
    { id: 'services',      label: t('nav_services'),      path: ROUTES.SERVICES,      icon: Scissors },
    { id: 'bookings',      label: t('nav_bookings'),      path: ROUTES.BOOKINGS,      icon: Calendar },
    { id: 'analytics',     label: t('nav_analytics'),     path: ROUTES.ANALYTICS,     icon: BarChart3 },
    { id: 'reviews',       label: 'Reviews',              path: ROUTES.REVIEWS,       icon: Star },
    { id: 'profile',       label: t('nav_profile'),       path: ROUTES.PROFILE,       icon: User },
    { id: 'notifications', label: t('nav_notifications'), path: ROUTES.NOTIFICATIONS, icon: Bell },
    { id: 'settings',      label: t('nav_settings'),      path: ROUTES.SETTINGS,      icon: Settings },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 w-64 bg-gray-900 text-white
          transform transition-transform duration-300 md:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} z-40
        `}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white text-base">✂</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">SmartSalon</p>
                <p className="text-xs text-gray-400 leading-tight">{t('owner_panel')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 hover:bg-gray-800 rounded-lg text-gray-400"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition duration-200
                  ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }
                `}
                type="button"
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>

      </aside>
    </>
  );
};

export default Sidebar;