import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Phone, Mail, CreditCard, Clock, CheckCircle, AlertCircle, XCircle, TrendingUp, Users, IndianRupee } from 'lucide-react';

const TABS = [
  { key: 'all',        label: 'All Users' },
  { key: 'trial',      label: 'Free Trial' },
  { key: 'active',     label: 'Paid' },
  { key: 'overdue',    label: 'Overdue' },
  { key: 'restricted', label: 'Restricted' },
];

const ACCESS_STYLE = {
  trial:      { color: '#3b82f6',  label: 'Trial' },
  active:     { color: '#10b981',  label: 'Paid' },
  overdue:    { color: '#f59e0b',  label: 'Overdue' },
  restricted: { color: '#ef4444',  label: 'Restricted' },
};

const PLAN_LABEL = {
  free_trial:  'Free Trial',
  starter:     'Starter ₹150/mo',
  per_booking: 'Per Booking ₹1',
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: '18px 20px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      flex: '1 1 160px',
      minWidth: 0,
      transition: 'all 0.2s ease',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function Subscriptions() {
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab]         = useState('all');
  const [loading, setLoading] = useState(true);
  const LIMIT = 20;

  useEffect(() => {
    api.get('/admin/subscriptions/stats')
      .then(r => setStats(r.data.data))
      .catch(() => toast.error('Failed to load stats'));
  }, []);

  const loadUsers = useCallback(async (t, p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: t, page: p, limit: LIMIT });
      const r = await api.get(`/admin/subscriptions/users?${params}`);
      setUsers(r.data.data);
      setTotal(r.data.total);
      setTotalPages(Math.ceil(r.data.total / LIMIT) || 1);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(tab, page); }, [tab, page]);

  const handleTab = (t) => { setTab(t); setPage(1); };

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Subscriptions</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Manage free trial and paid users</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
          <StatCard icon={Users}       label="Total Owners"    value={stats.owners.total}        color="#6366f1" />
          <StatCard icon={Clock}       label="On Free Trial"   value={stats.owners.trial}
            sub={stats.owners.trialExpiringSoon > 0 ? `${stats.owners.trialExpiringSoon} expiring soon` : undefined}
            color="#3b82f6" />
          <StatCard icon={CheckCircle} label="Paid"            value={stats.owners.paid}         color="#10b981" />
          <StatCard icon={AlertCircle} label="Overdue"         value={stats.owners.overdue}      color="#f59e0b" />
          <StatCard icon={XCircle}     label="Restricted"      value={stats.owners.restricted}   color="#ef4444" />
          <StatCard icon={IndianRupee} label="Total Revenue"   value={`₹${(stats.revenue.totalCollected || 0).toLocaleString('en-IN')}`}
            sub={`${stats.revenue.paidInvoices} paid invoices`}
            color="#8b5cf6" />
          <StatCard icon={TrendingUp}  label="Pending Invoices" value={stats.invoices.pending}
            sub={`${stats.invoices.failed} failed`}
            color="#f97316" />
        </div>
      )}

      {/* Plan breakdown */}
      {stats && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 20px', boxShadow: 'var(--shadow-sm)', marginBottom: 24, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Plan breakdown:</span>
          <span style={{ fontSize: 13, color: '#3b82f6' }}>Free Trial: <strong>{stats.owners.planBreakdown?.free_trial ?? 0}</strong></span>
          <span style={{ fontSize: 13, color: '#10b981' }}>Starter: <strong>{stats.owners.planBreakdown?.starter ?? 0}</strong></span>
          <span style={{ fontSize: 13, color: '#8b5cf6' }}>Per Booking: <strong>{stats.owners.planBreakdown?.per_booking ?? 0}</strong></span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--surface)',
              color:      tab === t.key ? '#fff' : 'var(--text2)',
              borderColor: tab === t.key ? 'transparent' : 'var(--border)',
              boxShadow: tab === t.key ? '0 0 16px rgba(99,102,241,0.3)' : 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
            {t.key !== 'all' && stats && (
              <span style={{
                marginLeft: 6,
                background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'var(--surface2)',
                color: tab === t.key ? '#fff' : 'var(--text2)',
                borderRadius: 20, padding: '1px 7px', fontSize: 11,
              }}>
                {t.key === 'trial'      && stats.owners.trial}
                {t.key === 'active'     && stats.owners.paid}
                {t.key === 'overdue'    && stats.owners.overdue}
                {t.key === 'restricted' && stats.owners.restricted}
              </span>
            )}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text3)', alignSelf: 'center' }}>{total} users</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ color: 'var(--text2)' }}>Loading...</span>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  {['Owner', 'Contact', 'Plan', 'Status', 'Trial Days Left', 'Bookings', 'Last Payment', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>No users found</td></tr>
                ) : users.map(u => {
                  const as = ACCESS_STYLE[u.accessStatus] || ACCESS_STYLE.restricted;
                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid var(--border2)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{u.name || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--text2)' }}>
                          {u.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{u.phone}</span>}
                          {u.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{u.email}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                          <CreditCard size={12} />
                          {PLAN_LABEL[u.planType] || u.planType}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${as.color}22`, color: as.color, border: `1px solid ${as.color}44` }}>
                          {as.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: u.trialDaysLeft <= 3 ? 'var(--red)' : 'var(--text2)', fontWeight: u.trialDaysLeft <= 3 ? 700 : 400 }}>
                        {u.accessStatus === 'trial' ? `${u.trialDaysLeft}d` : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text2)' }}>
                        {u.monthlyBookingCount}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text2)' }}>
                        {u.lastPaymentDate ? new Date(u.lastPaymentDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text3)' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--text2)' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}
    </div>
  );
}
