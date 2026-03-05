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

const Sidebar = ({ width, onResizeStart, isOpen }) => {
  const isMini = width < 160;

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

      <div className={`p-8 mb-4 border-b border-slate-800/50 flex items-center ${!isMini ? 'gap-3' : 'justify-center'}`}>
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <Wrench className="text-white" size={20} />
        </div>
        {!isMini && (
          <div className="flex flex-col overflow-hidden whitespace-nowrap">
            <span className="text-white font-black tracking-tighter text-xl italic leading-none">HB_SFS</span>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em] mt-1">Admin Panel</span>
          </div>
        )}
      </div>

      <nav className="flex-1 mt-4">
        {/* Dashboard */}
        <Link
          to="/"
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
                <Link to="/services/categories" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/services/categories' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Categories
                </Link>
                <Link to="/services/services" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/services/services' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
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
                <Link to="/verification/pending" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/pending' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Pending Queue
                </Link>
                <Link to="/verification/approved" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/approved' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Approved
                </Link>
                <Link to="/verification/rejected" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/rejected' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Rejected
                </Link>
                <Link to="/verification/suspended" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/verification/suspended' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Suspended
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
              {!isMini && <span className="text-sm font-medium tracking-wide">Users</span>}
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
                <Link to="/users/customers" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/users/customers' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Customers
                </Link>
                <Link to="/users/providers" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/users/providers' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Providers
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
                <Link to="/bookings/pending" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/pending' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Pending
                </Link>
                <Link to="/bookings/accepted" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/accepted' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Accepted
                </Link>
                <Link to="/bookings/completed" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/completed' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
                  Completed
                </Link>
                <Link to="/bookings/cancelled" className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/bookings/cancelled' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>
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