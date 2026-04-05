import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit2, Trash2, Gift, CreditCard, Check, X,
  ChevronDown, ChevronUp, Tag, Zap, RefreshCw, Bell, Send, Users, Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import MembershipBuilder from '../../components/MembershipBuilder';
import { PkgIcon } from '../../components/MembershipBuilder/IconSelector';
import PackageBuilder from '../../components/PackageBuilder';
import PackageCard from '../../components/PackageBuilder/PackageCard';

/* ── helpers ─────────────────────────────────────────────────── */
const TAG_META = {
  popular:     { label: 'Popular',     color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  recommended: { label: 'Recommended', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'        },
  best_value:  { label: 'Best Value',  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'    },
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
  name: '', description: '', icon: 'gift', tag: '',
  services: [], originalPrice: '', discountedPrice: '', discountPercent: '', totalDuration: '',
  price: '', billingCycle: 'monthly', durationDays: '30',
  benefitDiscountPercent: '', priorityBooking: false,
  freeServices: [],
  /* Membership builder extras (UI-only, not sent to API) */
  goal: '',
  aiSelectedServices: [],
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
  const [notifyTarget, setNotifyTarget]     = useState(null); // { _id, name, type }
  const [showNotifSettings, setShowNotifSettings] = useState(false);

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
    setForm({ ...EMPTY_FORM, type, icon: type === 'package' ? 'gift' : 'gem' });
    setShowForm(true);
  };
  const openEdit = (pkg) => {
    setEditId(pkg._id);
    setForm({
      type: pkg.type, name: pkg.name, description: pkg.description || '',
      icon: pkg.icon || (pkg.type === 'package' ? 'gift' : 'gem'), tag: pkg.tag || '',
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
      /* Reset UI-only fields */
      goal: '',
      aiSelectedServices: [],
    });
    setShowForm(true);
  };

  /* ── save ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.type === 'package' && !form.discountedPrice) { toast.error('Set a final price in Step 2'); return; }
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

  const openNotify = (pkg) => setNotifyTarget(pkg);

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
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowNotifSettings(true)}
              title="Notification Settings"
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-800 transition"
            >
              <Settings2 className="w-4 h-4" />
            </button>
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
            <Empty icon={Gift} title="No packages yet" sub="Create a service bundle with a discounted price" cta="New Package" onClick={() => openCreate('package')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map(pkg => <PackageCard key={pkg._id} pkg={pkg} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} onNotify={openNotify} />)}
            </div>
          )
        )}

        {/* Memberships tab */}
        {activeTab === 'memberships' && (
          loading ? <Spinner /> : memberships.length === 0 ? (
            <Empty icon={CreditCard} title="No memberships yet" sub="Create a subscription plan with recurring benefits" cta="New Membership" onClick={() => openCreate('membership')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberships.map(pkg => <MembershipCard key={pkg._id} pkg={pkg} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} onNotify={openNotify} />)}
            </div>
          )
        )}

        {/* Requests tab */}
        {activeTab === 'requests' && (
          reqLoading ? <Spinner /> : requests.length === 0 ? (
            <Empty icon={Bell} title="No purchase requests" sub="When customers request a package or membership, they'll appear here" />
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

      {/* ── Package Builder ──────────────────────────────────────── */}
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

      {/* ── Membership Builder ───────────────────────────────────── */}
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

      {/* ── Notify Modal ─────────────────────────────────────────── */}
      {notifyTarget && (
        <NotifyModal
          pkg={notifyTarget}
          onClose={() => setNotifyTarget(null)}
        />
      )}

      {/* ── Notification Settings Modal ──────────────────────────── */}
      {showNotifSettings && (
        <NotifSettingsModal onClose={() => setShowNotifSettings(false)} />
      )}
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MEMBERSHIP CARD
═══════════════════════════════════════════════════════════════ */
function MembershipCard({ pkg, onEdit, onDelete, onToggle, onNotify }) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
      pkg.isActive ? 'border-violet-200 dark:border-violet-800/60' : 'border-gray-200 dark:border-gray-800 opacity-60'
    }`}>
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
          <PkgIcon iconKey={pkg.icon} size={20} className="text-violet-500 dark:text-violet-400" />
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
        <button onClick={() => onNotify(pkg)} title="Notify customers" className="p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition">
          <Bell className="w-4 h-4" />
        </button>
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

/* ── Shared ────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Empty({ icon: IconComp, title, sub, cta, onClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
        {IconComp && <IconComp className="w-8 h-8 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />}
      </div>
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

/* ═══════════════════════════════════════════════════════════════
   RAZORPAY LOADER
═══════════════════════════════════════════════════════════════ */
const loadRazorpay = () =>
  new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

/* ═══════════════════════════════════════════════════════════════
   NOTIFY MODAL
═══════════════════════════════════════════════════════════════ */
const AUDIENCE_OPTIONS = [
  {
    id: 'my_customers',
    label: 'My Customers',
    desc: 'People who have visited your salon',
    icon: Users,
    color: 'indigo',
    alwaysFree: true,
  },
  {
    id: 'radius_5km',
    label: '5 km Radius',
    desc: 'Customers near your salon',
    icon: null,
    color: 'emerald',
    alwaysFree: false,
    km: 5,
  },
  {
    id: 'radius_10km',
    label: '10 km Radius',
    desc: 'Wider reach around your salon',
    icon: null,
    color: 'blue',
    alwaysFree: false,
    km: 10,
  },
  {
    id: 'radius_25km',
    label: '25 km Radius',
    desc: 'City-wide reach',
    icon: null,
    color: 'violet',
    alwaysFree: false,
    km: 25,
  },
];

function NotifyModal({ pkg, onClose }) {
  const [step, setStep]                 = useState('compose'); // 'compose' | 'audience' | 'confirm' | 'result'
  const [notifTitle, setNotifTitle]     = useState(`Check out ${pkg.name}!`);
  const [notifMessage, setNotifMessage] = useState('');
  const [targetType, setTargetType]     = useState('my_customers');
  const [settings, setSettings]         = useState(null);
  const [preview, setPreview]           = useState(null); // { estimatedCount, isFree, amount }
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending]           = useState(false);
  const [result, setResult]             = useState(null); // { notifiedCount }
  const titleRef = useRef(null);

  // Load notification settings on mount
  useEffect(() => {
    api.get('/owner/notification-settings')
      .then(r => setSettings(r.data.data))
      .catch(() => {});
    titleRef.current?.focus();
  }, []);

  // Load preview whenever targetType changes (on audience step)
  useEffect(() => {
    if (step !== 'audience') return;
    setPreview(null);
    setLoadingPreview(true);
    api.post(`/owner/packages/${pkg._id}/notify`, { targetType, preview: true })
      .then(r => setPreview(r.data.data))
      .catch(() => setPreview({ estimatedCount: 0, isFree: true, amount: 0 }))
      .finally(() => setLoadingPreview(false));
  }, [targetType, step, pkg._id]);

  const priceLabel = (id) => {
    if (!settings) return '';
    if (id === 'my_customers') return 'Free';
    const map = { radius_5km: settings.pricing?.radius5km, radius_10km: settings.pricing?.radius10km, radius_25km: settings.pricing?.radius25km };
    const p = map[id];
    if (p === 0) return 'Free';
    if (settings.freeRadiusRemaining > 0) return `Free (1 left this month)`;
    return `₹${p}`;
  };

  const handleSend = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      const res = await api.post(`/owner/packages/${pkg._id}/notify`, {
        title: notifTitle.trim(), message: notifMessage.trim(), targetType,
      });

      if (res.data.needsPayment) {
        // Open Razorpay checkout
        const ok = await loadRazorpay();
        if (!ok) { toast.error('Payment gateway failed to load'); setSending(false); return; }
        const { campaignId, orderId, amount, razorpayKeyId, ownerName, ownerEmail, ownerPhone } = res.data.data;
        new window.Razorpay({
          key: razorpayKeyId,
          amount: amount * 100,
          currency: 'INR',
          name: 'My Salon Bookings',
          description: `Broadcast: ${pkg.name}`,
          order_id: orderId,
          prefill: { name: ownerName, email: ownerEmail, contact: ownerPhone },
          theme: { color: '#f59e0b' },
          handler: async (pd) => {
            try {
              const vRes = await api.post(`/owner/notification-campaigns/${campaignId}/verify-payment`, {
                razorpayOrderId:   pd.razorpay_order_id,
                razorpayPaymentId: pd.razorpay_payment_id,
                razorpaySignature: pd.razorpay_signature,
              });
              setResult({ notifiedCount: vRes.data.notifiedCount ?? 0 });
              setStep('result');
            } catch {
              toast.error('Payment verified but notification failed. Contact support.');
            } finally { setSending(false); }
          },
          modal: { ondismiss: () => setSending(false) },
        }).open();
        return;
      }

      setResult({ notifiedCount: res.data.notifiedCount ?? 0 });
      setStep('result');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const STEP_LABELS = { compose: 'Compose', audience: 'Audience', confirm: 'Confirm' };
  const STEPS = ['compose', 'audience', 'confirm'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <Bell className="w-[18px] h-[18px] text-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Broadcast Notification</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[220px]">{pkg.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'result' && (
          <div className="flex items-center gap-0 px-6 pt-4 shrink-0">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    step === s ? 'bg-amber-500 text-white' :
                    STEPS.indexOf(step) > i ? 'bg-green-500 text-white' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {STEPS.indexOf(step) > i ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={`text-xs font-semibold ${step === s ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 mx-2 h-px ${STEPS.indexOf(step) > i ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Step: Compose ── */}
          {step === 'compose' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Notification Title</label>
                <input
                  ref={titleRef}
                  type="text"
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Special offer inside!"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                />
                <p className="text-right text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">{notifTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Message</label>
                <textarea
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                  maxLength={200}
                  rows={4}
                  placeholder="Write your message to customers..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition resize-none"
                />
                <p className="text-right text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">{notifMessage.length}/200</p>
              </div>
              {/* Preview card */}
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Preview</p>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{notifTitle || 'Notification title'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notifMessage || 'Your message will appear here'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Audience ── */}
          {step === 'audience' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 dark:text-gray-500">Choose who will receive this notification.</p>
              {AUDIENCE_OPTIONS.map(opt => {
                const isSelected = targetType === opt.id;
                const price = priceLabel(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTargetType(opt.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                      isSelected ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                      {opt.km ? `${opt.km}` : <Users className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{opt.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{opt.desc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        opt.alwaysFree || (settings?.freeRadiusRemaining > 0 && !opt.alwaysFree)
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      }`}>
                        {price || '…'}
                      </span>
                    </div>
                  </button>
                );
              })}

              {/* Estimated reach */}
              {targetType && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {loadingPreview
                    ? 'Estimating reach…'
                    : preview
                      ? `~${preview.estimatedCount} customer${preview.estimatedCount !== 1 ? 's' : ''} will be notified`
                      : '—'}
                </div>
              )}
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === 'confirm' && preview && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Summary</p>
                {[
                  ['Package', pkg.name],
                  ['Audience', AUDIENCE_OPTIONS.find(o => o.id === targetType)?.label || targetType],
                  ['Estimated Reach', `${preview.estimatedCount} customer${preview.estimatedCount !== 1 ? 's' : ''}`],
                  ['Cost', preview.isFree ? 'Free' : `₹${preview.amount}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 dark:text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>

              {/* Notification preview */}
              <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Message Preview</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{notifTitle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notifMessage}</p>
              </div>

              {!preview.isFree && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  You will be charged ₹{preview.amount} via Razorpay to send this notification.
                </p>
              )}
            </div>
          )}

          {/* ── Step: Result ── */}
          {step === 'result' && result && (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Sent!</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>
                  {result.notifiedCount > 0
                    ? `${result.notifiedCount} customer${result.notifiedCount !== 1 ? 's' : ''} notified`
                    : 'No customers with push notifications enabled'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
          {step === 'result' ? (
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold hover:opacity-90 transition">
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (step === 'compose') onClose();
                  else if (step === 'audience') setStep('compose');
                  else if (step === 'confirm') setStep('audience');
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {step === 'compose' ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={() => {
                  if (step === 'compose') {
                    if (!notifTitle.trim() || !notifMessage.trim()) { toast.error('Title and message required'); return; }
                    setStep('audience');
                  } else if (step === 'audience') {
                    setStep('confirm');
                  } else if (step === 'confirm') {
                    handleSend();
                  }
                }}
                disabled={sending}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-bold transition flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
                ) : step === 'confirm' ? (
                  preview?.isFree
                    ? <><Send className="w-4 h-4" /> Send Free</>
                    : <><Send className="w-4 h-4" /> Pay &amp; Send</>
                ) : (
                  'Next →'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION SETTINGS MODAL
═══════════════════════════════════════════════════════════════ */
function NotifSettingsModal({ onClose }) {
  const [settings, setSettings]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({
    broadcastEnabled: true,
    radius5km:  19,
    radius10km: 39,
    radius25km: 79,
  });

  useEffect(() => {
    api.get('/owner/notification-settings').then(r => {
      const d = r.data.data;
      setSettings(d);
      setForm({
        broadcastEnabled: d.broadcastEnabled,
        radius5km:  d.pricing?.radius5km  ?? 19,
        radius10km: d.pricing?.radius10km ?? 39,
        radius25km: d.pricing?.radius25km ?? 79,
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/owner/notification-settings', {
        broadcastEnabled: form.broadcastEnabled,
        pricing: {
          radius5km:  Number(form.radius5km)  || 0,
          radius10km: Number(form.radius10km) || 0,
          radius25km: Number(form.radius25km) || 0,
        },
      });
      toast.success('Notification settings saved');
      onClose();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Settings2 className="w-[18px] h-[18px] text-amber-500" />
            </div>
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Notification Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!settings ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">

            {/* Enable / Disable toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Broadcast Notifications</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Allow sending notifications to customers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.broadcastEnabled}
                  onChange={e => setForm(f => ({ ...f, broadcastEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.broadcastEnabled ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'}
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow after:transition-transform
                  ${form.broadcastEnabled ? 'after:translate-x-5' : 'after:translate-x-0'}`} />
              </label>
            </div>

            {/* Free quota info */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-green-100 dark:border-green-900/40 bg-green-50/60 dark:bg-green-950/10 text-xs">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-green-700 dark:text-green-400">
                <strong>1 free radius campaign per month</strong> — "My Customers" is always free.
                {settings.freeRadiusRemaining > 0
                  ? ` You have ${settings.freeRadiusRemaining} free left this month.`
                  : ' Free quota used this month.'}
              </span>
            </div>

            {/* Pricing per radius tier */}
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">
                Set Campaign Price (₹ per send)
              </p>
              <div className="space-y-3">
                {[
                  { key: 'radius5km',  label: '5 km Radius' },
                  { key: 'radius10km', label: '10 km Radius' },
                  { key: 'radius25km', label: '25 km Radius' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-28 shrink-0">{label}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full pl-7 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Set to 0 to make a tier free.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-bold transition flex items-center justify-center gap-2">
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
