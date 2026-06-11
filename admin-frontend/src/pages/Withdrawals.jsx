import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import {
  Landmark, X, User, Store, Check, Ban, Copy,
} from 'lucide-react';

const STATUS_META = {
  pending:  { label: 'Pending',  bg: 'rgba(217,119,6,0.15)',   color: '#d97706' },
  paid:     { label: 'Paid',     bg: 'rgba(5,150,105,0.15)',   color: '#059669' },
  rejected: { label: 'Rejected', bg: 'rgba(220,38,38,0.15)',   color: '#dc2626' },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Badge({ bg, color, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 11,
      fontSize: 11, fontWeight: 700, background: bg, color,
    }}>
      {children}
    </span>
  );
}

export default function Withdrawals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');

  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (status) params.set('status', status);
      const r = await api.get(`/admin/withdrawals?${params}`);
      const data = r.data.data || {};
      setItems(data.requests || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load withdrawals'); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changing the status filter resets to page 1 (and refetches exactly once)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (page === 1) load(1);
    else setPage(1);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = (item) => { setSelected(item); setNote(''); };
  const closeDetail = () => setSelected(null);

  const copyUpi = (upi) => {
    navigator.clipboard?.writeText(upi).then(
      () => toast.success('UPI ID copied'),
      () => toast.error('Could not copy')
    );
  };

  const process = async (action) => {
    if (!selected) return;
    if (action === 'rejected' && !note.trim()) {
      toast.error('Add a note explaining why the request is rejected.');
      return;
    }
    setProcessing(action);
    try {
      const r = await api.patch(`/admin/withdrawals/${selected._id}`, { action, note: note.trim() || undefined });
      const updated = r.data.data?.request;
      setItems(prev => prev.map(it => it._id === updated._id ? { ...it, ...updated } : it));
      toast.success(action === 'paid' ? 'Marked as paid' : 'Rejected — amount returned to wallet');
      closeDetail();
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to process withdrawal');
    } finally { setProcessing(''); }
  };

  const inputStyle = {
    padding: '9px 12px', background: 'var(--input-bg)', border: '1.5px solid var(--border)',
    borderRadius: 10, fontSize: 13, outline: 'none', color: 'var(--text)',
  };

  const ownerName = (item) =>
    item.ownerId?.businessName || item.ownerId?.name || item.ownerId?.phone || '—';

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Landmark size={22} /> Wallet Withdrawals
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
          {total} request{total === 1 ? '' : 's'} · transfer the amount to the user's UPI, then mark it paid
        </p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['pending', 'Pending'], ['paid', 'Paid'], ['rejected', 'Rejected'], ['', 'All']].map(([val, label]) => (
          <button key={label} onClick={() => setStatus(val)}
            style={{
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: status === val ? '1.5px solid #8b5cf6' : '1px solid var(--border)',
              background: status === val ? 'rgba(139,92,246,0.1)' : 'var(--surface)',
              color: status === val ? '#8b5cf6' : 'var(--text2)',
            }}>
            {label}
          </button>
        ))}
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
                {['User', 'Type', 'Amount', 'UPI ID', 'Requested', 'Status'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No withdrawal requests</td></tr>
              ) : items.map(item => {
                const stMeta = STATUS_META[item.status] || STATUS_META.pending;
                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => openDetail(item)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                        {item.ownerType === 'Owner' ? <Store size={13} /> : <User size={13} />}
                        {ownerName(item)}
                      </div>
                      {item.ownerId?.phone && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.ownerId.phone}</span>}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text2)' }}>{item.ownerType}</td>
                    <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>₹{Number(item.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text2)', fontFamily: 'monospace' }}>{item.upiId}</td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmt(item.createdAt)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <Badge bg={stMeta.bg} color={stMeta.color}>{stMeta.label}</Badge>
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
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--text2)' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {/* Detail / process modal */}
      {selected && (
        <div
          onClick={closeDetail}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            maxWidth: 480, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  ₹{Number(selected.amount).toLocaleString('en-IN')} withdrawal
                </h2>
                <Badge bg={(STATUS_META[selected.status] || STATUS_META.pending).bg} color={(STATUS_META[selected.status] || STATUS_META.pending).color}>
                  {(STATUS_META[selected.status] || STATUS_META.pending).label}
                </Badge>
              </div>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</p>
              <p style={{ fontSize: 14, color: 'var(--text)' }}>
                {ownerName(selected)} ({selected.ownerType}) · {selected.ownerId?.phone || '—'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Requested {fmt(selected.createdAt)}</p>
              {selected.processedAt && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Processed {fmt(selected.processedAt)}</p>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pay to UPI ID</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{selected.upiId}</span>
                <button onClick={() => copyUpi(selected.upiId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>

            {selected.adminNote && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Note</p>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>{selected.adminNote}</p>
              </div>
            )}

            {selected.status === 'pending' && (
              <>
                <div style={{
                  marginBottom: 14, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>
                    Send ₹{Number(selected.amount).toLocaleString('en-IN')} to the UPI ID above from your bank/UPI app,
                    then mark this request as <strong>Paid</strong>. Rejecting returns the amount to the user's wallet automatically.
                  </p>
                </div>

                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note (required for reject)</p>
                  <textarea
                    value={note} onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. UPI transfer reference, or reason for rejection"
                    style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => process('rejected')} disabled={!!processing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.08)', color: '#dc2626', cursor: processing ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: processing ? 0.7 : 1 }}>
                    <Ban size={14} /> {processing === 'rejected' ? 'Rejecting...' : 'Reject & Refund'}
                  </button>
                  <button onClick={() => process('paid')} disabled={!!processing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', cursor: processing ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: processing ? 0.7 : 1 }}>
                    <Check size={14} /> {processing === 'paid' ? 'Saving...' : 'Mark as Paid'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
