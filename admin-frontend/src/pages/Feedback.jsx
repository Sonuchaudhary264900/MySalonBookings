import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import {
  Search, Bug, Lightbulb, MessageSquare, X, User, Store,
} from 'lucide-react';

const TYPE_META = {
  bug:        { label: 'Bug',        icon: Bug,            color: '#dc2626' },
  suggestion: { label: 'Suggestion', icon: Lightbulb,      color: '#2563eb' },
  feedback:   { label: 'Feedback',   icon: MessageSquare,  color: '#8b5cf6' },
};

const SEVERITY_META = {
  low:      { label: 'Low',      bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
  medium:   { label: 'Medium',   bg: 'rgba(37,99,235,0.15)',   color: '#2563eb' },
  high:     { label: 'High',     bg: 'rgba(217,119,6,0.15)',   color: '#d97706' },
  critical: { label: 'Critical', bg: 'rgba(220,38,38,0.15)',   color: '#dc2626' },
};

const STATUS_META = {
  open:      { label: 'Open',      bg: 'rgba(217,119,6,0.15)', color: '#d97706' },
  in_review: { label: 'In Review', bg: 'rgba(37,99,235,0.15)', color: '#2563eb' },
  resolved:  { label: 'Resolved',  bg: 'rgba(5,150,105,0.15)', color: '#059669' },
  closed:    { label: 'Closed',    bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
};

const SOURCE_LABELS = {
  customer_web:     'Customer · Web',
  customer_android: 'Customer · Android',
  owner_web:        'Owner · Web',
  owner_android:    'Owner · Android',
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

export default function Feedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState('newest');

  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15, sort });
      if (search)   params.set('q', search);
      if (status)   params.set('status', status);
      if (type)     params.set('type', type);
      if (severity) params.set('severity', severity);
      if (source)   params.set('sourceSurface', source);
      const r = await api.get(`/admin/feedback?${params}`);
      setItems(r.data.data || []);
      setTotal(r.data.pagination?.total || 0);
      setTotalPages(r.data.pagination?.pages || 1);
    } catch { toast.error('Failed to load feedback'); }
    finally { setLoading(false); }
  }, [search, status, type, severity, source, sort]);

  useEffect(() => { load(page); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  useEffect(() => {
    if (page === 1) load(1);
    else setPage(1);
  }, [status, type, severity, source, sort]);

  const openDetail = (item) => {
    setSelected(item);
    setDraftStatus(item.status);
    setDraftNotes(item.adminNotes || '');
  };

  const closeDetail = () => setSelected(null);

  const saveStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/feedback/${selected._id}`, { status: draftStatus, adminNotes: draftNotes });
      const updated = r.data.data;
      setItems(prev => prev.map(it => it._id === updated._id ? updated : it));
      toast.success('Feedback updated');
      closeDetail();
    } catch { toast.error('Failed to update feedback'); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    padding: '9px 12px', background: 'var(--input-bg)', border: '1.5px solid var(--border)',
    borderRadius: 10, fontSize: 13, outline: 'none', color: 'var(--text)',
  };

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Feedback & Bug Reports</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>{total} submissions</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: '1 1 280px', maxWidth: 360 }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search subject, description, name, phone..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="submit" style={{ padding: '9px 14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            <Search size={15} />
          </button>
        </form>

        <select value={status} onChange={handleFilterChange(setStatus)} style={inputStyle}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={type} onChange={handleFilterChange(setType)} style={inputStyle}>
          <option value="">All types</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={severity} onChange={handleFilterChange(setSeverity)} style={inputStyle}>
          <option value="">All severities</option>
          {Object.entries(SEVERITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <select value={source} onChange={handleFilterChange(setSource)} style={inputStyle}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value)} style={inputStyle}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="severity">Severity</option>
        </select>
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
                {['Type', 'Severity', 'Subject', 'From', 'Source', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No feedback found</td></tr>
              ) : items.map(item => {
                const tMeta = TYPE_META[item.type] || TYPE_META.feedback;
                const sMeta = SEVERITY_META[item.severity] || SEVERITY_META.low;
                const stMeta = STATUS_META[item.status] || STATUS_META.open;
                const TypeIcon = tMeta.icon;
                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--border2)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => openDetail(item)}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: tMeta.color, fontWeight: 600 }}>
                        <TypeIcon size={14} />{tMeta.label}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <Badge bg={sMeta.bg} color={sMeta.color}>{sMeta.label}</Badge>
                    </td>
                    <td style={{ padding: '13px 16px', maxWidth: 260 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subject}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text2)' }}>
                        {item.userType === 'Owner' ? <Store size={12} /> : <User size={12} />}
                        {item.userName || item.userPhone || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text2)' }}>{SOURCE_LABELS[item.sourceSurface] || item.sourceSurface}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <Badge bg={stMeta.bg} color={stMeta.color}>{stMeta.label}</Badge>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{fmt(item.createdAt)}</td>
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

      {/* Detail modal */}
      {selected && (
        <div
          onClick={closeDetail}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
            maxWidth: 560, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{selected.subject}</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Badge bg={(SEVERITY_META[selected.severity] || SEVERITY_META.low).bg} color={(SEVERITY_META[selected.severity] || SEVERITY_META.low).color}>
                    {(TYPE_META[selected.type] || TYPE_META.feedback).label}
                    {selected.type === 'bug' ? ` · ${(SEVERITY_META[selected.severity] || SEVERITY_META.low).label}` : ''}
                  </Badge>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{SOURCE_LABELS[selected.sourceSurface] || selected.sourceSurface}</span>
                </div>
              </div>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</p>
              <p style={{ fontSize: 14, color: 'var(--text)' }}>
                {selected.userName || '—'} ({selected.userType}) · {selected.userPhone || '—'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{fmt(selected.createdAt)}</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</p>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.description}</p>
            </div>

            {(selected.appVersion || selected.osVersion || selected.deviceInfo) && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device Info</p>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {[selected.deviceInfo, selected.appVersion ? `App v${selected.appVersion}` : null, selected.osVersion ? `OS ${selected.osVersion}` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {selected.screenshotUrl && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Screenshot</p>
                <img
                  src={selected.screenshotUrl}
                  alt="Screenshot"
                  onClick={() => setLightbox(selected.screenshotUrl)}
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, border: '1px solid var(--border)', cursor: 'zoom-in' }}
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</p>
              <select value={draftStatus} onChange={e => setDraftStatus(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Notes</p>
              <textarea
                value={draftNotes} onChange={e => setDraftNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes (not visible to user)"
                style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeDetail} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={saveStatus} disabled={saving} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 20 }}
        >
          <img src={lightbox} alt="Screenshot full size" style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
