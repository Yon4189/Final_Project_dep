import React from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Mail, Phone, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.jpg';

const LandingFooter = () => {
  const { t } = useTranslation();
  const developerInfo = [
    { name: 'Yonas', role: t('role_frontend_web') },
    { name: 'Natnayel', role: t('role_backend') },
    { name: 'Yoseph', role: t('role_frontend_mobile') }
  ];

  return (
    <footer className="bg-slate-900 text-white py-12 px-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-10">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center">
                <img src={logo} alt={t('project_logo')} className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tighter">{t('brand_name')}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {t('footer_tagline')}
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-bold">{t('footer_developers')}</h4>
            <div className="space-y-4">
              {developerInfo.map((dev, idx) => (
                <div key={idx} className="flex flex-col group cursor-pointer p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{dev.name}</span>
                  <span className="text-slate-400 text-xs group-hover:text-slate-300 transition-colors">{dev.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-lg font-bold">{t('footer_contact')}</h4>
            <div className="space-y-3 text-slate-400 text-sm">
              <p className="flex items-center gap-3">
                <Mail size={16} className="text-blue-400" />
                <a href="mailto:info@ethiohandyman.com" className="hover:text-white transition-colors">info@ethiohandyman.com</a>
              </p>
              <p className="flex items-center gap-3">
                <Phone size={16} className="text-blue-400" />
                <a href="tel:+251927061530" className="hover:text-white transition-colors">+251 9 27 06 15 30</a>
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <a href="https://t.me/Yon_4189" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-400 hover:scale-110 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-400/20 transition-all duration-300" title="Telegram">
                <Send size={18} className="translate-x-[-1px] translate-y-[1px]" />
              </a>
              <a href="https://www.linkedin.com/in/yonas-abate-5877063b6" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:scale-110 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300" title="LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-bold uppercase tracking-widest">
          <p>&copy; 2026 {t('brand_name')}. {t('footer_rights')}</p>
          <div className="flex gap-8">
            <Link to="/privacy" className="hover:text-white hover:underline transition-all">{t('privacy')}</Link>
            <Link to="/terms" className="hover:text-white hover:underline transition-all">{t('terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
