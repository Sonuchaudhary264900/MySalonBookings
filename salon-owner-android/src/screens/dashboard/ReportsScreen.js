import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

function RevenueBarChart({ data, theme }) {
  if (!data || data.length === 0) return null;
  const show = data.slice(-14);
  const maxVal = Math.max(...show.map(d => d.revenue || 0), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120 }}>
        {show.map((d, i) => {
          const pct = Math.max(0.03, (d.revenue || 0) / maxVal);
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', marginHorizontal: 1 }}>
              <View style={{ width: '100%', height: `${Math.round(pct * 100)}%`, backgroundColor: '#2563eb', borderRadius: 3, opacity: 0.85 }} />
            </View>
          );
        })}
      </View>
      {show.length <= 10 && (
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {show.map((d, i) => (
            <Text key={i} style={{ flex: 1, fontSize: 7, color: theme.subText || '#9ca3af', textAlign: 'center' }}>
              {d.date ? d.date.slice(5) : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Booking Donut Chart (pure View, no SVG) ────────────────────────────────
function BookingPieChart({ completed, pending, cancelled, total, theme }) {
  const RING_SIZE = 100;
  const slices = [
    { label: 'Completed', value: completed, color: '#10b981', bg: '#dcfce7' },
    { label: 'Pending',   value: pending,   color: '#f59e0b', bg: '#fef9c3' },
    { label: 'Cancelled', value: cancelled, color: '#dc2626', bg: '#fee2e2' },
  ].filter(s => s.value > 0);

  // Build stacked ring using border segments
  const segments = slices.map(s => ({ ...s, pct: total > 0 ? (s.value / total) * 100 : 0 }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {/* Ring */}
      <View style={{ width: RING_SIZE, height: RING_SIZE, justifyContent: 'center', alignItems: 'center' }}>
        {total === 0 ? (
          <View style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 16, borderColor: theme.border || '#e5e7eb' }} />
        ) : (
          <View style={{ width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, overflow: 'hidden', backgroundColor: theme.border || '#e5e7eb' }}>
            {segments.map((s, i) => (
              <View key={s.label} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <View style={{ flex: 1, backgroundColor: i === 0 ? s.color : 'transparent' }} />
              </View>
            ))}
            {/* Simple stacked bars as donut approximation */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', height: RING_SIZE }}>
              {segments.map(s => (
                <View key={s.label} style={{ flex: s.pct, backgroundColor: s.color }} />
              ))}
            </View>
            {/* Inner hole */}
            <View style={{ position: 'absolute', top: RING_SIZE * 0.22, left: RING_SIZE * 0.22, width: RING_SIZE * 0.56, height: RING_SIZE * 0.56, borderRadius: RING_SIZE * 0.28, backgroundColor: theme.card || '#fff', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text || '#111827' }}>{total}</Text>
              <Text style={{ fontSize: 8, color: theme.subText || '#6b7280' }}>bookings</Text>
            </View>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        {total === 0 ? (
          <Text style={{ color: theme.subText, fontSize: 12 }}>No booking data</Text>
        ) : (
          slices.map((s, i) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < slices.length - 1 ? 10 : 0 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color, marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 13, color: theme.text || '#111827' }}>{s.label}</Text>
              <View style={[styles.breakdownBadge, { backgroundColor: s.bg }]}>
                <Text style={[styles.breakdownBadgeText, { color: s.color }]}>
                  {s.value} ({Math.round((s.value / total) * 100)}%)
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function getThisMonthRange() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end   = localDate(0);
  return { start, end };
}

function getThisYearRange() {
  const year  = new Date().getFullYear();
  const start = `${year}-01-01`;
  const end   = localDate(0);
  return { start, end };
}

// Each preset: label + getRange() → { start, end }
const PRESETS = [
  { label: 'Today',      getRange: () => { const d = localDate(0); return { start: d, end: d }; } },
  { label: '7 Days',     getRange: () => ({ start: localDate(-7),  end: localDate(0) }) },
  { label: '30 Days',    getRange: () => ({ start: localDate(-30), end: localDate(0) }) },
  { label: '90 Days',    getRange: () => ({ start: localDate(-90), end: localDate(0) }) },
  { label: 'This Month', getRange: getThisMonthRange },
  { label: '3 Months',   getRange: () => ({ start: localDate(-90), end: localDate(0) }) },
  { label: 'This Year',  getRange: getThisYearRange },
];

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [preset, setPreset] = useState(1); // default: 7 days
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async (presetIndex, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    const { start, end } = PRESETS[presetIndex].getRange();
    try {
      const res = await api.get(`/owner/analytics/dashboard?startDate=${start}&endDate=${end}`);
      setAnalytics(res.data.data || null);
    } catch (err) {
      setAnalytics(null);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(preset); }, [preset]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics(preset, true);
    setRefreshing(false);
  };

  const exportCSV = async () => {
    if (!analytics) { Alert.alert('No Data', 'Load analytics data first.'); return; }
    const d = analytics;
    const label = PRESETS[preset].label;
    const rows = [
      ['Analytics Report', label],
      [],
      ['Summary'],
      ['Total Revenue', `₹${d.totalRevenue ?? 0}`],
      ['Total Bookings', d.totalBookings ?? 0],
      ['Completed', d.completedBookings ?? 0],
      ['Pending', d.pendingBookings ?? 0],
      ['Cancelled', d.cancelledBookings ?? 0],
      ['Active Customers', d.activeCustomers ?? 0],
      [],
      ['Daily Revenue'],
      ['Date', 'Bookings', 'Revenue'],
      ...(d.dailyRevenue || []).map(r => [r.date, r.bookings ?? r.count ?? 0, r.revenue ?? 0]),
      [],
      ['Top Services'],
      ['Rank', 'Service', 'Bookings', 'Revenue'],
      ...(d.topServices || []).map((s, i) => [i + 1, s.name || s.serviceName, s.bookings ?? s.count ?? 0, s.revenue ?? 0]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    try {
      if (Platform.OS === 'ios') {
        const path = FileSystem.documentDirectory + 'analytics-report.csv';
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Share.share({ url: path, title: 'Analytics Report' });
      } else {
        await Share.share({ message: csv, title: 'Analytics Report' });
      }
    } catch { /* user dismissed */ }
  };

  const downloadPDF = async () => {
    if (!analytics) { Alert.alert('No Data', 'Load analytics data first.'); return; }
    const d = analytics;
    const label = PRESETS[preset].label;

    const kpiCards = [
      { label: 'Total Revenue', value: `&#8377;${d.totalRevenue ?? 0}`, color: '#10b981' },
      { label: 'Total Bookings', value: d.totalBookings ?? 0, color: '#3b82f6' },
      { label: 'Completed', value: d.completedBookings ?? 0, color: '#10b981' },
      { label: 'Pending', value: d.pendingBookings ?? 0, color: '#f59e0b' },
      { label: 'Cancelled', value: d.cancelledBookings ?? 0, color: '#ef4444' },
      { label: 'Active Customers', value: d.activeCustomers ?? 0, color: '#8b5cf6' },
    ];

    const topServicesRows = (d.topServices || []).map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:8px 12px;color:#2563eb;font-weight:700">#${i + 1}</td>
        <td style="padding:8px 12px">${s.name || s.serviceName || '—'}</td>
        <td style="padding:8px 12px;text-align:center">${s.bookings ?? s.count ?? 0}</td>
        <td style="padding:8px 12px;text-align:right;color:#10b981;font-weight:700">&#8377;${s.revenue ?? 0}</td>
      </tr>`).join('');

    const dailyRows = (d.dailyRevenue || []).map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:7px 12px">${r.date || '—'}</td>
        <td style="padding:7px 12px;text-align:center">${r.bookings ?? r.count ?? 0}</td>
        <td style="padding:7px 12px;text-align:right;color:#10b981;font-weight:700">&#8377;${r.revenue ?? 0}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111827;background:#fff}
      h1{margin:0;font-size:22px;color:#fff}
      .header{background:linear-gradient(135deg,#2563eb,#4f46e5);padding:20px 24px;border-radius:12px;margin-bottom:20px}
      .sub{color:#bfdbfe;font-size:13px;margin-top:4px}
      .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
      .kpi{background:#f9fafb;border-radius:10px;padding:14px;border-left:4px solid}
      .kpi-val{font-size:20px;font-weight:800;margin-bottom:4px}
      .kpi-lbl{font-size:11px;color:#6b7280}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#2563eb;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
      td{font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6}
      .section-title{font-size:14px;font-weight:700;color:#111827;margin:0 0 10px}
      .footer{text-align:center;color:#9ca3af;font-size:11px;margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb}
    </style></head><body>
    <div class="header">
      <h1>&#9986; Analytics Report</h1>
      <div class="sub">Period: ${label} &nbsp;|&nbsp; Generated by SmartSalon</div>
    </div>
    <div class="kpi-grid">
      ${kpiCards.map(k => `<div class="kpi" style="border-color:${k.color}">
        <div class="kpi-val" style="color:${k.color}">${k.value}</div>
        <div class="kpi-lbl">${k.label}</div>
      </div>`).join('')}
    </div>
    ${topServicesRows ? `
    <p class="section-title">Top Services</p>
    <table><thead><tr><th>Rank</th><th>Service</th><th style="text-align:center">Bookings</th><th style="text-align:right">Revenue</th></tr></thead>
    <tbody>${topServicesRows}</tbody></table>` : ''}
    ${dailyRows ? `
    <p class="section-title">Daily Revenue</p>
    <table><thead><tr><th>Date</th><th style="text-align:center">Bookings</th><th style="text-align:right">Revenue</th></tr></thead>
    <tbody>${dailyRows}</tbody></table>` : ''}
    <div class="footer">SmartSalon Owner Dashboard &nbsp;&bull;&nbsp; ${new Date().toLocaleDateString('en-IN')}</div>
    </body></html>`;

    const savePDFToDownloads = async (tempUri, fileName) => {
      const DOWNLOADS_INITIAL = 'content://com.android.externalstorage.documents/tree/primary%3ADownload';
      const DIR_KEY = '@pdf_download_dir';
      let dirUri = await AsyncStorage.getItem(DIR_KEY);
      if (!dirUri) {
        const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(DOWNLOADS_INITIAL);
        if (!perms.granted) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(tempUri, { mimeType: 'application/pdf', dialogTitle: 'Save PDF' });
          }
          return;
        }
        dirUri = perms.directoryUri;
        await AsyncStorage.setItem(DIR_KEY, dirUri);
      }
      try {
        const base64 = await FileSystem.readAsStringAsync(tempUri, { encoding: FileSystem.EncodingType.Base64 });
        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(dirUri, fileName, 'application/pdf');
        await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert('PDF Saved!', `"${fileName}" saved to Downloads`);
      } catch {
        await AsyncStorage.removeItem(DIR_KEY);
        Alert.alert('Try Again', 'Tap Download PDF again to re-select Downloads folder');
      }
    };

    try {
      const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });
      const fileName = `Analytics-Report-${label.replace(/\s+/g, '-')}.pdf`;
      await savePDFToDownloads(tempUri, fileName);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to generate PDF');
    }
  };

  const d = analytics;
  const completed  = d?.completedBookings  ?? 0;
  const pending    = d?.pendingBookings    ?? 0;
  const cancelled  = d?.cancelledBookings  ?? 0;
  const total      = d?.totalBookings      ?? 0;
  const revenue    = d?.totalRevenue       ?? 0;
  const avgRevenue = d?.dailyRevenue?.length
    ? Math.round(revenue / d.dailyRevenue.length)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={styles.headerTitle}>Analytics</Text><DrawerMenuButton /></View>
        <Text style={styles.headerSub}>Track your salon's performance</Text>
        {/* Preset pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {PRESETS.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.presetChip, preset === i && styles.presetChipActive]}
              onPress={() => { setPreset(i); setLoading(true); }}
            >
              <Text style={[styles.presetChipText, preset === i && styles.presetChipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {analytics && (
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
              <Ionicons name="document-text-outline" size={14} color="#fff" />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]} onPress={downloadPDF}>
              <Ionicons name="document-outline" size={14} color="#fff" />
              <Text style={styles.exportBtnText}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* KPI cards */}
          <View style={styles.kpiGrid}>
            {[
              { title: 'Total Revenue', value: `₹${revenue}`, icon: 'cash-outline', color: '#10b981' },
              { title: 'Total Bookings', value: total, icon: 'calendar-outline', color: '#3b82f6' },
              { title: 'Avg Daily Revenue', value: `₹${avgRevenue}`, icon: 'trending-up-outline', color: '#f59e0b' },
              { title: 'Active Customers', value: d?.activeCustomers ?? 0, icon: 'people-outline', color: '#8b5cf6' },
            ].map((k, i) => (
              <View key={i} style={[styles.kpiCard, { backgroundColor: theme.card }]}>
                <View style={[styles.kpiIcon, { backgroundColor: k.color + '20' }]}>
                  <Ionicons name={k.icon} size={20} color={k.color} />
                </View>
                <Text style={[styles.kpiValue, { color: theme.text }]}>{k.value}</Text>
                <Text style={[styles.kpiTitle, { color: theme.subText }]}>{k.title}</Text>
              </View>
            ))}
          </View>

          {/* Revenue Bar Chart */}
          {d?.dailyRevenue?.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Revenue Chart</Text>
              <RevenueBarChart data={d.dailyRevenue} theme={theme} />
            </View>
          )}

          {/* Booking breakdown – pie chart */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Booking Breakdown</Text>
            <BookingPieChart
              completed={completed}
              pending={pending}
              cancelled={cancelled}
              total={total}
              theme={theme}
            />
          </View>

          {/* Top services */}
          {d?.topServices?.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Services</Text>
              {d.topServices.map((s, i) => (
                <View key={i} style={[styles.topServiceRow, { borderTopColor: theme.rowBorder }]}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topServiceName, { color: theme.text }]}>{s.name || s.serviceName}</Text>
                    <Text style={[styles.topServiceSub, { color: theme.subText }]}>{s.bookings ?? s.count ?? 0} bookings</Text>
                  </View>
                  <Text style={styles.topServiceRevenue}>₹{s.revenue ?? 0}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Daily revenue table */}
          {d?.dailyRevenue?.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Revenue</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Date</Text>
                <Text style={[styles.tableCell, { textAlign: 'center' }]}>Bookings</Text>
                <Text style={[styles.tableCell, { textAlign: 'right', flex: 1.2 }]}>Revenue</Text>
              </View>
              {d.dailyRevenue.map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: theme.cardAlt }]}>
                  <Text style={[styles.tableCell, { flex: 2, color: theme.text }]}>
                    {formatDate(row.date + 'T12:00:00')}
                  </Text>
                  <Text style={[styles.tableCell, { textAlign: 'center', color: theme.text }]}>
                    {row.bookings ?? row.count ?? 0}
                  </Text>
                  <Text style={[styles.tableCell, { textAlign: 'right', flex: 1.2, color: '#10b981', fontWeight: '700' }]}>
                    ₹{row.revenue ?? 0}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent bookings */}
          {d?.recentBookings?.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Bookings</Text>
              {d.recentBookings.map((b) => {
                const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <View key={b._id} style={[styles.bookingRow, { borderTopColor: theme.rowBorder }]}>
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
              })}
            </View>
          )}

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.card }]}>
              <Ionicons name="warning-outline" size={36} color="#ef4444" />
              <Text style={[styles.errorTitle, { color: theme.text }]}>Failed to Load</Text>
              <Text style={[styles.errorMsg, { color: theme.subText }]}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAnalytics(preset)}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!d && !error && (
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
  header: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 8 },
  presetChipActive: { backgroundColor: '#fff' },
  presetChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  presetChipTextActive: { color: '#2563eb', fontWeight: '700' },
  exportRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, minWidth: '44%', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  kpiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  kpiTitle: { fontSize: 11, color: '#6b7280', marginTop: 3 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  breakdownLabel: { fontSize: 13, color: '#374151', width: 72 },
  barTrack: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  breakdownBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  breakdownBadgeText: { fontSize: 12, fontWeight: '700' },
  topServiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  topServiceName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  topServiceSub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  topServiceRevenue: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1.5, borderBottomColor: '#e5e7eb', marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderRadius: 6 },
  tableCell: { fontSize: 12, color: '#6b7280', fontWeight: '600', flex: 1 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  bookingName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  bookingMeta: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  bookingAmount: { fontSize: 12, color: '#6b7280' },
  errorBox: { borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, marginBottom: 10 },
  errorTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  errorMsg: { fontSize: 13, textAlign: 'center' },
  retryBtn: { marginTop: 8, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
