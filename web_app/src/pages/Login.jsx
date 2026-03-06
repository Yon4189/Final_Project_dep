import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api/axios';

const Login = () => {
  // Mode toggle: 'login' or 'forgot'
  const [viewMode, setViewMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); // For forgot password feedback
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // --- Login Handler ---
  // In your Login component (admin login)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/admin/login', { email, password });
      if (response.data.success) {
        // The backend returns { success: true, message: "...", data: { admin: {...}, token: "..." } }
        const { admin: adminData, token } = response.data.data;

        const userSession = {
          id: adminData.adminID,
          name: adminData.fullname,
          email: adminData.email,
          phone: adminData.phone,
          profilePicture: adminData.profilePicture,
          role: 'admin'
        };
        login(userSession, token);
        navigate('/');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  } catch (err) {
    setError(err.response?.data?.message || 'Login failed');
  } finally {
    setIsLoading(false);
  }
};

// --- Forgot Password Handler ---
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      // Hits the multi-table route we discussed earlier
      const response = await api.post('/forgot-password', { email });
      if (response.data.success) {
        setSuccessMsg("Reset link sent! Please check your email inbox.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error sending reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 md:p-14 animate-in fade-in zoom-in duration-500">

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800">
            {viewMode === 'login' ? 'Admin Login' : 'Reset Password'}
          </h2>
          {viewMode === 'forgot' && (
            <p className="text-slate-500 text-sm mt-2">Enter your email to receive a reset link</p>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3 bg-green-50 border border-green-100 text-green-600 text-xs font-bold rounded-xl text-center">
            {successMsg}
          </div>
        )}

        {viewMode === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="email" required placeholder="Enter your email"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} required placeholder="Enter your password"
                name="admin_password_unique"
                autoComplete="new-password"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setViewMode('forgot'); setError(''); setSuccessMsg(''); }}
                className="text-blue-600 text-xs font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-[#4a90e2] hover:bg-blue-600 text-white font-black py-4 rounded-full flex items-center justify-center gap-2 uppercase tracking-widest">
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Login'}
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="relative">
              <input
                type="email" required placeholder="Your email address"
                className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
              <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-black py-4 rounded-full flex items-center justify-center gap-2 uppercase tracking-widest">
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Send Link'}
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('login'); setError(''); setSuccessMsg(''); }}
              className="w-full flex items-center justify-center gap-2 text-slate-500 text-xs font-bold hover:text-slate-800 transition-all"
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;