import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, ShieldCheck, Camera, Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Profile = () => {
  const { user, login } = useAuth();
  const fileInputRef = useRef(null);
  const location = useLocation();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profilePicture: user?.profilePicture || null
  });

  // 🚀 RE-SYNC FORM ON NAVIGATION (Clears unsaved or stale data)
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        profilePicture: user.profilePicture || null
      });
    }
  }, [location, user]); // location handles re-clicks; user handles post-login/update sync
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getBackendUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace('/api', '').replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  };

  const handleCameraClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      return triggerToast("Please select an image file", "error");
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/admin/profile/picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const newPath = response.data.path;

        // Update local state
        setProfileData(prev => ({ ...prev, profilePicture: newPath }));

        // Update context/session
        const updatedUser = { ...user, profilePicture: newPath };
        const token = sessionStorage.getItem('admin_token');
        login(updatedUser, token);

        triggerToast("Profile picture updated!");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error uploading image", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/admin/profile/update', {
        fullname: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      });

      if (response.data.success) {
        const updatedAdmin = response.data.data;
        const newUserSession = {
          ...user,
          name: updatedAdmin.fullname,
          email: updatedAdmin.email,
          phone: updatedAdmin.phone,
          profilePicture: updatedAdmin.profilePicture || user.profilePicture
        };

        // Update local session so sidebar/header updates
        const token = sessionStorage.getItem('admin_token');
        login(newUserSession, token);

        triggerToast("Profile updated successfully!");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update profile";
      triggerToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-10 right-10 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 border ${toast.type === 'success' ? 'bg-slate-900 text-green-400 border-green-500/20' : 'bg-red-600 text-white border-red-500'
          }`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}

      <h1 className="text-2xl font-black text-slate-900 italic tracking-tight">Admin Account Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Avatar Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm text-center space-y-4">
          <div className="relative w-32 h-32 mx-auto">
            <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden ring-1 ring-slate-100">
              {profileData.profilePicture ? (
                <img
                  src={getBackendUrl(profileData.profilePicture)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div
                className="w-full h-full items-center justify-center text-slate-200"
                style={{ display: profileData.profilePicture ? 'none' : 'flex' }}
              >
                <User size={64} />
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-full">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCameraClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-full border-4 border-white shadow-lg hover:bg-blue-700 transition-all active:scale-90 disabled:bg-slate-400"
            >
              <Camera size={16} />
            </button>
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xl italic tracking-tighter">{profileData.name}</h3>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 py-1 px-3 rounded-full inline-block mt-2">
              System Controller
            </p>
          </div>
        </div>

        {/* Info Form */}
        <div className="md:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleUpdate} className="p-10 space-y-8" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-6 pr-12 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                  <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-6 pr-12 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                  <Mail className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+251 ..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-6 pr-12 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-all"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                  <Phone className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white font-black py-5 rounded-3xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                {isLoading ? 'Processing...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;