import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';

function CouponModal({ onClose, onSaved }) {
  const [code,            setCode]            = useState('');
  const [discountType,    setDiscountType]    = useState('percentage');
  const [discountValue,   setDiscountValue]   = useState('');
  const [minOrderAmount,  setMinOrderAmount]  = useState('');
  const [maxUses,         setMaxUses]         = useState('');
  const [expiryDate,      setExpiryDate]      = useState('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!code.trim())                               { setError('Please enter a coupon code'); return; }
    if (!discountValue || isNaN(Number(discountValue))) { setError('Please enter a valid discount value'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/owner/coupons', {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue:  Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        maxUses:        maxUses ? Number(maxUses) : null,
        expiryDate:     expiryDate || null,
      });
      toast.success('Coupon created');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Create Coupon</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Coupon Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE20"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Discount Type</label>
            <div className="flex gap-2">
              {[{ value: 'percentage', label: '% Percentage' }, { value: 'fixed', label: '₹ Fixed Amount' }].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDiscountType(opt.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                    discountType === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {discountType === 'percentage' ? 'Discount %' : 'Discount Amount ₹'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? 'e.g. 20' : 'e.g. 100'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Minimum Order Amount ₹ <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="number"
              value={minOrderAmount}
              onChange={e => setMinOrderAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Uses <span className="font-normal text-gray-400">(optional, blank = unlimited)</span></label>
            <input
              type="number"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Coupon'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Coupons() {
  const [coupons,    setCoupons]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [toggling,   setToggling]   = useState(null);
  const [deleting,   setDeleting]   = useState(null);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await api.get('/owner/coupons');
      const d = res.data.data;
      setCoupons(Array.isArray(d) ? d : (d?.coupons || []));
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const toggleActive = async (coupon) => {
    setToggling(coupon._id);
    try {
      await api.put(`/owner/coupons/${coupon._id}`, { isActive: !coupon.isActive });
      setCoupons(prev => prev.map(c => c._id === coupon._id ? { ...c, isActive: !c.isActive } : c));
    } catch {
      toast.error('Failed to update coupon');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
            <p className="text-gray-500 text-sm mt-1">Create and manage discount codes</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" /> Create Coupon
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-4">
            <Tag className="w-12 h-12 text-gray-300" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">No coupons yet</p>
              <p className="text-gray-500 text-sm mt-1">Create your first discount code</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Create Coupon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map(coupon => {
              const expired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
              const active  = coupon.isActive && !expired;
              return (
                <div key={coupon._id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  {/* Code + toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`px-3 py-2 rounded-lg ${active ? 'bg-indigo-50' : 'bg-gray-100'}`}>
                      <p className={`text-lg font-extrabold tracking-widest font-mono ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {coupon.code}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!active}
                        disabled={expired || toggling === coupon._id}
                        onChange={() => toggleActive(coupon)}
                      />
                      <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 peer-disabled:opacity-50" />
                    </label>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-bold text-gray-900 text-base">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                    </p>
                    {coupon.minOrderAmount > 0 && <p>Min order: ₹{coupon.minOrderAmount}</p>}
                    <p>Used: {coupon.usedCount ?? 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}</p>
                    {coupon.expiryDate && (
                      <p className={expired ? 'text-red-500 font-semibold' : ''}>
                        {expired ? 'Expired' : `Expires: ${coupon.expiryDate.slice(0, 10)}`}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(coupon)}
                    disabled={deleting === coupon._id}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting === coupon._id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <CouponModal onClose={() => setShowModal(false)} onSaved={fetchCoupons} />
      )}
    </DashboardLayout>
  );
}
