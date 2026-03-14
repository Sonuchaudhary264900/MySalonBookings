import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, ToggleLeft, ToggleRight, MapPin, Star, ChevronDown } from 'lucide-react';

const STATUS_COLORS = {
  approved: { bg: '#d1fae5', color: '#065f46' },
  pending: { bg: '#fef3c7', color: '#92400e' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
};

const selectStyle = {
  padding: '9px 32px 9px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
  appearance: 'none',
  minWidth: 140,
};

export default function AllSalons() {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Load distinct states on mount
  useEffect(() => {
    api.get('/admin/salons/filter-options')
      .then(r => setStates(r.data.data.states || []))
      .catch(() => {});
  }, []);

  // Load cities when state changes
  useEffect(() => {
    const params = state ? `?state=${encodeURIComponent(state)}` : '';
    api.get(`/admin/salons/filter-options${params}`)
      .then(r => setCities(r.data.data.cities || []))
      .catch(() => {});
    setCity('');
  }, [state]);

  const load = useCallback(async (p = 1, s = search, st = status, stateVal = state, cityVal = city) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (s) params.set('search', s);
      if (st) params.set('status', st);
      if (stateVal) params.set('state', stateVal);
      if (cityVal) params.set('city', cityVal);
      const r = await api.get(`/admin/salons/all?${params}`);
      setSalons(r.data.data.salons);
      setTotalPages(r.data.data.pagination.pages || 1);
      setTotal(r.data.data.pagination.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search, status, state, city); }, [page]);

  const applyFilters = (overrides = {}) => {
    const s = overrides.search ?? search;
    const st = overrides.status ?? status;
    const stateVal = overrides.state ?? state;
    const cityVal = overrides.city ?? city;
    setPage(1);
    load(1, s, st, stateVal, cityVal);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const handleStatusChange = (st) => {
    setStatus(st);
    applyFilters({ status: st });
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    setState(val);
    setCity('');
    applyFilters({ state: val, city: '' });
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    setCity(val);
    applyFilters({ city: val });
  };

  const toggleActive = async (salon) => {
    try {
      await api.put(`/admin/salons/${salon._id}/toggle`);
      toast.success(salon.isActive ? 'Salon deactivated' : 'Salon activated');
      load(page, search, status, state, city);
    } catch { toast.error('Failed'); }
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setState(''); setCity('');
    setPage(1);
    load(1, '', '', '', '');
  };

  const hasFilters = search || status || state || city;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>All Salons</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{total} salons found</p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 13, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Clear all filters
          </button>
        )}
      </div>

      {/* Filters row 1 — search + status */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search salons..."
            style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '9px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            <Search size={16} />
          </button>
        </form>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => handleStatusChange(s)}
              style={{ padding: '8px 14px', border: '1.5px solid', borderColor: status === s ? '#6366f1' : '#e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, background: status === s ? '#eef2ff' : '#fff', color: status === s ? '#6366f1' : '#64748b' }}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row 2 — state + district */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <select value={state} onChange={handleStateChange} style={selectStyle}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={city} onChange={handleCityChange} style={{ ...selectStyle, color: !state && !cities.length ? '#94a3b8' : '#374151' }} disabled={!cities.length && !state}>
            <option value="">All Districts</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        </div>
        {(state || city) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
            <MapPin size={13} />
            {[state, city].filter(Boolean).join(' → ')}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Salon', 'Owner', 'State', 'District', 'Status', 'Rating', 'Active', 'Bookings'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salons.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No salons found</td></tr>
              ) : salons.map(salon => {
                const sc = STATUS_COLORS[salon.approvalStatus] || STATUS_COLORS.pending;
                return (
                  <tr key={salon._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {salon.logo || (salon.photos && salon.photos[0]) ? (
                          <img src={salon.logo || salon.photos[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✂</div>
                        )}
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{salon.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>{salon.ownerId?.name || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>{salon.state || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{salon.city || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
                        {salon.approvalStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} color="#f59e0b" />{salon.averageRating?.toFixed(1) || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => toggleActive(salon)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: salon.isActive ? '#10b981' : '#cbd5e1' }}>
                        {salon.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>{salon.totalBookings || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff' }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14 }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: '#fff' }}>Next</button>
        </div>
      )}
    </div>
  );
}
