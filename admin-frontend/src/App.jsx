import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import PendingSalons from './pages/PendingSalons';
import Bookings from './pages/Bookings';
import AllSalons from './pages/AllSalons';
import Owners from './pages/Owners';
import Customers from './pages/Customers';
import Layout from './components/Layout';

const isAuth = () => !!localStorage.getItem('admin_token');

const PrivateRoute = ({ children }) => isAuth() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
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
          <Route path="customers" element={<Customers />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <SpeedInsights />
    </BrowserRouter>
  );
}
