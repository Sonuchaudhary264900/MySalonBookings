import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken, clearCustomerAuth } from "../utils/auth";
import { useTheme } from "../context/ThemeContext";

// ── localStorage keys ─────────────────────────────────────────
const NOTIF_KEY = 'notifPrefs';
const PREFS_KEY = 'appPrefs';
const DEFAULT_NOTIF = {
  bookingReminders:   true,
  confirmationAlerts: true,
  cancellationAlerts: true,
  promotionalOffers:  true,
};

// ── Toggle switch ─────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  const { isDark } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 focus:outline-none"
      style={{
        width: 46, height: 26,
        borderRadius: 13,
        background: checked ? '#8b5cf6' : 'var(--t-input-bg)',
        border: '1px solid ' + (checked ? '#7c3aed' : 'var(--t-border)'),
        transition: 'background 0.25s, border-color 0.25s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3, left: 3,
          width: 18, height: 18,
          borderRadius: '50%',
          background: checked ? '#fff' : (isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8'),
          boxShadow: checked ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), background 0.25s',
        }}
      />
    </button>
  );
}

// ── Icon container ─────────────────────────────────────────────
function IconWrap({ children, danger = false }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{
        background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
        border: '1px solid ' + (danger ? 'rgba(239,68,68,0.18)' : 'rgba(139,92,246,0.18)'),
      }}
    >
      <span style={{ color: danger ? '#f87171' : '#a78bfa', display: 'flex' }}>{children}</span>
    </div>
  );
}

// ── Thin divider ───────────────────────────────────────────────
function Divider() {
  return <div className="ml-[62px] mr-4" style={{ height: 1, background: 'var(--t-border)' }} />;
}

// ── Section label ──────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p
      className="px-1 pt-6 pb-2"
      style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--t-text-3)' }}
    >
      {children}
    </p>
  );
}

// ── Setting row ────────────────────────────────────────────────
function SettingRow({ icon, label, sublabel, rightEl, onClick, chevron = false, danger = false }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div
      className="flex items-center gap-3.5 px-4 py-3.5"
      style={{ background: hov && onClick ? 'var(--t-input-bg)' : 'transparent', transition: 'background 0.15s' }}
    >
      <IconWrap danger={danger}>{icon}</IconWrap>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 500, color: danger ? '#f87171' : 'var(--t-text)', lineHeight: 1.3 }}>{label}</p>
        {sublabel && <p style={{ fontSize: 12, marginTop: 2, color: 'var(--t-text-3)' }}>{sublabel}</p>}
      </div>
      {rightEl}
      {chevron && (
        <svg style={{ color: 'var(--t-text-3)', flexShrink: 0 }} width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="w-full text-left" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{inner}</button>
    : inner;
}

// ── Accordion card ─────────────────────────────────────────────
function AccordionCard({ id, expanded, onToggle, icon, title, sublabel, titleColor, children }) {
  const open = expanded === id;
  const [hov, setHov] = useState(false);
  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: 16,
        background: 'var(--t-card)',
        border: '1px solid var(--t-border)',
        transition: 'border-color 0.2s',
        ...(open ? { borderColor: 'rgba(139,92,246,0.35)' } : {}),
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="w-full text-left flex items-center justify-between px-4 py-3.5"
        style={{ background: hov ? 'var(--t-input-bg)' : 'transparent', transition: 'background 0.15s' }}
      >
        <div className="flex items-center gap-3.5">
          <IconWrap>{icon}</IconWrap>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: titleColor || 'var(--t-text)' }}>{title}</p>
            {sublabel && <p style={{ fontSize: 12, marginTop: 2, color: 'var(--t-text-3)' }}>{sublabel}</p>}
          </div>
        </div>
        <svg
          style={{ color: 'var(--t-text-3)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)', flexShrink: 0 }}
          width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--t-border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── SVG icons ─────────────────────────────────────────────────
const I = {
  card:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>,
  fingerprint: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"/></svg>,
  calendar:    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  person:      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  phone:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
  mail:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  bell:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>,
  alarm:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  checkCircle: <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  xCircle:     <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  tag:         <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
  settings:    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  language:    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg>,
  clock:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  shield:      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  lock:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  key:         <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>,
  document:    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  trash:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  info:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  code:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  globe:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  gift:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>,
  logout:      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  share:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>,
  copy:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  store:       <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  cash:        <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  eye:         <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  eyeOff:      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>,
  gender:      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  feedback:    <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  wallet:      <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2m18 0v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6m18 0V8a2 2 0 00-2-2H5a2 2 0 00-2 2v4m13 3h.01"/></svg>,
};

// ─────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const toggleSection = (name) => setExpandedSection(prev => prev === name ? null : name);

  const [notif, setNotif]         = useState(DEFAULT_NOTIF);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [timeFormat, setTimeFormat]   = useState('12-hour');
  const [dateFormat, setDateFormat]   = useState('DD/MM/YYYY');
  const [language, setLanguage]       = useState('English');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [genderSaving, setGenderSaving]       = useState(false);
  const [editingProfile, setEditingProfile]   = useState(false);
  const [editName, setEditName]               = useState('');
  const [editEmail, setEditEmail]             = useState('');
  const [profileSaving, setProfileSaving]     = useState(false);

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

  const handleDeleteAccount = () => {
    if (!window.confirm('This will permanently delete your account, all bookings, and your data. This cannot be undone.\n\nAre you sure?')) return;
    setDeletingAccount(true);
    API.delete('/customer/auth/delete-account')
      .then(() => { clearCustomerAuth(); navigate('/'); })
      .catch(err => alert(err?.message || 'Could not delete account. Please contact support.'))
      .finally(() => setDeletingAccount(false));
  };

  const handleLogout = () => { clearCustomerAuth(); navigate('/'); };

  const handleGenderChange = async (g) => {
    if (user?.gender === g || genderSaving) return;
    setGenderSaving(true);
    try {
      const res = await API.put('/customer/auth/me', { name: user.name, gender: g });
      setUser(res.data?.data || { ...user, gender: g });
      localStorage.setItem('customerGender', g);
    } catch { /* silent */ }
    finally { setGenderSaving(false); }
  };

  const startEditProfile = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (trimmed.length < 2) { alert('Name must be at least 2 characters'); return; }
    setProfileSaving(true);
    try {
      const res = await API.put('/customer/auth/me', { name: trimmed, email: editEmail.trim() || undefined, gender: user?.gender });
      setUser(res.data?.data || { ...user, name: trimmed, email: editEmail.trim() });
      setEditingProfile(false);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Could not save changes. Try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  const referralCode = user?.phone
    ? `MSB${user.phone.replace(/\D/g, '').slice(-6).toUpperCase()}`
    : user?._id ? `MSB${user._id.slice(-6).toUpperCase()}` : 'MSB000';

  const [copied, setCopied] = useState(false);
  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const handleShare = () => {
    const text = `Salon owners 👇\n\nDon't miss this 🚀\nJoin GlowLoox and start getting customers online instantly! 💼\n\nGrow your salon, manage bookings easily, and go digital today.\n\n❤️ Use my referral code and support me too\n\n💸 Referral Code: ${referralCode}\n🔗 https://owner.glowloox.com`;
    if (navigator.share) navigator.share({ title: 'Join GlowLoox', text });
    else navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
    : '—';

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // ── Input field style ────────────────────────────────────────
  const inputStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: '0 14px', height: 46,
    background: 'var(--t-input-bg)',
    border: '1px solid var(--t-border)',
    transition: 'border-color 0.2s',
  };
  const inputFieldStyle = {
    flex: 1, fontSize: 14, background: 'transparent', outline: 'none',
    color: 'var(--t-text)',
  };

  // ── Shared section card style ────────────────────────────────
  const sectionCard = {
    borderRadius: 16,
    background: 'var(--t-card)',
    border: '1px solid var(--t-border)',
    overflow: 'hidden',
  };

  return (
    <div className="t-page">

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div
        className="px-4 sm:px-6 pt-5 pb-4"
        style={{ background: 'var(--t-card)', borderBottom: '1px solid var(--t-border)' }}
      >
        <div className="max-w-xl mx-auto">
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t-text)', lineHeight: 1.2 }}>Settings</h1>
          <p style={{ fontSize: 13, marginTop: 2, color: 'var(--t-text-3)' }}>Manage your account & preferences</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-10">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              style={{
                width: 32, height: 32,
                border: '2px solid rgba(139,92,246,0.3)',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 13, color: 'var(--t-text-3)' }}>Loading…</p>
          </div>
        ) : (
          <>
            {/* ── PROFILE CARD ──────────────────────────────────── */}
            <div
              className="mt-5"
              style={{
                borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.35) 0%, rgba(124,58,237,0.25) 100%)',
                border: '1px solid rgba(139,92,246,0.3)',
                padding: '20px 20px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* subtle glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40, width: 140, height: 140,
                borderRadius: '50%', background: 'rgba(139,92,246,0.15)', filter: 'blur(40px)', pointerEvents: 'none',
              }} />
              <div className="flex items-center gap-4" style={{ position: 'relative' }}>
                {/* Avatar */}
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    fontSize: 22, fontWeight: 700, color: '#fff',
                    letterSpacing: '-0.5px',
                    boxShadow: '0 4px 20px rgba(109,40,217,0.4)',
                  }}
                >
                  {initials}
                </div>

                {!editingProfile ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 18, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.95)' : '#1e1b4b', lineHeight: 1.2 }}>
                        {user?.name || 'Guest User'}
                      </p>
                      <p style={{ fontSize: 13, marginTop: 3, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(30,27,75,0.6)' }}>
                        {user?.phone || ''}
                      </p>
                      {user?.email && (
                        <p style={{ fontSize: 12, marginTop: 1, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,27,75,0.45)' }} className="truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={startEditProfile}
                      title="Edit name & email"
                      style={{
                        flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(30,27,75,0.06)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(30,27,75,0.12)'}`,
                        color: isDark ? 'rgba(255,255,255,0.75)' : '#4f46e5', cursor: 'pointer',
                      }}
                    >
                      <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex-1 min-w-0" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Your full name"
                      maxLength={60}
                      autoFocus
                      style={{
                        fontSize: 15, fontWeight: 600, padding: '9px 12px', borderRadius: 10,
                        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(30,27,75,0.18)'}`,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                        color: isDark ? '#fff' : '#1e1b4b', outline: 'none',
                      }}
                    />
                    <input
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      style={{
                        fontSize: 13, padding: '8px 12px', borderRadius: 10,
                        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(30,27,75,0.18)'}`,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                        color: isDark ? '#fff' : '#1e1b4b', outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
                          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                          fontSize: 13, fontWeight: 700, cursor: profileSaving ? 'not-allowed' : 'pointer',
                          opacity: profileSaving ? 0.6 : 1,
                        }}
                      >
                        {profileSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProfile(false)}
                        disabled={profileSaving}
                        style={{
                          padding: '9px 16px', borderRadius: 10,
                          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(30,27,75,0.18)'}`,
                          background: 'transparent', color: isDark ? 'rgba(255,255,255,0.7)' : '#1e1b4b',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Member badge */}
              <div className="flex items-center gap-2 mt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(30,27,75,0.1)'}`, paddingTop: 12 }}>
                <span style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,27,75,0.45)', display: 'flex' }}>{I.calendar}</span>
                <p style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(30,27,75,0.45)' }}>Member since {memberSince}</p>
                <span
                  style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)',
                    color: isDark ? '#c4b5fd' : '#4f46e5',
                  }}
                >
                  Customer
                </span>
              </div>
            </div>

            {/* ── ACCOUNT ───────────────────────────────────────── */}
            <SectionLabel>Account</SectionLabel>

            <AccordionCard id="account" expanded={expandedSection} onToggle={toggleSection}
              icon={I.card} title="Account Info" sublabel="ID, membership and account type">
              {[
                { icon: I.fingerprint, label: 'Account ID',  value: user?._id ? String(user._id).slice(-8).toUpperCase() : '—', mono: true },
                { icon: I.person,      label: 'Account Type', value: 'Customer' },
                { icon: I.phone,       label: 'Phone',        value: user?.phone || '—' },
                { icon: I.mail,        label: 'Email',        value: user?.email || '—' },
              ].map((row, i, arr) => (
                <div key={row.label}>
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <IconWrap>{row.icon}</IconWrap>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 11, color: 'var(--t-text-3)', marginBottom: 2 }}>{row.label}</p>
                      <p
                        className={row.mono ? 'font-mono tracking-widest' : ''}
                        style={{ fontSize: 14, fontWeight: 500, color: 'var(--t-text)' }}
                      >
                        {row.value}
                      </p>
                    </div>
                  </div>
                  {i < arr.length - 1 && <Divider />}
                </div>
              ))}
            </AccordionCard>

            {/* Wallet */}
            <div className="mt-2" style={sectionCard}>
              <SettingRow icon={I.wallet} label="Wallet" sublabel="Add money & view transactions" chevron
                onClick={() => navigate('/wallet')} />
            </div>

            {/* Gender */}
            <div className="mt-2" style={sectionCard}>
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <IconWrap>{I.gender}</IconWrap>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--t-text)' }}>Gender</p>
                  <p style={{ fontSize: 12, marginTop: 2, color: 'var(--t-text-3)' }}>Used to show relevant services</p>
                </div>
                <div className="flex gap-2">
                  {[{ key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }].map(({ key, label }) => {
                    const active = user?.gender === key;
                    return (
                      <button key={key} type="button" onClick={() => handleGenderChange(key)} disabled={genderSaving}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: active ? '#8b5cf6' : 'var(--t-input-bg)',
                          color: active ? '#fff' : 'var(--t-text-2)',
                          border: active ? '1px solid #7c3aed' : '1px solid var(--t-border)',
                          transition: 'all 0.2s',
                          opacity: genderSaving ? 0.5 : 1,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── PREFERENCES ───────────────────────────────────── */}
            <SectionLabel>Preferences</SectionLabel>

            <AccordionCard id="notifications" expanded={expandedSection} onToggle={toggleSection}
              icon={I.bell} title="Notifications">
              {notifLoaded ? (
                <>
                  <SettingRow icon={I.alarm} label="Booking Reminders" sublabel="Before your appointment"
                    rightEl={<Toggle checked={notif.bookingReminders} onChange={v => saveNotif('bookingReminders', v)} />} />
                  <Divider />
                  <SettingRow icon={I.checkCircle} label="Booking Confirmations" sublabel="When a booking is confirmed"
                    rightEl={<Toggle checked={notif.confirmationAlerts} onChange={v => saveNotif('confirmationAlerts', v)} />} />
                  <Divider />
                  <SettingRow icon={I.xCircle} label="Cancellation Alerts" sublabel="When a booking is cancelled"
                    rightEl={<Toggle checked={notif.cancellationAlerts} onChange={v => saveNotif('cancellationAlerts', v)} />} />
                  <Divider />
                  <SettingRow icon={I.tag} label="Offers & Promotions" sublabel="Deals, discounts, special offers"
                    rightEl={<Toggle checked={notif.promotionalOffers} onChange={v => saveNotif('promotionalOffers', v)} />} />
                </>
              ) : (
                <div className="p-5 flex justify-center">
                  <span style={{ width: 20, height: 20, border: '2px solid rgba(139,92,246,0.4)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block' }} />
                </div>
              )}
            </AccordionCard>

            <div className="mt-2">
              <AccordionCard id="preferences" expanded={expandedSection} onToggle={toggleSection}
                icon={I.settings} title="App Preferences">
                <SettingRow icon={I.language} label="Language"
                  rightEl={
                    <select value={language} onChange={e => { setLanguage(e.target.value); saveAppPref('language', e.target.value); }}
                      style={{ fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', textAlign: 'right', color: 'var(--t-text-2)', maxWidth: 110 }}>
                      {['English', 'हिंदी'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  } />
                <Divider />
                <SettingRow icon={I.clock} label="Time Format"
                  rightEl={
                    <select value={timeFormat} onChange={e => { setTimeFormat(e.target.value); saveAppPref('timeFormat', e.target.value); }}
                      style={{ fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', textAlign: 'right', color: 'var(--t-text-2)', maxWidth: 110 }}>
                      {['12-hour', '24-hour'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  } />
                <Divider />
                <SettingRow icon={I.calendar} label="Date Format"
                  rightEl={
                    <select value={dateFormat} onChange={e => { setDateFormat(e.target.value); saveAppPref('dateFormat', e.target.value); }}
                      style={{ fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', textAlign: 'right', color: 'var(--t-text-2)', maxWidth: 110 }}>
                      {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  } />
              </AccordionCard>
            </div>

            {/* ── SECURITY ──────────────────────────────────────── */}
            <SectionLabel>Security</SectionLabel>

            <div className="mt-2">
              <AccordionCard id="privacy" expanded={expandedSection} onToggle={toggleSection}
                icon={I.shield} title="Privacy & Security">
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--t-border)' }}>
                  <div className="flex gap-3 items-start">
                    <span style={{ color: '#a78bfa', display: 'flex', flexShrink: 0, marginTop: 1 }}>{I.shield}</span>
                    <p style={{ fontSize: 13, color: 'var(--t-text-3)', lineHeight: 1.6 }}>
                      Your data is stored securely and never shared with third parties without your consent.
                    </p>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--t-border)' }}>
                  <div className="flex gap-3 items-start">
                    <span style={{ color: '#a78bfa', display: 'flex', flexShrink: 0, marginTop: 1 }}>{I.lock}</span>
                    <p style={{ fontSize: 13, color: 'var(--t-text-3)', lineHeight: 1.6 }}>
                      All communication with our servers is encrypted using HTTPS.
                    </p>
                  </div>
                </div>
                <SettingRow icon={I.document} label="Privacy Policy" sublabel="View our data usage policy" chevron
                  onClick={() => alert('Privacy Policy\n\nWe collect your name, phone, email, and booking data to provide our services. We do not sell your data to third parties.')} />
                <Divider />
                <SettingRow icon={I.trash} label="Delete Account" sublabel="Permanently remove your account and data"
                  danger
                  rightEl={deletingAccount ? <span style={{ width: 16, height: 16, border: '2px solid rgba(239,68,68,0.4)', borderTopColor: '#f87171', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'block', flexShrink: 0 }} /> : null}
                  chevron={!deletingAccount}
                  onClick={handleDeleteAccount} />
              </AccordionCard>
            </div>

            {/* ── REFER & EARN ──────────────────────────────────── */}
            <SectionLabel>Earn & Share</SectionLabel>

            <AccordionCard id="refer" expanded={expandedSection} onToggle={toggleSection}
              icon={I.gift} title="Refer & Earn" sublabel="Earn ₹50 per referral">
              <div style={{ padding: '16px 16px 18px' }} className="space-y-4">
                {/* Reward banner */}
                <div style={{
                  borderRadius: 14, padding: '14px 16px',
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-text)' }}>Earn ₹50 for every salon you refer</p>
                  <p style={{ fontSize: 12, marginTop: 4, color: 'var(--t-text-3)', lineHeight: 1.6 }}>
                    Invite salon owners to join GlowLoox and earn rewards when they get started.
                  </p>
                </div>
                {/* How it works */}
                <div className="space-y-3">
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-text-3)' }}>How it works</p>
                  {[
                    { icon: I.share, step: '1', text: 'Share your referral code with a salon owner' },
                    { icon: I.store, step: '2', text: 'They sign up on the GlowLoox owner app' },
                    { icon: I.cash,  step: '3', text: 'You earn ₹50 once they qualify' },
                  ].map(item => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#a78bfa',
                      }}>{item.step}</div>
                      <span style={{ color: '#a78bfa', display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                      <p style={{ fontSize: 13, color: 'var(--t-text-2)' }}>{item.text}</p>
                    </div>
                  ))}
                </div>
                {/* Terms */}
                <button
                  onClick={() => alert('Terms & Conditions\n\n• The referred salon owner must register using your referral code.\n\n• The salon owner must actively use the GlowLoox owner app for a minimum of 30 consecutive days.\n\n• ₹50 will be credited to your account once the 30-day qualifying period is complete.\n\n• Each referral code can be used once per salon.\n\n• GlowLoox reserves the right to modify or cancel the referral program at any time.')}
                  style={{ width: '100%', textAlign: 'center', fontSize: 12, color: 'var(--t-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View Terms & Conditions
                </button>
                {/* Referral code */}
                <div style={{
                  borderRadius: 14, padding: '14px 16px',
                  background: 'var(--t-input-bg)',
                  border: '1px dashed rgba(139,92,246,0.35)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#a78bfa', textTransform: 'uppercase', marginBottom: 4 }}>Your Code</p>
                    <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--t-text)', letterSpacing: '0.12em', fontFamily: 'monospace' }}>{referralCode}</p>
                  </div>
                  <button onClick={handleCopyCode}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: copied ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: '#c4b5fd', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {I.copy} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                {/* Share button */}
                <button onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2"
                  style={{
                    height: 46, borderRadius: 12, fontSize: 14, fontWeight: 600,
                    background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                  }}>
                  {I.share} Share & Invite Salon Owners
                </button>
              </div>
            </AccordionCard>

            {/* ── SUPPORT ───────────────────────────────────────── */}
            <SectionLabel>Support</SectionLabel>

            <div style={sectionCard}>
              <SettingRow icon={I.feedback} label="Help & Feedback" sublabel="Report a bug or share feedback" chevron
                onClick={() => navigate('/feedback')} />
            </div>

            {/* ── ABOUT ─────────────────────────────────────────── */}
            <SectionLabel>About</SectionLabel>

            <div style={sectionCard}>
              <SettingRow icon={I.code}  label="App Version" rightEl={<span style={{ fontSize: 13, color: 'var(--t-text-2)', fontWeight: 500 }}>v1.0.0</span>} />
              <Divider />
              <SettingRow icon={I.globe} label="Website" rightEl={<span style={{ fontSize: 12, color: 'var(--t-text-2)' }}>glowloox.com</span>} />
              <Divider />
              <SettingRow icon={I.document} label="Terms & Conditions" chevron
                onClick={() => alert('Terms & Conditions\n\nBy using GlowLoox, you agree to our terms of service. Please visit glowloox.com for full details.')} />
            </div>

            {/* ── SIGN OUT ──────────────────────────────────────── */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 mt-6"
              style={{
                height: 50, borderRadius: 14, fontSize: 14, fontWeight: 600,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.13)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            >
              {I.logout}
              Sign Out
            </button>

            {/* ── FOOTER ────────────────────────────────────────── */}
            <div className="mt-8 flex flex-col items-center gap-1">
              <p style={{ fontSize: 11, color: 'var(--t-text-3)', fontWeight: 500 }}>GlowLoox</p>
              <p style={{ fontSize: 10, color: 'var(--t-text-3)' }}>v1.0.0 · Built with care</p>
            </div>

            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );
}
