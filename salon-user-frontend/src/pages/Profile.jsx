import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken, clearCustomerAuth } from "../utils/auth";

// ── App Preferences helpers ───────────────────────────────────────
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem('appPrefs') || '{}'); } catch { return {}; }
};
const applyTheme = (theme) => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (theme === 'dark' || (theme === 'auto' && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// ── App Preferences Card ─────────────────────────────────────────
function AppPreferences() {
  const [open, setOpen]   = useState(false);
  const [prefs, setPrefs] = useState(() => {
    const s = loadPrefs();
    return {
      theme:      s.theme      || 'light',
      language:   s.language   || 'en',
      timeFormat: s.timeFormat || '12h',
      dateFormat: s.dateFormat || 'DD/MM/YYYY',
    };
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) =>
    setPrefs((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = () => {
    localStorage.setItem('appPrefs', JSON.stringify(prefs));
    applyTheme(prefs.theme);
    document.documentElement.lang = prefs.language;
    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 2000);
  };

  const SELECT = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800";

  const FIELDS = [
    { name: 'theme',      label: 'Theme',       icon: '🎨', options: [['light','Light'],['dark','Dark'],['auto','Auto (System)']] },
    { name: 'language',   label: 'Language',    icon: '🌐', options: [['en','English'],['hi','हिंदी (Hindi)']] },
    { name: 'timeFormat', label: 'Time Format', icon: '🕐', options: [['12h','12 Hour (AM/PM)'],['24h','24 Hour']] },
    { name: 'dateFormat', label: 'Date Format', icon: '📅', options: [['DD/MM/YYYY','DD/MM/YYYY'],['MM/DD/YYYY','MM/DD/YYYY'],['YYYY-MM-DD','YYYY-MM-DD']] },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div>
            <p className="font-bold text-slate-900 text-sm">App Preferences</p>
            <p className="text-xs text-slate-400 mt-0.5">Theme, language and display settings</p>
          </div>
        </div>
        <span className={`text-slate-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ›
        </span>
      </button>

      {/* Collapsible panel */}
      {open && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4 fade-in">
          {FIELDS.map(({ name, label, icon, options }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {icon} {label}
              </label>
              <select name={name} value={prefs[name]} onChange={handleChange} className={SELECT}>
                {options.map(([val, text]) => (
                  <option key={val} value={val}>{text}</option>
                ))}
              </select>
            </div>
          ))}

          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
              saved ? 'bg-green-500 text-white' : 'btn-primary'
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Preferences'}
          </button>
        </div>
      )}
    </div>
  );
}

function Profile() {
  const navigate = useNavigate();

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [pwStep, setPwStep]       = useState(1); // 1=send otp, 2=verify+reset
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwTimer, setPwTimer]     = useState(0);
  const [pwShowPw, setPwShowPw]   = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [form, setForm] = useState({ name: "", email: "" });
  const [pw, setPw]     = useState({ otp: "", next: "", confirm: "" });
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (pwTimer <= 0) return;
    const id = setInterval(() => setPwTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [pwTimer]);

  // ── load profile ─────────────────────────────────────────────
  useEffect(() => {
    if (!getCustomerToken()) { navigate("/login"); return; }
    API.get("/customer/auth/me")
      .then((res) => {
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

  // ── save profile ──────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { flash("Name is required", true); return; }
    setSaving(true);
    try {
      const res     = await API.put("/customer/auth/me", { name: form.name.trim(), email: form.email.trim() });
      const updated = res.data?.data || res.data;
      setUser(updated);
      setEditing(false);
      flash("Profile updated successfully!");
    } catch (err) {
      flash(err.message || "Failed to update profile.", true);
    } finally {
      setSaving(false);
    }
  };

  // ── change password via OTP ───────────────────────────────────
  const norm = (p) => { let c = (p||"").replace(/\D/g,""); if(c.length===10) c="91"+c; if(!c.startsWith("+")) c="+"+c; return c; };

  const handlePwSendOtp = async (e) => {
    e?.preventDefault();
    if (!user?.phone) { flash("No phone number linked to your account", true); return; }
    setPwSaving(true);
    try {
      await API.post("/customer/auth/forgot-password/send-otp", { phone: norm(user.phone) });
      setPwStep(2); setPwTimer(60);
      flash("OTP sent to your registered phone!");
    } catch (err) {
      flash(err.response?.data?.message || "Failed to send OTP", true);
    } finally { setPwSaving(false); }
  };

  const handlePwReset = async (e) => {
    e.preventDefault();
    if (!pw.otp.trim())         { flash("OTP is required", true); return; }
    if (pw.next.length < 6)     { flash("New password must be at least 6 characters", true); return; }
    if (pw.next !== pw.confirm) { flash("Passwords do not match", true); return; }
    setPwSaving(true);
    try {
      await API.post("/customer/auth/forgot-password/reset", { phone: norm(user.phone), otp: pw.otp, newPassword: pw.next });
      setPwStep(1); setPw({ otp: "", next: "", confirm: "" });
      flash("Password changed successfully!");
    } catch (err) {
      flash(err.response?.data?.message || "Failed to change password.", true);
    } finally { setPwSaving(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await API.post("/customer/auth/upload-photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(prev => ({ ...prev, profilePhoto: res.data.data.profilePhoto }));
      flash("Profile photo updated!");
    } catch {
      flash("Failed to upload photo.", true);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleLogout = () => {
    clearCustomerAuth();
    navigate("/");
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and manage your account details</p>
        </div>

        {/* ── Alerts ── */}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>}

        {/* ── Loading ── */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading your profile…</p>
          </div>
        ) : (
          <>
            {/* ── Profile card (accordion) ── */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button type="button" onClick={() => setProfileOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {user?.profilePhoto ? (
                      <img src={user.profilePhoto} alt="Profile" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-base font-bold shadow-sm">
                        {user?.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                    )}
                    <label className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition">
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
                      <span className="text-white text-xs leading-none">{photoUploading ? "…" : "+"}</span>
                    </label>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{user?.name || "My Profile"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Member since {memberSince}</p>
                  </div>
                </div>
                <span className={`text-slate-400 text-lg transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}>›</span>
              </button>

              {profileOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 fade-in">
                  {editing ? (
                    <form onSubmit={handleSave} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input type="text" value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Your full name" className="input-field" required disabled={saving} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" value={form.email}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="your@email.com" className="input-field" disabled={saving} />
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button type="submit" disabled={saving}
                          className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                          {saving ? "Saving…" : "Save Changes"}
                        </button>
                        <button type="button"
                          onClick={() => { setEditing(false); setForm({ name: user?.name || "", email: user?.email || "" }); }}
                          className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4 mt-2">
                        {[
                          { icon: "👤", label: "Name",  value: user?.name  || "—" },
                          { icon: "📧", label: "Email", value: user?.email || "—" },
                          { icon: "📱", label: "Phone", value: user?.phone || "—" },
                        ].map(({ icon, label, value }) => (
                          <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="text-lg w-7 text-center shrink-0">{icon}</span>
                            <div>
                              <p className="text-xs text-slate-400">{label}</p>
                              <p className="text-sm font-medium text-slate-800">{value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setEditing(true)}
                        className="w-full py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition">
                        ✏️ Edit Profile
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Change password card ── */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="font-bold text-slate-900">Password</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Keep your account secure</p>
                </div>
                {pwStep === 1 && (
                  <button onClick={() => setPwStep(0)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition">
                    Change
                  </button>
                )}
              </div>

              {pwStep === 1 && <p className="text-sm text-slate-300 mt-3">••••••••</p>}

              {pwStep === 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-slate-500">We'll send an OTP to your registered phone number.</p>
                  <div className="flex gap-3">
                    <button onClick={handlePwSendOtp} disabled={pwSaving}
                      className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                      {pwSaving ? "Sending…" : "Send OTP"}
                    </button>
                    <button type="button" onClick={() => setPwStep(1)}
                      className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {pwStep === 2 && (
                <form onSubmit={handlePwReset} className="space-y-3 mt-4">
                  <p className="text-sm text-slate-500">OTP sent to {user?.phone}</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">OTP</label>
                    <input type="text" value={pw.otp} placeholder="Enter 6-digit OTP" maxLength={6}
                      onChange={(e) => setPw((p) => ({ ...p, otp: e.target.value }))}
                      className="input-field" required disabled={pwSaving} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <input type={pwShowPw ? "text" : "password"} value={pw.next} placeholder="At least 6 characters"
                        onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                        className="input-field pr-11" required disabled={pwSaving} />
                      <button type="button" onClick={() => setPwShowPw(!pwShowPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                        {pwShowPw ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                    <input type="password" value={pw.confirm} placeholder="Repeat new password"
                      onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                      className="input-field" required disabled={pwSaving} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={pwSaving}
                      className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                      {pwSaving ? "Updating…" : "Update Password"}
                    </button>
                    <button type="button"
                      onClick={() => { setPwStep(1); setPw({ otp: "", next: "", confirm: "" }); }}
                      className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                      Cancel
                    </button>
                  </div>
                  <button type="button" onClick={pwTimer === 0 ? handlePwSendOtp : undefined}
                    disabled={pwTimer > 0 || pwSaving}
                    className="w-full text-center text-sm text-indigo-600 disabled:opacity-50">
                    {pwTimer > 0 ? `Resend OTP in ${pwTimer}s` : "Resend OTP"}
                  </button>
                </form>
              )}
            </div>

            {/* ── Account info card (accordion) ── */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <button type="button" onClick={() => setAccountOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition text-left">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🪪</span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Account Info</p>
                    <p className="text-xs text-slate-400 mt-0.5">ID, membership and account type</p>
                  </div>
                </div>
                <span className={`text-slate-400 text-lg transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}>›</span>
              </button>

              {accountOpen && (
                <div className="px-6 pb-5 pt-2 border-t border-slate-100 fade-in">
                  <div className="space-y-1 text-sm mt-2">
                    {[
                      { label: "Account ID",   value: user?._id ? String(user._id).slice(-8).toUpperCase() : "—" },
                      { label: "Member Since", value: memberSince },
                      { label: "Account Type", value: "Customer" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between py-2.5 border-b border-slate-50 last:border-0">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium text-slate-700">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── App Preferences ── */}
            <AppPreferences />

            {/* ── Sign out ── */}
            <button onClick={handleLogout}
              className="w-full py-3 text-sm font-semibold text-red-500 border border-red-100 rounded-2xl hover:bg-red-50 transition">
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
