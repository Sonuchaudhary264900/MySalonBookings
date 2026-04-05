import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });

const STATUS_BADGE = {
  active:          { label: 'Active',   cls: 'bg-emerald-100 text-emerald-700' },
  expired:         { label: 'Expired',  cls: 'bg-gray-100 text-gray-500' },
  cancelled:       { label: 'Cancelled',cls: 'bg-red-100 text-red-600' },
  pending_payment: { label: 'Pending',  cls: 'bg-amber-100 text-amber-600' },
};

/* ── Pricing Tier Form ─────────────────────────────────────────── */
function TierForm({ initial, onSave, onCancel }) {
  const [radiusKm,     setRadiusKm]     = useState(initial?.radiusKm     ?? '');
  const [pricePerWeek, setPricePerWeek] = useState(initial?.pricePerWeek ?? '');
  const [label,        setLabel]        = useState(initial?.label        ?? '');
  const [isActive,     setIsActive]     = useState(initial?.isActive     ?? true);
  const [sortOrder,    setSortOrder]    = useState(initial?.sortOrder     ?? 0);
  const [saving,       setSaving]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!radiusKm || !pricePerWeek) { toast.error('Radius and price are required'); return; }
    setSaving(true);
    try {
      await onSave({ radiusKm: Number(radiusKm), pricePerWeek: Number(pricePerWeek), label, isActive, sortOrder: Number(sortOrder) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Radius (km) *</label>
          <input
            type="number" min="1" required
            value={radiusKm}
            onChange={e => setRadiusKm(e.target.value)}
            disabled={!!initial}
            placeholder="e.g. 5"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-100"
          />
          {initial && <p className="text-[11px] text-gray-400 mt-0.5">Radius cannot be changed after creation</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Price / Week (₹) *</label>
          <input
            type="number" min="0" required
            value={pricePerWeek}
            onChange={e => setPricePerWeek(e.target.value)}
            placeholder="e.g. 299"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Label (optional)</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={`e.g. ${radiusKm || 5} km – ₹${pricePerWeek || 299}/week`}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex items-end gap-2 pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            <span className="text-sm text-gray-700">Active (visible to owners)</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : initial ? 'Update Tier' : 'Create Tier'}
        </button>
      </div>
    </form>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function Promotions() {
  const [tab,        setTab]        = useState('promotions'); // promotions | pricing
  const [tiers,      setTiers]      = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editTier,   setEditTier]   = useState(null); // null = new, object = editing

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tiersRes, promoRes, statsRes] = await Promise.all([
        axios.get(`${BASE}/admin/promotions/pricing`, auth()),
        axios.get(`${BASE}/admin/promotions/all?status=${statusFilter}&limit=50`, auth()),
        axios.get(`${BASE}/admin/promotions/stats`, auth()),
      ]);
      setTiers(tiersRes.data.data?.tiers || []);
      setPromotions(promoRes.data.data?.promotions || []);
      setStats(statsRes.data.data || null);
    } catch (err) {
      toast.error('Failed to load promotion data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateTier = async (data) => {
    try {
      await axios.post(`${BASE}/admin/promotions/pricing`, data, auth());
      toast.success('Pricing tier created');
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tier');
    }
  };

  const handleUpdateTier = async (data) => {
    try {
      await axios.put(`${BASE}/admin/promotions/pricing/${editTier._id}`, data, auth());
      toast.success('Tier updated');
      setEditTier(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier');
    }
  };

  const handleDeleteTier = async (id) => {
    if (!window.confirm('Delete this pricing tier?')) return;
    try {
      await axios.delete(`${BASE}/admin/promotions/pricing/${id}`, auth());
      toast.success('Tier deleted');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete tier');
    }
  };

  const handleCancelPromotion = async (id) => {
    if (!window.confirm('Cancel this active promotion? This action cannot be undone.')) return;
    try {
      await axios.put(`${BASE}/admin/promotions/${id}/cancel`, {}, auth());
      toast.success('Promotion cancelled');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel promotion');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Promotions</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          Manage salon promotion pricing and view all active/past promotions.
        </p>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Promotions', value: stats.activePromotions, color: '#10b981' },
            { label: 'Total Promotions',  value: stats.totalPromotions,  color: '#6366f1' },
            { label: 'Total Revenue',     value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: 0 }}>{label}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color, margin: '4px 0 0' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['promotions', 'All Promotions'], ['pricing', 'Pricing Settings']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? '#4f46e5' : '#64748b',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ════════════ PROMOTIONS TAB ════════════ */}
      {tab === 'promotions' && (
        <div>
          {/* Filter row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['active', 'Active'], ['expired', 'Expired'], ['cancelled', 'Cancelled']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  borderColor: statusFilter === val ? '#6366f1' : '#e2e8f0',
                  background:  statusFilter === val ? '#eef2ff' : '#fff',
                  color:       statusFilter === val ? '#4f46e5' : '#64748b',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading…</p>
          ) : promotions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#f8fafc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>No promotions found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>When salon owners purchase promotions, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Salon', 'Owner', 'Radius', 'Price', 'Start', 'End', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p, i) => {
                    const badge = STATUS_BADGE[p.status] || { label: p.status, cls: 'bg-gray-100 text-gray-500' };
                    return (
                      <tr key={p._id} style={{ borderBottom: i < promotions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{p.salonId?.name || '—'}<br /><span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{p.salonId?.city}</span></td>
                        <td style={{ padding: '10px 14px', color: '#475569' }}>{p.ownerId?.name || '—'}<br /><span style={{ fontSize: 11, color: '#94a3b8' }}>{p.ownerId?.phone}</span></td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#6366f1' }}>{p.radiusKm} km</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>₹{p.pricePaid}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN')   : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }} className={badge.cls}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {p.status === 'active' && (
                            <button
                              onClick={() => handleCancelPromotion(p._id)}
                              style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════ PRICING TAB ════════════ */}
      {tab === 'pricing' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>
                Set prices for each promotion radius. Owners see these when purchasing a promotion.
              </p>
            </div>
            {!showForm && !editTier && (
              <button
                onClick={() => setShowForm(true)}
                style={{ padding: '8px 18px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                + Add Tier
              </button>
            )}
          </div>

          {(showForm || editTier) && (
            <div style={{ marginBottom: 20 }}>
              <TierForm
                initial={editTier}
                onSave={editTier ? handleUpdateTier : handleCreateTier}
                onCancel={() => { setShowForm(false); setEditTier(null); }}
              />
            </div>
          )}

          {loading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading…</p>
          ) : tiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#f8fafc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>No pricing tiers yet</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Click "+ Add Tier" to create the first one.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {tiers.map(tier => (
                <div key={tier._id} style={{ background: '#fff', border: `2px solid ${tier.isActive ? '#e0e7ff' : '#f1f5f9'}`, borderRadius: 16, padding: 18, position: 'relative' }}>
                  {!tier.isActive && (
                    <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#f1f5f9', color: '#94a3b8' }}>INACTIVE</span>
                  )}
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#4f46e5', margin: 0 }}>{tier.radiusKm} km</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>₹{tier.pricePerWeek}<span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>/week</span></p>
                  {tier.label && <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{tier.label}</p>}
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Sort: {tier.sortOrder}</p>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => { setEditTier(tier); setShowForm(false); }}
                      style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1.5px solid #e0e7ff', background: '#fff', color: '#4f46e5', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier._id)}
                      style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
