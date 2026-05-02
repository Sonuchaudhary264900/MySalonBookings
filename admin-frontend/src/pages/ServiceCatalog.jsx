import { useEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, RefreshCw,
  Layers, Image as ImageIcon, Database, AlertTriangle,
  ChevronRight, Camera, Scissors, User, Sparkles, Droplets,
  Leaf, Star, Palette, Baby, Home, Zap, Activity,
  Stethoscope, Heart, Tag, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

/* ─── Category icon map ──────────────────────────────────────────────────────── */
const ICON_MAP = {
  'Hair Services': Scissors, 'Hair Services (Men)': Scissors, 'Hair Services (Women)': Scissors,
  'Beard & Grooming': User,
  'Nail Services': Sparkles,
  'Skin & Face': Droplets, 'Skin & Beauty': Droplets, 'Skin & Face (Men Grooming)': Droplets,
  'Skin Dermatology': Stethoscope, 'Men Dermatology': Stethoscope,
  'Spa & Massage': Leaf, 'Spa & Relaxation': Leaf, 'Spa & Wellness': Leaf,
  'Body Grooming': Activity,
  'Bridal & Events': Star, 'Bridal Makeup': Star,
  'Makeup & Styling': Palette, 'Makeup': Palette,
  'Hair Coloring & Highlights': Palette,
  'Kids Services': Baby,
  'At-Home Services': Home,
  'Advanced Hair Treatments': Zap, 'Advanced Skin Treatments': Zap,
  'Wellness & Therapy': Heart,
};
const getCatIcon = (label) => ICON_MAP[label] || Tag;

const BUSINESS_TYPES = [
  { value: 'barbershop',    label: 'Barbershop',      emoji: '✂️' },
  { value: 'salon',         label: 'Salon',            emoji: '💇' },
  { value: 'spa_wellness',  label: 'Spa & Wellness',   emoji: '🌿' },
  { value: 'makeup_bridal', label: 'Makeup & Bridal',  emoji: '💄' },
  { value: 'skin_derma',    label: 'Skin & Derma',     emoji: '🧴' },
];

/* ─── Style tokens ───────────────────────────────────────────────────────────── */
const S = {
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '8px 12px', color: '#f1f5f9', fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  btn: (color = '#6366f1') => ({
    background: color, border: 'none', borderRadius: 10, padding: '8px 16px',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }),
  ghost: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '6px 12px', color: '#94a3b8', fontSize: 12,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  },
  danger: {
    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 8, padding: '6px 12px', color: '#f87171', fontSize: 12,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  },
};

/* ─── Image upload helper (used in modal) ────────────────────────────────────── */
function ImgUploadCell({ value, onChange }) {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(value || '');
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/admin/catalog/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data.data?.url;
      setPreview(url); onChange(url);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {preview
        ? <img src={preview} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
        : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ImageIcon size={16} color="#64748b" />
          </div>}
      <button style={S.ghost} onClick={() => ref.current?.click()} disabled={uploading}>
        {uploading ? <RefreshCw size={12} style={{ animation: 'spin .7s linear infinite' }} /> : <Camera size={12} />}
        {preview ? 'Change' : 'Upload'}
      </button>
      {preview && <button style={{ ...S.ghost, padding: '6px 8px' }} onClick={() => { setPreview(''); onChange(''); }}><X size={12} /></button>}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ─── AdminCircle — matches owner CircleButton style exactly ─────────────────── */
function AdminCircle({ label, imgSrc, isSelected, onClick, onUpload, onEdit, onDelete, uploading }) {
  const [hovered, setHovered] = useState(false);
  const [broken,  setBroken]  = useState(false);
  const fileRef = useRef(null);
  const showImg = !!imgSrc && !broken;
  const Icon = getCatIcon(label);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 0, padding: '0 10px', flexShrink: 0, cursor: 'pointer', overflow: 'visible',
        opacity: isSelected || hovered ? 1 : 0.68,
        transform: isSelected ? 'translateY(-6px) scale(1.06)' : hovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Circle with badges */}
      <div style={{ position: 'relative' }}>
        {/* Main circle */}
        <div
          onClick={onClick}
          style={{
            width: 54, height: 54, borderRadius: '50%', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: showImg ? '#111' : isSelected
              ? 'linear-gradient(145deg,#818cf8 0%,#6366f1 40%,#4f46e5 100%)'
              : 'rgba(26,26,46,0.9)',
            boxShadow: isSelected
              ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28), 0 8px 24px rgba(99,102,241,0.45)'
              : '0 0 0 1.5px rgba(255,255,255,0.09)',
            transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
          }}>
          {showImg
            ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setBroken(true)} />
            : <Icon size={20} color={isSelected ? '#fff' : '#6366f1'} />}
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={14} color="#fff" style={{ animation: 'spin .7s linear infinite' }} />
            </div>
          )}
        </div>

        {/* Camera badge — bottom right */}
        <button
          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
          title="Set photo"
          style={{
            position: 'absolute', bottom: -2, right: -3, width: 20, height: 20,
            borderRadius: '50%', background: '#6366f1', border: '2px solid #0a0f1e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: hovered ? 1 : 0.55,
            transition: 'opacity .15s',
          }}>
          <Camera size={9} color="#fff" />
        </button>

        {/* Edit badge — top left (only if onEdit provided) */}
        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            title="Rename"
            style={{
              position: 'absolute', top: -3, left: -3, width: 18, height: 18,
              borderRadius: '50%', background: '#1e293b', border: '1.5px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: hovered ? 1 : 0, transition: 'opacity .15s',
            }}>
            <Pencil size={8} color="#94a3b8" />
          </button>
        )}

        {/* Delete badge — top right */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete"
          style={{
            position: 'absolute', top: -3, right: -3, width: 18, height: 18,
            borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: '2px solid #0a0f1e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', opacity: hovered ? 1 : 0, transition: 'opacity .15s',
          }}>
          <X size={8} color="#fff" />
        </button>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      </div>

      {/* Selection indicator dot */}
      <div style={{
        width: 20, height: 3, borderRadius: 999, marginTop: 6,
        background: isSelected ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent',
        boxShadow: isSelected ? '0 0 8px rgba(99,102,241,0.8)' : 'none',
        transition: 'all 0.22s',
      }} />

      {/* Label */}
      <span style={{
        fontSize: 11, fontWeight: isSelected ? 700 : 500, marginTop: 4,
        color: isSelected ? '#fff' : '#94a3b8',
        whiteSpace: 'nowrap', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis',
        textAlign: 'center', lineHeight: 1.2, transition: 'color 0.22s',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Horizontal scroll row for circles ─────────────────────────────────────── */
function CircleRow({ children }) {
  return (
    <>
      <style>{`.circle-scroll::-webkit-scrollbar{display:none}`}</style>
      <div className="circle-scroll" style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'nowrap',
        overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch', paddingBottom: 8, paddingTop: 4,
      }}>
        {children}
      </div>
    </>
  );
}

/* ─── Tree branch connector between levels ───────────────────────────────────── */
function TreeBranch({ from, to, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0 4px 36px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
        <div style={{ width: 2, height: 14, background: 'linear-gradient(to bottom, rgba(99,102,241,0.7), rgba(99,102,241,0.4))' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.6)', flexShrink: 0 }} />
        <div style={{ width: 2, height: 10, background: 'linear-gradient(to bottom, rgba(99,102,241,0.4), transparent)' }} />
      </div>
      <div style={{ height: 1, width: 18, background: 'rgba(99,102,241,0.4)', flexShrink: 0 }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8,
        padding: '4px 12px', borderRadius: 20,
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <ChevronRight size={11} color="#6366f1" />
        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
          {from} <span style={{ color: '#6366f1', fontWeight: 700 }}>›</span> {to}
        </span>
        {count !== undefined && (
          <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 10 }}>
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────────── */
function SectionHeader({ label, sub, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 800, color: '#f1f5f9', fontSize: 14 }}>{label}</span>
        {sub && <span style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>{sub}</span>}
      </div>
      {actions}
    </div>
  );
}

/* ─── Service card ───────────────────────────────────────────────────────────── */
function SvcCard({ svc, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${hov ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16, overflow: 'hidden', transition: 'border-color .15s, transform .15s',
        transform: hov ? 'translateY(-2px)' : 'none', cursor: 'pointer',
      }}>
      {/* Image */}
      <div style={{ width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {svc.defaultImage
          ? <img src={svc.defaultImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Layers size={28} color="rgba(99,102,241,0.4)" />}
      </div>
      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13, marginBottom: 8 }}>{svc.name}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ ...S.ghost, flex: 1, justifyContent: 'center', fontSize: 11, padding: '5px 8px' }}
            onClick={() => onEdit(svc)}><Pencil size={10} /> Edit</button>
          <button style={{ ...S.danger, padding: '5px 8px', fontSize: 11 }}
            onClick={() => onDelete(svc._id, svc.name)}><Trash2 size={10} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty placeholder ──────────────────────────────────────────────────────── */
function Empty({ label, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <AlertTriangle size={28} color="#1e293b" style={{ marginBottom: 10 }} />
      <p style={{ color: '#475569', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{label}</p>
      {sub && <p style={{ color: '#334155', fontSize: 12, margin: 0, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>{sub}</p>}
    </div>
  );
}

/* ─── CRUD Modal ─────────────────────────────────────────────────────────────── */
function Modal({ modal, businessType, onClose, onDone }) {
  const { mode, data } = modal;
  const [saving, setSaving] = useState(false);
  const [name,   setName]   = useState(data.label || data.name || '');
  const [catImg, setCatImg] = useState(data.categoryImage || '');
  const [subImg, setSubImg] = useState(data.subCategoryImage || '');
  const [svcImg, setSvcImg] = useState(data.defaultImage || '');

  const isCat = mode.includes('cat');
  const isSub = mode.includes('sub');
  const isSvc = mode.includes('svc');
  const isEdit = mode.startsWith('edit');

  const TITLES = {
    'add-cat':  'Add Category',
    'edit-cat': `Edit — ${data.label || ''}`,
    'add-sub':  `Add Sub-category to "${data.cat}"`,
    'add-svc':  `Add Service to "${data.sub}"`,
    'edit-svc': 'Edit Service',
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (isCat && !isEdit) {
        await api.post('/admin/catalog/entries', { businessType, category: name.trim(), categoryImage: catImg, subCategory: '__placeholder__', name: '__placeholder__', isActive: false, order: 9999 });
        toast.success('Category created');
      } else if (isCat && isEdit) {
        if (name.trim() !== data.label)
          await api.put('/admin/catalog/rename', { businessType, field: 'category', oldValue: data.label, newValue: name.trim() });
        if (catImg !== (data.categoryImage || ''))
          await api.put('/admin/catalog/rename', { businessType, field: 'categoryImage', oldValue: data.categoryImage || '', newValue: catImg, category: name.trim() });
        toast.success('Category updated');
      } else if (isSub) {
        await api.post('/admin/catalog/entries', { businessType, category: data.cat, subCategory: name.trim(), subCategoryImage: subImg, name: '__placeholder__', isActive: false, order: 9999 });
        toast.success('Sub-category created');
      } else if (isSvc && !isEdit) {
        await api.post('/admin/catalog/entries', { businessType, category: data.cat, subCategory: data.sub, name: name.trim(), defaultImage: svcImg });
        toast.success('Service created');
      } else if (isSvc && isEdit) {
        await api.put(`/admin/catalog/entries/${data._id}`, { name: name.trim(), defaultImage: svcImg });
        toast.success('Service updated');
      }
      onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>{TITLES[mode]}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {isCat ? 'Category Name' : isSub ? 'Sub-category Name' : 'Service Name'} *
            </label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter name…" autoFocus />
          </div>
          {isCat && (
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category Image</label>
              <ImgUploadCell value={catImg} onChange={setCatImg} />
            </div>
          )}
          {isSub && (
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Sub-category Image <span style={{ color: '#475569', fontWeight: 400 }}>(circle photo)</span></label>
              <ImgUploadCell value={subImg} onChange={setSubImg} />
            </div>
          )}
          {isSvc && (
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Service Image</label>
              <ImgUploadCell value={svcImg} onChange={setSvcImg} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button style={{ ...S.ghost, padding: '10px 18px', fontSize: 13 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn(), padding: '10px 22px' }} onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <Check size={14} />}
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */
export default function ServiceCatalog() {
  const [activeType,    setActiveType]    = useState('barbershop');
  const [tree,          setTree]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [seeding,       setSeeding]       = useState(false);
  const [seedMenuOpen,  setSeedMenuOpen]  = useState(false);
  const [overwriting,   setOverwriting]   = useState(false);
  const [selCat,        setSelCat]        = useState(null);  // category label
  const [selSub,        setSelSub]        = useState(null);  // subcategory label
  const [modal,         setModal]         = useState(null);
  const [uploading,     setUploading]     = useState({});    // { [label]: true }
  const seedMenuRef = useRef(null);

  const fetchTree = async (bt = activeType) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/catalog/tree?businessType=${bt}`);
      setTree(res.data.data || []);
    } catch { toast.error('Failed to load catalog'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTree(activeType); setSelCat(null); setSelSub(null); }, [activeType]);

  useEffect(() => {
    if (!seedMenuOpen) return;
    const h = (e) => { if (seedMenuRef.current && !seedMenuRef.current.contains(e.target)) setSeedMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [seedMenuOpen]);

  /* ── upload image for a circle ─────────────────────────────────── */
  const uploadCircleImage = async (field, key, file, extra = {}) => {
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const form = new FormData();
      form.append('image', file);
      const res  = await api.post('/admin/catalog/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url  = res.data.data?.url;
      await api.put('/admin/catalog/rename', { businessType: activeType, field, oldValue: '', newValue: url, ...extra });
      toast.success('Photo updated');
      fetchTree(activeType);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  /* ── seed ──────────────────────────────────────────────────────── */
  const handleSeed = async (overwrite = false) => {
    setSeedMenuOpen(false);
    const label = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;
    if (!confirm(`Seed defaults for "${label}"${overwrite ? ' — OVERWRITE existing' : ''}?`)) return;
    setSeeding(true);
    try {
      const res = await api.post('/admin/catalog/seed', { useDefaults: true, overwrite });
      const d = res.data.data;
      toast.success(`Seeded: ${d.inserted} new · ${d.updated || 0} updated · ${d.skipped || 0} skipped`);
      fetchTree(activeType);
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  /* ── overwrite images ──────────────────────────────────────────── */
  const handleOverwrite = async (force = false) => {
    const label = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;
    if (!confirm(`${force ? 'Force overwrite' : 'Set default'} images for "${label}" salons?`)) return;
    setOverwriting(true);
    try {
      const ep = force ? '/admin/catalog/force-overwrite-images' : '/admin/catalog/overwrite-images';
      const res = await api.post(ep, { businessType: activeType });
      toast.success(`Updated ${res.data.updated} salons`);
    } catch { toast.error('Overwrite failed'); }
    finally { setOverwriting(false); }
  };

  /* ── delete ────────────────────────────────────────────────────── */
  const deleteCategory = async (catLabel) => {
    if (!confirm(`Delete category "${catLabel}" and all its services?`)) return;
    try {
      await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel } });
      toast.success('Category deleted');
      if (selCat === catLabel) { setSelCat(null); setSelSub(null); }
      fetchTree(activeType);
    } catch { toast.error('Delete failed'); }
  };

  const deleteSubCategory = async (catLabel, subLabel) => {
    if (!confirm(`Delete sub-category "${subLabel}" and all its services?`)) return;
    try {
      await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel, subCategory: subLabel } });
      toast.success('Sub-category deleted');
      if (selSub === subLabel) setSelSub(null);
      fetchTree(activeType);
    } catch { toast.error('Delete failed'); }
  };

  const deleteService = async (id, name) => {
    if (!confirm(`Delete service "${name}"?`)) return;
    try {
      await api.delete(`/admin/catalog/entries/${id}`);
      toast.success('Service deleted');
      fetchTree(activeType);
    } catch { toast.error('Delete failed'); }
  };

  /* ── derived data ──────────────────────────────────────────────── */
  const selectedCat = tree.find(c => c.label === selCat) || null;
  const subs        = (selectedCat?.sections || []).filter(s => s.label !== '__placeholder__');
  const selectedSub = subs.find(s => s.label === selSub) || null;
  const services    = (selectedSub?.services || []).filter(sv => sv.name !== '__placeholder__');

  const btLabel = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadedown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Service Catalog</h1>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>Master catalog — owners inherit and can customise</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Seed split button */}
          <div style={{ position: 'relative' }} ref={seedMenuRef}>
            <div style={{ display: 'flex' }}>
              <button onClick={() => handleSeed(false)} disabled={seeding}
                style={{ ...S.ghost, padding: '8px 13px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', borderRadius: '8px 0 0 8px', borderRight: 'none' }}>
                {seeding ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <Database size={13} />} Seed
              </button>
              <button onClick={() => setSeedMenuOpen(v => !v)} disabled={seeding}
                style={{ ...S.ghost, padding: '8px 9px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', borderRadius: '0 8px 8px 0' }}>
                <ChevronRight size={12} style={{ transform: seedMenuOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              </button>
            </div>
            {seedMenuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {[
                  { label: 'Keep existing', sub: 'Adds missing entries only', ow: false, color: '#e2e8f0' },
                  { label: 'Overwrite existing', sub: 'Updates all with defaults', ow: true, color: '#fca5a5' },
                ].map(opt => (
                  <button key={opt.label} onClick={() => handleSeed(opt.ow)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: opt.color, fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Database size={13} color={opt.ow ? '#f87171' : '#a78bfa'} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Seed — {opt.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{opt.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => handleOverwrite(false)} disabled={overwriting}
            style={{ ...S.ghost, padding: '8px 13px', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>
            {overwriting ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <ImageIcon size={13} />} Set images
          </button>
          <button onClick={() => handleOverwrite(true)} disabled={overwriting}
            style={{ ...S.ghost, padding: '8px 13px', color: '#fb923c', borderColor: 'rgba(251,146,60,0.3)' }}>
            {overwriting ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <ImageIcon size={13} />} Force images
          </button>
          <button style={{ ...S.btn(), padding: '8px 14px' }}
            onClick={() => setModal({ mode: 'add-cat', data: {} })}>
            <Plus size={13} /> Add Category
          </button>
        </div>
      </div>

      {/* ── Business type pills ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {BUSINESS_TYPES.map(bt => {
          const active = activeType === bt.value;
          return (
            <button key={bt.value} onClick={() => setActiveType(bt.value)}
              style={{
                padding: '9px 20px', borderRadius: 999, border: '1.5px solid',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                borderColor: active ? '#6366f1' : 'rgba(255,255,255,0.1)',
                background:  active ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.04)',
                color:       active ? '#fff' : '#94a3b8',
                boxShadow:   active ? '0 4px 18px rgba(99,102,241,0.4)' : 'none',
                transform:   active ? 'translateY(-1px)' : 'none',
              }}>
              {bt.emoji} {bt.label}
            </button>
          );
        })}
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <RefreshCw size={24} color="#6366f1" style={{ animation: 'spin .7s linear infinite' }} />
          </div>
        : (
        <div style={{ animation: 'fadedown .25s ease both' }}>

          {/* ── LEVEL 0: Categories ──────────────────────────────────── */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 20px', marginBottom: 0 }}>
            <SectionHeader
              label="Categories"
              sub={`${tree.length} categories · ${btLabel}`}
              actions={
                <button style={{ ...S.btn(), padding: '7px 13px', fontSize: 12 }}
                  onClick={() => setModal({ mode: 'add-cat', data: {} })}>
                  <Plus size={12} /> Add
                </button>
              }
            />
            {!tree.length
              ? <Empty label="No categories yet" sub='Click "Seed" to import the built-in catalog, or "Add Category".' />
              : <CircleRow>
                  {/* All button */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '0 10px', flexShrink: 0, cursor: 'pointer', opacity: !selCat ? 1 : 0.65, transition: 'opacity .18s' }}
                    onClick={() => { setSelCat(null); setSelSub(null); }}>
                    <div style={{ width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: !selCat ? 'linear-gradient(145deg,#818cf8,#6366f1,#4f46e5)' : 'rgba(26,26,46,0.9)', boxShadow: !selCat ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28)' : '0 0 0 1.5px rgba(255,255,255,0.09)', transition: 'all .22s' }}>
                      <LayoutGrid size={20} color="#fff" />
                    </div>
                    <div style={{ width: 20, height: 3, borderRadius: 999, marginTop: 6, background: !selCat ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent', transition: 'all .22s' }} />
                    <span style={{ fontSize: 11, fontWeight: !selCat ? 700 : 500, color: !selCat ? '#fff' : '#94a3b8', marginTop: 4 }}>All</span>
                  </div>

                  {tree.map(cat => (
                    <AdminCircle
                      key={cat.label}
                      label={cat.label}
                      imgSrc={cat.categoryImage}
                      isSelected={selCat === cat.label}
                      uploading={!!uploading[cat.label]}
                      onClick={() => { setSelCat(cat.label); setSelSub(null); }}
                      onUpload={f => uploadCircleImage('categoryImage', cat.label, f, { category: cat.label })}
                      onEdit={() => setModal({ mode: 'edit-cat', data: cat })}
                      onDelete={() => deleteCategory(cat.label)}
                    />
                  ))}
                </CircleRow>
            }
          </div>

          {/* ── LEVEL 1: Subcategories (shown when cat selected) ─────── */}
          {selCat && selectedCat && (
            <>
              <TreeBranch from={selCat} to="Subcategories" count={subs.length} />

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 20px', animation: 'fadedown .2s ease both' }}>
                <SectionHeader
                  label="Subcategories"
                  sub={`inside ${selCat}`}
                  actions={
                    <button style={{ ...S.btn(), padding: '7px 13px', fontSize: 12 }}
                      onClick={() => setModal({ mode: 'add-sub', data: { cat: selCat } })}>
                      <Plus size={12} /> Add
                    </button>
                  }
                />
                {!subs.length
                  ? <Empty label="No sub-categories" sub="Add sub-categories to group services within this category." />
                  : <CircleRow>
                      {/* All subcategories */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '0 10px', flexShrink: 0, cursor: 'pointer', opacity: !selSub ? 1 : 0.65, transition: 'opacity .18s' }}
                        onClick={() => setSelSub(null)}>
                        <div style={{ width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: !selSub ? 'transparent' : 'rgba(26,26,46,0.9)', boxShadow: !selSub ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28)' : '0 0 0 1.5px rgba(255,255,255,0.09)', transition: 'all .22s' }}>
                          {selectedCat.categoryImage
                            ? <img src={selectedCat.categoryImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (() => { const Icon = getCatIcon(selCat); return <Icon size={20} color={!selSub ? '#fff' : '#6366f1'} />; })()}
                        </div>
                        <div style={{ width: 20, height: 3, borderRadius: 999, marginTop: 6, background: !selSub ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent', transition: 'all .22s' }} />
                        <span style={{ fontSize: 11, fontWeight: !selSub ? 700 : 500, color: !selSub ? '#fff' : '#94a3b8', marginTop: 4 }}>All</span>
                      </div>

                      {subs.map(sec => (
                        <AdminCircle
                          key={sec.label}
                          label={sec.label}
                          imgSrc={sec.subCategoryImage}
                          isSelected={selSub === sec.label}
                          uploading={!!uploading[`sub::${sec.label}`]}
                          onClick={() => setSelSub(sec.label)}
                          onUpload={f => uploadCircleImage('subCategoryImage', `sub::${sec.label}`, f, { category: selCat, subCategory: sec.label })}
                          onDelete={() => deleteSubCategory(selCat, sec.label)}
                        />
                      ))}
                    </CircleRow>
                }
              </div>
            </>
          )}

          {/* ── LEVEL 2: Services (shown when sub selected) ──────────── */}
          {selSub && selectedSub && (
            <>
              <TreeBranch from={selSub} to="Services" count={services.length} />

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '16px 20px', animation: 'fadedown .2s ease both' }}>
                <SectionHeader
                  label="Services"
                  sub={`inside ${selSub}`}
                  actions={
                    <button style={{ ...S.btn(), padding: '7px 13px', fontSize: 12 }}
                      onClick={() => setModal({ mode: 'add-svc', data: { cat: selCat, sub: selSub } })}>
                      <Plus size={12} /> Add Service
                    </button>
                  }
                />
                {!services.length
                  ? <Empty label="No services yet" sub="Add services to this sub-category." />
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
                      {services.map(svc => (
                        <SvcCard key={svc._id || svc.name} svc={svc}
                          onEdit={s => setModal({ mode: 'edit-svc', data: { ...s, cat: selCat, sub: selSub } })}
                          onDelete={deleteService} />
                      ))}
                    </div>
                }
              </div>
            </>
          )}

          {/* ── Show all categories summary when none selected ───────── */}
          {!selCat && tree.length > 0 && (
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {tree.map(cat => {
                const catSubs = (cat.sections || []).filter(s => s.label !== '__placeholder__');
                const svcCount = catSubs.reduce((n, s) => n + (s.services?.filter(sv => sv.name !== '__placeholder__').length || 0), 0);
                return (
                  <div key={cat.label}
                    onClick={() => { setSelCat(cat.label); setSelSub(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: cat.categoryImage ? '#111' : 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1.5px rgba(99,102,241,0.3)' }}>
                      {cat.categoryImage
                        ? <img src={cat.categoryImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (() => { const Icon = getCatIcon(cat.label); return <Icon size={16} color="#6366f1" />; })()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{catSubs.length} subs · {svcCount} services</div>
                    </div>
                    <ChevronRight size={14} color="#6366f1" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal modal={modal} businessType={activeType}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); fetchTree(activeType); }} />
      )}
    </div>
  );
}
