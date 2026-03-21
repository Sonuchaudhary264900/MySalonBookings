import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Pressable, TextInput, Image, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useSalon } from '../../context/SalonContext';
import { useNotifications } from '../../context/NotificationContext';
import DrawerMenuButton from '../../components/DrawerMenuButton';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

const today = localDate(0);
const maxDate = localDate(30);

const nowTimeStr = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

// Queue position labels
const queueLabel = (i) => {
  if (i === 0) return { label: 'Next Up', color: '#2563eb', bg: '#dbeafe' };
  if (i === 1) return { label: '2nd', color: '#7c3aed', bg: '#ede9fe' };
  if (i === 2) return { label: '3rd', color: '#0d9488', bg: '#ccfbf1' };
  return { label: `${i + 1}th`, color: '#6b7280', bg: '#f3f4f6' };
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { salon } = useSalon();
  const { unreadCount } = useNotifications();
  const navigation = useNavigation();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [queueDate, setQueueDate] = useState(today);
  const [queueLoading, setQueueLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blocking, setBlocking] = useState(null);
  const [actionSheet, setActionSheet] = useState(null); // booking obj or null
  const [confirm, setConfirm] = useState(null);         // { title, message, onConfirm }
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [services, setServices] = useState([]);
  const queueRef = useRef([]);
  queueRef.current = queue;

  const fetchStats = async () => {
    try {
      const res = await api.get('/owner/analytics/dashboard');
      setStats(res.data.data);
    } catch { /* silent */ } finally {
      setStatsLoading(false);
    }
  };

  const fetchQueue = async () => {
    setQueueLoading(true);
    try {
      const todayStr = localDate(0);
      const tomorrowStr = localDate(1);
      let res = await api.get(`/owner/bookings?date=${todayStr}`);
      let data = res.data.data;
      let all = Array.isArray(data) ? data : (data?.bookings || []);

      const upcoming = all
        .filter((b) => b.status === 'pending' || b.status === 'confirmed')
        .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));

      if (upcoming.length > 0) {
        setQueueDate(todayStr);
        setQueue(upcoming);
      } else {
        res = await api.get(`/owner/bookings?date=${tomorrowStr}`);
        data = res.data.data;
        all = Array.isArray(data) ? data : (data?.bookings || []);
        const tomorrowUpcoming = all
          .filter((b) => b.status === 'pending' || b.status === 'confirmed')
          .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''));
        setQueueDate(tomorrowStr);
        setQueue(tomorrowUpcoming);
      }
    } catch { setQueue([]); } finally {
      setQueueLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get('/owner/services');
      const d = res.data.data;
      setServices(Array.isArray(d) ? d : (d?.services || []));
    } catch { /* silent */ }
  };

  const fetchBlockedIds = async () => {
    try {
      const res = await api.get('/owner/blocked-customers');
      const ids = new Set(
        (res.data.data?.blockedCustomers || [])
          .map((bc) => String(bc.customerId?._id || bc.customerId))
          .filter(Boolean)
      );
      setBlockedIds(ids);
    } catch { /* silent */ }
  };

  const handleToggleBlock = async (customerId, customerName, isBlocked) => {
    setActionSheet(null);
    setConfirm({
      title: isBlocked ? `Unblock ${customerName}?` : `Block ${customerName}?`,
      message: isBlocked
        ? `${customerName} will be able to book appointments again.`
        : `${customerName} will no longer be able to book appointments at your salon.`,
      danger: !isBlocked,
      confirmLabel: isBlocked ? 'Yes, Unblock' : 'Yes, Block',
      onConfirm: async () => {
        setConfirm(null);
        setBlocking(customerId);
        try {
          if (isBlocked) {
            await api.delete(`/owner/customers/${customerId}/block`);
            setBlockedIds((prev) => { const n = new Set(prev); n.delete(String(customerId)); return n; });
          } else {
            await api.post(`/owner/customers/${customerId}/block`, { reason: 'Blocked by owner' });
            setBlockedIds((prev) => new Set([...prev, String(customerId)]));
          }
        } catch (err) {
          showError('Error', err.message || 'Something went wrong');
        } finally {
          setBlocking(null);
        }
      },
    });
  };

  // Show confirmation before sensitive status changes
  const confirmStatusChange = (booking, newStatus) => {
    setActionSheet(null);
    const labels = { confirmed: 'Confirm', in_progress: 'Start', cancelled: 'Cancel' };
    const messages = {
      confirmed: `Confirm booking for ${booking.customerName || 'this customer'}?`,
      in_progress: `Start the service for ${booking.customerName || 'this customer'} now?`,
      cancelled: `Cancel ${booking.customerName || 'this customer'}'s booking? This cannot be undone.`,
    };
    setConfirm({
      title: `${labels[newStatus] || newStatus} Booking`,
      message: messages[newStatus] || `Change status to ${newStatus}?`,
      danger: newStatus === 'cancelled',
      confirmLabel: labels[newStatus] || 'Confirm',
      onConfirm: () => { setConfirm(null); handleStatusChange(booking._id, newStatus); },
    });
  };

  // Manual status change (Confirm / Start buttons)
  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status: newStatus });
      setQueue((prev) =>
        newStatus === 'in_progress'
          ? prev.filter((b) => b._id !== bookingId)          // remove from queue when started
          : prev.map((b) => b._id === bookingId ? { ...b, status: newStatus } : b)
      );
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    } finally {
      setUpdating(null);
    }
  };

  // Auto-start: check every 30s if any confirmed booking's time has arrived
  useEffect(() => {
    const checkAutoStart = async () => {
      const now = nowTimeStr();
      const toStart = queueRef.current.filter(
        (b) => b.status === 'confirmed' && b.appointmentTime && b.appointmentTime <= now
      );
      for (const b of toStart) {
        try {
          await api.put(`/owner/bookings/${b._id}`, { status: 'in_progress' });
          setQueue((prev) => prev.filter((q) => q._id !== b._id));
        } catch { /* silent */ }
      }
    };
    checkAutoStart();
    const interval = setInterval(checkAutoStart, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchQueue()]);
    setRefreshing(false);
  };

  const createWalkIn = async (data) => {
    await api.post('/owner/bookings/walk-in', data);
    showSuccess('Booked', 'Walk-in booking created!');
    await fetchQueue();
  };

  useEffect(() => { fetchStats(); fetchBlockedIds(); fetchServices(); }, []);
  useFocusEffect(useCallback(() => { fetchQueue(); }, []));

  const statCards = [
    { title: 'Total Revenue', value: `₹${stats?.totalRevenue || 0}`, icon: 'cash-outline', color: '#10b981' },
    { title: 'Total Bookings', value: stats?.totalBookings || 0, icon: 'calendar-outline', color: '#3b82f6' },
    { title: 'Customers', value: stats?.activeCustomers || 0, icon: 'people-outline', color: '#8b5cf6' },
    { title: 'Growth Rate', value: `${stats?.growthRate || 0}%`, icon: 'trending-up-outline', color: '#f59e0b' },
  ];

  const isToday = queueDate === today;
  const dateLabel = isToday ? 'Today' : formatDate(queueDate + 'T12:00:00');


  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome */}
      <View style={[styles.welcomeBox, { paddingTop: 16 + insets.top }]}>
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.headerLogoBox}>
              <Image source={require('../../../assets/icon1.png')} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.welcomeTitle}>{salon?.name || 'My Salon'}</Text>
              <Text style={styles.welcomeSubtitle}>Owner Dashboard</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* QR Code button */}
            <TouchableOpacity
              onPress={() => setShowQR(true)}
              style={{ padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={{ padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <DrawerMenuButton />
          </View>
        </View>
      </View>

      {/* Stats */}
      {statsLoading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                <Ionicons name={s.icon} size={22} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{s.value}</Text>
              <Text style={[styles.statTitle, { color: theme.subText }]}>{s.title}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Queue */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 32 }}>
        {/* Section header */}
        <View style={styles.queueHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.queueIconBox}>
              <Ionicons name="list-outline" size={18} color="#2563eb" />
            </View>
            <View>
              <Text style={[styles.queueTitle, { color: theme.text }]}>Upcoming Bookings</Text>
              <Text style={[styles.queueSub, { color: theme.subText }]}>
                {dateLabel} · {queue.length} booking{queue.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Date pill */}
            <View style={[styles.datePill, { backgroundColor: isToday ? '#dbeafe' : '#fef3c7' }]}>
              <Ionicons name="calendar-outline" size={12} color={isToday ? '#2563eb' : '#d97706'} />
              <Text style={[styles.datePillText, { color: isToday ? '#2563eb' : '#d97706' }]}>{dateLabel}</Text>
            </View>
            {/* Walk-in button */}
            <TouchableOpacity style={styles.walkInBtn} onPress={() => setShowWalkIn(true)}>
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={styles.walkInBtnText}>Walk-in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {queueLoading ? (
          <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />
        ) : queue.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
            <Ionicons name="checkmark-circle-outline" size={44} color="#10b981" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>All clear!</Text>
            <Text style={[styles.emptyText, { color: theme.subText }]}>No upcoming bookings for today or tomorrow</Text>
          </View>
        ) : (
          queue.map((b, i) => {
            const q = queueLabel(i);
            const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
            return (
              <View key={b._id ? String(b._id) : String(i)} style={{ marginBottom: 4 }}>
                <View style={[styles.queueCard, { backgroundColor: theme.card }, i === 0 && styles.queueCardFirst]}>
                {/* Top row: badge + gear */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={[styles.queueBadge, { backgroundColor: q.bg, marginBottom: 0 }]}>
                    <Text style={[styles.queueBadgeText, { color: q.color }]}>{q.label}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.gearBtn}
                    onPress={() => setActionSheet(b)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.subText} />
                  </TouchableOpacity>
                </View>

                <View style={styles.queueCardInner}>
                  {/* Avatar + name */}
                  <View style={styles.queueTop}>
                    <View style={[styles.avatar, { backgroundColor: q.bg }]}>
                      <Text style={[styles.avatarText, { color: q.color }]}>
                        {b.customerName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.customerName, { color: theme.text }]}>{b.customerName || '—'}</Text>
                      {b.customerPhone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="call-outline" size={11} color={theme.subText} />
                          <Text style={[styles.customerPhone, { color: theme.subText }]}>{b.customerPhone}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.statusText, { color: colors.text }]}>{b.status?.replace('_', ' ')}</Text>
                    </View>
                  </View>

                  {/* Details row */}
                  <View style={[styles.detailsRow, { borderTopColor: theme.rowBorder }]}>
                    <View style={styles.detailItem}>
                      <Ionicons name="cut-outline" size={13} color={theme.subText} />
                      <Text style={[styles.detailText, { color: theme.subText }]} numberOfLines={1}>{b.serviceName || '—'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={13} color={theme.subText} />
                      <Text style={[styles.detailText, { color: theme.subText }]}>{formatTime(b.appointmentTime)}</Text>
                    </View>
                    {b.totalAmount ? (
                      <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={13} color="#10b981" />
                        <Text style={[styles.detailText, { color: '#10b981', fontWeight: '600' }]}>₹{b.totalAmount}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Action buttons */}
                  {updating === b._id || blocking === String(b.customerId) ? (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 10 }} />
                  ) : (
                    <View style={[styles.actionsRow, { borderTopColor: theme.rowBorder }]}>
                      {b.status === 'pending' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
                          onPress={() => confirmStatusChange(b, 'confirmed')}
                        >
                          <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                          <Text style={styles.actionBtnText}>Confirm</Text>
                        </TouchableOpacity>
                      )}
                      {b.status === 'confirmed' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                          onPress={() => confirmStatusChange(b, 'in_progress')}
                        >
                          <Ionicons name="play-circle-outline" size={15} color="#fff" />
                          <Text style={styles.actionBtnText}>Start Now</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ef4444' }]}
                        onPress={() => confirmStatusChange(b, 'cancelled')}
                      >
                        <Ionicons name="close-circle-outline" size={15} color="#ef4444" />
                        <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                </View>
                {i < queue.length - 1 && (
                  <View style={[styles.connector, { backgroundColor: theme.rowBorder }]} />
                )}
              </View>
            );
          })
        )}
      </View>

    </ScrollView>


    {/* ── Action Sheet Modal ── */}
    <Modal visible={!!actionSheet} transparent animationType="slide" onRequestClose={() => setActionSheet(null)}>
      <Pressable style={styles.modalOverlay} onPress={() => setActionSheet(null)}>
        <Pressable style={[styles.actionSheetBox, { backgroundColor: theme.card }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

          {/* Customer info header */}
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetAvatar, { backgroundColor: '#dbeafe' }]}>
              <Text style={[styles.sheetAvatarText, { color: '#2563eb' }]}>
                {actionSheet?.customerName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetName, { color: theme.text }]}>{actionSheet?.customerName || '—'}</Text>
              <Text style={[styles.sheetMeta, { color: theme.subText }]}>
                {actionSheet?.serviceName}  ·  {formatTime(actionSheet?.appointmentTime)}
              </Text>
              {actionSheet?.customerPhone ? (
                <Text style={[styles.sheetMeta, { color: theme.subText }]}>{actionSheet.customerPhone}</Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.sheetDivider, { backgroundColor: theme.rowBorder }]} />

          {/* Options */}
          {actionSheet?.customerId && !actionSheet?.isWalkIn && (
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => handleToggleBlock(
                String(actionSheet.customerId),
                actionSheet.customerName,
                blockedIds.has(String(actionSheet.customerId))
              )}
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: blockedIds.has(String(actionSheet?.customerId)) ? '#fef3c7' : '#fee2e2' }]}>
                <Ionicons
                  name={blockedIds.has(String(actionSheet?.customerId)) ? 'shield-checkmark-outline' : 'shield-off-outline'}
                  size={20}
                  color={blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626'}
                />
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
          <View style={[styles.confirmIconBox, { backgroundColor: confirm?.danger ? '#fee2e2' : '#dbeafe' }]}>
            <Ionicons
              name={confirm?.danger ? 'warning-outline' : 'help-circle-outline'}
              size={28}
              color={confirm?.danger ? '#dc2626' : '#2563eb'}
            />
          </View>
          <Text style={[styles.confirmTitle, { color: theme.text }]}>{confirm?.title}</Text>
          <Text style={[styles.confirmMessage, { color: theme.subText }]}>{confirm?.message}</Text>
          <View style={styles.confirmBtns}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.cardAlt, borderWidth: 1, borderColor: theme.border }]}
              onPress={() => setConfirm(null)}
            >
              <Text style={[styles.confirmBtnText, { color: theme.text }]}>No, Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: confirm?.danger ? '#dc2626' : '#2563eb' }]}
              onPress={confirm?.onConfirm}
            >
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
      services={services.filter((s) => s.isActive !== false)}
      onSuccess={createWalkIn}
    />

    {/* QR Code Modal */}
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
            <QRCode
              value={salon?._id ? `https://mysalonbookings.com/salon/${salon._id}` : 'https://mysalonbookings.com'}
              size={180}
              color="#111827"
              backgroundColor="#ffffff"
            />
          </View>
          <Text style={qrStyles.salonName}>{salon?.name || 'My Salon'}</Text>
          <Text style={qrStyles.hint}>Share this QR so customers can book directly</Text>
          <TouchableOpacity
            style={qrStyles.shareBtn}
            onPress={() => Share.share({ message: `Book at ${salon?.name || 'My Salon'}: https://mysalonbookings.com/salon/${salon?._id}` })}
          >
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={qrStyles.shareBtnText}>Share Link</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    </View>
  );
}

const qrStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet:      { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  title:      { fontSize: 16, fontWeight: '700', color: '#111827' },
  qrBox:      { padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  salonName:  { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 14 },
  hint:       { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  shareBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1 }, // kept for ref
  welcomeBox: { backgroundColor: '#2563eb', padding: 20, paddingTop: 16, paddingBottom: 24, overflow: 'hidden' },
  decorCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  decorCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -60, left: -30 },
  notifBadge: { position: 'absolute', top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  headerLogoBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e3a8a', shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  headerLogo: { width: 40, height: 40 },
  welcomeTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  welcomeSubtitle: { fontSize: 12, color: '#bfdbfe', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  statCard: { flex: 1, minWidth: '44%', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statTitle: { fontSize: 12, marginTop: 4 },
  // Queue section
  queueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  queueIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  queueTitle: { fontSize: 16, fontWeight: '700' },
  queueSub: { fontSize: 12, marginTop: 1 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  datePillText: { fontSize: 12, fontWeight: '600' },
  walkInBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#2563eb' },
  walkInBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  // Queue cards
  queueCard: { borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  connector: { width: 2, height: 10, alignSelf: 'center', marginVertical: 2 },
  queueCardFirst: { borderWidth: 1.5, borderColor: '#2563eb' },
  gearBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  queueBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 10 },
  queueBadgeText: { fontSize: 11, fontWeight: '700' },
  queueCardInner: {},
  queueTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  customerName: { fontSize: 15, fontWeight: '700' },
  customerPhone: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  // Bottom nav
  screen: { flex: 1 },
  // Action sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  actionSheetBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { fontSize: 20, fontWeight: '800' },
  sheetName: { fontSize: 16, fontWeight: '700' },
  sheetMeta: { fontSize: 12, marginTop: 2 },
  sheetDivider: { height: 1, marginBottom: 12 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  sheetOptionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetOptionText: { fontSize: 15, fontWeight: '600' },
  // Confirm modal
  confirmBox: { marginHorizontal: 32, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  confirmIconBox: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  confirmMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },
  // Empty state
  emptyCard: { borderRadius: 14, padding: 32, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});

// ── WalkIn Modal ─────────────────────────────────────────────────
function WalkInModal({ visible, onClose, salonId, services, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedDay, setClosedDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showServices, setShowServices] = useState(false);

  const selectedService = services.find((s) => s._id === serviceId);

  const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const isPastSlot = (s) => {
    if (date !== today) return false;
    const now = new Date();
    return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
  };

  useEffect(() => {
    if (!selectedService || !date || !salonId) return;
    setSlot(''); setSlots([]); setBlockedSlots([]); setClosedDay(false);
    setSlotsLoading(true);
    api.get(`/public/salons/${salonId}/booked-slots?date=${date}&duration=${selectedService.duration}`)
      .then((res) => {
        const d = res.data.data;
        setSlots(d?.slots || []);
        setBlockedSlots(d?.blockedSlots || []);
        setClosedDay(d?.closedDay || false);
      })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [serviceId, date, salonId]);

  const reset = () => {
    setName(''); setPhone(''); setServiceId(''); setDate(today);
    setSlot(''); setSlots([]); setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Customer name is required'); return; }
    if (!phone.trim()) { setError('Customer phone is required'); return; }
    if (!serviceId) { setError('Please select a service'); return; }
    if (!slot) { setError('Please select a time slot'); return; }
    setError(''); setSubmitting(true);
    try {
      await onSuccess({ customerName: name.trim(), customerPhone: phone.trim(), serviceId, appointmentDate: date, appointmentTime: slot });
      reset(); onClose();
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
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
            { label: 'Customer Name', value: name, setter: setName, placeholder: 'Enter name', keyboard: 'default' },
            { label: 'Mobile Number', value: phone, setter: setPhone, placeholder: '9876543210', keyboard: 'phone-pad' },
          ].map((f) => (
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
                {services.map((s) => (
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
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const dt = localDate(d);
                if (dt > maxDate) return null;
                const dayLabel = d === 0 ? 'Today' : d === 1 ? 'Tmrw' : new Date(dt + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <TouchableOpacity key={d} style={[mStyles.dateChip, date === dt && mStyles.dateChipActive]} onPress={() => setDate(dt)}>
                    <Text style={[mStyles.dateChipText, date === dt && mStyles.dateChipActiveText]}>{dayLabel}</Text>
                    <Text style={[mStyles.dateChipNum, date === dt && mStyles.dateChipActiveText]}>{new Date(dt + 'T12:00:00').getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {serviceId && (
            <View style={mStyles.field}>
              <Text style={mStyles.label}>Time Slot {selectedService && <Text style={{ color: '#9ca3af', fontWeight: '400' }}>({selectedService.duration} min)</Text>}</Text>
              {slotsLoading ? (
                <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 8 }} />
              ) : closedDay ? (
                <Text style={{ color: '#d97706', fontSize: 13 }}>Salon is closed on this day.</Text>
              ) : slots.length === 0 ? (
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>No slots available for this date.</Text>
              ) : (
                <View style={mStyles.slotsGrid}>
                  {slots.map((s) => {
                    const past = isPastSlot(s);
                    const blocked = !past && blockedSlots.includes(s);
                    const selected = slot === s;
                    const [h, m] = s.split(':').map(Number);
                    const endMin = h * 60 + m + (selectedService?.duration || 30);
                    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[mStyles.slot, past ? mStyles.slotPast : blocked ? mStyles.slotBlocked : selected ? mStyles.slotSelected : mStyles.slotFree]}
                        onPress={() => { if (!past && !blocked) setSlot(s); }}
                        disabled={past || blocked}
                      >
                        <Text style={[mStyles.slotText, selected && { color: '#fff' }, (past || blocked) && { color: '#9ca3af' }]}>{s}</Text>
                        <Text style={[mStyles.slotEnd, selected && { color: '#bfdbfe' }, (past || blocked) && { color: '#c4c9d2' }]}>–{endTime}</Text>
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
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Customer</Text><Text style={mStyles.summaryVal}>{name || '—'}</Text></View>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Service</Text><Text style={mStyles.summaryVal}>{selectedService.name}</Text></View>
              <View style={mStyles.summaryRow}><Text style={mStyles.summaryKey}>Slot</Text><Text style={mStyles.summaryVal}>{slot}</Text></View>
              <View style={[mStyles.summaryRow, { borderTopWidth: 1, borderTopColor: '#bfdbfe', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[mStyles.summaryKey, { fontWeight: '700' }]}>Total</Text>
                <Text style={[mStyles.summaryVal, { fontWeight: '800', color: '#1e40af' }]}>₹{selectedService.basePrice}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={[mStyles.submitBtn, (submitting || !slot) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={submitting || !slot}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.submitText}>Confirm Walk-in Booking</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  body: { flex: 1, padding: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: '#111827' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  selectText: { fontSize: 14, color: '#111827', flex: 1, marginRight: 8 },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownText: { fontSize: 14, color: '#374151' },
  dateNav: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dateChip: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  dateChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dateChipText: { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  dateChipNum: { fontSize: 14, color: '#374151', fontWeight: '700', marginTop: 2 },
  dateChipActiveText: { color: '#fff' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  slotFree: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  slotSelected: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  slotBlocked: { borderColor: '#fca5a5', backgroundColor: '#fee2e2' },
  slotPast: { borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' },
  slotText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  slotEnd: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  summary: { backgroundColor: '#dbeafe', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryKey: { fontSize: 13, color: '#2563eb' },
  summaryVal: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  submitBtn: { backgroundColor: '#2563eb', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
