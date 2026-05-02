import { useEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, RefreshCw, ChevronDown, ChevronRight,
  Layers, ImageIcon, Database, Camera, Scissors, User, Sparkles, Droplets,
  Leaf, Star, Palette, Baby, Home, Zap, Activity, Stethoscope, Heart, Tag,
  FolderOpen, FolderClosed, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

/* ── icon map ────────────────────────────────────────────────────────────────── */
const ICON_MAP = {
  'Hair Services': Scissors, 'Hair Services (Men)': Scissors, 'Hair Services (Women)': Scissors,
  'Beard & Grooming': User,
  'Nail Services': Sparkles,
  'Skin & Face': Droplets, 'Skin & Beauty': Droplets, 'Skin & Face (Men Grooming)': Droplets,
  'Skin Dermatology': Stethoscope, 'Men Dermatology': Stethoscope,
  'Spa & Massage': Leaf, 'Spa & Relaxation': Leaf, 'Spa & Wellness': Leaf,
  'Body Grooming': Activity,
  'Bridal & Events': Star, 'Bridal Makeup': Star,
  'Makeup & Styling': Palette, 'Makeup': Palette, 'Hair Coloring & Highlights': Palette,
  'Kids Services': Baby, 'At-Home Services': Home,
  'Advanced Hair Treatments': Zap, 'Advanced Skin Treatments': Zap,
  'Wellness & Therapy': Heart,
};
const getCatIcon = (label) => ICON_MAP[label] || Tag;

const BUSINESS_TYPES = [
  { value: 'barbershop',    label: 'Barbershop',     icon: Scissors },
  { value: 'salon',         label: 'Salon',           icon: Sparkles },
  { value: 'spa_wellness',  label: 'Spa & Wellness',  icon: Leaf     },
  { value: 'makeup_bridal', label: 'Makeup & Bridal', icon: Star     },
  { value: 'skin_derma',    label: 'Skin & Derma',    icon: Droplets },
];

/* ── style tokens ────────────────────────────────────────────────────────────── */
const S = {
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '8px 12px', color: '#f1f5f9', fontSize: 13,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  btn: (c = '#6366f1') => ({
    background: c, border: 'none', borderRadius: 10, padding: '8px 16px',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  }),
  ghost: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 7, padding: '4px 10px', color: '#94a3b8', fontSize: 11,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 7, padding: '4px 8px', color: '#f87171', fontSize: 11,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  },
};

/* ── branch colour ───────────────────────────────────────────────────────────── */
const BRANCH = 'rgba(99,102,241,0.28)';
const BRANCH_STRONG = 'rgba(99,102,241,0.55)';

/* ── inline image upload ─────────────────────────────────────────────────────── */
function ImgUploadCell({ value, onChange }) {
  const ref = useRef();
  const [up, setUp] = useState(false);
  const [prev, setPrev] = useState(value || '');
  const pick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUp(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const r = await api.post('/admin/catalog/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data.data?.url; setPrev(url); onChange(url);
    } catch { toast.error('Upload failed'); }
    finally { setUp(false); e.target.value = ''; }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {prev
        ? <img src={prev} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }} />
        : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ImageIcon size={15} color="#475569" />
          </div>}
      <button style={S.ghost} onClick={() => ref.current?.click()} disabled={up}>
        {up ? <RefreshCw size={11} style={{ animation: 'spin .7s linear infinite' }} /> : <Camera size={11} />}
        {prev ? 'Change' : 'Upload'}
      </button>
      {prev && <button style={{ ...S.ghost, padding: '4px 7px' }} onClick={() => { setPrev(''); onChange(''); }}><X size={11} /></button>}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
    </div>
  );
}

/* ── circle thumbnail (small, tree-sized) ────────────────────────────────────── */
function NodeCircle({ label, imgSrc, size = 34, selected }) {
  const [broken, setBroken] = useState(false);
  const Icon = getCatIcon(label);
  const showImg = !!imgSrc && !broken;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: showImg ? '#111' : selected
        ? 'linear-gradient(145deg,#818cf8,#6366f1,#4f46e5)'
        : 'rgba(26,26,48,0.95)',
      boxShadow: selected
        ? '0 0 0 2px #818cf8, 0 0 0 4px rgba(99,102,241,0.25), 0 4px 16px rgba(99,102,241,0.4)'
        : '0 0 0 1.5px rgba(255,255,255,0.08)',
      transition: 'all .2s',
    }}>
      {showImg
        ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setBroken(true)} />
        : <Icon size={size * 0.42} color={selected ? '#fff' : '#6366f1'} />}
    </div>
  );
}

/* ── service thumbnail ───────────────────────────────────────────────────────── */
function SvcThumb({ imgSrc }) {
  const [broken, setBroken] = useState(false);
  return (
    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}>
      {imgSrc && !broken
        ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setBroken(true)} />
        : <Layers size={14} color="rgba(99,102,241,0.4)" />}
    </div>
  );
}

/* ── expand toggle ───────────────────────────────────────────────────────────── */
function Chevron({ open, onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', flexShrink: 0, borderRadius: 4 }}>
      {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
    </button>
  );
}

/* ── badge ───────────────────────────────────────────────────────────────────── */
function Badge({ n, color = '#6366f1' }) {
  if (!n) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: `${color}1a`, color, border: `1px solid ${color}33`, borderRadius: 999, padding: '1px 7px', flexShrink: 0 }}>{n}</span>
  );
}

/* ── "add" row ───────────────────────────────────────────────────────────────── */
function AddRow({ label, onClick, indent = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: indent ? '2px 0' : '4px 0' }}>
      {/* Connector */}
      <div style={{ width: 28, height: 2, background: hov ? BRANCH_STRONG : BRANCH, flexShrink: 0, transition: 'background .15s' }} />
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: hov ? '#6366f1' : BRANCH, flexShrink: 0, margin: '0 -3.5px', zIndex: 1, transition: 'background .15s' }} />
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? 'rgba(99,102,241,0.1)' : 'transparent',
          border: `1px dashed ${hov ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, padding: '4px 12px', color: hov ? '#818cf8' : '#475569',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 5, marginLeft: 10, transition: 'all .15s',
        }}>
        <Plus size={10} /> {label}
      </button>
    </div>
  );
}

/* ── CRUD modal ──────────────────────────────────────────────────────────────── */
function Modal({ modal, businessType, onClose, onDone }) {
  const { mode, data } = modal;
  const [saving, setSaving] = useState(false);
  const [name,   setName]   = useState(data.label || data.name || '');
  const [catImg, setCatImg] = useState(data.categoryImage || '');
  const [subImg, setSubImg] = useState(data.subCategoryImage || '');
  const [svcImg, setSvcImg] = useState(data.defaultImage || '');

  const isCat  = mode.includes('cat');
  const isSub  = mode.includes('sub');
  const isSvc  = mode.includes('svc');
  const isEdit = mode.startsWith('edit');

  const TITLES = {
    'add-cat': 'Add Category', 'edit-cat': `Edit — ${data.label || ''}`,
    'add-sub': `Add Sub-category in "${data.cat}"`,
    'add-svc': `Add Service in "${data.sub}"`, 'edit-svc': 'Edit Service',
  };

  const save = async () => {
    if (!name.trim()) return toast.error('Name required');
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
      <div style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#f1f5f9', fontSize: 15 }}>{TITLES[mode]}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={17} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {isCat ? 'Category Name' : isSub ? 'Sub-category Name' : 'Service Name'} *
            </label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter name…" autoFocus />
          </div>
          {isCat && <div><label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category Image</label><ImgUploadCell value={catImg} onChange={setCatImg} /></div>}
          {isSub && <div><label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Circle Photo</label><ImgUploadCell value={subImg} onChange={setSubImg} /></div>}
          {isSvc && <div><label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Service Image</label><ImgUploadCell value={svcImg} onChange={setSvcImg} /></div>}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button style={{ ...S.ghost, padding: '9px 16px', fontSize: 12 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn(), padding: '9px 20px', fontSize: 13 }} onClick={save} disabled={saving}>
            {saving ? <RefreshCw size={13} style={{ animation: 'spin .7s linear infinite' }} /> : <Check size={13} />}
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TREE NODES
═══════════════════════════════════════════════════════════════════════════════ */

/* ── Service row (leaf) ──────────────────────────────────────────────────────── */
function ServiceRow({ svc, onEdit, onDelete, isLast }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '3px 0', position: 'relative' }}>
      {/* Horizontal branch */}
      <div style={{ width: 28, height: 2, background: hov ? BRANCH_STRONG : BRANCH, flexShrink: 0, transition: 'background .15s' }} />
      {/* Leaf dot */}
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: hov ? '#6366f1' : 'rgba(99,102,241,0.45)', flexShrink: 0, margin: '0 -3px', zIndex: 1, transition: 'background .15s' }} />
      {/* Row content */}
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10, marginLeft: 10,
          padding: '6px 10px', borderRadius: 10, transition: 'background .15s',
          background: hov ? 'rgba(99,102,241,0.06)' : 'transparent',
        }}>
        <SvcThumb imgSrc={svc.defaultImage} />
        <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, flex: 1 }}>{svc.name}</span>
        {hov && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', animation: 'fadeIn .1s ease' }}>
            <button style={S.ghost} onClick={() => onEdit(svc)}><Pencil size={10} /> Edit</button>
            <button style={S.danger} onClick={() => onDelete(svc._id, svc.name)}><Trash2 size={10} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Subcategory node ────────────────────────────────────────────────────────── */
function SubNode({ sec, catLabel, businessType, onDelete, onAddSvc, onEditSvc, onDeleteSvc, onUpload, uploading }) {
  const [open, setOpen] = useState(true);
  const [hov,  setHov]  = useState(false);
  const services = (sec.services || []).filter(s => s.name !== '__placeholder__');

  return (
    <div style={{ padding: '2px 0' }}>
      {/* Sub row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* Branch horizontal */}
        <div style={{ width: 28, height: 2, background: hov ? BRANCH_STRONG : BRANCH, flexShrink: 0, transition: 'background .15s' }} />
        {/* Junction dot */}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: hov ? '#6366f1' : BRANCH_STRONG, flexShrink: 0, margin: '0 -4px', zIndex: 1, transition: 'background .15s' }} />

        <div
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10, padding: '6px 10px', borderRadius: 10, transition: 'background .15s', background: hov ? 'rgba(99,102,241,0.07)' : 'transparent' }}>
          <Chevron open={open} onClick={() => setOpen(v => !v)} />
          {/* Inline photo upload on circle click */}
          <InlineCircleUpload
            label={sec.label} imgSrc={sec.subCategoryImage}
            size={32} uploading={uploading}
            onUpload={onUpload}
          />
          <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, flex: 1 }}>{sec.label}</span>
          <Badge n={services.length} color="#8b5cf6" />
          {hov && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', animation: 'fadeIn .1s ease' }}>
              <button style={S.ghost} onClick={() => onAddSvc(catLabel, sec.label)}><Plus size={10} /> Service</button>
              <button style={S.danger} onClick={() => onDelete(catLabel, sec.label)}><Trash2 size={10} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Children: services */}
      {open && (
        <div style={{ marginLeft: 62, borderLeft: `2px solid ${BRANCH}`, paddingLeft: 0 }}>
          {services.map((svc, i) => (
            <ServiceRow key={svc._id || svc.name} svc={svc} isLast={i === services.length - 1}
              onEdit={onEditSvc} onDelete={onDeleteSvc} />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '3px 0' }}>
            <div style={{ width: 28, height: 2, background: BRANCH, flexShrink: 0 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: BRANCH, flexShrink: 0, margin: '0 -3px' }} />
            <div style={{ marginLeft: 10 }}>
              <AddRow label="Add Service" onClick={() => onAddSvc(catLabel, sec.label)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline circle upload (click circle → file picker) ───────────────────────── */
function InlineCircleUpload({ label, imgSrc, size, uploading, onUpload }) {
  const [broken, setBroken] = useState(false);
  const [hov,    setHov]    = useState(false);
  const ref  = useRef(null);
  const Icon = getCatIcon(label);
  const showImg = !!imgSrc && !broken;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {/* Circle */}
      <div
        onClick={() => ref.current?.click()}
        title="Click to change photo"
        style={{
          width: size, height: size, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showImg ? '#111' : 'rgba(26,26,48,0.95)',
          boxShadow: '0 0 0 1.5px rgba(255,255,255,0.1)',
          transition: 'box-shadow .15s',
          ...(hov ? { boxShadow: '0 0 0 2px #6366f1' } : {}),
        }}>
        {uploading
          ? <RefreshCw size={size * 0.35} color="#6366f1" style={{ animation: 'spin .7s linear infinite' }} />
          : showImg
          ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setBroken(true)} />
          : <Icon size={size * 0.42} color="#6366f1" />}
        {/* Hover overlay */}
        {hov && !uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            <Camera size={size * 0.35} color="#fff" />
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
    </div>
  );
}

/* ── Category node ───────────────────────────────────────────────────────────── */
function CatNode({ cat, businessType, onEdit, onDelete, onAddSub, onAddSvc, onEditSvc, onDeleteSvc, onUploadSub, onUploadCat, uploadingMap }) {
  const [open, setOpen] = useState(true);
  const [hov,  setHov]  = useState(false);
  const subs = (cat.sections || []).filter(s => s.label !== '__placeholder__');

  return (
    <div style={{ marginBottom: 6 }}>
      {/* Category row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* Junction dot (root level — no horizontal branch, just the dot) */}
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: hov ? '#6366f1' : BRANCH_STRONG, flexShrink: 0, border: `2px solid rgba(6,8,20,1)`, boxShadow: `0 0 0 2px ${BRANCH_STRONG}`, transition: 'background .15s' }} />

        <div
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, marginLeft: 12, padding: '7px 12px', borderRadius: 12, transition: 'background .15s', background: hov ? 'rgba(99,102,241,0.09)' : 'rgba(255,255,255,0.03)', border: `1px solid ${hov ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
          <Chevron open={open} onClick={() => setOpen(v => !v)} />
          {/* Category circle — click to upload */}
          <InlineCircleUpload
            label={cat.label} imgSrc={cat.categoryImage}
            size={38} uploading={!!uploadingMap[cat.label]}
            onUpload={f => onUploadCat(cat.label, f)}
          />
          <span style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 800, flex: 1 }}>{cat.label}</span>
          <Badge n={subs.length} color="#6366f1" />
          {hov && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', animation: 'fadeIn .1s ease' }}>
              <button style={S.ghost} onClick={() => onEdit(cat)}><Pencil size={10} /> Rename</button>
              <button style={S.ghost} onClick={() => onAddSub(cat.label)}><Plus size={10} /> Sub</button>
              <button style={S.danger} onClick={() => onDelete(cat.label)}><Trash2 size={10} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Children: subcategories */}
      {open && (
        <div style={{ marginLeft: 18, borderLeft: `2px solid ${BRANCH}`, paddingLeft: 0, marginTop: 2 }}>
          {subs.map(sec => (
            <SubNode
              key={sec.label}
              sec={sec}
              catLabel={cat.label}
              businessType={businessType}
              onDelete={onDeleteSvc ? (c, s) => onDeleteSvc(c, s) : () => {}}
              onAddSvc={onAddSvc}
              onEditSvc={onEditSvc}
              onDeleteSvc={onDeleteSvc}
              onUpload={f => onUploadSub(cat.label, sec.label, f)}
              uploading={!!uploadingMap[`sub::${cat.label}::${sec.label}`]}
            />
          ))}
          {/* Add sub-category row */}
          <div style={{ paddingLeft: 0, margin: '4px 0 6px 0' }}>
            <AddRow label="Add Sub-category" onClick={() => onAddSub(cat.label)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════════ */
export default function ServiceCatalog() {
  const [activeType,   setActiveType]   = useState('barbershop');
  const [tree,         setTree]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [seeding,      setSeeding]      = useState(false);
  const [seedOpen,     setSeedOpen]     = useState(false);
  const [overwriting,  setOverwriting]  = useState(false);
  const [modal,        setModal]        = useState(null);
  const [uploading,    setUploading]    = useState({});
  const seedRef = useRef(null);

  const fetchTree = async (bt = activeType) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/catalog/tree?businessType=${bt}`);
      setTree(r.data.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTree(activeType); }, [activeType]);

  useEffect(() => {
    if (!seedOpen) return;
    const h = (e) => { if (seedRef.current && !seedRef.current.contains(e.target)) setSeedOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [seedOpen]);

  /* ── image upload ─────────────────────────────────────────────── */
  const uploadImg = async (key, field, file, extra = {}) => {
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const fd = new FormData(); fd.append('image', file);
      const r = await api.post('/admin/catalog/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.put('/admin/catalog/rename', { businessType: activeType, field, oldValue: '', newValue: r.data.data?.url, ...extra });
      toast.success('Photo updated');
      fetchTree(activeType);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  const uploadCat = (catLabel, file) => uploadImg(catLabel, 'categoryImage', file, { category: catLabel });
  const uploadSub = (catLabel, subLabel, file) => uploadImg(`sub::${catLabel}::${subLabel}`, 'subCategoryImage', file, { category: catLabel, subCategory: subLabel });

  /* ── seed ─────────────────────────────────────────────────────── */
  const handleSeed = async (overwrite = false) => {
    setSeedOpen(false);
    const lbl = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;
    if (!confirm(`Seed defaults for "${lbl}"${overwrite ? ' — OVERWRITE existing' : ''}?`)) return;
    setSeeding(true);
    try {
      const r = await api.post('/admin/catalog/seed', { useDefaults: true, overwrite });
      const d = r.data.data;
      toast.success(`Seeded: ${d.inserted} new · ${d.updated || 0} updated · ${d.skipped || 0} skipped`);
      fetchTree(activeType);
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  /* ── overwrite images ─────────────────────────────────────────── */
  const handleOverwrite = async (force = false) => {
    const lbl = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;
    if (!confirm(`${force ? 'Force overwrite' : 'Set default'} images for "${lbl}" salons?`)) return;
    setOverwriting(true);
    try {
      const r = await api.post(force ? '/admin/catalog/force-overwrite-images' : '/admin/catalog/overwrite-images', { businessType: activeType });
      toast.success(`Updated ${r.data.updated} salons`);
    } catch { toast.error('Failed'); }
    finally { setOverwriting(false); }
  };

  /* ── delete ───────────────────────────────────────────────────── */
  const deleteCat = async (catLabel) => {
    if (!confirm(`Delete category "${catLabel}" and all its contents?`)) return;
    try {
      await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel } });
      toast.success('Deleted'); fetchTree(activeType);
    } catch { toast.error('Delete failed'); }
  };

  const deleteSub = async (catLabel, subLabel) => {
    if (!confirm(`Delete sub-category "${subLabel}" and all its services?`)) return;
    try {
      await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel, subCategory: subLabel } });
      toast.success('Deleted'); fetchTree(activeType);
    } catch { toast.error('Delete failed'); }
  };

  const deleteSvc = async (id, name) => {
    if (!confirm(`Delete service "${name}"?`)) return;
    try {
      await api.delete(`/admin/catalog/entries/${id}`);
      toast.success('Deleted'); fetchTree(activeType);
    } catch { toast.error('Delete failed'); }
  };

  /* ── modal openers ────────────────────────────────────────────── */
  const openAddSub = (cat)       => setModal({ mode: 'add-sub', data: { cat } });
  const openAddSvc = (cat, sub)  => setModal({ mode: 'add-svc', data: { cat, sub } });
  const openEditSvc = (svc, cat, sub) => setModal({ mode: 'edit-svc', data: { ...svc, cat, sub } });

  const BT = BUSINESS_TYPES.find(b => b.value === activeType);

  /* ── stats ────────────────────────────────────────────────────── */
  const totalSubs = tree.reduce((n, c) => n + (c.sections || []).filter(s => s.label !== '__placeholder__').length, 0);
  const totalSvcs = tree.reduce((n, c) => n + (c.sections || []).reduce((m, s) => m + (s.services || []).filter(sv => sv.name !== '__placeholder__').length, 0), 0);

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Service Catalog</h1>
          <p style={{ fontSize: 13, color: '#475569', margin: '4px 0 0' }}>Master catalog — owners inherit and can customise</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Seed split button */}
          <div style={{ position: 'relative' }} ref={seedRef}>
            <div style={{ display: 'flex' }}>
              <button onClick={() => handleSeed(false)} disabled={seeding}
                style={{ ...S.ghost, padding: '8px 12px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', borderRadius: '8px 0 0 8px', borderRight: 'none', fontSize: 12 }}>
                {seeding ? <RefreshCw size={12} style={{ animation: 'spin .7s linear infinite' }} /> : <Database size={12} />} Seed
              </button>
              <button onClick={() => setSeedOpen(v => !v)} disabled={seeding}
                style={{ ...S.ghost, padding: '8px 8px', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', borderRadius: '0 8px 8px 0' }}>
                <ChevronDown size={11} style={{ transform: seedOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>
            </div>
            {seedOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', minWidth: 210, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {[{ label: 'Keep existing', sub: 'Adds missing entries only', ow: false }, { label: 'Overwrite all', sub: 'Updates all with defaults', ow: true }].map(o => (
                  <button key={o.label} onClick={() => handleSeed(o.ow)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: o.ow ? '#fca5a5' : '#e2e8f0', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <Database size={12} color={o.ow ? '#f87171' : '#a78bfa'} style={{ marginTop: 2 }} />
                    <div><div style={{ fontWeight: 600 }}>Seed — {o.label}</div><div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{o.sub}</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => handleOverwrite(false)} disabled={overwriting}
            style={{ ...S.ghost, padding: '8px 12px', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)', fontSize: 12 }}>
            {overwriting ? <RefreshCw size={12} style={{ animation: 'spin .7s linear infinite' }} /> : <ImageIcon size={12} />} Set images
          </button>
          <button onClick={() => handleOverwrite(true)} disabled={overwriting}
            style={{ ...S.ghost, padding: '8px 12px', color: '#fb923c', borderColor: 'rgba(251,146,60,0.3)', fontSize: 12 }}>
            {overwriting ? <RefreshCw size={12} style={{ animation: 'spin .7s linear infinite' }} /> : <ImageIcon size={12} />} Force images
          </button>
          <button style={{ ...S.btn(), padding: '8px 14px', fontSize: 12 }} onClick={() => setModal({ mode: 'add-cat', data: {} })}>
            <Plus size={12} /> Add Category
          </button>
        </div>
      </div>

      {/* ── Business type pills (round) ─────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {BUSINESS_TYPES.map(bt => {
          const active = activeType === bt.value;
          const Icon = bt.icon;
          return (
            <button key={bt.value} onClick={() => setActiveType(bt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 999, border: '1.5px solid',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                borderColor: active ? '#6366f1' : 'rgba(255,255,255,0.1)',
                background:  active ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.04)',
                color:       active ? '#fff' : '#64748b',
                boxShadow:   active ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
                transform:   active ? 'translateY(-1px)' : 'none',
              }}>
              <Icon size={13} />
              {bt.label}
            </button>
          );
        })}
      </div>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Categories',    n: tree.length,  color: '#6366f1' },
          { label: 'Sub-categories', n: totalSubs,   color: '#8b5cf6' },
          { label: 'Services',      n: totalSvcs,    color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${s.color}22`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.n}</span>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tree ────────────────────────────────────────────────── */}
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><RefreshCw size={22} color="#6366f1" style={{ animation: 'spin .7s linear infinite' }} /></div>
        : (
        <div style={{ animation: 'slideDown .25s ease both' }}>
          {/* Tree root panel */}
          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '20px 20px 16px' }}>
            {/* Root node (business type) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {BT && <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px rgba(99,102,241,0.25)' }}><BT.icon size={16} color="#fff" /></div>}
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>{BT?.label}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>root · {tree.length} categories</div>
              </div>
            </div>

            {/* Category nodes */}
            {!tree.length
              ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <FolderOpen size={32} color="#1e293b" style={{ marginBottom: 10 }} />
                  <p style={{ color: '#475569', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>No categories yet</p>
                  <p style={{ color: '#334155', fontSize: 12, margin: '0 0 16px' }}>Seed the catalog or add categories manually.</p>
                </div>
              )
              : (
                <div style={{ paddingLeft: 6 }}>
                  {tree.map((cat, ci) => (
                    <CatNode
                      key={cat.label}
                      cat={cat}
                      businessType={activeType}
                      onEdit={c => setModal({ mode: 'edit-cat', data: c })}
                      onDelete={deleteCat}
                      onAddSub={openAddSub}
                      onAddSvc={openAddSvc}
                      onEditSvc={(svc) => {
                        const catLabel = cat.label;
                        const sub = (cat.sections || []).find(s => s.services?.some(sv => sv._id === svc._id));
                        openEditSvc(svc, catLabel, sub?.label || '');
                      }}
                      onDeleteSvc={deleteSvc}
                      onUploadCat={uploadCat}
                      onUploadSub={uploadSub}
                      uploadingMap={uploading}
                    />
                  ))}
                </div>
              )
            }

            {/* Add category */}
            <div style={{ marginTop: 8, paddingLeft: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: BRANCH, flexShrink: 0, border: '2px solid rgba(6,8,20,1)' }} />
                <div style={{ marginLeft: 12 }}>
                  <button
                    onClick={() => setModal({ mode: 'add-cat', data: {} })}
                    style={{
                      background: 'transparent', border: '1px dashed rgba(255,255,255,0.12)',
                      borderRadius: 10, padding: '6px 16px', color: '#475569', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#818cf8'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#475569'; }}>
                    <Plus size={11} /> Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
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
