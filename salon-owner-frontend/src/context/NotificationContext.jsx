import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

const POLL_INTERVAL = 30000; // poll every 30 seconds

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const lastIdRef  = useRef(localStorage.getItem('lastBookingId') || null);
  const timerRef   = useRef(null);

  // ── Request browser permission ────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  // ── Fire a browser push notification ─────────────────────────
  const pushBrowser = useCallback((title, body) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/favicon.ico' });
  }, []);

  // ── Add a notification to the in-app list ────────────────────
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [notif, ...prev].slice(0, 50)); // keep max 50
  }, []);

  // ── Poll backend for new bookings ─────────────────────────────
  const poll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.get('/owner/bookings?limit=5');
      const bookings = res.data.data?.bookings ?? [];
      if (!bookings.length) return;

      const latestId = bookings[0]._id;

      if (lastIdRef.current && lastIdRef.current !== latestId) {
        const b = bookings[0];
        const msg = `${b.customerName || 'A customer'} booked ${b.serviceName || 'a service'} at ${b.appointmentTime || '—'}`;

        pushBrowser('New Booking Received! ✂', msg);
        toast.success(`New booking from ${b.customerName || 'customer'}`, { duration: 6000 });

        addNotification({
          id: b._id,
          type: 'booking',
          title: 'New Booking',
          message: msg,
          read: false,
          createdAt: new Date(),
        });
      }

      lastIdRef.current = latestId;
      localStorage.setItem('lastBookingId', latestId);
    } catch { /* silent — user may not be logged in yet */ }
  }, [pushBrowser, addNotification]);

  // ── Bootstrap: request permission + start polling ─────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    requestPermission();
    poll(); // run immediately on mount
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, []); // only once on mount

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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        permission,
        requestPermission,
        markRead,
        markAllRead,
        remove,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
