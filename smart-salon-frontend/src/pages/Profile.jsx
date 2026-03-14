import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [pwMode, setPwMode]       = useState(false);
  const [pwSaving, setPwSaving]   = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const [form, setForm] = useState({ name: "", email: "" });
  const [pw, setPw]     = useState({ current: "", next: "", confirm: "" });

  // ── load profile ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
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
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 3000);
  };

  // ── save profile ──────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { flash("Name is required", true); return; }
    setSaving(true);
    try {
      const res = await API.put("/customer/auth/me", { name: form.name.trim(), email: form.email.trim() });
      const updated = res.data?.data || res.data;
      setUser(updated);
      setEditing(false);
      flash("Profile updated!");
    } catch (err) {
      flash(err.response?.data?.message || "Failed to update profile.", true);
    } finally {
      setSaving(false);
    }
  };

  // ── change password ───────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pw.current)           { flash("Current password required", true); return; }
    if (pw.next.length < 6)    { flash("New password must be at least 6 characters", true); return; }
    if (pw.next !== pw.confirm){ flash("Passwords do not match", true); return; }
    setPwSaving(true);
    try {
      await API.post("/customer/auth/change-password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPwMode(false);
      setPw({ current: "", next: "", confirm: "" });
      flash("Password changed successfully!");
    } catch (err) {
      flash(err.response?.data?.message || "Failed to change password.", true);
    } finally {
      setPwSaving(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-xl mx-auto space-y-5">

          {/* ── Page title ── */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your personal account details</p>
          </div>

          {/* ── Alerts ── */}
          {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading profile…</p>
            </div>
          ) : (
            <>
              {/* ── Profile card ── */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{user?.name || "—"}</h2>
                    <p className="text-sm text-slate-400">Member since {memberSince}</p>
                  </div>
                </div>

                {editing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Your name"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        required
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        disabled={saving}
                      />
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="submit" disabled={saving}
                        className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                      <button type="button" onClick={() => { setEditing(false); setForm({ name: user?.name || "", email: user?.email || "" }); }}
                        className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="space-y-3 mb-5">
                      {[
                        { icon: "📛", label: "Name",   value: user?.name  || "—" },
                        { icon: "📧", label: "Email",  value: user?.email || "—" },
                        { icon: "📱", label: "Phone",  value: user?.phone || "—" },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <span className="text-lg">{icon}</span>
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

              {/* ── Change password ── */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">Password</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Keep your account secure</p>
                  </div>
                  {!pwMode && (
                    <button onClick={() => setPwMode(true)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition">
                      Change
                    </button>
                  )}
                </div>

                {pwMode && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {[
                      { label: "Current Password", key: "current", placeholder: "Enter current password" },
                      { label: "New Password",      key: "next",    placeholder: "Min 6 characters" },
                      { label: "Confirm Password",  key: "confirm", placeholder: "Repeat new password" },
                    ].map(({ label, key, placeholder }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                        <input
                          type="password"
                          value={pw[key]}
                          onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          required
                          disabled={pwSaving}
                        />
                      </div>
                    ))}
                    <div className="flex gap-3 pt-1">
                      <button type="submit" disabled={pwSaving}
                        className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-60">
                        {pwSaving ? "Updating…" : "Update Password"}
                      </button>
                      <button type="button" onClick={() => { setPwMode(false); setPw({ current: "", next: "", confirm: "" }); }}
                        className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {!pwMode && (
                  <p className="text-sm text-slate-400">••••••••</p>
                )}
              </div>

              {/* ── Account info ── */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Account Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500">Account ID</span>
                    <span className="font-medium text-slate-700 font-mono text-xs">
                      {user?._id ? String(user._id).slice(-8).toUpperCase() : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-500">Member Since</span>
                    <span className="font-medium text-slate-700">{memberSince}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Account Type</span>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">Customer</span>
                  </div>
                </div>
              </div>

              {/* ── Logout ── */}
              <button
                onClick={() => { localStorage.removeItem("token"); navigate("/"); }}
                className="w-full py-3 text-sm font-semibold text-red-500 border border-red-100 rounded-2xl hover:bg-red-50 transition"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Profile;
