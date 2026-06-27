import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Pressable, TextInput, Image, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useSalon } from '../../context/SalonContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import TrialBanner from '../../components/TrialBanner';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { showSuccess, showError } from '../../utils/toast';
import { localDate, formatDate, formatTime, STATUS_COLORS, salonBookingUrl } from '../../utils/helpers';

const today   = localDate(0);
const maxDate = localDate(30);

const nowTimeStr = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

const queueLabel = (i) => {
  if (i === 0) return { label: 'Next Up', color: '#6366f1', bg: '#e0e7ff', darkBg: 'rgba(99,102,241,0.2)' };
  if (i === 1) return { label: '2nd',     color: '#7c3aed', bg: '#ede9fe', darkBg: 'rgba(124,58,237,0.2)' };
  if (i === 2) return { label: '3rd',     color: '#0d9488', bg: '#ccfbf1', darkBg: 'rgba(13,148,136,0.2)' };
  return              { label: `${i+1}th`,color: '#6b7280', bg: '#f3f4f6', darkBg: 'rgba(107,114,128,0.2)' };
};

const ACTIVITY_STATUS = {
  completed:   { dot: '#10b981', label: 'Completed' },
  confirmed:   { dot: '#6366f1', label: 'Confirmed' },
  in_progress: { dot: '#8b5cf6', label: 'In Progress' },
  pending:     { dot: '#f59e0b', label: 'Pending' },
  cancelled:   { dot: '#ef4444', label: 'Cancelled' },
};

const DAY_ABR = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/* ── WeeklyBars ──────────────────────────────────────────────── */
function WeeklyBars({ data = [], color = '#6366f1', isDark }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 50, gap: 3 }}>
      {data.map((d, i) => {
        const barH  = Math.max((d.value / max) * 36, 2);
        const isLast = i === data.length - 1;
        const day    = d.date ? DAY_ABR[new Date(d.date + 'T12:00:00').getDay()] : '';
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 50 }}>
            <View style={{ width: '100%', height: barH, backgroundColor: color, opacity: isLast ? 1 : 0.4, borderRadius: 3 }} />
            <Text style={{ fontSize: 7, color: isDark ? '#475569' : '#94a3b8', marginTop: 3 }}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ── StatCard ────────────────────────────────────────────────── */
function StatCard({ label, value, iconName, accent, bg, border, trend, trendLabel, sparkData, sparkColor, loading, isDark, theme }) {
  const isUp = trend >= 0;
  return (
    <View style={[sStyles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={[sStyles.label, { color: theme.subText }]}>{label}</Text>
          {loading
            ? <View style={[sStyles.skeleton, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
            : <Text style={[sStyles.value, { color: theme.text }]}>{value}</Text>
          }
        </View>
        <View style={[sStyles.iconBox, { backgroundColor: isDark ? `${accent}22` : `${accent}18` }]}>
          <Ionicons name={iconName} size={20} color={accent} />
        </View>
      </View>
      {sparkData && sparkData.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <WeeklyBars data={sparkData} color={sparkColor || accent} isDark={isDark} />
        </View>
      )}
      {trendLabel !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: sparkData ? 2 : 8 }}>
          <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={13} color={isUp ? '#10b981' : '#ef4444'} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: isUp ? '#10b981' : '#ef4444' }}>
            {isUp && trend !== 0 ? '+' : ''}{trend}%
          </Text>
          <Text style={{ fontSize: 11, color: theme.subText }}>{trendLabel}</Text>
        </View>
      )}
    </View>
  );
}

const sStyles = StyleSheet.create({
  card:    { flex: 1, minWidth: '44%', borderRadius: 16, padding: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  label:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  value:   { fontSize: 26, fontWeight: '900', marginTop: 2 },
  skeleton:{ height: 28, borderRadius: 8, marginTop: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation();

  const [queue,           setQueue]           = useState([]);
  const [queueDate,       setQueueDate]       = useState(today);
  const [queueLoading,    setQueueLoading]    = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [updating,        setUpdating]        = useState(null);
  const [blockedIds,      setBlockedIds]      = useState(new Set());
  const [blocking,        setBlocking]        = useState(null);
  const [actionSheet,     setActionSheet]     = useState(null);
  const [confirm,         setConfirm]         = useState(null);
  const [showWalkIn,      setShowWalkIn]      = useState(false);
  const [showQR,          setShowQR]          = useState(false);
  const [capturing,       setCapturing]       = useState(false);
  const [capturingA4,     setCapturingA4]     = useState(false);
  const [services,        setServices]        = useState([]);
  const [todayBookings,   setTodayBookings]   = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [weeklyBookings,  setWeeklyBookings]  = useState([]);
  const [weeklyRevenue,   setWeeklyRevenue]   = useState([]);
  const [analyticsLoading,setAnalyticsLoading]= useState(false);
  const [insights,        setInsights]        = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showWelcome,      setShowWelcome]     = useState(false);
  const queueRef = useRef([]);
  queueRef.current = queue;

  const qrValue = salonBookingUrl(salon);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /* ── QR card HTML generators ── */
  const getCardHtml = () => {
    const safeData = JSON.stringify({ salonName: salon?.name || 'My Salon', bookingUrl: qrValue });
    const qrApiUrl = JSON.stringify(`https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(qrValue)}`);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0"><canvas id="c" width="1200" height="1680"></canvas><script>(function(){
var d=${safeData},salonName=d.salonName,bookingUrl=d.bookingUrl;
var c=document.getElementById('c'),ctx=c.getContext('2d'),W=400,H=560,S=3;ctx.scale(S,S);
ctx.fillStyle='#f3f4f6';ctx.fillRect(0,0,W,H);ctx.fillStyle='#ffffff';ctx.fillRect(20,20,360,520);
ctx.fillStyle='#4f46e5';ctx.fillRect(20,20,360,74);ctx.fillStyle='#ffffff';ctx.font='bold 17px Arial';ctx.textAlign='center';
ctx.fillText('\u2702  Salon Booking',200,64);
var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){
  ctx.drawImage(img,110,110,180,180);ctx.fillStyle='#111827';ctx.font='bold 20px Arial';ctx.fillText(salonName,200,322);
  ctx.fillStyle='#6b7280';ctx.font='13px Arial';ctx.fillText('Scan to book your appointment',200,348);
  ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(60,368);ctx.lineTo(340,368);ctx.stroke();
  ctx.fillStyle='#9ca3af';ctx.font='9px Arial';
  var maxW=320,line='',lines=[],chars=bookingUrl.split('');
  chars.forEach(function(ch){var t=line+ch;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=ch;}else{line=t;}});
  if(line)lines.push(line);lines.forEach(function(l,i){ctx.fillText(l,200,386+i*13);});
  ctx.fillStyle='#6b7280';ctx.font='11px Arial';ctx.fillText('Powered by GlowLoox',200,500);
  window.ReactNativeWebView.postMessage(c.toDataURL('image/png').split(',')[1]);
};img.onerror=function(){window.ReactNativeWebView.postMessage('ERROR');};img.src=${qrApiUrl};
})();<\/script></body></html>`;
  };

  const onCardCaptured = useCallback(async (e) => {
    setCapturing(false);
    const base64 = e.nativeEvent.data;
    if (!base64 || base64 === 'ERROR') { showError('Error', 'Could not generate QR card'); return; }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { showError('Permission denied', 'Allow storage access to save QR'); return; }
      const path = `${FileSystem.cacheDirectory}${salon?.name || 'salon'}-booking-qr.png`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      await MediaLibrary.saveToLibraryAsync(path);
      showSuccess('Saved!', 'QR card saved to your gallery');
    } catch { showError('Error', 'Could not save QR card'); }
  }, [salon]);

  const getA4Html = () => {
    const safeData = JSON.stringify({ salonName: salon?.name || 'My Salon', bookingUrl: qrValue });
    const qrApiUrl = JSON.stringify(`https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(qrValue)}`);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0"><canvas id="c" width="1200" height="1698"></canvas><script>(function(){
var d=${safeData},salonName=d.salonName,bookingUrl=d.bookingUrl;
var c=document.getElementById('c'),ctx=c.getContext('2d'),W=400,H=566,S=3;ctx.scale(S,S);
ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#4f46e5';ctx.fillRect(0,0,W,110);
ctx.fillStyle='#ffffff';ctx.font='bold 28px Arial';ctx.textAlign='center';ctx.fillText('\u2702  Salon Booking',W/2,52);
ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='13px Arial';ctx.fillText('Scan the QR code to book your appointment',W/2,76);
ctx.fillStyle='rgba(255,255,255,0.55)';ctx.font='11px Arial';ctx.fillText(salonName,W/2,96);
var img=new Image();img.crossOrigin='anonymous';
img.onload=function(){
  var QS=230,QX=(W-QS)/2,QY=130;
  ctx.fillStyle='#f3f4f6';ctx.fillRect(QX-14,QY-14,QS+28,QS+28);ctx.fillStyle='#ffffff';ctx.fillRect(QX-10,QY-10,QS+20,QS+20);
  ctx.drawImage(img,QX,QY,QS,QS);ctx.fillStyle='#111827';ctx.font='bold 26px Arial';ctx.textAlign='center';
  ctx.fillText(salonName,W/2,QY+QS+42);ctx.fillStyle='#6b7280';ctx.font='14px Arial';ctx.fillText('Scan to book your appointment',W/2,QY+QS+64);
  ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(60,QY+QS+82);ctx.lineTo(W-60,QY+QS+82);ctx.stroke();
  ctx.fillStyle='#9ca3af';ctx.font='9px Arial';
  var maxW=W-60,line='',lines=[],chars=bookingUrl.split('');
  chars.forEach(function(ch){var t=line+ch;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=ch;}else{line=t;}});
  if(line)lines.push(line);lines.forEach(function(l,i){ctx.fillText(l,W/2,QY+QS+98+i*13);});
  ctx.fillStyle='#f9fafb';ctx.fillRect(0,H-40,W,40);ctx.strokeStyle='#e5e7eb';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,H-40);ctx.lineTo(W,H-40);ctx.stroke();
  ctx.fillStyle='#9ca3af';ctx.font='11px Arial';ctx.fillText('Powered by GlowLoox',W/2,H-16);
  window.ReactNativeWebView.postMessage(c.toDataURL('image/png').split(',')[1]);
};img.onerror=function(){window.ReactNativeWebView.postMessage('ERROR');};img.src=${qrApiUrl};
})();<\/script></body></html>`;
  };

  const onA4Captured = useCallback(async (e) => {
    setCapturingA4(false);
    const base64 = e.nativeEvent.data;
    if (!base64 || base64 === 'ERROR') { showError('Error', 'Could not generate image'); return; }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { showError('Permission denied', 'Allow storage access to save'); return; }
      const path = `${FileSystem.cacheDirectory}${salon?.name || 'salon'}-qr-a4.png`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      await MediaLibrary.saveToLibraryAsync(path);
      showSuccess('Saved!', 'QR printout saved to your gallery');
    } catch { showError('Error', 'Could not save image'); }
  }, [salon]);

  /* ── Fetch queue ── */
  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const todayStr    = localDate(0);
      const tomorrowStr = localDate(1);
      let res  = await api.get(`/owner/bookings?date=${todayStr}`);
      let data = res.data.data;
      let all  = Array.isArray(data) ? data : (data?.bookings || []);
      const upcoming = all
        .filter(b => ['pending','confirmed','in_progress'].includes(b.status))
        .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
      if (upcoming.length > 0) {
        setQueueDate(todayStr); setQueue(upcoming);
      } else {
        res  = await api.get(`/owner/bookings?date=${tomorrowStr}`);
        data = res.data.data;
        all  = Array.isArray(data) ? data : (data?.bookings || []);
        const tmrUpcoming = all
          .filter(b => ['pending','confirmed','in_progress'].includes(b.status))
          .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
        setQueueDate(tomorrowStr); setQueue(tmrUpcoming);
      }
    } catch { setQueue([]); } finally { setQueueLoading(false); }
  };

  /* ── Fetch today's bookings (for stat card + recent activity) ── */
  const fetchTodayBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const res = await api.get(`/owner/bookings?date=${today}`);
      const d   = res.data.data;
      const all = Array.isArray(d) ? d : (d?.bookings || []);
      setTodayBookings(all.sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || '')));
    } catch { setTodayBookings([]); } finally { setBookingsLoading(false); }
  }, []);

  const fetchServices = async () => {
    try {
      const res = await api.get('/owner/services');
      const d   = res.data.data;
      setServices(Array.isArray(d) ? d : (d?.services || []));
    } catch {}
  };

  const fetchBlockedIds = async () => {
    try {
      const res = await api.get('/owner/blocked-customers');
      const ids = new Set(
        (res.data.data?.blockedCustomers || [])
          .map(bc => String(bc.customerId?._id || bc.customerId))
          .filter(Boolean)
      );
      setBlockedIds(ids);
    } catch {}
  };

  const fetchWeeklyAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const start = localDate(-6);
      const end   = localDate(0);
      const res   = await api.get(`/owner/analytics/dashboard?startDate=${start}&endDate=${end}`);
      const daily = res.data?.data?.dailyRevenue || [];
      const map   = {};
      daily.forEach(d => { map[d.date] = d; });
      const bArr = [], rArr = [];
      for (let i = -6; i <= 0; i++) {
        const d = localDate(i);
        const e = map[d] || { bookings: 0, revenue: 0 };
        bArr.push({ date: d, value: e.bookings || 0 });
        rArr.push({ date: d, value: e.revenue  || 0 });
      }
      setWeeklyBookings(bArr);
      setWeeklyRevenue(rArr);
    } catch {
      const zeros = [-6,-5,-4,-3,-2,-1,0].map(o => ({ date: localDate(o), value: 0 }));
      setWeeklyBookings(zeros); setWeeklyRevenue(zeros);
    } finally { setAnalyticsLoading(false); }
  }, []);

  /* ── Fetch smart insights (Intelligence strip) ── */
  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await api.get('/owner/analytics/insights');
      setInsights(res.data?.data || null);
    } catch { setInsights(null); }
    finally { setInsightsLoading(false); }
  }, []);

  /* ── Block / Status handlers ── */
  const handleToggleBlock = async (customerId, customerName, isBlocked) => {
    setActionSheet(null);
    setConfirm({
      title:        isBlocked ? `Unblock ${customerName}?` : `Block ${customerName}?`,
      message:      isBlocked
        ? `${customerName} will be able to book appointments again.`
        : `${customerName} will no longer be able to book appointments at your salon.`,
      danger:       !isBlocked,
      confirmLabel: isBlocked ? 'Yes, Unblock' : 'Yes, Block',
      onConfirm: async () => {
        setConfirm(null); setBlocking(customerId);
        try {
          if (isBlocked) {
            await api.delete(`/owner/customers/${customerId}/block`);
            setBlockedIds(prev => { const n = new Set(prev); n.delete(String(customerId)); return n; });
          } else {
            await api.post(`/owner/customers/${customerId}/block`, { reason: 'Blocked by owner' });
            setBlockedIds(prev => new Set([...prev, String(customerId)]));
          }
        } catch (err) { showError('Error', err.message || 'Something went wrong'); }
        finally { setBlocking(null); }
      },
    });
  };

  const confirmStatusChange = (booking, newStatus) => {
    setActionSheet(null);
    const labels   = { confirmed: 'Confirm', in_progress: 'Start', cancelled: 'Cancel', completed: 'Complete' };
    const messages = {
      confirmed:   `Confirm booking for ${booking.customerName || 'this customer'}?`,
      in_progress: `Start the service for ${booking.customerName || 'this customer'} now?`,
      cancelled:   `Cancel ${booking.customerName || 'this customer'}'s booking? This cannot be undone.`,
      completed:   `Mark ${booking.customerName || 'this customer'}'s booking as completed?`,
    };
    setConfirm({
      title:        `${labels[newStatus] || newStatus} Booking`,
      message:      messages[newStatus] || `Change status to ${newStatus}?`,
      danger:       newStatus === 'cancelled',
      confirmLabel: labels[newStatus] || 'Confirm',
      onConfirm:    () => { setConfirm(null); handleStatusChange(booking._id, newStatus); },
    });
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status: newStatus });
      setQueue(prev =>
        newStatus === 'cancelled' || newStatus === 'completed'
          ? prev.filter(b => b._id !== bookingId)
          : prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b)
      );
      fetchTodayBookings();
    } catch (err) { showError('Error', err.message || 'Something went wrong'); }
    finally { setUpdating(null); }
  };

  /* ── Auto-start confirmed bookings ── */
  useEffect(() => {
    const checkAutoStart = async () => {
      const now = nowTimeStr();
      const toStart = queueRef.current.filter(
        b => b.status === 'confirmed' && b.appointmentTime && b.appointmentTime <= now
      );
      for (const b of toStart) {
        try {
          await api.put(`/owner/bookings/${b._id}`, { status: 'in_progress' });
          setQueue(prev => prev.filter(q => q._id !== b._id));
        } catch {}
      }
    };
    checkAutoStart();
    const interval = setInterval(checkAutoStart, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchQueue(), fetchTodayBookings(), fetchWeeklyAnalytics(), fetchInsights()]);
    setRefreshing(false);
  };

  const createWalkIn = async (data) => {
    await api.post('/owner/bookings', data);
    showSuccess('Booked', 'Walk-in booking created!');
    await Promise.all([fetchQueue(), fetchTodayBookings()]);
  };

  useEffect(() => { fetchBlockedIds(); fetchServices(); fetchTodayBookings(); fetchWeeklyAnalytics(); fetchInsights(); }, []);
  useFocusEffect(useCallback(() => { fetchQueue(); fetchTodayBookings(); }, []));

  // Show welcome banner once on first staff login
  useEffect(() => {
    AsyncStorage.getItem('staffFirstLogin').then(val => {
      if (val === '1') {
        setShowWelcome(true);
        AsyncStorage.removeItem('staffFirstLogin');
      }
    });
  }, []);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const todayRevenue = todayBookings
      .filter(b => b.status === 'completed')
      .reduce((s, b) => s + (b.totalAmount || 0), 0);
    const upcoming = todayBookings.filter(b => ['pending','confirmed'].includes(b.status)).length;
    const wb = weeklyBookings;
    const bkTrend  = wb[wb.length-2]?.value
      ? Math.round(((wb[wb.length-1]?.value - wb[wb.length-2]?.value) / wb[wb.length-2]?.value) * 100)
      : 0;
    const wr = weeklyRevenue;
    const revTrend = wr[wr.length-2]?.value
      ? Math.round(((wr[wr.length-1]?.value - wr[wr.length-2]?.value) / wr[wr.length-2]?.value) * 100)
      : 0;
    return { todayBookings: todayBookings.length, todayRevenue, activeQueue: queue.length, upcoming, bkTrend, revTrend };
  }, [todayBookings, queue, weeklyBookings, weeklyRevenue]);

  const isQueueToday = queueDate === today;

  /* ── Recent activity: today's bookings sorted recent-first, max 8 ── */
  const recentActivity = useMemo(() =>
    [...todayBookings]
      .sort((a, b) => (b.appointmentTime || '').localeCompare(a.appointmentTime || ''))
      .slice(0, 8),
    [todayBookings]
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      {/* ══ FIRST-LOGIN WELCOME BANNER (staff) ══════════════════ */}
      {showWelcome && (
        <View style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 2, borderRadius: 14, overflow: 'hidden',
          backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
          borderWidth: 1, borderColor: isDark ? 'rgba(99,102,241,0.35)' : '#c7d2fe',
          flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
          <Ionicons name="sparkles" size={22} color="#6366f1" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: isDark ? '#c7d2fe' : '#3730a3' }}>
              Welcome to {user?.salonName || 'the team'}!
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#a5b4fc' : '#4f46e5', marginTop: 2 }}>
              Your account is active. Complete your profile anytime from Settings.
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowWelcome(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={isDark ? '#a5b4fc' : '#6366f1'} />
          </TouchableOpacity>
        </View>
      )}

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <DrawerMenuButton color={theme.text} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('dashboard')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: theme.bg }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.subText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowQR(true)} style={[styles.iconBtn, { backgroundColor: theme.bg }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="qr-code-outline" size={20} color={theme.subText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={[styles.iconBtn, { backgroundColor: theme.bg }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="notifications-outline" size={20} color={theme.subText} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {user?.profilePhoto
              ? <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
              : <View style={[styles.avatarFallback, { backgroundColor: '#e0e7ff' }]}><Ionicons name="person" size={16} color="#6366f1" /></View>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Trial / Billing bar */}
      <TrialBanner />

      {/* ══ HERO BANNER ═════════════════════════════════════════ */}
      <View style={styles.heroBanner}>
        <View style={styles.heroGradOverlay} />
        <View style={styles.heroBlob1} />
        <View style={styles.heroBlob2} />

        <View style={{ position: 'relative' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE DASHBOARD</Text>
          </View>
          <Text style={styles.heroGreeting}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Owner'}!
          </Text>
          <Text style={styles.heroSub}>
            {salon?.name
              ? <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>{salon.name} · </Text>
              : null}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity onPress={fetchQueue} disabled={queueLoading} style={styles.heroRefreshBtn}>
              <Ionicons name={queueLoading ? 'sync' : 'refresh'} size={16} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowWalkIn(true)} style={styles.heroAddBtn}>
              <Ionicons name="add" size={16} color="#4f46e5" />
              <Text style={styles.heroAddText}>Add Walk-in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ══ STAT CARDS (4-up grid) ══════════════════════════════ */}
      <View style={styles.statsGrid}>
        <StatCard
          label="BOOKINGS TODAY"
          value={analyticsLoading ? '—' : String(stats.todayBookings)}
          iconName="calendar-outline"
          accent="#6366f1"
          bg={isDark ? theme.card : '#fff'}
          border={isDark ? '#1e293b' : '#f1f5f9'}
          trend={stats.bkTrend}
          trendLabel="vs yesterday"
          sparkData={weeklyBookings}
          sparkColor="#6366f1"
          loading={analyticsLoading}
          isDark={isDark} theme={theme}
        />
        <StatCard
          label="REVENUE TODAY"
          value={analyticsLoading ? '—' : `₹${stats.todayRevenue.toLocaleString()}`}
          iconName="cash-outline"
          accent="#10b981"
          bg={isDark ? theme.card : '#fff'}
          border={isDark ? '#1e293b' : '#f1f5f9'}
          trend={stats.revTrend}
          trendLabel="vs yesterday"
          sparkData={weeklyRevenue}
          sparkColor="#10b981"
          loading={analyticsLoading}
          isDark={isDark} theme={theme}
        />
        <StatCard
          label="ACTIVE QUEUE"
          value={queueLoading ? '—' : String(stats.activeQueue)}
          iconName="people-outline"
          accent="#d97706"
          bg={isDark ? theme.card : '#fff'}
          border={isDark ? '#1e293b' : '#f1f5f9'}
          trend={0}
          trendLabel="in queue now"
          loading={queueLoading}
          isDark={isDark} theme={theme}
        />
        <StatCard
          label="UPCOMING"
          value={bookingsLoading ? '—' : String(stats.upcoming)}
          iconName="time-outline"
          accent="#7c3aed"
          bg={isDark ? theme.card : '#fff'}
          border={isDark ? '#1e293b' : '#f1f5f9'}
          trend={0}
          trendLabel="pending/confirmed"
          loading={bookingsLoading}
          isDark={isDark} theme={theme}
        />
      </View>

      {/* ══ INTELLIGENCE STRIP (smart insights) ═════════════════ */}
      {insights && (
        <View style={{ paddingHorizontal: 12, marginTop: 6 }}>
          <View style={styles.intelRow}>
            <View style={[styles.intelCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5' }]}>
              <Text style={styles.intelLbl}>Today's Revenue</Text>
              <Text style={[styles.intelVal, { color: '#059669' }]}>₹{(insights.todayRevenue || 0).toLocaleString('en-IN')}</Text>
              {insights.revDelta != null && (
                <Text style={[styles.intelDelta, { color: insights.revDelta >= 0 ? '#059669' : '#ef4444' }]}>
                  {insights.revDelta >= 0 ? '▲' : '▼'} {Math.abs(insights.revDelta)}% vs yesterday
                </Text>
              )}
            </View>
            <View style={[styles.intelCard, { backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : '#eef2ff' }]}>
              <Text style={styles.intelLbl}>Peak Hour</Text>
              <Text style={[styles.intelVal, { color: '#6366f1' }]} numberOfLines={1}>{insights.peakHourLabel || '—'}</Text>
              <Text style={styles.intelDelta}>Busiest time</Text>
            </View>
          </View>
          <View style={styles.intelRow}>
            <View style={[styles.intelCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : '#fef2f2' }]}>
              <Text style={styles.intelLbl}>Missed Revenue</Text>
              <Text style={[styles.intelVal, { color: '#ef4444' }]}>₹{(insights.missedRevenue || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.intelDelta}>{insights.noShowCount || 0} no-shows/cancels this week</Text>
            </View>
            <View style={[styles.intelCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb' }]}>
              <Text style={styles.intelLbl}>Inactive Customers</Text>
              <Text style={[styles.intelVal, { color: '#d97706' }]}>{insights.inactiveCustomers || 0}</Text>
              <Text style={styles.intelDelta}>Haven't booked in 30+ days</Text>
            </View>
          </View>
          {(insights.streak > 1 || insights.totalBookings > 0) && (
            <View style={[styles.intelStreak, { backgroundColor: theme.card, borderColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              {insights.streak > 1 && (
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>🔥 {insights.streak}-day streak</Text>
              )}
              {insights.totalBookings > 0 && (
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>🏆 {insights.totalBookings.toLocaleString('en-IN')} bookings</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* ══ LIVE QUEUE CARD ═════════════════════════════════════ */}
      <View style={{ paddingHorizontal: 12, marginTop: 6, marginBottom: 10 }}>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
          {/* Card header */}
          <View style={[styles.cardHeader, { borderBottomColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.queueIconBox}>
                <Ionicons name="people" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Live Queue</Text>
                <Text style={[styles.cardSub, { color: theme.subText }]}>
                  {queue.length} active booking{queue.length !== 1 ? 's' : ''} · {isQueueToday ? 'Today' : formatDate(queueDate + 'T12:00:00')}
                </Text>
              </View>
            </View>
            {queue.length > 0 && (
              <View style={[styles.queueCountBadge, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366f1' }}>{queue.length} in queue</Text>
              </View>
            )}
          </View>

          {/* Queue items */}
          <View style={{ padding: 14, gap: 10 }}>
            {queueLoading ? (
              <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 16 }} />
            ) : queue.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
                <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
                  <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Queue is clear!</Text>
                <Text style={[styles.emptySub, { color: theme.subText }]}>No active bookings right now</Text>
              </View>
            ) : (
              queue.map((b, i) => {
                const q      = queueLabel(i);
                const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
                const qBg    = isDark ? q.darkBg : q.bg;
                return (
                  <View key={String(b._id || i)}
                    style={[styles.queueItem, {
                      backgroundColor: i === 0 ? (isDark ? 'rgba(99,102,241,0.08)' : '#f5f3ff') : 'transparent',
                      borderColor: i === 0 ? (isDark ? 'rgba(99,102,241,0.3)' : '#e0e7ff') : (isDark ? '#1e293b' : '#f3f4f6'),
                    }]}
                  >
                    {/* left accent bar for first */}
                    {i === 0 && <View style={styles.queueAccentBar} />}

                    {/* Top row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View style={[styles.queueBadge, { backgroundColor: qBg }]}>
                        <Text style={[styles.queueBadgeText, { color: q.color }]}>{q.label}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setActionSheet(b)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.subText} />
                      </TouchableOpacity>
                    </View>

                    {/* Customer row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.customerAvatar, { backgroundColor: qBg }]}>
                        <Text style={[styles.customerAvatarText, { color: q.color }]}>
                          {b.customerName?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.customerName, { color: theme.text }]}>{b.customerName || '—'}</Text>
                        {b.customerPhone
                          ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <Ionicons name="call-outline" size={11} color={theme.subText} />
                              <Text style={[styles.customerPhone, { color: theme.subText }]}>{b.customerPhone}</Text>
                            </View>
                          : null}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>{b.status?.replace('_',' ')}</Text>
                      </View>
                    </View>

                    {/* Details */}
                    <View style={[styles.detailsRow, { borderTopColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
                      <View style={styles.detailItem}>
                        <Ionicons name="cut-outline" size={12} color={theme.subText} />
                        <Text style={[styles.detailText, { color: theme.subText }]} numberOfLines={1}>{b.serviceName || '—'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={12} color={theme.subText} />
                        <Text style={[styles.detailText, { color: theme.subText }]}>{formatTime(b.appointmentTime)}</Text>
                      </View>
                      {b.totalAmount
                        ? <View style={styles.detailItem}>
                            <Ionicons name="cash-outline" size={12} color="#10b981" />
                            <Text style={[styles.detailText, { color: '#10b981', fontWeight: '600' }]}>₹{b.totalAmount}</Text>
                          </View>
                        : null}
                    </View>

                    {/* Action buttons */}
                    {updating === b._id || blocking === String(b.customerId) ? (
                      <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 10 }} />
                    ) : (
                      <View style={[styles.actionsRow, { borderTopColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
                        {b.status === 'pending' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6366f1' }]} onPress={() => confirmStatusChange(b, 'confirmed')}>
                            <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Confirm</Text>
                          </TouchableOpacity>
                        )}
                        {b.status === 'confirmed' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => confirmStatusChange(b, 'in_progress')}>
                            <Ionicons name="play-circle-outline" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Start</Text>
                          </TouchableOpacity>
                        )}
                        {b.status === 'in_progress' && (
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => confirmStatusChange(b, 'completed')}>
                            <Ionicons name="checkmark-done-circle-outline" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Done</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]} onPress={() => confirmStatusChange(b, 'cancelled')}>
                          <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                          <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* ══ WEEKLY CHARTS ═══════════════════════════════════════ */}
      <View style={{ paddingHorizontal: 12, gap: 10, marginBottom: 10 }}>
        {[
          { title: 'Booking Trend', sub: 'Last 7 days', iconName: 'analytics-outline', iconBg: isDark ? 'rgba(99,102,241,0.18)' : '#e0e7ff', iconColor: '#6366f1', data: weeklyBookings, color: '#6366f1', total: weeklyBookings.reduce((s,d)=>s+d.value,0), totalColor: '#6366f1', unit: '' },
          { title: 'Revenue Trend', sub: 'Last 7 days', iconName: 'trending-up-outline', iconBg: isDark ? 'rgba(16,185,129,0.18)' : '#d1fae5', iconColor: '#10b981', data: weeklyRevenue, color: '#10b981', total: weeklyRevenue.reduce((s,d)=>s+d.value,0), totalColor: '#10b981', unit: '₹' },
        ].map(ch => (
          <View key={ch.title} style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.chartIcon, { backgroundColor: ch.iconBg }]}>
                  <Ionicons name={ch.iconName} size={14} color={ch.iconColor} />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{ch.title}</Text>
                  <Text style={[styles.cardSub, { color: theme.subText }]}>{ch.sub}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: ch.totalColor }}>{ch.unit}{ch.total.toLocaleString()}</Text>
                <Text style={{ fontSize: 10, color: theme.subText }}>total</Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              {analyticsLoading
                ? <View style={[styles.chartSkeleton, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
                : <WeeklyBars data={ch.data} color={ch.color} isDark={isDark} />
              }
            </View>
          </View>
        ))}
      </View>

      {/* ══ QUICK ACTIONS + RECENT ACTIVITY ════════════════════ */}
      <View style={{ paddingHorizontal: 12, gap: 10, marginBottom: 6 }}>

        {/* Quick Actions */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
          <View style={[styles.cardHeader, { borderBottomColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.zapIconBox}>
                <Ionicons name="flash" size={14} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Actions</Text>
            </View>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            {[
              { label: 'Add Walk-in',  icon: 'add-circle-outline', onPress: () => setShowWalkIn(true),           accent: true },
              { label: 'All Bookings', icon: 'calendar-outline',   onPress: () => navigation.navigate('Bookings') },
              { label: 'Services',     icon: 'cut-outline',         onPress: () => navigation.navigate('Services') },
              { label: 'Customers',    icon: 'people-outline',      onPress: () => navigation.navigate('Customers') },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                style={[
                  styles.quickActionBtn,
                  item.accent
                    ? { backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', borderColor: isDark ? 'rgba(99,102,241,0.3)' : '#c7d2fe' }
                    : { backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderColor: isDark ? '#334155' : '#e5e7eb' },
                ]}
              >
                <Ionicons name={item.icon} size={16} color={item.accent ? '#6366f1' : theme.text} />
                <Text style={[styles.quickActionText, { color: item.accent ? '#6366f1' : theme.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={item.accent ? 'rgba(99,102,241,0.5)' : theme.subText} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
          <View style={[styles.cardHeader, { borderBottomColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.activityIconBox}>
                <Ionicons name="pulse" size={14} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Activity</Text>
            </View>
            <Text style={[styles.cardSub, { color: theme.subText }]}>Today</Text>
          </View>

          <View style={{ padding: 14, gap: 2 }}>
            {bookingsLoading ? (
              <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 16 }} />
            ) : recentActivity.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
                  <Ionicons name="pulse-outline" size={24} color={theme.subText} />
                </View>
                <Text style={[styles.emptySub, { color: theme.subText }]}>No activity recorded yet</Text>
              </View>
            ) : (
              recentActivity.map(b => {
                const si = ACTIVITY_STATUS[b.status] || { dot: '#94a3b8', label: b.status };
                return (
                  <View key={String(b._id)}
                    style={[styles.activityRow, { borderRadius: 10 }]}
                  >
                    {/* Avatar with status dot */}
                    <View style={styles.activityAvatarWrap}>
                      <View style={[styles.activityAvatar, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#e0e7ff' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366f1' }}>
                          {(b.customerName || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.activityDot, { backgroundColor: si.dot, borderColor: theme.card }]} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }} numberOfLines={1}>
                        {b.customerName || '—'}
                        <Text style={{ fontWeight: '400', color: theme.subText }}> · {b.serviceName}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.subText, marginTop: 1 }}>{formatTime(b.appointmentTime)}</Text>
                    </View>

                    {/* Status badge */}
                    <View style={[styles.activityBadge, { backgroundColor: isDark ? `${si.dot}22` : `${si.dot}18` }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: si.dot }}>{si.label}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

      </View>

    </ScrollView>

    {/* ── Action Sheet Modal ── */}
    <Modal visible={!!actionSheet} transparent animationType="slide" onRequestClose={() => setActionSheet(null)}>
      <Pressable style={styles.sheetOverlay} onPress={() => setActionSheet(null)}>
        <Pressable style={[styles.sheetBox, { backgroundColor: theme.card }]} onPress={() => {}}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetAvatar, { backgroundColor: '#e0e7ff' }]}>
              <Text style={[styles.sheetAvatarText, { color: '#6366f1' }]}>{actionSheet?.customerName?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetName, { color: theme.text }]}>{actionSheet?.customerName || '—'}</Text>
              <Text style={[styles.sheetMeta, { color: theme.subText }]}>
                {actionSheet?.serviceName} · {formatTime(actionSheet?.appointmentTime)}
              </Text>
              {actionSheet?.customerPhone
                ? <Text style={[styles.sheetMeta, { color: theme.subText }]}>{actionSheet.customerPhone}</Text>
                : null}
            </View>
          </View>
          <View style={[styles.sheetDivider, { backgroundColor: theme.border }]} />
          {actionSheet?.customerId && !actionSheet?.isWalkIn && (
            <TouchableOpacity style={styles.sheetOption} onPress={() => handleToggleBlock(String(actionSheet.customerId), actionSheet.customerName, blockedIds.has(String(actionSheet.customerId)))}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: blockedIds.has(String(actionSheet?.customerId)) ? '#fef3c7' : '#fee2e2' }]}>
                <Ionicons name={blockedIds.has(String(actionSheet?.customerId)) ? 'shield-checkmark-outline' : 'shield-off-outline'} size={20} color={blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626'} />
              </View>
              <Text style={[styles.sheetOptionText, { color: blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626' }]}>
                {blockedIds.has(String(actionSheet?.customerId)) ? 'Unblock Customer' : 'Block Customer'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.sheetOption} onPress={() => setActionSheet(null)}>
            <View style={[styles.sheetOptionIcon, { backgroundColor: theme.cardAlt }]}>
              <Ionicons name="close-outline" size={20} color={theme.subText} />
            </View>
            <Text style={[styles.sheetOptionText, { color: theme.subText }]}>Dismiss</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* ── Confirm Modal ── */}
    <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
      <View style={styles.confirmOverlay}>
        <View style={[styles.confirmBox, { backgroundColor: theme.card }]}>
          <View style={[styles.confirmIconBox, { backgroundColor: confirm?.danger ? '#fee2e2' : '#e0e7ff' }]}>
            <Ionicons name={confirm?.danger ? 'warning-outline' : 'help-circle-outline'} size={28} color={confirm?.danger ? '#dc2626' : '#6366f1'} />
          </View>
          <Text style={[styles.confirmTitle, { color: theme.text }]}>{confirm?.title}</Text>
          <Text style={[styles.confirmMsg, { color: theme.subText }]}>{confirm?.message}</Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.border }]} onPress={() => setConfirm(null)}>
              <Text style={[styles.confirmBtnText, { color: theme.text }]}>No, Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: confirm?.danger ? '#dc2626' : '#6366f1' }]} onPress={confirm?.onConfirm}>
              <Text style={[styles.confirmBtnText, { color: '#fff' }]}>{confirm?.confirmLabel || 'Yes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <WalkInModal
      visible={showWalkIn}
      onClose={() => setShowWalkIn(false)}
      salonId={salon?._id}
      services={services.filter(s => s.isActive !== false)}
      onSuccess={createWalkIn}
    />

    {/* QR Modal */}
    <Modal visible={showQR} transparent animationType="fade" onRequestClose={() => setShowQR(false)}>
      <Pressable style={qrStyles.overlay} onPress={() => setShowQR(false)}>
        <Pressable style={qrStyles.sheet} onPress={e => e.stopPropagation()}>
          <View style={qrStyles.header}>
            <Text style={qrStyles.title}>Salon Booking QR</Text>
            <TouchableOpacity onPress={() => setShowQR(false)}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={qrStyles.qrBox}>
            <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}` }} style={{ width: 180, height: 180 }} />
          </View>
          <Text style={qrStyles.salonName}>{salon?.name || 'My Salon'}</Text>
          <Text style={qrStyles.hint}>Share this QR so customers can book directly</Text>
          <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
            <TouchableOpacity style={[qrStyles.actionBtn, { backgroundColor: '#6366f1', flex: 1 }]} onPress={() => { setShowQR(false); setCapturing(true); }}>
              <Ionicons name="image-outline" size={15} color="#fff" /><Text style={qrStyles.actionBtnSm}>Save Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[qrStyles.actionBtn, { backgroundColor: '#4f46e5', flex: 1 }]} onPress={() => { setShowQR(false); setCapturingA4(true); }}>
              <Ionicons name="document-outline" size={15} color="#fff" /><Text style={qrStyles.actionBtnSm}>Save A4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[qrStyles.actionBtn, { backgroundColor: '#059669', flex: 1 }]} onPress={() => Share.share({ message: `Book at ${salon?.name || 'My Salon'}: ${qrValue}` })}>
              <Ionicons name="share-outline" size={15} color="#fff" /><Text style={qrStyles.actionBtnSm}>Share</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    {capturing   && <WebView style={styles.hiddenWebview} source={{ html: getCardHtml() }} onMessage={onCardCaptured}   javaScriptEnabled />}
    {capturingA4 && <WebView style={styles.hiddenWebview} source={{ html: getA4Html()   }} onMessage={onA4Captured}    javaScriptEnabled />}

    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const qrStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet:      { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  title:      { fontSize: 16, fontWeight: '700', color: '#111827' },
  qrBox:      { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  salonName:  { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 14 },
  hint:       { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionBtnSm:{ color: '#fff', fontWeight: '700', fontSize: 11 },
});

const styles = StyleSheet.create({
  screen:       { flex: 1 },
  hiddenWebview:{ position: 'absolute', width: 1, height: 1, opacity: 0, top: -1000 },

  // Intelligence strip
  intelRow:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
  intelCard:  { flex: 1, borderRadius: 12, padding: 12 },
  intelLbl:   { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  intelVal:   { fontSize: 18, fontWeight: '800', marginTop: 3 },
  intelDelta: { fontSize: 10, color: '#9ca3af', marginTop: 3 },
  intelStreak:{ flexDirection: 'row', gap: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingVertical: 10, marginBottom: 4 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle:  { flex: 1, fontSize: 20, fontWeight: '800', marginLeft: 10 },
  iconBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatar:       { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: '#e5e7eb' },
  avatarFallback:{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  notifBadge:   { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '700' },

  // Hero Banner
  heroBanner:   { marginHorizontal: 12, marginTop: 14, borderRadius: 20, padding: 20, overflow: 'hidden', backgroundColor: '#6366f1', shadowColor: '#6366f1', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  heroGradOverlay:{ position: 'absolute', top: 0, right: 0, bottom: 0, left: '40%', backgroundColor: '#7c3aed', opacity: 0.45, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  heroBlob1:    { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' },
  heroBlob2:    { position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  liveDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
  liveLabel:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2 },
  heroGreeting: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 32 },
  heroSub:      { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 5, fontWeight: '500' },
  heroRefreshBtn:{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroAddBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10 },
  heroAddText:  { fontSize: 14, fontWeight: '800', color: '#4f46e5' },

  // Stats grid
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 14, gap: 10 },

  // Section cards
  sectionCard:  { borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  cardTitle:    { fontSize: 13, fontWeight: '700' },
  cardSub:      { fontSize: 11, marginTop: 1 },

  // Queue card icon box
  queueIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  queueCountBadge:{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },

  // Queue items
  queueItem:    { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 2 },
  queueAccentBar:{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, backgroundColor: '#6366f1', borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  queueBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  queueBadgeText:{ fontSize: 10, fontWeight: '700' },
  customerAvatar:{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  customerAvatarText:{ fontSize: 16, fontWeight: '800' },
  customerName: { fontSize: 14, fontWeight: '700' },
  customerPhone:{ fontSize: 11 },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  statusText:   { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  detailsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  detailItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText:   { fontSize: 11 },
  actionsRow:   { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8 },
  actionBtnText:{ fontSize: 12, fontWeight: '600', color: '#fff' },

  // Charts
  chartIcon:    { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chartSkeleton:{ height: 50, borderRadius: 8 },

  // Quick Actions
  zapIconBox:   { width: 28, height: 28, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  quickActionBtn:{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  quickActionText:{ fontSize: 13, fontWeight: '600', flex: 1 },

  // Recent Activity
  activityIconBox:{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  activityRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6 },
  activityAvatarWrap:{ position: 'relative' },
  activityAvatar:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activityDot:  { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  activityBadge:{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },

  // Empty states
  emptyIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 14, fontWeight: '700' },
  emptySub:     { fontSize: 12, textAlign: 'center' },

  // Action Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetBox:     { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetAvatar:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText:{ fontSize: 20, fontWeight: '800' },
  sheetName:    { fontSize: 16, fontWeight: '700' },
  sheetMeta:    { fontSize: 12, marginTop: 2 },
  sheetDivider: { height: 1, marginBottom: 12 },
  sheetOption:  { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  sheetOptionIcon:{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetOptionText:{ fontSize: 15, fontWeight: '600' },

  // Confirm
  confirmOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  confirmBox:   { marginHorizontal: 32, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  confirmIconBox:{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  confirmMsg:   { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmBtns:  { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn:   { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText:{ fontSize: 14, fontWeight: '700' },
});

/* ── WalkIn Modal ────────────────────────────────────────────── */
function WalkInModal({ visible, onClose, salonId, services, onSuccess }) {
  const [name,         setName]         = useState('');
  const [phone,        setPhone]        = useState('');
  const [serviceId,    setServiceId]    = useState('');
  const [date,         setDate]         = useState(today);
  const [slot,         setSlot]         = useState('');
  const [slots,        setSlots]        = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedDay,    setClosedDay]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [showServices, setShowServices] = useState(false);

  const selectedService = services.find(s => s._id === serviceId);
  const timeToMinutes   = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const isPastSlot      = s => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  useEffect(() => {
    if (!selectedService || !date || !salonId) return;
    setSlot(''); setSlots([]); setBlockedSlots([]); setClosedDay(false); setSlotsLoading(true);
    api.get(`/public/salons/${salonId}/booked-slots?date=${date}&duration=${selectedService.duration}`)
      .then(res => {
        const d = res.data.data;
        setSlots(d?.slots || []); setBlockedSlots(d?.blockedSlots || []); setClosedDay(d?.closedDay || false);
      })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [serviceId, date, salonId]);

  const reset = () => { setName(''); setPhone(''); setServiceId(''); setDate(today); setSlot(''); setSlots([]); setError(''); };

  const handleSubmit = async () => {
    if (!name.trim())  { setError('Customer name is required'); return; }
    if (!phone.trim()) { setError('Customer phone is required'); return; }
    if (!serviceId)    { setError('Please select a service');    return; }
    if (!slot)         { setError('Please select a time slot');  return; }
    setError(''); setSubmitting(true);
    try {
      await onSuccess({ customerName: name.trim(), customerPhone: phone.trim(), serviceId, appointmentDate: date, appointmentTime: slot });
      reset(); onClose();
    } catch (err) { setError(err.message || 'Failed to create booking'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { reset(); onClose(); }}>
      <View style={mStyles.container}>
        <View style={mStyles.header}>
          <Text style={mStyles.title}>Add Walk-in Customer</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={mStyles.body} keyboardShouldPersistTaps="handled">
          {!!error && <View style={mStyles.errorBox}><Text style={mStyles.errorText}>{error}</Text></View>}

          {[
            { label: 'Customer Name', value: name,  setter: setName,  placeholder: 'Enter name',   keyboard: 'default'   },
            { label: 'Mobile Number', value: phone, setter: setPhone, placeholder: '9876543210',   keyboard: 'phone-pad' },
          ].map(f => (
            <View style={mStyles.field} key={f.label}>
              <Text style={mStyles.label}>{f.label}</Text>
              <TextInput style={mStyles.input} placeholder={f.placeholder} placeholderTextColor="#9ca3af" keyboardType={f.keyboard} value={f.value} onChangeText={f.setter} />
            </View>
          ))}

          <View style={mStyles.field}>
            <Text style={mStyles.label}>Service</Text>
            <TouchableOpacity style={mStyles.select} onPress={() => setShowServices(!showServices)}>
              <Text style={[mStyles.selectText, !serviceId && { color: '#9ca3af' }]}>
                {selectedService ? `${selectedService.name} — ${selectedService.duration}min — ₹${selectedService.basePrice}` : 'Select a service…'}
              </Text>
              <Ionicons name={showServices ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
            </TouchableOpacity>
            {showServices && (
              <View style={mStyles.dropdown}>
                {services.map(s => (
                  <TouchableOpacity key={s._id} style={mStyles.dropdownItem} onPress={() => { setServiceId(s._id); setShowServices(false); }}>
                    <Text style={mStyles.dropdownText}>{s.name} — {s.duration}min — ₹{s.basePrice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={mStyles.field}>
            <Text style={mStyles.label}>Date</Text>
            <View style={mStyles.dateNav}>
              {[0,1,2,3,4,5,6].map(d => {
                const dt  = localDate(d);
                if (dt > maxDate) return null;
                const lbl = d === 0 ? 'Today' : d === 1 ? 'Tmrw' : new Date(dt+'T12:00:00').toLocaleDateString('en-IN',{weekday:'short'});
                return (
                  <TouchableOpacity key={d} style={[mStyles.dateChip, date===dt && mStyles.dateChipActive]} onPress={() => setDate(dt)}>
                    <Text style={[mStyles.dateChipText, date===dt && mStyles.dateChipActiveText]}>{lbl}</Text>
                    <Text style={[mStyles.dateChipNum,  date===dt && mStyles.dateChipActiveText]}>{new Date(dt+'T12:00:00').getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {serviceId && (
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Time Slot {selectedService && <Text style={{ color:'#9ca3af', fontWeight:'400' }}>({selectedService.duration} min)</Text>}</Text>
              {slotsLoading ? (
                <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 8 }} />
              ) : closedDay ? (
                <Text style={{ color:'#d97706', fontSize:13 }}>Salon is closed on this day.</Text>
              ) : slots.length === 0 ? (
                <Text style={{ color:'#9ca3af', fontSize:13 }}>No slots available for this date.</Text>
              ) : (
                <View style={mStyles.slotsGrid}>
                  {slots.map(s => {
                    const past    = isPastSlot(s);
                    const blocked = !past && blockedSlots.includes(s);
                    const sel     = slot === s;
                    const [h,m]   = s.split(':').map(Number);
                    const endMin  = h*60+m+(selectedService?.duration||30);
                    const endTime = `${String(Math.floor(endMin/60)).padStart(2,'0')}:${String(endMin%60).padStart(2,'0')}`;
                    return (
                      <TouchableOpacity key={s}
                        style={[mStyles.slot, past?mStyles.slotPast:blocked?mStyles.slotBlocked:sel?mStyles.slotSelected:mStyles.slotFree]}
                        onPress={() => { if (!past && !blocked) setSlot(s); }}
                        disabled={past || blocked}
                      >
                        <Text style={[mStyles.slotText, sel&&{color:'#fff'}, (past||blocked)&&{color:'#9ca3af'}]}>{s}</Text>
                        <Text style={[mStyles.slotEnd, sel&&{color:'#c7d2fe'}, (past||blocked)&&{color:'#c4c9d2'}]}>–{endTime}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {slot && selectedService && (
            <View style={mStyles.summary}>
              <Text style={mStyles.summaryTitle}>Booking Summary</Text>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Customer</Text><Text style={mStyles.summaryVal}>{name||'—'}</Text></View>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Service</Text><Text style={mStyles.summaryVal}>{selectedService.name}</Text></View>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Slot</Text><Text style={mStyles.summaryVal}>{slot}</Text></View>
              <View style={[mStyles.summaryRow,{borderTopWidth:1,borderTopColor:'#c7d2fe',paddingTop:8,marginTop:4}]}>
                <Text style={[mStyles.summaryKey,{fontWeight:'700'}]}>Total</Text>
                <Text style={[mStyles.summaryVal,{fontWeight:'800',color:'#4338ca'}]}>₹{selectedService.basePrice}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={[mStyles.submitBtn,(submitting||!slot)&&{opacity:0.5}]} onPress={handleSubmit} disabled={submitting||!slot}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.submitText}>Confirm Walk-in Booking</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#fff' },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title:           { fontSize: 18, fontWeight: '700', color: '#111827' },
  body:            { flex: 1, padding: 16 },
  errorBox:        { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText:       { color: '#dc2626', fontSize: 13 },
  field:           { marginBottom: 16 },
  label:           { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:           { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#111827' },
  select:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  selectText:      { fontSize: 14, color: '#111827', flex: 1, marginRight: 8 },
  dropdown:        { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownItem:    { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownText:    { fontSize: 14, color: '#374151' },
  dateNav:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dateChip:        { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  dateChipActive:  { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dateChipText:    { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  dateChipNum:     { fontSize: 14, color: '#374151', fontWeight: '700', marginTop: 2 },
  dateChipActiveText:{ color: '#fff' },
  slotsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot:            { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  slotFree:        { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  slotSelected:    { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  slotBlocked:     { borderColor: '#fca5a5', backgroundColor: '#fee2e2' },
  slotPast:        { borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' },
  slotText:        { fontSize: 12, fontWeight: '600', color: '#374151' },
  slotEnd:         { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  summary:         { backgroundColor: '#e0e7ff', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryTitle:    { fontSize: 14, fontWeight: '700', color: '#4338ca', marginBottom: 8 },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryKey:      { fontSize: 13, color: '#6366f1' },
  summaryVal:      { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  submitBtn:       { backgroundColor: '#6366f1', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  submitText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});
