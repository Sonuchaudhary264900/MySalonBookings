import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Layout from './components/Layout';

// After a deploy, hashed chunk filenames change; a stale tab 404s on the old
// names. lazyRetry forces a one-time reload to fetch the fresh build.
const lazyRetry = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      if (!sessionStorage.getItem('chunk-reloaded')) {
        sessionStorage.setItem('chunk-reloaded', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem('chunk-reloaded'));
}

// Route pages are code-split so the admin panel ships a small initial bundle
// and loads each section on demand.
const Dashboard       = lazyRetry(() => import('./pages/Dashboard'));
const Analytics       = lazyRetry(() => import('./pages/Analytics'));
const PendingSalons   = lazyRetry(() => import('./pages/PendingSalons'));
const Bookings        = lazyRetry(() => import('./pages/Bookings'));
const AllSalons       = lazyRetry(() => import('./pages/AllSalons'));
const Owners          = lazyRetry(() => import('./pages/Owners'));
const Customers       = lazyRetry(() => import('./pages/Customers'));
const Subscriptions   = lazyRetry(() => import('./pages/Subscriptions'));
const Promotions      = lazyRetry(() => import('./pages/Promotions'));
const SiteSettings    = lazyRetry(() => import('./pages/SiteSettings'));
const ServiceCatalog  = lazyRetry(() => import('./pages/ServiceCatalog'));
const Feedback        = lazyRetry(() => import('./pages/Feedback'));
const Withdrawals     = lazyRetry(() => import('./pages/Withdrawals'));
const Credits         = lazyRetry(() => import('./pages/Credits'));
const Referrals       = lazyRetry(() => import('./pages/Referrals'));

const isAuth = () => !!localStorage.getItem('admin_token');

const PrivateRoute = ({ children }) => isAuth() ? children : <Navigate to="/login" replace />;

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="pending"   element={<PendingSalons />} />
                <Route path="bookings"  element={<Bookings />} />
                <Route path="salons"    element={<AllSalons />} />
                <Route path="owners"    element={<Owners />} />
                <Route path="customers"      element={<Customers />} />
                <Route path="subscriptions"  element={<Subscriptions />} />
                <Route path="promotions"     element={<Promotions />} />
                <Route path="site-settings"  element={<SiteSettings />} />
                <Route path="catalog"        element={<ServiceCatalog />} />
                <Route path="feedback"       element={<Feedback />} />
                <Route path="withdrawals"    element={<Withdrawals />} />
                <Route path="credits"        element={<Credits />} />
                <Route path="referrals"      element={<Referrals />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          <SpeedInsights />
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
