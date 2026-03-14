import { createContext, useContext, useState, useCallback, useEffect } from "react";

const NotificationContext = createContext(null);

const STORAGE_KEY = "salon_notifications";
const MAX_STORED  = 50;

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function NotificationProvider({ children }) {
  const [toasts,        setToasts]        = useState([]);
  const [notifications, setNotifications] = useState(loadStored);

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
  const addNotification = useCallback(({ type = "info", title, message }) => {
    const n = {
      id: Date.now() + Math.random(),
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [n, ...prev].slice(0, MAX_STORED));
  }, []);

  const markRead      = useCallback((id) =>
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n)), []);

  const markAllRead   = useCallback(() =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))), []);

  const removeNotification = useCallback((id) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id)), []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
