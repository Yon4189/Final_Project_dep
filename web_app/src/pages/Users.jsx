import React, { useState } from 'react';
import { 
  Search, UserMinus, ShieldAlert, ShieldCheck, 
  Mail, Phone, MoreHorizontal 
} from 'lucide-react';

const Users = () => {
  // 1. Mock Data for all platform users
  const [users, setUsers] = useState([
    { id: "USR-001", name: "Yoseph Tilahun", email: "yoseph@bdu.edu.et", phone: "+251 911 1111", type: "Provider", status: "Active", joined: "Jan 2026" },
    { id: "USR-002", name: "Yonas Abate", email: "yonas@bdu.edu.et", phone: "+251 922 2222", type: "Customer", status: "Active", joined: "Jan 2026" },
    { id: "USR-003", name: "Nathenael Yacob", email: "naty@bdu.edu.et", phone: "+251 933 3333", type: "Provider", status: "Suspended", joined: "Dec 2025" },
    { id: "USR-004", name: "Abebe Balcha", email: "abebe@gmail.com", phone: "+251 944 4444", type: "Customer", status: "Active", joined: "Feb 2026" },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  // 2. Action Handlers
  const toggleUserStatus = (id, currentStatus) => {
    const action = currentStatus === 'Active' ? 'SUSPEND' : 'ACTIVATE';
    if (window.confirm(`Are you sure you want to ${action} this account?`)) {
      setUsers(prev => prev.map(u => 
        u.id === id ? { ...u, status: currentStatus === 'Active' ? 'Suspended' : 'Active' } : u
      ));
    }
  };

  const deleteUser = (id, name) => {
    if (window.confirm(`PERMANENTLY DELETE ${name}? This cannot be undone.`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  // 3. Filtering Logic
  const filteredUsers = users.filter(u => {
    const matchesTab = activeTab === 'All' || u.type === activeTab;
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">Control access and manage platform participants.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-full md:w-80 focus:outline-none focus:border-admin-accent bg-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs for Role Filtering */}
      <div className="flex gap-4 border-b border-slate-200">
        {['All', 'Customer', 'Provider'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 text-sm font-bold transition-all ${
              activeTab === tab 
              ? 'border-b-2 border-admin-accent text-admin-accent' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">User Details</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
  {filteredUsers.map((user) => (
    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900">{user.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{user.id}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
          user.type === 'Provider' ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50'
        }`}>
          {user.type}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-xs text-slate-600"><Mail size={12}/> {user.email}</div>
          <div className="flex items-center gap-1 text-xs text-slate-600"><Phone size={12}/> {user.phone}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">{user.joined}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
          user.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {user.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          {/* ✅ DYNAMIC SOLID SUSPEND/ACTIVATE BUTTON */}
          {user.status === 'Active' ? (
            <button 
              onClick={() => toggleUserStatus(user.id, user.status)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <ShieldAlert size={14} />
              Suspend
            </button>
          ) : (
            <button 
              onClick={() => toggleUserStatus(user.id, user.status)}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <ShieldCheck size={14} />
              Activate
            </button>
          )}

          {/* ✅ SOLID RED DELETE BUTTON */}
          <button 
            onClick={() => deleteUser(user.id, user.name)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <UserMinus size={14} />
            Delete
          </button>
        </div>
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;