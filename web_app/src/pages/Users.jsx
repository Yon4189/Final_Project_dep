import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, UserMinus, ShieldAlert, ShieldCheck,
  Mail, Phone, Database,
  CheckCircle, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import api from '../api/axios';

const Users = () => {
  const location = useLocation();

  // Determine user type from URL
  const getUserTypeFromPath = () => {
    if (location.pathname.includes('/users/customers')) return 'Customer';
    if (location.pathname.includes('/users/providers')) return 'Provider';
    return 'Customer'; // default
  };



  // 1. Data State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState('checking');
  const [userType, setUserType] = useState(getUserTypeFromPath()); // from path

  // 2. UI State
  const [searchQuery, setSearchQuery] = useState('');

  // Update userType when route changes
  useEffect(() => {
    setUserType(getUserTypeFromPath());
  }, [location.pathname]);

  // 3. Mock Data (replace with API call)
  // mock data was here. its removed 
  
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = userType === "Provider" ? "/admin/providers" : "/admin/customers";
      console.log("Fetching from URL:", url); // Log the URL being

      // fetching data from backedn
      const apiResponse = await api.get(url);
      console.log("Raw API data: ", apiResponse.data);

      // mapping backend fields with frontend fields
      const mappedUsers = apiResponse.data.map(u => ({
        id: u.customerID || u.providerID,
        name: u.fullname,
        email: u.email,
        phone: u.phone,
        type: userType,
        status: u.status || "Active",
        joined: u.created_at? new Date(u.created_at).toLocaleDateString() : ""

      }));

      setUsers(mappedUsers);
      
      setDbStatus('connected');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users');
      setDbStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userType]); // refetch when userType changes (could pass as param to API)

  // 4. Action Handlers
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

  // 5. Filtering Logic
   // 5. Filtering Logic
  const filteredUsers = users.filter(u => {
    const matchesType = u.type === userType;
    // Ensure u.name and u.email are strings before calling toLowerCase()
    const userName = u.name ? String(u.name).toLowerCase() : '';
    const userEmail = u.email ? String(u.email).toLowerCase() : '';
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch = userName.includes(searchLower) || 
                          userEmail.includes(searchLower);
    return matchesType && matchesSearch;
  });


  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header with Database Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight italic">
            {userType} Management
          </h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">
            Manage {userType.toLowerCase()} accounts and permissions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Database size={16} className={
              dbStatus === 'connected' ? 'text-green-500' :
              dbStatus === 'disconnected' ? 'text-red-500' :
              'text-yellow-500 animate-pulse'
            } />
            <span className="text-xs font-black uppercase tracking-wider">
              {dbStatus === 'connected' && 'Database Connected'}
              {dbStatus === 'disconnected' && 'Database Disconnected'}
              {dbStatus === 'checking' && 'Checking Database...'}
            </span>
            {dbStatus === 'connected' && <CheckCircle size={14} className="text-green-500" />}
            {dbStatus === 'disconnected' && <AlertCircle size={14} className="text-red-500" />}
          </div>

          <button
            onClick={fetchUsers}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 transition-all shadow-sm"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Bar (tabs removed – now controlled by sidebar) */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder={`Search ${userType.toLowerCase()} by name or email...`}
          className="pl-10 pr-4 py-3 border border-slate-200 rounded-2xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* User Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading users...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-20">
            <AlertCircle className="text-red-500" size={40} />
            <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-xs bg-slate-100 px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No {userType.toLowerCase()}s found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5">User Details</th>
                  <th className="px-8 py-5">Role</th>
                  <th className="px-8 py-5">Contact</th>
                  <th className="px-8 py-5">Joined</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
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
                    <td className="px-8 py-5">
                      <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                        user.type === 'Provider' ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50'
                      }`}>
                        {user.type}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Mail size={12} /> {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Phone size={12} /> {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500">{user.joined}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        user.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-3">
                        {user.status === 'Active' ? (
                          <button
                            onClick={() => toggleUserStatus(user.id, user.status)}
                            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                          >
                            <ShieldAlert size={16} /> Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleUserStatus(user.id, user.status)}
                            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                          >
                            <ShieldCheck size={16} /> Activate
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user.id, user.name)}
                          className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95"
                        >
                          <UserMinus size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;