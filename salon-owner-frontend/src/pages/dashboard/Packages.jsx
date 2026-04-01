import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Gift, CreditCard, Check, X,
  ChevronDown, ChevronUp, Tag, Clock, IndianRupee,
  Users, Star, Zap, AlertTriangle, RefreshCw, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';

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
  // package
  services: [], originalPrice: '', discountedPrice: '', discountPercent: '', totalDuration: '',
  // membership
  price: '', billingCycle: 'monthly', durationDays: '30',
  benefitDiscountPercent: '', priorityBooking: false,
  freeServices: [], // [{serviceName, usageLimit}]
};

/* ─────────────────────────────────────────────────────────────── */
export default function Packages() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab]   = useState('packages');   // 'packages' | 'memberships' | 'requests'
  const [items, setItems]           = useState([]);
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [reqLoading, setReqLoading] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [expandedReq, setExpandedReq] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  /* ── fetch ─────────────────────────────────────────────────── */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgRes, memRes] = await Promise.all([
        api.get('/owner/packages?type=package'),
        api.get('/owner/packages?type=membership'),
      ]);
      setItems([
        ...(pkgRes.data.data?.packages || []),
        ...(memRes.data.data?.packages || []),
      ]);
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

  /* ── auto-calc discount % ───────────────────────────────────── */
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

  /* ── open form ──────────────────────────────────────────────── */
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
    if (form.type === 'package' && !form.discountedPrice) { toast.error('Discounted price is required'); return; }
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
            freeServices:    form.freeServices.map(fs => ({
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
        toast.success('Created!');
      }
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  /* ── toggle active ──────────────────────────────────────────── */
  const toggleActive = async (pkg) => {
    try {
      await api.put(`/owner/packages/${pkg._id}`, { isActive: !pkg.isActive });
      setItems(prev => prev.map(p => p._id === pkg._id ? { ...p, isActive: !p.isActive } : p));
    } catch { toast.error('Failed to update'); }
  };

  /* ── delete ─────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/owner/packages/${id}`);
      setItems(prev => prev.filter(p => p._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  /* ── confirm / reject request ───────────────────────────────── */
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

  /* ── derived lists ──────────────────────────────────────────── */
  const packages    = items.filter(i => i.type === 'package');
  const memberships = items.filter(i => i.type === 'membership');
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  /* ═══════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Packages &amp; Memberships</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create bundles and subscriptions to boost revenue</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openCreate('package')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
            >
              <Gift className="w-4 h-4" /> New Package
            </button>
            <button
              onClick={() => openCreate('membership')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition"
            >
              <CreditCard className="w-4 h-4" /> New Membership
            </button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
          {[
            { id: 'packages',    label: 'Packages',    icon: Gift       },
            { id: 'memberships', label: 'Memberships', icon: CreditCard },
            { id: 'requests',    label: 'Requests',    icon: Bell,       badge: pendingCount },
          ].map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
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

        {/* ── Packages tab ──────────────────────────────────────── */}
        {activeTab === 'packages' && (
          loading ? <Spinner /> : packages.length === 0 ? (
            <Empty icon="🎁" title="No packages yet" sub="Create a service bundle with a discounted price" cta="New Package" onClick={() => openCreate('package')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map(pkg => <PackageCard key={pkg._id} pkg={pkg} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
            </div>
          )
        )}

        {/* ── Memberships tab ───────────────────────────────────── */}
        {activeTab === 'memberships' && (
          loading ? <Spinner /> : memberships.length === 0 ? (
            <Empty icon="💳" title="No memberships yet" sub="Create a subscription plan with recurring benefits" cta="New Membership" onClick={() => openCreate('membership')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberships.map(pkg => <MembershipCard key={pkg._id} pkg={pkg} onEdit={openEdit} onDelete={handleDelete} onToggle={toggleActive} />)}
            </div>
          )
        )}

        {/* ── Requests tab ──────────────────────────────────────── */}
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
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleRequestAction(req._id, 'confirm')}
                            disabled={confirmingId === req._id}
                            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {confirmingId === req._id ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</> : <><Check className="w-4 h-4" /> Confirm Payment</>}
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

      {/* ── Create / Edit Modal ────────────────────────────────── */}
      {showForm && (
        <PackageFormModal
          form={form}
          editId={editId}
          saving={saving}
          onChange={handleFormChange}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </DashboardLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PACKAGE CARD
═══════════════════════════════════════════════════════════════ */
function PackageCard({ pkg, onEdit, onDelete, onToggle }) {
  const savings = pkg.originalPrice && pkg.discountedPrice
    ? pkg.originalPrice - pkg.discountedPrice : 0;

  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-2xl overflow-hidden transition-all ${
      pkg.isActive ? 'border-indigo-200 dark:border-indigo-800/60' : 'border-gray-200 dark:border-gray-800 opacity-60'
    }`}>
      {/* Top bar */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-2xl shrink-0">
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

      {/* Price row */}
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

      {/* Services */}
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

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        {/* Toggle */}
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
      {/* Top */}
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

      {/* Price */}
      <div className="px-5 pb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-violet-600 dark:text-violet-400">₹{pkg.price}</span>
          <span className="text-sm text-gray-400">{BILLING_LABEL[pkg.billingCycle] || '/month'}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Valid for {pkg.durationDays} days</p>
      </div>

      {/* Benefits */}
      <div className="px-5 pb-4 space-y-1.5">
        {pkg.benefits?.discountPercent > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
            {pkg.benefits.discountPercent}% off all services
          </div>
        )}
        {pkg.benefits?.priorityBooking && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Zap className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            Priority booking
          </div>
        )}
        {(pkg.benefits?.freeServices || []).slice(0, 3).map((fs, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            {fs.serviceName} × {fs.usageLimit}
          </div>
        ))}
        {(pkg.benefits?.freeServices?.length || 0) > 3 && (
          <p className="text-xs text-gray-400 ml-5">+{pkg.benefits.freeServices.length - 3} more services</p>
        )}
      </div>

      {/* Actions */}
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
   FORM MODAL
═══════════════════════════════════════════════════════════════ */
function PackageFormModal({ form, editId, saving, onChange, onSave, onClose }) {
  const isPackage = form.type === 'package';

  const addFreeService = () => onChange({ freeServices: [...form.freeServices, { serviceName: '', usageLimit: '1' }] });
  const removeFreeService = (i) => onChange({ freeServices: form.freeServices.filter((_, idx) => idx !== i) });
  const updateFreeService = (i, field, value) => {
    const updated = [...form.freeServices];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ freeServices: updated });
  };

  const addService = () => onChange({ services: [...form.services, { serviceName: '', price: '', duration: '' }] });
  const removeService = (i) => onChange({ services: form.services.filter((_, idx) => idx !== i) });
  const updateService = (i, field, value) => {
    const updated = [...form.services];
    updated[i] = { ...updated[i], [field]: value };
    // Auto-recalc originalPrice and totalDuration
    const newServices = updated;
    const origTotal = newServices.reduce((s, sv) => s + (parseFloat(sv.price) || 0), 0);
    const durTotal  = newServices.reduce((s, sv) => s + (parseInt(sv.duration) || 0), 0);
    onChange({ services: newServices, originalPrice: String(origTotal || ''), totalDuration: String(durTotal || '') });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
        rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl ${isPackage ? 'bg-indigo-50 dark:bg-indigo-950' : 'bg-violet-50 dark:bg-violet-950'}`}>
              {form.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {editId ? 'Edit' : 'Create'} {isPackage ? 'Package' : 'Membership'}
              </h2>
              <p className="text-xs text-gray-400">{isPackage ? 'One-time service bundle' : 'Recurring subscription plan'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Icon + Name + Tag row */}
          <div className="flex gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Icon</label>
              <input value={form.icon} onChange={e => onChange({ icon: e.target.value })} maxLength={2}
                className="w-14 h-10 text-center text-xl border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Name *</label>
              <input value={form.name} onChange={e => onChange({ name: e.target.value })} placeholder="e.g. Groom Package"
                className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Description</label>
            <textarea value={form.description} onChange={e => onChange({ description: e.target.value })} rows={2}
              placeholder="Short description shown to customers..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Tag */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Badge Tag</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: '', l: 'None' }, { v: 'popular', l: '🔥 Popular' }, { v: 'recommended', l: '⭐ Recommended' }, { v: 'best_value', l: '💰 Best Value' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => onChange({ tag: v })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                    form.tag === v
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          {isPackage ? (
            <>
              {/* Services list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Services Included</label>
                  <button type="button" onClick={addService} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.services.map((svc, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={svc.serviceName} onChange={e => updateService(i, 'serviceName', e.target.value)} placeholder="Service name"
                        className="flex-1 h-9 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input value={svc.price} onChange={e => updateService(i, 'price', e.target.value)} placeholder="₹" type="number" min="0"
                        className="w-20 h-9 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input value={svc.duration} onChange={e => updateService(i, 'duration', e.target.value)} placeholder="min" type="number" min="0"
                        className="w-16 h-9 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={() => removeService(i)} className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {form.services.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">Add services that are included in this package</p>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Original ₹</label>
                  <input value={form.originalPrice} onChange={e => onChange({ originalPrice: e.target.value })} type="number" min="0" placeholder="Auto"
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Offer ₹ *</label>
                  <input value={form.discountedPrice} onChange={e => onChange({ discountedPrice: e.target.value })} type="number" min="0" placeholder="e.g. 499"
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Discount %</label>
                  <input value={form.discountPercent} readOnly placeholder="Auto"
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800/60 text-green-600 dark:text-green-400 font-bold cursor-not-allowed" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Membership price + cycle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Price ₹ *</label>
                  <input value={form.price} onChange={e => onChange({ price: e.target.value })} type="number" min="0" placeholder="e.g. 999"
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Billing Cycle</label>
                  <select value={form.billingCycle} onChange={e => onChange({ billingCycle: e.target.value })}
                    className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="monthly">Monthly (30 days)</option>
                    <option value="quarterly">Quarterly (90 days)</option>
                    <option value="yearly">Yearly (365 days)</option>
                  </select>
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Validity (days) *</label>
                <input value={form.durationDays} onChange={e => onChange({ durationDays: e.target.value })} type="number" min="1" placeholder="30"
                  className="w-full h-10 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              {/* Benefits */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">Benefits</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <IndianRupee className="w-4 h-4 text-violet-500 shrink-0" />
                    <input value={form.benefitDiscountPercent} onChange={e => onChange({ benefitDiscountPercent: e.target.value })} type="number" min="0" max="100" placeholder="0"
                      className="w-20 h-9 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">% discount on all services</span>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.priorityBooking} onChange={e => onChange({ priorityBooking: e.target.checked })} className="w-4 h-4 rounded text-violet-600" />
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Priority booking</span>
                  </label>
                </div>
              </div>

              {/* Free services */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Free Services (per period)</label>
                  <button type="button" onClick={addFreeService} className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.freeServices.map((fs, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={fs.serviceName} onChange={e => updateFreeService(i, 'serviceName', e.target.value)} placeholder="Service name"
                        className="flex-1 h-9 px-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      <span className="text-xs text-gray-400 shrink-0">×</span>
                      <input value={fs.usageLimit} onChange={e => updateFreeService(i, 'usageLimit', e.target.value)} type="number" min="1" placeholder="1"
                        className="w-16 h-9 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                      <button type="button" onClick={() => removeFreeService(i)} className="text-red-400 hover:text-red-600 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 disabled:opacity-50 ${
              isPackage
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25 shadow-lg'
                : 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/25 shadow-lg'
            }`}>
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> {editId ? 'Update' : 'Create'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shared sub-components ────────────────────────────────────── */
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
        <button onClick={onClick} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition">
          <Plus className="w-4 h-4" /> {cta}
        </button>
      )}
    </div>
  );
}
