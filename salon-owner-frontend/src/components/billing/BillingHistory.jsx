import React, { useState } from 'react';
import { Receipt, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react';

const STATUS_CFG = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800', icon: CheckCircle },
  pending: { label: 'Pending', cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800', icon: Clock },
  failed:  { label: 'Failed',  cls: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800', icon: XCircle },
};

const PLAN_LABELS = {
  starter:     'Starter Plan',
  per_booking: 'Per Booking',
  free_trial:  'Free Trial',
};

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-gray-50 dark:border-gray-800">
    {[...Array(5)].map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full" style={{ width: `${[60,80,50,70,40][i]}%` }} />
      </td>
    ))}
  </tr>
);

const BillingHistory = ({ history = [], loading }) => {
  const [expanded, setExpanded] = useState(false);
  const PAGE = 5;
  const visible = expanded ? history : history.slice(0, PAGE);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Billing History</h3>
          {history.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60
              text-indigo-600 dark:text-indigo-400 font-semibold">
              {history.length} record{history.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Table — desktop */}
      {loading ? (
        <table className="w-full hidden md:table">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {['Date', 'Plan', 'Bookings', 'Amount', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
            <Receipt className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No billing records yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Your invoices will appear here after payment</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {['Date', 'Plan', 'Bookings', 'Amount', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {visible.map((inv, i) => {
                  const s  = STATUS_CFG[inv.paymentStatus] || STATUS_CFG.pending;
                  const SIcon = s.icon;
                  return (
                    <tr key={inv._id || i}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {fmt(inv.paidAt || inv.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">
                          {PLAN_LABELS[inv.planType] || inv.planType || '—'}
                        </span>
                        {inv.billingMonth && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{inv.billingMonth}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-300">
                        {inv.bookingCount ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-0.5 text-sm font-bold text-gray-900 dark:text-white">
                          <IndianRupee className="w-3 h-3" />{inv.amount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
                          <SIcon className="w-2.5 h-2.5" />{s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {visible.map((inv, i) => {
              const s = STATUS_CFG[inv.paymentStatus] || STATUS_CFG.pending;
              const SIcon = s.icon;
              return (
                <div key={inv._id || i} className="px-4 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {PLAN_LABELS[inv.planType] || inv.planType || '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {fmt(inv.paidAt || inv.createdAt)}
                      {inv.bookingCount ? ` · ${inv.bookingCount} bookings` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">₹{inv.amount ?? 0}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${s.cls}`}>
                      <SIcon className="w-2 h-2" />{s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand / collapse */}
          {history.length > PAGE && (
            <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-800">
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400
                  hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {expanded
                  ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                  : <><ChevronDown className="w-3.5 h-3.5" /> Show {history.length - PAGE} more records</>
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BillingHistory;
