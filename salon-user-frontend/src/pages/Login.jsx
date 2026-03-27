import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";

/* ── animations ── */
const CSS = `
  @keyframes lg-float1{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-18px) rotate(2deg);}}
  @keyframes lg-float2{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-12px) rotate(-2deg);}}
  @keyframes lg-float3{0%,100%{transform:translateY(0px);}40%{transform:translateY(-10px);}}
  @keyframes lg-pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:0.9;transform:scale(1.08);}}
  @keyframes lg-spin{to{transform:rotate(360deg);}}
  @keyframes lg-up{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lg-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  .lg-f1{animation:lg-float1 6s ease-in-out infinite;}
  .lg-f2{animation:lg-float2 8s ease-in-out infinite;}
  .lg-f3{animation:lg-float3 5s ease-in-out infinite;}
  .lg-pulse{animation:lg-pulse 3s ease-in-out infinite;}
  .lg-spin{animation:lg-spin .7s linear infinite;}
  .lg-u0{animation:lg-up .55s .00s ease both;}
  .lg-u1{animation:lg-up .55s .10s ease both;}
  .lg-u2{animation:lg-up .55s .20s ease both;}
  .lg-u3{animation:lg-up .55s .30s ease both;}
  .lg-u4{animation:lg-up .55s .40s ease both;}
  .lg-u5{animation:lg-up .55s .50s ease both;}
  .lg-shimmer{
    background:linear-gradient(90deg,#a78bfa,#818cf8,#c4b5fd,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:lg-shimmer 4s linear infinite;
  }
`;

const FEATURES = [
  { icon: "📅", label: "Track bookings",   sub: "All in one place"    },
  { icon: "❤️", label: "Saved salons",     sub: "Your favourites"     },
  { icon: "⚡", label: "Instant booking",  sub: "Confirm in seconds"  },
  { icon: "🔔", label: "Smart reminders",  sub: "Never miss a slot"   },
];

export default function Login() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const from         = location.state?.from;
  const bookingState = location.state?.bookingState;

  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [focusedField, setFocusedField] = useState(null);

  /* forgot password */
  const [fpOpen, setFpOpen]       = useState(false);
  const [fpStep, setFpStep]       = useState(1);
  const [fpPhone, setFpPhone]     = useState("");
  const [fpOtp, setFpOtp]         = useState("");
  const [fpNewPw, setFpNewPw]     = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpShowPw, setFpShowPw]   = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError]     = useState("");
  const [fpTimer, setFpTimer]     = useState(0);

  useEffect(() => {
    if (fpTimer <= 0) return;
    const id = setInterval(() => setFpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [fpTimer]);

  const norm = p => {
    let c = p.replace(/\D/g, "");
    if (c.length === 10) c = "91" + c;
    if (!c.startsWith("+")) c = "+" + c;
    return c;
  };

  const handleLogin = async e => {
    e.preventDefault();
    if (!phone.trim() || !password) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      const res = await API.post("/customer/auth/login", { phone: norm(phone), password });
      const { token, customer } = res.data.data || {};
      if (token) localStorage.setItem("customerToken", token);
      if (customer?.gender) localStorage.setItem("customerGender", customer.gender);
      from ? navigate(from, { state: bookingState, replace: true }) : navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email/phone or password.");
    } finally { setLoading(false); }
  };

  const handleFpSendOtp = async e => {
    e?.preventDefault(); setFpError("");
    if (!fpPhone.trim()) { setFpError("Phone number is required"); return; }
    setFpLoading(true);
    try {
      await API.post("/customer/auth/forgot-password/send-otp", { phone: norm(fpPhone) });
      setFpStep(2); setFpTimer(60);
    } catch (err) {
      setFpError(err.response?.data?.message || "Failed to send OTP");
    } finally { setFpLoading(false); }
  };

  const handleFpReset = async e => {
    e.preventDefault(); setFpError("");
    if (!fpOtp.trim()) { setFpError("OTP is required"); return; }
    if (!fpNewPw || fpNewPw.length < 6) { setFpError("Password must be at least 6 characters"); return; }
    if (fpNewPw !== fpConfirm) { setFpError("Passwords do not match"); return; }
    setFpLoading(true);
    try {
      await API.post("/customer/auth/forgot-password/reset", { phone: norm(fpPhone), otp: fpOtp, newPassword: fpNewPw });
      setFpOpen(false); setFpStep(1); setFpPhone(""); setFpOtp(""); setFpNewPw(""); setFpConfirm(""); setError("");
    } catch (err) {
      setFpError(err.response?.data?.message || "Failed to reset password");
    } finally { setFpLoading(false); }
  };

  /* ── shared styles ── */
  const inputStyle = field => ({
    width: "100%", height: 52, borderRadius: 14, padding: "0 16px",
    fontSize: 15, outline: "none",
    background: focusedField === field
      ? (isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)")
      : "var(--t-input-bg)",
    border: focusedField === field
      ? "1.5px solid rgba(99,102,241,0.6)"
      : "1.5px solid var(--t-border)",
    color: "var(--t-text)",
    boxShadow: focusedField === field
      ? "0 0 0 4px rgba(99,102,241,0.12)"
      : "none",
    transition: "all 0.25s ease",
  });

  return (
    <>
      <style>{CSS}</style>

      <div style={{
        minHeight: "100vh", display: "flex", background: "var(--t-bg)",
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      }}>

        {/* ══ LEFT BRAND PANEL ══════════════════════════════════════════ */}
        <div
          className="hidden lg:flex lg:w-[52%]"
          style={{
            position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg, #3730a3 0%, #6366f1 40%, #7c3aed 70%, #4f46e5 100%)",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "60px 56px",
          }}
        >
          {/* Animated orbs */}
          <div className="lg-pulse" style={{ position: "absolute", top: -120, left: -80, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div className="lg-pulse" style={{ position: "absolute", bottom: -80, right: -60, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 65%)", pointerEvents: "none", animationDelay: "1.5s" }} />
          {/* Grid texture */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>

            {/* Logo */}
            <div className="lg-u0" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 52 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>✂</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>My Salon Bookings</span>
            </div>

            {/* Headline */}
            <div className="lg-u1" style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: "clamp(2rem,3.5vw,2.8rem)", fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 14 }}>
                Welcome Back 👋
              </h1>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, maxWidth: 360 }}>
                Manage bookings, discover salons, and look your best.
              </p>
            </div>

            {/* Feature cards */}
            <div className="lg-u2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 40 }}>
              {FEATURES.map(({ icon, label, sub }, i) => (
                <div
                  key={label}
                  className={i % 2 === 0 ? "lg-f1" : "lg-f2"}
                  style={{
                    background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16,
                    padding: "16px 18px", animationDelay: `${i * 0.4}s`,
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Bottom trust line */}
            <div className="lg-u3" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 44 }}>
              <div style={{ display: "flex" }}>
                {["A","B","C","D"].map((l, i) => (
                  <div key={l} style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,hsl(${260+i*20},70%,65%),hsl(${240+i*20},70%,55%))`, border: "2px solid rgba(255,255,255,0.4)", marginLeft: i === 0 ? 0 : -8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{l}</div>
                ))}
              </div>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>50,000+ customers trust us</span>
            </div>
          </div>
        </div>

        {/* ══ RIGHT FORM PANEL ══════════════════════════════════════════ */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "32px 24px", position: "relative", minHeight: "100vh",
        }}>

          <div className="lg-u0 w-full" style={{ maxWidth: 400 }}>

            {/* Mobile logo */}
            <div className="lg:hidden lg-u0" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>✂</div>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--t-text)" }}>My Salon Bookings</span>
            </div>

            {/* Heading */}
            <div className="lg-u1" style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--t-text)", letterSpacing: "-0.8px", marginBottom: 6 }}>Sign In</h2>
              <p style={{ fontSize: 14, color: "var(--t-text-3)" }}>Welcome back — let's get you in ✨</p>
            </div>

            {/* Error */}
            {error && (
              <div className="lg-u0" style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 500, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                ⚠ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Phone */}
              <div className="lg-u2">
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", marginBottom: 8 }}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle("phone")}
                  required
                />
              </div>

              {/* Password */}
              <div className="lg-u3">
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", marginBottom: 8 }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    style={{ ...inputStyle("password"), paddingRight: 48 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--t-text-3)", lineHeight: 1 }}
                  >
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="lg-u4">
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%", height: 52, borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "0.01em",
                    boxShadow: loading ? "none" : "0 0 32px rgba(99,102,241,0.4)",
                    transition: "all 0.25s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 0 48px rgba(99,102,241,0.6)"; e.currentTarget.style.transform = "scale(1.02)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 32px rgba(99,102,241,0.4)"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {loading ? (
                    <>
                      <span className="lg-spin" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "block" }} />
                      Signing in…
                    </>
                  ) : "Sign In →"}
                </button>
              </div>
            </form>

            {/* Forgot + Register */}
            <div className="lg-u5" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => { setFpOpen(true); setFpPhone(phone); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: "var(--t-accent)", fontWeight: 600 }}
              >
                Forgot Password?
              </button>
              <p style={{ fontSize: 13.5, color: "var(--t-text-3)", textAlign: "center" }}>
                No account?{" "}
                <Link to="/register" state={{ from, bookingState }} style={{ color: "var(--t-accent)", fontWeight: 700, textDecoration: "none" }}>
                  Create one free →
                </Link>
              </p>
            </div>

          </div>
        </div>

        {/* ══ FORGOT PASSWORD MODAL ═════════════════════════════════════ */}
        {fpOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", padding: 20 }}>
            <div style={{ width: "100%", maxWidth: 380, background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 24, padding: 28, boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--t-text)", marginBottom: 2 }}>
                    {fpStep === 1 ? "Forgot Password" : "Reset Password"}
                  </h3>
                  <p style={{ fontSize: 12.5, color: "var(--t-text-3)" }}>
                    {fpStep === 1 ? "We'll send an OTP to your phone" : `OTP sent to ${fpPhone}`}
                  </p>
                </div>
                <button
                  onClick={() => { setFpOpen(false); setFpStep(1); }}
                  style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-input-bg)", border: "1px solid var(--t-border)", cursor: "pointer", color: "var(--t-text-3)", fontSize: 14 }}
                >✕</button>
              </div>

              {fpError && (
                <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                  {fpError}
                </div>
              )}

              {fpStep === 1 ? (
                <form onSubmit={handleFpSendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <input
                    type="tel" value={fpPhone} onChange={e => setFpPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={fpLoading}
                    style={{ ...inputStyle("fp-phone"), height: 48 }}
                    onFocus={() => setFocusedField("fp-phone")} onBlur={() => setFocusedField(null)}
                  />
                  <button type="submit" disabled={fpLoading} style={{ height: 48, borderRadius: 12, border: "none", cursor: fpLoading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 14, opacity: fpLoading ? 0.6 : 1 }}>
                    {fpLoading ? "Sending…" : "Send OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFpReset} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    type="text" value={fpOtp} onChange={e => setFpOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP" maxLength={6} disabled={fpLoading}
                    style={{ ...inputStyle("fp-otp"), height: 48 }}
                    onFocus={() => setFocusedField("fp-otp")} onBlur={() => setFocusedField(null)}
                  />
                  <div style={{ position: "relative" }}>
                    <input
                      type={fpShowPw ? "text" : "password"} value={fpNewPw} onChange={e => setFpNewPw(e.target.value)}
                      placeholder="New password" disabled={fpLoading}
                      style={{ ...inputStyle("fp-pw"), height: 48, paddingRight: 44 }}
                      onFocus={() => setFocusedField("fp-pw")} onBlur={() => setFocusedField(null)}
                    />
                    <button type="button" onClick={() => setFpShowPw(!fpShowPw)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--t-text-3)" }}>{fpShowPw ? "🙈" : "👁"}</button>
                  </div>
                  <input
                    type="password" value={fpConfirm} onChange={e => setFpConfirm(e.target.value)}
                    placeholder="Confirm new password" disabled={fpLoading}
                    style={{ ...inputStyle("fp-confirm"), height: 48 }}
                    onFocus={() => setFocusedField("fp-confirm")} onBlur={() => setFocusedField(null)}
                  />
                  <button type="submit" disabled={fpLoading} style={{ height: 48, borderRadius: 12, border: "none", cursor: fpLoading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 14, opacity: fpLoading ? 0.6 : 1 }}>
                    {fpLoading ? "Resetting…" : "Reset Password"}
                  </button>
                  <button
                    type="button"
                    onClick={fpTimer === 0 ? handleFpSendOtp : undefined}
                    disabled={fpTimer > 0 || fpLoading}
                    style={{ background: "none", border: "none", cursor: fpTimer > 0 ? "default" : "pointer", fontSize: 13, color: "var(--t-accent)", fontWeight: 600, opacity: fpTimer > 0 ? 0.5 : 1 }}
                  >
                    {fpTimer > 0 ? `Resend OTP in ${fpTimer}s` : "Resend OTP"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
