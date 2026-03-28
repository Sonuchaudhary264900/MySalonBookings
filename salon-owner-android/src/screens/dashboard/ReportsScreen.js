import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

const QUICK_PRESETS = [
  { label: '7D',  days: 7   },
  { label: '30D', days: 30  },
  { label: '90D', days: 90  },
  { label: '1Y',  days: 365 },
];

const isValidDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = '100%', r = 8, mb = 0 }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 700);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={{
      height: h, width: w, borderRadius: r, marginBottom: mb,
      backgroundColor: pulse ? '#e5e7eb' : '#f3f4f6',
    }} />
  );
}

function LoadingSkeleton({ isDark }) {
  const bg = isDark ? '#374151' : '#e5e7eb';
  const bg2 = isDark ? '#1f2937' : '#f3f4f6';
  const card = { borderRadius: 14, padding: 14, marginBottom: 10, backgroundColor: isDark ? '#1e293b' : '#fff', borderWidth: 1.5, borderColor: isDark ? '#334155' : '#e5e7eb' };
  return (
    <View style={{ padding: 12 }}>
      {/* Quick presets skeleton */}
      <View style={[card, { flexDirection: 'row', gap: 8 }]}>
        {[60, 40, 40, 40, 40].map((w, i) => (
          <View key={i} style={{ height: 30, width: w, borderRadius: 10, backgroundColor: i === 0 ? bg : bg2 }} />
        ))}
      </View>
      {/* KPI grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{ flex: 1, minWidth: '45%', borderRadius: 14, padding: 14, backgroundColor: isDark ? '#1e293b' : '#fff', borderWidth: 1.5, borderColor: isDark ? '#334155' : '#e5e7eb', gap: 8 }}>
            <View style={{ height: 32, width: 32, borderRadius: 8, backgroundColor: bg }} />
            <View style={{ height: 10, width: '60%', borderRadius: 4, backgroundColor: bg2 }} />
            <View style={{ height: 28, width: '80%', borderRadius: 6, backgroundColor: bg }} />
            <View style={{ height: 10, width: '90%', borderRadius: 4, backgroundColor: bg2 }} />
          </View>
        ))}
      </View>
      {/* Chart skeleton */}
      <View style={[card]}>
        <View style={{ height: 12, width: '50%', borderRadius: 4, backgroundColor: bg, marginBottom: 8 }} />
        <View style={{ height: 10, width: '70%', borderRadius: 4, backgroundColor: bg2, marginBottom: 16 }} />
        <View style={{ height: 130, borderRadius: 8, backgroundColor: bg2 }} />
      </View>
      {/* Two more card skeletons */}
      {[140, 120].map((h, i) => (
        <View key={i} style={[card]}>
          <View style={{ height: 12, width: '40%', borderRadius: 4, backgroundColor: bg, marginBottom: 16 }} />
          <View style={{ height: h, borderRadius: 8, backgroundColor: bg2 }} />
        </View>
      ))}
    </View>
  );
}

// ── Revenue Bar Chart ─────────────────────────────────────────────────────────
function RevenueChart({ data, isDark }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: 140, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Text style={{ fontSize: 30 }}>📊</Text>
        <Text style={{ fontSize: 13, color: isDark ? '#6b7280' : '#9ca3af' }}>No revenue data for this period</Text>
      </View>
    );
  }
  const show = data.slice(-30);
  const maxVal = Math.max(...show.map(d => d.revenue || 0), 1);
  const step = Math.max(1, Math.floor(show.length / 5));

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 }}>
        {show.map((d, i) => {
          const pct = Math.max(0.03, (d.revenue || 0) / maxVal);
          const isMax = (d.revenue || 0) === maxVal && maxVal > 0;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <View style={{
                width: '100%',
                height: `${Math.round(pct * 100)}%`,
                backgroundColor: isMax ? '#4f46e5' : (isDark ? '#4338ca' : '#818cf8'),
                borderRadius: 3,
              }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5,
        borderTopWidth: 1, borderTopColor: isDark ? '#1f2937' : '#f3f4f6', paddingTop: 4 }}>
        <Text style={{ fontSize: 9, color: isDark ? '#6b7280' : '#9ca3af' }}>₹0</Text>
        {show.filter((_, i) => i % step === 0).map((d, i) => (
          <Text key={i} style={{ fontSize: 9, color: isDark ? '#6b7280' : '#9ca3af' }}>
            {d.date?.slice(5) || ''}
          </Text>
        ))}
        <Text style={{ fontSize: 9, color: isDark ? '#6b7280' : '#9ca3af' }}>
          {maxVal >= 1000 ? `₹${(maxVal / 1000).toFixed(0)}k` : `₹${maxVal}`}
        </Text>
      </View>
    </View>
  );
}

// ── Mini Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data || data.length < 3) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 22, gap: 1, marginTop: 6 }}>
      {data.map((d, i) => {
        const pct = Math.max(0.05, d.v / max);
        return (
          <View key={i} style={{
            flex: 1, height: `${Math.round(pct * 100)}%`,
            backgroundColor: color, borderRadius: 2, opacity: 0.65,
          }} />
        );
      })}
    </View>
  );
}

// ── Booking Status (donut approx) ─────────────────────────────────────────────
function BookingStatusChart({ completed, pending, cancelled, confirmed, inProgress, theme }) {
  const slices = [
    { label: 'Completed',   value: completed,   color: '#10b981' },
    { label: 'Confirmed',   value: confirmed,   color: '#3b82f6' },
    { label: 'Pending',     value: pending,     color: '#f59e0b' },
    { label: 'In Progress', value: inProgress,  color: '#8b5cf6' },
    { label: 'Cancelled',   value: cancelled,   color: '#ef4444' },
  ].filter(s => s.value > 0);

  const total = slices.reduce((s, sl) => s + sl.value, 0);

  if (total === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 30 }}>📋</Text>
        <Text style={{ color: theme.subText, fontSize: 13 }}>No bookings yet</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {/* Stacked-bar donut */}
      <View style={{ width: 90, height: 90, borderRadius: 45, overflow: 'hidden', position: 'relative' }}>
        <View style={{ flexDirection: 'row', height: 90 }}>
          {slices.map(s => (
            <View key={s.label} style={{ flex: s.value, backgroundColor: s.color }} />
          ))}
        </View>
        <View style={{
          position: 'absolute', top: 18, left: 18, width: 54, height: 54,
          borderRadius: 27, backgroundColor: theme.card,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>{total}</Text>
          <Text style={{ fontSize: 8, color: theme.subText, textTransform: 'uppercase', letterSpacing: 0.5 }}>total</Text>
        </View>
      </View>
      {/* Legend */}
      <View style={{ flex: 1, gap: 5 }}>
        {slices.map(s => (
          <View key={s.label} style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
            backgroundColor: theme.bg,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
              <Text style={{ fontSize: 11, color: theme.subText }}>{s.label}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
              {s.value}
              <Text style={{ fontWeight: '400', color: theme.subText }}>
                {' '}({Math.round((s.value / total) * 100)}%)
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Top Services ──────────────────────────────────────────────────────────────
const SVC_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'];

function TopServicesSection({ services, theme }) {
  if (!services || services.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 30 }}>✂️</Text>
        <Text style={{ color: theme.subText, fontSize: 13 }}>No service data yet</Text>
      </View>
    );
  }
  const top = services.slice(0, 5);
  const maxB = Math.max(...top.map(s => s.bookings ?? s.count ?? 0), 1);

  return (
    <View>
      <View style={{ gap: 6, marginBottom: 12 }}>
        {top.map((s, i) => {
          const b = s.bookings ?? s.count ?? 0;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 80, fontSize: 10, color: theme.subText }} numberOfLines={1}>
                {s.name || s.serviceName}
              </Text>
              <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: theme.bg }}>
                <View style={{
                  width: `${Math.max(4, Math.round((b / maxB) * 100))}%`,
                  height: '100%', borderRadius: 7,
                  backgroundColor: SVC_COLORS[i % SVC_COLORS.length],
                }} />
              </View>
              <Text style={{ width: 22, fontSize: 10, color: theme.subText, textAlign: 'right' }}>{b}</Text>
            </View>
          );
        })}
      </View>
      {top.map((s, i) => (
        <View key={i} style={{
          flexDirection: 'row', alignItems: 'center', paddingVertical: 9,
          borderTopWidth: 1, borderTopColor: theme.border, gap: 10,
        }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366f1' }}>{i + 1}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: theme.text }} numberOfLines={1}>
            {s.name || s.serviceName}
          </Text>
          <Text style={{ fontSize: 12, color: theme.subText }}>{s.bookings ?? s.count ?? 0}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
            ₹{(s.revenue ?? 0).toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Smart Insights ────────────────────────────────────────────────────────────
function SmartInsights({ growthRate, topServices, totalRevenue, totalBookings, completedBookings, isDark }) {
  const items = [];

  if (typeof growthRate === 'number' && growthRate !== 0) {
    const up = growthRate > 0;
    items.push({
      icon: up ? 'trending-up-outline' : 'trending-down-outline',
      iconColor: up ? '#10b981' : '#ef4444',
      c: isDark
        ? (up ? { bg: '#052e16', border: '#166534', text: '#34d399' } : { bg: '#1c0a0a', border: '#7f1d1d', text: '#f87171' })
        : (up ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' } : { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' }),
      text: up
        ? `Bookings grew by ${growthRate}% vs previous period — great momentum!`
        : `Bookings dropped by ${Math.abs(growthRate)}% — consider a promotion to boost demand.`,
    });
  }
  if (topServices?.length > 0) {
    items.push({
      icon: 'star-outline', iconColor: '#f59e0b',
      c: isDark
        ? { bg: '#1c1200', border: '#92400e', text: '#fbbf24' }
        : { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
      text: `"${topServices[0].name}" is your top service with ${topServices[0].bookings} bookings and ₹${(topServices[0].revenue || 0).toLocaleString()} revenue.`,
    });
  }
  if (totalBookings > 0) {
    const avg = Math.round(totalRevenue / totalBookings);
    items.push({
      icon: 'flash-outline', iconColor: '#6366f1',
      c: isDark
        ? { bg: '#1e1b4b', border: '#3730a3', text: '#818cf8' }
        : { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' },
      text: `Avg revenue per booking is ₹${avg.toLocaleString()} — ${avg > 300 ? 'excellent per-visit value!' : 'upsell premium services to increase this.'}`,
    });
  }
  if (totalBookings > 0) {
    const rate = Math.round((completedBookings / totalBookings) * 100);
    items.push({
      icon: 'bar-chart-outline', iconColor: '#3b82f6',
      c: isDark
        ? { bg: '#0c1d36', border: '#1e40af', text: '#60a5fa' }
        : { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
      text: `${rate}% completion rate — ${rate >= 80 ? 'excellent! Most customers are being served.' : 'follow up on pending bookings to improve this.'}`,
    });
  }

  if (!items.length) return null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
        <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#f1f5f9' : '#111827' }}>Smart Insights</Text>
        <View style={{ marginLeft: 'auto', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
          backgroundColor: isDark ? '#1c1200' : '#fffbeb', borderWidth: 1, borderColor: isDark ? '#92400e' : '#fde68a' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#fbbf24' : '#92400e' }}>AI-powered</Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {items.slice(0, 4).map((item, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            backgroundColor: item.c.bg, borderRadius: 12, padding: 12,
            borderWidth: 1, borderColor: item.c.border,
          }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Ionicons name={item.icon} size={14} color={item.iconColor} />
            </View>
            <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: item.c.text }}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Booking Activity Heatmap ──────────────────────────────────────────────────
function BookingHeatmap({ dailyRevenue, startDate, endDate, isDark, theme }) {
  const cells = useMemo(() => {
    const map = {};
    (dailyRevenue || []).forEach(d => { if (d.date) map[d.date] = d.bookings || 0; });
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T00:00:00');
    const days  = [];
    const cur   = new Date(start);
    while (cur <= end && days.length < 84) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      days.push({ date: key, count: map[key] || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [dailyRevenue, startDate, endDate]);

  if (!dailyRevenue || dailyRevenue.length === 0) {
    return (
      <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
        No activity data
      </Text>
    );
  }

  const max = Math.max(...cells.map(c => c.count), 1);
  const cellColor = count => {
    if (count === 0) return isDark ? '#1f2937' : '#f3f4f6';
    const p = count / max;
    if (p <= 0.25) return isDark ? '#312e81' : '#c7d2fe';
    if (p <= 0.5)  return isDark ? '#4338ca' : '#818cf8';
    if (p <= 0.75) return isDark ? '#4f46e5' : '#6366f1';
    return isDark ? '#6366f1' : '#4f46e5';
  };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'column', gap: 2 }}>
              {week.map((cell, di) => (
                <View key={di} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: cellColor(cell.count) }} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <Text style={{ fontSize: 9, color: theme.subText }}>Less</Text>
        {[isDark ? '#1f2937' : '#f3f4f6', isDark ? '#312e81' : '#c7d2fe', isDark ? '#4338ca' : '#818cf8', isDark ? '#6366f1' : '#4f46e5'].map((color, i) => (
          <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
        ))}
        <Text style={{ fontSize: 9, color: theme.subText }}>More</Text>
      </View>
    </View>
  );
}

// ── Top Customers ─────────────────────────────────────────────────────────────
function TopCustomersList({ recentBookings, theme }) {
  const customers = useMemo(() =>
    Object.values(
      (recentBookings || []).reduce((acc, b) => {
        const key = b.customerName || b.customerPhone || 'Unknown';
        if (!acc[key]) acc[key] = { name: b.customerName || b.customerPhone || 'Unknown', visits: 0, revenue: 0 };
        acc[key].visits++;
        acc[key].revenue += b.totalAmount || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.visits - a.visits).slice(0, 5),
  [recentBookings]);

  if (!customers.length) {
    return <Text style={{ color: theme.subText, fontSize: 13, textAlign: 'center', paddingVertical: 24 }}>No customer data</Text>;
  }

  return (
    <View>
      {customers.map((c, i) => (
        <View key={c.name} style={{
          flexDirection: 'row', alignItems: 'center',
          paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0,
          borderTopColor: theme.border, gap: 10,
        }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
            backgroundColor: i === 0 ? '#fef3c7' : i === 1 ? (theme.cardAlt || '#f3f4f6') : theme.bg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: i === 0 ? '#d97706' : theme.subText }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }} numberOfLines={1}>{c.name}</Text>
            <Text style={{ fontSize: 10, color: theme.subText, marginTop: 1 }}>{c.visits} visit{c.visits !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>₹{c.revenue.toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const today = localDate(0);

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const [startDate,    setStartDate]    = useState(localDate(-29));
  const [endDate,      setEndDate]      = useState(today);
  const [activePreset, setActivePreset] = useState(30);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);

  const [bookingsDate,    setBookingsDate]    = useState(today);
  const [bookingsList,    setBookingsList]    = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [revenueGoal, setRevenueGoal] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput,   setGoalInput]   = useState('');

  // Debounce timer for manual date input
  const debounceRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('msb_revenue_goal').then(v => {
      if (v) setRevenueGoal(parseInt(v) || 0);
    });
  }, []);

  const saveGoal = () => {
    const v = parseInt(goalInput) || 0;
    setRevenueGoal(v);
    AsyncStorage.setItem('msb_revenue_goal', String(v));
    setEditingGoal(false);
  };

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!isValidDate(startDate) || !isValidDate(endDate)) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/owner/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`);
      setData(res.data.data || null);
    } catch (err) {
      setError(err?.message || 'Failed to load analytics. Pull down to retry.');
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
    } catch {
      setBookingsList([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // Debounced fetch when dates change (avoids firing on every keystroke)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAnalytics();
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [startDate, endDate]);

  useEffect(() => { fetchBookingsByDate(bookingsDate); }, [bookingsDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnalytics(true), fetchBookingsByDate(bookingsDate)]);
    setRefreshing(false);
  };

  const shiftBookingsDate = days => {
    const d = new Date(bookingsDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (next <= today) setBookingsDate(next);
  };

  const setQuickRange = days => {
    setStartDate(localDate(-(days - 1)));
    setEndDate(today);
    setActivePreset(days);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalRevenue    = data?.totalRevenue      ?? 0;
  const totalBookings   = data?.totalBookings      ?? 0;
  const activeCustomers = data?.activeCustomers    ?? 0;
  const growthRate      = data?.growthRate         ?? 0;
  const completed       = data?.completedBookings  ?? 0;
  const pending         = data?.pendingBookings    ?? 0;
  const cancelled       = data?.cancelledBookings  ?? 0;
  const confirmed       = data?.confirmedBookings  ?? 0;
  const dailyRevenue    = data?.dailyRevenue       ?? [];
  const topServices     = data?.topServices        ?? [];
  const recentBookings  = data?.recentBookings     ?? [];
  const avgDaily        = dailyRevenue.length ? Math.round(totalRevenue / dailyRevenue.length) : 0;

  // in_progress = all bookings minus the 4 known statuses
  const inProgress = Math.max(0, totalBookings - completed - pending - cancelled - confirmed);

  const revSparkline  = dailyRevenue.slice(-10).map(d => ({ v: d.revenue  || 0 }));
  const bookSparkline = dailyRevenue.slice(-10).map(d => ({ v: d.bookings || 0 }));

  const goalPct = revenueGoal > 0
    ? Math.min(100, Math.round((totalRevenue / revenueGoal) * 100))
    : 0;

  // ── KPI color configs ─────────────────────────────────────────────────────
  const KPI = {
    revenue: {
      bg:     isDark ? '#1e1b4b' : '#eef2ff',
      border: isDark ? '#3730a3' : '#c7d2fe',
      icon:   '#6366f1',
      text:   isDark ? '#818cf8' : '#4f46e5',
      sub:    isDark ? '#6366f1' : '#3b82f6',
    },
    bookings: {
      bg:     isDark ? '#052e16' : '#f0fdf4',
      border: isDark ? '#166534' : '#bbf7d0',
      icon:   '#10b981',
      text:   isDark ? '#34d399' : '#15803d',
      sub:    isDark ? '#10b981' : '#16a34a',
    },
    customers: {
      bg:     isDark ? '#0c1d36' : '#eff6ff',
      border: isDark ? '#1e40af' : '#bfdbfe',
      icon:   '#3b82f6',
      text:   isDark ? '#60a5fa' : '#1d4ed8',
      sub:    isDark ? '#3b82f6' : '#2563eb',
    },
    growth: {
      bg:     growthRate < 0 ? (isDark ? '#1c0a0a' : '#fef2f2') : (isDark ? '#1c1200' : '#fffbeb'),
      border: growthRate < 0 ? (isDark ? '#7f1d1d' : '#fecaca') : (isDark ? '#92400e' : '#fde68a'),
      icon:   growthRate < 0 ? '#ef4444' : '#f59e0b',
      text:   growthRate < 0 ? (isDark ? '#f87171' : '#b91c1c') : (isDark ? '#fbbf24' : '#d97706'),
      sub:    growthRate < 0 ? (isDark ? '#ef4444' : '#dc2626') : (isDark ? '#f59e0b' : '#d97706'),
    },
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = async () => {
    if (!data) { Alert.alert('No Data', 'Load analytics data first.'); return; }
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ANALYTICS REPORT'],
      [`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`],
      [`Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`],
      [],
      ['SUMMARY'], ['Metric', 'Value'],
      ['Total Revenue', `Rs ${totalRevenue.toLocaleString()}`],
      ['Total Bookings', totalBookings],
      ['Completed', completed], ['Confirmed', confirmed],
      ['Pending', pending], ['Cancelled', cancelled],
      ['Active Customers', activeCustomers],
      ['Growth Rate', `${growthRate}%`],
      ['Avg Daily Revenue', `Rs ${avgDaily.toLocaleString()}`],
      [],
      ['DAILY REVENUE'], ['Date', 'Revenue (Rs)', 'Bookings'],
      ...dailyRevenue.map(r => [r.date, r.revenue ?? 0, r.bookings ?? 0]),
      [],
      ['TOP SERVICES'], ['Rank', 'Service', 'Bookings', 'Revenue (Rs)'],
      ...topServices.map((s, i) => [i + 1, s.name || s.serviceName, s.bookings ?? 0, s.revenue ?? 0]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(esc).join(',')).join('\n');
    try { await Share.share({ message: csv, title: 'Analytics Report' }); } catch { /* dismissed */ }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
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
  .blue{background:#eef2ff;border-color:#c7d2fe}.blue .stat-value{color:#4f46e5}
  .green{background:#f0fdf4;border-color:#bbf7d0}.green .stat-value{color:#15803d}
  .purple{background:#eff6ff;border-color:#bfdbfe}.purple .stat-value{color:#1d4ed8}
  .amber{background:#fffbeb;border-color:#fde68a}.amber .stat-value{color:#b45309}
  h2{font-size:14px;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;color:#111827}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#f9fafb;text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;border-bottom:1px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6}
  .empty{text-align:center;color:#9ca3af;padding:16px}
  .footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:0}@page{margin:10mm}}
</style></head><body>
<h1>Analytics Report</h1>
<p class="sub">${formatDate(startDate)} – ${formatDate(endDate)} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
<div class="stats">
  <div class="stat blue"><div class="stat-label">Total Revenue</div><div class="stat-value">₹${totalRevenue.toLocaleString()}</div><div class="stat-sub">${formatDate(startDate)} – ${formatDate(endDate)}</div></div>
  <div class="stat green"><div class="stat-label">Total Bookings</div><div class="stat-value">${totalBookings}</div><div class="stat-sub">${completed} completed · ${pending} pending</div></div>
  <div class="stat purple"><div class="stat-label">Active Customers</div><div class="stat-value">${activeCustomers}</div></div>
  <div class="stat amber"><div class="stat-label">Growth Rate</div><div class="stat-value">${growthRate > 0 ? '+' : ''}${growthRate}%</div><div class="stat-sub">vs previous period</div></div>
</div>
<h2>Top Services</h2>
<table>
  <tr><th>#</th><th>Service</th><th>Bookings</th><th>Revenue (₹)</th></tr>
  ${topServices.length ? topServices.map((s,i)=>`<tr><td>${i+1}</td><td>${s.name||s.serviceName}</td><td>${s.bookings??0}</td><td>₹${(s.revenue??0).toLocaleString()}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No service data</td></tr>'}
</table>
<h2>Daily Revenue</h2>
<table>
  <tr><th>Date</th><th>Revenue (₹)</th><th>Bookings</th></tr>
  ${dailyRevenue.length ? dailyRevenue.map(r=>`<tr><td>${r.date}</td><td>₹${(r.revenue??0).toLocaleString()}</td><td>${r.bookings??0}</td></tr>`).join('') : '<tr><td colspan="3" class="empty">No data</td></tr>'}
</table>
<div class="footer">Powered by My Salon Bookings</div>
</body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save PDF' });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch {
      Alert.alert('Error', 'Could not generate PDF');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: 14 + insets.top, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bar-chart" size={14} color="#fff" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>Analytics</Text>
          </View>
          <Text style={{ fontSize: 11, color: theme.subText, marginTop: 1, marginLeft: 36 }}>
            Real-time insights of your salon performance
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          {data && (
            <>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#16a34a' }]} onPress={exportCSV}>
                <Ionicons name="download-outline" size={12} color="#fff" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#4f46e5' }]} onPress={downloadPDF}>
                <Ionicons name="document-text-outline" size={12} color="#fff" />
                <Text style={styles.exportBtnText}>PDF</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
            onPress={() => fetchAnalytics(true)}
            disabled={loading}
          >
            <Ionicons name="refresh-outline" size={15} color={theme.subText} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Date filter + quick presets ── */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border, margin: 12, marginBottom: 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.subText, textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 2 }}>
              Quick
            </Text>
            {QUICK_PRESETS.map(p => (
              <TouchableOpacity
                key={p.days}
                onPress={() => setQuickRange(p.days)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
                  backgroundColor: activePreset === p.days ? '#4f46e5' : (isDark ? '#1f2937' : '#f3f4f6') }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: activePreset === p.days ? '#fff' : theme.subText }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="calendar-outline" size={13} color={theme.subText} />
            <TextInput
              style={[styles.dateInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              value={startDate}
              onChangeText={v => { setStartDate(v); setActivePreset(null); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
            />
            <Text style={{ color: theme.subText, fontSize: 12 }}>→</Text>
            <TextInput
              style={[styles.dateInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
              value={endDate}
              onChangeText={v => { setEndDate(v); setActivePreset(null); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.subText}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* ── Revenue goal ── */}
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 }}>
          {editingGoal ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Ionicons name="radio-button-on-outline" size={14} color="#6366f1" />
              <Text style={{ fontSize: 12, color: theme.subText }}>Set revenue goal:</Text>
              <TextInput
                style={[styles.goalInput, { backgroundColor: theme.card, borderColor: '#818cf8', color: theme.text }]}
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="e.g. 50000"
                placeholderTextColor={theme.subText}
                keyboardType="numeric"
                autoFocus
                onSubmitEditing={saveGoal}
              />
              <TouchableOpacity
                style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#4f46e5', borderRadius: 8 }}
                onPress={saveGoal}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingGoal(false)}>
                <Text style={{ fontSize: 12, color: theme.subText }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => { setGoalInput(revenueGoal ? String(revenueGoal) : ''); setEditingGoal(true); }}
            >
              <Ionicons name="radio-button-on-outline" size={14} color={theme.subText} />
              <Text style={{ fontSize: 12, color: theme.subText }}>
                {revenueGoal ? `Goal: ₹${revenueGoal.toLocaleString()}` : 'Set revenue goal'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Loading skeleton ── */}
        {loading && <LoadingSkeleton isDark={isDark} />}

        {/* ── Error state ── */}
        {!loading && error && (
          <View style={{ margin: 12, padding: 20, borderRadius: 14, alignItems: 'center', gap: 12,
            backgroundColor: isDark ? '#1c0a0a' : '#fef2f2', borderWidth: 1.5, borderColor: isDark ? '#7f1d1d' : '#fecaca' }}>
            <Ionicons name="cloud-offline-outline" size={36} color={isDark ? '#f87171' : '#dc2626'} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#f87171' : '#b91c1c', textAlign: 'center' }}>
              {error}
            </Text>
            <TouchableOpacity
              style={{ paddingHorizontal: 20, paddingVertical: 9, backgroundColor: '#4f46e5', borderRadius: 10 }}
              onPress={() => fetchAnalytics()}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Analytics data ── */}
        {!loading && !error && data && (
          <View style={{ padding: 12, gap: 10 }}>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
              {/* Total Revenue */}
              <View style={[styles.kpiCard, { backgroundColor: KPI.revenue.bg, borderColor: KPI.revenue.border }]}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="logo-usd" size={16} color={KPI.revenue.icon} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: KPI.revenue.icon, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Total Revenue</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: KPI.revenue.text, marginBottom: 2 }}>₹{totalRevenue.toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: KPI.revenue.sub }}>{formatDate(startDate)} – {formatDate(endDate)}</Text>
                <Text style={{ fontSize: 10, color: KPI.revenue.sub, marginTop: 1 }}>period total</Text>
                <Sparkline data={revSparkline} color={KPI.revenue.icon} />
              </View>

              {/* Total Bookings */}
              <View style={[styles.kpiCard, { backgroundColor: KPI.bookings.bg, borderColor: KPI.bookings.border }]}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="calendar-outline" size={16} color={KPI.bookings.icon} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: KPI.bookings.icon, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Total Bookings</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: KPI.bookings.text, marginBottom: 2 }}>{totalBookings}</Text>
                <Text style={{ fontSize: 10, color: KPI.bookings.sub }}>{completed} done · {pending} pending</Text>
                <Text style={{ fontSize: 10, color: KPI.bookings.sub, marginTop: 1 }}>in period</Text>
                <Sparkline data={bookSparkline} color={KPI.bookings.icon} />
              </View>

              {/* Active Customers */}
              <View style={[styles.kpiCard, { backgroundColor: KPI.customers.bg, borderColor: KPI.customers.border }]}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Ionicons name="people-outline" size={16} color={KPI.customers.icon} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: KPI.customers.icon, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Active Customers</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: KPI.customers.text, marginBottom: 2 }}>{activeCustomers}</Text>
                <Text style={{ fontSize: 10, color: KPI.customers.sub }}>unique visitors</Text>
                <Text style={{ fontSize: 10, color: KPI.customers.sub, marginTop: 1 }}> </Text>
              </View>

              {/* Growth Rate */}
              <View style={[styles.kpiCard, { backgroundColor: KPI.growth.bg, borderColor: KPI.growth.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={growthRate >= 0 ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={KPI.growth.icon} />
                  </View>
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
                    backgroundColor: growthRate < 0 ? (isDark ? '#7f1d1d' : '#fee2e2') : (isDark ? '#064e3b' : '#d1fae5') }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: growthRate < 0 ? (isDark ? '#f87171' : '#b91c1c') : (isDark ? '#34d399' : '#065f46') }}>
                      {growthRate > 0 ? '+' : ''}{growthRate}%
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: KPI.growth.icon, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Growth Rate</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: KPI.growth.text, marginBottom: 2 }}>{growthRate > 0 ? '+' : ''}{growthRate}%</Text>
                <Text style={{ fontSize: 10, color: KPI.growth.sub }}>vs previous period</Text>
                <Text style={{ fontSize: 10, color: KPI.growth.sub, marginTop: 1 }}>vs last period</Text>
              </View>
            </View>

            {/* Revenue Over Time */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Revenue Over Time</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>Daily revenue across selected period</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 2, backgroundColor: '#6366f1', borderRadius: 2 }} />
                  <Text style={{ fontSize: 9, color: theme.subText }}>Revenue</Text>
                </View>
              </View>
              {revenueGoal > 0 && (
                <View style={{ marginBottom: 10, padding: 10, borderRadius: 10,
                  backgroundColor: isDark ? '#1e1b4b' : '#eef2ff',
                  borderWidth: 1, borderColor: isDark ? '#3730a3' : '#c7d2fe' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#818cf8' : '#4f46e5' }}>Revenue Goal</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#818cf8' : '#4f46e5' }}>
                      ₹{totalRevenue.toLocaleString()} / ₹{revenueGoal.toLocaleString()} ({goalPct}%)
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? '#312e81' : '#c7d2fe', overflow: 'hidden' }}>
                    <View style={{ width: `${goalPct}%`, height: '100%', borderRadius: 3, backgroundColor: '#6366f1' }} />
                  </View>
                </View>
              )}
              <RevenueChart data={dailyRevenue} isDark={isDark} />
            </View>

            {/* Booking Status */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8,
                  backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="bar-chart-outline" size={14} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Booking Status</Text>
              </View>
              <BookingStatusChart
                completed={completed} pending={pending}
                cancelled={cancelled} confirmed={confirmed}
                inProgress={inProgress} theme={theme}
              />
            </View>

            {/* Top Services */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8,
                  backgroundColor: isDark ? '#1e1b4b' : '#f5f3ff', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="ribbon-outline" size={14} color="#8b5cf6" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Top Services</Text>
                <Text style={{ marginLeft: 'auto', fontSize: 10, color: theme.subText }}>by bookings</Text>
              </View>
              <TopServicesSection services={topServices} theme={theme} />
            </View>

            {/* Smart Insights */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <SmartInsights
                growthRate={growthRate}
                topServices={topServices}
                totalRevenue={totalRevenue}
                totalBookings={totalBookings}
                completedBookings={completed}
                isDark={isDark}
              />
            </View>

            {/* Booking Activity Heatmap */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="time-outline" size={14} color="#6366f1" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Booking Activity</Text>
                <Text style={{ marginLeft: 'auto', fontSize: 10, color: theme.subText }}>per day</Text>
              </View>
              <BookingHeatmap
                dailyRevenue={dailyRevenue}
                startDate={startDate}
                endDate={endDate}
                isDark={isDark}
                theme={theme}
              />
            </View>

            {/* Top Customers */}
            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Ionicons name="people-outline" size={14} color="#3b82f6" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Top Customers</Text>
                <Text style={{ marginLeft: 'auto', fontSize: 10, color: theme.subText }}>by visits</Text>
              </View>
              <TopCustomersList recentBookings={recentBookings} theme={theme} />
            </View>

          </View>
        )}

        {/* ── No data after load ── */}
        {!loading && !error && !data && (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 16,
              backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
              alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bar-chart-outline" size={32} color={isDark ? '#374151' : '#d1d5db'} />
            </View>
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>No data available yet</Text>
            <Text style={{ color: theme.subText, fontSize: 13 }}>Start by adding bookings to see analytics</Text>
          </View>
        )}

        {/* ── Recent Bookings (always visible) ── */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border, margin: 12, marginTop: !loading && !error && data ? 0 : 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>Recent Bookings</Text>
              <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                {bookingsDate === today ? 'Today' : formatDate(bookingsDate + 'T12:00:00')}
                {' · '}{bookingsList.length} booking{bookingsList.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: theme.bg, borderColor: theme.border }]}
                onPress={() => shiftBookingsDate(-1)}
              >
                <Ionicons name="chevron-back" size={14} color={theme.text} />
              </TouchableOpacity>
              <View style={[styles.datePill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Text style={{ fontSize: 11, color: theme.subText, fontWeight: '500' }}>
                  {bookingsDate === today ? 'Today' : bookingsDate.slice(5)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: theme.bg, borderColor: theme.border, opacity: bookingsDate === today ? 0.4 : 1 }]}
                onPress={() => shiftBookingsDate(1)}
                disabled={bookingsDate === today}
              >
                <Ionicons name="chevron-forward" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {bookingsLoading ? (
            <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 20 }} />
          ) : bookingsList.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Ionicons name="calendar-outline" size={36} color={isDark ? '#374151' : '#d1d5db'} />
              <Text style={{ color: theme.subText, fontSize: 13 }}>No bookings on this date</Text>
            </View>
          ) : (
            bookingsList.map(b => {
              const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
              return (
                <View key={b._id} style={[styles.bookingRow, { borderTopColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>{b.customerName || '—'}</Text>
                    <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                      {b.serviceName} · {formatTime(b.appointmentTime)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
                        {b.status?.replace('_', ' ')}
                      </Text>
                    </View>
                    {b.totalAmount ? (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>₹{b.totalAmount}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
  },
  exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { borderRadius: 14, borderWidth: 1.5, padding: 14 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flex: 1, minWidth: '45%', borderRadius: 14, borderWidth: 1.5, padding: 14 },
  dateInput: {
    flex: 1, height: 34, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, fontSize: 12,
  },
  goalInput: {
    width: 100, height: 30, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, fontSize: 12,
  },
  navBtn: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  datePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
