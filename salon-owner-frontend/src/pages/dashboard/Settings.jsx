import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Bell, Settings, Lock, User, Calendar, CalendarX,
  Save, Edit2, X, ChevronDown, Plus,
  CheckCircle2, BellOff, Camera, Trash2, ImagePlus, GitBranch,
  Eye, EyeOff, Info, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useSalon } from '../../hooks/useSalon';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { uploadSalonPhotos } from '../../services/salonService';
import api from '../../services/api';

/* ─── Shared input class ─────────────────────────────────────── */
const INP = `w-full px-4 py-2.5 rounded-xl border
  bg-white dark:bg-gray-800/60
  border-gray-200 dark:border-gray-700
  text-gray-900 dark:text-white
  placeholder-gray-400 dark:placeholder-gray-500
  focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
  disabled:opacity-50 text-sm transition-colors`;

const SEL = `w-full px-4 py-2.5 rounded-xl border
  bg-white dark:bg-gray-800/60
  border-gray-200 dark:border-gray-700
  text-gray-900 dark:text-white
  focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
  disabled:opacity-50 text-sm transition-colors`;

/* ─── Toggle ─────────────────────────────────────────────────── */
const Toggle = ({ name, checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer select-none">
    <input type="checkbox" name={name} checked={checked} onChange={onChange}
      disabled={disabled} className="sr-only peer" />
    <div className={`
      w-11 h-6 rounded-full transition-colors duration-200
      bg-gray-200 dark:bg-gray-700
      peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500
      peer-disabled:opacity-40
      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
      after:w-5 after:h-5 after:bg-white after:rounded-full after:shadow
      after:transition-transform after:duration-200
      peer-checked:after:translate-x-5
    `} />
  </label>
);

/* ─── Accordion ──────────────────────────────────────────────── */
const Accordion = ({ id, activeId, onToggle, icon: Icon, iconBg, iconColor, title, subtitle, children }) => {
  const open = activeId === id;
  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden
      ${open
        ? 'border-indigo-200 dark:border-indigo-800/60 shadow-sm shadow-indigo-100/50 dark:shadow-indigo-900/20'
        : 'border-gray-200 dark:border-gray-800'
      }
      bg-white dark:bg-gray-900`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left
          hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-200 overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-6 pt-1 border-t border-gray-100 dark:border-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ─── Field row (view mode) ──────────────────────────────────── */
const FieldRow = ({ label, value }) => (
  <div className="flex items-start gap-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
    <span className="w-32 shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-900 dark:text-white break-all">{value || '—'}</span>
  </div>
);

/* ─── Save bar ───────────────────────────────────────────────── */
const SaveBar = ({ onSave, onCancel, loading }) => (
  <div className="flex gap-2 pt-2">
    <button type="submit" disabled={loading}
      onClick={onSave}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
        bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500
        text-white text-sm font-semibold transition-colors disabled:opacity-60">
      {loading
        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        : <Save className="w-4 h-4" />}
      {loading ? 'Saving…' : 'Save Changes'}
    </button>
    <button type="button" disabled={loading} onClick={onCancel}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
        border border-gray-200 dark:border-gray-700
        text-gray-700 dark:text-gray-300
        hover:bg-gray-50 dark:hover:bg-gray-800
        text-sm font-medium transition-colors disabled:opacity-60">
      <X className="w-4 h-4" /> Cancel
    </button>
  </div>
);

/* ─── My Profile ─────────────────────────────────────────────── */
const ProfileContent = () => {
  const { user, updateProfile } = useAuth();
  const { salon } = useSalon();
  const [editing, setEditing]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [pwStep, setPwStep]       = useState(1);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwTimer, setPwTimer]     = useState(0);
  const [form, setForm]   = useState({ name: '', email: '' });
  const [pw, setPw]       = useState({ otp: '', next: '', confirm: '' });
  const [pwError, setPwError]   = useState('');
  const [pwShowPw, setPwShowPw] = useState(false);
  const [errors, setErrors]     = useState({});

  useEffect(() => {
    if (pwTimer <= 0) return;
    const id = setInterval(() => setPwTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [pwTimer]);

  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '' });
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim())  errs.name  = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await updateProfile({ name: form.name.trim(), email: form.email.trim() });
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally { setLoading(false); }
  };

  const handlePwSendOtp = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!user?.phone) { setPwError('No phone number linked to your account'); return; }
    setPwLoading(true);
    try {
      await api.post('/owner/auth/forgot-password/send-otp', { phone: user.phone });
      setPwStep(2); setPwTimer(60);
      toast.success('OTP sent to your registered phone!');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setPwLoading(false); }
  };

  const handlePwReset = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pw.otp.trim())           { setPwError('OTP is required'); return; }
    if (!pw.next || pw.next.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (pw.next !== pw.confirm)   { setPwError('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await api.post('/owner/auth/forgot-password/reset', { phone: user.phone, otp: pw.otp, newPassword: pw.next });
      toast.success('Password changed successfully!');
      setPwStep(1); setPw({ otp: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally { setPwLoading(false); }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-5 mt-3">
      {/* Avatar row */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
        <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden ring-2 ring-indigo-100 dark:ring-indigo-900">
          {salon?.logo ? (
            <img src={salon.logo} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{user?.name || '—'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Member since {memberSince}</p>
        </div>
      </div>

      {/* Profile fields / form */}
      {editing ? (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Your name" disabled={loading} required className={INP} />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="your@email.com" disabled={loading} required className={INP} />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
          <SaveBar loading={loading}
            onCancel={() => { setEditing(false); setErrors({}); if (user) setForm({ name: user.name||'', email: user.email||'' }); }} />
        </form>
      ) : (
        <div>
          <FieldRow label="Name"  value={user?.name} />
          <FieldRow label="Email" value={user?.email} />
          <FieldRow label="Phone" value={user?.phone} />
          <button onClick={() => setEditing(true)}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
              text-sm font-medium text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      )}

      {/* Change password */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Change Password</p>
        {pwError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/50">
            {pwError}
          </p>
        )}
        {pwStep === 1 ? (
          <form onSubmit={handlePwSendOtp} className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              An OTP will be sent to your registered phone: <strong className="text-gray-700 dark:text-gray-200">{user?.phone || '—'}</strong>
            </p>
            <button type="submit" disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {pwLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={handlePwReset} className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">OTP sent to <strong className="text-gray-700 dark:text-gray-200">{user?.phone}</strong></p>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">OTP</label>
              <input type="text" value={pw.otp} onChange={e => setPw(p => ({ ...p, otp: e.target.value }))}
                placeholder="Enter 6-digit OTP" disabled={pwLoading} maxLength={6} required className={INP} />
            </div>
            <div className="space-y-1.5 relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
              <input type={pwShowPw ? 'text' : 'password'} value={pw.next}
                onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                placeholder="Min 8 characters" disabled={pwLoading} required className={INP} />
              <button type="button" onClick={() => setPwShowPw(!pwShowPw)}
                className="absolute right-3 top-9 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {pwShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <input type="password" value={pw.confirm}
                onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat new password" disabled={pwLoading} required className={INP} />
            </div>
            <button type="submit" disabled={pwLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {pwLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <Save className="w-4 h-4" /> Reset Password
            </button>
            <button type="button" onClick={pwTimer === 0 ? handlePwSendOtp : undefined} disabled={pwTimer > 0 || pwLoading}
              className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 disabled:opacity-50 hover:underline">
              {pwTimer > 0 ? `Resend OTP in ${pwTimer}s` : 'Resend OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* ─── Salon Information ───────────────────────────────────────── */
const SalonContent = ({ salon, updateSalon }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [form, setForm] = useState({
    name: '', description: '', category: 'barber',
    phone: '', email: '', address: '', city: '', state: '',
  });

  useEffect(() => {
    if (salon) setForm({
      name:        salon.name        || '',
      description: salon.description || '',
      category:    salon.category    || 'barber',
      phone:       salon.phone       || '',
      email:       salon.email       || '',
      address:     salon.address     || '',
      city:        salon.city        || '',
      state:       salon.state       || '',
    });
  }, [salon]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim())  errs.name  = 'Salon name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await updateSalon(form);
      toast.success('Salon information updated!');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update salon');
    } finally { setLoading(false); }
  };

  const handleCancel = () => {
    if (salon) setForm({
      name: salon.name||'', description: salon.description||'', category: salon.category||'barber',
      phone: salon.phone||'', email: salon.email||'',
      address: salon.address||'', city: salon.city||'', state: salon.state||'',
    });
    setErrors({});
    setEditing(false);
  };

  const coords = salon?.location?.coordinates;
  const [salonLng, salonLat] = coords?.length === 2 ? coords : [null, null];
  const hasCoords = salonLat !== null && salonLng !== null;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${salonLng - 0.01},${salonLat - 0.01},${salonLng + 0.01},${salonLat + 0.01}&layer=mapnik&marker=${salonLat},${salonLng}`
    : null;
  const mapsLink = hasCoords ? `https://www.google.com/maps?q=${salonLat},${salonLng}` : null;

  const LabelInput = ({ label, name, type = 'text', placeholder, required, error }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input name={name} type={type} value={form[name]} onChange={handleChange}
        placeholder={placeholder} disabled={loading} required={required} className={INP} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );

  return !editing ? (
    <div className="space-y-1 mt-3">
      {salon?.coverPhoto || salon?.photos?.[0] ? (
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
          <img src={salon.coverPhoto || salon.photos[0]} alt="Salon" className="w-full h-40 object-cover" />
        </div>
      ) : null}

      {[
        { label: 'Salon Name',  value: form.name },
        { label: 'Description', value: form.description },
        { label: 'Category',    value: form.category },
        { label: 'Phone',       value: form.phone },
        { label: 'Email',       value: form.email },
        { label: 'Address',     value: form.address },
        { label: 'City',        value: form.city },
        { label: 'State',       value: form.state },
      ].map(({ label, value }) => <FieldRow key={label} label={label} value={value} />)}

      {/* Map preview */}
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-gray-400" /> Salon Location
        </p>
        {mapSrc ? (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <iframe title="Salon Location" src={mapSrc} width="100%" height="200" className="block" loading="lazy" />
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-mono">{salonLat?.toFixed(5)}, {salonLng?.toFixed(5)}</span>
              <a href={mapsLink} target="_blank" rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium shrink-0">
                Open in Google Maps →
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 h-24 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No coordinates saved for this salon
          </div>
        )}
      </div>

      <button onClick={() => setEditing(true)}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
          text-sm font-medium text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <Edit2 className="w-4 h-4" /> Edit Salon Info
      </button>
    </div>
  ) : (
    <form onSubmit={handleSave} className="space-y-4 mt-3">
      <LabelInput label="Salon Name" name="name" placeholder="Your salon name" required error={errors.name} />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} disabled={loading}
          placeholder="Describe your salon…"
          className={`${INP} resize-none`} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <select name="category" value={form.category} onChange={handleChange} disabled={loading} className={SEL}>
          <option value="barber">Men's Salon</option>
          <option value="hair_salon">Hair Salon</option>
          <option value="spa">Spa</option>
          <option value="massage">Massage</option>
          <option value="multi_service">Multi-Service</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabelInput label="Phone" name="phone" type="tel" placeholder="+91 98765 43210" required error={errors.phone} />
        <LabelInput label="Email" name="email" type="email" placeholder="salon@email.com" />
      </div>
      <LabelInput label="Address" name="address" placeholder="Street address" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LabelInput label="City" name="city" placeholder="City" />
        <LabelInput label="State" name="state" placeholder="State" />
      </div>
      {mapSrc && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-gray-400" /> Current Location
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <iframe title="Salon Location" src={mapSrc} width="100%" height="170" className="block" loading="lazy" />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Coordinates set during salon registration.</p>
        </div>
      )}
      <SaveBar loading={loading} onCancel={handleCancel} />
    </form>
  );
};

/* ─── Notifications ──────────────────────────────────────────── */
const NotificationsContent = () => {
  const { permission, requestPermission } = useNotifications();
  const [prefs, setPrefs] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('notificationPrefs') || '{}');
      return {
        emailNotifications:  s.emailNotifications  ?? true,
        smsNotifications:    s.smsNotifications    ?? true,
        bookingReminders:    s.bookingReminders     ?? true,
        cancelledBookings:   s.cancelledBookings    ?? true,
        reviewNotifications: s.reviewNotifications  ?? true,
      };
    } catch { return { emailNotifications:true, smsNotifications:true, bookingReminders:true, cancelledBookings:true, reviewNotifications:true }; }
  });

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setPrefs(p => ({ ...p, [name]: checked }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem('notificationPrefs', JSON.stringify(prefs));
      toast.success('Notification preferences saved!');
    } catch { toast.error('Failed to save'); }
  };

  const ITEMS = [
    { name: 'emailNotifications',  label: 'Email Notifications',  desc: 'Receive booking updates via email' },
    { name: 'smsNotifications',    label: 'SMS Notifications',    desc: 'Receive booking updates via SMS' },
    { name: 'bookingReminders',    label: 'Booking Reminders',    desc: 'Get notified about upcoming bookings' },
    { name: 'cancelledBookings',   label: 'Cancellation Alerts',  desc: 'Notify when a booking is cancelled' },
    { name: 'reviewNotifications', label: 'New Reviews',          desc: 'Get notified when a customer leaves a review' },
  ];

  const pushBg = permission === 'granted'
    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50'
    : permission === 'denied'
    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50';

  return (
    <div className="space-y-4 mt-3">
      {/* Browser push */}
      <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 ${pushBg}`}>
        <div className="flex items-center gap-3">
          {permission === 'granted'
            ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            : <BellOff className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {permission === 'granted' ? 'Push notifications enabled'
               : permission === 'denied'  ? 'Push notifications blocked'
               : 'Enable push notifications'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {permission === 'granted' ? 'You will be alerted in-browser for new bookings.'
               : permission === 'denied'  ? 'Allow in browser site settings to receive alerts.'
               : 'Click Allow to get instant browser alerts.'}
            </p>
          </div>
        </div>
        {permission === 'default' && (
          <button onClick={requestPermission}
            className="shrink-0 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors">
            Allow
          </button>
        )}
      </div>

      <div className="space-y-2">
        {ITEMS.map(item => (
          <div key={item.name} className="flex items-center justify-between p-3.5 rounded-xl
            bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <Toggle name={item.name} checked={prefs[item.name]} onChange={handleChange} />
          </div>
        ))}
      </div>

      <button onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
        <Save className="w-4 h-4" /> Save Preferences
      </button>
    </div>
  );
};

/* ─── App Preferences ────────────────────────────────────────── */
const AppContent = () => {
  const { changeLanguage } = useLanguage();
  const [prefs, setPrefs] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('appPrefs') || '{}');
      return { theme: s.theme||'light', language: s.language||'en', timeFormat: s.timeFormat||'12h', dateFormat: s.dateFormat||'DD/MM/YYYY' };
    } catch { return { theme:'light', language:'en', timeFormat:'12h', dateFormat:'DD/MM/YYYY' }; }
  });

  const handleChange = (e) => setPrefs(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    try {
      localStorage.setItem('appPrefs', JSON.stringify(prefs));
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefs.theme === 'dark' || (prefs.theme === 'auto' && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      changeLanguage(prefs.language);
      toast.success('App preferences saved!');
    } catch { toast.error('Failed to save'); }
  };

  const FIELDS = [
    { name:'theme',      label:'Theme',       options:[['light','Light'],['dark','Dark'],['auto','Auto (System)']] },
    { name:'language',   label:'Language',    options:[['en','English'],['hi','Hindi']] },
    { name:'timeFormat', label:'Time Format', options:[['12h','12 Hour (AM/PM)'],['24h','24 Hour']] },
    { name:'dateFormat', label:'Date Format', options:[['DD/MM/YYYY','DD/MM/YYYY'],['MM/DD/YYYY','MM/DD/YYYY'],['YYYY-MM-DD','YYYY-MM-DD']] },
  ];

  return (
    <div className="space-y-4 mt-3">
      {FIELDS.map(({ name, label, options }) => (
        <div key={name} className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
          <select name={name} value={prefs[name]} onChange={handleChange} className={SEL}>
            {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
          </select>
        </div>
      ))}
      <button onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
        <Save className="w-4 h-4" /> Save Preferences
      </button>
    </div>
  );
};

/* ─── Booking Window ─────────────────────────────────────────── */
const BookingWindowContent = ({ salon, updateSalon }) => {
  const [days, setDays]     = useState(salon?.advanceBookingDays ?? 1);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setDays(salon?.advanceBookingDays ?? 1); }, [salon]);

  const OPTIONS = [
    { value: 0,  label: 'Today only',         desc: 'Customers can only book for the current day' },
    { value: 1,  label: 'Today + Tomorrow',    desc: 'Default — customers can book up to 1 day ahead' },
    { value: 3,  label: 'Next 3 days',         desc: 'Today and 3 days in advance' },
    { value: 7,  label: 'Next 7 days',         desc: 'Today and 7 days in advance' },
    { value: 14, label: 'Next 14 days',        desc: 'Today and 2 weeks in advance' },
    { value: 30, label: 'Next 30 days',        desc: 'Today and 30 days in advance' },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSalon({ advanceBookingDays: days });
      toast.success('Booking window updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 mt-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Control how far in advance customers can book appointments at your salon.
      </p>
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setDays(opt.value)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
              days === opt.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <div>
              <p className={`text-sm font-semibold ${days === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
            </div>
            {days === opt.value && <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />}
          </button>
        ))}
      </div>
      <button onClick={handleSave} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        <Save className="w-4 h-4" /> Save Booking Window
      </button>
    </div>
  );
};

/* ─── Auto Confirm ───────────────────────────────────────────── */
const AutoConfirmContent = ({ salon, updateSalon }) => {
  const [enabled, setEnabled]   = useState(salon?.autoConfirmBookings !== false);
  const [loading, setLoading]   = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && salon) {
      setEnabled(salon.autoConfirmBookings !== false);
      initialized.current = true;
    }
  }, [salon]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSalon({ autoConfirmBookings: enabled });
      toast.success('Auto-confirm setting saved!');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 mt-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        When enabled, cash bookings are confirmed instantly. When disabled, each booking stays{' '}
        <strong className="text-gray-700 dark:text-gray-300">pending</strong> until you manually confirm it.
      </p>
      <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
        enabled
          ? 'border-green-400 dark:border-green-700 bg-green-50 dark:bg-green-950/30'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40'
      }`}>
        <div>
          <p className={`text-sm font-semibold ${enabled ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-gray-200'}`}>
            {enabled ? 'Auto-Confirm is ON' : 'Auto-Confirm is OFF'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {enabled ? 'New bookings are confirmed automatically.' : 'You must manually confirm each new booking.'}
          </p>
        </div>
        <Toggle name="autoConfirm" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
      </div>
      <button onClick={handleSave} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        <Save className="w-4 h-4" /> Save Setting
      </button>
    </div>
  );
};

/* ─── Booking Mode ───────────────────────────────────────────── */
const BookingModeContent = ({ salon, updateSalon }) => {
  const [mode, setMode]       = useState(salon?.bookingMode || 'sequential');
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && salon) {
      setMode(salon.bookingMode || 'sequential');
      initialized.current = true;
    }
  }, [salon]);

  const OPTIONS = [
    {
      value: 'flexible',
      label: 'Flexible (Customer Picks)',
      desc:  'Customer chooses any available time slot from all open slots.',
      icon:  '🗓️',
    },
    {
      value: 'sequential',
      label: 'Sequential (Next in Line)',
      desc:  'Bookings are assigned one after another. Customer gets the next open slot automatically — no gap.',
      icon:  '⏩',
    },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSalon({ bookingMode: mode });
      toast.success('Booking mode updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 mt-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose how appointment slots are assigned to customers.
      </p>
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
              mode === opt.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
            <span className="text-xl shrink-0 mt-0.5">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${mode === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
            </div>
            {mode === opt.value && <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />}
          </button>
        ))}
      </div>
      <button onClick={handleSave} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
          bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
        {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        <Save className="w-4 h-4" /> Save Booking Mode
      </button>
    </div>
  );
};

/* ─── Salon Photos ───────────────────────────────────────────── */
const SalonPhotosContent = ({ salon, fetchSalon }) => {
  const [photos, setPhotos]     = useState(salon?.photos || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { setPhotos(salon?.photos || []); }, [salon]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 10) {
      toast.error('Maximum 10 photos allowed');
      return;
    }
    setUploading(true);
    try {
      const urls = await uploadSalonPhotos(files);
      const updated = [...photos, ...urls];
      await api.put('/owner/salon/photos', { photos: updated });
      setPhotos(updated);
      if (fetchSalon) fetchSalon();
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded!`);
    } catch {
      toast.error('Failed to upload photos');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (url) => {
    const updated = photos.filter(p => p !== url);
    try {
      await api.put('/owner/salon/photos', { photos: updated });
      setPhotos(updated);
      if (fetchSalon) fetchSalon();
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  return (
    <div className="space-y-4 mt-3">
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer
          border-2 border-dashed border-gray-300 dark:border-gray-700
          hover:border-indigo-400 dark:hover:border-indigo-500
          hover:bg-indigo-50 dark:hover:bg-indigo-950/20
          bg-gray-50 dark:bg-gray-800/40 transition-all">
        {uploading
          ? <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          : <ImagePlus className="w-7 h-7 text-gray-400 dark:text-gray-500" />}
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {uploading ? 'Uploading…' : 'Click to upload salon photos'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WebP · Up to 10 photos total</p>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
          multiple className="hidden" onChange={handleUpload} />
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <img src={url} alt={`Salon photo ${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => handleDelete(url)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">No photos uploaded yet</p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        {photos.length}/10 photos · Hover a photo to delete it
      </p>
    </div>
  );
};

/* ─── Closed Dates ───────────────────────────────────────────── */
const ClosedDatesContent = ({ salon }) => {
  const [holidays, setHolidays]   = useState([]);
  const [newDate, setNewDate]     = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  useEffect(() => { setHolidays(salon?.workingHours?.holidays || []); }, [salon]);

  const handleAdd = async () => {
    if (!newDate) { toast.error('Please select a date'); return; }
    setAdding(true);
    try {
      const res = await api.post('/owner/salon/holidays', { date: newDate, reason: newReason.trim() });
      setHolidays(res.data.data.holidays);
      setNewDate(''); setNewReason('');
      toast.success('Closed date added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add closed date');
    } finally { setAdding(false); }
  };

  const handleDelete = async (holidayId) => {
    setDeleting(holidayId);
    try {
      const res = await api.delete(`/owner/salon/holidays/${holidayId}`);
      setHolidays(res.data.data.holidays);
      toast.success('Closed date removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove date');
    } finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4 mt-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Mark specific dates as closed (e.g. holidays, events). Customers cannot book on these dates.
      </p>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-800/40">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add Closed Date</p>
        <input type="date" min={todayStr} value={newDate} onChange={e => setNewDate(e.target.value)}
          className={INP} />
        <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)}
          placeholder="Reason (e.g. Diwali, Owner holiday)"
          className={INP} />
        <button onClick={handleAdd} disabled={adding}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
          {adding && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <Plus className="w-4 h-4" /> Add Closed Date
        </button>
      </div>

      {holidays.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">No closed dates set.</p>
      ) : (
        <div className="space-y-2">
          {[...holidays].sort((a, b) => new Date(a.date) - new Date(b.date)).map((h) => {
            const dateStr = new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={h._id} className="flex items-center justify-between gap-3 p-3 rounded-xl
                bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300">{dateStr}</p>
                  {h.reason && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">{h.reason}</p>}
                </div>
                <button onClick={() => handleDelete(h._id)} disabled={deleting === h._id}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition disabled:opacity-50">
                  {deleting === h._id
                    ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Working Hours ──────────────────────────────────────────── */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 === 0 ? 12 : i % 12;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { label: `${h}:00 ${ampm}`, value: `${String(i).padStart(2, '0')}:00` };
});

const DEFAULT_WORKING_HOURS = DAYS.map((day) => ({
  day,
  isOpen: day !== 'Sunday',
  openTime: '09:00',
  closeTime: '20:00',
}));

const WorkingHoursContent = () => {
  const [hours, setHours]   = useState(DEFAULT_WORKING_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get('/owner/working-hours')
      .then((res) => {
        const obj = res.data.data?.workingHours;
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          const dayOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
          setHours(dayOrder.map((dayName) => {
            const v = obj[dayName.toLowerCase()] || {};
            return {
              day: dayName,
              isOpen: !v.isClosed,
              openTime: v.open || '09:00',
              closeTime: v.close || '20:00',
            };
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (index) =>
    setHours((prev) => prev.map((h, i) => i === index ? { ...h, isOpen: !h.isOpen } : h));

  const setTime = (index, field, value) =>
    setHours((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));

  const handleSave = async () => {
    setSaving(true);
    try {
      const workingHoursObj = {};
      hours.forEach((h) => {
        workingHoursObj[h.day.toLowerCase()] = {
          open: h.openTime,
          close: h.closeTime,
          isClosed: !h.isOpen,
        };
      });
      await api.put('/owner/working-hours', { workingHours: workingHoursObj });
      toast.success('Working hours updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save working hours');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Set your salon's open and close times for each day of the week.
      </p>
      {hours.map((item, index) => (
        <div key={item.day}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 overflow-hidden">
          {/* Day header row */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-24 shrink-0">
              {item.day}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${item.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {item.isOpen ? 'Open' : 'Closed'}
              </span>
              <Toggle
                name={`working-${item.day}`}
                checked={item.isOpen}
                onChange={() => toggleDay(index)}
              />
            </div>
          </div>
          {/* Time selectors — only when open */}
          {item.isOpen && (
            <div className="flex items-center gap-2 px-4 pb-3">
              <select
                value={item.openTime}
                onChange={(e) => setTime(index, 'openTime', e.target.value)}
                className={`${SEL} flex-1`}
              >
                {HOURS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">to</span>
              <select
                value={item.closeTime}
                onChange={(e) => setTime(index, 'closeTime', e.target.value)}
                className={`${SEL} flex-1`}
              >
                {HOURS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mt-2
          bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
        {saving
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save Working Hours'}
      </button>
    </div>
  );
};

/* ─── Privacy & Security ─────────────────────────────────────── */
const PrivacyContent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword]     = useState('');
  const [deleting, setDeleting]     = useState(false);
  const [step, setStep]             = useState(1);

  const handleDelete = async () => {
    if (!password.trim()) { toast.error('Enter your password'); return; }
    setDeleting(true);
    try {
      const identifier = user?.email || user?.phone;
      await api.post('/owner/auth/delete-account', { identifier, password });
      toast.success('Account deleted. Goodbye!');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect password or error occurred');
    } finally { setDeleting(false); }
  };

  const SHIELDS = [
    { icon: '🔒', title: 'Data Encryption',  desc: 'All your data is encrypted end-to-end and stored securely.' },
    { icon: '🚫', title: 'No Data Sharing',  desc: 'We never share your information with third parties.' },
    { icon: '🛡️', title: 'Security Updates', desc: 'Regular patches and security updates are applied automatically.' },
    { icon: '🔑', title: 'Token Security',   desc: 'Auth tokens expire automatically and refresh securely.' },
  ];

  return (
    <div className="space-y-3 mt-3">
      {SHIELDS.map(({ icon, title, desc }) => (
        <div key={title} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
          <span className="text-2xl shrink-0">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}

      {/* Delete account */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        {!showDelete ? (
          <button type="button" onClick={() => { setShowDelete(true); setStep(1); }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl
              bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50
              hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-xl">🗑️</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Delete Account</p>
                <p className="text-xs text-red-400 dark:text-red-500">Permanently remove your account and all data</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-red-400 shrink-0" />
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Delete Account Forever</p>
              <button type="button" onClick={() => { setShowDelete(false); setStep(1); setPassword(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === 1 && (
              <>
                <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
                  <p className="font-medium">This will permanently delete:</p>
                  <ul className="list-disc pl-5 space-y-1 text-red-600 dark:text-red-400 text-xs">
                    <li>Your owner account and profile</li>
                    <li>Your salon listing and all its services</li>
                    <li>All customer reviews on your salon</li>
                    <li>All booking history</li>
                  </ul>
                  <p className="text-xs text-red-500 font-semibold pt-1">This action cannot be undone.</p>
                </div>
                <button type="button" onClick={() => setStep(2)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  I understand, continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-red-700 dark:text-red-300">Enter your password to confirm deletion:</p>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Your current password"
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-red-300 dark:border-red-700
                    bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    focus:outline-none focus:border-red-500 text-sm" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl
                      text-sm font-medium text-gray-600 dark:text-gray-300
                      hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Back
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60
                      text-white text-sm font-semibold rounded-xl transition-colors
                      flex items-center justify-center gap-2">
                    {deleting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {deleting ? 'Deleting…' : 'Delete Forever'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── About ──────────────────────────────────────────────────── */
const AboutContent = () => (
  <div className="space-y-4 mt-3">
    <div className="space-y-1">
      {[
        { label: 'App Name',  value: 'My Salon Bookings' },
        { label: 'Version',   value: '1.0.0' },
        { label: 'Platform',  value: 'Web (Owner Panel)' },
        { label: 'Support',   value: 'support@mysalonbookings.com' },
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</span>
        </div>
      ))}
    </div>
    <div className="flex gap-4 text-xs text-indigo-600 dark:text-indigo-400 font-medium pt-1">
      <button type="button" className="hover:underline">Privacy Policy</button>
      <button type="button" className="hover:underline">Terms of Service</button>
      <button type="button" className="hover:underline">Help Center</button>
    </div>
  </div>
);

/* ─── Settings Page ──────────────────────────────────────────── */
const SettingsPage = () => {
  const { salon, updateSalon, fetchSalon } = useSalon();
  const [activeId, setActiveId] = useState(null);

  const toggle = (id) => setActiveId(prev => prev === id ? null : id);

  const SECTIONS = [
    {
      id: 'profile',
      icon: User,
      iconBg: 'bg-indigo-100 dark:bg-indigo-950',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      title: 'My Profile',
      subtitle: 'Name, email and account details',
      content: <ProfileContent />,
    },
    {
      id: 'salon',
      icon: Globe,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'Salon Information',
      subtitle: 'Salon name, category and contact details',
      content: <SalonContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'notifications',
      icon: Bell,
      iconBg: 'bg-amber-100 dark:bg-amber-950',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Notifications',
      subtitle: 'Email, SMS and push notification preferences',
      content: <NotificationsContent />,
    },
    {
      id: 'app',
      icon: Settings,
      iconBg: 'bg-violet-100 dark:bg-violet-950',
      iconColor: 'text-violet-600 dark:text-violet-400',
      title: 'App Preferences',
      subtitle: 'Theme, language and display settings',
      content: <AppContent />,
    },
    {
      id: 'booking-window',
      icon: Calendar,
      iconBg: 'bg-blue-100 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'Booking Window',
      subtitle: 'How far in advance customers can book',
      content: <BookingWindowContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'booking-mode',
      icon: GitBranch,
      iconBg: 'bg-teal-100 dark:bg-teal-950',
      iconColor: 'text-teal-600 dark:text-teal-400',
      title: 'Booking Mode',
      subtitle: 'Sequential (next-in-line) or Flexible (customer picks slot)',
      content: <BookingModeContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'auto-confirm',
      icon: CheckCircle2,
      iconBg: 'bg-green-100 dark:bg-green-950',
      iconColor: 'text-green-600 dark:text-green-400',
      title: 'Auto-Confirm Bookings',
      subtitle: 'Confirm bookings instantly or review them manually',
      content: <AutoConfirmContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'photos',
      icon: Camera,
      iconBg: 'bg-pink-100 dark:bg-pink-950',
      iconColor: 'text-pink-600 dark:text-pink-400',
      title: 'Salon Photos',
      subtitle: 'Upload photos customers will see on your salon page',
      content: <SalonPhotosContent salon={salon} fetchSalon={fetchSalon} />,
    },
    {
      id: 'closed-dates',
      icon: CalendarX,
      iconBg: 'bg-red-100 dark:bg-red-950',
      iconColor: 'text-red-600 dark:text-red-400',
      title: 'Closed Dates / Holidays',
      subtitle: 'Mark specific dates when your salon is closed',
      content: <ClosedDatesContent salon={salon} />,
    },
    {
      id: 'working-hours',
      icon: Clock,
      iconBg: 'bg-orange-100 dark:bg-orange-950',
      iconColor: 'text-orange-600 dark:text-orange-400',
      title: 'Working Hours',
      subtitle: 'Set open and close times for each day of the week',
      content: <WorkingHoursContent />,
    },
    {
      id: 'privacy',
      icon: Lock,
      iconBg: 'bg-slate-100 dark:bg-slate-900',
      iconColor: 'text-slate-600 dark:text-slate-400',
      title: 'Privacy & Security',
      subtitle: 'Data protection, security and account deletion',
      content: <PrivacyContent />,
    },
    {
      id: 'about',
      icon: Info,
      iconBg: 'bg-gray-100 dark:bg-gray-800',
      iconColor: 'text-gray-600 dark:text-gray-400',
      title: 'About',
      subtitle: 'App version, support and legal',
      content: <AboutContent />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-3">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your account, salon, and preferences
          </p>
        </div>

        {SECTIONS.map(({ id, icon, iconBg, iconColor, title, subtitle, content }) => (
          <Accordion
            key={id}
            id={id}
            activeId={activeId}
            onToggle={toggle}
            icon={icon}
            iconBg={iconBg}
            iconColor={iconColor}
            title={title}
            subtitle={subtitle}
          >
            {content}
          </Accordion>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
