import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Save, Activity, ShieldCheck, 
  Percent, Globe, Zap, Database, Server, AlertTriangle,
  Image as ImageIcon, Type, UploadCloud
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  // 1. Mock Platform Configuration
  const [config, setConfig] = useState({
    commissionRate: 10,
    maxServiceRadius: 15,
    minPayoutAmount: 500,
    maintenanceMode: false,
  });

  // 2. Mock Branding Configuration (New)
  const [branding, setBranding] = useState({
    systemName: 'Service Finder',
    logoUrl: null, // Would be a URL from the backend
  });

  // 3. Mock System Health
  const [systemHealth] = useState([
    { name: 'API Server', status: 'Healthy', latency: '45ms', icon: Server, color: 'text-green-500' },
    { name: 'MySQL Database', status: 'Connected', latency: '12ms', icon: Database, color: 'text-green-500' },
    { name: 'SMS Gateway', status: 'Warning', latency: '1.2s', icon: Zap, color: 'text-amber-500' },
  ]);

  const handleSave = () => {
    alert(`Success: ${activeTab === 'general' ? 'Platform Rules' : 'Branding'} updated!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 italic uppercase">Platform Settings</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest italic mt-1">Control system-wide behavior and branding.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Configuration Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-slate-200/50 w-fit rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('general')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'general' ? 'bg-white text-admin-accent shadow-sm' : 'text-slate-500'}`}
            >
              General Rules
            </button>
            <button 
              onClick={() => setActiveTab('branding')}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'branding' ? 'bg-white text-admin-accent shadow-sm' : 'text-slate-500'}`}
            >
              System Branding
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {activeTab === 'general' ? (
              /* --- GENERAL RULES TAB --- */
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Percent size={14} /> Platform Commission (%)
                    </label>
                    <input 
                      type="number" 
                      className="w-full border-2 border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:border-admin-accent font-bold text-slate-700"
                      value={config.commissionRate}
                      onChange={(e) => setConfig({...config, commissionRate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe size={14} /> Discovery Radius (KM)
                    </label>
                    <input 
                      type="number" 
                      className="w-full border-2 border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:border-admin-accent font-bold text-slate-700"
                      value={config.maxServiceRadius}
                      onChange={(e) => setConfig({...config, maxServiceRadius: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-red-900 font-black">Maintenance Mode</p>
                    <p className="text-xs text-red-700">Disable platform access for all customers and providers.</p>
                  </div>
                  <button 
                    onClick={() => setConfig({...config, maintenanceMode: !config.maintenanceMode})}
                    className={`w-14 h-7 rounded-full transition-all relative ${config.maintenanceMode ? 'bg-red-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${config.maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            ) : (
              /* --- BRANDING TAB (LOGO & NAME) --- */
              <div className="p-8 space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Type size={14} /> Application Name
                  </label>
                  <input 
                    type="text" 
                    className="w-full border-2 border-slate-100 rounded-2xl py-4 px-4 focus:outline-none focus:border-admin-accent font-black text-slate-800 text-lg"
                    value={branding.systemName}
                    onChange={(e) => setBranding({...branding, systemName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={14} /> Platform Logo
                  </label>
                  <div className="flex flex-col md:flex-row gap-6 items-center border-2 border-dashed border-slate-100 p-8 rounded-3xl bg-slate-50/50">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-300">
                      {branding.logoUrl ? <img src={branding.logoUrl} alt="logo" /> : <ImageIcon size={40} />}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-sm font-bold text-slate-700">Upload New Logo</p>
                      <p className="text-xs text-slate-400 mb-4">Recommended: SVG or Transparent PNG (512x512)</p>
                      <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all">
                        <UploadCloud size={16} /> Choose File
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-admin-accent hover:bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                <Save size={20} />
                APPLY CHANGES
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: System Health */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-300 border border-white/5">
            <h2 className="text-sm font-black flex items-center gap-2 mb-8 uppercase tracking-widest">
              <Activity size={18} className="text-admin-accent" />
              Live System Status
            </h2>
            
            <div className="space-y-6">
              {systemHealth.map((item, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${item.color} group-hover:scale-110 transition-transform`}>
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase">{item.name}</p>
                      <p className="text-xs font-bold text-slate-200 tracking-wide">{item.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase">Latency</p>
                    <p className="text-xs font-mono font-bold text-admin-accent">{item.latency}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                <AlertTriangle size={14} className="text-amber-500" /> System Logs
              </div>
              <p className="text-[10px] leading-relaxed text-slate-400 italic">
                Everything looking good! No critical server errors reported in the last 24 hours.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;