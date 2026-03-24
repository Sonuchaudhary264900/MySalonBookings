import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { getCustomerToken } from "../utils/auth";

function InfoRow({ icon, label, value, last = false }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 ${!last ? 'border-b border-slate-50' : ''}`}>
      <span className="text-slate-400 w-5 shrink-0">{icon}</span>
      <span className="text-sm text-slate-500 flex-1">{label}</span>
      <span className="text-sm font-semibold text-slate-800 max-w-[55%] text-right truncate">{value || '—'}</span>
    </div>
  );
}

const I = {
  person: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
  phone:  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
  mail:   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  edit:   <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  back:   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>,
  personCircle: <svg className="w-[62px] h-[62px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  shield: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  lock:   <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  info:   <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  code:   <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>,
  globe:  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  logout: <svg className="w-[20px] h-[20px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
};

function SectionHeader({ icon, title, expanded, onToggle, id }) {
  return (
    <button type="button" onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition">
      <div className="flex items-center gap-3">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-slate-100 flex items-center justify-center text-indigo-600 shrink-0">
          {icon}
        </div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <svg className={`w-[18px] h-[18px] text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export default function MyProfile() {
  const navigate = useNavigate();

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ text: '', err: false });

  const [expandedSection, setExpandedSection] = useState(null);
  const toggleSection = (name) => setExpandedSection(prev => prev === name ? null : name);

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', gender: '' });

  useEffect(() => {
    if (!getCustomerToken()) { navigate('/login'); return; }
    API.get('/customer/auth/me')
      .then(res => {
        const data = res.data?.data || res.data;
        setUser(data);
        setForm({ name: data.name || '', email: data.email || '', gender: data.gender || '' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flash = (text, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg({ text: '', err: false }), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) { flash('Name must be at least 2 characters', true); return; }
    setSaving(true);
    try {
      const res = await API.put('/customer/auth/me', { name: form.name.trim(), email: form.email.trim(), gender: form.gender });
      setUser(res.data?.data || res.data);
      setEditing(false);
      flash('Profile updated!');
    } catch (err) { flash(err.message || 'Failed to update.', true); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-[34px] h-[34px] rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition shrink-0">
            {I.back}
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">My Profile</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-3 py-3 space-y-2.5">

        {msg.text && (
          <div className={`text-sm rounded-xl px-4 py-3 border ${msg.err ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          </div>
        ) : (
          <>
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm">
              <div className="text-indigo-600 shrink-0">{I.personCircle}</div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-sm text-slate-400 mt-0.5">{user?.phone || ''}</p>
                {user?.email && <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>}
              </div>
            </div>

            {/* Profile Information accordion */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <SectionHeader icon={I.person} title="Profile Information" id="profile"
                expanded={expandedSection === 'profile'} onToggle={(id) => { toggleSection(id); if (expandedSection !== 'profile') setEditing(false); }} />
              {expandedSection === 'profile' && (
                <div className="border-t border-slate-100">
                  {!editing ? (
                    <>
                      <InfoRow icon={I.person} label="Full Name" value={user?.name} />
                      <InfoRow icon={I.phone}  label="Phone"     value={user?.phone} />
                      <InfoRow icon={I.mail}   label="Email"     value={user?.email} />
                      <InfoRow icon={I.person} label="Gender"    value={user?.gender ? (user.gender === 'male' ? '👨 Male' : '👩 Female') : null} last />
                      <button onClick={() => { setForm({ name: user?.name || '', email: user?.email || '', gender: user?.gender || '' }); setEditing(true); }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition">
                        {I.edit} Edit Profile
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleSave} className="p-3 space-y-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                        <div className="flex items-center border border-slate-200 rounded-[10px] px-3 h-[42px] focus-within:border-indigo-400 transition">
                          <span className="text-slate-400 mr-2">{I.person}</span>
                          <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Your name" required disabled={saving}
                            className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                        <div className="flex items-center border border-slate-200 rounded-[10px] px-3 h-[42px] focus-within:border-indigo-400 transition">
                          <span className="text-slate-400 mr-2">{I.mail}</span>
                          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="your@email.com" disabled={saving}
                            className="flex-1 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
                        <div className="flex gap-2">
                          {[{ value: 'male', label: '👨 Male' }, { value: 'female', label: '👩 Female' }].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={saving}
                              onClick={() => setForm(p => ({ ...p, gender: opt.value }))}
                              className={`flex-1 py-2 rounded-[10px] border text-sm font-semibold transition ${
                                form.gender === opt.value
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={() => setEditing(false)} disabled={saving}
                          className="flex-1 h-10 rounded-[10px] border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition">
                          Cancel
                        </button>
                        <button type="submit" disabled={saving}
                          className="flex-[2] h-10 rounded-[10px] bg-indigo-600 hover:bg-indigo-700 transition text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center">
                          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* About accordion */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <SectionHeader icon={I.info} title="About" id="about"
                expanded={expandedSection === 'about'} onToggle={toggleSection} />
              {expandedSection === 'about' && (
                <div className="border-t border-slate-100">
                  <div className="border-b border-slate-50 flex items-center gap-2.5 px-4 py-3">
                    <span className="text-slate-400">{I.code}</span>
                    <span className="flex-1 text-sm text-slate-800">App Version</span>
                    <span className="text-sm font-semibold text-slate-400">v1.0.0</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <span className="text-slate-400">{I.globe}</span>
                    <span className="flex-1 text-sm text-slate-800">Website</span>
                    <span className="text-sm font-semibold text-slate-400">mysalonbookings.com</span>
                  </div>
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
