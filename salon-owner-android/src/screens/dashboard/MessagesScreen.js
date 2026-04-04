import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

// ── helpers ──────────────────────────────────────────────────────────
function initials(name = '') {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000)      return 'Just now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diff < 604_800_000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtMsgTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDateSep(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86_400_000) return 'Today';
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
         da.getMonth()    === db.getMonth()    &&
         da.getDate()     === db.getDate();
}

const AVATAR_COLORS = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const STATUS_COLOR = {
  pending:   '#d97706',
  confirmed: '#059669',
  completed: '#2563eb',
  cancelled: '#dc2626',
};
const STATUS_BG = {
  pending:   '#fef3c7',
  confirmed: '#d1fae5',
  completed: '#dbeafe',
  cancelled: '#fee2e2',
};

// ── Avatar ────────────────────────────────────────────────────────────
function Avatar({ name, size = 40, hasUnread = false }) {
  return (
    <View style={[aStyles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) }]}>
      <Text style={[aStyles.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
      {hasUnread && <View style={aStyles.dot} />}
    </View>
  );
}
const aStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '800' },
  dot:  { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', borderWidth: 1.5, borderColor: '#fff' },
});

// ── Thread row ────────────────────────────────────────────────────────
function ThreadRow({ thread, onPress, theme, isDark }) {
  const { booking, latestMessage, unreadCount } = thread;
  const name    = booking?.customerName || 'Customer';
  const preview = latestMessage?.text || '';
  const isOwner = latestMessage?.senderRole === 'owner';
  const status  = booking?.status || 'pending';
  const s = StyleSheet.create({
    row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card, gap: 12 },
    right:   { flex: 1 },
    topRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    name:    { fontSize: 14, fontWeight: '700', color: theme.text, flex: 1 },
    time:    { fontSize: 11, color: theme.subText },
    preview: { fontSize: 12, color: unreadCount > 0 ? theme.text : theme.subText, fontWeight: unreadCount > 0 ? '600' : '400', flex: 1 },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    badge:   { backgroundColor: '#6366f1', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    badgeTx: { color: '#fff', fontSize: 10, fontWeight: '700' },
    chip:    { backgroundColor: STATUS_BG[status], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
    chipTx:  { fontSize: 10, fontWeight: '700', color: STATUS_COLOR[status] },
    svcRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    svcTx:   { fontSize: 11, color: theme.subText },
  });
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={name} size={46} hasUnread={unreadCount > 0} />
      <View style={s.right}>
        <View style={s.topRow}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <Text style={s.time}>{fmtTime(latestMessage?.createdAt)}</Text>
        </View>
        <View style={s.previewRow}>
          <Text style={s.preview} numberOfLines={1}>
            {isOwner ? 'You: ' : ''}{preview}
          </Text>
          {unreadCount > 0 && (
            <View style={s.badge}><Text style={s.badgeTx}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </View>
        <View style={s.svcRow}>
          {booking?.serviceName && (
            <><Ionicons name="cut-outline" size={11} color={theme.subText} /><Text style={s.svcTx} numberOfLines={1}>{booking.serviceName}</Text></>
          )}
          {booking?.status && (
            <View style={[s.chip, { marginLeft: 'auto' }]}><Text style={s.chipTx}>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Message bubble ────────────────────────────────────────────────────
function Bubble({ msg, isOwner, showTime, theme, isDark }) {
  return (
    <View style={[bStyles.row, isOwner ? bStyles.rowOwner : bStyles.rowCustomer]}>
      <View style={[bStyles.bubble, isOwner ? bStyles.bubbleOwner : [bStyles.bubbleCustomer, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: theme.border }]]}>
        <Text style={[bStyles.text, isOwner ? bStyles.textOwner : { color: theme.text }]}>{msg.text}</Text>
      </View>
      {showTime && (
        <View style={[bStyles.timeRow, isOwner ? bStyles.timeRowOwner : bStyles.timeRowCustomer]}>
          <Text style={[bStyles.time, { color: theme.subText }]}>{fmtMsgTime(msg.createdAt)}</Text>
          {isOwner && (
            <Ionicons name={msg.readAt ? 'checkmark-done' : 'checkmark'} size={12} color={msg.readAt ? '#818cf8' : theme.subText} />
          )}
        </View>
      )}
    </View>
  );
}
const bStyles = StyleSheet.create({
  row:            { marginBottom: 2, maxWidth: '75%' },
  rowOwner:       { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowCustomer:    { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:         { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleOwner:    { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  bubbleCustomer: { borderWidth: 1, borderBottomLeftRadius: 4 },
  text:           { fontSize: 14, lineHeight: 20 },
  textOwner:      { color: '#fff' },
  timeRow:        { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  timeRowOwner:   { alignSelf: 'flex-end' },
  timeRowCustomer:{ alignSelf: 'flex-start' },
  time:           { fontSize: 10 },
});

// ── Date separator ────────────────────────────────────────────────────
function DateSep({ label, theme }) {
  return (
    <View style={[dsStyles.row]}>
      <View style={[dsStyles.line, { backgroundColor: theme.border }]} />
      <Text style={[dsStyles.label, { color: theme.subText }]}>{label}</Text>
      <View style={[dsStyles.line, { backgroundColor: theme.border }]} />
    </View>
  );
}
const dsStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  line:  { flex: 1, height: 1 },
  label: { fontSize: 11, fontWeight: '600', paddingHorizontal: 10 },
});

// ── Chat view ─────────────────────────────────────────────────────────
function ChatView({ thread, onBack, onSent, theme, isDark }) {
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const flatRef  = useRef(null);
  const bookingId = thread?.bookingId?.toString();
  const insets   = useSafeAreaInsets();

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await api.get(`/owner/bookings/${bookingId}/messages`);
      setMessages(res.data?.data?.messages || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => {
    setLoading(true); setMessages([]);
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true); setText('');
    const opt = { _id: `opt_${Date.now()}`, text: trimmed, senderRole: 'owner', createdAt: new Date().toISOString(), readAt: null };
    setMessages(prev => [...prev, opt]);
    try {
      const res = await api.post(`/owner/bookings/${bookingId}/messages`, { text: trimmed });
      const saved = res.data?.data;
      setMessages(prev => prev.map(m => m._id === opt._id ? (saved || opt) : m));
      if (onSent) onSent(bookingId, trimmed);
    } catch {
      setMessages(prev => prev.filter(m => m._id !== opt._id));
      setText(trimmed);
    } finally { setSending(false); }
  };

  // Group for bubble styling
  const grouped = messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const samePrev = prev && prev.senderRole === m.senderRole && isSameDay(prev.createdAt, m.createdAt);
    const sameNext = next && next.senderRole === m.senderRole && isSameDay(next.createdAt, m.createdAt);
    const showDateSep = !prev || !isSameDay(prev.createdAt, m.createdAt);
    return { ...m, showDateSep, showTime: !sameNext };
  });

  const booking   = thread?.booking || {};
  const name      = booking?.customerName || 'Customer';
  const status    = booking?.status || 'pending';
  const isClosed  = ['completed', 'cancelled'].includes(status);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
      {/* Chat header */}
      <View style={[cvStyles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} style={cvStyles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Avatar name={name} size={36} />
        <View style={cvStyles.headerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[cvStyles.headerName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
            <View style={[cvStyles.statusChip, { backgroundColor: STATUS_BG[status] }]}>
              <Text style={[cvStyles.statusText, { color: STATUS_COLOR[status] }]}>{status}</Text>
            </View>
          </View>
          {booking?.serviceName && (
            <Text style={[cvStyles.headerSub, { color: theme.subText }]} numberOfLines={1}>
              <Ionicons name="cut-outline" size={11} /> {booking.serviceName}
              {booking?.appointmentTime ? `  ·  ${booking.appointmentTime}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={[cvStyles.loadingText, { color: theme.subText }]}>Loading messages…</Text>
        </View>
      ) : (
        <ScrollView
          ref={flatRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        >
          {grouped.length === 0 && (
            <View style={cvStyles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={36} color={theme.subText} />
              <Text style={[cvStyles.emptyChatText, { color: theme.subText }]}>No messages yet</Text>
            </View>
          )}
          {grouped.map((m, i) => (
            <View key={m._id || i}>
              {m.showDateSep && <DateSep label={fmtDateSep(m.createdAt)} theme={theme} />}
              <Bubble msg={m} isOwner={m.senderRole === 'owner'} showTime={m.showTime} theme={theme} isDark={isDark} />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={[cvStyles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom || 8 }]}>
          {isClosed ? (
            <View style={[cvStyles.closedBanner, { backgroundColor: theme.cardAlt }]}>
              <Text style={[cvStyles.closedText, { color: theme.subText }]}>Chat closed — booking is {status}</Text>
            </View>
          ) : (
            <>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                placeholderTextColor={theme.subText}
                multiline
                style={[cvStyles.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: theme.text, borderColor: theme.border }]}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!text.trim() || sending}
                style={[cvStyles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
              >
                {sending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const cvStyles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn:     { padding: 2 },
  headerInfo:  { flex: 1 },
  headerName:  { fontSize: 15, fontWeight: '700', flex: 1 },
  headerSub:   { fontSize: 11, marginTop: 1 },
  statusChip:  { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  loadingText: { marginTop: 10, fontSize: 13 },
  emptyChat:   { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyChatText:{ fontSize: 14 },
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  input:       { flex: 1, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, maxHeight: 100 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  closedBanner:{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  closedText:  { fontSize: 13, fontWeight: '500' },
});

// ── Main Messages screen ──────────────────────────────────────────────
export default function MessagesScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [threads,      setThreads]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [activeThread, setActiveThread] = useState(null); // null = list view

  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let data = [];
      try {
        const res = await api.get('/owner/messages/threads');
        data = res.data?.data || [];
      } catch (e) {
        if (e?.response?.status === 404) {
          const res = await api.get('/owner/messages/unread');
          const msgs = res.data?.data?.messages || [];
          const map = new Map();
          msgs.forEach((m) => {
            const key = m.bookingId?.toString();
            if (!key) return;
            if (!map.has(key)) {
              map.set(key, { bookingId: m.bookingId, booking: m.booking || null, latestMessage: m, unreadCount: 0, totalCount: 0 });
            }
            const t = map.get(key);
            t.totalCount++; t.unreadCount++;
            if (new Date(m.createdAt) >= new Date(t.latestMessage.createdAt)) t.latestMessage = m;
          });
          data = [...map.values()].sort((a, b) => new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt));
        }
      }
      setThreads(data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const handleSelectThread = (thread) => {
    setActiveThread(thread);
    setThreads(prev => prev.map(t =>
      t.bookingId?.toString() === thread.bookingId?.toString() ? { ...t, unreadCount: 0 } : t
    ));
  };

  const handleSent = (bookingId, text) => {
    setThreads(prev => prev.map(t =>
      t.bookingId?.toString() === bookingId
        ? { ...t, latestMessage: { ...t.latestMessage, text, senderRole: 'owner', createdAt: new Date().toISOString() } }
        : t
    ));
  };

  const totalUnread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);

  const filtered = threads.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (t.booking?.customerName || '').toLowerCase().includes(q) ||
           (t.booking?.serviceName  || '').toLowerCase().includes(q) ||
           (t.latestMessage?.text   || '').toLowerCase().includes(q);
  });

  // Chat view
  if (activeThread) {
    return (
      <ChatView
        thread={activeThread}
        onBack={() => setActiveThread(null)}
        onSent={handleSent}
        theme={theme}
        isDark={isDark}
      />
    );
  }

  // Thread list
  return (
    <View style={[mStyles.container, { backgroundColor: theme.card, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[mStyles.header, { borderBottomColor: theme.border }]}>
        <View style={mStyles.headerLeft}>
          <View style={mStyles.headerIcon}>
            <Ionicons name="chatbubbles" size={18} color="#fff" />
          </View>
          <Text style={[mStyles.headerTitle, { color: theme.text }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={mStyles.unreadBadge}>
              <Text style={mStyles.unreadBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => fetchThreads(true)} style={mStyles.refreshBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh" size={20} color={loading ? '#6366f1' : theme.subText} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[mStyles.searchWrap, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={16} color={theme.subText} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations…"
          placeholderTextColor={theme.subText}
          style={[mStyles.searchInput, { color: theme.text }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={theme.subText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Thread list */}
      {loading ? (
        <View style={mStyles.center}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={[mStyles.loadingText, { color: theme.subText }]}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={mStyles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color={theme.subText} />
          <Text style={[mStyles.emptyTitle, { color: theme.text }]}>
            {search ? 'No results' : 'No conversations yet'}
          </Text>
          <Text style={[mStyles.emptySub, { color: theme.subText }]}>
            {search ? 'Try a different search' : 'Customer messages will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => t.bookingId?.toString()}
          renderItem={({ item }) => (
            <ThreadRow thread={item} onPress={() => handleSelectThread(item)} theme={theme} isDark={isDark} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon:   { width: 32, height: 32, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '800' },
  unreadBadge:  { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  unreadBadgeText:{ color: '#fff', fontSize: 11, fontWeight: '700' },
  refreshBtn:   { padding: 4 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput:  { flex: 1, fontSize: 14 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText:  { fontSize: 13, marginTop: 8 },
  emptyTitle:   { fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptySub:     { fontSize: 13 },
});
