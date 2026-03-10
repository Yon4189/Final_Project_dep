import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Settings, Menu, X, Loader2, Star, ShieldCheck, Layers, Wrench, Users as UsersIcon } from 'lucide-react';

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import NotificationDropdown from '../components/NotificationDropdown';

const Topbar = ({ onToggleSidebar }) => {
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

  const getBackendUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace('/api', '').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  };

  // Close search results and notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    switch (type) {
      case 'categories':
        navigate('/services/categories');
        break;
      case 'services':
        navigate('/services/services');
        break;
      case 'providers':
        navigate('/users/providers');
        break;
      case 'customers':
        navigate('/users/customers');
        break;
      default:
        break;
    }
  };

  return (
    <header className="h-16 bg-white flex items-center justify-between px-8 shadow-sm border-b border-slate-200 sticky top-0 z-10 transition-all duration-300">

      {/* LEFT: Toggle & Search Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-admin-accent active:scale-90"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="relative" ref={searchRef}>
          <div className={`flex items-center bg-slate-100 px-4 py-2 rounded-xl border transition-all shadow-inner w-96 group ${showResults ? 'border-admin-accent bg-white ring-4 ring-admin-accent/5' : 'border-slate-200'}`}>
            <Search size={18} className={`${showResults ? 'text-admin-accent' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search categoris, services, users..."
              className="bg-transparent border-none outline-none ml-2 text-sm w-full text-slate-700 placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowResults(false); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            {isSearching && (
              <Loader2 size={16} className="text-admin-accent animate-spin ml-2" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (
            <div className="absolute top-14 left-0 w-[30rem] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 z-50">
              <div className="max-h-[32rem] overflow-y-auto p-2 custom-scrollbar">

                {/* No Results State */}
                {!isSearching && searchResults &&
                  Object.values(searchResults).every(arr => arr.length === 0) && (
                    <div className="p-10 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search size={32} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-widest italic">No matches found</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Try another keyword</p>
                    </div>
                  )}

                {/* Categories */}
                {searchResults?.categories?.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-[10px] font-black text-admin-accent uppercase tracking-[0.2em] flex items-center gap-2">
                      <Layers size={12} /> Categories
                    </div>
                    {searchResults.categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleResultClick('categories', cat)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-2xl transition-all group flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                          <Layers size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-admin-accent">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Services */}
                {searchResults?.services?.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-[10px] font-black text-admin-accent uppercase tracking-[0.2em] flex items-center gap-2">
                      <Wrench size={12} /> Services
                    </div>
                    {searchResults.services.map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => handleResultClick('services', svc)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-2xl transition-all group flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center">
                          <Wrench size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-admin-accent">{svc.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Providers */}
                {searchResults?.providers?.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 text-[10px] font-black text-admin-accent uppercase tracking-[0.2em] flex items-center gap-2">
                      <ShieldCheck size={12} /> Providers
                    </div>
                    {searchResults.providers.map(prov => (
                      <button
                        key={prov.id}
                        onClick={() => handleResultClick('providers', prov)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-2xl transition-all group flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-green-50 text-green-500 rounded-lg flex items-center justify-center">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-admin-accent">{prov.name}</span>
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{prov.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Customers */}
                {searchResults?.customers?.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-black text-admin-accent uppercase tracking-[0.2em] flex items-center gap-2">
                      <UsersIcon size={12} /> Customers
                    </div>
                    {searchResults.customers.map(cust => (
                      <button
                        key={cust.id}
                        onClick={() => handleResultClick('customers', cust)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-2xl transition-all group flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-admin-accent">{cust.name}</span>
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{cust.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

              </div>
              <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Global Admin Search Active</p>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* RIGHT: Actions & Profile */}
      <div className="flex items-center gap-6">

        {/* Quick Action: Settings (Links to UC-07/System Config) */}
        <Link to="/settings" className="text-slate-400 hover:text-admin-accent transition-colors p-2 hover:bg-slate-50 rounded-full" title="Platform Settings">
          <Settings size={20} />
        </Link>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={`text-slate-400 hover:text-admin-accent relative p-2 rounded-full transition-all ${isNotificationOpen ? 'bg-slate-100 text-admin-accent' : 'hover:bg-slate-50'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold pointer-events-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown 
            isOpen={isNotificationOpen} 
            onUnreadCountUpdate={setUnreadCount} 
          />
        </div>

        {/* ✅ CLICKABLE PROFILE AREA (UC-12 Update Profile) */}
        <Link
          to="/profile"
          className="flex items-center gap-3 pl-4 border-l border-slate-200 hover:bg-slate-50 p-1 rounded-2xl transition-all group"
        >
          <div className="text-right hidden sm:block">
            {/* Display actual name from login */}
            <p className="text-sm font-black text-slate-800 group-hover:text-admin-accent transition-colors">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-[10px] text-admin-accent font-black uppercase tracking-tighter">
              System Administrator
            </p>
          </div>

          {/* Admin Avatar Circle */}
          <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden border-2 border-white ring-2 ring-slate-100">
            {user?.profilePicture ? (
              <img
                src={getBackendUrl(user.profilePicture)}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
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