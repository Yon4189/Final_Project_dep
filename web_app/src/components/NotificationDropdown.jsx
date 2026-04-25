import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, AlertTriangle, Wallet, BellOff, Check,
  ShieldCheck, UserPlus, MessageSquare, Users, X, RefreshCw,
  Wrench, MapPin, CheckCircle, XCircle, BookOpen, CreditCard
} from 'lucide-react';
import api from '../api/axios';

// Maps notification type → { icon, color, route }
const TYPE_CONFIG = {
  provider_registration: {
    icon: ShieldCheck,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    route: '/admin/verification/pending',
    label: 'New Provider'
  },
  new_provider_registration: {
    icon: ShieldCheck,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    route: '/admin/verification/pending',
    label: 'New Provider'
  },
  verification: {
    icon: ShieldCheck,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    route: '/admin/verification/pending',
    label: 'Verification'
  },
  customer_registration: {
    icon: UserPlus,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    route: '/admin/users/customers',
    label: 'New Customer'
  },
  dispute: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    route: '/admin/disputes',
    label: 'Dispute'
  },
  new_dispute: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    route: '/admin/disputes',
    label: 'Dispute'
  },
  dispute_message: {
    icon: MessageSquare,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    route: '/admin/disputes',
    label: 'Dispute Message'
  },
  withdrawal_request: {
    icon: Wallet,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    route: '/admin/payments',
    label: 'Withdrawal'
  },
  payment: {
    icon: CreditCard,
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    route: '/admin/payments',
    label: 'Payment'
  },
  new_message: {
    icon: MessageSquare,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    route: '/admin/disputes',
    label: 'Message'
  },
  booking_completed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    route: '/admin/bookings',
    label: 'Booking Completed'
  },
  booking_cancelled: {
    icon: XCircle,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    route: '/admin/bookings',
    label: 'Booking Cancelled'
  },
  booking_request: {
    icon: BookOpen,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    route: '/admin/bookings',
    label: 'New Booking'
  },
  overdue_payment_detected: {
    icon: AlertTriangle,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    route: '/admin/payments',
    label: 'Overdue Payment'
  },
  refund_failed: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    route: '/admin/payments',
    label: 'Refund Failed'
  },
  payout_release_failed: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    route: '/admin/payments',
    label: 'Payout Failed'
  },
  account_frozen: {
    icon: ShieldCheck,
    color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    route: '/admin/users',
    label: 'Account Frozen'
  },
  service_started: {
    icon: Wrench,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    route: '/admin/bookings',
    label: 'Service Started'
  },
  provider_arrived: {
    icon: MapPin,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    route: '/admin/bookings',
    label: 'Provider Arrived'
  },
};

const DEFAULT_CONFIG = {
  icon: Users,
  color: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  route: null,
  label: 'System'
};

const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const NotificationDropdown = ({ isOpen, onUnreadCountUpdate, onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async (showLoader = false, silent = false) => {
    if (showLoader) setIsLoading(true);
    if (!showLoader && !silent) setIsRefreshing(true);
    setError(null);
    try {
      const response = await api.get('/admin/notifications?filter=unread&per_page=20');
      const data = response.data?.data;

      let notifsArray = [];
      if (Array.isArray(data)) {
        notifsArray = data;
      } else if (data?.notifications?.data) {
        notifsArray = data.notifications.data;
      } else if (Array.isArray(data?.notifications)) {
        notifsArray = data.notifications;
      }

      setNotifications(notifsArray);
      const unreadCount = data?.unread_count ?? notifsArray.filter(n => !n.is_seen).length;
      onUnreadCountUpdate(unreadCount);
    } catch (err) {
      if (!silent) {
        console.error('Failed to fetch notifications:', err);
        setError('Failed to load notifications.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onUnreadCountUpdate]);

  // Fetch when dropdown opens
  useEffect(() => {
    if (isOpen) fetchNotifications(true);
  }, [isOpen, fetchNotifications]);

  // Background poll every 30 seconds for badge count
  useEffect(() => {
    fetchNotifications(false, true);
    const id = setInterval(() => fetchNotifications(false, true), 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.is_seen) {
      try {
        await api.post(`/admin/notifications/${notif.notificationID || notif.id}/read`);
        setNotifications(prev =>
          prev.map(n =>
            (n.notificationID || n.id) === (notif.notificationID || notif.id)
              ? { ...n, is_seen: true }
              : n
          )
        );
        const newUnread = notifications.filter(
          n => !n.is_seen && (n.notificationID || n.id) !== (notif.notificationID || notif.id)
        ).length;
        onUnreadCountUpdate(newUnread);
      } catch (e) {
        console.error('Failed to mark notification as read:', e);
      }
    }

    // Navigate to relevant page
    const config = TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;

    // Dispute → navigate to specific dispute if ID available
    if (['dispute', 'new_dispute', 'dispute_message'].includes(notif.type) && notif.data?.dispute_id) {
      navigate(`/admin/disputes/${notif.data.dispute_id}`);
    } else if (['dispute', 'new_dispute', 'dispute_message'].includes(notif.type) && notif.data?.disputeID) {
      navigate(`/admin/disputes/${notif.data.disputeID}`);
    // Booking → navigate to bookings page
    } else if (['booking_completed', 'booking_cancelled', 'booking_request', 'service_started', 'provider_arrived'].includes(notif.type) && notif.data?.booking_id) {
      navigate(`/admin/bookings`);
    } else if (config.route) {
      navigate(config.route);
    }

    if (onClose) onClose();
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/admin/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, is_seen: true })));
      onUnreadCountUpdate(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const dismissNotification = async (e, notif) => {
    e.stopPropagation();
    try {
      await api.post(`/admin/notifications/${notif.notificationID || notif.id}/read`);
      setNotifications(prev => prev.filter(n =>
        (n.notificationID || n.id) !== (notif.notificationID || notif.id)
      ));
      const newUnread = notifications.filter(
        n => !n.is_seen && (n.notificationID || n.id) !== (notif.notificationID || notif.id)
      ).length;
      onUnreadCountUpdate(newUnread);
    } catch (e) {
      console.error('Failed to dismiss notification:', e);
    }
  };

  if (!isOpen) return null;

  const unreadNotifs = notifications.filter(n => !n.is_seen);

  return (
    <div className="absolute top-14 right-0 w-96 bg-admin-card shadow-2xl border border-admin-border overflow-hidden z-50 rounded-[2rem] animate-in fade-in zoom-in-95 origin-top-right duration-200">

      {/* Header */}
      <div className="bg-slate-900 dark:bg-black px-5 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-black text-sm tracking-tight">Notifications</h3>
          {unreadNotifs.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black min-w-[20px] text-center">
              {unreadNotifs.length > 99 ? '99+' : unreadNotifs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(false)}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {unreadNotifs.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-all uppercase tracking-widest"
            >
              <Check size={12} />
              All Read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[26rem] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-300 mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Failed to load</p>
            <button
              onClick={() => fetchNotifications(true)}
              className="mt-2 text-xs font-bold text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/50">
            {notifications.map((notif) => {
              const config = TYPE_CONFIG[notif.type] || DEFAULT_CONFIG;
              const Icon = config.icon;
              const isUnread = !notif.is_seen;

              return (
                <div
                  key={notif.notificationID || notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`relative px-5 py-4 cursor-pointer transition-colors flex gap-3 items-start group ${
                    isUnread
                      ? 'bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/60 dark:hover:bg-blue-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Unread dot */}
                  {isUnread && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}

                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon size={16} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-admin-text leading-snug mb-0.5 truncate">
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-admin-text-muted line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={(e) => dismissNotification(e, notif)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 transition-all rounded"
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <BellOff className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-300">You're all caught up!</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No new notifications</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-admin-border flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { navigate('/admin/disputes'); if (onClose) onClose(); }}
          className="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors"
        >
          View All →
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
