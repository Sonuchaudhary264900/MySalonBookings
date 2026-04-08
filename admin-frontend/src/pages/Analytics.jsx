import { useEffect, useState } from 'react';
import api from '../api';
import {
  TrendingUp, Users, Store, BookOpen, DollarSign,
  Calendar, BarChart2, Star,
} from 'lucide-react';

const fmt = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : n >= 1000   ? `₹${(n / 1000).toFixed(1)}K`
  : `₹${n ?? 0}`;

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#f59e0b' },
  confirmed:   { label: 'Confirmed',   color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#8b5cf6' },
  completed:   { label: 'Completed',   color: '#10b981' },
  cancelled:   { label: 'Cancelled',   color: '#ef4444' },
};

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 20,
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ background: `${color}22`, borderRadius: 12, padding: 11, flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' }}>
      {data.map((d) => {
        const pct = Math.max((d.count / max) * 100, 2);
        const label = d.date.slice(5);
        return (
          <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600 }}>{d.count || ''}</div>
            <div
              title={`${d.date}: ${d.count} bookings`}
              style={{ width: '100%', height: `${pct}%`, background: 'linear-gradient(to top, #6366f1, #818cf8)', borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.3s' }}
            />
            <div style={{ fontSize: 9, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text2)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading analytics...
    </div>
  );
  if (!data) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--red)' }}>Failed to load analytics.</div>;

  const totalByStatus = Object.values(data.bookingsByStatus || {}).reduce((a, b) => a + b, 0);

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Analytics</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Platform-wide performance overview</p>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Revenue"    value={fmt(data.totalRevenue)}  icon={DollarSign} color="#10b981" sub="from completed bookings" />
        <StatCard label="Total Bookings"   value={data.totalBookings}       icon={BookOpen}   color="#6366f1" sub={`${data.last30Bookings} in last 30 days`} />
        <StatCard label="Today's Bookings" value={data.todayBookings}       icon={Calendar}   color="#f59e0b" />
        <StatCard label="Total Customers"  value={data.totalCustomers}      icon={Users}      color="#3b82f6" />
        <StatCard label="Active Salons"    value={data.totalSalons}         icon={Store}      color="#8b5cf6" />
        <StatCard label="Salon Owners"     value={data.totalOwners}         icon={TrendingUp} color="#ec4899" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* 7-day booking trend */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={16} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Bookings — Last 7 Days</span>
          </div>
          <BarChart data={data.dailyTrend} />
        </div>

        {/* Bookings by status */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BookOpen size={16} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Bookings by Status</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const count = data.bookingsByStatus?.[key] || 0;
              const pct   = totalByStatus > 0 ? Math.round((count / totalByStatus) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{meta.label}</span>
                    <span style={{ color: meta.color, fontWeight: 700 }}>{count} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top salons */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Star size={16} color="#f59e0b" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Top Salons by Bookings</span>
        </div>
        {data.topSalons?.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>No booking data yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Rank', 'Salon', 'Bookings', 'Revenue'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topSalons.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border2)' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: i === 0 ? 'rgba(245,158,11,0.2)' : i === 1 ? 'var(--surface2)' : 'rgba(236,72,153,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      color: i === 0 ? '#f59e0b' : i === 1 ? 'var(--text2)' : '#ec4899',
                    }}>
                      {i + 1}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{s.salonName || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{s.count}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{fmt(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
