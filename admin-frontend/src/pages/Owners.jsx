import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Phone, Mail, Store } from 'lucide-react';

const STATUS_COLORS = {
  approved: { bg: '#d1fae5', color: '#065f46' },
  pending_approval: { bg: '#fef3c7', color: '#92400e' },
  salon_registered: { bg: '#dbeafe', color: '#1e40af' },
  mobile_verified: { bg: '#f3e8ff', color: '#6b21a8' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
  banned: { bg: '#1e293b', color: '#fff' },
};

export default function Owners() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (s) params.set('search', s);
      const r = await api.get(`/admin/owners?${params}`);
      setOwners(r.data.data.owners);
      setTotalPages(r.data.data.pagination.pages || 1);
      setTotal(r.data.data.pagination.total || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Salon Owners</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{total} total owners</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 400 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone..."
          style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ padding: '9px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          <Search size={16} />
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Owner', 'Contact', 'Status', 'Salon', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>No owners found</td></tr>
              ) : owners.map(owner => {
                const sc = STATUS_COLORS[owner.status] || STATUS_COLORS.pending_approval;
                return (
                  <tr key={owner._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6366f1', fontSize: 15, flexShrink: 0 }}>
                          {owner.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{owner.name}</div>
                        </div>
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
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Store size={12} />
                        {owner.salonId ? 'Registered' : 'Not registered'}
                      </span>
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
