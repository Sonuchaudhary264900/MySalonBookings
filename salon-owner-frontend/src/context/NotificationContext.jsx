import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

const POLL_INTERVAL = 30000;

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)  return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function playNotifSound() {
  try {
    const audio = new Audio('/sounds/chat_message.wav');
    audio.volume = 0.85;
    audio.play().catch(() => {});
  } catch {}
}

function showBrowserNotif(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: tag || 'chat',
      renotify: true,
      silent: false,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [chatMessages,  setChatMessages]  = useState([]); // unread chat messages
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [pendingBooking, setPendingBooking] = useState(null);
  const seenIdsRef = useRef(null);
  const timerRef   = useRef(null);

  // ── Request browser notification permission ───────────────────
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') { setPermission('granted'); return; }
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // ── Add booking notification ──────────────────────────────────
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [
      { ...notif, id: notif.id || String(Date.now() + Math.random()), read: false, createdAt: notif.createdAt || new Date().toISOString() },
      ...prev,
    ].slice(0, 50));
  }, []);

  // ── Add chat message to unread panel ─────────────────────────
  const addChatMessage = useCallback((chatMsg) => {
    setChatMessages((prev) => {
      // avoid duplicates by _id
      if (chatMsg._id && prev.some((m) => m._id === chatMsg._id)) return prev;
      return [chatMsg, ...prev].slice(0, 100);
    });
  }, []);

  // ── Mark chat messages for a booking as read ─────────────────
  const markChatRead = useCallback((bookingId) => {
    setChatMessages((prev) => prev.filter((m) => m.bookingId?.toString() !== bookingId?.toString()));
  }, []);

  // ── Load initial unread chat messages ─────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/owner/messages/unread')
      .then((res) => {
        const msgs = res.data.data?.messages || [];
        setChatMessages(msgs);
      })
      .catch(() => {});
  }, []);

  // ── Listen for incoming customer chat messages (via SalonContext window event) ──
  useEffect(() => {
    const handler = (e) => {
      const { bookingId, message } = e.detail || {};
      if (!bookingId || !message) return;

      // Sound
      playNotifSound();

      // Rich browser notification
      const customerName = message.customerName || 'Customer';
      const preview      = (message.text || '').slice(0, 80);
      showBrowserNotif(
        `💬 ${customerName}`,
        preview,
        `chat-${bookingId}`
      );

      // Toast
      toast(`💬 ${customerName}: ${preview}`, {
        duration: 6000,
        style: { background: '#1e293b', color: '#f1f5f9', fontSize: '13px', maxWidth: '340px' },
      });

      // Add to chat panel
      addChatMessage({ ...message, bookingId });

      // Mark in booking notifications list too
      setNotifications((prev) => prev.map((n) => n.id === bookingId?.toString() ? { ...n, hasChat: true } : n));
    };

    window.addEventListener('new-chat-message', handler);
    return () => window.removeEventListener('new-chat-message', handler);
  }, [addChatMessage]);

  // ── Poll bookings ─────────────────────────────────────────────
  const poll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const today    = localDate(0);
      const tomorrow = localDate(1);
      const [r1, r2] = await Promise.all([
        api.get(`/owner/bookings?date=${today}`).catch(() => ({ data: {} })),
        api.get(`/owner/bookings?date=${tomorrow}`).catch(() => ({ data: {} })),
      ]);
      const toArr = (r) => { const d = r.data?.data; return Array.isArray(d) ? d : (d?.bookings || []); };
      const allBookings = [...toArr(r1), ...toArr(r2)];

      if (seenIdsRef.current === null) {
        seenIdsRef.current = new Set(allBookings.map((b) => b._id).filter(Boolean));
        return;
      }

      const newBookings = allBookings.filter((b) => b._id && !seenIdsRef.current.has(b._id));
      newBookings.forEach((b) => {
        seenIdsRef.current.add(b._id);
        const service  = b.serviceName || 'a service';
        const apptTime = b.appointmentTime || '';
        const msg = `${b.customerName || 'A customer'} booked ${service}${apptTime ? ` at ${apptTime}` : ''}`;
        showBrowserNotif('New Booking! ✂', msg, `booking-${b._id}`);
        toast.success(`New booking from ${b.customerName || 'customer'}`, { duration: 6000 });
        addNotification({ id: b._id, type: 'booking', title: 'New Booking', message: msg, createdAt: b.createdAt || new Date().toISOString() });
        if (b.status === 'pending') setPendingBooking(b);
      });
    } catch { /* silent */ }
  }, [addNotification]);

  // ── Bootstrap ─────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    requestPermission();
    seenIdsRef.current = null;
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  const unreadCount     = notifications.filter((n) => !n.read).length;
  const chatUnreadCount = chatMessages.length;

  const markRead    = useCallback((id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const markAllRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);
  const remove      = useCallback((id) => setNotifications((prev) => prev.filter((n) => n.id !== id)), []);
  const clearAll    = useCallback(() => setNotifications([]), []);
  const clearPendingBooking = useCallback(() => setPendingBooking(null), []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount,
      chatMessages, chatUnreadCount,
      permission, pendingBooking,
      requestPermission, addNotification, addChatMessage, markChatRead,
      markRead, markAllRead, remove, clearAll, clearPendingBooking,
      fmtTime,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
