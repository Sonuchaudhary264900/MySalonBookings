import React, { useState } from 'react';
import { Bell, Trash2, Check, BellOff } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useNotifications } from '../../context/NotificationContext';
import ConfirmModal from '../../components/common/ConfirmModal';

const TYPE_STYLES = {
  booking: 'bg-indigo-100 text-indigo-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  info:    'bg-blue-100 text-blue-700',
};

const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    markRead,
    markAllRead,
    remove,
    clearAll,
  } = useNotifications();

  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => { document.title = 'Notifications — GlowLoox'; }, []);

  const handleRequestPermission = async () => {
    await requestPermission();
    toast.success('Notification permission updated');
  };

  const handleClearAll = () => setConfirmClear(true);

  return (
    <DashboardLayout>
      <ConfirmModal
        isOpen={confirmClear}
        title="Clear all notifications?"
        message="This will permanently remove all notifications and cannot be undone."
        confirmLabel="Clear all"
        onConfirm={() => { setConfirmClear(false); clearAll(); toast.success('All notifications cleared'); }}
        onCancel={() => setConfirmClear(false)}
      />
      <div className="max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {unreadCount > 0 && (
                <button
                  onClick={() => { markAllRead(); toast.success('All marked as read'); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <Check className="w-4 h-4" /> <span className="hidden xs:inline">Mark all read</span><span className="xs:hidden">Read all</span>
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" /> Clear all
              </button>
            </div>
          )}
        </div>

        {/* Permission Banner */}
        {permission !== 'granted' && (
          <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 ${
            permission === 'denied'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <BellOff className={`w-5 h-5 shrink-0 ${permission === 'denied' ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className={`text-sm font-semibold ${permission === 'denied' ? 'text-red-800' : 'text-amber-800'}`}>
                  {permission === 'denied'
                    ? 'Notifications blocked'
                    : 'Enable push notifications'}
                </p>
                <p className={`text-xs mt-0.5 ${permission === 'denied' ? 'text-red-600' : 'text-amber-600'}`}>
                  {permission === 'denied'
                    ? 'To receive alerts, allow notifications in your browser site settings.'
                    : 'Get instant alerts in your browser when a new booking arrives.'}
                </p>
              </div>
            </div>
            {permission !== 'denied' && (
              <button
                onClick={handleRequestPermission}
                className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition"
              >
                Allow
              </button>
            )}
          </div>
        )}

        {permission === 'granted' && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
            <Bell className="w-4 h-4" />
            <span>Push notifications are <strong>enabled</strong>. You'll be alerted for every new booking.</span>
          </div>
        )}

        {/* Notification list */}
        {notifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-10 sm:p-14 text-center">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">New bookings will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-white dark:bg-gray-900 rounded-xl border px-4 sm:px-5 py-4 flex gap-3 sm:gap-4 items-start transition ${
                  n.read ? 'border-gray-100 dark:border-gray-800 opacity-70' : 'border-indigo-200 dark:border-indigo-800 shadow-sm'
                }`}
              >
                {/* Dot */}
                <div className="mt-1 shrink-0">
                  {!n.read
                    ? <span className="block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    : <span className="block w-2.5 h-2.5 rounded-full bg-gray-200" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[n.type] || TYPE_STYLES.info}`}>
                      {n.type === 'booking' ? 'New Booking' : n.type}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
