import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, UserMinus, ShieldAlert, ShieldCheck,
  Mail, Phone, Database,
  CheckCircle, AlertCircle, RefreshCw, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api/axios';

// Sub-component for rendering the user avatar
const UserAvatar = ({ user }) => {
  const [imgError, setImgError] = useState(false);
  const baseUrl = `http://${window.location.hostname}:8000`;

  if (user.profilePicture && !imgError) {
    // If the image is a full URL (e.g., from Google auth)
    const isFullUrl = user.profilePicture.startsWith('http');

    // Check for common public directories
    const hasStoragePrefix = user.profilePicture.startsWith('storage/');
    const hasProfilesPrefix = user.profilePicture.startsWith('profiles/');
    const hasProfilePicsPrefix = user.profilePicture.startsWith('profilepics/');

    let imageUrl = user.profilePicture;
    if (!isFullUrl) {
      if (hasStoragePrefix || hasProfilesPrefix || hasProfilePicsPrefix) {
        // Remove leading slash if any to avoid double slashes
        const cleanPath = user.profilePicture.replace(/^\//, '');
        imageUrl = `${baseUrl}/${cleanPath}`;
      } else {
        const cleanPath = user.profilePicture.replace(/^\//, '');
        imageUrl = `${baseUrl}/storage/${cleanPath}`;
      }
    }

    return (
      <img
        src={imageUrl}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 uppercase flex-shrink-0">
      {user.name?.charAt(0)}
    </div>
  );
};


console.log("loaded file: Users.jsx");

const Users = () => {
  console.log("COMPONENT RENDERING: Users component started");
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    console.log('Admin token on page load:', token);

    if (!token) {
      console.log('No admin token found! Redirecting to login...');
      // Optionally redirect to login page
      // navigate('/admin/login');
    }
  }, []);

  // Update userType when route changes
  useEffect(() => {
    setUserType(getUserTypeFromPath());
    setCurrentPage(1);
  }, [location.pathname]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // 3. Mock Data (replace with API call)
  // mock data was here. its removed 

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const url = userType === "Provider" ? "/admin/providers" : "/admin/customers";
      console.log("Fetching from URL:", url); // Log the URL being

      // fetching data from backedn
      const apiResponse = await api.get(url);
      console.log("Raw API data: ", apiResponse.data);

      const responseData = apiResponse.data.data || [];

      // mapping backend fields with frontend fields
      const mappedUsers = responseData.map(u => {
        // Normalize status to Title Case (Active, Suspended, Approved, Rejected)
        const rawStatus = (u.status || "Active").toLowerCase();
        let normalizedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

        return {
          id: u.customerID || u.providerID,
          name: u.fullname,
          email: u.email,
          phone: u.phone,
          type: userType,
          status: normalizedStatus,
          location: u.location || u.service_city || "Not Provided",
          profilePicture: u.profilePicture || null,
          joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : ""
        };
      });

      setUsers(mappedUsers);

      setDbStatus('connected');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users');
      setDbStatus('disconnected');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(true);
    const interval = setInterval(() => {
      fetchUsers(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [userType]); // refetch when userType changes

  // 4. Action Handlers
  const toggleUserStatus = async (id, currentStatus) => {
    const action = currentStatus === 'Active' ? 'SUSPEND' : 'ACTIVATE';
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

    try {
      const url = userType === "Provider"
        ? `/admin/providers/${id}/status`
        : `/admin/customers/${id}/status`;

      // call backend to update status
      await api.patch(url, { status: currentStatus === 'Active' ? 'Suspended' : 'Active' });

      // update frontend state
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, status: currentStatus === 'Active' ? 'Suspended' : 'Active' } : u
      ));

    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`PERMANENTLY DELETE ${name}? This cannot be undone.`)) return;

    try {
      const url = userType === "Provider"
        ? `/admin/providers/${id}`
        : `/admin/customers/${id}`;

      // call backend to delete user
      await api.delete(url);

      // remove from frontend
      setUsers(prev => prev.filter(u => u.id !== id));

    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);


  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header with Database Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">
              {userType} Management
            </h1>
            {users.length > 0 && (
              <span className="bg-blue-600 text-white text-[12px] px-3 py-1 rounded-full font-black shadow-lg shadow-blue-200 animate-in zoom-in duration-300">
                {users.length}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest italic mt-1">
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
                  <th className="px-8 py-5">Contact</th>
                  <th className="px-8 py-5">Location</th>
                  <th className="px-8 py-5">Joined</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentItems.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <UserAvatar user={u} />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 leading-none">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium mt-1 truncate max-w-[120px] uppercase tracking-tighter italic">
                            ID: {u.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Mail size={12} className="shrink-0" />
                          <span className="text-xs font-medium truncate max-w-[150px]">{u.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Phone size={12} className="shrink-0" />
                          <span className="text-xs font-medium tracking-tighter">{u.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-100 p-2 rounded-lg">
                          <Database size={14} className="text-slate-400" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px] italic">
                          {u.location}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border tracking-[0.1em] italic ${u.status === 'Active' ? 'bg-green-50 text-green-600 border-green-200' :
                        u.status === 'Suspended' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' :
                          'bg-red-50 text-red-600 border-red-200'
                        }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        {u.joined}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {u.status === 'Suspended' ? (
                          <button
                            onClick={() => toggleUserStatus(u.id, u.status)}
                            className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-xl shadow-lg shadow-green-100 transition-all hover:rotate-6 active:scale-95"
                            title="Reactivate User"
                          >
                            <ShieldCheck size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleUserStatus(u.id, u.status)}
                            className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl shadow-lg shadow-amber-100 transition-all hover:-rotate-6 active:scale-95"
                            title="Suspend User"
                          >
                            <ShieldAlert size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl shadow-lg shadow-red-100 transition-all hover:scale-110 active:scale-90"
                          title="Permanent Delete"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && dbStatus === 'connected' && filteredUsers.length > itemsPerPage && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Entries {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length}
            </span>
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => paginate(currentPage - 1)}
                className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
                className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all text-slate-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};