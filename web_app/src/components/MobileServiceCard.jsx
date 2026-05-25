import React from 'react';

const MobileServiceCard = ({ item, getCategoryName }) => (
  <div className="bg-admin-card rounded-3xl p-5 border border-admin-border space-y-4 shadow-sm">
    <div>
      <p className="font-mono text-[9px] font-black text-admin-text-muted">#{item.serviceID}</p>
      <p className="font-semibold text-admin-text text-base leading-tight">{item.title}</p>
    </div>
    <div className="flex items-center justify-between">
      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-semibold uppercase italic border border-blue-100">
        {getCategoryName(item.catagoryID)}
      </span>
      <span className="font-mono font-bold text-admin-text text-sm">{item.estimatedPrice} ETB</span>
    </div>
  </div>
);

export default MobileServiceCard;