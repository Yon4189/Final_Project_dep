import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../api/axios'; // Import our Axios instance

const Login = () => {
  // State for input values and UI feedback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth(); // Global function to save user session
  const navigate = useNavigate(); // Function to redirect users

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent page refresh on form submit
    setError('');       // Clear previous errors
    setIsLoading(true); // Start loading animation

    try {
      // 1. Send Login Request to Laravel
      const response = await api.post('/admin/login', { 
        email: email, 
        password: password 
      });

      // 2. If Laravel returns success: true
      if (response.data.success) {
        const adminData = response.data.data;
        
        // Structure the session data
        const userSession = {
          id: adminData.adminID,
          name: adminData.fullname,
          email: adminData.email,
          role: 'admin'
        };

        // 3. Update Auth Context and Redirect
        login(userSession, "session_active"); 
        navigate('/');
      }
    } catch (err) {
      // 4. Handle Errors (Wrong password or Server offline)
      if (err.response) {
        setError(err.response.data.message || "Login failed.");
      } else {
        setError("Network error: Server is offline.");
      }
    } finally {
      setIsLoading(false); // Stop loading animation regardless of result
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 md:p-14 animate-in fade-in zoom-in duration-500">
        
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-slate-800">Admin Login</h2>
        </div>

        {/* Display Error Message if it exists */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          {/* Email Field */}
          <div className="relative">
            <input 
              type="email" 
              required
              autoComplete="off" 
              placeholder="Enter your email address"
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
          </div>

          {/* Password Field */}
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required
              autoComplete="new-password" 
              placeholder="Enter your password"
              className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-6 pr-14 text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400 font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          <div className="text-right">
            <button type="button" className="text-blue-600 text-xs font-bold hover:underline transition-all">
              Forgot Password?
            </button>
          </div>

          {/* Login Button with Loading State */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#4a90e2] hover:bg-blue-600 disabled:bg-blue-300 text-white font-black py-4 rounded-full text-sm shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest mt-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Verifying...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;