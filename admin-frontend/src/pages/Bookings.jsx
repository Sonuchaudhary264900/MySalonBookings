import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#f59e0b' },
  confirmed:   { label: 'Confirmed',   color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#8b5cf6' },
  completed:   { label: 'Completed',   color: '#10b981' },
  cancelled:   { label: 'Cancelled',   color: '#ef4444' },
};

const STATUSES = ['', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function Bookings() {
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);

  const load = useCallback(async (p = 1, s = search, st = status, f = from, t = to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (s)  params.set('search', s);
      if (st) params.set('status', st);
      if (f)  params.set('from', f);
      if (t)  params.set('to', t);
      const r = await api.get(`/admin/bookings?${params}`);
      setBookings(r.data.data.bookings);
      setTotal(r.data.data.pagination.total || 0);
      setTotalPages(r.data.data.pagination.pages || 1);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page, search, status, from, to); }, [page]);

  const apply = (overrides = {}) => {
    const s  = overrides.search  ?? search;
    const st = overrides.status  ?? status;
    const f  = overrides.from    ?? from;
    const t  = overrides.to      ?? to;
    setPage(1);
    load(1, s, st, f, t);
  };

  const clearAll = () => {
    setSearch(''); setStatus(''); setFrom(''); setTo('');
    setPage(1);
    load(1, '', '', '', '');
  };

  const hasFilters = search || status || from || to;

  const inputStyle = {
    padding: '9px 14px',
    background: 'var(--input-bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    color: 'var(--text)',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Bookings</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{total} bookings found</p>
        </div>
        {hasFilters && (
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {/* Search + Date filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <form onSubmit={e => { e.preventDefault(); apply(); }} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, salon, booking ID..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" style={{ padding: '9px 14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            <Search size={15} />
          </button>
        </form>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); apply({ from: e.target.value }); }}
          style={{ ...inputStyle, color: from ? 'var(--text)' : 'var(--text3)' }} />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); apply({ to: e.target.value }); }}
          style={{ ...inputStyle, color: to ? 'var(--text)' : 'var(--text3)' }} />
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => {
          const active = status === s;
          const meta = STATUS_META[s];
          const activeColor = meta?.color || 'var(--accent)';
          return (
            <button key={s} onClick={() => { setStatus(s); apply({ status: s }); }}
              style={{
                padding: '7px 14px', border: '1.5px solid',
                borderColor: active ? activeColor : 'var(--border)',
                borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: active ? `${activeColor}22` : 'var(--surface)',
                color: active ? activeColor : 'var(--text2)',
                transition: 'all 0.15s',
              }}>
              {s === '' ? 'All' : STATUS_META[s]?.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
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
                {['Booking ID', 'Customer', 'Salon', 'Service', 'Date', 'Time', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No bookings found</td></tr>
              ) : bookings.map(b => {
                const meta = STATUS_META[b.status] || STATUS_META.pending;
                const service = b.serviceName || (b.services?.[0]?.serviceName) || '—';
                return (
                  <tr key={b._id} style={{ borderBottom: '1px solid var(--border2)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600 }}>
                      {b.bookingId ? `#${b.bookingId.slice(-6).toUpperCase()}` : b._id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{b.customerName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.customerPhone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text2)', maxWidth: 140 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.salonName || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)', maxWidth: 120 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmt(b.appointmentDate)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{b.appointmentTime || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmtMoney(b.totalAmount)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44`, whiteSpace: 'nowrap' }}>
                        {meta.label}
                      </span>
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
