import React, { useState } from 'react';
import { 
  AlertCircle, CheckCircle, RefreshCcw, XCircle, 
  User, Wrench, MessageSquare, ExternalLink, Search 
} from 'lucide-react';

const Disputes = () => {
  // 1. Mock Data for Complaints
  const [disputes, setDisputes] = useState([
    { 
      id: "DIS-701", 
      customer: "Yonas Abate", 
      provider: "Kassahun T.", 
      service: "Plumbing", 
      reason: "Provider did not show up after payment.", 
      amount: "450 ETB",
      status: "Open",
      date: "Jan 28, 2026"
    },
    { 
      id: "DIS-702", 
      customer: "Abebe Balcha", 
      provider: "Hanna Alemu", 
      service: "Cleaning", 
      reason: "Incomplete work. Left the kitchen dirty.", 
      amount: "300 ETB",
      status: "Under Review",
      date: "Jan 29, 2026"
    },
    { 
      id: "DIS-703", 
      customer: "Sara K.", 
      provider: "Yared T.", 
      service: "Car Wash", 
      reason: "Accidental damage to side mirror.", 
      amount: "200 ETB",
      status: "Resolved",
      date: "Jan 25, 2026"
    }
  ]);

  const [selectedDispute, setSelectedDispute] = useState(null);

  // 2. Action Handlers
  const handleAction = (id, newStatus, message) => {
    setDisputes(prev => prev.map(d => 
      d.id === id ? { ...d, status: newStatus } : d
    ));
    alert(`Dispute ${id}: ${message}`);
    setSelectedDispute(null);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Dispute Resolution</h1>
        <p className="text-slate-500 text-sm">Review complaints and manage refunds between users.</p>
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Complainant</th>
              <th className="px-6 py-4">Against</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {disputes.map((dispute) => (
              <tr key={dispute.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{dispute.id}</td>
                <td className="px-6 py-4 font-bold text-slate-900">{dispute.customer}</td>
                <td className="px-6 py-4 text-sm text-slate-600 font-medium">{dispute.provider}</td>
                <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{dispute.reason}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                    dispute.status === 'Open' ? 'bg-red-100 text-red-600' :
                    dispute.status === 'Under Review' ? 'bg-amber-100 text-amber-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {dispute.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedDispute(dispute)}
                    className="bg-admin-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-md shadow-blue-100"
                  >
                    Review Case
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- REVIEW MODAL --- */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2">
                <AlertCircle size={24} className="text-red-400" />
                Case Review: {selectedDispute.id}
              </h2>
              <button onClick={() => setSelectedDispute(null)} className="text-slate-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Customer (Complainant)</p>
                  <p className="font-bold text-slate-900 flex items-center gap-2"><User size={16}/> {selectedDispute.customer}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Provider (Subject)</p>
                  <p className="font-bold text-slate-900 flex items-center gap-2"><Wrench size={16}/> {selectedDispute.provider}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase">Complaint Description</p>
                <div className="p-4 bg-blue-50 text-blue-900 rounded-2xl border border-blue-100 italic">
                  "{selectedDispute.reason}"
                </div>
                <p className="text-xs text-slate-400">Transaction Amount: <span className="font-bold text-slate-600">{selectedDispute.amount}</span></p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  onClick={() => handleAction(selectedDispute.id, 'Resolved', 'Marked as resolved.')}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-100 transition-all"
                >
                  <CheckCircle size={20} /> Resolve Case
                </button>
                
                <button 
                  onClick={() => handleAction(selectedDispute.id, 'Refunded', 'Refund initiated to Customer.')}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-100 transition-all"
                >
                  <RefreshCcw size={20} /> Authorize Refund
                </button>

                <button 
                  onClick={() => handleAction(selectedDispute.id, 'Dismissed', 'Complaint dismissed.')}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-xl transition-all"
                >
                  Dismiss Case
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Disputes;