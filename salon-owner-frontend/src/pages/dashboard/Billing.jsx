import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSalon } from '../../hooks/useSalon';
import billingService from '../../services/billingService';
import { CreditCard, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const statusBadge = (accessStatus) => {
  if (accessStatus === 'trial') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Trial</span>;
  if (accessStatus === 'active') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>;
  if (accessStatus === 'overdue') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Restricted</span>;
};

const Billing = () => {
  const { subscription, fetchSubscription } = useSalon();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        billingService.getSubscriptionStatus(),
        billingService.getBillingHistory(),
      ]);
      if (statusRes.success) setData(statusRes.data);
      if (historyRes.success) setHistory(historyRes.data);
    } catch (err) {
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelectPlan = async (planType) => {
    try {
      setActionLoading(true);
      setError(null);
      await billingService.selectPlan(planType);
      await load();
      await fetchSubscription();
    } catch {
      setError('Failed to select plan. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayNow = async (planType) => {
    const loaded = await loadRazorpay();
    if (!loaded) { setError('Failed to load payment gateway'); return; }

    try {
      setActionLoading(true);
      setError(null);
      const res = await billingService.createPaymentOrder(planType || data?.planType);
      if (!res.success) { setError('Failed to create payment order'); return; }

      const { orderId, amount, invoiceId, razorpayKeyId, ownerName, ownerEmail, ownerPhone } = res.data;

      const options = {
        key: razorpayKeyId,
        amount: amount * 100,
        currency: 'INR',
        name: 'MySalonBookings',
        description: planType === 'starter' ? 'Monthly Plan — ₹150' : 'Per Booking Plan',
        order_id: orderId,
        prefill: { name: ownerName, email: ownerEmail, contact: ownerPhone },
        handler: async (paymentData) => {
          try {
            const verifyRes = await billingService.verifyPayment({
              razorpayOrderId: paymentData.razorpay_order_id,
              razorpayPaymentId: paymentData.razorpay_payment_id,
              razorpaySignature: paymentData.razorpay_signature,
              invoiceId,
            });
            if (verifyRes.success) {
              setSuccessMsg('Payment successful! Your subscription is now active.');
              await load();
              await fetchSubscription();
            }
          } catch {
            setError('Payment verification failed. Please contact support.');
          }
        },
        modal: { ondismiss: () => setActionLoading(false) },
        theme: { color: '#6366f1' },
      };

      new window.Razorpay(options).open();
    } catch {
      setError('Failed to initiate payment');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  const isTrialActive = data?.trialActive;
  const isPaid = data?.paymentStatus === 'paid';
  const isPerBooking = data?.planType === 'per_booking';
  const showPlanSelection = !isPaid;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={24} className="text-indigo-500" />
            Billing & Subscription
          </h1>
          {statusBadge(data?.accessStatus)}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Status</h2>
          {isTrialActive ? (
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-blue-500" />
              <div>
                <p className="font-semibold text-gray-800">Free Trial Active</p>
                <p className="text-sm text-gray-500">{data.trialDaysRemaining} day{data.trialDaysRemaining !== 1 ? 's' : ''} remaining</p>
              </div>
            </div>
          ) : isPaid ? (
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500" />
              <div>
                <p className="font-semibold text-gray-800 capitalize">{data.planType === 'starter' ? 'Starter Plan — ₹150/month' : 'Per Booking Plan — ₹1/booking'}</p>
                {data.lastPaymentDate && (
                  <p className="text-sm text-gray-500">Last paid: {new Date(data.lastPaymentDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-500" />
              <div>
                <p className="font-semibold text-gray-800">Trial Expired</p>
                <p className="text-sm text-gray-500">Please select a plan to continue</p>
              </div>
            </div>
          )}
        </div>

        {/* Plan Selection */}
        {showPlanSelection && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose a Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Starter */}
              <div className="bg-white rounded-xl border-2 border-indigo-200 p-5 shadow-sm hover:border-indigo-400 transition-colors">
                <h3 className="text-lg font-bold text-gray-900">Starter</h3>
                <p className="text-3xl font-extrabold text-indigo-600 mt-1">₹150<span className="text-sm font-normal text-gray-500">/month</span></p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Unlimited bookings</li>
                  <li>✓ Fixed monthly cost</li>
                  <li>✓ All features included</li>
                </ul>
                <button
                  onClick={() => handlePayNow('starter')}
                  disabled={actionLoading}
                  className="mt-4 w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  Pay ₹150
                </button>
              </div>

              {/* Per Booking */}
              <div className="bg-white rounded-xl border-2 border-emerald-200 p-5 shadow-sm hover:border-emerald-400 transition-colors">
                <h3 className="text-lg font-bold text-gray-900">Per Booking</h3>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">₹1<span className="text-sm font-normal text-gray-500">/booking</span></p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ Pay only for what you use</li>
                  <li>✓ Billed at end of month</li>
                  <li>✓ All features included</li>
                </ul>
                <button
                  onClick={() => handleSelectPlan('per_booking')}
                  disabled={actionLoading}
                  className="mt-4 w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  Select Plan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Usage (per_booking active) */}
        {isPerBooking && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">This Month's Usage</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.monthlyBookingCount} bookings</p>
                <p className="text-sm text-gray-500">Estimated bill: ₹{data.estimatedBill}</p>
              </div>
              {data.accessStatus === 'overdue' && (
                <button
                  onClick={() => handlePayNow('per_booking')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60 transition"
                >
                  Pay Now ₹{data.estimatedBill}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Billing History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Billing History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-right">Bookings</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Paid On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{inv.billingMonth}</td>
                      <td className="px-4 py-3 capitalize text-gray-700">{inv.planType === 'starter' ? 'Starter' : 'Per Booking'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{inv.bookingCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">₹{inv.amount}</td>
                      <td className="px-4 py-3 text-center">
                        {inv.paymentStatus === 'paid' ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Paid</span>
                        ) : inv.paymentStatus === 'pending' ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Pending</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Failed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
