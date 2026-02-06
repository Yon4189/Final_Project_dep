import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`${color.replace('bg-', 'text-')}`} size={28} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
    </div>
  );
};

export default StatCard;