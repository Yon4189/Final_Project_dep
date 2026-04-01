import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Info, AlertTriangle, Wallet, BellOff, Check, ShieldCheck, Star } from 'lucide-react';
import api from '../api/axios';

const NotificationDropdown = ({ isOpen, onUnreadCountUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/notifications?filter=unread');
      const responseData = response.data;

      // Backend returns: { success: true, data: { notifications: {paginated}, unread_count: N } }
      const data = responseData?.data;

      let notifsArray = [];
      if (Array.isArray(data)) {
        // Flat array response
        notifsArray = data;
      } else if (data?.notifications?.data) {
        // Paginated response: data.notifications.data is the array
        notifsArray = data.notifications.data;
      } else if (Array.isArray(data?.notifications)) {
        notifsArray = data.notifications;
      }

      setNotifications(notifsArray);

      // Use unread_count from backend if available
      // Since we filter=unread, all items in the array are unread
      const unreadCount = data?.unread_count ?? notifsArray.length;
      onUnreadCountUpdate(unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadCountUpdate]);

  // Fetch when the dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen, fetchNotifications]);

  // Initial fetch + polling every 60 seconds to update badge count
  useEffect(() => {
    fetchNotifications(false);
    const intervalId = setInterval(() => fetchNotifications(false), 60000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      await api.post('/admin/notifications/read');
      setNotifications([]);
      onUnreadCountUpdate(0);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new_provider_registration':
      case 'verification':
        return (
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck size={16} />
          </div>
        );
      case 'dispute':
      case 'new_dispute':
        return (
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle size={16} />
          </div>
        );
      case 'payment':
      case 'withdrawal_request':
        return (
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <Wallet size={16} />
          </div>
        );
      case 'review':
        return (
          <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shrink-0">
            <Star size={16} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <Info size={16} />
          </div>
        );
    }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${Math.floor(seconds)}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-0 w-80 bg-white shadow-2xl border border-slate-100 overflow-hidden z-50 rounded-[2rem] transition-all duration-200 animate-in fade-in zoom-in origin-top-right">

      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between">
        <h3 className="text-white font-bold">Notifications</h3>
        <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full font-medium">
          {notifications.length} New
        </span>
      </div>

      {/* Content */}
      <div className="max-h-[22rem] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-slate-400">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <AlertTriangle className="w-8 h-8 text-red-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Failed to load</p>
            <button
              onClick={() => fetchNotifications(true)}
              className="mt-2 text-xs font-bold text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-slate-50">
            {notifications.map((notif) => (
              <div
                key={notif.notificationID || notif.id}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-start group ${!notif.is_seen ? 'bg-blue-50/30' : ''}`}
              >
                {getIcon(notif.type)}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-1 group-hover:text-blue-600 transition-colors truncate">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block font-medium uppercase tracking-widest">
                    {timeAgo(notif.created_at)}
                  </span>
                </div>
                {!notif.is_seen && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <BellOff className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-700">No new notifications</p>
            <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-100">
          <button
            onClick={markAllAsRead}
            className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Check size={16} />
            Mark all as Read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
