import { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, MapPin, Phone, User } from 'lucide-react';

export default function PendingSalons() {
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/salons/pending?page=${p}&limit=10`);
      setSalons(r.data.data.salons);
      setTotalPages(r.data.data.pagination.pages || 1);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  const approve = async (id) => {
    try {
      await api.post(`/admin/salons/${id}/approve`);
      toast.success('Salon approved!');
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error('Reason required');
    try {
      await api.post(`/admin/salons/${rejectModal}/reject`, { reason });
      toast.success('Salon rejected');
      setRejectModal(null);
      setReason('');
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Pending Approvals</h1>
      <p style={{ color: '#64748b', marginBottom: 28, fontSize: 14 }}>{salons.length} salons waiting for review</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : salons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: '#fff', borderRadius: 12 }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600 }}>All caught up! No pending salons.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {salons.map(salon => (
            <div key={salon._id} style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {salon.logo || (salon.photos && salon.photos[0]) ? (
                <img src={salon.logo || salon.photos[0]} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 24 }}>✂</span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>{salon.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{salon.city || salon.address}</span>
                  {salon.ownerId && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} />{salon.ownerId.name}</span>}
                  {salon.ownerId && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} />{salon.ownerId.phone}</span>}
                </div>
                <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>PENDING</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => approve(salon._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  onClick={() => setRejectModal(salon._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff' }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14 }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: '#fff' }}>Next</button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Reject Salon</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              style={{ width: '100%', padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={reject} style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Confirm Reject</button>
              <button onClick={() => { setRejectModal(null); setReason(''); }} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
