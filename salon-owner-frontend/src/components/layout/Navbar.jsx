import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, User, Settings, Bell, QrCode, X, Download, Sun, Moon } from 'lucide-react';
import QRCodeSVG from 'react-qr-code';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useSalon } from '../../hooks/useSalon';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import ROUTES from '../../routes';

const CUSTOMER_APP_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'https://glowloox.com';

const BIZ_NAME_MAP = {
  barbershop:    'Barbershop',
  salon:         'Salon',
  spa_wellness:  'Spa',
  makeup_bridal: 'Studio',
  skin_derma:    'Clinic',
};

const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { salon } = useSalon();
  const bizName = BIZ_NAME_MAP[salon?.businessType] || 'Salon';
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const qrWrapperRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  const qrValue = salon?._id ? `${CUSTOMER_APP_URL}/salon/${salon._id}` : CUSTOMER_APP_URL;

  /* ── QR card builder (canvas) ── */
  const buildCard = () => new Promise((resolve, reject) => {
    const svg = qrWrapperRef.current?.querySelector('svg');
    if (!svg) return reject();
    const hiResSvg = svg.cloneNode(true);
    hiResSvg.setAttribute('width', 540);
    hiResSvg.setAttribute('height', 540);
    const blob = new Blob([new XMLSerializer().serializeToString(hiResSvg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const qrImg = new window.Image();
    qrImg.onload = () => {
      const W = 400, H = 560, SCALE = 3;
      const canvas = document.createElement('canvas');
      canvas.width = W * SCALE; canvas.height = H * SCALE;
      const ctx = canvas.getContext('2d');
      ctx.scale(SCALE, SCALE);
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(20, 20, 360, 520);
      ctx.fillStyle = '#4f46e5'; ctx.fillRect(20, 20, 360, 74);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px Arial'; ctx.textAlign = 'center';
      ctx.fillText(`GlowLoox — ${bizName} Booking`, 200, 64);
      ctx.drawImage(qrImg, 110, 110, 180, 180);
      ctx.fillStyle = '#111827'; ctx.font = 'bold 20px Arial';
      ctx.fillText(salon?.name || 'My Salon', 200, 322);
      ctx.fillStyle = '#6b7280'; ctx.font = '13px Arial';
      ctx.fillText('Scan to book your appointment', 200, 348);
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, 368); ctx.lineTo(340, 368); ctx.stroke();
      ctx.fillStyle = '#9ca3af'; ctx.font = '9px Arial';
      const maxUrlW = 320;
      let line = '', lines = [], chars = qrValue.split('');
      chars.forEach(ch => {
        const test = line + ch;
        if (ctx.measureText(test).width > maxUrlW && line) { lines.push(line); line = ch; }
        else { line = test; }
      });
      if (line) lines.push(line);
      lines.forEach((l, i) => ctx.fillText(l, 200, 386 + i * 13));
      ctx.fillStyle = '#6b7280'; ctx.font = '11px Arial';
      ctx.fillText('Powered by GlowLoox', 200, 500);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    qrImg.onerror = () => { URL.revokeObjectURL(url); reject(); };
    qrImg.src = url;
  });

  const downloadImage = async () => {
    try {
      const canvas = await buildCard();
      const link = document.createElement('a');
      link.download = `${salon?.name || bizName.toLowerCase()}-booking-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR card downloaded!');
    } catch { toast.error('Could not generate QR card'); }
  };

  const downloadPDF = async () => {
    try {
      const canvas = await buildCard();
      const dataUrl = canvas.toDataURL('image/png');
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0';
      iframe.srcdoc = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{display:flex;justify-content:center;align-items:flex-start;background:#fff}img{max-width:100%;height:auto;display:block}@page{margin:10mm}@media print{body{margin:0}}</style></head><body><img src="${dataUrl}"/></body></html>`;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 3000);
      };
      toast.success('Print dialog opened — save as PDF!');
    } catch { toast.error('Could not generate PDF'); }
  };

  const handleLogout = () => { logout(); navigate(ROUTES.LOGIN); };

  /* ── Icon button shared style ── */
  const iconBtn = 'relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/70 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-150';

  return (
    <>
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0f1e]/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-800/40 shadow-sm shadow-gray-100/50 dark:shadow-black/20">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">

          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            {onMenuToggle && (
              <button onClick={onMenuToggle} className={`md:hidden ${iconBtn}`} type="button" title="Menu" aria-label="Toggle menu">
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shrink-0"
                style={{ background: "linear-gradient(135deg,#4C1D95,#A78BFA)", boxShadow: "0 0 14px rgba(124,58,237,0.40)" }}>
                <svg viewBox="0 0 512 512" width="18" height="18" fill="none">
                  <path d="M256,150 C270,210 310,240 370,256 C310,272 270,300 256,360 C242,300 202,272 142,256 C202,240 242,210 256,150 Z" fill="white"/>
                </svg>
              </div>
              <div className="hidden sm:block">
                <span className="text-[15px] font-bold tracking-tight"
                  style={{ background: "linear-gradient(135deg,#4C1D95,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  GlowLoox
                </span>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1 md:gap-1.5">

            {/* Welcome text — hidden on small screens */}
            <div className="hidden lg:block mr-2 text-right">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                Welcome, {user?.name || 'Owner'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                {salon?.name || 'Your Salon'}
              </p>
            </div>

            {/* Dark / Light mode toggle */}
            <button
              onClick={toggleTheme}
              className={iconBtn}
              type="button"
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
              aria-label="Toggle theme"
            >
              {isDark
                ? <Sun className="w-5 h-5 text-amber-400" />
                : <Moon className="w-5 h-5" />
              }
            </button>

            {/* QR Code */}
            <button
              onClick={() => setShowQR(true)}
              className={iconBtn}
              type="button"
              title="Salon QR Code"
              aria-label="Show QR code"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate(ROUTES.NOTIFICATIONS)}
              className={iconBtn}
              type="button"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Profile avatar + dropdown */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-all duration-150"
                type="button"
                title="Account menu"
                aria-haspopup="true"
                aria-expanded={showUserMenu}
              >
                {salon?.logo ? (
                  <img src={salon.logo} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900 dark:to-violet-900 flex items-center justify-center ring-2 ring-indigo-100 dark:ring-indigo-900">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                {/* Online dot */}
                <span className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full border-2 border-white dark:border-gray-950" />
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in slide-in-from-top-2">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'Owner'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || user?.phone || ''}</p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { navigate(ROUTES.PROFILE); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => { navigate(ROUTES.SETTINGS); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Settings
                    </button>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                    <button
                      type="button"
                      onClick={() => { handleLogout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── QR Modal ── */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4 border border-gray-200 dark:border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{bizName} QR Code</h3>
                <p className="text-xs text-gray-400">Share to let customers book</p>
              </div>
              <button onClick={() => setShowQR(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div ref={qrWrapperRef} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <QRCodeSVG value={qrValue} size={180} />
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-white">{salon?.name || 'My Salon'}</p>
              <p className="text-xs text-gray-400 mt-0.5 break-all">{qrValue}</p>
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={downloadImage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
              >
                <Download className="w-4 h-4" />
                Save PNG
              </button>
              <button
                onClick={downloadPDF}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
