import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  Linking, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import AppText from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { showSuccess, showError } from '../../utils/toast';
import { useTheme } from '../../context/ThemeContext';

const SOCKET_URL_RN  = 'https://api.glowloox.com';
const CHAT_OPEN_LIST = ['pending', 'confirmed', 'in_progress'];

const FILTERS = ['Upcoming', 'Completed', 'Cancelled', 'All'];
const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#d97706', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.35)',  left: '#d97706' },
  confirmed:   { label: 'Confirmed',   color: '#059669', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.35)',  left: '#059669' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.35)', left: '#7c3aed' },
  completed:   { label: 'Completed',   color: '#2563eb', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.35)',  left: '#2563eb' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.35)', left: '#dc2626' }
};

// ── Helpers ───────────────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeLabel(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayH = hour % 12 || 12;
  return `${displayH}:${m || '00'} ${ampm}`;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function useCountdown(dateStr, timeStr) {
  const [label, setLabel] = useState(null);
  useEffect(() => {
    if (!dateStr || !timeStr) { setLabel(null); return; }
    const compute = () => {
      const target = new Date(String(dateStr).slice(0, 10) + 'T' + timeStr + ':00');
      const ms = target - Date.now();
      if (ms <= 0) { setLabel(null); return; }
      const totalMins = Math.floor(ms / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins  = totalMins % 60;
      const days  = Math.floor(hours / 24);
      if (days > 1)       setLabel(`in ${days} days`);
      else if (days === 1) setLabel('tomorrow');
      else if (hours > 0)  setLabel(`in ${hours}h ${mins}m`);
      else if (mins > 0)   setLabel(`in ${mins} min`);
      else setLabel('starting now');
    };
    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [dateStr, timeStr]);
  return label;
}

// ── StatusBadge ───────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' };
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, borderWidth: 1, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      <AppText style={{ fontSize: 11, fontWeight: '700', color: cfg.color }}>{cfg.label}</AppText>
    </View>
  );
}

// ── ReviewPrompt ──────────────────────────────────────────────

function ReviewPrompt({ bookingId, onReviewed, theme }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return (
    <View style={{ marginTop: 10, padding: 10, backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' }}>
      <AppText style={{ fontSize: 12, color: '#34d399' }}>Thank you for your review!</AppText>
    </View>
  );

  if (!open) return (
    <TouchableOpacity
      style={{ marginTop: 10, padding: 10, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}
      onPress={() => setOpen(true)}
      activeOpacity={0.8}
    >
      <AppText style={{ fontSize: 12, color: '#818cf8' }}>How was your experience?</AppText>
      <AppText style={{ fontSize: 12, color: '#818cf8', fontWeight: '700' }}>Leave a Review →</AppText>
    </TouchableOpacity>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await api.post('/customer/reviews', { bookingId, salonRating: rating, reviewText: text.trim() || undefined });
      setDone(true);
      onReviewed?.();
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ marginTop: 10, padding: 12, backgroundColor: 'rgba(99,102,241,0.07)', borderRadius: 10, gap: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)' }}>
      <AppText style={{ fontSize: 12, fontWeight: '700', color: '#818cf8' }}>Rate your experience</AppText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={26} color={n <= rating ? '#f59e0b' : theme?.border || '#334155'} />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Share your experience (optional)"
        placeholderTextColor={theme?.placeholder || '#64748b'}
        multiline
        numberOfLines={2}
        style={{
          borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: 8, padding: 8,
          fontSize: 12, color: theme?.text || '#f1f5f9', textAlignVertical: 'top',
          backgroundColor: theme?.input || '#1e293b', minHeight: 52
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!rating || submitting}
          style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#4f46e5', borderRadius: 8, opacity: !rating || submitting ? 0.5 : 1 }}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <AppText style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Submit</AppText>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setOpen(false)} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
          <AppText style={{ fontSize: 12, color: theme?.subText || '#94a3b8' }}>Cancel</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── RescheduleModal ───────────────────────────────────────────

function RescheduleModal({ booking, onClose, onRescheduled, theme }) {
  const [newDate, setNewDate] = useState(todayString());
  const [newTime, setNewTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const salonId = booking.salonId?._id || booking.salonId;
  const duration = booking.estimatedDuration || 30;

  useEffect(() => {
    if (!newDate || !salonId) return;
    setNewTime('');
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
    setSlotsLoading(true);
    api.get(`/public/salons/${salonId}/booked-slots?date=${newDate}&duration=${duration}`)
      .then(res => {
        const d = res.data.data || {};
        setClosedDay(d.closedDay || false);
        setSlots(d.slots || []);
        setBlockedSlots(d.blockedSlots || []);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [newDate, salonId, duration]);

  const handleSave = async () => {
    if (!newDate || !newTime) { setError('Please select a date and time slot.'); return; }
    setSaving(true); setError('');
    try {
      await api.put(`/customer/bookings/${booking._id}/reschedule`, { appointmentDate: newDate, appointmentTime: newTime });
      onRescheduled(booking._id, newDate, newTime);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reschedule. Try another slot.');
    } finally {
      setSaving(false);
    }
  };

  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    return { key, label };
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose}>
        <View style={{ flex: 1 }} />
        <View style={{ backgroundColor: theme?.card || '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' }}
          onStartShouldSetResponder={() => true}>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <AppText style={{ fontSize: 17, fontWeight: '800', color: theme?.text || '#f1f5f9' }}>Reschedule Booking</AppText>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme?.cardAlt || '#162032', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme?.border || '#334155' }}>
              <Ionicons name="close" size={16} color={theme?.subText || '#94a3b8'} />
            </TouchableOpacity>
          </View>

          <AppText style={{ fontSize: 13, fontWeight: '600', color: theme?.subText || '#94a3b8', marginBottom: 8 }}>Select Date</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {quickDates.map(({ key, label }) => (
              <TouchableOpacity key={key} onPress={() => setNewDate(key)}
                style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99, borderWidth: 1, backgroundColor: newDate === key ? '#4f46e5' : (theme?.cardAlt || '#162032'), borderColor: newDate === key ? 'transparent' : (theme?.border || '#334155') }}>
                <AppText style={{ fontSize: 13, fontWeight: '600', color: newDate === key ? '#fff' : (theme?.subText || '#94a3b8'), whiteSpace: 'nowrap' }}>{label}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <AppText style={{ fontSize: 13, fontWeight: '600', color: theme?.subText || '#94a3b8', marginBottom: 8 }}>Select Time Slot</AppText>
          {slotsLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <AppText style={{ fontSize: 13, color: theme?.subText || '#94a3b8' }}>Loading slots…</AppText>
            </View>
          ) : closedDay ? (
            <View style={{ padding: 12, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', marginBottom: 12 }}>
              <AppText style={{ fontSize: 13, color: '#d97706' }}>Salon is closed on this day. Choose another date.</AppText>
            </View>
          ) : slots.length === 0 ? (
            <View style={{ padding: 12, backgroundColor: theme?.cardAlt || '#162032', borderRadius: 10, borderWidth: 1, borderColor: theme?.border || '#334155', marginBottom: 12 }}>
              <AppText style={{ fontSize: 13, color: theme?.subText || '#94a3b8' }}>No available slots on this date.</AppText>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {slots.map(s => {
                  const blocked  = blockedSlots.includes(s);
                  const selected = newTime === s;
                  return (
                    <TouchableOpacity key={s} onPress={() => { if (!blocked) setNewTime(s); }} disabled={blocked}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
                        backgroundColor: blocked ? 'rgba(248,113,113,0.1)' : selected ? '#4f46e5' : (theme?.cardAlt || '#162032'),
                        borderColor: blocked ? 'rgba(248,113,113,0.3)' : selected ? 'transparent' : (theme?.border || '#334155')
                      }}>
                      <AppText style={{ fontSize: 12, fontWeight: '600', color: blocked ? '#f87171' : selected ? '#fff' : (theme?.text || '#f1f5f9') }}>
                        {formatTimeLabel(s)}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {!!error && <AppText style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</AppText>}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity onPress={handleSave} disabled={saving || !newTime}
              style={{ flex: 2, height: 50, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', opacity: saving || !newTime ? 0.6 : 1 }}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Confirm Reschedule</AppText>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ flex: 1, height: 50, borderRadius: 14, backgroundColor: theme?.cardAlt || '#162032', borderWidth: 1, borderColor: theme?.border || '#334155', alignItems: 'center', justifyContent: 'center' }}>
              <AppText style={{ color: theme?.subText || '#94a3b8', fontWeight: '600', fontSize: 14 }}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── ChatModal ─────────────────────────────────────────────────
function ChatModal({ booking, onClose, theme }) {
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const socketRef   = useRef(null);
  const flatListRef = useRef(null);
  const typingTimer = useRef(null);
  const isChatOpen  = CHAT_OPEN_LIST.includes(booking.status);
  const salonName   = booking.salonName || booking.salonId?.name || 'Salon';

  useEffect(() => {
    api.get(`/customer/bookings/${booking._id}/messages`)
      .then(res => {
        const msgs = res.data.data?.messages || [];
        const now = new Date().toISOString();
        setMessages(msgs.map(m => m.senderRole === 'customer' && !m.readAt ? { ...m, readAt: now } : m));
        api.put(`/customer/bookings/${booking._id}/messages/read`).catch(() => {});
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
          api.put(`/customer/bookings/${bookingId}/messages/read`).catch(() => {});
        }
      }
    });
    socket.on('chat-typing', ({ senderRole }) => {
      if (senderRole === 'owner') {
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
      await api.post(`/customer/bookings/${booking._id}/messages`, { text: t });
    } catch (err) { Alert.alert('Error', err?.message || 'Failed to send message'); setText(t); }
    finally { setSending(false); }
  };

  const fmt = iso => { if (!iso) return ''; const d = new Date(iso); return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const listData = peerTyping ? [...messages, { _typing: true }] : messages;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme?.bg || '#0f172a' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme?.border || '#334155' }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{salonName[0].toUpperCase()}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 15, fontWeight: '700', color: theme?.text || '#f1f5f9' }} numberOfLines={1}>{salonName}</AppText>
            <AppText style={{ fontSize: 12, color: theme?.subText || '#94a3b8' }} numberOfLines={1}>#{booking._id?.slice(-6)}</AppText>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme?.card || '#1e293b' }}>
            <Ionicons name="close" size={20} color={theme?.subText || '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {!isChatOpen && (
          <View style={{ margin: 12, padding: 12, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' }}>
            <AppText style={{ fontSize: 12, color: '#d97706' }}>Chat closed — booking is {booking.status.replace('_', ' ')}.</AppText>
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
                <Ionicons name="chatbubble-outline" size={32} color={theme?.subText || '#475569'} />
                <AppText style={{ fontSize: 13, color: theme?.subText || '#64748b', marginTop: 8 }}>No messages yet</AppText>
              </View>
            }
            renderItem={({ item }) => {
              if (item._typing) {
                return (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: theme?.card || '#1e293b', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderBottomLeftRadius: 4, marginVertical: 2 }}>
                    <AppText style={{ fontSize: 12, color: theme?.subText || '#94a3b8', fontStyle: 'italic' }}>Salon is typing…</AppText>
                  </View>
                );
              }
              const mine = item.senderRole === 'customer';
              return (
                <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', marginVertical: 2 }}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, backgroundColor: mine ? '#6366f1' : (theme?.card || '#1e293b') }}>
                    <AppText style={{ fontSize: 14, color: mine ? '#fff' : (theme?.text || '#f1f5f9'), lineHeight: 20 }}>{item.text}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: mine ? 'flex-end' : 'flex-start', marginTop: 3, gap: 3 }}>
                      <AppText style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.6)' : (theme?.subText || '#64748b') }}>{fmt(item.createdAt)}</AppText>
                      {mine && (
                        <AppText style={{ fontSize: 13, color: item.readAt ? '#25D366' : '#94a3b8', letterSpacing: -4, fontWeight: '900', lineHeight: 14 }}>{'✓✓'}</AppText>
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1, borderTopColor: theme?.border || '#334155' }}>
            <TextInput
              value={text}
              onChangeText={t => {
                setText(t);
                socketRef.current?.emit('chat-typing', { bookingId: booking._id, senderRole: 'customer' });
              }}
              placeholder="Message salon…"
              placeholderTextColor={theme?.subText || '#64748b'}
              multiline
              style={{ flex: 1, minHeight: 42, maxHeight: 100, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: theme?.border || '#334155', backgroundColor: theme?.card || '#1e293b', color: theme?.text || '#f1f5f9', fontSize: 14 }}
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

// ── BookingCard ───────────────────────────────────────────────

function BookingCard({ booking: initialBooking, userCoords, onCancelled, theme, isNext }) {
  const [booking, setBooking]               = useState(initialBooking);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewed, setReviewed]             = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  const [chatOpen, setChatOpen]             = useState(false);
  const countdown = useCountdown(booking.appointmentDate, booking.appointmentTime);

  const status = booking.status || 'pending';
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Booking', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try { await api.post(`/customer/bookings/${booking._id}/cancel`); onCancelled(booking._id); }
            catch (err) { showError(err?.message || 'Could not cancel.'); }
            finally { setCancelling(false); }
          }
        },
      ]
    );
  };

  const handleRescheduled = (id, date, time) =>
    setBooking(prev => ({ ...prev, appointmentDate: date, appointmentTime: time, status: 'pending' }));

  const salonDoc     = booking.salonId;
  const salonName    = booking.salonName || salonDoc?.name || 'Salon';
  const salonInitial = salonName.charAt(0).toUpperCase();
  const salonCity    = salonDoc?.city || salonDoc?.address || '';
  const salonPhone   = salonDoc?.phone || null;
  const serviceName  = booking.serviceName ||
    (Array.isArray(booking.serviceIds) ? booking.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') || 'Service';

  const dur = booking.estimatedDuration;
  const durLabel = dur ? (dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur}m`) : null;

  let distanceLabel = null;
  if (userCoords && salonDoc?.location?.coordinates?.length === 2) {
    const [salonLng, salonLat] = salonDoc.location.coordinates;
    const km = haversineKm(userCoords.lat, userCoords.lng, salonLat, salonLng);
    distanceLabel = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }

  let mapsUrl = null;
  if (salonDoc?.location?.coordinates?.length === 2) {
    const [lng, lat] = salonDoc.location.coordinates;
    mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  } else {
    const query = [salonDoc?.address || booking.salonName, salonDoc?.city].filter(Boolean).join(', ');
    if (query) mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const canCancel     = ['pending', 'confirmed'].includes(status);
  const canReschedule = ['pending', 'confirmed'].includes(status);
  const canReview     = status === 'completed' && !reviewed && !initialBooking.reviewed;
  const isUpcoming    = ['pending', 'confirmed', 'in_progress'].includes(status);

  const microcopy = status === 'confirmed'
    ? { text: 'Arrive 5 mins early · Slot reserved for you', color: '#059669' }
    : status === 'pending'
    ? { text: 'Awaiting confirmation from salon', color: '#d97706' }
    : status === 'in_progress'
    ? { text: 'Your appointment is in progress right now', color: '#7c3aed' }
    : null;

  return (
    <View style={{
      backgroundColor: theme?.card || '#1e293b',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme?.border || '#334155',
      borderLeftWidth: 3,
      borderLeftColor: cfg.left,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2
    }}>
      {/* Next appointment ribbon */}
      {isNext && (
        <View style={{ backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText style={{ fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Next Appointment
          </AppText>
          {countdown && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.85)" />
              <AppText style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>{countdown}</AppText>
            </View>
          )}
        </View>
      )}

      <View style={{ padding: 14, gap: 12 }}>
        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Salon initial avatar */}
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AppText style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{salonInitial}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 15, fontWeight: '800', color: theme?.text || '#f1f5f9', letterSpacing: -0.2 }} numberOfLines={1}>
              {salonName}
            </AppText>
            <AppText style={{ fontSize: 13, color: theme?.subText || '#94a3b8', marginTop: 1 }} numberOfLines={1}>
              {serviceName}
            </AppText>
            {!!salonCity && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                <Ionicons name="location-outline" size={11} color={theme?.subText || '#64748b'} />
                <AppText style={{ fontSize: 11, color: theme?.subText || '#64748b' }} numberOfLines={1}>{salonCity}</AppText>
              </View>
            )}
          </View>
          <StatusBadge status={status} />
        </View>

        {/* ── Info grid ── */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Date */}
          <View style={{ flex: 1, backgroundColor: theme?.cardAlt || '#162032', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme?.border || '#334155' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 }}>
              <Ionicons name="calendar-outline" size={11} color={theme?.subText || '#64748b'} />
              <AppText style={{ fontSize: 10, color: theme?.subText || '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</AppText>
            </View>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: theme?.text || '#f1f5f9', lineHeight: 16 }}>
              {formatDateLabel(booking.appointmentDate)}
            </AppText>
          </View>
          {/* Time */}
          <View style={{ flex: 1, backgroundColor: theme?.cardAlt || '#162032', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme?.border || '#334155' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 }}>
              <Ionicons name="time-outline" size={11} color={theme?.subText || '#64748b'} />
              <AppText style={{ fontSize: 10, color: theme?.subText || '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Time</AppText>
            </View>
            <AppText style={{ fontSize: 12, fontWeight: '700', color: theme?.text || '#f1f5f9' }}>
              {formatTimeLabel(booking.appointmentTime)}
            </AppText>
          </View>
          {/* Amount */}
          <View style={{ flex: 1, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)' }}>
            <AppText style={{ fontSize: 10, color: '#818cf8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Amount</AppText>
            <AppText style={{ fontSize: 12, fontWeight: '800', color: '#818cf8' }}>
              {booking.totalAmount != null ? `₹${booking.totalAmount}` : '—'}
            </AppText>
          </View>
        </View>

        {/* ── Secondary info row ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {durLabel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="hourglass-outline" size={12} color={theme?.subText || '#64748b'} />
              <AppText style={{ fontSize: 12, color: theme?.subText || '#64748b' }}>{durLabel}</AppText>
            </View>
          )}
          {distanceLabel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={12} color={theme?.subText || '#64748b'} />
              <AppText style={{ fontSize: 12, color: theme?.subText || '#64748b' }}>{distanceLabel}</AppText>
            </View>
          )}
          {booking.paymentMethod && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="card-outline" size={12} color={theme?.subText || '#64748b'} />
              <AppText style={{ fontSize: 12, color: theme?.subText || '#64748b' }}>
                {booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1)}
              </AppText>
              {booking.paymentStatus && (
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, marginLeft: 2,
                  backgroundColor: booking.paymentStatus === 'paid' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                  borderWidth: 1, borderColor: booking.paymentStatus === 'paid' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'
                }}>
                  <AppText style={{ fontSize: 10, fontWeight: '700', color: booking.paymentStatus === 'paid' ? '#34d399' : '#d97706' }}>
                    {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </AppText>
                </View>
              )}
            </View>
          )}
          <AppText style={{ marginLeft: 'auto', fontSize: 11, color: theme?.subText || '#64748b', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
            #{booking.bookingId || booking._id?.slice(-6) || '—'}
          </AppText>
        </View>

        {/* ── Microcopy ── */}
        {microcopy && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1,
            backgroundColor: `${microcopy.color}18`, borderColor: `${microcopy.color}33`
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: microcopy.color, flexShrink: 0 }} />
            <AppText style={{ fontSize: 12, color: microcopy.color, fontWeight: '600', flex: 1 }}>{microcopy.text}</AppText>
          </View>
        )}

        {/* ── Tentative time badge (live queue delay) ── */}
        {isUpcoming && booking.delayMinutes > 0 && booking.tentativeTime && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1, backgroundColor: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.25)' }}>
            <Ionicons name="time-outline" size={13} color="#d97706" />
            <AppText style={{ fontSize: 12, color: '#d97706', fontWeight: '700' }}>
              Tentative: {formatTimeLabel(booking.tentativeTime)} <AppText style={{ fontWeight: '500' }}>(running {booking.delayMinutes} min late)</AppText>
            </AppText>
          </View>
        )}

        {/* ── Pay Now banner ── */}
        {booking.paymentStatus === 'pending' && booking.paymentMethod && booking.paymentMethod !== 'cash' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' }}>
            <AppText style={{ fontSize: 12, color: '#d97706', fontWeight: '600' }}>Payment pending · ₹{booking.totalAmount}</AppText>
            <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#d97706', borderRadius: 7 }}>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Pay Now</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Review prompt ── */}
        {canReview && <ReviewPrompt bookingId={booking._id} onReviewed={() => setReviewed(true)} theme={theme} />}
        {reviewed && (
          <View style={{ padding: 10, backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' }}>
            <AppText style={{ fontSize: 12, color: '#34d399' }}>Thank you for your review!</AppText>
          </View>
        )}

        {/* ── Action buttons ── */}
        {(isUpcoming || !!salonPhone || !!mapsUrl || status === 'completed') && (
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: theme?.border || '#334155', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHAT_OPEN_LIST.includes(status) && (
              <TouchableOpacity onPress={() => setChatOpen(true)} activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
                <Ionicons name="chatbubble-outline" size={13} color="#818cf8" />
                <AppText style={{ fontSize: 12, fontWeight: '600', color: '#818cf8' }}>Chat</AppText>
              </TouchableOpacity>
            )}
            {canReschedule && (
              <TouchableOpacity onPress={() => setRescheduleOpen(true)} activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
                <Ionicons name="calendar-outline" size={13} color="#818cf8" />
                <AppText style={{ fontSize: 12, fontWeight: '600', color: '#818cf8' }}>Reschedule</AppText>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity onPress={handleCancel} disabled={cancelling} activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(248,113,113,0.07)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', opacity: cancelling ? 0.5 : 1 }}>
                <AppText style={{ fontSize: 12, fontWeight: '600', color: '#f87171' }}>{cancelling ? '…' : 'Cancel'}</AppText>
              </TouchableOpacity>
            )}
            {!!salonPhone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${salonPhone}`)} activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(52,211,153,0.07)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' }}>
                <Ionicons name="call-outline" size={13} color="#34d399" />
                <AppText style={{ fontSize: 12, fontWeight: '600', color: '#34d399' }}>Call</AppText>
              </TouchableOpacity>
            )}
            {!!mapsUrl && (
              <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)} activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(96,165,250,0.07)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)' }}>
                <Ionicons name="navigate-outline" size={13} color="#60a5fa" />
                <AppText style={{ fontSize: 12, fontWeight: '600', color: '#60a5fa' }}>Directions</AppText>
              </TouchableOpacity>
            )}
            {status === 'completed' && (
              <TouchableOpacity activeOpacity={0.8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' }}>
                <Ionicons name="repeat-outline" size={13} color="#818cf8" />
                <AppText style={{ fontSize: 12, fontWeight: '600', color: '#818cf8' }}>Rebook</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {rescheduleOpen && (
        <RescheduleModal booking={booking} onClose={() => setRescheduleOpen(false)} onRescheduled={handleRescheduled} theme={theme} />
      )}
      {chatOpen && (
        <ChatModal booking={booking} onClose={() => setChatOpen(false)} theme={theme} />
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function BookingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const { unreadCount } = useNotifications();

  const firstName = (user?.name || user?.firstName || 'there').split(' ')[0];

  const [filter, setFilter]               = useState('Upcoming');
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [userCoords, setUserCoords]       = useState(null);
  const [confirmedToasts, setConfirmedToasts] = useState([]);
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);
  const prevStatusRef = useRef({});

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
          .then(pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
          .catch(() => {});
      }
    });
  }, []);

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) loadBookings();
    return () => { setVisibleCount(PAGE_SIZE); };
  }, [isAuthenticated]));

  const loadBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/customer/bookings');
      const fresh = res.data.data?.bookings || res.data.data || [];
      const arr = Array.isArray(fresh) ? fresh : [];
      const newlyConfirmed = arr.filter(
        b => b._id && prevStatusRef.current[b._id] === 'pending' && b.status === 'confirmed'
      );
      if (newlyConfirmed.length > 0) {
        setConfirmedToasts(prev => [...prev, ...newlyConfirmed.map(b => b._id)]);
        setFilter('Upcoming');
      }
      arr.forEach(b => { if (b._id) prevStatusRef.current[b._id] = b.status; });
      setBookings(arr);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings(true);
    setRefreshing(false);
  };

  const handleCancelled = (id) => {
    setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
  };

  // ── Computed stats ──────────────────────────────────────────
  const stats = {
    total:      bookings.length,
    upcoming:   bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    completed:  bookings.filter(b => b.status === 'completed').length,
    totalSpent: bookings.filter(b => b.status === 'completed' && b.totalAmount != null).reduce((s, b) => s + b.totalAmount, 0)
  };

  const filterCounts = {
    Upcoming:  bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    Completed: bookings.filter(b => b.status === 'completed').length,
    Cancelled: bookings.filter(b => b.status === 'cancelled').length,
    All:       bookings.length
  };

  const nextUpcoming = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status))
    .sort((a, b) => {
      const da = new Date(String(a.appointmentDate).slice(0,10)+'T'+(a.appointmentTime||'12:00')+':00');
      const db = new Date(String(b.appointmentDate).slice(0,10)+'T'+(b.appointmentTime||'12:00')+':00');
      return da - db;
    })[0] || null;

  const lastCompleted = bookings.find(b => b.status === 'completed');

  // Insights
  const salonFreq = bookings.reduce((acc, b) => {
    const name = b.salonName || b.salonId?.name;
    if (name) acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const favSalon = Object.entries(salonFreq).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

  const serviceFreq = bookings.reduce((acc, b) => {
    const name = b.serviceName || (Array.isArray(b.serviceIds) ? b.serviceIds[0]?.name : null);
    if (name) acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const favService = Object.entries(serviceFreq).sort((a,b) => b[1]-a[1])[0]?.[0] || null;

  const thisMonthVisits = bookings.filter(b => {
    const d = new Date(b.appointmentDate || b.createdAt);
    const now = new Date();
    return b.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const filtered = bookings.filter(b => {
    if (filter === 'All')       return true;
    if (filter === 'Upcoming')  return ['pending', 'confirmed', 'in_progress'].includes(b.status);
    if (filter === 'Completed') return b.status === 'completed';
    if (filter === 'Cancelled') return b.status === 'cancelled';
    return true;
  });

  const visible  = filtered.slice(0, visibleCount);
  const hasMore  = visibleCount < filtered.length;

  // ── Not authenticated ───────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top + 60, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Ionicons name="calendar-outline" size={40} color="#fff" />
        </View>
        <AppText style={{ fontSize: 22, fontWeight: '900', color: theme.text, marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' }}>
          Your bookings, one place
        </AppText>
        <AppText style={{ fontSize: 14, color: theme.subText, textAlign: 'center', lineHeight: 22, marginBottom: 28, maxWidth: 260 }}>
          Track all your salon appointments, rebook favourites, and never miss a slot.
        </AppText>
        <TouchableOpacity style={{ backgroundColor: '#4f46e5', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 14 }} onPress={() => navigation.navigate('Auth')} activeOpacity={0.85}>
          <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Sign In →</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  // ── HERO ────────────────────────────────────────────────────
  const HeroSection = (
    <View style={{ backgroundColor: '#1e1b4b', paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: 24, overflow: 'hidden' }}>
      {/* Decorative circles */}
      <View style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(139,92,246,0.18)' }} />
      <View style={{ position: 'absolute', bottom: -50, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(99,102,241,0.14)' }} />

      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <View>
          <AppText style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>
            My Bookings
          </AppText>
          <AppText style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 3 }}>
            Welcome back, {firstName}
          </AppText>
          <AppText style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Ready for your next look?</AppText>
        </View>
        <TouchableOpacity
          style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => navigation.getParent()?.navigate('HomeTab', { screen: 'Notifications' })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {unreadCount > 0 && (
            <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#1e1b4b' }}>
              <AppText style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 4 Stat cards */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Upcoming',  value: loading ? '—' : stats.upcoming,  icon: 'calendar-outline',   accent: false },
          { label: 'Completed', value: loading ? '—' : stats.completed, icon: 'checkmark-circle-outline', accent: false },
          { label: 'Total',     value: loading ? '—' : stats.total,     icon: 'list-outline',       accent: false },
          { label: 'Spent',     value: loading ? '—' : `₹${stats.totalSpent}`, icon: 'wallet-outline', accent: true },
        ].map(({ label, value, icon, accent }) => (
          <View key={label} style={{ flex: 1, backgroundColor: accent ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.09)', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: accent ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.14)' }}>
            <Ionicons name={icon} size={16} color={accent ? '#fde68a' : 'rgba(255,255,255,0.8)'} style={{ marginBottom: 3 }} />
            <AppText style={{ fontSize: label === 'Spent' ? 12 : 18, fontWeight: '900', color: accent ? '#fde68a' : '#fff', marginBottom: 2 }} numberOfLines={1}>{value}</AppText>
            <AppText style={{ fontSize: 10, color: accent ? 'rgba(253,230,138,0.7)' : 'rgba(255,255,255,0.55)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</AppText>
          </View>
        ))}
      </View>

      {/* Next upcoming banner */}
      {!loading && nextUpcoming && (
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ionicons name="cut-outline" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 12, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
                {nextUpcoming.serviceName || (Array.isArray(nextUpcoming.serviceIds) ? nextUpcoming.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') || 'Service'}
              </AppText>
              <AppText style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }} numberOfLines={1}>
                {nextUpcoming.salonName || nextUpcoming.salonId?.name} · {formatDateLabel(nextUpcoming.appointmentDate)}{nextUpcoming.appointmentTime ? ` · ${formatTimeLabel(nextUpcoming.appointmentTime)}` : ''}
              </AppText>
            </View>
          </View>
          <StatusBadge status={nextUpcoming.status} />
        </View>
      )}
    </View>
  );

  // ── QUICK ACTIONS ────────────────────────────────────────────
  const QuickActions = (
    <View style={{ backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#4f46e5', borderRadius: 12 }}>
          <Ionicons name="add" size={16} color="#fff" />
          <AppText style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Book New</AppText>
        </TouchableOpacity>
        {lastCompleted && (
          <TouchableOpacity activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
            <Ionicons name="repeat-outline" size={14} color={theme.subText} />
            <AppText style={{ fontSize: 13, fontWeight: '600', color: theme.subText }}>Rebook Last</AppText>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.cardAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
          <Ionicons name="location-outline" size={14} color={theme.subText} />
          <AppText style={{ fontSize: 13, fontWeight: '600', color: theme.subText }}>Explore Salons</AppText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // ── LIST HEADER ──────────────────────────────────────────────
  const ListHeader = (
    <View style={{ gap: 0 }}>
      {HeroSection}
      {QuickActions}
      <View style={{ padding: 16, gap: 10 }}>

        {/* Confirmed toasts */}
        {confirmedToasts.map(id => {
          const b = bookings.find(x => x._id === id);
          if (!b) return null;
          return (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)', borderRadius: 12, gap: 8, marginBottom: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="checkmark-circle" size={22} color="#34d399" />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 13, fontWeight: '700', color: '#34d399' }}>Booking Confirmed!</AppText>
                  <AppText style={{ fontSize: 11, color: 'rgba(52,211,153,0.8)', marginTop: 1 }} numberOfLines={1}>
                    {b.serviceName} at {b.salonName || b.salonId?.name} — {b.appointmentTime}
                  </AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => setConfirmedToasts(prev => prev.filter(t => t !== id))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color="#34d399" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Filter tabs with count badges */}
        <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 13, padding: 4, borderWidth: 1, borderColor: theme.border, gap: 3 }}>
          {FILTERS.map(f => {
            const count = filterCounts[f] || 0;
            const active = filter === f;
            return (
              <TouchableOpacity key={f}
                style={{ flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: active ? '#4f46e5' : 'transparent', flexDirection: 'row', gap: 3 }}
                onPress={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
              >
                <AppText style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : theme.subText }}>{f}</AppText>
                {count > 0 && (
                  <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 99, backgroundColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)' }}>
                    <AppText style={{ fontSize: 9, fontWeight: '800', color: active ? '#fff' : '#818cf8' }}>{count}</AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  // ── FOOTER (Insights + CTA) ──────────────────────────────────
  const ListFooter = (
    <View style={{ paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}>
      {/* Load more */}
      {hasMore && (
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }}
          onPress={() => setVisibleCount(c => c + PAGE_SIZE)}
          activeOpacity={0.8}
        >
          <AppText style={{ fontSize: 14, fontWeight: '700', color: '#818cf8' }}>Load More</AppText>
          <Ionicons name="chevron-down" size={16} color="#818cf8" />
        </TouchableOpacity>
      )}
      {!hasMore && filtered.length > PAGE_SIZE && (
        <AppText style={{ textAlign: 'center', fontSize: 12, color: theme.subText, marginTop: 4 }}>
          All {filtered.length} bookings shown
        </AppText>
      )}

      {/* Insights */}
      {bookings.length > 0 && (
        <View style={{ backgroundColor: theme.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.border, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trending-up-outline" size={16} color="#818cf8" />
            <AppText style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>Your Insights</AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: theme.cardAlt, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
              <AppText style={{ fontSize: 22, fontWeight: '900', color: '#818cf8', marginBottom: 2 }}>{thisMonthVisits}</AppText>
              <AppText style={{ fontSize: 10, color: theme.subText, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' }}>This Month</AppText>
            </View>
            <View style={{ flex: 1, backgroundColor: theme.cardAlt, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
              <Ionicons name="heart-outline" size={16} color="#f87171" style={{ marginBottom: 3 }} />
              <AppText style={{ fontSize: 10, color: theme.subText, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', marginBottom: 3 }}>Fav Salon</AppText>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.text, textAlign: 'center' }} numberOfLines={2}>{favSalon || '—'}</AppText>
            </View>
            <View style={{ flex: 1, backgroundColor: theme.cardAlt, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
              <Ionicons name="cut-outline" size={16} color="#60a5fa" style={{ marginBottom: 3 }} />
              <AppText style={{ fontSize: 10, color: theme.subText, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center', marginBottom: 3 }}>Top Service</AppText>
              <AppText style={{ fontSize: 11, fontWeight: '700', color: theme.text, textAlign: 'center' }} numberOfLines={2}>{favService || '—'}</AppText>
            </View>
          </View>
        </View>
      )}

      {/* CTA */}
      <View style={{ backgroundColor: '#1e1b4b', borderRadius: 20, padding: 22, overflow: 'hidden', position: 'relative' }}>
        <View style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(139,92,246,0.18)' }} />
        <AppText style={{ fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 5, letterSpacing: -0.3 }}>
          Book your next appointment now
        </AppText>
        <AppText style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
          No waiting, no hassle — instant confirmation
        </AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} activeOpacity={0.85}
            style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 11 }}>
            <AppText style={{ fontSize: 13, fontWeight: '700', color: '#4f46e5' }}>Book Now</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} activeOpacity={0.85}
            style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
            <AppText style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Explore Salons</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        data={loading ? [] : visible}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <BookingCard
              booking={item}
              userCoords={userCoords}
              onCancelled={handleCancelled}
              theme={theme}
              isNext={nextUpcoming?._id === item._id && filter === 'Upcoming'}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ backgroundColor: theme.card, borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.border }} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ height: 14, backgroundColor: theme.border, borderRadius: 7, width: '70%' }} />
                      <View style={{ height: 12, backgroundColor: theme.border, borderRadius: 6, width: '45%' }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[1,2,3].map(j => <View key={j} style={{ flex: 1, height: 54, backgroundColor: theme.border, borderRadius: 10 }} />)}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 48, gap: 14 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={filter === 'Completed' ? 'checkmark-circle-outline' : filter === 'Cancelled' ? 'close-circle-outline' : 'calendar-outline'} size={40} color="#818cf8" />
              </View>
              <AppText style={{ fontSize: 20, fontWeight: '900', color: theme.text, letterSpacing: -0.3, textAlign: 'center' }}>
                {filter === 'All' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
              </AppText>
              <AppText style={{ fontSize: 14, color: theme.subText, textAlign: 'center', lineHeight: 22, maxWidth: 260 }}>
                {filter === 'All' ? 'Find top-rated salons near you and book your first appointment!' : 'Nothing here right now — check another tab.'}
              </AppText>
              {(filter === 'All' || filter === 'Upcoming') && (
                <TouchableOpacity style={{ marginTop: 4, backgroundColor: '#4f46e5', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 }} onPress={() => navigation.navigate('HomeTab')} activeOpacity={0.85}>
                  <AppText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Explore Salons →</AppText>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        ListFooterComponent={ListFooter}
      />
    </View>
  );
}
