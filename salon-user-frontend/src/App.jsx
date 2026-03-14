import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { NotificationProvider } from "./context/NotificationContext";
import ToastContainer from "./components/ToastContainer";

// ── Eagerly loaded (critical path) ────────────────────────────
import Home from "./pages/Home";
import Login from "./pages/Login";

// ── Lazily loaded (split into separate chunks) ─────────────────
const Register       = lazy(() => import("./pages/Register"));
const SalonDetails   = lazy(() => import("./pages/SalonDetails"));
const Booking        = lazy(() => import("./pages/Booking"));
const Dashboard      = lazy(() => import("./pages/Dashboard"));
const Favorites      = lazy(() => import("./pages/Favorites"));
const CreateSalon    = lazy(() => import("./pages/CreateSalon"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const OwnerServices  = lazy(() => import("./pages/OwnerServices"));
const Profile        = lazy(() => import("./pages/Profile"));

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

// ── App ────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <ErrorBoundary>
          <Navbar />
          <ToastContainer />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                            element={<Home />} />
            <Route path="/login"                       element={<Login />} />
            <Route path="/register"                    element={<Register />} />
            <Route path="/salon/:id"                   element={<SalonDetails />} />
            <Route path="/booking/:salonId/:serviceId" element={<Booking />} />
            <Route path="/dashboard"                   element={<Dashboard />} />
            <Route path="/favorites"                   element={<Favorites />} />
            <Route path="/create-salon"                element={<CreateSalon />} />
            <Route path="/owner/dashboard"             element={<OwnerDashboard />} />
            <Route path="/owner/services"              element={<OwnerServices />} />
            <Route path="/profile"                     element={<Profile />} />

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
          <Footer />
        </ErrorBoundary>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
