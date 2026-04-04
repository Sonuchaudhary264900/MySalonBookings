import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Search, Send, ArrowLeft, Check, CheckCheck,
  Calendar, Clock, Scissors, Loader2, X, ChevronRight, Zap,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';

/* ─── helpers ────────────────────────────────────────────────── */
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
  const da = new Date(a); const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-purple-500 to-fuchsia-600',
];

function avatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

const STATUS_CFG = {
  pending:   { label: 'Pending',   cls: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' },
  completed: { label: 'Completed', cls: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400' },
};

/* ─── Avatar ─────────────────────────────────────────────────── */
const Avatar = ({ name, size = 'md', pulse = false }) => {
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : size === 'sm' ? 'w-8 h-8 text-[11px]' : 'w-10 h-10 text-sm';
  return (
    <div className={`relative shrink-0 ${sz} rounded-full bg-gradient-to-br ${avatarGradient(name)}
      flex items-center justify-center font-bold text-white shadow-md`}>
      {initials(name)}
      {pulse && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900" />
      )}
    </div>
  );
};

/* ─── Thread row ─────────────────────────────────────────────── */
const ThreadRow = ({ thread, active, onClick }) => {
  const { booking, latestMessage, unreadCount } = thread;
  const name    = booking?.customerName || 'Customer';
  const preview = latestMessage?.text || '';
  const isOwner = latestMessage?.senderRole === 'owner';
  const status  = STATUS_CFG[booking?.status] || STATUS_CFG.pending;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-all duration-150 relative
        ${active
          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-r-2 border-indigo-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-r-2 border-transparent'
        }`}
    >
      <Avatar name={name} pulse={unreadCount > 0} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={`text-sm truncate font-semibold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
            {name}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
            {fmtTime(latestMessage?.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <p className={`text-xs flex-1 truncate ${unreadCount > 0 ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
            {isOwner && <span className="text-indigo-400 dark:text-indigo-500 mr-1">You:</span>}
            {preview}
          </p>
          {unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {booking?.serviceName && (
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{booking.serviceName}</span>
            <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${status.cls}`}>
              {status.label}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

/* ─── Message bubble ─────────────────────────────────────────── */
const Bubble = ({ msg, isOwner, showTime, isFirst, isLast }) => {
  return (
    <div className={`flex items-end gap-2 ${isOwner ? 'flex-row-reverse' : 'flex-row'} mb-0.5`}>
      {/* spacer to align owner side */}
      {!isOwner && <div className="w-6 shrink-0" />}

      <div className={`max-w-[72%] group relative`}>
        <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isOwner
            ? `bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20
               ${isFirst ? 'rounded-t-2xl' : 'rounded-tl-2xl rounded-tr-md'}
               ${isLast  ? 'rounded-b-2xl rounded-tr-2xl' : 'rounded-tr-md rounded-b-2xl'}`
            : `bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm
               border border-gray-100 dark:border-gray-700
               ${isFirst ? 'rounded-t-2xl' : 'rounded-tl-md rounded-tr-2xl'}
               ${isLast  ? 'rounded-b-2xl rounded-tl-2xl' : 'rounded-tl-md rounded-b-2xl'}`
          }`}>
          {msg.text}
        </div>
        {showTime && (
          <div className={`flex items-center gap-1 mt-1 ${isOwner ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{fmtMsgTime(msg.createdAt)}</span>
            {isOwner && (
              msg.readAt
                ? <CheckCheck className="w-3 h-3 text-indigo-400" />
                : <Check className="w-3 h-3 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {isOwner && <div className="w-6 shrink-0" />}
    </div>
  );
};

/* ─── Date separator ─────────────────────────────────────────── */
const DateSep = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
    <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 px-2">{label}</span>
    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
  </div>
);

/* ─── Empty thread state ─────────────────────────────────────── */
const EmptyThread = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100
        dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center shadow-lg">
        <MessageSquare className="w-12 h-12 text-indigo-400 dark:text-indigo-500" />
      </div>
      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
        flex items-center justify-center shadow-md">
        <Zap className="w-4 h-4 text-white" />
      </div>
    </div>
    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Pick a conversation</h3>
    <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
      Select a customer conversation from the list to view and reply to messages
    </p>
  </div>
);

/* ─── Empty inbox state ──────────────────────────────────────── */
const EmptyInbox = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200
      dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-4">
      <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-500" />
    </div>
    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No conversations yet</p>
    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
      Customer messages will appear here
    </p>
  </div>
);

/* ─── Chat header ────────────────────────────────────────────── */
const ChatHeader = ({ thread, onBack }) => {
  const { booking } = thread;
  const name   = booking?.customerName || 'Customer';
  const status = STATUS_CFG[booking?.status] || STATUS_CFG.pending;

  const fmtAppt = () => {
    const parts = [];
    if (booking?.appointmentDate)
      parts.push(new Date(booking.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
    if (booking?.appointmentTime) parts.push(booking.appointmentTime);
    return parts.join(' · ');
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800/60
      bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shrink-0">
      {/* Back button — mobile only */}
      <button
        onClick={onBack}
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl
          text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <Avatar name={name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{name}</p>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {booking?.serviceName && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <Scissors className="w-3 h-3" />{booking.serviceName}
            </span>
          )}
          {fmtAppt() && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <Calendar className="w-3 h-3" />{fmtAppt()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Full chat view ─────────────────────────────────────────── */
const ChatView = ({ thread, onBack, onSent }) => {
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const bookingId  = thread?.bookingId?.toString();

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await api.get(`/owner/bookings/${bookingId}/messages`);
      setMessages(res.data?.data?.messages || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    const optimistic = { _id: `opt_${Date.now()}`, text: trimmed, senderRole: 'owner', createdAt: new Date().toISOString(), readAt: null };
    setMessages(prev => [...prev, optimistic]);
    try {
      const res = await api.post(`/owner/bookings/${bookingId}/messages`, { text: trimmed });
      const saved = res.data?.data;
      setMessages(prev => prev.map(m => m._id === optimistic._id ? (saved || optimistic) : m));
      if (onSent) onSent(bookingId, trimmed);
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setText(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Group messages for bubble rounding (consecutive same-sender msgs)
  const grouped = messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const samePrev = prev && prev.senderRole === m.senderRole && isSameDay(prev.createdAt, m.createdAt);
    const sameNext = next && next.senderRole === m.senderRole && isSameDay(next.createdAt, m.createdAt);
    const showDateSep = !prev || !isSameDay(prev.createdAt, m.createdAt);
    const isFirst = !samePrev;
    const isLast  = !sameNext;
    return { ...m, showDateSep, isFirst, isLast, showTime: isLast };
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <ChatHeader thread={thread} onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-xs text-gray-400">Loading messages…</p>
          </div>
        </div>
      </div>
    );
  }

  const isClosed = ['completed', 'cancelled'].includes(thread?.booking?.status);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatHeader thread={thread} onBack={onBack} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4
        bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.04),_transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(167,139,250,0.04),_transparent_60%)]
        dark:bg-gray-950">
        {grouped.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <MessageSquare className="w-8 h-8 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-300 dark:text-gray-600">Start the conversation below</p>
          </div>
        )}
        {grouped.map((m, i) => (
          <div key={m._id || i}>
            {m.showDateSep && <DateSep label={fmtDateSep(m.createdAt)} />}
            <Bubble
              msg={m}
              isOwner={m.senderRole === 'owner'}
              showTime={m.showTime}
              isFirst={m.isFirst}
              isLast={m.isLast}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800/60
        bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl
            bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              Chat closed — booking is {thread.booking?.status}
            </span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Type a message…"
                className="w-full px-4 py-3 pr-4 rounded-2xl border border-gray-200 dark:border-gray-700
                  bg-gray-50 dark:bg-gray-800/60 text-sm text-gray-800 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
                  resize-none transition-all leading-relaxed"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600
                flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25
                hover:from-indigo-700 hover:to-violet-700 active:scale-95
                transition-all disabled:opacity-40 disabled:scale-100"
            >
              {sending
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Messages page ──────────────────────────────────────────── */
export default function Messages() {
  const [threads,         setThreads]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState('');
  const [activeThread,    setActiveThread]    = useState(null);
  const [mobileView,      setMobileView]      = useState('list'); // 'list' | 'chat'
  const { markChatRead }                      = useNotifications();

  const fetchThreads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/owner/messages/threads');
      setThreads(res.data?.data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const handleSelectThread = (thread) => {
    setActiveThread(thread);
    setMobileView('chat');
    markChatRead(thread.bookingId?.toString());
    // Clear unread locally
    setThreads(prev => prev.map(t =>
      t.bookingId?.toString() === thread.bookingId?.toString()
        ? { ...t, unreadCount: 0 }
        : t
    ));
  };

  const handleSent = (bookingId, text) => {
    setThreads(prev => prev.map(t =>
      t.bookingId?.toString() === bookingId
        ? { ...t, latestMessage: { ...t.latestMessage, text, senderRole: 'owner', createdAt: new Date().toISOString() } }
        : t
    ));
  };

  const filtered = threads.filter(t => {
    if (!search.trim()) return true;
    const name    = t.booking?.customerName || '';
    const service = t.booking?.serviceName  || '';
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || service.toLowerCase().includes(q) || (t.latestMessage?.text || '').toLowerCase().includes(q);
  });

  const totalUnread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);

  return (
    <DashboardLayout>
      {/* ── Page shell: full viewport height ── */}
      <div className="flex h-[calc(100dvh-theme(spacing.16)-theme(spacing.8))] md:h-[calc(100dvh-theme(spacing.16)-theme(spacing.12))] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-950">

        {/* ════ LEFT: conversation list ════ */}
        <div className={`
          flex flex-col w-full md:w-[340px] shrink-0
          border-r border-gray-100 dark:border-gray-800/60
          bg-white dark:bg-gray-950
          ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        `}>

          {/* List header */}
          <div className="shrink-0 px-4 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Messages</h1>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={() => fetchThreads(true)}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 transition-colors"
              >
                <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl
                  bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700
                  text-sm text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
                  transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                <p className="text-xs text-gray-400">Loading…</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyInbox />
            ) : (
              filtered.map(thread => (
                <ThreadRow
                  key={thread.bookingId?.toString()}
                  thread={thread}
                  active={activeThread?.bookingId?.toString() === thread.bookingId?.toString()}
                  onClick={() => handleSelectThread(thread)}
                />
              ))
            )}
          </div>
        </div>

        {/* ════ RIGHT: chat view ════ */}
        <div className={`flex-1 flex flex-col min-w-0 bg-gray-50/50 dark:bg-gray-950
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
          {activeThread ? (
            <ChatView
              thread={activeThread}
              onBack={() => setMobileView('list')}
              onSent={handleSent}
            />
          ) : (
            <EmptyThread />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
