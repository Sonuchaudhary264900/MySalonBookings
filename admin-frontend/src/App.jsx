import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import PendingSalons from './pages/PendingSalons';
import Bookings from './pages/Bookings';
import AllSalons from './pages/AllSalons';
import Owners from './pages/Owners';
import Customers from './pages/Customers';
import Subscriptions from './pages/Subscriptions';
import Promotions from './pages/Promotions';
import SiteSettings from './pages/SiteSettings';
import ServiceCatalog from './pages/ServiceCatalog';
import Feedback from './pages/Feedback';
import Withdrawals from './pages/Withdrawals';
import Layout from './components/Layout';

const isAuth = () => !!localStorage.getItem('admin_token');

const PrivateRoute = ({ children }) => isAuth() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
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
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <SpeedInsights />
      </BrowserRouter>
    </ThemeProvider>
  );
}
