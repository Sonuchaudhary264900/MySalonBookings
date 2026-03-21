import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, RefreshCw, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DateRangeFilter from '../../components/reports/DateRangeFilter';
import { formatDate, formatTime } from '../../utils/exportHelpers';
import api from '../../services/api';
import * as salonService from '../../services/salonService';
import { useSalon } from '../../hooks/useSalon';
import toast from 'react-hot-toast';

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
  const { salon } = useSalon();
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

  const totalRevenue    = data?.totalRevenue        ?? 0;
  const totalBookings   = data?.totalBookings        ?? 0;
  const activeCustomers = data?.activeCustomers      ?? 0;
  const growthRate      = data?.growthRate           ?? 0;
  const completed       = data?.completedBookings    ?? 0;
  const pending        = data?.pendingBookings      ?? 0;
  const cancelled      = data?.cancelledBookings    ?? 0;
  const dailyRevenue   = data?.dailyRevenue         ?? [];
  const recentBookings = data?.recentBookings       ?? [];
  const topServices    = data?.topServices          ?? [];
  const avgDaily       = dailyRevenue.length ? Math.round(totalRevenue / dailyRevenue.length) : 0;

  const exportCSV = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ANALYTICS REPORT'],
      [`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`],
      [],
      ['SUMMARY'],
      ['Metric', 'Value'],
      ['Total Revenue', `Rs ${totalRevenue.toLocaleString()}`],
      ['Total Bookings', totalBookings],
      ['Completed Bookings', completed],
      ['Pending Bookings', pending],
      ['Cancelled Bookings', cancelled],
      ['Avg Daily Revenue', `Rs ${avgDaily.toLocaleString()}`],
      [],
      ['DAILY REVENUE'],
      ['Date', 'Revenue (Rs)', 'Bookings'],
      ...dailyRevenue.map(d => [d.date, d.revenue, d.bookings]),
      [],
      ['TOP SERVICES'],
      ['Rank', 'Service Name', 'Bookings', 'Revenue (Rs)'],
      ...topServices.map((s, i) => [i + 1, s.name, s.bookings, s.revenue]),
      [],
      ['RECENT BOOKINGS'],
      ['Customer', 'Service', 'Date', 'Time', 'Status', 'Amount (Rs)'],
      ...recentBookings.map(b => [
        b.customerName || '—',
        b.serviceName  || '—',
        b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString('en-IN') : '—',
        b.appointmentTime || '—',
        (b.status || '').replace('_', ' '),
        b.totalAmount || 0,
      ]),
    ];
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${salon?.name || 'salon'}-report-${startDate}-to-${endDate}.csv`;
    link.click();
    toast.success('CSV downloaded!');
  };

  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${salon?.name || 'Salon'} — Analytics Report</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;font-size:13px}
  h1{font-size:22px;color:#4f46e5;margin-bottom:2px}
  .sub{font-size:12px;color:#6b7280;margin-bottom:24px}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .stat{padding:14px;border-radius:8px;border:1px solid #e5e7eb}
  .stat-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .stat-value{font-size:20px;font-weight:700}
  .stat-sub{font-size:11px;color:#6b7280;margin-top:3px}
  .blue{background:#eff6ff}.blue .stat-value{color:#1d4ed8}
  .green{background:#f0fdf4}.green .stat-value{color:#15803d}
  .purple{background:#f5f3ff}.purple .stat-value{color:#7c3aed}
  h2{font-size:14px;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;color:#111827}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;border-bottom:1px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:600}
  .completed{background:#dcfce7;color:#15803d}
  .pending{background:#fef9c3;color:#a16207}
  .cancelled{background:#fee2e2;color:#b91c1c}
  .confirmed{background:#dbeafe;color:#1d4ed8}
  .in_progress{background:#f3e8ff;color:#7c3aed}
  .empty{text-align:center;color:#9ca3af;padding:16px}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:0}@page{margin:10mm}}
</style></head><body>
<h1>✂ ${salon?.name || 'My Salon'}</h1>
<p class="sub">Analytics Report &nbsp;·&nbsp; ${formatDate(startDate)} – ${formatDate(endDate)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<div class="stats">
  <div class="stat blue">
    <div class="stat-label">Total Revenue</div>
    <div class="stat-value">₹${totalRevenue.toLocaleString()}</div>
  </div>
  <div class="stat green">
    <div class="stat-label">Total Bookings</div>
    <div class="stat-value">${totalBookings}</div>
    <div class="stat-sub">${completed} completed · ${pending} pending · ${cancelled} cancelled</div>
  </div>
  <div class="stat purple">
    <div class="stat-label">Avg Daily Revenue</div>
    <div class="stat-value">₹${avgDaily.toLocaleString()}</div>
    <div class="stat-sub">Across ${dailyRevenue.length} day${dailyRevenue.length !== 1 ? 's' : ''}</div>
  </div>
</div>
<h2>Daily Revenue</h2>
<table>
  <tr><th>Date</th><th>Revenue (₹)</th><th>Bookings</th></tr>
  ${dailyRevenue.length ? dailyRevenue.map(d => `<tr><td>${d.date}</td><td>₹${d.revenue.toLocaleString()}</td><td>${d.bookings}</td></tr>`).join('') : '<tr><td colspan="3" class="empty">No data for this period</td></tr>'}
</table>
<h2>Top Services</h2>
<table>
  <tr><th>#</th><th>Service</th><th>Bookings</th><th>Revenue (₹)</th></tr>
  ${topServices.length ? topServices.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.bookings}</td><td>₹${s.revenue.toLocaleString()}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No service data</td></tr>'}
</table>
${recentBookings.length ? `<h2>Recent Bookings</h2>
<table>
  <tr><th>Customer</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Amount</th></tr>
  ${recentBookings.map(b => `<tr>
    <td>${b.customerName || '—'}</td><td>${b.serviceName || '—'}</td>
    <td>${b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString('en-IN') : '—'}</td>
    <td>${b.appointmentTime || '—'}</td>
    <td><span class="badge ${b.status || ''}">${(b.status || '').replace('_', ' ')}</span></td>
    <td>${b.totalAmount ? '₹' + b.totalAmount.toLocaleString() : '—'}</td>
  </tr>`).join('')}
</table>` : ''}
<div class="footer">Powered by My Salon Bookings · mysalonbookings.com</div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0';
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    };
    toast.success('Print dialog opened — save as PDF!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time overview of your salon's performance</p>
          </div>
          <div className="flex items-center gap-2">
            {!loading && data && (
              <>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
              </>
            )}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-sm text-purple-600">Active Customers</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">{activeCustomers}</p>
                <p className="text-xs text-purple-600 mt-2">Unique customers in period</p>
              </div>

              <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                  <p className="text-sm text-amber-600">Growth Rate</p>
                </div>
                <p className="text-2xl font-bold text-amber-900">{growthRate}%</p>
                <p className="text-xs text-amber-600 mt-2">Compared to previous period</p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* CSS Bar Chart – Daily Revenue */}
              <div className="lg:col-span-2 bg-white rounded-lg border-2 border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Daily Revenue</h3>
                {dailyRevenue.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No data for this period.</div>
                ) : (() => {
                  const maxRev = Math.max(...dailyRevenue.map(r => r.revenue), 1);
                  const show = dailyRevenue.slice(-14); // last 14 days max
                  return (
                    <div className="flex flex-col h-48">
                      <div className="flex items-end gap-1 flex-1 overflow-x-auto">
                        {show.map((row) => {
                          const pct = Math.max(4, Math.round((row.revenue / maxRev) * 100));
                          const label = row.date ? row.date.slice(5) : '';
                          return (
                            <div key={row.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px] group relative">
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition">
                                ₹{row.revenue.toLocaleString()}<br />{row.bookings} booking{row.bookings !== 1 ? 's' : ''}
                              </div>
                              <div className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t transition-all"
                                style={{ height: `${pct}%` }} />
                              <span className="text-[9px] text-gray-400 rotate-45 origin-left translate-y-2 whitespace-nowrap">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-6 border-t border-gray-100 pt-1">
                        <span>₹0</span>
                        <span>₹{maxRev.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* CSS Pie Chart – Booking Status */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Booking Status</h3>
                {totalBookings === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No bookings yet.</div>
                ) : (() => {
                  const slices = [
                    { label: 'Completed', value: completed, color: '#16a34a' },
                    { label: 'Pending',   value: pending,   color: '#ca8a04' },
                    { label: 'Cancelled', value: cancelled, color: '#dc2626' },
                  ].filter(s => s.value > 0);
                  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
                  let cumulativePct = 0;
                  const segments = slices.map(s => {
                    const pct = (s.value / total) * 100;
                    const seg = { ...s, pct, start: cumulativePct };
                    cumulativePct += pct;
                    return seg;
                  });
                  // Build conic-gradient string
                  const gradStops = segments.map(s => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`).join(', ');
                  return (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative w-36 h-36 rounded-full"
                        style={{ background: `conic-gradient(${gradStops})` }}>
                        <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-900">{total}</span>
                        </div>
                      </div>
                      <ul className="w-full space-y-2">
                        {segments.map(s => (
                          <li key={s.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                              <span className="text-gray-700">{s.label}</span>
                            </div>
                            <span className="font-semibold text-gray-900">{s.value} <span className="text-gray-400 font-normal">({s.pct.toFixed(0)}%)</span></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
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
