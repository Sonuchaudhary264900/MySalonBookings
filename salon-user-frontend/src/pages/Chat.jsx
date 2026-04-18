import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { ChevronLeft, Send, Lock } from "lucide-react";
import API from "../services/api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "http://localhost:5000";
const CHAT_OPEN  = new Set(["pending", "confirmed", "in_progress"]);

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDay(iso) {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Chat() {
  const { bookingId }          = useParams();
  const navigate               = useNavigate();
  const [booking, setBooking]  = useState(null);
  const [messages, setMessages]  = useState([]);
  const [text, setText]          = useState("");
  const [sending, setSending]    = useState(false);
  const [loading, setLoading]    = useState(true);
  const [peerTyping, setPeerTyping] = useState(false);
  const socketRef   = useRef(null);
  const msgsRef     = useRef(null);
  const textareaRef = useRef(null);
  const typingTimer = useRef(null);

  // Scroll to bottom helper
  const scrollDown = () => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  };

  // Load booking info + message history
  useEffect(() => {
    Promise.all([
      API.get("/customer/bookings"),
      API.get(`/customer/bookings/${bookingId}/messages`),
    ]).then(([bRes, mRes]) => {
      const all = bRes.data.data?.bookings || bRes.data.data || [];
      const found = Array.isArray(all) ? all.find(b => b._id === bookingId) : null;
      setBooking(found || { _id: bookingId, status: "confirmed" });
      setMessages(mRes.data.data?.messages || []);
    }).catch(() => {
      setBooking({ _id: bookingId, status: "confirmed" });
    }).finally(() => setLoading(false));
  }, [bookingId]);

  // Socket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["polling", "websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join-chat", { bookingId }));
    socket.on("chat-message", ({ bookingId: bId, message }) => {
      if (bId !== bookingId) return;
      setMessages(prev => [...prev, message]);
      if (message?.senderRole === "owner") {
        try { new Audio("/sounds/chat_message.wav").play().catch(() => {}); } catch {}
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

  useEffect(() => { scrollDown(); }, [messages, peerTyping]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const isChatOpen = booking ? CHAT_OPEN.has(booking.status) : false;
  const salonName  = booking?.salonName || booking?.salonId?.name || "Salon";
  const salonInitial = salonName.trim()[0]?.toUpperCase() || "S";
  const service    = booking?.serviceName || "";
  const apptDate   = booking?.appointmentDate ? new Date(booking.appointmentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
  const apptTime   = booking?.appointmentTime || "";
  const subtitle   = [service, apptDate, apptTime].filter(Boolean).join(" · ");

  const handleSend = async () => {
    const t = text.trim();
    if (!t || sending || !isChatOpen) return;
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSending(true);
    try {
      await API.post(`/customer/bookings/${bookingId}/messages`, { text: t });
    } catch (err) {
      setText(t);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = e => {
    setText(e.target.value);
    if (isChatOpen) socketRef.current?.emit("chat-typing", { bookingId, senderRole: "customer" });
  };

  // Group messages by day
  const grouped = [];
  let lastDay = null;
  messages.forEach((msg, i) => {
    const day = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
    if (day && day !== lastDay) { grouped.push({ type: "sep", label: fmtDay(msg.createdAt) }); lastDay = day; }
    grouped.push({ type: "msg", msg, i });
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100dvh",
      background: "var(--t-bg)",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 12px 0 4px",
        height: 56, flexShrink: 0,
        background: "var(--t-card)",
        borderBottom: "1px solid var(--t-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        <button onClick={() => navigate(-1)} style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "var(--t-text)", cursor: "pointer", flexShrink: 0 }}>
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          {salonInitial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--t-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{salonName}</p>
          {subtitle && <p style={{ fontSize: 11, color: "var(--t-text-3)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</p>}
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={msgsRef}
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "12px 14px",
          WebkitOverflowScrolling: "touch",
          display: "flex", flexDirection: "column", gap: 2,
        }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <div style={{ width: 24, height: 24, border: "3px solid var(--t-border)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--t-input-bg)", border: "2px solid var(--t-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={22} style={{ color: "var(--t-text-3)" }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--t-text-2)", margin: 0 }}>Start the conversation</p>
            <p style={{ fontSize: 13, color: "var(--t-text-3)", margin: 0 }}>Ask about your appointment or anything else.</p>
          </div>
        ) : (
          grouped.map((item, idx) => {
            if (item.type === "sep") {
              return (
                <div key={`sep-${idx}`} style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 6px" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--t-border)" }} />
                  <span style={{ fontSize: 11, color: "var(--t-text-3)", fontWeight: 500, flexShrink: 0 }}>{item.label}</span>
                  <div style={{ flex: 1, height: 1, background: "var(--t-border)" }} />
                </div>
              );
            }
            const { msg } = item;
            const isMe = msg.senderRole === "customer";
            return (
              <div key={msg._id || idx} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 2 }}>
                <div style={{ maxWidth: "75%", position: "relative" }}>
                  <div style={{
                    padding: "9px 13px",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isMe
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "var(--t-input-bg)",
                    color: isMe ? "#fff" : "var(--t-text)",
                    fontSize: 14, lineHeight: 1.45,
                    wordBreak: "break-word",
                    boxShadow: isMe ? "0 2px 12px rgba(99,102,241,0.25)" : "none",
                    border: isMe ? "none" : "1px solid var(--t-border)",
                  }}>
                    {msg.text}
                  </div>
                  <p style={{ fontSize: 10, color: "var(--t-text-3)", margin: "2px 4px 0", textAlign: isMe ? "right" : "left" }}>
                    {fmt(msg.createdAt)}
                    {isMe && msg.readAt && <span style={{ marginLeft: 4, color: "#3b82f6" }}>✓✓</span>}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {peerTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {salonInitial}
            </div>
            <div style={{ padding: "9px 14px", borderRadius: "18px 18px 18px 4px", background: "var(--t-input-bg)", border: "1px solid var(--t-border)" }}>
              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--t-text-3)", display: "inline-block", animation: `typingDot 1.2s ${i*0.2}s ease-in-out infinite` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <style>{`@keyframes typingDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding: "10px 12px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
        background: "var(--t-card)",
        borderTop: "1px solid var(--t-border)",
        flexShrink: 0,
      }}>
        {!isChatOpen ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", color: "var(--t-text-3)" }}>
            <Lock size={14} strokeWidth={2} />
            <span style={{ fontSize: 13 }}>Chat is closed for this booking</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Message…"
              rows={1}
              style={{
                flex: 1, resize: "none", overflow: "hidden",
                padding: "10px 14px",
                borderRadius: 22,
                border: "1.5px solid var(--t-border)",
                background: "var(--t-input-bg)",
                color: "var(--t-text)",
                fontSize: 14, outline: "none",
                fontFamily: "inherit", lineHeight: 1.4,
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "#6366f1"}
              onBlur={e => e.target.style.borderColor = "var(--t-border)"}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: text.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                border: "none", cursor: text.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: text.trim() ? "#fff" : "var(--t-text-3)",
                transition: "all 0.15s",
                boxShadow: text.trim() ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
              }}
            >
              <Send size={16} strokeWidth={2.2} style={{ transform: "translateX(1px)" }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
