import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Edit2, Trash2, Gift, CreditCard, Check, X,
  ChevronDown, ChevronUp, Tag, Clock, IndianRupee,
  Zap, RefreshCw, Bell, Sparkles, ArrowRight, ArrowLeft,
  CheckCircle2, Scissors, Star, TrendingUp, Package2,
  Percent, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';

/* ── helpers ─────────────────────────────────────────────────── */
const TAG_META = {
  popular:     { label: '🔥 Popular',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  recommended: { label: '⭐ Recommended', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'   },
  best_value:  { label: '💰 Best Value',  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  active:   { label: 'Active',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'   },
  expired:  { label: 'Expired',  color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'           },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'            },
};

const BILLING_LABEL = { monthly: '/ month', quarterly: '/ quarter', yearly: '/ year' };

const EMPTY_FORM = {
  type: 'package',
  name: '', description: '', icon: '🎁', tag: '',
  services: [], originalPrice: '', discountedPrice: '', discountPercent: '', totalDuration: '',
  price: '', billingCycle: 'monthly', durationDays: '30',
  benefitDiscountPercent: '', priorityBooking: false,
  freeServices: [],
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function Packages() {
  const [activeTab, setActiveTab]         = useState('packages');
  const [items, setItems]                 = useState([]);
  const [salonServices, setSalonServices] = useState([]);
  const [requests, setRequests]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [reqLoading, setReqLoading]       = useState(false);
  const [showForm, setShowForm]           = useState(false);
  const [editId, setEditId]               = useState(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [expandedReq, setExpandedReq]     = useState(null);
  const [confirmingId, setConfirmingId]   = useState(null);

  /* ── fetch ─────────────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgRes, memRes, svcRes] = await Promise.all([
        api.get('/owner/packages?type=package'),
        api.get('/owner/packages?type=membership'),
        api.get('/owner/services'),
      ]);
      setItems([
        ...(pkgRes.data.data?.packages || []),
        ...(memRes.data.data?.packages || []),
      ]);
      const svcs = svcRes.data?.data?.services ?? svcRes.data?.services ?? [];
      setSalonServices(Array.isArray(svcs) ? svcs : []);
    } catch { toast.error('Failed to load packages'); }
    finally { setLoading(false); }
  }, []);

  const fetchRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const res = await api.get('/owner/package-requests');
      setRequests(res.data.data?.requests || []);
    } catch { toast.error('Failed to load requests'); }
    finally { setReqLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { if (activeTab === 'requests') fetchRequests(); }, [activeTab, fetchRequests]);

  /* ── form change ────────────────────────────────────────────── */
  const handleFormChange = (patch) => {
    setForm(prev => {
      const next = { ...prev, ...patch };
      if ('originalPrice' in patch || 'discountedPrice' in patch) {
        const orig = parseFloat(next.originalPrice) || 0;
        const disc = parseFloat(next.discountedPrice) || 0;
        if (orig > 0 && disc > 0 && disc < orig) {
          next.discountPercent = Math.round(((orig - disc) / orig) * 100);
        } else { next.discountPercent = ''; }
      }
      return next;
    });
  };

  /* ── open / close form ──────────────────────────────────────── */
  const openCreate = (type) => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, type, icon: type === 'package' ? '🎁' : '💳' });
    setShowForm(true);
  };
  const openEdit = (pkg) => {
    setEditId(pkg._id);
    setForm({
      type: pkg.type, name: pkg.name, description: pkg.description || '',
      icon: pkg.icon || (pkg.type === 'package' ? '🎁' : '💳'), tag: pkg.tag || '',
      services: pkg.services || [],
      originalPrice:   String(pkg.originalPrice   || ''),
      discountedPrice: String(pkg.discountedPrice || ''),
      discountPercent: String(pkg.discountPercent || ''),
      totalDuration:   String(pkg.totalDuration   || ''),
      price:          String(pkg.price      || ''),
      billingCycle:    pkg.billingCycle   || 'monthly',
      durationDays:    String(pkg.durationDays   || '30'),
      benefitDiscountPercent: String(pkg.benefits?.discountPercent || ''),
      priorityBooking: pkg.benefits?.priorityBooking || false,
      freeServices: (pkg.benefits?.freeServices || []).map(fs => ({
        serviceName: fs.serviceName, usageLimit: String(fs.usageLimit || 1),
      })),
    });
    setShowForm(true);
  };

  /* ── save ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.type === 'package' && !form.discountedPrice) { toast.error('Set a final price in Step 3'); return; }
    if (form.type === 'membership' && !form.price) { toast.error('Price is required'); return; }
    setSaving(true);
    try {
      const payload = {
        type: form.type, name: form.name.trim(), description: form.description.trim(),
        icon: form.icon, tag: form.tag,
        ...(form.type === 'package' ? {
          services:        form.services,
          originalPrice:   Number(form.originalPrice)   || 0,
          discountedPrice: Number(form.discountedPrice) || 0,
          discountPercent: Number(form.discountPercent) || 0,
          totalDuration:   Number(form.totalDuration)   || 0,
        } : {
          price:        Number(form.price),
          billingCycle: form.billingCycle,
          durationDays: Number(form.durationDays) || 30,
          benefits: {
            freeServices: form.freeServices.map(fs => ({
              serviceName: fs.serviceName, usageLimit: Number(fs.usageLimit) || 1,
            })),
            discountPercent: Number(form.benefitDiscountPercent) || 0,
            priorityBooking: form.priorityBooking,
          },
        }),
      };
      if (editId) {
        await api.put(`/owner/packages/${editId}`, payload);
        toast.success('Updated!');
      } else {
        await api.post('/owner/packages', payload);
        toast.success('Package created!');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  /* ── toggle / delete ─────────────────────────────────────────── */
  const toggleActive = async (pkg) => {
    try {
      await api.put(`/owner/packages/${pkg._id}`, { isActive: !pkg.isActive });
      setItems(prev => prev.map(p => p._id === pkg._id ? { ...p, isActive: !p.isActive } : p));
    } catch { toast.error('Failed to update'); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/owner/packages/${id}`);
      setItems(prev => prev.filter(p => p._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  /* ── request action ─────────────────────────────────────────── */
  const handleRequestAction = async (id, action) => {
    setConfirmingId(id);
    try {
      await api.put(`/owner/package-requests/${id}`, { action });
      toast.success(action === 'confirm' ? 'Activated!' : 'Rejected');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setConfirmingId(null); }
  };

  const packages    = items.filter(i => i.type === 'package');
  const memberships = items.filter(i => i.type === 'membership');
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  /* ═══ RENDER ═══ */
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Packages &amp; Memberships</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create bundles and subscriptions to boost revenue</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openCreate('package')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                text-white text-sm font-semibold rounded-xl transition-all duration-200
                shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35
                active:scale-[0.97]"
            >
              <Gift className="w-4 h-4" /> New Package
            </button>
            <button
              onClick={() => openCreate('membership')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700
                text-white text-sm font-semibold rounded-xl transition active:scale-[0.97]"
            >
              <CreditCard className="w-4 h-4" /> New Membership
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl w-fit">
          {[
            { id: 'packages',    label: 'Packages',    icon: Gift       },
            { id: 'memberships', label: 'Memberships', icon: CreditCard },
            { id: 'requests',    label: 'Requests',    icon: Bell, badge: pendingCount },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === id
                  ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Packages tab */}
        {activeTab === 'packages' && (
          loading ? <Spinner /> : packages.length === 0 ? (
            <Empty icon="🎁" title="No packages yet" sub="Create a service bundle with a discounted price" cta="New Package" onClick={() => openCreate('package')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map(pkg => <PackageCard key={pkg._id} pkg={pkg} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
            </div>
          )
        )}

        {/* Memberships tab */}
        {activeTab === 'memberships' && (
          loading ? <Spinner /> : memberships.length === 0 ? (
            <Empty icon="💳" title="No memberships yet" sub="Create a subscription plan with recurring benefits" cta="New Membership" onClick={() => openCreate('membership')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberships.map(pkg => <MembershipCard key={pkg._id} pkg={pkg} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
            </div>
          )
        )}

        {/* Requests tab */}
        {activeTab === 'requests' && (
          reqLoading ? <Spinner /> : requests.length === 0 ? (
            <Empty icon="📋" title="No purchase requests" sub="When customers request a package or membership, they'll appear here" />
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req._id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div
                    className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer"
                    onClick={() => setExpandedReq(expandedReq === req._id ? null : req._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        req.status === 'pending' ? 'bg-yellow-400' :
                        req.status === 'active'  ? 'bg-green-400'  :
                        req.status === 'expired' ? 'bg-gray-400'   : 'bg-red-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{req.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{req.packageName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_META[req.status]?.color}`}>
                        {STATUS_META[req.status]?.label}
                      </span>
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">₹{req.pricePaid}</span>
                      {expandedReq === req._id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                  {expandedReq === req._id && (
                    <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          ['Customer', req.customerName],
                          ['Phone',    req.customerPhone || '—'],
                          ['Package',  req.packageName],
                          ['Type',     req.type],
                          ['Price Paid', `₹${req.pricePaid}`],
                          ['Requested', new Date(req.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })],
                          ...(req.startDate ? [['Start', new Date(req.startDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })]] : []),
                          ...(req.endDate   ? [['Expires', new Date(req.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })]] : []),
                        ].map(([label, value]) => (
                          <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            <p className="font-semibold text-gray-900 dark:text-white capitalize">{value}</p>
                          </div>
                        ))}
                      </div>
                      {req.purchaseNote && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                          <span className="font-semibold">Note: </span>{req.purchaseNote}
                        </p>
                      )}
                      {req.status === 'pending' && (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleRequestAction(req._id, 'reject')}
                            disabled={confirmingId === req._id}
                            className="flex-1 py-2.5 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                          >Reject</button>
                          <button
                            onClick={() => handleRequestAction(req._id, 'confirm')}
                            disabled={confirmingId === req._id}
                            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {confirmingId === req._id
                              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                              : <><Check className="w-4 h-4" /> Confirm Payment</>}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Package Builder (step-based, packages only) ────────── */}
      {showForm && form.type === 'package' && (
        <PackageBuilder
          form={form}
          editId={editId}
          saving={saving}
          onChange={handleFormChange}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          salonServices={salonServices}
        />
      )}

      {/* ── Membership Builder (step-based) ──────────────────── */}
      {showForm && form.type === 'membership' && (
        <MembershipBuilder
          form={form}
          editId={editId}
          saving={saving}
          onChange={handleFormChange}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          salonServices={salonServices}
        />
      )}
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PACKAGE BUILDER — 4-step guided creation flow
═══════════════════════════════════════════════════════════════ */

const ICON_OPTIONS = ['🎁','✂️','💆','💅','🧖','💇','👰','🎊','⭐','🌸','💎','👑','🌟','🏆','✨','🎯'];

const NAME_SUGGESTIONS = [
  'Bridal Package', 'Groom Special', 'Festival Offer',
  'Hair Care Bundle', 'Complete Makeover', 'Relaxation Package',
  'Express Grooming', 'Premium Spa Bundle', 'Student Special',
  'Couple Package', 'Seasonal Offer', 'VIP Package',
];

const STEPS = [
  { num: 1, label: 'Basic Info',  icon: Sparkles   },
  { num: 2, label: 'Services',    icon: Scissors   },
  { num: 3, label: 'Pricing',     icon: TrendingUp },
  { num: 4, label: 'Preview',     icon: Eye        },
];

function PackageBuilder({ form, editId, saving, onChange, onSave, onClose, salonServices }) {
  const [step, setStep]         = useState(1);
  const [dir, setDir]           = useState(1);   // 1=forward, -1=back
  const [sliderPct, setSliderPct] = useState(0);
  const [nameFocus, setNameFocus] = useState(false);

  /* Sync slider when entering step 3 */
  useEffect(() => {
    if (step === 3) setSliderPct(parseInt(form.discountPercent) || 0);
  }, [step]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* ── Service toggle ─────────────────────────────────────────── */
  const toggleService = (svc) => {
    const exists = form.services.some(s => s.serviceName === svc.name);
    const updated = exists
      ? form.services.filter(s => s.serviceName !== svc.name)
      : [...form.services, {
          serviceName: svc.name,
          price:    String(svc.basePrice || svc.price || 0),
          duration: String(svc.duration || 0),
        }];
    const orig = updated.reduce((s, v) => s + (parseFloat(v.price) || 0), 0);
    const dur  = updated.reduce((s, v) => s + (parseInt(v.duration) || 0), 0);
    onChange({ services: updated, originalPrice: String(orig || ''), totalDuration: String(dur || '') });
  };

  /* ── Discount slider ────────────────────────────────────────── */
  const handleSlider = (e) => {
    const pct = parseInt(e.target.value);
    setSliderPct(pct);
    const orig = parseFloat(form.originalPrice) || 0;
    if (!orig) return;
    const discounted = Math.max(1, Math.round(orig * (1 - pct / 100)));
    onChange({ discountedPrice: String(discounted) });
  };

  /* ── Navigation ─────────────────────────────────────────────── */
  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const next = () => go(step + 1);
  const prev = () => go(step - 1);

  /* ── Validation ─────────────────────────────────────────────── */
  const canStep1 = form.name.trim().length > 0;
  const canStep2 = form.services.length > 0;
  const canStep3 = parseFloat(form.discountedPrice) > 0;

  /* ── Derived pricing ─────────────────────────────────────────── */
  const origPrice  = parseFloat(form.originalPrice)   || 0;
  const finalPrice = parseFloat(form.discountedPrice) || 0;
  const savings    = Math.max(0, origPrice - finalPrice);
  const discPct    = parseInt(form.discountPercent)    || 0;
  const suggested20 = Math.round(origPrice * 0.80);
  const suggested15 = Math.round(origPrice * 0.85);

  /* ── Matching suggestions while typing name ──────────────────── */
  const nameSuggestions = nameFocus && form.name.length >= 1
    ? NAME_SUGGESTIONS.filter(s =>
        s.toLowerCase().startsWith(form.name.toLowerCase()) && s !== form.name
      ).slice(0, 4)
    : [];

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes builderSlideIn {
          from { opacity: 0; transform: translateX(calc(var(--slide-dir) * 28px)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .builder-step {
          animation: builderSlideIn 0.24s cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .range-premium {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 99px;
          outline: none;
          cursor: pointer;
        }
        .range-premium::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 2px 8px rgba(99,102,241,0.45);
          cursor: pointer;
          border: 3px solid white;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .range-premium::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 14px rgba(99,102,241,0.55);
        }
        .range-premium::-moz-range-thumb {
          width: 22px; height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 3px solid white;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Builder panel */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center px-4 py-6 pointer-events-none">
        <div
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col
            bg-white dark:bg-[#0d1424]
            border border-gray-100 dark:border-gray-800/60
            rounded-3xl shadow-2xl shadow-black/25 dark:shadow-black/60
            pointer-events-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >

          {/* ── Top bar ─────────────────────────────────────────── */}
          <div className="shrink-0 px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {editId ? 'Edit Package' : 'Create Package'}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Step {step} of {STEPS.length} — {STEPS[step - 1].label}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done    = step > s.num;
                const current = step === s.num;
                const Icon    = s.icon;
                return (
                  <React.Fragment key={s.num}>
                    <button
                      onClick={() => {
                        // Allow clicking a completed step
                        if (done || (current)) return;
                        if (s.num < step) go(s.num);
                      }}
                      className={`flex flex-col items-center gap-1 min-w-0 flex-1 group ${s.num < step ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`
                        w-9 h-9 rounded-2xl flex items-center justify-center
                        transition-all duration-300 font-bold text-sm
                        ${done    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : current ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-110'
                        :           'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}
                      `}>
                        {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[10px] font-semibold hidden sm:block truncate max-w-full transition-colors ${
                        current ? 'text-indigo-600 dark:text-indigo-400' : done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'
                      }`}>{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={`h-[2px] flex-1 max-w-[40px] mx-1 rounded-full transition-all duration-500 ${
                        step > s.num ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-800'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Thin progress bar */}
            <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* ── Step content (animated) ──────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            <div
              key={step}
              className="builder-step"
              style={{ '--slide-dir': dir }}
            >
              {step === 1 && (
                <Step1BasicInfo
                  form={form}
                  onChange={onChange}
                  nameSuggestions={nameSuggestions}
                  nameFocus={nameFocus}
                  setNameFocus={setNameFocus}
                />
              )}
              {step === 2 && (
                <Step2Services
                  form={form}
                  salonServices={salonServices}
                  onToggle={toggleService}
                />
              )}
              {step === 3 && (
                <Step3Pricing
                  form={form}
                  onChange={onChange}
                  sliderPct={sliderPct}
                  onSlider={handleSlider}
                  origPrice={origPrice}
                  finalPrice={finalPrice}
                  savings={savings}
                  discPct={discPct}
                  suggested20={suggested20}
                  suggested15={suggested15}
                />
              )}
              {step === 4 && (
                <Step4Preview form={form} origPrice={origPrice} finalPrice={finalPrice} savings={savings} discPct={discPct} />
              )}
            </div>
          </div>

          {/* ── Footer nav ──────────────────────────────────────── */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex items-center gap-3">
            {step > 1 ? (
              <button
                onClick={prev}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  border border-gray-200 dark:border-gray-700
                  text-gray-600 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-all duration-150 active:scale-[0.97]"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
              >
                Cancel
              </button>
            )}

            <div className="flex-1" />

            {/* Step dots */}
            <div className="hidden sm:flex items-center gap-1.5">
              {STEPS.map(s => (
                <div
                  key={s.num}
                  className={`rounded-full transition-all duration-300 ${
                    step === s.num ? 'w-6 h-2 bg-indigo-500' : step > s.num ? 'w-2 h-2 bg-indigo-300 dark:bg-indigo-700' : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex-1" />

            {step < 4 ? (
              <button
                onClick={next}
                disabled={
                  (step === 1 && !canStep1) ||
                  (step === 2 && !canStep2) ||
                  (step === 3 && !canStep3)
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                  bg-gradient-to-r from-indigo-600 to-violet-600
                  hover:from-indigo-500 hover:to-violet-500
                  text-white shadow-md shadow-indigo-500/25
                  hover:shadow-lg hover:shadow-indigo-500/35
                  disabled:opacity-40 disabled:pointer-events-none
                  transition-all duration-200 active:scale-[0.97]"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onSave}
                disabled={saving || !canStep3}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold
                  bg-gradient-to-r from-indigo-600 to-violet-600
                  hover:from-indigo-500 hover:to-violet-500
                  text-white shadow-md shadow-indigo-500/30
                  hover:shadow-xl hover:shadow-indigo-500/40
                  disabled:opacity-50 disabled:pointer-events-none
                  transition-all duration-200 active:scale-[0.97]"
              >
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Sparkles className="w-4 h-4" /> {editId ? 'Update Package' : 'Create Package'}</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Step 1: Basic Info ─────────────────────────────────────── */
function Step1BasicInfo({ form, onChange, nameSuggestions, nameFocus, setNameFocus }) {
  const TAGS = [
    { v: '',            l: 'No Badge',       emoji: '—' },
    { v: 'popular',     l: 'Popular',        emoji: '🔥' },
    { v: 'recommended', l: 'Recommended',    emoji: '⭐' },
    { v: 'best_value',  l: 'Best Value',     emoji: '💰' },
  ];

  return (
    <div className="space-y-6 py-2">
      {/* Icon + Name */}
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
          Package Identity
        </label>

        {/* Icon grid */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Choose an icon</p>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => onChange({ icon: ic })}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all duration-150 active:scale-90
                  ${form.icon === ic
                    ? 'bg-indigo-100 dark:bg-indigo-950/70 ring-2 ring-indigo-500 scale-110'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:scale-105'
                  }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="relative">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">
            Package Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl pointer-events-none">{form.icon}</span>
            <input
              value={form.name}
              onChange={e => onChange({ name: e.target.value })}
              onFocus={() => setNameFocus(true)}
              onBlur={() => setTimeout(() => setNameFocus(false), 150)}
              placeholder="e.g. Bridal Glow Package"
              className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium
                bg-white dark:bg-gray-900
                border-gray-200 dark:border-gray-700
                text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-600
                focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                transition-all duration-200"
            />
          </div>
          {/* Suggestions dropdown */}
          {nameSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden">
              {nameSuggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => onChange({ name: s })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick suggestions */}
        {!form.name && (
          <div className="mt-3">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">Popular names to get started:</p>
            <div className="flex flex-wrap gap-1.5">
              {NAME_SUGGESTIONS.slice(0, 6).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ name: s })}
                  className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-200 dark:border-gray-700
                    text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400
                    hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={e => onChange({ description: e.target.value })}
          rows={3}
          placeholder="What's included? Who is this for? Make it compelling for customers…"
          className="w-full px-4 py-3 rounded-xl border text-sm resize-none
            bg-white dark:bg-gray-900
            border-gray-200 dark:border-gray-700
            text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-600
            focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
            transition-all duration-200"
        />
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">
          {form.description.length} / 200
        </p>
      </div>

      {/* Badge tag */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-3">
          Customer-facing Badge
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TAGS.map(({ v, l, emoji }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ tag: v })}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all duration-150 active:scale-[0.97]
                ${form.tag === v
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-100 dark:shadow-none'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
            >
              <span className="text-lg">{emoji}</span>
              <span className="text-xs">{l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Service Selection ──────────────────────────────── */
function Step2Services({ form, salonServices, onToggle }) {
  const selectedNames = new Set(form.services.map(s => s.serviceName));
  const totalDur = form.services.reduce((s, v) => s + (parseInt(v.duration) || 0), 0);

  return (
    <div className="space-y-4 py-2">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Select Services to Include
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click to add, click again to remove</p>
        </div>
        {form.services.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              {form.services.length} selected
            </span>
            {totalDur > 0 && (
              <span className="text-xs text-indigo-500 dark:text-indigo-500">· {totalDur} min</span>
            )}
          </div>
        )}
      </div>

      {/* Service grid */}
      {salonServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Scissors className="w-7 h-7 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="font-semibold text-gray-500 dark:text-gray-400">No services found</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add services on the Services page first</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {salonServices.map(svc => {
            const isSelected = selectedNames.has(svc.name);
            const isInactive = svc.isActive === false;
            const price = svc.basePrice || svc.price || 0;
            return (
              <button
                key={svc._id || svc.name}
                type="button"
                onClick={() => onToggle(svc)}
                className={`
                  group relative text-left p-4 rounded-2xl border
                  transition-all duration-200 active:scale-[0.97]
                  ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/15'
                    : isInactive
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-indigo-300 dark:hover:border-indigo-700'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:-translate-y-0.5'
                  }
                `}
              >
                {/* Selected indicator */}
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200
                  ${isSelected
                    ? 'bg-indigo-600 text-white scale-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 scale-90 group-hover:scale-100'
                  }`}>
                  <Check className="w-3 h-3" />
                </div>

                {/* Category pill + inactive badge */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {svc.category && (
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full
                      ${isSelected
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                      }`}>
                      {svc.category}
                    </span>
                  )}
                  {isInactive && (
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                      Inactive
                    </span>
                  )}
                </div>

                <p className={`font-bold text-sm mb-2 pr-6 ${isSelected ? 'text-indigo-800 dark:text-indigo-200' : isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                  {svc.name}
                </p>

                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1 font-bold text-base
                    ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    <span className="text-sm">₹</span>{price}
                  </div>
                  {svc.duration && (
                    <>
                      <span className="w-px h-3.5 bg-gray-200 dark:bg-gray-700" />
                      <div className={`flex items-center gap-1 text-xs ${isSelected ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <Clock className="w-3 h-3" /> {svc.duration}m
                      </div>
                    </>
                  )}
                </div>

                {/* Selected glow border */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-indigo-500/30 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected summary */}
      {form.services.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Selected Services</p>
          <div className="space-y-2">
            {form.services.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  {s.serviceName}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{s.price}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-sm font-bold">
              <span className="text-gray-600 dark:text-gray-300">Total Original</span>
              <span className="text-indigo-600 dark:text-indigo-400">₹{form.originalPrice || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 3: Smart Pricing ──────────────────────────────────── */
function Step3Pricing({ form, onChange, sliderPct, onSlider, origPrice, finalPrice, savings, discPct, suggested20, suggested15 }) {
  const sliderBg = `linear-gradient(to right, #6366f1 ${sliderPct * 2}%, #e5e7eb ${sliderPct * 2}%)`;

  return (
    <div className="space-y-6 py-2">
      {/* Original price breakdown */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
          Price Breakdown
        </p>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-2">
          {form.services.map((s, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{s.serviceName}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">₹{s.price}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Total (original)</span>
            <span className="text-sm font-black text-gray-900 dark:text-white">₹{origPrice}</span>
          </div>
        </div>
      </div>

      {/* Discount slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Discount
          </p>
          <div className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
            <Percent className="w-3.5 h-3.5" />
            <span className="text-sm font-black">{sliderPct}%</span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={sliderPct}
          onChange={onSlider}
          className="range-premium"
          style={{ background: sliderBg }}
        />

        <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-600 mt-1">
          <span>0% (no discount)</span>
          <span>50% off</span>
        </div>

        {/* Suggestions */}
        <div className="flex gap-2 mt-3">
          {[
            { pct: 10, label: '10% off' },
            { pct: 15, label: '15% off', hint: 'Standard' },
            { pct: 20, label: '20% off', hint: 'Best Value' },
          ].map(({ pct, label, hint }) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                const synthetic = { target: { value: pct } };
                onSlider(synthetic);
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-150
                ${sliderPct === pct
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
            >
              {label}
              {hint && <span className={`text-[10px] font-normal ${sliderPct === pct ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>{hint}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Live pricing display */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 p-5">
        {/* Decorative circle */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-200/30 dark:bg-indigo-700/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Final Price</p>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              ₹{finalPrice || origPrice}
            </p>
            {origPrice > 0 && finalPrice > 0 && finalPrice < origPrice && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">₹{origPrice}</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  {discPct}% OFF
                </span>
              </div>
            )}
          </div>

          {savings > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">You save</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{savings}</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual override */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1.5">
          Or Enter Custom Final Price
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">₹</span>
          <input
            type="number"
            min="1"
            value={form.discountedPrice}
            onChange={e => onChange({ discountedPrice: e.target.value })}
            placeholder={suggested20 ? String(suggested20) : 'e.g. 499'}
            className="w-full pl-8 pr-4 py-3 rounded-xl border text-sm font-semibold
              bg-white dark:bg-gray-900
              border-gray-200 dark:border-gray-700
              text-gray-900 dark:text-white
              placeholder:text-gray-300 dark:placeholder:text-gray-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
              transition-all duration-200"
          />
        </div>
        {suggested20 > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => onChange({ discountedPrice: String(suggested15) })}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Star className="w-3 h-3" /> Use ₹{suggested15} (15% off)
            </button>
            <span className="text-gray-200 dark:text-gray-700">·</span>
            <button
              type="button"
              onClick={() => onChange({ discountedPrice: String(suggested20) })}
              className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors"
            >
              <TrendingUp className="w-3 h-3" /> Use ₹{suggested20} (Best Value 20% off)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 4: Live Preview ────────────────────────────────────── */
function Step4Preview({ form, origPrice, finalPrice, savings, discPct }) {
  const tag = TAG_META[form.tag];

  return (
    <div className="space-y-6 py-2">
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
          Customer-facing Preview
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">This is how your package appears to customers</p>
      </div>

      {/* Preview card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-gray-900 shadow-2xl shadow-indigo-500/10">
        {/* Top gradient strip */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-50 to-transparent dark:from-indigo-950/20 dark:to-transparent rounded-full translate-x-16 -translate-y-16 pointer-events-none" />

        <div className="relative p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center text-3xl shadow-md">
                {form.icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                  {form.name || 'Package Name'}
                </h3>
                {form.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 max-w-[220px] line-clamp-2">
                    {form.description}
                  </p>
                )}
              </div>
            </div>
            {tag && (
              <span className={`shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-xl ${tag.color}`}>
                {tag.label}
              </span>
            )}
          </div>

          {/* Services list */}
          {form.services.length > 0 && (
            <div className="mb-5 space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                What's Included
              </p>
              {form.services.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {s.serviceName}
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">₹{s.price}</span>
                </div>
              ))}
            </div>
          )}

          {/* Price block */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  ₹{finalPrice || origPrice}
                </span>
                {origPrice > 0 && finalPrice > 0 && finalPrice < origPrice && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 line-through">₹{origPrice}</span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Save ₹{savings} · {discPct}% off
                </p>
              )}
            </div>
            {form.services.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {form.services.length} service{form.services.length > 1 ? 's' : ''}
                </p>
                {parseInt(form.totalDuration) > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" /> {form.totalDuration} min
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fake CTA (for preview only) */}
          <div className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold text-center opacity-70">
            Book Package →
          </div>
        </div>
      </div>

      {/* Summary checklist */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Name set',      ok: !!form.name,               val: form.name || '—' },
          { label: 'Services',      ok: form.services.length > 0,  val: `${form.services.length} included` },
          { label: 'Final Price',   ok: !!form.discountedPrice,    val: form.discountedPrice ? `₹${form.discountedPrice}` : 'Not set' },
          { label: 'Badge',         ok: true,                       val: TAG_META[form.tag]?.label || 'None' },
        ].map(({ label, ok, val }) => (
          <div key={label} className={`flex items-start gap-2.5 p-3 rounded-xl border
            ${ok ? 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-100 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${ok ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
              {ok ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-bold">!</span>}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px]">{val}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PACKAGE CARD
═══════════════════════════════════════════════════════════════ */
function PackageCard({ pkg, onEdit, onDelete, onToggle }) {
  const savings = pkg.originalPrice && pkg.discountedPrice
    ? pkg.originalPrice - pkg.discountedPrice : 0;

  return (
    <div className={`group bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-all duration-200
      hover:-translate-y-0.5 hover:shadow-md
      ${pkg.isActive
        ? 'border-indigo-200 dark:border-indigo-800/60 shadow-sm shadow-indigo-100/50 dark:shadow-none'
        : 'border-gray-200 dark:border-gray-800 opacity-60'
      }`}
    >
      {/* Accent top strip */}
      {pkg.isActive && (
        <div className="h-0.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-2xl shrink-0 shadow-sm">
          {pkg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{pkg.name}</h3>
            {pkg.tag && TAG_META[pkg.tag] && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_META[pkg.tag].color}`}>
                {TAG_META[pkg.tag].label}
              </span>
            )}
          </div>
          {pkg.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{pkg.description}</p>}
        </div>
      </div>

      <div className="px-5 pb-4 flex items-center gap-3">
        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{pkg.discountedPrice}</span>
        {pkg.originalPrice > 0 && pkg.originalPrice !== pkg.discountedPrice && (
          <>
            <span className="text-sm text-gray-400 line-through">₹{pkg.originalPrice}</span>
            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full">
              {pkg.discountPercent}% OFF
            </span>
          </>
        )}
        {savings > 0 && (
          <span className="text-xs text-green-600 dark:text-green-400 ml-auto">Save ₹{savings}</span>
        )}
      </div>

      {pkg.services?.length > 0 && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {pkg.services.slice(0, 4).map((s, i) => (
            <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
              {s.serviceName}
            </span>
          ))}
          {pkg.services.length > 4 && (
            <span className="text-xs text-gray-400 px-2 py-1">+{pkg.services.length - 4} more</span>
          )}
        </div>
      )}

      {pkg.totalDuration > 0 && (
        <div className="px-5 pb-4 flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" /> {pkg.totalDuration} min total
        </div>
      )}

      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        <label className="relative inline-flex items-center cursor-pointer mr-auto">
          <input type="checkbox" checked={pkg.isActive} onChange={() => onToggle(pkg)} className="sr-only peer" />
          <div className={`w-9 h-5 rounded-full transition-colors ${pkg.isActive ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}
            after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow after:transition-transform
            ${pkg.isActive ? 'after:translate-x-4' : 'after:translate-x-0'}`} />
          <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">{pkg.isActive ? 'Active' : 'Off'}</span>
        </label>
        <button onClick={() => onEdit(pkg)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(pkg._id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEMBERSHIP CARD
═══════════════════════════════════════════════════════════════ */
function MembershipCard({ pkg, onEdit, onDelete, onToggle }) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
      pkg.isActive ? 'border-violet-200 dark:border-violet-800/60' : 'border-gray-200 dark:border-gray-800 opacity-60'
    }`}>
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-2xl shrink-0">
          {pkg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{pkg.name}</h3>
            {pkg.tag && TAG_META[pkg.tag] && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_META[pkg.tag].color}`}>
                {TAG_META[pkg.tag].label}
              </span>
            )}
          </div>
          {pkg.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{pkg.description}</p>}
        </div>
      </div>
      <div className="px-5 pb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-violet-600 dark:text-violet-400">₹{pkg.price}</span>
          <span className="text-sm text-gray-400">{BILLING_LABEL[pkg.billingCycle] || '/month'}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Valid for {pkg.durationDays} days</p>
      </div>
      <div className="px-5 pb-4 space-y-1.5">
        {pkg.benefits?.discountPercent > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />{pkg.benefits.discountPercent}% off all services
          </div>
        )}
        {pkg.benefits?.priorityBooking && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />Priority booking
          </div>
        )}
        {(pkg.benefits?.freeServices || []).slice(0, 3).map((fs, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />{fs.serviceName} × {fs.usageLimit}
          </div>
        ))}
        {(pkg.benefits?.freeServices?.length || 0) > 3 && (
          <p className="text-xs text-gray-400 ml-5">+{pkg.benefits.freeServices.length - 3} more services</p>
        )}
      </div>
      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        <label className="relative inline-flex items-center cursor-pointer mr-auto">
          <input type="checkbox" checked={pkg.isActive} onChange={() => onToggle(pkg)} className="sr-only peer" />
          <div className={`w-9 h-5 rounded-full transition-colors ${pkg.isActive ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}
            after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:shadow after:transition-transform
            ${pkg.isActive ? 'after:translate-x-4' : 'after:translate-x-0'}`} />
          <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">{pkg.isActive ? 'Active' : 'Off'}</span>
        </label>
        <button onClick={() => onEdit(pkg)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(pkg._id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEMBERSHIP BUILDER — Premium 4-step creation flow
═══════════════════════════════════════════════════════════════ */

const MEM_ICONS = ['💳','👑','💎','⭐','🌟','🔮','🎭','🌸','🏆','✨','💰','🎯','🦋','🌈','🎊','🎪'];

const MEM_STEPS = [
  { num: 1, label: 'Basics',   icon: Sparkles    },
  { num: 2, label: 'Billing',  icon: IndianRupee },
  { num: 3, label: 'Benefits', icon: Zap         },
  { num: 4, label: 'Preview',  icon: Eye         },
];

const CYCLE_OPTIONS = [
  { value: 'monthly',   label: 'Monthly',   months: 1,  desc: 'Billed every month'    },
  { value: 'quarterly', label: 'Quarterly', months: 3,  desc: 'Save vs monthly'       },
  { value: 'yearly',    label: 'Yearly',    months: 12, desc: 'Best deal', best: true  },
];

const VALIDITY_PRESETS = [
  { days: 30,  label: '1 Month'  },
  { days: 90,  label: '3 Months' },
  { days: 180, label: '6 Months' },
  { days: 365, label: '1 Year'   },
];

const MEM_TAGS = [
  { v: '',            l: 'None'           },
  { v: 'popular',     l: '🔥 Popular'     },
  { v: 'recommended', l: '⭐ Recommended'  },
  { v: 'best_value',  l: '💰 Best Value'   },
];

function MembershipBuilder({ form, editId, saving, onChange, onSave, onClose, salonServices = [] }) {
  const [step, setStep] = useState(1);
  const [dir,  setDir]  = useState(1);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const go   = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const next = () => go(step + 1);
  const back = () => go(step - 1);

  const canNext = step === 1 ? form.name.trim().length > 0
                : step === 2 ? parseFloat(form.price) > 0
                : true;

  return (
    <div className="fixed inset-0 z-[60]">
      <style>{`
        @keyframes memSlideIn {
          from { opacity: 0; transform: translateX(calc(var(--mdir) * 28px)); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .mem-step { animation: memSlideIn 0.24s cubic-bezier(0.4,0,0.2,1) both; }
        .mem-slider {
          -webkit-appearance: none; appearance: none;
          height: 6px; border-radius: 9999px; outline: none; cursor: pointer; width: 100%;
          background: linear-gradient(to right, #7c3aed var(--val, 0%), #e5e7eb var(--val, 0%));
        }
        .dark .mem-slider {
          background: linear-gradient(to right, #7c3aed var(--val, 0%), #374151 var(--val, 0%));
        }
        .mem-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 3px solid #7c3aed;
          box-shadow: 0 2px 8px rgba(124,58,237,0.45); cursor: pointer; transition: transform .15s;
        }
        .mem-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .mem-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: white; border: 3px solid #7c3aed;
          box-shadow: 0 2px 8px rgba(124,58,237,0.45); cursor: pointer;
        }
        @keyframes previewFloat {
          0%,100% { transform: translateY(0) rotate(-1deg); }
          50%      { transform: translateY(-6px) rotate(-1deg); }
        }
        .preview-float { animation: previewFloat 3.5s ease-in-out infinite; }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center px-4 py-6 pointer-events-none">
        <div
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col
            bg-white dark:bg-[#0d1424]
            border border-gray-100 dark:border-gray-800/60
            rounded-3xl shadow-2xl shadow-black/25 dark:shadow-black/60
            pointer-events-auto overflow-hidden"
          onClick={e => e.stopPropagation()}
        >

          {/* ── Top bar ── */}
          <div className="shrink-0 px-6 pt-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {editId ? 'Edit Membership' : 'Create Membership'}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Step {step} of {MEM_STEPS.length} — {MEM_STEPS[step - 1].label}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-0">
              {MEM_STEPS.map((s, i) => {
                const done    = step > s.num;
                const current = step === s.num;
                const Icon    = s.icon;
                return (
                  <React.Fragment key={s.num}>
                    <button
                      onClick={() => { if (done) go(s.num); }}
                      className={`flex flex-col items-center gap-1 min-w-0 flex-1 ${done ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold text-sm
                        ${done    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : current ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/40 scale-110'
                        :           'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}`}
                      >
                        {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`text-[10px] font-semibold hidden sm:block truncate transition-colors
                        ${current ? 'text-violet-600 dark:text-violet-400' : done ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        {s.label}
                      </span>
                    </button>
                    {i < MEM_STEPS.length - 1 && (
                      <div className={`h-[2px] flex-1 max-w-[40px] mx-1 rounded-full transition-all duration-500
                        ${step > s.num ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / (MEM_STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* ── Step content ── */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
            <div key={step} className="mem-step" style={{ '--mdir': dir }}>
              {step === 1 && <MStep1Basics   form={form} onChange={onChange} />}
              {step === 2 && <MStep2Billing  form={form} onChange={onChange} />}
              {step === 3 && <MStep3Benefits form={form} onChange={onChange} salonServices={salonServices} />}
              {step === 4 && <MStep4Preview  form={form} onChange={onChange} />}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
            <button
              onClick={step === 1 ? onClose : back}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {/* Dot pagination */}
            <div className="flex gap-1.5">
              {MEM_STEPS.map(s => (
                <div key={s.num} className={`h-1.5 rounded-full transition-all duration-300
                  ${step === s.num ? 'w-6 bg-violet-500' : step > s.num ? 'w-3 bg-violet-300 dark:bg-violet-700' : 'w-3 bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>

            {step < 4 ? (
              <button
                onClick={next}
                disabled={!canNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500
                  disabled:opacity-50 transition-all shadow-lg shadow-violet-500/25"
              >
                {saving
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Check className="w-4 h-4" /> {editId ? 'Update Membership' : 'Create Membership'}</>
                }
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Basics ─────────────────────────────────────────── */
function MStep1Basics({ form, onChange }) {
  return (
    <div className="space-y-5 py-2">

      {/* Icon picker */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Choose an Icon</p>
        <div className="grid grid-cols-8 gap-2">
          {MEM_ICONS.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => onChange({ icon })}
              className={`h-10 text-xl rounded-xl transition-all duration-150 active:scale-90
                ${form.icon === icon
                  ? 'bg-violet-100 dark:bg-violet-950/60 ring-2 ring-violet-500 scale-110 shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-950/30'}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
          Membership Name <span className="text-red-400">*</span>
        </label>
        <input
          value={form.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="e.g. Gold Member, VIP Club, Platinum Pass…"
          className="w-full h-11 px-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80
            text-gray-900 dark:text-white text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
            placeholder:text-gray-300 dark:placeholder:text-gray-600 transition"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Description</label>
        <textarea
          value={form.description}
          onChange={e => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Short pitch shown to customers — e.g. 'Priority bookings + 20% off every visit'"
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80
            text-gray-900 dark:text-white text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
            placeholder:text-gray-300 dark:placeholder:text-gray-600 transition"
        />
      </div>

      {/* Badge */}
      <div>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Badge</label>
        <div className="flex gap-2 flex-wrap">
          {MEM_TAGS.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ tag: v })}
              className={`px-3.5 py-2 text-xs font-semibold rounded-full border transition-all duration-150 active:scale-95
                ${form.tag === v
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-500/25'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300 dark:hover:border-violet-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Billing ────────────────────────────────────────── */
function MStep2Billing({ form, onChange }) {
  const price = parseFloat(form.price) || 0;
  const currentCycle = CYCLE_OPTIONS.find(c => c.value === form.billingCycle) || CYCLE_OPTIONS[0];
  const monthlyEquiv = currentCycle.months > 1 && price > 0
    ? `≈ ₹${Math.round(price / currentCycle.months)}/mo`
    : null;

  const suggestions = {
    monthly:   [299, 499, 799, 999],
    quarterly: [799, 1299, 1999, 2499],
    yearly:    [2999, 4999, 7999, 9999],
  }[form.billingCycle] || [];

  return (
    <div className="space-y-6 py-2">

      {/* Billing cycle */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Billing Cycle</p>
        <div className="grid grid-cols-3 gap-3">
          {CYCLE_OPTIONS.map(cycle => (
            <button
              key={cycle.value}
              type="button"
              onClick={() => onChange({ billingCycle: cycle.value })}
              className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-95
                ${form.billingCycle === cycle.value
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow-lg shadow-violet-500/15'
                  : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 bg-white dark:bg-gray-900'}`}
            >
              {cycle.best && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                  BEST VALUE
                </span>
              )}
              <span className={`text-sm font-bold ${form.billingCycle === cycle.value ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {cycle.label}
              </span>
              <span className={`text-[10px] text-center ${form.billingCycle === cycle.value ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {cycle.desc}
              </span>
              {form.billingCycle === cycle.value && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Price <span className="text-red-400">*</span>
          </p>
          {monthlyEquiv && (
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-full">
              {monthlyEquiv}
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400 dark:text-gray-500">₹</span>
          <input
            value={form.price}
            onChange={e => onChange({ price: e.target.value })}
            type="number"
            min="0"
            placeholder="0"
            className="w-full h-14 pl-9 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80
              text-gray-900 dark:text-white text-2xl font-bold
              focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
        </div>

        {/* Quick-pick price chips */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">Suggested:</span>
          {suggestions.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ price: String(p) })}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all duration-150 active:scale-95
                ${form.price === String(p)
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300'}`}
            >
              ₹{p}
            </button>
          ))}
        </div>
      </div>

      {/* Insight */}
      {price > 0 && (
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-violet-800 dark:text-violet-200">Pricing Insight</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                {form.billingCycle === 'yearly'
                  ? `Customers pay ₹${price} once a year${monthlyEquiv ? ` (${monthlyEquiv})` : ''}. Annual plans have the best retention.`
                  : form.billingCycle === 'quarterly'
                  ? `Customers pay ₹${price} every 3 months${monthlyEquiv ? ` (${monthlyEquiv})` : ''}. A great balance of value and commitment.`
                  : `Customers pay ₹${price} every month. Keep it under ₹999 for best conversion.`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 3: Benefits ───────────────────────────────────────── */
function MStep3Benefits({ form, onChange, salonServices }) {
  const discPct = parseInt(form.benefitDiscountPercent) || 0;

  const toggleFreeService = (svc) => {
    const exists = form.freeServices.some(fs => fs.serviceName === svc.name);
    if (exists) {
      onChange({ freeServices: form.freeServices.filter(fs => fs.serviceName !== svc.name) });
    } else {
      onChange({ freeServices: [...form.freeServices, { serviceName: svc.name, usageLimit: '1' }] });
    }
  };

  const adjustUsage = (serviceName, delta) => {
    onChange({
      freeServices: form.freeServices.map(fs =>
        fs.serviceName === serviceName
          ? { ...fs, usageLimit: String(Math.max(1, (parseInt(fs.usageLimit) || 1) + delta)) }
          : fs
      ),
    });
  };

  return (
    <div className="space-y-6 py-2">

      {/* Discount slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Service Discount</p>
          <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-3 py-1 rounded-full">
            <Percent className="w-3 h-3 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-black text-violet-700 dark:text-violet-300">{discPct}% off</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          value={discPct}
          onChange={e => onChange({ benefitDiscountPercent: e.target.value })}
          className="mem-slider"
          style={{ '--val': `${discPct * 2}%` }}
        />
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">No discount</span>
          <span className="text-[10px] text-gray-400">Max 50%</span>
        </div>
        {discPct > 0 && (
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 font-medium">
            Members get {discPct}% off on every service visit ✓
          </p>
        )}
      </div>

      {/* Priority booking toggle */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Perks</p>
        <div
          onClick={() => onChange({ priorityBooking: !form.priorityBooking })}
          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
            ${form.priorityBooking
              ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
              ${form.priorityBooking ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Zap className={`w-5 h-5 ${form.priorityBooking ? 'text-yellow-500' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${form.priorityBooking ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-700 dark:text-gray-300'}`}>
                Priority Booking
              </p>
              <p className={`text-xs ${form.priorityBooking ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>
                Members skip the queue, book any slot instantly
              </p>
            </div>
          </div>
          <div className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0
            ${form.priorityBooking ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300
              ${form.priorityBooking ? 'left-5' : 'left-0.5'}`} />
          </div>
        </div>
      </div>

      {/* Free service cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Free Services per Period</p>
          {form.freeServices.length > 0 && (
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full">
              {form.freeServices.length} selected
            </span>
          )}
        </div>

        {salonServices.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No services found — add services first
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {salonServices.map(svc => {
              const selected  = form.freeServices.find(fs => fs.serviceName === svc.name);
              const isInactive = svc.isActive === false;
              const price = svc.basePrice || svc.price || 0;
              return (
                <div
                  key={svc._id || svc.name}
                  onClick={() => toggleFreeService(svc)}
                  className={`relative p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.97]
                    ${selected
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow-md shadow-violet-500/15'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-violet-300 dark:hover:border-violet-700'}`}
                >
                  {/* Top badges */}
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {svc.category && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                        ${selected ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                        {svc.category}
                      </span>
                    )}
                    {isInactive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className={`text-sm font-bold pr-6 ${selected ? 'text-violet-800 dark:text-violet-200' : isInactive ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {svc.name}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm font-bold ${selected ? 'text-violet-600 dark:text-violet-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      ₹{price}
                    </span>

                    {/* Usage counter — only when selected */}
                    {selected && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => adjustUsage(svc.name, -1)}
                          className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold hover:bg-violet-200 dark:hover:bg-violet-900 transition"
                        >−</button>
                        <span className="text-xs font-black text-violet-700 dark:text-violet-300 w-5 text-center">
                          {selected.usageLimit}×
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustUsage(svc.name, 1)}
                          className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold hover:bg-violet-200 dark:hover:bg-violet-900 transition"
                        >+</button>
                      </div>
                    )}
                  </div>

                  {/* Check indicator */}
                  <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200
                    ${selected ? 'bg-violet-600 text-white scale-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 scale-90'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 4: Validity + Live Preview ────────────────────────── */
function MStep4Preview({ form, onChange }) {
  const price  = parseFloat(form.price) || 0;
  const discPct = parseInt(form.benefitDiscountPercent) || 0;
  const days   = parseInt(form.durationDays) || 30;
  const cycleLabel = { monthly: '/mo', quarterly: '/qtr', yearly: '/yr' }[form.billingCycle] || '/mo';
  const tagMeta = TAG_META[form.tag];

  return (
    <div className="space-y-6 py-2">

      {/* Validity quick-select */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Membership Validity</p>
        <div className="grid grid-cols-4 gap-2.5">
          {VALIDITY_PRESETS.map(preset => (
            <button
              key={preset.days}
              type="button"
              onClick={() => onChange({ durationDays: String(preset.days) })}
              className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all duration-200 active:scale-95
                ${days === preset.days
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow-md shadow-violet-500/15'
                  : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 bg-white dark:bg-gray-900'}`}
            >
              <span className={`text-lg font-black ${days === preset.days ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {preset.days}
              </span>
              <span className={`text-[10px] font-semibold ${days === preset.days ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {preset.label}
              </span>
              {days === preset.days && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-0.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview card */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Live Preview</p>
        <div className="flex justify-center">
          <div className="preview-float w-full max-w-sm">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 shadow-2xl shadow-violet-500/40 text-white">

              {/* Decorative orbs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/[0.03] pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between mb-5 relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner shrink-0">
                    {form.icon || '💳'}
                  </div>
                  <div>
                    <p className="font-black text-lg leading-tight">
                      {form.name || 'Membership Name'}
                    </p>
                    {tagMeta && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                        {tagMeta.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5 relative">
                <div className="flex items-end gap-1">
                  <span className="text-white/70 text-sm font-bold">₹</span>
                  <span className="text-4xl font-black leading-none">
                    {price > 0 ? price.toLocaleString('en-IN') : '—'}
                  </span>
                  <span className="text-white/70 text-sm mb-1">{cycleLabel}</span>
                </div>
                <p className="text-white/60 text-xs mt-1">Valid for {days} days</p>
              </div>

              {/* Benefits */}
              <div className="space-y-2 relative">
                {discPct > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Percent className="w-3 h-3" />
                    </div>
                    <span className="font-medium">{discPct}% off all services</span>
                  </div>
                )}
                {form.priorityBooking && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Zap className="w-3 h-3" />
                    </div>
                    <span className="font-medium">Priority booking</span>
                  </div>
                )}
                {form.freeServices.slice(0, 3).map((fs, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Star className="w-3 h-3" />
                    </div>
                    <span className="font-medium">{fs.serviceName} × {fs.usageLimit}</span>
                  </div>
                ))}
                {form.freeServices.length === 0 && discPct === 0 && !form.priorityBooking && (
                  <p className="text-white/40 text-xs italic">No benefits added yet — go back to Step 3</p>
                )}
                {form.freeServices.length > 3 && (
                  <p className="text-white/60 text-xs">+{form.freeServices.length - 3} more services</p>
                )}
              </div>

              {/* CTA preview */}
              <div className="mt-5 py-2.5 rounded-2xl bg-white text-center text-violet-700 text-sm font-black shadow-lg">
                Subscribe Now
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Shared ────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Empty({ icon, title, sub, cta, onClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-3xl mb-4">{icon}</div>
      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-5">{sub}</p>
      {cta && onClick && (
        <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-indigo-500/25">
          <Plus className="w-4 h-4" /> {cta}
        </button>
      )}
    </div>
  );
}
