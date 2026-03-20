import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const seenStatusRef = useRef(null); // map of bookingId → last seen status
  const idCounter = useRef(0);

  const addNotification = useCallback((notif) => {
    idCounter.current += 1;
    setNotifications((prev) => [
      { ...notif, id: String(idCounter.current), read: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const markRead    = useCallback((id) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)), []);
  const markAllRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);
  const remove      = useCallback((id) => setNotifications((prev) => prev.filter((n) => n.id !== id)), []);
  const clearAll    = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Poll customer bookings every 30s — detect status changes
  useEffect(() => {
    if (!isAuthenticated) { seenStatusRef.current = null; return; }

    const poll = async () => {
      try {
        const res = await api.get('/customer/bookings');
        const data = res.data.data;
        const bookings = Array.isArray(data) ? data : (data?.bookings || []);

        if (seenStatusRef.current === null) {
          // First run — snapshot current state, no notifications
          seenStatusRef.current = {};
          bookings.forEach((b) => { if (b._id) seenStatusRef.current[b._id] = b.status; });
          return;
        }

        bookings.forEach((b) => {
          if (!b._id) return;
          const prevStatus = seenStatusRef.current[b._id];
          const currStatus = b.status;
          const salonName  = b.salonId?.name || b.salonName || 'the salon';
          const service    = Array.isArray(b.serviceIds)
            ? (b.serviceIds[0]?.name || 'your service')
            : (b.serviceName || 'your service');

          if (prevStatus !== currStatus) {
            seenStatusRef.current[b._id] = currStatus;

            if (currStatus === 'confirmed' && prevStatus === 'pending') {
              addNotification({ type: 'success', title: 'Booking Confirmed!', message: `${service} at ${salonName} is confirmed.` });
            } else if (currStatus === 'cancelled') {
              addNotification({ type: 'warning', title: 'Booking Cancelled', message: `Your booking at ${salonName} was cancelled.` });
            } else if (currStatus === 'completed') {
              addNotification({ type: 'info', title: 'Visit Completed', message: `Rate your experience at ${salonName}!` });
            } else if (currStatus === 'in_progress') {
              addNotification({ type: 'booking', title: 'Your appointment has started', message: `${service} at ${salonName} is in progress.` });
            }
          }

          // Track new bookings that aren't in seen map yet
          if (prevStatus === undefined) {
            seenStatusRef.current[b._id] = currStatus;
            if (currStatus === 'confirmed') {
              addNotification({ type: 'success', title: 'New Booking Confirmed!', message: `${service} at ${salonName}.` });
            } else if (currStatus === 'pending') {
              addNotification({ type: 'booking', title: 'Booking Request Sent', message: `Waiting for confirmation from ${salonName}.` });
            }
          }
        });
      } catch {
        // silent fail
      }
    };

    seenStatusRef.current = null;
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, remove, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
