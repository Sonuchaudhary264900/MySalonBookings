import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Settings, Bell, QrCode, X } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import ROUTES from '../../routes';

const CUSTOMER_APP_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'https://mysalonbookings.com';

/**
 * Navbar Component
 * 
 * Features:
 * - Menu toggle for mobile
 * - User profile dropdown
 * - Notifications icon
 * - Logout button
 * - Responsive design
 */
const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const qrValue = salon?._id
    ? `${CUSTOMER_APP_URL}/salon/${salon._id}`
    : CUSTOMER_APP_URL;

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {/* Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            type="button"
            title="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Logo */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
              <span className="text-white text-sm">✂</span>
            </div>
            <span className="text-base font-bold text-slate-900">SmartSalon</span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Welcome Message */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              Welcome, {user?.name || 'Owner'}
            </p>
            <p className="text-xs text-gray-500">
              {user?.salonName || 'Salon'}
            </p>
          </div>

          {/* QR Code */}
          <button
            onClick={() => setShowQR(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            type="button"
            title="Salon QR Code"
          >
            <QrCode className="w-5 h-5 text-gray-600" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate(ROUTES.NOTIFICATIONS)}
            className="p-2 hover:bg-gray-100 rounded-lg transition relative"
            type="button"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
              type="button"
              title="User menu"
            >
              {salon?.logo ? (
                <img src={salon.logo} alt="profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <button
                  type="button"
                  onClick={() => {
                    navigate(ROUTES.PROFILE);
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigate(ROUTES.SETTINGS);
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <hr className="my-1" />

                <button
                  onClick={() => {
                    handleLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  type="button"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full">
              <h3 className="font-bold text-gray-900 text-base">Salon Booking QR</h3>
              <button onClick={() => setShowQR(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-xl">
              <QRCodeSVG value={qrValue} size={180} />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-700">{salon?.name || 'My Salon'}</p>
              <p className="text-xs text-gray-400 mt-0.5 break-all">{qrValue}</p>
            </div>
            <p className="text-xs text-gray-500 text-center">Share this QR so customers can book directly</p>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;