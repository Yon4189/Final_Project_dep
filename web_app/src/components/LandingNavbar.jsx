import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Info, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import LanguageSwitcher from './LanguageSwitcher';
import logo from '../assets/logo.jpg';

const LandingNavbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { isDarkMode, toggleTheme } = useTheme();
  const navLinks = [
    { name: t('home'), path: '/' },
    { name: t('about'), path: '/about' },
    { name: t('workflow'), path: '/workflow' },
  ];

  return (
    <nav className="w-full z-[999] bg-slate-900 border-b border-white/5 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-white p-1 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
            <img src={logo} alt="Project Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">
            Ethio <span className="text-white">HandyMan</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6 mr-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-bold tracking-wide transition-all ${location.pathname === link.path
                  ? 'text-blue-400'
                  : 'text-slate-300 hover:text-white'
                  }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all border border-white/10"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
            >
              {t('login')} <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <button className="md:hidden p-2 text-slate-400">
          <Info size={24} />
        </button>
      </div>
    </nav>
  );
};

export default LandingNavbar;
