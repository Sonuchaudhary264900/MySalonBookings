import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizePhone = (p) => {
    let c = p.replace(/\D/g, "");
    if (c.length === 10) c = "91" + c;
    if (!c.startsWith("+")) c = "+" + c;
    return c;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/customer/auth/login", { phone: normalizePhone(phone), password });
      const token = res.data.data?.token || res.data.token;
      if (token) localStorage.setItem("customerToken", token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <div className="text-6xl mb-6">✂</div>
          <h2 className="text-3xl font-extrabold mb-4">Welcome Back!</h2>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Sign in to manage your bookings, explore salons, and enjoy a seamless grooming experience.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            {["📅 Track bookings", "❤️ Saved salons", "⭐ Write reviews", "🔔 Get reminders"].map((f) => (
              <div key={f} className="bg-white/15 rounded-xl px-4 py-3 text-sm font-medium">{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white">✂</span>
            </div>
            <span className="text-xl font-bold text-gradient">SmartSalon</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h1>
          <p className="text-muted mb-7">Enter your credentials to continue.</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-60 mt-2"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
