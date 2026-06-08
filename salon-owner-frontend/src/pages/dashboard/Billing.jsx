import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, RefreshCw, Sparkles, Shield, IndianRupee, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout  from '../../components/layout/DashboardLayout';
import billingService   from '../../services/billingService';

const EST_REV = 200; // estimated ₹ per booking

/* ─── Stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color, bg, sub }) => (
  <div className={`${bg} rounded-2xl p-4 border border-white/50 dark:border-gray-800`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/60 dark:bg-gray-900/60 shrink-0">
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-32 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" />)}
    </div>
    <div className="h-48 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" />
  </div>
);

/* ─── Main Billing page ──────────────────────────────────────── */
const Billing = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sRes = await billingService.getSubscriptionStatus();
      if (sRes?.success || sRes?.data) setData(sRes.data || sRes);
    } catch {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { monthlyBookingCount = 0 } = data || {};
  const estRevenue = monthlyBookingCount * EST_REV;

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
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                Billing & Subscription
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
                Your usage at a glance
              </p>
            </div>
            <button onClick={() => load()} disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 self-start" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? <LoadingSkeleton /> : (
            <>
              {/* ── Free plan banner ── */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">GlowLoox is free for all partners</h3>
                </div>
                <p className="text-sm text-white/85 max-w-xl">
                  No subscription, no monthly fees — manage bookings, staff and your storefront at no cost.
                  The only paid feature is optional <strong>Promotions</strong>, which help boost your salon's visibility to nearby customers.
                </p>
              </div>

              {/* ── Stats ── */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                <StatCard
                  icon={Activity} label="This Month" value={monthlyBookingCount}
                  sub="bookings" color="text-indigo-600 dark:text-indigo-400"
                  bg="bg-indigo-50 dark:bg-indigo-950/40"
                />
                <StatCard
                  icon={IndianRupee} label="Est. Revenue" value={`₹${estRevenue.toLocaleString()}`}
                  sub={`₹${EST_REV}/booking`} color="text-emerald-600 dark:text-emerald-400"
                  bg="bg-emerald-50 dark:bg-emerald-950/40"
                />
              </div>

              {/* ── Footer note ── */}
              <div className="flex items-center justify-center gap-3 py-2">
                <Shield className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Looking to grow faster? Check out Promotions in your dashboard.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
