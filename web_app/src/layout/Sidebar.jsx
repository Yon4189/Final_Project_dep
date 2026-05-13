import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getWithdrawals } from '../api/withdrawal';
import {
  LayoutDashboard, UserCheck, Users, Wrench, Scale,
  BarChart3, Settings, LogOut, ClipboardList,
  ChevronDown, ChevronRight, Layers,
  Folder, Clock, CheckCircle, XCircle,
  User, Check, X, AlertCircle, Wallet
} from 'lucide-react';
import logo from '../assets/logo.jpg';

const Sidebar = ({ width, onResizeStart, isOpen, isMobile, onClose }) => {
  const { t } = useTranslation();
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

  // Fetch pending withdrawals count
  const { data: withdrawalData } = useQuery({
    queryKey: ['pendingWithdrawals'],
    queryFn: async () => {
      const response = await getWithdrawals({ status: 'pending', per_page: 1 });
      return response.success ? response.data : null;
    },
    refetchInterval: 30000, // Update every 30 seconds
  });

  const pendingWithdrawalsCount = withdrawalData?.total || 0;

  // Fetch admin settings for dynamic branding
  const { data: adminSettings } = useQuery({
    queryKey: ['adminSettings'],
    queryFn: async () => {
      const response = await api.get('/admin/settings');
      return response.data.success ? response.data.data : null;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const dynamicLogo = adminSettings?.branding?.logoUrl || logo;
  const systemName = adminSettings?.branding?.systemName || "Ethio HandyMan";

  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [isBookingsOpen, setIsBookingsOpen] = useState(false);

  const otherMenuItems = [
    { name: t('sidebar_my_profile'), path: '/admin/profile', icon: User },
    { name: t('sidebar_dispute_resolution'), path: '/admin/disputes', icon: Scale },
    { name: t('sidebar_payment_analytics'), path: '/admin/payments', icon: BarChart3 },
    { name: t('settings'), path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = () => {
    if (window.confirm(t('logout_confirm', { defaultValue: "Are you sure you want to logout from the Admin panel?" }))) {
      logout();
      navigate('/login');
    }
  };

  const isServicesActive = location.pathname.startsWith('/admin/services');
  const isVerificationActive = location.pathname.startsWith('/admin/verification');
  const isUsersActive = location.pathname.startsWith('/admin/users');
  const isBookingsActive = location.pathname.startsWith('/admin/bookings');

  return (
    <div
      style={{ width: `${width}px` }}
      className={`
        bg-admin-sidebar h-screen flex flex-col text-slate-400 overflow-y-auto 
        scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent 
        transition-[width] duration-75 ease-out shrink-0 relative z-20 group/sidebar border-r border-white/5
      `}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-30 group-hover/sidebar:w-1.5"
      />

      <div className="p-5 mb-2 border-b border-admin-border/50 flex flex-col items-center justify-center gap-4">
        <Link
          to="/admin"
          className="block transform transition-all active:scale-95"
          title="Go to Dashboard"
        >
          <div
            className="w-20 h-20 rounded-4xl flex items-center justify-center shadow-lg shadow-black/20 shrink-0 transform transition-all hover:scale-105 duration-500 overflow-hidden p-2"
            style={{ backgroundColor: '#DBDBDB' }}
          >
            <img
              src={dynamicLogo}
              alt={`${systemName} Logo`}
              className="w-full h-full object-contain scale-[1.35] transform-gpu"
              onError={(e) => { e.target.src = logo; }}
            />
          </div>
        </Link>

        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white lg:hidden"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <nav className="flex-1 mt-4">
        {/* Dashboard */}
        <Link
          to="/admin"
          onClick={() => isMobile && onClose()}
          className={`group flex items-center px-6 py-4 mx-3 rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'gap-4' : 'justify-center'} ${location.pathname === '/admin'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40'
            : 'hover:bg-white/5 hover:text-white'
            }`}
          title={isMini ? t('sidebar_dashboard') : ""}
        >
          {location.pathname === '/admin' && (
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
          )}
          <LayoutDashboard
            size={20}
            className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${location.pathname === '/admin' ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
            strokeWidth={location.pathname === '/admin' ? 2.5 : 2}
          />
          {!isMini && <span className={`text-sm tracking-wide overflow-hidden whitespace-nowrap transition-all duration-300 ${location.pathname === '/admin' ? 'font-bold' : 'font-medium'}`}>{t('sidebar_dashboard')}</span>}
        </Link>

        {/* Manage Services */}
        <div className="mt-4 px-3">
          <button
            onClick={() => !isMini && setIsServicesOpen(!isServicesOpen)}
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isServicesActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-white/5 hover:text-white'
              }`}
            title={isMini ? t('sidebar_services') : ""}
          >
            {isServicesActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
            )}
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <Folder
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isServicesActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isServicesActive ? 2.5 : 2}
              />
              {!isMini && <span className={`text-sm tracking-wide overflow-hidden whitespace-nowrap ${isServicesActive ? 'font-bold' : 'font-medium'}`}>{t('sidebar_services')}</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isServicesActive ? 'text-white/70' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isServicesOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/admin/services/categories" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/services/categories' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_categories')}
                </Link>
                <Link to="/admin/services/services" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/services/services' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_provider_services')}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Provider Verification */}
        <div className="mt-2 px-3">
          <button
            onClick={() => !isMini && setIsVerificationOpen(!isVerificationOpen)}
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isVerificationActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-white/5 hover:text-white'
              }`}
            title={isMini ? "Verification" : ""}
          >
            {isVerificationActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
            )}
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <UserCheck
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isVerificationActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isVerificationActive ? 2.5 : 2}
              />
              {!isMini && <span className={`text-sm tracking-wide ${isVerificationActive ? 'font-bold' : 'font-medium'}`}>{t('sidebar_verification')}</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isVerificationOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isVerificationActive ? 'text-white/70' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isVerificationOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/admin/verification/pending" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/verification/pending' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>{t('sidebar_pending_queue')}</span>
                  {stats.pending > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.pending}
                    </span>
                  )}
                </Link>
                <Link to="/admin/verification/approved" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/verification/approved' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>{t('sidebar_approved')}</span>
                  {stats.active > 0 && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.active}
                    </span>
                  )}
                </Link>
                <Link to="/admin/verification/rejected" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/verification/rejected' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>{t('sidebar_rejected')}</span>
                  {stats.rejected > 0 && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.rejected}
                    </span>
                  )}
                </Link>
                <Link to="/admin/verification/suspended" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/verification/suspended' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>{t('sidebar_suspended')}</span>
                  {stats.suspended > 0 && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
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
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isUsersActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-white/5 hover:text-white'
              }`}
            title={isMini ? "Users" : ""}
          >
            {isUsersActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
            )}
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <Users
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isUsersActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isUsersActive ? 2.5 : 2}
              />
              {!isMini && <span className={`text-sm tracking-wide ${isUsersActive ? 'font-bold' : 'font-medium'}`}>{t('sidebar_system_users')}</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isUsersOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isUsersActive ? 'text-white/70' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isUsersOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/admin/users/customers" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/users/customers' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>{t('sidebar_customers')}</span>
                  {stats.customers > 0 && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
                      {stats.customers}
                    </span>
                  )}
                </Link>
                <Link to="/admin/users/providers" onClick={() => isMobile && onClose()} className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/users/providers' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span>{t('sidebar_providers')}</span>
                  {(stats.active + stats.suspended) > 0 && (
                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center">
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
            className={`group w-full flex items-center rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'justify-between px-6 py-4' : 'justify-center py-4'} ${isBookingsActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-white/5 hover:text-white'
              }`}
            title={isMini ? "Bookings" : ""}
          >
            {isBookingsActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
            )}
            <div className={`flex items-center ${!isMini ? 'gap-4' : 'justify-center'}`}>
              <ClipboardList
                size={20}
                className={`shrink-0 transition-colors duration-300 ${isBookingsActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
                strokeWidth={isBookingsActive ? 2.5 : 2}
              />
              {!isMini && <span className={`text-sm tracking-wide ${isBookingsActive ? 'font-bold' : 'font-medium'}`}>{t('sidebar_bookings')}</span>}
            </div>
            {!isMini && (
              <div className={`transition-transform duration-300 ${isBookingsOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} className={isBookingsActive ? 'text-white/70' : 'text-slate-600'} />
              </div>
            )}
          </button>

          {!isMini && (
            <div className={`grid transition-all duration-300 ease-in-out ${isBookingsOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
              <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-4">
                <Link to="/admin/bookings/pending" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/bookings/pending' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_pending_queue')}
                </Link>
                <Link to="/admin/bookings/accepted" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/bookings/accepted' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_accepted')}
                </Link>
                <Link to="/admin/bookings/completed" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/bookings/completed' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_completed')}
                </Link>
                <Link to="/admin/bookings/rejected" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/bookings/rejected' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_rejected')}
                </Link>
                <Link to="/admin/bookings/expired" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/bookings/expired' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_expired')}
                </Link>
                <Link to="/admin/bookings/cancelled" onClick={() => isMobile && onClose()} className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all text-xs font-medium ${location.pathname === '/admin/bookings/cancelled' ? 'text-white bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  {t('sidebar_cancelled')}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Withdrawals */}
        <Link
          to="/admin/withdrawals"
          onClick={() => isMobile && onClose()}
          className={`group flex items-center mx-3 mt-2 px-6 py-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'gap-4' : 'justify-center'} ${location.pathname.startsWith('/admin/withdrawals')
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40'
            : 'hover:bg-white/5 hover:text-white'
            }`}
          title={isMini ? "Withdrawals" : ""}
        >
          {location.pathname.startsWith('/admin/withdrawals') && (
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
          )}
          <Wallet
            size={20}
            className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${location.pathname.startsWith('/admin/withdrawals') ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
            strokeWidth={location.pathname.startsWith('/admin/withdrawals') ? 2.5 : 2}
          />
          {!isMini && (
            <div className="flex items-center justify-between flex-1">
              <span className={`text-sm tracking-wide overflow-hidden whitespace-nowrap transition-all duration-300 ${location.pathname.startsWith('/admin/withdrawals') ? 'font-bold' : 'font-medium'}`}>
                Withdrawals
              </span>
              {pendingWithdrawalsCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center ${location.pathname.startsWith('/admin/withdrawals') ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                  {pendingWithdrawalsCount}
                </span>
              )}
            </div>
          )}
        </Link>

        <div className="mt-4 mx-3 flex flex-col gap-1">
          {otherMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && onClose()}
                className={`group flex items-center rounded-2xl transition-all duration-300 relative overflow-hidden ${!isMini ? 'gap-4 px-6 py-3' : 'justify-center py-4'} ${isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-white/5 hover:text-white'
                  }`}
                title={isMini ? item.name : ""}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white rounded-r-full" />
                )}
                <Icon
                  size={20}
                  className={`shrink-0 transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}
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
          {!isMini && <span>{t('sidebar_logout')}</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;