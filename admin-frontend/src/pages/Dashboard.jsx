import { useEffect, useState } from 'react';
import api from '../api';
import { Store, Clock, CheckCircle, XCircle, Users } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color, bg }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ background: bg, borderRadius: 10, padding: 12, flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#64748b', marginBottom: 28, fontSize: 14 }}>Overview of your platform</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <StatCard label="Total Owners" value={stats?.totalOwners} icon={Users} color="#6366f1" bg="#eef2ff" />
        <StatCard label="Total Salons" value={stats?.totalSalons} icon={Store} color="#0ea5e9" bg="#e0f2fe" />
        <StatCard label="Pending Approval" value={stats?.pendingSalons} icon={Clock} color="#f59e0b" bg="#fef3c7" />
        <StatCard label="Approved" value={stats?.approvedSalons} icon={CheckCircle} color="#10b981" bg="#d1fae5" />
        <StatCard label="Rejected" value={stats?.rejectedSalons} icon={XCircle} color="#ef4444" bg="#fee2e2" />
      </div>
    </div>
  );
}
