import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const MobileCategoryCard = ({ item, onEdit, onDelete }) => (
  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <p className="font-mono text-[9px] font-black text-slate-300">#{item.catagoryID}</p>
        <p className="font-semibold text-slate-800 text-base leading-tight">{item.name}</p>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase border ${
        item.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
      }`}>
        {item.status || 'Active'}
      </span>
    </div>
    {item.description && (
      <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-2">{item.description}</p>
    )}
    <div className="flex gap-2 pt-2">
      <button onClick={() => onEdit(item)} className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-[10px] font-semibold uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400">
        <Edit2 size={14} /> Edit
      </button>
      <button onClick={() => onDelete(item)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-[10px] font-semibold uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-100 focus:outline-none focus:ring-2 focus:ring-red-400">
        <Trash2 size={14} /> Delete
      </button>
    </div>
  </div>
);

export default MobileCategoryCard;