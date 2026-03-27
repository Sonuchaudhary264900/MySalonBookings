import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken, clearCustomerAuth } from "../utils/auth";
import { useNotifications } from "../context/NotificationContext";

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
function Toggle({ checked, onChange, trackOn, trackOff, thumbOn }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0"
      style={{ backgroundColor: checked ? (trackOn || '#6ee7b7') : '#d1d5db' }}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}
        style={{ backgroundColor: checked ? (thumbOn || '#10b981') : '#fff' }} />
    </button>
  );
}

// ── Icon box (matches app iconBox) ────────────────────────────
function IBox({ color, children }) {
  return (
    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
      style={{ backgroundColor: color + '18', color }}>
      {children}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────
function Divider() {
  return <div className="h-px mx-4" style={{ background: 'var(--t-border)' }} />;
}

// ── Section label ──────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest px-1 pt-2 pb-0.5" style={{ color: 'var(--t-text-3)' }}>
      {children}
    </p>
  );
}

// ── Setting row ───────────────────────────────────────────────
function SettingRow({ icon, iconColor = '#6b7280', label, sublabel, rightEl, onClick, chevron = false }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <IBox color={iconColor}>{icon}</IBox>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--t-text)' }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-3)' }}>{sublabel}</p>}
      </div>
      {rightEl}
      {chevron && (
        <svg className="w-4 h-4 shrink-0 ml-1" style={{ color: 'var(--t-text-3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
  return onClick
    ? (
      <button type="button" onClick={onClick}
        className="w-full transition text-left"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bg-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >{inner}</button>
    )
    : inner;
}

// ── Accordion card ────────────────────────────────────────────
function AccordionCard({ id, expanded, onToggle, iconColor, icon, title, sublabel, titleColor, children }) {
  const open = expanded === id;
  return (
    <div className="t-card rounded-2xl overflow-hidden">
      <button type="button" onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition text-left"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bg-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div className="flex items-center gap-3">
          <IBox color={iconColor}>{icon}</IBox>
          <div>
            <p className="text-sm font-semibold" style={{ color: titleColor || 'var(--t-text)' }}>{title}</p>
            {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-3)' }}>{sublabel}</p>}
          </div>
        </div>
        <svg className={`w-[18px] h-[18px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--t-text-3)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="t-divider">{children}</div>}
    </div>
  );
}

// ── SVG icons matching Ionicons ───────────────────────────────
const I = {
  card:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
  fingerprint: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></svg>,
  calendar:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  person:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  phone:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
  mail:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  bell:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  alarm:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  checkCircle: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  xCircle:     <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  tag:         <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  settings:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  language:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>,
  clock:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  shield:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  lock:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  key:         <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>,
  document:    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  trash:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  info:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  code:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  globe:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  gift:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  logout:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  share:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>,
  copy:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  store:       <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  cash:        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  eye:         <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  eyeOff:      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>,
  personCircle: <svg className="w-[38px] h-[38px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
};

// ─────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const [expandedSection, setExpandedSection] = useState(null);
  const toggleSection = (name) => setExpandedSection(prev => prev === name ? null : name);

  // Notification prefs
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [notifLoaded, setNotifLoaded] = useState(false);

  // App prefs
  const [timeFormat, setTimeFormat] = useState('12-hour');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [language, setLanguage]     = useState('English');

  // Delete account
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Change password (cpStep 1=send otp, 2=enter otp+pw)
  const [cpStep, setCpStep]       = useState(1);
  const [cpOtp, setCpOtp]         = useState('');
  const [cpNewPw, setCpNewPw]     = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpShowPw, setCpShowPw]   = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpTimer, setCpTimer]     = useState(0);
  const [cpError, setCpError]     = useState('');

  useEffect(() => {
    if (cpTimer <= 0) return;
    const id = setInterval(() => setCpTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [cpTimer]);

  // Load profile + prefs
  useEffect(() => {
    if (!getCustomerToken()) { navigate("/login"); return; }
    API.get("/customer/auth/me")
      .then(res => setUser(res.data?.data || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    try {
      const n = localStorage.getItem(NOTIF_KEY);
      if (n) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(n) });
      const a = localStorage.getItem(PREFS_KEY);
      if (a) {
        const p = JSON.parse(a);
        if (p.timeFormat) setTimeFormat(p.timeFormat);
        if (p.dateFormat) setDateFormat(p.dateFormat);
        if (p.language)   setLanguage(p.language);
      }
    } catch {}
    setNotifLoaded(true);
  }, []);

  const saveNotif = (key, val) => {
    const next = { ...notif, [key]: val };
    setNotif(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  };

  const saveAppPref = (key, val) => {
    const current = (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } })();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, [key]: val }));
  };

  const normalizePhone = (p) => {
    const d = (p || '').replace(/\D/g, '');
    if (d.length === 10) return `+91${d}`;
    if (d.length === 12 && d.startsWith('91')) return `+${d}`;
    return p || '';
  };

  const handleCpSendOtp = async () => {
    const phone = normalizePhone(user?.phone || '');
    if (!phone) { setCpError('No phone number linked to your account'); return; }
    setCpLoading(true); setCpError('');
    try {
      await API.post('/customer/auth/forgot-password/send-otp', { phone });
      setCpStep(2); setCpTimer(60);
    } catch (err) { setCpError(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setCpLoading(false); }
  };

  const handleCpReset = async () => {
    if (!cpOtp.trim())        { setCpError('Please enter the OTP'); return; }
    if (!cpNewPw || cpNewPw.length < 6) { setCpError('Password must be at least 6 characters'); return; }
    if (cpNewPw !== cpConfirm) { setCpError('Passwords do not match'); return; }
    const phone = normalizePhone(user?.phone || '');
    setCpLoading(true); setCpError('');
    try {
      await API.post('/customer/auth/forgot-password/reset', { phone, otp: cpOtp, newPassword: cpNewPw });
      setCpStep(1); setCpOtp(''); setCpNewPw(''); setCpConfirm('');
    } catch (err) { setCpError(err.response?.data?.message || 'Failed to change password'); }
    finally { setCpLoading(false); }
  };

  const handleDeleteAccount = () => {
    if (!window.confirm('This will permanently delete your account, all bookings, and your data. This cannot be undone.\n\nAre you sure?')) return;
    setDeletingAccount(true);
    API.delete('/customer/auth/delete-account')
      .then(() => { clearCustomerAuth(); navigate('/'); })
      .catch(err => alert(err?.message || 'Could not delete account. Please contact support.'))
      .finally(() => setDeletingAccount(false));
  };

  const handleLogout = () => { clearCustomerAuth(); navigate('/'); };

  const referralCode = user?.phone
    ? `MSB${user.phone.replace(/\D/g, '').slice(-6).toUpperCase()}`
    : user?._id ? `MSB${user._id.slice(-6).toUpperCase()}` : 'MSB000';

  const [copied, setCopied] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleShare = () => {
    const text =
      `Salon owners 👇\n\nDon't miss this 🚀\nJoin MySalonBookings and start getting customers online instantly! 💼\n\nGrow your salon, manage bookings easily, and go digital today.\n\n❤️ Use my referral code and support me too\n\n💸 Referral Code: ${referralCode}\n🔗 https://owner.mysalonbookings.com`;
    if (navigator.share) navigator.share({ title: 'Join MySalonBookings', text });
    else navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="t-page">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-5 pb-4 t-divider" style={{ background: 'var(--t-card)' }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold leading-tight" style={{ color: 'var(--t-text)' }}>Settings</h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--t-text-3)' }}>Manage your preferences</p>
          </div>
          <Link to="/notifications"
            className="relative w-9 h-9 rounded-[10px] flex items-center justify-center transition shrink-0"
            style={{ background: 'var(--t-bg-2)', color: 'var(--t-text-2)' }}>
            {I.bell}
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-1.5">

        {loading ? (
          <div className="t-card rounded-2xl p-10 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--t-text-3)' }}>Loading…</p>
          </div>
        ) : (
          <>

            {/* ── PROFILE CARD (matches app profileCard) ───────── */}
            <div className="t-card rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-[52px] h-[52px] rounded-full bg-[#1d4ed8] flex items-center justify-center shrink-0 text-white">
                {I.personCircle}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold truncate" style={{ color: 'var(--t-text)' }}>{user?.name || 'Guest User'}</p>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--t-text-3)' }}>{user?.phone || ''}</p>
                {user?.email && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t-text-3)' }}>{user.email}</p>}
              </div>
            </div>

            {/* ── ACCOUNT INFO ─────────────────────────────────── */}
            <SectionLabel>Account</SectionLabel>
            <AccordionCard id="account" expanded={expandedSection} onToggle={toggleSection}
              iconColor="#7c3aed" icon={I.card} title="Account Info" sublabel="ID, membership and account type">
              {[
                { icon: I.fingerprint, color: '#7c3aed', label: 'Account ID',   value: user?._id ? String(user._id).slice(-8).toUpperCase() : '—', mono: true },
                { icon: I.calendar,   color: '#2563eb', label: 'Member Since',  value: memberSince },
                { icon: I.person,     color: '#10b981', label: 'Account Type',  value: 'Customer' },
                { icon: I.phone,      color: '#f59e0b', label: 'Phone',         value: user?.phone || '—' },
                { icon: I.mail,       color: '#6366f1', label: 'Email',         value: user?.email || '—' },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <IBox color={row.color}>{row.icon}</IBox>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs" style={{ color: 'var(--t-text-3)' }}>{row.label}</p>
                      <p className={`text-sm font-semibold truncate ${row.mono ? 'font-mono tracking-widest' : ''}`} style={{ color: 'var(--t-text)' }}>{row.value}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && <Divider />}
                </div>
              ))}
            </AccordionCard>

            {/* ── NOTIFICATION SETTINGS ────────────────────────── */}
            <SectionLabel>Preferences</SectionLabel>
            <AccordionCard id="notifications" expanded={expandedSection} onToggle={toggleSection}
              iconColor="#f59e0b" icon={I.bell} title="Notification Settings">
              {notifLoaded ? (
                <>
                  <SettingRow icon={I.alarm} iconColor="#f59e0b" label="Booking Reminders" sublabel="Get reminded before your appointment"
                    rightEl={<Toggle checked={notif.bookingReminders} onChange={v => saveNotif('bookingReminders', v)} trackOn="#fcd34d" thumbOn="#f59e0b" />} />
                  <Divider />
                  <SettingRow icon={I.checkCircle} iconColor="#10b981" label="Booking Confirmations" sublabel="Alerts when a booking is confirmed"
                    rightEl={<Toggle checked={notif.confirmationAlerts} onChange={v => saveNotif('confirmationAlerts', v)} trackOn="#6ee7b7" thumbOn="#10b981" />} />
                  <Divider />
                  <SettingRow icon={I.xCircle} iconColor="#ef4444" label="Cancellation Alerts" sublabel="Alerts when a booking is cancelled"
                    rightEl={<Toggle checked={notif.cancellationAlerts} onChange={v => saveNotif('cancellationAlerts', v)} trackOn="#fca5a5" thumbOn="#ef4444" />} />
                  <Divider />
                  <SettingRow icon={I.tag} iconColor="#8b5cf6" label="Offers & Promotions" sublabel="Deals, discounts, and special offers"
                    rightEl={<Toggle checked={notif.promotionalOffers} onChange={v => saveNotif('promotionalOffers', v)} trackOn="#c4b5fd" thumbOn="#8b5cf6" />} />
                </>
              ) : (
                <div className="p-4 flex justify-center">
                  <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </AccordionCard>

            {/* ── APP PREFERENCES ──────────────────────────────── */}
            <AccordionCard id="preferences" expanded={expandedSection} onToggle={toggleSection}
              iconColor="#2563eb" icon={I.settings} title="App Preferences">
              <SettingRow icon={I.language} iconColor="#2563eb" label="Language" chevron
                rightEl={
                  <select value={language} onChange={e => { setLanguage(e.target.value); saveAppPref('language', e.target.value); }}
                    className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-right max-w-[120px]" style={{ color: "var(--t-text-2)" }}>
                    {['English', 'हिंदी'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                } />
              <Divider />
              <SettingRow icon={I.clock} iconColor="#0891b2" label="Time Format" chevron
                rightEl={
                  <select value={timeFormat} onChange={e => { setTimeFormat(e.target.value); saveAppPref('timeFormat', e.target.value); }}
                    className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-right max-w-[120px]" style={{ color: "var(--t-text-2)" }}>
                    {['12-hour', '24-hour'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                } />
              <Divider />
              <SettingRow icon={I.calendar} iconColor="#059669" label="Date Format" chevron
                rightEl={
                  <select value={dateFormat} onChange={e => { setDateFormat(e.target.value); saveAppPref('dateFormat', e.target.value); }}
                    className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer text-right max-w-[120px]" style={{ color: "var(--t-text-2)" }}>
                    {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                } />
            </AccordionCard>

            {/* ── CHANGE PASSWORD ──────────────────────────────── */}
            <SectionLabel>Security</SectionLabel>
            <AccordionCard id="password" expanded={expandedSection}
              onToggle={(id) => { toggleSection(id); setCpStep(1); setCpOtp(''); setCpNewPw(''); setCpConfirm(''); setCpError(''); }}
              iconColor="#6366f1" icon={I.lock} title="Change Password">
              <div className="px-4 py-3.5 space-y-3">
                {cpError && <p className="text-xs text-red-500">{cpError}</p>}

                {cpStep === 1 ? (
                  <>
                    <p className="text-xs text-slate-400">An OTP will be sent to your registered phone number</p>
                    <button onClick={handleCpSendOtp} disabled={cpLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 flex items-center justify-center">
                      {cpLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP to Phone'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">OTP sent to {user?.phone}</p>
                    {/* OTP input */}
                    <div className="flex items-center rounded-xl px-3 h-[42px] focus-within:border-indigo-400 transition" style={{ border: "1px solid var(--t-border)", background: "var(--t-input-bg)" }}>
                      <span className="text-slate-400 mr-2">{I.key}</span>
                      <input type="text" value={cpOtp} onChange={e => setCpOtp(e.target.value)}
                        placeholder="Enter OTP" maxLength={6} inputMode="numeric" disabled={cpLoading}
                        className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400" style={{ color: "var(--t-text)" }} />
                    </div>
                    {/* New password */}
                    <div className="flex items-center rounded-xl px-3 h-[42px] focus-within:border-indigo-400 transition" style={{ border: "1px solid var(--t-border)", background: "var(--t-input-bg)" }}>
                      <span className="text-slate-400 mr-2">{I.lock}</span>
                      <input type={cpShowPw ? 'text' : 'password'} value={cpNewPw} onChange={e => setCpNewPw(e.target.value)}
                        placeholder="New password" disabled={cpLoading}
                        className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400" style={{ color: "var(--t-text)" }} />
                      <button type="button" onClick={() => setCpShowPw(v => !v)} className="text-slate-400 hover:text-slate-600 ml-2">
                        {cpShowPw ? I.eyeOff : I.eye}
                      </button>
                    </div>
                    {/* Confirm password */}
                    <div className="flex items-center rounded-xl px-3 h-[42px] focus-within:border-indigo-400 transition" style={{ border: "1px solid var(--t-border)", background: "var(--t-input-bg)" }}>
                      <span className="text-slate-400 mr-2">{I.lock}</span>
                      <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)}
                        placeholder="Confirm password" disabled={cpLoading}
                        className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400" style={{ color: "var(--t-text)" }} />
                    </div>
                    {/* Reset button */}
                    <button onClick={handleCpReset} disabled={cpLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 flex items-center justify-center">
                      {cpLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                    </button>
                    {/* Resend */}
                    <button onClick={cpTimer === 0 ? handleCpSendOtp : undefined} disabled={cpTimer > 0 || cpLoading}
                      className="w-full text-center text-[13px] text-indigo-600 disabled:opacity-50">
                      {cpTimer > 0 ? `Resend OTP in ${cpTimer}s` : 'Resend OTP'}
                    </button>
                  </>
                )}
              </div>
            </AccordionCard>

            {/* ── PRIVACY & SECURITY ───────────────────────────── */}
            <AccordionCard id="privacy" expanded={expandedSection} onToggle={toggleSection}
              iconColor="#10b981" icon={I.shield} title="Privacy & Security">
              <div className="flex gap-3 px-4 py-3 items-start">
                <span className="text-green-500 mt-0.5 shrink-0">{I.shield}</span>
                <p className="text-xs text-slate-500 leading-relaxed">Your data is stored securely and never shared with third parties without your consent.</p>
              </div>
              <Divider />
              <div className="flex gap-3 px-4 py-3 items-start">
                <span className="text-indigo-500 mt-0.5 shrink-0">{I.lock}</span>
                <p className="text-xs text-slate-500 leading-relaxed">All communication with our servers is encrypted using HTTPS.</p>
              </div>
              <Divider />
              <SettingRow icon={I.document} iconColor="#6b7280" label="Privacy Policy" sublabel="View our data usage policy" chevron
                onClick={() => alert('Privacy Policy\n\nWe collect your name, phone, email, and booking data to provide our services. We do not sell your data to third parties.')} />
              <Divider />
              <SettingRow icon={I.trash} iconColor="#ef4444" label="Delete Account" sublabel="Permanently remove your account and data"
                rightEl={deletingAccount ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin shrink-0" /> : null}
                chevron={!deletingAccount} onClick={handleDeleteAccount} />
            </AccordionCard>

            {/* ── REFER & EARN ─────────────────────────────────── */}
            <SectionLabel>Earn &amp; Share</SectionLabel>
            <AccordionCard id="refer" expanded={expandedSection} onToggle={toggleSection}
              iconColor="#f59e0b" icon={I.gift} title="Refer & Earn" sublabel="Earn ₹50 per referral">
              <div className="px-4 py-4 space-y-4">
                {/* Reward banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                  <span className="text-2xl shrink-0">🎁</span>
                  <div>
                    <p className="font-bold text-amber-800 text-sm">Earn ₹50 for every salon you refer!</p>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">Invite salon owners to join MySalonBookings and earn rewards when they get started.</p>
                  </div>
                </div>
                {/* How it works */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">How it works</p>
                  {[
                    { icon: I.share, color: '#2563eb', step: '1', text: 'Share your referral code with a salon owner' },
                    { icon: I.store, color: '#10b981', step: '2', text: 'They sign up on the MySalonBookings owner app' },
                    { icon: I.cash,  color: '#8b5cf6', step: '3', text: 'You earn ₹50 once they qualify!' },
                  ].map(item => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ backgroundColor: item.color + '18', color: item.color }}>{item.step}</div>
                      <span style={{ color: item.color }} className="shrink-0">{item.icon}</span>
                      <p className="text-sm text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>
                {/* Terms */}
                <button onClick={() => alert('Terms & Conditions\n\n• The referred salon owner must register using your referral code.\n\n• The salon owner must actively use the MySalonBookings owner app for a minimum of 30 consecutive days.\n\n• ₹50 will be credited to your account once the 30-day qualifying period is complete.\n\n• Each referral code can be used once per salon.\n\n• MySalonBookings reserves the right to modify or cancel the referral program at any time.')}
                  className="text-xs text-slate-400 underline text-center w-full">
                  View Terms & Conditions
                </button>
                {/* Referral code box */}
                <div className="flex items-center gap-3 border-2 border-dashed border-indigo-300 rounded-xl px-4 py-3 bg-indigo-50">
                  <div className="flex-1">
                    <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">Your Referral Code</p>
                    <p className="text-2xl font-black text-indigo-600 tracking-widest mt-0.5">{referralCode}</p>
                  </div>
                  <button onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 hover:bg-indigo-200 transition text-indigo-600 text-xs font-bold">
                    {I.copy} {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                {/* Share button */}
                <button onClick={handleShare}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
                  {I.share} Share & Invite Salon Owners
                </button>
              </div>
            </AccordionCard>

            {/* ── ABOUT ────────────────────────────────────────── */}
            <SectionLabel>About</SectionLabel>
            <div className="t-card rounded-2xl overflow-hidden">
              <SettingRow icon={I.code}  iconColor="#2563eb" label="App Version" rightEl={<span className="text-sm font-semibold" style={{ color: 'var(--t-text-3)' }}>v1.0.0</span>} />
              <Divider />
              <SettingRow icon={I.globe} iconColor="#2563eb" label="Website"     rightEl={<span className="text-sm font-semibold" style={{ color: 'var(--t-text-3)' }}>mysalonbookings.com</span>} />
              <Divider />
              <SettingRow icon={I.document} iconColor="#6b7280" label="Terms & Conditions" chevron
                onClick={() => alert('Terms & Conditions\n\nBy using MySalonBookings, you agree to our terms of service. Please visit mysalonbookings.com for full details.')} />
            </div>

            {/* ── SIGN OUT ─────────────────────────────────────── */}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition"
              style={{ border: '1px solid var(--t-error-border)', background: 'var(--t-error-bg)', color: 'var(--t-error-text)' }}>
              {I.logout}
              Sign Out
            </button>

            <div className="h-6" />
          </>
        )}
      </div>
    </div>
  );
}
