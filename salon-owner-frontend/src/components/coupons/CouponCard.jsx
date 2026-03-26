import React, { useState } from 'react';
import { Trash2, Edit2, Copy, Check, AlertTriangle, Loader2, IndianRupee, Percent, Users, Calendar, ShoppingBag } from 'lucide-react';

/* ── Delete confirm overlay ── */
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
        <button onClick={onCancel}
          className="flex-1 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700
            text-xs font-semibold text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white
            text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-60">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

const CouponCard = ({ coupon, onToggle, onEdit, onDelete, toggling, deleting }) => {
  const [copied,      setCopied]      = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);

  const isExpired   = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
  const isLimitHit  = coupon.maxUses && (coupon.usedCount ?? 0) >= coupon.maxUses;
  const isActive    = coupon.isActive && !isExpired && !isLimitHit;

  const statusLabel = isExpired   ? 'Expired'
                    : isLimitHit  ? 'Limit Hit'
                    : coupon.isActive ? 'Active' : 'Disabled';

  const statusCls   = isExpired || isLimitHit
    ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
    : coupon.isActive
    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700';

  const usagePct = coupon.maxUses
    ? Math.min(100, Math.round(((coupon.usedCount ?? 0) / coupon.maxUses) * 100))
    : null;

  const expiryStr = coupon.expiryDate
    ? new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const daysLeft = coupon.expiryDate && !isExpired
    ? Math.ceil((new Date(coupon.expiryDate) - new Date()) / 86400000)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`relative group bg-white dark:bg-gray-900 rounded-2xl border
      transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-gray-900/80
      ${isActive
        ? 'border-gray-100 dark:border-gray-800'
        : 'border-gray-100 dark:border-gray-800 opacity-75'
      }`}>

      {showDelete && (
        <DeleteConfirm
          code={coupon.code}
          onConfirm={() => { onDelete(coupon); setShowDelete(false); }}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}

      {/* Top accent line when active */}
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-2xl
          bg-gradient-to-r from-indigo-500/0 via-indigo-500/60 to-violet-500/0
          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="p-4 space-y-3">
        {/* Top: code + status + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* Code block */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${
              isActive
                ? 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <span className={`text-base font-extrabold tracking-widest font-mono ${
                isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {coupon.code}
              </span>
              <button onClick={handleCopy} title="Copy code"
                className={`transition-colors ${copied ? 'text-emerald-500' : 'text-gray-400 hover:text-indigo-500'}`}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusCls}`}>
              {statusLabel}
            </span>
            {/* Toggle */}
            {!isExpired && !isLimitHit && (
              <button
                onClick={() => onToggle(coupon)}
                disabled={toggling}
                title={coupon.isActive ? 'Disable coupon' : 'Enable coupon'}
                className={`relative w-9 h-5 rounded-full transition-all duration-300 focus:outline-none
                  disabled:opacity-40 cursor-pointer
                  ${coupon.isActive ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md
                  transition-transform duration-300 ${coupon.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            )}
          </div>
        </div>

        {/* Discount headline */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isActive
              ? 'bg-indigo-100 dark:bg-indigo-950/60'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {coupon.discountType === 'percentage'
              ? <Percent className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
              : <IndianRupee className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
            }
          </div>
          <span className={`text-lg font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
            {coupon.discountType === 'percentage'
              ? `${coupon.discountValue}% OFF`
              : `₹${coupon.discountValue} OFF`
            }
          </span>
        </div>

        {/* Meta info */}
        <div className="space-y-1.5">
          {coupon.minOrderAmount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <ShoppingBag className="w-3 h-3 shrink-0" />
              Min order: <span className="font-semibold text-gray-700 dark:text-gray-300">₹{coupon.minOrderAmount}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Users className="w-3 h-3 shrink-0" />
            Used: <span className="font-semibold text-gray-700 dark:text-gray-300">
              {coupon.usedCount ?? 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
            </span>
            {!coupon.maxUses && <span className="text-gray-300 dark:text-gray-600">(unlimited)</span>}
          </div>
          {expiryStr && (
            <div className={`flex items-center gap-1.5 text-xs ${
              isExpired ? 'text-red-500 dark:text-red-400 font-semibold'
              : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500 dark:text-amber-400 font-semibold'
              : 'text-gray-500 dark:text-gray-400'
            }`}>
              <Calendar className="w-3 h-3 shrink-0" />
              {isExpired
                ? `Expired ${expiryStr}`
                : daysLeft !== null && daysLeft <= 3
                ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                : `Expires ${expiryStr}`
              }
            </div>
          )}
        </div>

        {/* Usage progress bar */}
        {usagePct !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Usage</span>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{usagePct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePct >= 90 ? 'bg-red-500'
                  : usagePct >= 70 ? 'bg-amber-500'
                  : 'bg-indigo-500'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => onEdit(coupon)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold
              bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400
              border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800
              transition-all">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => setShowDelete(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold
              bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400
              border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800
              transition-all">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouponCard;
