import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, Check, X, RefreshCw, ChevronDown,
  Layers, Database, Camera, Scissors, User, Sparkles, Droplets,
  Leaf, Star, Palette, Baby, Home, Zap, Activity, Stethoscope,
  Heart, Tag, LayoutGrid, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

/* ─── icon map ───────────────────────────────────────────────────────────────── */
const ICON_MAP = {
  'Hair Services': Scissors, 'Hair Services (Men)': Scissors, 'Hair Services (Women)': Scissors,
  'Beard & Grooming': User, 'Nail Services': Sparkles,
  'Skin & Face': Droplets, 'Skin & Beauty': Droplets, 'Skin & Face (Men Grooming)': Droplets,
  'Skin Dermatology': Stethoscope, 'Men Dermatology': Stethoscope,
  'Spa & Massage': Leaf, 'Spa & Relaxation': Leaf, 'Spa & Wellness': Leaf,
  'Body Grooming': Activity, 'Bridal & Events': Star, 'Bridal Makeup': Star,
  'Makeup & Styling': Palette, 'Makeup': Palette, 'Hair Coloring & Highlights': Palette,
  'Kids Services': Baby, 'At-Home Services': Home,
  'Advanced Hair Treatments': Zap, 'Advanced Skin Treatments': Zap,
  'Wellness & Therapy': Heart,
};
const getIcon = (label) => ICON_MAP[label] || Tag;

const BIZ_TYPES = [
  { value: 'barbershop',    label: 'Barbershop',     Icon: Scissors  },
  { value: 'salon',         label: 'Salon',           Icon: Sparkles  },
  { value: 'spa_wellness',  label: 'Spa & Wellness',  Icon: Leaf      },
  { value: 'makeup_bridal', label: 'Makeup & Bridal', Icon: Star      },
  { value: 'skin_derma',    label: 'Skin & Derma',    Icon: Droplets  },
];

/* ─── style tokens ───────────────────────────────────────────────────────────── */
const S = {
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn:  (c='#6366f1') => ({ background:c, border:'none', borderRadius:10, padding:'8px 16px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }),
  ghost: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'5px 11px', color:'#94a3b8', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap' },
  danger: { background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, padding:'5px 8px', color:'#f87171', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:4 },
};

/* ─── image upload cell (used in modal) ──────────────────────────────────────── */
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
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      {prev
        ? <img src={prev} alt="" style={{ width:44, height:44, borderRadius:8, objectFit:'cover', border:'1px solid rgba(255,255,255,0.12)', flexShrink:0 }} />
        : <div style={{ width:44, height:44, borderRadius:8, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><ImageIcon size={15} color="#475569" /></div>}
      <button style={S.ghost} onClick={() => ref.current?.click()} disabled={up}>
        {up ? <RefreshCw size={11} style={{ animation:'spin .7s linear infinite' }} /> : <Camera size={11} />}
        {prev ? 'Change' : 'Upload'}
      </button>
      {prev && <button style={{ ...S.ghost, padding:'5px 7px' }} onClick={() => { setPrev(''); onChange(''); }}><X size={11} /></button>}
      <input ref={ref} type="file" accept="image/*" style={{ display:'none' }} onChange={pick} />
    </div>
  );
}

/* ─── owner-style circle button with admin badges ────────────────────────────── */
const AdminCircle = ({ label, imgSrc, isSelected, onClick, onUpload, onEdit, onDelete, uploading, circleRef }) => {
  const [hov,    setHov]    = useState(false);
  const [broken, setBroken] = useState(false);
  const fileRef = useRef(null);
  const Icon    = getIcon(label);
  const showImg = !!imgSrc && !broken;

  return (
    <div
      ref={circleRef}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:0,
        padding:'0 10px', flexShrink:0, cursor:'pointer', userSelect:'none', overflow:'visible',
        opacity: isSelected || hov ? 1 : 0.65,
        transform: isSelected ? 'translateY(-7px) scale(1.07)' : hov ? 'scale(1.04)' : 'scale(1)',
        transition:'transform .22s cubic-bezier(.4,0,.2,1), opacity .18s ease',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* ── circle ── */}
      <div style={{ position:'relative' }}>
        <div
          onClick={onClick}
          style={{
            width:54, height:54, borderRadius:'50%', overflow:'hidden', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            background: showImg ? '#111' : isSelected
              ? 'linear-gradient(145deg,#818cf8 0%,#6366f1 40%,#4f46e5 100%)'
              : 'rgba(26,26,46,0.95)',
            boxShadow: isSelected
              ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28), 0 8px 24px rgba(99,102,241,0.45)'
              : '0 0 0 1.5px rgba(255,255,255,0.09)',
            transition:'all .22s cubic-bezier(.4,0,.2,1)',
          }}>
          {uploading
            ? <RefreshCw size={18} color="#6366f1" style={{ animation:'spin .7s linear infinite' }} />
            : showImg
            ? <img src={imgSrc} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setBroken(true)} />
            : <Icon size={22} color={isSelected ? '#fff' : '#6366f1'} />}
        </div>

        {/* camera badge */}
        <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} title="Change photo"
          style={{ position:'absolute', bottom:-2, right:-2, width:20, height:20, borderRadius:'50%', background:'#6366f1', border:'2px solid #0b0f1c', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity: hov||isSelected ? 1 : 0.55, transition:'opacity .15s' }}>
          <Camera size={9} color="#fff" />
        </button>

        {/* rename badge (optional) */}
        {onEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit(); }} title="Rename"
            style={{ position:'absolute', top:-2, left:-2, width:18, height:18, borderRadius:'50%', background:'#1e2a3a', border:'1.5px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity: hov ? 1 : 0, transition:'opacity .15s' }}>
            <Pencil size={7} color="#94a3b8" />
          </button>
        )}

        {/* delete badge */}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete"
          style={{ position:'absolute', top:-2, right:-2, width:18, height:18, borderRadius:'50%', background:'rgba(239,68,68,0.9)', border:'2px solid #0b0f1c', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity: hov ? 1 : 0, transition:'opacity .15s' }}>
          <X size={7} color="#fff" />
        </button>

        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value=''; }} />
      </div>

      {/* selection indicator dot */}
      <div style={{ width:20, height:3, borderRadius:999, marginTop:7,
        background: isSelected ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent',
        boxShadow: isSelected ? '0 0 8px rgba(99,102,241,0.8)' : 'none',
        transition:'all .22s' }} />

      {/* label */}
      <span style={{ fontSize:11, fontWeight: isSelected ? 700 : 500, marginTop:4, color: isSelected ? '#fff' : '#94a3b8',
        whiteSpace:'nowrap', maxWidth:76, overflow:'hidden', textOverflow:'ellipsis', textAlign:'center', lineHeight:1.2, transition:'color .22s' }}>
        {label}
      </span>
    </div>
  );
};

/* ─── "All" circle (same style, no badges) ───────────────────────────────────── */
function AllCircle({ isSelected, onClick, imgSrc, label = 'All', allRef }) {
  const [hov, setHov] = useState(false);
  const [broken, setBroken] = useState(false);
  const showImg = !!imgSrc && !broken;
  return (
    <div ref={allRef} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, padding:'0 10px', flexShrink:0, cursor:'pointer',
      opacity: isSelected || hov ? 1 : 0.65,
      transform: isSelected ? 'translateY(-7px) scale(1.07)' : hov ? 'scale(1.04)' : 'scale(1)',
      transition:'transform .22s cubic-bezier(.4,0,.2,1), opacity .18s ease' }}
      onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{ width:54, height:54, borderRadius:'50%', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
        background: showImg ? '#111' : isSelected ? 'linear-gradient(145deg,#818cf8,#6366f1,#4f46e5)' : 'rgba(26,26,46,0.95)',
        boxShadow: isSelected ? '0 0 0 3px #818cf8, 0 0 0 6px rgba(99,102,241,0.28), 0 8px 24px rgba(99,102,241,0.45)' : '0 0 0 1.5px rgba(255,255,255,0.09)',
        transition:'all .22s' }}>
        {showImg ? <img src={imgSrc} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setBroken(true)} /> : <LayoutGrid size={22} color="#fff" />}
      </div>
      <div style={{ width:20, height:3, borderRadius:999, marginTop:7, background: isSelected ? 'linear-gradient(90deg,#818cf8,#6366f1)' : 'transparent', boxShadow: isSelected ? '0 0 8px rgba(99,102,241,0.8)' : 'none', transition:'all .22s' }} />
      <span style={{ fontSize:11, fontWeight: isSelected?700:500, marginTop:4, color: isSelected?'#fff':'#94a3b8' }}>{label}</span>
    </div>
  );
}

/* ─── service card ───────────────────────────────────────────────────────────── */
function SvcCard({ svc, cardRef, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const [broken, setBroken] = useState(false);
  return (
    <div ref={cardRef} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${hov?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.07)'}`,
        borderRadius:16, overflow:'hidden', transition:'border-color .15s, transform .15s', transform: hov ? 'translateY(-3px)' : 'none',
        display:'flex', flexDirection:'column', minWidth:140, maxWidth:180 }}>
      <div style={{ width:'100%', aspectRatio:'4/3', background:'rgba(255,255,255,0.03)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {svc.defaultImage && !broken
          ? <img src={svc.defaultImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setBroken(true)} />
          : <Layers size={26} color="rgba(99,102,241,0.35)" />}
      </div>
      <div style={{ padding:'9px 11px 11px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{svc.name}</div>
        <div style={{ display:'flex', gap:5 }}>
          <button style={{ ...S.ghost, flex:1, justifyContent:'center', padding:'4px 6px', fontSize:10 }} onClick={() => onEdit(svc)}><Pencil size={9} /> Edit</button>
          <button style={{ ...S.danger, padding:'4px 7px', fontSize:10 }} onClick={() => onDelete(svc._id, svc.name)}><Trash2 size={9} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─── add button (inline, dashed) ────────────────────────────────────────────── */
function AddBtn({ label, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov?'rgba(99,102,241,0.1)':'transparent', border:`1px dashed ${hov?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.12)'}`,
        borderRadius:10, padding:'6px 14px', color: hov?'#818cf8':'#475569', fontSize:11, fontWeight:600,
        cursor:'pointer', display:'flex', alignItems:'center', gap:5, transition:'all .15s', flexShrink:0 }}>
      <Plus size={10} /> {label}
    </button>
  );
}

/* ─── SVG branch paths ───────────────────────────────────────────────────────── */
function BranchSVG({ paths, color = '#6366f1' }) {
  if (!paths.length) return null;
  return (
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible', zIndex:2 }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {paths.map((d, i) => (
        <g key={i}>
          {/* glow layer */}
          <path d={d} fill="none" stroke={color} strokeWidth="3" opacity="0.2" filter="url(#glow)" />
          {/* main line */}
          <path d={d} fill="none" stroke={color} strokeWidth="1.8" opacity="0.55"
            strokeDasharray="none" style={{ animation:'branchDraw .4s ease both' }} />
          {/* dot at end */}
        </g>
      ))}
    </svg>
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
  const isCat=mode.includes('cat'), isSub=mode.includes('sub'), isSvc=mode.includes('svc'), isEdit=mode.startsWith('edit');

  const TITLES = { 'add-cat':'Add Category', 'edit-cat':`Edit — ${data.label||''}`, 'add-sub':`Add Sub-category in "${data.cat}"`, 'add-svc':`Add Service in "${data.sub}"`, 'edit-svc':'Edit Service' };

  const save = async () => {
    if (!name.trim()) return toast.error('Name required');
    setSaving(true);
    try {
      if (isCat && !isEdit)       await api.post('/admin/catalog/entries', { businessType, category:name.trim(), categoryImage:catImg, subCategory:'__placeholder__', name:'__placeholder__', isActive:false, order:9999 });
      else if (isCat && isEdit) {
        if (name.trim() !== data.label) await api.put('/admin/catalog/rename', { businessType, field:'category', oldValue:data.label, newValue:name.trim() });
        if (catImg !== (data.categoryImage||'')) await api.put('/admin/catalog/rename', { businessType, field:'categoryImage', oldValue:data.categoryImage||'', newValue:catImg, category:name.trim() });
      } else if (isSub)           await api.post('/admin/catalog/entries', { businessType, category:data.cat, subCategory:name.trim(), subCategoryImage:subImg, name:'__placeholder__', isActive:false, order:9999 });
      else if (isSvc && !isEdit)  await api.post('/admin/catalog/entries', { businessType, category:data.cat, subCategory:data.sub, name:name.trim(), defaultImage:svcImg });
      else if (isSvc && isEdit)   await api.put(`/admin/catalog/entries/${data._id}`, { name:name.trim(), defaultImage:svcImg });
      toast.success(isEdit ? 'Updated' : 'Created'); onDone();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'#0f1729', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, width:'100%', maxWidth:440, boxShadow:'0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <h3 style={{ margin:0, fontWeight:800, color:'#f1f5f9', fontSize:15 }}>{TITLES[mode]}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#475569' }}><X size={17} /></button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>{isCat?'Category Name':isSub?'Sub-category Name':'Service Name'} *</label>
            <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="Enter name…" autoFocus />
          </div>
          {isCat && <div><label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>Category Image</label><ImgUploadCell value={catImg} onChange={setCatImg} /></div>}
          {isSub && <div><label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>Circle Photo</label><ImgUploadCell value={subImg} onChange={setSubImg} /></div>}
          {isSvc && <div><label style={{ fontSize:12, color:'#94a3b8', fontWeight:600, display:'block', marginBottom:6 }}>Service Image</label><ImgUploadCell value={svcImg} onChange={setSvcImg} /></div>}
        </div>
        <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
          <button style={{ ...S.ghost, padding:'9px 16px', fontSize:12 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn(), padding:'9px 20px', fontSize:13 }} onClick={save} disabled={saving}>
            {saving ? <RefreshCw size={13} style={{ animation:'spin .7s linear infinite' }} /> : <Check size={13} />}
            {isEdit ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════════════════ */
export default function ServiceCatalog() {
  const [activeType,  setActiveType]  = useState('barbershop');
  const [tree,        setTree]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [seeding,     setSeeding]     = useState(false);
  const [seedOpen,    setSeedOpen]    = useState(false);
  const [overwriting, setOverwriting] = useState(false);
  const [modal,       setModal]       = useState(null);
  const [uploading,   setUploading]   = useState({});
  const [selCat,      setSelCat]      = useState(null);
  const [selSub,      setSelSub]      = useState(null);

  /* ── branch SVG state ─────────────────────────────────────────── */
  const [catPaths, setCatPaths] = useState([]);   // category → subcategory branches
  const [subPaths, setSubPaths] = useState([]);   // subcategory → service branches

  /* ── refs for position measuring ─────────────────────────────── */
  const treeRef       = useRef(null);   // main container
  const catRowRef     = useRef(null);   // category row
  const subRowRef     = useRef(null);   // subcategory row
  const svcRowRef     = useRef(null);   // services row
  const catCircleRefs = useRef({});     // { [label]: el }
  const subCircleRefs = useRef({});
  const svcCardRefs   = useRef({});
  const seedRef       = useRef(null);

  /* ── fetch ────────────────────────────────────────────────────── */
  const fetchTree = async (bt = activeType) => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/catalog/tree?businessType=${bt}`);
      setTree(r.data.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTree(activeType); setSelCat(null); setSelSub(null); }, [activeType]);

  useEffect(() => {
    if (!seedOpen) return;
    const h = (e) => { if (seedRef.current && !seedRef.current.contains(e.target)) setSeedOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [seedOpen]);

  /* ── recalculate SVG branch paths ─────────────────────────────── */
  const recalc = useCallback(() => {
    const container = treeRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();

    /* cat → sub branches */
    if (selCat && catCircleRefs.current[selCat] && subRowRef.current) {
      const src = catCircleRefs.current[selCat].getBoundingClientRect();
      const sx  = src.left - base.left + src.width / 2;
      const sy  = src.bottom - base.top + 4;

      const subs = Object.entries(subCircleRefs.current);
      const paths = subs.map(([, el]) => {
        if (!el) return null;
        const dst = el.getBoundingClientRect();
        const dx  = dst.left - base.left + dst.width / 2;
        const dy  = dst.top  - base.top  - 4;
        const my  = (sy + dy) / 2;
        return `M ${sx} ${sy} C ${sx} ${my} ${dx} ${my} ${dx} ${dy}`;
      }).filter(Boolean);
      setCatPaths(paths);
    } else {
      setCatPaths([]);
    }

    /* sub → service branches */
    if (selSub && subCircleRefs.current[selSub] && svcRowRef.current) {
      const src = subCircleRefs.current[selSub].getBoundingClientRect();
      const sx  = src.left - base.left + src.width / 2;
      const sy  = src.bottom - base.top + 4;

      const svcs = Object.entries(svcCardRefs.current);
      const paths = svcs.map(([, el]) => {
        if (!el) return null;
        const dst = el.getBoundingClientRect();
        const dx  = dst.left - base.left + dst.width / 2;
        const dy  = dst.top  - base.top  - 4;
        const my  = (sy + dy) / 2;
        return `M ${sx} ${sy} C ${sx} ${my} ${dx} ${my} ${dx} ${dy}`;
      }).filter(Boolean);
      setSubPaths(paths);
    } else {
      setSubPaths([]);
    }
  }, [selCat, selSub]);

  /* run after every paint when selection changes */
  useLayoutEffect(() => {
    const id = setTimeout(recalc, 60);
    return () => clearTimeout(id);
  }, [recalc, tree, selCat, selSub]);

  /* ── image upload ─────────────────────────────────────────────── */
  const uploadImg = async (key, field, file, extra = {}) => {
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const fd = new FormData(); fd.append('image', file);
      const r  = await api.post('/admin/catalog/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await api.put('/admin/catalog/rename', { businessType: activeType, field, oldValue: '', newValue: r.data.data?.url, ...extra });
      toast.success('Photo updated'); fetchTree(activeType);
    } catch { toast.error('Upload failed'); }
    finally { setUploading(u => ({ ...u, [key]: false })); }
  };

  /* ── seed / overwrite ─────────────────────────────────────────── */
  const handleSeed = async (ow = false) => {
    setSeedOpen(false);
    const lbl = BIZ_TYPES.find(b => b.value === activeType)?.label || activeType;
    if (!confirm(`Seed defaults for "${lbl}"${ow ? ' — OVERWRITE' : ''}?`)) return;
    setSeeding(true);
    try {
      const r = await api.post('/admin/catalog/seed', { useDefaults: true, overwrite: ow });
      const d = r.data.data;
      toast.success(`Seeded: ${d.inserted} new · ${d.updated||0} updated`);
      fetchTree(activeType);
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  const handleOverwrite = async (force = false) => {
    const lbl = BIZ_TYPES.find(b => b.value === activeType)?.label || activeType;
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
    try { await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel } }); toast.success('Deleted'); if (selCat === catLabel) { setSelCat(null); setSelSub(null); } fetchTree(activeType); } catch { toast.error('Delete failed'); }
  };
  const deleteSub = async (catLabel, subLabel) => {
    if (!confirm(`Delete sub-category "${subLabel}"?`)) return;
    try { await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel, subCategory: subLabel } }); toast.success('Deleted'); if (selSub === subLabel) setSelSub(null); fetchTree(activeType); } catch { toast.error('Delete failed'); }
  };
  const deleteSvc = async (id, name) => {
    if (!confirm(`Delete service "${name}"?`)) return;
    try { await api.delete(`/admin/catalog/entries/${id}`); toast.success('Deleted'); fetchTree(activeType); } catch { toast.error('Delete failed'); }
  };

  /* ── derived ──────────────────────────────────────────────────── */
  const selectedCat = tree.find(c => c.label === selCat) || null;
  const subs        = (selectedCat?.sections || []).filter(s => s.label !== '__placeholder__');
  const selectedSub = subs.find(s => s.label === selSub) || null;
  const services    = (selectedSub?.services || []).filter(sv => sv.name !== '__placeholder__');

  const BT = BIZ_TYPES.find(b => b.value === activeType);
  const totalSubs = tree.reduce((n,c) => n + (c.sections||[]).filter(s=>s.label!=='__placeholder__').length, 0);
  const totalSvcs = tree.reduce((n,c) => n + (c.sections||[]).reduce((m,s) => m + (s.services||[]).filter(sv=>sv.name!=='__placeholder__').length, 0), 0);

  /* ── clear sub refs when subs change ─────────────────────────── */
  useEffect(() => { subCircleRefs.current = {}; }, [selCat]);
  useEffect(() => { svcCardRefs.current = {}; }, [selSub]);

  return (
    <div style={{ padding:'24px 28px', minHeight:'100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:none; } }
        @keyframes branchDraw { from { stroke-dashoffset: 300; stroke-dasharray: 300; } to { stroke-dashoffset: 0; } }
        .cs-scroll::-webkit-scrollbar { display:none; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', margin:0 }}>Service Catalog</h1>
          <p style={{ fontSize:13, color:'#475569', margin:'4px 0 0' }}>Master catalog — owners inherit and customise</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {/* seed split button */}
          <div style={{ position:'relative' }} ref={seedRef}>
            <div style={{ display:'flex' }}>
              <button onClick={() => handleSeed(false)} disabled={seeding}
                style={{ ...S.ghost, padding:'7px 11px', color:'#a78bfa', borderColor:'rgba(167,139,250,0.3)', borderRadius:'8px 0 0 8px', borderRight:'none', fontSize:12 }}>
                {seeding ? <RefreshCw size={12} style={{ animation:'spin .7s linear infinite' }} /> : <Database size={12} />} Seed
              </button>
              <button onClick={() => setSeedOpen(v=>!v)} disabled={seeding}
                style={{ ...S.ghost, padding:'7px 8px', color:'#a78bfa', borderColor:'rgba(167,139,250,0.3)', borderRadius:'0 8px 8px 0' }}>
                <ChevronDown size={11} style={{ transform: seedOpen?'rotate(180deg)':'none', transition:'transform .15s' }} />
              </button>
            </div>
            {seedOpen && (
              <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:100, background:'#1a2035', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, overflow:'hidden', minWidth:205, boxShadow:'0 8px 32px rgba(0,0,0,0.5)' }}>
                {[{label:'Keep existing',sub:'Adds missing only',ow:false},{label:'Overwrite all',sub:'Updates with defaults',ow:true}].map(o=>(
                  <button key={o.label} onClick={() => handleSeed(o.ow)}
                    style={{ display:'flex', alignItems:'flex-start', gap:9, width:'100%', padding:'10px 14px', background:'none', border:'none', color:o.ow?'#fca5a5':'#e2e8f0', fontSize:12, cursor:'pointer', textAlign:'left' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <Database size={12} color={o.ow?'#f87171':'#a78bfa'} style={{marginTop:2}} />
                    <div><div style={{fontWeight:600}}>Seed — {o.label}</div><div style={{fontSize:10,color:'#64748b',marginTop:1}}>{o.sub}</div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={()=>handleOverwrite(false)} disabled={overwriting}
            style={{ ...S.ghost, padding:'7px 11px', color:'#34d399', borderColor:'rgba(52,211,153,0.3)', fontSize:12 }}>
            {overwriting?<RefreshCw size={12} style={{animation:'spin .7s linear infinite'}}/>:<ImageIcon size={12}/>} Set images
          </button>
          <button onClick={()=>handleOverwrite(true)} disabled={overwriting}
            style={{ ...S.ghost, padding:'7px 11px', color:'#fb923c', borderColor:'rgba(251,146,60,0.3)', fontSize:12 }}>
            {overwriting?<RefreshCw size={12} style={{animation:'spin .7s linear infinite'}}/>:<ImageIcon size={12}/>} Force images
          </button>
          <button style={{ ...S.btn(), padding:'7px 14px', fontSize:12 }} onClick={()=>setModal({mode:'add-cat',data:{}})}>
            <Plus size={12}/> Add Category
          </button>
        </div>
      </div>

      {/* ── Business type pills ─────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:22 }}>
        {BIZ_TYPES.map(bt => {
          const active = activeType === bt.value;
          return (
            <button key={bt.value} onClick={()=>setActiveType(bt.value)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 20px', borderRadius:999, border:'1.5px solid',
                fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s',
                borderColor: active?'#6366f1':'rgba(255,255,255,0.1)',
                background:  active?'linear-gradient(135deg,#6366f1,#4f46e5)':'rgba(255,255,255,0.04)',
                color:       active?'#fff':'#64748b',
                boxShadow:   active?'0 4px 20px rgba(99,102,241,0.4)':'none',
                transform:   active?'translateY(-1px)':'none',
              }}>
              <bt.Icon size={13} /> {bt.label}
            </button>
          );
        })}
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginBottom:22, flexWrap:'wrap' }}>
        {[
          { label:'Categories',     n:tree.length, color:'#6366f1' },
          { label:'Sub-categories', n:totalSubs,   color:'#8b5cf6' },
          { label:'Services',       n:totalSvcs,   color:'#06b6d4' },
        ].map(s => (
          <div key={s.label} style={{ padding:'7px 14px', borderRadius:999, background:'rgba(255,255,255,0.03)', border:`1px solid ${s.color}22`, display:'flex', gap:7, alignItems:'center' }}>
            <span style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.n}</span>
            <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ══════════════════ INTERACTIVE TREE ══════════════════════ */}
      {loading
        ? <div style={{display:'flex',justifyContent:'center',padding:60}}><RefreshCw size={22} color="#6366f1" style={{animation:'spin .7s linear infinite'}}/></div>
        : (
        <div ref={treeRef} style={{ position:'relative', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'24px 20px', animation:'fadeSlideDown .25s ease both' }}>

          {/* ── SVG branch overlay ─────────────────────────────── */}
          <BranchSVG paths={catPaths} color="#6366f1" />
          <BranchSVG paths={subPaths} color="#8b5cf6" />

          {/* ── LEVEL 0: Categories ───────────────────────────── */}
          <div style={{ marginBottom:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {BT && <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 3px rgba(99,102,241,0.2)' }}><BT.Icon size={13} color="#fff"/></div>}
                <span style={{ fontSize:13, fontWeight:800, color:'#f1f5f9' }}>Categories</span>
                <span style={{ fontSize:11, color:'#475569' }}>{tree.length} total</span>
              </div>
              <AddBtn label="Add Category" onClick={()=>setModal({mode:'add-cat',data:{}})} />
            </div>

            <div ref={catRowRef} className="cs-scroll"
              style={{ display:'flex', flexDirection:'row', flexWrap:'nowrap', overflowX:'auto', overflowY:'visible', scrollbarWidth:'none', paddingBottom:8, paddingTop:4 }}>
              <AllCircle
                isSelected={!selCat}
                onClick={() => { setSelCat(null); setSelSub(null); }}
              />
              {tree.map(cat => (
                <AdminCircle
                  key={cat.label}
                  label={cat.label}
                  imgSrc={cat.categoryImage}
                  isSelected={selCat === cat.label}
                  uploading={!!uploading[cat.label]}
                  onClick={() => { setSelCat(cat.label); setSelSub(null); }}
                  onUpload={f => uploadImg(cat.label, 'categoryImage', f, { category: cat.label })}
                  onEdit={() => setModal({ mode:'edit-cat', data:cat })}
                  onDelete={() => deleteCat(cat.label)}
                  circleRef={el => catCircleRefs.current[cat.label] = el}
                />
              ))}
            </div>
          </div>

          {/* ── LEVEL 1: Subcategories (branches appear on click) ─ */}
          {selCat && (
            <div style={{ marginTop:72, animation:'fadeSlideDown .25s ease both' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#6366f1', boxShadow:'0 0 6px rgba(99,102,241,0.7)' }} />
                  <span style={{ fontSize:13, fontWeight:800, color:'#f1f5f9' }}>Subcategories</span>
                  <span style={{ fontSize:11, color:'#475569' }}>inside <span style={{ color:'#818cf8' }}>{selCat}</span> · {subs.length} total</span>
                </div>
                <AddBtn label="Add Sub-category" onClick={()=>setModal({mode:'add-sub',data:{cat:selCat}})} />
              </div>

              <div ref={subRowRef} className="cs-scroll"
                style={{ display:'flex', flexDirection:'row', flexWrap:'nowrap', overflowX:'auto', overflowY:'visible', scrollbarWidth:'none', paddingBottom:8, paddingTop:4 }}>
                <AllCircle
                  isSelected={!selSub}
                  imgSrc={selectedCat?.categoryImage}
                  label="All"
                  onClick={() => setSelSub(null)}
                />
                {subs.map(sec => (
                  <AdminCircle
                    key={sec.label}
                    label={sec.label}
                    imgSrc={sec.subCategoryImage}
                    isSelected={selSub === sec.label}
                    uploading={!!uploading[`sub::${selCat}::${sec.label}`]}
                    onClick={() => setSelSub(sec.label)}
                    onUpload={f => uploadImg(`sub::${selCat}::${sec.label}`, 'subCategoryImage', f, { category:selCat, subCategory:sec.label })}
                    onDelete={() => deleteSub(selCat, sec.label)}
                    circleRef={el => subCircleRefs.current[sec.label] = el}
                  />
                ))}
              </div>

              {!subs.length && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#334155', fontSize:12 }}>No sub-categories yet. Click "Add Sub-category" to create one.</div>
              )}
            </div>
          )}

          {/* ── LEVEL 2: Services (branches appear on click) ────── */}
          {selSub && (
            <div ref={svcRowRef} style={{ marginTop:72, animation:'fadeSlideDown .25s ease both' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 6px rgba(139,92,246,0.7)' }} />
                  <span style={{ fontSize:13, fontWeight:800, color:'#f1f5f9' }}>Services</span>
                  <span style={{ fontSize:11, color:'#475569' }}>inside <span style={{ color:'#a78bfa' }}>{selSub}</span> · {services.length} total</span>
                </div>
                <AddBtn label="Add Service" onClick={()=>setModal({mode:'add-svc',data:{cat:selCat,sub:selSub}})} />
              </div>

              {!services.length
                ? <div style={{ textAlign:'center', padding:'20px 0', color:'#334155', fontSize:12 }}>No services yet. Click "Add Service".</div>
                : <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                    {services.map(svc => (
                      <SvcCard
                        key={svc._id || svc.name}
                        svc={svc}
                        cardRef={el => svcCardRefs.current[svc._id || svc.name] = el}
                        onEdit={s => {
                          setModal({ mode:'edit-svc', data:{ ...s, cat:selCat, sub:selSub } });
                        }}
                        onDelete={deleteSvc}
                      />
                    ))}
                  </div>
              }
            </div>
          )}

          {/* placeholder when nothing selected */}
          {!selCat && !tree.length && (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <Layers size={32} color="#1e293b" style={{ marginBottom:10 }} />
              <p style={{ color:'#475569', fontWeight:700, fontSize:14, margin:'0 0 4px' }}>No categories yet</p>
              <p style={{ color:'#334155', fontSize:12, margin:'0 0 16px' }}>Seed the catalog or add a category to get started.</p>
              <button style={{ ...S.btn(), margin:'0 auto' }} onClick={()=>handleSeed(false)} disabled={seeding}>
                {seeding?<RefreshCw size={13} style={{animation:'spin .7s linear infinite'}}/>:<Database size={13}/>} Seed defaults
              </button>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal modal={modal} businessType={activeType}
          onClose={()=>setModal(null)}
          onDone={()=>{ setModal(null); fetchTree(activeType); }} />
      )}
    </div>
  );
}
