import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, loading = false }) => {
  if (loading) {
    return (
      <div
        className="bg-admin-card rounded-2xl p-6 shadow-sm border border-admin-border animate-pulse"
        aria-label={`Loading ${title} statistic`}
        aria-busy="true"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-16 bg-slate-200 bg-admin-card rounded mb-2"></div>
            <div className="h-8 w-20 bg-slate-200 bg-admin-card rounded"></div>
          </div>
          <div className="w-10 h-10 bg-slate-200 bg-admin-card rounded-full"></div>
        </div>
      </div>
    );
  }

  const textColorClass = color.replace('bg-', 'text-');

  return (
    <div
      className="bg-admin-card rounded-2xl p-6 shadow-sm border border-admin-border transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      role="region"
      aria-label={`${title} statistic: ${value}`}
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-admin-text-muted">{title}</p>
          <p className="text-2xl font-bold text-admin-text mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${textColorClass}`} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;