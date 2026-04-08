import { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, MapPin, Phone, User, Image, Play, FileText, ChevronDown, ChevronUp } from 'lucide-react';

function SalonMediaSection({ salonId, salon }) {
  const [expanded, setExpanded] = useState(false);
  const [media, setMedia] = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(false);

  const loadMedia = async () => {
    if (media !== null) { setExpanded(e => !e); return; }
    setLoading(true);
    setExpanded(true);
    try {
      const r = await api.get(`/admin/salons/${salonId}/media`);
      setMedia(r.data.data.media || []);
    } catch {
      toast.error('Failed to load media');
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const photos = (media || []).filter(m => m.type === 'photo');
  const videos = (media || []).filter(m => m.type === 'video' || m.type === 'reel');
  const directVideoUrl = salon.videoUrl;
  const licenseUrl = salon.businessLicenseUrl;
  const regUrl = salon.businessRegistrationUrl;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={loadMedia}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: 0,
        }}
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Hide' : 'View'} Media & Documents
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {loading ? (
            <div style={{ padding: '12px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {photos.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                    <Image size={12} /> Photos ({photos.length})
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {photos.map((m, i) => (
                      <a key={m._id || i} href={m.url} target="_blank" rel="noopener noreferrer">
                        <img src={m.url} alt={m.caption || `Photo ${i + 1}`} style={{ width: 100, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {videos.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                    <Play size={12} /> Videos ({videos.length})
                  </div>
                  {videos.map((m, i) => (
                    <video key={m._id || i} src={m.url} controls style={{ maxWidth: 360, width: '100%', borderRadius: 10, border: '1px solid var(--border)', maxHeight: 200, marginBottom: 8 }} />
                  ))}
                </div>
              )}

              {directVideoUrl && videos.length === 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                    <Play size={12} /> Business Tour Video
                  </div>
                  <video src={directVideoUrl} controls style={{ maxWidth: 360, width: '100%', borderRadius: 10, border: '1px solid var(--border)', maxHeight: 200 }} />
                </div>
              )}

              {(licenseUrl || regUrl) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                    <FileText size={12} /> Documents
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {licenseUrl && (
                      <a href={licenseUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <FileText size={12} /> Business License
                      </a>
                    )}
                    {regUrl && (
                      <a href={regUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                        <FileText size={12} /> Registration Doc
                      </a>
                    )}
                  </div>
                </div>
              )}

              {photos.length === 0 && videos.length === 0 && !directVideoUrl && !licenseUrl && !regUrl && (
                <p style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>No media uploaded.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
      toast.success('Business approved!');
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error('Reason required');
    try {
      await api.post(`/admin/salons/${rejectModal}/reject`, { reason });
      toast.success('Business rejected');
      setRejectModal(null);
      setReason('');
      load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div style={{ padding: '32px 36px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Pending Approvals</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 28, fontSize: 14 }}>{salons.length} businesses waiting for review</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <span style={{ color: 'var(--text2)' }}>Loading...</span>
        </div>
      ) : salons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
          <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 600, color: 'var(--text)' }}>All caught up! No pending businesses.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {salons.map(salon => (
            <div key={salon._id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {salon.logo || (salon.photos && salon.photos[0]) ? (
                  <img src={salon.logo || salon.photos[0]} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 24 }}>✂</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>{salon.name}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{salon.city || salon.address}</span>
                    {salon.ownerId && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} />{salon.ownerId.name}</span>}
                    {salon.ownerId && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} />{salon.ownerId.phone}</span>}
                  </div>
                  <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>PENDING</span>
                  <SalonMediaSection salonId={salon._id} salon={salon} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => approve(salon._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s ease' }}
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button
                    onClick={() => setRejectModal(salon._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s ease' }}
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--text2)' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Reject Business</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              style={{ width: '100%', padding: 12, background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, resize: 'vertical', outline: 'none', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={reject} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Confirm Reject</button>
              <button onClick={() => { setRejectModal(null); setReason(''); }} style={{ flex: 1, padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontWeight: 600, color: 'var(--text2)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
