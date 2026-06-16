import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Layout from './components/Layout';

// Route pages are code-split so the admin panel ships a small initial bundle
// and loads each section on demand.
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const Analytics       = lazy(() => import('./pages/Analytics'));
const PendingSalons   = lazy(() => import('./pages/PendingSalons'));
const Bookings        = lazy(() => import('./pages/Bookings'));
const AllSalons       = lazy(() => import('./pages/AllSalons'));
const Owners          = lazy(() => import('./pages/Owners'));
const Customers       = lazy(() => import('./pages/Customers'));
const Subscriptions   = lazy(() => import('./pages/Subscriptions'));
const Promotions      = lazy(() => import('./pages/Promotions'));
const SiteSettings    = lazy(() => import('./pages/SiteSettings'));
const ServiceCatalog  = lazy(() => import('./pages/ServiceCatalog'));
const Feedback        = lazy(() => import('./pages/Feedback'));
const Withdrawals     = lazy(() => import('./pages/Withdrawals'));
const Credits         = lazy(() => import('./pages/Credits'));
const Referrals       = lazy(() => import('./pages/Referrals'));

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
