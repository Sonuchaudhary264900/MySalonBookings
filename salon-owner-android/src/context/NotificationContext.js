import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const lastBookingIdRef = useRef(null);
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

  // Poll bookings every 30 seconds — detect new ones and surface as notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const poll = async () => {
      try {
        const res = await api.get('/owner/bookings?limit=5');
        const d = res.data.data;
        const bookings = Array.isArray(d) ? d : (d?.bookings || []);
        if (!bookings.length) return;

        const latestId = bookings[0]._id;
        if (lastBookingIdRef.current === null) {
          lastBookingIdRef.current = latestId;
          return;
        }
        if (latestId !== lastBookingIdRef.current) {
          const prevId = lastBookingIdRef.current;
          const newOnes = bookings.filter((b) => b._id !== prevId);
          newOnes.forEach((b) => {
            addNotification({
              type: 'booking',
              title: 'New Booking!',
              message: `${b.customerName || 'A customer'} booked ${b.serviceName || 'a service'} at ${b.appointmentTime || ''}`,
            });
          });
          lastBookingIdRef.current = latestId;
        }
      } catch { /* silent */ }
    };

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
