import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  AlertCircle, CheckCircle, RefreshCcw, XCircle, 
  User, Wrench, MessageSquare, ExternalLink, Search,
  Loader2, Filter, ChevronRight, MessageSquareText, Trash2
} from 'lucide-react';
import { disputeAPI } from '../api/dispute';

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
      }
    } catch (error) {
      console.error('Failed to fetch dispute details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedDispute(null);
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
      alert(t('user_mgmt_err_status') + ': ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'under_review': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'resolved': return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'rejected': return 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
      case 'escalated': return 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default: return 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-admin-text tracking-tight italic">{t('dispute_title')}</h1>
          <p className="text-admin-text-muted text-[10px] font-black uppercase tracking-widest italic mt-1">{t('dispute_subtitle')}</p>
        </div>
        
        {stats && (
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

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center bg-admin-card rounded-3xl border border-dashed border-admin-border">
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
                  <th className="px-8 py-5">{t('dispute_title_cat')}</th>
                  <th className="px-8 py-5">{t('dispute_parties')}</th>
                  <th className="px-8 py-5">{t('dispute_priority')}</th>
                  <th className="px-8 py-5">{t('dispute_status')}</th>
                  <th className="px-8 py-5 text-right">{t('dispute_action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">
                      {t('dispute_no_disputes')}
                    </td>
                  </tr>
                ) : (
                  disputes.map((dispute) => (
                    <tr key={dispute.disputeID} className="hover:bg-admin-card transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">#{dispute.disputeID}</td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-admin-text text-sm truncate max-w-[200px]">{dispute.title}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest italic">{dispute.category?.name || dispute.category}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {dispute.raised_by?.fullname || dispute.raised_by?.name || t('dispute_unknown_user')}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 uppercase italic ml-2.5">
                            vs {dispute.against?.fullname || dispute.against?.name || t('dispute_unknown_provider')}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getPriorityStyle(dispute.priority)}`}>
                          {getPriorityTranslation(dispute.priority)}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(dispute.status)}`}>
                          <span className="text-admin-text">{getStatusTranslation(dispute.status)}</span>
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
                      <p className="font-bold text-admin-text text-sm mt-0.5 leading-tight">{dispute.title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(dispute.status)}`}>
                      <span className="text-admin-text">{getStatusTranslation(dispute.status)}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-admin-border border-dashed">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dispute_parties')}</p>
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{dispute.raised_by?.fullname || 'User'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">vs {dispute.against?.fullname || 'Provider'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dispute_priority')}</p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityStyle(dispute.priority)}`}>
                        {getPriorityTranslation(dispute.priority)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleReviewCase(dispute.disputeID)}
                      className="w-full bg-blue-600 bg-admin-card text-white py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 dark:shadow-black/20 border border-transparent dark:border-slate-700"
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

      {/* --- REVIEW MODAL --- */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-admin-card rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200 my-auto border border-transparent dark:border-slate-800">
            <div className="p-6 bg-admin-card dark:bg-black text-admin-text flex justify-between items-center border-b border-admin-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <AlertCircle size={20} className="text-red-400" />
                   <h2 className="text-lg font-black uppercase tracking-tight">{t('dispute_case_review')}: #{selectedDispute.disputeID}</h2>
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                  {t('dispute_status')}: <span className="text-admin-text">{getStatusTranslation(selectedDispute.status)}</span> | 
                  {t('dispute_priority')}: <span className="text-admin-text">{getPriorityTranslation(selectedDispute.priority)}</span>
                </p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <XCircle size={32} strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-admin-border">
              {/* Left Column: Details & Parties */}
              <div className="lg:col-span-2 p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-admin-sidebar rounded-2xl border border-admin-border">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Complainant ({t(selectedDispute.raised_by_type?.toLowerCase())})</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-admin-text leading-none">
                          {selectedDispute.raised_by?.fullname || selectedDispute.raised_by?.name || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-admin-text-muted font-medium">ID: {selectedDispute.raised_by_id}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-admin-sidebar rounded-2xl border border-admin-border">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Against ({t(selectedDispute.against_type?.toLowerCase())})</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                        <Wrench size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-admin-text leading-none">
                          {selectedDispute.against?.fullname || selectedDispute.against?.name || 'Unknown Provider'}
                        </p>
                        <p className="text-[10px] text-admin-text-muted font-medium">ID: {selectedDispute.against_id}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-admin-text uppercase mb-2">{t('dispute_subject')}</h3>
                    <p className="text-lg font-bold text-slate-800 text-admin-text">{selectedDispute.title}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2">{t('dispute_description')}</h3>
                    <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-300 rounded-2xl border border-blue-100/50 dark:border-blue-900/50 leading-relaxed italic">
                      "{selectedDispute.description}"
                    </div>
                  </div>
                </div>

                {/* Messages History */}
                <div className="space-y-4">
                   <h3 className="text-xs font-black text-admin-text uppercase flex items-center gap-2">
                     <MessageSquareText size={16} className="text-blue-500" />
                     {t('dispute_msg_history')}
                   </h3>
                   <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                     {selectedDispute.messages?.map((msg, idx) => (
                       <div key={msg.messageID || idx} className={`p-4 rounded-2xl border shadow-sm group/msg relative ${
                         msg.sender_type === 'admin' 
                         ? 'bg-blue-600 dark:bg-black text-white ml-auto border-blue-700 dark:border-slate-700' 
                         : 'bg-admin-card border-admin-border text-slate-800 text-admin-text'
                       } max-w-[90%]`}>
                         <div className="flex justify-between items-start mb-1">
                           <p className={`text-[9px] font-black uppercase tracking-widest ${msg.sender_type === 'admin' ? 'text-blue-100' : 'text-slate-400'}`}>
                             {t(msg.sender_type?.toLowerCase())} • {msg.sender?.fullname || msg.sender?.name || 'System'}
                           </p>
                           <div className="flex items-center gap-2">
                             <p className="text-[9px] opacity-40">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             <button 
                               onClick={() => handleDeleteMessage(msg.messageID)}
                               className="opacity-0 group-hover/msg:opacity-100 text-red-400 hover:text-red-500 transition-all p-1"
                               title="Delete message"
                             >
                               <Trash2 size={12} />
                             </button>
                           </div>
                         </div>
                         <p className="text-xs leading-relaxed">{msg.message}</p>
                       </div>
                     ))}
                    </div>
                     {/* Chat Input */}
                    <div className="mt-4 pt-4 border-t border-admin-border">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipient:</span>
                          <div className="flex gap-1">
                            {['customer', 'provider', 'admin'].map((type) => (
                              <button 
                                key={type}
                                onClick={() => setRecipientType(type)}
                                className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${
                                  recipientType === type 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'bg-slate-100 dark:bg-admin-sidebar text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {t(type)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder={t('dispute_chat_placeholder', { recipient: t(recipientType) })}
                            className="flex-1 p-3 bg-admin-card border border-admin-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-admin-text transition-all"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(recipientType === 'admin')}
                          />
                          <button 
                            disabled={sendingMessage || !newMessage.trim()}
                            onClick={() => handleSendMessage(recipientType === 'admin')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2"
                          >
                            {sendingMessage ? <Loader2 size={14} className="animate-spin" /> : t('modal_submit')}
                          </button>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Right Column: Admin Actions */}
              <div className="p-8 bg-slate-50 dark:bg-admin-sidebar/50 space-y-6">
                <h3 className="text-xs font-black text-admin-text uppercase">{t('dispute_resolution_panel')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">{t('dispute_admin_notes')}</label>
                    <textarea 
                      placeholder="Enter internal resolution notes..."
                      className="w-full h-32 p-3 bg-admin-card border border-admin-border rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 outline-none text-admin-text transition-all resize-none"
                      value={resolutionData.notes}
                      onChange={(e) => setResolutionData({...resolutionData, notes: e.target.value})}
                    />
                  </div>

                  {selectedDispute.status !== 'resolved' && (
                    <div className="space-y-4">                       <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">{t('dispute_resolution_type')}</label>
                        <select 
                          className="w-full p-3 bg-admin-card border border-admin-border rounded-xl text-xs font-bold outline-none dark:text-white"
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
                        <div>
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">{t('dispute_refund_amount')}</label>
                          <input 
                            type="number"
                            className="w-full p-3 bg-admin-card border border-admin-border rounded-xl text-xs font-bold outline-none dark:text-white"
                            value={resolutionData.refund_amount}
                            onChange={(e) => setResolutionData({...resolutionData, refund_amount: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4">
                  {(selectedDispute.status === 'pending' || selectedDispute.status === 'escalated') && (
                    <button 
                      onClick={() => handleUpdateStatus('under_review')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-100"
                    >
                      {t('dispute_mark_review')}
                    </button>
                  )}
                  
                  {selectedDispute.status !== 'resolved' && (
                    <button 
                      disabled={!resolutionData.resolution_type}
                      onClick={() => handleUpdateStatus('resolved')}
                      className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-100 transition-all hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={18} /> {t('dispute_resolve_close')}
                    </button>
                  )}

                  <button 
                    onClick={() => handleUpdateStatus('rejected')}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all hover:bg-slate-50 active:scale-95"
                  >
                    {t('dispute_reject')}
                  </button>
                </div>

                {selectedDispute.status === 'resolved' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-green-900">{t('dispute_case_resolved')}</p>
                      <p className="text-[10px] text-green-700">{t('dispute_resolved_on', { date: new Date(selectedDispute.resolved_at).toLocaleDateString() })}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disputes;