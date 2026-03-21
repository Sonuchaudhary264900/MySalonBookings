import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import BottomNav from './BottomNav';

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

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar onMenuToggle={handleMenuToggle} />

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