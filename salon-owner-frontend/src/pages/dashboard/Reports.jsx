import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DateRangeFilter from '../../components/reports/DateRangeFilter';
import { formatDate, formatTime } from '../../utils/exportHelpers';
import api from '../../services/api';
import * as salonService from '../../services/salonService';

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_COLORS = {
  completed:  'bg-green-600 text-white',
  confirmed:  'bg-blue-600 text-white',
  pending:    'bg-yellow-500 text-white',
  cancelled:  'bg-red-600 text-white',
  in_progress:'bg-purple-600 text-white',
};

const Reports = () => {
  const today         = localDate(0);
  const thirtyDaysAgo = localDate(-30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate,   setEndDate]   = useState(today);
  const [loading,   setLoading]   = useState(true);
  const [data,      setData]      = useState(null);

  // ── Recent Bookings date filter ──
  const [bookingsDate, setBookingsDate]         = useState(today);
  const [bookingsList, setBookingsList]         = useState([]);
  const [bookingsLoading, setBookingsLoading]   = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/owner/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data.data);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingsByDate = async (date) => {
    setBookingsLoading(true);
    try {
      const res = await salonService.getBookings({ date });
      setBookingsList(res.data || []);
    } catch {
      setBookingsList([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const shiftBookingsDate = (days) => {
    const d = new Date(bookingsDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const next = localDate(0);
    const shifted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (shifted <= today) setBookingsDate(shifted);
  };

  useEffect(() => { fetchAnalytics(); }, [startDate, endDate]);
  useEffect(() => { fetchBookingsByDate(bookingsDate); }, [bookingsDate]);

  const totalRevenue   = data?.totalRevenue        ?? 0;
  const totalBookings  = data?.totalBookings        ?? 0;
  const completed      = data?.completedBookings    ?? 0;
  const pending        = data?.pendingBookings      ?? 0;
  const cancelled      = data?.cancelledBookings    ?? 0;
  const dailyRevenue   = data?.dailyRevenue         ?? [];
  const recentBookings = data?.recentBookings       ?? [];
  const topServices    = data?.topServices          ?? [];
  const avgDaily       = dailyRevenue.length ? Math.round(totalRevenue / dailyRevenue.length) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time overview of your salon's performance</p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onReset={() => { setStartDate(thirtyDaysAgo); setEndDate(today); }}
          loading={loading}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-600">Total Revenue</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">₹{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-2">{formatDate(startDate)} – {formatDate(endDate)}</p>
              </div>

              <div className="bg-green-50 rounded-lg border-2 border-green-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-600">Total Bookings</p>
                </div>
                <p className="text-2xl font-bold text-green-900">{totalBookings}</p>
                <p className="text-xs text-green-600 mt-2">
                  {completed} completed · {pending} pending · {cancelled} cancelled
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg border-2 border-purple-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <p className="text-sm text-purple-600">Avg Daily Revenue</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">₹{avgDaily.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-2">Across {dailyRevenue.length} active day{dailyRevenue.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Daily Revenue Table */}
            <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900">Daily Revenue Breakdown</h3>
              </div>
              {dailyRevenue.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No booking data for the selected period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-gray-700 font-medium">Date</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-medium">Bookings</th>
                        <th className="px-6 py-3 text-left text-gray-700 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dailyRevenue.map(row => (
                        <tr key={row.date} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-900">{formatDate(row.date)}</td>
                          <td className="px-6 py-3 text-gray-900">{row.bookings}</td>
                          <td className="px-6 py-3 text-gray-900">₹{row.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Services + Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top Services */}
              <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900">Top Services</h3>
                </div>
                {topServices.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">No service data yet.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {topServices.map((svc, i) => (
                      <li key={svc.name} className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{svc.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{svc.bookings} bookings</p>
                          <p className="text-xs text-gray-500">₹{svc.revenue.toLocaleString()} earned</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recent Bookings */}
              <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">Recent Bookings</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {bookingsDate === today ? 'Today' : formatDate(bookingsDate + 'T12:00:00')}
                      {' · '}{bookingsList.length} booking{bookingsList.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => shiftBookingsDate(-1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <input
                      type="date"
                      value={bookingsDate}
                      max={today}
                      onChange={(e) => setBookingsDate(e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <button onClick={() => shiftBookingsDate(1)}
                      disabled={bookingsDate === today}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                {bookingsLoading ? (
                  <div className="flex items-center gap-2 p-8 justify-center text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </div>
                ) : bookingsList.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No bookings on this date.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {bookingsList.map(b => (
                      <li key={b._id} className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{b.customerName || '—'}</p>
                            <p className="text-xs text-gray-500">{b.serviceName} · {formatTime(b.appointmentTime)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                              {b.status?.replace('_', ' ')}
                            </span>
                            {b.totalAmount ? (
                              <p className="text-xs text-gray-500 mt-0.5">₹{b.totalAmount}</p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
