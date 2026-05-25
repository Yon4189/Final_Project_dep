import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useTheme } from '../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const Layout = () => {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { isDarkMode } = useTheme();

  // Fetch admin settings for dynamic tab title
  const { data: adminSettings } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings');
      return response.data.success ? response.data.data : null;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (adminSettings?.branding?.systemName) {
      document.title = `${adminSettings.branding.systemName} Admin Panel`;
    }
  }, [adminSettings]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setSidebarWidth(280); // Fixed width for mobile drawer
      } else {
        setSidebarOpen(true);
        setSidebarWidth(260);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizing = useCallback(() => {
    if (!isMobile) setIsResizing(true);
  }, [isMobile]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent) => {
    if (isResizing && !isMobile) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 80 && newWidth < 480) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing, isMobile]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`flex fixed inset-0 ${isDarkMode ? 'bg-black' : 'bg-white'} overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`${
          isMobile
            ? 'fixed inset-y-0 left-0 z-50'
            : 'relative overflow-hidden'
        } transition-all duration-300 ease-in-out ${
          isMobile
            ? sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
            : sidebarOpen
            ? ''
            : 'w-0'
        }`}
        style={!isMobile ? { width: sidebarOpen ? `${sidebarWidth}px` : '0px' } : {}}
      >
        <Sidebar
          width={sidebarWidth}
          onResizeStart={startResizing}
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={() => isMobile && setSidebarOpen(false)}
        />
      </div>

      <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${isDarkMode ? 'bg-black' : 'bg-white'} transition-colors duration-300`}>
        <Topbar onToggleSidebar={handleToggle} isMobile={isMobile} />
        <main className={`flex-1 overflow-x-auto overflow-y-auto ${isMobile ? 'p-4' : 'p-8'} text-black dark:text-white`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};


export default Layout;