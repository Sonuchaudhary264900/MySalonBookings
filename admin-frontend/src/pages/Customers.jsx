import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, Phone, Mail, BookOpen, User } from 'lucide-react';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);

  const load = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (s) params.set('search', s);
      const r = await api.get(`/admin/customers?${params}`);
      setCustomers(r.data.data.customers);
      setTotal(r.data.data.pagination.total || 0);
      setTotalPages(r.data.data.pagination.pages || 1);
    } catch { toast.error('Failed to load customers'); }
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
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Customers</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{total} registered customers</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 440 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or email..."
          style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <button type="submit" style={{ padding: '9px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          <Search size={15} />
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Customer', 'Phone', 'Email', 'Bookings', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#6366f1', fontSize: 14, flexShrink: 0 }}>
                        {c.name?.charAt(0)?.toUpperCase() || <User size={15} />}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{c.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
                      <Phone size={12} />{c.phone || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748b' }}>
                      <Mail size={12} />{c.email || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                      <BookOpen size={12} color="#6366f1" />
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>{c.bookingCount ?? 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: '#64748b' }}>{fmt(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff', color: '#374151' }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: '#64748b' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: '#fff', color: '#374151' }}>Next</button>
        </div>
      )}
    </div>
  );
}
