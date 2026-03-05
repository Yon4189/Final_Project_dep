import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, UserCheck, Users, Wrench, Scale,
  BarChart3, Settings, LogOut, ClipboardList,
  ChevronDown, ChevronRight, Layers,
  Folder, Clock, CheckCircle, XCircle,
  User, Check, X, AlertCircle
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isBookingsOpen, setIsBookingsOpen] = useState(false);

  const otherMenuItems = [
    { name: 'My Profile', path: '/profile', icon: User },
    { name: 'Dispute Resolution', path: '/disputes', icon: Scale },
    { name: 'Payment Analytics', path: '/payments', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout from the Admin panel?")) {
      logout();
      navigate('/login');
    }
  };

  const isServicesActive = location.pathname.startsWith('/services');
  const isVerificationActive = location.pathname.startsWith('/verification');
  const isUsersActive = location.pathname.startsWith('/users');
  const isBookingsActive = location.pathname.startsWith('/bookings');

  return (
    <div className="w-64 bg-admin-sidebar h-screen flex flex-col text-slate-400">
      <div className="p-6 text-xl font-bold text-white border-b border-slate-700 flex items-center gap-2">
        <span className="text-admin-accent font-black">HB_SFS</span>
      </div>

      <nav className="flex-1 mt-4">
        {/* Dashboard */}
        <Link
          to="/"
          className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 ${location.pathname === '/'
              ? 'bg-admin-accent text-white shadow-lg border-r-4 border-white'
              : 'hover:bg-slate-800 hover:text-white'
            }`}
        >
          <LayoutDashboard size={20} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>

        {/* Manage Services */}
        <div className="mt-2">
          <button
            onClick={() => setIsServicesOpen(!isServicesOpen)}
            className={`w-full flex items-center justify-between px-6 py-3 transition-all duration-200 ${isServicesActive ? 'bg-admin-accent text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
          >
            <span className="flex items-center gap-3">
              <Folder size={20} strokeWidth={isServicesActive ? 2.5 : 2} />
              <span className="text-sm font-medium">Manage Services</span>
            </span>
            {isServicesOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {isServicesOpen && (
            <div className="ml-4 mt-1 flex flex-col">
              <Link to="/services/categories" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/services/categories' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <Layers size={16} /> <span className="text-sm">Categories</span>
              </Link>
              <Link to="/services/services" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/services/services' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <Wrench size={16} /> <span className="text-sm">Provider Services</span>
              </Link>
            </div>
          )}
        </div>

        {/* Provider Verification */}
        <div className="mt-2">
          <button
            onClick={() => setIsVerificationOpen(!isVerificationOpen)}
            className={`w-full flex items-center justify-between px-6 py-3 transition-all ${isVerificationActive ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'
              }`}
          >
            <span className="flex items-center gap-3">
              <UserCheck size={20} strokeWidth={isVerificationActive ? 2.5 : 2} />
              <span className="text-sm font-medium">Provider Verification</span>
            </span>
            {isVerificationOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {isVerificationOpen && (
            <div className="ml-4 mt-1 flex flex-col">
              <Link to="/verification/pending" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/verification/pending' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <Clock size={16} /> <span className="text-sm">Pending</span>
              </Link>
              <Link to="/verification/approved" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/verification/approved' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <CheckCircle size={16} /> <span className="text-sm">Approved</span>
              </Link>
              <Link to="/verification/rejected" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/verification/rejected' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <XCircle size={16} /> <span className="text-sm">Rejected</span>
              </Link>
              <Link to="/verification/suspended" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/verification/suspended' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <AlertCircle size={16} /> <span className="text-sm">Suspended</span>
              </Link>
            </div>
          )}
        </div>

        {/* User Management */}
        <div className="mt-2">
          <button
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            className={`w-full flex items-center justify-between px-6 py-3 transition-all ${isUsersActive ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'
              }`}
          >
            <span className="flex items-center gap-3">
              <Users size={20} strokeWidth={isUsersActive ? 2.5 : 2} />
              <span className="text-sm font-medium">User Management</span>
            </span>
            {isUsersOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {isUsersOpen && (
            <div className="ml-4 mt-1 flex flex-col">
              <Link to="/users/customers" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/users/customers' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <User size={16} /> <span className="text-sm">Customers</span>
              </Link>
              <Link to="/users/providers" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/users/providers' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <Users size={16} /> <span className="text-sm">Providers</span>
              </Link>
            </div>
          )}
        </div>

        {/* Service Bookings (with Pending added) */}
        <div className="mt-2">
          <button
            onClick={() => setIsBookingsOpen(!isBookingsOpen)}
            className={`w-full flex items-center justify-between px-6 py-3 transition-all ${isBookingsActive ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'
              }`}
          >
            <span className="flex items-center gap-3">
              <ClipboardList size={20} strokeWidth={isBookingsActive ? 2.5 : 2} />
              <span className="text-sm font-medium">Service Bookings</span>
            </span>
            {isBookingsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          {isBookingsOpen && (
            <div className="ml-4 mt-1 flex flex-col">
              <Link to="/bookings/pending" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/bookings/pending' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <Clock size={16} /> <span className="text-sm">Pending</span>
              </Link>
              <Link to="/bookings/accepted" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/bookings/accepted' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <Check size={16} /> <span className="text-sm">Accepted</span>
              </Link>
              <Link to="/bookings/completed" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/bookings/completed' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <CheckCircle size={16} /> <span className="text-sm">Completed</span>
              </Link>
              <Link to="/bookings/cancelled" className={`flex items-center gap-3 px-6 py-2.5 transition-all ${location.pathname === '/bookings/cancelled' ? 'bg-admin-accent text-white' : 'hover:bg-slate-800'}`}>
                <X size={16} /> <span className="text-sm">Cancelled</span>
              </Link>
            </div>
          )}
        </div>

        {/* Other menu items */}
        {otherMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-6 py-3 transition-all ${isActive ? 'bg-admin-accent text-white shadow-lg border-r-4 border-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-6 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-3 rounded-xl transition-all w-full font-black text-xs uppercase tracking-widest"
        >
          <LogOut size={18} />
          Logout System
        </button>
      </div>
    </div>
  );
};

export default Sidebar;