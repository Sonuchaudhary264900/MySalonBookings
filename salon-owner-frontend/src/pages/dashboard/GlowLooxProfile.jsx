import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Clock, Star, Share2, Eye, Scissors, Sparkles,
  Waves, Wind, Activity, Crown, Baby, Home as HomeIcon,
  Palette, Shirt, Plus, Heart, Smile, Paintbrush,
  Images, Info, Phone, Mail, BadgeCheck, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSalon } from '../../hooks/useSalon';
import api from '../../services/api';

const WH_DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABEL = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

const isOpenNow = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
};
const getTodayHours = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return null;
  return `${h.open} – ${h.close}`;
};
const getOpensAt = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open) return null;
  return h.open;
};

const BIZ_THEME = {
  barbershop:    { p: '#6366f1', acc: '#818cf8', label: 'Barbershop',    ring: 'rgba(99,102,241,0.4)' },
  salon:         { p: '#818cf8', acc: '#a5b4fc', label: 'Salon',         ring: 'rgba(129,140,248,0.4)' },
  spa_wellness:  { p: '#8b5cf6', acc: '#a78bfa', label: 'Spa & Wellness',ring: 'rgba(139,92,246,0.4)' },
  makeup_bridal: { p: '#a78bfa', acc: '#c4b5fd', label: 'Makeup & Bridal',ring:'rgba(167,139,250,0.4)' },
  skin_derma:    { p: '#6366f1', acc: '#818cf8', label: 'Skin & Derma',  ring: 'rgba(99,102,241,0.4)' },
};
const DEFAULT_BIZ = { p: '#6366f1', acc: '#818cf8', label: 'Business', ring: 'rgba(99,102,241,0.4)' };

const CAT_ICONS = {
  'Hair Services': Scissors, 'Hair Services (Men)': Scissors, 'Hair Services (Women)': Scissors,
  'Beard & Grooming': Smile, 'Nail Services': Paintbrush, 'Skin & Face / Beauty': Sparkles,
  'Skin & Face (Men Grooming)': Sparkles, 'Skin & Beauty': Sparkles, 'Face & Skin': Sparkles,
  'Spa & Massage': Waves, 'Spa & Relaxation': Waves, 'Body Grooming': Wind,
  'Men Dermatology': Activity, 'Women Dermatology': Activity, 'Bridal & Events': Crown,
  'Kids Services': Baby, 'At-Home Services': HomeIcon, 'Makeup Services': Palette,
  'Hairstyling': Scissors, 'Draping & Dressing': Shirt, 'Pre-Bridal': Heart,
  'Grooming Add-ons': Plus, 'Premium Add-ons': Star,
};

function StarRow({ rating, size = 14 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} style={{ width: size, height: size, flexShrink: 0,
          fill: i <= full ? '#FDE68A' : (i === full+1 && half ? 'url(#half)' : 'none'),
          stroke: i <= full || (i === full+1 && half) ? '#FDE68A' : '#6b7280',
          strokeWidth: 1.5,
        }} />
      ))}
    </span>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />;
}

const TABS = [
  { key: 'gallery',  label: 'Gallery',  Icon: Images },
  { key: 'services', label: 'Services', Icon: Scissors },
  { key: 'reviews',  label: 'Reviews',  Icon: Star },
  { key: 'info',     label: 'Info',     Icon: Info },
];

export default function GlowLooxProfile() {
  const { salon } = useSalon();
  const [services, setServices] = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('gallery');
  const [lightbox, setLightbox]   = useState(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerRef = useRef(null);

  const biz = BIZ_THEME[salon?.businessType] || DEFAULT_BIZ;

  const photoUrls = (salon?.photos || []).map(p => typeof p === 'string' ? p : p?.url).filter(Boolean);
  const videoUrls = (salon?.videos || []).map(v => typeof v === 'string' ? v : v?.url).filter(Boolean);
  const bannerSlides = videoUrls.length
    ? videoUrls.map(u => ({ url: u, type: 'video' }))
    : photoUrls.map(u => ({ url: u, type: 'image' }));
  const coverPhoto = salon?.profilePhoto || salon?.coverPhoto || photoUrls[0] || null;

  const avgRating  = salon?.averageRating || salon?.rating ? parseFloat(salon.averageRating || salon.rating) : null;
  const openStatus = isOpenNow(salon?.workingHours);
  const todayHours = getTodayHours(salon?.workingHours);
  const opensAt    = getOpensAt(salon?.workingHours);

  const load = useCallback(async () => {
    if (!salon?._id) return;
    setLoading(true);
    try {
      const [svcRes, revRes] = await Promise.all([
        api.get(`/public/salons/${salon._id}/services`).catch(() => ({ data: { data: [] } })),
        api.get(`/public/salons/${salon._id}/reviews`).catch(() => ({ data: { data: [] } })),
      ]);
      setServices(svcRes.data.data?.services || svcRes.data.data || []);
      setReviews(revRes.data.data?.reviews || revRes.data.data || []);
    } finally {
      setLoading(false);
    }
  }, [salon?._id]);

  useEffect(() => { load(); }, [load]);

  // Banner auto-advance
  useEffect(() => {
    if (bannerSlides.length <= 1) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % bannerSlides.length), 3500);
    return () => clearInterval(t);
  }, [bannerSlides.length]);

  const handleShare = () => {
    if (navigator.share) { navigator.share({ title: salon?.name || 'GlowLoox', url: window.location.href }); }
    else { navigator.clipboard?.writeText(window.location.href); }
  };

  // ── Tab: Gallery ─────────────────────────────────────────────────
  const renderGallery = () => {
    const allItems = [
      ...photoUrls.map(u => ({ url: u, type: 'image' })),
      ...videoUrls.map(u => ({ url: u, type: 'video' })),
    ];
    if (!allItems.length) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <Images className="w-12 h-12 opacity-30" />
        <p className="font-semibold">No photos or videos yet</p>
        <p className="text-sm opacity-60">Add photos from the Gallery section in the sidebar</p>
      </div>
    );
    return (
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {allItems.map((item, i) => (
          <div key={i} onClick={() => setLightbox(i)}
            className="relative aspect-square overflow-hidden cursor-pointer group">
            <img src={item.url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[7px] border-b-[7px] border-l-[12px] border-t-transparent border-b-transparent border-l-white ml-1" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── Tab: Services ─────────────────────────────────────────────────
  const renderServices = () => {
    if (loading) return (
      <div className="p-4 space-y-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
    if (!services.length) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <Scissors className="w-12 h-12 opacity-30" />
        <p className="font-semibold">No services added yet</p>
      </div>
    );

    const grouped = services.reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});

    return (
      <div className="p-3 space-y-3">
        {Object.entries(grouped).map(([cat, svcs]) => {
          const CatIcon = CAT_ICONS[cat] || Scissors;
          return (
            <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                <div style={{ backgroundColor: biz.p + '1a' }} className="w-7 h-7 rounded-lg flex items-center justify-center">
                  <CatIcon style={{ color: biz.p, width: 14, height: 14 }} />
                </div>
                <span className="text-xs font-800 uppercase tracking-wider" style={{ color: biz.p, fontWeight: 800 }}>{cat}</span>
              </div>
              {svcs.map((svc, i) => (
                <div key={svc._id || i} className={`flex items-center px-4 py-3 gap-3 ${i < svcs.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}>
                  {svc.image && (
                    <img src={svc.image} alt={svc.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{svc.name}</p>
                    {svc.duration > 0 && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {svc.duration} min
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: biz.acc }}>₹{svc.basePrice || svc.price || 0}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Tab: Reviews ──────────────────────────────────────────────────
  const renderReviews = () => {
    if (loading) return (
      <div className="p-4 space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
    if (!reviews.length) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <Star className="w-12 h-12 opacity-30" />
        <p className="font-semibold">No reviews yet</p>
        <p className="text-sm opacity-60">Customer reviews will appear here</p>
      </div>
    );

    const avg = (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1);
    const dist = [5,4,3,2,1].map(n => ({ n, count: reviews.filter(r => Math.round(r.rating) === n).length }));

    return (
      <div className="p-3 space-y-3">
        {/* Summary card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex gap-6 items-start">
          <div className="text-center shrink-0">
            <p className="text-5xl font-black" style={{ color: '#FDE68A', lineHeight: 1 }}>{avg}</p>
            <StarRow rating={parseFloat(avg)} size={12} />
            <p className="text-xs text-gray-400 mt-1">{reviews.length} reviews</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {dist.map(({ n, count }) => {
              const pct = Math.round((count / reviews.length) * 100);
              return (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-2">{n}</span>
                  <Star className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" />
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%`, backgroundColor: biz.p }} className="h-full rounded-full transition-all duration-700" />
                  </div>
                  <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review cards */}
        {reviews.map((rev, i) => (
          <div key={rev._id || i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div style={{ backgroundColor: biz.p + '22', color: biz.acc }} className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                {(rev.customerName || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{rev.customerName || 'Customer'}</p>
                <StarRow rating={rev.rating || 0} size={11} />
              </div>
              <p className="text-xs text-gray-400 shrink-0">
                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              </p>
            </div>
            {rev.comment && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4">{rev.comment}</p>}
            {rev.serviceName && (
              <span style={{ backgroundColor: biz.p + '15', color: biz.acc, borderColor: biz.p + '30' }}
                className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border">
                {rev.serviceName}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── Tab: Info ─────────────────────────────────────────────────────
  const renderInfo = () => {
    const wh = salon?.workingHours;
    return (
      <div className="p-3 space-y-3">
        {(salon?.phone || salon?.email) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: biz.p }}>Contact</p>
            {salon?.phone && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 mb-2">
                <Phone style={{ color: biz.acc }} className="w-4 h-4 shrink-0" /> {salon.phone}
              </div>
            )}
            {salon?.email && (
              <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <Mail style={{ color: biz.acc }} className="w-4 h-4 shrink-0" /> {salon.email}
              </div>
            )}
          </div>
        )}

        {(salon?.address || salon?.city) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: biz.p }}>Location</p>
            <div className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <MapPin style={{ color: biz.acc }} className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{[salon?.address, salon?.locality, salon?.city, salon?.state, salon?.pincode].filter(Boolean).join(', ')}</span>
            </div>
          </div>
        )}

        {wh && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: biz.p }}>Working Hours</p>
            <div className="space-y-1">
              {DAY_ORDER.map(day => {
                const h = wh[day];
                if (!h) return null;
                const isToday = WH_DAYS[new Date().getDay()] === day;
                return (
                  <div key={day} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-sm ${isToday ? 'font-bold' : ''}`}
                    style={isToday ? { backgroundColor: biz.p + '12' } : {}}>
                    <span style={isToday ? { color: biz.acc } : {}} className={isToday ? '' : 'text-gray-500 dark:text-gray-400'}>{DAY_LABEL[day]}</span>
                    <span style={{ color: h.isClosed ? '#ef4444' : isToday ? biz.acc : undefined }}
                      className={h.isClosed ? '' : isToday ? '' : 'text-gray-700 dark:text-gray-300'}>
                      {h.isClosed ? 'Closed' : `${h.open} – ${h.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: biz.p }}>Business Type</p>
          <span style={{ backgroundColor: biz.p + '15', color: biz.acc, borderColor: biz.p + '30' }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border">
            <Scissors className="w-3.5 h-3.5" /> {biz.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      {/* Max-width container matching SalonDetails style */}
      <div className="max-w-[480px] mx-auto bg-white dark:bg-[#0d0520] min-h-screen relative shadow-xl dark:shadow-none">

        {/* ── BANNER ── */}
        <div className="relative h-52 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {bannerSlides.length > 0 ? (
            <img src={bannerSlides[bannerIdx % bannerSlides.length]?.url} alt=""
              className="w-full h-full object-cover transition-opacity duration-500" />
          ) : (
            <div style={{ background: `radial-gradient(ellipse 70% 60% at 20% 40%, ${biz.p}44 0%, transparent 55%), ${biz.p}15` }}
              className="w-full h-full flex items-center justify-center">
              <Scissors style={{ color: biz.acc }} className="w-16 h-16 opacity-20" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

          {/* Customer View badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15">
            <Eye className="w-3 h-3" /> Customer View
          </div>

          {/* Share */}
          <button onClick={handleShare}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Slide dots */}
          {bannerSlides.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {bannerSlides.map((_, i) => (
                <div key={i} style={{ backgroundColor: 'white', opacity: i === bannerIdx ? 1 : 0.4 }}
                  className={`h-1 rounded-full transition-all duration-300 ${i === bannerIdx ? 'w-4' : 'w-1.5'}`} />
              ))}
            </div>
          )}
        </div>

        {/* ── PROFILE INFO ── */}
        <div className="px-4 -mt-8 relative z-10">
          {/* Avatar row */}
          <div className="flex items-end justify-between mb-3">
            <div style={{ borderColor: biz.p, boxShadow: `0 4px 20px ${biz.ring}` }}
              className="w-[72px] h-[72px] rounded-full border-[3px] overflow-hidden bg-white dark:bg-gray-900 shrink-0">
              {coverPhoto
                ? <img src={coverPhoto} alt={salon?.name} className="w-full h-full object-cover" />
                : <div style={{ backgroundColor: biz.p + '22', color: biz.acc }}
                    className="w-full h-full flex items-center justify-center text-2xl font-black">
                    {(salon?.name || 'B').charAt(0)}
                  </div>
              }
            </div>
            {/* Stats */}
            <div className="flex gap-5 pb-1">
              {[
                { val: services.length || 0, label: 'Services' },
                { val: salon?.totalBookings >= 1000 ? `${(salon.totalBookings/1000).toFixed(1)}k` : (salon?.totalBookings || 0), label: 'Customers' },
                { val: salon?.followersCount || 0, label: 'Followers' },
              ].map(({ val, label }) => (
                <div key={label} className="text-center">
                  <p className="text-base font-black text-gray-900 dark:text-white">{val}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Name + verified */}
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">{salon?.name || '—'}</h1>
            {avgRating >= 4.5 && <BadgeCheck style={{ color: biz.p }} className="w-4 h-4 shrink-0" />}
          </div>

          {/* Business type chip */}
          <div style={{ backgroundColor: biz.p + '18', borderColor: biz.p + '40', color: biz.acc }}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-2">
            <Scissors className="w-2.5 h-2.5" /> {biz.label}
          </div>

          {/* Tagline */}
          {salon?.tagline && (
            <p style={{ color: biz.acc }} className="text-xs mb-2">{salon.tagline}</p>
          )}

          {/* Location + open status */}
          <div className="flex flex-wrap gap-2 mb-2">
            {(salon?.locality || salon?.city) && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <MapPin className="w-3 h-3" />
                {salon?.locality && salon?.city ? `${salon.locality}, ${salon.city}` : salon?.locality || salon?.city}
              </span>
            )}
            {salon?.workingHours && (
              <span style={{
                backgroundColor: openStatus ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                borderColor:     openStatus ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                color:           openStatus ? '#4ADE80' : '#F87171',
              }} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border">
                <span style={{ backgroundColor: openStatus ? '#4ADE80' : '#F87171' }} className="w-1.5 h-1.5 rounded-full" />
                {openStatus ? `Open · ${todayHours || ''}` : opensAt ? `Opens ${opensAt}` : 'Closed today'}
              </span>
            )}
          </div>

          {/* Rating */}
          {avgRating && (
            <div className="flex items-center gap-2 mb-4">
              <StarRow rating={avgRating} size={13} />
              <span className="text-sm font-bold text-yellow-300">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviews.length})</span>
            </div>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-gray-100 dark:bg-white/[0.08] mx-0" />

        {/* ── STICKY TAB BAR ── */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0d0520]/95 backdrop-blur-2xl border-b border-gray-100 dark:border-white/[0.08] flex">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors">
              <tab.Icon style={{ width: 18, height: 18, color: activeTab === tab.key ? biz.p : undefined }}
                className={activeTab === tab.key ? '' : 'text-gray-400 dark:text-gray-500'} />
              <span style={{ color: activeTab === tab.key ? biz.p : undefined }}
                className={`text-[9px] font-bold uppercase tracking-wide ${activeTab === tab.key ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                {tab.label}
              </span>
              {activeTab === tab.key && (
                <span style={{ backgroundColor: biz.p }} className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="min-h-64 pb-8">
          {activeTab === 'gallery'  && renderGallery()}
          {activeTab === 'services' && renderServices()}
          {activeTab === 'reviews'  && renderReviews()}
          {activeTab === 'info'     && renderInfo()}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
          {photoUrls[lightbox] && (
            <img src={photoUrls[lightbox]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()} />
          )}
          {photoUrls.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + photoUrls.length) % photoUrls.length); }}
                className="absolute left-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % photoUrls.length); }}
                className="absolute right-16 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
              <p className="absolute bottom-4 text-white/60 text-sm">{lightbox + 1} / {photoUrls.length}</p>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
