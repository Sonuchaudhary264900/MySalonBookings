import React, { useState, useEffect } from 'react';
import { X, Tag, Percent, IndianRupee, Calendar, Users, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const INP = `w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
  bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all`;

const LABEL = `block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5`;

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className={LABEL}>{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
      <div className={Icon ? 'pl-9' : ''}>{children}</div>
    </div>
  </div>
);

const CouponModal = ({ coupon, onClose, onSaved }) => {
  const isEdit = !!coupon?._id;

  const [form, setForm] = useState({
    code:           '',
    discountType:   'percentage',
    discountValue:  '',
    minOrderAmount: '',
    maxUses:        '',
    expiryDate:     '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (coupon) {
      const expiry = coupon.expiryDate
        ? new Date(coupon.expiryDate).toISOString().split('T')[0]
        : '';
      setForm({
        code:           coupon.code           || '',
        discountType:   coupon.discountType   || 'percentage',
        discountValue:  String(coupon.discountValue  ?? ''),
        minOrderAmount: String(coupon.minOrderAmount ?? ''),
        maxUses:        String(coupon.maxUses        ?? ''),
        expiryDate:     expiry,
      });
    }
  }, [coupon]);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim())                                  { setError('Coupon code is required'); return; }
    if (!form.discountValue || isNaN(+form.discountValue))  { setError('Enter a valid discount value'); return; }
    if (form.discountType === 'percentage' && +form.discountValue > 100) { setError('Percentage cannot exceed 100'); return; }
    if (+form.discountValue <= 0)                           { setError('Discount must be greater than 0'); return; }

    setError('');
    setSaving(true);

    const payload = {
      code:           form.code.trim().toUpperCase(),
      discountType:   form.discountType,
      discountValue:  +form.discountValue,
      minOrderAmount: form.minOrderAmount ? +form.minOrderAmount : 0,
      maxUses:        form.maxUses        ? +form.maxUses        : null,
      expiryDate:     form.expiryDate     || null,
    };

    try {
      if (isEdit) {
        await api.put(`/owner/coupons/${coupon._id}`, payload);
        toast.success('Coupon updated');
      } else {
        await api.post('/owner/coupons', payload);
        toast.success('Coupon created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.data?.message || err?.message || `Failed to ${isEdit ? 'update' : 'create'} coupon`);
    } finally {
      setSaving(false);
    }
  };

  // Suggested codes
  const suggestions = ['SAVE10', 'FLAT50', 'WELCOME20', 'FIRST30', 'VIP100'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
              flex items-center justify-center">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                {isEdit ? 'Edit Coupon' : 'Create Coupon'}
              </h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {isEdit ? 'Update discount details' : 'Set up a new discount code'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Coupon code */}
          <div>
            <label className={LABEL}>Coupon Code *</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                placeholder="e.g. SAVE20"
                className={`${INP} pl-9 font-mono tracking-widest font-semibold uppercase`}
                maxLength={20}
              />
            </div>
            {/* Quick suggestions */}
            {!isEdit && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestions.map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(p => ({ ...p, code: s }))}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono
                      bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400
                      hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400
                      transition-colors border border-gray-200 dark:border-gray-700">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Discount type */}
          <div>
            <label className={LABEL}>Discount Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'percentage', label: 'Percentage', icon: Percent, sub: 'e.g. 20% off' },
                { value: 'fixed',      label: 'Flat Amount', icon: IndianRupee, sub: 'e.g. ₹100 off' },
              ].map(opt => {
                const Icon = opt.icon;
                const active = form.discountType === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(p => ({ ...p, discountType: opt.value }))}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                    }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      active ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${active ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-gray-400">{opt.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discount value */}
          <div>
            <label className={LABEL}>
              {form.discountType === 'percentage' ? 'Discount Percentage *' : 'Discount Amount ₹ *'}
            </label>
            <div className="relative">
              {form.discountType === 'percentage'
                ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                : <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              }
              <input
                type="number"
                value={form.discountValue}
                onChange={set('discountValue')}
                min="1"
                max={form.discountType === 'percentage' ? 100 : undefined}
                placeholder={form.discountType === 'percentage' ? '0–100' : 'Amount'}
                className={`${INP} pl-9`}
              />
            </div>
          </div>

          {/* Row: min order + max uses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Min Order ₹ <span className="normal-case font-normal opacity-60">(opt)</span></label>
              <div className="relative">
                <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="number" value={form.minOrderAmount} onChange={set('minOrderAmount')} min="0" placeholder="e.g. 500"
                  className={`${INP} pl-9`} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Max Uses <span className="normal-case font-normal opacity-60">(opt)</span></label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="number" value={form.maxUses} onChange={set('maxUses')} min="1" placeholder="Unlimited"
                  className={`${INP} pl-9`} />
              </div>
            </div>
          </div>

          {/* Expiry date */}
          <div>
            <label className={LABEL}>Expiry Date <span className="normal-case font-normal opacity-60">(optional)</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={form.expiryDate} onChange={set('expiryDate')}
                min={new Date().toISOString().split('T')[0]}
                className={`${INP} pl-9`} />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
              text-sm font-medium text-gray-600 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white
              text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all
              shadow-md shadow-indigo-500/20 disabled:opacity-60
              flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouponModal;
