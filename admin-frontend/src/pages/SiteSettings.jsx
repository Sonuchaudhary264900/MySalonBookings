import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Eye, EyeOff, ImageIcon, Plus, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

export default function SiteSettings() {
  const [images, setImages]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [label, setLabel]       = useState('');
  const [preview, setPreview]   = useState(null);
  const [file, setFile]         = useState(null);
  const fileRef = useRef();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/site-settings');
      setImages(res.data.data?.heroImages || []);
    } catch { toast.error('Failed to load settings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('label', label);
      const res = await api.post('/admin/site-settings/hero-images', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImages(res.data.data?.heroImages || []);
      setFile(null); setPreview(null); setLabel('');
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleToggle = async (id, current) => {
    try {
      const res = await api.patch(`/admin/site-settings/hero-images/${id}`, { active: !current });
      setImages(res.data.data?.heroImages || []);
      toast.success(current ? 'Image hidden' : 'Image shown');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hero image permanently?')) return;
    try {
      const res = await api.delete(`/admin/site-settings/hero-images/${id}`);
      setImages(res.data.data?.heroImages || []);
      toast.success('Image deleted');
    } catch { toast.error('Delete failed'); }
  };

  const activeCount = images.filter(i => i.active).length;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6366f1', marginBottom: 6 }}>
          Appearance
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em', margin: '0 0 6px' }}>
          Hero Image Manager
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Control which images appear in the hero section of the customer home page.
        </p>
      </div>

      {/* Upload card */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, marginBottom: 32,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
          <Plus size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          Add New Hero Image
        </h2>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Preview box */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 220, height: 140, borderRadius: 12, overflow: 'hidden',
              border: preview ? 'none' : '2px dashed var(--border)',
              background: preview ? 'transparent' : 'var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, position: 'relative',
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <ImageIcon size={28} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Click to choose</span>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {/* Label + upload */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Label (optional)
            </label>
            <input
              type="text" placeholder="e.g. Summer Campaign"
              value={label} onChange={e => setLabel(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text)', fontSize: 13, marginBottom: 14,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 10, border: 'none',
                background: !file || uploading ? 'var(--border)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: !file || uploading ? 'var(--text-3)' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: !file || uploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload Image'}
            </button>
          </div>
        </div>
      </div>

      {/* Image grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Hero Images
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
            background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)',
          }}>
            {activeCount} active
          </span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {!loading && images.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            border: '2px dashed var(--border)', borderRadius: 16,
            color: 'var(--text-3)',
          }}>
            <ImageIcon size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>No hero images yet</p>
            <p style={{ fontSize: 12 }}>Upload an image above to display it in the hero section.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {images.map(img => (
            <div key={img._id} style={{
              borderRadius: 14, overflow: 'hidden',
              border: `1px solid ${img.active ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
              background: 'var(--card)',
              opacity: img.active ? 1 : 0.55,
              transition: 'opacity 0.2s',
            }}>
              {/* Image */}
              <div style={{ position: 'relative', height: 160 }}>
                <img src={img.url} alt={img.label || 'Hero'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Status badge */}
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999,
                    background: img.active ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.6)',
                    color: '#fff', backdropFilter: 'blur(6px)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {img.active ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>

              {/* Info + actions */}
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {img.label || 'No label'}
                </span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleToggle(img._id, img.active)}
                    title={img.active ? 'Hide' : 'Show'}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: img.active ? '#6366f1' : 'var(--text-3)',
                    }}
                  >
                    {img.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(img._id)}
                    title="Delete"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                      background: 'rgba(239,68,68,0.06)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#f87171',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
