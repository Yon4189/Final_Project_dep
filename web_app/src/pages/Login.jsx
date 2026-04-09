import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Lock, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck, Sun, Moon } from 'lucide-react';
import api from '../api/axios';
import logo from '../assets/logo.jpg';

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
  const { isDarkMode, toggleTheme } = useTheme();
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
        // extract admin data and token from response
        const adminData = response.data.data.admin;  // fixed: access admin object
        const token = response.data.data.token;      // fixed: access token from data object

        // store token in sessionStorage
        sessionStorage.setItem('admin_token', token);

        // create user session object
        const userSession = {
          id: adminData.adminID,
          name: adminData.fullname,
          email: adminData.email,
          phone: adminData.phone,
          profilePicture: adminData.profilePicture,
          role: 'admin'
        };

        // store user data in sessionStorage
        sessionStorage.setItem('admin_user', JSON.stringify(userSession));

        // call login function from auth context
        login(userSession, token);

        // redirect to dashboard
        navigate('/admin');
      } else {
        setError(response.data.message || 'Login failed');
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
      const response = await api.post('/forgot-password', { email, role: 'admin' });
      if (response.data.success) {
        setSuccessMsg("Verification code sent! Redirecting...");
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error sending verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-admin-content flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Decorative Background Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute top-6 left-6 right-6 md:top-10 md:left-10 md:right-10 flex justify-between items-center z-50">
        <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-admin-text-muted hover:text-slate-900 dark:hover:text-white transition-all bg-white/80 backdrop-blur-md dark:bg-admin-card/80 px-5 py-2.5 rounded-full shadow-sm hover:shadow hover:-translate-y-0.5 border border-slate-200 dark:border-admin-border font-bold text-sm">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <button 
          onClick={toggleTheme}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-admin-card/80 backdrop-blur-md shadow-sm hover:shadow hover:-translate-y-0.5 border border-slate-200 dark:border-admin-border text-slate-500 dark:text-admin-text-muted hover:text-slate-900 dark:hover:text-white transition-all"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl dark:bg-admin-card w-full max-w-md rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-2xl p-8 sm:p-12 animate-in fade-in slide-in-from-bottom-8 duration-700 border border-white dark:border-slate-800 relative z-10">

        <div className="text-center mb-10 space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-xl p-2 mb-6 transform hover:scale-105 transition-transform duration-300">
            <img src={logo} alt="Ethio HandyMan" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {viewMode === 'login' ? 'Welcome Back' : 'Recover Access'}
          </h2>
          <p className="text-slate-500 dark:text-admin-text-muted text-sm font-medium">
            {viewMode === 'login'
              ? 'Enter your credentials to access the system'
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 outline-red-200 outline outline-4 outline-offset-[-4px] text-sm font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Lock size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-8 p-4 bg-green-50 border border-green-100 text-green-600 outline-green-200 outline outline-4 outline-offset-[-4px] text-sm font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <ShieldCheck size={18} className="shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {viewMode === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 dark:text-admin-text-muted uppercase tracking-wider ml-2 group-focus-within:text-blue-600 transition-colors">Admin Email</label>
              <div className="relative">
                <input
                  type="email" required placeholder="Admin@gmail.com"
                  className="w-full bg-slate-100/50 dark:bg-admin-content/50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-6 pr-14 text-slate-900 dark:text-white transition-all outline-none focus:bg-white dark:focus:bg-admin-card shadow-sm focus:shadow-md"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 dark:text-admin-text-muted uppercase tracking-wider ml-2 group-focus-within:text-blue-600 transition-colors">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required placeholder="••••••••"
                  name="admin_password_unique"
                  autoComplete="new-password"
                  className="w-full bg-slate-100/50 dark:bg-admin-content/50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-6 pr-14 text-slate-900 dark:text-white transition-all outline-none focus:bg-white dark:focus:bg-admin-card shadow-sm focus:shadow-md tracking-wider font-medium"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => { setViewMode('forgot'); setError(''); setSuccessMsg(''); }}
                className="text-blue-600 hover:text-blue-700 text-sm font-bold hover:underline transition-all"
              >
                forgot Password?
              </button>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95 mt-6">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Login'}
              {!isLoading && <ArrowLeft size={20} className="rotate-180" />}
            </button>
          </form>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 dark:text-admin-text-muted uppercase tracking-wider ml-2 group-focus-within:text-blue-600 transition-colors">Registered Email</label>
              <div className="relative">
                <input
                  type="email" required placeholder="Admin@gmail.com"
                  className="w-full bg-slate-100/50 dark:bg-admin-content/50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-6 pr-14 text-slate-900 dark:text-white transition-all outline-none focus:bg-white dark:focus:bg-admin-card shadow-sm focus:shadow-md"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95 mt-6">
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => { setViewMode('login'); setError(''); setSuccessMsg(''); }}
              className="w-full flex items-center justify-center gap-2 text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors pt-4"
            >
              <ArrowLeft size={16} /> Return to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;