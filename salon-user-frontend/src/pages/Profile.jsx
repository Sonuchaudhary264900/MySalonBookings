import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken, clearCustomerAuth } from "../utils/auth";

// ── localStorage keys ─────────────────────────────────────────
const NOTIF_KEY = 'notifPrefs';
const PREFS_KEY = 'appPrefs';
const DEFAULT_NOTIF = {
  bookingReminders:   true,
  confirmationAlerts: true,
  cancellationAlerts: true,
  promotionalOffers:  false,
};

// ── Toggle switch ─────────────────────────────────────────────
function Toggle({ checked, onChange, color = '#2563eb' }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0"
      style={{ backgroundColor: checked ? color : '#d1d5db' }}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ── Coloured icon box ─────────────────────────────────────────
function IBox({ color, children }) {
  return (
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
      style={{ backgroundColor: color + '18', color }}>
      {children}
    </div>
  );
}

// ── Generic accordion card ────────────────────────────────────
function Accordion({ id, open, onToggle, iconColor, icon, title, sublabel, titleColor = 'text-slate-900', children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <button type="button" onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left">
        <div className="flex items-center gap-3">
          <IBox color={iconColor}>{icon}</IBox>
          <div>
            <p className={`text-sm font-semibold ${titleColor}`}>{title}</p>
            {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
}

// ── Setting row ───────────────────────────────────────────────
function SRow({ iconColor, icon, label, sublabel, right, onClick, chevron, last = false }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon && <IBox color={iconColor}>{icon}</IBox>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
      {right}
      {chevron && (
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
  return (
    <div className={!last ? 'border-b border-slate-50' : ''}>
      {onClick ? <button type="button" onClick={onClick} className="w-full hover:bg-slate-50 transition text-left">{inner}</button> : inner}
    </div>
  );
}

// ── SVG Icons (matching app Ionicons) ─────────────────────────
const I = {
  person:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  card:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
  fingerprint: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></svg>,
  calendar:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  phone:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
  mail:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  bell:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  alarm:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  checkCircle: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  xCircle:     <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  tag:         <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  settings:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  globe:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  clock:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  lock:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  shield:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  trash:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  document:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  info:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  gift:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  logout:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  share:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>,
  copy:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  store:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  cash:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  code:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  eye:         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  eyeOff:      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>,
};

// ─────────────────────────────────────────────────────────────
function Profile() {
  const navigate = useNavigate();

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // profile edit
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name: "", email: "" });

  // change password
  const [pwStep, setPwStep]   = useState(1);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwTimer, setPwTimer] = useState(0);
  const [pwShowPw, setPwShowPw] = useState(false);
  const [pw, setPw]           = useState({ otp: "", next: "", confirm: "" });

  // notification prefs
  const [notif, setNotif] = useState(() => {
    try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') }; }
    catch { return DEFAULT_NOTIF; }
  });

  // app prefs
  const [prefs, setPrefs] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      return { language: s.language || 'en', timeFormat: s.timeFormat || '12h', dateFormat: s.dateFormat || 'DD/MM/YYYY' };
    } catch { return { language: 'en', timeFormat: '12h', dateFormat: 'DD/MM/YYYY' }; }
  });

  // delete account
  const [deleting, setDeleting]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // refer & earn
  const [copied, setCopied] = useState(false);

  // accordion — only one open at a time
  const [expanded, setExpanded] = useState(null);
  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  // sign out two-step
  const [signOutOpen, setSignOutOpen] = useState(false);

  // ── OTP timer ────────────────────────────────────────────────
  useEffect(() => {
    if (pwTimer <= 0) return;
    const id = setInterval(() => setPwTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [pwTimer]);

  // ── Load profile ─────────────────────────────────────────────
  useEffect(() => {
    if (!getCustomerToken()) { navigate("/login"); return; }
    API.get("/customer/auth/me")
      .then(res => {
        const data = res.data?.data || res.data;
        setUser(data);
        setForm({ name: data.name || "", email: data.email || "" });
      })
      .catch(() => setError("Could not load profile."))
      .finally(() => setLoading(false));
  }, []);

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else         { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  };

  // ── Save profile ─────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { flash("Name is required", true); return; }
    setSaving(true);
    try {
      const res = await API.put("/customer/auth/me", { name: form.name.trim(), email: form.email.trim() });
      setUser(res.data?.data || res.data);
      setEditing(false);
      flash("Profile updated!");
    } catch (err) { flash(err.message || "Failed to update.", true); }
    finally { setSaving(false); }
  };

  // ── Change password ───────────────────────────────────────────
  const norm = (p) => { let c=(p||"").replace(/\D/g,""); if(c.length===10) c="91"+c; if(!c.startsWith("+")) c="+"+c; return c; };

  const handlePwSendOtp = async () => {
    if (!user?.phone) { flash("No phone linked to your account", true); return; }
    setPwSaving(true);
    try {
      await API.post("/customer/auth/forgot-password/send-otp", { phone: norm(user.phone) });
      setPwStep(2); setPwTimer(60);
      flash("OTP sent to your registered phone!");
    } catch (err) { flash(err.response?.data?.message || "Failed to send OTP", true); }
    finally { setPwSaving(false); }
  };

  const handlePwReset = async (e) => {
    e.preventDefault();
    if (!pw.otp.trim())         { flash("OTP is required", true); return; }
    if (pw.next.length < 6)     { flash("Password must be at least 6 characters", true); return; }
    if (pw.next !== pw.confirm) { flash("Passwords do not match", true); return; }
    setPwSaving(true);
    try {
      await API.post("/customer/auth/forgot-password/reset", { phone: norm(user.phone), otp: pw.otp, newPassword: pw.next });
      setPwStep(1); setPw({ otp: "", next: "", confirm: "" });
      flash("Password changed successfully!");
    } catch (err) { flash(err.response?.data?.message || "Failed to change password.", true); }
    finally { setPwSaving(false); }
  };

  // ── Notif prefs ───────────────────────────────────────────────
  const saveNotif = (key, val) => {
    const next = { ...notif, [key]: val };
    setNotif(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  };

  // ── App prefs ─────────────────────────────────────────────────
  const savePref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  };

  // ── Logout / Delete ───────────────────────────────────────────
  const handleLogout = () => { clearCustomerAuth(); navigate("/"); };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await API.delete('/customer/auth/delete-account');
      clearCustomerAuth(); navigate("/");
    } catch (err) { flash(err?.message || 'Could not delete account. Contact support.', true); }
    finally { setDeleting(false); setDeleteConfirm(false); }
  };

  // ── Referral ──────────────────────────────────────────────────
  const referralCode = user?.phone
    ? `MSB${user.phone.replace(/\D/g,'').slice(-6).toUpperCase()}`
    : user?._id ? `MSB${user._id.slice(-6).toUpperCase()}` : null;

  const handleCopy = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleShare = () => {
    const text = `Salon owners 👇\n\nDon't miss this 🚀\nJoin MySalonBookings and start getting customers online instantly! 💼\n\nGrow your salon, manage bookings easily, and go digital today.\n\n❤️ Use my referral code and support me too\n\n💸 Referral Code: ${referralCode}\n🔗 https://owner.mysalonbookings.com`;
    if (navigator.share) navigator.share({ title: 'Join MySalonBookings', text });
    else navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER (matches app SettingsScreen header) ─────────── */}
      <div className="bg-white border-b border-slate-100 px-4 sm:px-6 pt-5 pb-4">
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-extrabold text-slate-900">Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage your preferences</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-2">

        {/* Alerts */}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading…</p>
          </div>
        ) : (
          <>

            {/* ── PROFILE CARD ─────────────────────────────────── */}
            <button type="button" onClick={() => toggle('profile')}
              className="w-full bg-white rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3 hover:bg-slate-50 transition text-left shadow-sm">
              <div className="w-[52px] h-[52px] rounded-full bg-[#1d4ed8] flex items-center justify-center shrink-0">
                {I.person && <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-base truncate">{user?.name || 'Guest User'}</p>
                <p className="text-sm text-slate-400 mt-0.5">{user?.phone || user?.email || '—'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <svg className={`w-4 h-4 text-indigo-600 transition-transform duration-200 ${expanded === 'profile' ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </button>

            {expanded === 'profile' && (
              <div className="bg-white rounded-2xl border border-slate-100 px-4 py-4 space-y-3">
                {editing ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                      <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        className="input-field" placeholder="Your full name" required disabled={saving} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                        className="input-field" placeholder="your@email.com" disabled={saving} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                      <button type="button" onClick={() => { setEditing(false); setForm({ name: user?.name||"", email: user?.email||"" }); }}
                        className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="space-y-2">
                      {[{ l:"Name", v: user?.name||"—" },{ l:"Email", v: user?.email||"—" },{ l:"Phone", v: user?.phone||"—" }].map(({ l, v }) => (
                        <div key={l} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="flex-1"><p className="text-xs text-slate-400">{l}</p><p className="text-sm font-semibold text-slate-800">{v}</p></div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setEditing(true)}
                      className="w-full py-2.5 text-sm border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition">
                      ✏️ Edit Profile
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── ACCOUNT INFO ─────────────────────────────────── */}
            <Accordion id="account" open={expanded==='account'} onToggle={toggle}
              icon={I.card} iconColor="#7c3aed" title="Account Info" sublabel="ID, membership and account type">
              {[
                { icon: I.fingerprint, color:'#7c3aed', label:'Account ID',   value: user?._id ? String(user._id).slice(-8).toUpperCase() : '—', mono:true },
                { icon: I.calendar,   color:'#2563eb', label:'Member Since',  value: memberSince },
                { icon: I.person,     color:'#10b981', label:'Account Type',  value: 'Customer' },
                { icon: I.phone,      color:'#f59e0b', label:'Phone',         value: user?.phone||'—' },
                { icon: I.mail,       color:'#6366f1', label:'Email',         value: user?.email||'—' },
              ].map(({ icon, color, label, value, mono }, i, arr) => (
                <div key={label} className={i < arr.length-1 ? 'border-b border-slate-50' : ''}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <IBox color={color}>{icon}</IBox>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Accordion>

            {/* ── NOTIFICATION SETTINGS ────────────────────────── */}
            <Accordion id="notifications" open={expanded==='notifications'} onToggle={toggle}
              icon={I.bell} iconColor="#f59e0b" title="Notification Settings">
              {[
                { key:'bookingReminders',   icon:I.alarm,       color:'#f59e0b', label:'Booking Reminders',    sub:'Get reminded before your appointment' },
                { key:'confirmationAlerts', icon:I.checkCircle, color:'#10b981', label:'Booking Confirmations', sub:'Alerts when a booking is confirmed' },
                { key:'cancellationAlerts', icon:I.xCircle,     color:'#ef4444', label:'Cancellation Alerts',   sub:'Alerts when a booking is cancelled' },
                { key:'promotionalOffers',  icon:I.tag,         color:'#8b5cf6', label:'Offers & Promotions',   sub:'Deals, discounts, and special offers' },
              ].map(({ key, icon, color, label, sub }, i, arr) => (
                <SRow key={key} icon={icon} iconColor={color} label={label} sublabel={sub}
                  last={i===arr.length-1}
                  right={<Toggle checked={notif[key]} onChange={v => saveNotif(key, v)} color={color} />} />
              ))}
            </Accordion>

            {/* ── APP PREFERENCES ──────────────────────────────── */}
            <Accordion id="preferences" open={expanded==='preferences'} onToggle={toggle}
              icon={I.settings} iconColor="#2563eb" title="App Preferences">
              {[
                { key:'language',   icon:I.globe,    color:'#2563eb', label:'Language',    opts:[['en','English'],['hi','हिंदी']] },
                { key:'timeFormat', icon:I.clock,    color:'#0891b2', label:'Time Format', opts:[['12h','12 Hour (AM/PM)'],['24h','24 Hour']] },
                { key:'dateFormat', icon:I.calendar, color:'#059669', label:'Date Format', opts:[['DD/MM/YYYY','DD/MM/YYYY'],['MM/DD/YYYY','MM/DD/YYYY'],['YYYY-MM-DD','YYYY-MM-DD']] },
              ].map(({ key, icon, color, label, opts }, i, arr) => (
                <SRow key={key} icon={icon} iconColor={color} label={label} last={i===arr.length-1}
                  right={
                    <select value={prefs[key]} onChange={e => savePref(key, e.target.value)}
                      className="text-xs font-semibold text-slate-500 bg-transparent border-none outline-none cursor-pointer text-right max-w-[130px]">
                      {opts.map(([v,t]) => <option key={v} value={v}>{t}</option>)}
                    </select>
                  } />
              ))}
            </Accordion>

            {/* ── CHANGE PASSWORD ──────────────────────────────── */}
            <Accordion id="password" open={expanded==='password'}
              onToggle={(id) => { toggle(id); if (expanded !== 'password') { setPwStep(1); setPw({ otp:"", next:"", confirm:"" }); } }}
              icon={I.lock} iconColor="#6366f1" title="Change Password">
              <div className="px-4 py-4 space-y-3">
                {pwStep === 1 ? (
                  <>
                    <p className="text-xs text-slate-500">An OTP will be sent to your registered phone number.</p>
                    <button onClick={handlePwSendOtp} disabled={pwSaving}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60">
                      {pwSaving ? "Sending…" : "Send OTP to Phone"}
                    </button>
                  </>
                ) : (
                  <form onSubmit={handlePwReset} className="space-y-3">
                    <p className="text-xs text-slate-500">OTP sent to {user?.phone}</p>
                    <input type="text" value={pw.otp} placeholder="Enter 6-digit OTP" maxLength={6}
                      onChange={e => setPw(p=>({...p,otp:e.target.value}))} className="input-field" required disabled={pwSaving} />
                    <div className="relative">
                      <input type={pwShowPw?"text":"password"} value={pw.next} placeholder="New password (min 6 chars)"
                        onChange={e => setPw(p=>({...p,next:e.target.value}))} className="input-field pr-10" required disabled={pwSaving} />
                      <button type="button" onClick={() => setPwShowPw(v=>!v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {pwShowPw ? I.eyeOff : I.eye}
                      </button>
                    </div>
                    <input type="password" value={pw.confirm} placeholder="Confirm new password"
                      onChange={e => setPw(p=>({...p,confirm:e.target.value}))} className="input-field" required disabled={pwSaving} />
                    <button type="submit" disabled={pwSaving}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60">
                      {pwSaving ? "Updating…" : "Reset Password"}
                    </button>
                    <button type="button" onClick={pwTimer===0 ? handlePwSendOtp : undefined} disabled={pwTimer>0||pwSaving}
                      className="w-full text-center text-xs text-indigo-600 disabled:opacity-50">
                      {pwTimer>0 ? `Resend OTP in ${pwTimer}s` : "Resend OTP"}
                    </button>
                  </form>
                )}
              </div>
            </Accordion>

            {/* ── PRIVACY & SECURITY ───────────────────────────── */}
            <Accordion id="privacy" open={expanded==='privacy'} onToggle={toggle}
              icon={I.shield} iconColor="#10b981" title="Privacy & Security">
              <div className="flex gap-3 px-4 py-3 items-start border-b border-slate-50">
                <div className="text-green-500 mt-0.5 shrink-0">{I.shield}</div>
                <p className="text-xs text-slate-500 leading-relaxed">Your data is stored securely and never shared with third parties without your consent.</p>
              </div>
              <div className="flex gap-3 px-4 py-3 items-start border-b border-slate-50">
                <div className="text-indigo-500 mt-0.5 shrink-0">{I.lock}</div>
                <p className="text-xs text-slate-500 leading-relaxed">All communication with our servers is encrypted using HTTPS.</p>
              </div>
              <SRow icon={I.document} iconColor="#6b7280" label="Privacy Policy" sublabel="View our data usage policy" chevron last={false}
                onClick={() => alert('We collect your name, phone, email, and booking data to provide our services. We do not sell your data to third parties.')} />
              <div className="px-4 py-3">
                {!deleteConfirm ? (
                  <button type="button" onClick={() => setDeleteConfirm(true)} className="w-full flex items-center gap-3 hover:bg-red-50 -mx-4 px-4 py-1 transition rounded-xl">
                    <IBox color="#ef4444">{I.trash}</IBox>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-red-500">Delete Account</p>
                      <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and data</p>
                    </div>
                    {deleting && <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">This will permanently delete your account and all your data. This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleDeleteAccount} disabled={deleting}
                        className="flex-1 bg-red-500 hover:bg-red-600 transition text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60">
                        {deleting ? "Deleting…" : "Yes, Delete"}
                      </button>
                      <button type="button" onClick={() => setDeleteConfirm(false)}
                        className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Accordion>

            {/* ── ABOUT ────────────────────────────────────────── */}
            <Accordion id="about" open={expanded==='about'} onToggle={toggle}
              icon={I.info} iconColor="#2563eb" title="About">
              <SRow icon={I.code}  iconColor="#2563eb" label="App Version" last={false} right={<span className="text-xs font-semibold text-slate-400">v1.0.0</span>} />
              <SRow icon={I.globe} iconColor="#2563eb" label="Website"     last       right={<span className="text-xs font-semibold text-slate-400">mysalonbookings.com</span>} />
            </Accordion>

            {/* ── REFER & EARN ─────────────────────────────────── */}
            {referralCode && (
              <Accordion id="refer" open={expanded==='refer'} onToggle={toggle}
                icon={I.gift} iconColor="#f59e0b" title="Refer & Earn" sublabel="Earn ₹50 per referral">
                <div className="px-4 py-4 space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                    <span className="text-2xl shrink-0">🎁</span>
                    <div>
                      <p className="font-bold text-amber-800 text-sm">Earn ₹50 for every salon you refer!</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">Invite salon owners to join MySalonBookings and earn rewards when they get started.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">How it works</p>
                    {[
                      { icon:I.share, color:'#2563eb', step:'1', text:'Share your referral code with a salon owner' },
                      { icon:I.store, color:'#10b981', step:'2', text:'They sign up on the MySalonBookings owner app' },
                      { icon:I.cash,  color:'#8b5cf6', step:'3', text:'You earn ₹50 once they qualify!' },
                    ].map(item => (
                      <div key={item.step} className="flex items-center gap-3">
                        <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ backgroundColor:item.color+'18', color:item.color }}>{item.step}</div>
                        <div style={{ color:item.color }} className="shrink-0">{item.icon}</div>
                        <p className="text-sm text-slate-600">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => alert('Terms & Conditions:\n\n• The referred salon owner must register using your referral code.\n\n• They must actively use the app for a minimum of 30 consecutive days.\n\n• ₹50 will be credited once the qualifying period is complete.\n\n• Each code can be used once per salon.\n\n• MySalonBookings reserves the right to modify this program at any time.')}
                    className="text-xs text-slate-400 underline text-center w-full">
                    View Terms & Conditions
                  </button>
                  <div className="flex items-center gap-3 border-2 border-dashed border-indigo-300 rounded-xl px-4 py-3 bg-indigo-50">
                    <div className="flex-1">
                      <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">Your Referral Code</p>
                      <p className="text-2xl font-black text-indigo-600 tracking-widest mt-0.5">{referralCode}</p>
                    </div>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 transition text-indigo-600 text-xs font-bold">
                      {I.copy}{copied ? ' Copied!' : ' Copy'}
                    </button>
                  </div>
                  <button onClick={handleShare} className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
                    {I.share} Share & Invite Salon Owners
                  </button>
                </div>
              </Accordion>
            )}

            {/* ── SIGN OUT (two-step) ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button type="button" onClick={() => setSignOutOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-red-50 transition text-left">
                <div className="flex items-center gap-3">
                  <IBox color="#ef4444">{I.logout}</IBox>
                  <p className="text-sm font-semibold text-red-500">Sign Out</p>
                </div>
                <svg className={`w-4 h-4 text-red-400 transition-transform duration-200 ${signOutOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              {signOutOpen && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                  <p className="text-xs text-slate-400">You will be logged out of your account on this device.</p>
                  <button type="button" onClick={handleLogout}
                    className="w-full bg-red-500 hover:bg-red-600 transition text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
                    {I.logout} Confirm Sign Out
                  </button>
                </div>
              )}
            </div>

            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
