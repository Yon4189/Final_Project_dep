import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import api from '../api/axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get data from the URL (e.g., ?email=...&token=...)
  const email = searchParams.get('email');
  const token = searchParams.get('token');

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
      return setError("Passwords do not match!");
    }

    setIsLoading(true);
    try {
      const response = await api.post('/reset-password', {
        email,
        token,
        password,
        password_confirmation
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold text-slate-800">Password Updated!</h2>
          <p className="text-slate-500 mt-2">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 md:p-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800">New Password</h2>
          <p className="text-slate-500 text-sm mt-2">Create a secure password for your account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required placeholder="New Password"
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
          </div>

          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required placeholder="Confirm New Password"
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500"
              value={password_confirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-full flex items-center justify-center gap-2 uppercase tracking-widest transition-all">
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;