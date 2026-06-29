import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Clock, Store, Users, LogOut, Scissors, BookOpen, TrendingUp, UserCheck, Moon, Sun, ImageIcon, Layers, MessageSquare, Coins, Gift, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../api';

// Payment-dependent pages (Subscriptions, Promotions, Withdrawals) are hidden for the
// cash-only launch — online payments are disabled, so they'd show empty/misleading data.
// Their routes still exist; restore here when Razorpay Route ships.
const nav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/analytics',     icon: TrendingUp,      label: 'Analytics'        },
  { to: '/pending',       icon: Clock,           label: 'Pending Approvals', badge: 'pending' },
  { to: '/bookings',      icon: BookOpen,        label: 'Bookings'         },
  { to: '/salons',        icon: Store,           label: 'All Business'     },
  { to: '/owners',        icon: UserCheck,       label: 'Owners'           },
  { to: '/customers',     icon: Users,           label: 'Customers'        },
  { to: '/catalog',       icon: Layers,          label: 'Service Catalog'  },
  { to: '/site-settings', icon: ImageIcon,       label: 'Hero Images'      },
  { to: '/feedback',      icon: MessageSquare,   label: 'Feedback'         },
  { to: '/credits',       icon: Coins,           label: 'Booking Credits'  },
  { to: '/referrals',     icon: Gift,            label: 'Referrals'        },
];

export default function Layout() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const logout = () => { localStorage.removeItem('admin_token'); navigate('/login'); };

  const [pendingCount, setPendingCount] = useState(0);
  const [query, setQuery] = useState('');

  const fetchPending = useCallback(async () => {
    try {
      const r = await api.get('/admin/salons/pending?page=1&limit=1');
      setPendingCount(r.data?.data?.pagination?.total ?? 0);
    } catch { /* silent — badge just stays at last value */ }
  }, []);

  useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, 60000); // refresh every 60s
    return () => clearInterval(id);
  }, [fetchPending]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/salons?search=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar — always dark */}
      <aside style={{
        width: 248,
        background: 'linear-gradient(180deg, #0d0d2b 0%, #0a0a1e 100%)',
        borderRight: '1px solid rgba(99,102,241,0.15)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 12,
              padding: 9,
              boxShadow: '0 0 20px rgba(99,102,241,0.5)',
            }}>
              <Scissors size={19} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', letterSpacing: '-0.2px' }}>GlowLoox</div>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>Admin Console</div>
            </div>
          </div>
        </div>

        {/* Global search — jumps to All Business filtered by query (backend ?search=) */}
        <form onSubmit={submitSearch} style={{ padding: '12px 14px 4px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#475569" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search businesses…"
              style={{
                width: '100%', padding: '9px 11px 9px 32px', borderRadius: 10,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', fontSize: 12.5, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </form>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 10px 14px', overflowY: 'auto' }}>
          {nav.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 13px',
                borderRadius: 10,
                marginBottom: 3,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))'
                  : 'transparent',
                color: isActive ? '#a5b4fc' : '#64748b',
                border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                boxShadow: isActive ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge === 'pending' && pendingCount > 0 && (
                <span style={{
                  minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff',
                  fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{pendingCount > 99 ? '99+' : pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle + Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={toggle}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 13px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            {dark ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#818cf8" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 13px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.06)', color: '#f87171',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  );
}
