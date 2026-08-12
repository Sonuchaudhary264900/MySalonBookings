import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import API from "../services/api";

function playNotifSound() {
  try { const a = new Audio('/sounds/chat_message.wav'); a.volume = 0.85; a.play().catch(() => {}); } catch {}
}
function showBrowserNotif(title, body, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, icon: '/icon.png', badge: '/icon.png', tag: tag || 'chat', renotify: true });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}

const NotificationContext = createContext(null);

const STORAGE_KEY = "salon_notifications";
const MAX_STORED  = 50;
const POLL_INTERVAL = 30000;

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function NotificationProvider({ children }) {
  const [toasts,        setToasts]        = useState([]);
  const [notifications, setNotifications] = useState(loadStored);
  const seenStatusRef = useRef(null); // map of bookingId → last seen status

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // ── Toast (transient) ──────────────────────────────────────
  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Persistent notifications ───────────────────────────────
  // `alert` (default true) also raises a browser notification + sound so the
  // customer is alerted even when the tab is in the background.
  const addNotification = useCallback(({ type = "info", title, message, alert = true }) => {
    const n = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [n, ...prev].slice(0, MAX_STORED));
    if (alert) {
      showBrowserNotif(title, message, `notif-${n.id}`);
      playNotifSound();
    }
  }, []);

  const markRead      = useCallback((id) =>
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)), []);

  const markAllRead   = useCallback(() =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const removeNotification = useCallback((id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id)), []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Poll customer bookings — detect status changes, backoff on errors ──
  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) return;

    let timeoutId = null;
    let failCount = 0;

    const getDelay = () => {
      if (failCount === 0) return POLL_INTERVAL;
      return Math.min(POLL_INTERVAL * Math.pow(2, failCount), 300000); // max 5 min
    };

    const schedule = () => {
      timeoutId = setTimeout(poll, getDelay());
    };

    const poll = async () => {
      try {
        const res = await API.get('/customer/bookings');
        failCount = 0;
        const data = res.data.data;
        const bookings = Array.isArray(data) ? data : (data?.bookings || []);

        if (seenStatusRef.current === null) {
          seenStatusRef.current = {};
          bookings.forEach((b) => { if (b._id) seenStatusRef.current[b._id] = b.status; });
          schedule(); return;
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
              addNotification({ type: 'booking', title: 'Appointment Started', message: `${service} at ${salonName} is in progress.` });
            }
          }

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
        failCount = Math.min(failCount + 1, 4); // cap at 4 → max 8min backoff
      }
      schedule();
    };

    seenStatusRef.current = null;
    poll();
    return () => clearTimeout(timeoutId);
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{
      toasts, notifications, unreadCount,
      addToast, removeToast,
      addNotification, markRead, markAllRead, removeNotification, clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
