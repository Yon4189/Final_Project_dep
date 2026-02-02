import React, { useState } from 'react';
import { User, Mail, Lock, ShieldCheck, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || 'admin@bdu.edu.et',
    currentPassword: '',
    newPassword: ''
  });

  const handleUpdate = (e) => {
    e.preventDefault();
    alert("Profile Updated Successfully! (Mock API: POST /api/admin/profile/update)");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-2xl font-black text-slate-900">Admin Account Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Avatar Section */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="relative w-32 h-32 mx-auto">
            <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
              <User size={64} className="text-slate-300" />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-admin-accent text-white rounded-full border-4 border-white shadow-md hover:bg-blue-600">
              <Camera size={16} />
            </button>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">{profileData.name}</h3>
            <p className="text-xs font-black text-admin-accent uppercase tracking-widest">Super Administrator</p>
          </div>
        </div>

        {/* Info Form */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleUpdate} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all font-medium text-slate-700"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all font-medium text-slate-700"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                />
              </div>
            </div>

            <hr className="border-slate-100" />
            
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock size={16} className="text-admin-accent" /> Change Password
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  type="password" placeholder="Current Password"
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all"
                  onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                />
                <input 
                  type="password" placeholder="New Password"
                  className="w-full border-2 border-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-admin-accent transition-all"
                  onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2">
              <ShieldCheck size={20} /> Update Account Security
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;