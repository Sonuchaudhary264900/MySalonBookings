import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Phone, Mail, Store } from 'lucide-react';

const STATUS_COLORS = {
  approved:         { bg: '#d1fae5', color: '#065f46' },
  pending_approval: { bg: '#fef3c7', color: '#92400e' },
  salon_registered: { bg: '#dbeafe', color: '#1e40af' },
  mobile_verified:  { bg: '#f3e8ff', color: '#6b21a8' },
  rejected:         { bg: '#fee2e2', color: '#991b1b' },
  banned:           { bg: '#1e293b', color: '#fff'    },
};

const BIZ_TYPES = [
  { key: '',              label: 'All Owners',       icon: '👥', color: '#6366f1' },
  { key: 'barbershop',    label: 'Barbershop',        icon: '💈', color: '#0ea5e9' },
  { key: 'salon',         label: 'Salon',             icon: '✂️', color: '#8b5cf6' },
  { key: 'spa_wellness',  label: 'Spa & Wellness',    icon: '🧖', color: '#10b981' },
  { key: 'makeup_bridal', label: 'Makeup & Bridal',   icon: '💄', color: '#ec4899' },
  { key: 'skin_derma',    label: 'Skin & Derma',      icon: '🧴', color: '#f59e0b' },
];

export default function Owners() {
  const [activeType, setActiveType]   = useState('');
  const [owners, setOwners]           = useState([]);
  const [counts, setCounts]           = useState({});
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  // Fetch per-type counts once on mount
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const results = await Promise.all(
          BIZ_TYPES.slice(1).map(bt =>
            api.get(`/admin/owners?page=1&limit=1&businessType=${bt.key}`)
              .then(r => ({ key: bt.key, total: r.data.data.pagination.total || 0 }))
              .catch(() => ({ key: bt.key, total: 0 }))
          )
        );
        const map = {};
        results.forEach(r => { map[r.key] = r.total; });
        setCounts(map);
      } catch {}
    };
    fetchCounts();
  }, []);

  const load = useCallback(async (p = 1, s = '', btype = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (s)     params.set('search', s);
      if (btype) params.set('businessType', btype);
      const r = await api.get(`/admin/owners?${params}`);
      setOwners(r.data.data.owners);
      setTotalPages(r.data.data.pagination.pages || 1);
      setTotal(r.data.data.pagination.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search, activeType); }, [page, activeType]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search, activeType);
  };

  const handleTabChange = (key) => {
    setActiveType(key);
    setPage(1);
    setSearch('');
  };

  const activeBiz = BIZ_TYPES.find(b => b.key === activeType) || BIZ_TYPES[0];

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Business Owners</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{total} {activeBiz.label.toLowerCase()}</p>
      </div>

      {/* Business type tabs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        {BIZ_TYPES.map(bt => {
          const isActive = activeType === bt.key;
          const count = bt.key === '' ? undefined : counts[bt.key];
          return (
            <button
              key={bt.key}
              onClick={() => handleTabChange(bt.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: isActive ? bt.color : '#f1f5f9',
                color: isActive ? '#fff' : '#475569',
                boxShadow: isActive ? `0 2px 8px ${bt.color}55` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{bt.icon}</span>
              {bt.label}
              {count !== undefined && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  color: isActive ? '#fff' : '#64748b',
                  borderRadius: 20, padding: '1px 7px', marginLeft: 2,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 400 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ padding: '9px 16px', background: activeBiz.color, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          <Search size={16} />
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Owner', 'Contact', 'Status', 'Business', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No owners found</td></tr>
              ) : owners.map(owner => {
                const sc  = STATUS_COLORS[owner.status] || STATUS_COLORS.pending_approval;
                const biz = BIZ_TYPES.find(b => b.key === owner.businessId?.businessType);
                return (
                  <tr key={owner._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6366f1', fontSize: 15, flexShrink: 0 }}>
                          {owner.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{owner.name}</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} />{owner.phone}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} />{owner.email}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
                        {owner.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>
                      {owner.businessId ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {biz ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: biz.color + '18', color: biz.color }}>
                              <span>{biz.icon}</span> {biz.label}
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}><Store size={12} /> Registered</span>
                          )}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>Not registered</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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
