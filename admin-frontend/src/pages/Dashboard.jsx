import { useEffect, useState } from 'react';
import api from '../api';
import { Store, Clock, CheckCircle, XCircle, Users } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color, iconBg }) => (
  <div style={{
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    transition: 'all 0.2s ease',
  }}>
    <div style={{ background: iconBg, borderRadius: 12, padding: 12, flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '32px 36px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 28, fontSize: 14 }}>Overview of your platform</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
        <StatCard label="Total Owners"    value={stats?.totalOwners}    icon={Users}        color="#6366f1" iconBg="rgba(99,102,241,0.15)"  />
        <StatCard label="Total Salons"    value={stats?.totalSalons}    icon={Store}        color="#3b82f6" iconBg="rgba(59,130,246,0.15)"   />
        <StatCard label="Pending Approval" value={stats?.pendingSalons} icon={Clock}        color="#f59e0b" iconBg="rgba(245,158,11,0.15)"  />
        <StatCard label="Approved"        value={stats?.approvedSalons} icon={CheckCircle}  color="#10b981" iconBg="rgba(16,185,129,0.15)"  />
        <StatCard label="Rejected"        value={stats?.rejectedSalons} icon={XCircle}      color="#ef4444" iconBg="rgba(239,68,68,0.15)"   />
      </div>
    </div>
  );
}
