import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, User, ChevronRight, Users } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { formatDate } from '../../utils/exportHelpers';

function maskPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const prefix = phone.startsWith('+') ? phone.slice(0, 3) + ' ' : '';
  const local = phone.startsWith('+') ? digits.slice(2) : digits;
  if (local.length <= 4) return prefix + '****';
  return prefix + local.slice(0, 2) + '****' + local.slice(-2);
}

const STATUS_COLORS = {
  confirmed:   'text-green-700 bg-green-100',
  pending:     'text-yellow-700 bg-yellow-100',
  completed:   'text-blue-700 bg-blue-100',
  cancelled:   'text-red-600 bg-red-100',
  in_progress: 'text-purple-700 bg-purple-100',
};

function CustomerDetailModal({ customer, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(false);

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
  const initials = customer.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Profile */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-indigo-600">{initials}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">{customer.name}</p>
              {customer.phone && <p className="text-sm text-gray-500 mt-0.5">{maskPhone(customer.phone)}</p>}
              {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Visits', value: customer.totalBookings ?? bookings.length },
              { label: 'Total Spent',  value: `₹${customer.totalSpent ?? 0}` },
              { label: 'Last Visit',   value: customer.lastVisit ? formatDate(customer.lastVisit) : '—' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="font-bold text-gray-900 text-lg">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Booking history */}
          <div>
            <p className="font-semibold text-gray-800 mb-3">Booking History</p>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No bookings found</p>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => (
                  <div key={b._id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{b.serviceName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(b.appointmentDate)} · {b.appointmentTime}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {b.status?.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-bold text-green-600 shrink-0">₹{b.totalAmount || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/owner/customers');
      const d = res.data.data;
      setCustomers(Array.isArray(d) ? d : (d?.customers || []));
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-500 text-sm mt-1">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Search */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-3">
            <Users className="w-12 h-12 text-gray-300" />
            <p className="font-semibold text-gray-900">{search ? 'No customers match your search' : 'No customers yet'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {filtered.map(customer => {
              const initials = customer.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
              return (
                <button
                  key={customer._id}
                  onClick={() => setSelected(customer)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-indigo-600">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                    <p className="text-sm text-gray-500 truncate">{customer.phone ? maskPhone(customer.phone) : (customer.email || 'No contact')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-indigo-600">{customer.totalBookings ?? 0} visits</p>
                    <p className="text-xs text-gray-400">₹{customer.totalSpent ?? 0}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} />
      )}
    </DashboardLayout>
  );
}
