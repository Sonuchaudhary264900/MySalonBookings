import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Bell, Settings, Lock, User, Calendar, CalendarX,
  Save, Edit2, X, ChevronDown, ChevronUp, Plus,
  CheckCircle2, BellOff, Camera, Trash2, ImagePlus, GitBranch,
  Eye, EyeOff, Gift,
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

// ─── Toggle component ─────────────────────────────────────────
const Toggle = ({ name, checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" name={name} checked={checked} onChange={onChange}
      disabled={disabled} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-200 rounded-full peer
      peer-checked:bg-blue-600
      after:content-[''] after:absolute after:top-[2px] after:left-[2px]
      after:bg-white after:border after:border-gray-300 after:rounded-full
      after:h-5 after:w-5 after:transition-all
      peer-checked:after:translate-x-full peer-checked:after:border-white
      peer-disabled:opacity-50" />
  </label>
);

// ─── Accordion wrapper ────────────────────────────────────────
const Accordion = ({ id, activeId, onToggle, icon: Icon, iconBg, title, subtitle, children }) => {
  const open = activeId === id;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
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
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// ─── My Profile content ───────────────────────────────────────
const ProfileContent = () => {
  const { user, updateProfile } = useAuth();
  const { salon } = useSalon();
  const [editing, setEditing]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [pwStep, setPwStep]       = useState(1); // 1=send otp, 2=verify+reset
  const [pwLoading, setPwLoading] = useState(false);
  const [pwTimer, setPwTimer]     = useState(0);
  const [form, setForm]   = useState({ name: '', email: '' });
  const [pw, setPw]       = useState({ otp: '', next: '', confirm: '' });
  const [pwError, setPwError]     = useState('');
  const [pwShowPw, setPwShowPw]   = useState(false);
  const [errors, setErrors] = useState({});

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
    if (!pw.otp.trim()) { setPwError('OTP is required'); return; }
    if (!pw.next || pw.next.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match'); return; }
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
    <div className="space-y-5">
      {/* Avatar row */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="w-12 h-12 rounded-full shrink-0 overflow-hidden">
          {salon?.logo ? (
            <img src={salon.logo} alt="profile" className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full bg-blue-100 flex items-center justify-center rounded-full">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-gray-900">{user?.name || '—'}</p>
          <p className="text-xs text-gray-500">Member since {memberSince}</p>
        </div>
      </div>

      {/* Profile fields / form */}
      {editing ? (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input label="Full Name" name="name" value={form.name} onChange={handleChange}
            placeholder="Your name" error={!!errors.name} errorMessage={errors.name} disabled={loading} required />
          <Input label="Email Address" name="email" type="email" value={form.email} onChange={handleChange}
            placeholder="your@email.com" error={!!errors.email} errorMessage={errors.email} disabled={loading} required />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={loading} disabled={loading} fullWidth>
              <Save className="w-4 h-4" /> Save
            </Button>
            <Button type="button" variant="outline" disabled={loading} fullWidth
              onClick={() => { setEditing(false); setErrors({}); if (user) setForm({ name: user.name||'', email: user.email||'' }); }}>
              <X className="w-4 h-4" /> Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {[
            { label: 'Name',   value: user?.name  || '—' },
            { label: 'Email',  value: user?.email || '—' },
            { label: 'Phone',  value: user?.phone || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
              <span className="w-20 shrink-0 text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium text-gray-900">{value}</span>
            </div>
          ))}
          <button onClick={() => setEditing(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      )}

      {/* Change password via OTP */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">Change Password</p>
        {pwError && <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{pwError}</p>}
        {pwStep === 1 ? (
          <form onSubmit={handlePwSendOtp} className="space-y-3">
            <p className="text-sm text-gray-500">An OTP will be sent to your registered phone: <strong>{user?.phone || '—'}</strong></p>
            <Button type="submit" variant="primary" loading={pwLoading} disabled={pwLoading} fullWidth>
              Send OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePwReset} className="space-y-3">
            <p className="text-sm text-gray-500">OTP sent to {user?.phone}</p>
            <Input label="OTP" name="otp" type="text" value={pw.otp}
              onChange={e => setPw(p => ({ ...p, otp: e.target.value }))}
              placeholder="Enter 6-digit OTP" disabled={pwLoading} maxLength={6} required />
            <div className="relative">
              <Input label="New Password" name="next" type={pwShowPw ? 'text' : 'password'} value={pw.next}
                onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                placeholder="Min 8 characters" disabled={pwLoading} required />
              <button type="button" onClick={() => setPwShowPw(!pwShowPw)} className="absolute right-3 top-9 text-gray-400">
                {pwShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input label="Confirm Password" name="confirm" type="password" value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              placeholder="Repeat new password" disabled={pwLoading} required />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" loading={pwLoading} disabled={pwLoading} fullWidth>
                <Save className="w-4 h-4" /> Reset Password
              </Button>
            </div>
            <button type="button" onClick={pwTimer === 0 ? handlePwSendOtp : undefined} disabled={pwTimer > 0 || pwLoading}
              className="w-full text-center text-sm text-blue-600 disabled:opacity-50">
              {pwTimer > 0 ? `Resend OTP in ${pwTimer}s` : 'Resend OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Salon Information content ────────────────────────────────
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

  // Extract lat/lng from GeoJSON [lng, lat]
  const coords = salon?.location?.coordinates;
  const [salonLng, salonLat] = coords?.length === 2 ? coords : [null, null];
  const hasCoords = salonLat !== null && salonLng !== null;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${salonLng - 0.01},${salonLat - 0.01},${salonLng + 0.01},${salonLat + 0.01}&layer=mapnik&marker=${salonLat},${salonLng}`
    : null;
  const mapsLink = hasCoords
    ? `https://www.google.com/maps?q=${salonLat},${salonLng}`
    : null;

  return !editing ? (
    <div className="space-y-2">
      {/* Salon main photo */}
      {salon?.coverPhoto || salon?.photos?.[0] ? (
        <div className="rounded-xl overflow-hidden border border-gray-200 mb-3">
          <img
            src={salon.coverPhoto || salon.photos[0]}
            alt="Salon"
            className="w-full h-40 object-cover"
          />
          <p className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50">
            Main photo · <span className="font-mono break-all">{salon.coverPhoto || salon.photos[0]}</span>
          </p>
        </div>
      ) : null}

      {[
        { label: 'Salon Name',  value: form.name },
        { label: 'Description', value: form.description || '—' },
        { label: 'Category',    value: form.category },
        { label: 'Phone',       value: form.phone },
        { label: 'Email',       value: form.email || '—' },
        { label: 'Address',     value: form.address || '—' },
        { label: 'City',        value: form.city || '—' },
        { label: 'State',       value: form.state || '—' },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-start gap-4 py-2 border-b border-gray-100 last:border-0">
          <span className="w-32 shrink-0 text-sm text-gray-500">{label}</span>
          <span className="text-sm font-medium text-gray-900">{value}</span>
        </div>
      ))}

      {/* Map preview */}
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-gray-400" /> Salon Location on Map
        </p>
        {mapSrc ? (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <iframe
              title="Salon Location"
              src={mapSrc}
              width="100%"
              height="220"
              className="block"
              loading="lazy"
            />
            <div className="px-3 py-2 bg-gray-50 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span className="font-mono">{salonLat?.toFixed(6)}, {salonLng?.toFixed(6)}</span>
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-medium shrink-0"
              >
                Open in Google Maps →
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 h-28 flex items-center justify-center text-sm text-gray-400">
            No coordinates saved for this salon
          </div>
        )}
      </div>

      <button onClick={() => setEditing(true)}
        className="mt-3 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
        <Edit2 className="w-4 h-4" /> Edit Salon Info
      </button>
    </div>
  ) : (
    <form onSubmit={handleSave} className="space-y-4">
      <Input label="Salon Name" name="name" value={form.name} onChange={handleChange}
        placeholder="Your salon name" error={!!errors.name} errorMessage={errors.name} disabled={loading} required />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} disabled={loading}
          placeholder="Describe your salon…"
          className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 resize-none text-sm" />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select name="category" value={form.category} onChange={handleChange} disabled={loading}
          className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 text-sm">
          <option value="barber">Barber Shop</option>
          <option value="hair_salon">Hair Salon</option>
          <option value="spa">Spa</option>
          <option value="massage">Massage</option>
          <option value="multi_service">Multi-Service</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange}
          placeholder="+91 98765 43210" error={!!errors.phone} errorMessage={errors.phone} disabled={loading} required />
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange}
          placeholder="salon@email.com" disabled={loading} />
      </div>
      <Input label="Address" name="address" value={form.address} onChange={handleChange}
        placeholder="Street address" disabled={loading} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="City" name="city" value={form.city} onChange={handleChange}
          placeholder="City" disabled={loading} />
        <Input label="State" name="state" value={form.state} onChange={handleChange}
          placeholder="State" disabled={loading} />
      </div>
      {/* Show current map in edit mode too */}
      {mapSrc && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-gray-400" /> Current Location
          </p>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <iframe title="Salon Location" src={mapSrc} width="100%" height="180" className="block" loading="lazy" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Map pin shows the coordinates saved during salon registration.</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" loading={loading} disabled={loading} fullWidth>
          <Save className="w-4 h-4" /> Save Changes
        </Button>
        <Button type="button" variant="outline" disabled={loading} fullWidth onClick={handleCancel}>
          <X className="w-4 h-4" /> Cancel
        </Button>
      </div>
    </form>
  );
};

// ─── Notifications content ────────────────────────────────────
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

  return (
    <div className="space-y-4">
      {/* Browser push permission banner */}
      <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border-2 ${
        permission === 'granted' ? 'bg-green-50 border-green-200' :
        permission === 'denied'  ? 'bg-red-50 border-red-200' :
                                   'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          {permission === 'granted'
            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            : <BellOff className="w-5 h-5 text-amber-500 shrink-0" />}
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {permission === 'granted' ? 'Push notifications enabled' :
               permission === 'denied'  ? 'Push notifications blocked' : 'Enable push notifications'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {permission === 'granted' ? 'You will be alerted in-browser for new bookings.' :
               permission === 'denied'  ? 'Allow in browser site settings to receive alerts.' :
                                          'Click Allow to get instant browser alerts.'}
            </p>
          </div>
        </div>
        {permission === 'default' && (
          <button onClick={requestPermission}
            className="shrink-0 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition">
            Allow
          </button>
        )}
      </div>

      <div className="space-y-2">
        {ITEMS.map(item => (
          <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </div>
            <Toggle name={item.name} checked={prefs[item.name]} onChange={handleChange} />
          </div>
        ))}
      </div>

      <Button variant="primary" onClick={handleSave} fullWidth>
        <Save className="w-4 h-4" /> Save Preferences
      </Button>
    </div>
  );
};

// ─── App Preferences content ──────────────────────────────────
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
      // Apply theme immediately
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefs.theme === 'dark' || (prefs.theme === 'auto' && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Apply language immediately
      changeLanguage(prefs.language);
      toast.success('App preferences saved!');
    } catch { toast.error('Failed to save'); }
  };

  const SELECT = "w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-sm";
  const FIELDS = [
    { name:'theme',      label:'Theme',       options:[['light','Light'],['dark','Dark'],['auto','Auto (System)']] },
    { name:'language',   label:'Language',    options:[['en','English'],['hi','Hindi']] },
    { name:'timeFormat', label:'Time Format', options:[['12h','12 Hour (AM/PM)'],['24h','24 Hour']] },
    { name:'dateFormat', label:'Date Format', options:[['DD/MM/YYYY','DD/MM/YYYY'],['MM/DD/YYYY','MM/DD/YYYY'],['YYYY-MM-DD','YYYY-MM-DD']] },
  ];

  return (
    <div className="space-y-4">
      {FIELDS.map(({ name, label, options }) => (
        <div key={name} className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <select name={name} value={prefs[name]} onChange={handleChange} className={SELECT}>
            {options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}
          </select>
        </div>
      ))}
      <Button variant="primary" onClick={handleSave} fullWidth>
        <Save className="w-4 h-4" /> Save Preferences
      </Button>
    </div>
  );
};

// ─── Booking Window content ───────────────────────────────────
const BookingWindowContent = ({ salon, updateSalon }) => {
  const current = salon?.advanceBookingDays ?? 1;
  const [days, setDays] = useState(current);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDays(salon?.advanceBookingDays ?? 1);
  }, [salon]);

  const OPTIONS = [
    { value: 0, label: 'Today only', desc: 'Customers can only book for the current day' },
    { value: 1, label: 'Today + Tomorrow', desc: 'Default — customers can book up to 1 day ahead' },
    { value: 3, label: 'Next 3 days', desc: 'Today and 3 days in advance' },
    { value: 7, label: 'Next 7 days', desc: 'Today and 7 days in advance' },
    { value: 14, label: 'Next 14 days', desc: 'Today and 2 weeks in advance' },
    { value: 30, label: 'Next 30 days', desc: 'Today and 30 days in advance' },
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Control how far in advance customers can book appointments at your salon.
      </p>
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
              days === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div>
              <p className={`text-sm font-semibold ${days === opt.value ? 'text-blue-700' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
            {days === opt.value && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
            )}
          </button>
        ))}
      </div>
      <Button variant="primary" onClick={handleSave} loading={loading} disabled={loading} fullWidth>
        <Save className="w-4 h-4" /> Save Booking Window
      </Button>
    </div>
  );
};

// ─── Auto Confirm content ─────────────────────────────────────
const AutoConfirmContent = ({ salon, updateSalon }) => {
  const [enabled, setEnabled] = useState(salon?.autoConfirmBookings !== false);
  const [loading, setLoading] = useState(false);
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        When enabled, cash bookings are confirmed instantly. When disabled, each booking stays <strong>pending</strong> until you manually confirm it from the Bookings page.
      </p>
      <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
        enabled ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
      }`}>
        <div>
          <p className={`text-sm font-semibold ${enabled ? 'text-green-700' : 'text-gray-800'}`}>
            {enabled ? '✅ Auto-Confirm is ON' : '⏸️ Auto-Confirm is OFF'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled
              ? 'New bookings are confirmed automatically.'
              : 'You must manually confirm each new booking.'}
          </p>
        </div>
        <Toggle name="autoConfirm" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
      </div>
      <Button variant="primary" onClick={handleSave} loading={loading} disabled={loading} fullWidth>
        <Save className="w-4 h-4" /> Save Setting
      </Button>
    </div>
  );
};

// ─── Booking Mode content ─────────────────────────────────────
const BookingModeContent = ({ salon, updateSalon }) => {
  const [mode, setMode] = useState(salon?.bookingMode || 'flexible');
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && salon) {
      setMode(salon.bookingMode || 'flexible');
      initialized.current = true;
    }
  }, [salon]);

  const OPTIONS = [
    {
      value: 'flexible',
      label: 'Flexible (Customer Picks)',
      desc: 'Customer chooses any available time slot from all open slots.',
      icon: '🗓️',
    },
    {
      value: 'sequential',
      label: 'Sequential (Next in Line)',
      desc: 'Bookings are assigned one after another. Customer gets the next open slot automatically — no gap between appointments.',
      icon: '⏩',
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Choose how appointment slots are assigned to customers.
      </p>
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
              mode === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl shrink-0 mt-0.5">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${mode === opt.value ? 'text-blue-700' : 'text-gray-800'}`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
            {mode === opt.value && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>
      <Button variant="primary" onClick={handleSave} loading={loading} disabled={loading} fullWidth>
        <Save className="w-4 h-4" /> Save Booking Mode
      </Button>
    </div>
  );
};

// ─── Salon Photos content ─────────────────────────────────────
const SalonPhotosContent = ({ salon, fetchSalon }) => {
  const [photos, setPhotos] = useState(salon?.photos || []);
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
    <div className="space-y-4">
      {/* Upload button */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
      >
        {uploading
          ? <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          : <ImagePlus className="w-7 h-7 text-gray-400" />}
        <p className="text-sm font-medium text-gray-600">
          {uploading ? 'Uploading…' : 'Click to upload salon photos'}
        </p>
        <p className="text-xs text-gray-400">JPG, PNG, WebP · Up to 10 photos total</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Photo grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt={`Salon photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(url)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 py-4">No photos uploaded yet</p>
      )}

      <p className="text-xs text-gray-400 text-center">{photos.length}/10 photos · Hover a photo to delete it</p>
    </div>
  );
};

// ─── Closed Dates / Holidays content ─────────────────────────
const ClosedDatesContent = ({ salon }) => {
  const [holidays, setHolidays] = useState([]);
  const [newDate, setNewDate]   = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Compute today's local date string
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  useEffect(() => {
    setHolidays(salon?.workingHours?.holidays || []);
  }, [salon]);

  const handleAdd = async () => {
    if (!newDate) { toast.error('Please select a date'); return; }
    setAdding(true);
    try {
      const res = await api.post('/owner/salon/holidays', { date: newDate, reason: newReason.trim() });
      setHolidays(res.data.data.holidays);
      setNewDate('');
      setNewReason('');
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Mark specific dates as closed (e.g. holidays, events). Customers won't be able to book on these dates.
      </p>

      {/* Add new date */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Add Closed Date</p>
        <input
          type="date"
          min={todayStr}
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={newReason}
          onChange={e => setNewReason(e.target.value)}
          placeholder="Reason (e.g. Diwali, Owner holiday)"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <Button variant="primary" onClick={handleAdd} loading={adding} disabled={adding} fullWidth>
          <Plus className="w-4 h-4" /> Add Closed Date
        </Button>
      </div>

      {/* Existing holidays list */}
      {holidays.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-3">No closed dates set.</p>
      ) : (
        <div className="space-y-2">
          {[...holidays].sort((a, b) => new Date(a.date) - new Date(b.date)).map((h) => {
            const dateStr = new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={h._id} className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-red-800">{dateStr}</p>
                  {h.reason && <p className="text-xs text-red-500 mt-0.5">{h.reason}</p>}
                </div>
                <button
                  onClick={() => handleDelete(h._id)}
                  disabled={deleting === h._id}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition disabled:opacity-50"
                >
                  {deleting === h._id ? '…' : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Referral Code content ────────────────────────────────────
const ReferralContent = () => {
  const { getToken } = useAuth();
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [applied, setApplied]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://mysalonbookings.onrender.com/api/v1'}/owner/referral/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data?.applied) setApplied(data.data);
      } catch {}
      finally { setChecking(false); }
    })();
  }, []);

  const handleApply = async () => {
    if (!code.trim()) { toast.error('Please enter a referral code'); return; }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://mysalonbookings.onrender.com/api/v1'}/owner/referral/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success(data.message);
      setApplied({ code: code.trim().toUpperCase(), appliedAt: new Date().toISOString() });
      setCode('');
    } catch (err) {
      toast.error(err.message || 'Could not apply referral code.');
    } finally { setLoading(false); }
  };

  if (checking) return <div className="py-6 flex justify-center"><div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (applied) return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
      <span className="text-2xl">✅</span>
      <div>
        <p className="font-bold text-green-800 text-sm">Referral code applied!</p>
        <p className="text-green-700 text-xs mt-0.5">Code: <span className="font-mono font-bold">{applied.code}</span></p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
        <span className="text-2xl">🎁</span>
        <div>
          <p className="font-bold text-amber-800 text-sm">Got a referral code?</p>
          <p className="text-amber-700 text-xs mt-1">Enter the code shared by a MySalonBookings user. They'll earn a reward when you qualify!</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Referral Code</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. MSB123456"
          maxLength={9}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <button
        onClick={handleApply}
        disabled={loading}
        className="btn-primary text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🎁 Apply Referral Code'}
      </button>
      <button
        onClick={() => alert('Terms & Conditions:\n\n• Enter the referral code shared by a MySalonBookings user.\n\n• You can only apply one referral code.\n\n• The referring user earns ₹50 after your salon actively uses the app for 30 consecutive days.\n\n• Codes cannot be transferred or reused.')}
        className="text-xs text-slate-400 underline text-center"
      >
        View Terms & Conditions
      </button>
    </div>
  );
};


// ─── Privacy & Security content ───────────────────────────────
const PrivacyContent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword]     = useState('');
  const [deleting, setDeleting]     = useState(false);
  const [step, setStep]             = useState(1); // 1=info, 2=confirm, 3=password

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

  return (
    <div className="space-y-3">
      {[
        { icon:'🔒', title:'Data Encryption',  desc:'All your data is encrypted end-to-end and stored securely.' },
        { icon:'🚫', title:'No Data Sharing',  desc:'We never share your information with third parties.' },
        { icon:'🛡️', title:'Security Updates', desc:'Regular patches and security updates are applied automatically.' },
        { icon:'🔑', title:'Token Security',   desc:'Auth tokens expire automatically and refresh securely.' },
      ].map(({ icon, title, desc }) => (
        <div key={title} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
          <span className="text-2xl shrink-0">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
        </div>
      ))}

      {/* ── Delete Account ── */}
      <div className="border-t border-gray-100 pt-3">
        {!showDelete ? (
          <button
            type="button"
            onClick={() => { setShowDelete(true); setStep(1); }}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🗑️</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-red-700">Delete Account</p>
                <p className="text-xs text-red-400">Permanently remove your account and all data</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-red-400 shrink-0" />
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-red-700">Delete Account Forever</p>
              <button type="button" onClick={() => { setShowDelete(false); setStep(1); setPassword(''); }}
                className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            {step === 1 && (
              <>
                <div className="space-y-2 text-sm text-red-700">
                  <p className="font-medium">This will permanently delete:</p>
                  <ul className="list-disc pl-5 space-y-1 text-red-600 text-xs">
                    <li>Your owner account and profile</li>
                    <li>Your salon listing and all its services</li>
                    <li>All customer reviews on your salon</li>
                    <li>All booking history</li>
                  </ul>
                  <p className="text-xs text-red-500 font-semibold pt-1">⚠️ This action cannot be undone.</p>
                </div>
                <button type="button" onClick={() => setStep(2)}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition">
                  I understand, continue
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-red-700">Enter your password to confirm deletion:</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your current password"
                  className="w-full px-3 py-2 border-2 border-red-300 focus:border-red-500 focus:outline-none rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                    Back
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2">
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

// ─── About Content ────────────────────────────────────────────
const AboutContent = () => (
  <div className="space-y-4">
    <div className="space-y-1 text-sm">
      {[
        { label: 'App Name',    value: 'SmartSalon' },
        { label: 'Version',     value: '1.0.0' },
        { label: 'Platform',    value: 'Web (Owner Panel)' },
        { label: 'Support',     value: 'support@smartsalon.in' },
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
          <span className="text-gray-500">{label}</span>
          <span className="font-medium text-gray-800">{value}</span>
        </div>
      ))}
    </div>
    <div className="flex gap-4 text-xs text-blue-600 font-medium pt-1">
      <button type="button" className="hover:underline">Privacy Policy</button>
      <button type="button" className="hover:underline">Terms of Service</button>
      <button type="button" className="hover:underline">Help Center</button>
    </div>
  </div>
);

// ─── Main Settings Page ───────────────────────────────────────
const SettingsPage = () => {
  const { salon, updateSalon, fetchSalon } = useSalon();
  const [activeId, setActiveId] = useState(null);

  const toggle = (id) => setActiveId(prev => prev === id ? null : id);

  const SECTIONS = [
    {
      id: 'profile',
      icon: User,
      iconBg: 'bg-blue-100 text-blue-600',
      title: 'My Profile',
      subtitle: 'Name, email and account details',
      content: <ProfileContent />,
    },
    {
      id: 'salon',
      icon: Globe,
      iconBg: 'bg-green-100 text-green-600',
      title: 'Salon Information',
      subtitle: 'Salon name, category and contact',
      content: <SalonContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'notifications',
      icon: Bell,
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Notifications',
      subtitle: 'Email, SMS and push notification preferences',
      content: <NotificationsContent />,
    },
    {
      id: 'app',
      icon: Settings,
      iconBg: 'bg-indigo-100 text-indigo-600',
      title: 'App Preferences',
      subtitle: 'Theme, language and display settings',
      content: <AppContent />,
    },
    {
      id: 'booking-window',
      icon: Calendar,
      iconBg: 'bg-purple-100 text-purple-600',
      title: 'Booking Window',
      subtitle: 'How far in advance customers can book',
      content: <BookingWindowContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'booking-mode',
      icon: GitBranch,
      iconBg: 'bg-teal-100 text-teal-600',
      title: 'Booking Mode',
      subtitle: 'Sequential (next-in-line) or Flexible (customer picks slot)',
      content: <BookingModeContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'auto-confirm',
      icon: CheckCircle2,
      iconBg: 'bg-green-100 text-green-600',
      title: 'Auto-Confirm Bookings',
      subtitle: 'Confirm bookings instantly or review them manually',
      content: <AutoConfirmContent salon={salon} updateSalon={updateSalon} />,
    },
    {
      id: 'photos',
      icon: Camera,
      iconBg: 'bg-pink-100 text-pink-600',
      title: 'Salon Photos',
      subtitle: 'Upload photos customers will see on your salon page',
      content: <SalonPhotosContent salon={salon} fetchSalon={fetchSalon} />,
    },
    {
      id: 'closed-dates',
      icon: CalendarX,
      iconBg: 'bg-red-100 text-red-600',
      title: 'Closed Dates / Holidays',
      subtitle: 'Mark specific dates when your salon is closed',
      content: <ClosedDatesContent salon={salon} />,
    },
    {
      id: 'referral',
      icon: Gift,
      iconBg: 'bg-amber-100 text-amber-600',
      title: 'Referral Code',
      subtitle: 'Apply a code from a MySalonBookings user',
      content: <ReferralContent />,
    },
    {
      id: 'privacy',
      icon: Lock,
      iconBg: 'bg-red-100 text-red-600',
      title: 'Privacy & Security',
      subtitle: 'Data protection and security information',
      content: <PrivacyContent />,
    },
    {
      id: 'about',
      icon: Settings,
      iconBg: 'bg-slate-100 text-slate-600',
      title: 'About',
      subtitle: 'App info, support and legal',
      content: <AboutContent />,
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-4">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Tap a section to manage your preferences</p>
        </div>

        {SECTIONS.map(({ id, icon, iconBg, title, subtitle, content }) => (
          <Accordion
            key={id}
            id={id}
            activeId={activeId}
            onToggle={toggle}
            icon={icon}
            iconBg={iconBg}
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
