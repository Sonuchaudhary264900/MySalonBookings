import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Search, ToggleLeft, ToggleRight, MapPin, Star, ChevronDown, X, Play, FileText, Image, QrCode, Download, Copy, CheckCircle2 } from 'lucide-react';
import QRCode from 'react-qr-code';

const CUSTOMER_URL = (import.meta.env.VITE_CUSTOMER_APP_URL || 'https://mysalonbookings.com').replace(/\/$/, '');

const STATUS_COLORS = {
  approved: { color: '#10b981' },
  pending:  { color: '#f59e0b' },
  rejected: { color: '#ef4444' },
};

function MediaModal({ salon, onClose }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/salons/${salon._id}/media`)
      .then(r => setMedia(r.data.data.media || []))
      .catch(() => toast.error('Failed to load media'))
      .finally(() => setLoading(false));
  }, [salon._id]);

  const photos = media.filter(m => m.type === 'photo');
  const videos = media.filter(m => m.type === 'video' || m.type === 'reel');
  // Also check direct fields on the salon
  const directVideoUrl = salon.videoUrl;
  const licenseUrl = salon.businessLicenseUrl;
  const regUrl = salon.businessRegistrationUrl;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 660, maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{salon.name} — Media</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Loading media...</span>
          </div>
        ) : (
          <>
            {/* Photos */}
            {photos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Image size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Photos ({photos.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {photos.map((m, i) => (
                    <a key={m._id || i} href={m.url} target="_blank" rel="noopener noreferrer">
                      <img src={m.url} alt={m.caption || `Photo ${i + 1}`} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer' }} />
                      {m.caption && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, textAlign: 'center' }}>{m.caption}</div>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Videos from BusinessMedia */}
            {videos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Play size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Videos ({videos.length})</span>
                </div>
                {videos.map((m, i) => (
                  <div key={m._id || i} style={{ marginBottom: 10 }}>
                    <video src={m.url} controls style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', maxHeight: 240 }} />
                    {m.caption && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{m.caption}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Direct videoUrl from business registration */}
            {directVideoUrl && videos.length === 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Play size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Business Tour Video</span>
                </div>
                <video src={directVideoUrl} controls style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', maxHeight: 240 }} />
              </div>
            )}

            {/* Documents */}
            {(licenseUrl || regUrl) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <FileText size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Documents</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {licenseUrl && (
                    <a href={licenseUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <FileText size={14} /> Business License
                    </a>
                  )}
                  {regUrl && (
                    <a href={regUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--accent)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <FileText size={14} /> Business Registration
                    </a>
                  )}
                </div>
              </div>
            )}

            {photos.length === 0 && videos.length === 0 && !directVideoUrl && !licenseUrl && !regUrl && (
              <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 14, padding: '20px 0' }}>No media uploaded yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const BIZ_TYPE_LABELS = {
  barbershop: 'Barbershop', salon: 'Salon', spa_wellness: 'Spa & Wellness',
  makeup_bridal: 'Makeup & Bridal', skin_derma: 'Skin & Derma',
};

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border2)' }}>
      <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, minWidth: 100, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function QRModal({ salon, onClose, isReady, onToggleReady }) {
  const canvasRef = useRef(null);
  const [detail, setDetail] = useState(null);
  const salonUrl = `${CUSTOMER_URL}/salon/${salon._id}`;

  useEffect(() => {
    api.get(`/admin/salons/${salon._id}/detail`)
      .then(r => setDetail(r.data.data.salon))
      .catch(() => {});
  }, [salon._id]);

  const d = detail || salon;
  const owner = d.ownerId || {};

  const handleCopy = () => {
    navigator.clipboard.writeText(salonUrl).then(() => toast.success('Link copied'));
  };

  const handleDownload = () => {
    const svg = canvasRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const out = document.createElement('canvas');
      out.width = 400; out.height = 500;
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#0d0d2b';
      ctx.fillRect(0, 0, 400, 500);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(40, 40, 320, 320, 16);
      ctx.fill();
      ctx.drawImage(img, 50, 50, 300, 300);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(salon.name, 200, 405);
      ctx.fillStyle = '#6366f1';
      ctx.font = '13px sans-serif';
      ctx.fillText('GlowLoox', 200, 430);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(salonUrl.slice(0, 48), 200, 460);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = `${salon.name.replace(/\s+/g, '_')}_QR.png`;
      link.href = out.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  };

  const sc = STATUS_COLORS[d.approvalStatus] || STATUS_COLORS.pending;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: 0, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(d.logo || (d.photos && d.photos[0])) && (
              <img src={d.logo || d.photos[0]?.url || d.photos[0]} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{d.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${sc.color}22`, color: sc.color, border: `1px solid ${sc.color}44` }}>{d.approvalStatus?.toUpperCase()}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{BIZ_TYPE_LABELS[d.businessType] || d.businessType}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)' }}><X size={20} /></button>
        </div>

        {/* Body — two columns */}
        <div style={{ display: 'flex', gap: 0, flex: 1 }}>

          {/* Left — QR */}
          <div style={{ width: 240, flexShrink: 0, padding: '20px 20px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div ref={canvasRef} style={{ background: '#fff', borderRadius: 14, padding: 12 }}>
              <QRCode value={salonUrl} size={180} bgColor="#ffffff" fgColor="#0d0d2b" level="H" />
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', wordBreak: 'break-all' }}>{salonUrl}</div>
            <button onClick={handleCopy}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              <Copy size={13} /> Copy Link
            </button>
            <button onClick={handleDownload}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <Download size={13} /> Download QR
            </button>
            <button onClick={() => onToggleReady(salon._id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 10, border: `1px solid ${isReady ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`, background: isReady ? 'rgba(16,185,129,0.12)' : 'var(--surface)', color: isReady ? '#10b981' : 'var(--text3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
              <CheckCircle2 size={13} /> {isReady ? 'Ready to Send' : 'Mark Ready'}
            </button>
          </div>

          {/* Right — Details */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Owner Details</div>
            <DetailRow label="Name"   value={owner.name} />
            <DetailRow label="Phone"  value={owner.phone} />
            <DetailRow label="Email"  value={owner.email} />
            <DetailRow label="Owner Status" value={owner.approvalStatus || owner.status} />

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '16px 0 10px' }}>Business Details</div>
            <DetailRow label="Type"      value={BIZ_TYPE_LABELS[d.businessType] || d.businessType} />
            <DetailRow label="Address"   value={d.address} />
            <DetailRow label="City"      value={d.city} />
            <DetailRow label="District"  value={d.district} />
            <DetailRow label="State"     value={d.state} />
            <DetailRow label="Pincode"   value={d.pincode} />
            <DetailRow label="Gender"    value={d.servedGender} />

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '16px 0 10px' }}>Stats</div>
            <DetailRow label="Bookings"  value={d.totalBookings != null ? String(d.totalBookings) : null} />
            <DetailRow label="Rating"    value={d.averageRating != null ? `${d.averageRating.toFixed(1)} / 5` : null} />
            <DetailRow label="Active"    value={d.isActive ? 'Yes' : 'No'} />
            <DetailRow label="Joined"    value={d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [mediaModal, setMediaModal] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [qrReady, setQrReady] = useState(new Set());

  useEffect(() => {
    api.get('/admin/salons/filter-options')
      .then(r => setStates(r.data.data.states || []))
      .catch(() => {});
  }, []);

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

  const handleSearch = (e) => { e.preventDefault(); applyFilters(); };
  const handleStatusChange = (st) => { setStatus(st); applyFilters({ status: st }); };
  const handleStateChange = (e) => { const val = e.target.value; setState(val); setCity(''); applyFilters({ state: val, city: '' }); };
  const handleCityChange = (e) => { const val = e.target.value; setCity(val); applyFilters({ city: val }); };

  const toggleActive = async (salon) => {
    try {
      await api.put(`/admin/salons/${salon._id}/toggle`);
      toast.success(salon.isActive ? 'Business deactivated' : 'Business activated');
      load(page, search, status, state, city);
    } catch { toast.error('Failed'); }
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setState(''); setCity('');
    setPage(1);
    load(1, '', '', '', '');
  };

  const toggleQrReady = (id) => setQrReady(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const hasFilters = search || status || state || city;

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

  const selectStyle = {
    padding: '9px 32px 9px 12px',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    background: 'var(--input-bg)',
    color: 'var(--text)',
    cursor: 'pointer',
    appearance: 'none',
    minWidth: 140,
  };

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>All Business</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{total} businesses found</p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Clear all filters
          </button>
        )}
      </div>

      {/* Filters row 1 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search businesses..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            <Search size={16} />
          </button>
        </form>
        <div style={{ display: 'flex', gap: 6 }}>
          {['', 'pending', 'approved', 'rejected'].map(s => {
            const active = status === s;
            const color = STATUS_COLORS[s]?.color || 'var(--accent)';
            return (
              <button key={s} onClick={() => handleStatusChange(s)}
                style={{
                  padding: '8px 14px', border: '1.5px solid',
                  borderColor: active ? color : 'var(--border)',
                  borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: active ? `${color}22` : 'var(--surface)',
                  color: active ? color : 'var(--text2)',
                  transition: 'all 0.15s',
                }}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters row 2 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <select value={state} onChange={handleStateChange} style={selectStyle}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={city} onChange={handleCityChange} style={selectStyle} disabled={!cities.length && !state}>
            <option value="">All Districts</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        </div>
        {(state || city) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
            <MapPin size={13} />
            {[state, city].filter(Boolean).join(' → ')}
          </div>
        )}
      </div>

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
                {['Business', 'Owner', 'State', 'District', 'Status', 'Rating', 'Media', 'QR', 'Active', 'Bookings'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salons.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No businesses found</td></tr>
              ) : salons.map(salon => {
                const sc = STATUS_COLORS[salon.approvalStatus] || STATUS_COLORS.pending;
                return (
                  <tr key={salon._id} style={{ borderBottom: '1px solid var(--border2)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {salon.logo || (salon.photos && salon.photos[0]) ? (
                          <img src={salon.logo || salon.photos[0]?.url || salon.photos[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✂</div>
                        )}
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{salon.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text2)' }}>{salon.ownerId?.name || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text2)' }}>{salon.state || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{salon.district || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${sc.color}22`, color: sc.color, border: `1px solid ${sc.color}44` }}>
                        {salon.approvalStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text2)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} color="#f59e0b" />{salon.averageRating?.toFixed(1) || '—'}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setMediaModal(salon)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)',
                          background: 'rgba(99,102,241,0.1)',
                          color: 'var(--accent)',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600,
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Image size={12} /> View
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setQrModal(salon)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px', borderRadius: 8,
                          border: `1px solid ${qrReady.has(salon._id) ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.3)'}`,
                          background: qrReady.has(salon._id) ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)',
                          color: qrReady.has(salon._id) ? '#10b981' : 'var(--accent)',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                        }}
                      >
                        {qrReady.has(salon._id) ? <CheckCircle2 size={12} /> : <QrCode size={12} />}
                        {qrReady.has(salon._id) ? 'Ready' : 'QR'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => toggleActive(salon)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: salon.isActive ? '#10b981' : 'var(--text4)' }}>
                        {salon.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text2)' }}>{salon.totalBookings || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '8px 16px', fontSize: 14, color: 'var(--text2)' }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 10, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'var(--surface)', color: 'var(--text2)', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {/* Media Modal */}
      {mediaModal && <MediaModal salon={mediaModal} onClose={() => setMediaModal(null)} />}
      {/* QR Modal */}
      {qrModal && <QRModal salon={qrModal} onClose={() => setQrModal(null)} isReady={qrReady.has(qrModal._id)} onToggleReady={toggleQrReady} />}
    </div>
  );
}
