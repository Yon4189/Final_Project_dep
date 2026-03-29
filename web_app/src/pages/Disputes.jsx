import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  AlertCircle, CheckCircle, RefreshCcw, XCircle, 
  User, Wrench, MessageSquare, ExternalLink, Search,
  Loader2, Filter, ChevronRight, MessageSquareText, Trash2
} from 'lucide-react';
import { disputeAPI } from '../api/dispute';

const Disputes = () => {
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    status: '',
    notes: '',
    resolution_type: '',
    refund_amount: 0
  });
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // 1. Data Fetching with TanStack Query
  const { 
    data: { disputes = [], stats = null } = {}, 
    isLoading: loading, 
    refetch 
  } = useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const response = await disputeAPI.getAllDisputes();
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
    refetchInterval: 20000,
  });

  const handleReviewCase = async (disputeID) => {
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
        alert('Dispute updated successfully');
        setSelectedDispute(null);
        queryClient.invalidateQueries({ queryKey: ['disputes'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      }
    } catch (error) {
      console.error('Failed to update dispute:', error);
      alert(error.response?.data?.message || 'Failed to update dispute');
    }
  };

  const handleDeleteMessage = async (messageID) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

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
      alert('Failed to delete message');
    }
  };

  const handleSendMessage = async (isAdminOnly = false) => {
    if (!newMessage.trim() || !selectedDispute) return;

    try {
      setSendingMessage(true);
      const response = await disputeAPI.addDisputeMessage(
        selectedDispute.disputeID, 
        newMessage, 
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
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-red-100 text-red-600';
      case 'under_review': return 'bg-amber-100 text-amber-600';
      case 'resolved': return 'bg-green-100 text-green-600';
      case 'rejected': return 'bg-slate-100 text-slate-600';
      case 'escalated': return 'bg-purple-100 text-purple-600';
      default: return 'bg-slate-100 text-slate-600';
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

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Dispute Resolution</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">Review complaints and manage refunds</p>
        </div>
        
        {stats && (
          <div className="flex gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto overflow-x-auto">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
              <p className="text-lg font-black text-slate-900">{stats.total || 0}</p>
            </div>
            <div className="w-px h-6 bg-slate-200 mt-1"></div>
            <div className="text-right min-w-fit">
              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Pending</p>
              <p className="text-lg font-black text-red-600">{stats.pending || stats.by_status?.pending || 0}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
          <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Fetching cases...</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
             <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by ID or title..." 
                  className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-full shadow-sm"
                />
             </div>
             <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 px-5 py-3 rounded-2xl text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase shadow-sm transition-all">
               <Filter size={14} /> Filter Tools
             </button>
          </div>
          
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5">Ref ID</th>
                  <th className="px-8 py-5">Title / Category</th>
                  <th className="px-8 py-5">Parties Involved</th>
                  <th className="px-8 py-5">Priority</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">
                      No disputes found in database
                    </td>
                  </tr>
                ) : (
                  disputes.map((dispute) => (
                    <tr key={dispute.disputeID} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-xs font-bold text-slate-400 font-mono">#{dispute.disputeID}</td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{dispute.title}</p>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">{dispute.category}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            {dispute.raised_by?.first_name} {dispute.raised_by?.last_name || dispute.raised_by?.business_name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 uppercase italic ml-2.5">
                            vs {dispute.against?.first_name} {dispute.against?.last_name || dispute.against?.business_name}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getPriorityStyle(dispute.priority)}`}>
                          {dispute.priority}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(dispute.status)}`}>
                          {dispute.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => handleReviewCase(dispute.disputeID)}
                          className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-slate-100 transition-all active:scale-90"
                        >
                          Review Case
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
                <div key={dispute.disputeID} className="bg-slate-50 rounded-3xl p-5 border border-slate-200 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[9px] font-black text-slate-300">#{dispute.disputeID}</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5 leading-tight">{dispute.title}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(dispute.status)}`}>
                      {dispute.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200 border-dashed">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Parties</p>
                      <p className="text-[10px] font-bold text-slate-700 truncate">{dispute.raised_by?.first_name || 'User'}</p>
                      <p className="text-[10px] text-slate-400">vs {dispute.against?.first_name || 'Provider'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Priority</p>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getPriorityStyle(dispute.priority)}`}>
                        {dispute.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleReviewCase(dispute.disputeID)}
                      className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-slate-100"
                    >
                      Review & Resolve
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase italic">
                No active disputes
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- REVIEW MODAL --- */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200 my-auto">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                   <AlertCircle size={20} className="text-red-400" />
                   <h2 className="text-lg font-black uppercase tracking-tight">Case Review: #{selectedDispute.disputeID}</h2>
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                  Status: <span className="text-white">{selectedDispute.status?.replace('_', ' ')}</span> | 
                  Priority: <span className="text-white">{selectedDispute.priority}</span>
                </p>
              </div>
              <button onClick={() => setSelectedDispute(null)} className="text-slate-400 hover:text-white transition-colors">
                <XCircle size={32} strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Left Column: Details & Parties */}
              <div className="lg:col-span-2 p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Complainant ({selectedDispute.raised_by_type})</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none">
                          {selectedDispute.raised_by?.first_name || selectedDispute.raised_by?.business_name} {selectedDispute.raised_by?.last_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">ID: {selectedDispute.raised_by_id}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Against ({selectedDispute.against_type})</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <Wrench size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-none">
                          {selectedDispute.against?.first_name || selectedDispute.against?.business_name} {selectedDispute.against?.last_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">ID: {selectedDispute.against_id}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase mb-2">Subject</h3>
                    <p className="text-lg font-bold text-slate-800">{selectedDispute.title}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Description</h3>
                    <div className="p-5 bg-blue-50/50 text-blue-900 rounded-2xl border border-blue-100/50 leading-relaxed italic">
                      "{selectedDispute.description}"
                    </div>
                  </div>
                </div>

                {/* Messages History */}
                <div className="space-y-4">
                   <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                     <MessageSquareText size={16} className="text-blue-500" />
                     Message History
                   </h3>
                   <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                     {selectedDispute.messages?.map((msg, idx) => (
                       <div key={msg.messageID || idx} className={`p-4 rounded-2xl border shadow-sm group/msg relative ${
                         msg.sender_type === 'admin' 
                         ? 'bg-slate-900 text-white ml-auto border-slate-800' 
                         : 'bg-white border-slate-100'
                       } max-w-[90%]`}>
                         <div className="flex justify-between items-start mb-1">
                           <p className={`text-[9px] font-black uppercase tracking-widest ${msg.sender_type === 'admin' ? 'text-slate-400' : 'text-slate-400'}`}>
                             {msg.sender_type} • {msg.sender?.first_name || msg.sender?.business_name || 'System'}
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
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Type a message to users..."
                          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(false)}
                        />
                        <button 
                          disabled={sendingMessage || !newMessage.trim()}
                          onClick={() => handleSendMessage(false)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-2"
                        >
                          {sendingMessage ? <Loader2 size={14} className="animate-spin" /> : 'Send'}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 px-1 italic">
                        * Messages sent here are visible to both the Customer and the Provider.
                      </p>
                    </div>
                 </div>
              </div>

              {/* Right Column: Admin Actions */}
              <div className="p-8 bg-slate-50 space-y-6">
                <h3 className="text-xs font-black text-slate-900 uppercase">Resolution Panel</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Admin Notes</label>
                    <textarea 
                      placeholder="Enter internal resolution notes..."
                      className="w-full h-32 p-3 bg-white border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      value={resolutionData.notes}
                      onChange={(e) => setResolutionData({...resolutionData, notes: e.target.value})}
                    />
                  </div>

                  {selectedDispute.status !== 'resolved' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Resolution Type</label>
                        <select 
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          value={resolutionData.resolution_type}
                          onChange={(e) => setResolutionData({...resolutionData, resolution_type: e.target.value})}
                        >
                          <option value="">Select Action...</option>
                          <option value="refund">Full Refund to Customer</option>
                          <option value="partial_refund">Partial Refund</option>
                          <option value="cancellation">Simple Cancellation</option>
                          <option value="warning">Warn Parties (No Refund)</option>
                          <option value="dismissed">Dismiss Case</option>
                        </select>
                      </div>

                      {(resolutionData.resolution_type === 'refund' || resolutionData.resolution_type === 'partial_refund') && (
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Refund Amount (ETB)</label>
                          <input 
                            type="number"
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            value={resolutionData.refund_amount}
                            onChange={(e) => setResolutionData({...resolutionData, refund_amount: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4">
                  {selectedDispute.status === 'pending' && (
                    <button 
                      onClick={() => handleUpdateStatus('under_review')}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3 rounded-xl transition-all hover:bg-black active:scale-95"
                    >
                      Mark as Under Review
                    </button>
                  )}
                  
                  {selectedDispute.status !== 'resolved' && (
                    <button 
                      disabled={!resolutionData.resolution_type}
                      onClick={() => handleUpdateStatus('resolved')}
                      className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-100 transition-all hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={18} /> Resolve & Close Case
                    </button>
                  )}

                  <button 
                    onClick={() => handleUpdateStatus('rejected')}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all hover:bg-slate-50 active:scale-95"
                  >
                    Reject Dispute
                  </button>
                </div>

                {selectedDispute.status === 'resolved' && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-green-900">Case Resolved</p>
                      <p className="text-[10px] text-green-700">This case was closed on {new Date(selectedDispute.resolved_at).toLocaleDateString()}.</p>
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