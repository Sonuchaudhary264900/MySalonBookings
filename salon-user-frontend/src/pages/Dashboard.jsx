import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { io } from 'socket.io-client';
import API from "../services/api";
import { getCustomerToken } from "../utils/auth";
import { useNotifications } from "../context/NotificationContext";

function getUserName() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "there";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.firstName || payload.username || "there";
  } catch { return "there"; }
}

const FILTERS   = ['Upcoming', 'Completed', 'Cancelled', 'All'];
const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  glow: 'rgba(251,191,36,0.2)'  },
  confirmed:   { label: 'Confirmed',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',   glow: 'rgba(52,211,153,0.2)'  },
  in_progress: { label: 'In Progress', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', glow: 'rgba(167,139,250,0.2)' },
  completed:   { label: 'Completed',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',   glow: 'rgba(96,165,250,0.2)'  },
  cancelled:   { label: 'Cancelled',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', glow: 'rgba(248,113,113,0.2)' },
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
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
  return `${hour % 12 || 12}:${m || '00'} ${ampm}`;
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
      if (days > 1)  setLabel(`in ${days} days`);
      else if (days === 1) setLabel(`tomorrow`);
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

// ── Inline SVG icons ──────────────────────────────────────────
const IcCalendar   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcClock      = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcRupee      = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="6" y1="3" x2="18" y2="3"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="6" y1="21" x2="12" y2="8"/><path d="M6 8a6 6 0 0 0 6 6"/></svg>;
const IcPin        = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcPhone      = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IcNavigate   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>;
const IcRefresh    = () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
const IcChevDown   = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;
const IcScissors   = () => <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>;
const IcStar       = () => <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IcRepeat     = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const IcTimer      = () => <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcTrend      = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcHeart      = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;

const SOCKET_URL_WEB = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';
const CHAT_OPEN_SET  = new Set(['pending', 'confirmed', 'in_progress']);

// ── ChatDrawer ────────────────────────────────────────────────
function ChatDrawer({ booking, onClose }) {
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const [focused, setFocused]       = useState(false);
  const socketRef    = useRef(null);
  const msgsRef      = useRef(null);   // scroll container — NOT scrollIntoView (avoids page jump)
  const textareaRef  = useRef(null);
  const typingTimer  = useRef(null);
  const isChatOpen   = CHAT_OPEN_SET.has(booking.status);
  const salonName    = booking.salonName || booking.salonId?.name || 'Salon';
  const salonInitial = salonName.trim()[0]?.toUpperCase() || 'S';

  const scrollToBottom = (smooth = true) => {
    if (!msgsRef.current) return;
    msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  };

  useEffect(() => {
    API.get(`/customer/bookings/${booking._id}/messages`)
      .then(res => setMessages(res.data.data?.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [booking._id]);

  useEffect(() => {
    const socket = io(SOCKET_URL_WEB, { transports: ['polling', 'websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-chat', { bookingId: booking._id }));
    socket.on('chat-message', ({ bookingId, message }) => {
      if (bookingId !== booking._id) return;
      setMessages(prev => [...prev, message]);
      if (message?.senderRole === 'owner') {
        try { const a = new Audio('/sounds/chat_message.wav'); a.volume = 0.85; a.play().catch(() => {}); } catch {}
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const n = new Notification(`💬 ${salonName}`, { body: (message.text || '').slice(0, 100), icon: '/icon.png', badge: '/icon.png', tag: `chat-${bookingId}`, renotify: true });
            n.onclick = () => { window.focus(); n.close(); };
          } catch {}
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
    return () => { clearTimeout(typingTimer.current); socket.emit('leave-chat', { bookingId: booking._id }); socket.disconnect(); };
  }, [booking._id]);

  useEffect(() => { scrollToBottom(); }, [messages, peerTyping]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending || !isChatOpen) return;
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.focus(); }
    setSending(true);
    try {
      await API.post(`/customer/bookings/${booking._id}/messages`, { text: t });
    } catch (err) {
      alert(err?.message || 'Failed to send message');
      setText(t);
    }
    finally { setSending(false); }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  const handleChange = e => {
    setText(e.target.value);
    if (isChatOpen) socketRef.current?.emit('chat-typing', { bookingId: booking._id, senderRole: 'customer' });
  };

  const fmt = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const fmtDay = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yest = new Date(now); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Group messages by date for separators
  const grouped = [];
  let lastDay = null;
  messages.forEach((msg, i) => {
    const day = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
    if (day && day !== lastDay) { grouped.push({ type: 'separator', label: fmtDay(msg.createdAt) }); lastDay = day; }
    grouped.push({ type: 'message', msg, i });
  });

  const S = { // styles
    overlay: { position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' },
    drawer:  { width:'100%', maxWidth:520, maxHeight:'min(92vh, calc(100vh - 80px))', minHeight:0, display:'flex', flexDirection:'column', background:'var(--t-card)', borderRadius:'24px 24px 0 0', overflow:'hidden', boxShadow:'0 -8px 40px rgba(0,0,0,0.25)', position:'relative' },
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ flexShrink:0, background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)', padding:'14px 16px 14px', display:'flex', alignItems:'center', gap:12 }}>
          {/* Avatar */}
          <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#fff', flexShrink:0, backdropFilter:'blur(4px)' }}>
            {salonInitial}
          </div>
          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{salonName}</p>
            {/* Booking context */}
            {(booking.serviceName || booking.appointmentTime) && (
              <p style={{ margin:'2px 0 0', fontSize:11, color:'rgba(255,255,255,0.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {[booking.serviceName, booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : null, booking.appointmentTime].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {/* Status chip */}
          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', backdropFilter:'blur(4px)' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* ── Chat closed banner ── */}
        {!isChatOpen && (
          <div style={{ flexShrink:0, margin:'10px 12px 0', padding:'9px 14px', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:12, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:14 }}>🔒</span>
            <p style={{ margin:0, fontSize:12, color:'#f59e0b', fontWeight:600 }}>Chat closed — booking is {booking.status.replace('_', ' ')}</p>
          </div>
        )}

        {/* ── Messages ── */}
        <div ref={msgsRef} style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:4, WebkitOverflowScrolling:'touch', minHeight:0 }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', flex:1, padding:'40px 0' }}>
              <div style={{ width:28, height:28, border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:10, padding:'40px 0' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(99,102,241,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>💬</div>
              <p style={{ margin:0, fontSize:14, fontWeight:600, color:'var(--t-text-2)' }}>No messages yet</p>
              <p style={{ margin:0, fontSize:12, color:'var(--t-text-3)', textAlign:'center' }}>Start the conversation with {salonName}</p>
            </div>
          ) : (
            grouped.map((item, idx) => {
              if (item.type === 'separator') return (
                <div key={`sep-${idx}`} style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 0 6px' }}>
                  <div style={{ flex:1, height:1, background:'var(--t-border)' }} />
                  <span style={{ fontSize:10, fontWeight:600, color:'var(--t-text-3)', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{item.label}</span>
                  <div style={{ flex:1, height:1, background:'var(--t-border)' }} />
                </div>
              );
              const { msg, i } = item;
              const mine = msg.senderRole === 'customer';
              return (
                <div key={i} style={{ display:'flex', justifyContent:mine ? 'flex-end' : 'flex-start', marginBottom:2 }}>
                  <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', alignItems:mine ? 'flex-end' : 'flex-start', gap:2 }}>
                    <div style={{
                      padding:'9px 13px', wordBreak:'break-word', fontSize:14, lineHeight:1.5, position:'relative',
                      borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: mine ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-bg-2)',
                      color: mine ? '#fff' : 'var(--t-text)',
                      border: mine ? 'none' : '1px solid var(--t-border)',
                      boxShadow: mine ? '0 2px 12px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      <p style={{ margin:0 }}>{msg.text}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0 }}>
                      <span style={{ fontSize:10, color:'var(--t-text-3)' }}>{fmt(msg.createdAt)}</span>
                      {mine && (
                        <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
                          {/* First tick (left) */}
                          <path d="M1 5.5L4 8.5L9.5 1.5" stroke={msg.readAt ? '#25D366' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          {/* Second tick (right, offset) */}
                          <path d="M6 5.5L9 8.5L14.5 1.5" stroke={msg.readAt ? '#25D366' : '#94a3b8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {peerTyping && (
            <div style={{ display:'flex', justifyContent:'flex-start', marginTop:4 }}>
              <div style={{ padding:'10px 14px', borderRadius:'18px 18px 18px 4px', background:'var(--t-bg-2)', border:'1px solid var(--t-border)', display:'flex', alignItems:'center', gap:4 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'var(--t-text-3)', animation:`bounce 1.2s ${i*0.2}s infinite ease-in-out` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Input Bar ── */}
        {isChatOpen && (
          <div style={{ flexShrink:0, borderTop:`1px solid var(--t-border)`, padding:'10px 12px 20px', background:'var(--t-card)' }}>
            <div style={{
              display:'flex', alignItems:'flex-end', gap:8,
              background:'var(--t-bg-2)', border:`1.5px solid ${focused ? '#6366f1' : 'var(--t-border)'}`,
              borderRadius:20, padding:'6px 6px 6px 14px', transition:'border-color 0.2s',
              boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
            }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Message salon…"
                rows={1}
                disabled={sending}
                style={{ flex:1, border:'none', outline:'none', background:'transparent', color:'var(--t-text)', fontSize:14, resize:'none', fontFamily:'inherit', lineHeight:1.5, maxHeight:120, overflowY:'auto', padding:'4px 0', opacity: sending ? 0.6 : 1 }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width:38, height:38, borderRadius:14, border:'none', flexShrink:0,
                  cursor: !text.trim() || sending ? 'default' : 'pointer',
                  background: !text.trim() ? 'var(--t-border)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.2s', transform: text.trim() && !sending ? 'scale(1)' : 'scale(0.95)',
                  boxShadow: text.trim() && !sending ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
                }}
              >
                {sending
                  ? <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  : <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                }
              </button>
            </div>
            <p style={{ margin:'6px 0 0', fontSize:10, color:'var(--t-text-3)', textAlign:'center' }}>Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--t-text-3)', bg: 'var(--t-input-bg)', border: 'var(--t-border)' };
  return (
    <span style={{
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: '0.02em',
    }}>
      {cfg.label}
    </span>
  );
}

// ── ReviewPrompt ──────────────────────────────────────────────
function ReviewPrompt({ bookingId, onReviewed }) {
  const [open, setOpen]             = useState(false);
  const [rating, setRating]         = useState(0);
  const [hover, setHover]           = useState(0);
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);

  if (done) return (
    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10 }}>
      <p style={{ fontSize: 12, color: '#34d399' }}>Thank you for your review! ✨</p>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.14)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--t-accent)' }}>
        <IcStar /> How was your experience?
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-accent)' }}>Leave a Review →</span>
    </button>
  );

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await API.post('/customer/reviews', { bookingId, salonRating: rating, reviewText: text.trim() || undefined });
      setDone(true); onReviewed?.();
    } catch { setDone(true); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ marginTop: 10, padding: '14px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-accent)', marginBottom: 10 }}>Rate your experience</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: n <= (hover || rating) ? '#f59e0b' : 'var(--t-border)' }}>★</button>
        ))}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Share your experience (optional)"
        style={{ width: '100%', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'none', background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', color: 'var(--t-text)', boxSizing: 'border-box', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={!rating || submitting}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: !rating || submitting ? 'not-allowed' : 'pointer', opacity: !rating || submitting ? 0.6 : 1, minWidth: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {submitting ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} /> : 'Submit'}
        </button>
        <button onClick={() => setOpen(false)} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t-text-3)' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── RescheduleModal ───────────────────────────────────────────
function RescheduleModal({ booking, onClose, onRescheduled }) {
  const [newDate, setNewDate]           = useState(todayString());
  const [newTime, setNewTime]           = useState('');
  const [slots, setSlots]               = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [closedDay, setClosedDay]       = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const salonId  = booking.salonId?._id || booking.salonId;
  const duration = booking.estimatedDuration || 30;

  useEffect(() => {
    if (!newDate || !salonId) return;
    setNewTime(''); setSlots([]); setBlockedSlots([]); setClosedDay(false); setSlotsLoading(true);
    API.get(`/public/salons/${salonId}/booked-slots?date=${newDate}&duration=${duration}`)
      .then(res => { const d = res.data.data || {}; setClosedDay(d.closedDay || false); setSlots(d.slots || []); setBlockedSlots(d.blockedSlots || []); })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [newDate, salonId, duration]);

  const handleSave = async () => {
    if (!newDate || !newTime) { setError('Please select a date and a time slot.'); return; }
    setSaving(true); setError('');
    try {
      await API.put(`/customer/bookings/${booking._id}/reschedule`, { appointmentDate: newDate, appointmentTime: newTime });
      onRescheduled(booking._id, newDate, newTime); onClose();
    } catch (err) { setError(err?.response?.data?.message || 'Failed to reschedule. Try another slot.'); }
    finally { setSaving(false); }
  };

  const quickDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    return { key, label };
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: 'min(90vh, calc(100vh - 80px))', overflowY: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--t-text)' }}>Reschedule Booking</p>
          <button onClick={onClose} style={{ background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--t-text-3)' }}>✕</button>
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text-3)', marginBottom: 8 }}>Select Date</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }} className="scrollbar-hide">
          {quickDates.map(({ key, label }) => (
            <button key={key} onClick={() => setNewDate(key)}
              style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', border: '1px solid', flexShrink: 0, transition: 'all 0.18s',
                background: newDate === key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-input-bg)',
                borderColor: newDate === key ? 'transparent' : 'var(--t-border)',
                color: newDate === key ? '#fff' : 'var(--t-text-2)',
                boxShadow: newDate === key ? '0 0 16px rgba(99,102,241,0.35)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-text-3)', marginBottom: 8 }}>Select Time Slot</p>
        {slotsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
            <span style={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,0.4)', borderTopColor: '#6366f1', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--t-text-3)' }}>Loading slots…</span>
          </div>
        ) : closedDay ? (
          <div style={{ padding: '12px 14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#fbbf24' }}>Salon is closed on this day. Choose another date.</p>
          </div>
        ) : slots.length === 0 ? (
          <div style={{ padding: '12px 14px', background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--t-text-3)' }}>No available slots on this date.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              {[['rgba(248,113,113,0.7)', 'Booked'], ['#6366f1', 'Selected'], ['var(--t-border)', 'Available']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                  <span style={{ fontSize: 11, color: 'var(--t-text-3)' }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {slots.map(s => {
                const blocked  = blockedSlots.includes(s);
                const selected = newTime === s;
                return (
                  <button key={s} onClick={() => { if (!blocked) setNewTime(s); }} disabled={blocked}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: blocked ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
                      background: blocked ? 'rgba(248,113,113,0.1)' : selected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-input-bg)',
                      borderColor: blocked ? 'rgba(248,113,113,0.3)' : selected ? 'transparent' : 'var(--t-border)',
                      color: blocked ? '#f87171' : selected ? '#fff' : 'var(--t-text-2)',
                      boxShadow: selected ? '0 0 14px rgba(99,102,241,0.35)' : 'none',
                    }}>
                    {formatTimeLabel(s)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {error && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !newTime}
            style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', cursor: saving || !newTime ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, opacity: saving || !newTime ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {saving ? <span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} /> : 'Confirm Reschedule'}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--t-input-bg)', border: '1px solid var(--t-border)', cursor: 'pointer', color: 'var(--t-text-2)', fontWeight: 600, fontSize: 14 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SkeletonCard ──────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: 20, padding: 20, overflow: 'hidden', position: 'relative' }}>
      <style>{`.sk-shimmer{background:linear-gradient(90deg,var(--t-border) 25%,var(--t-bg-2) 50%,var(--t-border) 75%);backgroundSize:200% 100%;animation:sk-shine 1.4s infinite}.@keyframes sk-shine{0%{backgroundPosition:200% 0}100%{backgroundPosition:-200% 0}}`}</style>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div className="sk-shimmer" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="sk-shimmer" style={{ height: 14, borderRadius: 7, width: '70%', marginBottom: 8 }} />
          <div className="sk-shimmer" style={{ height: 12, borderRadius: 6, width: '45%' }} />
        </div>
        <div className="sk-shimmer" style={{ width: 72, height: 22, borderRadius: 99 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
        {[1,2,3].map(i => <div key={i} className="sk-shimmer" style={{ height: 56, borderRadius: 10 }} />)}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="sk-shimmer" style={{ height: 38, borderRadius: 10, flex: 1 }} />
        <div className="sk-shimmer" style={{ height: 38, borderRadius: 10, flex: 1 }} />
      </div>
    </div>
  );
}

// ── BookingCard ───────────────────────────────────────────────
function BookingCard({ booking: initialBooking, userCoords, onCancelled, isNext }) {
  const [booking, setBooking]               = useState(initialBooking);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewed, setReviewed]             = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  const [hovered, setHovered]               = useState(false);
  const [chatOpen, setChatOpen]             = useState(false);
  const countdown = useCountdown(booking.appointmentDate, booking.appointmentTime);

  const status = booking.status || 'pending';
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try { await API.post(`/customer/bookings/${booking._id}/cancel`); onCancelled(booking._id); }
    catch (err) { alert(err?.message || 'Could not cancel. Try again.'); }
    finally { setCancelling(false); }
  };

  const handleRescheduled = (id, date, time) =>
    setBooking(prev => ({ ...prev, appointmentDate: date, appointmentTime: time, status: 'pending' }));

  const salonDoc    = booking.salonId;
  const salonName   = booking.salonName || salonDoc?.name || 'Salon';
  const salonInitial = salonName.charAt(0).toUpperCase();
  const salonCity   = salonDoc?.city || salonDoc?.address || '';
  const salonPhone  = salonDoc?.phone || null;
  const serviceName = booking.serviceName ||
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
    ? { text: 'Arrive 5 mins early · Slot reserved for you', color: '#34d399' }
    : status === 'pending'
    ? { text: 'Awaiting confirmation from salon', color: '#fbbf24' }
    : status === 'in_progress'
    ? { text: 'Your appointment is in progress right now', color: '#a78bfa' }
    : null;

  return (
    <>
      <style>{`
        @keyframes sk-shine { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .sk-shimmer { background:linear-gradient(90deg,var(--t-border) 25%,var(--t-bg-2) 50%,var(--t-border) 75%);background-size:200% 100%;animation:sk-shine 1.4s infinite; }
        .bk-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .bk-card:hover { transform: translateY(-2px); }
        .bk-btn { transition: all 0.18s ease; }
        .bk-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <div className="bk-card" style={{
        background: 'var(--t-card)',
        border: `1px solid ${hovered ? cfg.border : 'var(--t-border)'}`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: isNext ? `0 0 0 2px ${cfg.glow}, 0 8px 32px rgba(0,0,0,0.12)` : hovered ? '0 8px 32px rgba(0,0,0,0.12)' : 'var(--t-shadow)',
        transition: 'all 0.2s ease',
      }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >

        {/* "Next Appointment" ribbon */}
        {isNext && (
          <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              ⚡ Next Appointment
            </span>
            {countdown && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                <IcTimer /> {countdown}
              </span>
            )}
          </div>
        )}

        <div style={{ padding: '16px 16px 14px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            {/* Salon avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg,#6366f1,#8b5cf6)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#fff',
              boxShadow: '0 0 16px rgba(99,102,241,0.3)',
            }}>
              {salonInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--t-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, letterSpacing: '-0.2px' }}>
                {salonName}
              </p>
              <p style={{ fontSize: 13, color: 'var(--t-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {serviceName}
              </p>
              {!!salonCity && (
                <p style={{ fontSize: 11, color: 'var(--t-text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <IcPin /> {salonCity}
                </p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>

          {/* ── Info grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
            {/* Date */}
            <div style={{ background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 10, padding: '9px 10px' }}>
              <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                <IcCalendar /> Date
              </p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)', lineHeight: 1.3 }}>{formatDateLabel(booking.appointmentDate)}</p>
            </div>
            {/* Time */}
            <div style={{ background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 10, padding: '9px 10px' }}>
              <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                <IcClock /> Time
              </p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--t-text)' }}>{formatTimeLabel(booking.appointmentTime)}</p>
            </div>
            {/* Amount */}
            <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '9px 10px' }}>
              <p style={{ fontSize: 10, color: 'var(--t-accent)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                <IcRupee /> Amount
              </p>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--t-accent)' }}>
                {booking.totalAmount != null ? `₹${booking.totalAmount}` : '—'}
              </p>
            </div>
          </div>

          {/* ── Secondary info row ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, alignItems: 'center' }}>
            {durLabel && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--t-text-3)' }}>
                <IcTimer /> {durLabel}
              </span>
            )}
            {distanceLabel && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--t-text-3)' }}>
                <IcPin /> {distanceLabel}
              </span>
            )}
            {booking.paymentMethod && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--t-text-3)' }}>
                <IcRupee />
                {booking.paymentMethod.charAt(0).toUpperCase() + booking.paymentMethod.slice(1)}
                {booking.paymentStatus && (
                  <span style={{ marginLeft: 2, padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: booking.paymentStatus === 'paid' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                    color: booking.paymentStatus === 'paid' ? '#34d399' : '#fbbf24',
                    border: `1px solid ${booking.paymentStatus === 'paid' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
                  }}>
                    {booking.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                )}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t-text-3)', fontFamily: 'monospace' }}>
              #{booking.bookingId || booking._id?.slice(-6) || '—'}
            </span>
          </div>

          {/* ── Microcopy ── */}
          {microcopy && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: `${microcopy.color}18`, border: `1px solid ${microcopy.color}33`, borderRadius: 9, marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: microcopy.color, flexShrink: 0, animation: 'pulse 2s infinite' }} />
              <p style={{ fontSize: 12, color: microcopy.color, fontWeight: 600 }}>{microcopy.text}</p>
            </div>
          )}

          {/* ── Pay Now banner ── */}
          {booking.paymentStatus === 'pending' && booking.paymentMethod && booking.paymentMethod !== 'cash' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 9, marginBottom: 12 }}>
              <p style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>Payment pending · ₹{booking.totalAmount}</p>
              <button style={{ padding: '4px 12px', background: '#fbbf24', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#000', cursor: 'pointer' }}>Pay Now</button>
            </div>
          )}

          {/* ── Review prompt ── */}
          {canReview && <ReviewPrompt bookingId={booking._id} onReviewed={() => setReviewed(true)} />}
          {reviewed && (
            <div style={{ marginTop: 10, marginBottom: 10, padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: '#34d399' }}>Thank you for your review! ✨</p>
            </div>
          )}

          {/* ── Action buttons ── */}
          {(isUpcoming || !!salonPhone || !!mapsUrl) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid var(--t-border)', marginTop: 4 }}>
              {CHAT_OPEN_SET.has(status) && (
                <button className="bk-btn" onClick={() => setChatOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t-accent)' }}>
                  💬 Chat
                </button>
              )}
              {canReschedule && (
                <button className="bk-btn" onClick={() => setRescheduleOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--t-accent)' }}>
                  <IcCalendar /> Reschedule
                </button>
              )}
              {canCancel && (
                <button className="bk-btn" onClick={handleCancel} disabled={cancelling}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 9, cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#f87171', opacity: cancelling ? 0.5 : 1 }}>
                  {cancelling ? '…' : 'Cancel'}
                </button>
              )}
              {!!salonPhone && (
                <a href={`tel:${salonPhone}`} className="bk-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#34d399', textDecoration: 'none' }}>
                  <IcPhone /> Call
                </a>
              )}
              {!!mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="bk-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#60a5fa', textDecoration: 'none' }}>
                  <IcNavigate /> Directions
                </a>
              )}
              {status === 'completed' && (
                <Link to="/" className="bk-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 9, fontSize: 12, fontWeight: 600, color: 'var(--t-accent)', textDecoration: 'none' }}>
                  <IcRepeat /> Rebook
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {rescheduleOpen && <RescheduleModal booking={booking} onClose={() => setRescheduleOpen(false)} onRescheduled={handleRescheduled} />}
      {chatOpen && <ChatDrawer booking={booking} onClose={() => setChatOpen(false)} />}
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [filter, setFilter]               = useState('Upcoming');
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [userCoords, setUserCoords]       = useState(null);
  const [confirmedToasts, setConfirmedToasts] = useState([]);
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);
  const prevStatusRef = useRef({});

  const isAuth   = !!getCustomerToken();
  const userName = getUserName();
  const firstName = userName.split(' ')[0];

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, { maximumAge: 60000, timeout: 6000 }
    );
  }, []);

  const loadBookings = useCallback(async (silent = false, signal = null) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get('/customer/bookings');
      if (signal?.aborted) return;
      const fresh = res.data.data?.bookings || res.data.data || [];
      const arr = Array.isArray(fresh) ? fresh : [];
      const newlyConfirmed = arr.filter(b => b._id && prevStatusRef.current[b._id] === 'pending' && b.status === 'confirmed');
      if (newlyConfirmed.length > 0) { setConfirmedToasts(prev => [...prev, ...newlyConfirmed.map(b => b._id)]); setFilter('Upcoming'); }
      arr.forEach(b => { if (b._id) prevStatusRef.current[b._id] = b.status; });
      setBookings(arr);
    } catch { if (!signal?.aborted) setBookings([]); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    const signal = { aborted: false };
    loadBookings(false, signal);
    return () => { signal.aborted = true; };
  }, [isAuth, loadBookings]);

  const handleRefresh  = async () => { setRefreshing(true); await loadBookings(true); setRefreshing(false); };
  const handleCancelled = id => setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));

  // ── Computed stats ──────────────────────────────────────────
  const stats = {
    total:      bookings.length,
    upcoming:   bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    completed:  bookings.filter(b => b.status === 'completed').length,
    totalSpent: bookings.filter(b => b.status === 'completed' && b.totalAmount != null).reduce((s, b) => s + b.totalAmount, 0),
  };

  const filterCounts = {
    Upcoming:  bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length,
    Completed: bookings.filter(b => b.status === 'completed').length,
    Cancelled: bookings.filter(b => b.status === 'cancelled').length,
    All:       bookings.length,
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

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // ── Not authenticated ───────────────────────────────────────
  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--t-bg)' }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 20, boxShadow: '0 0 40px rgba(99,102,241,0.35)' }}>📅</div>
      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--t-text)', marginBottom: 8, letterSpacing: '-0.5px' }}>Your bookings, one place</p>
      <p style={{ fontSize: 14, color: 'var(--t-text-3)', textAlign: 'center', lineHeight: 1.7, marginBottom: 28, maxWidth: 280 }}>Track all your salon appointments, rebook favourites, and never miss a slot.</p>
      <Link to="/login" style={{ padding: '14px 36px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, borderRadius: 14, textDecoration: 'none', boxShadow: '0 0 32px rgba(99,102,241,0.45)', fontSize: 15, letterSpacing: '0.01em' }}>
        Sign In →
      </Link>
    </div>
  );

  return (
    <div style={{ background: 'var(--t-bg)', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .bk-action-btn { transition: all 0.18s ease; }
        .bk-action-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .filter-btn { transition: all 0.2s ease; }
        .filter-btn:hover { background: rgba(99,102,241,0.08) !important; }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(145deg,#1e1b4b 0%,#312e81 25%,#4c1d95 55%,#3730a3 80%,#1e3a5f 100%)',
        padding: '28px 16px 32px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative glows */}
        <div style={{ position:'absolute', top:-100, right:-60, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.25) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-40, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)', backgroundSize:'44px 44px', pointerEvents:'none' }} />

        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>

          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                My Bookings
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 4, letterSpacing: '-0.5px' }}>
                Welcome back, {firstName} 👋
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Ready for your next look?</p>
            </div>
            <Link to="/notifications" style={{ position:'relative', width:42, height:42, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, textDecoration:'none', backdropFilter:'blur(8px)' }}>
              <svg style={{ width:18, height:18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {unreadCount > 0 && <span style={{ position:'absolute', top:1, right:1, minWidth:16, height:16, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:700, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', border:'2px solid #4c1d95' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
          </div>

          {/* ── 4 Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Upcoming',  value: loading ? '—' : stats.upcoming,  icon: '📅', accent: false },
              { label: 'Completed', value: loading ? '—' : stats.completed, icon: '✅', accent: false },
              { label: 'Total',     value: loading ? '—' : stats.total,     icon: '📋', accent: false },
              { label: 'Spent',     value: loading ? '—' : stats.totalSpent > 0 ? `₹${stats.totalSpent}` : '₹0', icon: '💰', accent: true },
            ].map(({ label, value, icon, accent }) => (
              <div key={label} style={{
                background: accent ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.09)',
                border: `1px solid ${accent ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.14)'}`,
                borderRadius: 14, padding: '11px 6px', textAlign: 'center',
                backdropFilter: 'blur(12px)',
              }}>
                <p style={{ fontSize: 16, marginBottom: 3 }}>{icon}</p>
                <p style={{ fontSize: label === 'Spent' ? 13 : 18, fontWeight: 900, color: accent ? '#fde68a' : '#fff', lineHeight: 1, marginBottom: 3 }}>{value}</p>
                <p style={{ fontSize: 10, color: accent ? 'rgba(253,230,138,0.7)' : 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── Next upcoming banner ── */}
          {!loading && nextUpcoming && (
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  <IcScissors />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextUpcoming.serviceName || (Array.isArray(nextUpcoming.serviceIds) ? nextUpcoming.serviceIds.map(s => s?.name || s).filter(Boolean).join(' + ') : '') || 'Service'}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
                    {nextUpcoming.salonName || nextUpcoming.salonId?.name} · {formatDateLabel(nextUpcoming.appointmentDate)}{nextUpcoming.appointmentTime ? ` · ${formatTimeLabel(nextUpcoming.appointmentTime)}` : ''}
                  </p>
                </div>
              </div>
              <StatusBadge status={nextUpcoming.status} />
            </div>
          )}
        </div>
      </div>

      {/* ══ QUICK ACTIONS ══════════════════════════════════════ */}
      <div style={{ background: 'var(--t-card)', borderBottom: '1px solid var(--t-border)', padding: '14px 16px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 10, overflowX: 'auto' }} className="scrollbar-hide">
          <button className="bk-action-btn" onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Book New
          </button>
          {lastCompleted && (
            <button className="bk-action-btn" onClick={() => navigate(`/salon/${lastCompleted.salonId?._id || lastCompleted.salonId}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--t-text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <IcRepeat /> Rebook Last
            </button>
          )}
          <button className="bk-action-btn" onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--t-text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <IcPin /> Explore Salons
          </button>
        </div>
      </div>

      {/* ══ CONTENT ════════════════════════════════════════════ */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 16px 80px' }}>

        {/* ── Confirmed toasts ── */}
        {confirmedToasts.map(id => {
          const b = bookings.find(x => x._id === id);
          if (!b) return null;
          return (
            <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:14, gap:8, marginBottom:12, animation:'fadeUp 0.3s ease' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>✅</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#34d399' }}>Booking Confirmed!</p>
                  <p style={{ fontSize:11, color:'rgba(52,211,153,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>{b.serviceName} at {b.salonName || b.salonId?.name} — {b.appointmentTime}</p>
                </div>
              </div>
              <button onClick={() => setConfirmedToasts(prev => prev.filter(t => t !== id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#34d399', flexShrink:0, fontSize:14 }}>✕</button>
            </div>
          );
        })}

        {/* ── Filter tabs ── */}
        <div style={{ display:'flex', background:'var(--t-card)', border:'1px solid var(--t-border)', borderRadius:14, padding:4, gap:3, marginBottom:10 }}>
          {FILTERS.map(f => {
            const count = filterCounts[f] || 0;
            const active = filter === f;
            return (
              <button key={f} className="filter-btn" onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
                style={{ flex:1, padding:'9px 4px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', transition:'all 0.2s', position:'relative',
                  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                  color: active ? '#fff' : 'var(--t-text-3)',
                  boxShadow: active ? '0 0 14px rgba(99,102,241,0.35)' : 'none',
                }}>
                {f}
                {count > 0 && (
                  <span style={{ marginLeft:4, padding:'1px 5px', borderRadius:99, fontSize:9, fontWeight:800,
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)',
                    color: active ? '#fff' : 'var(--t-accent)',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Refresh */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:refreshing?'not-allowed':'pointer', fontSize:12, fontWeight:600, color:'var(--t-accent)', opacity:refreshing?0.5:1 }}>
            <span style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none', display:'flex' }}><IcRefresh /></span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Skeleton loading ── */}
        {loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 20px', textAlign:'center', gap:14, animation:'fadeUp 0.3s ease' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>
              {filter === 'Completed' ? '✅' : filter === 'Cancelled' ? '🚫' : '📅'}
            </div>
            <p style={{ fontSize:20, fontWeight:900, color:'var(--t-text)', letterSpacing:'-0.3px' }}>
              {filter === 'All' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
            </p>
            <p style={{ fontSize:14, color:'var(--t-text-3)', lineHeight:1.7, maxWidth:260 }}>
              {filter === 'All' ? "Find top-rated salons near you and book your first appointment!" : `Nothing here right now — check another tab.`}
            </p>
            {(filter === 'All' || filter === 'Upcoming') && (
              <Link to="/" style={{ marginTop:4, display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, borderRadius:14, textDecoration:'none', fontSize:14, boxShadow:'0 0 28px rgba(99,102,241,0.4)' }}>
                Explore Salons →
              </Link>
            )}
          </div>
        )}

        {/* ── Booking cards ── */}
        {!loading && visible.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {visible.map((b, idx) => (
              <div key={b._id} style={{ animation:`fadeUp 0.3s ease ${idx * 0.04}s both` }}>
                <BookingCard
                  booking={b}
                  userCoords={userCoords}
                  onCancelled={handleCancelled}
                  isNext={nextUpcoming?._id === b._id && filter === 'Upcoming'}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && (
          <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            style={{ width:'100%', marginTop:14, padding:14, background:'var(--t-card)', border:'1px solid var(--t-border)', borderRadius:14, cursor:'pointer', fontSize:13, fontWeight:700, color:'var(--t-accent)', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--t-card)'}
          >
            Load More <IcChevDown />
          </button>
        )}
        {!loading && !hasMore && filtered.length > PAGE_SIZE && (
          <p style={{ textAlign:'center', fontSize:12, color:'var(--t-text-3)', marginTop:14 }}>All {filtered.length} bookings shown</p>
        )}

        {/* ══ INSIGHTS SECTION ══════════════════════════════════ */}
        {!loading && bookings.length > 0 && (
          <div style={{ marginTop: 32, padding: '18px 16px', background: 'var(--t-card)', border: '1px solid var(--t-border)', borderRadius: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IcTrend /> Your Insights
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <div style={{ background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--t-accent)', marginBottom: 3 }}>{thisMonthVisits}</p>
                <p style={{ fontSize: 10, color: 'var(--t-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>This Month</p>
              </div>
              <div style={{ background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <IcHeart /> Fav Salon
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text)', lineHeight: 1.3, wordBreak: 'break-word' }}>{favSalon || '—'}</p>
              </div>
              <div style={{ background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--t-text-3)', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <IcScissors /> Top Service
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-text)', lineHeight: 1.3, wordBreak: 'break-word' }}>{favService || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* ══ FINAL CTA ═════════════════════════════════════════ */}
        {!loading && (
          <div style={{ marginTop: 24, borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg,#3730a3 0%,#4f46e5 40%,#7c3aed 100%)', padding: '24px 20px', position: 'relative' }}>
            <div style={{ position:'absolute', top:-40, right:-30, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 65%)', pointerEvents:'none' }} />
            <p style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 6, lineHeight: 1.3, position: 'relative' }}>
              Book your next appointment now
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 16, position: 'relative' }}>
              No waiting, no hassle — instant confirmation
            </p>
            <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
              <button onClick={() => navigate('/')}
                style={{ padding: '10px 20px', background: '#fff', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}>
                Book Now
              </button>
              <button onClick={() => navigate('/')}
                style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 11, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                Explore Salons
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
