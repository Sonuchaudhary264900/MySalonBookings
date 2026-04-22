import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Scissors, Calendar, Star, Settings,
  ChevronRight, ChevronLeft, X, Images, Users, Tag,
  Store, BarChart2, Gift, MessageSquare, Megaphone, Crown, Eye,
  Shield, Code2, ListOrdered,
} from 'lucide-react';
import ROUTES from '../../routes';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSalon } from '../../hooks/useSalon';

const BIZ_NAME_MAP = {
  barbershop:    'Barbershop',
  salon:         'Salon',
  spa_wellness:  'Spa',
  makeup_bridal: 'Studio',
  skin_derma:    'Clinic',
};

/* ─── Nav structure ────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { id: 'bookings',  label: 'Bookings',  path: ROUTES.BOOKINGS,  icon: Calendar        },
      { id: 'queue',     label: 'Live Queue', path: ROUTES.QUEUE,    icon: ListOrdered     },
      { id: 'services',  label: 'Services',  path: ROUTES.SERVICES,  icon: Scissors        },
      { id: 'customers', label: 'Customers', path: ROUTES.CUSTOMERS, icon: Users           },
      { id: 'team',      label: 'Team',      path: ROUTES.TEAM,      icon: Users           },
      { id: 'messages',  label: 'Messages',  path: ROUTES.MESSAGES,  icon: MessageSquare, badge: 'chat' },
      { id: 'analytics', label: 'Analytics', path: ROUTES.ANALYTICS, icon: BarChart2       },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'glowloox',  label: 'GlowLoox Profile',  path: ROUTES.GLOWLOOX,  icon: Eye        },
      { id: 'gallery',   label: 'Gallery',            path: ROUTES.GALLERY,   icon: Images     },
      { id: 'coupons',   label: 'Coupons',            path: ROUTES.COUPONS,   icon: Tag        },
      { id: 'packages',  label: 'Packages & Plans',   path: ROUTES.PACKAGES,  icon: Gift       },
      { id: 'reviews',   label: 'Reviews',            path: ROUTES.REVIEWS,   icon: Star       },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'promotions',   label: 'Promote Salon',   path: ROUTES.PROMOTIONS, icon: Megaphone },
      { id: 'subscription', label: 'My Subscription', path: ROUTES.BILLING,    icon: Crown      },
      { id: 'audit',        label: 'Audit Log',        path: ROUTES.AUDIT,      icon: Shield     },
      { id: 'developer',    label: 'Developer',        path: ROUTES.DEVELOPER,  icon: Code2      },
      { id: 'settings',     label: 'Settings',         path: ROUTES.SETTINGS,   icon: Settings   },
    ],
  },
];

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatUnreadCount } = useNotifications();
  const { salon, subscription } = useSalon();
  const bizName = BIZ_NAME_MAP[salon?.businessType] || 'Salon';

  const planLabel = {
    free_trial:  'Free Trial',
    starter:     'Starter Plan',
    per_booking: 'Pay Per Booking',
  }[subscription?.planType] || 'No Plan';

  const planColor = subscription?.planType === 'starter'
    ? { bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200/60 dark:border-indigo-800/40', text: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' }
    : subscription?.planType === 'per_booking'
    ? { bg: 'bg-violet-50 dark:bg-violet-950/50', border: 'border-violet-200/60 dark:border-violet-800/40', text: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' }
    : { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200/60 dark:border-amber-800/40', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400' };

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 768) onClose();
  };

  const getBadge = (item) => {
    if (item.badge === 'chat') return chatUnreadCount;
    return 0;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-30 transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 inset-y-0 left-0 h-screen flex flex-col z-40
          bg-white dark:bg-[#0d1424]
          border-r border-gray-100/80 dark:border-gray-800/50
          shadow-sm dark:shadow-none
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-[68px]' : 'md:w-64'} w-64
        `}
      >
        {/* ── Header ── */}
        <div className={`flex items-center h-16 shrink-0 border-b border-gray-100 dark:border-gray-800/60 px-4 ${collapsed ? 'md:justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-2.5 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">My {bizName} Bookings</p>
              <p className="text-[11px] text-gray-400 leading-tight">Owner Panel</p>
            </div>
          </div>
          {/* Icon-only logo when collapsed */}
          <div className={`hidden ${collapsed ? 'md:flex' : ''} items-center justify-center`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Store className="w-4 h-4 text-white" />
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 pb-20 md:pb-4 space-y-5
          scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-1.5">
                  {section.label}
                </p>
              )}
              {collapsed && (
                <div className="hidden md:block h-px bg-gray-100 dark:bg-gray-800/60 mx-2 mb-2" />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon    = item.icon;
                  const isActive = location.pathname === item.path;
                  const badgeCount = getBadge(item);

                  return (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => handleNavigation(item.path)}
                        type="button"
                        aria-label={item.label}
                        className={`
                          w-full flex items-center gap-3 rounded-xl
                          transition-all duration-150 relative
                          ${collapsed ? 'md:justify-center md:px-2 px-3 py-2.5' : 'px-3 py-2.5'}
                          ${isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm shadow-indigo-100/50 dark:shadow-none'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                          }
                        `}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                        )}

                        {/* Icon + dot badge (collapsed) */}
                        <div className="relative shrink-0">
                          <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                          {badgeCount > 0 && collapsed && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full hidden md:block" />
                          )}
                        </div>

                        <span className={`flex-1 text-left text-sm transition-all ${collapsed ? 'md:hidden' : ''}`}>
                          {item.label}
                        </span>

                        {/* Count badge (expanded) */}
                        {badgeCount > 0 && !collapsed && (
                          <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                      </button>

                      {/* Tooltip on collapsed */}
                      {collapsed && (
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden md:block">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                            {item.label}{badgeCount > 0 ? ` (${badgeCount})` : ''}
                            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── My Subscription ── */}
        <div className="shrink-0 px-2 pb-2 border-t border-gray-100 dark:border-gray-800/60 pt-2">
          <button
            onClick={() => handleNavigation(ROUTES.BILLING)}
            type="button"
            className={`w-full rounded-xl border transition-all duration-150 ${planColor.bg} ${planColor.border} ${collapsed ? 'md:flex md:justify-center md:p-2 p-3' : 'p-3'}`}
          >
            <div className={`flex items-center gap-2.5 ${collapsed ? 'md:hidden' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${planColor.text} bg-white/60 dark:bg-black/20`}>
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-none mb-0.5">My Subscription</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${planColor.dot}`} />
                  <p className={`text-xs font-bold truncate ${planColor.text}`}>{planLabel}</p>
                </div>
              </div>
            </div>
            <div className={`hidden ${collapsed ? 'md:flex' : ''} items-center justify-center`}>
              <Crown className={`w-4 h-4 ${planColor.text}`} />
            </div>
          </button>
        </div>

        {/* ── Collapse toggle (desktop only) ── */}
        <div className="hidden md:flex shrink-0 p-3 border-t border-gray-100 dark:border-gray-800/60 justify-end">
          <button
            onClick={onToggleCollapse}
            type="button"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
