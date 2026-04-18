import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronLeft, Search, X } from "lucide-react";
import API from "../services/api";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function statusColor(status) {
  if (status === "confirmed") return "#10b981";
  if (status === "pending")   return "#f59e0b";
  if (status === "cancelled") return "#ef4444";
  if (status === "completed") return "#6366f1";
  return "#94a3b8";
}

export default function Messages() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    API.get("/customer/bookings")
      .then(res => {
        const all = res.data.data?.bookings || res.data.data || [];
        setBookings(Array.isArray(all) ? all : []);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    if (!q) return true;
    const salon = (b.salonName || b.salonId?.name || "").toLowerCase();
    const svc   = (b.serviceName || "").toLowerCase();
    return salon.includes(q) || svc.includes(q);
  });

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--t-bg)",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "var(--t-card)",
        borderBottom: "1px solid var(--t-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 8px 0 4px", height: 54, display: "flex", alignItems: "center" }}>
          <button onClick={() => navigate(-1)} style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--t-text)", cursor: "pointer" }}>
            <ChevronLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "var(--t-text)", margin: 0, paddingLeft: 4 }}>Messages</h1>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 16px 12px" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t-text-3)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 36px 9px 36px",
                borderRadius: 12, border: "none",
                background: "var(--t-input-bg)",
                color: "var(--t-text)",
                fontSize: 14, outline: "none",
                fontFamily: "inherit",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t-text-3)", display: "flex", alignItems: "center" }}>
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--t-border)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "72px 24px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--t-input-bg)", border: "2px solid var(--t-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
              <MessageCircle size={30} style={{ color: "var(--t-text-3)" }} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--t-text)", margin: "0 0 8px" }}>Your messages</h2>
            <p style={{ fontSize: 14, color: "var(--t-text-3)", margin: 0, maxWidth: 260, lineHeight: 1.55 }}>
              {search ? "No conversations found." : "Book a service to start chatting with a salon."}
            </p>
          </div>
        ) : (
          filtered.map(b => {
            const salonName    = b.salonName || b.salonId?.name || "Salon";
            const salonInitial = salonName.trim()[0]?.toUpperCase() || "S";
            const service      = b.serviceName || (Array.isArray(b.serviceIds) ? b.serviceIds.map(s => s?.name || s).filter(Boolean).join(", ") : "");
            const lastMsgTime  = b.lastMessageAt || b.updatedAt;
            const unread       = b.unreadOwnerMessages || 0;
            const isClosed     = ["completed", "cancelled"].includes(b.status);

            return (
              <div
                key={b._id}
                onClick={() => navigate(`/messages/${b._id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--t-border)",
                  cursor: "pointer",
                  transition: "background 0.12s",
                  background: unread > 0 ? "var(--t-notif-unread, rgba(99,102,241,0.04))" : "transparent",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--t-input-bg)"}
                onMouseLeave={e => e.currentTarget.style.background = unread > 0 ? "var(--t-notif-unread, rgba(99,102,241,0.04))" : "transparent"}
              >
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 18, fontWeight: 700,
                    border: isClosed ? "none" : "2px solid rgba(99,102,241,0.35)",
                  }}>
                    {salonInitial}
                  </div>
                  {/* Online/status dot */}
                  {!isClosed && (
                    <span style={{
                      position: "absolute", bottom: 2, right: 2,
                      width: 12, height: 12, borderRadius: "50%",
                      background: statusColor(b.status),
                      border: "2px solid var(--t-card)",
                    }} />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: unread > 0 ? 700 : 600, color: "var(--t-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                      {salonName}
                    </span>
                    {lastMsgTime && (
                      <span style={{ fontSize: 12, color: unread > 0 ? "#6366f1" : "var(--t-text-3)", fontWeight: unread > 0 ? 600 : 400, flexShrink: 0, paddingLeft: 8 }}>
                        {timeAgo(lastMsgTime)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontSize: 13, color: "var(--t-text-3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {isClosed
                        ? <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Chat closed · {b.status}</span>
                        : service || "Tap to chat"}
                    </p>
                    {unread > 0 && (
                      <span style={{
                        minWidth: 20, height: 20,
                        background: "#3b82f6", color: "#fff",
                        fontSize: 11, fontWeight: 700,
                        borderRadius: 999,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 5px", marginLeft: 8, flexShrink: 0,
                      }}>
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
