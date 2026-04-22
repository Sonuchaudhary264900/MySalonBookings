import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Clock, Star, Share2, Eye, Scissors, Sparkles,
  Waves, Wind, Activity, Crown, Baby, Home as HomeIcon,
  Palette, Shirt, Plus, Heart, Smile, Paintbrush,
  Images, Info, Phone, Mail, BadgeCheck, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X,
  Pencil, Trash2, Check, Camera, Upload, Film, Save,
  Zap, FileText, Layers, AlignLeft, Square, CheckSquare, Wand2, RefreshCw, ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ConfirmModal from '../../components/common/ConfirmModal';
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
  getCategoriesForSalonType,
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

const PRICE_CHIPS    = [50, 100, 150, 200, 300, 500, 800, 1000, 1500, 2000];
const DURATION_CHIPS = [10, 15, 20, 30, 45, 60, 90, 120];

const SUGGESTED_PRICES = {
  'Classic Haircut': [100,300], 'Trim / Maintenance Cut': [80,200], 'Kids Haircut': [80,200], 'Senior Citizen Haircut': [80,180],
  'Low Fade': [150,400], 'Mid Fade': [150,400], 'High Fade': [150,400], 'Taper Fade': [150,350],
  'Skin Fade / Bald Fade': [200,500], 'Buzz Cut': [100,250], 'Crew Cut': [100,280], 'Caesar Cut': [100,280],
  'Undercut': [200,500], 'Hair Tattoo / Design': [200,600], 'Line-up / Edge-up': [100,300],
  'Blow Dry': [100,300], 'Hair Wax Styling': [100,250], 'Party / Event Styling': [300,1000],
  'Beard Trim': [80,200], 'Beard Shaping': [100,250], 'Beard Fade': [150,350], 'Beard Sculpting': [150,400],
  'Basic Shave': [80,200], 'Hot Towel Shave': [150,400], 'Straight Razor Shave': [200,500], 'Royal Shave': [300,700],
  'Beard Spa': [300,800], 'Beard Smoothening': [500,1500],
  'Global Hair Colour': [400,2000], 'Highlights': [600,3000], 'Grey Coverage': [200,800], 'Balayage': [800,4000],
  'Hair Smoothening': [1500,6000], 'Keratin Treatment': [2000,8000], 'Hair Rebonding': [2000,8000],
  'Hair Spa': [400,1500], 'Deep Conditioning Treatment': [300,800], 'Anti-Dandruff Treatment': [300,1000],
  'Haircut (Layer / Step / Trim)': [200,800], 'Advanced Haircut': [500,2000], 'Fringe / Bangs Cut': [150,500],
  'Bridal Hairstyle': [1500,8000], 'Party Hairstyle': [500,2000],
  'Manicure': [200,600], 'Pedicure': [250,800], 'Gel Nails': [500,2000], 'Nail Art': [300,1500],
  'Nail Extensions': [800,3000], 'Acrylic Nails': [600,2500],
  'Clean-up': [150,400], 'Basic Facial': [300,800], 'Gold Facial': [800,2500],
  'Hydra Facial': [1500,5000], 'Anti-Aging Facial': [1000,4000], 'Diamond Facial': [800,2500],
  'Eyebrow Threading': [30,100], 'Upper Lip Threading': [20,60], 'Full Face Threading': [80,200],
  'Full Body Wax': [800,2500], 'Full Legs Wax': [300,900], 'Underarms Wax': [100,250],
  'Head Massage': [200,600], 'Full Body Massage': [800,3000], 'Swedish Massage': [1000,3500],
  'Deep Tissue Massage': [1200,4000], 'Thai Massage': [1000,3500], 'Hot Stone Massage': [1500,5000],
  'Body Spa': [1000,4000], 'Body Polishing': [800,2500], 'Body Scrub': [600,2000],
  'Bridal Makeup': [5000,25000], 'Party Makeup': [1500,8000], 'Engagement Makeup': [3000,15000],
  'General Skin Consultation': [500,2000], 'PRP Hair Therapy': [3000,10000],
};

function parseImportText(text) {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const raw = line.trim();
    const durMatch   = raw.match(/(\d{1,3})\s*(?:min|mins|minutes|m\b)/i);
    const priceMatch = raw.match(/(?:₹|rs\.?|inr|price[:\s]*)?(\d{2,5})(?=\s|$|\/|-|₹)/i);
    const duration   = durMatch  ? parseInt(durMatch[1])  : '';
    const price      = priceMatch ? parseInt(priceMatch[1]) : '';
    let name = raw
      .replace(/(?:₹|rs\.?|inr)\s*\d+/gi, '')
      .replace(/\d+\s*(?:min|mins|minutes|m\b)/gi, '')
      .replace(/\d{3,5}/g, '')
      .replace(/[-–|\/,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { name, price, duration };
  }).filter(s => s.name.length > 2);
}

/* ══════════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════════ */
export default function GlowLooxProfile() {
  const { salon, services, fetchSalon, fetchServices, updateSalon, createService, updateService, deleteService, bulkUpsertServices } = useSalon();
  const { enqueueUploads, lastCompletedAt } = useGalleryUpload();

  const biz = BIZ_THEME[salon?.businessType] || DEFAULT_BIZ;

  useEffect(() => { document.title = 'GlowLoox Profile — GlowLoox'; }, []);

  /* ── data ── */
  const [galleryItems, setGalleryItems] = useState([]);
  const [reviews,      setReviews]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  /* ── UI state ── */
  const [activeTab,    setActiveTab]    = useState('gallery');
  const [lightbox,     setLightbox]     = useState(null);
  const [bannerIdx,    setBannerIdx]    = useState(0);

  /* ── service catalog (from API, fallback to hardcoded) ── */
  const [catalogCats, setCatalogCats] = useState(null); // null = not yet loaded

  /* ── service drill-down nav ── */
  const [svcNavStack, setSvcNavStack] = useState([]);

  /* ── service modal ── */
  const [svcModal,     setSvcModal]     = useState({ open: false, service: null });
  const [svcLoading,   setSvcLoading]   = useState(false);
  const [svcError,     setSvcError]     = useState('');

  /* ── gallery upload modal ── */
  const [uploadOpen,      setUploadOpen]      = useState(false);
  const [confirmState,    setConfirmState]    = useState(null); // { type: 'media'|'service', item }
  const [deleting,        setDeleting]        = useState(null);
  const [togglingId,      setTogglingId]      = useState(null);
  const [uploadingSvcImg, setUploadingSvcImg] = useState(null);
  const [uploadingSecImg, setUploadingSecImg] = useState(null);
  const [savingSvc,       setSavingSvc]       = useState(null);
  const pendingImgSvcRef  = useRef(null);
  const pendingImgSecRef  = useRef(null);
  const svcImgInputRef    = useRef(null);
  const secImgInputRef    = useRef(null);
  const svcInputRefs      = useRef({});

  /* ── quick setup ── */
  const [quickSetup,      setQuickSetup]      = useState(false);
  const [setupStep,       setSetupStep]       = useState(1);
  const [setupSelected,   setSetupSelected]   = useState(new Set());
  const [setupPrice,      setSetupPrice]      = useState('');
  const [setupDuration,   setSetupDuration]   = useState('');
  const [setupSaving,     setSetupSaving]     = useState(false);

  /* ── bulk apply (level 1 & 2) ── */
  const [bulkPanel,       setBulkPanel]       = useState(false);
  const [bulkSelected,    setBulkSelected]    = useState(new Set()); // Set of svcName
  const [bulkPrice,       setBulkPrice]       = useState('');
  const [bulkDuration,    setBulkDuration]    = useState('');
  const [bulkImage,       setBulkImage]       = useState(''); // URL after upload
  const [bulkImgUploading, setBulkImgUploading] = useState(false);
  const [bulkApplying,    setBulkApplying]    = useState(false);
  const bulkImgInputRef   = useRef(null);

  /* ── import modal ── */
  const [importOpen,      setImportOpen]      = useState(false);
  const [importText,      setImportText]      = useState('');
  const [importParsed,    setImportParsed]    = useState([]);
  const [importStep,      setImportStep]      = useState('input'); // 'input' | 'preview'
  const [importSaving,    setImportSaving]    = useState(false);

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

  /* fetch catalog from API; fall back to hardcoded if empty or error */
  useEffect(() => {
    if (!salon?._id) return;
    api.get('/owner/catalog').then(res => {
      const cats = res.data?.data?.categories;
      if (cats && cats.length > 0) {
        setCatalogCats(cats);
      } else {
        setCatalogCats(getCategoriesForSalonType(salon.businessType || 'salon', salon.servedGender || 'unisex'));
      }
    }).catch(() => {
      setCatalogCats(getCategoriesForSalonType(salon?.businessType || 'salon', salon?.servedGender || 'unisex'));
    });
  }, [salon?._id, salon?.businessType, salon?.servedGender]); // eslint-disable-line

  /* auto-launch quick setup when owner has zero services */
  useEffect(() => {
    if (!loading && Array.isArray(services) && services.length === 0 && activeTab === 'services' && !quickSetup) {
      const cats = catalogCats || getCategoriesForSalonType(salon?.businessType || 'salon', salon?.servedGender || 'unisex');
      const top = new Set();
      cats.forEach(c => (c.sections?.[0]?.services || c.subServices || []).slice(0, 3).forEach(s => top.add(`${s}||${c.label}`)));
      setSetupSelected(top);
      setQuickSetup(true);
    }
  }, [loading, services, activeTab, catalogCats]); // eslint-disable-line

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

  /* ── quick setup submit ── */
  const handleQuickSetupApply = async () => {
    const price    = parseFloat(setupPrice);
    const duration = parseInt(setupDuration);
    if (!price || price <= 0)    return toast.error('Enter a valid price');
    if (!duration || duration <= 0) return toast.error('Enter a valid duration');
    setSetupSaving(true);
    try {
      const updates = [...setupSelected].map(key => {
        const [name, category] = key.split('||');
        return { name, category, basePrice: price, duration };
      });
      await bulkUpsertServices(updates);
      await fetchServices();
      setQuickSetup(false);
      toast.success(`${updates.length} services added!`);
    } catch { toast.error('Setup failed'); }
    finally { setSetupSaving(false); }
  };

  /* ── bulk apply ── */
  const handleBulkApply = async (catSvcMap, cat) => {
    const price    = parseFloat(bulkPrice);
    const duration = parseInt(bulkDuration);
    if (!price || price <= 0)    return toast.error('Enter a valid price');
    if (!duration || duration <= 0) return toast.error('Enter a valid duration');
    if (bulkSelected.size === 0) return toast.error('Select at least one service');
    setBulkApplying(true);
    try {
      const catMap  = catSvcMap[cat] || {};
      const updates = [...bulkSelected].map(name => {
        const existing = catMap[name];
        const base = existing
          ? { id: existing._id || existing.id, basePrice: price, duration }
          : { name, category: cat, basePrice: price, duration };
        if (bulkImage) base.photos = [bulkImage];
        return base;
      });
      await bulkUpsertServices(updates);
      await fetchServices();
      setBulkPanel(false);
      setBulkSelected(new Set());
      setBulkPrice('');
      setBulkDuration('');
      setBulkImage('');
      toast.success(`${updates.length} services updated`);
    } catch { toast.error('Bulk apply failed'); }
    finally { setBulkApplying(false); }
  };

  /* ── import save ── */
  const handleImportSave = async () => {
    const valid = importParsed.filter(r => r.name && r.price && r.category);
    if (!valid.length) return toast.error('No valid services to import');
    setImportSaving(true);
    try {
      const updates = valid.map(r => ({ name: r.name, category: r.category, basePrice: parseFloat(r.price), duration: parseInt(r.duration) || 30 }));
      await bulkUpsertServices(updates);
      await fetchServices();
      setImportOpen(false);
      setImportText('');
      setImportParsed([]);
      setImportStep('input');
      toast.success(`${updates.length} services imported`);
    } catch { toast.error('Import failed'); }
    finally { setImportSaving(false); }
  };

  /* ── apply section image to all services ── */
  const handleApplySectionImgToAll = async (secImgUrl, svcNames, cat, catSvcMap) => {
    if (!secImgUrl) return toast.error('No section image set');
    const catMap = catSvcMap[cat] || {};
    const toUpdate = svcNames.map(name => catMap[name]).filter(Boolean);
    if (!toUpdate.length) return toast.error('No added services in this section');
    try {
      await Promise.all(toUpdate.map(svc => updateService(svc._id || svc.id, { photos: [secImgUrl] })));
      await fetchServices();
      toast.success('Image applied to all services');
    } catch { toast.error('Failed'); }
  };

  /* ── delete gallery item ── */
  const handleDeleteMedia = (item) => setConfirmState({ type: 'media', item });
  const executeDeleteMedia = async () => {
    const item = confirmState?.item;
    setConfirmState(null);
    if (!item) return;
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

  const handleDeleteService = (svc) => setConfirmState({ type: 'service', item: svc });
  const executeDeleteService = async () => {
    const svc = confirmState?.item;
    setConfirmState(null);
    if (!svc) return;
    try {
      await deleteService(svc._id || svc.id);
      toast.success('Service deleted');
      await fetchServices();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggleActive = async (svc) => {
    const id = svc._id || svc.id;
    setTogglingId(id);
    try {
      await updateService(id, { isActive: svc.isActive === false ? true : false });
      await fetchServices();
    } catch { toast.error('Failed to update'); }
    finally { setTogglingId(null); }
  };

  const handleServiceImgUpload = async (e) => {
    const file = e.target.files?.[0];
    const svcId = pendingImgSvcRef.current;
    if (!file || !svcId) return;
    setUploadingSvcImg(svcId);
    try {
      const [url] = await uploadSalonPhotos([file]);
      await updateService(svcId, { photos: [url] });
      await fetchServices();
      toast.success('Image updated');
    } catch { toast.error('Failed to upload'); }
    finally { setUploadingSvcImg(null); pendingImgSvcRef.current = null; e.target.value = ''; }
  };

  const handleSectionImgUpload = async (e) => {
    const file = e.target.files?.[0];
    const secLabel = pendingImgSecRef.current;
    if (!file || !secLabel) return;
    setUploadingSecImg(secLabel);
    try {
      const [url] = await uploadSalonPhotos([file]);
      const existing = salon?.sectionImages || {};
      await updateSalon({ sectionImages: { ...existing, [secLabel]: url } });
      await fetchSalon();
      toast.success('Section image updated');
    } catch { toast.error('Failed to upload'); }
    finally { setUploadingSecImg(null); pendingImgSecRef.current = null; e.target.value = ''; }
  };

  const handleBulkImgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkImgUploading(true);
    try {
      const [url] = await uploadSalonPhotos([file]);
      setBulkImage(url);
    } catch { toast.error('Failed to upload image'); }
    finally { setBulkImgUploading(false); e.target.value = ''; }
  };

  const handleSaveInline = async (svcName, cat, existingSvc) => {
    const price    = parseFloat(svcInputRefs.current[`${svcName}_price`]?.value    || '0');
    const duration = parseInt(svcInputRefs.current[`${svcName}_duration`]?.value || '0', 10);
    if (!price || price < 0)     return toast.error('Enter a valid price');
    if (!duration || duration < 1) return toast.error('Enter a valid duration');
    setSavingSvc(svcName);
    try {
      if (existingSvc) {
        await updateService(existingSvc._id || existingSvc.id, { basePrice: price, duration });
        toast.success('Updated');
      } else {
        await createService({ name: svcName, category: cat, basePrice: price, duration });
        toast.success('Added');
      }
      await fetchServices();
    } catch { toast.error('Failed to save'); }
    finally { setSavingSvc(null); }
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
    if (loading) return <div className="p-4 grid grid-cols-3 lg:grid-cols-4 gap-0.5">{[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="aspect-square" />)}</div>;
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
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-0.5 sm:gap-1">
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
      <div className="p-4 space-y-2.5">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-white/[0.06]">
            <Skeleton className="w-1 h-9 rounded-full flex-shrink-0" style={{ width: 4 }} />
            <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-2.5 w-1/3" /></div>
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    );

    /* ── shared lookup ── */
    const catSvcMap = {};
    (services || []).forEach(svc => {
      const cat = svc.category || 'Other';
      if (!catSvcMap[cat]) catSvcMap[cat] = {};
      catSvcMap[cat][svc.name] = svc;
    });
    const menuCats   = catalogCats || getCategoriesForSalonType(salon?.businessType || 'salon', salon?.servedGender || 'unisex');
    const menuLabels = menuCats.map(c => c.label);

    /* ── reusable price/duration chip rows ── */
    const PriceChips = ({ value, onChange }) => (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {PRICE_CHIPS.map(v => (
          <button key={v} type="button" onClick={() => onChange(String(v))}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all"
            style={String(value) === String(v)
              ? { backgroundColor: biz.p, color: '#fff', borderColor: biz.p }
              : { backgroundColor: biz.p + '10', color: biz.acc, borderColor: biz.p + '30' }}>
            ₹{v}
          </button>
        ))}
      </div>
    );
    const DurChips = ({ value, onChange }) => (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {DURATION_CHIPS.map(v => (
          <button key={v} type="button" onClick={() => onChange(String(v))}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all"
            style={String(value) === String(v)
              ? { backgroundColor: biz.p, color: '#fff', borderColor: biz.p }
              : { backgroundColor: biz.p + '10', color: biz.acc, borderColor: biz.p + '30' }}>
            {v}m
          </button>
        ))}
      </div>
    );

    /* ══ QUICK SETUP WIZARD ══ */
    if (quickSetup) {
      const allMenuSvcs = menuCats.flatMap(c =>
        (c.sections || []).flatMap(s => s.services.map(n => ({ name: n, cat: c.label })))
        || (c.subServices || []).map(n => ({ name: n, cat: c.label }))
      );
      const toggleSetup = (key) => setSetupSelected(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      const toggleCat = (catLabel) => {
        const catSvcs = allMenuSvcs.filter(s => s.cat === catLabel).map(s => `${s.name}||${s.cat}`);
        const allIn = catSvcs.every(k => setupSelected.has(k));
        setSetupSelected(prev => {
          const next = new Set(prev);
          catSvcs.forEach(k => allIn ? next.delete(k) : next.add(k));
          return next;
        });
      };

      return (
        <div className="flex flex-col min-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
            <div>
              <p className="text-[14px] font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Wand2 style={{ color: biz.p }} className="w-4 h-4" />
                {setupStep === 1 ? 'Pick your services' : 'Set your base price'}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {setupStep === 1 ? `${setupSelected.size} selected · uncheck services you don't offer` : 'You can change individual prices later'}
              </p>
            </div>
            <button onClick={() => setQuickSetup(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-1.5 px-4 pt-3">
            {[1,2].map(s => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all"
                style={{ backgroundColor: s <= setupStep ? biz.p : '#e5e7eb' }} />
            ))}
          </div>

          {setupStep === 1 ? (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-4">
                {menuCats.map(mc => {
                  const svcs = (mc.sections || []).flatMap(s => s.services.map(n => ({ name: n, cat: mc.label })))
                    .concat((mc.subServices || []).filter(n => !(mc.sections || []).flatMap(s => s.services).includes(n)).map(n => ({ name: n, cat: mc.label })));
                  const keys = svcs.map(s => `${s.name}||${s.cat}`);
                  const allIn = keys.length > 0 && keys.every(k => setupSelected.has(k));
                  const someIn = keys.some(k => setupSelected.has(k));
                  return (
                    <div key={mc.label} className="rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-white/[0.07] overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                      <button onClick={() => toggleCat(mc.label)}
                        className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                        <div style={allIn ? { color: biz.p } : someIn ? { color: biz.acc, opacity: 0.6 } : { color: '#9ca3af' }}>
                          {allIn ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5" />}
                        </div>
                        <p className="flex-1 text-[13px] font-extrabold text-gray-900 dark:text-white text-left">{mc.label}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: biz.p + '18', color: biz.acc }}>
                          {keys.filter(k => setupSelected.has(k)).length}/{keys.length}
                        </span>
                      </button>
                      <div className="px-3.5 pb-3 flex flex-wrap gap-1.5">
                        {svcs.map(({ name, cat }) => {
                          const key = `${name}||${cat}`;
                          const on  = setupSelected.has(key);
                          return (
                            <button key={key} onClick={() => toggleSetup(key)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                              style={on
                                ? { backgroundColor: biz.p, color: '#fff', borderColor: biz.p }
                                : { backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.06]">
                <button onClick={() => setSetupStep(2)} disabled={setupSelected.size === 0}
                  style={{ backgroundColor: biz.p }}
                  className="w-full py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-40 flex items-center justify-center gap-2">
                  Continue with {setupSelected.size} services <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 p-4 space-y-5">
              <div>
                <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 mb-1">Base Price (₹)</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl px-3 py-2.5">
                  <span className="text-gray-400 font-bold">₹</span>
                  <input type="number" inputMode="numeric" value={setupPrice} onChange={e => setSetupPrice(e.target.value)}
                    placeholder="e.g. 200" className="flex-1 bg-transparent text-[15px] font-black text-gray-900 dark:text-white outline-none" />
                </div>
                <PriceChips value={setupPrice} onChange={setSetupPrice} />
              </div>
              <div>
                <p className="text-[12px] font-bold text-gray-500 dark:text-gray-400 mb-1">Duration (minutes)</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl px-3 py-2.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input type="number" inputMode="numeric" value={setupDuration} onChange={e => setSetupDuration(e.target.value)}
                    placeholder="e.g. 30" className="flex-1 bg-transparent text-[15px] font-black text-gray-900 dark:text-white outline-none" />
                </div>
                <DurChips value={setupDuration} onChange={setSetupDuration} />
              </div>
              <p className="text-[11px] text-gray-400 bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5">
                This sets the same price for all {setupSelected.size} selected services. You can edit individual prices after.
              </p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setSetupStep(1)}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-[13px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
                <button onClick={handleQuickSetupApply} disabled={setupSaving || !setupPrice || !setupDuration}
                  style={{ backgroundColor: biz.p }}
                  className="flex-[2] py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-40 flex items-center justify-center gap-2">
                  {setupSaving
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Setting up…</>
                    : <><Zap className="w-4 h-4" /> Add {setupSelected.size} services</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    /* ══ LEVEL 2 — services in a section ══ */
    if (svcNavStack.length === 2) {
      const { cat, menuCat } = svcNavStack[0];
      const { section }      = svcNavStack[1];
      const catByName        = catSvcMap[cat] || {};
      const CatIcon          = CAT_ICONS[cat] || Scissors;
      const allSvcNames      = section.services;
      const allSelected      = allSvcNames.length > 0 && allSvcNames.every(n => bulkSelected.has(n));

      return (
        <div>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.06] sticky top-[49px] bg-white/95 dark:bg-[#0d0520]/95 backdrop-blur-xl z-20">
            <button onClick={() => { setSvcNavStack(prev => prev.slice(0, 1)); setBulkPanel(false); setBulkSelected(new Set()); setBulkImage(''); }}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-extrabold text-gray-900 dark:text-white truncate">{section.label}</p>
              <p className="text-[11px] text-gray-400">{section.services.length} services</p>
            </div>
            {/* Bulk select all toggle */}
            <button onClick={() => {
              if (allSelected) { setBulkSelected(new Set()); }
              else { setBulkSelected(new Set(allSvcNames)); }
            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all"
              style={allSelected
                ? { backgroundColor: biz.p, color: '#fff', borderColor: biz.p }
                : { color: biz.acc, borderColor: biz.p + '40', backgroundColor: biz.p + '0d' }}>
              <Layers className="w-3.5 h-3.5" /> {allSelected ? 'Deselect' : 'Select all'}
            </button>
          </div>

          <div className="p-3 space-y-2 pb-28">
            {section.services.map(svcName => {
              const svc          = catByName[svcName];
              const isAdded      = !!svc;
              const isActive     = isAdded ? svc.isActive !== false : false;
              const isToggling   = isAdded && togglingId === (svc._id || svc.id);
              const isSaving     = savingSvc === svcName;
              const isUploadImg  = isAdded && uploadingSvcImg === (svc._id || svc.id);
              const catalogDetail = menuCats.find(mc => mc.label === cat)?.serviceDetails?.[svcName];
              const imgUrl       = isAdded
                ? (svc.photos?.[0] || catalogDetail?.defaultImage || getServiceImage(svc))
                : (catalogDetail?.defaultImage || getServiceImage({ name: svcName, category: cat }));
              const isChecked    = bulkSelected.has(svcName);
              const catalogHints = catalogDetail?.priceHints;
              const hint         = catalogHints?.length >= 2
                ? [catalogHints[0], catalogHints[catalogHints.length - 1]]
                : SUGGESTED_PRICES[svcName];

              return (
                <div key={svcName}
                  className={`rounded-2xl bg-white dark:bg-gray-900/50 border overflow-hidden transition-all ${isChecked ? '' : ''} ${isAdded && !isActive ? 'opacity-60' : ''}`}
                  style={{ borderColor: isChecked ? biz.p : undefined, boxShadow: isChecked ? `0 0 0 2px ${biz.p}40` : '0 1px 8px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-3 p-3.5">

                    {/* Checkbox */}
                    <button onClick={() => setBulkSelected(prev => { const n = new Set(prev); n.has(svcName) ? n.delete(svcName) : n.add(svcName); return n; })}
                      className="shrink-0 transition-colors" style={{ color: isChecked ? biz.p : '#d1d5db' }}>
                      {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>

                    {/* Thumb + camera overlay */}
                    <div className="relative w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden group/img border"
                      style={{ background: biz.p + '14', borderColor: biz.p + '20' }}>
                      {imgUrl
                        ? <img src={imgUrl} alt={svcName}
                            className="w-full h-full object-cover opacity-0 transition-opacity duration-200"
                            onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                            onError={e => { e.currentTarget.style.display = 'none'; }} />
                        : <CatIcon style={{ color: biz.acc, opacity: 0.5 }} className="w-5 h-5 absolute inset-0 m-auto" />
                      }
                      {isAdded && (
                        <button onClick={() => { pendingImgSvcRef.current = svc._id || svc.id; svcImgInputRef.current?.click(); }}
                          className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          {isUploadImg
                            ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            : <Camera className="w-3 h-3 text-white" />}
                        </button>
                      )}
                    </div>

                    {/* Name + inputs */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-bold truncate mb-1.5 ${isAdded && !isActive ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{svcName}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 flex-1 min-w-0 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-2 py-1">
                          <span className="text-[10px] text-gray-400 shrink-0">₹</span>
                          <input
                            key={isAdded ? `${svc._id}-p-${svc.basePrice}` : `${svcName}-p`}
                            ref={el => { if (el) svcInputRefs.current[`${svcName}_price`] = el; }}
                            type="number" inputMode="numeric"
                            defaultValue={isAdded ? String(svc.basePrice || svc.price || '') : ''}
                            placeholder={hint ? `${hint[0]}–${hint[1]}` : 'Price'}
                            className="w-full bg-transparent text-[11px] font-bold text-gray-900 dark:text-white outline-none min-w-0" />
                        </div>
                        <div className="flex items-center gap-1 flex-1 min-w-0 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-lg px-2 py-1">
                          <Clock className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                          <input
                            key={isAdded ? `${svc._id}-d-${svc.duration}` : `${svcName}-d`}
                            ref={el => { if (el) svcInputRefs.current[`${svcName}_duration`] = el; }}
                            type="number" inputMode="numeric"
                            defaultValue={isAdded ? String(svc.duration || '') : ''}
                            placeholder="min"
                            className="w-full bg-transparent text-[11px] font-bold text-gray-900 dark:text-white outline-none min-w-0" />
                        </div>
                      </div>
                      {hint && !isAdded && (
                        <p className="text-[10px] text-gray-400 mt-1">Avg ₹{hint[0]}–₹{hint[1]}</p>
                      )}
                    </div>

                    {/* Right controls */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {isAdded && (
                        <button onClick={() => handleToggleActive(svc)} disabled={isToggling}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 disabled:opacity-50"
                          style={{ backgroundColor: isActive ? biz.p : '#d1d5db' }}>
                          {isToggling
                            ? <span className="absolute inset-0 flex items-center justify-center"><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /></span>
                            : <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                          }
                        </button>
                      )}
                      <button onClick={() => handleSaveInline(svcName, cat, svc)} disabled={isSaving}
                        style={{ backgroundColor: biz.p }}
                        className="px-3 py-1 rounded-lg text-white text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60 min-w-[44px] flex items-center justify-center gap-1">
                        {isSaving ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : isAdded ? 'Save' : 'Add'}
                      </button>
                      {isAdded && (
                        <button onClick={() => handleDeleteService(svc)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-400 hover:bg-red-100 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <input ref={svcImgInputRef} type="file" accept="image/*" className="hidden" onChange={handleServiceImgUpload} />
          <input ref={bulkImgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBulkImgUpload} />

          {/* ── Sticky bulk bar ── */}
          {bulkSelected.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-4 pt-2 bg-white/95 dark:bg-[#0d0520]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/[0.08] shadow-2xl">
              <div className="max-w-[480px] mx-auto space-y-2.5">
                <p className="text-[12px] font-black text-gray-700 dark:text-gray-200">
                  Apply to <span style={{ color: biz.p }}>{bulkSelected.size}</span> selected services
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-bold shrink-0">₹</span>
                    <input type="number" inputMode="numeric" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)}
                      placeholder="Price" className="w-full bg-transparent text-[13px] font-black text-gray-900 dark:text-white outline-none" />
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.1] rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <input type="number" inputMode="numeric" value={bulkDuration} onChange={e => setBulkDuration(e.target.value)}
                      placeholder="min" className="w-full bg-transparent text-[13px] font-black text-gray-900 dark:text-white outline-none" />
                  </div>
                  <button onClick={() => bulkImgInputRef.current?.click()}
                    className="w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center overflow-hidden relative"
                    style={{ borderColor: biz.p + '40', backgroundColor: bulkImage ? 'transparent' : biz.p + '0d' }}>
                    {bulkImgUploading
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: biz.acc }} />
                      : bulkImage
                        ? <img src={bulkImage} alt="" className="w-full h-full object-cover" />
                        : <ImageIcon className="w-3.5 h-3.5" style={{ color: biz.acc }} />}
                  </button>
                  <button onClick={() => handleBulkApply(catSvcMap, cat)} disabled={bulkApplying}
                    style={{ backgroundColor: biz.p }}
                    className="px-4 py-2 rounded-xl text-white text-[13px] font-black disabled:opacity-60 flex items-center gap-1.5">
                    {bulkApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Apply
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {PRICE_CHIPS.slice(0,6).map(v => (
                    <button key={v} onClick={() => setBulkPrice(String(v))}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all"
                      style={bulkPrice === String(v) ? { backgroundColor: biz.p, color:'#fff', borderColor: biz.p } : { color: biz.acc, borderColor: biz.p+'30', backgroundColor: biz.p+'0d' }}>
                      ₹{v}
                    </button>
                  ))}
                  {DURATION_CHIPS.slice(0,5).map(v => (
                    <button key={`d${v}`} onClick={() => setBulkDuration(String(v))}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all"
                      style={bulkDuration === String(v) ? { backgroundColor: biz.p, color:'#fff', borderColor: biz.p } : { color: biz.acc, borderColor: biz.p+'30', backgroundColor: biz.p+'0d' }}>
                      {v}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    /* ══ LEVEL 1 — sections in a category ══ */
    if (svcNavStack.length === 1) {
      const { cat, menuCat } = svcNavStack[0];
      const catByName  = catSvcMap[cat] || {};
      const sections   = menuCat?.sections || (menuCat?.subServices ? [{ label: 'All Services', services: menuCat.subServices }] : []);
      const orphanSvcs = Object.values(catByName).filter(s => !menuCat?.subServices?.includes(s.name));
      const allSecSvcs = sections.flatMap(s => s.services);

      return (
        <div>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.06] sticky top-[49px] bg-white/95 dark:bg-[#0d0520]/95 backdrop-blur-xl z-20">
            <button onClick={() => { setSvcNavStack([]); setBulkPanel(false); }}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-extrabold text-gray-900 dark:text-white truncate">{cat}</p>
              <p className="text-[11px] text-gray-400">{sections.length} sections · {Object.keys(catByName).length} added</p>
            </div>
            <button onClick={() => { setBulkPanel(p => !p); setBulkSelected(new Set(allSecSvcs)); setBulkPrice(''); setBulkDuration(''); setBulkImage(''); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all"
              style={bulkPanel ? { backgroundColor: biz.p, color:'#fff', borderColor: biz.p } : { color: biz.acc, borderColor: biz.p+'40', backgroundColor: biz.p+'0d' }}>
              <Layers className="w-3.5 h-3.5" /> Bulk Apply
            </button>
          </div>

          {/* ── Bulk Apply Panel (Level 1) ── */}
          {bulkPanel && (
            <div className="mx-3 mt-3 rounded-2xl border p-4 space-y-3" style={{ borderColor: biz.p + '30', backgroundColor: biz.p + '08' }}>
              <p className="text-[12px] font-black" style={{ color: biz.acc }}>Apply to whole category</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-400 font-bold">₹</span>
                  <input type="number" inputMode="numeric" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)}
                    placeholder="Price for all" className="flex-1 bg-transparent text-[13px] font-black text-gray-900 dark:text-white outline-none" />
                </div>
                <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <input type="number" inputMode="numeric" value={bulkDuration} onChange={e => setBulkDuration(e.target.value)}
                    placeholder="min" className="flex-1 bg-transparent text-[13px] font-black text-gray-900 dark:text-white outline-none" />
                </div>
              </div>
              <PriceChips value={bulkPrice} onChange={setBulkPrice} />
              <DurChips  value={bulkDuration} onChange={setBulkDuration} />
              {/* Bulk image */}
              <div className="flex items-center gap-2.5">
                <button onClick={() => bulkImgInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all"
                  style={{ borderColor: biz.p + '40', color: biz.acc, backgroundColor: biz.p + '0d' }}>
                  {bulkImgUploading
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <ImageIcon className="w-3.5 h-3.5" />}
                  {bulkImage ? 'Change image' : 'Add image (optional)'}
                </button>
                {bulkImage && (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                    <img src={bulkImage} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setBulkImage('')}
                      className="absolute top-0 right-0 w-4 h-4 bg-black/60 flex items-center justify-center rounded-bl-lg">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                )}
              </div>
              {/* Service selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Select services to apply to:</p>
                  <button onClick={() => setBulkSelected(prev => prev.size === allSecSvcs.length ? new Set() : new Set(allSecSvcs))}
                    className="text-[10px] font-bold" style={{ color: biz.acc }}>
                    {bulkSelected.size === allSecSvcs.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {allSecSvcs.map(name => {
                    const on = bulkSelected.has(name);
                    return (
                      <button key={name} onClick={() => setBulkSelected(prev => { const n = new Set(prev); on ? n.delete(name) : n.add(name); return n; })}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                        style={on ? { backgroundColor: biz.p, color: '#fff', borderColor: biz.p } : { backgroundColor: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => handleBulkApply(catSvcMap, cat)} disabled={bulkApplying || bulkSelected.size === 0}
                style={{ backgroundColor: biz.p }}
                className="w-full py-2.5 rounded-xl text-white text-[13px] font-black disabled:opacity-40 flex items-center justify-center gap-2">
                {bulkApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Apply to {bulkSelected.size} services
              </button>
            </div>
          )}

          <div className="p-3 space-y-2 pb-8">
            {sections.map(sec => {
              const addedCount  = sec.services.filter(n => catByName[n]).length;
              const activeCount = sec.services.filter(n => catByName[n] && catByName[n].isActive !== false).length;
              const secImgUrl   = salon?.sectionImages?.[sec.label]
                || getServiceImage({ name: sec.services[0] || '', category: cat });
              const isUploadingSec = uploadingSecImg === sec.label;
              return (
                <div key={sec.label}
                  className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-white/[0.07] text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}
                  onClick={() => setSvcNavStack(prev => [...prev, { section: sec }])}>
                  <div className="relative w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden group/secimg border"
                    style={{ background: biz.p + '14', borderColor: biz.p + '20' }}
                    onClick={e => e.stopPropagation()}>
                    {isUploadingSec
                      ? <div className="w-full h-full flex items-center justify-center"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" /></div>
                      : secImgUrl
                        ? <img src={secImgUrl} alt={sec.label} className="w-full h-full object-cover opacity-0 transition-opacity duration-200" onLoad={e => { e.target.style.opacity = 1; }} />
                        : <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 opacity-30" style={{ color: biz.acc }} /></div>
                    }
                    <div className="absolute bottom-0 right-0 flex flex-col gap-1 p-1" onClick={e => e.stopPropagation()}>
                      <button title="Upload photo"
                        className="w-5 h-5 bg-black/55 rounded-md flex items-center justify-center opacity-0 group-hover/secimg:opacity-100 transition-opacity"
                        onClick={() => { pendingImgSecRef.current = sec.label; secImgInputRef.current?.click(); }}>
                        <Camera className="w-3 h-3 text-white" />
                      </button>
                      {salon?.sectionImages?.[sec.label] && addedCount > 0 && (
                        <button title="Apply image to all services"
                          className="w-5 h-5 bg-black/55 rounded-md flex items-center justify-center opacity-0 group-hover/secimg:opacity-100 transition-opacity"
                          onClick={() => handleApplySectionImgToAll(salon.sectionImages[sec.label], sec.services, cat, catSvcMap)}>
                          <Layers className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold text-gray-900 dark:text-white">{sec.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {addedCount > 0 ? <>{activeCount} active · {addedCount}/{sec.services.length} added</> : <span className="italic">Tap to set prices</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {addedCount > 0 && (
                      <span style={{ backgroundColor: biz.p + '18', color: biz.acc }} className="text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {addedCount}/{sec.services.length}
                      </span>
                    )}
                    <ChevronRight style={{ color: biz.acc }} className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
            {orphanSvcs.length > 0 && (
              <button onClick={() => setSvcNavStack(prev => [...prev, { section: { label: 'Custom Services', services: orphanSvcs.map(s => s.name) } }])}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-white/[0.07] text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ backgroundColor: biz.p }} className="w-1 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-extrabold text-gray-900 dark:text-white">Custom Services</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{orphanSvcs.length} added manually</p>
                </div>
                <ChevronRight style={{ color: biz.acc }} className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
          <input ref={secImgInputRef} type="file" accept="image/*" className="hidden" onChange={handleSectionImgUpload} />
        </div>
      );
    }

    /* ══ LEVEL 0 — category list ══ */
    const allCatLabels = [...menuLabels, ...Object.keys(catSvcMap).filter(l => !menuLabels.includes(l))];
    const totalAdded   = (services || []).length;
    const totalActive  = (services || []).filter(s => s.isActive !== false).length;
    const totalInMenu  = menuCats.reduce((s, c) => s + (c.subServices?.length || 0), 0);
    const pct          = totalInMenu > 0 ? Math.round((totalAdded / totalInMenu) * 100) : 0;

    return (
      <>
        {/* ── Header row ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <div>
            <p className="text-[13px] font-black text-gray-900 dark:text-white">{totalAdded} Services Added</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{totalActive} active · {totalAdded - totalActive} off</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setImportOpen(true)}
              style={{ color: biz.acc, borderColor: biz.p + '40', backgroundColor: biz.p + '0d' }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all hover:opacity-80">
              <FileText className="w-3.5 h-3.5" /> Import
            </button>
            <button onClick={() => setSvcModal({ open: true, service: null })}
              style={{ color: biz.p, borderColor: biz.p + '50', backgroundColor: biz.p + '0d' }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all hover:opacity-80">
              <Plus className="w-3.5 h-3.5" /> Custom
            </button>
          </div>
        </div>

        {/* ── Progress bar ── */}
        {totalInMenu > 0 && (
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">Menu completion</p>
              <p className="text-[11px] font-black" style={{ color: biz.acc }}>{pct}%</p>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: biz.p }} />
            </div>
            {pct < 50 && (
              <p className="text-[10px] text-gray-400 mt-1">{totalInMenu - totalAdded} services still need prices</p>
            )}
          </div>
        )}

        {/* ── Quick setup banner (if < 5 services) ── */}
        {totalAdded < 5 && totalInMenu > 0 && (
          <button onClick={() => { setSetupStep(1); setQuickSetup(true); }}
            className="mx-3 mt-3 w-[calc(100%-1.5rem)] flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all hover:opacity-90"
            style={{ borderColor: biz.p + '40', backgroundColor: biz.p + '0a' }}>
            <Wand2 style={{ color: biz.p }} className="w-5 h-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold" style={{ color: biz.acc }}>Quick Setup</p>
              <p className="text-[11px] text-gray-400">Add all your services with one base price in 60 seconds</p>
            </div>
            <ChevronRight style={{ color: biz.acc }} className="w-4 h-4 shrink-0" />
          </button>
        )}

        <div className="p-3 space-y-2.5 pb-8">
          {allCatLabels.map(cat => {
            const menuCat    = menuCats.find(c => c.label === cat);
            const catByName  = catSvcMap[cat] || {};
            const addedInCat = Object.values(catByName);
            const activeCount = addedInCat.filter(s => s.isActive !== false).length;
            const minPrice    = addedInCat.length ? Math.min(...addedInCat.map(s => s.basePrice || s.price || 0)) : null;
            const catTotal    = menuCat?.subServices?.length || 0;
            const CatIcon     = CAT_ICONS[cat] || Scissors;
            const catImg      = CATEGORY_CARD_IMAGE_MAP[cat] || null;
            const hasAny      = addedInCat.length > 0;

            return (
              <button key={cat}
                onClick={() => setSvcNavStack([{ cat, menuCat }])}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-white/[0.07] text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ backgroundColor: hasAny ? biz.p : '#d1d5db' }} className="w-1 h-9 rounded-full shrink-0" />
                <div style={{ background: biz.p + '18', borderColor: biz.p + '25' }}
                  className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden border flex items-center justify-center">
                  {catImg
                    ? <img src={catImg} alt={cat} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : <CatIcon style={{ color: biz.acc, opacity: 0.7 }} className="w-5 h-5" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-extrabold leading-tight ${!hasAny ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>{cat}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {hasAny
                      ? <>{activeCount} active · {addedInCat.length}{catTotal > 0 ? `/${catTotal}` : ''} added · <span style={{ color: biz.acc }} className="font-semibold">from ₹{minPrice}</span></>
                      : <span className="italic">Tap to add services</span>
                    }
                  </p>
                </div>
                <ChevronRight style={{ color: biz.acc }} className="w-4 h-4 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* ══ IMPORT MODAL ══ */}
        {importOpen && (
          <div className="fixed inset-0 z-[9998] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white dark:bg-[#0d0520] rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08] shrink-0">
                <p className="text-[15px] font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText style={{ color: biz.p }} className="w-4 h-4" /> Import Price List
                </p>
                <button onClick={() => { setImportOpen(false); setImportStep('input'); setImportText(''); setImportParsed([]); }}
                  className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              {importStep === 'input' ? (
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    Paste your price list in any format — WhatsApp message, notes, anything.
                  </p>
                  <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl p-3 text-[11px] text-gray-400 space-y-0.5 font-mono">
                    <p>Classic Haircut - ₹200 - 30min</p>
                    <p>Beard Trim Rs150 20 min</p>
                    <p>Low Fade | 350 | 45</p>
                  </div>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Paste your price list here…"
                    rows={8}
                    className="w-full px-3.5 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 resize-none font-medium"
                  />
                  <button onClick={() => {
                    const parsed = parseImportText(importText);
                    if (!parsed.length) return toast.error('Nothing found to parse');
                    // Auto-match to menu service names
                    const allNames = menuCats.flatMap(c => c.subServices || []);
                    const allCatMap = {};
                    menuCats.forEach(c => (c.subServices || []).forEach(n => { allCatMap[n.toLowerCase()] = { name: n, cat: c.label }; }));
                    const matched = parsed.map(row => {
                      const exact = allCatMap[row.name.toLowerCase()];
                      if (exact) return { ...row, name: exact.name, category: exact.cat };
                      const partial = Object.keys(allCatMap).find(k => k.includes(row.name.toLowerCase()) || row.name.toLowerCase().includes(k.split(' ')[0]));
                      return partial ? { ...row, name: allCatMap[partial].name, category: allCatMap[partial].cat } : { ...row, category: 'General' };
                    });
                    setImportParsed(matched);
                    setImportStep('preview');
                  }} disabled={!importText.trim()}
                    style={{ backgroundColor: biz.p }}
                    className="w-full py-3 rounded-xl text-white font-bold text-[14px] disabled:opacity-40 flex items-center justify-center gap-2">
                    <AlignLeft className="w-4 h-4" /> Parse & Preview
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">{importParsed.length} services found · review and edit before saving</p>
                  <div className="space-y-2">
                    {importParsed.map((row, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <input value={row.name} onChange={e => setImportParsed(prev => prev.map((r,j) => j===i ? {...r, name: e.target.value} : r))}
                            className="w-full bg-transparent text-[12px] font-bold text-gray-900 dark:text-white outline-none" />
                          <p className="text-[10px] text-gray-400">{row.category || 'General'}</p>
                        </div>
                        <input value={row.price} onChange={e => setImportParsed(prev => prev.map((r,j) => j===i ? {...r, price: e.target.value} : r))}
                          placeholder="₹" type="number"
                          className="w-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[12px] font-bold text-gray-900 dark:text-white outline-none text-center" />
                        <input value={row.duration} onChange={e => setImportParsed(prev => prev.map((r,j) => j===i ? {...r, duration: e.target.value} : r))}
                          placeholder="min" type="number"
                          className="w-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[12px] font-bold text-gray-900 dark:text-white outline-none text-center" />
                        <button onClick={() => setImportParsed(prev => prev.filter((_,j) => j !== i))} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setImportStep('input')}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] font-bold text-gray-600 dark:text-gray-300">
                      Back
                    </button>
                    <button onClick={handleImportSave} disabled={importSaving}
                      style={{ backgroundColor: biz.p }}
                      className="flex-[2] py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-40 flex items-center justify-center gap-2">
                      {importSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Save {importParsed.filter(r => r.name && r.price).length} services
                    </button>
                  </div>
                </div>
              )}
            </div>
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

  /* shared profile info block — used in both mobile stacked and desktop sidebar */
  const renderProfileInfo = () => (
    <>
      {/* Avatar row */}
      <div className="flex items-end justify-between mb-3">
        <div className="relative">
          <div style={{ borderColor: biz.p, boxShadow: `0 4px 20px ${biz.ring}` }}
            className="w-[72px] h-[72px] lg:w-20 lg:h-20 rounded-full border-[3px] overflow-hidden bg-white dark:bg-gray-900 shrink-0">
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
        {/* Stats: horizontal on mobile, vertical on desktop sidebar */}
        <div className="flex gap-5 pb-1 lg:hidden">
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

      {/* Stats: shown only on desktop, below avatar */}
      <div className="hidden lg:flex gap-4 mb-4 border border-gray-100 dark:border-white/[0.08] rounded-2xl p-3">
        {[
          { val: (services || []).length, label: 'Services' },
          { val: salon?.totalBookings >= 1000 ? `${(salon.totalBookings/1000).toFixed(1)}k` : (salon?.totalBookings || 0), label: 'Customers' },
          { val: salon?.followersCount || 0, label: 'Followers' },
        ].map(({ val, label }, idx, arr) => (
          <div key={label} className={`flex-1 text-center ${idx < arr.length - 1 ? 'border-r border-gray-100 dark:border-white/[0.08]' : ''}`}>
            <p className="text-[15px] font-black text-gray-900 dark:text-white">{val}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Name / tagline edit */}
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
            <h1 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight leading-tight">{salon?.name || '—'}</h1>
            {avgRating >= 4.5 && <BadgeCheck style={{ color: biz.p }} className="w-4 h-4 shrink-0" />}
            <EditBtn onClick={openHeaderEdit} label="Edit" />
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
        <div className="flex items-center gap-2 mb-1">
          <StarRow rating={avgRating} size={13} />
          <span className="text-sm font-bold text-yellow-300">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({reviews.length})</span>
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout>
      {/* ── outer shell: phone-width on mobile, full-width card on desktop ── */}
      <div className="max-w-[480px] lg:max-w-5xl mx-auto bg-white dark:bg-[#0d0520] min-h-screen relative shadow-xl dark:shadow-none">

        {/* ── BANNER ── */}
        <div className="relative h-52 lg:h-64 overflow-hidden bg-gray-100 dark:bg-gray-900">
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

          {/* Cover photo change */}
          <button onClick={() => coverInputRef.current?.click()} disabled={coverUploading}
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

        {/* ══ BODY: mobile=stacked, desktop=two-column ══ */}
        <div className="lg:flex lg:items-start">

          {/* ── LEFT SIDEBAR (desktop) / stacked profile info (mobile) ── */}
          <div className="lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:self-start lg:border-r lg:border-gray-100 dark:lg:border-white/[0.08] lg:min-h-screen">

            {/* Profile info */}
            <div className="px-4 -mt-8 relative z-10 lg:mt-0 lg:pt-5 lg:px-5 lg:pb-4">
              {renderProfileInfo()}
            </div>

            {/* Divider: mobile only */}
            <div className="h-px bg-gray-100 dark:bg-white/[0.08] lg:hidden" />

            {/* Vertical tab nav: desktop only */}
            <div className="hidden lg:block px-3 py-2 border-t border-gray-100 dark:border-white/[0.08]">
              {TABS.map(tab => (
                <button key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setInfoEdit(null); setSvcNavStack([]); }}
                  style={activeTab === tab.key ? { backgroundColor: biz.p + '12', color: biz.acc } : {}}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors text-left
                    ${activeTab === tab.key ? '' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]'}`}>
                  <tab.Icon className="w-[18px] h-[18px] shrink-0" style={activeTab === tab.key ? { color: biz.acc } : {}} />
                  <span className={`text-[13px] font-bold ${activeTab === tab.key ? '' : ''}`}>{tab.label}</span>
                  {activeTab === tab.key && (
                    <span style={{ backgroundColor: biz.p }} className="ml-auto w-1 h-5 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT CONTENT PANEL ── */}
          <div className="flex-1 min-w-0">

            {/* Horizontal tab bar: mobile only */}
            <div className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-[#0d0520]/95 backdrop-blur-2xl border-b border-gray-100 dark:border-white/[0.08] flex">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setInfoEdit(null); setSvcNavStack([]); }}
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

            {/* Desktop tab header */}
            <div className="hidden lg:flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08]">
              <div>
                <p className="text-[15px] font-black text-gray-900 dark:text-white">
                  {TABS.find(t => t.key === activeTab)?.label}
                </p>
              </div>
            </div>

            {/* Tab content */}
            <div className="min-h-64 pb-8">
              {activeTab === 'gallery'  && renderGallery()}
              {activeTab === 'services' && renderServices()}
              {activeTab === 'reviews'  && renderReviews()}
              {activeTab === 'info'     && renderInfo()}
            </div>
          </div>
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

      <ConfirmModal
        isOpen={!!confirmState}
        title={confirmState?.type === 'service'
          ? `Delete "${confirmState?.item?.name}"?`
          : 'Delete this media?'}
        message="This will be permanently removed and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={confirmState?.type === 'service' ? executeDeleteService : executeDeleteMedia}
        onCancel={() => setConfirmState(null)}
      />
    </DashboardLayout>
  );
}
