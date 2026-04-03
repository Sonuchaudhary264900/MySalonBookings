import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Settings, Scissors, MessageSquare } from 'lucide-react';
import ROUTES from '../../routes';
import { useNotifications } from '../../context/NotificationContext';
import MessagesPanel from '../chat/MessagesPanel';

const TABS = [
  { name: 'dashboard', label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'analytics', label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart3       },
  { name: 'services',  label: 'Services',  path: ROUTES.SERVICES,  icon: Scissors        },
  { name: 'messages',  label: 'Messages',  path: null,             icon: MessageSquare   },
  { name: 'settings',  label: 'Settings',  path: ROUTES.SETTINGS,  icon: Settings        },
];

export default function BottomNav() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { unreadCount, chatUnreadCount } = useNotifications();
  const [msgOpen, setMsgOpen] = useState(false);

  const handleOpenChat = useCallback((booking) => {
    setMsgOpen(false);
    navigate(ROUTES.BOOKINGS, { state: { openChatBookingId: booking?._id } });
  }, [navigate]);

  const handleTab = (tab) => {
    if (tab.name === 'messages') {
      setMsgOpen(v => !v);
      return;
    }
    setMsgOpen(false);
    navigate(tab.path);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden
        bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl
        border-t border-gray-200 dark:border-gray-800/60
        flex items-stretch h-16
        shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]
        transition-colors duration-300">
        {TABS.map((tab) => {
          const { name, label, path, icon: Icon } = tab;
          const active = name === 'messages' ? msgOpen : location.pathname === path;
          return (
            <button
              key={name}
              onClick={() => handleTab(tab)}
              type="button"
              aria-label={label}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative group"
            >
              {/* Active indicator pill at top */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 dark:bg-indigo-400 rounded-full" />
              )}

              <div className="relative">
                <div className={`p-1.5 rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-indigo-50 dark:bg-indigo-950/60'
                    : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-800/60'
                }`}>
                  <Icon
                    className={`w-5 h-5 transition-colors duration-150 ${
                      active
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </div>
                {/* Notification dots */}
                {name === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                {name === 'messages' && chatUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                    {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                  </span>
                )}
              </div>

              <span className={`text-[10px] font-semibold leading-none transition-colors duration-150 ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-400 dark:text-gray-600'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {msgOpen && (
        <MessagesPanel
          onClose={() => setMsgOpen(false)}
          onOpenChat={handleOpenChat}
        />
      )}
    </>
  );
}