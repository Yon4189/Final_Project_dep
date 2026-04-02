import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, loading = false }) => {
  if (loading) {
    return (
      <div
        className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-pulse"
        aria-label={`Loading ${title} statistic`}
        aria-busy="true"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-16 bg-slate-200 rounded mb-2"></div>
            <div className="h-8 w-20 bg-slate-200 rounded"></div>
          </div>
          <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  const textColorClass = color.replace('bg-', 'text-');

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      role="region"
      aria-label={`${title} statistic: ${value}`}
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${textColorClass}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;