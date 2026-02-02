import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ChevronLeft } from 'lucide-react';
import { MOCK_MODE, sleep } from '../api/axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simulate API Call
    await sleep(1000); 

    if (MOCK_MODE) {
      if (email === 'admin@bdu.com' && password === '123456') {
        login({ name: 'Nathenael', role: 'admin' }, 'fake-jwt-token');
        navigate('/');
      } else {
        setError('Invalid credentials. (Try: admin@bdu.com / 123456)');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Dark Header from your UI */}
      <div className="bg-[#050a18] h-20 flex items-center px-6">
        <ChevronLeft className="text-white cursor-pointer" size={32} />
      </div>

      <div className="flex-1 flex flex-col px-10 pt-20 max-w-lg mx-auto w-full">
        <h1 className="text-4xl font-bold text-slate-900 mb-12">Login to the system</h1>

        {error && <p className="text-red-500 mb-4 font-medium text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email field */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-900 uppercase tracking-tight">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="email" 
                placeholder="yourname@domain.com"
                className="w-full border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-600 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-900 uppercase tracking-tight">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                placeholder="........"
                className="w-full border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-500 text-sm cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-300 accent-blue-600" />
              Remember me
            </label>
            <a href="#" className="text-blue-600 font-bold text-sm">Forgot password?</a>
          </div>

          <button type="submit" className="w-full bg-[#2b64f3] hover:bg-blue-700 text-white font-bold py-5 rounded-2xl text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98]">
            Login
          </button>
        </form>

        <p className="text-center mt-12 text-slate-600">
          Don't have an account? <span className="text-blue-600 font-bold cursor-pointer">Sign Up</span>
        </p>
      </div>
    </div>
  );
};

export default Login;