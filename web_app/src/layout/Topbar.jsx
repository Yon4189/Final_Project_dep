import React from 'react';
import { Search, Bell, User, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the global Auth state

const Topbar = () => {
  // 1. Get the current user data from the context
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white flex items-center justify-between px-8 shadow-sm border-b border-slate-200 sticky top-0 z-10">
      
      {/* LEFT: Search Section */}
      <div className="flex items-center bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 w-96 group focus-within:border-admin-accent focus-within:bg-white transition-all shadow-inner">
        <Search size={18} className="text-slate-400 group-focus-within:text-admin-accent" />
        <input 
          type="text" 
          placeholder="Search providers, bookings, or IDs..." 
          className="bg-transparent border-none outline-none ml-2 text-sm w-full text-slate-700 placeholder:text-slate-400"
        />
      </div>
      
      {/* RIGHT: Actions & Profile */}
      <div className="flex items-center gap-6">
        
        {/* Quick Action: Settings (Links to UC-07/System Config) */}
        <Link to="/settings" className="text-slate-400 hover:text-admin-accent transition-colors p-2 hover:bg-slate-50 rounded-full" title="Platform Settings">
          <Settings size={20} />
        </Link>

        {/* Notifications */}
        <button className="text-slate-400 hover:text-admin-accent relative p-2 hover:bg-slate-50 rounded-full transition-all">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* ✅ CLICKABLE PROFILE AREA (UC-12 Update Profile) */}
        <Link 
          to="/profile" 
          className="flex items-center gap-3 pl-4 border-l border-slate-200 hover:bg-slate-50 p-1 rounded-2xl transition-all group"
        >
          <div className="text-right hidden sm:block">
            {/* Display actual name from login */}
            <p className="text-sm font-black text-slate-800 group-hover:text-admin-accent transition-colors">
               {user?.name || 'Admin User'}
            </p>
            <p className="text-[10px] text-admin-accent font-black uppercase tracking-tighter">
               Addis Ababa Cluster
            </p>
          </div>
          
          {/* Admin Avatar Circle */}
          <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden border-2 border-white ring-2 ring-slate-100">
            <User size={20} />
          </div>
        </Link>

      </div>
    </header>
  );
};

export default Topbar;