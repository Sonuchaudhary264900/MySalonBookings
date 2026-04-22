import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import {
  Search, LayoutDashboard, Calendar, Scissors, Users, BarChart2,
  MessageSquare, Tag, Images, Shield, Code2, Settings, Star, Gift,
  Crown, Megaphone, Eye, X,
} from 'lucide-react';
import ROUTES from '../routes';
import { useTheme } from '../context/ThemeContext';

const COMMANDS = [
  { id: 'dashboard',   label: 'Dashboard',          path: ROUTES.DASHBOARD,   icon: LayoutDashboard, group: 'Pages' },
  { id: 'bookings',    label: 'Bookings',            path: ROUTES.BOOKINGS,    icon: Calendar,        group: 'Pages' },
  { id: 'services',    label: 'Services',            path: ROUTES.SERVICES,    icon: Scissors,        group: 'Pages' },
  { id: 'customers',   label: 'Customers',           path: ROUTES.CUSTOMERS,   icon: Users,           group: 'Pages' },
  { id: 'analytics',   label: 'Analytics',           path: ROUTES.ANALYTICS,   icon: BarChart2,       group: 'Pages' },
  { id: 'messages',    label: 'Messages',            path: ROUTES.MESSAGES,    icon: MessageSquare,   group: 'Pages' },
  { id: 'team',        label: 'Team',                path: ROUTES.TEAM,        icon: Users,           group: 'Pages' },
  { id: 'team-chat',   label: 'Team Chat',           path: ROUTES.TEAM_CHAT,   icon: MessageSquare,   group: 'Pages' },
  { id: 'gallery',     label: 'Gallery',             path: ROUTES.GALLERY,     icon: Images,          group: 'Pages' },
  { id: 'coupons',     label: 'Coupons',             path: ROUTES.COUPONS,     icon: Tag,             group: 'Pages' },
  { id: 'packages',    label: 'Packages & Plans',    path: ROUTES.PACKAGES,    icon: Gift,            group: 'Pages' },
  { id: 'reviews',     label: 'Reviews',             path: ROUTES.REVIEWS,     icon: Star,            group: 'Pages' },
  { id: 'promotions',  label: 'Promotions',          path: ROUTES.PROMOTIONS,  icon: Megaphone,       group: 'Pages' },
  { id: 'billing',     label: 'Subscription',        path: ROUTES.BILLING,     icon: Crown,           group: 'Pages' },
  { id: 'settings',    label: 'Settings',            path: ROUTES.SETTINGS,    icon: Settings,        group: 'Pages' },
  { id: 'glowloox',    label: 'GlowLoox Profile',    path: ROUTES.GLOWLOOX,    icon: Eye,             group: 'Pages' },
  { id: 'audit',       label: 'Audit Log',           path: ROUTES.AUDIT,       icon: Shield,          group: 'Pages' },
  { id: 'developer',   label: 'Developer Portal',    path: ROUTES.DEVELOPER,   icon: Code2,           group: 'Pages' },
];

const fuse = new Fuse(COMMANDS, {
  keys: ['label', 'group'],
  threshold: 0.35,
  includeScore: true,
});

export default function CommandPalette() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const results = query
    ? fuse.search(query).map((r) => r.item)
    : COMMANDS.slice(0, 8);

  const close = useCallback(() => { setOpen(false); setQuery(''); setActiveIdx(0); }, []);

  const go = useCallback((item) => {
    navigate(item.path);
    close();
  }, [navigate, close]);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Focus input when opened
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  // Arrow key navigation
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx]);
  };

  if (!open) return null;

  const overlay = 'fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4';
  const modal   = `w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`;
  const item    = (i) => `flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-lg mx-1 ${
    i === activeIdx
      ? isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'
      : isDark ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
  }`;

  return (
    <div className={overlay} onClick={close}>
      <div className={modal} onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions..."
            className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
          />
          <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        {/* Results */}
        <div className="py-2 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-6">No results for "{query}"</p>
          ) : (
            results.map((item_, i) => {
              const Icon = item_.icon;
              return (
                <div key={item_.id} className={item(i)}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => go(item_)}>
                  <Icon size={16} className="flex-shrink-0 opacity-70" />
                  <span className="text-sm font-medium">{item_.label}</span>
                  <span className="ml-auto text-xs opacity-40">{item_.group}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className={`flex items-center gap-4 px-4 py-2 text-xs border-t ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
          <span>↑↓ navigate</span>
          <span>⏎ open</span>
          <span>esc close</span>
          <span className="ml-auto">⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
