import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import logo from '../assets/logo.jpg';

const LandingNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Workflow', path: '/workflow' },
  ];

  return (
    <nav className="fixed w-full z-50 bg-white/80 dark:bg-admin-content/80 backdrop-blur-md border-b border-slate-200 dark:border-admin-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-slate-100 p-1 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
            <img src={logo} alt="Project Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">
            HB_SFS <span className="text-blue-600">Admin</span>
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`text-sm font-bold tracking-wide transition-all ${
                location.pathname === link.path 
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            Sign In <ArrowRight size={16} />
          </button>
        </div>
        
        <button className="md:hidden p-2 text-slate-400">
          <Info size={24} />
        </button>
      </div>
    </nav>
  );
};

export default LandingNavbar;
