import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Clock, Store, Users, LogOut, Scissors, BookOpen, TrendingUp, UserCheck, CreditCard } from 'lucide-react';

const nav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics',     icon: TrendingUp,      label: 'Analytics' },
  { to: '/pending',       icon: Clock,           label: 'Pending Approvals' },
  { to: '/bookings',      icon: BookOpen,        label: 'Bookings' },
  { to: '/salons',        icon: Store,           label: 'All Salons' },
  { to: '/owners',        icon: UserCheck,       label: 'Owners' },
  { to: '/customers',     icon: Users,           label: 'Customers' },
  { to: '/subscriptions', icon: CreditCard,      label: 'Subscriptions' },
];

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem('admin_token'); navigate('/login'); };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside style={{ width: 240, background: '#1e293b', color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#6366f1', borderRadius: 10, padding: 8 }}>
              <Scissors size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>My Salon Bookings</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Admin Panel</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, marginBottom: 4, textDecoration: 'none', fontSize: 14, fontWeight: 500,
                background: isActive ? '#6366f1' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8',
              })}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid #334155' }}>
          <button
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
              borderRadius: 8, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
