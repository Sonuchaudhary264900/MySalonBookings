import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PendingSalons from './pages/PendingSalons';
import AllSalons from './pages/AllSalons';
import Owners from './pages/Owners';
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
          <Route path="pending" element={<PendingSalons />} />
          <Route path="salons" element={<AllSalons />} />
          <Route path="owners" element={<Owners />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
