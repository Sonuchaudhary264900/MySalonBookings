import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scissors, Sparkles, Leaf, Heart, Star, ChevronRight,
  ArrowLeft, MapPin, Star as StarIcon, Search, SlidersHorizontal,
} from 'lucide-react';
import api from '../services/api';
import {
  UNISEX_CATEGORIES,
  CATEGORY_IMAGES,
  CATEGORY_CARD_IMAGE_MAP,
  getCategoryOrderForBusinessType,
} from '../constants/salonCategories';

/* ─── Business type config ─────────────────────────────────── */
const BIZ_TYPES = [
  {
    key: 'barbershop',
    label: 'Barbershop',
    sub: 'Haircuts, fades, beard grooming',
    Icon: Scissors,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.22)',
    img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=220&fit=crop&q=80',
  },
  {
    key: 'salon',
    label: 'Salon',
    sub: 'Hair, nails, skin, bridal',
    Icon: Sparkles,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.10)',
    border: 'rgba(139,92,246,0.22)',
    img: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=220&fit=crop&q=80',
  },
  {
    key: 'spa_wellness',
    label: 'Spa & Wellness',
    sub: 'Massage, relaxation, body care',
    Icon: Leaf,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.22)',
    img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=220&fit=crop&q=80',
  },
  {
    key: 'makeup_bridal',
    label: 'Makeup & Bridal',
    sub: 'Bridal looks, party makeup',
    Icon: Heart,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.10)',
    border: 'rgba(236,72,153,0.22)',
    img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=220&fit=crop&q=80',
  },
  {
    key: 'skin_derma',
    label: 'Skin & Derma',
    sub: 'Facials, treatments, dermatology',
    Icon: Star,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
    img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=220&fit=crop&q=80',
  },
];

/* ─── Helpers ───────────────────────────────────────────────── */
function getCatImg(label) {
  const imgs = CATEGORY_IMAGES[label];
  if (!imgs) return CATEGORY_CARD_IMAGE_MAP[label] || null;
  return Array.isArray(imgs) ? imgs[0] : imgs;
}

function getSubServices(cat) {
  const all = [...(cat.maleSubServices || []), ...(cat.femaleSubServices || [])];
  return [...new Set(all)];
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--t-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--t-border)' }}>
      <div style={{ height: 140, background: 'linear-gradient(90deg,var(--t-input-bg) 25%,var(--t-border) 50%,var(--t-input-bg) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 13, background: 'var(--t-input-bg)', borderRadius: 6, marginBottom: 8, width: '65%' }} />
        <div style={{ height: 10, background: 'var(--t-input-bg)', borderRadius: 6, width: '45%' }} />
      </div>
    </div>
  );
}

/* ─── Salon card ────────────────────────────────────────────── */
function SalonCard({ salon, subLabel }) {
  const navigate = useNavigate();
  const photo = salon.photos?.[0] || salon.coverPhoto || salon.logo;
  return (
    <div
      onClick={() => navigate(`/salon/${salon._id}`)}
      style={{
        background: 'var(--t-card)', borderRadius: 16, overflow: 'hidden',
        border: '1px solid var(--t-border)', cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ height: 140, background: '#1a1a1a', overflow: 'hidden', position: 'relative' }}>
        {photo
          ? <img src={photo} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1e1b4b,#312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={28} color="#6366f1" />
            </div>
        }
        {salon.averageRating > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', borderRadius: 8, padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <StarIcon size={11} fill="#fbbf24" color="#fbbf24" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>{salon.averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-text)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{salon.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--t-text-3)' }}>
          <MapPin size={11} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{salon.locality || salon.city}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function ExplorePage() {
  const navigate  = useNavigate();

  const [step,        setStep]        = useState('biz');      // biz | cats | subs | salons
  const [selBiz,      setSelBiz]      = useState(null);        // BIZ_TYPES entry
  const [selCat,      setSelCat]      = useState(null);        // UNISEX_CATEGORIES entry
  const [selSub,      setSelSub]      = useState(null);        // string
  const [cats,        setCats]        = useState([]);
  const [subs,        setSubs]        = useState([]);
  const [salons,      setSalons]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');

  /* When biz type selected → build category list */
  useEffect(() => {
    if (!selBiz) return;
    const order = getCategoryOrderForBusinessType(selBiz.key, 'unisex');
    const cats  = UNISEX_CATEGORIES.filter(c => order.includes(c.label))
      .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
    // Fallback: show all if none match
    setCats(cats.length ? cats : UNISEX_CATEGORIES);
  }, [selBiz]);

  /* When category selected → build sub list */
  useEffect(() => {
    if (!selCat) return;
    setSubs(getSubServices(selCat));
  }, [selCat]);

  /* Fetch salons when subcategory selected */
  const fetchSalons = useCallback(async (subLabel) => {
    setLoading(true);
    setSalons([]);
    try {
      const res = await api.get('/public/salons', { params: { limit: 30 } });
      const all = res.data?.data || res.data?.salons || [];
      // Filter by businessType + service name match
      const filtered = all.filter(s => {
        const bizMatch = !selBiz || s.businessType === selBiz.key || !s.businessType;
        const offNames = (s.offeredCategories || []).flatMap(c =>
          [c.name, ...(c.subServices || []).map(ss => ss.name)]
        );
        const svcMatch = offNames.some(n =>
          n?.toLowerCase().includes(subLabel.toLowerCase()) ||
          subLabel.toLowerCase().includes(n?.toLowerCase())
        );
        return bizMatch && svcMatch;
      });
      setSalons(filtered);
    } catch { setSalons([]); }
    finally { setLoading(false); }
  }, [selBiz]);

  const handleBizSelect = (biz) => {
    setSelBiz(biz); setSelCat(null); setSelSub(null); setSalons([]);
    setStep('cats'); setSearch('');
  };

  const handleCatSelect = (cat) => {
    setSelCat(cat); setSelSub(null); setSalons([]);
    setStep('subs'); setSearch('');
  };

  const handleSubSelect = (sub) => {
    setSelSub(sub);
    setStep('salons');
    fetchSalons(sub);
  };

  const goBack = () => {
    if (step === 'salons') { setStep('subs'); setSalons([]); }
    else if (step === 'subs') { setStep('cats'); setSelCat(null); }
    else if (step === 'cats') { setStep('biz'); setSelBiz(null); }
    setSearch('');
  };

  const filteredSearch = (items) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => {
      const name = typeof item === 'string' ? item : (item.label || item.name || '');
      return name.toLowerCase().includes(q);
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--t-bg)', color: 'var(--t-text)', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--t-nav-bg,var(--t-bg))', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--t-border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {step !== 'biz' && (
          <button onClick={goBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--t-text)', flexShrink: 0 }}>
            <ArrowLeft size={17} />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--t-text)' }}>
            {step === 'biz'    && 'Explore Services'}
            {step === 'cats'   && selBiz?.label}
            {step === 'subs'   && selCat?.label}
            {step === 'salons' && selSub}
          </div>
          <div style={{ fontSize: 12, color: 'var(--t-text-3)', marginTop: 1 }}>
            {step === 'biz'    && 'Choose a business type'}
            {step === 'cats'   && 'Select a category'}
            {step === 'subs'   && 'Choose a service'}
            {step === 'salons' && `${salons.length} salon${salons.length !== 1 ? 's' : ''} found`}
          </div>
        </div>
        {/* Breadcrumb */}
        {step !== 'biz' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--t-text-3)' }}>
            {selBiz && <span style={{ color: selBiz.color, fontWeight: 700 }}>{selBiz.label}</span>}
            {selCat && <><ChevronRight size={10} /><span>{selCat.label}</span></>}
            {selSub && <><ChevronRight size={10} /><span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selSub}</span></>}
          </div>
        )}
      </div>

      {/* Search bar (cats + subs + salons) */}
      {step !== 'biz' && step !== 'salons' && (
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', borderRadius: 14, padding: '10px 14px' }}>
            <Search size={15} color="var(--t-text-3)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={step === 'cats' ? 'Search categories...' : 'Search services...'}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--t-text)' }}
            />
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 80px' }}>

        {/* ── STEP 1: Business Types ─────────────────────────────── */}
        {step === 'biz' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {BIZ_TYPES.map(biz => (
              <button
                key={biz.key}
                onClick={() => handleBizSelect(biz)}
                style={{
                  position: 'relative', overflow: 'hidden', borderRadius: 20,
                  border: `1px solid ${biz.border}`, background: biz.bg,
                  cursor: 'pointer', textAlign: 'left', padding: 0,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${biz.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Cover image */}
                <div style={{ height: 130, overflow: 'hidden' }}>
                  <img src={biz.img} alt={biz.label} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                  <div style={{ position: 'absolute', inset: 0, height: 130, background: `linear-gradient(to bottom, transparent 30%, ${biz.color}44)` }} />
                </div>
                <div style={{ padding: '16px 18px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: biz.bg, border: `1px solid ${biz.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <biz.Icon size={18} color={biz.color} />
                      </div>
                      <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--t-text)' }}>{biz.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t-text-3)', paddingLeft: 46 }}>{biz.sub}</div>
                  </div>
                  <ChevronRight size={18} color="var(--t-text-3)" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: Categories ────────────────────────────────── */}
        {step === 'cats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            {filteredSearch(cats).map(cat => {
              const img = getCatImg(cat.label);
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCatSelect(cat)}
                  style={{
                    borderRadius: 18, overflow: 'hidden', border: '1px solid var(--t-border)',
                    background: 'var(--t-card)', cursor: 'pointer', textAlign: 'left', padding: 0,
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${selBiz.color}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                >
                  <div style={{ height: 100, overflow: 'hidden', background: '#1a1a1a' }}>
                    {img
                      ? <img src={img} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${selBiz.bg},${selBiz.border})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{cat.icon}</div>
                    }
                  </div>
                  <div style={{ padding: '10px 12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t-text)', lineHeight: 1.3 }}>{cat.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t-text-3)', marginTop: 2 }}>
                        {getSubServices(cat).length} services
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--t-text-3)" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 3: Subcategories / Services ─────────────────── */}
        {step === 'subs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredSearch(subs).map(sub => (
              <button
                key={sub}
                onClick={() => handleSubSelect(sub)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 14,
                  background: 'var(--t-card)', border: '1px solid var(--t-border)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.12s, border-color 0.12s',
                  color: 'var(--t-text)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--t-input-bg)'; e.currentTarget.style.borderColor = selBiz.color + '55'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--t-card)'; e.currentTarget.style.borderColor = 'var(--t-border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: selBiz.bg, border: `1px solid ${selBiz.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {selCat.icon}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{sub}</span>
                </div>
                <ChevronRight size={16} color="var(--t-text-3)" />
              </button>
            ))}
            {filteredSearch(subs).length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t-text-3)', fontSize: 14 }}>
                No services match "{search}"
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Salons ───────────────────────────────────── */}
        {step === 'salons' && (
          <>
            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
            {!loading && salons.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t-text)', marginBottom: 6 }}>No salons found</div>
                <div style={{ fontSize: 13, color: 'var(--t-text-3)' }}>No salons currently offer "{selSub}"</div>
                <button onClick={goBack} style={{ marginTop: 18, padding: '10px 24px', borderRadius: 12, background: selBiz?.color || '#6366f1', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Try another service
                </button>
              </div>
            )}
            {!loading && salons.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                {salons.map(s => <SalonCard key={s._id} salon={s} subLabel={selSub} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
