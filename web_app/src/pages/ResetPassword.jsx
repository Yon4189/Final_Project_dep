import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, Hash, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../api/axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isDarkMode, toggleTheme } = useTheme();

  // Get data from the URL (e.g., ?email=...)
  const email = searchParams.get('email') || '';

  const [tokenInput, setTokenInput] = useState('');
  const [password, setPassword] = useState('');
  const [password_confirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== password_confirmation) {
      return setError(t('reset_error_match'));
    }

    setIsLoading(true);
    try {
      const response = await api.post('/reset-password', {
        email,
        token: tokenInput,
        password,
        password_confirmation,
        role: 'admin'
      });

      if (response.data.success) {
        setIsFinished(true);
        setTimeout(() => navigate('/login'), 3000); // Redirect after 3 seconds
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-admin-content flex items-center justify-center p-6">
        <div className="bg-admin-card w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center border border-transparent dark:border-slate-800">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold text-admin-text">{t('reset_success_title')}</h2>
          <p className="text-admin-text-muted mt-2">{t('reset_success_subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-admin-content flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute -top-40 -left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navbar items */}
      <div className="absolute top-6 left-6 right-6 md:top-10 md:left-10 md:right-10 flex justify-between items-center z-50">
        <Link to="/login" className="flex items-center gap-2 text-slate-500 dark:text-admin-text-muted hover:text-slate-900 dark:hover:text-white transition-all bg-white/80 backdrop-blur-md dark:bg-admin-card/80 px-5 py-2.5 rounded-full shadow-sm hover:shadow hover:-translate-y-0.5 border border-slate-200 dark:border-admin-border font-bold text-sm">
          <ArrowLeft size={16} /> {t('return_to_login')}
        </Link>

        <div className="flex items-center gap-3">
          <div className="bg-white/80 dark:bg-admin-card/80 backdrop-blur-md rounded-full shadow-sm border border-slate-200 dark:border-admin-border px-3">
            <LanguageSwitcher />
          </div>
          <button 
            onClick={toggleTheme}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 dark:bg-admin-card/80 backdrop-blur-md shadow-sm hover:shadow hover:-translate-y-0.5 border border-slate-200 dark:border-admin-border text-slate-500 dark:text-admin-text-muted hover:text-slate-900 dark:hover:text-white transition-all"
            title={t('toggle_theme')}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl dark:bg-admin-card w-full max-w-md rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-2xl p-8 sm:p-14 border border-white dark:border-slate-800 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-admin-text tracking-tight italic">{t('reset_title')}</h2>
          <p className="text-admin-text-muted text-sm font-bold uppercase tracking-widest italic mt-2">{t('reset_subtitle')}</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 outline-red-200 outline outline-4 outline-offset-[-4px] text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Lock size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          <div className="relative group">
            <input 
              type="text" 
              autoComplete="one-time-code"
              required placeholder={t('reset_token_placeholder')}
              className="w-full bg-slate-100/50 dark:bg-admin-content/50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-6 pr-14 text-admin-text placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none focus:bg-white dark:focus:bg-admin-card shadow-sm focus:shadow-md tracking-widest font-black"
              value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
              maxLength={6}
            />
            <Hash className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={22} />
          </div>

          <div className="relative group">
            <input 
              type={showPassword ? "text" : "password"} 
              autoComplete="new-password"
              required placeholder={t('reset_new_password_placeholder')}
              className="w-full bg-slate-100/50 dark:bg-admin-content/50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-6 pr-14 text-admin-text placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none focus:bg-white dark:focus:bg-admin-card shadow-sm focus:shadow-md font-bold"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={22} />
          </div>

          <div className="relative group">
            <input 
              type={showPassword ? "text" : "password"} 
              autoComplete="new-password"
              required placeholder={t('reset_confirm_password_placeholder')}
              className="w-full bg-slate-100/50 dark:bg-admin-content/50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 pl-6 pr-14 text-admin-text placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all outline-none focus:bg-white dark:focus:bg-admin-card shadow-sm focus:shadow-md font-bold"
              value={password_confirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95 mt-6 uppercase tracking-widest">
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : t('reset_btn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;