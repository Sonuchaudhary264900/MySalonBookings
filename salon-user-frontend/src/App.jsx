import React, { lazy, Suspense, useState, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import ToastContainer from "./components/ToastContainer";
import useSwipeNav from "./hooks/useSwipeNav";

function SwipeHandler() { useSwipeNav(); return null; }

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// ── Eagerly loaded (critical path) ────────────────────────────
import Home from "./pages/Home";
import Login from "./pages/Login";
import GenderHome from "./pages/GenderHome";

// ── Lazily loaded (split into separate chunks) ─────────────────
const Register     = lazy(() => import("./pages/Register"));
const SalonDetails = lazy(() => import("./pages/SalonDetails"));
const Booking      = lazy(() => import("./pages/Booking"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Favorites    = lazy(() => import("./pages/Favorites"));
const Profile             = lazy(() => import("./pages/Profile"));
const Feedback            = lazy(() => import("./pages/Feedback"));
const PrivacyPolicy           = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions      = lazy(() => import("./pages/TermsAndConditions"));
const CustomerPrivacyPolicy   = lazy(() => import("./pages/legal/CustomerPrivacyPolicy"));
const CustomerTerms           = lazy(() => import("./pages/legal/CustomerTerms"));
const CustomerRefundPolicy    = lazy(() => import("./pages/legal/CustomerRefundPolicy"));
const OwnerPrivacyPolicy      = lazy(() => import("./pages/legal/OwnerPrivacyPolicy"));
const OwnerTerms              = lazy(() => import("./pages/legal/OwnerTerms"));
const Reels                   = lazy(() => import("./pages/Reels"));
const SalonReviews            = lazy(() => import("./pages/SalonReviews"));
const MySubscription          = lazy(() => import("./pages/MySubscription"));
const MapView                 = lazy(() => import("./pages/MapView"));
const Notifications           = lazy(() => import("./pages/Notifications"));
const Chat                    = lazy(() => import("./pages/Chat"));
const HairstylePage           = lazy(() => import("./pages/HairstylePage"));
const ExplorePage             = lazy(() => import("./pages/ExplorePage"));

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
            <p className="text-sm text-slate-500 mb-5">An unexpected error occurred on this page.</p>
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

// ── Layout wrapper — hides chrome on Reels page ───────────────
function AppLayout({ notifOpen, setNotifOpen }) {
  const { pathname } = useLocation();
  const isReels       = pathname === '/reels' || pathname.startsWith('/reels');
  const isMap         = pathname === '/map';
  const isChat        = pathname.startsWith('/chat/');
  const isSalon       = /^\/salons\/[^/]+$/.test(pathname);
  const isSalonPage   = /^\/(salon|barbershop|spa-wellness|makeup-bridal|skin-derma)\/[^/]+(\/.*)?$/.test(pathname);
  const isBookingFlow = pathname.startsWith('/booking/');
  const isGuest       = !localStorage.getItem("customerToken");
  const hideChrome    = isReels || isMap || isChat;

  return (
    <div className="flex flex-col min-h-screen">
      <SwipeHandler />
      <ScrollToTop />
      {!hideChrome && <Navbar notifOpen={notifOpen} setNotifOpen={setNotifOpen} />}
      <ToastContainer />
      <main className={hideChrome ? 'flex-grow min-w-0' : isSalon ? 'flex-grow pb-20 md:pb-0 md:pl-[220px] min-w-0 page-root' : isBookingFlow ? 'flex-grow pb-20 md:pb-0 pt-16 md:pt-0 md:pl-[220px] min-w-0 page-root' : 'flex-grow pb-20 md:pb-0 pt-16 md:pt-0 md:pl-[220px] min-w-0 page-root'}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                            element={<Home />} />
            <Route path="/men"                         element={<GenderHome gender="male" />} />
            <Route path="/women"                       element={<GenderHome gender="female" />} />
            <Route path="/login"                       element={<Login />} />
            <Route path="/register"                    element={<Register />} />
            <Route path="/salon/:id"                   element={<SalonDetails />} />
            <Route path="/salon/:id/reviews"           element={<SalonReviews />} />
            <Route path="/barbershop/:id"              element={<SalonDetails />} />
            <Route path="/barbershop/:id/reviews"      element={<SalonReviews />} />
            <Route path="/spa-wellness/:id"            element={<SalonDetails />} />
            <Route path="/spa-wellness/:id/reviews"    element={<SalonReviews />} />
            <Route path="/makeup-bridal/:id"           element={<SalonDetails />} />
            <Route path="/makeup-bridal/:id/reviews"   element={<SalonReviews />} />
            <Route path="/skin-derma/:id"              element={<SalonDetails />} />
            <Route path="/skin-derma/:id/reviews"      element={<SalonReviews />} />
            <Route path="/booking/:salonId/:serviceId" element={<Booking />} />
            <Route path="/booking/:salonId"            element={<Booking />} />
            <Route path="/dashboard"                   element={<Dashboard />} />
            <Route path="/favorites"                   element={<Favorites />} />
            <Route path="/profile"                     element={<Profile />} />
            <Route path="/feedback"                    element={<Feedback />} />
            <Route path="/privacy-policy"              element={<PrivacyPolicy />} />
            <Route path="/terms"                       element={<TermsAndConditions />} />
            <Route path="/legal/customer-privacy"      element={<CustomerPrivacyPolicy />} />
            <Route path="/legal/customer-terms"        element={<CustomerTerms />} />
            <Route path="/legal/customer-refund-policy" element={<CustomerRefundPolicy />} />
            <Route path="/legal/owner-privacy"         element={<OwnerPrivacyPolicy />} />
            <Route path="/legal/owner-terms"           element={<OwnerTerms />} />
            <Route path="/reels"                       element={<Reels />} />
            <Route path="/map"                         element={<MapView />} />
            <Route path="/my-subscription"             element={<MySubscription />} />
            <Route path="/notifications"               element={<Notifications />} />
            <Route path="/chat/:bookingId"             element={<Chat />} />
            <Route path="/style-ai"                    element={<HairstylePage />} />
            <Route path="/explore"                     element={<ExplorePage />} />

            {/* 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
                  <p className="text-slate-500 mb-6">Page not found</p>
                  <a href="/" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                    Go Home
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>
      {pathname === '/' && isGuest && <Footer />}
      {!hideChrome && <BottomNav />}
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────
function App() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <BrowserRouter>
      <ThemeProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <AppLayout notifOpen={notifOpen} setNotifOpen={setNotifOpen} />
        </ErrorBoundary>
      </NotificationProvider>
      </ThemeProvider>
      <SpeedInsights />
    </BrowserRouter>
  );
}

export default App;
