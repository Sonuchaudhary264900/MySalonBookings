import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, Line, G, Path, Circle } from 'react-native-svg';
import api from '../../services/api';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

const SCREEN_W = Dimensions.get('window').width;

function RevenueBarChart({ data, theme }) {
  if (!data || data.length === 0) return null;
  const chartW = SCREEN_W - 56;
  const chartH = 160;
  const padL = 44;
  const padB = 28;
  const padT = 10;
  const innerW = chartW - padL - 8;
  const innerH = chartH - padB - padT;
  const maxVal = Math.max(...data.map(d => d.revenue || 0), 1);
  const barW = Math.max(8, Math.floor(innerW / data.length) - 4);
  const step = Math.ceil(maxVal / 4 / 100) * 100 || 1;
  const yLabels = [0, step, step * 2, step * 3, step * 4].filter(v => v <= maxVal * 1.1);

  return (
    <Svg width={chartW} height={chartH}>
      {/* Y grid lines + labels */}
      {yLabels.map((v, i) => {
        const y = padT + innerH - (v / maxVal) * innerH;
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={chartW - 8} y2={y} stroke={theme.border || '#e5e7eb'} strokeWidth={1} strokeDasharray="3,3" />
            <SvgText x={padL - 4} y={y + 4} fontSize={9} fill={theme.subText || '#9ca3af'} textAnchor="end">
              {v >= 1000 ? `${(v/1000).toFixed(v%1000===0?0:1)}k` : v}
            </SvgText>
          </G>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = Math.max(2, ((d.revenue || 0) / maxVal) * innerH);
        const x = padL + i * (innerW / data.length) + (innerW / data.length - barW) / 2;
        const y = padT + innerH - barH;
        const label = d.date ? d.date.slice(5) : '';
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={barH} rx={3} fill="#2563eb" opacity={0.85} />
            {data.length <= 10 && (
              <SvgText x={x + barW / 2} y={chartH - 6} fontSize={8} fill={theme.subText || '#9ca3af'} textAnchor="middle">
                {label}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Booking Pie Chart ────────────────────────────────────────────
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const oS = polarToCartesian(cx, cy, outerR, startAngle);
  const oE = polarToCartesian(cx, cy, outerR, endAngle);
  const iS = polarToCartesian(cx, cy, innerR, startAngle);
  const iE = polarToCartesian(cx, cy, innerR, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${oS.x.toFixed(2)} ${oS.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oE.x.toFixed(2)} ${oE.y.toFixed(2)}`,
    `L ${iE.x.toFixed(2)} ${iE.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${iS.x.toFixed(2)} ${iS.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function BookingPieChart({ completed, pending, cancelled, total, theme }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 58;
  const innerR = 34;

  const slices = [
    { label: 'Completed', value: completed, color: '#10b981', bg: '#dcfce7' },
    { label: 'Pending',   value: pending,   color: '#ca8a04', bg: '#fef9c3' },
    { label: 'Cancelled', value: cancelled, color: '#dc2626', bg: '#fee2e2' },
  ].filter(s => s.value > 0);

  if (total === 0 || slices.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Circle cx={cx} cy={cy} r={outerR} fill={theme.border || '#e5e7eb'} />
        <Text style={{ color: theme.subText, fontSize: 12, marginTop: 8 }}>No data</Text>
      </View>
    );
  }

  // If only one slice, draw a full ring (0.01 gap to avoid degenerate arc)
  let paths;
  if (slices.length === 1) {
    paths = [{ ...slices[0], d: arcPath(cx, cy, outerR, innerR, 0, 359.99) }];
  } else {
    let angle = 0;
    paths = slices.map(s => {
      const sweep = (s.value / total) * 360;
      const d = arcPath(cx, cy, outerR, innerR, angle, angle + sweep - 1);
      angle += sweep;
      return { ...s, d };
    });
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Svg width={size} height={size}>
        {paths.map(p => <Path key={p.label} d={p.d} fill={p.color} />)}
        {/* Centre label */}
        <SvgText x={cx} y={cy - 6} fontSize={18} fontWeight="700" fill={theme.text || '#111827'} textAnchor="middle">{total}</SvgText>
        <SvgText x={cx} y={cy + 12} fontSize={9} fill={theme.subText || '#6b7280'} textAnchor="middle">bookings</SvgText>
      </Svg>

      {/* Legend */}
      <View style={{ flex: 1, gap: 8 }}>
        {slices.map(s => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <Text style={{ flex: 1, fontSize: 13, color: theme.text || '#111827' }}>{s.label}</Text>
            <View style={[styles.breakdownBadge, { backgroundColor: s.bg }]}>
              <Text style={[styles.breakdownBadgeText, { color: s.color }]}>
                {s.value} ({Math.round((s.value / total) * 100)}%)
              </Text>
            </View>
          </View>
        ))}
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
