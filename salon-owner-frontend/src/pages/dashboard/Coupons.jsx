import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Tag, RefreshCw, TrendingUp, CheckCircle, XCircle, Clock, Bell, AlertTriangle, BarChart2, X, Loader2, IndianRupee, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CouponCard    from '../../components/coupons/CouponCard';
import CouponBuilder from '../../components/coupons/CouponBuilder';
import api from '../../services/api';

/* ── Stat card ── */
const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className={`${bg} rounded-2xl p-4 border border-white/50 dark:border-gray-800 flex items-center gap-3`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/60 dark:bg-gray-900/60`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  </div>
);

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 animate-pulse">
    <div className="h-8 w-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    <div className="h-6 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg" />
    <div className="space-y-1.5">
      <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-full" />
      <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded-full" />
    </div>
    <div className="flex gap-2">
      <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  </div>
);

/* ── Empty state ── */
const EmptyState = ({ onAdd, hasFilter }) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <style>{`@keyframes tag-pulse{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:.3;transform:scale(1.1)}}`}</style>
      <div className="relative mb-5">
        <div className="absolute inset-0 w-20 h-20 rounded-full bg-indigo-400/20 blur-2xl"
          style={{ animation: 'tag-pulse 3s ease-in-out infinite' }} />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100
          dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shadow-lg">
          <Tag className="w-8 h-8 text-indigo-400 dark:text-indigo-500" />
        </div>
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
        {hasFilter ? 'No coupons in this filter' : 'No coupons yet'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        {hasFilter
          ? 'Try switching to "All" to see all your coupons'
          : 'Create discount codes to attract more customers and grow revenue'
        }
      </p>
      {!hasFilter && (
        <button onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
            hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/25
            hover:shadow-indigo-500/40 hover:scale-[1.02]">
          <Plus className="w-4 h-4" /> Create Your First Coupon
        </button>
      )}
    </div>
  </div>
);

/* ── Filter pill ── */
const FilterPill = ({ label, count, active, onClick }) => (
  <button onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700'
    }`}>
    {label}
    {count !== undefined && (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}>{count}</span>
    )}
  </button>
);

/* ── Analytics Drawer ── */
const AnalyticsDrawer = ({ coupon, onClose }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/owner/coupons/${coupon._id}/analytics`)
      .then(r => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [coupon._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white font-mono tracking-widest">{coupon.code}</h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Usage Analytics</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : !data ? (
            <p className="text-center text-sm text-gray-400 py-12">Failed to load analytics</p>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-900">
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{data.usageCount}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Times Used</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-900">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{data.totalDiscount}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Total Discount</p>
                </div>
                <div className="bg-violet-50 dark:bg-violet-950/40 rounded-xl p-3 text-center border border-violet-100 dark:border-violet-900">
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    {data.remaining !== null ? data.remaining : '∞'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Remaining</p>
                </div>
              </div>

              {/* Usage history */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Usage History</p>
                {data.history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No usage history yet</p>
                ) : (
                  <div className="space-y-2">
                    {data.history.map((h, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{h.customer}</p>
                          {h.phone && (
                            <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />{h.phone}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">-₹{h.discountApplied}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(h.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Coupons page ──────────────────────────────────────── */
export default function Coupons() {
  const [coupons,       setCoupons]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('all'); // all | active | expired | disabled
  const [modal,         setModal]         = useState(null);  // null | 'create' | coupon-object (edit)
  const [toggling,      setToggling]      = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [broadcasting,  setBroadcasting]  = useState(null);  // couponId being broadcast
  const [analytics,     setAnalytics]     = useState(null);  // coupon object for analytics drawer

  const fetchCoupons = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/owner/coupons');
      const d   = res.data?.data;
      setCoupons(Array.isArray(d) ? d : (d?.coupons || []));
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const isExpired  = (c) => c.expiryDate && new Date(c.expiryDate) < new Date();
  const isLimitHit = (c) => c.maxUses && (c.usedCount ?? 0) >= c.maxUses;
  const isActive   = (c) => c.isActive && !isExpired(c) && !isLimitHit(c);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total:    coupons.length,
    active:   coupons.filter(isActive).length,
    expired:  coupons.filter(c => isExpired(c) || isLimitHit(c)).length,
    disabled: coupons.filter(c => !c.isActive && !isExpired(c) && !isLimitHit(c)).length,
    totalUsed: coupons.reduce((s, c) => s + (c.usedCount ?? 0), 0),
  }), [coupons]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    if (filter === 'active')   return coupons.filter(isActive);
    if (filter === 'expired')  return coupons.filter(c => isExpired(c) || isLimitHit(c));
    if (filter === 'disabled') return coupons.filter(c => !c.isActive && !isExpired(c));
    return coupons;
  }, [coupons, filter]);

  const handleToggle = async (coupon) => {
    setToggling(coupon._id);
    try {
      await api.put(`/owner/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, isActive: !c.isActive } : c));
      toast.success(coupon.isActive ? 'Coupon disabled' : 'Coupon enabled');
    } catch {
      toast.error('Failed to update coupon');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (coupon) => {
    setDeleting(coupon._id);
    try {
      await api.delete(`/owner/coupons/${coupon._id}`);
      setCoupons(prev => prev.filter(c => c._id !== coupon._id));
      toast.success('Coupon deleted');
    } catch {
      toast.error('Failed to delete coupon');
    } finally {
      setDeleting(null);
    }
  };

  const handleSaved = () => fetchCoupons(true);

  const handleBroadcast = async (coupon) => {
    setBroadcasting(coupon._id);
    try {
      const res = await api.post('/owner/coupons/broadcast', { couponId: coupon._id });
      const { sent, total } = res.data.data || {};
      if (sent > 0) toast.success(`📣 Sent to ${sent} of ${total} customers!`);
      else toast(`No customers with push notifications enabled yet.`, { icon: 'ℹ️' });
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setBroadcasting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                  flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                Coupons
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Create and manage discount codes
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => fetchCoupons()} disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setModal('create')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold
                  hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20">
                <Plus className="w-4 h-4" /> Create Coupon
              </button>
            </div>
          </div>

          {/* ── Expiring soon alert ── */}
          {!loading && (() => {
            const expiring = coupons.filter(c => {
              const d = c.daysLeft ?? (c.expiryDate ? Math.ceil((new Date(c.expiryDate) - new Date()) / 86400000) : null);
              return isActive(c) && d !== null && d <= 3 && d >= 0;
            });
            if (!expiring.length) return null;
            return (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {expiring.length} coupon{expiring.length > 1 ? 's' : ''} expiring soon
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    {expiring.map(c => c.code).join(', ')} — notify your customers now!
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ── Stats ── */}
          {!loading && coupons.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Tag}          label="Total Coupons" value={stats.total}    color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-950/40" />
              <StatCard icon={CheckCircle}  label="Active"        value={stats.active}   color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/40" />
              <StatCard icon={XCircle}      label="Expired"       value={stats.expired}  color="text-red-600 dark:text-red-400"     bg="bg-red-50 dark:bg-red-950/40" />
              <StatCard icon={TrendingUp}   label="Total Used"    value={stats.totalUsed} color="text-violet-600 dark:text-violet-400" bg="bg-violet-50 dark:bg-violet-950/40" />
            </div>
          )}

          {/* ── Filters ── */}
          {!loading && coupons.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill label="All"      count={stats.total}    active={filter === 'all'}      onClick={() => setFilter('all')} />
              <FilterPill label="Active"   count={stats.active}   active={filter === 'active'}   onClick={() => setFilter('active')} />
              <FilterPill label="Expired"  count={stats.expired}  active={filter === 'expired'}  onClick={() => setFilter('expired')} />
              {stats.disabled > 0 && (
                <FilterPill label="Disabled" count={stats.disabled} active={filter === 'disabled'} onClick={() => setFilter('disabled')} />
              )}
            </div>
          )}

          {/* ── Content ── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : coupons.length === 0 ? (
            <EmptyState onAdd={() => setModal('create')} hasFilter={false} />
          ) : filtered.length === 0 ? (
            <EmptyState onAdd={() => setModal('create')} hasFilter={true} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(coupon => (
                <CouponCard
                  key={coupon._id}
                  coupon={coupon}
                  onToggle={handleToggle}
                  onEdit={(c) => setModal(c)}
                  onDelete={handleDelete}
                  onBroadcast={handleBroadcast}
                  onAnalytics={(c) => setAnalytics(c)}
                  toggling={toggling === coupon._id}
                  deleting={deleting === coupon._id}
                  broadcasting={broadcasting === coupon._id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create/Edit Builder ── */}
      {modal && (
        <CouponBuilder
          coupon={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Analytics Drawer ── */}
      {analytics && (
        <AnalyticsDrawer
          coupon={analytics}
          onClose={() => setAnalytics(null)}
        />
      )}
    </DashboardLayout>
  );
}
