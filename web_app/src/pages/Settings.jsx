import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Save, Activity, ShieldCheck, 
  Percent, Globe, Bell, Zap, Database, Server, AlertTriangle 
} from 'lucide-react';

const Settings = () => {
  // 1. Mock Platform Configuration
  const [config, setConfig] = useState({
    commissionRate: 10,
    maxServiceRadius: 15, // in KM
    minPayoutAmount: 500,
    maintenanceMode: false,
    enableSmsNotifications: true
  });

  // 2. Mock System Health Status
  const [systemHealth] = useState([
    { name: 'API Server', status: 'Healthy', latency: '45ms', icon: Server, color: 'text-green-500' },
    { name: 'MySQL Database', status: 'Connected', latency: '12ms', icon: Database, color: 'text-green-500' },
    { name: 'SMS Gateway', status: 'Warning', latency: '1.2s', icon: Zap, color: 'text-amber-500' },
  ]);

  const handleSave = () => {
    alert("Configuration updated successfully! (Mock API call: POST /api/admin/settings)");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Platform Settings</h1>
        <p className="text-slate-500 text-sm">Configure business rules and monitor system integrity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Business Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-900">
              <SettingsIcon size={20} className="text-admin-accent" />
              General Configuration
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Commission Setting */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Percent size={14} /> Platform Commission (%)
                </label>
                <input 
                  type="number" 
                  className="w-full border-2 border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:border-admin-accent transition-all font-bold text-slate-700"
                  value={config.commissionRate}
                  onChange={(e) => setConfig({...config, commissionRate: e.target.value})}
                />
                <p className="text-[10px] text-slate-400">Percentage deducted from every completed booking.</p>
              </div>

              {/* Service Radius */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe size={14} /> Max Discovery Radius (KM)
                </label>
                <input 
                  type="number" 
                  className="w-full border-2 border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:border-admin-accent transition-all font-bold text-slate-700"
                  value={config.maxServiceRadius}
                  onChange={(e) => setConfig({...config, maxServiceRadius: e.target.value})}
                />
                <p className="text-[10px] text-slate-400">Maximum distance between Customer and Provider.</p>
              </div>

              {/* Payout Limit */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} /> Min. Payout (ETB)
                </label>
                <input 
                  type="number" 
                  className="w-full border-2 border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:border-admin-accent transition-all font-bold text-slate-700"
                  value={config.minPayoutAmount}
                  onChange={(e) => setConfig({...config, minPayoutAmount: e.target.value})}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Maintenance Mode</p>
                    <p className="text-xs text-slate-400">Lock platform for all users</p>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}
                    className={`w-12 h-6 rounded-full transition-all relative ${config.maintenanceMode ? 'bg-red-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-admin-accent hover:bg-blue-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                <Save size={18} />
                SAVE SETTINGS
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: System Health */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200">
            <h2 className="text-lg font-black flex items-center gap-2 mb-6 uppercase tracking-tighter">
              <Activity size={20} className="text-green-400" />
              System Live Health
            </h2>
            
            <div className="space-y-6">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg bg-white/10 ${item.color}`}>
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400">{item.name}</p>
                      <p className="text-sm font-black">{item.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500">LATENCY</p>
                    <p className="text-xs font-bold">{item.latency}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={18} />
              <p className="text-[10px] text-amber-200 font-medium">
                The SMS Gateway is experiencing high latency. Service Provider registrations via Phone might be delayed.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;