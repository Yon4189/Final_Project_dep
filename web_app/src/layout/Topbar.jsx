import React from 'react';
import { Search, Bell, User } from 'lucide-react'; 

const Topbar = () => {
  return (
    <header className="h-16 bg-white flex items-center justify-between px-8 shadow-sm border-b border-slate-200">
      <div className="flex items-center bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 w-96 group focus-within:border-admin-accent transition-all">
        {/* Professional Search Icon */}
        <Search size={18} className="text-slate-400 group-focus-within:text-admin-accent" />
        <input 
          type="text" 
          placeholder="Search providers, IDs..." 
          className="bg-transparent border-none outline-none ml-2 text-sm w-full text-slate-700"
        />
      </div>
      
      <div className="flex items-center gap-6">
        {/* Notification Bell (Bonus) */}
        <button className="text-slate-400 hover:text-admin-accent relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800">Admin User</p>
            <p className="text-[10px] text-admin-accent font-bold uppercase tracking-wider">Addis Cluster</p>
          </div>
          <div className="w-10 h-10 bg-admin-accent text-white rounded-full flex items-center justify-center shadow-md overflow-hidden">
            <User size={24} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;