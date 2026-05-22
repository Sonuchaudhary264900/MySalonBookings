import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../config/firebase";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import confetti from "canvas-confetti";

const CSS = `
  @keyframes lg-float1{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-18px) rotate(2deg);}}
  @keyframes lg-float2{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-12px) rotate(-2deg);}}
  @keyframes lg-pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:0.9;transform:scale(1.08);}}
  @keyframes lg-spin{to{transform:rotate(360deg);}}
  @keyframes lg-up{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lg-slide{from{opacity:0;transform:translateX(20px);}to{opacity:1;transform:translateX(0);}}
  .lg-f1{animation:lg-float1 6s ease-in-out infinite;}
  .lg-f2{animation:lg-float2 8s ease-in-out infinite;}
  .lg-pulse{animation:lg-pulse 3s ease-in-out infinite;}
  .lg-spin{animation:lg-spin .7s linear infinite;}
  .lg-u0{animation:lg-up .5s .00s ease both;}
  .lg-u1{animation:lg-up .5s .08s ease both;}
  .lg-u2{animation:lg-up .5s .16s ease both;}
  .lg-u3{animation:lg-up .5s .24s ease both;}
  .lg-slide{animation:lg-slide .35s ease both;}
  .lg-inp-wrap{position:relative;}
  .lg-inp-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;}
`;

const FeatCalendar = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const FeatHeart    = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const FeatZap      = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const FeatBell     = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;

const FEATURES = [
  { icon: <FeatCalendar />, label: "Track bookings",  sub: "All in one place"   },
  { icon: <FeatHeart />,    label: "Saved salons",    sub: "Your favourites"    },
  { icon: <FeatZap />,      label: "Instant booking", sub: "Confirm in seconds" },
  { icon: <FeatBell />,     label: "Smart reminders", sub: "Never miss a slot"  },
];

const PhoneIcon = ({ color }) => (
  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

export default function Login() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isDark, theme, toggleTheme } = useTheme();
  const from         = location.state?.from;
  const bookingState = location.state?.bookingState;

  const [step, setStep]       = useState(1);
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState(["","","","","",""]);
  const [name, setName]       = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const phoneRef         = useRef(null);
  const nameRef          = useRef(null);
  const otpRefs          = useRef([]);
  const recaptchaRef     = useRef(null);
  const confirmRef       = useRef(null);
  const firebaseTokenRef = useRef(null);

  useEffect(() => {
    if (step === 1) setTimeout(() => phoneRef.current?.focus(), 100);
    if (step === 2) setTimeout(() => otpRefs.current[0]?.focus(), 120);
    if (step === 3) setTimeout(() => nameRef.current?.focus(), 120);
  }, [step]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

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
    document.getElementById("lg-recaptcha")?.remove();
    const container = document.createElement("div");
    container.id = "lg-recaptcha";
    document.body.appendChild(container);
    recaptchaRef.current = new RecaptchaVerifier(auth, "lg-recaptcha", { size: "invisible" });
    return recaptchaRef.current;
  };

  const handleSendOtp = async e => {
    e?.preventDefault();
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    if (!validatePhone(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    setError(""); setLoading(true);
    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, normalizePhone(phone), verifier);
      confirmRef.current = confirmation;
      setStep(2); setOtpTimer(60);
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
      if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null; }
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e, codeOverride) => {
    e?.preventDefault();
    const code = codeOverride ?? otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit OTP."); return; }
    setError(""); setLoading(true);
    try {
      const result = await confirmRef.current.confirm(code);
      const firebaseToken = await result.user.getIdToken();
      const res = await API.post("/customer/auth/firebase-auth", { firebaseToken });
      const data = res.data.data || {};
      if (data.needsName) {
        firebaseTokenRef.current = firebaseToken;
        setStep(3);
      } else {
        if (data.token) localStorage.setItem("customerToken", data.token);
        if (data.customer?.gender) localStorage.setItem("customerGender", data.customer.gender);
        from ? navigate(from, { state: bookingState, replace: true }) : navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Sign in failed.");
    } finally { setLoading(false); }
  };

  const handleNameSubmit = async e => {
    e?.preventDefault();
    if (name.trim().length < 2) { setError("Enter your name (at least 2 characters)."); return; }
    setError(""); setLoading(true);
    try {
      const res = await API.post("/customer/auth/firebase-auth", {
        firebaseToken: firebaseTokenRef.current,
        name: name.trim(),
      });
      const { token, customer } = res.data.data || {};
      if (token) localStorage.setItem("customerToken", token);
      if (customer?.gender) localStorage.setItem("customerGender", customer.gender);
      try { confetti({ particleCount: 80, spread: 80, origin: { y: 0.65 }, colors: ['#6366f1','#8b5cf6','#22c55e','#a78bfa'] }); } catch {}
      from ? navigate(from, { state: bookingState, replace: true }) : navigate("/");
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Session expired. Please start again.");
        setTimeout(() => { setStep(1); setOtp(["","","","","",""]); setName(""); setError(""); }, 2500);
      } else {
        setError(err.response?.data?.message || err.message || "Registration failed.");
      }
    } finally { setLoading(false); }
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
    const fullCode = [...next].join("");
    if (i === 5 && digit && fullCode.length === 6) setTimeout(() => handleVerifyOtp(null, fullCode), 80);
  };

  const inpBgFocus = isDark ? "rgba(129,140,248,0.1)" : "rgba(99,102,241,0.05)";
  const inp = (field) => ({
    width:"100%", height:56, borderRadius:14,
    padding:"0 16px 0 44px",
    fontSize:16, outline:"none", boxSizing:"border-box",
    background: focusedField===field ? inpBgFocus : theme.input,
    border: focusedField===field ? `1.5px solid ${theme.accent}` : `1.5px solid ${theme.inputBorder}`,
    color: theme.text,
    boxShadow: focusedField===field ? "0 0 0 5px rgba(99,102,241,0.18)" : "none",
    transition:"all 0.22s ease", fontFamily:"inherit",
  });

  const leftBg = isDark
    ? "linear-gradient(145deg,#111827 0%,#1f2937 40%,#1f2937 70%,#111827 100%)"
    : "linear-gradient(135deg,#3730a3 0%,#6366f1 40%,#8b5cf6 70%,#4f46e5 100%)";

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", display:"flex", background:theme.bg, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ── LEFT BRAND PANEL ── */}
        <div className="hidden lg:flex lg:w-[52%]"
          style={{ position:"relative", overflow:"hidden", background:leftBg, flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 56px" }}>

          <div className="lg-pulse" style={{ position:"absolute", top:-120, left:-80, width:480, height:480, borderRadius:"50%", background: isDark ? "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)" : "radial-gradient(circle,rgba(139,92,246,0.45) 0%,transparent 65%)", pointerEvents:"none" }} />
          <div className="lg-pulse" style={{ position:"absolute", bottom:-80, right:-60, width:360, height:360, borderRadius:"50%", background: isDark ? "radial-gradient(circle,rgba(129,140,248,0.15) 0%,transparent 65%)" : "radial-gradient(circle,rgba(99,102,241,0.4) 0%,transparent 65%)", pointerEvents:"none", animationDelay:"1.5s" }} />
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />

          <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:440 }}>
            <div className="lg-u0" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:52 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#4C1D95,#A78BFA)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 24px rgba(124,58,237,0.45)" }}>
                <svg viewBox="0 0 512 512" width="22" height="22" fill="none"><path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/></svg>
              </div>
              <span style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-0.3px" }}>GlowLoox</span>
            </div>

            <div className="lg-u1" style={{ marginBottom:16 }}>
              <h1 style={{ fontSize:"clamp(2rem,3.5vw,2.8rem)", fontWeight:900, color:"#fff", lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:14 }}>
                Welcome Back 👋
              </h1>
              <p style={{ fontSize:16, color:"rgba(255,255,255,0.72)", lineHeight:1.7, maxWidth:360 }}>
                Manage bookings, discover salons, and look your best.
              </p>
            </div>

            <div className="lg-u2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:40 }}>
              {FEATURES.map(({ icon, label, sub }, i) => (
                <div key={label} className={i % 2 === 0 ? "lg-f1" : "lg-f2"}
                  style={{ background: isDark ? "rgba(31,41,55,0.6)" : "rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", border: isDark ? "1px solid #374151" : "1px solid rgba(255,255,255,0.18)", borderRadius:16, padding:"16px 18px", animationDelay:`${i * 0.4}s` }}>
                  <div style={{ display:'flex', marginBottom:6 }}>{icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: isDark ? theme.text : "#fff", marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:11, color: isDark ? theme.subText : "rgba(255,255,255,0.55)" }}>{sub}</div>
                </div>
              ))}
            </div>

            <div className="lg-u3" style={{ display:"flex", alignItems:"center", gap:8, marginTop:44 }}>
              <div style={{ display:"flex" }}>
                {["A","B","C","D"].map((l,i) => (
                  <div key={l} style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,hsl(${260+i*20},70%,65%),hsl(${240+i*20},70%,55%))`, border:"2px solid rgba(255,255,255,0.4)", marginLeft:i===0?0:-8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>{l}</div>
                ))}
              </div>
              <span style={{ fontSize:12.5, color:"rgba(255,255,255,0.65)", fontWeight:500 }}>50,000+ customers trust us</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 24px", position:"relative", minHeight:"100vh", background: isDark ? `radial-gradient(ellipse at 60% 10%, rgba(99,102,241,0.1) 0%, transparent 55%), ${theme.bg}` : theme.bg }}>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={isDark ? "Light mode" : "Dark mode"}
            style={{ position:"absolute", top:20, right:20, width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:theme.navBtn, border:`1px solid ${theme.navBtnBorder}`, cursor:"pointer" }}>
            {isDark ? (
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={theme.subText} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={theme.subText} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" /></svg>
            )}
          </button>

          <div className="lg-u0 w-full" style={{ maxWidth:400 }}>

            {/* Mobile logo */}
            <div className="lg:hidden" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32, justifyContent:"center" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#4C1D95,#A78BFA)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(124,58,237,0.45)" }}>
                <svg viewBox="0 0 512 512" width="20" height="20" fill="none"><path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/></svg>
              </div>
              <span style={{ fontSize:17, fontWeight:800, color:theme.text }}>GlowLoox</span>
            </div>

            {/* Heading */}
            <div style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:26, fontWeight:900, color:theme.text, letterSpacing:"-0.8px", marginBottom:4 }}>
                {step === 3 ? "What's your name?" : "Sign In"}
              </h2>
              <p style={{ fontSize:14, color:theme.placeholder }}>
                {step === 1 ? "Enter your phone number to continue" : step === 2 ? `OTP sent to ${normalizePhone(phone)}` : "We'll create your free account."}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginBottom:18, padding:"12px 16px", borderRadius:12, fontSize:13.5, fontWeight:500, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }}>
                ⚠ {error}
              </div>
            )}

            {/* ── STEP 1 — Phone ── */}
            {step === 1 && (
              <form key="step1" className="lg-slide" onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <label style={{ display:"block", fontSize:14, fontWeight:700, color:theme.text, marginBottom:8 }}>Phone Number</label>
                  <div className="lg-inp-wrap">
                    <span className="lg-inp-icon"><PhoneIcon color={focusedField==="phone" ? theme.accent : theme.placeholder} /></span>
                    <input ref={phoneRef} type="tel" placeholder="9876543210" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                      maxLength={10}
                      style={inp("phone")}
                      onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} required />
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
                    <><span className="lg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Sending OTP…</>
                  ) : "Continue"}
                </button>

                <p style={{ textAlign:"center", fontSize:13.5, color:theme.placeholder }}>
                  No account?{" "}
                  <Link to="/register" state={{ from, bookingState }} style={{ color:theme.accent, fontWeight:700, textDecoration:"none" }}>Create one free →</Link>
                </p>
              </form>
            )}

            {/* ── STEP 2 — OTP ── */}
            {step === 2 && (
              <form key="step2" className="lg-slide" onSubmit={handleVerifyOtp} style={{ display:"flex", flexDirection:"column", gap:20 }}>

                <div style={{ display:"flex", justifyContent:"center", padding:"4px 0", marginBottom:10 }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth={1.8}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </div>
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
                        boxShadow: focusedField===`otp-${i}` ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
                        transition:"all 0.18s ease", fontFamily:"inherit", boxSizing:"border-box",
                      }} />
                  ))}
                </div>

                <button type="submit" disabled={loading||otp.join("").length<6}
                  style={{ width:"100%", height:52, borderRadius:14, border:"none", cursor:loading||otp.join("").length<6?"not-allowed":"pointer",
                    background:otp.join("").length<6?"rgba(99,102,241,0.4)":"linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color:"#fff", fontSize:15, fontWeight:700,
                    boxShadow:otp.join("").length===6?"0 0 32px rgba(99,102,241,0.4)":"none",
                    transition:"all 0.22s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  onMouseDown={e => { if (!loading && otp.join("").length===6) e.currentTarget.style.transform="scale(0.97)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}>
                  {loading ? (
                    <><span className="lg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Signing in…</>
                  ) : "Verify & Sign In"}
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

            {/* ── STEP 3 — Name ── */}
            {step === 3 && (
              <form key="step3" className="lg-slide" onSubmit={handleNameSubmit} style={{ display:"flex", flexDirection:"column", gap:20 }}>

                <div style={{ display:"flex", justifyContent:"center", padding:"4px 0", marginBottom:10 }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(99,102,241,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#6366f1" strokeWidth={1.8}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </div>

                <div>
                  <label style={{ display:"block", fontSize:14, fontWeight:700, color:theme.text, marginBottom:8 }}>Your Name</label>
                  <input ref={nameRef} type="text" placeholder="e.g. Priya Sharma" value={name}
                    onChange={e => setName(e.target.value.slice(0, 60))}
                    maxLength={60}
                    style={{ width:"100%", height:56, borderRadius:14, padding:"0 16px", fontSize:16, outline:"none", boxSizing:"border-box",
                      background: focusedField==="name" ? (isDark ? "rgba(129,140,248,0.1)" : "rgba(99,102,241,0.05)") : theme.input,
                      border: focusedField==="name" ? `1.5px solid ${theme.accent}` : `1.5px solid ${theme.inputBorder}`,
                      color: theme.text,
                      boxShadow: focusedField==="name" ? "0 0 0 5px rgba(99,102,241,0.18)" : "none",
                      transition:"all 0.22s ease", fontFamily:"inherit",
                    }}
                    onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} required />
                </div>

                <button type="submit" disabled={loading || name.trim().length < 2}
                  style={{ width:"100%", height:56, borderRadius:14, border:"none",
                    cursor: loading || name.trim().length < 2 ? "not-allowed" : "pointer",
                    background: name.trim().length < 2 ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color:"#fff", fontSize:15, fontWeight:700,
                    boxShadow: name.trim().length >= 2 ? "0 0 32px rgba(99,102,241,0.4)" : "none",
                    transition:"all 0.22s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  onMouseDown={e => { if (!loading && name.trim().length >= 2) e.currentTarget.style.transform="scale(0.97)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform="scale(1)"; }}>
                  {loading ? (
                    <><span className="lg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Creating account…</>
                  ) : "Continue →"}
                </button>

              </form>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
