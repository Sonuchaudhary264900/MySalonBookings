import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import useSwipeNav from '../../hooks/useSwipeNav';
import ROUTES from '../../routes';

/**
 * DashboardLayout Component
 * 
 * Wraps all dashboard pages
 * Includes:
 * - Navbar at top
 * - Sidebar on left
 * - Main content area
 * - Footer (optional)
 * 
 * Usage:
 * <DashboardLayout>
 *   <Dashboard />
 * </DashboardLayout>
 */
const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const showMenuToggle = pathname === ROUTES.DASHBOARD || pathname === ROUTES.SETTINGS;
  useSwipeNav();

  // Left-edge swipe to open drawer (< 30px from left edge → swipe right)
  const edgeTouchX = useRef(null);
  useEffect(() => {
    const onStart = (e) => {
      if (e.touches[0].clientX < 30) edgeTouchX.current = e.touches[0].clientX;
      else edgeTouchX.current = null;
    };
    const onEnd = (e) => {
      if (edgeTouchX.current === null) return;
      const diff = e.changedTouches[0].clientX - edgeTouchX.current;
      edgeTouchX.current = null;
      if (diff > 50) setSidebarOpen(true);   // swipe right → open
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend',   onEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend',   onEnd);
    };
  }, []);

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar onMenuToggle={showMenuToggle ? handleMenuToggle : undefined} />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 pb-20 md:pb-6 lg:pb-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default DashboardLayout;