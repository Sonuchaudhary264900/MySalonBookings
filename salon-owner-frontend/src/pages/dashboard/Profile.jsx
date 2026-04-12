import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Info, Mail, Phone, MapPin, Building, ChevronDown, ChevronUp, Camera, QrCode, Sparkles, Scissors, Wand2, Waves, FlaskConical, ShieldCheck, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { SALON_TYPES } from '../../constants/salonCategories';
import API from '../../services/api';

const MakeupBrushIcon = ({ size = 24, color = 'currentColor', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="13" />
    <rect x="10.2" y="13" width="3.6" height="2.5" rx="0.6" />
    <path d="M9.5 15.5 C8.5 17 8.5 20 12 21.5 C15.5 20 15.5 17 14.5 15.5" />
  </svg>
);

const SALON_TYPE_ICONS = {
  barbershop:    Scissors,
  salon:         Wand2,
  spa_wellness:  Waves,
  makeup_bridal: MakeupBrushIcon,
  skin_derma:    FlaskConical,
};
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import SalonQRModal from '../../components/salon/SalonQRModal';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import { updateSalonLogo } from '../../services/salonService';

// ── Accordion section wrapper ──────────────────────────────────
const Section = ({ id, activeId, onToggle, icon: Icon, iconColor, title, subtitle, children }) => {
  const open = activeId === id;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {open
          ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
          : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// ── Main Profile Page ──────────────────────────────────────────
const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { salon, fetchSalon } = useSalon();
  const [activeSection, setActiveSection] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { if (salon?.logo) setLogoUrl(salon.logo); }, [salon]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await updateSalonLogo(file);
      setLogoUrl(url);
      if (fetchSalon) fetchSalon();
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const toggle = (id) => setActiveSection(prev => prev === id ? null : id);

  // ── Profile form state ──
  const [isEditing, setIsEditing]       = useState(false);
  const [profileData, setProfileData]   = useState({ name: '', email: '', phone: '', gender: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (user) setProfileData({ name: user.name || '', email: user.email || '', phone: user.phone || '', gender: user.gender || '' });
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(p => ({ ...p, [name]: value }));
    if (profileErrors[name]) setProfileErrors(p => ({ ...p, [name]: '' }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!profileData.name.trim())  errs.name  = 'Name is required';
    if (!profileData.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(profileData.email)) errs.email = 'Email is invalid';
    if (!profileData.phone.trim()) errs.phone = 'Phone is required';
    if (Object.keys(errs).length) { setProfileErrors(errs); return; }

    setProfileLoading(true);
    try {
      await updateProfile(profileData);
      toast.success('Profile updated!');
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Firebase SMS OTP Password Reset ──
  const [secPhase, setSecPhase]             = useState('idle'); // 'idle' | 'sent' | 'success'
  const [secOtp, setSecOtp]                 = useState(['', '', '', '', '', '']);
  const [secNewPw, setSecNewPw]             = useState('');
  const [secConfirmPw, setSecConfirmPw]     = useState('');
  const [showNewPw, setShowNewPw]           = useState(false);
  const [showConfirmPw, setShowConfirmPw]   = useState(false);
  const [secErrors, setSecErrors]           = useState({});
  const [secLoading, setSecLoading]         = useState(false);
  const [otpTimer, setOtpTimer]             = useState(0);
  const [confirmResult, setConfirmResult]   = useState(null);
  const otpRefs       = useRef([]);
  const recaptchaRef  = useRef(null);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setTimeout(() => setOtpTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => { try { recaptchaRef.current?.clear(); } catch {} };
  }, []);

  const setupRecaptcha = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    const verifier = new RecaptchaVerifier(auth, 'pw-reset-recaptcha', {
      size: 'invisible',
      callback: () => {},
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

  const handleSendOtp = async () => {
    if (!user?.phone) { toast.error('No phone number found on your account'); return; }
    setSecLoading(true);
    try {
      const verifier = setupRecaptcha();
      const result   = await signInWithPhoneNumber(auth, user.phone, verifier);
      setConfirmResult(result);
      setSecPhase('sent');
      setOtpTimer(60);
      setSecOtp(['', '', '', '', '', '']);
      setSecErrors({});
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      toast.success(`OTP sent to ${user.phone}`);
    } catch (err) {
      toast.error('Failed to send OTP. Try again.');
      try { recaptchaRef.current?.clear(); recaptchaRef.current = null; } catch {}
    } finally {
      setSecLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...secOtp];
    next[idx] = val;
    setSecOtp(next);
    if (secErrors.otp) setSecErrors(p => ({ ...p, otp: '' }));
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    // Auto-submit when all 6 digits entered
    if (val && idx === 5 && next.every(d => d)) {
      verifyAndReset(next.join(''));
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setSecOtp(next);
    if (secErrors.otp) setSecErrors(p => ({ ...p, otp: '' }));
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyAndReset(pasted);
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !secOtp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowLeft'  && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  // Step 1: verify Firebase OTP → store idToken, move to password entry
  const [firebaseIdToken, setFirebaseIdToken] = useState(null);

  const verifyAndReset = async (code) => {
    if (!confirmResult || secLoading) return;
    // If passwords aren't set yet, just verify the OTP and show password fields
    const errs = {};
    if (!secNewPw)                errs.newPw = 'Enter your new password';
    else if (secNewPw.length < 8) errs.newPw = 'Minimum 8 characters';
    if (secNewPw !== secConfirmPw) errs.confirmPw = 'Passwords do not match';
    if (Object.keys(errs).length) { setSecErrors(errs); return; }

    setSecLoading(true);
    try {
      const result  = await confirmResult.confirm(code);
      const idToken = await result.user.getIdToken();
      await API.post('/owner/auth/firebase-reset-password', {
        firebaseToken: idToken,
        newPassword: secNewPw,
      });
      setSecPhase('success');
      setSecOtp(['', '', '', '', '', '']);
      setSecNewPw('');
      setSecConfirmPw('');
      toast.success('Password updated successfully!');
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message || '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('code')) {
        setSecErrors(p => ({ ...p, otp: 'Incorrect OTP — try again' }));
        setSecOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      } else {
        toast.error(msg || 'Failed to reset password');
      }
    } finally {
      setSecLoading(false);
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    const code = secOtp.join('');
    if (code.length < 6) { setSecErrors(p => ({ ...p, otp: 'Enter all 6 digits' })); return; }
    verifyAndReset(code);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-4">
        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Tap a section to view or edit your details</p>
        </div>

        {/* Avatar strip */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          {/* Clickable avatar */}
          <div
            className="relative w-16 h-16 rounded-full shrink-0 cursor-pointer group"
            onClick={() => !logoUploading && fileInputRef.current?.click()}
            title="Change profile photo"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-7 h-7 text-blue-600" />
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              {logoUploading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-5 h-5 text-white" />}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-lg">{user?.name || '—'}</p>
            <p className="text-sm text-gray-500">Member since {memberSince}</p>
            {(() => {
              const typeDef = SALON_TYPES.find(t => t.key === salon?.businessType);
              return typeDef ? (
                <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: `${typeDef.color}15`, color: typeDef.color, border: `1px solid ${typeDef.color}33` }}>
                  <span>{typeDef.icon}</span>
                  {typeDef.label}
                </span>
              ) : null;
            })()}
          </div>

          {/* QR Code button — only shown when salon exists */}
          {salon?._id && (
            <button
              onClick={() => setShowQR(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
              title="View my salon QR code"
            >
              <QrCode className="w-4 h-4" />
              My QR
            </button>
          )}
        </div>

        {/* ── Business Type Card ── */}
        {(() => {
          const typeDef = SALON_TYPES.find(t => t.key === salon?.businessType);
          if (!typeDef) return null;
          const TypeIcon = SALON_TYPE_ICONS[typeDef.key];
          return (
            <div
              className="rounded-xl border-2 p-4 flex items-center gap-4"
              style={{ borderColor: `${typeDef.color}40`, background: `${typeDef.color}08` }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${typeDef.color}18` }}
              >
                {TypeIcon && <TypeIcon size={26} strokeWidth={1.5} color={typeDef.color} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: typeDef.color }}>
                  Your Business Type
                </p>
                <p className="font-bold text-gray-900 text-base">{typeDef.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{typeDef.description}</p>
              </div>
              <span
                className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: `${typeDef.color}18`, color: typeDef.color }}
              >
                Selected
              </span>
            </div>
          );
        })()}

        {/* ── Section 1: My Profile ── */}
        <Section
          id="profile"
          activeId={activeSection}
          onToggle={toggle}
          icon={User}
          iconColor="bg-blue-100 text-blue-600"
          title="My Profile"
          subtitle="Name, gender, email and phone number"
        >
          {!isEditing ? (
            <div className="space-y-3 pt-2">
              {[
                { icon: Mail,  color: 'text-blue-500',  label: 'Email',  value: user?.email },
                { icon: Phone, color: 'text-green-500', label: 'Phone',  value: user?.phone },
                { icon: User,  color: 'text-indigo-500', label: 'Gender', value: user?.gender ? ({ male: 'Male', female: 'Female', other: 'Other' }[user.gender]) : null },
                (() => { const td = SALON_TYPES.find(t => t.key === salon?.businessType); return td ? { icon: Sparkles, color: 'text-indigo-500', label: 'Business Type', value: td.label } : null; })(),
                salon && { icon: MapPin,   color: 'text-red-500',    label: 'Address', value: salon.address },
              ].filter(Boolean).map(({ icon: Icon, color, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 w-full py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
              <Input label="Full Name" name="name" value={profileData.name}
                onChange={handleProfileChange} placeholder="Your name"
                error={!!profileErrors.name} errorMessage={profileErrors.name}
                disabled={profileLoading} required />
              <Input label="Email Address" name="email" type="email" value={profileData.email}
                onChange={handleProfileChange} placeholder="your@email.com"
                error={!!profileErrors.email} errorMessage={profileErrors.email}
                disabled={profileLoading} required />
              <Input label="Phone Number" name="phone" type="tel" value={profileData.phone}
                onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setProfileData(p => ({ ...p, phone: v })); if (profileErrors.phone) setProfileErrors(p => ({ ...p, phone: '' })); }}
                placeholder="98765 43210"
                error={!!profileErrors.phone} errorMessage={profileErrors.phone}
                disabled={profileLoading} required />

              {/* Gender */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male',   label: 'Male',   emoji: '👨' },
                    { value: 'female', label: 'Female', emoji: '👩' },
                    { value: 'other',  label: 'Other',  emoji: '🧑' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={profileLoading}
                      onClick={() => setProfileData(p => ({ ...p, gender: opt.value }))}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-sm font-medium transition ${
                        profileData.gender === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" variant="primary" loading={profileLoading} disabled={profileLoading} fullWidth>
                  Save Changes
                </Button>
                <Button type="button" variant="outline" disabled={profileLoading} fullWidth
                  onClick={() => { setIsEditing(false); setProfileErrors({}); if (user) setProfileData({ name: user.name||'', email: user.email||'', phone: user.phone||'', gender: user.gender||'' }); }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Section>

        {/* ── Section 2: Security ── */}
        <Section
          id="security"
          activeId={activeSection}
          onToggle={toggle}
          icon={Lock}
          iconColor="bg-red-100 text-red-600"
          title="Security"
          subtitle="Password and login security"
        >
          <div className="pt-3 space-y-4">

            {/* Status pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, label: 'Active & Verified', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                { icon: Phone,       label: 'Phone Auth',        color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200' },
                { icon: KeyRound,    label: 'Password Protected', color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
              ].map(({ icon: Ic, label, color, bg }) => (
                <span key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${bg} ${color}`}>
                  <Ic className="w-3.5 h-3.5" />
                  {label}
                </span>
              ))}
            </div>

            {/* Last changed */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Last password changed
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                user?.lastPasswordChange
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {user?.lastPasswordChange
                  ? new Date(user.lastPasswordChange).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Never'}
              </span>
            </div>

            {/* Invisible recaptcha container */}
            <div id="pw-reset-recaptcha" />

            {/* ── PHASE: idle ── */}
            {secPhase === 'idle' && (
              <button
                onClick={handleSendOtp}
                disabled={secLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
              >
                {secLoading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Phone className="w-4 h-4" />}
                Send OTP to My Mobile
              </button>
            )}

            {/* ── PHASE: otp sent ── */}
            {secPhase === 'sent' && (
              <form onSubmit={handleResetPassword} className="space-y-5">

                {/* Phone hint */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 border border-violet-200">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-violet-500 font-medium">SMS OTP sent to</p>
                    <p className="text-sm font-bold text-violet-800">
                      {user?.phone?.replace(/(\+\d{2})(\d{4})(\d+)(\d{4})/, '$1 $2 XXXX $4')}
                    </p>
                  </div>
                </div>

                {/* 6-digit OTP boxes */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2.5 uppercase tracking-wider">Enter OTP</p>
                  <div className="flex gap-2 justify-center">
                    {secOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => otpRefs.current[idx] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className={`w-11 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                          ${digit ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-gray-50 text-gray-800'}
                          focus:border-violet-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,58,237,0.12)]`}
                        style={{ height: 52 }}
                      />
                    ))}
                  </div>
                  {secErrors.otp && <p className="text-xs text-red-500 mt-1.5 text-center">{secErrors.otp}</p>}
                </div>

                {/* Resend */}
                <div className="text-center">
                  {otpTimer > 0 ? (
                    <p className="text-xs text-gray-400">Resend OTP in <span className="font-semibold text-violet-600">{otpTimer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleSendOtp} className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition">
                      Resend OTP
                    </button>
                  )}
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={secNewPw}
                      onChange={e => { setSecNewPw(e.target.value); if (secErrors.newPw) setSecErrors(p => ({...p, newPw:''})); }}
                      placeholder="Min 8 characters"
                      className={`w-full px-4 py-3 pr-11 rounded-xl border-2 text-sm transition-all outline-none bg-gray-50
                        ${secErrors.newPw ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-violet-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)]'}`}
                    />
                    <button type="button" onClick={() => setShowNewPw(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {secErrors.newPw && <p className="text-xs text-red-500">{secErrors.newPw}</p>}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={secConfirmPw}
                      onChange={e => { setSecConfirmPw(e.target.value); if (secErrors.confirmPw) setSecErrors(p => ({...p, confirmPw:''})); }}
                      placeholder="Re-enter new password"
                      className={`w-full px-4 py-3 pr-11 rounded-xl border-2 text-sm transition-all outline-none bg-gray-50
                        ${secErrors.confirmPw ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-violet-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)]'}`}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {secErrors.confirmPw && <p className="text-xs text-red-500">{secErrors.confirmPw}</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={secLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                  >
                    {secLoading
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <ShieldCheck className="w-4 h-4" />}
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSecPhase('idle'); setSecErrors({}); }}
                    className="px-5 py-3.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* ── PHASE: success ── */}
            {secPhase === 'success' && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">Password Updated</p>
                  <p className="text-sm text-gray-500 mt-0.5">Your account is secured with the new password.</p>
                </div>
                <button
                  onClick={() => setSecPhase('idle')}
                  className="mt-1 text-sm font-semibold text-violet-600 hover:text-violet-800 transition"
                >
                  Back to Security
                </button>
              </div>
            )}

          </div>
        </Section>

        {/* ── Section 3: Account Information ── */}
        <Section
          id="account"
          activeId={activeSection}
          onToggle={toggle}
          icon={Info}
          iconColor="bg-indigo-100 text-indigo-600"
          title="Account Information"
          subtitle="Account type, ID and status"
        >
          <div className="space-y-3 pt-2">
            {[
              { label: 'User ID',       value: user?._id ? `${String(user._id).substring(0, 16)}…` : '—' },
              { label: 'Account Type',  value: (() => { const td = SALON_TYPES.find(t => t.key === salon?.businessType); return td ? `${td.label} Owner` : 'Salon Owner'; })() },
              { label: 'Member Since',  value: memberSince },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Account Status</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active ✓</span>
            </div>
          </div>
        </Section>
      </div>

      {/* QR Code Modal */}
      {showQR && salon?._id && (
        <SalonQRModal salon={salon} onClose={() => setShowQR(false)} />
      )}
    </DashboardLayout>
  );
};

export default Profile;
