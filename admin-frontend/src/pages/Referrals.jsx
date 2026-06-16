import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Gift, Save } from 'lucide-react';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, width: 120 };
const STATUS = { pending: '#d97706', rewarded: '#059669', rejected: '#dc2626' };

export default function Referrals() {
  const [cfg, setCfg] = useState({ referralRewardAmount: 50, referralMinBookings: 20, referralMinDays: 7 });
  const [savingCfg, setSavingCfg] = useState(false);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/admin/referral-config').then(({ data }) => setCfg(data.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/referrals', { params: { status: status || undefined, limit: 50 } });
      setItems(data.data?.referrals || []);
    } catch { toast.error('Failed to load referrals'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const saveCfg = async () => {
    setSavingCfg(true);
    try {
      const { data } = await api.put('/admin/referral-config', {
        referralRewardAmount: Number(cfg.referralRewardAmount),
        referralMinBookings: Number(cfg.referralMinBookings),
        referralMinDays: Number(cfg.referralMinDays),
      });
      setCfg(data.data);
      toast.success('Referral config saved');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingCfg(false); }
  };

  const updCfg = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Gift size={22} /> Business Referrals
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>Company-funded reward paid when a referred business hits the milestone.</p>

      {/* Config */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 24, display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div><label style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>Reward (₹)</label><input style={inputStyle} type="number" value={cfg.referralRewardAmount} onChange={updCfg('referralRewardAmount')} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>Min completed bookings</label><input style={inputStyle} type="number" value={cfg.referralMinBookings} onChange={updCfg('referralMinBookings')} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, display: 'block' }}>Min days active</label><input style={inputStyle} type="number" value={cfg.referralMinDays} onChange={updCfg('referralMinDays')} /></div>
        <button onClick={saveCfg} disabled={savingCfg} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Save size={15} /> {savingCfg ? '…' : 'Save'}</button>
      </div>

      {/* List */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['', 'pending', 'rewarded'].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e5e7eb', background: status === s ? '#4f46e5' : '#fff', color: status === s ? '#fff' : '#374151', fontSize: 13, cursor: 'pointer' }}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', color: '#6b7280', background: '#f9fafb' }}>
            <th style={{ padding: 10 }}>Referred owner</th><th>Referrer</th><th>Status</th><th>Reward</th><th>Bookings</th><th>Applied</th><th>Rewarded</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 16 }}>Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={7} style={{ padding: 16, color: '#9ca3af' }}>No referrals</td></tr>
              : items.map((r) => (
                <tr key={r._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 10 }}>{r.referredOwnerId?.name || '—'}<br /><span style={{ color: '#9ca3af', fontSize: 11 }}>{r.referredOwnerId?.phone}</span></td>
                  <td>{r.referrerType} · {r.referrerCode}</td>
                  <td><span style={{ color: STATUS[r.status], fontWeight: 700 }}>{r.status}</span></td>
                  <td>{r.rewardAmount ? `₹${r.rewardAmount} (${r.rewardType})` : '—'}</td>
                  <td>{r.completedBookingsAtReward ?? '—'}</td>
                  <td>{fmt(r.createdAt)}</td>
                  <td>{fmt(r.rewardedAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
