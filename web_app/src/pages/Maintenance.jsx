import React from 'react';
import { Hammer, Clock, ShieldAlert } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl shadow-slate-200 dark:shadow-none border border-slate-100 dark:border-slate-700 p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="p-8 bg-amber-100 dark:bg-amber-900/30 rounded-[2.5rem] text-amber-600 dark:text-amber-500">
            <Hammer size={64} className="animate-bounce" />
          </div>
          <div className="absolute -top-2 -right-2 bg-rose-500 text-white p-2 rounded-full shadow-lg border-4 border-white dark:border-slate-800">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            System Maintenance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Ethio Handyman is currently undergoing scheduled maintenance to improve our services. We'll be back online shortly.
          </p>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-4">
          <Clock size={20} className="text-admin-accent" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
            Estimated back in: 45 Mins
          </span>
        </div>

        <div className="pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Check Again
          </button>
        </div>

        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          &copy; {new Date().getFullYear()} Ethio Handyman Service Finder
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
