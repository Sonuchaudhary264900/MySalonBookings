import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../config/firebase";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";

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
  .rg-inp-wrap{position:relative;}
  .rg-inp-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;}
  .rg-inp-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;}
`;

const BENEFITS = [
  { icon: "🆓", title: "Free account",        sub: "No hidden fees ever"  },
  { icon: "⚡", title: "Book in seconds",      sub: "Confirm instantly"    },
  { icon: "✅", title: "Instant confirmation", sub: "Real-time updates"    },
  { icon: "🏅", title: "Verified salons",      sub: "Genuine reviews only" },
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
  if (/[^a-zA-Z0-9]/.test(pw) || pw.length >= 10) s++;
  return s;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

/* SVG icons */
const UserIcon = ({ color }) => (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const PhoneIcon = ({ color }) => (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const LockIcon = ({ color }) => (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const EyeIcon = ({ open, color }) => open ? (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export default function Register() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isDark, theme, toggleTheme } = useTheme();
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
  const [focusedField, setFocusedField]   = useState(null);
  const [genderSaving, setGenderSaving]   = useState(false);

  const otpRefs         = useRef([]);
  const recaptchaRef    = useRef(null);
  const confirmationRef = useRef(null);
  const firebaseTokenRef = useRef("");

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

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
    if (!name.trim() || !phone.trim()) { setError("Please fill all required fields."); return; }
    if (!validatePhone(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
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
        firebaseToken: firebaseTokenRef.current, name, password,
      });
      const token = res.data.data?.token || res.data.token;
      if (token) localStorage.setItem("customerToken", token);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  const handleGenderContinue = async () => {
    if (gender) {
      setGenderSaving(true);
      try {
        await API.put('/customer/auth/me', { name, gender });
        localStorage.setItem("customerGender", gender);
      } catch { /* silent — non-critical */ }
      finally { setGenderSaving(false); }
    }
    from ? navigate(from, { state: bookingState, replace: true }) : navigate("/dashboard");
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace") {
      if (otp[i]) { const next=[...otp]; next[i]=""; setOtp(next); }
      else if (i > 0) otpRefs.current[i-1]?.focus();
    }
  };
  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g,"").slice(-1);
    const next=[...otp]; next[i]=digit; setOtp(next);
    if (digit && i < 5) otpRefs.current[i+1]?.focus();
    if (i === 5 && digit && [...next].join("").length === 6) setTimeout(() => handleVerifyOtp(), 80);
  };

  const inpBgFocus = isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.05)';

  const inp = (field, withIcon=false) => ({
    width:"100%", height:52, borderRadius:14,
    padding: withIcon ? "0 16px 0 44px" : "0 16px",
    fontSize:15, outline:"none", boxSizing:"border-box",
    background: focusedField===field ? inpBgFocus : theme.input,
    border: focusedField===field ? `1.5px solid ${theme.accent}` : `1.5px solid ${theme.inputBorder}`,
    color: theme.text,
    boxShadow: focusedField===field ? "0 0 0 4px rgba(99,102,241,0.12)" : "none",
    transition:"all 0.22s ease",
    fontFamily:"inherit",
  });

  const strength = pwStrength(password);
  const leftBg = isDark
    ? "linear-gradient(145deg,#111827 0%,#1f2937 40%,#1f2937 70%,#111827 100%)"
    : "linear-gradient(135deg,#312e81 0%,#4f46e5 35%,#8b5cf6 65%,#6d28d9 100%)";

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", display:"flex", background:theme.bg, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ── LEFT BRAND PANEL ── */}
        <div className="hidden lg:flex lg:w-[52%]"
          style={{ position:"relative", overflow:"hidden", background:leftBg, flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 56px" }}>

          <div className="rg-pulse" style={{ position:"absolute", top:-100, right:-60, width:420, height:420, borderRadius:"50%", background: isDark ? "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)" : "radial-gradient(circle,rgba(139,92,246,0.5) 0%,transparent 65%)", pointerEvents:"none" }} />
          <div className="rg-pulse" style={{ position:"absolute", bottom:-60, left:-80, width:340, height:340, borderRadius:"50%", background: isDark ? "radial-gradient(circle,rgba(129,140,248,0.15) 0%,transparent 65%)" : "radial-gradient(circle,rgba(99,102,241,0.4) 0%,transparent 65%)", pointerEvents:"none", animationDelay:"1.8s" }} />
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />

          <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:440 }}>
            {/* Logo */}
            <div className="rg-u0" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:52 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:"rgba(255,255,255,0.18)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>✂</div>
              <span style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-0.3px" }}>My Salon Bookings</span>
            </div>

            {/* Headline */}
            <div className="rg-u1" style={{ marginBottom:40 }}>
              <h1 style={{ fontSize:"clamp(1.9rem,3vw,2.7rem)", fontWeight:900, color:"#fff", lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:14 }}>
                Join My Salon Bookings ✨
              </h1>
              <p style={{ fontSize:16, color:"rgba(255,255,255,0.7)", lineHeight:1.75, maxWidth:360 }}>
                Create your account and book premium salon services instantly.
              </p>
            </div>

            {/* Benefit cards */}
            <div className="rg-u2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {BENEFITS.map(({ icon, title, sub }, i) => (
                <div key={title} className={i%2===0?"rg-f1":"rg-f2"}
                  style={{ background:"rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:16, padding:"16px 18px", animationDelay:`${i*0.35}s` }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:2 }}>{title}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Step progress hint */}
            <div className="rg-u3" style={{ marginTop:40, display:"flex", alignItems:"center", gap:10, padding:"14px 18px", background:"rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", borderRadius:14, border:"1px solid rgba(255,255,255,0.15)" }}>
              <div style={{ display:"flex", gap:6 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ width:8, height:8, borderRadius:"50%", background:step>=n?"#fff":"rgba(255,255,255,0.3)", transition:"all 0.3s ease" }} />
                ))}
              </div>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.75)", fontWeight:500 }}>
                Step {step} of 3 — {STEP_META[step-1].label}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", position:"relative", minHeight:"100vh", background:theme.bg }}>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}
            style={{ position:"absolute", top:20, right:20, width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:theme.navBtn, border:`1px solid ${theme.navBtnBorder}`, cursor:"pointer" }}>
            {isDark ? (
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={theme.subText} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={theme.subText} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></svg>
            )}
          </button>

          <div className="rg-u0 w-full" style={{ maxWidth:420 }}>

            {/* Mobile logo */}
            <div className="lg:hidden" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28, justifyContent:"center" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 0 20px rgba(99,102,241,0.4)" }}>✂</div>
              <span style={{ fontSize:17, fontWeight:800, color:theme.text }}>My Salon Bookings</span>
            </div>

            {/* Heading */}
            <div style={{ marginBottom:24 }}>
              <h2 style={{ fontSize:26, fontWeight:900, color:theme.text, letterSpacing:"-0.8px", marginBottom:4 }}>Create Account</h2>
              <p style={{ fontSize:14, color:theme.placeholder }}>Create your account in seconds</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom:18, padding:"12px 16px", borderRadius:12, fontSize:13.5, fontWeight:500, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }}>
                ⚠ {error}
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <form key="step1" className="rg-slide" onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:18 }}>

                <div>
                  <label style={{ display:"block", fontSize:14, fontWeight:700, color:theme.text, marginBottom:8 }}>Phone Number</label>
                  <div className="rg-inp-wrap">
                    <span className="rg-inp-icon"><PhoneIcon color={focusedField==="phone"?theme.accent:theme.placeholder} /></span>
                    <input type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)}
                      style={{ ...inp("phone",true), height:60, fontSize:16, boxShadow: focusedField==="phone" ? "0 0 0 5px rgba(99,102,241,0.18)" : "none" }}
                      onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} required />
                  </div>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:theme.placeholder, marginBottom:8 }}>Full Name</label>
                  <div className="rg-inp-wrap">
                    <span className="rg-inp-icon"><UserIcon color={focusedField==="name"?theme.accent:theme.placeholder} /></span>
                    <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)}
                      style={inp("name",true)} onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} required />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  style={{ width:"100%", height:56, borderRadius:14, border:"none", cursor:loading?"not-allowed":"pointer",
                    background:loading?"rgba(99,102,241,0.4)":"linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color:"#fff", fontSize:15, fontWeight:700,
                    boxShadow:loading?"none":"0 0 32px rgba(99,102,241,0.4)",
                    transition:"all 0.22s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow="0 0 48px rgba(99,102,241,0.65)"; e.currentTarget.style.transform="scale(1.02)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow="0 0 32px rgba(99,102,241,0.4)"; e.currentTarget.style.transform="scale(1)"; }}
                  onMouseDown={e => { if (!loading) e.currentTarget.style.transform="scale(0.97)"; }}
                  onMouseUp={e => { if (!loading) e.currentTarget.style.transform="scale(1)"; }}>
                  {loading ? (
                    <><span className="rg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Sending OTP…</>
                  ) : "Continue"}
                </button>

                <p style={{ textAlign:"center", fontSize:12, color:theme.placeholder, lineHeight:1.6, margin:0 }}>
                  By continuing, you agree to our{" "}
                  <Link to="/legal/customer-terms" target="_blank" style={{ color:theme.accent, textDecoration:"none", fontWeight:600 }}>Terms</Link>
                  {" "}&amp;{" "}
                  <Link to="/legal/customer-privacy" target="_blank" style={{ color:theme.accent, textDecoration:"none", fontWeight:600 }}>Privacy Policy</Link>
                </p>

                <p style={{ textAlign:"center", fontSize:12, color:theme.placeholder, margin:0 }}>
                  Takes less than 10 seconds · No password required at this step
                </p>
              </form>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <form key="step2" className="rg-slide" onSubmit={handleVerifyOtp} style={{ display:"flex", flexDirection:"column", gap:20 }}>
                <div style={{ textAlign:"center", padding:"8px 0 4px" }}>
                  <div style={{ fontSize:42, marginBottom:10 }}>📱</div>
                  <p style={{ fontSize:14, color:theme.subText, lineHeight:1.6 }}>
                    OTP sent to <span style={{ fontWeight:700, color:theme.text }}>{phone}</span>
                  </p>
                </div>

                <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => otpRefs.current[i]=el}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      onFocus={() => setFocusedField(`otp-${i}`)} onBlur={() => setFocusedField(null)}
                      style={{ width:50, height:58, borderRadius:14, textAlign:"center", fontSize:22, fontWeight:800, outline:"none",
                        background: focusedField===`otp-${i}` ? inpBgFocus : digit ? (isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)") : theme.input,
                        border: focusedField===`otp-${i}` ? `1.5px solid ${theme.accent}` : digit ? `1.5px solid rgba(99,102,241,0.35)` : `1.5px solid ${theme.inputBorder}`,
                        color: theme.text,
                        boxShadow: focusedField===`otp-${i}` ? "0 0 0 4px rgba(99,102,241,0.12)" : "none",
                        transition:"all 0.2s ease", fontFamily:"inherit",
                      }}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading||otp.join("").length<6}
                  style={{ width:"100%", height:52, borderRadius:14, border:"none", cursor:loading||otp.join("").length<6?"not-allowed":"pointer",
                    background:otp.join("").length<6?"rgba(99,102,241,0.4)":"linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color:"#fff", fontSize:15, fontWeight:700,
                    boxShadow:otp.join("").length===6?"0 0 32px rgba(99,102,241,0.4)":"none",
                    transition:"all 0.22s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {loading ? (
                    <><span className="rg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Verifying…</>
                  ) : "Verify OTP →"}
                </button>

                <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
                  {otpTimer > 0 ? (
                    <p style={{ fontSize:13, color:theme.placeholder }}>Resend in <span style={{ fontWeight:700, color:theme.subText }}>{otpTimer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleSendOtp} disabled={loading}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:13.5, color:theme.accent, fontWeight:600 }}>
                      Resend OTP
                    </button>
                  )}
                  <button type="button" onClick={() => { setStep(1); setOtp(["","","","","",""]); setError(""); }}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:theme.placeholder, textDecoration:"underline" }}>
                    Change phone number
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <form key="step3" className="rg-slide" onSubmit={handleRegister} style={{ display:"flex", flexDirection:"column", gap:20 }}>
                <div style={{ textAlign:"center", padding:"8px 0 4px" }}>
                  <div style={{ fontSize:42, marginBottom:10 }}>🔐</div>
                  <p style={{ fontSize:14, color:theme.subText }}>Almost done! Set a secure password.</p>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:13, fontWeight:600, color:theme.subText, marginBottom:8 }}>Create Password</label>
                  <div className="rg-inp-wrap">
                    <span className="rg-inp-icon"><LockIcon color={focusedField==="password"?theme.accent:theme.placeholder} /></span>
                    <input type={showPass?"text":"password"} placeholder="Min 6 chars with letters & numbers"
                      value={password} onChange={e => setPassword(e.target.value)}
                      style={{ ...inp("password",true), paddingRight:44 }}
                      onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} required />
                    <button type="button" className="rg-inp-eye" onClick={() => setShowPass(!showPass)}>
                      <EyeIcon open={showPass} color={theme.placeholder} />
                    </button>
                  </div>
                  {password && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ display:"flex", gap:5, marginBottom:6 }}>
                        {[1,2,3,4].map(n => (
                          <div key={n} style={{ flex:1, height:4, borderRadius:99, transition:"all 0.3s ease", background:strength>=n?STRENGTH_COLOR[strength]:theme.inputBorder }} />
                        ))}
                      </div>
                      <p style={{ fontSize:12, fontWeight:600, color:STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</p>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  style={{ width:"100%", height:52, borderRadius:14, border:"none", cursor:loading?"not-allowed":"pointer",
                    background:loading?"rgba(99,102,241,0.5)":"linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color:"#fff", fontSize:15, fontWeight:700,
                    boxShadow:loading?"none":"0 0 32px rgba(99,102,241,0.4)",
                    transition:"all 0.22s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow="0 0 48px rgba(99,102,241,0.65)"; e.currentTarget.style.transform="scale(1.02)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow="0 0 32px rgba(99,102,241,0.4)"; e.currentTarget.style.transform="scale(1)"; }}>
                  {loading ? (
                    <><span className="rg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Creating Account…</>
                  ) : "Create Account ✓"}
                </button>
              </form>
            )}

            {/* ── STEP 4 — Gender Onboarding ── */}
            {step === 4 && (
              <div key="step4" className="rg-slide" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"0 8px" }}>

                <div className="rg-u0" style={{ fontSize:48, marginBottom:20 }}>✨</div>

                <div className="rg-u1" style={{ marginBottom:8 }}>
                  <h2 style={{ fontSize:26, fontWeight:900, color:theme.text, letterSpacing:"-0.6px", lineHeight:1.2 }}>
                    Personalize your experience
                  </h2>
                </div>

                <div className="rg-u2" style={{ marginBottom:36 }}>
                  <p style={{ fontSize:14, color:theme.placeholder, lineHeight:1.6, maxWidth:280 }}>
                    We use this to show you the most relevant salons and services near you.
                  </p>
                </div>

                <div className="rg-u3" style={{ display:"flex", gap:16, marginBottom:36, width:"100%" }}>
                  {[
                    { key:"male",   emoji:"👨", label:"Male",   sub:"Men's salons & barbershops" },
                    { key:"female", emoji:"👩", label:"Female",  sub:"Ladies' salons & spas"     },
                  ].map(({ key, emoji, label, sub }) => {
                    const active = gender === key;
                    return (
                      <button key={key} type="button"
                        onClick={() => setGender(g => g === key ? "" : key)}
                        style={{
                          flex:1, borderRadius:20, padding:"28px 12px", cursor:"pointer",
                          display:"flex", flexDirection:"column", alignItems:"center", gap:12,
                          background: active
                            ? (isDark ? "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.18))" : "linear-gradient(135deg,rgba(99,102,241,0.10),rgba(139,92,246,0.10))")
                            : theme.input,
                          border: active ? "2px solid #8b5cf6" : `2px solid ${theme.inputBorder}`,
                          boxShadow: active ? "0 0 0 4px rgba(139,92,246,0.15),0 8px 32px rgba(99,102,241,0.2)" : "none",
                          transform: active ? "scale(1.03)" : "scale(1)",
                          transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
                          outline: "none",
                        }}>
                        <div style={{
                          width:80, height:80, borderRadius:"50%",
                          background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                          border: active ? "none" : `2px solid ${theme.inputBorder}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:36,
                          boxShadow: active ? "0 8px 24px rgba(99,102,241,0.35)" : "none",
                          transition:"all 0.22s ease",
                        }}>
                          {emoji}
                        </div>
                        <div>
                          <p style={{ fontSize:16, fontWeight:800, color: active ? "#8b5cf6" : theme.text, marginBottom:4, transition:"color 0.22s" }}>{label}</p>
                          <p style={{ fontSize:11, color:theme.placeholder, lineHeight:1.4 }}>{sub}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rg-u4" style={{ width:"100%" }}>
                  <button type="button"
                    onClick={handleGenderContinue}
                    disabled={genderSaving}
                    style={{
                      width:"100%", height:52, borderRadius:14, border:"none",
                      background: gender ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                      color: gender ? "#fff" : theme.placeholder,
                      fontSize:15, fontWeight:700, cursor: gender && !genderSaving ? "pointer" : "default",
                      boxShadow: gender ? "0 0 32px rgba(99,102,241,0.4)" : "none",
                      transition:"all 0.3s ease",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    }}>
                    {genderSaving
                      ? <><span className="rg-spin" style={{ width:18,height:18,border:"2.5px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"block" }}/> Saving…</>
                      : "Continue →"}
                  </button>
                </div>

                <div className="rg-u5" style={{ marginTop:16 }}>
                  <button type="button"
                    onClick={handleGenderContinue}
                    disabled={genderSaving}
                    style={{ background:"none", border:"none", cursor:"pointer", fontSize:13.5, color:theme.placeholder, fontWeight:500 }}>
                    Skip for now
                  </button>
                </div>

              </div>
            )}

            {step < 4 && (
            <p style={{ marginTop:24, textAlign:"center", fontSize:13.5, color:theme.placeholder }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color:theme.accent, fontWeight:700, textDecoration:"none" }}>Sign In →</Link>
            </p>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
