import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../config/firebase";
import API from "../services/api";

/* ── animations ── */
const CSS = `
  @keyframes rg-float1{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-16px) rotate(2deg);}}
  @keyframes rg-float2{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-12px) rotate(-2deg);}}
  @keyframes rg-pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:0.85;transform:scale(1.08);}}
  @keyframes rg-spin{to{transform:rotate(360deg);}}
  @keyframes rg-up{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
  @keyframes rg-slide{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
  @keyframes rg-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  .rg-f1{animation:rg-float1 7s ease-in-out infinite;}
  .rg-f2{animation:rg-float2 9s ease-in-out infinite;}
  .rg-pulse{animation:rg-pulse 3s ease-in-out infinite;}
  .rg-spin{animation:rg-spin .7s linear infinite;}
  .rg-u0{animation:rg-up .5s .00s ease both;}
  .rg-u1{animation:rg-up .5s .08s ease both;}
  .rg-u2{animation:rg-up .5s .16s ease both;}
  .rg-u3{animation:rg-up .5s .24s ease both;}
  .rg-u4{animation:rg-up .5s .32s ease both;}
  .rg-slide{animation:rg-slide .35s ease both;}
  .rg-shimmer{
    background:linear-gradient(90deg,#a78bfa,#818cf8,#c4b5fd,#a78bfa);
    background-size:300% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:rg-shimmer 4s linear infinite;
  }
`;

const BENEFITS = [
  { icon: "🆓", title: "Free account",        sub: "No hidden fees ever"      },
  { icon: "⚡", title: "Book in seconds",      sub: "Confirm instantly"        },
  { icon: "✅", title: "Instant confirmation", sub: "Real-time updates"        },
  { icon: "🏅", title: "Verified salons",      sub: "Genuine reviews only"     },
];

const STEP_META = [
  { num: 1, label: "Your Info"  },
  { num: 2, label: "Verify OTP" },
  { num: 3, label: "Password"   },
];

function pwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || (pw.length >= 10)) s++;
  return s; // 0–4
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

export default function Register() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from;
  const bookingState = location.state?.bookingState;

  const [step, setStep]           = useState(1);
  const [name, setName]           = useState("");
  const [phone, setPhone]         = useState("");
  const [gender, setGender]       = useState("");
  const [otp, setOtp]             = useState(["","","","","",""]);
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [otpTimer, setOtpTimer]   = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focusedField, setFocusedField]   = useState(null);

  const otpRefs        = useRef([]);
  const recaptchaRef   = useRef(null);
  const confirmationRef = useRef(null);
  const firebaseTokenRef = useRef("");

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  /* focus first OTP box when step 2 mounts */
  useEffect(() => {
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 120);
  }, [step]);

  const normalizePhone = p => {
    const c = p.replace(/\D/g, "");
    if (c.length === 10) return "+91" + c;
    if (c.length === 12 && c.startsWith("91")) return "+" + c;
    return "+" + c;
  };
  const validatePhone = p => /^\+91[6-9]\d{9}$/.test(normalizePhone(p));

  const getRecaptchaVerifier = () => {
    try { recaptchaRef.current?.clear(); } catch {}
    recaptchaRef.current = null;
    document.getElementById("recaptcha-container")?.remove();
    const container = document.createElement("div");
    container.id = "recaptcha-container";
    document.body.appendChild(container);
    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    return recaptchaRef.current;
  };

  const handleSendOtp = async e => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim() || !gender) { setError("Please fill all required fields."); return; }
    if (!validatePhone(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!agreedToTerms) { setError("Please accept the Terms & Conditions to continue."); return; }
    setError(""); setLoading(true);
    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, normalizePhone(phone), verifier);
      confirmationRef.current = confirmation;
      setStep(2); setOtpTimer(60);
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
      if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null; }
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async e => {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit OTP."); return; }
    setError(""); setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      firebaseTokenRef.current = await result.user.getIdToken();
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally { setLoading(false); }
  };

  const handleRegister = async e => {
    e.preventDefault();
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) {
      setError("Password must be at least 6 characters with letters and numbers.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await API.post("/customer/auth/firebase-register", {
        firebaseToken: firebaseTokenRef.current, name, password, gender,
      });
      const token = res.data.data?.token || res.data.token;
      if (token) localStorage.setItem("customerToken", token);
      from ? navigate(from, { state: bookingState, replace: true }) : navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  /* OTP box key handler */
  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace") {
      if (otp[i]) {
        const next = [...otp]; next[i] = ""; setOtp(next);
      } else if (i > 0) {
        otpRefs.current[i - 1]?.focus();
      }
    }
  };

  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    if (i === 5 && digit) {
      const code = [...next].join("");
      if (code.length === 6) setTimeout(() => handleVerifyOtp(), 80);
    }
  };

  /* shared input style */
  const inp = field => ({
    width: "100%", height: 52, borderRadius: 14, padding: "0 16px",
    fontSize: 15, outline: "none", boxSizing: "border-box",
    background: focusedField === field ? "rgba(99,102,241,0.06)" : "var(--t-input-bg)",
    border: focusedField === field ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid var(--t-border)",
    color: "var(--t-text)",
    boxShadow: focusedField === field ? "0 0 0 4px rgba(99,102,241,0.1)" : "none",
    transition: "all 0.25s ease",
  });

  const strength = pwStrength(password);

  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight: "100vh", display: "flex", background: "var(--t-bg)", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ══ LEFT BRAND PANEL ══ */}
        <div
          className="hidden lg:flex lg:w-[52%]"
          style={{
            position: "relative", overflow: "hidden",
            background: "linear-gradient(135deg,#312e81 0%,#4f46e5 35%,#7c3aed 65%,#6d28d9 100%)",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "60px 56px",
          }}
        >
          {/* orbs */}
          <div className="rg-pulse" style={{ position: "absolute", top: -100, right: -60, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.5) 0%,transparent 65%)", pointerEvents: "none" }} />
          <div className="rg-pulse" style={{ position: "absolute", bottom: -60, left: -80, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.4) 0%,transparent 65%)", pointerEvents: "none", animationDelay: "1.8s" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize: "48px 48px", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>

            {/* Logo */}
            <div className="rg-u0" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 52 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✂</div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>My Salon Bookings</span>
            </div>

            {/* Headline */}
            <div className="rg-u1" style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: "clamp(1.9rem,3vw,2.7rem)", fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 14 }}>
                Join My Salon Bookings ✨
              </h1>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, maxWidth: 360 }}>
                Create your account and book premium salon services instantly.
              </p>
            </div>

            {/* Benefit cards */}
            <div className="rg-u2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {BENEFITS.map(({ icon, title, sub }, i) => (
                <div
                  key={title}
                  className={i % 2 === 0 ? "rg-f1" : "rg-f2"}
                  style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 16, padding: "16px 18px", animationDelay: `${i * 0.35}s` }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Progress hint */}
            <div className="rg-u3" style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: step >= n ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.3s ease" }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                Step {step} of 3 — {STEP_META[step-1].label}
              </span>
            </div>
          </div>
        </div>

        {/* ══ RIGHT FORM PANEL ══ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", position: "relative", minHeight: "100vh" }}>

          <div className="rg-u0 w-full" style={{ maxWidth: 420 }}>

            {/* Mobile logo */}
            <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, justifyContent: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>✂</div>
              <span style={{ fontSize: 17, fontWeight: 800, color: "var(--t-text)" }}>My Salon Bookings</span>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--t-text)", letterSpacing: "-0.8px", marginBottom: 4 }}>Create Account</h2>
              <p style={{ fontSize: 14, color: "var(--t-text-3)" }}>Free forever · Takes less than 2 minutes</p>
            </div>

            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 28, gap: 0 }}>
              {STEP_META.map(({ num, label }, i) => (
                <div key={num} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, transition: "all 0.3s ease",
                      background: step > num ? "linear-gradient(135deg,#22c55e,#16a34a)" : step === num ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                      border: step > num ? "none" : step === num ? "none" : "1.5px solid var(--t-border)",
                      color: step >= num ? "#fff" : "var(--t-text-3)",
                      boxShadow: step === num ? "0 0 16px rgba(99,102,241,0.4)" : step > num ? "0 0 12px rgba(34,197,94,0.3)" : "none",
                    }}>
                      {step > num ? "✓" : num}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: step >= num ? "var(--t-text-2)" : "var(--t-text-3)", whiteSpace: "nowrap" }}>{label}</span>
                  </div>
                  {i < 2 && (
                    <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 16, borderRadius: 99, background: step > num ? "linear-gradient(90deg,#22c55e,#16a34a)" : "var(--t-border)", transition: "all 0.4s ease" }} />
                  )}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 500, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                ⚠ {error}
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <form key="step1" className="rg-slide" onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", marginBottom: 8 }}>Full Name</label>
                  <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                    style={inp("name")} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} required />
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", marginBottom: 8 }}>Phone Number</label>
                  <input type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)}
                    style={inp("phone")} onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} required />
                </div>

                {/* Gender */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", marginBottom: 10 }}>Gender</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ key: "male", icon: "👨", label: "Male" }, { key: "female", icon: "👩", label: "Female" }].map(({ key, icon, label }) => {
                      const active = gender === key;
                      return (
                        <button
                          key={key} type="button" onClick={() => setGender(key)}
                          style={{
                            flex: 1, height: 52, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                            fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.25s ease",
                            background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                            border: active ? "1.5px solid rgba(99,102,241,0.5)" : "1.5px solid var(--t-border)",
                            color: active ? "#fff" : "var(--t-text-2)",
                            boxShadow: active ? "0 0 20px rgba(99,102,241,0.35)" : "none",
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{icon}</span> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Terms */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <button
                    type="button" onClick={() => setAgreedToTerms(v => !v)}
                    style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: agreedToTerms ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                      border: agreedToTerms ? "none" : "1.5px solid var(--t-border)",
                      transition: "all 0.2s ease",
                      boxShadow: agreedToTerms ? "0 0 10px rgba(99,102,241,0.4)" : "none",
                    }}
                  >
                    {agreedToTerms && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                  </button>
                  <p style={{ fontSize: 13, color: "var(--t-text-3)", lineHeight: 1.6 }}>
                    I agree to the{" "}
                    <Link to="/legal/customer-terms" target="_blank" style={{ color: "var(--t-accent)", textDecoration: "none", fontWeight: 600 }}>Terms & Conditions</Link>
                    {" "}and{" "}
                    <Link to="/legal/customer-privacy" target="_blank" style={{ color: "var(--t-accent)", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</Link>
                  </p>
                </div>

                {/* CTA */}
                <button
                  type="submit" disabled={loading || !agreedToTerms}
                  style={{
                    width: "100%", height: 52, borderRadius: 14, border: "none",
                    cursor: loading || !agreedToTerms ? "not-allowed" : "pointer",
                    background: loading || !agreedToTerms ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    boxShadow: loading || !agreedToTerms ? "none" : "0 0 32px rgba(99,102,241,0.4)",
                    transition: "all 0.25s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={e => { if (!loading && agreedToTerms) { e.currentTarget.style.boxShadow = "0 0 48px rgba(99,102,241,0.6)"; e.currentTarget.style.transform = "scale(1.02)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 32px rgba(99,102,241,0.4)"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {loading ? (
                    <><span className="rg-spin" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "block" }} /> Sending OTP…</>
                  ) : "Send OTP →"}
                </button>
              </form>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <form key="step2" className="rg-slide" onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>📱</div>
                  <p style={{ fontSize: 14, color: "var(--t-text-2)", lineHeight: 1.6 }}>
                    OTP sent to <span style={{ fontWeight: 700, color: "var(--t-text)" }}>{phone}</span>
                  </p>
                </div>

                {/* 6-box OTP */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      onFocus={() => setFocusedField(`otp-${i}`)}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: 50, height: 58, borderRadius: 14, textAlign: "center",
                        fontSize: 22, fontWeight: 800, outline: "none",
                        background: focusedField === `otp-${i}` ? "rgba(99,102,241,0.08)" : digit ? "rgba(99,102,241,0.06)" : "var(--t-input-bg)",
                        border: focusedField === `otp-${i}` ? "1.5px solid rgba(99,102,241,0.6)" : digit ? "1.5px solid rgba(99,102,241,0.35)" : "1.5px solid var(--t-border)",
                        color: "var(--t-text)",
                        boxShadow: focusedField === `otp-${i}` ? "0 0 0 4px rgba(99,102,241,0.12)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit" disabled={loading || otp.join("").length < 6}
                  style={{
                    width: "100%", height: 52, borderRadius: 14, border: "none",
                    cursor: loading || otp.join("").length < 6 ? "not-allowed" : "pointer",
                    background: otp.join("").length < 6 ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    boxShadow: otp.join("").length === 6 ? "0 0 32px rgba(99,102,241,0.4)" : "none",
                    transition: "all 0.25s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {loading ? (
                    <><span className="rg-spin" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "block" }} /> Verifying…</>
                  ) : "Verify OTP →"}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  {otpTimer > 0 ? (
                    <p style={{ fontSize: 13, color: "var(--t-text-3)" }}>Resend in <span style={{ fontWeight: 700, color: "var(--t-text-2)" }}>{otpTimer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleSendOtp} disabled={loading}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13.5, color: "var(--t-accent)", fontWeight: 600 }}>
                      Resend OTP
                    </button>
                  )}
                  <button type="button" onClick={() => { setStep(1); setOtp(["","","","","",""]); setError(""); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--t-text-3)", textDecoration: "underline" }}>
                    Change phone number
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <form key="step3" className="rg-slide" onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>🔐</div>
                  <p style={{ fontSize: 14, color: "var(--t-text-2)" }}>Almost done! Set a secure password.</p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", marginBottom: 8 }}>Create Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} placeholder="Min 6 chars with letters & numbers"
                      value={password} onChange={e => setPassword(e.target.value)}
                      style={{ ...inp("password"), paddingRight: 48 }}
                      onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} required
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--t-text-3)", lineHeight: 1 }}>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                        {[1,2,3,4].map(n => (
                          <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, transition: "all 0.3s ease", background: strength >= n ? STRENGTH_COLOR[strength] : "var(--t-border)" }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: "100%", height: 52, borderRadius: 14, border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    boxShadow: loading ? "none" : "0 0 32px rgba(99,102,241,0.4)",
                    transition: "all 0.25s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 0 48px rgba(99,102,241,0.6)"; e.currentTarget.style.transform = "scale(1.02)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 32px rgba(99,102,241,0.4)"; e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {loading ? (
                    <><span className="rg-spin" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "block" }} /> Creating Account…</>
                  ) : "Create Account ✓"}
                </button>
              </form>
            )}

            {/* Sign in link */}
            <p style={{ marginTop: 24, textAlign: "center", fontSize: 13.5, color: "var(--t-text-3)" }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "var(--t-accent)", fontWeight: 700, textDecoration: "none" }}>Sign In →</Link>
            </p>

          </div>
        </div>

      </div>
    </>
  );
}
