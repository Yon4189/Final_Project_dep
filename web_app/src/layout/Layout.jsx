import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 80 && newWidth < 480) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handleToggle = () => {
    if (sidebarOpen && sidebarWidth > 80) {
      setSidebarWidth(80);
      setSidebarOpen(false);
    } else {
      setSidebarWidth(260);
      setSidebarOpen(true);
    }
  };

  return (
    <div className={`flex h-screen bg-white overflow-hidden relative ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <Sidebar
        width={sidebarWidth}
        onResizeStart={startResizing}
        isOpen={sidebarWidth > 160}
      />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-admin-content">
        <Topbar onToggleSidebar={handleToggle} />
        <main className="flex-1 overflow-x-auto overflow-y-auto p-8 text-slate-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
};


export default Layout;