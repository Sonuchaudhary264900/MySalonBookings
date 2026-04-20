import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Clock, Star, Share2, Eye, Scissors, Sparkles,
  Waves, Wind, Activity, Crown, Baby, Home as HomeIcon,
  Palette, Shirt, Plus, Heart, Smile, Paintbrush,
  Images, Info, Phone, Mail, BadgeCheck, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X,
  Pencil, Trash2, Check, Camera, Upload, Film, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ServiceModal from '../../components/Services/ServiceModal';
import UploadModal from '../../components/gallery/UploadModal';
import { useSalon } from '../../hooks/useSalon';
import { useGalleryUpload } from '../../context/GalleryUploadContext';
import api from '../../services/api';
import { uploadSalonPhotos } from '../../services/salonService';
import {
  getGalleryMediaUrl,
  hasRenderableGalleryMedia,
  isGalleryVideo,
  normalizeOwnerGalleryPayload,
} from '../../components/gallery/galleryUtils';
import {
  CATEGORY_CARD_IMAGE_MAP,
  getServiceImage,
  ALL_CATEGORY_ORDER,
} from '../../constants/salonCategories';

/* ─── helpers ────────────────────────────────────────────────────── */
const WH_DAYS   = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABEL = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };

const isOpenNow = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const n = new Date(); const nowM = n.getHours() * 60 + n.getMinutes();
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
};
const getTodayHours = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  return (!h || h.isClosed || !h.open || !h.close) ? null : `${h.open} – ${h.close}`;
};
const getOpensAt = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  return (!h || h.isClosed || !h.open) ? null : h.open;
};

const BIZ_THEME = {
  barbershop:    { p: '#6366f1', acc: '#818cf8', label: 'Barbershop',    ring: 'rgba(99,102,241,0.4)'  },
  salon:         { p: '#818cf8', acc: '#a5b4fc', label: 'Salon',         ring: 'rgba(129,140,248,0.4)' },
  spa_wellness:  { p: '#8b5cf6', acc: '#a78bfa', label: 'Spa & Wellness',ring: 'rgba(139,92,246,0.4)'  },
  makeup_bridal: { p: '#a78bfa', acc: '#c4b5fd', label: 'Makeup & Bridal',ring:'rgba(167,139,250,0.4)' },
  skin_derma:    { p: '#6366f1', acc: '#818cf8', label: 'Skin & Derma',  ring: 'rgba(99,102,241,0.4)'  },
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
  const full = Math.floor(rating); const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} style={{ width: size, height: size, flexShrink: 0,
          fill: i <= full ? '#FDE68A' : 'none',
          stroke: i <= full || (i === full+1 && half) ? '#FDE68A' : '#6b7280', strokeWidth: 1.5,
        }} />
      ))}
    </span>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />;
}

/* ─── tiny edit-pencil floating button ────────────────────────── */
function EditBtn({ onClick, label = 'Edit' }) {
  return (
    <button onClick={onClick} title={label}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
      <Pencil className="w-3 h-3" /> {label}
    </button>
  );
}

/* ─── Working-hours form (used inside Info edit panel) ─────────── */
function WHEditor({ wh, onChange }) {
  const base = { isClosed: false, open: '09:00', close: '20:00' };
  const get  = (day) => wh?.[day] || { ...base };
  const set  = (day, patch) => onChange({ ...wh, [day]: { ...get(day), ...patch } });
  return (
    <div className="space-y-1.5">
      {DAY_ORDER.map(day => {
        const h = get(day);
        return (
          <div key={day} className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8">{DAY_LABEL[day]}</span>
            <input type="checkbox" checked={!h.isClosed} onChange={e => set(day, { isClosed: !e.target.checked })}
              className="accent-indigo-600 shrink-0" />
            {!h.isClosed ? (
              <>
                <input type="time" value={h.open || '09:00'} onChange={e => set(day, { open: e.target.value })}
                  className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white" />
                <span className="text-gray-400 text-xs">–</span>
                <input type="time" value={h.close || '20:00'} onChange={e => set(day, { close: e.target.value })}
                  className="flex-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white" />
              </>
            ) : (
              <span className="text-xs text-red-400 ml-1">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: 'gallery',  label: 'Gallery',  Icon: Images  },
  { key: 'services', label: 'Services', Icon: Scissors },
  { key: 'reviews',  label: 'Reviews',  Icon: Star     },
  { key: 'info',     label: 'Info',     Icon: Info     },
];

/* ══════════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════════ */
export default function GlowLooxProfile() {
  const { salon, services, fetchSalon, fetchServices, updateSalon, createService, updateService, deleteService } = useSalon();
  const { enqueueUploads, lastCompletedAt } = useGalleryUpload();

  const biz = BIZ_THEME[salon?.businessType] || DEFAULT_BIZ;

  /* ── data ── */
  const [galleryItems, setGalleryItems] = useState([]);
  const [reviews,      setReviews]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  /* ── UI state ── */
  const [activeTab,    setActiveTab]    = useState('gallery');
  const [lightbox,     setLightbox]     = useState(null);
  const [bannerIdx,    setBannerIdx]    = useState(0);

  /* ── service accordion ── */
  const [expandedCats, setExpandedCats] = useState(() => new Set(['__all__']));

  /* ── service modal ── */
  const [svcModal,     setSvcModal]     = useState({ open: false, service: null });
  const [svcLoading,   setSvcLoading]   = useState(false);
  const [svcError,     setSvcError]     = useState('');

  /* ── gallery upload modal ── */
  const [uploadOpen,   setUploadOpen]   = useState(false);
  const [deleting,     setDeleting]     = useState(null);

  /* ── profile header edit panel ── */
  const [headerEdit,   setHeaderEdit]   = useState(false);
  const [headerForm,   setHeaderForm]   = useState({ name: '', tagline: '' });
  const [headerSaving, setHeaderSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef  = useRef(null);
  const avatarInputRef = useRef(null);

  /* ── info edit panel ── */
  const [infoEdit,     setInfoEdit]     = useState(null); // 'contact' | 'hours' | 'location'
  const [infoForm,     setInfoForm]     = useState({});
  const [infoSaving,   setInfoSaving]   = useState(false);

  const photoUrls   = galleryItems.filter(i => i.type === 'image').map(i => i.url);
  const coverPhoto  = salon?.profilePhoto || salon?.coverPhoto || photoUrls[0] || null;
  const bannerItems = galleryItems.filter(hasRenderableGalleryMedia);
  const avgRating   = salon?.averageRating || salon?.rating ? parseFloat(salon.averageRating || salon.rating) : null;
  const openStatus  = isOpenNow(salon?.workingHours);
  const todayHours  = getTodayHours(salon?.workingHours);
  const opensAt     = getOpensAt(salon?.workingHours);

  /* ── loaders ── */
  const loadGallery = useCallback(async () => {
    if (!salon?._id) return;
    try {
      const res = await api.get('/owner/gallery');
      const raw = res.data.data || [];
      setGalleryItems(raw.map(p => ({
        ...p,
        type: isGalleryVideo(p) ? 'video' : 'image',
      })).filter(hasRenderableGalleryMedia));
    } catch {}
  }, [salon?._id]);

  const loadReviews = useCallback(async () => {
    if (!salon?._id) return;
    try {
      const r = await api.get(`/public/salons/${salon._id}/reviews`);
      setReviews(r.data.data?.reviews || r.data.data || []);
    } catch {}
  }, [salon?._id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGallery(), loadReviews(), fetchServices()]);
    setLoading(false);
  }, [loadGallery, loadReviews, fetchServices]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { if (lastCompletedAt) loadGallery(); }, [lastCompletedAt, loadGallery]);

  /* banner auto-advance */
  useEffect(() => {
    if (bannerItems.length <= 1) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % bannerItems.length), 3500);
    return () => clearInterval(t);
  }, [bannerItems.length]);

  /* ── share ── */
  const handleShare = () => {
    if (navigator.share) navigator.share({ title: salon?.name || 'GlowLoox', url: window.location.href });
    else navigator.clipboard?.writeText(window.location.href);
  };

  /* ── delete gallery item ── */
  const handleDeleteMedia = async (item) => {
    if (!window.confirm('Delete this media?')) return;
    setDeleting(item._id);
    try {
      await api.delete(`/owner/gallery/${item._id}`);
      setGalleryItems(prev => prev.filter(i => i._id !== item._id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(null); }
  };

  /* ── gallery upload submit ── */
  const handleUploadSubmit = (files) => {
    enqueueUploads(files);
    setUploadOpen(false);
    toast.success('Uploading in background…');
  };

  /* ── service modal submit ── */
  const handleSvcSubmit = async (formData) => {
    setSvcLoading(true); setSvcError('');
    try {
      if (svcModal.service) {
        await updateService(svcModal.service._id || svcModal.service.id, formData);
        toast.success('Service updated');
      } else {
        await createService(formData);
        toast.success('Service added');
      }
      setSvcModal({ open: false, service: null });
      await fetchServices();
    } catch (err) { setSvcError(err.message || 'Failed to save'); }
    finally { setSvcLoading(false); }
  };

  const handleDeleteService = async (svc) => {
    if (!window.confirm(`Delete "${svc.name}"?`)) return;
    try {
      await deleteService(svc._id || svc.id);
      toast.success('Service deleted');
      await fetchServices();
    } catch { toast.error('Failed to delete'); }
  };

  /* ── header edit ── */
  const openHeaderEdit = () => {
    setHeaderForm({ name: salon?.name || '', tagline: salon?.tagline || '' });
    setHeaderEdit(true);
  };
  const saveHeader = async () => {
    if (!headerForm.name.trim()) return toast.error('Name is required');
    setHeaderSaving(true);
    try {
      await updateSalon({ name: headerForm.name.trim(), tagline: headerForm.tagline.trim() });
      await fetchSalon();
      setHeaderEdit(false);
      toast.success('Profile updated');
    } catch { toast.error('Failed to save'); }
    finally { setHeaderSaving(false); }
  };

  /* ── cover / avatar photo upload ── */
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const [url] = await uploadSalonPhotos([file]);
      await updateSalon({ coverPhoto: url });
      await fetchSalon();
      toast.success('Cover photo updated');
    } catch { toast.error('Failed to upload'); }
    finally { setCoverUploading(false); e.target.value = ''; }
  };
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const [url] = await uploadSalonPhotos([file]);
      await updateSalon({ profilePhoto: url });
      await fetchSalon();
      toast.success('Profile photo updated');
    } catch { toast.error('Failed to upload'); }
    finally { setCoverUploading(false); e.target.value = ''; }
  };

  /* ── info edit ── */
  const openInfoEdit = (section) => {
    const wh = salon?.workingHours || {};
    const initial = {
      contact:  { phone: salon?.phone || '', email: salon?.email || '' },
      hours:    { workingHours: { ...wh } },
      location: { address: salon?.address || '', locality: salon?.locality || '', city: salon?.city || '', state: salon?.state || '', pincode: salon?.pincode || '' },
    }[section];
    setInfoForm(initial);
    setInfoEdit(section);
  };
  const saveInfo = async () => {
    setInfoSaving(true);
    try {
      await updateSalon(infoForm);
      await fetchSalon();
      setInfoEdit(null);
      toast.success('Saved');
    } catch { toast.error('Failed to save'); }
    finally { setInfoSaving(false); }
  };

  /* ══════════════════════ TAB RENDERERS ═══════════════════════ */

  /* ── Gallery ── */
  const renderGallery = () => {
    if (loading) return <div className="p-4 grid grid-cols-3 gap-0.5">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="aspect-square" />)}</div>;
    return (
      <>
        {/* Upload buttons */}
        <div className="flex gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setUploadOpen(true)}
            style={{ borderColor: biz.p + '60', color: biz.p }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-semibold hover:opacity-80 transition-opacity">
            <Camera className="w-4 h-4" /> Add Photo
          </button>
          <button onClick={() => setUploadOpen(true)}
            style={{ borderColor: biz.p + '60', color: biz.p }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-semibold hover:opacity-80 transition-opacity">
            <Film className="w-4 h-4" /> Add Video
          </button>
        </div>

        {!galleryItems.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Images className="w-12 h-12 opacity-30" />
            <p className="font-semibold">No photos or videos yet</p>
            <button onClick={() => setUploadOpen(true)} style={{ backgroundColor: biz.p }} className="px-5 py-2 rounded-xl text-white text-sm font-semibold mt-1 hover:opacity-90 transition-opacity">
              <Upload className="w-3.5 h-3.5 inline mr-1.5" />Upload Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {galleryItems.map((item, i) => (
              <div key={item._id || i} className="relative aspect-square overflow-hidden group cursor-pointer">
                <img src={getGalleryMediaUrl(item)} alt="" onClick={() => setLightbox(i)}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {item.type === 'video' && (
                  <div onClick={() => setLightbox(i)} className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[10px] border-t-transparent border-b-transparent border-l-white ml-0.5" />
                    </div>
                  </div>
                )}
                {/* Delete overlay */}
                <button onClick={() => handleDeleteMedia(item)}
                  disabled={deleting === item._id}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                  {deleting === item._id
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3 h-3 text-white" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  /* ── Services ── */
  const renderServices = () => {
    if (loading) return (
      <div className="p-4 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="flex gap-3.5 p-3.5">
            <Skeleton className="w-[90px] h-[90px] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );

    const grouped = (services || []).reduce((acc, svc) => {
      const cat = svc.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(svc);
      return acc;
    }, {});

    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
      const ai = ALL_CATEGORY_ORDER.indexOf(a), bi = ALL_CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });

    return (
      <>
        {/* Add service button */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => setSvcModal({ open: true, service: null })}
            style={{ backgroundColor: biz.p }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {!sortedEntries.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Scissors className="w-12 h-12 opacity-30" />
            <p className="font-semibold">No services added yet</p>
          </div>
        ) : (
          <div>
            {sortedEntries.map(([cat, catServices]) => {
              const isOpen = expandedCats.has('__all__') || expandedCats.has(cat);
              const CatIcon = CAT_ICONS[cat] || Scissors;
              const catImg = CATEGORY_CARD_IMAGE_MAP[cat] || null;
              const minPrice = Math.min(...catServices.map(s => s.basePrice || s.price || 0));

              const toggleCat = () => setExpandedCats(prev => {
                const next = new Set(prev);
                next.delete('__all__');
                if (next.has(cat)) next.delete(cat); else next.add(cat);
                return next;
              });

              return (
                <div key={cat} className="overflow-hidden border-b border-gray-100 dark:border-white/[0.06]">
                  {/* Category header */}
                  <button onClick={toggleCat}
                    className="flex items-stretch gap-3.5 p-3.5 w-full text-left bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div style={{ background: biz.p + '18', borderColor: 'rgba(156,163,175,0.2)' }}
                      className="w-[90px] h-[90px] rounded-[14px] flex-shrink-0 overflow-hidden border flex items-center justify-center">
                      {catImg
                        ? <img src={catImg} alt={cat} className="w-full h-full object-cover block"
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        : <CatIcon style={{ color: biz.acc, opacity: 0.6 }} className="w-8 h-8" />
                      }
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-extrabold text-gray-900 dark:text-white leading-snug">{cat}</p>
                        <span style={{ color: biz.acc }} className="text-[15px] font-extrabold shrink-0 whitespace-nowrap">from ₹{minPrice}+</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 font-medium">{catServices.length} service{catServices.length !== 1 ? 's' : ''}</p>
                      <div className="flex items-center justify-end mt-2">
                        <div style={{ color: biz.acc }} className="flex items-center gap-1 text-xs font-bold">
                          {isOpen ? 'Hide' : 'View All'}
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Service rows */}
                  {isOpen && (
                    <div>
                      {catServices.map((svc, svcIdx) => {
                        const svcImg = getServiceImage(svc);
                        const price = svc.basePrice || svc.price || 0;
                        return (
                          <div key={svc._id || svcIdx}
                            className="flex items-stretch gap-3.5 p-3.5 border-t border-gray-100 dark:border-white/[0.06] group">
                            {/* Service image */}
                            <div style={{ background: biz.p + '18', borderColor: 'rgba(156,163,175,0.2)' }}
                              className="w-[90px] h-[90px] rounded-[14px] flex-shrink-0 overflow-hidden border flex items-center justify-center">
                              {svcImg
                                ? <img src={svcImg} alt={svc.name}
                                    className="w-full h-full object-cover opacity-0 transition-opacity duration-200"
                                    onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                                : <CatIcon style={{ color: biz.acc, opacity: 0.45 }} className="w-8 h-8" />
                              }
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug">{svc.name}</p>
                                <span style={{ color: biz.acc }} className="text-[15px] font-extrabold shrink-0 whitespace-nowrap">₹{price}+</span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  {svc.duration > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                      <Clock className="w-3 h-3" />
                                      {svc.duration >= 60 ? `${(svc.duration / 60).toFixed(1).replace('.0', '')} hrs` : `${svc.duration} min`}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {/* Owner edit/delete — hover only */}
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setSvcModal({ open: true, service: svc })}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteService(svc)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  {/* "+ ADD" as customer sees it (visual only) */}
                                  <div style={{ border: `1.5px solid ${biz.p}`, color: biz.acc }}
                                    className="rounded-lg text-[11px] font-extrabold tracking-wider px-3 py-1.5 select-none opacity-70">
                                    + ADD
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  /* ── Reviews ── */
  const renderReviews = () => {
    if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>;
    if (!reviews.length) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <Star className="w-12 h-12 opacity-30" />
        <p className="font-semibold">No reviews yet</p>
        <p className="text-sm opacity-60">Customer reviews appear here automatically</p>
      </div>
    );
    const avg  = (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1);
    const dist = [5,4,3,2,1].map(n => ({ n, count: reviews.filter(r => Math.round(r.rating) === n).length }));
    return (
      <div className="p-3 space-y-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex gap-6 items-start">
          <div className="text-center shrink-0">
            <p className="text-5xl font-black leading-none mb-1" style={{ color: '#FDE68A' }}>{avg}</p>
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
                    <div style={{ width: `${pct}%`, backgroundColor: biz.p }} className="h-full rounded-full" />
                  </div>
                  <span className="text-xs text-gray-400 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        {reviews.map((rev, i) => (
          <div key={rev._id || i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div style={{ backgroundColor: biz.p + '22', color: biz.acc }} className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                {(rev.customerName || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{rev.customerName || 'Customer'}</p>
                <StarRow rating={rev.rating || 0} size={11} />
              </div>
              <p className="text-xs text-gray-400 shrink-0">
                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
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

  /* ── Info ── */
  const renderInfo = () => {
    const wh = salon?.workingHours;
    /* ── contact edit inline ── */
    if (infoEdit === 'contact') return (
      <div className="p-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest">Edit Contact</p>
            <button onClick={() => setInfoEdit(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {[['Phone','phone','tel'],['Email','email','email']].map(([label, key, type]) => (
            <label key={key} className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</span>
              <input type={type} value={infoForm[key] || ''} onChange={e => setInfoForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </label>
          ))}
          <button onClick={saveInfo} disabled={infoSaving}
            style={{ backgroundColor: biz.p }} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
            {infoSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    );

    if (infoEdit === 'location') return (
      <div className="p-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest">Edit Location</p>
            <button onClick={() => setInfoEdit(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          {[['Street Address','address'],['Locality / Area','locality'],['City','city'],['State','state'],['Pincode','pincode']].map(([label, key]) => (
            <label key={key} className="block">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</span>
              <input value={infoForm[key] || ''} onChange={e => setInfoForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </label>
          ))}
          <button onClick={saveInfo} disabled={infoSaving}
            style={{ backgroundColor: biz.p }} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
            {infoSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    );

    if (infoEdit === 'hours') return (
      <div className="p-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest">Edit Hours</p>
            <button onClick={() => setInfoEdit(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <WHEditor wh={infoForm.workingHours} onChange={wh => setInfoForm(p => ({ ...p, workingHours: wh }))} />
          <button onClick={saveInfo} disabled={infoSaving}
            style={{ backgroundColor: biz.p }} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
            {infoSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    );

    /* ── read view ── */
    return (
      <div className="p-3 space-y-3">
        {/* Contact */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest">Contact</p>
            <EditBtn onClick={() => openInfoEdit('contact')} />
          </div>
          {salon?.phone && <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 mb-2"><Phone style={{ color: biz.acc }} className="w-4 h-4 shrink-0" /> {salon.phone}</div>}
          {salon?.email && <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"><Mail style={{ color: biz.acc }} className="w-4 h-4 shrink-0" /> {salon.email}</div>}
          {!salon?.phone && !salon?.email && <p className="text-xs text-gray-400">No contact info yet — tap Edit to add</p>}
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest">Location</p>
            <EditBtn onClick={() => openInfoEdit('location')} />
          </div>
          {(salon?.address || salon?.city)
            ? <div className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                <MapPin style={{ color: biz.acc }} className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{[salon?.address, salon?.locality, salon?.city, salon?.state, salon?.pincode].filter(Boolean).join(', ')}</span>
              </div>
            : <p className="text-xs text-gray-400">No location set — tap Edit to add</p>
          }
        </div>

        {/* Working hours */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest">Working Hours</p>
            <EditBtn onClick={() => openInfoEdit('hours')} />
          </div>
          {wh ? (
            <div className="space-y-1">
              {DAY_ORDER.map(day => {
                const h = wh[day]; if (!h) return null;
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
          ) : <p className="text-xs text-gray-400">No hours set — tap Edit to add</p>}
        </div>

        {/* Business type (read-only) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <p style={{ color: biz.p }} className="text-xs font-bold uppercase tracking-widest mb-3">Business Type</p>
          <span style={{ backgroundColor: biz.p + '15', color: biz.acc, borderColor: biz.p + '30' }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border">
            <Scissors className="w-3.5 h-3.5" /> {biz.label}
          </span>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="max-w-[480px] mx-auto bg-white dark:bg-[#0d0520] min-h-screen relative shadow-xl dark:shadow-none">

        {/* ── BANNER ── */}
        <div className="relative h-52 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {bannerItems.length > 0 ? (
            <img src={getGalleryMediaUrl(bannerItems[bannerIdx % bannerItems.length]) || ''} alt=""
              className="w-full h-full object-cover" />
          ) : (
            <div style={{ background: `radial-gradient(ellipse 70% 60% at 20% 40%, ${biz.p}44 0%, transparent 55%), ${biz.p}15` }}
              className="w-full h-full flex items-center justify-center">
              <Scissors style={{ color: biz.acc }} className="w-16 h-16 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

          {/* Customer View badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15">
            <Eye className="w-3 h-3" /> Customer View
          </div>

          {/* Cover photo change button */}
          <button onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            className="absolute top-3 right-12 w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            {coverUploading ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

          {/* Share */}
          <button onClick={handleShare}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {bannerItems.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {bannerItems.map((_, i) => (
                <div key={i} style={{ opacity: i === bannerIdx ? 1 : 0.4, backgroundColor: 'white' }}
                  className={`h-1 rounded-full transition-all duration-300 ${i === bannerIdx ? 'w-4' : 'w-1.5'}`} />
              ))}
            </div>
          )}
        </div>

        {/* ── PROFILE INFO ── */}
        <div className="px-4 -mt-8 relative z-10">
          <div className="flex items-end justify-between mb-3">
            {/* Avatar — clickable to change */}
            <div className="relative">
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
              <button onClick={() => avatarInputRef.current?.click()}
                style={{ backgroundColor: biz.p }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-[#0d0520]">
                <Camera className="w-3 h-3 text-white" />
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            {/* Stats */}
            <div className="flex gap-5 pb-1">
              {[
                { val: (services || []).length, label: 'Services' },
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

          {/* Header edit panel */}
          {headerEdit ? (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Business Name</span>
                <input value={headerForm.name} onChange={e => setHeaderForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tagline</span>
                <input value={headerForm.tagline} onChange={e => setHeaderForm(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="e.g. Precision cuts. Defined character."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
              </label>
              <div className="flex gap-2">
                <button onClick={() => setHeaderEdit(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Cancel
                </button>
                <button onClick={saveHeader} disabled={headerSaving}
                  style={{ backgroundColor: biz.p }} className="flex-1 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {headerSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">{salon?.name || '—'}</h1>
                {avgRating >= 4.5 && <BadgeCheck style={{ color: biz.p }} className="w-4 h-4 shrink-0" />}
                <button onClick={openHeaderEdit} className="ml-auto shrink-0">
                  <EditBtn label="Edit" />
                </button>
              </div>
              <div style={{ backgroundColor: biz.p + '18', borderColor: biz.p + '40', color: biz.acc }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border mb-2">
                <Scissors className="w-2.5 h-2.5" /> {biz.label}
              </div>
              {salon?.tagline && <p style={{ color: biz.acc }} className="text-xs mb-2">{salon.tagline}</p>}
            </>
          )}

          {/* Location + open */}
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

          {avgRating && (
            <div className="flex items-center gap-2 mb-4">
              <StarRow rating={avgRating} size={13} />
              <span className="text-sm font-bold text-yellow-300">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviews.length})</span>
            </div>
          )}
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-gray-100 dark:bg-white/[0.08]" />

        {/* ── STICKY TAB BAR ── */}
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-[#0d0520]/95 backdrop-blur-2xl border-b border-gray-100 dark:border-white/[0.08] flex">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setInfoEdit(null); }}
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
          {galleryItems[lightbox] && (
            <img src={getGalleryMediaUrl(galleryItems[lightbox])} alt=""
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()} />
          )}
          {galleryItems.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + galleryItems.length) % galleryItems.length); }}
                className="absolute left-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % galleryItems.length); }}
                className="absolute right-16 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
              <p className="absolute bottom-4 text-white/60 text-sm">{lightbox + 1} / {galleryItems.length}</p>
            </>
          )}
        </div>
      )}

      {/* ── SERVICE MODAL ── */}
      <ServiceModal
        isOpen={svcModal.open}
        onClose={() => { setSvcModal({ open: false, service: null }); setSvcError(''); }}
        service={svcModal.service}
        onSubmit={handleSvcSubmit}
        loading={svcLoading}
        error={svcError}
        salon={salon}
      />

      {/* ── UPLOAD MODAL ── */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUploadSubmit}
        salon={salon}
      />
    </DashboardLayout>
  );
}
