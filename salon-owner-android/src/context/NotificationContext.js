import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export const NotificationContext = createContext();

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  // Track all seen booking IDs so we never re-notify the same booking
  const seenIdsRef = useRef(null); // null = not initialised yet
  const idCounter = useRef(0);

  const addNotification = useCallback((notif) => {
    idCounter.current += 1;
    setNotifications((prev) => [
      {
        ...notif,
        id: String(idCounter.current),
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const remove = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Poll today's + tomorrow's bookings every 30s — detect genuinely new bookings
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
      const today = localDate(0);
      const tomorrow = localDate(1);

      const [todayBookings, tomorrowBookings] = await Promise.all([
        fetchBookingsForDate(today),
        fetchBookingsForDate(tomorrow),
      ]);

      const allBookings = [...todayBookings, ...tomorrowBookings];

      if (seenIdsRef.current === null) {
        // First run — mark everything as already seen, no notifications
        seenIdsRef.current = new Set(allBookings.map((b) => b._id).filter(Boolean));
        return;
      }

      // Find bookings we haven't seen before
      const newBookings = allBookings.filter(
        (b) => b._id && !seenIdsRef.current.has(b._id)
      );

      newBookings.forEach((b) => {
        seenIdsRef.current.add(b._id);
        addNotification({
          type: 'booking',
          title: 'New Booking!',
          message: `${b.customerName || 'A customer'} booked ${b.serviceName || 'a service'} at ${b.appointmentTime || ''}`,
        });
      });
    };

    // Reset seen IDs when auth changes so fresh login starts clean
    seenIdsRef.current = null;

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, addNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markRead, markAllRead, remove, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
