import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Info, Mail, Phone, MapPin, Building, ChevronDown, ChevronUp, Camera, QrCode, Sparkles } from 'lucide-react';
import { SALON_TYPES } from '../../constants/salonCategories';
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
  const { user, updateProfile, changePassword } = useAuth();
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

  // ── Password form state ──
  const [pw, setPw]           = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);

  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPw(p => ({ ...p, [name]: value }));
    if (pwErrors[name]) setPwErrors(p => ({ ...p, [name]: '' }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.current)             errs.current = 'Current password required';
    if (!pw.next)                errs.next    = 'New password required';
    else if (pw.next.length < 8) errs.next    = 'Min 8 characters';
    if (pw.next !== pw.confirm)  errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await changePassword(pw.current, pw.next);
      toast.success('Password changed!');
      setPw({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-4">
        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Tap a section to view or edit your details</p>
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
              const st = salon?.salonType || user?.salonType;
              const typeDef = SALON_TYPES.find(t => t.key === st);
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
          const st = salon?.salonType || user?.salonType;
          const typeDef = SALON_TYPES.find(t => t.key === st);
          if (!typeDef) return null;
          return (
            <div
              className="rounded-xl border-2 p-4 flex items-center gap-4"
              style={{ borderColor: `${typeDef.color}40`, background: `${typeDef.color}08` }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: `${typeDef.color}18` }}
              >
                {typeDef.icon}
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
                salon && { icon: Building, color: 'text-purple-500', label: 'Salon', value: salon.name },
                (() => { const st = salon?.salonType || user?.salonType; const td = SALON_TYPES.find(t => t.key === st); return td ? { icon: Sparkles, color: 'text-indigo-500', label: 'Business Type', value: `${td.icon} ${td.label}` } : null; })(),
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
                onChange={handleProfileChange} placeholder="+91 98765 43210"
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
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Account Status</p>
                <p className="text-sm font-medium text-gray-900">Active & Verified</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-0.5">Login Method</p>
              <p className="text-sm font-medium text-gray-900">Phone Number + Password</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-0.5">Last Password Changed</p>
              <p className="text-sm font-medium text-gray-900">
                {user?.lastPasswordChange
                  ? new Date(user.lastPasswordChange).toLocaleDateString('en-IN')
                  : 'Never'}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm font-semibold text-gray-800 mb-3">Change Password</p>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <Input label="Current Password" name="current" type="password" value={pw.current}
                  onChange={handlePwChange} placeholder="Current password"
                  error={!!pwErrors.current} errorMessage={pwErrors.current} disabled={pwLoading} required />
                <Input label="New Password" name="next" type="password" value={pw.next}
                  onChange={handlePwChange} placeholder="Min 8 characters"
                  error={!!pwErrors.next} errorMessage={pwErrors.next} disabled={pwLoading} required />
                <Input label="Confirm New Password" name="confirm" type="password" value={pw.confirm}
                  onChange={handlePwChange} placeholder="Confirm new password"
                  error={!!pwErrors.confirm} errorMessage={pwErrors.confirm} disabled={pwLoading} required />
                <Button type="submit" variant="primary" loading={pwLoading} disabled={pwLoading} fullWidth>
                  Update Password
                </Button>
              </form>
            </div>
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
              { label: 'Account Type',  value: 'Salon Owner' },
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
