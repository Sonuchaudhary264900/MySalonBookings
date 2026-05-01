import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Upload,
  Check, X, RefreshCw, Layers, FolderOpen, Tag, Image as ImageIcon,
  Database, AlertTriangle, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';

const BUSINESS_TYPES = [
  { value: 'barbershop',    label: 'Barbershop'     },
  { value: 'salon',         label: 'Salon'          },
  { value: 'spa_wellness',  label: 'Spa & Wellness' },
  { value: 'makeup_bridal', label: 'Makeup & Bridal'},
  { value: 'skin_derma',    label: 'Skin & Derma'   },
];

// ─── shared style tokens ──────────────────────────────────────────────────────
const S = {
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '8px 12px',
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btn: (color = '#6366f1') => ({
    background: color, border: 'none', borderRadius: 10,
    padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  }),
  ghost: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '6px 10px', color: '#94a3b8', fontSize: 12,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  },
  danger: {
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, padding: '6px 10px', color: '#f87171', fontSize: 12,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '14px 16px',
  },
};

// ─── image upload helper ──────────────────────────────────────────────────────
function ImgUploadCell({ value, onChange }) {
  const ref = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/admin/catalog/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
        {uploading ? <RefreshCw size={12} style={{ animation: 'spin .7s linear infinite' }} /> : <Upload size={12} />}
        {preview ? 'Change' : 'Upload'}
      </button>
      {preview && (
        <button style={{ ...S.ghost, padding: '6px 8px' }} onClick={() => { setPreview(''); onChange(''); }}>
          <X size={12} />
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ServiceCatalog() {
  const [activeType,   setActiveType]   = useState('barbershop');
  const [tree,         setTree]         = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [seeding,      setSeeding]      = useState(false);
  const [seedMenuOpen, setSeedMenuOpen] = useState(false);
  const [overwriting,  setOverwriting]  = useState(false);
  const [nav,          setNav]          = useState(null);  // null | {cat} | {cat, sub}
  const [modal,        setModal]        = useState(null);
  const [search,       setSearch]       = useState('');
  const seedMenuRef = useRef(null);

  const fetchTree = async (bt = activeType) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/catalog/tree?businessType=${bt}`);
      setTree(res.data.data || []);
    } catch { toast.error('Failed to load catalog'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTree(activeType); setNav(null); setSearch(''); }, [activeType]);

  useEffect(() => {
    if (!seedMenuOpen) return;
    const handler = (e) => { if (seedMenuRef.current && !seedMenuRef.current.contains(e.target)) setSeedMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [seedMenuOpen]);

  // ── seed from built-in defaults ───────────────────────────────────────────
  const handleSeed = async (overwrite = false) => {
    setSeedMenuOpen(false);
    const label = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;
    const msg = overwrite
      ? `Seed defaults for "${label}" and OVERWRITE existing entries with default values?`
      : `Seed defaults for "${label}"? Existing entries will NOT be overwritten.`;
    if (!confirm(msg)) return;
    setSeeding(true);
    try {
      const res = await api.post('/admin/catalog/seed', { useDefaults: true, overwrite });
      const d = res.data.data;
      const parts = [`${d.inserted} new`];
      if (d.updated)  parts.push(`${d.updated} updated`);
      if (d.skipped)  parts.push(`${d.skipped} skipped`);
      toast.success(`Seeded: ${parts.join(' · ')}`);
      fetchTree(activeType);
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  // ── overwrite images ──────────────────────────────────────────────────────
  const handleOverwrite = async (force = false) => {
    const label = BUSINESS_TYPES.find(b => b.value === activeType)?.label || activeType;
    const msg = force
      ? `Force overwrite: admin images will REPLACE owner custom images for all "${label}" salons. Continue?`
      : `Set admin catalog images as default for all "${label}" salons (owner custom images kept). Continue?`;
    if (!confirm(msg)) return;
    setOverwriting(true);
    try {
      const endpoint = force ? '/admin/catalog/force-overwrite-images' : '/admin/catalog/overwrite-images';
      const res = await api.post(endpoint, { businessType: activeType });
      toast.success(`Updated ${res.data.updated} salon${res.data.updated !== 1 ? 's' : ''} · ${res.data.categoriesOverwritten} categories`);
    } catch { toast.error('Overwrite failed'); }
    finally { setOverwriting(false); }
  };

  // ── delete handlers ───────────────────────────────────────────────────────
  const deleteCategory = async (catLabel) => {
    if (!confirm(`Delete entire category "${catLabel}" and all its services?`)) return;
    try {
      await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel } });
      toast.success('Category deleted');
      fetchTree(activeType);
      if (nav?.cat === catLabel) setNav(null);
    } catch { toast.error('Delete failed'); }
  };

  const deleteSubCategory = async (catLabel, subLabel) => {
    if (!confirm(`Delete sub-category "${subLabel}" and all its services?`)) return;
    try {
      await api.delete('/admin/catalog/batch', { data: { businessType: activeType, category: catLabel, subCategory: subLabel } });
      toast.success('Sub-category deleted');
      fetchTree(activeType);
      if (nav?.sub === subLabel) setNav({ cat: nav.cat });
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

  const selectedCat = nav?.cat ? tree.find(c => c.label === nav.cat) : null;
  const selectedSub = nav?.sub ? selectedCat?.sections?.find(s => s.label === nav.sub) : null;

  const filteredTree = search
    ? tree.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.sections?.some(s =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.services?.some(sv => (sv.name||sv).toLowerCase().includes(search.toLowerCase()))
        ))
    : tree;

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Service Catalog</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Master catalog — admin sets defaults. Owners inherit and can customise.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Seed split button */}
          <div style={{ position: 'relative' }} ref={seedMenuRef}>
            <div style={{ display: 'flex' }}>
              <button
                onClick={() => handleSeed(false)}
                disabled={seeding}
                style={{ ...S.ghost, padding: '9px 14px', fontSize: 13, color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', borderRadius: '8px 0 0 8px', borderRight: 'none' }}>
                {seeding ? <RefreshCw size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <Database size={14} />}
                Seed defaults
              </button>
              <button
                onClick={() => setSeedMenuOpen(v => !v)}
                disabled={seeding}
                style={{ ...S.ghost, padding: '9px 10px', fontSize: 13, color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', borderRadius: '0 8px 8px 0' }}>
                <ChevronRight size={13} style={{ transform: seedMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }} />
              </button>
            </div>
            {seedMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, overflow: 'hidden', minWidth: 220,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <button
                  onClick={() => handleSeed(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Database size={14} color="#a78bfa" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Seed — keep existing</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Adds missing entries only</div>
                  </div>
                </button>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <button
                  onClick={() => handleSeed(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: '#fca5a5', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <RefreshCw size={14} color="#f87171" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Seed — overwrite existing</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Updates all entries with defaults</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Overwrite images — fills in missing owner images, keeps custom ones */}
          <button
            onClick={() => handleOverwrite(false)}
            disabled={overwriting}
            style={{ ...S.ghost, padding: '9px 16px', fontSize: 13, color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}>
            {overwriting ? <RefreshCw size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <ImageIcon size={14} />}
            Set as default images
          </button>

          {/* Force overwrite — admin images override owner custom images */}
          <button
            onClick={() => handleOverwrite(true)}
            disabled={overwriting}
            style={{ ...S.ghost, padding: '9px 16px', fontSize: 13, color: '#fb923c', borderColor: 'rgba(251,146,60,0.3)' }}>
            {overwriting ? <RefreshCw size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <ImageIcon size={14} />}
            Force overwrite images
          </button>

          <button style={{ ...S.btn(), padding: '9px 16px' }}
            onClick={() => setModal({ mode: 'add-cat', data: {} })}>
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* Business type tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {BUSINESS_TYPES.map(bt => (
          <button key={bt.value} onClick={() => setActiveType(bt.value)} style={{
            padding: '8px 18px', borderRadius: 10, border: '1px solid',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
            borderColor: activeType === bt.value ? '#6366f1' : 'rgba(255,255,255,0.1)',
            background:  activeType === bt.value ? '#6366f1' : 'rgba(255,255,255,0.04)',
            color:       activeType === bt.value ? '#fff'    : '#94a3b8',
          }}>
            {bt.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13 }}>
        <button onClick={() => setNav(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0, color: nav ? '#6366f1' : '#f1f5f9' }}>
          {BUSINESS_TYPES.find(b => b.value === activeType)?.label}
        </button>
        {nav?.cat && (<>
          <ChevronRight size={14} color="#475569" />
          <button onClick={() => setNav({ cat: nav.cat })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0, color: nav?.sub ? '#6366f1' : '#f1f5f9' }}>
            {nav.cat}
          </button>
        </>)}
        {nav?.sub && (<>
          <ChevronRight size={14} color="#475569" />
          <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{nav.sub}</span>
        </>)}
      </div>

      {/* Content */}
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><RefreshCw size={24} color="#6366f1" style={{ animation: 'spin .7s linear infinite' }} /></div>
        : !nav
          ? <CatLevel tree={filteredTree} search={search} setSearch={setSearch}
              onNav={cat => setNav({ cat })} onEdit={cat => setModal({ mode: 'edit-cat', data: cat })}
              onDelete={deleteCategory} onAdd={() => setModal({ mode: 'add-cat', data: {} })} />
          : !nav.sub
          ? <SubLevel cat={selectedCat}
              onNav={sub => setNav({ cat: nav.cat, sub })}
              onEditCat={() => setModal({ mode: 'edit-cat', data: selectedCat })}
              onAddSub={() => setModal({ mode: 'add-sub', data: { cat: nav.cat } })}
              onEditSub={sub => setModal({ mode: 'edit-sub', data: { cat: nav.cat, sub } })}
              onDeleteSub={sub => deleteSubCategory(nav.cat, sub)} />
          : <SvcLevel cat={nav.cat} sub={selectedSub}
              onAdd={() => setModal({ mode: 'add-svc', data: { cat: nav.cat, sub: nav.sub } })}
              onEdit={svc => setModal({ mode: 'edit-svc', data: { ...svc, cat: nav.cat, sub: nav.sub } })}
              onDelete={deleteService} />
      }

      {modal && (
        <Modal modal={modal} businessType={activeType}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); fetchTree(activeType); }} />
      )}
    </div>
  );
}

// ─── Level 0: Categories ──────────────────────────────────────────────────────
function CatLevel({ tree, search, setSearch, onNav, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...S.input, paddingLeft: 34 }} />
        </div>
        <span style={{ fontSize: 12, color: '#64748b' }}>{tree.length} categories</span>
      </div>

      {!tree.length
        ? <Empty label="No categories yet" sub='Click "Seed defaults" to import the built-in catalog, or "Add Category" to start manually.' />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {tree.map(cat => (
              <div key={cat.label} style={{ ...S.card, position: 'relative', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={() => onNav(cat.label)}>
                  {cat.categoryImage
                    ? <img src={cat.categoryImage} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FolderOpen size={20} color="#6366f1" />
                      </div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14, marginBottom: 2 }}>{cat.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{cat.sections?.length || 0} sections · {cat.subServices?.length || 0} services</div>
                  </div>
                  <ChevronRight size={16} color="#6366f1" />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button style={S.ghost} onClick={e => { e.stopPropagation(); onEdit(cat); }}><Pencil size={11} /> Edit</button>
                  <button style={S.danger} onClick={e => { e.stopPropagation(); onDelete(cat.label); }}><Trash2 size={11} /> Delete all</button>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}

// ─── Level 1: Sub-categories ──────────────────────────────────────────────────
function SubLevel({ cat, onNav, onEditCat, onAddSub, onEditSub, onDeleteSub }) {
  if (!cat) return null;
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          {cat.categoryImage && <img src={cat.categoryImage} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />}
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{cat.label}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{cat.sections?.length || 0} sub-categories</span>
        </div>
        <button style={S.ghost} onClick={onEditCat}><Pencil size={12} /> Edit category</button>
        <button style={{ ...S.btn(), padding: '8px 14px', fontSize: 12 }} onClick={onAddSub}><Plus size={13} /> Add Sub-category</button>
      </div>

      {!cat.sections?.length
        ? <Empty label="No sub-categories" sub="Add sub-categories to group services within this category." />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {cat.sections.map(sec => (
              <div key={sec.label} style={{ ...S.card, transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={() => onNav(sec.label)}>
                  <div style={{ width: 40, height: 40, borderRadius: 9, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Tag size={17} color="#6366f1" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{sec.label}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{sec.services?.length || 0} services</div>
                  </div>
                  <ChevronRight size={15} color="#6366f1" />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button style={S.ghost} onClick={e => { e.stopPropagation(); onEditSub({ label: sec.label }); }}><Pencil size={11} /> Rename</button>
                  <button style={S.danger} onClick={e => { e.stopPropagation(); onDeleteSub(sec.label); }}><Trash2 size={11} /> Delete all</button>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}

// ─── Level 2: Services ────────────────────────────────────────────────────────
function SvcLevel({ cat, sub, onAdd, onEdit, onDelete }) {
  if (!sub) return null;
  const services = sub.services || [];
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{sub.label}</span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>{services.length} services</span>
        </div>
        <button style={{ ...S.btn(), padding: '8px 14px', fontSize: 12 }} onClick={onAdd}><Plus size={13} /> Add Service</button>
      </div>

      {!services.length
        ? <Empty label="No services yet" sub="Add services to this sub-category." />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {services.map(svc => (
              <div key={svc._id || svc.name} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14 }}>
                {svc.defaultImage
                  ? <img src={svc.defaultImage} alt="" style={{ width: 50, height: 50, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 50, height: 50, borderRadius: 9, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Layers size={18} color="#6366f1" />
                    </div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>{svc.name || svc}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {svc.priceHints?.length ? `₹${svc.priceHints.join(' · ')}` : 'No price hints'}
                    {' · '}
                    {svc.defaultDuration ? `${svc.defaultDuration} min default` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button style={S.ghost} onClick={() => onEdit(svc)}><Pencil size={11} /> Edit</button>
                  <button style={S.danger} onClick={() => onDelete(svc._id, svc.name)}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>}
    </div>
  );
}

// ─── CRUD Modal ───────────────────────────────────────────────────────────────
function Modal({ modal, businessType, onClose, onDone }) {
  const { mode, data } = modal;
  const [saving, setSaving] = useState(false);
  const [name,            setName]            = useState(data.label || data.name || '');
  const [categoryImage,    setCategoryImage]    = useState(data.categoryImage || '');
  const [subCategoryImage, setSubCategoryImage] = useState(data.subCategoryImage || '');
  const [defaultImage,     setDefaultImage]     = useState(data.defaultImage || '');
  const [priceHints,      setPriceHints]      = useState((data.priceHints || []).join(', '));
  const [durationHints,   setDurationHints]   = useState((data.durationHints || []).join(', '));
  const [defaultDuration, setDefaultDuration] = useState(data.defaultDuration || 30);

  const isEdit = mode.startsWith('edit');
  const isCat  = mode.includes('cat');
  const isSub  = mode.includes('sub');
  const isSvc  = mode.includes('svc');

  const titles = {
    'add-cat': 'Add Category',
    'edit-cat': `Edit Category — ${data.label || ''}`,
    'add-sub': `Add Sub-category to "${data.cat}"`,
    'edit-sub': `Rename Sub-category`,
    'add-svc': `Add Service to "${data.sub}"`,
    'edit-svc': `Edit Service`,
  };

  const parseNums = s => (s||'').split(',').map(v=>parseFloat(v.trim())).filter(n=>!isNaN(n));

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      if (isCat && !isEdit) {
        // Create a placeholder entry so the category is visible in the tree
        await api.post('/admin/catalog/entries', {
          businessType, category: name.trim(), categoryImage,
          subCategory: '__placeholder__', name: '__placeholder__', isActive: false, order: 9999,
        });
        toast.success('Category created');
      } else if (isCat && isEdit) {
        if (name.trim() !== data.label) {
          await api.put('/admin/catalog/rename', { businessType, field: 'category', oldValue: data.label, newValue: name.trim() });
        }
        if (categoryImage !== (data.categoryImage || '')) {
          await api.put('/admin/catalog/rename', { businessType, field: 'categoryImage', oldValue: data.categoryImage || '', newValue: categoryImage, category: name.trim() });
        }
        toast.success('Category updated');
      } else if (isSub && !isEdit) {
        await api.post('/admin/catalog/entries', {
          businessType, category: data.cat, subCategory: name.trim(), subCategoryImage,
          name: '__placeholder__', isActive: false, order: 9999,
        });
        toast.success('Sub-category created');
      } else if (isSub && isEdit) {
        const oldSub = data.sub?.label || data.sub;
        if (name.trim() !== oldSub) {
          await api.put('/admin/catalog/rename', { businessType, field: 'subCategory', oldValue: oldSub, newValue: name.trim(), category: data.cat });
        }
        if (subCategoryImage !== (data.subCategoryImage || '')) {
          await api.put('/admin/catalog/rename', { businessType, field: 'subCategoryImage', oldValue: data.subCategoryImage || '', newValue: subCategoryImage, category: data.cat, subCategory: name.trim() });
        }
        toast.success('Sub-category updated');
      } else if (isSvc && !isEdit) {
        await api.post('/admin/catalog/entries', {
          businessType, category: data.cat, subCategory: data.sub, name: name.trim(),
          defaultImage, priceHints: parseNums(priceHints), durationHints: parseNums(durationHints),
          defaultDuration: parseInt(defaultDuration) || 30,
        });
        toast.success('Service created');
      } else if (isSvc && isEdit) {
        await api.put(`/admin/catalog/entries/${data._id}`, {
          name: name.trim(), defaultImage,
          priceHints: parseNums(priceHints), durationHints: parseNums(durationHints),
          defaultDuration: parseInt(defaultDuration) || 30,
        });
        toast.success('Service updated');
      }
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#f1f5f9', fontSize: 16 }}>{titles[mode]}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              {isCat ? 'Category Name' : isSub ? 'Sub-category Name' : 'Service Name'} *
            </label>
            <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter name…" autoFocus />
          </div>

          {isCat && (
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category Image</label>
              <ImgUploadCell value={categoryImage} onChange={setCategoryImage} />
            </div>
          )}

          {isSub && (
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Sub-category Image <span style={{ color: '#64748b', fontWeight: 400 }}>(shown on circle button — different from service images)</span>
              </label>
              <ImgUploadCell value={subCategoryImage} onChange={setSubCategoryImage} />
            </div>
          )}

          {isSvc && (
            <>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Default Image</label>
                <ImgUploadCell value={defaultImage} onChange={setDefaultImage} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Price Hints ₹ (comma-sep.)</label>
                  <input style={S.input} value={priceHints} onChange={e => setPriceHints(e.target.value)} placeholder="100, 200, 500" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Duration Hints min (comma-sep.)</label>
                  <input style={S.input} value={durationHints} onChange={e => setDurationHints(e.target.value)} placeholder="15, 30, 45" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>Default Duration (min)</label>
                <input type="number" style={{ ...S.input, maxWidth: 120 }} value={defaultDuration} onChange={e => setDefaultDuration(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <button style={{ ...S.ghost, padding: '10px 18px', fontSize: 13 }} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn(), padding: '10px 22px' }} onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin .7s linear infinite' }} /> : <Check size={14} />}
            {isEdit ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Empty({ label, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <AlertTriangle size={32} color="#334155" style={{ marginBottom: 12 }} />
      <p style={{ color: '#64748b', fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>{label}</p>
      <p style={{ color: '#475569', fontSize: 13, margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>{sub}</p>
    </div>
  );
}
