import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../services/api';
import { useAuth } from './AuthContext';

// Show banners + play sound when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Android notification channels ────────────────────────────────────────────
async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Heavy vibration + high-priority for new bookings
  await Notifications.setNotificationChannelAsync('new_booking', {
    name: 'New Bookings',
    importance: Notifications.AndroidImportance.MAX,   // heads-up banner
    vibrationPattern: [0, 500, 200, 500, 200, 500],   // heavy 3-pulse
    lightColor: '#2563eb',
    enableVibrate: true,
    showBadge: true,
    sound: 'new_booking.wav',
  });

  // Standard channel for other owner notifications
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
    enableVibrate: true,
    sound: 'default',
  });
}

// ── Register device push token ────────────────────────────────────────────────
async function registerPushToken() {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  await setupNotificationChannels();
  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

// ─────────────────────────────────────────────────────────────────────────────

export const NotificationContext = createContext();

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [pendingBooking, setPendingBooking] = useState(null); // booking object waiting for accept/reject
  const seenIdsRef = useRef(null);
  const idCounter = useRef(0);

  const addNotification = useCallback((notif) => {
    idCounter.current += 1;
    setNotifications((prev) => [
      { ...notif, id: String(idCounter.current), read: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const markRead    = useCallback((id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const markAllRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);
  const remove      = useCallback((id) => setNotifications((prev) => prev.filter((n) => n.id !== id)), []);
  const clearAll    = useCallback(() => setNotifications([]), []);
  const clearPendingBooking = useCallback(() => setPendingBooking(null), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Register push token when logged in ─────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    registerPushToken().then((token) => {
      if (token) api.post('/owner/push-token', { token }).catch(() => {});
    });
  }, [isAuthenticated]);

  // ── Foreground notification listener ───────────────────────────────────────
  // When a new_booking arrives while the app is OPEN → show mandatory modal
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data || {};
      if (data.type === 'new_booking' && data.bookingId) {
        // Only force modal when auto-confirm is OFF (booking stays 'pending')
        const autoConfirm = data.autoConfirm !== 'false';
        if (!autoConfirm) {
          try {
            const res = await api.get(`/owner/bookings`);
            const all = res.data?.data?.bookings || [];
            const booking = all.find((b) => b._id === data.bookingId);
            if (booking && booking.status === 'pending') {
              setPendingBooking(booking);
            }
          } catch {}
        }
      }
      // Also add to in-app notification list
      addNotification({
        type: 'booking',
        title: notification.request.content.title || 'Notification',
        message: notification.request.content.body || '',
        data,
      });
    });
    return () => sub.remove();
  }, [addNotification]);

  // ── Poll bookings every 30s for new booking detection ─────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchBookingsForDate = async (date) => {
      try {
        const res = await api.get(`/owner/bookings?date=${date}`);
        const d = res.data.data;
        return Array.isArray(d) ? d : (d?.bookings || []);
      } catch {
        return [];
      }
    };

    const poll = async () => {
      const today    = localDate(0);
      const tomorrow = localDate(1);
      const [todayB, tomorrowB] = await Promise.all([
        fetchBookingsForDate(today),
        fetchBookingsForDate(tomorrow),
      ]);
      const allBookings = [...todayB, ...tomorrowB];

      if (seenIdsRef.current === null) {
        seenIdsRef.current = new Set(allBookings.map((b) => b._id).filter(Boolean));
        return;
      }

      const newBookings = allBookings.filter((b) => b._id && !seenIdsRef.current.has(b._id));
      newBookings.forEach((b) => {
        seenIdsRef.current.add(b._id);
        addNotification({
          type: 'booking',
          title: 'New Booking!',
          message: `${b.customerName || 'A customer'} booked ${b.serviceName || 'a service'} at ${b.appointmentTime || ''}`,
        });
      });
    };

    seenIdsRef.current = null;
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications, unreadCount,
        pendingBooking, clearPendingBooking,
        addNotification, markRead, markAllRead, remove, clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
