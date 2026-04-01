import React, { useEffect, useRef } from 'react';
import { X, MessageSquare, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import ROUTES from '../../routes';

function initials(name = '') {
  return name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)   return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtAppt(booking) {
  if (!booking) return '';
  const parts = [];
  if (booking.serviceName)    parts.push(booking.serviceName);
  if (booking.appointmentDate) parts.push(new Date(booking.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  if (booking.appointmentTime) parts.push(booking.appointmentTime);
  return parts.join(' · ');
}

/* Group messages by bookingId, keep only the latest per booking */
function groupByBooking(messages) {
  const map = new Map();
  messages.forEach((m) => {
    const key = m.bookingId?.toString();
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { bookingId: key, booking: m.booking, messages: [], customerName: m.booking?.customerName || 'Customer', latest: m });
    }
    map.get(key).messages.push(m);
    if (new Date(m.createdAt) > new Date(map.get(key).latest.createdAt)) {
      map.get(key).latest = m;
    }
  });
  return [...map.values()].sort((a, b) => new Date(b.latest.createdAt) - new Date(a.latest.createdAt));
}

const MessagesPanel = ({ onClose, onOpenChat }) => {
  const { chatMessages, chatUnreadCount, markChatRead } = useNotifications();
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const threads = groupByBooking(chatMessages);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleThreadClick = (thread) => {
    markChatRead(thread.bookingId);
    // Navigate to bookings and open chat
    if (onOpenChat) {
      onOpenChat({ _id: thread.bookingId, ...thread.booking });
    } else {
      navigate(ROUTES.BOOKINGS);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed left-[68px] md:left-64 top-0 h-screen w-80 z-50 flex flex-col
          bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800
          shadow-2xl animate-in slide-in-from-left-2 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-gray-900 dark:text-white text-base">Messages</span>
            {chatUnreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No unread messages</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Customer messages will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {threads.map((thread) => {
                const name   = thread.customerName || 'Customer';
                const latest = thread.latest;
                const count  = thread.messages.length;
                const appt   = fmtAppt(thread.booking);

                return (
                  <button
                    key={thread.bookingId}
                    onClick={() => handleThreadClick(thread)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white text-sm font-bold">{initials(name)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{fmtDate(latest.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate mb-1">{latest.text}</p>
                      {appt && (
                        <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium truncate">📅 {appt}</p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {count > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0 mt-0.5">
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
            Click a message to open the booking chat
          </p>
        </div>
      </div>
    </>
  );
};

export default MessagesPanel;
