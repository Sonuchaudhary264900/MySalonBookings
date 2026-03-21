import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

// ── Revenue Bar Chart ──────────────────────────────────────────────────────
function RevenueBarChart({ data, theme }) {
  if (!data || data.length === 0) return (
    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
      <Text style={{ color: theme.subText, fontSize: 13 }}>No data for this period.</Text>
    </View>
  );
  const show = data.slice(-14);
  const maxVal = Math.max(...show.map(d => d.revenue || 0), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120 }}>
        {show.map((d, i) => {
          const pct = Math.max(0.04, (d.revenue || 0) / maxVal);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', marginHorizontal: 1 }}>
              <View style={{ width: '100%', height: `${Math.round(pct * 100)}%`, backgroundColor: '#6366f1', borderRadius: 3 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 4 }}>
        <Text style={{ fontSize: 10, color: theme.subText }}>₹0</Text>
        <Text style={{ fontSize: 10, color: theme.subText }}>₹{maxVal.toLocaleString()}</Text>
      </View>
      {show.length <= 14 && (
        <View style={{ flexDirection: 'row', marginTop: 2 }}>
          {show.map((d, i) => (
            <Text key={i} style={{ flex: 1, fontSize: 7, color: theme.subText, textAlign: 'center' }}>
              {d.date ? d.date.slice(5) : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Booking Status Donut ────────────────────────────────────────────────────
function BookingDonut({ completed, pending, cancelled, total, theme }) {
  const slices = [
    { label: 'Completed', value: completed, color: '#16a34a' },
    { label: 'Pending',   value: pending,   color: '#ca8a04' },
    { label: 'Cancelled', value: cancelled, color: '#dc2626' },
  ].filter(s => s.value > 0);

  if (total === 0) return (
    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
      <Text style={{ color: theme.subText, fontSize: 13 }}>No bookings yet.</Text>
    </View>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      {/* Simple stacked bar as donut approximation */}
      <View style={{ width: 90, height: 90, borderRadius: 45, overflow: 'hidden', position: 'relative' }}>
        <View style={{ flexDirection: 'row', height: 90 }}>
          {slices.map(s => (
            <View key={s.label} style={{ flex: s.value, backgroundColor: s.color }} />
          ))}
        </View>
        {/* Inner hole */}
        <View style={{
          position: 'absolute',
          top: 18, left: 18, width: 54, height: 54,
          borderRadius: 27, backgroundColor: theme.card,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{total}</Text>
        </View>
      </View>
      {/* Legend */}
      <View style={{ flex: 1, gap: 8 }}>
        {slices.map(s => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <Text style={{ fontSize: 13, color: theme.text }}>{s.label}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>
              {s.value}{' '}
              <Text style={{ fontWeight: '400', color: theme.subText }}>({Math.round((s.value / total) * 100)}%)</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const today = localDate(0);
const thirtyDaysAgo = localDate(-30);

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate,   setEndDate]   = useState(today);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recent Bookings date navigator
  const [bookingsDate,    setBookingsDate]    = useState(today);
  const [bookingsList,    setBookingsList]    = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/owner/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data.data || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const fetchBookingsByDate = useCallback(async (date) => {
    setBookingsLoading(true);
    try {
      const res = await api.get(`/owner/bookings?date=${date}`);
      const d = res.data.data;
      setBookingsList(Array.isArray(d) ? d : (d?.bookings || []));
    } catch { setBookingsList([]); } finally {
      setBookingsLoading(false);
    }
  }, []);

  const shiftBookingsDate = (days) => {
    const d = new Date(bookingsDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (next <= today) setBookingsDate(next);
  };

  useEffect(() => { fetchAnalytics(); }, [startDate, endDate]);
  useEffect(() => { fetchBookingsByDate(bookingsDate); }, [bookingsDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    await fetchBookingsByDate(bookingsDate);
    setRefreshing(false);
  };

  // ── Derived values ─────────────────────────────────────────────────────
  const totalRevenue    = data?.totalRevenue     ?? 0;
  const totalBookings   = data?.totalBookings    ?? 0;
  const activeCustomers = data?.activeCustomers  ?? 0;
  const growthRate      = data?.growthRate       ?? 0;
  const completed       = data?.completedBookings ?? 0;
  const pending         = data?.pendingBookings   ?? 0;
  const cancelled       = data?.cancelledBookings ?? 0;
  const dailyRevenue    = data?.dailyRevenue      ?? [];
  const topServices     = data?.topServices       ?? [];
  const avgDaily        = dailyRevenue.length ? Math.round(totalRevenue / dailyRevenue.length) : 0;

  // ── Export CSV ─────────────────────────────────────────────────────────
  const exportCSV = async () => {
    if (!data) { Alert.alert('No Data', 'Load analytics data first.'); return; }
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
      ...dailyRevenue.map(r => [r.date, r.revenue, r.bookings]),
      [],
      ['TOP SERVICES'],
      ['Rank', 'Service Name', 'Bookings', 'Revenue (Rs)'],
      ...topServices.map((s, i) => [i + 1, s.name || s.serviceName, s.bookings ?? s.count ?? 0, s.revenue ?? 0]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(esc).join(',')).join('\n');
    try {
      await Share.share({ message: csv, title: 'Analytics Report' });
    } catch { /* dismissed */ }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!data) { Alert.alert('No Data', 'Load analytics data first.'); return; }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Analytics Report</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;font-size:13px}
  h1{font-size:22px;color:#4f46e5;margin-bottom:2px}
  .sub{font-size:12px;color:#6b7280;margin-bottom:24px}
  .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
  .stat{padding:14px;border-radius:8px;border:2px solid #e5e7eb}
  .stat-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .stat-value{font-size:20px;font-weight:700}
  .stat-sub{font-size:11px;color:#6b7280;margin-top:3px}
  .blue{background:#eff6ff;border-color:#bfdbfe}.blue .stat-value{color:#1d4ed8}
  .green{background:#f0fdf4;border-color:#bbf7d0}.green .stat-value{color:#15803d}
  .purple{background:#f5f3ff;border-color:#ddd6fe}.purple .stat-value{color:#7c3aed}
  .amber{background:#fffbeb;border-color:#fde68a}.amber .stat-value{color:#b45309}
  h2{font-size:14px;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;color:#111827}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;border-bottom:1px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
  .badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:10px;font-weight:600}
  .completed{background:#dcfce7;color:#15803d}.pending{background:#fef9c3;color:#a16207}
  .cancelled{background:#fee2e2;color:#b91c1c}.confirmed{background:#dbeafe;color:#1d4ed8}
  .in_progress{background:#f3e8ff;color:#7c3aed}
  .empty{text-align:center;color:#9ca3af;padding:16px}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:0}@page{margin:10mm}}
</style></head><body>
<h1>Analytics Report</h1>
<p class="sub">${formatDate(startDate)} – ${formatDate(endDate)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<div class="stats">
  <div class="stat blue">
    <div class="stat-label">Total Revenue</div>
    <div class="stat-value">₹${totalRevenue.toLocaleString()}</div>
    <div class="stat-sub">${formatDate(startDate)} – ${formatDate(endDate)}</div>
  </div>
  <div class="stat green">
    <div class="stat-label">Total Bookings</div>
    <div class="stat-value">${totalBookings}</div>
    <div class="stat-sub">${completed} completed · ${pending} pending · ${cancelled} cancelled</div>
  </div>
  <div class="stat purple">
    <div class="stat-label">Active Customers</div>
    <div class="stat-value">${activeCustomers}</div>
    <div class="stat-sub">Unique customers in period</div>
  </div>
  <div class="stat amber">
    <div class="stat-label">Growth Rate</div>
    <div class="stat-value">${growthRate}%</div>
    <div class="stat-sub">Compared to previous period</div>
  </div>
</div>
<h2>Top Services</h2>
<table>
  <tr><th>#</th><th>Service</th><th>Bookings</th><th>Revenue (₹)</th></tr>
  ${topServices.length ? topServices.map((s, i) => `<tr><td>${i + 1}</td><td>${s.name || s.serviceName}</td><td>${s.bookings ?? s.count ?? 0}</td><td>₹${(s.revenue ?? 0).toLocaleString()}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No service data</td></tr>'}
</table>
<h2>Daily Revenue</h2>
<table>
  <tr><th>Date</th><th>Revenue (₹)</th><th>Bookings</th></tr>
  ${dailyRevenue.length ? dailyRevenue.map(r => `<tr><td>${r.date}</td><td>₹${(r.revenue ?? 0).toLocaleString()}</td><td>${r.bookings ?? 0}</td></tr>`).join('') : '<tr><td colspan="3" class="empty">No data for this period</td></tr>'}
</table>
<div class="footer">Powered by My Salon Bookings</div>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `analytics-${startDate}-to-${endDate}.pdf`;
      try {
        const RNBlobUtil = require('react-native-blob-util').default;
        const destPath = `${RNBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
        const base64 = await RNBlobUtil.fs.readFile(uri, 'base64');
        await RNBlobUtil.fs.writeFile(destPath, base64, 'base64');
        Alert.alert('PDF Saved!', `"${fileName}" saved to Downloads folder`);
        return;
      } catch { /* fallback */ }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save PDF' });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics</Text>
              <Text style={[styles.headerSub, { color: theme.subText }]}>Real-time overview of your salon's performance</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {data && (
              <>
                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#16a34a' }]} onPress={exportCSV}>
                  <Ionicons name="document-text-outline" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#4f46e5' }]} onPress={downloadPDF}>
                  <Ionicons name="document-outline" size={14} color="#fff" />
                  <Text style={styles.exportBtnText}>PDF</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border }]}
              onPress={fetchAnalytics}
              disabled={loading}
            >
              <Ionicons name="refresh-outline" size={14} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Range Filter */}
        <View style={styles.dateFilterRow}>
          <View style={styles.dateInputBox}>
            <Text style={[styles.dateInputLabel, { color: theme.subText }]}>From</Text>
            <TextInput
              style={[styles.dateInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.dateInputBox}>
            <Text style={[styles.dateInputLabel, { color: theme.subText }]}>To</Text>
            <TextInput
              style={[styles.dateInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={() => { setStartDate(thirtyDaysAgo); setEndDate(today); }}
          >
            <Text style={[styles.resetBtnText, { color: theme.text }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* ── KPI Cards ── */}
          <View style={styles.kpiGrid}>
            {/* Total Revenue */}
            <View style={[styles.kpiCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="trending-up-outline" size={18} color="#2563eb" />
                <Text style={[styles.kpiLabel, { color: '#2563eb' }]}>Total Revenue</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#1d4ed8' }]}>₹{totalRevenue.toLocaleString()}</Text>
              <Text style={[styles.kpiSub, { color: '#3b82f6' }]}>{formatDate(startDate)} – {formatDate(endDate)}</Text>
            </View>

            {/* Total Bookings */}
            <View style={[styles.kpiCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="bar-chart-outline" size={18} color="#16a34a" />
                <Text style={[styles.kpiLabel, { color: '#16a34a' }]}>Total Bookings</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#15803d' }]}>{totalBookings}</Text>
              <Text style={[styles.kpiSub, { color: '#16a34a' }]}>{completed} done · {pending} pending · {cancelled} cancelled</Text>
            </View>

            {/* Active Customers */}
            <View style={[styles.kpiCard, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="people-outline" size={18} color="#7c3aed" />
                <Text style={[styles.kpiLabel, { color: '#7c3aed' }]}>Active Customers</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{activeCustomers}</Text>
              <Text style={[styles.kpiSub, { color: '#7c3aed' }]}>Unique customers in period</Text>
            </View>

            {/* Growth Rate */}
            <View style={[styles.kpiCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="trending-up-outline" size={18} color="#d97706" />
                <Text style={[styles.kpiLabel, { color: '#d97706' }]}>Growth Rate</Text>
              </View>
              <Text style={[styles.kpiValue, { color: '#b45309' }]}>{growthRate}%</Text>
              <Text style={[styles.kpiSub, { color: '#d97706' }]}>Compared to previous period</Text>
            </View>
          </View>

          {/* ── Daily Revenue Chart ── */}
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Revenue</Text>
            <RevenueBarChart data={dailyRevenue} theme={theme} />
          </View>

          {/* ── Booking Status ── */}
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Booking Status</Text>
            <BookingDonut
              completed={completed}
              pending={pending}
              cancelled={cancelled}
              total={totalBookings}
              theme={theme}
            />
          </View>

          {/* ── Top Services ── */}
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Services</Text>
            {topServices.length === 0 ? (
              <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>No service data yet.</Text>
            ) : topServices.map((s, i) => (
              <View key={i} style={[styles.serviceRow, { borderTopColor: theme.border }]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={[styles.serviceName, { color: theme.text }]} numberOfLines={1}>{s.name || s.serviceName}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.serviceBookings, { color: theme.text }]}>{s.bookings ?? s.count ?? 0} bookings</Text>
                  <Text style={styles.serviceRevenue}>₹{(s.revenue ?? 0).toLocaleString()} earned</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Recent Bookings (date navigator) ── */}
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 2 }]}>Recent Bookings</Text>
                <Text style={[styles.sectionSub, { color: theme.subText }]}>
                  {bookingsDate === today ? 'Today' : formatDate(bookingsDate + 'T12:00:00')} · {bookingsList.length} booking{bookingsList.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.bg, borderColor: theme.border }]} onPress={() => shiftBookingsDate(-1)}>
                  <Ionicons name="chevron-back" size={16} color={theme.text} />
                </TouchableOpacity>
                <View style={[styles.datePill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                  <Text style={[styles.datePillText, { color: theme.subText }]}>
                    {bookingsDate === today ? 'Today' : bookingsDate.slice(5)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.navBtn, { backgroundColor: theme.bg, borderColor: theme.border, opacity: bookingsDate === today ? 0.4 : 1 }]}
                  onPress={() => shiftBookingsDate(1)}
                  disabled={bookingsDate === today}
                >
                  <Ionicons name="chevron-forward" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {bookingsLoading ? (
              <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 20 }} />
            ) : bookingsList.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="calendar-outline" size={36} color="#d1d5db" />
                <Text style={[styles.sectionSub, { color: theme.subText, marginTop: 8 }]}>No bookings on this date.</Text>
              </View>
            ) : (
              bookingsList.map((b) => {
                const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <View key={b._id} style={[styles.bookingRow, { borderTopColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bookingName, { color: theme.text }]}>{b.customerName || '—'}</Text>
                      <Text style={[styles.bookingMeta, { color: theme.subText }]}>{b.serviceName} · {formatTime(b.appointmentTime)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>{b.status?.replace('_', ' ')}</Text>
                      </View>
                      {b.totalAmount ? <Text style={[styles.bookingAmount, { color: theme.subText }]}>₹{b.totalAmount}</Text> : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {!data && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="bar-chart-outline" size={48} color="#d1d5db" />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No analytics data available</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Date filter
  dateFilterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  dateInputBox: { flex: 1 },
  dateInputLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dateInput: { height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 13 },
  resetBtn: { height: 36, paddingHorizontal: 14, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { fontSize: 13, fontWeight: '600' },

  // KPI cards
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, minWidth: '45%', borderRadius: 12, borderWidth: 2, padding: 14 },
  kpiLabel: { fontSize: 12, fontWeight: '500' },
  kpiValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  kpiSub: { fontSize: 11 },

  // Section card
  section: { borderRadius: 12, borderWidth: 2, padding: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  sectionSub: { fontSize: 12 },

  // Top services
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, gap: 10 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  serviceName: { flex: 1, fontSize: 13, fontWeight: '600' },
  serviceBookings: { fontSize: 13, fontWeight: '600' },
  serviceRevenue: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  // Bookings
  navBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  datePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  datePillText: { fontSize: 12, fontWeight: '500' },
  bookingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  bookingName: { fontSize: 13, fontWeight: '600' },
  bookingMeta: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  bookingAmount: { fontSize: 12 },
});
