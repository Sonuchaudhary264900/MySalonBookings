import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { Bell, CalendarDays, CheckCircle, ChevronLeft, X, Tag, AlertCircle } from "lucide-react";

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function groupNotifications(list) {
  const now = Date.now();
  const groups = { new: [], thisWeek: [], earlier: [] };
  list.forEach(n => {
    const hours = (now - new Date(n.createdAt).getTime()) / 3600000;
    if (hours < 24) groups.new.push(n);
    else if (hours < 168) groups.thisWeek.push(n);
    else groups.earlier.push(n);
  });
  return groups;
}

const TYPE_META = {
  booking: { bg: "rgba(99,102,241,0.15)",  color: "#6366f1", Icon: CalendarDays },
  success: { bg: "rgba(16,185,129,0.15)",  color: "#10b981", Icon: CheckCircle  },
  cancel:  { bg: "rgba(239,68,68,0.14)",   color: "#ef4444", Icon: X            },
  offer:   { bg: "rgba(234,179,8,0.15)",   color: "#f59e0b", Icon: Tag          },
  error:   { bg: "rgba(239,68,68,0.14)",   color: "#ef4444", Icon: AlertCircle  },
};

function NotifRow({ n, onRead, onRemove }) {
  const meta = TYPE_META[n.type] || TYPE_META.booking;
  const { Icon } = meta;

  return (
    <div
      onClick={() => onRead(n.id)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "14px 16px",
        background: !n.read ? "var(--t-notif-unread, rgba(99,102,241,0.045))" : "transparent",
        cursor: "pointer",
        transition: "background 0.12s",
        borderBottom: "1px solid var(--t-border)",
        position: "relative",
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
        background: meta.bg, color: meta.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${meta.color}28`,
      }}>
        <Icon size={18} strokeWidth={2} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <p style={{
          fontSize: 14,
          fontWeight: n.read ? 400 : 600,
          color: "var(--t-text)",
          margin: "0 0 3px",
          lineHeight: 1.4,
        }}>
          <span style={{ fontWeight: n.read ? 600 : 700 }}>{n.title}</span>
          {n.message && (
            <span style={{ fontWeight: n.read ? 400 : 400, color: "var(--t-text-2)" }}>
              {" "}{n.message}
            </span>
          )}
        </p>
        <p style={{
          fontSize: 12,
          color: !n.read ? "#6366f1" : "var(--t-text-3)",
          margin: 0,
          fontWeight: !n.read ? 600 : 400,
        }}>
          {relativeTime(n.createdAt)}
        </p>
      </div>

      {/* Unread dot — Instagram's blue dot on right */}
      {!n.read && (
        <span style={{
          width: 9, height: 9, borderRadius: "50%",
          background: "#3b82f6", flexShrink: 0, marginTop: 6,
        }} />
      )}

      {/* Dismiss button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(n.id); }}
        style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          width: 28, height: 28, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--t-input-bg)", border: "1px solid var(--t-border)",
          color: "var(--t-text-3)", cursor: "pointer",
          opacity: 0, transition: "opacity 0.15s",
        }}
        className="nd-dismiss"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <p style={{
      fontSize: 13, fontWeight: 700,
      color: "var(--t-text)",
      padding: "14px 16px 6px",
      margin: 0,
    }}>
      {label}
    </p>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications, unreadCount,
    markRead, markAllRead,
    removeNotification, clearAll,
  } = useNotifications();

  const groups = groupNotifications(notifications);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--t-bg)",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      <style>{`
        .nd-dismiss { opacity: 0 !important; }
        [data-notif]:hover .nd-dismiss { opacity: 1 !important; }
        @media (hover: none) { .nd-dismiss { display: none !important; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "var(--t-card)",
        borderBottom: "1px solid var(--t-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{
          maxWidth: 640, margin: "0 auto",
          display: "flex", alignItems: "center",
          height: 54,
          padding: "0 8px 0 4px",
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: "none",
              color: "var(--t-text)", cursor: "pointer",
            }}
          >
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>

          <h1 style={{
            flex: 1, fontSize: 17, fontWeight: 700,
            color: "var(--t-text)", margin: 0, paddingLeft: 4,
          }}>
            Notifications
          </h1>

          <div style={{ display: "flex", gap: 4 }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 13, fontWeight: 600,
                  color: "var(--t-accent)",
                  background: "none", border: "none",
                  cursor: "pointer", padding: "0 12px",
                }}
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                style={{
                  fontSize: 13,
                  color: "var(--t-text-3)",
                  background: "none", border: "none",
                  cursor: "pointer", padding: "0 10px 0 0",
                }}
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {notifications.length === 0 ? (
          /* Empty state — Instagram style */
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "80px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--t-input-bg)",
              border: "2px solid var(--t-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 22,
            }}>
              <Bell size={30} style={{ color: "var(--t-text-3)" }} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--t-text)", margin: "0 0 8px" }}>
              Activity on GlowLoox
            </h2>
            <p style={{ fontSize: 14, color: "var(--t-text-3)", margin: 0, maxWidth: 280, lineHeight: 1.55 }}>
              When you get bookings or updates, you'll see them here.
            </p>
          </div>
        ) : (
          <>
            {groups.new.length > 0 && (
              <section>
                <SectionLabel label="New" />
                {groups.new.map(n => (
                  <div key={n.id} data-notif="1">
                    <NotifRow n={n} onRead={markRead} onRemove={removeNotification} />
                  </div>
                ))}
              </section>
            )}
            {groups.thisWeek.length > 0 && (
              <section>
                <SectionLabel label="This Week" />
                {groups.thisWeek.map(n => (
                  <div key={n.id} data-notif="1">
                    <NotifRow n={n} onRead={markRead} onRemove={removeNotification} />
                  </div>
                ))}
              </section>
            )}
            {groups.earlier.length > 0 && (
              <section>
                <SectionLabel label="Earlier" />
                {groups.earlier.map(n => (
                  <div key={n.id} data-notif="1">
                    <NotifRow n={n} onRead={markRead} onRemove={removeNotification} />
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
