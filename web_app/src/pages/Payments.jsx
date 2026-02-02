import React, { useState } from 'react';
import { 
  TrendingUp, Wallet, CreditCard, History, 
  ArrowUpRight, ArrowDownRight, Filter, Download 
} from 'lucide-react';
import StatCard from '../components/StatCard';

const Payments = () => {
  // 1. Mock Data for Transactions
  const [transactions] = useState([
    { id: "TXN-901", date: "Jan 30, 2026", customer: "Yonas A.", provider: "Kassahun T.", total: 500, fee: 50, net: 450, status: "Released" },
    { id: "TXN-902", date: "Jan 30, 2026", customer: "Abebe B.", provider: "Hanna A.", total: 1200, fee: 120, net: 1080, status: "Held in Wallet" },
    { id: "TXN-903", date: "Jan 29, 2026", customer: "Sara K.", provider: "Yared T.", total: 350, fee: 35, net: 315, status: "Released" },
    { id: "TXN-904", date: "Jan 29, 2026", customer: "Mulugeta S.", provider: "Selam T.", total: 800, fee: 80, net: 720, status: "Refunded" },
  ]);

  // 2. Summary Statistics
  const financialStats = [
    { title: 'Total Volume', value: '254,000 ETB', icon: CreditCard, color: 'bg-blue-500' },
    { title: 'Net Commission (Revenue)', value: '25,400 ETB', icon: TrendingUp, color: 'bg-green-500' },
    { title: 'Funds in Escrow/Wallet', value: '12,500 ETB', icon: Wallet, color: 'bg-amber-500' },
    { title: 'Total Payouts', value: '216,100 ETB', icon: History, color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Payment Analytics</h1>
          <p className="text-slate-500 text-sm">Monitor platform revenue and transaction history.</p>
        </div>
        
        <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <Download size={18} />
          Export Report
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 text-lg">Transaction History</h2>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter by Date</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Parties</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Platform Fee (10%)</th>
                <th className="px-6 py-4">Provider Net</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">{txn.id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{txn.customer} → {txn.provider}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{txn.date}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">{txn.total} ETB</td>
                  <td className="px-6 py-4 text-sm text-green-600 font-bold flex items-center gap-1">
                    <ArrowUpRight size={14} /> {txn.fee} ETB
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{txn.net} ETB</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                      txn.status === 'Released' ? 'bg-green-100 text-green-600' :
                      txn.status === 'Refunded' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payments;