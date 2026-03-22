import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#92400e', bg: '#fef3c7' },
  confirmed:   { label: 'Confirmed',   color: '#1e40af', bg: '#dbeafe' },
  in_progress: { label: 'In Progress', color: '#6b21a8', bg: '#ede9fe' },
  completed:   { label: 'Completed',   color: '#065f46', bg: '#d1fae5' },
  cancelled:   { label: 'Cancelled',   color: '#991b1b', bg: '#fee2e2' },
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

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Bookings</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>{total} bookings found</p>
        </div>
        {hasFilters && (
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
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
            style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <button type="submit" style={{ padding: '9px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            <Search size={15} />
          </button>
        </form>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); apply({ from: e.target.value }); }}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: from ? '#1e293b' : '#94a3b8' }} />
        <input type="date" value={to} onChange={e => { setTo(e.target.value); apply({ to: e.target.value }); }}
          style={{ padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', color: to ? '#1e293b' : '#94a3b8' }} />
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => {
          const active = status === s;
          const meta = STATUS_META[s];
          return (
            <button key={s} onClick={() => { setStatus(s); apply({ status: s }); }}
              style={{ padding: '7px 14px', border: '1.5px solid', borderColor: active ? '#6366f1' : '#e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: active ? (meta?.bg || '#eef2ff') : '#fff', color: active ? (meta?.color || '#6366f1') : '#64748b', transition: 'all 0.15s' }}>
              {s === '' ? 'All' : STATUS_META[s]?.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Booking ID', 'Customer', 'Salon', 'Service', 'Date', 'Time', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No bookings found</td></tr>
              ) : bookings.map(b => {
                const meta = STATUS_META[b.status] || STATUS_META.pending;
                const service = b.serviceName || (b.services?.[0]?.serviceName) || '—';
                return (
                  <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#6366f1', fontFamily: 'monospace', fontWeight: 600 }}>
                      {b.bookingId ? `#${b.bookingId.slice(-6).toUpperCase()}` : b._id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{b.customerName || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.customerPhone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151', maxWidth: 140 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.salonName || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', maxWidth: 120 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(b.appointmentDate)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{b.appointmentTime || '—'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtMoney(b.totalAmount)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
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
            style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff', color: '#374151' }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: '#64748b' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: '#fff', color: '#374151' }}>Next</button>
        </div>
      )}
    </div>
  );
}
