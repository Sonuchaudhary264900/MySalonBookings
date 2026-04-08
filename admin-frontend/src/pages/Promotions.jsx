import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });

const STATUS_BADGE = {
  active:          { label: 'Active',   color: '#10b981' },
  expired:         { label: 'Expired',  color: '#94a3b8' },
  cancelled:       { label: 'Cancelled',color: '#ef4444' },
  pending_payment: { label: 'Pending',  color: '#f59e0b' },
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: 'var(--input-bg)',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  color: 'var(--text)',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.2s ease',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  marginBottom: 5,
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
    <form onSubmit={handleSubmit} style={{ padding: 20, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Radius (km) *</label>
          <input
            type="number" min="1" required
            value={radiusKm}
            onChange={e => setRadiusKm(e.target.value)}
            disabled={!!initial}
            placeholder="e.g. 5"
            style={{ ...inputStyle, opacity: initial ? 0.6 : 1 }}
          />
          {initial && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Radius cannot be changed after creation</p>}
        </div>
        <div>
          <label style={labelStyle}>Price / Week (₹) *</label>
          <input
            type="number" min="0" required
            value={pricePerWeek}
            onChange={e => setPricePerWeek(e.target.value)}
            placeholder="e.g. 299"
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Label (optional)</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={`e.g. ${radiusKm || 5} km – ₹${pricePerWeek || 299}/week`}
          style={inputStyle}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
            Active (visible to owners)
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: saving ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}>
          {saving ? 'Saving…' : initial ? 'Update Tier' : 'Create Tier'}
        </button>
      </div>
    </form>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function Promotions() {
  const [tab,          setTab]          = useState('promotions');
  const [tiers,        setTiers]        = useState([]);
  const [promotions,   setPromotions]   = useState([]);
  const [stats,        setStats]        = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editTier,     setEditTier]     = useState(null);

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
    } catch {
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
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Promotions</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '4px 0 0' }}>
          Manage salon promotion pricing and view all active/past promotions.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Active Promotions', value: stats.activePromotions, color: '#10b981' },
            { label: 'Total Promotions',  value: stats.totalPromotions,  color: '#6366f1' },
            { label: 'Total Revenue',     value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, margin: 0 }}>{label}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color, margin: '4px 0 0' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface2)', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['promotions', 'All Promotions'], ['pricing', 'Pricing Settings']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: tab === key ? 'var(--surface)' : 'transparent',
              color: tab === key ? 'var(--accent)' : 'var(--text2)',
              boxShadow: tab === key ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* PROMOTIONS TAB */}
      {tab === 'promotions' && (
        <div>
          {/* Filter row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['active', 'Active'], ['expired', 'Expired'], ['cancelled', 'Cancelled']].map(([val, label]) => {
              const active = statusFilter === val;
              const color = STATUS_BADGE[val]?.color || 'var(--accent)';
              return (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    borderColor: active ? (val === 'all' ? 'var(--accent)' : color) : 'var(--border)',
                    background:  active ? `${val === 'all' ? '#6366f1' : color}22` : 'var(--surface)',
                    color:       active ? (val === 'all' ? 'var(--accent)' : color) : 'var(--text2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ color: 'var(--text2)' }}>Loading…</span>
            </div>
          ) : promotions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>No promotions found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>When salon owners purchase promotions, they'll appear here.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                    {['Salon', 'Owner', 'Radius', 'Price', 'Start', 'End', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((p, i) => {
                    const badge = STATUS_BADGE[p.status] || { label: p.status, color: 'var(--text3)' };
                    return (
                      <tr key={p._id} style={{ borderBottom: i < promotions.length - 1 ? '1px solid var(--border2)' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text)' }}>
                          {p.salonId?.name || '—'}
                          <br /><span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{p.salonId?.city}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>
                          {p.ownerId?.name || '—'}
                          <br /><span style={{ fontSize: 11, color: 'var(--text3)' }}>{p.ownerId?.phone}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--accent)' }}>{p.radiusKm} km</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>₹{p.pricePaid}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.startDate ? new Date(p.startDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text2)' }}>{p.endDate   ? new Date(p.endDate).toLocaleDateString('en-IN')   : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}44` }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {p.status === 'active' && (
                            <button
                              onClick={() => handleCancelPromotion(p._id)}
                              style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', cursor: 'pointer', transition: 'all 0.2s ease' }}
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

      {/* PRICING TAB */}
      {tab === 'pricing' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>
              Set prices for each promotion radius. Owners see these when purchasing a promotion.
            </p>
            {!showForm && !editTier && (
              <button
                onClick={() => setShowForm(true)}
                style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 0 16px rgba(99,102,241,0.3)', transition: 'all 0.2s ease' }}
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
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ color: 'var(--text2)' }}>Loading…</span>
            </div>
          ) : tiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', borderRadius: 16, border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>No pricing tiers yet</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Click "+ Add Tier" to create the first one.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {tiers.map(tier => (
                <div key={tier._id} style={{
                  background: 'var(--surface)',
                  border: `2px solid ${tier.isActive ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: 18,
                  position: 'relative',
                  boxShadow: tier.isActive ? '0 0 20px rgba(99,102,241,0.1)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}>
                  {!tier.isActive && (
                    <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)' }}>INACTIVE</span>
                  )}
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', margin: 0 }}>{tier.radiusKm} km</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: '2px 0' }}>₹{tier.pricePerWeek}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)' }}>/week</span></p>
                  {tier.label && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{tier.label}</p>}
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Sort: {tier.sortOrder}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button
                      onClick={() => { setEditTier(tier); setShowForm(false); }}
                      style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.2s ease' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier._id)}
                      style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.2s ease' }}
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
