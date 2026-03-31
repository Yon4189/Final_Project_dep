import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const CategoryTable = ({ categories, onEdit, onDelete, isLoading, isError }) => {
  if (isLoading) {
    return (
      <div className="p-40 text-center flex flex-col items-center gap-4">
        <div className="animate-pulse w-12 h-12 bg-slate-200 rounded-full"></div>
        <p className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Loading categories...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-40 text-center flex flex-col items-center gap-4">
        <p className="font-black text-red-400 uppercase text-[10px] tracking-[0.2em]">Failed to load categories</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="p-40 text-center flex flex-col items-center gap-4">
        <p className="font-black text-slate-300 uppercase text-[10px] tracking-[0.2em]">No categories found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto hidden lg:block">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-100 tracking-wider">
          <tr>
            <th className="px-8 py-4">ID</th>
            <th className="px-8 py-4">Name</th>
            <th className="px-8 py-4">Status</th>
            <th className="px-8 py-4">Description</th>
            <th className="px-8 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {categories.map((item) => (
            <tr key={item.catagoryID} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-4 font-mono text-xs font-bold text-slate-300">#{item.catagoryID}</td>
              <td className="px-8 py-4 font-semibold text-slate-800">{item.name}</td>
              <td className="px-8 py-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase border ${
                  item.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {item.status || 'Active'}
                </span>
              </td>
              <td className="px-8 py-4 text-sm text-slate-500 max-w-xs truncate italic">{item.description || 'No description.'}</td>
              <td className="px-8 py-4 text-right">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => onEdit(item)}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategoryTable;