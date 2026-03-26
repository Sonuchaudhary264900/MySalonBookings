import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Users, RefreshCw, ChevronLeft, ChevronRight,
  Download, FileText, IndianRupee, Calendar, BarChart3,
  Target, Award, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import DashboardLayout   from '../../components/layout/DashboardLayout';
import StatsCard         from '../../components/analytics/StatsCard';
import RevenueChart      from '../../components/analytics/RevenueChart';
import BookingChart      from '../../components/analytics/BookingChart';
import Insights          from '../../components/analytics/Insights';
import { formatDate, formatTime } from '../../utils/exportHelpers';
import api               from '../../services/api';
import * as salonService from '../../services/salonService';
import { useSalon }      from '../../hooks/useSalon';
import { useTheme }      from '../../context/ThemeContext';
import toast             from 'react-hot-toast';

/* ── helpers ─────────────────────────────────────────────────── */
const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const STATUS_CFG = {
  completed:   { cls: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' },
  confirmed:   { cls: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' },
  pending:     { cls: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' },
  cancelled:   { cls: 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400' },
  in_progress: { cls: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400' },
};

const QUICK_PRESETS = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '90D', days: 90  },
  { label: '1Y',  days: 365 },
];

/* ── Skeleton ────────────────────────────────────────────────── */
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="space-y-5">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
    </div>
    <Skeleton className="h-72" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Skeleton className="h-64" />
      <Skeleton className="h-64 lg:col-span-2" />
    </div>
    <Skeleton className="h-40" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

/* ── Top Services Bar ────────────────────────────────────────── */
const SvcTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">{d.name}</p>
      <p className="text-xs text-indigo-600 dark:text-indigo-400">{d.bookings} bookings</p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400">₹{d.revenue?.toLocaleString()}</p>
    </div>
  );
};

const TopServicesBar = ({ services, isDark }) => {
  if (!services.length) {
    return (
      <div className="flex flex-col items-center justify-center h-44 gap-3 text-sm text-gray-400 dark:text-gray-500">
        <span className="text-4xl">✂️</span>
        No service data yet
      </div>
    );
  }
  const data = services.slice(0, 6);
  const tickColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';
  const BAR_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe'];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 9, fill: tickColor }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: tickColor }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<SvcTooltip />} />
        <Bar dataKey="bookings" radius={[0, 6, 6, 0]} barSize={14}>
          {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

/* ── Booking Heatmap ─────────────────────────────────────────── */
const Heatmap = ({ dailyRevenue, startDate, endDate }) => {
  const cells = useMemo(() => {
    const map = {};
    dailyRevenue.forEach(d => { if (d.date) map[d.date] = d.bookings || 0; });

    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T00:00:00');
    const days  = [];
    const cur   = new Date(start);
    while (cur <= end && days.length < 84) {
      const key = cur.toISOString().slice(0, 10);
      days.push({ date: key, count: map[key] || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [dailyRevenue, startDate, endDate]);

  const max = Math.max(...cells.map(c => c.count), 1);
  const intensity = (c) => {
    if (c === 0) return 'bg-gray-100 dark:bg-gray-800';
    const p = c / max;
    if (p <= 0.25) return 'bg-indigo-200 dark:bg-indigo-900';
    if (p <= 0.5)  return 'bg-indigo-400 dark:bg-indigo-700';
    if (p <= 0.75) return 'bg-indigo-500 dark:bg-indigo-600';
    return 'bg-indigo-600 dark:bg-indigo-500';
  };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div>
      <div className="flex gap-0.5 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} booking${cell.count !== 1 ? 's' : ''}`}
                className={`w-3 h-3 rounded-[2px] cursor-default transition-opacity hover:opacity-70 ${intensity(cell.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[9px] text-gray-400 dark:text-gray-500">Less</span>
        {['bg-gray-100 dark:bg-gray-800','bg-indigo-200 dark:bg-indigo-900','bg-indigo-400 dark:bg-indigo-700','bg-indigo-600 dark:bg-indigo-500'].map((cls, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[9px] text-gray-400 dark:text-gray-500">More</span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN REPORTS PAGE                                            */
/* ══════════════════════════════════════════════════════════════ */
const Reports = () => {
  const { salon }   = useSalon();
  const { isDark }  = useTheme();
  const today       = localDate(0);

  /* ── State ── */
  const [startDate,      setStartDate]      = useState(localDate(-29));
  const [endDate,        setEndDate]        = useState(today);
  const [activePreset,   setActivePreset]   = useState(30);
  const [loading,        setLoading]        = useState(true);
  const [data,           setData]           = useState(null);
  const [bookingsDate,   setBookingsDate]   = useState(today);
  const [bookingsList,   setBookingsList]   = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [revenueGoal,    setRevenueGoal]    = useState(
    () => parseInt(localStorage.getItem('msb_revenue_goal') || '0') || 0
  );
  const [editingGoal,    setEditingGoal]    = useState(false);
  const [goalInput,      setGoalInput]      = useState('');

  /* ── Fetch analytics ── */
  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/owner/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data.data);
    } catch {
      toast.error('Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  /* ── Fetch bookings by date ── */
  const fetchBookingsByDate = useCallback(async (date) => {
    setBookingsLoading(true);
    try {
      const res = await salonService.getBookings({ date });
      setBookingsList(res.data || []);
    } catch {
      setBookingsList([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchBookingsByDate(bookingsDate); }, [bookingsDate, fetchBookingsByDate]);

  /* ── Quick preset ── */
  const setQuickRange = (days) => {
    const newStart = localDate(-days + 1);
    setStartDate(newStart);
    setEndDate(today);
    setActivePreset(days);
  };

  /* ── Shift bookings date ── */
  const shiftBookingsDate = (offset) => {
    const d = new Date(bookingsDate + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    const shifted = d.toISOString().slice(0, 10);
    if (shifted <= today) setBookingsDate(shifted);
  };

  /* ── Derived data ── */
  const totalRevenue    = data?.totalRevenue        ?? 0;
  const totalBookings   = data?.totalBookings        ?? 0;
  const activeCustomers = data?.activeCustomers      ?? 0;
  const growthRate      = data?.growthRate           ?? 0;
  const completed       = data?.completedBookings    ?? 0;
  const pending         = data?.pendingBookings      ?? 0;
  const cancelled       = data?.cancelledBookings    ?? 0;
  const dailyRevenue    = data?.dailyRevenue         ?? [];
  const recentBookings  = data?.recentBookings       ?? [];
  const topServices     = data?.topServices          ?? [];
  const avgDaily        = dailyRevenue.length ? Math.round(totalRevenue / dailyRevenue.length) : 0;

  /* ── Sparklines (last 10 data points) ── */
  const revSparkline  = dailyRevenue.slice(-10).map(d => ({ v: d.revenue  || 0 }));
  const bookSparkline = dailyRevenue.slice(-10).map(d => ({ v: d.bookings || 0 }));

  /* ── Top customers derived from recentBookings ── */
  const topCustomers = useMemo(() =>
    Object.values(
      recentBookings.reduce((acc, b) => {
        const key = b.customerName || 'Unknown';
        if (!acc[key]) acc[key] = { name: key, visits: 0, revenue: 0 };
        acc[key].visits++;
        acc[key].revenue += b.totalAmount || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.visits - a.visits).slice(0, 5),
  [recentBookings]);

  /* ── Export CSV ── */
  const exportCSV = () => {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
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
      ['Active Customers', activeCustomers],
      ['Growth Rate', `${growthRate}%`],
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
    const csv  = rows.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${salon?.name || 'salon'}-analytics-${startDate}-to-${endDate}.csv`;
    link.click();
    toast.success('CSV downloaded!');
  };

  /* ── Export PDF ── */
  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${salon?.name || 'Salon'} — Analytics</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;font-size:13px}
  h1{font-size:22px;color:#4f46e5;margin-bottom:2px}
  .sub{font-size:12px;color:#6b7280;margin-bottom:24px}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .stat{padding:14px;border-radius:8px;border:1px solid #e5e7eb}
  .stat-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .stat-value{font-size:20px;font-weight:700}
  .blue{background:#eff6ff}.blue .stat-value{color:#1d4ed8}
  .green{background:#f0fdf4}.green .stat-value{color:#15803d}
  .purple{background:#f5f3ff}.purple .stat-value{color:#7c3aed}
  .amber{background:#fffbeb}.amber .stat-value{color:#d97706}
  h2{font-size:14px;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;color:#111827}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;border-bottom:1px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:600}
  .completed{background:#dcfce7;color:#15803d} .pending{background:#fef9c3;color:#a16207}
  .cancelled{background:#fee2e2;color:#b91c1c} .confirmed{background:#dbeafe;color:#1d4ed8}
  .in_progress{background:#f3e8ff;color:#7c3aed}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:0}@page{margin:10mm}}
</style></head><body>
<h1>✂ ${salon?.name || 'My Salon'}</h1>
<p class="sub">Analytics Report &nbsp;·&nbsp; ${formatDate(startDate)} – ${formatDate(endDate)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
<div class="stats">
  <div class="stat blue"><div class="stat-label">Total Revenue</div><div class="stat-value">₹${totalRevenue.toLocaleString()}</div></div>
  <div class="stat green"><div class="stat-label">Total Bookings</div><div class="stat-value">${totalBookings}</div></div>
  <div class="stat purple"><div class="stat-label">Active Customers</div><div class="stat-value">${activeCustomers}</div></div>
  <div class="stat amber"><div class="stat-label">Growth Rate</div><div class="stat-value">${growthRate}%</div></div>
</div>
<h2>Daily Revenue</h2>
<table>
  <tr><th>Date</th><th>Revenue (₹)</th><th>Bookings</th></tr>
  ${dailyRevenue.length ? dailyRevenue.map(d=>`<tr><td>${d.date}</td><td>₹${d.revenue.toLocaleString()}</td><td>${d.bookings}</td></tr>`).join(''):'<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:16px">No data</td></tr>'}
</table>
<h2>Top Services</h2>
<table>
  <tr><th>#</th><th>Service</th><th>Bookings</th><th>Revenue (₹)</th></tr>
  ${topServices.length ? topServices.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name}</td><td>${s.bookings}</td><td>₹${s.revenue.toLocaleString()}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:16px">No data</td></tr>'}
</table>
${recentBookings.length?`<h2>Recent Bookings</h2>
<table><tr><th>Customer</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Amount</th></tr>
${recentBookings.map(b=>`<tr><td>${b.customerName||'—'}</td><td>${b.serviceName||'—'}</td><td>${b.appointmentDate?new Date(b.appointmentDate).toLocaleDateString('en-IN'):'—'}</td><td>${b.appointmentTime||'—'}</td><td><span class="badge ${b.status||''}">${(b.status||'').replace('_',' ')}</span></td><td>${b.totalAmount?'₹'+b.totalAmount.toLocaleString():'—'}</td></tr>`).join('')}
</table>`:''}
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

  /* ── Goal save ── */
  const saveGoal = () => {
    const v = parseInt(goalInput) || 0;
    setRevenueGoal(v);
    localStorage.setItem('msb_revenue_goal', String(v));
    setEditingGoal(false);
    toast.success(v ? `Goal set to ₹${v.toLocaleString()}` : 'Goal cleared');
  };

  /* ════════════════════════════════════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                flex items-center justify-center shadow-md shadow-indigo-500/30 shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              Analytics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-0.5">
              Real-time insights of your salon performance
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!loading && data && (
              <>
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl
                    bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={exportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl
                    bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </>
            )}
            <button onClick={() => fetchAnalytics(true)} disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200
                dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-600
                dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800
                transition-colors disabled:opacity-50" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Date filter + quick presets ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Quick presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1">
                Quick
              </span>
              {QUICK_PRESETS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setQuickRange(p.days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activePreset === p.days
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={e => { setStartDate(e.target.value); setActivePreset(null); }}
                className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={e => { setEndDate(e.target.value); setActivePreset(null); }}
                className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl
                  bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ── Revenue goal editor ── */}
        <div className="flex items-center gap-3">
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Set revenue goal:</span>
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="e.g. 50000"
                autoFocus
                className="w-28 px-2.5 py-1 text-xs border border-indigo-300 dark:border-indigo-700 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
              />
              <button onClick={saveGoal}
                className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                Save
              </button>
              <button onClick={() => setEditingGoal(false)}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setGoalInput(revenueGoal ? String(revenueGoal) : ''); setEditingGoal(true); }}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600
                dark:hover:text-indigo-400 transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              {revenueGoal ? `Goal: ₹${revenueGoal.toLocaleString()}` : 'Set revenue goal'}
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {loading ? <LoadingSkeleton /> : !data ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-500 dark:text-gray-400">No data available yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Start by adding bookings to see analytics
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                label="Total Revenue"
                value={`₹${totalRevenue.toLocaleString()}`}
                sub={`${formatDate(startDate)} – ${formatDate(endDate)}`}
                icon={IndianRupee}
                colorClass="text-indigo-600 dark:text-indigo-400"
                bgClass="bg-indigo-50 dark:bg-indigo-950/40"
                borderClass="border-indigo-100 dark:border-indigo-900/40"
                trend={null}
                trendLabel="period total"
                sparkline={revSparkline}
              />
              <StatsCard
                label="Total Bookings"
                value={totalBookings}
                sub={`${completed} done · ${pending} pending`}
                icon={Calendar}
                colorClass="text-emerald-600 dark:text-emerald-400"
                bgClass="bg-emerald-50 dark:bg-emerald-950/40"
                borderClass="border-emerald-100 dark:border-emerald-900/40"
                trend={null}
                trendLabel="in period"
                sparkline={bookSparkline}
              />
              <StatsCard
                label="Active Customers"
                value={activeCustomers}
                sub="unique visitors"
                icon={Users}
                colorClass="text-blue-600 dark:text-blue-400"
                bgClass="bg-blue-50 dark:bg-blue-950/40"
                borderClass="border-blue-100 dark:border-blue-900/40"
                trend={null}
              />
              <StatsCard
                label="Growth Rate"
                value={`${growthRate > 0 ? '+' : ''}${growthRate}%`}
                sub="vs previous period"
                icon={TrendingUp}
                colorClass={growthRate >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}
                bgClass="bg-amber-50 dark:bg-amber-950/40"
                borderClass="border-amber-100 dark:border-amber-900/40"
                trend={growthRate}
                trendLabel="vs last period"
              />
            </div>

            {/* ── Revenue chart ── */}
            <RevenueChart data={dailyRevenue} isDark={isDark} goal={revenueGoal} />

            {/* ── Booking status + Top services ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Booking status pie */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Booking Status</h3>
                </div>
                <BookingChart
                  completed={completed}
                  pending={pending}
                  cancelled={cancelled}
                  confirmed={data?.confirmedBookings ?? 0}
                />
              </div>

              {/* Top services bar */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Services</h3>
                  <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">by bookings</span>
                </div>
                <TopServicesBar services={topServices} isDark={isDark} />
                {/* Service table */}
                {topServices.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-50 dark:border-gray-800">
                          {['#','Service','Bookings','Revenue'].map(h => (
                            <th key={h} className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topServices.slice(0, 5).map((svc, i) => (
                          <tr key={svc.name} className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="py-2 px-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-2 px-2 font-medium text-gray-800 dark:text-gray-200">{svc.name}</td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{svc.bookings}</td>
                            <td className="py-2 px-2 font-semibold text-emerald-600 dark:text-emerald-400">
                              ₹{(svc.revenue || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── Smart insights ── */}
            <Insights
              totalRevenue={totalRevenue}
              totalBookings={totalBookings}
              growthRate={growthRate}
              topServices={topServices}
              dailyRevenue={dailyRevenue}
              completedBookings={completed}
              activeCustomers={activeCustomers}
            />

            {/* ── Recent bookings + Heatmap & top customers ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Recent bookings */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Bookings</h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {bookingsDate === today ? 'Today' : formatDate(bookingsDate + 'T12:00:00')}
                      {' · '}{bookingsList.length} booking{bookingsList.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:ml-auto">
                    <button onClick={() => shiftBookingsDate(-1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <input
                      type="date" value={bookingsDate} max={today}
                      onChange={e => setBookingsDate(e.target.value)}
                      className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg text-xs
                        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
                        focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button onClick={() => shiftBookingsDate(1)} disabled={bookingsDate === today}
                      className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {bookingsLoading ? (
                  <div className="flex items-center gap-2 p-8 justify-center text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Loading…
                  </div>
                ) : bookingsList.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-sm text-gray-400 dark:text-gray-500">
                    <Calendar className="w-8 h-8 text-gray-200 dark:text-gray-700" />
                    No bookings on this date
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                    {bookingsList.map(b => {
                      const cfg = STATUS_CFG[b.status] || { cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };
                      return (
                        <li key={b._id}
                          className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {b.customerName || '—'}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                              {b.serviceName} · {formatTime(b.appointmentTime)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.cls}`}>
                              {b.status?.replace('_', ' ')}
                            </span>
                            {b.totalAmount ? (
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                ₹{b.totalAmount.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Heatmap + Top customers */}
              <div className="space-y-4">

                {/* Activity heatmap */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Booking Activity</h3>
                    <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">per day</span>
                  </div>
                  {dailyRevenue.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No activity data</p>
                  ) : (
                    <Heatmap dailyRevenue={dailyRevenue} startDate={startDate} endDate={endDate} />
                  )}
                </div>

                {/* Top customers */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Customers</h3>
                    <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">by visits</span>
                  </div>
                  {topCustomers.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No customer data</p>
                  ) : (
                    <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                      {topCustomers.map((c, i) => (
                        <li key={c.name} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            i === 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400'
                          }`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                              {c.visits} visit{c.visits !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            ₹{c.revenue.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
