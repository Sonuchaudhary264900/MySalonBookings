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

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [pendingBooking, setPendingBooking] = useState(null);
  const seenIdsRef = useRef(null); // Set of seen booking IDs — null = first run
  const timerRef   = useRef(null);

  // ── Request browser permission ────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // ── Fire a browser notification ───────────────────────────────
  const pushBrowser = useCallback((title, body) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/favicon.ico' });
  }, []);

  // ── Add a notification to the in-app list ────────────────────
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [
      { ...notif, id: notif.id || String(Date.now() + Math.random()), read: false, createdAt: notif.createdAt || new Date().toISOString() },
      ...prev,
    ].slice(0, 50));
  }, []);

  // ── Poll bookings for today + tomorrow ────────────────────────
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
        // First run — snapshot, no notifications
        seenIdsRef.current = new Set(allBookings.map((b) => b._id).filter(Boolean));
        return;
      }

      const newBookings = allBookings.filter((b) => b._id && !seenIdsRef.current.has(b._id));
      newBookings.forEach((b) => {
        seenIdsRef.current.add(b._id);
        const msg = `${b.customerName || 'A customer'} booked ${b.serviceName || 'a service'} at ${b.appointmentTime || '—'}`;
        pushBrowser('New Booking! ✂', msg);
        toast.success(`New booking from ${b.customerName || 'customer'}`, { duration: 6000 });
        addNotification({
          id: b._id,
          type: 'booking',
          title: 'New Booking',
          message: msg,
          createdAt: b.createdAt || new Date().toISOString(),
        });
        // Show mandatory alert modal for pending bookings (auto-confirm off)
        if (b.status === 'pending') {
          setPendingBooking(b);
        }
      });
    } catch { /* silent */ }
  }, [pushBrowser, addNotification]);

  // ── Bootstrap: request permission + start polling ─────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    requestPermission();
    seenIdsRef.current = null;
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearPendingBooking = useCallback(() => setPendingBooking(null), []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        permission,
        pendingBooking,
        requestPermission,
        markRead,
        markAllRead,
        remove,
        clearAll,
        clearPendingBooking,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
