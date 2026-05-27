import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle, RefreshCcw, XCircle,
  User, Wrench, MessageSquare, ExternalLink, Search,
  Loader2, Filter, ChevronRight, MessageSquareText, Trash2,
  ArrowLeft, Mail, Phone, Send, Lock, Pencil, Trash
} from 'lucide-react';
import { disputeAPI } from '../api/dispute';
import DescriptionModal from '../components/DescriptionModal';
import useTypingIndicator from '../hooks/useTypingIndicator';
import { useTheme } from '../context/ThemeContext';

const Disputes = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id: urlDisputeId } = useParams();
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionData, setResolutionData] = useState({
    status: '',
    notes: '',
    resolution_type: '',
    refund_amount: 0
  });
  const [newMessage, setNewMessage] = useState('');
  const [recipientType, setRecipientType] = useState('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [descModal, setDescModal] = useState({ show: false, content: '', title: '' });
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedDispute?.messages]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [replyingToMessageId, setReplyingToMessageId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [activeChatTab, setActiveChatTab] = useState('discussion');

  // 1. Fetch Selected Dispute Details (when ID is in URL)
  const {
    data: detailData,
    isLoading: detailLoading,
    isFetching: isFetchingDetail,
    isError: detailError
  } = useQuery({
    queryKey: ['dispute', urlDisputeId],
    queryFn: () => urlDisputeId ? disputeAPI.getDisputeDetails(urlDisputeId) : null,
    enabled: !!urlDisputeId,
    staleTime: 10000,
    refetchInterval: 30000, // Poll less frequently (30s)
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (detailData?.success) {
      const dispute = detailData.data.dispute;
      setSelectedDispute(dispute);
      setPollingEnabled(true);
      setResolutionData({
        status: dispute.status,
        notes: '',
        resolution_type: dispute.resolution_type || '',
        refund_amount: dispute.refund_amount || 0
      });
      // Automatically switch to discussion tab on fresh load
      setActiveChatTab('discussion');
    } else if (detailData && !detailData.success && !selectedDispute) {
      setSelectedDispute(null);
    }
  }, [detailData]);



  // Typing indicator
  const { typingUsers, setTyping } = useTypingIndicator(
    urlDisputeId,
    !!urlDisputeId
  );

  // Auto-set typing status when newMessage changes
  useEffect(() => {
    if (newMessage.trim()) {
      setTyping(true);
      const timeout = setTimeout(() => setTyping(false), 3000);
      return () => clearTimeout(timeout);
    } else {
      setTyping(false);
    }
  }, [newMessage, urlDisputeId]);

  const cleanTitle = (title) => {
    if (!title) return '';
    const parts = title.split(' - ');
    if (parts.length > 1) return parts.slice(1).join(' - ');
    return title;
  };

  const getStatusBadgeStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'under_review': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'escalated': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-600 text-white shadow-lg shadow-red-500/20';
      case 'high': return 'bg-orange-500 text-white shadow-lg shadow-orange-500/20';
      case 'medium': return 'bg-blue-500 text-white shadow-lg shadow-blue-500/20';
      default: return 'bg-slate-500 text-white shadow-lg shadow-slate-500/20';
    }
  };

  const getStatusTranslation = (status) => {
    return t(`status_${status}`) || status;
  };

  const getPriorityTranslation = (priority) => {
    return t(`priority_${priority}`) || priority;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(amount || 0);
  };

  // 2. Data Fetching for List View
  const {
    data: { disputes = [], stats = null } = {},
    isLoading: loading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['disputes', statusFilter, priorityFilter, searchQuery],
    queryFn: async () => {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (searchQuery) filters.search = searchQuery;

      const response = await disputeAPI.getAllDisputes(filters);
      let disputesData = [];
      let statsData = null;

      if (response.success) {
        disputesData = response.data.data || [];
        statsData = response.stats;

        if (!statsData) {
          const statsRes = await disputeAPI.getDisputeStats();
          if (statsRes.success) statsData = statsRes.data;
        }
      }
      return { disputes: disputesData, stats: statsData };
    },
    staleTime: 30000,
    refetchInterval: 60000, // Poll for new disputes every 60 seconds
    placeholderData: (previousData) => previousData,
  });

  const handleReviewCase = async (disputeID) => {
    if (urlDisputeId !== String(disputeID)) {
      navigate(`/admin/disputes/${disputeID}`);
    }
  };

  const handleCloseModal = () => {
    setSelectedDispute(null);
    setPollingEnabled(false);
    navigate('/admin/disputes');
  };

  const handleUpdateStatus = async (status, resolutionType = null) => {
    if (!selectedDispute) return;

    try {
      setUpdatingStatus(true);
      const data = {
        status,
        notes: resolutionData.notes,
        resolution_type: resolutionType || resolutionData.resolution_type,
        refund_amount: resolutionData.refund_amount
      };

      const response = await disputeAPI.updateDisputeStatus(selectedDispute.disputeID, data);
      if (response.success) {
        alert(t('dispute_msg_updated'));
        setSelectedDispute(null);
        queryClient.invalidateQueries({ queryKey: ['disputes'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        navigate('/admin/disputes');
      }
    } catch (error) {
      console.error('Failed to update dispute:', error);
      alert(error.response?.data?.message || t('user_mgmt_err_status'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteMessage = async (messageID) => {
    if (!window.confirm(t('user_mgmt_confirm_delete', { name: 'this message' }))) return;

    try {
      const response = await disputeAPI.deleteDisputeMessage(messageID);
      if (response.success) {
        // Update local state
        setSelectedDispute(prev => ({
          ...prev,
          messages: prev.messages.filter(msg => msg.messageID !== messageID)
        }));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert(t('user_mgmt_err_delete'));
    }
  };

  const handleEditMessage = async (messageID) => {
    if (!editingMessageText.trim()) return;

    try {
      const response = await disputeAPI.editMessage(messageID, editingMessageText);
      if (response.success) {
        // Update local state
        setSelectedDispute(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.messageID === messageID
              ? { ...msg, message: editingMessageText, is_edited: true }
              : msg
          )
        }));
        setEditingMessageId(null);
        setEditingMessageText('');
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
      alert('Failed to edit message: ' + (error.response?.data?.message || error.message));
    }
  };

  const startEditMessage = (message) => {
    setEditingMessageId(message.messageID);
    setEditingMessageText(message.message);
  };

  const handleReplyToMessage = async (parentMessageID) => {
    if (!replyText.trim() || !selectedDispute) return;

    try {
      const response = await disputeAPI.replyToMessage(
        selectedDispute.disputeID,
        parentMessageID,
        replyText,
        recipientType
      );

      if (response.success) {
        setReplyText('');
        setReplyingToMessageId(null);
        // Optimistically update message list
        const sentMsg = response.data.message || response.data;
        if (sentMsg) {
          setSelectedDispute(prev => ({
            ...prev,
            messages: [...(prev.messages || []), sentMsg]
          }));
        }
      }
    } catch (error) {
      console.error('Failed to reply to message:', error);
      alert('Failed to reply: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSendMessage = async (isAdminOnly = false) => {
    if (!newMessage.trim() || !selectedDispute) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      messageID: tempId,
      message: messageText,
      sender_type: 'admin',
      recipient_type: recipientType,
      is_admin_only: isAdminOnly,
      created_at: new Date().toISOString(),
      sender: { fullname: 'You' }, // Current admin
      status: 'sending' // Local flag
    };

    // 1. Optimistically update UI
    setSelectedDispute(prev => ({
      ...prev,
      messages: [...(prev.messages || []), optimisticMsg]
    }));
    setNewMessage('');
    setTimeout(scrollToBottom, 100);

    try {
      setSendingMessage(true);
      const response = await disputeAPI.addDisputeMessage(
        selectedDispute.disputeID,
        messageText,
        recipientType,
        isAdminOnly
      );

      if (response.success) {
        // 2. Replace optimistic message with real one from server
        const sentMsg = response.data;
        setSelectedDispute(prev => ({
          ...prev,
          messages: prev.messages.map(msg => msg.messageID === tempId ? sentMsg : msg)
        }));
      } else {
        throw new Error(response.message || 'Failed to send');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // 3. Rollback: remove optimistic message
      setSelectedDispute(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.messageID !== tempId)
      }));
      setNewMessage(messageText); // Restore text
      const errorMsg = error.response?.data?.message || error.message;
      alert(`Failed to send message: ${errorMsg}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedDispute) return;

    if (!window.confirm("Are you sure you want to clear the entire chat history for this dispute? This action cannot be undone.")) {
      return;
    }

    try {
      setSendingMessage(true);
      const response = await disputeAPI.clearHistory(selectedDispute.disputeID);

      if (response.success) {
        setSelectedDispute(prev => ({
          ...prev,
          messages: []
        }));
      } else {
        throw new Error(response.message || 'Failed to clear history');
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history: ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSearchMessages = async (e) => {
    e.preventDefault();
    if (!messageSearchQuery.trim() || !selectedDispute) return;

    try {
      setIsSearching(true);
      const response = await disputeAPI.searchMessages(
        selectedDispute.disputeID,
        messageSearchQuery,
        50
      );

      if (response.success) {
        setSearchResults(response.data.messages || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Failed to search messages:', error);
      alert('Search failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSearching(false);
    }
  };


  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      {/* --- PREMIUM HEADER (Dribbble Inspired) --- */}
      {!urlDisputeId && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Disputes</h1>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>
      )}

      {urlDisputeId && (
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleCloseModal}
            className="p-2.5 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-900 transition-all active:scale-90 border border-slate-200 dark:border-slate-700 shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight italic">
              {t('dispute_case_review')}
            </h1>
          </div>
        </div>
      )}

      {urlDisputeId ? (
        /* --- DETAIL VIEW --- */
        detailLoading ? (
          <div className="h-[600px] flex flex-col items-center justify-center bg-admin-card rounded-[2.5rem] border border-admin-border shadow-sm">
            <Loader2 size={40} className="text-teal-500 animate-spin mb-4" />
            <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-[0.2em] animate-pulse">{t('dispute_fetching')}</p>
          </div>
        ) : ((!detailLoading && !selectedDispute && detailData && detailData.success === false) || detailError) ? (
          <div className="h-[400px] flex flex-col items-center justify-center bg-admin-card rounded-[2.5rem] border border-admin-border border-dashed">
            <AlertCircle size={40} className="text-slate-300 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {detailError ? "Error connecting to server" : t('dispute_not_found')}
            </p>
            <button onClick={handleCloseModal} className="mt-6 px-6 py-2 bg-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform active:scale-95 shadow-lg shadow-teal-500/20">Back to List</button>
          </div>
        ) : (selectedDispute) ? (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-220px)] min-h-[700px] bg-white dark:bg-admin-card rounded-[2.5rem] shadow-2xl border border-admin-border overflow-hidden animate-in zoom-in-95 duration-500">
            {/* --- LEFT: CASE DETAILS --- */}
            <div className="w-full lg:w-80 bg-white dark:bg-slate-900/50 border-r border-admin-border flex flex-col">
              <div className="p-6 border-b border-admin-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-admin-text uppercase tracking-widest">{t('dispute_case')}</h2>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getStatusBadgeStyle(selectedDispute.status)}`}>
                    {getStatusTranslation(selectedDispute.status)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-admin-text leading-tight">{cleanTitle(selectedDispute.title)}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-white dark:bg-admin-card rounded-2xl border border-admin-border shadow-sm">
                    <p className="text-[9px] font-black text-admin-text uppercase tracking-[0.2em] mb-3 opacity-60">{t('complainant')}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center font-black text-xs">
                        {selectedDispute.raised_by?.fullname?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-admin-text truncate">{selectedDispute.raised_by?.fullname}</p>
                        <p className="text-[10px] font-bold text-teal-500 uppercase mb-1">{t(selectedDispute.raised_by_type)}</p>
                        <div className="space-y-0.5">
                          {selectedDispute.raised_by?.phone && (
                            <p className="text-[9px] font-bold text-admin-text flex items-center gap-1.5">
                              <Phone size={10} className="text-admin-text/60" /> {selectedDispute.raised_by.phone}
                            </p>
                          )}
                          {selectedDispute.raised_by?.email && (
                            <p className="text-[9px] font-bold text-admin-text flex items-center gap-1.5 truncate">
                              <Mail size={10} className="text-admin-text/60" /> {selectedDispute.raised_by.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-admin-card rounded-2xl border border-admin-border shadow-sm">
                    <p className="text-[9px] font-black text-admin-text uppercase tracking-[0.2em] mb-3 opacity-60">{t('against')}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center font-black text-xs">
                        {selectedDispute.against?.fullname?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-admin-text truncate">{selectedDispute.against?.fullname}</p>
                        <p className="text-[10px] font-bold text-red-500 uppercase mb-1">{t(selectedDispute.against_type)}</p>
                        <div className="space-y-0.5">
                          {selectedDispute.against?.phone && (
                            <p className="text-[9px] font-bold text-admin-text flex items-center gap-1.5">
                              <Phone size={10} className="text-admin-text/60" /> {selectedDispute.against.phone}
                            </p>
                          )}
                          {selectedDispute.against?.email && (
                            <p className="text-[9px] font-bold text-admin-text flex items-center gap-1.5 truncate">
                              <Mail size={10} className="text-admin-text/60" /> {selectedDispute.against.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* --- MIDDLE: THE CHAT HUB --- */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/20 relative">
              {/* Chat Header/Tabs */}
              <div className="p-4 border-b border-admin-border flex items-center justify-between bg-white dark:bg-transparent">
                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-admin-border">
                  <button
                    onClick={() => { setActiveChatTab('discussion'); setRecipientType('customer'); }}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeChatTab === 'discussion' ? 'bg-white dark:bg-slate-800 text-teal-600 shadow-sm' : 'text-admin-text-muted hover:text-admin-text'
                      }`}
                  >
                    <MessageSquareText size={14} /> {t('discussion')}
                  </button>
                </div>

                {activeChatTab === 'discussion' && (
                  <div className="flex gap-2">
                    {['customer', 'provider'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setRecipientType(type)}
                        className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${recipientType === type ? 'bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-500/20' : 'bg-white dark:bg-slate-800 text-slate-400 border-admin-border'
                          }`}
                      >

                        {t(type)}
                      </button>
                    ))}

                    <div className="w-[1px] h-4 bg-admin-border mx-1 self-center opacity-50" />

                    <button
                      onClick={handleClearHistory}
                      disabled={sendingMessage || (selectedDispute.messages || []).length === 0}
                      className="p-1.5 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative"
                      title="Clear History"
                    >
                      <Trash2 size={16} />
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {t('clear_history', 'Clear History')}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Messages Area (Telegram Style) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth custom-scrollbar relative bg-[#e5ebee] dark:bg-slate-900/50">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                {(selectedDispute.messages || []).filter(msg => {
                  if (activeChatTab === 'internal') return msg.is_admin_only;
                  if (msg.is_admin_only) return false;
                  if (recipientType === 'customer') {
                    return msg.sender_type === 'customer' || (msg.sender_type === 'admin' && msg.recipient_type === 'customer');
                  }
                  return msg.sender_type === 'provider' || (msg.sender_type === 'admin' && msg.recipient_type === 'provider');
                }).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <MessageSquare size={48} className="text-slate-300 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{t('no_messages_yet')}</p>
                  </div>
                ) : (
                  (selectedDispute.messages || [])
                    .filter(msg => {
                      if (activeChatTab === 'internal') return msg.is_admin_only;
                      if (msg.is_admin_only) return false;
                      if (recipientType === 'customer') {
                        return msg.sender_type === 'customer' || (msg.sender_type === 'admin' && msg.recipient_type === 'customer');
                      }
                      return msg.sender_type === 'provider' || (msg.sender_type === 'admin' && msg.recipient_type === 'provider');
                    })
                    .map((msg, idx) => {
                      const isAdmin = msg.sender_type === 'admin';
                      return (
                        <div key={msg.messageID || idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-300 relative z-10`}>
                          <div className={`max-w-[75%] group flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            {!isAdmin && (
                              <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 mb-1 ml-2 uppercase tracking-wider">{msg.sender?.fullname || 'System'}</p>
                            )}
                            <div className={`relative p-3 px-4 rounded-[1.2rem] text-[13px] leading-relaxed shadow-sm transition-all duration-300 ${isAdmin
                              ? 'bg-[#effdde] dark:bg-teal-900/40 text-slate-800 dark:text-slate-100 rounded-tr-none border border-[#d6f0b8] dark:border-teal-800'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-white dark:border-slate-700'
                              }`}>
                              {msg.message}
                              <div className={`flex items-center justify-end gap-1 mt-1 -mr-1 opacity-60 text-[9px] font-bold ${isAdmin ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400'}`}>
                                {msg.status === 'sending' ? (
                                  <RefreshCcw size={8} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={8} className={isAdmin ? 'text-teal-600' : 'text-slate-400'} />
                                )}
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>

                              {/* Hover Actions */}
                              <div className={`absolute -top-3 ${isAdmin ? '-left-8' : '-right-8'} flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20`}>
                                <button
                                  onClick={() => handleDeleteMessage(msg.messageID)}
                                  className="p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-all hover:scale-110"
                                  title="Delete message"
                                >
                                  <Trash size={10} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
                <div ref={messagesEndRef} />

                {/* Typing Indicators */}
                <div className="absolute bottom-4 left-6 z-20">
                  {typingUsers.filter(u => u.user_id !== 'admin').map((user, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-black text-teal-600 dark:text-teal-400 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full backdrop-blur-sm animate-bounce shadow-sm border border-teal-500/20">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
                        <span className="w-1 h-1 bg-current rounded-full animate-pulse delay-75"></span>
                        <span className="w-1 h-1 bg-current rounded-full animate-pulse delay-150"></span>
                      </div>
                      {user.name} is typing...
                    </div>
                  ))}
                </div>
              </div>

              {/* Console Input Area (Telegram Style) */}
              <div className="px-6 pb-6 bg-[#e5ebee] dark:bg-slate-900/50">
                <div className={`relative p-1 rounded-[1.5rem] transition-all duration-300 bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700`}>
                  {activeChatTab === 'internal' && (
                    <div className="absolute -top-3 left-6 px-3 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">
                      <Lock size={10} className="inline mr-1" /> {t('private_note')}
                    </div>
                  )}
                  <div className="p-2 px-4 flex items-center gap-3">
                    <textarea
                      rows={1}
                      placeholder={activeChatTab === 'internal' ? t('type_internal_note') : `${t('reply_to')} ${t(recipientType)}...`}
                      className="flex-1 bg-transparent border-none text-slate-800 dark:text-slate-100 text-[14px] outline-none resize-none py-2 placeholder:text-slate-400 font-medium"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(activeChatTab === 'internal'); } }}
                    />
                    <button
                      disabled={sendingMessage || !newMessage.trim()}
                      onClick={() => handleSendMessage(activeChatTab === 'internal')}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shadow-md ${activeChatTab === 'internal' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                    >
                      {sendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- RIGHT: ACTIONS --- */}
            <div className="w-full lg:w-80 bg-white dark:bg-slate-900/50 border-l border-admin-border p-6 overflow-y-auto space-y-6">
              <h3 className="text-xs font-black text-admin-text uppercase tracking-widest border-b border-admin-border pb-4">
                {t('resolution_panel')}
              </h3>

              {selectedDispute.status !== 'resolved' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-admin-text uppercase tracking-widest opacity-60">{t('resolution_notes')}</label>
                    <textarea
                      className="w-full h-32 p-3 bg-white dark:bg-admin-card border border-admin-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none text-admin-text"
                      placeholder={t('enter_resolution_notes')}
                      value={resolutionData.notes}
                      onChange={(e) => setResolutionData({ ...resolutionData, notes: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-admin-text uppercase tracking-widest opacity-60">{t('resolution_type')}</label>
                      <select
                        className="w-full p-3 bg-white dark:bg-admin-card border border-admin-border rounded-xl text-xs font-bold outline-none text-admin-text"
                        value={resolutionData.resolution_type}
                        onChange={(e) => {
                          const type = e.target.value;
                          setResolutionData(prev => ({ ...prev, resolution_type: type }));
                        }}
                      >
                        <option value="">{t('select_type')}</option>
                        <option value="dismissed">{t('dismiss_case')}</option>
                        <option value="warning">{t('issue_warning')}</option>
                      </select>
                    </div>


                  </div>

                  <div className="space-y-2 pt-4">
                    <button 
                      onClick={() => handleUpdateStatus('resolved')} 
                      disabled={!resolutionData.resolution_type || updatingStatus} 
                      className="w-full py-3 bg-teal-500 text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-teal-500/20 hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : t('resolve_case')}
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus('rejected')} 
                      disabled={updatingStatus}
                      className="w-full py-3 bg-white dark:bg-slate-800 border border-admin-border text-red-500 font-black uppercase text-xs rounded-xl hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {updatingStatus ? <Loader2 size={16} className="animate-spin" /> : t('reject_case')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                    <CheckCircle size={24} />
                  </div>
                  <p className="text-xs font-black text-admin-text uppercase">{t('case_resolved')}</p>
                </div>
              )}
            </div>
          </div>
        ) : null
      ) : (
        /* --- LIST VIEW --- */
        <div className="bg-white dark:bg-admin-card rounded-[2rem] shadow-xl dark:shadow-2xl border border-admin-border overflow-hidden min-h-[600px] flex flex-col transition-all duration-300 relative">
          {/* Subtle loading bar at the top */}
          {(loading || isFetching) && (
            <div className="absolute top-0 left-0 w-full h-1 z-50 overflow-hidden">
              <div className="h-full bg-admin-accent animate-progress-fast"></div>
            </div>
          )}

          {/* Only show full-screen loader on initial fetch */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 size={40} className="text-admin-accent animate-spin mb-4" />
              <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-[0.2em] animate-pulse">{t('dispute_fetching')}</p>
            </div>
          )}

          {/* --- TABS --- */}
          <div className="px-8 bg-white dark:bg-admin-sidebar py-4 border-b border-admin-border">
            <div className="flex gap-10 overflow-x-auto custom-scrollbar-hide pb-2">
              {['all', 'pending', 'under_review', 'resolved', 'rejected', 'escalated'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab === 'all' ? '' : tab)}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${(statusFilter === tab || (statusFilter === '' && tab === 'all'))
                    ? 'text-admin-accent dark:text-white'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'
                    }`}
                >
                  {t(`status_${tab}`)}
                  {(statusFilter === tab || (statusFilter === '' && tab === 'all')) && (
                    <div className="absolute -bottom-4 left-0 w-full h-1 bg-admin-accent rounded-t-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left">
              <thead className="text-slate-600 dark:text-slate-400 text-[9px] uppercase font-black tracking-[0.25em] border-b border-admin-border bg-white dark:bg-white/5">
                <tr>
                  <th className="px-6 py-6 w-16">{t('dispute_ref_id') || 'ID'}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_complainant')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_against')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_subject')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_amount')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_status')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_priority')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_date')}</th>
                  <th className="px-4 py-6 uppercase tracking-wider">{t('dispute_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 size={32} className="text-admin-accent animate-spin opacity-50" />
                        <p className="text-xs font-black text-admin-text-muted uppercase tracking-widest animate-pulse">{t('dispute_fetching')}</p>
                      </div>
                    </td>
                  </tr>
                ) : disputes.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <Search size={48} className="text-admin-text-muted" />
                        <p className="text-xs font-black text-admin-text-muted uppercase tracking-widest">{t('dispute_no_disputes')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  disputes.map((dispute) => (
                    <tr
                      key={dispute.disputeID}
                      onClick={() => handleReviewCase(dispute.disputeID)}
                      className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer border-l-4 border-transparent hover:border-admin-accent"
                    >
                      <td className="px-6 py-6">
                        <span className="text-[11px] font-black text-admin-accent font-mono">{dispute.disputeID}</span>
                      </td>
                      <td className="px-4 py-6">
                        <span className="text-[11px] font-black truncate block max-w-[150px] text-admin-text">
                          {dispute.raised_by?.fullname || dispute.raised_by?.business_name || dispute.raised_by?.first_name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className="text-[11px] font-black truncate block max-w-[150px] text-admin-text">
                          {dispute.against?.fullname || dispute.against?.business_name || dispute.against?.first_name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span
                          className="text-[11px] font-bold line-clamp-1 max-w-[200px] text-admin-text"
                          title={dispute.title}
                        >
                          {cleanTitle(dispute.title)}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className="text-[11px] font-black font-mono text-admin-text">
                          {formatCurrency(dispute.booking?.agreed_price || dispute.refund_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusBadgeStyle(dispute.status)}`}>
                          {getStatusTranslation(dispute.status)}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPriorityBadgeStyle(dispute.priority)}`}>
                          {getPriorityTranslation(dispute.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-6">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">
                          {new Date(dispute.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleReviewCase(dispute.disputeID)}
                          disabled={isFetchingDetail && urlDisputeId === String(dispute.disputeID)}
                          className="p-2.5 bg-admin-accent/10 text-admin-accent rounded-xl hover:bg-admin-accent hover:text-white transition-all active:scale-95 group flex items-center justify-center min-w-[40px]"
                          title={t('dispute_review_case')}
                        >
                          {isFetchingDetail && urlDisputeId === String(dispute.disputeID) ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden flex-1 p-4 space-y-4">
            {disputes.length > 0 ? (
              disputes.map((dispute) => (
                <div key={dispute.disputeID} className="bg-white dark:bg-admin-card rounded-[2rem] p-6 border border-admin-border shadow-sm space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors"></div>

                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-black text-blue-600">{dispute.disputeID}</span>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusBadgeStyle(dispute.status)}`}>
                          {getStatusTranslation(dispute.status)}
                        </span>
                      </div>
                      <h4 className="font-black text-admin-text text-sm uppercase italic leading-tight">{cleanTitle(dispute.title)}</h4>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getPriorityBadgeStyle(dispute.priority)} shadow-md`}>
                      {getPriorityTranslation(dispute.priority)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 py-4 border-y border-admin-border border-dashed">
                    <div className="flex -space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-800 shadow-md">
                        {dispute.raised_by?.fullname?.charAt(0) || 'C'}
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-800 shadow-md">
                        {dispute.against?.fullname?.charAt(0) || 'P'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-admin-text truncate">
                        {dispute.raised_by?.fullname} vs {dispute.against?.fullname}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dispute.category?.name || dispute.category}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleReviewCase(dispute.disputeID)}
                    disabled={isFetchingDetail && urlDisputeId === String(dispute.disputeID)}
                    className="w-full bg-slate-900 dark:bg-slate-800 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isFetchingDetail && urlDisputeId === String(dispute.disputeID) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>{t('dispute_review_case')} <ChevronRight size={14} /></>
                    )}
                  </button>
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">
                {t('dispute_no_disputes')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description Modal */}
      <DescriptionModal
        show={descModal.show}
        providerName={descModal.title}
        description={descModal.content}
        onClose={() => setDescModal({ ...descModal, show: false })}
      />
    </div>
  );
};

export default Disputes;