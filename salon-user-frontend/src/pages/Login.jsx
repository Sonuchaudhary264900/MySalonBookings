import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";

const CSS = `
  @keyframes lg-float1{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-18px) rotate(2deg);}}
  @keyframes lg-float2{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-12px) rotate(-2deg);}}
  @keyframes lg-pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:0.9;transform:scale(1.08);}}
  @keyframes lg-spin{to{transform:rotate(360deg);}}
  @keyframes lg-up{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lg-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  .lg-f1{animation:lg-float1 6s ease-in-out infinite;}
  .lg-f2{animation:lg-float2 8s ease-in-out infinite;}
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
  .lg-inp-wrap{position:relative;}
  .lg-inp-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;}
  .lg-inp-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:0;line-height:1;display:flex;align-items:center;}
`;

const FEATURES = [
  { icon: "📅", label: "Track bookings",  sub: "All in one place"   },
  { icon: "❤️", label: "Saved salons",    sub: "Your favourites"    },
  { icon: "⚡", label: "Instant booking", sub: "Confirm in seconds" },
  { icon: "🔔", label: "Smart reminders", sub: "Never miss a slot"  },
];

/* SVG icons */
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

export default function Login() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { isDark, theme, toggleTheme } = useTheme();
  const from         = location.state?.from;
  const bookingState = location.state?.bookingState;

  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [focusedField, setFocusedField] = useState(null);

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
      setError(err.response?.data?.message || "Invalid phone or password.");
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

  const inpBgFocus = isDark ? 'rgba(129,140,248,0.1)' : 'rgba(99,102,241,0.05)';

  const inputStyle = (field) => ({
    width: "100%", height: 52, borderRadius: 14,
    padding: "0 44px 0 44px",
    fontSize: 15, outline: "none", boxSizing: "border-box",
    background: focusedField === field ? inpBgFocus : theme.input,
    border: focusedField === field ? `1.5px solid ${theme.accent}` : `1.5px solid ${theme.inputBorder}`,
    color: theme.text,
    boxShadow: focusedField === field ? `0 0 0 4px rgba(99,102,241,0.12)` : "none",
    transition: "all 0.22s ease",
    fontFamily: "inherit",
  });

  const fpInputStyle = (field) => ({
    width: "100%", height: 48, borderRadius: 12,
    padding: "0 16px", fontSize: 14, outline: "none", boxSizing: "border-box",
    background: focusedField === field ? inpBgFocus : theme.input,
    border: focusedField === field ? `1.5px solid ${theme.accent}` : `1.5px solid ${theme.inputBorder}`,
    color: theme.text,
    boxShadow: focusedField === field ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    transition: "all 0.22s ease",
    fontFamily: "inherit",
  });

  /* left panel */
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

          {/* Orbs */}
          <div className="lg-pulse" style={{ position:"absolute", top:-120, left:-80, width:480, height:480, borderRadius:"50%", background: isDark ? "radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 65%)" : "radial-gradient(circle,rgba(139,92,246,0.45) 0%,transparent 65%)", pointerEvents:"none" }} />
          <div className="lg-pulse" style={{ position:"absolute", bottom:-80, right:-60, width:360, height:360, borderRadius:"50%", background: isDark ? "radial-gradient(circle,rgba(129,140,248,0.15) 0%,transparent 65%)" : "radial-gradient(circle,rgba(99,102,241,0.4) 0%,transparent 65%)", pointerEvents:"none", animationDelay:"1.5s" }} />
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }} />

          <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:440 }}>
            {/* Logo */}
            <div className="lg-u0" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:52 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:"rgba(255,255,255,0.18)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:"0 8px 24px rgba(0,0,0,0.2)" }}>✂</div>
              <span style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-0.3px" }}>My Salon Bookings</span>
            </div>

            {/* Headline */}
            <div className="lg-u1" style={{ marginBottom:16 }}>
              <h1 style={{ fontSize:"clamp(2rem,3.5vw,2.8rem)", fontWeight:900, color:"#fff", lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:14 }}>
                Welcome Back 👋
              </h1>
              <p style={{ fontSize:16, color:"rgba(255,255,255,0.72)", lineHeight:1.7, maxWidth:360 }}>
                Manage bookings, discover salons, and look your best.
              </p>
            </div>

            {/* Feature cards */}
            <div className="lg-u2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:40 }}>
              {FEATURES.map(({ icon, label, sub }, i) => (
                <div key={label} className={i % 2 === 0 ? "lg-f1" : "lg-f2"}
                  style={{ background: isDark ? "rgba(31,41,55,0.6)" : "rgba(255,255,255,0.1)", backdropFilter:"blur(12px)", border: isDark ? `1px solid #374151` : "1px solid rgba(255,255,255,0.18)", borderRadius:16, padding:"16px 18px", animationDelay:`${i * 0.4}s` }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
                  <div style={{ fontSize:13, fontWeight:700, color: isDark ? theme.text : "#fff", marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:11, color: isDark ? theme.subText : "rgba(255,255,255,0.55)" }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Trust line */}
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
            <div className="lg:hidden lg-u0" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32, justifyContent:"center" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 0 20px rgba(99,102,241,0.4)" }}>✂</div>
              <span style={{ fontSize:17, fontWeight:800, color:theme.text }}>My Salon Bookings</span>
            </div>

            {/* Heading */}
            <div className="lg-u1" style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:28, fontWeight:900, color:theme.text, letterSpacing:"-0.8px", marginBottom:6 }}>Sign In</h2>
              <p style={{ fontSize:14, color:theme.placeholder }}>Welcome back — let's get you in ✨</p>
            </div>

            {/* Error */}
            {error && (
              <div className="lg-u0" style={{ marginBottom:18, padding:"12px 16px", borderRadius:12, fontSize:13.5, fontWeight:500, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }}>
                ⚠ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:18 }}>

              {/* Phone */}
              <div className="lg-u2">
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:theme.subText, marginBottom:8 }}>Phone Number</label>
                <div className="lg-inp-wrap">
                  <span className="lg-inp-icon"><PhoneIcon color={focusedField==="phone" ? theme.accent : theme.placeholder} /></span>
                  <input type="tel" placeholder="+91 98765 43210" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)}
                    style={inputStyle("phone")} required />
                </div>
              </div>

              {/* Password */}
              <div className="lg-u3">
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:theme.subText, marginBottom:8 }}>Password</label>
                <div className="lg-inp-wrap">
                  <span className="lg-inp-icon"><LockIcon color={focusedField==="password" ? theme.accent : theme.placeholder} /></span>
                  <input type={showPass ? "text" : "password"} placeholder="Enter your password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
                    style={{ ...inputStyle("password"), paddingRight:44 }} required />
                  <button type="button" className="lg-inp-eye" onClick={() => setShowPass(!showPass)} style={{ right:14 }}>
                    <EyeIcon open={showPass} color={theme.placeholder} />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="lg-u4">
                <button type="submit" disabled={loading}
                  style={{ width:"100%", height:52, borderRadius:14, border:"none", cursor:loading?"not-allowed":"pointer", background:loading?"rgba(99,102,241,0.5)":"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:700, boxShadow:loading?"none":"0 0 32px rgba(99,102,241,0.4)", transition:"all 0.22s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow="0 0 48px rgba(99,102,241,0.65)"; e.currentTarget.style.transform="scale(1.02)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow="0 0 32px rgba(99,102,241,0.4)"; e.currentTarget.style.transform="scale(1)"; }}>
                  {loading ? (
                    <><span className="lg-spin" style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"block" }} /> Signing in…</>
                  ) : "Sign In →"}
                </button>
              </div>
            </form>

            {/* Forgot + Register */}
            <div className="lg-u5" style={{ marginTop:20, display:"flex", flexDirection:"column", gap:14, alignItems:"center" }}>
              <button type="button" onClick={() => { setFpOpen(true); setFpPhone(phone); }}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:13.5, color:theme.accent, fontWeight:600 }}>
                Forgot Password?
              </button>
              <p style={{ fontSize:13.5, color:theme.placeholder, textAlign:"center" }}>
                No account?{" "}
                <Link to="/register" state={{ from, bookingState }} style={{ color:theme.accent, fontWeight:700, textDecoration:"none" }}>
                  Create one free →
                </Link>
              </p>
            </div>

          </div>
        </div>

        {/* ── FORGOT PASSWORD MODAL ── */}
        {fpOpen && (
          <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)", padding:20 }}>
            <div style={{ width:"100%", maxWidth:380, background:theme.card, border:`1px solid ${theme.border}`, borderRadius:24, padding:28, boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                  <h3 style={{ fontSize:18, fontWeight:800, color:theme.text, marginBottom:2 }}>
                    {fpStep === 1 ? "Forgot Password" : "Reset Password"}
                  </h3>
                  <p style={{ fontSize:12.5, color:theme.placeholder }}>
                    {fpStep === 1 ? "We'll send an OTP to your phone" : `OTP sent to ${fpPhone}`}
                  </p>
                </div>
                <button onClick={() => { setFpOpen(false); setFpStep(1); }}
                  style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:theme.input, border:`1px solid ${theme.inputBorder}`, cursor:"pointer", color:theme.placeholder, fontSize:14 }}>✕</button>
              </div>

              {fpError && (
                <div style={{ marginBottom:16, padding:"10px 14px", borderRadius:10, fontSize:13, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171" }}>{fpError}</div>
              )}

              {fpStep === 1 ? (
                <form onSubmit={handleFpSendOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <input type="tel" value={fpPhone} onChange={e => setFpPhone(e.target.value)}
                    placeholder="+91 98765 43210" disabled={fpLoading}
                    style={fpInputStyle("fp-phone")}
                    onFocus={() => setFocusedField("fp-phone")} onBlur={() => setFocusedField(null)} />
                  <button type="submit" disabled={fpLoading}
                    style={{ height:48, borderRadius:12, border:"none", cursor:fpLoading?"not-allowed":"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontWeight:700, fontSize:14, opacity:fpLoading?0.6:1 }}>
                    {fpLoading ? "Sending…" : "Send OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFpReset} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <input type="text" value={fpOtp} onChange={e => setFpOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP" maxLength={6} disabled={fpLoading}
                    style={fpInputStyle("fp-otp")}
                    onFocus={() => setFocusedField("fp-otp")} onBlur={() => setFocusedField(null)} />
                  <div style={{ position:"relative" }}>
                    <input type={fpShowPw ? "text" : "password"} value={fpNewPw} onChange={e => setFpNewPw(e.target.value)}
                      placeholder="New password" disabled={fpLoading}
                      style={{ ...fpInputStyle("fp-pw"), paddingRight:40 }}
                      onFocus={() => setFocusedField("fp-pw")} onBlur={() => setFocusedField(null)} />
                    <button type="button" onClick={() => setFpShowPw(!fpShowPw)}
                      style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>
                      <EyeIcon open={fpShowPw} color={theme.placeholder} />
                    </button>
                  </div>
                  <input type="password" value={fpConfirm} onChange={e => setFpConfirm(e.target.value)}
                    placeholder="Confirm new password" disabled={fpLoading}
                    style={fpInputStyle("fp-confirm")}
                    onFocus={() => setFocusedField("fp-confirm")} onBlur={() => setFocusedField(null)} />
                  <button type="submit" disabled={fpLoading}
                    style={{ height:48, borderRadius:12, border:"none", cursor:fpLoading?"not-allowed":"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontWeight:700, fontSize:14, opacity:fpLoading?0.6:1 }}>
                    {fpLoading ? "Resetting…" : "Reset Password"}
                  </button>
                  <button type="button" onClick={fpTimer === 0 ? handleFpSendOtp : undefined}
                    disabled={fpTimer > 0 || fpLoading}
                    style={{ background:"none", border:"none", cursor:fpTimer>0?"default":"pointer", fontSize:13, color:theme.accent, fontWeight:600, opacity:fpTimer>0?0.5:1 }}>
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
