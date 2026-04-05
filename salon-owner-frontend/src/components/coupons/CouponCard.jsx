import React, { useState } from 'react';
import {
  Trash2, Edit2, Copy, Check, AlertTriangle, Loader2,
  IndianRupee, Percent, Users, Calendar, ShoppingBag, Bell, BarChart2, Clock,
} from 'lucide-react';

/* ── Delete confirmation overlay ─────────────────────────────── */
const DeleteConfirm = ({ code, onConfirm, onCancel, loading }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
    <div className="text-center px-4 space-y-3">
      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">Delete "{code}"?</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">This cannot be undone.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-xs font-semibold text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white
            text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ── Premium Coupon Card ──────────────────────────────────────── */
const CouponCard = ({
  coupon, onToggle, onEdit, onDelete, onBroadcast, onAnalytics,
  toggling, deleting, broadcasting,
}) => {
  const [copied,     setCopied]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const isExpired  = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
  const isLimitHit = coupon.maxUses && (coupon.usedCount ?? 0) >= coupon.maxUses;
  const isActive   = coupon.isActive && !isExpired && !isLimitHit;

  const statusLabel = isExpired   ? 'Expired'
                    : isLimitHit  ? 'Limit Hit'
                    : coupon.isActive ? 'Active' : 'Disabled';

  const statusCls = isExpired || isLimitHit
    ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
    : coupon.isActive
    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';

  const usagePct = coupon.maxUses
    ? Math.min(100, Math.round(((coupon.usedCount ?? 0) / coupon.maxUses) * 100))
    : null;

  const expiryStr = coupon.expiryDate
    ? new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const daysLeft = coupon.expiryDate && !isExpired
    ? Math.ceil((new Date(coupon.expiryDate) - new Date()) / 86400000)
    : null;

  const remaining  = coupon.remaining ?? (coupon.maxUses ? Math.max(0, coupon.maxUses - (coupon.usedCount ?? 0)) : null);
  const isExpiring = isActive && daysLeft !== null && daysLeft <= 3;
  const isLimitLow = isActive && remaining !== null && remaining <= 10;

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* Gradient strip color based on status */
  const topStrip = isExpired || isLimitHit
    ? 'from-red-400 to-rose-500'
    : coupon.isActive
    ? 'from-indigo-500 via-violet-500 to-purple-500'
    : 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700';

  return (
    <div
      className={`group relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl overflow-hidden
        transition-all duration-300
        ${isActive
          ? 'border border-indigo-100/80 dark:border-indigo-900/40 shadow-md shadow-indigo-500/8 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/20'
          : 'border border-gray-200 dark:border-gray-800 opacity-75'
        }`}
    >
      {showDelete && (
        <DeleteConfirm
          code={coupon.code}
          onConfirm={() => { onDelete(coupon); setShowDelete(false); }}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}

      {/* Gradient top strip */}
      <div className={`h-[3px] bg-gradient-to-r ${topStrip} transition-all duration-300 group-hover:h-[4px]`} />

      {/* Main content */}
      <div className="flex-1 p-5">

        {/* ── Code row ── */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
              Coupon Code
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-black tracking-[0.15em] font-mono
                ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {coupon.code}
              </span>
              <button
                onClick={handleCopy}
                title="Copy code"
                className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                {copied
                  ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                  : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-500" />
                }
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusCls}`}>
              {statusLabel}
            </span>
            {!isExpired && !isLimitHit && (
              <button
                onClick={() => onToggle(coupon)}
                disabled={toggling}
                title={coupon.isActive ? 'Disable' : 'Enable'}
                className={`relative w-9 h-5 rounded-full transition-all duration-300
                  disabled:opacity-40 cursor-pointer focus:outline-none
                  ${coupon.isActive ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md
                  transition-transform duration-300 ${coupon.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            )}
          </div>
        </div>

        {/* ── Discount block ── */}
        <div className={`rounded-2xl p-4 mb-4
          ${isActive
            ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/60 dark:from-indigo-950/30 dark:to-violet-950/20 border border-indigo-100/60 dark:border-indigo-800/20'
            : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0
              ${isActive
                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/30'
                : 'bg-gray-200 dark:bg-gray-700'
              }`}>
              {coupon.discountType === 'percentage'
                ? <Percent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                : <IndianRupee className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              }
            </div>
            <div>
              <p className={`text-2xl font-black leading-none
                ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {coupon.discountType === 'percentage'
                  ? `${coupon.discountValue}%`
                  : `₹${coupon.discountValue}`
                }
              </p>
              <p className={`text-xs font-bold mt-0.5
                ${isActive ? 'text-indigo-400 dark:text-indigo-500' : 'text-gray-400 dark:text-gray-600'}`}>
                {coupon.discountType === 'percentage' ? 'Percentage' : 'Flat Amount'} — OFF
              </p>
            </div>
          </div>
        </div>

        {/* ── Urgency badges ── */}
        {(isExpiring || isLimitLow) && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {isExpiring && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full
                bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400
                border border-amber-200 dark:border-amber-800">
                <Clock className="w-2.5 h-2.5" />
                Expiring in {daysLeft === 0 ? 'today' : `${daysLeft}d`}
              </span>
            )}
            {isLimitLow && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full
                bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400
                border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-2.5 h-2.5" />
                Only {remaining} left
              </span>
            )}
          </div>
        )}

        {/* ── Meta info ── */}
        <div className="space-y-1.5 mb-3">
          {coupon.minOrderAmount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              Min order:&nbsp;
              <span className="font-semibold text-gray-700 dark:text-gray-300">₹{coupon.minOrderAmount}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Users className="w-3.5 h-3.5 shrink-0" />
            Used:&nbsp;
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {coupon.usedCount ?? 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
            </span>
            {remaining !== null && isActive && (
              <span className={`font-semibold ${remaining <= 5 ? 'text-red-500 dark:text-red-400' : remaining <= 10 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400'}`}>
                · {remaining} left
              </span>
            )}
            {!coupon.maxUses && (
              <span className="text-gray-300 dark:text-gray-600 ml-1">∞ unlimited</span>
            )}
          </div>
          {expiryStr && (
            <div className={`flex items-center gap-1.5 text-xs font-medium
              ${isExpired ? 'text-red-500 dark:text-red-400'
              : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500 dark:text-amber-400'
              : 'text-gray-500 dark:text-gray-400'}`}>
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {isExpired
                ? `Expired ${expiryStr}`
                : daysLeft !== null && daysLeft <= 3
                ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                : `Expires ${expiryStr}`
              }
            </div>
          )}
        </div>

        {/* ── Usage progress bar ── */}
        {usagePct !== null && (
          <div className="mb-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Usage</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{usagePct}%</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500
                  ${usagePct >= 90 ? 'bg-gradient-to-r from-red-500 to-rose-500'
                  : usagePct >= 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                  }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
        {onAnalytics && (coupon.usedCount ?? 0) > 0 && (
          <button
            onClick={() => onAnalytics(coupon)}
            title="Analytics"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold
              bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400
              hover:bg-violet-100 dark:hover:bg-violet-950
              border border-violet-200 dark:border-violet-800
              transition-all duration-150"
          >
            <BarChart2 className="w-3.5 h-3.5" /> Analytics
          </button>
        )}
        <button
          onClick={() => onEdit(coupon)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold
            text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800
            hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400
            border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800
            transition-all duration-150"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        {isActive && onBroadcast && (
          <button
            onClick={() => onBroadcast(coupon)}
            disabled={broadcasting}
            title="Notify customers"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold
              bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400
              hover:bg-indigo-100 dark:hover:bg-indigo-950
              border border-indigo-200 dark:border-indigo-800
              transition-all duration-150 disabled:opacity-50"
          >
            {broadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Notify
          </button>
        )}
        <button
          onClick={() => setShowDelete(true)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-semibold
            text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800
            hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400
            border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800
            transition-all duration-150"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

export default CouponCard;
