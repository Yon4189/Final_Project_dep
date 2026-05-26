import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Menu, X, Loader2, Star, ShieldCheck, Layers, Wrench, Users as UsersIcon, Sun, Moon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import NotificationDropdown from '../components/NotificationDropdown';
import { useTheme } from '../context/ThemeContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Topbar = ({ onToggleSidebar, isMobile }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const getBackendUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = api.defaults.baseURL.replace('/api', '').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  };

  // Close search results and notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        if (isMobile) setIsSearchExpanded(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        setShowResults(true);
        try {
          const response = await api.get(`/admin/search?query=${searchQuery}`);
          setSearchResults(response.data.data);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults(null);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleResultClick = (type, item) => {
    setSearchQuery('');
    setSearchResults(null);
    setShowResults(false);
    if (isMobile) setIsSearchExpanded(false);

    switch (type) {
      case 'categories':
        navigate('/admin/services/categories');
        break;
      case 'services':
        navigate('/admin/services/services');
        break;
      case 'providers':
        navigate('/admin/users/providers');
        break;
      case 'customers':
        navigate('/admin/users/customers');
        break;
      default:
        break;
    }
  };

  return (
    <header className={`h-16 shrink-0 relative z-40 bg-admin-sidebar flex items-center justify-between ${isMobile ? 'px-4' : 'px-8'} shadow-sm border-b border-white/5 transition-colors duration-300`}>
      {/* Left: Toggle & Search */}
      <div className="flex-1 flex items-center gap-2 md:gap-4 min-w-0">
        {!isSearchExpanded && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            title={t('sidebar_dashboard')}
          >
            <Menu size={20} />
          </button>
        )}

        <div className={`relative ${isSearchExpanded ? 'flex-1' : 'flex-initial'}`} ref={searchRef}>
          <div
            className={`flex items-center bg-white/5 border rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${showResults ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-white/10'
              } ${isMobile ? (isSearchExpanded ? 'w-full px-4 py-2' : 'w-10 h-10 justify-center cursor-pointer') : 'w-64 lg:w-96 px-4 py-2'}`}
            onClick={() => isMobile && !isSearchExpanded && setIsSearchExpanded(true)}
          >
            <Search size={18} className={`${showResults ? 'text-blue-500' : 'text-slate-400'} shrink-0`} />
            {(isSearchExpanded || !isMobile) && (
              <input
                type="text"
                placeholder={isMobile ? t('topbar_search') : t('topbar_search_placeholder')}
                className="bg-transparent border-none outline-none ml-2 text-sm w-full text-white placeholder:text-slate-500"
                value={searchQuery}
                autoFocus={isMobile && isSearchExpanded}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              />
            )}
            {searchQuery && (isSearchExpanded || !isMobile) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  setShowResults(false);
                  if (isMobile) setIsSearchExpanded(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            )}
            {isSearching && (
              <Loader2 size={16} className="text-blue-500 animate-spin ml-2 shrink-0" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className={`absolute top-14 left-0 ${isMobile ? 'w-[calc(100vw-2rem)] fixed left-4 right-4' : 'w-[30rem]'} bg-admin-card rounded-2xl shadow-lg border border-admin-border overflow-hidden z-50`}>
              <div className="max-h-[70vh] md:max-h-[32rem] overflow-y-auto p-2">
                {/* No Results */}
                {!isSearching && searchResults && Object.values(searchResults).every(arr => arr.length === 0) && (
                  <div className="p-10 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search size={32} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">{t('topbar_no_results')}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('topbar_try_another')}</p>
                  </div>
                )}

                {/* Categories */}
                {searchResults?.categories?.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                      <Layers size={14} /> {t('sidebar_categories')}
                    </div>
                    {searchResults.categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleResultClick('categories', cat)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <Layers size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Services */}
                {searchResults?.services?.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                      <Wrench size={14} /> {t('sidebar_services')}
                    </div>
                    {searchResults.services.map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => handleResultClick('services', svc)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                          <Wrench size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{svc.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Providers */}
                {searchResults?.providers?.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={14} /> {t('sidebar_providers')}
                    </div>
                    {searchResults.providers.map(prov => (
                      <button
                        key={prov.id}
                        onClick={() => handleResultClick('providers', prov)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{prov.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">{prov.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Customers */}
                {searchResults?.customers?.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                      <UsersIcon size={14} /> {t('sidebar_customers')}
                    </div>
                    {searchResults.customers.map(cust => (
                      <button
                        key={cust.id}
                        onClick={() => handleResultClick('customers', cust)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-admin-text">{cust.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase">{cust.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-admin-card p-3 text-center border-t border-admin-border">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('topbar_global_search')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />


        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          title={isDarkMode ? t('topbar_switch_light') : t('topbar_switch_dark')}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`text-slate-400 hover:text-white relative p-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${isNotificationOpen ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
            title={t('topbar_notifications')}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown
            isOpen={isNotificationOpen}
            onUnreadCountUpdate={setUnreadCount}
          />
        </div>

        {/* Profile */}
        <Link
          to="/admin/profile"
          className="flex items-center gap-3 pl-4 border-l border-white/10 hover:bg-white/5 p-1 rounded-2xl transition-all group"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-tighter">
              {t('topbar_system_admin')}
            </p>
          </div>

          <div className="w-10 h-10 bg-white/10 text-slate-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden border-2 border-white/20 ring-2 ring-white/5">
            {user?.profilePicture ? (
              <img
                src={getBackendUrl(user.profilePicture)}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-full h-full items-center justify-center"
              style={{ display: user?.profilePicture ? 'none' : 'flex' }}
            >
              <User size={20} />
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Topbar;