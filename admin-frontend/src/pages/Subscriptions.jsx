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
  trial:      { bg: '#dbeafe', color: '#1e40af', label: 'Trial' },
  active:     { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
  overdue:    { bg: '#fef3c7', color: '#92400e', label: 'Overdue' },
  restricted: { bg: '#fee2e2', color: '#991b1b', label: 'Restricted' },
};

const PLAN_LABEL = {
  free_trial:  'Free Trial',
  starter:     'Starter ₹150/mo',
  per_booking: 'Per Booking ₹1',
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', gap: 14, flex: '1 1 160px', minWidth: 0 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
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

  // Load summary stats once
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
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Subscriptions</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Manage free trial and paid users</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
          <StatCard icon={Users}       label="Total Owners"    value={stats.owners.total}        color="#6366f1" />
          <StatCard icon={Clock}       label="On Free Trial"   value={stats.owners.trial}
            sub={stats.owners.trialExpiringSoon > 0 ? `⚠ ${stats.owners.trialExpiringSoon} expiring soon` : undefined}
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
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Plan breakdown:</span>
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
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === t.key ? '#6366f1' : '#fff',
              color:      tab === t.key ? '#fff'    : '#64748b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {t.label}
            {t.key !== 'all' && stats && (
              <span style={{ marginLeft: 6, background: tab === t.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: tab === t.key ? '#fff' : '#64748b', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>
                {t.key === 'trial'      && stats.owners.trial}
                {t.key === 'active'     && stats.owners.paid}
                {t.key === 'overdue'    && stats.owners.overdue}
                {t.key === 'restricted' && stats.owners.restricted}
              </span>
            )}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>{total} users</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Owner', 'Contact', 'Plan', 'Status', 'Trial Days Left', 'Bookings', 'Last Payment', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
                ) : users.map(u => {
                  const as = ACCESS_STYLE[u.accessStatus] || ACCESS_STYLE.restricted;
                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>

                      {/* Owner */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6366f1', fontSize: 14, flexShrink: 0 }}>
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{u.name || '—'}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: '#64748b' }}>
                          {u.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{u.phone}</span>}
                          {u.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{u.email}</span>}
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                          <CreditCard size={12} />
                          {PLAN_LABEL[u.planType] || u.planType}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: as.bg, color: as.color }}>
                          {as.label}
                        </span>
                      </td>

                      {/* Trial Days Left */}
                      <td style={{ padding: '13px 16px', fontSize: 13, color: u.trialDaysLeft <= 3 ? '#ef4444' : '#64748b', fontWeight: u.trialDaysLeft <= 3 ? 700 : 400 }}>
                        {u.accessStatus === 'trial' ? `${u.trialDaysLeft}d` : '—'}
                      </td>

                      {/* Bookings this month */}
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#64748b' }}>
                        {u.monthlyBookingCount}
                      </td>

                      {/* Last Payment */}
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#64748b' }}>
                        {u.lastPaymentDate ? new Date(u.lastPaymentDate).toLocaleDateString('en-IN') : '—'}
                      </td>

                      {/* Joined */}
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#94a3b8' }}>
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
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: '#64748b' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: '#fff', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}
    </div>
  );
}
