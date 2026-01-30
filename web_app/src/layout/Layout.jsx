import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = () => {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-admin-content">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 text-slate-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;