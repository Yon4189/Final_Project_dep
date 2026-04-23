import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  AlertCircle, CheckCircle, RefreshCcw, XCircle, 
  User, Wrench, MessageSquare, ExternalLink, Search,
  Loader2, Filter, ChevronRight, MessageSquareText, Trash2,
  ArrowLeft, Mail, Phone
} from 'lucide-react';
import { disputeAPI } from '../api/dispute';
import DescriptionModal from '../components/DescriptionModal';
import useDisputePolling from '../hooks/useDisputePolling';
import useTypingIndicator from '../hooks/useTypingIndicator';

const Disputes = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id: urlDisputeId } = useParams();
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
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
  const [lastMessageUpdate, setLastMessageUpdate] = useState(null);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [replyingToMessageId, setReplyingToMessageId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Enable polling when a dispute is selected
  const pollingStatus = useDisputePolling(
    selectedDispute?.disputeID,
    3000, // Poll every 3 seconds
    pollingEnabled && !!selectedDispute
  );

  // Typing indicator
  const { typingUsers, setTyping } = useTypingIndicator(
    selectedDispute?.disputeID,
    pollingEnabled && !!selectedDispute
  );

  // Listen for message updates from polling
  useEffect(() => {
    const handleMessageUpdate = (event) => {
      setLastMessageUpdate(event.detail.timestamp);
      // Refresh the selected dispute to show new messages
      if (selectedDispute) {
        handleReviewCase(selectedDispute.disputeID);
      }
    };

    window.addEventListener('disputeMessageUpdate', handleMessageUpdate);
    return () => window.removeEventListener('disputeMessageUpdate', handleMessageUpdate);
  }, [selectedDispute]);

  const cleanTitle = (title) => {
    if (!title) return '';
    // Remove "Service Quality - ", "Payment Issue - ", etc.
    const parts = title.split(' - ');
    if (parts.length > 1) {
      return parts.slice(1).join(' - ');
    }
    return title;
  };

  // Auto-select dispute if ID is in URL
  React.useEffect(() => {
    if (urlDisputeId) {
      handleReviewCase(urlDisputeId);
    } else {
      setSelectedDispute(null);
    }
  }, [urlDisputeId]);

  // 1. Data Fetching with TanStack Query
  const { 
    data: { disputes = [], stats = null } = {}, 
    isLoading: loading, 
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
  });

  const handleReviewCase = async (disputeID) => {
    if (urlDisputeId !== String(disputeID)) {
      navigate(`/admin/disputes/${disputeID}`);
      return;
    }

    try {
      setModalLoading(true);
      const response = await disputeAPI.getDisputeDetails(disputeID);
      if (response.success) {
        setSelectedDispute(response.data.dispute);
        setResolutionData({
          status: response.data.dispute.status,
          notes: '',
          resolution_type: response.data.dispute.resolution_type || '',
          refund_amount: response.data.dispute.refund_amount || 0
        });
        // Enable polling when dispute is opened
        setPollingEnabled(true);
      }
    } catch (error) {
      console.error('Failed to fetch dispute details:', error);
    } finally {
      setModalLoading(false);
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
      const data = {
        status,
        notes: resolutionData.notes,
        resolution_type: resolutionType || resolutionData.resolution_type,
        refund_amount: resolutionData.refund_amount
      };

      const response = await disputeAPI.updateDisputeStatus(selectedDispute.disputeID, data);
      if (response.success) {
        alert(t('serv_msg_cat_updated'));
        setSelectedDispute(null);
        queryClient.invalidateQueries({ queryKey: ['disputes'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      }
    } catch (error) {
      console.error('Failed to update dispute:', error);
      alert(error.response?.data?.message || t('user_mgmt_err_status'));
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
        // Refresh dispute details
        const detailRes = await disputeAPI.getDisputeDetails(selectedDispute.disputeID);
        if (detailRes.success) {
          setSelectedDispute(detailRes.data.dispute);
        }
      }
    } catch (error) {
      console.error('Failed to reply to message:', error);
      alert('Failed to reply: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSendMessage = async (isAdminOnly = false) => {
    if (!newMessage.trim() || !selectedDispute) return;

    try {
      setSendingMessage(true);
      const response = await disputeAPI.addDisputeMessage(
        selectedDispute.disputeID, 
        newMessage, 
        recipientType, // Send to selected recipient
        isAdminOnly
      );

      if (response.success) {
        setNewMessage('');
        // Refresh dispute details to get updated messages
        const detailRes = await disputeAPI.getDisputeDetails(selectedDispute.disputeID);
        if (detailRes.success) {
          setSelectedDispute(detailRes.data.dispute);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg = error.response?.data?.message || error.message;
      alert(`Failed to send message: ${errorMsg}`);
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

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'text-red-500 dark:text-red-400';
      case 'under_review': return 'text-amber-500 dark:text-amber-400';
      case 'resolved': return 'text-emerald-500 dark:text-emerald-400';
      case 'rejected': return 'text-slate-500 dark:text-slate-400';
      case 'escalated': return 'text-purple-500 dark:text-purple-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'text-red-600 dark:text-red-400 font-black';
      case 'high': return 'text-orange-500 dark:text-orange-400 font-bold';
      case 'medium': return 'text-blue-500 dark:text-blue-400 font-bold';
      default: return 'text-slate-500 dark:text-slate-400';
    }
  };

  const getStatusTranslation = (status) => {
    const s = status?.toLowerCase();
    return t(`status_${s}`) || status;
  };

  const getPriorityTranslation = (priority) => {
    const p = priority?.toLowerCase();
    return t(`priority_${p}`) || priority;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex items-center gap-4">
          {urlDisputeId && (
            <button 
              onClick={handleCloseModal}
              className="p-2.5 hover:bg-admin-card rounded-2xl text-admin-text-muted hover:text-admin-text transition-all active:scale-90 border border-admin-border shadow-sm group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-admin-text tracking-tight italic">
              {urlDisputeId ? t('dispute_case_review') : t('dispute_title')}
            </h1>
            <p className="text-admin-text-muted text-[10px] font-black uppercase tracking-widest italic mt-1">
              {urlDisputeId ? `#${urlDisputeId}` : t('dispute_subtitle')}
            </p>
          </div>
        </div>
        
        {!urlDisputeId && stats && (
          <div className="flex gap-4 bg-admin-card p-3 rounded-2xl border border-admin-border shadow-sm w-full sm:w-auto overflow-x-auto">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('dispute_total')}</p>
              <p className="text-lg font-black text-admin-text">{stats.total || 0}</p>
            </div>
            <div className="w-px h-6 bg-admin-border mt-1"></div>
            <div className="text-right min-w-fit">
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">{t('dispute_pending')}</p>
              <p className="text-lg font-black text-red-600">{stats.pending || stats.by_status?.pending || 0}</p>
            </div>
          </div>
        )}
      </div>

      {urlDisputeId ? (
        /* --- DETAIL VIEW --- */
        modalLoading ? (
          <div className="h-[500px] flex flex-col items-center justify-center bg-admin-card rounded-[2.5rem] border border-admin-border shadow-sm">
             <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
             <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-[0.2em] animate-pulse">{t('dispute_fetching')}</p>
          </div>
        ) : selectedDispute ? (
          <div className="bg-admin-card rounded-[2.5rem] shadow-sm border border-admin-border overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* --- CLEAN HEADER --- */}
            <div className="p-8 border-b border-admin-border bg-white dark:bg-admin-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 shadow-sm border border-red-100 dark:border-red-500/20">
                      <AlertCircle size={24} />
                   </div>
                   <div>
                     <h2 className="text-2xl font-black text-admin-text tracking-tight uppercase leading-none">
                       {t('dispute_case_review')}
                     </h2>
                     <p className="text-slate-400 font-mono text-sm mt-1">Ref ID: #{selectedDispute.disputeID}</p>
                   </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(selectedDispute.status)} bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2 shadow-sm`}>
                  <div className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`}></div>
                  {getStatusTranslation(selectedDispute.status)}
                </div>
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getPriorityStyle(selectedDispute.priority)} bg-slate-50 dark:bg-slate-900/50 shadow-sm`}>
                  {getPriorityTranslation(selectedDispute.priority)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-admin-border">
              {/* Left Column: Details & Parties (8/12) */}
              <div className="lg:col-span-8 p-8 space-y-10">
                
                {/* 1. Parties Section */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <User size={14} /> {t('dispute_parties') || 'Parties Involved'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="relative group p-6 bg-blue-50/30 dark:bg-blue-500/5 rounded-3xl border border-blue-100/50 dark:border-blue-500/10 transition-all hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-1">
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">Complainant</div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20">
                          <User size={28} />
                        </div>
                        <div>
                          <p className="font-black text-admin-text text-lg leading-tight">
                            {selectedDispute.raised_by?.fullname || selectedDispute.raised_by?.name || 'Unknown User'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{t(selectedDispute.raised_by_type?.toLowerCase())} • ID: {selectedDispute.raised_by_id}</p>
                          
                          <div className="mt-3 pt-3 border-t border-blue-500/10 space-y-1.5">
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                              <Mail size={12} className="text-blue-500" /> {selectedDispute.raised_by?.email || 'N/A'}
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                              <Phone size={12} className="text-blue-500" /> {selectedDispute.raised_by?.phone || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative group p-6 bg-red-50/30 dark:bg-red-500/5 rounded-3xl border border-red-100/50 dark:border-red-500/10 transition-all hover:shadow-lg hover:shadow-red-500/5 hover:-translate-y-1">
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">Against</div>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-500/20">
                          <Wrench size={28} />
                        </div>
                        <div>
                          <p className="font-black text-admin-text text-lg leading-tight">
                            {selectedDispute.against?.fullname || selectedDispute.against?.name || 'Unknown Provider'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{t(selectedDispute.against_type?.toLowerCase())} • ID: {selectedDispute.against_id}</p>

                          <div className="mt-3 pt-3 border-t border-red-500/10 space-y-1.5">
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                              <Mail size={12} className="text-red-500" /> {selectedDispute.against?.email || 'N/A'}
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                              <Phone size={12} className="text-red-500" /> {selectedDispute.against?.phone || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. The Issue Section */}
                <div className="space-y-6 pt-6 border-t border-admin-border border-dashed">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <AlertCircle size={14} /> {t('dispute_subject')}
                    </h3>
                    <p className="text-xl font-black text-admin-text leading-tight">{selectedDispute.title}</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <MessageSquare size={14} /> {t('dispute_description')}
                    </h3>
                    <div className="p-8 bg-slate-50 dark:bg-slate-900/30 text-admin-text rounded-[2rem] border border-admin-border leading-relaxed italic text-base shadow-inner">
                      <span className="text-4xl text-slate-300 dark:text-slate-700 font-serif leading-none h-0 inline-block -translate-y-2 mr-1">“</span>
                      {selectedDispute.description}
                      <span className="text-4xl text-slate-300 dark:text-slate-700 font-serif leading-none h-0 inline-block translate-y-4 ml-1">”</span>
                    </div>
                  </div>
                </div>

                {/* 3. Messages History */}
                <div className="space-y-6 pt-10 border-t border-admin-border border-dashed">
                   <div className="flex justify-between items-center">
                     <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <MessageSquareText size={16} className="text-blue-500" />
                       {t('dispute_msg_history')}
                     </h3>
                     <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest border border-admin-border">
                       {selectedDispute.messages?.length || 0} {t('messages') || 'Messages'}
                     </span>
                   </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar scroll-smooth">
                      {selectedDispute.messages
                        ?.filter(msg => {
                          // Admin-only messages only visible when filtering by admin
                          if (msg.is_admin_only && recipientType !== 'admin') return false;
                          
                          // Show messages based on recipient type filter
                          if (recipientType === 'admin') {
                            // Show all messages to admin
                            return true;
                          } else if (recipientType === 'customer') {
                            // Show messages from customer or messages sent to customer
                            return msg.sender_type === 'customer' || msg.recipient_type === 'customer';
                          } else if (recipientType === 'provider') {
                            // Show messages from provider or messages sent to provider
                            return msg.sender_type === 'provider' || msg.recipient_type === 'provider';
                          } else if (recipientType === 'both') {
                            // Show all non-admin-only messages
                            return !msg.is_admin_only;
                          }
                          return true;
                        })
                        .map((msg, idx) => {
                          const isAdmin = msg.sender_type === 'admin';
                          return (
                            <div key={msg.messageID || idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] relative group/msg`}>
                                <div className={`flex items-center gap-2 mb-1 px-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    {msg.sender?.fullname || msg.sender?.name || 'System'}
                                  </p>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                                <div className={`p-4 rounded-3xl shadow-sm border ${
                                  isAdmin 
                                  ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none border-blue-500 shadow-blue-500/10' 
                                  : 'bg-white dark:bg-slate-800 border-admin-border text-admin-text rounded-tl-none'
                                }`}>
                                  <p className="text-sm leading-relaxed font-medium">{msg.message}</p>
                                </div>
                                <button 
                                  onClick={() => handleDeleteMessage(msg.messageID)}
                                  className={`absolute top-8 ${isAdmin ? '-left-8' : '-right-8'} opacity-0 group-hover/msg:opacity-100 text-red-400 hover:text-red-500 transition-all p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-admin-border`}
                                  title="Delete message"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      
                      {selectedDispute.messages?.filter(msg => {
                        if (msg.is_admin_only && recipientType !== 'admin') return false;
                        if (recipientType === 'admin') return true;
                        if (recipientType === 'customer') return msg.sender_type === 'customer' || msg.recipient_type === 'customer';
                        if (recipientType === 'provider') return msg.sender_type === 'provider' || msg.recipient_type === 'provider';
                        if (recipientType === 'both') return !msg.is_admin_only;
                        return true;
                      }).length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center opacity-20 italic">
                          <MessageSquare size={48} className="mb-4" />
                          <p className="text-xs font-black uppercase tracking-widest">{t('dispute_no_messages') || 'No messages in this thread'}</p>
                        </div>
                      )}
                    </div>

                     {/* 4. Chat Input Section */}
                    <div className="mt-8 pt-8 border-t border-admin-border">
                      <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-admin-border shadow-inner">
                        <div className="flex flex-wrap items-center gap-4 mb-4 px-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <RefreshCcw size={12} /> {t('dispute_reply_to') || 'Reply to'}:
                          </span>
                          <div className="flex gap-2">
                            {['customer', 'provider', 'admin'].map((type) => (
                              <button 
                                key={type}
                                onClick={() => setRecipientType(type)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                                  recipientType === type 
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                                  : 'bg-white dark:bg-slate-800 text-slate-500 border-admin-border hover:bg-slate-50'
                                }`}
                              >
                                {type === 'both' ? 'Both' : t(type)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="relative">
                          <textarea 
                            rows={3}
                            placeholder={t('dispute_chat_placeholder', { recipient: t(recipientType) })}
                            className="w-full p-6 bg-white dark:bg-slate-800 border border-admin-border rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 transition-all shadow-sm resize-none pr-32 placeholder:text-slate-400"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                          />
                          <button 
                            disabled={sendingMessage || !newMessage.trim()}
                            onClick={() => handleSendMessage(recipientType === 'admin')}
                            className="absolute bottom-4 right-4 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2 shadow-xl shadow-blue-500/20"
                          >
                            {sendingMessage ? <Loader2 size={16} className="animate-spin" /> : <><MessageSquare size={16} /> {t('modal_submit')}</>}
                          </button>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Right Column: Admin Control Panel (4/12) */}
              <div className="lg:col-span-4 p-8 bg-slate-50/80 dark:bg-slate-900/30 flex flex-col gap-8">
                <div>
                  <h3 className="text-[11px] font-black text-admin-text uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                     <div className="w-2 h-2 rounded-full bg-blue-600 shadow-lg shadow-blue-500/50"></div>
                     {t('dispute_resolution_panel')}
                  </h3>
                  
                  <div className="space-y-8">
                    {/* Notes Section */}
                    <div className="group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1 group-focus-within:text-blue-500 transition-colors">{t('dispute_admin_notes')}</label>
                      <textarea 
                        placeholder="Enter internal resolution notes... (Only visible to admins)"
                        className="w-full h-48 p-5 bg-white dark:bg-slate-800 border border-admin-border rounded-3xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all resize-none shadow-sm group-hover:border-slate-300 dark:group-hover:border-slate-700 placeholder:text-slate-400"
                        value={resolutionData.notes}
                        onChange={(e) => setResolutionData({...resolutionData, notes: e.target.value})}
                      />
                    </div>

                    {/* Actions Section */}
                    {selectedDispute.status !== 'resolved' ? (
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1">{t('dispute_resolution_type')}</label>
                          <select 
                            className="w-full p-5 bg-white dark:bg-slate-800 border border-admin-border rounded-2xl text-sm font-bold outline-none text-admin-text shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all"
                            value={resolutionData.resolution_type}
                            onChange={(e) => setResolutionData({...resolutionData, resolution_type: e.target.value})}
                          >
                            <option value="">{t('dispute_opt_select')}</option>
                            <option value="refund">{t('dispute_opt_refund')}</option>
                            <option value="partial_refund">{t('dispute_opt_partial')}</option>
                            <option value="cancellation">{t('dispute_opt_cancel')}</option>
                            <option value="warning">{t('dispute_opt_warning')}</option>
                            <option value="dismissed">{t('dispute_opt_dismiss')}</option>
                          </select>
                        </div>

                        {(resolutionData.resolution_type === 'refund' || resolutionData.resolution_type === 'partial_refund') && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 pl-1">{t('dispute_refund_amount')}</label>
                            <div className="relative">
                               <input 
                                type="number"
                                className="w-full p-5 pl-12 bg-white dark:bg-slate-800 border border-admin-border rounded-2xl text-sm font-bold outline-none text-admin-text shadow-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                                value={resolutionData.refund_amount}
                                onChange={(e) => setResolutionData({...resolutionData, refund_amount: e.target.value})}
                              />
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ETB</span>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 pt-6">
                          {(selectedDispute.status === 'pending' || selectedDispute.status === 'escalated' || selectedDispute.status === 'under_review') && (
                            <>
                              {selectedDispute.status !== 'under_review' && (
                                <button 
                                  onClick={() => handleUpdateStatus('under_review')}
                                  className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-black uppercase text-[11px] tracking-[0.1em] py-5 rounded-2xl transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] shadow-lg shadow-blue-500/10"
                                >
                                  <RefreshCcw size={18} /> {t('dispute_mark_review')}
                                </button>
                              )}
                              
                              <button 
                                disabled={!resolutionData.resolution_type}
                                onClick={() => handleUpdateStatus('resolved')}
                                className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-white font-black uppercase text-[11px] tracking-[0.1em] py-5 rounded-2xl shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                              >
                                <CheckCircle size={18} /> {t('dispute_resolve_close')}
                              </button>
                            </>
                          )}

                          <button 
                            onClick={() => handleUpdateStatus('rejected')}
                            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-admin-border text-red-500 dark:text-red-400 font-black uppercase text-[11px] tracking-[0.1em] py-5 rounded-2xl transition-all hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 active:scale-[0.98] shadow-sm"
                          >
                            <XCircle size={18} /> {t('dispute_reject')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Resolved State UI */
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-6 animate-in zoom-in duration-500">
                        <div className="w-20 h-20 rounded-[2rem] bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-4 border-white dark:border-slate-900">
                          <CheckCircle size={40} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest">{t('dispute_case_resolved')}</h4>
                          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-600 uppercase opacity-80">
                            {t('dispute_resolved_on', { date: new Date(selectedDispute.resolved_at || selectedDispute.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}
                          </p>
                        </div>
                        <div className="w-full h-px bg-emerald-100 dark:bg-emerald-500/10"></div>
                        <div className="w-full text-left space-y-3">
                           <p className="text-[10px] font-black text-emerald-800/50 uppercase tracking-widest">Resolution Outcome:</p>
                           <p className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-100/50">
                             {t(`dispute_opt_${selectedDispute.resolution_type}`) || selectedDispute.resolution_type || 'Case Closed'}
                           </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Section */}
                <div className="mt-auto pt-8 border-t border-admin-border border-dashed opacity-50">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Log Reference</p>
                   <p className="text-[9px] font-mono text-slate-500 truncate">DISP-AUTH-HASH: {btoa(selectedDispute.disputeID + selectedDispute.status).slice(0, 16).toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center bg-admin-card rounded-[2.5rem] border border-admin-border border-dashed">
             <AlertCircle size={40} className="text-slate-300 mb-4" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('dispute_not_found') || 'Case Not Found'}</p>
             <button onClick={handleCloseModal} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Back to List</button>
          </div>
        )
      ) : (
        /* --- LIST VIEW --- */
        <>
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center bg-admin-card rounded-[2.5rem] border border-dashed border-admin-border">
              <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] animate-pulse">{t('dispute_fetching')}</p>
            </div>
          ) : (
            <div className="bg-admin-card rounded-[2.5rem] shadow-sm border border-admin-border overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-5 border-b border-admin-border bg-admin-card flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                 <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input 
                      type="text" 
                      placeholder={t('dispute_search_placeholder')}
                      className="pl-12 pr-4 py-3 bg-admin-card border border-admin-border rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-full shadow-sm text-admin-text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
                 <div className="flex gap-2">
                    <select 
                      className="px-4 py-3 bg-admin-card border border-admin-border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none text-admin-text-muted hover:text-admin-text shadow-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">{t('dispute_all_statuses')}</option>
                      <option value="pending">{t('status_pending')}</option>
                      <option value="under_review">{t('status_under_review')}</option>
                      <option value="resolved">{t('status_resolved') || 'Resolved'}</option>
                      <option value="rejected">{t('status_rejected')}</option>
                      <option value="escalated">{t('status_escalated')}</option>
                    </select>
                    <select 
                      className="px-4 py-3 bg-admin-card border border-admin-border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none text-admin-text-muted hover:text-admin-text shadow-sm"
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                    >
                      <option value="">{t('dispute_all_priorities')}</option>
                      <option value="urgent">{t('priority_urgent')}</option>
                      <option value="high">{t('priority_high')}</option>
                      <option value="medium">{t('priority_medium')}</option>
                      <option value="low">{t('priority_low')}</option>
                    </select>
                 </div>
              </div>
              
              <div className="overflow-x-auto hidden lg:block">
                <table className="w-full text-left">
                  <thead className="bg-admin-card dark:bg-admin-sidebar text-admin-text-muted text-[10px] uppercase font-black tracking-widest border-b border-admin-border">
                    <tr>
                      <th className="px-8 py-5">{t('dispute_ref_id')}</th>
                      <th className="px-8 py-5">{t('dispute_table_title')}</th>
                      <th className="px-8 py-5">{t('dispute_table_category')}</th>
                      <th className="px-8 py-5">{t('dispute_customer')}</th>
                      <th className="px-8 py-5">{t('dispute_provider')}</th>
                      <th className="px-8 py-5">{t('dispute_priority')}</th>
                      <th className="px-8 py-5">{t('dispute_status')}</th>
                      <th className="px-8 py-5 text-right">{t('dispute_action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {disputes.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-8 py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">
                          {t('dispute_no_disputes')}
                        </td>
                      </tr>
                    ) : (
                      disputes.map((dispute) => (
                        <tr key={dispute.disputeID} className="hover:bg-admin-card transition-colors group">
                          <td className="px-8 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">#{dispute.disputeID}</td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-admin-text truncate max-w-[150px] leading-tight">{cleanTitle(dispute.title)}</span>
                              <button 
                                onClick={() => setDescModal({ 
                                  show: true, 
                                  content: dispute.description, 
                                  title: cleanTitle(dispute.title) 
                                })}
                                className="flex items-center gap-1 text-blue-500 hover:text-blue-700 font-black text-[9px] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 rounded whitespace-nowrap"
                              >
                                 • {t('vqueue_read_more')}
                              </button>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest italic leading-none">{dispute.category?.name || dispute.category}</span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-xs font-bold text-admin-text flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              {dispute.raised_by?.fullname || dispute.raised_by?.name || t('dispute_unknown_user')}
                            </p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-xs font-bold text-admin-text flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              {dispute.against?.fullname || dispute.against?.name || t('dispute_unknown_provider')}
                            </p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] uppercase tracking-wider italic ${getPriorityStyle(dispute.priority)}`}>
                              {getPriorityTranslation(dispute.priority)}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`text-[10px] font-black uppercase tracking-wider italic ${getStatusStyle(dispute.status)}`}>
                              {getStatusTranslation(dispute.status)}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={() => handleReviewCase(dispute.disputeID)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 dark:shadow-black/20 transition-all active:scale-90"
                            >
                              {t('dispute_review_case')}
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
                    <div key={dispute.disputeID} className="bg-admin-card/50 dark:bg-admin-sidebar rounded-3xl p-5 border border-admin-border space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[9px] font-black text-slate-300 dark:text-slate-600">#{dispute.disputeID}</span>
                          <p className="font-bold text-admin-text text-xs mt-0.5 leading-tight">{cleanTitle(dispute.title)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest italic">{dispute.category?.name || dispute.category}</span>
                            <button 
                              onClick={() => setDescModal({ 
                                show: true, 
                                content: dispute.description, 
                                title: cleanTitle(dispute.title) 
                              })}
                              className="text-blue-500 hover:text-blue-700 font-black text-[8px] uppercase focus:outline-none"
                            >
                               • {t('vqueue_read_more')}
                            </button>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase italic ${getStatusStyle(dispute.status)}`}>
                          {getStatusTranslation(dispute.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-admin-border border-dashed">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dispute_customer')}</p>
                          <p className="text-[10px] font-bold text-admin-text truncate">{dispute.raised_by?.fullname || 'User'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dispute_provider')}</p>
                          <p className="text-[10px] font-bold text-admin-text truncate">{dispute.against?.fullname || 'Provider'}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-admin-border border-dashed">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dispute_priority')}</p>
                          <span className={`text-[9px] font-black uppercase italic ${getPriorityStyle(dispute.priority)}`}>
                            {getPriorityTranslation(dispute.priority)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button 
                          onClick={() => handleReviewCase(dispute.disputeID)}
                          className="w-full bg-blue-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 dark:shadow-black/20"
                        >
                          {t('dispute_review_case')}
                        </button>
                      </div>
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
        </>
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