import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SalonProvider } from './context/SalonContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import ROUTES from './routes';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import api from './services/api';

// ── Eagerly loaded (critical path — shown immediately) ─────────
import Login from './pages/auth/Login';

// ── Lazily loaded (split into separate chunks) ─────────────────
const Register         = lazy(() => import('./pages/auth/Register'));
const ApprovalWaiting  = lazy(() => import('./pages/auth/ApprovalWaiting'));
const SalonRegistration = lazy(() => import('./pages/salon/SalonRegistration'));
const Dashboard        = lazy(() => import('./pages/dashboard/Dashboard'));
const Services         = lazy(() => import('./pages/dashboard/Services'));
const Bookings         = lazy(() => import('./pages/dashboard/Bookings'));
const Reports          = lazy(() => import('./pages/dashboard/Reports'));
const Reviews          = lazy(() => import('./pages/dashboard/Reviews'));
const Profile          = lazy(() => import('./pages/dashboard/Profile'));
const Settings         = lazy(() => import('./pages/dashboard/Settings'));
const Notifications    = lazy(() => import('./pages/dashboard/Notifications'));
const Gallery          = lazy(() => import('./pages/dashboard/Gallery'));
const CalendarPage     = lazy(() => import('./pages/dashboard/CalendarPage'));
const Customers        = lazy(() => import('./pages/dashboard/Customers'));
const Coupons          = lazy(() => import('./pages/dashboard/Coupons'));
const Billing          = lazy(() => import('./pages/dashboard/Billing'));
const PrivacyPolicy        = lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions   = lazy(() => import('./pages/TermsAndConditions'));

// ── Page loading fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

// ── Error Boundary ─────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-sm w-full text-center shadow-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-5">An unexpected error occurred.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Pending booking alert modal (mandatory accept/reject) ──────
function BookingAlertModal() {
  const { pendingBooking, clearPendingBooking } = useNotifications();
  const [saving, setSaving] = useState(false);

  if (!pendingBooking) return null;
  const b = pendingBooking;

  const act = async (status) => {
    setSaving(true);
    try {
      await api.put(`/owner/bookings/${b._id}`, { status });
    } catch { /* silent */ } finally {
      setSaving(false);
      clearPendingBooking();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Red top bar */}
        <div className="bg-red-600 px-5 py-4">
          <p className="text-white font-bold text-base">New Booking Request</p>
          <p className="text-red-200 text-xs mt-0.5">Action required — accept or reject</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Customer', value: b.customerName || '—' },
              { label: 'Service',  value: b.serviceName  || '—' },
              { label: 'Date',     value: b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
              { label: 'Time',     value: b.appointmentTime || '—' },
              { label: 'Amount',   value: b.totalAmount ? `₹${b.totalAmount}` : '—' },
              { label: 'Phone',    value: b.customerPhone || '—' },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => act('cancelled')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => act('confirmed')}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Landing page ───────────────────────────────────────────────
const FEATURES = [
  { icon: '📅', title: 'Smart Bookings',   desc: 'Real-time slot management with instant confirmations.' },
  { icon: '📊', title: 'Live Analytics',   desc: 'Revenue trends, peak hours and booking stats.' },
  { icon: '✂',  title: 'Service Menu',     desc: 'Full control over pricing, duration & categories.' },
  { icon: '🔔', title: 'Notifications',    desc: 'Automatic alerts for bookings & cancellations.' },
  { icon: '📈', title: 'Reports',          desc: 'Export earnings and booking history instantly.' },
  { icon: '⚙️', title: 'Settings',         desc: 'Working hours, holidays & salon profile.' },
];

const LandingPage = () => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
            <span className="text-white text-base">✂</span>
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">SmartSalon</span>
          <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">Owner</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={ROUTES.LOGIN} className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium transition">Sign In</a>
          <a href={ROUTES.REGISTER} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition">Get Started →</a>
        </div>
      </div>
    </nav>

    <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 text-white/90 text-xs font-semibold px-4 py-1.5 rounded-full mb-7 border border-white/20">
          <span>✂</span> Trusted by 500+ salon owners across India
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-5">
          Manage Your Salon<br />
          <span className="text-amber-300">Smarter, Faster.</span>
        </h1>
        <p className="text-indigo-100 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          One dashboard for bookings, analytics, services, and customer management.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href={ROUTES.REGISTER} className="px-8 py-3.5 bg-white text-indigo-700 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all text-sm">
            Start Free — No Credit Card
          </a>
          <a href={ROUTES.LOGIN} className="px-8 py-3.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-semibold border border-white/25 transition text-sm">
            Login to Dashboard
          </a>
        </div>
      </div>
    </section>

    <section className="bg-white border-b border-slate-100 py-6 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
        {[
          { value: '500+',  label: 'Salons Onboarded', icon: '✂'  },
          { value: '50K+',  label: 'Bookings Managed', icon: '📅' },
          { value: '99.9%', label: 'Platform Uptime',  icon: '⚡' },
          { value: '4.9 ★', label: 'Owner Rating',     icon: '⭐' },
        ].map(({ value, label, icon }) => (
          <div key={label} className="text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className="text-2xl font-extrabold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </section>

    <section className="py-16 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">All Tools. One Dashboard.</h2>
          <p className="text-slate-500 mt-2 text-sm">No juggling between apps. Manage everything from one place.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-xl mb-4">{icon}</div>
              <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-gradient-to-r from-indigo-600 to-violet-600 py-14 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Ready to grow your salon?</h2>
        <p className="text-indigo-100 text-sm mb-7">Join hundreds of salon owners already using SmartSalon.</p>
        <a href={ROUTES.REGISTER} className="inline-block px-10 py-3.5 bg-white text-indigo-700 rounded-xl font-bold shadow-xl hover:-translate-y-0.5 transition-all text-sm">
          Create Free Account →
        </a>
      </div>
    </section>

    <footer className="bg-white border-t border-slate-100 py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-base">✂</span>
          <span className="font-semibold text-slate-600">SmartSalon</span>
          <span>· Owner Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <span>© 2026 SmartSalon · All rights reserved</span>
          <a href={ROUTES.PRIVACY} className="hover:text-slate-700 transition-colors">Privacy Policy</a>
          <a href={ROUTES.TERMS}   className="hover:text-slate-700 transition-colors">Terms &amp; Conditions</a>
        </div>
      </div>
    </footer>
  </div>
);

// ── App ────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ThemeProvider>
        <LanguageProvider>
        <AuthProvider>
          <SalonProvider>
            <NotificationProvider>
              <Toaster position="top-right" />
              <BookingAlertModal />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route element={<PublicRoute />}>
                    <Route path={ROUTES.HOME}     element={<LandingPage />} />
                    <Route path={ROUTES.LOGIN}    element={<Login />} />
                    <Route path={ROUTES.REGISTER} element={<Register />} />
                  </Route>

                  {/* Legal pages — fully public */}
                  <Route path={ROUTES.PRIVACY} element={<PrivacyPolicy />} />
                  <Route path={ROUTES.TERMS}   element={<TermsAndConditions />} />

                  {/* Semi-protected */}
                  <Route path={ROUTES.SALON_REGISTER}  element={<SalonRegistration />} />
                  <Route path={ROUTES.APPROVAL_WAITING} element={<ApprovalWaiting />} />

                  {/* Protected dashboard routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path={ROUTES.DASHBOARD}     element={<Dashboard />} />
                    <Route path={ROUTES.SERVICES}      element={<Services />} />
                    <Route path={ROUTES.BOOKINGS}      element={<Bookings />} />
                    <Route path={ROUTES.ANALYTICS}     element={<Reports />} />
                    <Route path={ROUTES.REVIEWS}       element={<Reviews />} />
                    <Route path={ROUTES.PROFILE}       element={<Profile />} />
                    <Route path={ROUTES.SETTINGS}      element={<Settings />} />
                    <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />
                    <Route path={ROUTES.GALLERY}       element={<Gallery />} />
                    <Route path={ROUTES.CALENDAR}      element={<CalendarPage />} />
                    <Route path={ROUTES.CUSTOMERS}     element={<Customers />} />
                    <Route path={ROUTES.COUPONS}       element={<Coupons />} />
                    <Route path={ROUTES.BILLING}       element={<Billing />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={
                    <div className="min-h-screen flex items-center justify-center bg-slate-50">
                      <div className="text-center">
                        <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
                        <p className="text-slate-500 mb-8">Page not found</p>
                        <a href={ROUTES.HOME} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                          Go Home
                        </a>
                      </div>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </SalonProvider>
        </AuthProvider>
        </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
