import { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Coins, Search, Plus, Minus } from 'lucide-react';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, width: '100%' };
const btn = (bg) => ({ padding: '9px 16px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 });

export default function Credits() {
  const [form, setForm] = useState({ customerId: '', amount: '', scopeSalonId: '', description: '' });
  const [busy, setBusy] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const act = async (kind) => {
    if (!form.customerId.trim() || !(Number(form.amount) > 0)) { toast.error('Customer ID and a positive amount are required'); return; }
    setBusy(kind);
    try {
      const body = {
        customerId: form.customerId.trim(),
        amount: Number(form.amount),
        scopeSalonId: form.scopeSalonId.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      const { data: res } = await api.post(`/admin/credits/${kind}`, body);
      toast.success(`Credits ${kind === 'grant' ? 'granted' : 'removed'} — available now ₹${res.data?.available ?? '?'}`);
      if (lookupId && lookupId === form.customerId.trim()) doLookup(lookupId);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setBusy(''); }
  };

  const doLookup = async (id) => {
    const cid = (id || lookupId).trim();
    if (!cid) return;
    setLoading(true);
    try {
      const { data: res } = await api.get(`/admin/credits/${cid}`);
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Not found');
      setData(null);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Coins size={22} /> Booking Credits
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>Grant or remove non-cash Booking Credits for a customer.</p>

      {/* Grant / Remove */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600 }}>Customer ID</label><input style={inputStyle} value={form.customerId} onChange={upd('customerId')} placeholder="customer _id" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600 }}>Amount (₹)</label><input style={inputStyle} type="number" value={form.amount} onChange={upd('amount')} placeholder="100" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600 }}>Scope Salon ID (optional)</label><input style={inputStyle} value={form.scopeSalonId} onChange={upd('scopeSalonId')} placeholder="blank = any shop" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600 }}>Description (optional)</label><input style={inputStyle} value={form.description} onChange={upd('description')} placeholder="reason" /></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btn('#059669')} disabled={busy} onClick={() => act('grant')}><Plus size={15} /> {busy === 'grant' ? '…' : 'Grant'}</button>
          <button style={btn('#dc2626')} disabled={busy} onClick={() => act('remove')}><Minus size={15} /> {busy === 'remove' ? '…' : 'Remove'}</button>
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Leave Scope blank for a platform-wide credit (any shop). Enter a Salon ID to lock it to that shop only.</p>
      </div>

      {/* Lookup */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input style={inputStyle} value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Customer ID to view credits + history" />
          <button style={btn('#4f46e5')} disabled={loading} onClick={() => doLookup()}><Search size={15} /> {loading ? '…' : 'View'}</button>
        </div>
        {data && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <Stat label="Total available" value={`₹${data.breakdown?.total ?? 0}`} />
              <Stat label="Any shop" value={`₹${data.breakdown?.platform ?? 0}`} />
              {(data.breakdown?.shops || []).map((s) => <Stat key={s.salonId} label={`Salon ${s.salonId.slice(-6)}`} value={`₹${s.available}`} />)}
            </div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', color: '#6b7280' }}><th style={{ padding: 6 }}>When</th><th>Type</th><th>Source</th><th>Scope</th><th>Amount</th></tr></thead>
              <tbody>
                {(data.transactions || []).map((t) => (
                  <tr key={t._id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 6 }}>{fmt(t.createdAt)}</td>
                    <td>{t.type}</td><td>{t.source}</td>
                    <td>{t.scopeSalonId ? `Salon ${String(t.scopeSalonId).slice(-6)}` : 'Any shop'}</td>
                    <td style={{ fontWeight: 700, color: ['redeem', 'admin_remove'].includes(t.type) ? '#dc2626' : '#059669' }}>
                      {['redeem', 'admin_remove'].includes(t.type) ? '−' : '+'}₹{t.amount}
                    </td>
                  </tr>
                ))}
                {(!data.transactions || data.transactions.length === 0) && <tr><td colSpan={5} style={{ padding: 12, color: '#9ca3af' }}>No transactions</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #eee', borderRadius: 10, padding: '10px 16px' }}>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
