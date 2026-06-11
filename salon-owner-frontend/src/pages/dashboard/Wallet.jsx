import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Plus, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const SOURCE_LABEL = {
  recharge: 'Wallet Recharge',
  booking_payment: 'Booking Payment',
  booking_refund: 'Booking Refund',
  booking_earning: 'Booking Earning',
  admin_adjustment: 'Adjustment',
};

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl ${className}`} />
);

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [amount, setAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState(null);

  useEffect(() => {
    document.title = 'Wallet — GlowLoox';
  }, []);

  const loadWallet = useCallback(async () => {
    try {
      const res = await api.get('/owner/wallet');
      setBalance(res.data?.data?.balance ?? 0);
    } catch {
      // keep previous balance on transient errors
    }
  }, []);

  const loadTransactions = useCallback(async (p = 1) => {
    try {
      const res = await api.get(`/owner/wallet/transactions?page=${p}&limit=10`);
      const data = res.data?.data;
      setTransactions(prev => (p === 1 ? (data?.transactions || []) : [...prev, ...(data?.transactions || [])]));
      setHasMore((data?.pagination?.page || 1) < (data?.pagination?.totalPages || 1));
      setPage(p);
    } catch {
      // keep previous list on transient errors
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadWallet(), loadTransactions(1)]);
      setLoading(false);
    })();
    api.get('/owner/auth/me').then(r => {
      const owner = r.data?.data;
      setOwnerInfo({ name: owner?.name, email: owner?.email, phone: owner?.phone });
    }).catch(() => {});
  }, [loadWallet, loadTransactions]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadTransactions(page + 1);
    setLoadingMore(false);
  };

  const handleRecharge = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setRecharging(true);
    try {
      const orderRes = await api.post('/owner/wallet/recharge/order', { amount: amt });
      const { order, razorpayKeyId } = orderRes.data?.data || {};
      if (!order?.orderId) throw new Error('Could not create payment order');

      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load payment gateway. Check your connection.');

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'GlowLoox',
        description: 'Wallet Recharge',
        prefill: {
          name: ownerInfo?.name || '',
          contact: ownerInfo?.phone || '',
          email: ownerInfo?.email || '',
        },
        theme: { color: '#7c3aed' },
        handler: async (response) => {
          try {
            await api.post('/owner/wallet/recharge/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Wallet recharged successfully');
            setAmount('');
            await Promise.all([loadWallet(), loadTransactions(1)]);
          } catch {
            toast.error('Payment verification failed. Contact support if money was deducted.');
          } finally {
            setRecharging(false);
          }
        },
        modal: { ondismiss: () => setRecharging(false) },
      });
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setRecharging(false);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.message || e?.response?.data?.message || 'Something went wrong');
      setRecharging(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your earnings, refunds & balance</p>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl p-6 text-white bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
          <div className="flex items-center gap-2 mb-2 opacity-85">
            <WalletIcon className="w-4 h-4" strokeWidth={2} />
            <span className="text-xs font-semibold tracking-wide uppercase">GlowLoox Wallet</span>
          </div>
          {loading ? (
            <div className="h-9 w-36 rounded-lg bg-white/25 animate-pulse" />
          ) : (
            <p className="text-3xl font-extrabold">
              ₹{(balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-xs mt-1 opacity-75">Available balance</p>
        </div>

        {/* Recharge */}
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Add Money</p>

          <div className="flex gap-2 mb-3 flex-wrap">
            {QUICK_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  amount === String(a)
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                ₹{a}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 h-11 rounded-xl px-3.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:border-violet-500"
            />
            <button
              onClick={handleRecharge}
              disabled={recharging}
              className="flex items-center justify-center gap-1.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-violet-600 to-indigo-600 disabled:opacity-60"
            >
              {recharging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {recharging ? '...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Transaction History</p>

          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="p-4 flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-14 shrink-0" />
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">No transactions yet.</p>
              </div>
            ) : (
              transactions.map(txn => {
                const isCredit = txn.type === 'credit';
                return (
                  <div key={txn._id} className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCredit ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-red-50 dark:bg-red-950/40'
                    }`}>
                      {isCredit
                        ? <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />
                        : <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2.2} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {SOURCE_LABEL[txn.source] || txn.source}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(txn.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isCredit ? '+' : '-'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full mt-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
