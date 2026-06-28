import React, { lazy, Suspense, useState, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
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

// ── Chunk-load resilience ──────────────────────────────────────
// After a deploy, hashed chunk filenames change. A browser holding an old index
// bundle 404s on the old chunk names. Detect the failed dynamic import and force
// a one-time full reload to fetch the fresh build (prevents white-screen).
const lazyRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      if (!sessionStorage.getItem("chunk-reloaded")) {
        sessionStorage.setItem("chunk-reloaded", "1");
        window.location.reload();
        return new Promise(() => {}); // hold render until reload fires
      }
      throw err;
    })
  );
if (typeof window !== "undefined") {
  window.addEventListener("load", () => sessionStorage.removeItem("chunk-reloaded"));
}

// ── Lazily loaded (split into separate chunks) ─────────────────
const Register     = lazyRetry(() => import("./pages/Register"));
const SalonDetails = lazyRetry(() => import("./pages/SalonDetails"));
const Booking      = lazyRetry(() => import("./pages/Booking"));
const Dashboard    = lazyRetry(() => import("./pages/Dashboard"));
const Favorites    = lazyRetry(() => import("./pages/Favorites"));
const Profile             = lazyRetry(() => import("./pages/Profile"));
const Feedback            = lazyRetry(() => import("./pages/Feedback"));
const Wallet              = lazyRetry(() => import("./pages/Wallet"));
const PrivacyPolicy           = lazyRetry(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions      = lazyRetry(() => import("./pages/TermsAndConditions"));
const CustomerPrivacyPolicy   = lazyRetry(() => import("./pages/legal/CustomerPrivacyPolicy"));
const CustomerTerms           = lazyRetry(() => import("./pages/legal/CustomerTerms"));
const CustomerRefundPolicy    = lazyRetry(() => import("./pages/legal/CustomerRefundPolicy"));
const OwnerPrivacyPolicy      = lazyRetry(() => import("./pages/legal/OwnerPrivacyPolicy"));
const OwnerTerms              = lazyRetry(() => import("./pages/legal/OwnerTerms"));
const Reels                   = lazyRetry(() => import("./pages/Reels"));
const SalonReviews            = lazyRetry(() => import("./pages/SalonReviews"));
const MySubscription          = lazyRetry(() => import("./pages/MySubscription"));
const MapView                 = lazyRetry(() => import("./pages/MapView"));
const Notifications           = lazyRetry(() => import("./pages/Notifications"));
const Chat                    = lazyRetry(() => import("./pages/Chat"));
const HairstylePage           = lazyRetry(() => import("./pages/HairstylePage"));
const ExplorePage             = lazyRetry(() => import("./pages/ExplorePage"));

// ── Page loading fallback (shimmer skeleton) ───────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-6 max-w-3xl mx-auto w-full">
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-2/5 rounded-lg bg-slate-200" />
        <div className="h-40 w-full rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-200" />
      </div>
    </div>
  );
}

// ── Auth guard — bounce logged-out users to login ──────────────
function RequireAuth({ children }) {
  const { pathname } = useLocation();
  if (!localStorage.getItem("customerToken")) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }
  return children;
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
            <div className="flex justify-center mb-4"><AlertTriangle size={44} className="text-amber-500" /></div>
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
            <Route path="/dashboard"                   element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/favorites"                   element={<RequireAuth><Favorites /></RequireAuth>} />
            <Route path="/profile"                     element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/feedback"                    element={<RequireAuth><Feedback /></RequireAuth>} />
            <Route path="/wallet"                      element={<RequireAuth><Wallet /></RequireAuth>} />
            <Route path="/privacy-policy"              element={<PrivacyPolicy />} />
            <Route path="/terms"                       element={<TermsAndConditions />} />
            <Route path="/legal/customer-privacy"      element={<CustomerPrivacyPolicy />} />
            <Route path="/legal/customer-terms"        element={<CustomerTerms />} />
            <Route path="/legal/customer-refund-policy" element={<CustomerRefundPolicy />} />
            <Route path="/legal/owner-privacy"         element={<OwnerPrivacyPolicy />} />
            <Route path="/legal/owner-terms"           element={<OwnerTerms />} />
            <Route path="/reels"                       element={<Reels />} />
            <Route path="/map"                         element={<MapView />} />
            <Route path="/my-subscription"             element={<RequireAuth><MySubscription /></RequireAuth>} />
            <Route path="/notifications"               element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="/chat/:bookingId"             element={<RequireAuth><Chat /></RequireAuth>} />
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
