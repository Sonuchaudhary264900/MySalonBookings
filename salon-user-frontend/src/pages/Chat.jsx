import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../services/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "http://localhost:5000";
const CHAT_OPEN  = new Set(["pending", "confirmed", "in_progress"]);

export default function Chat() {
  const { bookingId }               = useParams();
  const navigate                    = useNavigate();
  const [booking, setBooking]       = useState(null);
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState("");
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const [focused, setFocused]       = useState(false);
  const socketRef   = useRef(null);
  const msgsRef     = useRef(null);
  const textareaRef = useRef(null);
  const typingTimer = useRef(null);

  const scrollToBottom = () => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  };

  useEffect(() => {
    Promise.all([
      API.get("/customer/bookings"),
      API.get(`/customer/bookings/${bookingId}/messages`),
    ]).then(([bRes, mRes]) => {
      const all   = bRes.data.data?.bookings || bRes.data.data || [];
      const found = Array.isArray(all) ? all.find(b => b._id === bookingId) : null;
      setBooking(found || { _id: bookingId, status: "confirmed" });
      setMessages(mRes.data.data?.messages || []);
    }).catch(() => setBooking({ _id: bookingId, status: "confirmed" }))
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["polling", "websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join-chat", { bookingId }));
    socket.on("chat-message", ({ bookingId: bId, message }) => {
      if (bId !== bookingId) return;
      setMessages(prev => [...prev, message]);
      if (message?.senderRole === "owner") {
        try { const a = new Audio("/sounds/chat_message.wav"); a.volume = 0.85; a.play().catch(() => {}); } catch {}
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const sName = booking?.salonName || "Salon";
            const n = new Notification(`💬 ${sName}`, { body: (message.text || "").slice(0, 100), icon: "/icon.png", tag: `chat-${bookingId}`, renotify: true });
            n.onclick = () => { window.focus(); n.close(); };
          } catch {}
        }
      }
    });
    socket.on("chat-typing", ({ senderRole }) => {
      if (senderRole === "owner") {
        setPeerTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
      }
    });
    return () => {
      clearTimeout(typingTimer.current);
      socket.emit("leave-chat", { bookingId });
      socket.disconnect();
    };
  }, [bookingId]);

  useEffect(() => { scrollToBottom(); }, [messages, peerTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const isChatOpen   = booking ? CHAT_OPEN.has(booking.status) : false;
  const salonName    = booking?.salonName || booking?.salonId?.name || "Salon";
  const salonInitial = salonName.trim()[0]?.toUpperCase() || "S";

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending || !isChatOpen) return;
    setText("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.focus(); }
    setSending(true);
    try {
      await API.post(`/customer/bookings/${bookingId}/messages`, { text: t });
    } catch (err) {
      alert(err?.message || "Failed to send message");
      setText(t);
    } finally { setSending(false); }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); handleSend(); }
  };
  const handleChange = e => {
    setText(e.target.value);
    if (isChatOpen) socketRef.current?.emit("chat-typing", { bookingId, senderRole: "customer" });
  };

  const fmt = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const fmtDay = iso => {
    if (!iso) return "";
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const grouped = [];
  let lastDay = null;
  messages.forEach((msg, i) => {
    const day = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
    if (day && day !== lastDay) { grouped.push({ type: "sep", label: fmtDay(msg.createdAt) }); lastDay = day; }
    grouped.push({ type: "msg", msg, i });
  });

  return (
    <>
      <style>{`
        .chat-fullpage {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: flex;
          flex-direction: column;
          background: var(--t-bg);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          overflow: hidden;
        }
        @keyframes chatSpin   { to { transform: rotate(360deg); } }
        @keyframes chatBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>

      <div className="chat-fullpage">

        {/* ── Header ── */}
        <div style={{
          flexShrink: 0,
          background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
          padding: "max(14px, env(safe-area-inset-top, 14px)) 16px 14px 8px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", flexShrink: 0 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {salonInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {salonName}
            </p>
            {peerTyping ? (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.85)", fontStyle: "italic" }}>typing…</p>
            ) : booking && (booking.serviceName || booking.appointmentTime) ? (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {[booking.serviceName, booking.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null, booking.appointmentTime].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── Chat closed banner ── */}
        {booking && !isChatOpen && (
          <div style={{ flexShrink: 0, margin: "10px 12px 0", padding: "9px 14px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <p style={{ margin: 0, fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>Chat closed — booking is {booking.status?.replace("_", " ")}</p>
          </div>
        )}

        {/* ── Messages ── */}
        <div
          ref={msgsRef}
          style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, WebkitOverflowScrolling: "touch", minHeight: 0 }}
        >
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
              <div style={{ width: 28, height: 28, border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "chatSpin 0.8s linear infinite" }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 10, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>💬</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--t-text-2)" }}>No messages yet</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--t-text-3)" }}>Start the conversation with {salonName}</p>
            </div>
          ) : (
            grouped.map((item, idx) => {
              if (item.type === "sep") return (
                <div key={`sep-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 6px" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--t-border)" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--t-text-3)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{item.label}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--t-border)" }} />
                </div>
              );
              const { msg, i } = item;
              const mine = msg.senderRole === "customer";
              return (
                <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 2 }}>
                  <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                    <div style={{
                      padding: "9px 13px", wordBreak: "break-word", fontSize: 14, lineHeight: 1.5,
                      borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: mine ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                      color: mine ? "#fff" : "var(--t-text)",
                      border: mine ? "none" : "1px solid var(--t-border)",
                      boxShadow: mine ? "0 2px 12px rgba(99,102,241,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
                    }}>
                      <p style={{ margin: 0 }}>{msg.text}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0 }}>
                      <span style={{ fontSize: 10, color: "var(--t-text-3)" }}>{fmt(msg.createdAt)}</span>
                      {mine && (
                        <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
                          <path d="M1 5.5L4 8.5L9.5 1.5" stroke={msg.readAt ? "#25D366" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 5.5L9 8.5L14.5 1.5" stroke={msg.readAt ? "#25D366" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {peerTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 4 }}>
              <div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--t-input-bg)", border: "1px solid var(--t-border)", display: "flex", alignItems: "center", gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--t-text-3)", animation: `chatBounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Input Bar ── */}
        {isChatOpen ? (
          <div style={{
            flexShrink: 0,
            borderTop: "1px solid var(--t-border)",
            padding: "10px 12px",
            paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
            background: "var(--t-card)",
          }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 8,
              background: "var(--t-input-bg)",
              border: `1.5px solid ${focused ? "#6366f1" : "var(--t-border)"}`,
              borderRadius: 20, padding: "6px 6px 6px 14px",
              transition: "border-color 0.2s",
              boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
            }}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Message salon…"
                rows={1}
                disabled={sending}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "var(--t-text)", fontSize: 14, resize: "none", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", padding: "4px 0", opacity: sending ? 0.6 : 1 }}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width: 38, height: 38, borderRadius: 14, border: "none", flexShrink: 0,
                  cursor: !text.trim() || sending ? "default" : "pointer",
                  background: !text.trim() ? "var(--t-border)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                  boxShadow: text.trim() && !sending ? "0 4px 12px rgba(99,102,241,0.4)" : "none",
                }}
              >
                {sending
                  ? <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "chatSpin 0.7s linear infinite" }} />
                  : <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                }
              </button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--t-text-3)", textAlign: "center" }}>Enter to send · Shift+Enter for new line</p>
          </div>
        ) : (
          booking && (
            <div style={{
              flexShrink: 0,
              padding: "14px",
              paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
              borderTop: "1px solid var(--t-border)",
              background: "var(--t-card)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span>🔒</span>
              <span style={{ fontSize: 13, color: "var(--t-text-3)" }}>Chat is closed for this booking</span>
            </div>
          )
        )}

      </div>
    </>
  );
}
