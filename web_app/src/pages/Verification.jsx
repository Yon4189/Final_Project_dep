import React, { useState } from 'react';
import { 
  Search, Filter, CheckCircle, XCircle, 
  FileText, ExternalLink, MoreVertical 
} from 'lucide-react';

const Verification = () => {
  // 1. Mock Data for all providers
  const [providers, setProviders] = useState([
    { id: "PRO-101", name: "Kassahun Tadesse", service: "Plumbing", date: "2023-10-12", docType: "Business License", status: "Pending" },
    { id: "PRO-102", name: "Hanna Alemu", service: "Home Tutoring", date: "2023-10-14", docType: "Degree Certificate", status: "Pending" },
    { id: "PRO-103", name: "Selam Tekle", service: "Cleaning", date: "2023-10-15", docType: "National ID", status: "Approved" },
    { id: "PRO-104", name: "Yared Tolosa", service: "Car Wash", date: "2023-10-17", docType: "Kebele ID", status: "Pending" },
    { id: "PRO-105", name: "Abebe Kebede", service: "Electrical", date: "2023-10-18", docType: "Certification", status: "Rejected" },
  ]);

  const [filter, setFilter] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Logic to handle status changes
  const updateStatus = (id, newStatus) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const filteredProviders = providers.filter(p => {
    const matchesFilter = filter === 'All' || p.status === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Provider Verification</h1>
          <p className="text-slate-500 text-sm">Review and manage service provider credentials.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or service..."
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-full md:w-80 focus:outline-none focus:border-admin-accent bg-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/50 w-fit rounded-xl">
        {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === tab 
              ? 'bg-white text-admin-accent shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Provider ID</th>
              <th className="px-6 py-4">Full Name</th>
              <th className="px-6 py-4">Service</th>
              <th className="px-6 py-4">Document</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProviders.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-slate-400">{item.id}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{item.service}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => alert(`Opening ${item.docType} for ${item.name}`)}
                    className="flex items-center gap-2 text-admin-accent hover:underline text-xs font-bold"
                  >
                    <FileText size={14} />
                    View {item.docType}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    item.status === 'Approved' ? 'bg-green-100 text-green-600' :
                    item.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                    'bg-orange-100 text-orange-600'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {item.status === 'Pending' && (
                      <>
                        <button 
                          onClick={() => updateStatus(item.id, 'Approved')}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button 
                          onClick={() => updateStatus(item.id, 'Rejected')}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProviders.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic">No providers found in this category.</div>
        )}
      </div>
    </div>
  );
};

export default Verification;