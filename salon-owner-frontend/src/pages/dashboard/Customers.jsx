import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, X, Users, Plus, ChevronDown, ChevronUp,
  Phone, Mail, Calendar, IndianRupee, Star, ShieldOff,
  ShieldCheck, Edit2, Trash2, Eye, TrendingUp, Clock,
  ArrowUpDown, Loader2, MessageSquare, UserCheck,
  Square, CheckSquare, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { formatDate } from '../../utils/exportHelpers';
import BulkActionBar from '../../components/BulkActionBar';
import ConfirmModal from '../../components/common/ConfirmModal';

/* ─── Helpers ────────────────────────────────────────────────── */
const initials = (name) =>
  (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/* ─── Customer tag logic ─────────────────────────────────────── */
const getTag = (c) => {
  const visits = c.totalBookings ?? 0;
  const spent  = c.totalSpent   ?? 0;
  if (visits >= 10 || spent >= 2000) return { label: 'VIP',     cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-700',    dot: 'bg-amber-400' };
  if (visits >= 3)                   return { label: 'Regular', cls: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-700', dot: 'bg-indigo-400' };
  return                                    { label: 'New',     cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-700', dot: 'bg-emerald-400' };
};

const STATUS_BADGE = {
  confirmed:   'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300',
  pending:     'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
  completed:   'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
  cancelled:   'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400',
  in_progress: 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300',
};

/* ─── Skeleton row ───────────────────────────────────────────── */
const SkeletonRow = () => (
  <tr className="border-b border-gray-100 dark:border-gray-800 animate-pulse">
    {[48, 36, 24, 28, 24, 20, 16].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className="h-4 rounded-lg bg-gray-200 dark:bg-gray-800" style={{ width: `${w * 2}px` }} />
      </td>
    ))}
  </tr>
);

/* ─── Empty State ────────────────────────────────────────────── */
const EmptyState = ({ search, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 animate-[fadeup_0.4s_ease_both]">
    <style>{`@keyframes fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
    <div className="relative mb-5">
      <div className="absolute inset-0 bg-indigo-400/10 dark:bg-indigo-400/5 rounded-full scale-150 blur-2xl" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950
        flex items-center justify-center shadow-inner">
        <Users className="w-9 h-9 text-indigo-400 dark:text-indigo-500" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
      {search ? `No customers match "${search}"` : 'No customers yet'}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-8">
      {search
        ? 'Try a different name or phone number.'
        : 'Customers appear here after bookings or when you add them manually.'}
    </p>
  </div>
);

/* ─── Sort header cell ───────────────────────────────────────── */
const SortTh = ({ label, field, sort, onSort }) => {
  const active = sort.field === field;
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(field)}
        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide
          text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        {label}
        {active
          ? sort.dir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
          : <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />}
      </button>
    </th>
  );
};

/* ─── Add / Edit Modal ───────────────────────────────────────── */
const CustomerFormModal = ({ customer, onClose, onSaved }) => {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name:  customer?.name  || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    notes: customer?.notes || '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\+?[\d\s\-]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/owner/customers/${customer._id}`, form);
        toast.success('Customer updated!');
      } else {
        await api.post('/owner/customers', form);
        toast.success('Customer added!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally { setLoading(false); }
  };

  const INP = `w-full px-3.5 py-2.5 rounded-xl border text-sm
    bg-white dark:bg-gray-800/70
    border-gray-200 dark:border-gray-700
    text-gray-900 dark:text-white
    placeholder-gray-400 dark:placeholder-gray-500
    focus:outline-none focus:ring-2 focus:ring-indigo-500
    transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
        rounded-2xl shadow-2xl w-full max-w-md animate-[scalein_0.2s_ease_both]">
        <style>{`@keyframes scalein{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:none}}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Customer' : 'Add Customer'}
            </h2>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name *</label>
            <input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="Customer name" className={INP} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone *</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="tel" value={form.phone} onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(p => ({ ...p, phone: '' })); }}
                placeholder="9876543210" className={`${INP} pl-10`} />
            </div>
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-gray-400">(optional)</span></label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="customer@email.com" className={`${INP} pl-10`} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Notes <span className="text-gray-400">(optional)</span></span>
            </label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={3} placeholder="Any notes about this customer…"
              className={`${INP} resize-none`} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                text-sm font-medium text-gray-600 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-indigo-600 to-violet-600
                hover:from-indigo-500 hover:to-violet-500
                flex items-center justify-center gap-2 transition-all
                shadow-lg shadow-indigo-500/20 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Customer Detail Drawer ─────────────────────────────────── */
const CustomerDrawer = ({ customer, onClose, onEdit, onBlock, isBlocked, blockLoading }) => {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    api.get(`/owner/customers/${customer._id}/bookings`)
      .then(res => {
        const d = res.data.data;
        setBookings(Array.isArray(d) ? d : (d?.bookings || []));
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return null;
  const tag  = getTag(customer);
  const ini  = initials(customer.name);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col
        animate-[slidein_0.28s_cubic-bezier(0.16,1,0.3,1)_both]">
        <style>{`@keyframes slidein{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div className="flex flex-col h-full rounded-l-3xl overflow-hidden shadow-2xl
          bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800">

          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Customer Profile</h2>
            <button onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable */}
          <div className="flex-1 overflow-y-auto">

            {/* Profile hero */}
            <div className="px-5 py-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-br from-indigo-50/50 dark:from-indigo-950/20 to-transparent">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500
                  flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25 text-white font-bold text-xl">
                  {ini}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{customer.name}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${tag.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />{tag.label}
                    </span>
                  </div>
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-1">
                      <Phone className="w-3.5 h-3.5" />{customer.phone}
                    </a>
                  )}
                  {customer.email && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />{customer.email}
                    </p>
                  )}
                  {customer.notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">"{customer.notes}"</p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                {!customer.isWalkIn && (
                  <button onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                      border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {!customer.isWalkIn && (
                  <button onClick={() => onBlock(customer._id, isBlocked)} disabled={blockLoading}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                      isBlocked
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}>
                    {blockLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : isBlocked
                      ? <><ShieldCheck className="w-3.5 h-3.5" /> Unblock</>
                      : <><ShieldOff className="w-3.5 h-3.5" /> Block</>}
                  </button>
                )}
                {customer.isWalkIn && (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium
                    bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Walk-in Customer
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              {[
                { label: 'Total Visits', value: customer.totalBookings ?? 0,        icon: Calendar,      cls: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950/50'  },
                { label: 'Total Spent',  value: `₹${customer.totalSpent ?? 0}`,     icon: IndianRupee,   cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
                { label: 'Last Visit',   value: customer.lastVisit ? formatDate(customer.lastVisit) : '—', icon: Clock, cls: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
              ].map(({ label, value, icon: Icon, cls, bg }) => (
                <div key={label} className="flex flex-col items-center text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-1.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cls}`} />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Booking history */}
            <div className="px-5 py-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> Booking History
              </p>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-600">No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.map(b => (
                    <div key={b._id} className="flex items-center gap-3 p-3 rounded-xl
                      bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.serviceName || '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatDate(b.appointmentDate)} · {b.appointmentTime}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_BADGE[b.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0">₹{b.totalAmount || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Mobile customer card ───────────────────────────────────── */
const CustomerCard = ({ customer, onClick }) => {
  const tag = getTag(customer);
  const ini = initials(customer.name);
  return (
    <button onClick={onClick} type="button"
      className="w-full text-left bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
        rounded-2xl p-4 hover:shadow-md dark:hover:shadow-gray-900 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500
          flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm">
          {ini}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{customer.name}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ring-1 ${tag.cls} shrink-0`}>
              {tag.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{customer.phone || customer.email || '—'}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{customer.totalBookings ?? 0} visits</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">₹{customer.totalSpent ?? 0}</p>
        </div>
      </div>
    </button>
  );
};

/* ─── Main Page ──────────────────────────────────────────────── */
export default function Customers() {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');   // all | vip | regular | new
  const [sort,         setSort]         = useState({ field: 'totalBookings', dir: 'desc' });
  const [selected,     setSelected]     = useState(null);
  const [editing,      setEditing]      = useState(null);    // null | customer | 'new'
  const [blockedIds,      setBlockedIds]      = useState(new Set());
  const [blockLoading,    setBlockLoading]    = useState(null);
  const [page,            setPage]            = useState(1);
  const [selectedCIds,    setSelectedCIds]    = useState(new Set());
  const [activityFilter,  setActivityFilter]  = useState('all'); // all | active30 | active90 | inactive90
  const [confirmDelete,   setConfirmDelete]   = useState(null); // null | { type: 'single', id } | { type: 'bulk', ids }
  useEffect(() => { document.title = 'Customers — GlowLoox'; }, []);
  const PAGE_SIZE = 20;

  const toggleSelectC = (id) => setSelectedCIds(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const bulkBlockCustomers = async (ids) => {
    try {
      await api.patch('/owner/customers/bulk', { ids, action: 'block' });
      setBlockedIds(prev => new Set([...prev, ...ids]));
      setSelectedCIds(new Set());
      toast.success(`${ids.length} customer${ids.length > 1 ? 's' : ''} blocked`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk block failed');
    }
  };

  const bulkDeleteCustomers = (ids) => setConfirmDelete({ type: 'bulk', ids });

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/owner/customers');
      const d   = res.data.data;
      setCustomers(Array.isArray(d) ? d : (d?.customers || []));
    } catch { setCustomers([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    api.get('/owner/blocked-customers')
      .then(res => {
        const ids = new Set(
          (res.data.data?.blockedCustomers || [])
            .map(bc => String(bc.customerId?._id || bc.customerId))
            .filter(Boolean)
        );
        setBlockedIds(ids);
      })
      .catch(() => {});
  }, []);

  const handleBlock = async (customerId, currentlyBlocked) => {
    setBlockLoading(customerId);
    try {
      if (currentlyBlocked) {
        await api.delete(`/owner/customers/${customerId}/block`);
        setBlockedIds(prev => { const n = new Set(prev); n.delete(String(customerId)); return n; });
        toast.success('Customer unblocked');
      } else {
        await api.post(`/owner/customers/${customerId}/block`, { reason: 'Blocked by owner' });
        setBlockedIds(prev => new Set([...prev, String(customerId)]));
        toast.success('Customer blocked');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setBlockLoading(null); }
  };

  const handleDelete = (customerId) => setConfirmDelete({ type: 'single', id: customerId });

  const executeDelete = async () => {
    const d = confirmDelete;
    setConfirmDelete(null);
    if (!d) return;
    try {
      if (d.type === 'bulk') {
        await api.patch('/owner/customers/bulk', { ids: d.ids, action: 'delete' });
        setCustomers(prev => prev.filter(c => !d.ids.includes(c._id)));
        setSelectedCIds(new Set());
        toast.success(`${d.ids.length} customer${d.ids.length > 1 ? 's' : ''} deleted`);
      } else {
        await api.delete(`/owner/customers/${d.id}`);
        setCustomers(prev => prev.filter(c => c._id !== d.id));
        if (selected?._id === d.id) setSelected(null);
        toast.success('Customer deleted');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const toggleSort = (field) => {
    setSort(prev => prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' });
    setPage(1);
  };

  /* Derived: filter + search + sort + paginate */

  // Search-only filtered list (for accurate filter pill counts)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const processed = useMemo(() => {
    let list = searchFiltered;

    // Tag filter
    if (filter !== 'all') {
      list = list.filter(c => getTag(c).label.toLowerCase() === filter);
    }

    // Activity / recency filter
    if (activityFilter !== 'all') {
      const now = Date.now();
      const day = 86400000;
      list = list.filter(c => {
        const last = c.lastVisit ? new Date(c.lastVisit).getTime() : 0;
        const daysSince = last ? (now - last) / day : Infinity;
        if (activityFilter === 'active30')   return daysSince <= 30;
        if (activityFilter === 'active90')   return daysSince <= 90;
        if (activityFilter === 'inactive90') return daysSince > 90;
        return true;
      });
    }

    // Sort
    list = [...list].sort((a, b) => {
      const va = a[sort.field] ?? 0;
      const vb = b[sort.field] ?? 0;
      return sort.dir === 'asc' ? va - vb : vb - va;
    });

    return list;
  }, [searchFiltered, filter, activityFilter, sort]);

  const paginated  = processed.slice(0, page * PAGE_SIZE);
  const hasMore    = processed.length > page * PAGE_SIZE;

  const totalSpent  = customers.reduce((s, c) => s + (c.totalSpent ?? 0), 0);
  const totalVisits = customers.reduce((s, c) => s + (c.totalBookings ?? 0), 0);

  // Pill counts update live as the user types
  const FILTERS = [
    { id: 'all',     label: 'All',     count: searchFiltered.length },
    { id: 'vip',     label: 'VIP',     count: searchFiltered.filter(c => getTag(c).label === 'VIP').length },
    { id: 'regular', label: 'Regular', count: searchFiltered.filter(c => getTag(c).label === 'Regular').length },
    { id: 'new',     label: 'New',     count: searchFiltered.filter(c => getTag(c).label === 'New').length },
  ];

  const vipCount = FILTERS[1].count;

  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Manage and track your salon customers
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or phone…"
                className="pl-10 pr-9 py-2 rounded-xl border text-sm w-56
                  bg-white dark:bg-gray-900
                  border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* ── Stats ── */}
        {customers.length > 0 && !loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: customers.length, icon: Users,        cls: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950/50'  },
              { label: 'VIP Customers',   value: vipCount,         icon: Star,         cls: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-950/50'    },
              { label: 'Total Visits',    value: totalVisits,      icon: Calendar,     cls: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-950/50'  },
              { label: 'Total Revenue',   value: `₹${totalSpent}`, icon: IndianRupee,  cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
            ].map(({ label, value, icon: Icon, cls, bg }) => (
              <div key={label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
                rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${cls}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter pills ── */}
        {customers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(f => {
              const active = filter === f.id;
              return (
                <button key={f.id} onClick={() => { setFilter(f.id); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}>
                  {f.label}
                  {f.count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      active ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>{f.count}</span>
                  )}
                </button>
              );
            })}

            {/* Activity segmentation */}
            <div className="ml-auto">
              <select
                value={activityFilter}
                onChange={e => { setActivityFilter(e.target.value); setPage(1); }}
                className="text-sm px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="all">All activity</option>
                <option value="active30">Active last 30 days</option>
                <option value="active90">Active last 90 days</option>
                <option value="inactive90">Inactive 90+ days</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Search result count ── */}
        {search.trim() && !loading && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {processed.length === 0
              ? `No results for "${search}"`
              : `Showing ${processed.length} result${processed.length !== 1 ? 's' : ''} for "${search}"`
            }
          </p>
        )}

        {/* ── Content ── */}
        {loading ? (
          <>
            {/* Desktop skeleton */}
            <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                    {['Customer','Phone','Visits','Last Visit','Spent','Tag',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</tbody>
              </table>
            </div>
            {/* Mobile skeleton */}
            <div className="md:hidden space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : processed.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
            <EmptyState search={search} onAdd={() => setEditing('new')} />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                    <th className="pl-4 pr-2 py-3 w-8">
                      <button
                        onClick={() => {
                          const allIds = paginated.map(c => c._id);
                          const allSel = allIds.every(id => selectedCIds.has(id));
                          setSelectedCIds(allSel ? new Set() : new Set(allIds));
                        }}
                        className="text-gray-400 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {paginated.length > 0 && paginated.every(c => selectedCIds.has(c._id))
                          ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</th>
                    <SortTh label="Visits"    field="totalBookings" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Visit</th>
                    <SortTh label="Spent"     field="totalSpent"    sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tag</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(customer => {
                    const tag       = getTag(customer);
                    const ini       = initials(customer.name);
                    const isBlocked = blockedIds.has(String(customer._id));
                    const isSel     = selectedCIds.has(customer._id);
                    return (
                      <tr key={customer._id}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group ${isSel ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}
                        onClick={() => setSelected(customer)}>

                        {/* Checkbox */}
                        <td className="pl-4 pr-2 py-3.5 w-8" onClick={e => { e.stopPropagation(); toggleSelectC(customer._id); }}>
                          {isSel
                            ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400" />}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500
                              flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm">
                              {ini}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                              {customer.email && <p className="text-xs text-gray-400 dark:text-gray-500">{customer.email}</p>}
                              {isBlocked && <span className="text-[10px] text-red-500 font-medium">Blocked</span>}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3.5">
                          {customer.phone
                            ? <a href={`tel:${customer.phone}`} className="text-sm text-gray-700 dark:text-gray-300 font-mono hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{customer.phone}</a>
                            : <span className="text-sm text-gray-400 dark:text-gray-600">—</span>}
                        </td>

                        {/* Visits */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{customer.totalBookings ?? 0}</p>
                        </td>

                        {/* Last visit */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {customer.lastVisit ? formatDate(customer.lastVisit) : '—'}
                          </p>
                        </td>

                        {/* Spent */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{customer.totalSpent ?? 0}</p>
                        </td>

                        {/* Tag */}
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${tag.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />{tag.label}
                          </span>
                        </td>

                        {/* Row actions */}
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setSelected(customer)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!customer.isWalkIn && (
                              <button onClick={() => setEditing(customer)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Edit">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!customer.isWalkIn && (
                              <button onClick={() => handleDelete(customer._id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Load more */}
              {hasMore && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
                  <button onClick={() => setPage(p => p + 1)}
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    Load more ({processed.length - page * PAGE_SIZE} remaining)
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginated.map(c => (
                <CustomerCard key={c._id} customer={c} onClick={() => setSelected(c)} />
              ))}
              {hasMore && (
                <button onClick={() => setPage(p => p + 1)}
                  className="w-full py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400
                    bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-sm transition-all">
                  Load more
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Customer Detail Drawer */}
      {selected && (
        <CustomerDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onBlock={handleBlock}
          isBlocked={!selected.isWalkIn && blockedIds.has(String(selected._id))}
          blockLoading={blockLoading === selected._id}
        />
      )}

      {/* Add / Edit Modal */}
      {editing && (
        <CustomerFormModal
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={fetchCustomers}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={[...selectedCIds]}
        onClear={() => setSelectedCIds(new Set())}
        actions={[
          { label: 'Block',  icon: Ban,   variant: 'danger',  onClick: bulkBlockCustomers },
          { label: 'Delete', icon: Trash2, variant: 'danger', onClick: bulkDeleteCustomers },
        ]}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        title={confirmDelete?.type === 'bulk'
          ? `Delete ${confirmDelete?.ids?.length} customer${confirmDelete?.ids?.length > 1 ? 's' : ''}?`
          : 'Delete this customer?'}
        message="This cannot be undone. All associated data will be permanently removed."
        confirmLabel="Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </DashboardLayout>
  );
}
