import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import useSwipeNav from '../../hooks/useSwipeNav';
import ROUTES from '../../routes';
import TrialBanner from '../billing/TrialBanner';
import AccessBlockedModal from '../billing/AccessBlockedModal';
import { useSalon } from '../../hooks/useSalon';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('msb_sidebar_collapsed') === 'true'; }
    catch { return false; }
  });

  const { pathname } = useLocation();
  const { subscription } = useSalon();
  const isRestricted = subscription && ['restricted', 'overdue'].includes(subscription.accessStatus);
  useSwipeNav();

  // Left-edge swipe to open drawer
  const edgeTouchX = useRef(null);
  useEffect(() => {
    const onStart = (e) => {
      edgeTouchX.current = e.touches[0].clientX < 30 ? e.touches[0].clientX : null;
    };
    const onEnd = (e) => {
      if (edgeTouchX.current === null) return;
      const diff = e.changedTouches[0].clientX - edgeTouchX.current;
      edgeTouchX.current = null;
      if (diff > 50) setSidebarOpen(true);
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('msb_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-[#f5f6fa] dark:bg-[#0a0f1e] transition-colors duration-300">

      {/* Access blocked overlay (all pages except billing) */}
      {isRestricted && pathname !== ROUTES.BILLING && <AccessBlockedModal />}

      {/* ── Fixed sidebar ── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* ── Right column: shifts right to clear fixed sidebar on desktop ── */}
      <div className={`
        flex flex-col min-h-screen flex-1 min-w-0
        transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-64'}
      `}>

        {/* Navbar — fixed, always visible */}
        <Navbar onMenuToggle={() => setSidebarOpen(v => !v)} />

        {/* Trial / payment status banner — offset below fixed navbar */}
        <div className="pt-16">
          <TrialBanner />
        </div>

        {/* Page content */}
        <main className="flex-1 w-full">
          <div className="p-4 md:p-6 lg:p-8 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>

        {/* Footer — hidden on mobile (BottomNav takes over) */}
        <div className="hidden md:block">
          <Footer />
        </div>

      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

    </div>
  );
};

export default DashboardLayout;
