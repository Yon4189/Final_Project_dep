import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  LayoutDashboard, UserCheck, Users, Wrench, Scale,
  BarChart3, Settings, LogOut, ClipboardList,
  ChevronDown, ChevronRight, Layers,
  Folder, Clock, CheckCircle, XCircle,
  User, Check, X, AlertCircle
} from 'lucide-react';
import logo from '../assets/logo.jpg';

const Sidebar = ({ width, onResizeStart, isOpen, isMobile, onClose }) => {
  const isMini = width < 160 && !isMobile;

  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Fetch stats using TanStack Query
  const { data: stats = {
    pending: 0,
    active: 0,
    rejected: 0,
    suspended: 0,
    customers: 0,
    providers: 0
  } } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data.success ? response.data.data : null;
    },
    refetchInterval: 30000, // Update every 30 seconds
  });


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
    <div
      style={{ width: `${width}px` }}
      className={`
        bg-slate-900 h-screen flex flex-col text-slate-400 overflow-y-auto 
        scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent 
        transition-[width] duration-75 ease-out shrink-0 relative z-20 group/sidebar
      `}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-30 group-hover/sidebar:w-1.5"
      />

      <div className="p-5 mb-2 border-b border-slate-800/50 flex flex-col items-center justify-center gap-4">
        <Link
          to="/"
          className="block transform transition-all active:scale-95"
          title="Go to Dashboard"
        >
          <div
            className="w-20 h-20 rounded-4xl flex items-center justify-center shadow-lg shadow-black/20 shrink-0 transform transition-all hover:scale-105 duration-500 overflow-hidden p-2"
            style={{ backgroundColor: '#DBDBDB' }}
          >
            <img
              src={logo}
              alt="HB_SFS Logo"
              className="w-full h-full object-contain scale-[1.35] transform-gpu"
            />
          </div>
        </Link>

        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white lg:hidden"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="flex-1 mt-4">
        {/* Dashboard */}
        <Link
          to="/"
          onClick={() => isMobile && onClose()}
          className={`group flex items-center px-6 py-4 mx-3 rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'gap-4' : 'justify-center'} ${location.pathname === '/'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40'
            : 'hover:bg-slate-800/50 hover:text-white'
            }`}
          title={isMini ? "Dashboard" : ""}
        >
          {location.pathname === '/' && (
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
          )}
          <LayoutDashboard
            size={20}
            className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${location.pathname === '/' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
            strokeWidth={location.pathname === '/' ? 2.5 : 2}
          />
          {!isMini && <span className={`text-sm tracking-wide overflow-hidden whitespace-nowrap transition-all duration-300 ${location.pathname === '/' ? 'font-bold' : 'font-medium'}`}>Dashboard</span>}
        </Link>

        {/* Manage Services */}
        <div className="mt-4 px-3">
          <button
            onClick={() => !isMini && setIsServicesOpen(!isServicesOpen)}
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isServicesActive ? 'bg-slate-800/80 text-white' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            title={isMini ? "Services" : ""}
          >
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <Folder
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isServicesActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isServicesActive ? 2.5 : 2}
              />
              {!isMini && <span className="text-sm font-medium tracking-wide overflow-hidden whitespace-nowrap">Services</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isServicesActive ? 'text-blue-400' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isServicesOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/services/categories" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/services/categories' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Categories
                </Link>
                <Link to="/services/services" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/services/services' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Provider Services
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Provider Verification */}
        <div className="mt-2 px-3">
          <button
            onClick={() => !isMini && setIsVerificationOpen(!isVerificationOpen)}
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isVerificationActive ? 'bg-slate-800/80 text-white' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            title={isMini ? "Verification" : ""}
          >
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <UserCheck
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isVerificationActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isVerificationActive ? 2.5 : 2}
              />
              {!isMini && <span className="text-sm font-medium tracking-wide">Verification</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isVerificationOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isVerificationActive ? 'text-blue-400' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isVerificationOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/verification/pending" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/pending' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  <span>Pending Queue</span>
                  {stats.pending > 0 && (
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.pending}
                    </span>
                  )}
                </Link>
                <Link to="/verification/approved" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/approved' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  <span>Approved</span>
                  {stats.active > 0 && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.active}
                    </span>
                  )}
                </Link>
                <Link to="/verification/rejected" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/rejected' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  <span>Rejected</span>
                  {stats.rejected > 0 && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.rejected}
                    </span>
                  )}
                </Link>
                <Link to="/verification/suspended" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/suspended' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  <span>Suspended</span>
                  {stats.suspended > 0 && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.suspended}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Management */}
        <div className="mt-2 px-3">
          <button
            onClick={() => !isMini && setIsUsersOpen(!isUsersOpen)}
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isUsersActive ? 'bg-slate-800/80 text-white' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            title={isMini ? "Users" : ""}
          >
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <Users
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isUsersActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isUsersActive ? 2.5 : 2}
              />
              {!isMini && <span className="text-sm font-medium tracking-wide">System Users</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isUsersOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isUsersActive ? 'text-blue-400' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isUsersOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/users/customers" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/users/customers' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  <span>Customers</span>
                  {stats.customers > 0 && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.customers}
                    </span>
                  )}
                </Link>
                <Link to="/users/providers" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/users/providers' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  <span>Providers</span>
                  {(stats.active + stats.suspended) > 0 && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.active + stats.suspended}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Service Bookings (with Pending added) */}
        <div className="mt-2 px-3">
          <button
            onClick={() => !isMini && setIsBookingsOpen(!isBookingsOpen)}
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isBookingsActive ? 'bg-slate-800/80 text-white' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            title={isMini ? "Bookings" : ""}
          >
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <ClipboardList
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isBookingsActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isBookingsActive ? 2.5 : 2}
              />
              {!isMini && <span className="text-sm font-medium tracking-wide">Bookings</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isBookingsOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isBookingsActive ? 'text-blue-400' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isBookingsOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/bookings/pending" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/pending' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Pending
                </Link>
                <Link to="/bookings/accepted" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/accepted' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Accepted
                </Link>
                <Link to="/bookings/completed" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/completed' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Completed
                </Link>
                <Link to="/bookings/rejected" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/rejected' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Rejected
                </Link>
                <Link to="/bookings/expired" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/expired' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Expired
                </Link>
                <Link to="/bookings/cancelled" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/cancelled' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Cancelled
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 mx-3 flex flex-col gap-1">
          {otherMenuItems.map((item) => {

            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && onClose()}
                className={`group flex items-center rounded-2xl transition-all duration-300 ${!isMini ? 'gap-4 px-6 py-3' : 'justify-center py-4'} ${isActive ? 'bg-slate-800/80 text-white' : 'hover:bg-slate-800/50 hover:text-white'
                  }`}
                title={isMini ? item.name : ""}
              >
                <Icon
                  size={20}
                  className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {!isMini && <span className={`text-sm tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="p-6 mt-auto">
        <button
          onClick={handleLogout}
          className={`group flex items-center rounded-2xl transition-all duration-300 w-full font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/0 hover:shadow-red-500/20 active:scale-95 ${!isMini ? 'gap-4 bg-transparent text-red-400 hover:text-white hover:bg-red-500 p-4' : 'justify-center py-6 text-red-500 hover:bg-red-500 hover:text-white'} `}
          title={isMini ? "Logout" : ""}
        >
          <LogOut size={18} className="group-hover:rotate-12 transition-transform shrink-0" />
          {!isMini && <span>Logout System</span>}
        </button>
      </div>




    </div>
  );
};

export default Sidebar;