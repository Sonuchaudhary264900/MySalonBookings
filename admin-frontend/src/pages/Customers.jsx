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
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Customers</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{total} registered customers</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20, maxWidth: 440 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or email..."
          style={{
            flex: 1, padding: '9px 14px',
            background: 'var(--input-bg)',
            border: '1.5px solid var(--border)',
            borderRadius: 10, fontSize: 14, outline: 'none',
            color: 'var(--text)',
            transition: 'border-color 0.2s ease',
          }}
        />
        <button type="submit" style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
          <Search size={15} />
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ color: 'var(--text2)' }}>Loading...</span>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                {['Customer', 'Phone', 'Email', 'Bookings', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--border2)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>
                        {c.name?.charAt(0)?.toUpperCase() || <User size={15} />}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                      <Phone size={12} />{c.phone || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                      <Mail size={12} />{c.email || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                      <BookOpen size={12} color="var(--accent)" />
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{c.bookingCount ?? 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text2)' }}>{fmt(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--text2)' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}
    </div>
  );
}
