import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../config/firebase";
import API from "../services/api";

const STEPS = [
  { num: 1, label: "Your Info" },
  { num: 2, label: "Verify OTP" },
  { num: 3, label: "Password" },
];

function Register() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from;
  const bookingState = location.state?.bookingState;

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  const recaptchaRef = useRef(null);
  const confirmationRef = useRef(null);
  const firebaseTokenRef = useRef("");

  // OTP countdown
  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  const normalizePhone = (p) => {
    const c = p.replace(/\D/g, "");
    if (c.length === 10) return "+91" + c;
    if (c.length === 12 && c.startsWith("91")) return "+" + c;
    return "+" + c;
  };

  const validatePhone = (p) => /^\+91[6-9]\d{9}$/.test(normalizePhone(p));

  const getRecaptchaVerifier = () => {
    try { recaptchaRef.current?.clear(); } catch {}
    recaptchaRef.current = null;

    // Remove old container entirely — reCAPTCHA tracks elements internally
    document.getElementById("recaptcha-container")?.remove();
    const container = document.createElement("div");
    container.id = "recaptcha-container";
    document.body.appendChild(container);

    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    return recaptchaRef.current;
  };

  // Step 1 → send OTP via Firebase
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !gender) {
      setError("Please fill all required fields.");
      return;
    }
    if (!validatePhone(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, normalizePhone(phone), verifier);
      confirmationRef.current = confirmation;
      setStep(2);
      setOtpTimer(60);
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
      if (recaptchaRef.current) { recaptchaRef.current.clear(); recaptchaRef.current = null; }
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → verify OTP via Firebase
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.length < 6) { setError("Enter the 6-digit OTP."); return; }
    setError("");
    setLoading(true);
    try {
      const result = await confirmationRef.current.confirm(otp);
      firebaseTokenRef.current = await result.user.getIdToken();
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → register with backend using Firebase token
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(password)) {
      setError("Password must be at least 6 characters with letters and numbers.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/customer/auth/firebase-register", {
        firebaseToken: firebaseTokenRef.current,
        name,
        password,
        gender,
      });
      const token = res.data.data?.token || res.data.token;
      if (token) localStorage.setItem("customerToken", token);
      if (from) {
        navigate(from, { state: bookingState, replace: true });
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-3xl font-extrabold mb-4">Join SmartSalon</h2>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Create your free account and start booking premium salon services near you.
          </p>
          <div className="mt-8 space-y-3 text-left">
            {["✓ Free account, no hidden fees", "✓ Book in under 60 seconds", "✓ Instant confirmation", "✓ Real reviews from real customers"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <span>{f}</span>
              </div>
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

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create Account</h1>
          <p className="text-muted mb-6">It's free and takes less than 2 minutes.</p>

          {/* Step indicator */}
          <div className="flex items-center mb-7">
            {STEPS.map(({ num, label }, i) => (
              <div key={num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step > num
                        ? "bg-green-500 text-white"
                        : step === num
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {step > num ? "✓" : num}
                  </div>
                  <span className="text-xs text-slate-500 mt-1 whitespace-nowrap">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 mx-2 transition-all ${step > num ? "bg-green-400" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Info + send OTP */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4 fade-in">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {["male", "female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium capitalize transition-all ${
                        gender === g
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {g === "male" ? "👨 Male" : "👩 Female"}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
                {loading ? "Sending OTP..." : "Send OTP →"}
              </button>
            </form>
          )}

          {/* Step 2: OTP verify */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="fade-in">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📱</div>
                <p className="text-sm text-slate-600">
                  We sent a 6-digit OTP to <strong>{phone}</strong>
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input-field text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full py-3 disabled:opacity-60">
                {loading ? "Checking OTP..." : "Verify OTP →"}
              </button>

              <div className="mt-3 text-center text-sm">
                {otpTimer > 0 ? (
                  <span className="text-slate-500">Resend in <strong>{otpTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep(1); setOtp(""); setError(""); }}
                className="mt-2 w-full text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Change phone number
              </button>
            </form>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <form onSubmit={handleRegister} className="fade-in">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Create Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="e.g. john123 (letters + numbers)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors ${
                          password.length >= (i + 1) * 2
                            ? password.length >= 8 ? "bg-green-400" : "bg-amber-400"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">
                {loading ? "Creating Account..." : "Create Account ✓"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link to="/privacy-policy" className="text-indigo-500 hover:underline">Privacy Policy</Link>
            {" "}and{" "}
            <Link to="/terms" className="text-indigo-500 hover:underline">Terms &amp; Conditions</Link>.
          </p>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
