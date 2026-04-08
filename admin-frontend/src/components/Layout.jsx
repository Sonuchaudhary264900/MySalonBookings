import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Clock, Store, Users, LogOut, Scissors, BookOpen, TrendingUp, UserCheck, CreditCard, Megaphone } from 'lucide-react';

const nav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/analytics',     icon: TrendingUp,      label: 'Analytics'        },
  { to: '/pending',       icon: Clock,           label: 'Pending Approvals'},
  { to: '/bookings',      icon: BookOpen,        label: 'Bookings'         },
  { to: '/salons',        icon: Store,           label: 'All Salons'       },
  { to: '/owners',        icon: UserCheck,       label: 'Owners'           },
  { to: '/customers',     icon: Users,           label: 'Customers'        },
  { to: '/subscriptions', icon: CreditCard,      label: 'Subscriptions'    },
  { to: '/promotions',    icon: Megaphone,       label: 'Promotions'       },
];

const sidebarBg = 'linear-gradient(180deg, #0d0d2b 0%, #0a0a1e 100%)';

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('admin_token'); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #06061a 0%, #0d0d2e 50%, #06061a 100%)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 248,
        background: sidebarBg,
        borderRight: '1px solid rgba(99,102,241,0.15)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        backdropFilter: 'blur(20px)',
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
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', letterSpacing: '-0.2px' }}>MySalonBookings</div>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>Admin Console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {nav.map(({ to, icon: Icon, label }) => (
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
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
