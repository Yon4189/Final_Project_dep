import React, { useState, useEffect } from 'react';
import { Loader2, Info, AlertTriangle, Wallet, BellOff, Check } from 'lucide-react';
import api from '../api/axios';

const NotificationDropdown = ({ isOpen, onUnreadCountUpdate }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    // only set loading true if it's the first load
    if (notifications.length === 0) {
      setIsLoading(true);
    }
    try {
      const response = await api.get('/admin/notifications?filter=unread');
      const data = response.data.data || response.data;
      
      // Handle the paginated response structure if present
      let notifsArray = [];
      if (Array.isArray(data)) {
        notifsArray = data;
      } else if (data?.notifications?.data) {
        notifsArray = data.notifications.data;
      } else if (data?.notifications) {
        notifsArray = Array.isArray(data.notifications) ? data.notifications : [];
      }
      
      setNotifications(notifsArray);
      
      // Use unread_count from backend if available, otherwise fallback to array length
      const unreadCount = data?.unread_count !== undefined ? data.unread_count : notifsArray.length;
      onUnreadCountUpdate(unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllAsRead = async () => {
    try {
      await api.post('/admin/notifications/read');
      setNotifications([]);
      onUnreadCountUpdate(0);
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'verification':
        return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><Info size={16} /></div>;
      case 'dispute':
        return <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0"><AlertTriangle size={16} /></div>;
      case 'payment':
        return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><Wallet size={16} /></div>;
      default:
        return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"><Info size={16} /></div>;
    }
  };

  // Simplistic relative time logic
  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return Math.floor(seconds) + " secs ago";
  };

  return (
    <div className={`absolute top-14 right-0 w-80 bg-white shadow-2xl border border-slate-100 overflow-hidden z-50 rounded-[2rem] transition-all duration-200 transform origin-top-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto block animate-in fade-in zoom-in' : 'opacity-0 scale-95 pointer-events-none hidden'}`}>
      
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between">
        <h3 className="text-white font-bold">Notifications</h3>
        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full font-medium">
          {notifications.length} New
        </span>
      </div>

      {/* Content */}
      <div className="max-h-[22rem] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-admin-accent animate-spin mb-2" />
            <p className="text-sm text-slate-400">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col">
            {notifications.map((notif) => (
              <div key={notif.notificationID} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-start group">
                {getIcon(notif.type)}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-800 leading-tight mb-1 group-hover:text-admin-accent transition-colors">{notif.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-medium uppercase tracking-widest">
                    {timeAgo(notif.created_at)}
                  </span>
                </div>
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
            className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-admin-accent hover:bg-slate-100 rounded-xl transition-colors"
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
