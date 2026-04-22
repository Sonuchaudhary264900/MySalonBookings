import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, FlatList, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { showSuccess, showError } from '../../utils/toast';
import { useSalon } from '../../context/SalonContext';
import { localDate, formatDate, formatTime, STATUS_COLORS } from '../../utils/helpers';

const today = localDate(0);
const maxDate = localDate(30);
const PAGE_SIZE = 10;

const getPaymentState = (b) => {
  if (b.refundStatus === 'full')    return { label: 'Refunded',       icon: 'refresh-outline',      color: '#0ea5e9', bg: '#e0f2fe' };
  if (b.paymentStatus === 'failed') return { label: 'Pay Failed',     icon: 'close-circle-outline', color: '#ef4444', bg: '#fee2e2' };
  if (b.refundStatus === 'partial') return { label: 'Part Refund',    icon: 'refresh-outline',      color: '#06b6d4', bg: '#cffafe' };
  if (b.paymentMethod === 'cash' && b.cashCollected)  return { label: 'Cash Collected', icon: 'cash-outline',         color: '#10b981', bg: '#d1fae5' };
  if (b.paymentMethod === 'cash' && !b.cashCollected) return { label: 'Cash Due',       icon: 'cash-outline',         color: '#f59e0b', bg: '#fef3c7' };
  if (b.paymentStatus === 'completed') return { label: 'Paid Online', icon: 'card-outline',         color: '#10b981', bg: '#d1fae5' };
  return { label: 'Unpaid', icon: 'card-outline', color: '#ef4444', bg: '#fee2e2' };
};

const PaymentBadgeRN = ({ booking }) => {
  if (!booking.totalAmount) return null;
  const { label, icon, color, bg } = getPaymentState(booking);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
      alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3,
      borderRadius: 20, backgroundColor: bg }}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
};
const SOCKET_URL_RN = 'https://mysalonbookings.onrender.com';
const CHAT_OPEN_STATUSES = ['pending', 'confirmed', 'in_progress'];
const UPCOMING_STATUSES = ['pending', 'confirmed', 'in_progress'];
const UPCOMING_FILTERS  = ['all', 'pending', 'confirmed', 'in_progress'];
const ALL_STATUS_FILTERS = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

// ── Chat Modal ───────────────────────────────────────────────────
function ChatModal({ booking, onClose }) {
  const { theme } = useTheme();
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const socketRef   = useRef(null);
  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const isChatOpen  = CHAT_OPEN_STATUSES.includes(booking.status);

  useEffect(() => {
    api.get(`/owner/bookings/${booking._id}/messages`)
      .then(res => {
        const msgs = res.data.data?.messages || [];
        const now = new Date().toISOString();
        setMessages(msgs.map(m => m.senderRole === 'customer' && !m.readAt ? { ...m, readAt: now } : m));
        api.put(`/owner/bookings/${booking._id}/messages/read`).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL_RN, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-chat', { bookingId: booking._id }));
    socket.on('chat-message', ({ bookingId, message }) => {
      if (bookingId === booking._id) {
        const msg = message.senderRole === 'customer' ? { ...message, readAt: new Date().toISOString() } : message;
        setMessages(prev => [...prev, msg]);
        if (message.senderRole === 'customer') {
          api.put(`/owner/bookings/${bookingId}/messages/read`).catch(() => {});
        }
      }
    });
    socket.on('chat-typing', ({ senderRole }) => {
      if (senderRole === 'customer') {
        setPeerTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    });
    return () => {
      clearTimeout(typingTimer.current);
      socket.emit('leave-chat', { bookingId: booking._id });
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0 || peerTyping) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, peerTyping]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending || !isChatOpen) return;
    setText('');
    setSending(true);
    try {
      await api.post(`/owner/bookings/${booking._id}/messages`, { text: t });
    } catch (err) { showError('Error', err?.message || 'Failed to send message'); setText(t); }
    finally { setSending(false); }
  };

  const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; };

  const listData = peerTyping ? [...messages, { _typing: true }] : messages;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg || '#0f172a' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border || '#334155' }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#6366f1' }}>{(booking.customerName || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text || '#f1f5f9' }} numberOfLines={1}>{booking.customerName || 'Customer'}</Text>
            <Text style={{ fontSize: 12, color: theme.subText || '#94a3b8' }} numberOfLines={1}>{booking.serviceName} · #{booking._id?.slice(-6)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card || '#1e293b' }}>
            <Ionicons name="close" size={20} color={theme.subText || '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {!isChatOpen && (
          <View style={{ margin: 12, padding: 12, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' }}>
            <Text style={{ fontSize: 12, color: '#d97706' }}>Chat closed — booking is {booking.status.replace('_', ' ')}.</Text>
          </View>
        )}

        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#6366f1" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            keyExtractor={(item, i) => item._typing ? 'typing' : String(i)}
            contentContainerStyle={{ padding: 12, gap: 8, flexGrow: 1 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                <Ionicons name="chatbubble-outline" size={32} color={theme.subText || '#475569'} />
                <Text style={{ fontSize: 13, color: theme.subText || '#64748b', marginTop: 8 }}>No messages yet</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item._typing) {
                return (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: theme.card || '#1e293b', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderBottomLeftRadius: 4, marginVertical: 2 }}>
                    <Text style={{ fontSize: 12, color: theme.subText || '#94a3b8', fontStyle: 'italic' }}>Customer is typing…</Text>
                  </View>
                );
              }
              const mine = item.senderRole === 'owner';
              return (
                <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginVertical: 2 }}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, backgroundColor: mine ? '#6366f1' : (theme.card || '#1e293b') }}>
                    <Text style={{ fontSize: 14, color: mine ? '#fff' : (theme.text || '#f1f5f9'), lineHeight: 20 }}>{item.text}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: 3, gap: 3 }}>
                      <Text style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.6)' : (theme.subText || '#64748b') }}>{fmt(item.createdAt)}</Text>
                      {mine && (
                        <Text style={{ fontSize: 13, color: item.readAt ? '#25D366' : '#94a3b8', letterSpacing: -4, fontWeight: '900', lineHeight: 14 }}>{'✓✓'}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        {isChatOpen && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1, borderTopColor: theme.border || '#334155' }}>
            <TextInput
              value={text}
              onChangeText={t => {
                setText(t);
                socketRef.current?.emit('chat-typing', { bookingId: booking._id, senderRole: 'owner' });
              }}
              placeholder="Message customer…"
              placeholderTextColor={theme.subText || '#64748b'}
              multiline
              style={{ flex: 1, minHeight: 42, maxHeight: 100, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.border || '#334155', backgroundColor: theme.card || '#1e293b', color: theme.text || '#f1f5f9', fontSize: 14 }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || sending ? 0.5 : 1 }}
            >
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
              {[-1, 0, 1, 2, 3, 4, 5, 6].map((d) => {
                const dt = localDate(d);
                if (dt < today || dt > maxDate) return null;
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
                <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 8 }} />
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
                        <Text style={[mStyles.slotEnd, selected && { color: '#c7d2fe' }, (past || blocked) && { color: '#c4c9d2' }]}>–{endTime}</Text>
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
              <View style={[mStyles.summaryRow, { borderTopWidth: 1, borderTopColor: '#c7d2fe', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[mStyles.summaryKey, { fontWeight: '700' }]}>Total</Text>
                <Text style={[mStyles.summaryVal, { fontWeight: '800', color: '#4338ca' }]}>₹{selectedService.basePrice}</Text>
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

// ── Main Bookings Screen ─────────────────────────────────────────
export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { salon } = useSalon();

  // View mode: 'upcoming' (default) or 'all'
  const [viewMode, setViewMode] = useState('upcoming');

  // Upcoming mode state (date-based)
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);

  // All mode state (paginated)
  const [allBookings, setAllBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [blocking, setBlocking] = useState(null);
  const [actionSheet, setActionSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [chatBooking, setChatBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rsDate, setRsDate] = useState(today);
  const [rsSlot, setRsSlot] = useState('');
  const [rsSlots, setRsSlots] = useState([]);
  const [rsBlockedSlots, setRsBlockedSlots] = useState([]);
  const [rsClosedDay, setRsClosedDay] = useState(false);
  const [rsSlotsLoading, setRsSlotsLoading] = useState(false);
  const [rsSubmitting, setRsSubmitting] = useState(false);
  const [rsError, setRsError] = useState('');

  // Fetch upcoming bookings by date
  const fetchBookings = useCallback(async (date) => {
    try {
      const res = await api.get(`/owner/bookings?date=${date}`);
      const data = res.data.data;
      setBookings(Array.isArray(data) ? data : (data?.bookings || []));
    } catch { setBookings([]); } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all bookings with pagination
  const fetchAllBookings = useCallback(async (p = 1, statusFilter = 'all', isRefresh = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const res = await api.get(`/owner/bookings?page=${p}&limit=${PAGE_SIZE}${statusParam}`);
      const data = res.data.data;
      const list = Array.isArray(data) ? data : (data?.bookings || []);
      if (p === 1 || isRefresh) setAllBookings(list);
      else setAllBookings(prev => [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
      setPage(p);
    } catch {
      if (p === 1) setAllBookings([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const res = await api.get('/owner/services');
      const d = res.data.data;
      setServices(Array.isArray(d) ? d : (d?.services || []));
    } catch { /* silent */ }
  }, []);

  const fetchBlockedIds = useCallback(async () => {
    try {
      const res = await api.get('/owner/blocked-customers');
      const ids = new Set((res.data.data?.blockedCustomers || [])
        .map((bc) => String(bc.customerId?._id || bc.customerId))
        .filter(Boolean));
      setBlockedIds(ids);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchBookings(selectedDate), fetchServices(), fetchBlockedIds()]);
  }, []);

  useEffect(() => {
    if (viewMode === 'upcoming') {
      setLoading(true);
      fetchBookings(selectedDate);
    } else {
      setPage(1);
      setHasMore(true);
      fetchAllBookings(1, filter);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'upcoming') fetchBookings(selectedDate);
  }, [selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (viewMode === 'upcoming') {
      await Promise.all([fetchBookings(selectedDate), fetchServices(), fetchBlockedIds()]);
    } else {
      await fetchAllBookings(1, filter, true);
    }
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && viewMode === 'all') {
      fetchAllBookings(page + 1, filter);
    }
  };

  const switchViewMode = (mode) => {
    setViewMode(mode);
    setFilter('all');
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      await api.put(`/owner/bookings/${bookingId}`, { status: newStatus });
      setBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, status: newStatus } : b));
      setAllBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, status: newStatus } : b));
    } catch (err) {
      showError('Error', err.message || 'Something went wrong');
    } finally {
      setUpdating(null);
    }
  };

  const doToggleBlock = async (customerId, isBlocked) => {
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
  };

  const handleToggleBlock = (customerId, customerName, isBlocked) => {
    setActionSheet(null);
    setConfirm({
      title: isBlocked ? `Unblock ${customerName}?` : `Block ${customerName}?`,
      message: isBlocked
        ? `${customerName} will be able to book appointments again.`
        : `${customerName} will no longer be able to book appointments at your salon.`,
      danger: !isBlocked,
      confirmLabel: isBlocked ? 'Yes, Unblock' : 'Yes, Block',
      onConfirm: () => { setConfirm(null); doToggleBlock(customerId, isBlocked); },
    });
  };

  const confirmStatusChange = (booking, newStatus) => {
    setActionSheet(null);
    const labels = { confirmed: 'Confirm', in_progress: 'Start', completed: 'Complete', cancelled: 'Cancel' };
    const messages = {
      confirmed: `Confirm booking for ${booking.customerName || 'this customer'}?`,
      in_progress: `Start the service for ${booking.customerName || 'this customer'} now?`,
      completed: `Mark ${booking.customerName || 'this customer'}'s booking as completed?`,
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

  // Fetch slots when reschedule sheet opens or date changes
  useEffect(() => {
    if (!rescheduleBooking || !salon?._id) return;
    setRsSlot(''); setRsSlots([]); setRsBlockedSlots([]); setRsClosedDay(false);
    setRsSlotsLoading(true);
    const dur = rescheduleBooking.estimatedDuration || rescheduleBooking.services?.[0]?.duration || 30;
    api.get(`/public/salons/${salon._id}/slots?date=${rsDate}&duration=${dur}`)
      .then(res => {
        const d = res.data.data || res.data;
        setRsSlots(d.slots || []);
        setRsBlockedSlots(d.blockedSlots || []);
        setRsClosedDay(d.closedDay || false);
      })
      .catch(() => { setRsSlots([]); setRsBlockedSlots([]); })
      .finally(() => setRsSlotsLoading(false));
  }, [rescheduleBooking, rsDate, salon?._id]);

  const handleReschedule = async () => {
    if (!rsSlot) { setRsError('Please select a time slot'); return; }
    setRsError(''); setRsSubmitting(true);
    try {
      await api.put(`/owner/bookings/${rescheduleBooking._id}/reschedule`, { newDate: rsDate, newTime: rsSlot });
      showSuccess('Rescheduled', 'Booking has been rescheduled');
      setRescheduleBooking(null);
      if (viewMode === 'upcoming') fetchBookings(selectedDate);
      else fetchAllBookings(1, filter, true);
    } catch (err) {
      setRsError(err.response?.data?.message || 'Failed to reschedule');
    } finally { setRsSubmitting(false); }
  };

  const handlePrintReceipt = async (bookingId) => {
    try {
      const res = await api.get(`/owner/bookings/${bookingId}/receipt`);
      const r = res.data.data;
      const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';
      const fmtTime = (t) => { if (!t) return '—'; const [h,m] = t.split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`; };
      const servicesRows = (r.services || []).map(s =>
        `<tr><td>${s.name}</td><td>${s.duration} min</td><td style="text-align:right">₹${s.price}</td></tr>`
      ).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Receipt</title>
      <style>body{font-family:sans-serif;max-width:380px;margin:20px auto;padding:16px;color:#111}
      h2{text-align:center;margin:0 0 4px;font-size:18px}.sub{text-align:center;color:#555;font-size:12px;margin-bottom:16px}
      hr{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
      .row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}.label{color:#555}
      table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;border-bottom:1px solid #e5e7eb;padding:5px 0;color:#555}
      td{padding:4px 0;border-bottom:1px solid #f3f4f6}.total{font-weight:700;font-size:14px}
      .footer{margin-top:20px;text-align:center;font-size:11px;color:#9ca3af}</style></head><body>
      <h2>${r.salon.name}</h2>
      <div class="sub">${r.salon.address||''}<br/>${r.salon.phone||''}</div><hr/>
      <div class="row"><span class="label">Receipt #</span><span>${r.receiptNumber}</span></div>
      <div class="row"><span class="label">Date</span><span>${fmt(r.appointment.date)} ${fmtTime(r.appointment.time)}</span></div><hr/>
      <div class="row"><span class="label">Customer</span><span>${r.customer.name}</span></div>
      ${r.staff.name?`<div class="row"><span class="label">Staff</span><span>${r.staff.name}</span></div>`:''}
      <hr/><table><thead><tr><th>Service</th><th>Dur</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${servicesRows}</tbody></table>
      ${r.discount?`<div class="row"><span class="label">Discount</span><span>-₹${r.discount}</span></div>`:''}
      <div class="row total"><span>Total</span><span>₹${r.total}</span></div>
      <div class="row"><span class="label">Payment</span><span>${r.paymentMethod||'—'} · ${r.paymentStatus}</span></div>
      ${r.salon.gstNumber?`<div class="row"><span class="label">GST</span><span>${r.salon.gstNumber}</span></div>`:''}
      <div class="footer">Thank you for visiting ${r.salon.name}!</div></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Receipt' });
      } else {
        await Print.printAsync({ uri });
      }
    } catch (err) {
      showError('Error', 'Could not generate receipt');
    }
  };

  const createWalkIn = async (data) => {
    await api.post('/owner/bookings', data);
    showSuccess('Booked', 'Walk-in booking created!');
    await fetchBookings(selectedDate);
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const shifted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const minDate = localDate(-90); // allow 90 days back
    if (shifted >= minDate && shifted <= maxDate) setSelectedDate(shifted);
  };

  const isToday    = selectedDate === today;
  const isMaxDate  = selectedDate >= maxDate;
  const isMinDate  = selectedDate <= localDate(-90);
  const displayLabel = isToday ? 'Today' : formatDate(selectedDate + 'T12:00:00');

  const applySearch = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(b =>
      (b.customerName  || '').toLowerCase().includes(q) ||
      (b.customerPhone || '').toLowerCase().includes(q) ||
      (b.bookingId     || '').toLowerCase().includes(q)
    );
  };

  const filtered = applySearch(
    viewMode === 'upcoming'
      ? bookings.filter((b) => {
          const matchStatus = filter === 'all'
            ? UPCOMING_STATUSES.includes(b.status)
            : b.status === filter;
          return matchStatus;
        })
      : allBookings.filter((b) => filter === 'all' ? true : b.status === filter)
  );

  const getNextStatuses = (status) => {
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    return transitions[status] || [];
  };

  const renderBooking = ({ item: b }) => {
    const colors = STATUS_COLORS[b.status] || { bg: '#f3f4f6', text: '#374151' };
    const isBlocked = b.customerId && blockedIds.has(String(b.customerId));
    const isUpdating = updating === b._id;
    const nextStatuses = getNextStatuses(b.status);

    return (
      <View style={[bStyles.card, { backgroundColor: theme.card }]}>
        {/* Top row */}
        <View style={bStyles.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[bStyles.customerName, { color: theme.text }]}>{b.customerName || '—'}</Text>
              {b.customerGender && (
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: b.customerGender === 'male' ? '#e0e7ff' : '#fce7f3' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: b.customerGender === 'male' ? '#4f46e5' : '#be185d' }}>
                    {b.customerGender === 'male' ? '👨 Male' : '👩 Female'}
                  </Text>
                </View>
              )}
            </View>
            {b.customerPhone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="call-outline" size={12} color="#9ca3af" />
                <Text style={bStyles.meta}>{b.customerPhone}</Text>
              </View>
            )}
          </View>
          <View style={[bStyles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[bStyles.statusText, { color: colors.text }]}>{b.status?.replace('_', ' ')}</Text>
          </View>
          <TouchableOpacity
            style={bStyles.gearBtn}
            onPress={() => setActionSheet(b)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.subText} />
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={bStyles.details}>
          {[
            { icon: 'cut-outline', text: b.serviceName },
            { icon: 'time-outline', text: formatTime(b.appointmentTime) },
            { icon: 'calendar-outline', text: formatDate(b.appointmentDate) },
            b.totalAmount ? { icon: 'cash-outline', text: `₹${b.totalAmount}` } : null,
            b.isWalkIn ? { icon: 'walk-outline', text: 'Walk-in' } : null,
          ].filter(Boolean).map((d, i) => (
            <View key={i} style={bStyles.detailRow}>
              <Ionicons name={d.icon} size={13} color={theme.subText} />
              <Text style={[bStyles.detailText, { color: theme.subText }]}>{d.text}</Text>
            </View>
          ))}
          {b.totalAmount ? <PaymentBadgeRN booking={b} /> : null}
        </View>

        {/* Actions */}
        {(nextStatuses.length > 0 || CHAT_OPEN_STATUSES.includes(b.status)) && (
          <View style={bStyles.actions}>
            {isUpdating || blocking === String(b.customerId) ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <>
                {nextStatuses.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[bStyles.actionBtn, s === 'cancelled' ? bStyles.actionBtnDanger : bStyles.actionBtnPrimary]}
                    onPress={() => confirmStatusChange(b, s)}
                  >
                    <Text style={[bStyles.actionBtnText, s === 'cancelled' && { color: '#dc2626' }]}>
                      {s === 'confirmed' ? 'Confirm' : s === 'in_progress' ? 'Start' : s === 'completed' ? 'Complete' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {CHAT_OPEN_STATUSES.includes(b.status) && (
                  <TouchableOpacity
                    style={[bStyles.actionBtn, { backgroundColor: '#e0e7ff', borderColor: '#a5b4fc' }]}
                    onPress={() => setChatBooking(b)}
                  >
                    <Ionicons name="chatbubble-outline" size={12} color="#6366f1" />
                    <Text style={[bStyles.actionBtnText, { color: '#6366f1' }]}>Chat</Text>
                  </TouchableOpacity>
                )}
                {b.status === 'completed' && (
                  <TouchableOpacity
                    style={[bStyles.actionBtn, { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' }]}
                    onPress={() => handlePrintReceipt(b._id)}
                  >
                    <Ionicons name="receipt-outline" size={12} color="#059669" />
                    <Text style={[bStyles.actionBtnText, { color: '#059669' }]}>Receipt</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <View style={[bStyles.header, { paddingTop: 12 + insets.top }]}>
        <View style={bStyles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, marginTop: 4, marginRight: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={bStyles.headerTitle}>Bookings</Text>
          <TouchableOpacity style={bStyles.walkInBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={bStyles.walkInBtnText}>Walk-in</Text>
          </TouchableOpacity>
        </View>

        {/* View mode toggle */}
        <View style={bStyles.modeRow}>
          {['upcoming', 'all'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[bStyles.modeBtn, viewMode === mode && bStyles.modeBtnActive]}
              onPress={() => switchViewMode(mode)}
            >
              <Text style={[bStyles.modeBtnText, viewMode === mode && bStyles.modeBtnTextActive]}>
                {mode === 'upcoming' ? 'Upcoming' : 'All Bookings'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date nav — only in upcoming mode */}
        {viewMode === 'upcoming' && (
          <View style={bStyles.dateRow}>
            <TouchableOpacity style={[bStyles.navBtn, isMinDate && { opacity: 0.4 }]} onPress={() => shiftDate(-1)} disabled={isMinDate}>
              <Ionicons name="chevron-back" size={16} color="#6b7280" />
            </TouchableOpacity>
            <Text style={bStyles.dateLabel}>{displayLabel}</Text>
            <TouchableOpacity style={[bStyles.navBtn, isMaxDate && { opacity: 0.4 }]} onPress={() => shiftDate(1)} disabled={isMaxDate}>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Search */}
        <View style={bStyles.searchRow}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput
            style={[bStyles.searchInput, { color: theme.text }]}
            placeholder="Search name, phone or booking ID…"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bStyles.filterRow}>
          {(viewMode === 'upcoming' ? UPCOMING_FILTERS : ALL_STATUS_FILTERS).map((f) => (
            <TouchableOpacity
              key={f}
              style={[bStyles.filterChip, filter === f && bStyles.filterChipActive]}
              onPress={() => {
                setFilter(f);
                if (viewMode === 'all') fetchAllBookings(1, f, true);
              }}
            >
              <Text style={[bStyles.filterChipText, filter === f && bStyles.filterChipTextActive]}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name={searchQuery ? 'search-outline' : 'calendar-outline'} size={48} color="#d1d5db" />
              <Text style={{ color: '#9ca3af', marginTop: 8, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 }}>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : viewMode === 'upcoming'
                    ? `No upcoming bookings for ${displayLabel}`
                    : 'No bookings found'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' }}>
                  <Text style={{ color: '#6366f1', fontWeight: '600', fontSize: 13 }}>Clear search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListFooterComponent={
            viewMode === 'all' ? (
              hasMore ? (
                <TouchableOpacity
                  style={[bStyles.loadMoreBtn, { borderColor: theme.border || '#e5e7eb' }]}
                  onPress={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? <ActivityIndicator size="small" color="#6366f1" />
                    : (
                      <>
                        <Ionicons name="chevron-down" size={16} color="#6366f1" />
                        <Text style={bStyles.loadMoreText}>Load More</Text>
                      </>
                    )}
                </TouchableOpacity>
              ) : filtered.length > 0 ? (
                <Text style={[bStyles.endText, { color: theme.subText }]}>All bookings loaded</Text>
              ) : null
            ) : null
          }
        />
      )}

      <WalkInModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        salonId={salon?._id}
        services={services.filter((s) => s.isActive !== false)}
        onSuccess={createWalkIn}
      />

      {/* ── Action Sheet ── */}
      <Modal visible={!!actionSheet} transparent animationType="slide" onRequestClose={() => setActionSheet(null)}>
        <Pressable style={bStyles.modalOverlay} onPress={() => setActionSheet(null)}>
          <Pressable style={[bStyles.sheetBox, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={bStyles.sheetHandle} />
            <View style={bStyles.sheetHeader}>
              <View style={bStyles.sheetAvatar}>
                <Text style={bStyles.sheetAvatarText}>{actionSheet?.customerName?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[bStyles.sheetName, { color: theme.text }]}>{actionSheet?.customerName || '—'}</Text>
                <Text style={[bStyles.sheetMeta, { color: theme.subText }]}>{actionSheet?.serviceName}  ·  {formatTime(actionSheet?.appointmentTime)}</Text>
                {actionSheet?.customerPhone ? <Text style={[bStyles.sheetMeta, { color: theme.subText }]}>{actionSheet.customerPhone}</Text> : null}
              </View>
            </View>
            <View style={bStyles.sheetDivider} />
            {actionSheet?.customerId && !actionSheet?.isWalkIn && (
              <TouchableOpacity
                style={bStyles.sheetOption}
                onPress={() => handleToggleBlock(
                  String(actionSheet.customerId),
                  actionSheet.customerName,
                  blockedIds.has(String(actionSheet.customerId))
                )}
              >
                <View style={[bStyles.sheetOptionIcon, { backgroundColor: blockedIds.has(String(actionSheet?.customerId)) ? '#fef3c7' : '#fee2e2' }]}>
                  <Ionicons
                    name={blockedIds.has(String(actionSheet?.customerId)) ? 'shield-checkmark-outline' : 'shield-off-outline'}
                    size={20}
                    color={blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626'}
                  />
                </View>
                <Text style={[bStyles.sheetOptionText, { color: blockedIds.has(String(actionSheet?.customerId)) ? '#d97706' : '#dc2626' }]}>
                  {blockedIds.has(String(actionSheet?.customerId)) ? 'Unblock Customer' : 'Block Customer'}
                </Text>
              </TouchableOpacity>
            )}
            {['pending','confirmed'].includes(actionSheet?.status) && (actionSheet?.rescheduleCount || 0) < 2 && (
              <TouchableOpacity
                style={bStyles.sheetOption}
                onPress={() => {
                  setRescheduleBooking(actionSheet);
                  setRsDate(today);
                  setRsSlot('');
                  setRsError('');
                  setActionSheet(null);
                }}
              >
                <View style={[bStyles.sheetOptionIcon, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#7c3aed" />
                </View>
                <Text style={[bStyles.sheetOptionText, { color: '#7c3aed' }]}>
                  Reschedule{(actionSheet?.rescheduleCount || 0) > 0 ? ` (${actionSheet.rescheduleCount}/2 used)` : ''}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={bStyles.sheetOption} onPress={() => setActionSheet(null)}>
              <View style={[bStyles.sheetOptionIcon, { backgroundColor: '#374151' }]}>
                <Ionicons name="close-outline" size={20} color="#9ca3af" />
              </View>
              <Text style={[bStyles.sheetOptionText, { color: '#9ca3af' }]}>Dismiss</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Confirm Modal ── */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={bStyles.confirmOverlay}>
          <View style={bStyles.confirmBox}>
            <View style={[bStyles.confirmIcon, { backgroundColor: confirm?.danger ? '#fee2e2' : '#e0e7ff' }]}>
              <Ionicons name={confirm?.danger ? 'warning-outline' : 'help-circle-outline'} size={28} color={confirm?.danger ? '#dc2626' : '#6366f1'} />
            </View>
            <Text style={bStyles.confirmTitle}>{confirm?.title}</Text>
            <Text style={bStyles.confirmMsg}>{confirm?.message}</Text>
            <View style={bStyles.confirmBtns}>
              <TouchableOpacity style={[bStyles.confirmBtn, { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }]} onPress={() => setConfirm(null)}>
                <Text style={[bStyles.confirmBtnText, { color: '#f1f5f9' }]}>No, Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[bStyles.confirmBtn, { backgroundColor: confirm?.danger ? '#dc2626' : '#6366f1' }]} onPress={confirm?.onConfirm}>
                <Text style={[bStyles.confirmBtnText, { color: '#fff' }]}>{confirm?.confirmLabel || 'Yes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Chat Modal ── */}
      {chatBooking && (
        <ChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />
      )}

      {/* ── Reschedule Sheet ── */}
      <Modal visible={!!rescheduleBooking} transparent animationType="slide" onRequestClose={() => setRescheduleBooking(null)}>
        <Pressable style={bStyles.modalOverlay} onPress={() => setRescheduleBooking(null)}>
          <Pressable style={[bStyles.sheetBox, { backgroundColor: theme.card, maxHeight: '85%' }]} onPress={() => {}}>
            <View style={bStyles.sheetHandle} />
            <Text style={[{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 }]}>Reschedule Booking</Text>
            <Text style={{ color: theme.subText, fontSize: 13, marginBottom: 16 }}>
              {rescheduleBooking?.customerName} · {rescheduleBooking?.serviceName}
            </Text>

            {(rescheduleBooking?.rescheduleCount || 0) > 0 && (
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#92400e' }}>
                  Reschedule {rescheduleBooking.rescheduleCount}/2 used
                </Text>
              </View>
            )}

            {rsError ? (
              <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#dc2626' }}>{rsError}</Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.subText, marginBottom: 6 }}>New Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(offset => {
                const d = localDate(offset);
                const label = offset === 0 ? 'Today' : new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
                const active = rsDate === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setRsDate(d)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8,
                      backgroundColor: active ? '#7c3aed' : (theme.card === '#fff' ? '#f3f4f6' : '#1e293b') }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : theme.subText }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.subText, marginBottom: 8 }}>Available Slots</Text>
            {rsSlotsLoading ? (
              <ActivityIndicator size="small" color="#7c3aed" style={{ marginBottom: 16 }} />
            ) : rsClosedDay ? (
              <Text style={{ color: '#f59e0b', fontSize: 13, marginBottom: 16 }}>Salon is closed on this day.</Text>
            ) : rsSlots.length === 0 ? (
              <Text style={{ color: theme.subText, fontSize: 13, marginBottom: 16 }}>No slots available for this date.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 160, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {rsSlots.map(s => {
                    const past = rsDate === today && (() => { const [h,m] = s.split(':').map(Number); const now = new Date(); return h*60+m <= now.getHours()*60+now.getMinutes(); })();
                    const blocked = !past && rsBlockedSlots.includes(s);
                    const selected = rsSlot === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { if (!past && !blocked) setRsSlot(s); }}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
                          backgroundColor: past ? '#f3f4f6' : blocked ? '#fee2e2' : selected ? '#7c3aed' : (theme.card === '#fff' ? '#f9fafb' : '#1e293b'),
                          borderColor: past ? '#e5e7eb' : blocked ? '#fca5a5' : selected ? '#7c3aed' : '#e5e7eb',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600',
                          color: past ? '#9ca3af' : blocked ? '#ef4444' : selected ? '#fff' : theme.text }}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={{ backgroundColor: rsSubmitting || !rsSlot ? '#a78bfa' : '#7c3aed', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              onPress={handleReschedule}
              disabled={rsSubmitting || !rsSlot}
            >
              {rsSubmitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm Reschedule</Text>
              }
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const bStyles = StyleSheet.create({
  header: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 3, marginBottom: 10 },
  modeBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  modeBtnTextActive: { color: '#6366f1' },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 24, paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  loadMoreText: { color: '#6366f1', fontWeight: '700', fontSize: 14 },
  endText: { textAlign: 'center', fontSize: 12, paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  walkInBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, gap: 4 },
  walkInBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  navBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dateLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#fff', paddingVertical: 0 },
  filterRow: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, marginRight: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  filterChipActive: { backgroundColor: '#fff' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#6366f1', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  gearBtn: { padding: 4, marginLeft: 4 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  details: { gap: 4, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionBtnPrimary: { backgroundColor: '#e0e7ff', borderColor: '#93c5fd' },
  actionBtnDanger: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  actionBtnWarning: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  actionBtnGray: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#6366f1', textTransform: 'capitalize' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#475569', alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { fontSize: 20, fontWeight: '800', color: '#6366f1' },
  sheetName: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  sheetMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  sheetOptionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sheetOptionText: { fontSize: 15, fontWeight: '600' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center' },
  confirmBox: { marginHorizontal: 32, borderRadius: 20, padding: 24, alignItems: 'center', backgroundColor: '#1e293b', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  confirmIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },
});

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
  dateNav: { flexDirection: 'row', gap: 8 },
  dateChip: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  dateChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dateChipText: { fontSize: 10, color: '#6b7280', fontWeight: '500' },
  dateChipNum: { fontSize: 14, color: '#374151', fontWeight: '700', marginTop: 2 },
  dateChipActiveText: { color: '#fff' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, minWidth: 70, alignItems: 'center' },
  slotFree: { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  slotSelected: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  slotBlocked: { borderColor: '#fca5a5', backgroundColor: '#fee2e2' },
  slotPast: { borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' },
  slotText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  slotEnd: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  summary: { backgroundColor: '#e0e7ff', borderRadius: 12, padding: 14, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#4338ca', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryKey: { fontSize: 13, color: '#6366f1' },
  summaryVal: { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  submitBtn: { backgroundColor: '#6366f1', borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
