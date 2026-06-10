import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  ChevronLeft, Bug, Lightbulb, MessageSquare, Image as ImageIcon, X,
  RotateCcw, Send,
} from "lucide-react";

const TYPES = [
  { key: "bug",        label: "Bug",        Icon: Bug },
  { key: "suggestion", label: "Suggestion", Icon: Lightbulb },
  { key: "feedback",   label: "Feedback",   Icon: MessageSquare },
];

const SEVERITIES = [
  { key: "low",      label: "Low",      color: "#64748b" },
  { key: "medium",   label: "Medium",   color: "#2563eb" },
  { key: "high",     label: "High",     color: "#d97706" },
  { key: "critical", label: "Critical", color: "#dc2626" },
];

const STATUS_META = {
  open:      { label: "Open",      color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  in_review: { label: "In Review", color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  resolved:  { label: "Resolved",  color: "#059669", bg: "rgba(5,150,105,0.12)" },
  closed:    { label: "Closed",    color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

const TYPE_META = {
  bug:        { label: "Bug",        Icon: Bug },
  suggestion: { label: "Suggestion", Icon: Lightbulb },
  feedback:   { label: "Feedback",   Icon: MessageSquare },
};

function SkeletonRow() {
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--t-border)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--t-input-bg)", flexShrink: 0 }} className="fb-shimmer" />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, width: "60%", borderRadius: 6, background: "var(--t-input-bg)", marginBottom: 8 }} className="fb-shimmer" />
          <div style={{ height: 11, width: "35%", borderRadius: 6, background: "var(--t-input-bg)" }} className="fb-shimmer" />
        </div>
        <div style={{ width: 64, height: 22, borderRadius: 11, background: "var(--t-input-bg)", flexShrink: 0 }} className="fb-shimmer" />
      </div>
    </div>
  );
}

export default function Feedback() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [type, setType] = useState("feedback");
  const [severity, setSeverity] = useState("low");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reopeningId, setReopeningId] = useState(null);

  const loadFeedback = useCallback((p = 1) => {
    setLoading(true);
    API.get(`/customer/feedback?page=${p}&limit=10`)
      .then(res => {
        const data = res.data?.data || [];
        const pagination = res.data?.pagination || {};
        setItems(data);
        setPage(pagination.page || p);
        setPages(pagination.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFeedback(1); }, [loadFeedback]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    setError("");
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setError("Please fill in both subject and description");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("severity", type === "bug" ? severity : "low");
      fd.append("subject", subject.trim());
      fd.append("description", description.trim());
      fd.append("platform", "web");
      if (screenshot) fd.append("screenshot", screenshot);

      await API.post("/customer/feedback", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Thanks! Your submission has been received.");
      setSubject("");
      setDescription("");
      setSeverity("low");
      removeScreenshot();
      loadFeedback(1);
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (id) => {
    setReopeningId(id);
    try {
      await API.patch(`/customer/feedback/${id}/reopen`);
      loadFeedback(page);
    } catch {} finally {
      setReopeningId(null);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--t-border)",
    background: "var(--t-input-bg)",
    color: "var(--t-text)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--t-bg)",
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
      paddingBottom: 80,
    }}>
      <style>{`
        @keyframes fb-shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .fb-shimmer { animation: fb-shimmer 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
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
          height: 54, padding: "0 8px 0 4px",
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
          <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: "var(--t-text)", margin: 0, paddingLeft: 4 }}>
            Help & Feedback
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px" }}>
        {/* Type toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {TYPES.map(({ key, label, Icon }) => {
            const active = type === key;
            return (
              <button
                key={key}
                onClick={() => setType(key)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px 8px", borderRadius: 14,
                  border: active ? "1.5px solid #8b5cf6" : "1px solid var(--t-border)",
                  background: active ? "rgba(139,92,246,0.1)" : "var(--t-card)",
                  color: active ? "#8b5cf6" : "var(--t-text-2)",
                  cursor: "pointer", transition: "all 0.15s", fontSize: 12, fontWeight: 600,
                }}
              >
                <Icon size={20} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Severity (bug only) */}
        {type === "bug" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {SEVERITIES.map(({ key, label, color }) => {
              const active = severity === key;
              return (
                <button
                  key={key}
                  onClick={() => setSeverity(key)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: active ? `1px solid ${color}` : "1px solid var(--t-border)",
                    background: active ? `${color}1f` : "var(--t-card)",
                    color: active ? color : "var(--t-text-2)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Subject */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t-text-3)", marginBottom: 6, display: "block" }}>
            Subject
          </label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief summary of the issue or idea"
            maxLength={120}
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t-text-3)", marginBottom: 6, display: "block" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell us more — what happened, what you expected, steps to reproduce..."
            rows={5}
            maxLength={2000}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        {/* Screenshot */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--t-text-3)", marginBottom: 6, display: "block" }}>
            Screenshot (optional)
          </label>
          {screenshotPreview ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={screenshotPreview} alt="Screenshot preview" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 12, border: "1px solid var(--t-border)", display: "block" }} />
              <button
                onClick={removeScreenshot}
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", cursor: "pointer",
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", padding: "14px", borderRadius: 12,
                border: "1.5px dashed var(--t-border)",
                background: "var(--t-input-bg)", color: "var(--t-text-3)",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
              }}
            >
              <ImageIcon size={18} strokeWidth={1.8} />
              Add a screenshot
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </div>

        {error && (
          <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{error}</p>
        )}
        {success && (
          <p style={{ color: "#059669", fontSize: 13, marginBottom: 10 }}>{success}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            height: 48, borderRadius: 14, fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
            color: "#fff", border: "none",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <Send size={16} strokeWidth={2} />
          {submitting ? "Submitting..." : "Submit"}
        </button>

        {/* My submissions */}
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text)", marginBottom: 10 }}>
            My Submissions
          </p>

          <div style={{ borderRadius: 14, border: "1px solid var(--t-border)", background: "var(--t-card)", overflow: "hidden" }}>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : items.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--t-text-3)" }}>No submissions yet</p>
              </div>
            ) : (
              items.map((item, i) => {
                const meta = TYPE_META[item.type] || TYPE_META.feedback;
                const status = STATUS_META[item.status] || STATUS_META.open;
                const Icon = meta.Icon;
                return (
                  <div key={item._id} style={{ padding: "14px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--t-border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(139,92,246,0.12)", color: "#8b5cf6",
                      }}>
                        <Icon size={16} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--t-text)", margin: 0, marginBottom: 2 }}>
                          {item.subject}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--t-text-3)", margin: 0 }}>
                          {new Date(item.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          {item.type === "bug" && ` · ${item.severity?.charAt(0).toUpperCase()}${item.severity?.slice(1)}`}
                        </p>
                      </div>
                      <span style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 11,
                        color: status.color, background: status.bg,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    {item.status === "resolved" && (
                      <button
                        onClick={() => handleReopen(item._id)}
                        disabled={reopeningId === item._id}
                        style={{
                          marginTop: 10, display: "flex", alignItems: "center", gap: 6,
                          fontSize: 12, fontWeight: 600, color: "#8b5cf6",
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                        }}
                      >
                        <RotateCcw size={13} strokeWidth={2.2} />
                        {reopeningId === item._id ? "Reopening..." : "Reopen"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => loadFeedback(page - 1)}
                disabled={page <= 1}
                style={{
                  padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: "1px solid var(--t-border)", background: "var(--t-card)",
                  color: "var(--t-text-2)", cursor: page <= 1 ? "default" : "pointer",
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "var(--t-text-3)" }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => loadFeedback(page + 1)}
                disabled={page >= pages}
                style={{
                  padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: "1px solid var(--t-border)", background: "var(--t-card)",
                  color: "var(--t-text-2)", cursor: page >= pages ? "default" : "pointer",
                  opacity: page >= pages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
